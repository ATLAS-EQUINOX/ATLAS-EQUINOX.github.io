function getTimeSeededPrice(system, resource) {
  const time = new Date();
  const minute = Math.floor(time.getUTCSeconds() / 10);
  const hour = time.getUTCHours();
  const day = time.getUTCDate();
  const month = time.getUTCMonth();
  // Fixed time seed (per minute, UTC-based)
  const seed = [system, resource, day, month, hour, minute].join("-");
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash +=
      (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
    hash >>>= 0;
  }
  const { base, volatility } = RESOURCE_DATA[resource];
  const variation = (Math.sin(hash) + 1) / 2; // 0–1
  let offset = (variation - 0.5) * volatility * base * 10;
  // Replace Math.random() with deterministic event simulation
  const spikeChance = (hash % 1000) / 1000;
  if (spikeChance > 0.98) {
    // spike
    const spikeMultiplier = 1 + ((hash >> 5) % 200) / 100; // 1.00x to 3.00x
    offset += base * spikeMultiplier;
  } else if (spikeChance < 0.02) {
    // crash
    const dropMultiplier = 1 + ((hash >> 3) % 150) / 100; // 1.00x to 2.50x
    offset -= base * dropMultiplier;
  }
  // 📊 Count global availability
  let availableCount = 0;
  let totalSystems = SYSTEM_NAMES.length;
  for (let sys of SYSTEM_NAMES) {
    const marketEntry = systems[sys]?.market?.[resource];
    if (marketEntry) availableCount++;
  }
  // 📉 If it's rare, apply scarcity boost (0–30%)
  let scarcityMultiplier =
    1 + ((totalSystems - availableCount) / totalSystems) * 0.3;
  const rawPrice = (base + offset) * scarcityMultiplier;
  const clamped = Math.max(base * 0.5, Math.min(base * 3, rawPrice));
  return parseFloat(clamped.toFixed(2));
}

function getBuySellPrice(basePrice) {
  const spread = basePrice * 0.03; // 3% spread
  return {
    buyPrice: parseFloat((basePrice + spread).toFixed(2)),
    sellPrice: parseFloat((basePrice - spread).toFixed(2)),
  };
}

function getImportTax(system, unitPrice, amount) {
  const rate = systems[system]?.tariffs?.importTaxRate || 0;
  return unitPrice * amount * rate;
}

function getExportTax(system, unitPrice, amount) {
  const rate = systems[system]?.tariffs?.exportTaxRate || 0;
  return unitPrice * amount * rate;
}

function getBuyTotal(system, unitPrice, amount) {
  const tax = getImportTax(system, unitPrice, amount);
  return { tax, total: unitPrice * amount + tax };
}

function getSellTotal(system, unitPrice, amount) {
  const tax = getExportTax(system, unitPrice, amount);
  return { tax, total: unitPrice * amount - tax };
}

function updateMarket() {
  const savedPriceData = JSON.parse(
    localStorage.getItem("atlasPriceHistory") || "{}"
  );
  SYSTEM_NAMES.forEach((system) => {
    RESOURCE_TYPES.forEach((res) => {
      const key = `${system}-${res}`;
      const oldPrice =
        systems[system].prices[res] ?? getTimeSeededPrice(system, res);
      const newPrice = getTimeSeededPrice(system, res);
      let trend = "same";
      if (newPrice > oldPrice) trend = "up";
      else if (newPrice < oldPrice) trend = "down";
      // 🔥 Only update the trend if price changed
      lastPrices[key] = {
        price: newPrice,
        trend,
        timestamp: Date.now(),
      };
      systems[system].prices[res] = newPrice;
      savedPriceData[key] = newPrice;
    });
  });
  // 🧠 Log best arbitrage tip only once per market refresh
  let bestResource = null;
  let bestProfit = 0;
  let bestLow = 0;
  let bestHigh = 0;
  RESOURCE_TYPES.forEach((res) => {
    const prices = SYSTEM_NAMES.map((system) => systems[system].prices[res]);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const profit = max - min;
    if (profit > bestProfit) {
      bestProfit = profit;
      bestResource = res;
      bestLow = min;
      bestHigh = max;
    }
  });
  if (bestProfit > 0) {
    logMarket(
      `Anonymous tip: Buy  ${bestResource}  at <span class="text-success">${bestLow.toFixed(
        2
      )}ᶜ</span>, sell at <span class="text-danger">${bestHigh.toFixed(
        2
      )}ᶜ</span>. Potential profit: <span class="text-warning">+${(
        bestHigh - bestLow
      ).toFixed(2)}ᶜ</span>`
    );
  }

  localStorage.setItem("atlasPriceHistory", JSON.stringify(savedPriceData));
  const historyStore = JSON.parse(
    localStorage.getItem("atlasPriceHistoryGraph") || "{}"
  );

  RESOURCE_TYPES.forEach((res) => {
    SYSTEM_NAMES.forEach((system) => {
      const key = `${system}-${res}`;
      const newPrice = systems[system].prices[res];
      if (!newPrice) return;

      historyStore[key] ||= [];
      historyStore[key].push({ time: Date.now(), price: newPrice });

      // Optional: cap history length
      if (historyStore[key].length > 100) {
        historyStore[key] = historyStore[key].slice(-100);
      }
    });
  });

  localStorage.setItem("atlasPriceHistoryGraph", JSON.stringify(historyStore));

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
  const tariffs = systems[location]?.tariffs || { exportTaxRate: 0 };

  for (let resource in player.inventory) {
    const batches = player.inventory[resource];
    if (!batches || batches.length === 0) continue;

    let quantity = 0;
    let totalPaid = 0;

    batches.forEach(([qty, paid]) => {
      quantity += qty;
      totalPaid += qty * paid;
    });

    const price =
      systems[location]?.prices[resource] || RESOURCE_DATA[resource]?.base || 0;
    const exportTax = price * quantity * tariffs.exportTaxRate;
    const revenue = price * quantity;
    const afterTax = revenue - exportTax;
    const profit = afterTax - totalPaid;
    const profitColor = profit >= 0 ? "text-success" : "text-danger";
    const profitLabel = profit >= 0 ? "Profit" : "Loss";

    if (quantity > 0 && price > 0) {
      player.inventory[resource] = []; // Clear inventory
      totalRevenue += afterTax;

      // 🧾 Add NPC-style log
      tradeTimestamps.push(Date.now());
      logMarket(
        `<span class="text-warning">ΛTLΛS | ΞQUINOX™</span> sold ${quantity}${UNIT} of ${resource} in ${location} |
          <span class="text-info">${price.toFixed(2)}ᶜ</span> each
          (-Tax: <span class="text-danger">${exportTax.toFixed(2)}ᶜ</span>,
          <span class="${profitColor}">${profitLabel}: ${profit.toFixed(
          2
        )}ᶜ</span>)`
      );

      soldItems.push(`${quantity}${UNIT} ${resource}`);
    }
  }

  if (totalRevenue > 0) {
    player.credits += totalRevenue;
    log(
      `Sold all materials for ${totalRevenue.toFixed(2)}ᶜ: ${soldItems.join(
        ", "
      )}`
    );
    updateUI();
  } else {
    log("No materials to sell.");
  }
}

function sellAllOfResource(resource) {
  const inv = player.inventory[resource];
  if (!inv || inv.length === 0) return log(`No ${resource} to sell.`);

  let soldQty = 0;
  let totalPaid = 0;
  inv.forEach(([qty, price]) => {
    soldQty += qty;
    totalPaid += qty * price;
  });

  let price = systems[player.location]?.prices[resource];
  let market = systems[player.location]?.market?.[resource];

  // 🆕 If market is missing, create it
  if (!market) {
    log(`ΛΞ started trade of ${res} in ${player.location}.`);
    const base = RESOURCE_DATA[resource].base;
    price = base * 1.25;
    if (!systems[player.location].market) systems[player.location].market = {};
    if (!systems[player.location].prices) systems[player.location].prices = {};
    market = { supply: 0, demand: 0 };
    systems[player.location].market[resource] = market;
    systems[player.location].prices[resource] = price;

    // 🧠 Save new market data
    const key = `${player.location}-${resource}`;
    const now = Date.now();
    const availabilityCache = JSON.parse(
      localStorage.getItem("atlasMarketAvailability") || "{}"
    );
    availabilityCache[key] = { available: true, timestamp: now };
    localStorage.setItem(
      "atlasMarketAvailability",
      JSON.stringify(availabilityCache)
    );

    const marketDataCache = JSON.parse(
      localStorage.getItem("atlasMarketData") || "{}"
    );
    marketDataCache[key] = { supply: 0, demand: 0 };
    localStorage.setItem("atlasMarketData", JSON.stringify(marketDataCache));
  }

  const revenue = soldQty * price;
  const profit = revenue - totalPaid;
  const profitColor = profit >= 0 ? "text-success" : "text-danger";
  const profitLabel = profit >= 0 ? "Profit" : "Loss";

  player.credits += revenue;
  player.inventory[resource] = [];
  market.supply += soldQty;

  flash("credits");
  log(
    `Sold ${soldQty}${UNIT} of ${resource} at ${price.toFixed(
      2
    )}ᶜ each (Total: ${revenue.toFixed(2)}ᶜ)`
  );
  tradeTimestamps.push(Date.now());

  logMarket(
    `<span class="text-warning">ΛTLΛS | ΞQUINOX™</span> sold  ${soldQty}${UNIT} of ${resource}  |  <span class="text-info">${price.toFixed(
      2
    )}ᶜ</span> each (<span class="${profitColor}">${profitLabel}: ${profit.toFixed(
      2
    )}ᶜ</span>)`
  );
  updateUI();
}

function updateBuyBreakdown(res, amt) {
  const price = systems[player.location]?.prices?.[res];
  if (typeof price !== "number" || !amt) {
    return document.getElementById("buybreakdown").textContent = "~";
  }
  document.getElementById("buybreakdown").textContent =
    (price * amt).toFixed(2) + "ᶜ";
}


function updateSellBreakdown(res, amt) {
  const price = systems[player.location]?.prices?.[res];
  if (typeof price !== "number" || !amt) {
    return document.getElementById("sellbreakdown").textContent = "~";
  }
  document.getElementById("sellbreakdown").textContent =
    (price * amt).toFixed(2) + "ᶜ";
}


function buyMaterial() {
  const res = document.getElementById("tradeResourceSelect").value;
  const amtInput = document.getElementById("tradeAmount");
  const amt = parseInt(amtInput.value, 10);
  if (!amt || amt <= 0) return log("Invalid quantity.");

  updateBuyBreakdown(res, amt);


  if (!RESOURCE_DATA[res]) {
    return log(`Unknown resource: ${res}`);
  }

  const system = systems[player.location];
  const market = system.market[res];
  if (!market) {
    return log(`${res} is not currently available in ${player.location}.`);
  }

  const basePrice = system.prices[res];
  const { buyPrice } = getBuySellPrice(basePrice);
  const importTaxRate = system.tariffs?.importTaxRate || 0;

  // Show breakdown before confirmation
  updateBuyBreakdown(res, amt, buyPrice, importTaxRate);

  // Now set the pendingTrade
  pendingTrade = () => {
    const unitCost = buyPrice * (1 + importTaxRate);
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

    // Deduct credits & queue shipment
    player.credits -= totalCost;
    player.shipments.push({
      id: `SHIP-${Date.now().toString().slice(-5)}`,
      resource: res,
      amount: amt,
      price: buyPrice,
      time: Date.now() + getRandomShipmentDelay(),
    });

    recentPlayerBuys[`${player.location}-${res}`] = Date.now();
    market.demand += amt;

    // Recalculate price
    const ratio = market.demand / market.supply;
    const base = RESOURCE_DATA[res].base;
    let newPrice =
      buyPrice * (ratio > 1
        ? 1 + (ratio - 1) * 0.01
        : 1 - (1 - ratio) * 0.01);
    system.prices[res] = parseFloat(
      Math.max(base * 0.5, Math.min(base * 3, newPrice)).toFixed(2)
    );

    flash("credits");
    updateUI();
  };

  // Show the confirmation dialog / summary
  showTradeSummary("buy", res, amt, buyPrice);
}


function sellMaterial() {
  const res = document.getElementById("tradeResourceSelect").value;
  const amt = parseInt(document.getElementById("tradeAmount").value, 10);
  if (!amt || amt <= 0) return log("Invalid quantity.");


  updateSellBreakdown(res, amt);

  if (!RESOURCE_DATA[res]) {
    return log(`Unknown resource: ${res}`);
  }

  const system = systems[player.location];
  let market = system.market[res];
  let price = system.prices?.[res] ?? RESOURCE_DATA[res].base;

  // If market doesn’t exist, create it
  if (!market) {
    log(`ΛΞ started trade of ${res} in ${player.location}.`);
    price = RESOURCE_DATA[res].base * 1.25;
    market = { supply: 0, demand: 0 };
    system.market[res] = market;
    system.prices[res] = price;

    const key = `${player.location}-${res}`;
    const now = Date.now();
    const ac = JSON.parse(localStorage.getItem("atlasMarketAvailability") || "{}");
    ac[key] = { available: true, timestamp: now };
    localStorage.setItem("atlasMarketAvailability", JSON.stringify(ac));

    const md = JSON.parse(localStorage.getItem("atlasMarketData") || "{}");
    md[key] = { supply: 0, demand: 0 };
    localStorage.setItem("atlasMarketData", JSON.stringify(md));
  }

  const inv = player.inventory[res] || [];
  const inventoryAmount = inv.reduce((sum, [qty]) => sum + qty, 0);
  if (inventoryAmount === 0) return log("No inventory to sell.");

  const sellAmt = Math.min(rawAmt, inventoryAmount);

  const lastBuyTime = recentPlayerBuys[`${player.location}-${res}`];
  if (lastBuyTime && Date.now() - lastBuyTime < TRADE_COOLDOWN) {
    const wait = Math.ceil((TRADE_COOLDOWN - (Date.now() - lastBuyTime)) / 1000);
    return log(`${res} trading in ${player.location} is restricted. Wait ${wait}s.`);
  }

  // Show breakdown before confirmation
  updateSellBreakdown(res, sellAmt, price);

  pendingTrade = () => {
    let toSell = sellAmt, sold = 0, totalPaid = 0;
    for (let i = 0; i < inv.length && toSell > 0; i++) {
      const [qty, paid] = inv[i];
      const take = Math.min(qty, toSell);
      totalPaid += take * paid;
      sold += take;
      inv[i][0] -= take;
      toSell -= take;
    }
    player.inventory[res] = inv.filter(([q]) => q > 0);

    const revenue = sold * price;
    player.credits += revenue;
    flash("credits");

    market.supply += sold;
    const ratio = market.demand / market.supply;
    const base = RESOURCE_DATA[res].base;
    let newPrice =
      price * (ratio > 1
        ? 1 + (ratio - 1) * 0.01
        : 1 - (1 - ratio) * 0.01);
    system.prices[res] = parseFloat(
      Math.max(base * 0.5, Math.min(base * 3, newPrice)).toFixed(2)
    );

    updateUI();
  };

  showTradeSummary("sell", res, sellAmt, price);
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
    updateSellBreakdown(res, amt, price);
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
        )}ᶜ total; credits left: ${player.credits.toFixed(2)}ᶜ.`
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


