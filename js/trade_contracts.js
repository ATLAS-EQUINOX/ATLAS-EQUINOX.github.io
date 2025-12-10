// contracts.js — Overhauled Contract system for ΛTLΛS | ΞQUINOX™

let availableContracts = [];
let acceptedContracts = [];

// --- CONSTANTS ---
const CONTRACT_SETTINGS = {
    // Scaling based on player net worth
    SCALING_THRESHOLDS: [500, 2000, 10000, 50000],
    SCALING_FACTORS: [0.75, 1.0, 1.5, 2.0], // Net worth > 500, > 2k, > 10k, > 50k
    BASE_SCALE: 0.5,
    
    // Reward calculation factors
    BASE_AMOUNT_RANGE: [5, 20], // Min and max units for base amount
    URGENCY_RANGE: [1.2, 2.0],  // 1.2 + Math.random() * 0.8
    PENALTY_RATE: 0.25,         // 25% penalty for cancellation
    REROLL_COST: 100,           // Cost to reroll a contract
    
    // Time limits (in milliseconds) - scaled by net worth factor
    DURATION_RANGE: [120000, 300000], // 2 to 5 minutes
};

// --- Contract Generation ---

/**
 * Calculates a scaling factor based on the player's net worth.
 * @returns {number} The scaling multiplier.
 */
function getScaleFactor() {
    const netWorth = getPlayerNetWorth();
    let scale = CONTRACT_SETTINGS.BASE_SCALE;
    
    // Iterate through defined thresholds and factors
    for (let i = 0; i < CONTRACT_SETTINGS.SCALING_THRESHOLDS.length; i++) {
        if (netWorth > CONTRACT_SETTINGS.SCALING_THRESHOLDS[i]) {
            scale = CONTRACT_SETTINGS.SCALING_FACTORS[i];
        } else {
            break; // Stop at the first threshold not met
        }
    }
    return scale;
}

function generateContract(issuer = "ΛTLΛS | ΞQUINOX™") {
    // 1. Determine Type, Resource, and Destination
    const type = pickRandom(["delivery", "supply", "acquire"]);
    const resource = pickRandom(RESOURCE_TYPES);
    const destination = pickRandom(SYSTEM_NAMES.filter((s) => s !== player.location));

    // 2. Net worth-based scaling
    const scale = getScaleFactor();
    
    // Scaled amount
    const [minBase, maxBase] = CONTRACT_SETTINGS.BASE_AMOUNT_RANGE;
    const baseAmount = randInt(minBase, maxBase);
    const amount = Math.max(1, Math.floor(baseAmount * scale));
    
    // 3. Dynamic Reward Modifiers
    const scarcity = 1 + (getScarcityModifier(resource) || 0);
    const urgency = CONTRACT_SETTINGS.URGENCY_RANGE[0] + Math.random() * (CONTRACT_SETTINGS.URGENCY_RANGE[1] - CONTRACT_SETTINGS.URGENCY_RANGE[0]);
    const risk = Math.random(); // 0.00 to 1.00
    const basePrice = RESOURCE_DATA[resource].base;
    
    // Reward is scaled by base price, amount, and dynamic modifiers
    const reward = Math.floor(basePrice * amount * (scarcity + urgency + risk)); 

    // 4. Contract Details
    const difficulty = getContractDifficulty(reward, risk, urgency);
    const [minDur, maxDur] = CONTRACT_SETTINGS.DURATION_RANGE;
    const duration = randInt(minDur, maxDur) * scale;
    const flavor = generateFlavorText(type, resource, destination);

    const newContract = {
        id: crypto.randomUUID(),
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
        flavor,
        difficulty,
    };

    newContract.status = "available";
    availableContracts.push(newContract);
}


function generateFlavorText(type, resource, destination) {
    switch (type) {
        case "delivery":
            return `Urgent delivery needed! **${resource}** is required at ${destination}.`;
        case "supply":
            return `System ${destination} is low on **${resource}**. Help stabilize their economy.`;
        case "acquire":
            return `${destination} posted a bounty for rare **${resource}**. Retrieve and deliver.`;
        default:
            return `Deliver ${resource} to ${destination}.`;
    }
}

// --- Contract UI Rendering & Actions ---

function getContractById(id) {
    return acceptedContracts.find(c => c.id === id) || availableContracts.find(c => c.id === id);
}


function renderAvailableContracts() {
    const container = document.getElementById("contractsContainer");
    container.innerHTML = "";

    const hasActive = acceptedContracts.some(c => c.status === "accepted");
    const available = availableContracts;

    if (available.length === 0) {
        container.innerHTML =
            "<p class='text-muted small'>No available contracts.</p>";
        return;
    }

    available.forEach(c => {
        container.appendChild(createContractCard(c, hasActive));
    });
}

function cancelContractById(id) {
    const contract = getContractById(id);
    if (!contract || contract.status !== "accepted") return log("No active contract found to cancel.");

    const fine = Math.floor(contract.reward * CONTRACT_SETTINGS.PENALTY_RATE);

    if (player.credits < fine) {
        return log("You don't have enough credits to pay the cancellation fee.");
    }

    player.credits -= fine;
    contract.status = "failed";
    contract.failedAt = Date.now();
    log(`Contract ${contract.id} canceled. Paid ${fine.toFixed(2)}ᶜ in penalties.`);

    acceptedContracts = acceptedContracts.filter(c => c.id !== id);

    updateUI();
    renderacceptedContracts() // make sure this matches your function name
    renderAvailableContracts();
}


// Optimized createContractCard: removed index, added Difficulty to display
function createContractCard(contract, hasActive) {
    const card = document.createElement("div");
    card.className = "contract-card";

    if (contract.status === "failed") card.classList.add("failed");

    const minutes = Math.floor(contract.timeLimit / 60000);
    let buttons = "";
    
    const riskPercent = (contract.risk * 100).toFixed(0);

    if (contract.status === "accepted") {
        buttons += `
            <button class="btn btn-success btn-sm" onclick="deliverContract('${contract.id}')">Deliver</button>
            <button class="btn btn-warning btn-sm" onclick="cancelContractById('${contract.id}')" title="Pay ${CONTRACT_SETTINGS.PENALTY_RATE * 100}% penalty to cancel">
                Cancel <span style="color: #dc3545; font-size: 0.75em;">(-${CONTRACT_SETTINGS.PENALTY_RATE * 100}%)</span>
            </button>
        `;
    } else {
        // Disabled logic consolidated
        const disabledAttr = hasActive ? 'disabled title="You already have an active contract."' : "";
        buttons += `
            <button class="btn btn-success btn-sm" onclick="acceptContractById('${contract.id}')" ${disabledAttr}>Accept</button>
            <button class="btn btn-secondary btn-sm" onclick="rerollContractById('${contract.id}')" ${disabledAttr}>Reroll (100ᶜ)</button>

        `;
    }

    card.innerHTML = `
        <h6>${contract.flavor.replace(/\*\*/g, '<strong>').replace(/\*\*/g, '</strong>')}</h6>
        <p><strong>${contract.amount}${UNIT} ${contract.resource}</strong></p>
        <p>To: <strong>${contract.destination}</strong></p>
        <small>Reward: <span class="text-warning">${contract.reward.toFixed(
            2
        )}ᶜ</span></small><br>
        <small>
            <span class="text-info">${contract.difficulty}</span> 
            | Time Limit: ${minutes} min 
            | Risk: <span class="text-warning">${riskPercent}%</span>
        </small>
        <div class="contract-card-buttons mt-2">
            ${buttons}
        </div>
    `;
    return card;
}

function renderacceptedContracts() {
    const container = document.getElementById("acceptedContractsContainer");
    container.innerHTML = "";
    const now = Date.now();
    
    // Filter out only active contracts
    const active = acceptedContracts.filter((c) => c.status === "accepted");

    if (active.length === 0) {
        container.innerHTML =
            "<div class='text-muted small'>No active contracts.</div>";
        return;
    }

    active.forEach((contract) => {
        const remaining = Math.max(0, contract.issuedAt + contract.timeLimit - now);
        const mins = Math.floor(remaining / 60000);
        const secs = Math.floor((remaining % 60000) / 1000);
        const countdown = `${mins}m ${secs}s`;
        
        // Calculate inventory check once
        const invAmount = player.inventory[contract.resource]?.reduce((s, [q]) => s + q, 0) || 0;
        const canDeliver = player.location === contract.destination && invAmount >= contract.amount;
        
        // Check for failure and update status if time ran out
        if (remaining === 0) {
             contract.status = "failed";
             logMarket(
               `<span class="text-warning">${contract.issuer}</span> contract ${contract.id} <span class="text-danger">FAILED</span> (Time Limit).`
             );
             // Return early so this failed contract isn't rendered as active
             return; 
        }

        const card = document.createElement("div");
        card.className = "contract-card";
        card.innerHTML = `
            <h6>${contract.flavor.replace(/\*\*/g, '<strong>').replace(/\*\*/g, '</strong>')}</h6>
            <p><strong>${contract.amount}${UNIT} ${contract.resource}</strong></p>
            <p>To: <strong>${contract.destination}</strong></p>
            <small>Reward: <span class="text-warning">${contract.reward.toFixed(2)}ᶜ</span></small><br>
            <small>Time Left: <span class="${
                remaining < 60000 ? "text-danger" : ""
            }">${countdown}</span></small>
            <div class="contract-card-buttons mt-2">
                <button class="btn btn-success btn-sm" ${
                    canDeliver
                        ? `onclick="deliverContract('${contract.id}')"`
                        : 'disabled title="Wrong location or insufficient resources."'
                }>
                    Deliver
                </button>
                <button class="btn btn-danger btn-sm" onclick="cancelContractById('${
                    contract.id
                }')" title="Pay ${CONTRACT_SETTINGS.PENALTY_RATE * 100}% penalty to cancel">
                    Cancel <span font-size: 0.75em;">(-${CONTRACT_SETTINGS.PENALTY_RATE * 100}% Fine)</span>
                </button>
            </div>
        `;
        container.appendChild(card);
    });
}

function acceptContractById(id) {
    const original = availableContracts.find(c => c.id === id);
    if (!original) return;

    const hasActive = acceptedContracts.some(c => c.status === "accepted");
if (hasActive) return log("Complete or cancel your active contract first.");


    const frozen = structuredClone(original);
    frozen.status = "accepted";
    frozen.issuedAt = Date.now();

    acceptedContracts.push(frozen);

    // remove from available list
    availableContracts = availableContracts.filter(c => c.id !== id);

  renderAvailableContracts();
  renderacceptedContracts();
  updateUI();  // optional, if you want credits/inventory to refresh

}

function rerollContractById(id) {
    const index = availableContracts.findIndex(c => c.id === id);
    if (index === -1) return;

    if (player.credits < CONTRACT_SETTINGS.REROLL_COST) {
        log("Insufficient credits to reroll (Cost: 100ᶜ).");
        return;
    }

    player.credits -= CONTRACT_SETTINGS.REROLL_COST;

    // Remove old contract
    availableContracts.splice(index, 1);

    // Generate a new one
    generateContract();

    log(`Contract rerolled for ${CONTRACT_SETTINGS.REROLL_COST}ᶜ.`);

    renderAvailableContracts();
    flash("credits");
}


function declineContractById(id) {
    // Replaced findIndex + splice with filter for cleaner array management
    const initialLength = acceptedContracts.length;
    acceptedContracts = acceptedContracts.filter((c) => c.id !== id);

    if (acceptedContracts.length < initialLength) {
        log(`Contract ${id} declined and removed.`);
        renderAvailableContracts();
    }
}

function deliverContract(id) {
    const contract = getContractById(id);
    if (!contract || contract.status !== "accepted") return log("Error: Contract not active.");
    if (player.location !== contract.destination) return log(`You must be at ${contract.destination} to deliver.`);

    // Check inventory using the same efficient logic as rendering
    const invAmount = player.inventory[contract.resource]?.reduce((s, [q]) => s + q, 0) || 0;
    if (invAmount < contract.amount) return log(`Insufficient ${contract.resource}. Need ${contract.amount}${UNIT}.`);

    deductInventory(contract.resource, contract.amount);
    player.credits += contract.reward;
    contract.status = "completed";

    acceptedContracts = acceptedContracts.filter(c => c.id !== id);
    
    flash("credits");
    logSuccess(contract);
    updateUI();
    
    // Remove completed contract from active list, or keep it for a short history? 
    // Assuming for now it should be kept until next refresh to allow for logging.
    // A separate function to clean up completed/failed contracts might be better.
    
    renderacceptedContracts();
    renderAvailableContracts();
}

function checkContractTimers() {
    const now = Date.now();
    let updated = false;

    // Use forEach to check all and update the status in place
    acceptedContracts.forEach((c) => {
        if (c.status === "accepted" && now > c.issuedAt + c.timeLimit) {
            c.status = "failed";
            c.failedAt = now;
            updated = true;
            logMarket(
                `<span class="text-warning">${c.issuer}</span> contract ${c.id} <span class="text-danger">FAILED</span> (Time Limit).`
            );
        }
    });
    
    // Optional: Filter out old completed/failed contracts to keep array small
    // acceptedContracts = acceptedContracts.filter(c => c.status === "accepted" || (c.status === "available"));

    if (updated) {
        renderacceptedContracts();
    }
}

function deductInventory(resource, amount) {
    let toRemove = amount;
    const batches = player.inventory[resource];
    
    // Process the batches in reverse order (LIFO) or by insertion order (FIFO)? 
    // The original code uses FIFO (from start of array). Let's keep it clean.
    const newBatches = [];
    
    for (const [qty, paid] of batches) {
        if (toRemove > 0) {
            const take = Math.min(qty, toRemove);
            toRemove -= take;
            
            if (qty - take > 0) {
                newBatches.push([qty - take, paid]);
            }
        } else {
            newBatches.push([qty, paid]);
        }
    }
    
    player.inventory[resource] = newBatches;
}

function logSuccess(contract) {
    log(
        `Contract ${contract.id} completed: Delivered ${contract.amount}${UNIT} of ${contract.resource} to ${contract.destination}. +${contract.reward.toFixed(2)}ᶜ`
    );
    logMarket(
        `<span class="text-warning">${
            contract.issuer
        }</span> completed <span class="text-info">${
            contract.id
        }</span>: Delivered <strong>${contract.amount}${UNIT}</strong> of <strong>${
            contract.resource
        }</strong> to <strong>${
            contract.destination
        }</strong> — <span class="text-success">+${contract.reward.toFixed(
            2
        )}ᶜ</span>`
    );
}

// --- UTILITY FUNCTIONS ---

function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function getScarcityModifier(resource) {
    // Only count systems where the resource *is* tradable but has low supply/demand ratio, 
    // or if the resource is completely missing from a system's market.
    let scarcityScore = 0;
    const totalSystems = SYSTEM_NAMES.length;

    for (const sys of SYSTEM_NAMES) {
        const market = systems[sys].market?.[resource];
        if (!market || market.supply === 0) {
            // Resource is not available or market is non-existent
            scarcityScore += 1;
        } else {
            // Check current market supply vs demand ratio
            const ratio = market.supply / (market.demand + 1); 
            if (ratio < 0.5) { // If supply is less than half of demand, add a partial scarcity score
                scarcityScore += 0.5;
            }
        }
    }
    
    // Normalize to a modifier (e.g., 0.0 to 1.0+)
    return scarcityScore / totalSystems;
}

function getContractDifficulty(reward, risk, urgency) {
    // Score should primarily reflect the raw economic effort (reward * amount) + risk/time pressure
    const score = reward * (1 + parseFloat(risk)) * urgency; 
    
    if (score < 500) return "★☆☆";      
    if (score < 2000) return "★★☆";    
    if (score < 5000) return "★★★";
    return "★★★★";                    
}

// NOTE: External functions (getPlayerNetWorth, log, logMarket, flash, updateUI, UNIT, RESOURCE_DATA, RESOURCE_TYPES, SYSTEM_NAMES, systems, player, document) are assumed to be defined externally.