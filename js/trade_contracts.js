// contracts.js — Overhauled Contract system for ΛTLΛS | ΞQUINOX™

let activeContracts = [];

function generateContract(issuer = "ΛTLΛS | ΞQUINOX™") {
  const type = pickRandom(["delivery", "supply", "acquire"]);
  const resource = pickRandom(RESOURCE_TYPES);
  const destination = pickRandom(SYSTEM_NAMES.filter(s => s !== player.location));

  // 📈 Net worth-based scaling — tuned for early game
  const netWorth = getPlayerNetWorth();
  let scale = 0.5;
  if (netWorth > 500) scale = 0.75;
  if (netWorth > 2_000) scale = 1;
  if (netWorth > 10_000) scale = 1.5;
  if (netWorth > 50_000) scale = 2;

  // Scaled amount and reward
  const baseAmount = randInt(5, 20); // Lowered for early game
  const amount = Math.max(1, Math.floor(baseAmount * scale));
  const scarcity = 1 + (getScarcityModifier(resource) || 0);
  const urgency = 1.2 + Math.random() * 0.8;
  const risk = Math.random(); // 0.0 (safe) to 1.0 (high risk)
  const base = RESOURCE_DATA[resource].base;
  const reward = Math.floor(base * amount * (1 + scarcity + urgency + risk));

  // Scaled time limit
  const duration = randInt(120000, 300000) * scale; // 2–5 min scaled

  const flavor = generateFlavorText(type, resource, destination);

  activeContracts.push({
    id: `CON-${Date.now().toString().slice(-5)}`,
    type,
    resource,
    amount,
    destination,
    reward,
    timeLimit: duration,
    risk: risk.toFixed(2),
    issuedAt: null,
    status: "available",
    issuer,
    flavor
  });
}



function generateFlavorText(type, resource, destination) {
  switch (type) {
    case "delivery":
      return `Urgent delivery needed! ${resource} is required at ${destination}.`;
    case "supply":
      return `System ${destination} is low on ${resource}. Help stabilize their economy.`;
    case "acquire":
      return `${destination} posted a bounty for rare ${resource}. Retrieve and deliver.`;
    default:
      return `Deliver ${resource} to ${destination}.`;
  }
}

function renderAvailableContracts() {
  const container = document.getElementById("contractsContainer");
  container.innerHTML = "";

  const available = activeContracts.filter(c => c.status === "available");
  const hasActive = activeContracts.some(c => c.status === "accepted");

  console.log("Has active contract?", hasActive);

  if (available.length === 0) {
    container.innerHTML = "<p class='text-muted small'>No available contracts.</p>";
    return;
  }

  available.forEach((c, i) => container.appendChild(createContractCard(c, i, hasActive)));
}


function cancelContractById(id) {
  const contract = activeContracts.find(c => c.id === id);
  if (!contract || contract.status !== "accepted") return;

  const penaltyRate = 0.25;
  const fine = Math.floor(contract.reward * penaltyRate);

  if (player.credits < fine) {
    log("You don't have enough credits to pay the cancellation fee.");
    return;
  }

  player.credits -= fine;
  contract.status = "failed";
  contract.failedAt = Date.now();
  log(`Contract ${contract.id} canceled. Paid ¤${fine} in penalties.`);

  console.log("After cancel:", activeContracts); // 👈 add this

  updateUI();
  renderActiveContracts();
  renderAvailableContracts();
}



function createContractCard(contract, index, hasActive) {
  const card = document.createElement("div");
  card.className = "contract-card";

  if (contract.status === "failed") card.classList.add("failed");

  const minutes = Math.floor(contract.timeLimit / 60000);
  let buttons = "";

  if (contract.status === "accepted") {
    buttons += `
      <button class="btn btn-success btn-sm" onclick="deliverContract('${contract.id}')">Deliver</button>
      <button class="btn btn-warning btn-sm" onclick="cancelContractById('${contract.id}')" title="Pay 25% penalty to cancel">
        Cancel <span style="color: #dc3545; font-size: 0.75em;">(-25%)</span>
      </button>
    `;
  } else {
    buttons += `
      <button class="btn btn-success btn-sm" onclick="acceptContractById('${contract.id}')" ${hasActive ? 'disabled title="You already have an active contract."' : ''}>Accept</button>
      <button class="btn btn-secondary btn-sm" onclick="rerollContractById('${contract.id}')" ${hasActive ? 'disabled title="Cannot reroll with active contract."' : ''}>Reroll</button>
      <button class="btn btn-danger btn-sm" onclick="declineContractById('${contract.id}')">Decline</button>
    `;
  }

  card.innerHTML = `
    <h6>${contract.flavor}</h6>
    <p><strong>${contract.amount}${UNIT} ${contract.resource}</strong></p>
    <p>To: <strong>${contract.destination}</strong></p>
    <small>Reward: <span class="text-success">${contract.reward.toFixed(2)}ᶜ</span></small><br>
    <small>Time Limit: ${minutes} min — Risk: <span class="text-warning">${(contract.risk * 100).toFixed(0)}%</span></small>
    <div class="contract-card-buttons mt-2">
      ${buttons}
    </div>
  `;
  return card;
}







function renderActiveContracts() {
  const container = document.getElementById("activeContractsContainer");
  container.innerHTML = "";
  const now = Date.now();
  const active = activeContracts.filter(c => c.status === "accepted");

  if (active.length === 0) {
    container.innerHTML = "<div class='text-muted small'>No active contracts.</div>";
    return;
  }

  active.forEach(contract => {
    const remaining = Math.max(0, contract.issuedAt + contract.timeLimit - now);
    const mins = Math.floor(remaining / 60000);
    const secs = Math.floor((remaining % 60000) / 1000);
    const countdown = `${mins}m ${secs}s`;
    const canDeliver = player.location === contract.destination &&
      (player.inventory[contract.resource]?.reduce((s, [q]) => s + q, 0) || 0) >= contract.amount;

    const card = document.createElement("div");
    card.className = "contract-card";
    card.innerHTML = `
    <h6>${contract.flavor}</h6>
    <p><strong>${contract.amount}${UNIT} ${contract.resource}</strong></p>
    <p>To: <strong>${contract.destination}</strong></p>
    <small>Reward: <span class="text-success">${contract.reward.toFixed(2)}ᶜ</span></small><br>
    <small>Time Left: <span class="${remaining < 60000 ? "text-danger" : ""}">${countdown}</span></small>
    <div class="contract-card-buttons mt-2">
      <button class="btn btn-success btn-sm" ${canDeliver ? `onclick="deliverContract('${contract.id}')"` : 'disabled title="Wrong location or insufficient resources."'}>
        Deliver
      </button>
      <button class="btn btn-danger btn-sm" onclick="cancelContractById('${contract.id}')" title="Pay 25% penalty to cancel">
        Cancel <span font-size: 0.75em;">(-25% Fine)</span>
      </button>

    </div>
  `;


    container.appendChild(card);
  });
}

function acceptContractById(id) {
  const contract = activeContracts.find(c => c.id === id);
  if (!contract || contract.status !== "available") return;

  const hasActive = activeContracts.some(c => c.status === "accepted");
  if (hasActive) {
    log("You already have an active contract.");
    return;
  }

  contract.status = "accepted";
  contract.issuedAt = Date.now();

  console.log("Accepted:", contract.id); // Debug

  updateUI();
  renderAvailableContracts();
  renderActiveContracts();
}


function rerollContractById(id) {
  const index = activeContracts.findIndex(c => c.id === id);
  if (index === -1 || activeContracts[index].status !== "available") return;
  if (player.credits < 100) {
    log("Insufficient credits to reroll.");
    return;
  }
  player.credits -= 100;
  activeContracts.splice(index, 1);
  generateContract();
  renderAvailableContracts();
  flash("credits");
}

function declineContractById(id) {
  const index = activeContracts.findIndex(c => c.id === id);
  if (index !== -1) {
    activeContracts.splice(index, 1);
    renderAvailableContracts();
  }
}





function deliverContract(id) {
  const c = activeContracts.find(c => c.id === id);
  if (!c || c.status !== "accepted") return;
  if (player.location !== c.destination) return;

  const inv = player.inventory[c.resource]?.reduce((s, [q]) => s + q, 0) || 0;
  if (inv < c.amount) return;

  deductInventory(c.resource, c.amount);
  player.credits += c.reward;
  c.status = "completed";
  flash("credits");
  logSuccess(c);
  updateUI();
  renderActiveContracts();
}

function checkContractTimers() {
  const now = Date.now();
  activeContracts.forEach(c => {
    if (c.status === "accepted" && now > c.issuedAt + c.timeLimit) {
      c.status = "failed";
      logMarket(`<span class="text-warning">${c.issuer}</span> contract ${c.id} <span class="text-danger">FAILED</span>.`);
    }
  });
  renderActiveContracts();
}

function deductInventory(resource, amount) {
  let toRemove = amount;
  const batches = player.inventory[resource];
  for (let i = 0; i < batches.length && toRemove > 0; i++) {
    const [qty] = batches[i];
    const take = Math.min(qty, toRemove);
    batches[i][0] -= take;
    toRemove -= take;
  }
  player.inventory[resource] = batches.filter(([q]) => q > 0);
}

function logSuccess(contract) {
  log(`Contract ${contract.id} completed: Delivered ${contract.amount}${UNIT} of ${contract.resource} to ${contract.destination}. +${contract.reward}ᶜ`);
  logMarket(`<span class="text-warning">${contract.issuer}</span> completed <span class="text-info">${contract.id}</span>: Delivered <strong>${contract.amount}${UNIT}</strong> of <strong>${contract.resource}</strong> to <strong>${contract.destination}</strong> — <span class="text-success">+${contract.reward.toFixed(2)}ᶜ</span>`);
}

// Utility
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getScarcityModifier(resource) {
  let scarcityCount = 0;
  for (const sys of SYSTEM_NAMES) {
    const available = systems[sys].market[resource];
    if (!available) scarcityCount++;
  }
  return scarcityCount / SYSTEM_NAMES.length;
}
