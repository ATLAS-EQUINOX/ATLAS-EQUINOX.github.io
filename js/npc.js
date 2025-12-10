var system; // Retained for scope compatibility (assuming global context)

// --- Helper Functions (Extracted/Refactored for Reusability) ---

/**
 * Processes inventory batches for selling a specific quantity.
 * @param {Array<[number, number]>} inventory The resource's inventory batches ([qty, buyPrice]).
 * @param {number} sellAmt The amount the NPC intends to sell.
 * @returns {{sold: number, totalPaid: number}} The actual amount sold and total cost (NPC paid) for those units.
 */
function processSellTransaction(inventory, sellAmt) {
    let toSell = sellAmt;
    let totalPaid = 0;
    let sold = 0;

    // Use a standard for loop for efficient batch processing and modification
    for (let i = 0; i < inventory.length && toSell > 0; i++) {
        const [qty, buyPrice] = inventory[i];
        const sellingQty = Math.min(qty, toSell);
        
        // Update totals
        totalPaid += sellingQty * buyPrice;
        toSell -= sellingQty;
        sold += sellingQty;
        
        // Update inventory in place
        inventory[i][0] -= sellingQty;
    }

    return { sold, totalPaid };
}

/**
 * Calculates financials for a sell transaction.
 */
function calculateSellFinancials(sold, price, totalPaid, tariffs) {
    const totalRevenue = sold * price;
    const exportTax = totalRevenue * tariffs.exportTaxRate;
    const afterTaxRevenue = totalRevenue - exportTax;
    const profitOrLoss = afterTaxRevenue - totalPaid;
    return { profitOrLoss, afterTaxRevenue, exportTax }; // 🆕 Return exportTax for logging
}

/**
 * Completes the financial and market side of the sell transaction.
 */
function completeSellTransaction(corp, market, sold, afterTaxRevenue) {
    corp.credits += afterTaxRevenue;
    market.supply += sold;
}

/**
 * Logs a completed NPC sell transaction to the market feed.
 */
function logNpcSellTransaction(
    corp,
    system,
    res,
    sold,
    price,
    profitOrLoss,
    exportTax
) {
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

// --- NPC Behavior & Simulation Core ---

function simulateNpcBehavior() {
    // 🆕 Use Object.entries for easier access to corp name (key) if needed, otherwise Object.values is fine.
    Object.values(corporations).forEach((corp) => {
        const now = Date.now();

        // 1. Warp Resolution (Priority 1)
        if (corp.warpETA && now >= corp.warpETA) {
            corp.location = corp.destination;
            corp.destination = null;
            corp.warpETA = null;
        }

        // If traveling, skip trade/travel decisions until arrival
        if (corp.warpETA) return;

        // 2. Decision Making (Optimized to avoid unnecessary Math.random calls)
        const actionRoll = Math.random();
        // 0.0 - 0.7: Trade (70% chance)
        // 0.7 - 0.85: Travel (15% chance, calculated as 50% of the 30% remaining)
        // 0.85 - 1.0: Idle (15% chance)
        
        if (actionRoll < 0.7) {
            // Trade (Double chance logic retained by iterating twice)
            for (let i = 0; i < 2; i++) {
                simulateNpcTradeAtLocation(corp);
            }
        } else if (actionRoll < 0.85) {
            // Travel
            let newDest;
            let attempts = 0;
            const maxAttempts = 3; // Use a constant for magic number
            
            // 🆕 Simplified and safer destination selection loop
            while (attempts < maxAttempts) {
                const randomIndex = Math.floor(Math.random() * SYSTEM_NAMES.length);
                newDest = SYSTEM_NAMES[randomIndex];
                if (newDest !== corp.location) break;
                attempts++;
            }
            
            // Only initiate travel if a valid, non-current destination was found
            if (newDest && newDest !== corp.location) {
                // 🆕 Use a consistent base travel time + random variance
                const baseTravelTime = 3000;
                const variance = 5000;
                corp.destination = newDest;
                corp.warpETA = now + baseTravelTime + Math.floor(Math.random() * variance);
            }
        }
    });
}

// 🆕 Combined and centralized NPC trade decision and market modification logic
function simulateNpcTradeAtLocation(corp) {
    const system = corp.location;
    // 🆕 Use nullish coalescing and destructuring for safe access
    const systemData = systems[system];
    if (!systemData) return;

    const tariffs = systemData.tariffs || { importTaxRate: 0, exportTaxRate: 0 };
    
    // 🆕 Optimized resource selection (avoid generating random index if array is empty)
    if (RESOURCE_TYPES.length === 0) return;
    const res = RESOURCE_TYPES[Math.floor(Math.random() * RESOURCE_TYPES.length)];

    const market = systemData.market?.[res];
    const price = systemData.prices?.[res];
    const base = RESOURCE_DATA[res]?.base; // 🆕 Safe access to RESOURCE_DATA
    
    // Check all prerequisites at once
    if (!market || price === undefined || base === undefined) return;

    const type = Math.random() > 0.5 ? "buy" : "sell";
    // 🆕 Use a slightly tighter range for amount
    const amount = Math.floor(Math.random() * 150) + 50;

    if (type === "buy") {
        handleNpcBuy(corp, system, res, amount, price, market, tariffs);
    } else {
        handleNpcSell(corp, system, res, amount, price, market, tariffs);
    }

    // --- Market Price Adjustment (Centralized & Optimized) ---
    
    const ratio = market.demand / market.supply;
    // 🆕 Apply change factor directly to price
    const changeFactor = ratio > 1 ? 1 + (ratio - 1) * 0.01 : 1 - (1 - ratio) * 0.01;
    let newPrice = price * changeFactor;
    
    // Clamp the new price to defined limits
    newPrice = Math.max(base * 0.5, Math.min(base * 3, newPrice));
    
    // 🆕 Only update the price once per trade function call
    systems[system].prices[res] = parseFloat(newPrice.toFixed(2));

    // 🆕 Batch UI updates (avoids spamming flash/updateUI)
    flash("market");
    // Consider moving updateUI call to the main simulation loop for better performance
    // setTimeout(updateUI, 300); 
}


// 🆕 Renamed and simplified
function handleNpcBuy(corp, system, res, amount, price, market, tariffs) {
    const importTax = price * amount * tariffs.importTaxRate;
    const totalCost = price * amount + importTax;
    
    if (corp.credits >= totalCost) {
        corp.credits -= totalCost;
        market.demand += amount; // Supply/demand reaction happens instantly

        // Prepare shipment
        const delay = getRandomShipmentDelay(); // Assumed external function
        corp.shipments.push({
            resource: res,
            amount,
            price: price, // Store the price paid for calculation later
            time: Date.now() + delay,
        });
        // tradeTimestamps.push(Date.now()); // Assumed external array

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

// 🆕 Simplified
function handleNpcSell(corp, system, res, amount, price, market, tariffs) {
    const inventory = corp.inventory[res];
    if (!inventory || inventory.length === 0) return;

    // Use reduce to quickly get total inventory quantity
    const totalQty = inventory.reduce((sum, [qty]) => sum + qty, 0);
    const sellAmt = Math.min(totalQty, amount);

    if (sellAmt > 0) {
        const { sold, totalPaid } = processSellTransaction(inventory, sellAmt);
        
        // 🆕 Efficiently clean up empty batches and the resource key itself
        corp.inventory[res] = inventory.filter(([q]) => q > 0);
        if (corp.inventory[res].length === 0) {
            delete corp.inventory[res];
        }

        const { profitOrLoss, afterTaxRevenue, exportTax } = calculateSellFinancials(
            sold,
            price,
            totalPaid,
            tariffs
        );
        
        // 🆕 Simplified loss aversion logic: 40% chance to sell at a loss
        if (profitOrLoss >= 0 || Math.random() < 0.4) {
            completeSellTransaction(corp, market, sold, afterTaxRevenue);
            logNpcSellTransaction(
                corp,
                system,
                res,
                sold,
                price,
                profitOrLoss,
                exportTax
            );
        } else {
            // Rollback: Re-add the sold quantity as a single batch (average buy price)
            // 🆕 Simplified rollback by adding the goods back as a single batch with the effective paid price
            const effectivePaidPrice = totalPaid / sold;
            corp.inventory[res].push([sold, effectivePaidPrice]);
        }
    }
}


function processNpcShipments() {
    const now = Date.now();
    
    // 🆕 Use Object.values and reduce to build the new shipments array and apply updates in one pass
    Object.values(corporations).forEach((corp) => {
        if (!corp.shipments) return;

        corp.shipments = corp.shipments.reduce((remaining, s) => {
            if (s.time <= now) {
                // Shipment complete
                if (!corp.inventory[s.resource]) {
                    corp.inventory[s.resource] = [];
                }
                corp.inventory[s.resource].push([s.amount, s.price]);
                return remaining; // Don't add to remaining
            } else {
                // Shipment pending
                remaining.push(s);
                return remaining;
            }
        }, []);
    });
}