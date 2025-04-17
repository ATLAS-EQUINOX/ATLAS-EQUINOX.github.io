let warpAbortLogged = false;
let isWarping = false;
let tradeTimestamps = [];
let warpAborted = false;



let gamePaused = false;
let gameStartTime = null;
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

const RESOURCE_TYPES = [
  "Iron",
  "Helium",
  "Gold",
  "Water",
  "Uranium",
  "Copper",
  "Silicon",
  "Titanium",
  "Hydrogen",
  "Carbon",
  "Platinum",
  "Nickel",
  "Oxygen",
  "Neon",
  "Cobalt",
  "Lithium",
  "Iridium",
  "Fuel",
];

const RESOURCE_DATA = {
  Iron: {
    base: 45, // Abundant structural metal
    volatility: 0.01,
  },
  Helium: {
    base: 22, // Inert gas, lightweight transport cost
    volatility: 0.04,
  },
  Gold: {
    base: 950, // High value, low market flux
    volatility: 0.01,
  },
  Water: {
    base: 60, // Scarce and essential off-Earth
    volatility: 0.03,
  },
  Uranium: {
    base: 1200, // Rare, regulated, high-value
    volatility: 0.02,
  },
  Copper: {
    base: 80, // Used in electronics, moderate value
    volatility: 0.02,
  },
  Silicon: {
    base: 65, // Semiconductor basis, moderate use
    volatility: 0.025,
  },
  Titanium: {
    base: 300, // Strong alloy metal
    volatility: 0.02,
  },
  Hydrogen: {
    base: 35, // Fuel-grade gas
    volatility: 0.05,
  },
  Carbon: {
    base: 28, // Versatile industrial use
    volatility: 0.03,
  },
  Platinum: {
    base: 850, // Precious catalyst metal
    volatility: 0.015,
  },
  Nickel: {
    base: 55, // Industrial metal
    volatility: 0.02,
  },
  Oxygen: {
    base: 75, // Life support, very valuable in space
    volatility: 0.035,
  },
  Neon: {
    base: 18, // Rare noble gas
    volatility: 0.05,
  },
  Cobalt: {
    base: 120, // High-tech material
    volatility: 0.035,
  },
  Lithium: {
    base: 140, // Battery essential, volatile demand
    volatility: 0.05,
  },
  Iridium: {
    base: 1100, // Very rare, top-tier catalyst
    volatility: 0.015,
  },
  Fuel: {
    base: 90, // Critical to operations, regulated
    volatility: 0.02,
  },
};

const SYSTEM_NAMES = [
  "55 Cancri",
  "Alpha Centauri",
  "Altair",
  "Barnard's Star",
  "Beta Pictoris",
  "Epsilon Eridani",
  "Fomalhaut",
  "Gliese 581",
  "Gliese 667 C",
  "HD 40307",
  "Kapteyn's Star",
  "Kepler-22b",
  "Kepler-442b",
  "Kepler-452b",
  "Lalande 21185",
  "Luyten's Star",
  "Proxima Centauri",
  "Ross 128",
  "Sirius",
  "Sol",
  "Tau Ceti",
  "TRAPPIST-1e",
  "Vega",
  "Wolf 359",
  "YZ Ceti"
];

const SPECIALIZATION_EFFECTS = {
  "Metals": ["Iron", "Copper", "Nickel", "Cobalt", "Titanium"],
  "Precious Metals": ["Gold", "Platinum", "Iridium"],
  "Fuel": ["Fuel", "Hydrogen", "Helium", "Uranium"],
  "Gases": ["Helium", "Neon", "Hydrogen", "Oxygen"],
  "Ice": ["Water", "Oxygen"],
  "Organics": ["Carbon", "Silicon", "Oxygen"],
  "Rare Earths": ["Lithium", "Uranium", "Iridium"],
};

const SYSTEM_SPECIALIZATIONS = {
  "55 Cancri": ["Rare Earths"],
  "Alpha Centauri": ["Metals"],
  "Altair": ["Ice"],
  "Barnard's Star": ["Gases"],
  "Beta Pictoris": ["Fuel"],
  "Epsilon Eridani": ["Fuel"],
  "Fomalhaut": ["Organics"],
  "Gliese 581": ["Rare Earths"],
  "Gliese 667 C": ["Gases"],
  "HD 40307": ["Metals"],
  "Kapteyn's Star": ["Ice"],
  "Kepler-22b": ["Gases"],
  "Kepler-442b": ["Ice"],
  "Kepler-452b": ["Organics"],
  "Lalande 21185": ["Fuel"],
  "Luyten's Star": ["Gases"],
  "Proxima Centauri": ["Ice"],
  "Ross 128": ["Metals"],
  "Sirius": ["Fuel"],
  "Sol": ["Organics"],
  "Tau Ceti": ["Organics"],
  "TRAPPIST-1e": ["Ice"],
  "Vega": ["Rare Earths"],
  "Wolf 359": ["Metals"],
  "YZ Ceti": ["Fuel"]
};



const WARP_GRAPH = {
  "55 Cancri": ["Kepler-452b", "Beta Pictoris", "Vega"],
  "Alpha Centauri": ["Sol", "Proxima Centauri", "Ross 128"],
  "Altair": ["Fomalhaut", "Vega", "YZ Ceti"],
  "Barnard's Star": ["Wolf 359", "Kapteyn's Star", "Tau Ceti"],
  "Beta Pictoris": ["55 Cancri", "Kepler-442b", "Gliese 667 C"],
  "Epsilon Eridani": ["TRAPPIST-1e", "Luyten's Star", "Gliese 581"],
  "Fomalhaut": ["Altair", "Sirius", "TRAPPIST-1e"],
  "Gliese 581": ["Epsilon Eridani", "Kapteyn's Star"],
  "Gliese 667 C": ["Beta Pictoris", "Kepler-22b"],
  "HD 40307": ["Lalande 21185", "Tau Ceti", "Kepler-22b"],
  "Kapteyn's Star": ["Barnard's Star", "Gliese 581", "Lalande 21185"],
  "Kepler-22b": ["HD 40307", "Gliese 667 C", "Kepler-442b"],
  "Kepler-442b": ["Kepler-22b", "Beta Pictoris", "Wolf 359"],
  "Kepler-452b": ["55 Cancri", "Luyten's Star", "Ross 128"],
  "Lalande 21185": ["Kapteyn's Star", "HD 40307", "Sol"],
  "Luyten's Star": ["Kepler-452b", "Epsilon Eridani"],
  "Proxima Centauri": ["Alpha Centauri", "Tau Ceti"],
  "Ross 128": ["Alpha Centauri", "Kepler-452b"],
  "Sirius": ["Fomalhaut", "Sol", "Vega"],
  "Sol": ["Alpha Centauri", "Sirius", "Lalande 21185"],
  "Tau Ceti": ["Barnard's Star", "HD 40307", "Proxima Centauri"],
  "TRAPPIST-1e": ["Epsilon Eridani", "Fomalhaut"],
  "Vega": ["Sirius", "Altair", "55 Cancri"],
  "Wolf 359": ["Barnard's Star", "Kepler-442b"],
  "YZ Ceti": ["Altair"]
};




const FUEL_CAPACITY = 500;
const TRAVEL_FUEL_COST = 10;
const npcCorporations = [
  "ÆTHRΛ GROUP",
  "Aegis Starfreight Inc.",
  "Astrometallix Limited",
  "Beacon Shipping Group",
  "Bluecap Resources",
  "Borealis Extraction Co.",
  "Centauri Supply Corp.",
  "CHΛOS CIRCUIT INC.",
  "Cryllion Rift Haulers",
  "CRYSTALEX LOGISTIX",
  "CRYOTRΛDΞ SYNDICΛTΞ",
  "DΛRKMΛTTΞR Inc.",
  "DeepVoid Logistics",
  "DeltaEdge Holdings",
  "DYNΞRA CORE",
  "ExoPath Commodities",
  "GΛLΛXCORΞ",
  "Helion Industries",
  "Horizon Materials",
  "IONCORΞ SYSTΞMS",
  "K'thari Holdings",
  "ΛSTOMINΞR Co.",
  "MANER Co.",
  "Martech Mining Group",
  "NΞBULΛX",
  "New Dawn Trading Co.",
  "Nova Terra Ventures",
  "NOVAΦORGE Consortium",
  "NOVΛFRONTIΞR",
  "OBSIDIΛN HOLDINGS",
  "ΩMEGA SPAN",
  "Orion Exports",
  "Orion Pacific Freight",
  "ORI EXPORTS",
  "Pioneer Logistics",
  "POLΛRΞX TRΛDΞ NETWORK",
  "Qorr-Varn Logistics",
  "QUΛNTUM HΛRVΞSTΞRS",
  "Redline Haulers Inc.",
  "RΞDSHIFT UNLIMITΞD",
  "Skarnet Shipping Guild",
  "SINGULON INDUSTRIES",
  "SPΛCΞY",
  "Stellar Freightworks",
  "SYNTΞX DYNAMICS",
  "T'rannex BioExtraction",
  "TΞLLURIC HOLDINGS",
  "Thorne & Vale Shipping",
  "Titan Reach Holdings",
  "TRIX HΞΛVY INDUSTRIΞS",
  "Trident Interstellar",
  "Union Stellar Freight",
  "Unity Star Logistics",
  "VORTΞX NEΞTWORK",
  "VOIDΞL",
  "XΞNOFRΞIGHT",
  "Xephari Trade Complex",
  "ZΞNITH ORBITΛLS",
  "Zorl'Nex Syndicate",
];

let player = {
  location: SYSTEM_NAMES[Math.floor(Math.random() * SYSTEM_NAMES.length)],
  credits: 100,
  fuel: 853,
  inventory: {},
  vault: {},
  shipments: [],
};

function cleanNumber(num) {
  return parseFloat(num.toFixed(2));  // rounds to 2 decimal places and removes trailing zeroes
}

function showWelcomeModal() {
  const welcomeModal = document.getElementById("AboutModal");
  if (welcomeModal) {
    welcomeModal.style.display = "block";
  }
}


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

async function fetchLastUpdated() {
  try {
      const repoOwner = 'atlas-equinox';
      const repoName = 'atlas-equinox.github.io';
      const response = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}`);
      if (!response.ok) throw new Error('Network response was not ok');
      const data = await response.json();
      const lastUpdated = new Date(data.updated_at).toLocaleString();
      document.getElementById('last-updated').innerText = lastUpdated;
  } catch (error) {
      console.error('Error fetching the GitHub repo:', error);
      document.getElementById('last-updated').innerText = 'Error fetching data';
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

function getWarpPath(start, end) {
  if (start === end) return [start];

  const visited = new Set();
  const queue = [[start]];

  while (queue.length > 0) {
    const path = queue.shift();
    const node = path[path.length - 1];

    if (node === end) return path;

    if (!visited.has(node)) {
      visited.add(node);
      const neighbors = Object.keys(WARP_GRAPH[node] || {});
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          queue.push([...path, neighbor]);
        }
      }
    }
  }

  // If no path found, just hop randomly to get somewhere
  const systems = Object.keys(WARP_GRAPH);
  if (systems.length > 0) {
    const fallback = [start];
    let current = start;
    const visitedFallback = new Set([start]);

    // Try to find *any* path
    while (current !== end && visitedFallback.size < systems.length) {
      const nextOptions = Object.keys(WARP_GRAPH[current] || {}).filter(n => !visitedFallback.has(n));
      const next = nextOptions[0] || systems.find(s => !visitedFallback.has(s));
      if (!next) break;
      fallback.push(next);
      visitedFallback.add(next);
      current = next;
    }

    if (fallback[fallback.length - 1] !== end) fallback.push(end);
    return fallback;
  }

  return [start, end];
}





function calculateInitialTrends() {
  const savedPriceData = JSON.parse(localStorage.getItem("atlasPriceHistory") || "{}");
  const historyStore = JSON.parse(localStorage.getItem("atlasPriceHistoryGraph") || "{}");

  SYSTEM_NAMES.forEach((system) => {
    RESOURCE_TYPES.forEach((res) => {
      const key = `${system}-${res}`;
      const currentPrice = getTimeSeededPrice(system, res);

      // Save to current data for trends
      let trend = "same";
      const previousPrice = savedPriceData[key];
      if (previousPrice !== undefined) {
        trend = currentPrice > previousPrice ? "up" : currentPrice < previousPrice ? "down" : "same";
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

function getFuelCostForPath(path) {
  const perJumpCost = 10; // or 2.5, depending on desired balance
  return (path.length - 1) * perJumpCost;
}


function checkMobileBlocker() {
  if (window.innerWidth < 768) {
    document.getElementById("mobile-blocker").style.display = "flex";
  } else {
    document.getElementById("mobile-blocker").style.display = "none";
  }
}

window.addEventListener("load", checkMobileBlocker);
window.addEventListener("resize", checkMobileBlocker);




function formatPrice(num) {
  return parseFloat(num).toFixed(2);
}

function getBuySellPrice(basePrice) {
  const spread = basePrice * 0.03; // 3% spread
  return {
    buyPrice: parseFloat((basePrice + spread).toFixed(2)),
    sellPrice: parseFloat((basePrice - spread).toFixed(2)),
  };
}

function getRandomCorporation() {
  return npcCorporations[Math.floor(Math.random() * npcCorporations.length)];
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

function getRandomShipmentDelay() {
  const min = 3000; // 3 seconds
  const max = 300000; // 10 minutes
  const skewed = Math.pow(Math.random(), 2); // Squared = bias toward 0
  return Math.floor(skewed * (max - min) + min);
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

  // Set default amounts
  document.getElementById("buyAmount").value = 10;
  document.getElementById("sellAmount").value = 10;

  // Set default selected resource
  const firstRes = RESOURCE_TYPES[0];
  document.getElementById("buyResourceSelect").value = firstRes;
  document.getElementById("sellResourceSelect").value = firstRes;

  document
    .getElementById("toggleMarketView")
    .addEventListener("click", toggleMarketView);

  ["buyAmount", "sellAmount"].forEach((id) => {
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

  // Initialize UI
  calculateInitialTrends();
  populateSelectors();
  processAndRenderShipments();
  updateUI();
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

function saveGameState(logToConsole = false) {
  const state = {
    seenWelcome: true,
    credits: player.credits,
    fuel: player.fuel,
    inventory: player.inventory,
    vault: player.vault,
    shipments: player.shipments,
    location: player.location,
    corporations: corporations,
    createdAt: gameStartTime || Date.now(), // 🕒 Save the timestamp
  };
  localStorage.setItem("atlasSave", JSON.stringify(state));
  if (logToConsole) log("Network Synced.");
  // ⏰ Show save timestamp on UI
  const saveEl = document.getElementById("saveStatus");
  if (saveEl) {
    const now = new Date();
    const hh = now.getHours().toString().padStart(2, "0");
    const mm = now.getMinutes().toString().padStart(2, "0");
    const ss = now.getSeconds().toString().padStart(2, "0");
  
    const day = now.getDate().toString().padStart(2, "0");
    const month = (now.getMonth() + 1).toString().padStart(2, "0");
    const year = now.getFullYear();
  
    saveEl.textContent = `${hh}:${mm}:${ss} on ${day}/${month}/${year}`;
  }
}

function loadGameState() {
  const saved = localStorage.getItem("atlasSave");
  player.inventory = {};
  RESOURCE_TYPES.forEach((res) => (player.inventory[res] = []));
  corporations = {};

  if (!saved) {
    gameStartTime = Date.now();
    player.vault = {};
    RESOURCE_TYPES.forEach((res) => (player.vault[res] = []));
    npcCorporations.forEach((name) => {
      corporations[name] = {
        name,
        credits: 1000,
        inventory: {},
        location: SYSTEM_NAMES[Math.floor(Math.random() * SYSTEM_NAMES.length)],
        destination: null,
        eta: 0,
        shipments: [],
      };
      RESOURCE_TYPES.forEach((res) => {
        corporations[name].inventory[res] = [];
      });
    });
    
    showWelcomeModal(); // <-- First time player
    return;
  }

  try {
    const state = JSON.parse(saved);
    gameStartTime = state.createdAt || Date.now();
    player.credits = state.credits ?? 1000;
    player.fuel = state.fuel ?? 100;
    player.location = state.location ?? "Sol";
    player.shipments = state.shipments ?? [];
    player.vault = {};
    player.inventory = {};

    RESOURCE_TYPES.forEach((res) => {
      player.vault[res] = Array.isArray(state.vault?.[res]) ? state.vault[res] : [];
      player.inventory[res] = Array.isArray(state.inventory?.[res]) ? state.inventory[res] : [];
    });

    Object.assign(corporations, state.corporations || {});

    npcCorporations.forEach((name) => {
      if (!corporations[name]) {
        corporations[name] = {
          name,
          credits: 1000,
          inventory: {},
          location: SYSTEM_NAMES[Math.floor(Math.random() * SYSTEM_NAMES.length)],
          destination: null,
          eta: 0,
          shipments: [],
        };
      }
      if (!corporations[name].inventory) corporations[name].inventory = {};
      if (!corporations[name].shipments) corporations[name].shipments = [];
      RESOURCE_TYPES.forEach((res) => {
        if (!Array.isArray(corporations[name].inventory[res])) {
          corporations[name].inventory[res] = [];
        }
      });
    });

    // ✅ Show Welcome only once per save
    if (!state.seenWelcome) {
      showWelcomeModal();
      state.seenWelcome = true;
      localStorage.setItem("atlasSave", JSON.stringify(state));
    }

  } catch (e) {
    console.error("Failed to load save:", e);
  }
}




function resetGameState() {
  if (
    !confirm("Are you sure you want to reset your save? This cannot be undone.")
  )
    return;
  localStorage.removeItem("atlasSave");
  localStorage.removeItem("atlasPriceHistory");
  localStorage.removeItem("atlasMarketData"); // ⬅ add this!
  localStorage.removeItem("atlasMarketAvailability"); // ⬅ and this!
  localStorage.removeItem("atlasSeenAbout");
  location.reload();
}

function populateSelectors() {
  const travelSelect = document.getElementById("travelSearch");
  const buySelect = document.getElementById("buyResourceSelect");
  const sellSelect = document.getElementById("sellResourceSelect");

  if (travelSelect) {
    travelSelect.innerHTML = "";
    SYSTEM_NAMES.forEach((system) => {
      const opt = document.createElement("option");
      opt.value = system;
      opt.textContent = system;
      travelSelect.appendChild(opt);
    });
    travelSelect.value = player.location;
    toggleTravelButton();

    // ✅ Attach warp route display here
    travelSelect.addEventListener("change", () => {
      const destination = travelSelect.value;
      const travelBtn = document.getElementById("travelButton");
      const path = getWarpPath(player.location, destination);

      if (!path) {
        travelBtn.disabled = true;
        travelBtn.innerText = "No Route";
      } else if (destination === player.location) {
        travelBtn.disabled = true;
        travelBtn.innerText = "Current";
      } else {
        const hops = path.length - 1;
        travelBtn.disabled = false;
        travelBtn.innerText = `Warp (${hops} Jump${hops !== 1 ? "s" : ""})`;
      }
    });
  }

  if (buySelect && sellSelect) {
    RESOURCE_TYPES.forEach((res) => {
      const optBuy = document.createElement("option");
      optBuy.value = res;
      optBuy.textContent = res;
      buySelect.appendChild(optBuy);

      const optSell = document.createElement("option");
      optSell.value = res;
      optSell.textContent = res;
      sellSelect.appendChild(optSell);
    });
  }
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
  const historyStore = JSON.parse(localStorage.getItem("atlasPriceHistoryGraph") || "{}");

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
    `<span class="text-warning">${corp.name}</span> sold ${sold}${UNIT} of ${res} in ${system} |
    <span class="text-info">${price.toFixed(2)}ᶜ</span> each
    (Tax: <span class="text-danger">${exportTax.toFixed(2)}ᶜ</span>,
    <span class="${profitColor}">${profitLabel}: ${profitOrLoss.toFixed(2)}ᶜ</span>)`
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

function flash(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.add("flash");
  setTimeout(() => el.classList.remove("flash"), 500);
}

function log(msg) {
  const consoleDiv = document.getElementById("console");
  const entry = document.createElement("div");
  entry.className = "console-entry";
  const time = document.createElement("span");
  time.className = "console-timestamp";
  time.textContent = `[${new Date().toLocaleTimeString()}]`;

  const content = document.createElement("span");
  content.style.color = msg.startsWith("Sold")
    ? "#ffffff"
    : msg.startsWith("Refueled")
    ? "#ffffff"
    : msg.startsWith("SHIP")
    ? "#ffffff"
    : msg.endsWith("y.")
    ? "#ffffff"
    : msg.startsWith("Not enough")
    ? "#ff4444"
    : msg.startsWith("Network")
    ? "#ffa500"
    : "#ffffff";
  content.textContent = msg;

  entry.appendChild(time);
  entry.appendChild(content);
  consoleDiv.appendChild(entry);

  // ✅ Keep only the last 50 messages
  while (consoleDiv.children.length > 50) {
    consoleDiv.removeChild(consoleDiv.firstChild);
  }

  consoleDiv.scrollTop = consoleDiv.scrollHeight;
}

function calculateInventoryValue(inventory) {
  let total = 0;
  for (const res in inventory) {
    const batches = inventory[res];
    const price =
      systems[player.location]?.prices?.[res] || RESOURCE_DATA[res]?.base || 0;
    for (const [qty] of batches) {
      total += qty * price;
    }
  }
  return total;
}

function getTopTrade(inventory) {
  let topRes = "—";
  let maxQty = 0;
  for (const res in inventory) {
    const total = inventory[res].reduce((sum, [qty]) => sum + qty, 0);
    if (total > maxQty) {
      maxQty = total;
      topRes = res;
    }
  }
  return maxQty > 0 ? topRes : "—";
}

function getLastTradeTime(corp) {
  if (!corp.shipments || corp.shipments.length === 0) return "—";
  const latest = Math.max(...corp.shipments.map((s) => s.time || 0));
  const secondsAgo = Math.floor((Date.now() - latest) / 1000);
  if (secondsAgo < 60) return `${secondsAgo}s ago`;
  if (secondsAgo < 3600) return `${Math.floor(secondsAgo / 60)}m ago`;
  return `${Math.floor(secondsAgo / 3600)}h ago`;
}

let lastRanks = {}; // Keep outside the function

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

// Modal handlers
document.getElementById("openLeaderboardBtn").addEventListener("click", () => {
  updateLeaderboard();
  document.getElementById("leaderboardModal").style.display = "block";
});
document.getElementById("closeLeaderboardBtn").addEventListener("click", () => {
  document.getElementById("leaderboardModal").style.display = "none";
});
window.addEventListener("click", (e) => {
  const modal = document.getElementById("leaderboardModal");
  if (e.target == modal) {
    modal.style.display = "none";
  }
});

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

function moveBatch(resource, price, qty, from, to) {
  const source = player[from][resource];
  let moved = 0;
  for (let i = 0; i < source.length && moved < qty; i++) {
    let [q, p] = source[i];
    if (p === price) {
      const take = Math.min(q, qty - moved);
      source[i][0] -= take;
      moved += take;
    }
  }
  // Clean up empty batches
  player[from][resource] = source.filter(([q]) => q > 0);

  // Schedule delayed internal shipment
  const transferId = `XFER-${Date.now().toString().slice(-5)}`;
  const deliveryTime = Date.now() + 30000; // 30 seconds

  player.shipments.push({
    id: transferId,
    internal: true,
    resource,
    amount: moved,
    price,
    from,
    to,
    time: deliveryTime,
  });

  log(`${moved}${UNIT} of ${resource} is being moved to ${to}. ETA: 30s`);
  updateUI();
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

function countBatches(store) {
  let count = 0;
  for (const res in store) {
    const batches = store[res];
    count += batches.reduce((sum, [qty]) => sum + qty, 0);
  }
  return count;
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

function updateUI() {
  updateLocationUI();
  updateMarketOverviewTitle()
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
}




function randomizeGlitchDelays() {
  document.querySelectorAll('.glitch-effect').forEach(el => {
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
  const currentIndex = rows.findIndex(r => r.system === currentSystem);
  if (currentIndex > 0) {
    const [currentRow] = rows.splice(currentIndex, 1);
    rows.unshift(currentRow);
  }


  function formatEstimate(val, hops) {
    if (hops === null || hops > 20) return "∅";
  
    if (hops <= 4) return val.toFixed(2);         // Precise for local
    if (hops === 6) return val.toFixed(1);        // Slightly rounded
    if (hops <= 10) return Math.round(val).toString(); // Whole numbers
    if (hops <= 12) return `${Math.round(val / 5) * 5}`; // Round to nearest 5
    if (hops <= 14) return `${Math.round(val / 10) * 10}`; // Nearest 10
    if (hops <= 17) return `${Math.round(val / 25) * 25}`; // Nearest 25
    return `${Math.round(val / 50) * 50}`;         // Heavily rounded
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
          : "X";
      } else {
        const trend = lastPrices[`${system}-${res}`]?.trend ?? "same";

        cell.className = `price-cell ${trend}`;
        if (price === minPrices[res]) cell.classList.add("lowest-price-cell");
        if (price === maxPrices[res]) cell.classList.add("highest-price-cell");

        if (systems[system].specializations?.some(spec =>
          SPECIALIZATION_EFFECTS[spec]?.includes(res)
        )) {
          cell.classList.add("specialized-cell");
        }

        const display = formatEstimate(price, hops);
        const displayHTML = display === "∅"
          ? `<span class="glitch-effect" data-text="">∅</span>`
          : display;

        cell.innerHTML = `
          ${displayHTML}
          <span class="trend-indicator ${trend}"></span>
          <div class="supply-demand-info">
            <span>S: ${formatEstimate(market.supply, hops)}${UNIT}</span><br>
            <span>D: ${formatEstimate(market.demand, hops)}${UNIT}</span>
          </div>`;




        cell.addEventListener("click", () => {
          // optional detail popup or graph
        });
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

function beginWarpStep(hopIndex) {
  if (!warpTargetPath || hopIndex >= warpTargetPath.length || warpAborted) return;

  const from = warpTargetPath[hopIndex - 1];
  const to = warpTargetPath[hopIndex];
  const variation = 2 + (Math.random() * 0.1 - 0.05); // 0.95 to 1.05
  const segmentFuelCost = parseFloat((TRAVEL_FUEL_COST * variation).toFixed(2));


  if (player.fuel < segmentFuelCost) {
    log(`Warp aborted due to insufficient fuel. Holding at ${from}.`);
    player.location = from; // stay at current
    document.getElementById("warp-overlay").classList.add("d-none");
    disableTradeControls(false);
    isWarping = false;
    updateUI();
    return;
  }

  const travelTime = Math.floor(Math.random() * 500) + 300;
  isWarping = true;

  if (hopIndex === 1) {
    document.getElementById("warp-overlay").classList.remove("d-none");
    disableTradeControls(true);
  }

  // UI progress
  const progressBar = document.getElementById("warp-progress-bar");
  const totalHops = warpTargetPath.length - 1;
  const percent = Math.floor(((hopIndex - 1) / totalHops) * 100);
  progressBar.style.width = `${percent}%`;
  progressBar.textContent = `${percent}%`;
  progressBar.setAttribute("aria-valuenow", percent.toString());
  document.getElementById("warp-route").textContent = `Warping: ${from} → ${to} — Step ${hopIndex} of ${totalHops}`;

  setTimeout(() => {
    if (warpAborted) {
      log(`Warp aborted. Holding at ${player.location}.`);
      document.getElementById("warp-overlay").classList.add("d-none");
      disableTradeControls(false);
      isWarping = false;
      return;
    }

    player.location = to;
    player.fuel -= segmentFuelCost;
    flash("fuel");
    log(`Arrived at ${to}. Remaining fuel: ${player.fuel.toFixed(2)}ᶜ`);
    updateUI();

    if (to === warpFinalDest) {
      progressBar.style.width = "100%";
      progressBar.textContent = "100%";
      progressBar.setAttribute("aria-valuenow", "100");
      setTimeout(() => {
        document.getElementById("warp-overlay").classList.add("d-none");
        disableTradeControls(false);
        log("Warp complete.");
        toggleTravelButton();
        isWarping = false;
      }, 500);
    } else {
      beginWarpStep(hopIndex + 1);
    }
  }, travelTime);
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
  const res = document.getElementById("sellResourceSelect").value;
  const sellBtn = document.querySelector("button.btn-danger"); // assuming this is the Sell button

  if (!sellBtn || !res) return;

  const inventoryAmount =
    player.inventory[res]?.reduce((sum, [qty]) => sum + qty, 0) || 0;

  sellBtn.disabled = inventoryAmount === 0;
  sellBtn.innerText = inventoryAmount === 0 ? "No Inventory" : "Sell";
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

let warpTargetPath = [];
let warpFinalDest = null;

function travel() {
  const selectedSystem = document.getElementById("travelSearch").value;
  if (!selectedSystem || selectedSystem === player.location) return;

  // ✅ Calculate the warp route here
  const route = getWarpPath(player.location, selectedSystem);
  if (!route || route.length === 0) {
    log("No valid warp path found.");
    return;
  }

  warpTargetPath = route;
  warpFinalDest = selectedSystem;

  const hops = route.length - 1;
  const fuelCost = getFuelCostForPath(route);

  document.getElementById("warpRouteDisplay").textContent = `From: ${player.location} → ${selectedSystem}`;
  document.getElementById("warpFullPath").textContent = route.join(" ➜ ");
  document.getElementById("warpHopCount").textContent = hops;
  document.getElementById("warpFuelEstimate").textContent = fuelCost.toFixed(2);

  document.getElementById("warpModal").style.display = "block";
}








function confirmWarp() {
  if (!warpTargetPath || warpTargetPath.length === 0) return;
  warpAborted = false;
  warpAbortLogged = false;
  isWarping = true;

  document.getElementById("warpModal").style.display = "none";
  document.getElementById("warp-overlay").classList.remove("d-none");

  const progressBar = document.getElementById("warp-progress-bar");
  progressBar.style.width = "0%";
  progressBar.textContent = "0%";
  progressBar.setAttribute("aria-valuenow", "0");

  disableTradeControls(true);
  beginWarpStep(1);
}




function cancelWarp() {
  document.getElementById("warpModal").style.display = "none";
  log("Warp cancelled.");
}

function abortWarp() {
  warpAborted = true;
  warpAbortLogged = false; // Reset so `beginWarpStep` can log it once
}



function closeWarpModal() {
  document.getElementById("warpModal").style.display = "none";
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

function refuel() {
  const fuelPrice = systems[player.location].prices["Fuel"];
  const fuelNeeded = FUEL_CAPACITY - player.fuel;
  if (fuelNeeded === 0) return log("Your fuel tank is already full.");
  const affordableUnits = Math.floor(player.credits / fuelPrice);
  if (affordableUnits === 0)
    return log("You don't have enough credits to buy any fuel.");
  const unitsToBuy = Math.min(fuelNeeded, affordableUnits);
  const totalCost = unitsToBuy * fuelPrice;
  player.fuel += unitsToBuy;
  player.credits -= totalCost;
  flash("fuel");
  flash("credits");
  log(`Refueled ${unitsToBuy} units at ${fuelPrice.toFixed(2)}ᶜ each.`);
  updateUI();
}

function buyMaterial() {
  const res = document.getElementById("buyResourceSelect").value;
  const amtInput = document.getElementById("buyAmount");
  const amt = parseInt(amtInput.value);
  if (!amt || amt <= 0) return log("Invalid quantity.");

  const system = systems[player.location];
  const market = system.market[res];
  if (!market) return log(`${res} is not currently available in ${player.location}.`);

  const basePrice = system.prices[res];
  const { buyPrice } = getBuySellPrice(basePrice);
  const importTaxRate = system.tariffs?.importTaxRate || 0;

  const unitCost = buyPrice * (1 + importTaxRate);
  const totalCost = unitCost * amt;

  if (player.credits < totalCost) {
    const maxAffordable = Math.floor(player.credits / unitCost);
    if (maxAffordable > 0) {
      amtInput.value = maxAffordable;
      return log(`Not enough credits. You can afford up to ${maxAffordable}x ${res}.`);
    }
    return log("Not enough credits to buy any units.");
  }

  // ✅ Set the trade function
  pendingTrade = () => {
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

    const ratio = market.demand / market.supply;
    const base = RESOURCE_DATA[res].base;
    let newPrice = buyPrice * (ratio > 1 ? 1 + (ratio - 1) * 0.01 : 1 - (1 - ratio) * 0.01);
    system.prices[res] = parseFloat(
      Math.max(base * 0.5, Math.min(base * 3, newPrice)).toFixed(2)
    );

    flash("credits");
    updateUI();
  };

  showTradeSummary("buy", res, amt, buyPrice);
}


function showTradeSummary(type, res, amt, price) {
  const location = player.location;
  const tariffs = systems[location]?.tariffs || {
    importTaxRate: 0,
    exportTaxRate: 0,
  };

  const baseTotal = price * amt;
  const taxRate =
    type === "buy" ? tariffs.importTaxRate : tariffs.exportTaxRate;
  const taxAmount = baseTotal * taxRate;
  const finalTotal =
    type === "buy" ? baseTotal + taxAmount : baseTotal - taxAmount;
  
  if (pendingTrade) {
    pendingTrade();
    pendingTrade = null;
    saveGameState();
  
    const action = type === "buy" ? "Purchased" : "Sold";
    const taxLabel = "Tax";
  
    log(`${action} ${amt}${UNIT} of ${res} at ${price.toFixed(2)}ᶜ each (${taxLabel}: ${taxAmount.toFixed(2)}ᶜ)`);
  
    tradeTimestamps.push(Date.now());
  
    let profitLossStr = "";
    if (type === "sell") {
      const inv = player.inventory[res];
      const matched = inv.slice(0, amt);
      const totalPaid = matched.reduce((sum, [qty, paid]) => sum + qty * paid, 0);
      const profit = finalTotal - totalPaid;
      const profitColor = profit >= 0 ? "text-success" : "text-danger";
      const profitLabel = profit >= 0 ? "Profit" : "Loss";
      profitLossStr = `<span class="${profitColor}">${profitLabel}: ${profit.toFixed(2)}ᶜ</span>`;
    } else {
      profitLossStr = `<span class="text-success">Total: ${finalTotal.toFixed(2)}ᶜ</span>`;
    }
  
    logMarket(
      `<span class="text-warning">ΛTLΛS | ΞQUINOX™</span> ${
        type === "buy" ? "purchased" : "sold"
      } ${amt}${UNIT} of ${res} in ${location} |
      ${price.toFixed(2)}ᶜ each (Tax: <span class="text-danger">${taxAmount.toFixed(
        2
      )}ᶜ</span>, ${profitLossStr})`
    );
  }
}
    



function sellMaterial() {
  const res = document.getElementById("sellResourceSelect").value;
  const amt = parseInt(document.getElementById("sellAmount").value);
  if (!amt || amt <= 0) return log("Invalid quantity.");

  let market = systems[player.location].market[res];
  const priceExists = systems[player.location].prices?.[res];
  let price = systems[player.location].prices?.[res] ?? RESOURCE_DATA[res].base;

  // 🚀 If resource is unavailable, create market on-the-fly
  if (!market) {
    log(`ΛΞ started trade of ${res} in ${player.location}.`);
    const base = RESOURCE_DATA[res].base;
    price = base * 1.25;

    // Create market entry
    market = { supply: 0, demand: 0 };
    systems[player.location].market[res] = market;
    systems[player.location].prices[res] = price;

    // 🧠 Save this new market to localStorage
    const key = `${player.location}-${res}`;
    const now = Date.now();

    // Update availability
    const availabilityCache = JSON.parse(
      localStorage.getItem("atlasMarketAvailability") || "{}"
    );
    availabilityCache[key] = { available: true, timestamp: now };
    localStorage.setItem(
      "atlasMarketAvailability",
      JSON.stringify(availabilityCache)
    );

    // Update market data
    const marketDataCache = JSON.parse(
      localStorage.getItem("atlasMarketData") || "{}"
    );
    marketDataCache[key] = { supply: 0, demand: 0 };
    localStorage.setItem("atlasMarketData", JSON.stringify(marketDataCache));
  }

  const inv = player.inventory[res];
  const inventoryAmount = inv.reduce((sum, [qty]) => sum + qty, 0);
  if (inventoryAmount === 0) return log("No inventory to sell.");

  const sellAmt = Math.min(amt, inventoryAmount);

  const lastBuyTime = recentPlayerBuys[`${player.location}-${res}`];
  if (lastBuyTime && Date.now() - lastBuyTime < TRADE_COOLDOWN) {
    const wait = Math.ceil(
      (TRADE_COOLDOWN - (Date.now() - lastBuyTime)) / 1000
    );
    return log(
      `${res} trading in ${player.location} is temporarily restricted. Wait ${wait}s.`
    );
  }

  pendingTrade = () => {
    let toSell = sellAmt,
      sold = 0,
      totalPaid = 0;

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

    // Add supply and adjust price if market was created or already existed
    market.supply += sold;
    const ratio = market.demand / market.supply;
    const base = RESOURCE_DATA[res].base;
    let newPrice =
      price * (ratio > 1 ? 1 + (ratio - 1) * 0.01 : 1 - (1 - ratio) * 0.01);
    newPrice = Math.max(base * 0.5, Math.min(base * 3, newPrice));
    systems[player.location].prices[res] = parseFloat(newPrice.toFixed(2));

    updateUI();
  };

  showTradeSummary("sell", res, sellAmt, price);
  updateSellBreakdown();
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
  renderActiveContracts();  // Optional, if you just want to update UI
// OR
  checkContractTimers();    // If you're checking for expiry
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
  tradeTimestamps = tradeTimestamps.filter(ts => ts > oneMinuteAgo);
  return tradeTimestamps.length;
}

function applySystemSpecializations(systemName) {
  const system = systems[systemName];
  const market = system.market;
  const specializations = system.specializations || [];

  for (const resource in market) {
    if (market[resource] == null) continue;

    let price = market[resource].basePrice;
    let isSpecialized = specializations.some(spec =>
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
  fetchLastUpdated()
  
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
  //setInterval(() => {
  //  const count = getTradesLastMinute();
   // document.getElementById("tradeCount").textContent = count;
 // }, 1000);

  // Remove old listeners from confirm button safely
const oldConfirmBtn = document.getElementById("confirmWarpBtn");
const newConfirmBtn = oldConfirmBtn.cloneNode(true);
oldConfirmBtn.replaceWith(newConfirmBtn);
newConfirmBtn.addEventListener("click", confirmWarp);

// Modal openers

// About Modal Logic
document.getElementById("openAboutBtn").addEventListener("click", () => {
  document.getElementById("AboutModal").style.display = "block";
});
document.getElementById("closeInfoBtn").addEventListener("click", () => {
  document.getElementById("AboutModal").style.display = "none";
});

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
