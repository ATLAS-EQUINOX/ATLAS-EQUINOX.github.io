let warpAbortLogged = false;
let isWarping = false;
let tradeTimestamps = [];
let warpAborted = false;

let gamePaused = false;

let lastPrices = {};
let pendingTrade = null;
let marketViewMode = "all";
let systems = {};

const recentPlayerBuys = {}; // Format: { "Sol-Iron": timestamp }
const TRADE_COOLDOWN = 10000; // 10 seconds cooldown to prevent resell exploits
const TARIFF_CACHE_KEY = "atlasTariffCache";

let corporations = {};
window.activeContracts = [];
const UNIT = "ᵣ";
let expandedResources = {};
const npcLastTradeTime = {};

function calculateInitialTrends() {
  const savedPriceData = JSON.parse(
    localStorage.getItem("atlasPriceHistory") || "{}"
  );
  const historyStore = JSON.parse(
    localStorage.getItem("atlasPriceHistoryGraph") || "{}"
  );

  SYSTEM_NAMES.forEach((system) => {
    RESOURCE_TYPES.forEach((res) => {
      const key = `${system}-${res}`;
      const currentPrice = getTimeSeededPrice(system, res);

      // Save to current data for trends
      let trend = "same";
      const previousPrice = savedPriceData[key];
      if (previousPrice !== undefined) {
        if (currentPrice > previousPrice) {
          trend = "up";
        } else if (currentPrice < previousPrice) {
          trend = "down";
        }
      }

      lastPrices[key] = {
        price: currentPrice,
        trend,
        timestamp: Date.now(),
      };

      if (!systems[system]) systems[system] = { name: system, prices: {} };
      systems[system].prices[res] = currentPrice;
      savedPriceData[key] = currentPrice;

      // 💾 Store historical point
      historyStore[key] ||= [];
      historyStore[key].push({ time: Date.now(), price: currentPrice });
    });
  });

  localStorage.setItem("atlasPriceHistory", JSON.stringify(savedPriceData));
  localStorage.setItem("atlasPriceHistoryGraph", JSON.stringify(historyStore));
}

npcCorporations.forEach((name) => {
  corporations[name] = {
    name,
    credits: 1000,
    inventory: {},
    location: SYSTEM_NAMES[Math.floor(Math.random() * SYSTEM_NAMES.length)],
    destination: null,
    warpETA: null,
    shipments: [],
  };
  npcLastTradeTime[name] = Date.now();
  RESOURCE_TYPES.forEach((res) => {
    corporations[name].inventory[res] = [];
    // Give them some starting inventory
    if (Math.random() < 0.5) {
      const qty = Math.floor(Math.random() * 100) + 20;
      const price = RESOURCE_DATA[res].base;
      corporations[name].inventory[res].push([qty, price]);
    }
  });
});
RESOURCE_TYPES.forEach((res) => (player.inventory[res] = []));
let sortState = {
  column: null,
  ascending: true,
};

function initGame() {
  loadGameState();
  toggleTravelButton();

  document.getElementById("tradeAmount").value = 10;
  document.getElementById("tradeResourceSelect").value = RESOURCE_TYPES[0];

  document
  .getElementById("tradeResourceSelect")
  .addEventListener("change", updateUI);
  document
  .getElementById("tradeAmount")
  .addEventListener("input", updateUI);



  // Set default selected resource
  const firstRes = RESOURCE_TYPES[0];
  document.getElementById("tradeResourceSelect").value = firstRes;

  document
    .getElementById("toggleMarketView")
    .addEventListener("click", toggleMarketView);

  ["tradeAmount"].forEach((id) => {
    const input = document.getElementById(id);
    input.addEventListener("input", () => {
      if (input.value.length > 6) {
        input.value = input.value.slice(0, 6); // limit to 6 digits
      }
    });
  });

  // Show initial breakdowns on load

  // Ensure inventory and vault arrays exist
  RESOURCE_TYPES.forEach((res) => {
    if (!Array.isArray(player.inventory[res])) player.inventory[res] = [];
    if (!Array.isArray(player.vault?.[res])) player.vault[res] = [];
  });

  // Rebuild systems and markets
  const availabilityCache =
    JSON.parse(localStorage.getItem("atlasMarketAvailability")) || {};
  const tariffCache = JSON.parse(localStorage.getItem(TARIFF_CACHE_KEY)) || {};
  const marketDataCache =
    JSON.parse(localStorage.getItem("atlasMarketData")) || {};
  const now = Date.now();
  const oneHour = 60 * 60 * 1000;

  SYSTEM_NAMES.forEach((name) => {
    systems[name] = {
      name,
      prices: {},
      market: {},
    };

    let importTaxRate, exportTaxRate;
    const tariffEntry = tariffCache[name];
    if (tariffEntry && now - tariffEntry.timestamp < oneHour) {
      importTaxRate = tariffEntry.importTaxRate;
      exportTaxRate = tariffEntry.exportTaxRate;
    } else {
      importTaxRate = Math.random() * 0.05;
      exportTaxRate = Math.random() * 0.05;
      tariffCache[name] = {
        importTaxRate,
        exportTaxRate,
        timestamp: now,
      };
    }

    systems[name].tariffs = {
      importTaxRate,
      exportTaxRate,
    };

    RESOURCE_TYPES.forEach((res) => {
      const key = `${name}-${res}`;
      let isAvailable = true;
      let supply = null;
      let demand = null;

      // Load availability from cache
      if (
        availabilityCache[key] &&
        now - availabilityCache[key].timestamp < oneHour
      ) {
        isAvailable = availabilityCache[key].available;
      } else {
        isAvailable = Math.random() < 0.85;
        availabilityCache[key] = {
          available: isAvailable,
          timestamp: now,
        };
      }

      // Load market data from cache or generate new
      if (marketDataCache[key]) {
        supply = marketDataCache[key].supply;
        demand = marketDataCache[key].demand;
      } else {
        const basePrice = RESOURCE_DATA[res].base;
        const t = Math.min(1, Math.max(0, (basePrice - 10) / 500));
        const base = 800 * (1 - t) + 100 * t + Math.random() * 200;
        supply = base + Math.random() * 30 - 15;
        demand = base + Math.random() * 30 - 15;
        if (Math.random() < 0.03) supply *= 1 + Math.random() * 1.5;
        if (Math.random() > 0.97) demand *= 1 + Math.random() * 1.5;
        supply = Math.max(10, Math.floor(supply));
        demand = Math.max(10, Math.floor(demand));
        marketDataCache[key] = { supply, demand };
      }

      systems[name].market[res] = isAvailable ? { supply, demand } : null;
    });
  });

  // Save cache
  localStorage.setItem(
    "atlasMarketAvailability",
    JSON.stringify(availabilityCache)
  );
  localStorage.setItem("atlasMarketData", JSON.stringify(marketDataCache));
  localStorage.setItem(TARIFF_CACHE_KEY, JSON.stringify(tariffCache));
  
  system = {
    market:   systems,
    player:   player,
    warpGraph: WARP_GRAPH
  };

  // Initialize UI
  calculateInitialTrends();
  populateSelectors();
  populateWarpDropdown();
  processAndRenderShipments();
  updateUI();
}

function updateUI() {
  updateLocationUI();
  updateMarketOverviewTitle();
  updateCreditsUI();
  updateFuelUI();
  updateInventoryDisplay();
  updateVaultDisplay();
  updateStorageUsage();
  updateSellAllButton();
  updateSellButton();
  updateMarketHeading();
  updateMarketTable(); // big one: we'll optimize this next
  randomizeGlitchDelays();

  updateSpreadTable();
  const sel = document.getElementById("tradeResourceSelect");
  const inp = document.getElementById("tradeAmount");
  const res = sel ? sel.value : null;
  const amt = inp ? parseInt(inp.value, 10) : 0;

  updateBuyBreakdown(res, amt);


}

let warpTargetPath = [];
let warpFinalDest = null;

let lastTick = Date.now();
let tickCounter = 0;
let saveCounter = 0;
let npcTradeCounter = 0;

function tick() {
  const now = Date.now();
  lastTick = now;
  tickCounter++;
  // Process shipments
  processAndRenderShipments();
  processNpcShipments();
  updateGameAgeDisplay();
  renderAvailableContracts();
  checkContractTimers();
  renderActiveContracts(); // Optional, if you just want to update UI
  // OR
  checkContractTimers(); // If you're checking for expiry
  // OR

  if (now - npcLastTick >= 1000) {
    for (let i = 0; i < 2; i++) {
      simulateNpcBehavior();
    }
    npcLastTick = now;
  }

  setInterval(() => {
    renderActiveContracts();
    checkContractTimers(); // to expire them
  }, 1000);

  // Save every 60 seconds
  if (now - lastSaveTick >= 120000) {
    saveGameState(true);
    lastSaveTick = now;
  }
  // Update UI every second (optional – could limit this if performance needed)
  updateUI();
}
let npcLastTick = Date.now();
let lastSaveTick = Date.now();

function hideLoadingOverlay() {
  const overlay = document.getElementById("loadingOverlay");
  overlay.classList.add("hide");
  setTimeout(() => (overlay.style.display = "none"), 800); // allow fade-out
}

function getTradesLastMinute() {
  const now = Date.now();
  const oneMinuteAgo = now - 60000;
  tradeTimestamps = tradeTimestamps.filter((ts) => ts > oneMinuteAgo);
  return tradeTimestamps.length;
}

function applySystemSpecializations(systemName) {
  const system = systems[systemName];
  const market = system.market;
  const specializations = system.specializations || [];

  for (const resource in market) {
    if (market[resource] == null) continue;

    let price = market[resource].basePrice;
    let isSpecialized = specializations.some((spec) =>
      SPECIALIZATION_EFFECTS[spec]?.includes(resource)
    );
    if (isSpecialized) {
      market[resource].price = price * 0.85;
      market[resource].supply *= 1.2;
      market[resource].demand *= 0.9;
    } else {
      market[resource].price = price * 1.05;
      market[resource].supply *= 0.9;
      market[resource].demand *= 1.1;
    }
  }
}

window.onload = function () {
  initGame();

  for (const name of SYSTEM_NAMES) {
    systems[name].specializations = SYSTEM_SPECIALIZATIONS[name] || [];
    applySystemSpecializations(name);
  }

  simulateNpcBehavior();
  renderTaxSidebar();
  fetchLastUpdated();

  setTimeout(() => {
    const overlay = document.getElementById("loadingOverlay");
    overlay.classList.add("hide");
    setTimeout(() => (overlay.style.display = "none"), 500); // Wait for fade to finish
  }, 1200);

  document
    .getElementById("travelSearch")
    .addEventListener("change", toggleTravelButton);
  saveGameState(false);
  for (let i = 1; i < 4; i++) generateContract();
  renderAvailableContracts();
  setTimeout(hideLoadingOverlay, 1000);

  // Remove old listeners from confirm button safely
  const oldConfirmBtn = document.getElementById("confirmWarpBtn");
  const newConfirmBtn = oldConfirmBtn.cloneNode(true);
  oldConfirmBtn.replaceWith(newConfirmBtn);
  newConfirmBtn.addEventListener("click", confirmWarp);

  document.getElementById("openHelpBtn").addEventListener("click", () => {
    document.getElementById("HelpModal").style.display = "block";
  });
  document.getElementById("closeHelpBtn").addEventListener("click", () => {
    document.getElementById("HelpModal").style.display = "none";
  });

  window.addEventListener("click", (e) => {
    const aboutModal = document.getElementById("AboutModal");
    if (e.target == aboutModal) {
      aboutModal.style.display = "none";
    }
  });

  document.getElementById("devLogModal").style.display = "none";

  document.getElementById("openDevLogBtn").addEventListener("click", () => {
    document.getElementById("devLogModal").style.display = "block";
  });

  document.getElementById("closeDevLogBtn").addEventListener("click", () => {
    document.getElementById("devLogModal").style.display = "none";
  });

  window.addEventListener("click", (e) => {
    const modal = document.getElementById("devLogModal");
    if (e.target == modal) {
      modal.style.display = "none";
    }
  });

  document.getElementById("openTariffBtn").addEventListener("click", () => {
    renderTariffModal();
    document.getElementById("tariffModal").style.display = "block";
  });
  document.getElementById("closeTariffBtn").addEventListener("click", () => {
    document.getElementById("tariffModal").style.display = "none";
  });

  // Close modals on outside click
  window.addEventListener("click", (e) => {
    if (e.target.id === "tariffModal") {
      document.getElementById("tariffModal").style.display = "none";
    }
  });

  document.getElementById("abortWarpBtn").addEventListener("click", () => {
    abortWarp();
  });

  // ✅ Hide loading screen after full load
  // Unified Tick Engine
  const tickInterval = setInterval(() => {
    tick();
  }, 1000);

  // Clear interval on page unload to prevent memory leaks
  window.addEventListener("beforeunload", () => {
    clearInterval(tickInterval);
  });
};
