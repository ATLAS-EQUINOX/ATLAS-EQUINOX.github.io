var system;
const FUEL_CAPACITY = 1000;
const TRAVEL_FUEL_COST = 10 * (Math.random() * 0.5 + 0.75); // Random between 7.5-12.5

let gameStartTime;
let playerHighScore = 100;
let player = {
  location: SYSTEM_NAMES[Math.floor(Math.random() * SYSTEM_NAMES.length)],
  credits: 200,
  fuel: 853,
  inventory: {},
  vault: {},
  shipments: [],
};

function saveGameState(logToConsole = false) {
  const state = {
    credits: player.credits,
    fuel: player.fuel,
    inventory: player.inventory,
    vault: player.vault,
    shipments: player.shipments,
    location: player.location,
    corporations: corporations,
    createdAt: gameStartTime || Date.now(), // 🕒 Save the timestamp
    playerHighScore: playerHighScore
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
    updateHighScoreDisplay?.(); // if that function exists already
    showWelcomeModal(); // <-- First time player
    return;
  }
  

  try {
    const state = JSON.parse(saved);
    gameStartTime = state.createdAt || Date.now();
    playerHighScore = state.playerHighScore ?? 0;
    player.credits = state.credits ?? 1000;
    player.fuel = state.fuel ?? 100;
    player.location = state.location ?? "Sol";
    player.shipments = state.shipments ?? [];
    player.vault = {};
    player.inventory = {};

    RESOURCE_TYPES.forEach((res) => {
      player.vault[res] = Array.isArray(state.vault?.[res])
        ? state.vault[res]
        : [];
      player.inventory[res] = Array.isArray(state.inventory?.[res])
        ? state.inventory[res]
        : [];
    });

    Object.assign(corporations, state.corporations || {});

    npcCorporations.forEach((name) => {
      if (!corporations[name]) {
        corporations[name] = {
          name,
          credits: 1000,
          inventory: {},
          location:
            SYSTEM_NAMES[Math.floor(Math.random() * SYSTEM_NAMES.length)],
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
  } catch (e) {
    console.error("Failed to load save:", e);
  }
}


function saveContracts() {
  localStorage.setItem("activeContracts", JSON.stringify(activeContracts));
}

function loadContracts() {
  const data = localStorage.getItem("activeContracts");
  if (data) {
    activeContracts = JSON.parse(data);

    // Restore Date objects and defaults
    activeContracts.forEach(c => {
      if (!c.issuedAt && c.status === "accepted") c.issuedAt = Date.now();
    });
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

function refuel() {
  const fuelPrice = systems[player.location].prices["Fuel"];
  if (player.fuel >= FUEL_CAPACITY)
    return log("Your fuel tank is already full.");
  if (player.credits < fuelPrice)
    return log("You don't have enough credits to buy fuel.");

  player.fuel += 1;
  player.credits -= fuelPrice;

  flash("fuel");
  flash("credits");
  log(`Refueled 1 unit at ${fuelPrice.toFixed(2)}ᶜ.`);
  updateUI();
}

