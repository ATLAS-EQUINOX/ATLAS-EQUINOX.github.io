var system;
function showWelcomeModal() {
  const welcomeModal = document.getElementById("AboutModal");
  if (welcomeModal) {
    welcomeModal.style.display = "block";
  }
}

function populateCustomDropdown(listId, items, onClickHandler) {
  const list = document.getElementById(listId);
  list.innerHTML = ""; // Clear existing items
  items.forEach((item) => {
    const li = document.createElement("li");
    li.className = "list-group-item list-group-item-action";
    li.textContent = item;
    li.onclick = () => onClickHandler(item);
    list.appendChild(li);
  });
}

function populateWarpDropdown() {
  const sel = document.getElementById("travelSearch");
  if (!sel) {
    console.error("populateWarpDropdown(): #travelSearch not found");
    return;
  }

  // clear out any old options
  sel.innerHTML = "";

  // SYSTEM_NAMES is your array of all jump destinations
  SYSTEM_NAMES.forEach((system) => {
    const opt = document.createElement("option");
    opt.value = system;
    opt.textContent = system;
    sel.appendChild(opt);
  });
}


function createStyledInfoCard(message = "No data.", color = "#555") {
  const li = document.createElement("li");
  li.style.borderLeft = `4px solid ${color}`;
  li.style.padding = "6px 10px";
  li.style.backgroundColor = "#111";
  li.style.margin = "0";
  li.style.borderRadius = "4px";
  li.style.listStyle = "none";

  const inner = document.createElement("div");
  inner.className = "d-flex justify-content-between";
  inner.innerHTML = `<span class="text-muted small">${message}</span>`;

  li.appendChild(inner);
  return li;
}

function filterList(inputId, listId) {
  const input = document.getElementById(inputId).value.toLowerCase();
  const listItems = document.getElementById(listId).getElementsByTagName("li");
  for (let item of listItems) {
    const text = item.textContent.toLowerCase();
    item.style.display = text.includes(input) ? "" : "none";
  }
}

function showDropdown(listId) {
  // Hide all dropdowns first
  document.querySelectorAll(".custom-dropdown").forEach((dropdown) => {
    dropdown.classList.add("d-none");
  });
  // Show the targeted one
  const list = document.getElementById(listId);
  if (list) list.classList.remove("d-none");
}

function hideDropdown(listId) {
  document.getElementById(listId).classList.add("d-none");
}

function renderTaxSidebar() {
  const tbody = document.getElementById("taxSidebarBody");
  if (!tbody) return;
  tbody.innerHTML = "";

  const tariffCache =
    JSON.parse(localStorage.getItem("atlasTariffCache")) || {};

  SYSTEM_NAMES.forEach((name) => {
    const { importTaxRate, exportTaxRate } = systems[name]?.tariffs || {
      importTaxRate: 0,
      exportTaxRate: 0,
    };

    const tr = document.createElement("tr");
    tr.innerHTML = `
        <td>${name}</td>
        <td class="text-info">${(importTaxRate * 100).toFixed(1)}</td>
        <td class="text-danger">${(exportTaxRate * 100).toFixed(1)}</td>
      `;
    tbody.appendChild(tr);
  });
}

function updateGameAgeDisplay() {
  const el = document.getElementById("gameAge");
  if (!el || !gameStartTime) return;
  const elapsed = Date.now() - gameStartTime;
  const seconds = Math.floor((elapsed / 1000) % 60);
  const minutes = Math.floor((elapsed / 1000 / 60) % 60);
  const hours = Math.floor(elapsed / 1000 / 60 / 60);
  el.textContent = `Runtime: ${hours}h ${minutes}m ${seconds}s`;
}

function toggleTravelButton() {
  const btn = document.getElementById("travelButton");
  const selected = document.getElementById("travelSearch").value;

  if (selected === player.location) {
    btn.disabled = true;
    btn.innerText = "Current";
  } else {
    const path = getWarpPath(player.location, selected);
    if (!path) {
      btn.disabled = true;
      btn.innerText = "No Route";
    } else {
      const hops = path.length - 1;
      const cost = hops * 10; // adjust if needed
      btn.disabled = player.fuel < cost;
      btn.innerText = `Warp (${hops} Jump${hops !== 1 ? "s" : ""})`;
    }
  }
}

function populateSelectors() {
  const sel = document.getElementById("tradeResourceSelect");
  if (!sel) {
    console.error("populateSelectors(): #tradeResourceSelect not found");
    return;
  }

  // clear out any old options
  sel.innerHTML = "";

  // only insert resources that actually exist in RESOURCE_DATA
  RESOURCE_TYPES.forEach((res) => {
    if (!RESOURCE_DATA[res]) {
      console.warn(`populateSelectors(): skipping unknown resource → "${res}"`);
      return;
    }
    const opt = document.createElement("option");
    opt.value = res;
    opt.textContent = res;
    sel.appendChild(opt);
  });
}



function updateLeaderboard() {
  const tbody = document.getElementById("leaderboardBody");
  if (!tbody) return;
  tbody.innerHTML = ""; // Clear existing rows

  const leaderboard = [
    {
      name: "ΛTLΛS | ΞQUINOX™",
      netWorth: player.credits + calculateInventoryValue(player.inventory),
      credits: player.credits,
      inventoryValue: calculateInventoryValue(player.inventory),
      topTrade: getTopTrade(player.inventory),
      tradeCount: player.shipments?.length || 0,
      lastTrade: getLastTradeTime(player),
      location: player.location,
      inTransit: "No",
    },
    ...Object.values(corporations).map((corp) => {
      const inventoryValue = calculateInventoryValue(corp.inventory);
      const netWorth = corp.credits + inventoryValue;
      return {
        name: corp.name,
        netWorth,
        credits: corp.credits,
        inventoryValue,
        topTrade: getTopTrade(corp.inventory),
        tradeCount: corp.shipments?.length || 0,
        lastTrade: getLastTradeTime(corp),
        location: corp.location,
        inTransit: corp.destination ? "Yes" : "No",
      };
    }),
  ].sort((a, b) => b.netWorth - a.netWorth);

  leaderboard.forEach((corp, i) => {
    const tr = document.createElement("tr");

    // Highlight player row
    if (corp.name === "ΛTLΛS | ΞQUINOX™") {
      tr.classList.add("player-row");
    }

    tr.innerHTML = `
              <td>${i + 1}</td>
              <td>${corp.name}</td>
              <td>${corp.netWorth.toFixed(2)}ᶜ</td>
              <td>${corp.credits.toFixed(2)}</td>
              <td>${corp.inventoryValue.toFixed(2)}</td>
          `;

    tbody.appendChild(tr);
  });
}

function updateRefuelButton() {
  const refuelBtn = document.getElementById("refuelButton");
  const fuelPrice = systems[player.location]?.prices?.Fuel ?? 10;
  const needed = FUEL_CAPACITY - player.fuel;
  const canAfford = Math.min(needed, Math.floor(player.credits / fuelPrice));

  if (player.fuel >= FUEL_CAPACITY) {
    refuelBtn.disabled = true;
    refuelBtn.innerText = "Max Fuel";
  } else if (canAfford === 0) {
    refuelBtn.disabled = true;
    refuelBtn.innerText = "Insufficient Credits";
  } else {
    refuelBtn.disabled = false;
    refuelBtn.innerText = `Refuel (${canAfford} units)`;
  }
}

function updateSellAllButton() {
  const sellAllBtn = document.getElementById("sellAllButton");
  const inventoryPanel = document.getElementById("sidebarInventoryContent");

  if (!sellAllBtn || !inventoryPanel) return;

  const hasInventory = Object.values(player.inventory).some((batches) =>
    batches.some(([qty]) => qty > 0)
  );

  // Only show button if panel is open and inventory has items
  if (inventoryPanel.style.display !== "none" && hasInventory) {
    sellAllBtn.style.display = "block";
  } else {
    sellAllBtn.style.display = "none";
  }
}

function sellBatch(resource, price) {
  const batches = player.inventory[resource];
  let soldQty = 0;
  let totalPaid = 0;
  const remaining = [];
  for (const [qty, paid] of batches) {
    if (paid === price) {
      soldQty += qty;
      totalPaid += qty * paid;
    } else {
      remaining.push([qty, paid]);
    }
  }
  if (soldQty === 0) return log(`No ${resource}  |  ${price}ᶜ to sell.`);
  const sellPrice = systems[player.location].prices[resource] || 0;
  const revenue = soldQty * sellPrice;
  const profit = revenue - totalPaid;
  player.inventory[resource] = remaining;
  player.credits += revenue;
  flash("credits");
  updateUI();
  const profitColor = profit >= 0 ? "text-success" : "text-danger";
  const profitLabel = profit >= 0 ? "Profit" : "Loss";

  log(
    `Sold ${soldQty}${UNIT} of ${resource} at ${sellPrice.toFixed(
      2
    )}ᶜ each (Total: ${revenue.toFixed(2)}ᶜ)`
  );
  tradeTimestamps.push(Date.now());

  logMarket(
    `<span class="text-warning">ΛTLΛS | ΞQUINOX™</span> sold  ${soldQty}${UNIT} of ${resource}  |  <span class="text-info">${sellPrice.toFixed(
      2
    )}ᶜ</span> each (<span class="${profitColor}">${profitLabel}: ${profit.toFixed(
      2
    )}ᶜ</span>)`
  );
}

function updateInventoryDisplay() {
  const container = document.getElementById("inventoryItemsContainer");
  container.innerHTML = "";

  let totalValue = 0;
  // First, calculate total value across all batches
  for (const res in player.inventory) {
    const batches = player.inventory[res];
    const marketPrice = systems[player.location]?.prices[res] || 0;
    totalValue += batches.reduce((sum, [qty]) => sum + qty * marketPrice, 0);
  }
  // Update the header
  const inventoryHeader = document.getElementById("inventoryHeader");
  if (inventoryHeader) {
    inventoryHeader.innerHTML = ``;
  }
  for (const res in player.inventory) {
    const batches = player.inventory[res];
    if (batches.length === 0) continue;

    const resDiv = document.createElement("div");
    resDiv.className = "resource-group";
    const resHeader = document.createElement("div");
    resHeader.className =
      "d-flex justify-content-between align-items-center mb-1";
    const resTitle = document.createElement("strong");
    resTitle.className = "text-warning";
    resTitle.textContent = res;
    const sellAllBtn = document.createElement("button");
    sellAllBtn.className = "sell-batch-btn";
    sellAllBtn.textContent = "Sell Resource";
    sellAllBtn.onclick = () => {
      sellAllOfResource(res);
    };
    resHeader.appendChild(resTitle);
    resHeader.appendChild(sellAllBtn);
    resDiv.appendChild(resHeader);
    const grouped = {};
    batches.forEach(([qty, price]) => {
      grouped[price] = (grouped[price] || 0) + qty;
    });

    Object.entries(grouped).forEach(([price, qty]) => {
      const line = document.createElement("div"); // ✅ Define first
      line.className = "batch-line";

      const infoSpan = document.createElement("span");
      infoSpan.textContent = `${qty}${UNIT}  |  ${parseFloat(price).toFixed(
        2
      )}ᶜ`;

      const moveBtn = document.createElement("button");
      moveBtn.className = "move-batch-btn btn-sm";
      moveBtn.textContent = "↪ Move to Vault";
      moveBtn.onclick = () => {
        moveBatch(res, parseFloat(price), qty, "inventory", "vault");
        updateUI();
      };

      const sellBtn = document.createElement("button");
      sellBtn.className = "sell-batch-btn";
      sellBtn.textContent = "Sell";
      sellBtn.onclick = () => {
        sellBtn.disabled = true;
        sellBtn.textContent = "Processing...";
        setTimeout(() => {
          sellBatch(res, parseFloat(price));
          updateUI();
        }, 100);
      };

      line.appendChild(infoSpan);

      line.appendChild(moveBtn);
      line.appendChild(sellBtn);
      resDiv.appendChild(line);
    });

    const marketPrice = systems[player.location]?.prices[res] || 0;
    const resValue = batches.reduce((sum, [qty]) => sum + qty * marketPrice, 0);
    totalValue += resValue;
    const valueLine = document.createElement("div");
    valueLine.className = "market-value-line";
    valueLine.innerHTML = `<span>Value:</span> ${resValue.toFixed(2)}ᶜ</span>`;
    resDiv.appendChild(valueLine);
    container.appendChild(resDiv);
  }
  if (container.children.length === 0) {
    container.appendChild(createStyledInfoCard("No materials in inventory."));
  }
}

function togglePanel(id) {
  const el = document.getElementById(id);
  const toggle = el.previousElementSibling.querySelector(".expandable");
  if (el.style.display === "none") {
    el.style.display = "block";
    toggle.textContent = "▲▼ | Open";
  } else {
    el.style.display = "none";
    toggle.textContent = "▼▲ | Closed";
  }

  // Update sell button visibility if we're toggling the inventory panel
  if (id === "sidebarInventoryContent") {
    updateSellAllButton();
  }
}

function updateVaultDisplay() {
  const container = document.getElementById("vaultInventoryContent");
  if (!container) {
    console.warn("Vault container not found in DOM.");
    return;
  }
  container.innerHTML = "";

  let hasItems = false; // ✅ Add this

  for (const res in player.vault) {
    const batches = player.vault[res];
    if (!batches || batches.length === 0) continue;

    hasItems = true; // ✅ Set to true if at least one resource has items

    const resDiv = document.createElement("div");
    resDiv.className = "resource-group2";

    const resHeader = document.createElement("div");
    resHeader.className =
      "d-flex justify-content-between align-items-center mb-1";

    const resTitle = document.createElement("strong");
    resTitle.className = "resource-name2";
    resTitle.textContent = res;

    resHeader.appendChild(resTitle);
    resDiv.appendChild(resHeader);

    const grouped = {};
    batches.forEach(([qty, price]) => {
      grouped[price] = (grouped[price] || 0) + qty;
    });

    Object.entries(grouped).forEach(([price, qty]) => {
      const line = document.createElement("div");
      line.className = "batch-line";

      const infoSpan = document.createElement("span");
      infoSpan.textContent = `${qty}${UNIT}  |  ${parseFloat(price).toFixed(
        2
      )}ᶜ`;

      const moveBtn = document.createElement("button");
      moveBtn.className = "move-batch-btn2 btn-sm";
      moveBtn.textContent = "↩ Move to Inventory";
      moveBtn.onclick = () => {
        moveBatch(res, parseFloat(price), qty, "vault", "inventory");
        updateUI();
      };

      line.appendChild(infoSpan);

      line.appendChild(moveBtn);
      resDiv.appendChild(line);
    });

    container.appendChild(resDiv);
  }

  // ✅ Show "empty vault" message if no items found
  if (!hasItems) {
    container.appendChild(createStyledInfoCard("No materials in vault."));
  }
}

function flashMarketCell(system, res) {
  const index = RESOURCE_TYPES.indexOf(res);
  if (index === -1) return;
  const table = document.getElementById("marketTable");
  const rows = table.getElementsByTagName("tr");
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.firstChild.textContent === system) {
      const cell = row.children[index + 1]; // +1 to skip "System" column
      if (cell) {
        cell.classList.add("flash-highlight");
        setTimeout(() => cell.classList.remove("flash-highlight"), 600);
      }
      break;
    }
  }
}

function interpolateColor(startHex, endHex, factor) {
  const hexToRgb = (hex) => hex.match(/\w\w/g).map((c) => parseInt(c, 16));
  const rgbToHex = (rgb) =>
    "#" + rgb.map((c) => Math.round(c).toString(16).padStart(2, "0")).join("");
  const start = hexToRgb(startHex);
  const end = hexToRgb(endHex);
  const result = start.map(
    (startVal, i) => startVal + factor * (end[i] - startVal)
  );
  return rgbToHex(result);
}

function processAndRenderShipments() {
  const now = Date.now();
  const shipmentsList = document.getElementById("shipments");
  if (!shipmentsList) return;
  let updated = false;
  const remainingShipments = [];
  for (const s of player.shipments) {
    const timeRemaining = s.time - now;
    if (timeRemaining <= 0) {
      if (s.internal) {
        if (!player[s.to][s.resource]) player[s.to][s.resource] = [];
        player[s.to][s.resource].push([s.amount, s.price]);
        log(`${s.amount}${UNIT} of ${s.resource} moved to ${s.to}.`);
      } else {
        if (!player.inventory[s.resource]) player.inventory[s.resource] = [];
        player.inventory[s.resource].push([s.amount, s.price]);
        log(`${s.amount}${UNIT} of ${s.resource} added to inventory.`);
      }
      updated = true;
    } else {
      remainingShipments.push(s); // ← this was missing!
    }
  }

  player.shipments = remainingShipments;
  const title = document.getElementById("shipmentsTitle");
  if (title) {
    const count = player.shipments.length;
    title.innerHTML =
      `Incoming Shipments:` +
      (count > 0 ? ` <span class="text-info">${count}</span>` : "");
  }
  const sortedShipments = [...player.shipments].sort((a, b) => a.time - b.time);
  const topThree = sortedShipments.slice(0, 3);
  const shipmentSection = document
    .querySelector("#shipments")
    .closest("section");
  if (player.shipments.length === 0) {
    shipmentsList.innerHTML = `<li><span class="text-muted small">No incoming shipments.</span></li>`;
  } else {
    shipmentSection.style.display = "block";
    shipmentsList.innerHTML = topThree
      .map((s) => {
        const remaining = Math.max(0, Math.ceil((s.time - now) / 1000));
        const hrs = Math.floor(remaining / 3600);
        const mins = Math.floor((remaining % 3600) / 60);
        const secs = remaining % 60;
        const hms = `${hrs}h ${mins}m ${secs}s`;
        const color = s.internal ? "#17a2b8" : "#ffc107"; // teal for internal, yellow for others

        const label = s.internal
          ? `↔ ${s.amount}${UNIT} ${s.resource} (${s.from} → ${s.to})`
          : `${s.id} | ${s.amount}${UNIT} ${s.resource}`;

        return `<li style="border-left: 4px solid ${color}; padding-left: 6px;">
        <div class="d-flex justify-content-between">
          <span class="text-muted small">${label} | ETA: ${hms}</span>
        </div>
      </li>`;
      })
      .join("");
  }
  if (updated) {
    updateInventoryDisplay();
    updateSellAllButton();
  }
}

function getUsageColor(current, max) {
  const percent = current / max;
  if (percent >= 0.95) return "#ff"; // 🔴 storage Critical
  if (percent >= 0.75) return "#ff"; // 🟠 storage Warning
  return "#ffffff"; // ⚪️ Safe
}

function updateStorageUsage() {
  const invCount = countBatches(player.inventory);
  const vaultCount = countBatches(player.vault);

  const invSpan = document.getElementById("inventoryCount");
  const vaultSpan = document.getElementById("vaultCount");

  if (invSpan) {
    invSpan.textContent = invCount;
    invSpan.style.color = getUsageColor(invCount, 250);
  }

  if (vaultSpan) {
    vaultSpan.textContent = vaultCount;
    vaultSpan.style.color = getUsageColor(vaultCount, 25);
  }
}

function randomizeGlitchDelays() {
  document.querySelectorAll(".glitch-effect").forEach((el) => {
    const delay = (Math.random() * 2).toFixed(2); // 0.00 to 2.00s
    el.style.animationDelay = `${delay}s`;
  });
}

function updateMarketTable() {
  const table = document.getElementById("marketTable");
  if (!table) return;

  const frag = document.createDocumentFragment();

  const minPrices = {};
  const maxPrices = {};
  RESOURCE_TYPES.forEach((res) => {
    const prices = SYSTEM_NAMES.map(
      (system) => systems[system].prices?.[res] ?? Infinity
    );
    minPrices[res] = Math.min(...prices);
    maxPrices[res] = Math.max(...prices);
  });

  let visibleSystems = SYSTEM_NAMES;
  if (marketViewMode === "current") {
    visibleSystems = [player.location];
  }

  let rows = visibleSystems.map((system) => {
    const systemData = systems[system];
    const prices = {};
    RESOURCE_TYPES.forEach((res) => {
      prices[res] = systemData.prices?.[res];
    });
    return { system, prices };
  });

  rows.sort((a, b) => {
    const distA = getWarpPath(player.location, a.system)?.length || Infinity;
    const distB = getWarpPath(player.location, b.system)?.length || Infinity;
    return distA - distB;
  });

  const currentSystem = player.location;
  const currentIndex = rows.findIndex((r) => r.system === currentSystem);
  if (currentIndex > 0) {
    const [currentRow] = rows.splice(currentIndex, 1);
    rows.unshift(currentRow);
  }

  function formatEstimate(val, hops) {
    if (hops === null || hops > 12) return "∅";

    if (hops <= 7) return val.toFixed(2);
    if (hops === 9) return val.toFixed(1);
    if (hops <= 10) return Math.round(val).toString();
    // Hide zero estimates
    return `${Math.round(val / 25) * 25}`;
  }

  rows.forEach(({ system, prices }) => {
    const systemData = systems[system];
    const row = document.createElement("tr");
    if (system === player.location) row.classList.add("current-system-row");

    const nameCell = document.createElement("td");
    nameCell.textContent = system;
    row.appendChild(nameCell);

    RESOURCE_TYPES.forEach((res) => {
      const market = systemData.market?.[res];
      const price = prices[res];

      const cell = document.createElement("td");
      cell.setAttribute("data-system", system);
      cell.setAttribute("data-resource", res);
      const path = getWarpPath(player.location, system);
      const hops = path ? path.length - 1 : null;

      const display = formatEstimate(price, hops);
      const isCorrupted = display === "∅";

      if (!market || price === undefined || isCorrupted) {
        cell.className = "text-muted text-center unavailable-cell";
        cell.innerHTML = isCorrupted
          ? `<span class="glitch-effect" data-text="">∅</span>`
          : "—";
      } else {
        const trend = lastPrices[`${system}-${res}`]?.trend ?? "same";

        cell.className = `price-cell ${trend}`;
        if (price === minPrices[res]) cell.classList.add("lowest-price-cell");
        if (price === maxPrices[res]) cell.classList.add("highest-price-cell");

        if (
          systems[system].specializations?.some((spec) =>
            SPECIALIZATION_EFFECTS[spec]?.includes(res)
          )
        ) {
          cell.classList.add("specialized-cell");
        }

        const display = formatEstimate(price, hops);
        const displayHTML =
          display === "∅"
            ? `<span class="glitch-effect" data-text="">∅</span>`
            : display;

        cell.innerHTML = `
            ${displayHTML}
            <div class="supply-demand-info">
              <span>S: ${formatEstimate(market.supply, hops)}${UNIT}</span><br>
              <span>D: ${formatEstimate(market.demand, hops)}${UNIT}</span>
            </div>`;
      }

      row.appendChild(cell);
    });

    frag.appendChild(row);
  });

  table.innerHTML = "";
  table.appendChild(frag);
}

function updateLocationUI() {
  const el = document.getElementById("location");
  if (el) el.textContent = player.location;
}

function updateMarketOverviewTitle() {
  const el = document.getElementById("location2");
  if (el) el.textContent = player.location;
}

function updateCreditsUI() {
  const el = document.getElementById("credits");
  if (el) el.textContent = player.credits.toFixed(2);
}

function updateFuelUI() {
  const el = document.getElementById("fuel");
  if (el) el.textContent = parseFloat(player.fuel.toFixed(2));
}

function updateMarketHeading() {
  const headingTable = document.getElementById("marketHeadingTable");
  if (!headingTable) return;

  headingTable.innerHTML = "";

  const headerRow = document.createElement("tr");

  // First column: System
  let sortIcon = "";
  if (sortState.column === "System") {
    sortIcon = sortState.ascending ? " ↑" : " ↓";
  }
  headerRow.innerHTML = `<th onclick="sortBy('System')">System${sortIcon}</th>`;

  // Resource columns
  RESOURCE_TYPES.forEach((res) => {
    let icon = "";
    if (sortState.column === res) {
      icon = sortState.ascending ? " ↑" : " ↓";
    }
    const th = document.createElement("th");
    th.innerHTML = `${res}${icon}`;
    th.onclick = () => sortBy(res);
    headerRow.appendChild(th);
  });

  headingTable.appendChild(headerRow);
}

function updateSpreadTable() {
  const spreadTable = document.getElementById("spreadTable");
  if (!spreadTable) return;

  const resourceMin = {},
    resourceMax = {};
  RESOURCE_TYPES.forEach((res) => {
    const prices = SYSTEM_NAMES.map(
      (system) => systems[system].prices?.[res] ?? Infinity
    );
    resourceMin[res] = Math.min(...prices);
    resourceMax[res] = Math.max(...prices);
  });

  const row = document.createElement("tr");
  row.innerHTML = `<th class="text-muted small text-center resource-name">DΞLTΛ</th>`;

  let highestSpread = 0;
  let highestResource = "";

  RESOURCE_TYPES.forEach((res) => {
    const spread = resourceMax[res] - resourceMin[res];
    if (spread > highestSpread) {
      highestSpread = spread;
      highestResource = res;
    }
  });

  RESOURCE_TYPES.forEach((res) => {
    const spread = (resourceMax[res] - resourceMin[res]).toFixed(2);
    const highlight = res === highestResource ? "highest-spread" : "";
    row.innerHTML += `<th class="${highlight} small text-center">${spread} Δ</th>`;
  });

  spreadTable.innerHTML = "";
  spreadTable.appendChild(row);
}

function updateSellButton() {
  const res = document.getElementById("tradeResourceSelect").value;
  const sellBtn = document.querySelector("button.btn-danger"); // assuming this is the Sell button

  if (!sellBtn || !res) return;

  const inventoryAmount =
    player.inventory[res]?.reduce((sum, [qty]) => sum + qty, 0) || 0;

  sellBtn.disabled = inventoryAmount === 0;
  sellBtn.innerText = inventoryAmount === 0 ? "-" : "Sell";
}

function toggleMarketView() {
  marketViewMode = marketViewMode === "all" ? "current" : "all";
  const btn = document.getElementById("toggleMarketView");

  btn.innerHTML =
    marketViewMode === "all"
      ? '<i class="fa fa-toggle-on" aria-hidden="true"></i> | Show Only Current System'
      : '<i class="fa fa-toggle-off" aria-hidden="true"></i> | Show All Systems';

  updateUI();
}

function sortBy(col) {
  sortState.ascending = sortState.column === col ? !sortState.ascending : true;
  sortState.column = col;
  updateUI();
}

function disableTradeControls(disabled) {
  const ids = [
    "buyResource",
    "buyAmount",
    "refuelButton",
    "sellAllMaterials",
    "travelSearch",
    "travelButton",
  ];
  ids.forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.disabled = disabled;
  });
  document.querySelectorAll("button").forEach((btn) => {
    if (
      btn.textContent.includes("Buy Resource") ||
      btn.textContent.includes("Sell Resource")
    ) {
      btn.disabled = disabled;
    }
  });
}

function renderTariffModal() {
  const tbody = document.getElementById("tariffTableBody");
  tbody.innerHTML = "";

  SYSTEM_NAMES.forEach((name) => {
    const { importTaxRate, exportTaxRate } = systems[name]?.tariffs || {
      importTaxRate: 0,
      exportTaxRate: 0,
    };

    const tr = document.createElement("tr");
    tr.innerHTML = `
        <td>${name}</td>
        <td class="text-info">${(importTaxRate * 100).toFixed(1)}%</td>
        <td class="text-danger">${(exportTaxRate * 100).toFixed(1)}%</td>
      `;
    tbody.appendChild(tr);
  });
}
