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

function getRandomShipmentDelay() {
  const min = 3000; // 3 seconds
  const max = 300000; // 10 minutes
  const skewed = Math.pow(Math.random(), 2); // Squared = bias toward 0
  return Math.floor(skewed * (max - min) + min);
}
