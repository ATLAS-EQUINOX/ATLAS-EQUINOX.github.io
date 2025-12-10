var system;
// --- helper: seeded PRNG from an integer seed ---
function mulberry32(a) {
  return function() {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    var t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
// seeded gaussian via Box–Muller
function seededGaussian(rng) {
  let u = 0, v = 0;
  while(u === 0) u = rng();
  while(v === 0) v = rng();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

function getTimeSeededPrice(systemName, resource) {
  const now  = new Date();
  const minute = now.getUTCMinutes();
  const hour   = now.getUTCHours();
  const day    = now.getUTCDay();     // 0–6
  const date   = now.getUTCDate();    // 1–31
  const month  = now.getUTCMonth();   // 0–11

  // 1) build a numeric seed from system/resource + current minute‑tick
  const seedStr = `${systemName}|${resource}|${date}|${month}|${hour}|${Math.floor(now.getUTCSeconds()/10)}`;
  let seed = 0;
  for (let i = 0; i < seedStr.length; i++) {
    seed = (seed * 31 + seedStr.charCodeAt(i)) >>> 0;
  }
  const rng = mulberry32(seed);

  // 2) base & vol
  const { base, volatility } = RESOURCE_DATA[resource];

  // 3) seasonality: daily and weekly cycles
  const dailyCycle  = Math.sin((hour + minute/60) / 24 * 2*Math.PI);
  const weeklyCycle = Math.sin((day + date/31)   / 7  * 2*Math.PI);

  // 4) noise term: gaussian noise scaled by volatility
  const noise = seededGaussian(rng) * volatility * base * 0.5;

  // 5) momentum: compare to last stored price
  const historyKey = `priceHist|${systemName}|${resource}`;
  const hist = JSON.parse(localStorage.getItem(historyKey) || "[]");
  const lastPrice = hist.length ? hist[hist.length-1] : base;
  const prevPrice = hist.length > 1 ? hist[hist.length-2] : lastPrice;
  const momentum = (lastPrice - prevPrice) * 0.3;

  // 6) assemble raw
  let raw = base
    // nudges
    + dailyCycle  * (volatility*0.1*base)
    + weeklyCycle * (volatility*0.2*base)
    // noise + momentum
    + noise + momentum;

  // 7) rare event: a log‑normal spike or crash
  const eventRoll = rng();
  if (eventRoll > 0.997) {
    // spike
    raw *= 1 + Math.exp(rng()*2);       // up to ~7x
  } else if (eventRoll < 0.003) {
    // crash
    raw *= Math.exp(-rng()*2);          // down to ~0.14x
  }

  // 8) scarcity boost (unchanged)
  const totalSys = SYSTEM_NAMES.length;
  const avail    = SYSTEM_NAMES.filter(
    s => systems[s].market?.[resource]
  ).length;
  const scarcity = 1 + ((totalSys - avail)/totalSys)*0.3;
  raw *= scarcity;

  // 9) clamp & store history
  const clamped = Math.max(base*0.5, Math.min(base*3, raw));
  const final   = parseFloat(clamped.toFixed(2));

  // push to history ring‑buffer
  hist.push(final);
  if (hist.length > 5) hist.shift(); // keep last 5 prices
  localStorage.setItem(historyKey, JSON.stringify(hist));

  return final;
}


function getBuySellPrice(basePrice) {
  const spread = basePrice * 0.03; // 3% spread
  return {
    buyPrice: parseFloat((basePrice + spread).toFixed(2)),
    sellPrice: parseFloat((basePrice - spread).toFixed(2)),
  };
}


// 🆕 Must update getImportTax/getExportTax signature to accept 'amount'
function getImportTax(system, resource, unitPrice, amount) { // 👈 ADDED 'amount'
    const baseRate = TARIFF_SETTINGS.baseImport;
    const market = systems[system]?.market?.[resource];
    let rate = baseRate;

    // Dynamic adjustment (retained)
    if (market) {
        const imbalance = (market.demand - market.supply) / (market.supply + 1);
        rate += imbalance * TARIFF_SETTINGS.dynamicAdjustmentFactor;
    }

    // High-value goods penalty (retained)
    if (unitPrice > TARIFF_SETTINGS.highValueThreshold) {
        rate += TARIFF_SETTINGS.highValuePenalty;
    }

    // 💥 NEW: Volume Surcharge (e.g., above 500 units)
    const VOLUME_THRESHOLD = 500; // Define this in TARIFF_SETTINGS or here
    if (amount > VOLUME_THRESHOLD) {
        const volumeFactor = amount / VOLUME_THRESHOLD;
        // Punish large trades with an escalating penalty
        rate += TARIFF_SETTINGS.volumePenalty * (volumeFactor ** 1.5); 
    }

    // Clamp
    return Math.min(TARIFF_SETTINGS.maxRate, Math.max(TARIFF_SETTINGS.minRate, rate));
}

// 🆕 You must also update getExportTax to take 'amount' if you want this tax to apply to player sales.
function getExportTax(system, resource, unitPrice, amount) { // 👈 ADDED 'amount'
    const baseRate = TARIFF_SETTINGS.baseExport;
    const market = systems[system]?.market?.[resource];
    let rate = baseRate;

    // ... [other calculations]

    // 💥 NEW: Volume Surcharge on Export
    const VOLUME_THRESHOLD = 500;
    if (amount > VOLUME_THRESHOLD) {
        const volumeFactor = amount / VOLUME_THRESHOLD;
        rate += TARIFF_SETTINGS.volumePenalty * (volumeFactor ** 1.5); 
    }
    
    // Clamp
    return Math.min(TARIFF_SETTINGS.maxRate, Math.max(TARIFF_SETTINGS.minRate, rate));
}

function getExportTax(system, resource, unitPrice) {
  const baseRate = TARIFF_SETTINGS.baseExport;
  const market = systems[system]?.market?.[resource];
  let rate = baseRate;

  // Dynamic adjustment: exporting scarce resources
  if (market) {
    const scarcity = market.supply / (market.demand + 1);
    rate += (1 - scarcity) * TARIFF_SETTINGS.dynamicAdjustmentFactor;
  }

  // Clamp
  return Math.min(TARIFF_SETTINGS.maxRate, Math.max(TARIFF_SETTINGS.minRate, rate));
}

function calculateImportTax(system, resource, unitPrice, amount) {
  const rate = getDynamicImportTaxRate(system, resource, unitPrice);
  return { rate, tax: unitPrice * amount * rate };
}

function calculateExportTax(system, resource, unitPrice, amount) {
  const rate = getDynamicExportTaxRate(system, resource, unitPrice);
  return { rate, tax: unitPrice * amount * rate };
}

// 🆕 Update getBuyTotal/getSellTotal signatures and calls
function getBuyTotal(system, resource, unitPrice, amount) {
    const rate = getImportTax(system, resource, unitPrice, amount); // 👈 PASS amount
    const tax = unitPrice * amount * rate; // 👈 Calculate tax here
    return { tax, total: unitPrice * amount + tax };
}

function getSellTotal(system, resource, unitPrice, amount) {
    const rate = getExportTax(system, resource, unitPrice, amount); // 👈 PASS amount
    const tax = unitPrice * amount * rate; // 👈 Calculate tax here
    return { tax, total: unitPrice * amount - tax };
}
// Note: This replaces the previous simplified logic which assumed tax was calculated in getImportTax/getExportTax.

function updateMarket() {
    // 1. Load existing price data cache
    const savedPriceData = JSON.parse(
        localStorage.getItem("atlasPriceHistory") || "{}"
    );

    // 2. Recalculate and update prices for all systems and resources
    SYSTEM_NAMES.forEach((system) => {
        RESOURCE_TYPES.forEach((res) => {
            const key = `${system}-${res}`;
            
            // Get the old price (for trend calculation) and calculate the new time-seeded price
            const oldPrice =
                systems[system].prices[res] ?? getTimeSeededPrice(system, res);
            const newPrice = getTimeSeededPrice(system, res);

            // Determine price trend
            let trend = "same";
            if (newPrice > oldPrice) trend = "up";
            else if (newPrice < oldPrice) trend = "down";
            
            // Update lastPrices cache for UI rendering/flashing
            lastPrices[key] = {
                price: newPrice,
                trend,
                timestamp: Date.now(),
            };
            
            // Apply the new price to the main system data structure
            systems[system].prices[res] = newPrice;
            savedPriceData[key] = newPrice;
        });
    });

    // 3. ENFORCING INFORMATION ASYMMETRY: Removed the "Anonymous tip" feature.
    // The player must now compare prices manually or use the in-game market table/history.
    
    // 4. Save the immediate price data
    localStorage.setItem("atlasPriceHistory", JSON.stringify(savedPriceData));

    // 5. Update Historical Price Graph Data
    const historyStore = JSON.parse(
        localStorage.getItem("atlasPriceHistoryGraph") || "{}"
    );

    // Iterating over all prices again to update the historical graph data is necessary
    // but consider if this must run on every market update. If the market updates frequently
    // (e.g., every 10 seconds), you might want to throttle the history storage.
    RESOURCE_TYPES.forEach((res) => {
        SYSTEM_NAMES.forEach((system) => {
            const key = `${system}-${res}`;
            const newPrice = systems[system].prices[res];
            if (!newPrice) return;

            historyStore[key] ||= [];
            historyStore[key].push({ time: Date.now(), price: newPrice });

            // Cap history length (retained)
            if (historyStore[key].length > 100) {
                historyStore[key] = historyStore[key].slice(-100);
            }
        });
    });

    localStorage.setItem("atlasPriceHistoryGraph", JSON.stringify(historyStore));

    // 6. Trigger UI update
    updateUI();
}

function logMarket(msg) {
  const logDiv = document.getElementById("marketLog");
  if (!logDiv) return;

  const entry = document.createElement("div");
  entry.className = "console-entry";

  const time = document.createElement("span");
  time.className = "console-timestamp";
  time.textContent = `[${new Date().toLocaleTimeString()}]`;

  const content = document.createElement("span");
  content.innerHTML = " " + msg;

  entry.appendChild(time);
  entry.appendChild(content);
  logDiv.appendChild(entry);

  // ✅ Keep only the last 50 messages
  while (logDiv.children.length > 50) {
    logDiv.removeChild(logDiv.firstChild);
  }

  logDiv.scrollTop = logDiv.scrollHeight;
}

function sellAllMaterials() {
    let totalRevenue = 0;
    let soldItems = [];
    const location = player.location;

    for (let resource in player.inventory) {
        const batches = player.inventory[resource];
        if (!batches || batches.length === 0) continue;

        // --- Split allowed vs blocked batches ---
        const allowedBatches = batches.filter(([qty, paid, origin]) => origin !== location);
        const blockedBatches = batches.filter(([qty, paid, origin]) => origin === location);

        const blockedQty = blockedBatches.reduce((s, [q]) => s + q, 0);
        if (blockedQty > 0) {
            log(
                `You cannot sell ${blockedQty}${UNIT} of ${resource} in ${location} because it was purchased here.`
            );
        }

        if (allowedBatches.length === 0) continue; // Nothing can be sold

        // Calculate totals for allowed batches
        let quantity = 0;
        let totalPaid = 0;
        allowedBatches.forEach(([qty, paid]) => {
            quantity += qty;
            totalPaid += qty * paid;
        });

        const price = systems[location]?.prices[resource] ?? RESOURCE_DATA[resource]?.base ?? 0;
        const revenue = price * quantity;
        const profit = revenue - totalPaid;
        const profitColor = profit >= 0 ? "text-success" : "text-danger";
        const profitLabel = profit >= 0 ? "Profit" : "Loss";

        // Update inventory: keep only blocked batches
        player.inventory[resource] = blockedBatches;

        // Add to total revenue
        totalRevenue += revenue;
        soldItems.push(`${quantity}${UNIT} ${resource}`);

        // Update market supply and adjust price
        const market = systems[location].market[resource] || { supply: 0, demand: 0 };
        market.supply += quantity;
        systems[location].market[resource] = market;

        const ratio = market.supply === 0 ? 1 : market.demand / market.supply;
        const base = RESOURCE_DATA[resource].base;
        systems[location].prices[resource] = parseFloat(
            Math.max(base * 0.5, Math.min(base * 3, price * (ratio > 1 ? 1 + (ratio - 1) * 0.01 : 1 - (1 - ratio) * 0.01))).toFixed(2)
        );

        // Log the sale
        logMarket(
            `<span class="text-warning">ΛTLΛS | ΞQUINOX™</span> sold ${quantity}${UNIT} of ${resource} in ${location} |
            <span class="text-info">${price.toFixed(2)}ᶜ</span> each
            (<span class="${profitColor}">${profitLabel}: ${profit.toFixed(2)}ᶜ</span>)`
        );
    }

    if (totalRevenue > 0) {
        player.credits += totalRevenue;
        flash("credits");
        log(`Sold all allowed materials for ${totalRevenue.toFixed(2)}ᶜ: ${soldItems.join(", ")}`);
        updateUI();
    } else {
        log("No materials to sell (or all were purchased in this system).");
    }
}


function sellAllOfResource(resource) {
  const inv = player.inventory[resource];
  if (!inv || inv.length === 0) return log(`No ${resource} to sell.`);

  const system = systems[player.location];
  let market = system.market[resource];
  let price = system.prices?.[resource] ?? RESOURCE_DATA[resource].base;

  // Create market if missing
  if (!market) {
    log(`ΛΞ started trade of ${resource} in ${player.location}.`);
    price = RESOURCE_DATA[resource].base * 1.25;
    market = { supply: 0, demand: 0 };
    system.market[resource] = market;
    system.prices[resource] = price;
  }

  // --- Split allowed vs blocked batches ---
  const allowedBatches = inv.filter(([qty, paid, origin]) => origin !== player.location);
  const blockedBatches = inv.filter(([qty, paid, origin]) => origin === player.location);

  const blockedQty = blockedBatches.reduce((s, [q]) => s + q, 0);
  if (blockedQty > 0) {
    log(
      `You cannot sell ${blockedQty}${UNIT} of ${resource} in ${player.location} because it was purchased here.`
    );
  }

  if (allowedBatches.length === 0) return; // Nothing can be sold

  // --- Sell allowed batches ---
  let totalSold = 0;
  let totalPaid = 0;

  allowedBatches.forEach(([qty, paid, origin]) => {
    totalSold += qty;
    totalPaid += qty * paid;
  });

  // Update inventory: keep only blocked batches
  player.inventory[resource] = blockedBatches;

  const revenue = totalSold * price;
  const profit = revenue - totalPaid;
  const profitColor = profit >= 0 ? "text-success" : "text-danger";
  const profitLabel = profit >= 0 ? "Profit" : "Loss";

  player.credits += revenue;
  flash("credits");

  market.supply += totalSold;
  const ratio = market.supply === 0 ? 1 : market.demand / market.supply;
  const base = RESOURCE_DATA[resource].base;
  let newPrice =
    price * (ratio > 1 ? 1 + (ratio - 1) * 0.01 : 1 - (1 - ratio) * 0.01);
  system.prices[resource] = parseFloat(
    Math.max(base * 0.5, Math.min(base * 3, newPrice)).toFixed(2)
  );

  logMarket(
    `<span class="text-warning">ΛTLΛS | ΞQUINOX™</span> sold ${totalSold}${UNIT} of ${resource} in ${player.location} |
      <span class="text-info">${price.toFixed(2)}ᶜ</span> each 
      (<span class="${profitColor}">${profitLabel}: ${profit.toFixed(2)}ᶜ</span>)`
  );

  updateUI();
}


/**
 * Simulate what the new unit price would be
 * if you bought `amount` more at once.
 */
/**
 * Simulate what the new unit price would be
 * if you bought `amount` more at once.
 */
function projectPostBuyPrice(location, resource, amount) {
    const entry = systems[location]?.market?.[resource];
    const systemData = systems[location];

    // If market is unavailable or has no supply, fallback to seeded price
    if (!entry || entry.supply === 0) {
        const fallback = systemData?.prices?.[resource] ?? getTimeSeededPrice(location, resource);
        return parseFloat(fallback.toFixed(2));
    }

    // Get the current price from the system data (which should be the seeded price + market factors)
    const currentPrice = systemData.prices[resource]; 

    // 1. Calculate the 'Base' price (Time-seeded price + Scarcity)
    const timePrice = getTimeSeededPrice(location, resource);
    const totalSys = SYSTEM_NAMES.length;
    const avail = SYSTEM_NAMES.filter(sys => systems[sys].market?.[resource]).length;
    const scarcity = 1 + ((totalSys - avail) / totalSys) * 0.3;
    const rawBase = timePrice * scarcity;

    // 2. Calculate Market Pressure: Ratio of (Demand + Player Buy) / Supply
    const newDemand = entry.demand + amount;
    const ratio = newDemand / entry.supply;
    
    // 3. Determine the Impact Factor
    // Base impact is 0.01 (1% deviation per ratio unit)
    let impactFactor = 0.01; 
    
    // 💥 NEW: Amplify impact based on trade volume vs market size.
    // TARIFF_SETTINGS.maxMarketSize (e.g., 5000 units) should be defined externally.
    const playerVolumeRatio = amount / (entry.supply + entry.demand + 1000); // Compare to total volume
    
    // If the player's trade exceeds 10% of the current market size, start applying heavy penalty
    if (playerVolumeRatio > 0.1) {
        // Use a quadratic or high exponent curve for punishing large trades.
        impactFactor = 0.01 + 0.1 * (playerVolumeRatio ** 2); // E.g., 0.1% base + 10% * (ratio^2)
        impactFactor = Math.min(0.5, impactFactor); // Cap max impact at 50%
    }
    
    // 4. Calculate the Final Impacted Price
    let impacted = rawBase * (ratio > 1
        ? 1 + (ratio - 1) * impactFactor // Increased impact factor
        : 1 - (1 - ratio) * 0.01); // Normal dampening for sell side (not player sell here)

    // Clamp final price
    const base = RESOURCE_DATA[resource].base;
    impacted = Math.max(base * 0.5, Math.min(base * 3, impacted));

    return parseFloat(impacted.toFixed(2));
}

function updateBuyBreakdown(res, amt, price = undefined, taxRate = undefined) {
  if (!amt || !RESOURCE_DATA[res]) {
    document.getElementById("buybreakdown").textContent = "~";
    return;
  }

  const loc = player?.location;
  const sys = systems?.[loc];

  if (!loc || !sys) {
    document.getElementById("buybreakdown").textContent = "~";
    return; // ⛔ Prevent crash during warp
  }

  // Use provided price and taxRate if available, otherwise calculate
  const unitPrice = price !== undefined ? price : projectPostBuyPrice(loc, res, amt);
  const effectiveTaxRate = taxRate !== undefined ? taxRate : sys.tariffs?.importTaxRate || 0;
  const tax = unitPrice * amt * effectiveTaxRate;
  const total = unitPrice * amt + tax;

  document.getElementById("buybreakdown").textContent =
    `${total.toFixed(2)}ᶜ`;
}


function buyMaterial() {
  const res      = document.getElementById("tradeResourceSelect").value;
  const amtInput = document.getElementById("tradeAmount");
  const amt      = parseInt(amtInput.value, 10);
  if (!amt || amt <= 0) return log("Invalid quantity.");

  updateBuyBreakdown(res, amt);

  if (!RESOURCE_DATA[res]) {
    return log(`Unknown resource: ${res}`);
  }

  const system        = systems[player.location];
  const market        = system.market[res];
  if (!market) {
    return log(`${res} is not currently available in ${player.location}.`);
  }

  const projectedUnit = projectPostBuyPrice(player.location, res, amt);
  const { buyPrice }  = getBuySellPrice(projectedUnit);
  const importTaxRate = system.tariffs?.importTaxRate || 0;

  // Show breakdown before confirmation
  updateBuyBreakdown(res, amt, buyPrice, importTaxRate);

  // **EARLY CREDIT CHECK** 👇
  const unitCost  = buyPrice * (1 + importTaxRate);
  const totalCost = unitCost * amt;
  if (player.credits < totalCost) {
    const maxAffordable = Math.floor(player.credits / unitCost);
    if (maxAffordable > 0) {
      amtInput.value = maxAffordable;
      return log(
        `Not enough credits. You can afford up to ${maxAffordable}× ${res}.`
      );
    }
    return log("Not enough credits to buy any units.");
  }
  // — now we know they can pay, so on to the real trade

  pendingTrade = function() {
    // Deduct credits & queue shipment
    player.credits -= totalCost;
    player.shipments.push({
      id:       `SHIP-${Date.now().toString().slice(-5)}`,
      resource: res,
      amount:   amt,
      price:    buyPrice,
      originSystem: player.location,
      time:     Date.now() + getRandomShipmentDelay(),
    });

    recentPlayerBuys[`${player.location}-${res}`] = Date.now();
    const projectedPrice = projectPostBuyPrice(player.location, res, amt);
    market.demand += amt;
    systems[player.location].prices[res] = projectedPrice;

    flash("credits");
    updateUI();
  };

  // Show the confirmation dialog / summary (and then run & log it)
  showTradeSummary("buy", res, amt, buyPrice);
}

function sellMaterial() {
    const res = document.getElementById("tradeResourceSelect").value;
    const amt = parseInt(document.getElementById("tradeAmount").value, 10);
    if (!amt || amt <= 0) return log("Invalid quantity.");
    if (!RESOURCE_DATA[res]) return log(`Unknown resource: ${res}`);

    const system = systems[player.location];
    let market = system.market[res];
    let price = system.prices?.[res] ?? RESOURCE_DATA[res].base;

    if (!market) {
        log(`ΛΞ started trade of ${res} in ${player.location}.`);
        price = RESOURCE_DATA[res].base * 1.25;
        market = { supply: 0, demand: 0 };
        system.market[res] = market;
        system.prices[res] = price;
    }

    const inv = player.inventory[res] || [];
    if (!inv.length) return log(`No ${res} to sell.`);

    // Filter out goods bought in this system
    const allowedInventory = inv.filter(([qty, paid, origin]) => origin !== player.location);
    const blockedQty = inv.filter(([qty, paid, origin]) => origin === player.location)
                          .reduce((s, [qty]) => s + qty, 0);

    if (blockedQty > 0) {
        log(`You cannot sell ${blockedQty}${UNIT} of ${res} in ${player.location} because it was purchased here.`);
    }

    if (!allowedInventory.length) return; // Nothing can be sold

    const totalAllowed = allowedInventory.reduce((s, [qty]) => s + qty, 0);
    const sellAmt = Math.min(amt, totalAllowed);

    // Execute sale
    let toSell = sellAmt;
    let totalPaid = 0;
    for (let batch of allowedInventory) {
        const [qty, paid] = batch;
        const take = Math.min(qty, toSell);
        batch[0] -= take;
        totalPaid += take * paid;
        toSell -= take;
        if (toSell <= 0) break;
    }

    // Rebuild inventory
    player.inventory[res] = [
        ...allowedInventory.filter(([qty]) => qty > 0),
        ...inv.filter(([qty, paid, origin]) => origin === player.location)
    ];

    const revenue = sellAmt * price;
    player.credits += revenue;
    flash("credits");

    market.supply += sellAmt;
    const ratio = market.supply === 0 ? 1 : market.demand / market.supply;
    const base = RESOURCE_DATA[res].base;
    system.prices[res] = parseFloat(
        Math.max(base * 0.5, Math.min(base * 3, price * (ratio > 1 ? 1 + (ratio - 1) * 0.01 : 1 - (1 - ratio) * 0.01))).toFixed(2)
    );

    logMarket(
        `<span class="text-warning">ΛTLΛS | ΞQUINOX™</span> sold ${sellAmt}${UNIT} of ${res} in ${player.location} |
        <span class="text-info">${price.toFixed(2)}ᶜ</span>`
    );

    updateUI();
}



function showTradeSummary(type, res, amt, price) {
  const location = player.location;
  const tariffs = systems[location]?.tariffs || {
    importTaxRate: 0,
    exportTaxRate: 0,
  };

  const baseTotal = price * amt;
  const taxRate = type === "buy"
    ? tariffs.importTaxRate
    : tariffs.exportTaxRate;
  const taxAmount = baseTotal * taxRate;
  const finalTotal = type === "buy"
    ? baseTotal + taxAmount
    : baseTotal - taxAmount;

  // 1) Update the breakdown spans immediately:
  if (type === "buy") {
    // B: span shows unit price, tax, total cost
    updateBuyBreakdown(res, amt, price, tariffs.importTaxRate);
    // Clear sell span
    document.getElementById("sellbreakdown").textContent = "~";
  } else {
    // S: span shows unit price and revenue after tax

    // Clear buy span
    document.getElementById("buybreakdown").textContent = "~";
  }

  // 2) If there's a pending trade, finalize it
  if (pendingTrade) {
    pendingTrade();
    pendingTrade = null;
    saveGameState();

    // 3) Log a clear, detailed message
    if (type === "buy") {
      log(
        `Purchased ${amt}${UNIT} ${res} @ ${price.toFixed(
          2
        )}ᶜ each +${taxAmount.toFixed(2)}ᶜ tax → ${finalTotal.toFixed(
          2
        )}ᶜ total.`
      );
    } else {
      // calculate cost basis for profit/loss
      const inv = player.inventory[res];
      // find how much was paid for the oldest `amt` units
      let remaining = amt, costSum = 0;
      for (let [qty, paid] of inv) {
        if (remaining <= 0) break;
        const used = Math.min(qty, remaining);
        costSum += used * paid;
        remaining -= used;
      }
      const profit = finalTotal - costSum;
      const sign = profit >= 0 ? "+" : "";
      log(
        `Sold ${amt}${UNIT} ${res} @ ${price.toFixed(
          2
        )}ᶜ each -${taxAmount.toFixed(2)}ᶜ tax → ${finalTotal.toFixed(
          2
        )}ᶜ; P/L: ${sign}${profit.toFixed(2)}ᶜ.`
      );
    }

    tradeTimestamps.push(Date.now());

    // 4) Push to market log
    const actionWord = type === "buy" ? "purchased" : "sold";
    const profitLossLabel = type === "sell"
      ? (() => {
          const inv = player.inventory[res];
          let remaining = amt, costSum = 0;
          for (let [qty, paid] of inv) {
            if (remaining <= 0) break;
            const used = Math.min(qty, remaining);
            costSum += used * paid;
            remaining -= used;
          }
          const profit = finalTotal - costSum;
          const cls = profit >= 0 ? "text-success" : "text-danger";
          const label = profit >= 0 ? "Profit" : "Loss";
          return `<span class="${cls}">${label}: ${profit.toFixed(2)}ᶜ</span>`;
        })()
      : `<span class="text-success">Total: ${finalTotal.toFixed(2)}ᶜ</span>`;

    logMarket(
      `<span class="text-warning">ΛTLΛS | ΞQUINOX™</span> ${actionWord} ${amt}${UNIT} of ${res} in ${location} |
        ${price.toFixed(2)}ᶜ each (Tax: <span class="text-danger">${taxAmount.toFixed(
        2
      )}ᶜ</span>, ${profitLossLabel})`
    );
  }
}


