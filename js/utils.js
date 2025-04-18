var system;
function cleanNumber(num) {
  return parseFloat(num.toFixed(2)); // rounds to 2 decimal places and removes trailing zeroes
}

function formatPrice(num) {
  return parseFloat(num).toFixed(2);
}

async function fetchLastUpdated() {
  try {
    const repoOwner = "atlas-equinox";
    const repoName = "atlas-equinox.github.io";
    const response = await fetch(
      `https://api.github.com/repos/${repoOwner}/${repoName}`
    );
    if (!response.ok) throw new Error("Network response was not ok");
    const data = await response.json();
    const lastUpdated = new Date(data.updated_at).toLocaleString();
    document.getElementById("last-updated").innerText = lastUpdated;
  } catch (error) {
    console.error("Error fetching the GitHub repo:", error);
    document.getElementById("last-updated").innerText = "Error fetching data";
  }
}

function getRandomCorporation() {
  return npcCorporations[Math.floor(Math.random() * npcCorporations.length)];
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

function flash(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.add("flash");
  setTimeout(() => el.classList.remove("flash"), 500);
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

function countBatches(store) {
  let count = 0;
  for (const res in store) {
    const batches = store[res];
    count += batches.reduce((sum, [qty]) => sum + qty, 0);
  }
  return count;
}

/**
 * Returns a delay (ms) between 3 s and 10 min, 
 * with most deliveries clustered near ~30 s–2 min but
 * a long tail and occasional hold‑ups.
 */
function getRandomShipmentDelay() {
  const minMs = 5_000;    // 3 s
  const maxMs = 300_000;  // 5 min for the bulk

  // 1) generate a log‑normal random around μ=10s, σ=1.0
  function randStdNormal() {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }
  const μ = Math.log(30_000);   // median ≈30 s
  const σ = 1.0;                // controls spread
  let delay = Math.exp(μ + σ * randStdNormal());

  // 2) rare event hold‑ups
  const e = Math.random();
  if (e < 0.05) {
    // 1% chance of pirate ambush: +30–60 s
    delay += 30_000 + Math.random()*30_000;
  } else if (e < 0.03) {
    // additional 2% chance of storm: +60–120 s
    delay += 60_000 + Math.random()*60_000;
  }

  // 3) clamp to [minMs, maxMs + any hold‑up]
  delay = Math.max(minMs, Math.min(maxMs, delay));

  return Math.floor(delay);
}


function calculateStorageValue(storage) {
  let total = 0;
  for (const res in storage) {
    const base = RESOURCE_DATA[res]?.base || 1;
    total += storage[res].reduce((sum, [qty]) => sum + qty * base, 0);
  }
  return total;
}

function getPlayerNetWorth() {
  const vaultValue = calculateStorageValue(player.vault);
  const inventoryValue = calculateStorageValue(player.inventory);
  return player.credits + vaultValue + inventoryValue;
}

function calculatePlayerNetWorth() {
  let net = player.credits || 0;

  if (Array.isArray(player.inventory)) {
    for (const item of player.inventory) {
      const price = getAverageMarketPrice(player.location, item.resource) || 0;
      net += item.quantity * price;
    }
  }

  if (Array.isArray(player.vault)) {
    for (const item of player.vault) {
      const price = getAverageMarketPrice(player.location, item.resource) || 0;
      net += item.quantity * price;
    }
  }

  return net;
}


function updatePlayerNetWorth() {
  const netWorth = calculatePlayerNetWorth(); // you may already have this function

  if (netWorth > gameState.playerHighScore) {
    gameState.playerHighScore = netWorth;
    updateHighScoreDisplay(); // trigger the UI update when it changes
  }
}

function updateHighScoreDisplay() {
  const el = document.getElementById("highScoreValue");
  if (el) {
    el.textContent = formatCredits(gameState.playerHighScore || 0);
  }
}


function formatCredits(value) {
  return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + "ᶜ";
}


