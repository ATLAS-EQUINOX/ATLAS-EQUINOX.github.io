const FUEL_CAPACITY = 1000;
const TRAVEL_FUEL_COST = 10 * (Math.random() * 0.5 + 0.75); // Random between 7.5-12.5

let player = {
  location: SYSTEM_NAMES[Math.floor(Math.random() * SYSTEM_NAMES.length)],
  credits: 100,
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
