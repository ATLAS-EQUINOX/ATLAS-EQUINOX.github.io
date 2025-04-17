function simulateNpcBehavior() {
  Object.values(corporations).forEach((corp) => {
    // Complete warp if time is up
    if (corp.warpETA && Date.now() >= corp.warpETA) {
      corp.location = corp.destination;
      corp.destination = null;
      corp.warpETA = null;
    }

    // If traveling, skip
    if (corp.warpETA) return;

    // Give NPCs a higher chance to act
    const shouldTrade = Math.random() < 0.7;
    const shouldTravel = !shouldTrade && Math.random() < 0.5;

    // Trade if possible
    if (shouldTrade) {
      for (let i = 0; i < 2; i++) {
        simulateNpcTradeAtLocation(corp); // Double trade chance per call
      }
    }

    // Travel to a new system occasionally
    if (shouldTravel) {
      let newDest;
      for (let attempts = 0; attempts < 3; attempts++) {
        newDest = SYSTEM_NAMES[Math.floor(Math.random() * SYSTEM_NAMES.length)];
        if (newDest !== corp.location) break;
      }
      corp.destination = newDest;
      corp.warpETA = Date.now() + Math.floor(Math.random() * 5000) + 3000;
    }
  });
}

function handleNpcBuy(corp, system, res, amount, price, market, tariffs) {
  const importTax = price * amount * tariffs.importTaxRate;
  const totalCost = price * amount + importTax;

  if (corp.credits >= totalCost) {
    corp.credits -= totalCost;
    market.demand += amount;

    const delay = getRandomShipmentDelay();
    corp.shipments.push({
      resource: res,
      amount,
      price,
      time: Date.now() + delay,
    });
    tradeTimestamps.push(Date.now());

    logMarket(
      `<span class="text-warning">${
        corp.name
      }</span> purchased ${amount}${UNIT} of ${res} in ${system} | ${price.toFixed(
        2
      )}ᶜ each (Tax: <span class="text-danger">${importTax.toFixed(
        2
      )}ᶜ</span>, Total: <span class="text-success">${totalCost.toFixed(
        2
      )}ᶜ</span>)`
    );
  }
}

function handleNpcSell(corp, system, res, amount, price, market, tariffs) {
  const inventory = corp.inventory[res];
  const totalQty = inventory.reduce((sum, [qty]) => sum + qty, 0);
  const sellAmt = Math.min(totalQty, amount);

  if (sellAmt > 0) {
    const { sold, totalPaid } = processSellTransaction(inventory, sellAmt);
    corp.inventory[res] = inventory.filter(([q]) => q > 0);

    const { profitOrLoss, afterTaxRevenue } = calculateSellFinancials(
      sold,
      price,
      totalPaid,
      tariffs
    );

    if (profitOrLoss >= 0 || Math.random() < 0.4) {
      completeSellTransaction(corp, market, sold, afterTaxRevenue);
      logNpcSellTransaction(
        corp,
        system,
        res,
        sold,
        price,
        profitOrLoss,
        tariffs.exportTaxRate
      );
    } else {
      inventory.push([sold, totalPaid / sold]);
    }
  }
}

function logNpcSellTransaction(
  corp,
  system,
  res,
  sold,
  price,
  profitOrLoss,
  exportTaxRate
) {
  const exportTax = sold * price * exportTaxRate;
  const afterTax = sold * price - exportTax;
  const profitColor = profitOrLoss >= 0 ? "text-success" : "text-danger";
  const profitLabel = profitOrLoss >= 0 ? "Profit" : "Loss";

  logMarket(
    `<span class="text-warning">${
      corp.name
    }</span> sold ${sold}${UNIT} of ${res} in ${system} |
      <span class="text-info">${price.toFixed(2)}ᶜ</span> each
      (Tax: <span class="text-danger">${exportTax.toFixed(2)}ᶜ</span>,
      <span class="${profitColor}">${profitLabel}: ${profitOrLoss.toFixed(
      2
    )}ᶜ</span>)`
  );
}

function simulateNpcTradeAtLocation(corp) {
  const system = corp.location;
  const tariffs = systems[system]?.tariffs || {
    importTaxRate: 0,
    exportTaxRate: 0,
  };
  const res = RESOURCE_TYPES[Math.floor(Math.random() * RESOURCE_TYPES.length)];

  const market = systems[system]?.market?.[res];
  const price = systems[system].prices[res];
  const base = RESOURCE_DATA[res].base;
  if (!market || !price) return;

  const type = Math.random() > 0.5 ? "buy" : "sell";
  const amount = Math.floor(Math.random() * 200) + 50;

  if (type === "buy") {
    handleNpcBuy(corp, system, res, amount, price, market, tariffs);
  } else {
    handleNpcSell(corp, system, res, amount, price, market, tariffs);
  }

  const ratio = market.demand / market.supply;
  let newPrice =
    price * (ratio > 1 ? 1 + (ratio - 1) * 0.01 : 1 - (1 - ratio) * 0.01);
  newPrice = Math.max(base * 0.5, Math.min(base * 3, newPrice));
  systems[system].prices[res] = parseFloat(newPrice.toFixed(2));

  flashMarketCell(system, res);
  setTimeout(updateUI, 300);
}

function processNpcShipments() {
  const now = Date.now();
  for (const corp of Object.values(corporations)) {
    const remaining = [];
    for (const s of corp.shipments || []) {
      if (s.time <= now) {
        if (!corp.inventory[s.resource]) {
          corp.inventory[s.resource] = [];
        }
        corp.inventory[s.resource].push([s.amount, s.price]);
      } else {
        remaining.push(s);
      }
    }
    corp.shipments = remaining;
  }
}

function processSellTransaction(inventory, sellAmt) {
  let toSell = sellAmt;
  let totalPaid = 0;
  let sold = 0;

  for (let i = 0; i < inventory.length && toSell > 0; i++) {
    let [qty, buyPrice] = inventory[i];
    const sellingQty = Math.min(qty, toSell);
    totalPaid += sellingQty * buyPrice;
    inventory[i][0] -= sellingQty;
    toSell -= sellingQty;
    sold += sellingQty;
  }

  return { sold, totalPaid };
}

function calculateSellFinancials(sold, price, totalPaid, tariffs) {
  const totalRevenue = sold * price;
  const exportTax = totalRevenue * tariffs.exportTaxRate;
  const afterTaxRevenue = totalRevenue - exportTax;
  const profitOrLoss = afterTaxRevenue - totalPaid;
  return { profitOrLoss, afterTaxRevenue };
}

function completeSellTransaction(corp, market, sold, afterTaxRevenue) {
  corp.credits += afterTaxRevenue;
  market.supply += sold;
}
