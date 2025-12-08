// --- Configuration & Constants ---

// Storage Keys
const SAVE_KEY = 'spaceMinerSave';

// Timing
const AUTOSAVE_INTERVAL = 30000; // 30 seconds
const MAX_OFFLINE_TIME = 86400; // 24 hours in seconds
const TICK_RATE = 50; // Ticks per second (for min frame rate check)

// Game Parameters
const CREDIT_PER_ORE = 1;
const MAX_LOG_ITEMS = 10;
const COST_MULTIPLIER = 1.15;
const BASE_PRODUCTION_BONUS_PER_UPGRADE = 0.1; // 10%

// Production Definition
const UNIT_PRODUCTION = { 
    miners: 0.5, 
    drills: 5, 
    factories: 40, 
    rockets: 300,
    autofabs: 5000,
    stargates: 100000 
};

// Cost Formulas (Arrow functions and consistent naming)
const costFormulas = {
    miners: n => Math.floor(10 * Math.pow(COST_MULTIPLIER, n)),
    drills: n => Math.floor(120 * Math.pow(COST_MULTIPLIER * 1.02, n)),
    factories: n => Math.floor(1500 * Math.pow(COST_MULTIPLIER * 1.03, n)),
    rockets: n => Math.floor(20000 * Math.pow(COST_MULTIPLIER * 1.04, n)),
    autofabs: n => Math.floor(300000 * Math.pow(COST_MULTIPLIER * 1.05, n)),
    stargates: n => Math.floor(5000000 * Math.pow(COST_MULTIPLIER * 1.06, n)),
};

// Default State (Using all properties for easy merging/reset)
const defaultState = {
    ore: 0, 
    totalMined: 0, 
    manualMined: 0, 
    miners: 0, 
    drills: 0, 
    factories: 0, 
    rockets: 0,
    autofabs: 0,
    stargates: 0,
    credits: 0, 
    autoSellEnabled: false, 
    autoSellLimit: 10000, // Default for 10^4
    lastTick: Date.now(),
    clickPower: 1, // Must be >= 1
    baseProdBonusLevel: 0, 
    upgrades: { autoSellUnlock: false }
};

// Shop Items: Use object spread for cleaner structure
const shopItems = [
    { id: 'miners', name: '[ DRONE-001 ] Miner', desc: `Small robotic miner. +${UNIT_PRODUCTION.miners} ore/sec`, getCost: costFormulas.miners, currency: 'credits' },
    { id: 'drills', name: '[ RIG-MK2 ] Drill Rig', desc: `Industrial drills. +${UNIT_PRODUCTION.drills} ore/sec`, getCost: costFormulas.drills, currency: 'credits' },
    { id: 'factories', name: '[ FAB-03 ] Factory', desc: `Refinery factories. +${UNIT_PRODUCTION.factories} ore/sec`, getCost: costFormulas.factories, currency: 'credits' },
    { id: 'rockets', name: '[ HAULER-A ] Rocket Launch', desc: `Massive space hauler. +${UNIT_PRODUCTION.rockets} ore/sec`, getCost: costFormulas.rockets, currency: 'credits' },
    { id: 'autofabs', name: '[ QUANTUM ] Auto-Fabricator', desc: `Self-replicating machine. +${UNIT_PRODUCTION.autofabs} ore/sec`, getCost: costFormulas.autofabs, currency: 'credits' },
    { id: 'stargates', name: '[ COSMOS ] Stargate', desc: `Harnesses stellar energy. +${UNIT_PRODUCTION.stargates} ore/sec`, getCost: costFormulas.stargates, currency: 'credits' },
];

// Permanent Upgrades (Simplified cost function logic)
const upgradeItems = [
    { 
        id: 'manualPower', name: 'Precision Calibrator', 
        desc: `Increases Ore per Click.`, 
        getCost: s => Math.floor(50 * Math.pow(3, Math.max(0, (s.clickPower || 1) - 1))),
        apply: s => { s.clickPower = (s.clickPower || 1) + 1; logMsg(`Click Power upgraded to ${s.clickPower}`); },
        currency: 'credits' 
    },
    { 
        id: 'baseProdBonus', name: 'Efficiency Protocols', 
        desc: `Increases *all* production by ${BASE_PRODUCTION_BONUS_PER_UPGRADE*100}% per level.`,
        getCost: s => Math.floor(1000 * Math.pow(5, s.baseProdBonusLevel || 0)),
        apply: s => { s.baseProdBonusLevel = (s.baseProdBonusLevel || 0) + 1; logMsg(`Base Production Bonus upgraded to +${((s.baseProdBonusLevel || 0) * BASE_PRODUCTION_BONUS_PER_UPGRADE * 100).toFixed(0)}%`); },
        currency: 'credits'
    },
    { 
        id: 'autoSellUnlock', name: 'Trade Automation', 
        desc: `Automatically sells ore when cargo is full.`,
        getCost: () => 500,
        isPurchased: s => !!s.upgrades?.autoSellUnlock,
        apply: s => { s.upgrades = s.upgrades || {}; s.upgrades.autoSellUnlock = true; s.autoSellEnabled = true; logMsg('Trade Automation unlocked!'); },
        currency: 'credits',
        isOneTime: true
    }
];


document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        // Deactivate all tabs
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));

        // Activate selected tab
        btn.classList.add('active');
        document.getElementById(btn.dataset.tab).classList.add('active');
    });
});


// --- Global State & Element References ---

// Use structuredClone if available, otherwise fallback to JSON (original code was fine here)
let state = typeof structuredClone === 'function' 
    ? structuredClone(defaultState) 
    : JSON.parse(JSON.stringify(defaultState)); 

let lastTime = 0;
let animationFrameId = null;
const shopElements = new Map();
const upgradeElements = new Map();

// Optimized element mapping: fewer lookups, better structure
const elements = Object.fromEntries(
    [
        'oreCount', 'totalMined', 'mineBtn', 'sellBtn', 'creditsTop', 
        'ops', 'shop', 'upgrades', 'log', 'saveBtn', 
        'resetBtn', 'orePerClick', 'autoSellToggle', 'autoSellLimit', 
        'autoSellSlider', 'miners', 'drills', 'factories', 'rockets', 
        'autofabs', 'stargates'
    ].map(id => [id, document.getElementById(id)])
);
// Removed unused 'opsStat' and 'manualMinedCount' references

// --- Utility Functions ---

function logMsg(msg){
    const { log } = elements;
    if(!log) return;
    
    // Use template literal for cleaner string construction
    const d = document.createElement('div');
    d.textContent = `[${new Date().toLocaleTimeString('en-US',{hour12:false})}] > ${msg}`;
    log.prepend(d);
    
    // Optimized log cleanup: faster than repeated removeChild
    while(log.childElementCount > MAX_LOG_ITEMS) {
        log.lastChild.remove();
    }
    
    // Scrolldown is usually only needed for append, but kept original scroll logic for consistency
    // const sw = log.closest('.log-scroll-wrapper'); 
    // if(sw) sw.scrollTop = 0; // Prepending means we don't need to scroll down
}

/** * Calculates Ore Per Second.
 * @param {Object} s - State object.
 * @returns {number} The current O P S value.
 */
function getOrePerSecond(s = state){
    // Optimized production calculation using Object.entries and reduce
    const baseProduction = Object.entries(UNIT_PRODUCTION).reduce((total, [unitId, productionRate]) => {
        // Use ?? 0 for nullish coalescing for cleaner default
        return total + (s[unitId] ?? 0) * productionRate;
    }, 0);
    
    const productionMultiplier = 1 + ((s.baseProdBonusLevel ?? 0) * BASE_PRODUCTION_BONUS_PER_UPGRADE);
    return baseProduction * productionMultiplier;
}


// Inline update functions combined for efficiency
function updateResourceDisplays(){ 
    const { oreCount, totalMined, creditsTop, orePerClick } = elements;
    
    // LocaleString is expensive; only use it for display, not for math
    const ore = Math.floor(state.ore ?? 0);
    const totalMinedVal = Math.floor(state.totalMined ?? 0);
    const credits = Math.floor(state.credits ?? 0);
    const clickPower = Math.floor(state.clickPower ?? 1);

    oreCount.textContent = ore.toLocaleString('en-US'); 
    totalMined.textContent = totalMinedVal.toLocaleString('en-US');
    
    creditsTop.textContent = credits.toLocaleString('en-US');


    orePerClick.textContent = clickPower.toLocaleString('en-US');
}

// --- Synchronization Helper ---

/** Converts state.autoSellLimit to a log10 value for the slider. */
function updateSliderFromLimit() {
    const { autoSellSlider } = elements;
    if (!autoSellSlider) return;
    
    // Ensure limit is at least 100 before calculating log10
    const currentLimit = Math.max(100, state.autoSellLimit ?? defaultState.autoSellLimit);
    
    // Calculate the log base 10 of the current limit
    const logValue = Math.log10(currentLimit); 
    
    // Clamp the value to the slider's range (2 to 10 is log10(100) to log10(10^10))
    autoSellSlider.value = Math.max(2, Math.min(10, logValue));
}

/** Updates state.autoSellLimit from the slider's log10 value and updates the label. */
function updateLimitFromSlider() {
    const { autoSellSlider, autoSellLimit } = elements;
    if (!autoSellSlider || !autoSellLimit) return;
    
    const sliderLogValue = parseFloat(autoSellSlider.value);
    
    // Calculate the new limit: 10 raised to the power of the slider value, rounded up for safety
    let newLimit = Math.ceil(Math.pow(10, sliderLogValue));
    
    // Enforce minimum limit
    newLimit = Math.max(100, newLimit);
    
    // Update state and label
    state.autoSellLimit = newLimit;
    autoSellLimit.textContent = newLimit.toLocaleString('en-US');
}


// --- Storage: save/load/reset ---
function save(){ 
    state.lastTick = Date.now(); 
    try{ 
        localStorage.setItem(SAVE_KEY, JSON.stringify(state)); 
        logMsg('Game saved'); 
        if(elements.saveBtn){
            elements.saveBtn.textContent = 'SAVED!';
            setTimeout(()=>elements.saveBtn.textContent='SAVE NOW',1000);
        }
    }catch(e){
        logMsg('Error saving! Check console.');
        console.error("Save error:", e);
    }
}

function load(){ 
    try{ 
        const r = localStorage.getItem(SAVE_KEY);
        if(!r) return null;
        const parsed = JSON.parse(r);
        
        // Deep-merge: Clone default state first
        const merged = structuredClone ? structuredClone(defaultState) : JSON.parse(JSON.stringify(defaultState));
        
        // Use Object.keys to safely copy properties from parsed to merged
        Object.keys(defaultState).forEach(key => {
            if (key === 'upgrades') {
                // Safely merge nested 'upgrades' object
                merged.upgrades = Object.assign({}, defaultState.upgrades, parsed.upgrades || {});
            } else if (parsed[key] !== undefined) {
                 merged[key] = parsed[key];
            }
        });

        // CRITICAL FIX: Ensure clickPower is at least 1
        merged.clickPower = Math.max(1, merged.clickPower ?? 1);
        // Ensure autoSellLimit is loaded or defaulted to a reasonable number
        merged.autoSellLimit = Math.max(100, merged.autoSellLimit ?? defaultState.autoSellLimit);
        
        return merged;
    }catch(e){
        console.error("Load error", e);
        logMsg('Corrupt save detected. Starting new game.');
        return null;
    }
}

function reset(confirmReset = true){ 
    if(confirmReset && !confirm('WARNING: SYSTEM WIPE. All progress will be lost. Continue?')) return; 
    
    // Use structuredClone if available, otherwise fallback
    state = structuredClone ? structuredClone(defaultState) : JSON.parse(JSON.stringify(defaultState)); 
    
    save(); 
    if(animationFrameId) cancelAnimationFrame(animationFrameId); 
    render(true); 
    requestAnimationFrame(gameLoop); 
    logMsg('System reset complete.');
}

// --- Actions ---

/** Helper to update UI elements dependent on credit/purchase changes */
function updatePurchaseUIs() {
    updateResourceDisplays(); 
    updateShopButtons(); 
    updateUpgradeButtons();
}

function handleMineClick(){ 
    const mined = state.clickPower || 1;
    // Use compound assignment operators for conciseness
    state.ore += mined; 
    state.totalMined += mined; 
    state.manualMined += mined; 
    
    updatePurchaseUIs();
}

function handleSellClick(){ 
    const amt = Math.floor(state.ore || 0); 
    if(amt <= 0) return logMsg('No ore to sell'); 
    
    const credits = amt * CREDIT_PER_ORE; 
    state.ore -= amt; 
    state.credits += credits; 
    
    logMsg(`Sold ${amt.toLocaleString('en-US')} ore for ${credits.toLocaleString('en-US')} credits`); 
    updatePurchaseUIs();
}

function handleBuyItem(id){ 
    const item = shopItems.find(i => i.id === id); 
    if(!item) return; 
    
    const cost = item.getCost(state[item.id] ?? 0);
    const currency = item.currency || 'credits'; 
    
    if((state[currency] ?? 0) < cost) return logMsg(`Insufficient ${currency.toUpperCase()}`); 
    
    state[currency] -= cost; 
    state[item.id] = (state[item.id] ?? 0) + 1; 
    
    logMsg(`Purchased ${item.name} Count: ${state[item.id]}`); 
    render(true);
}

function handleBuyUpgrade(id){
    const item = upgradeItems.find(i => i.id === id);
    if (!item) return;
    
    const cost = item.getCost ? item.getCost(state) : (item.cost || 0);
    const currency = item.currency || 'credits';
    
    if (item.isOneTime && item.isPurchased?.(state)) {
        return logMsg(`ERROR: ${item.name} already purchased.`);
    }

    if((state[currency] ?? 0) < cost) return logMsg(`Insufficient ${currency.toUpperCase()}`);
    
    state[currency] -= cost;
    if(typeof item.apply === 'function') item.apply(state);
    
    render(true);
}

// --- Shop & UI creation ---

/** Creates the base HTML element for a shop or upgrade item. */
function createShopItemElement(item, isUpgrade = false){
    const el = document.createElement('div'); 
    el.className = 'shop-item'; 
    el.setAttribute('role', 'listitem'); 
    el.setAttribute('data-id', item.id);
    
    // Create elements
    const info = document.createElement('div'); 
    const title = document.createElement('strong');
    const desc = document.createElement('div');
    const price = document.createElement('div'); 
    const btn = document.createElement('button'); 
    const statusEl = document.createElement('span'); // Only used for non-upgrades, but cached regardless

    // Element attributes/classes
    statusEl.className = 'status';
    statusEl.setAttribute('data-id', item.id);
    statusEl.textContent = isUpgrade ? '' : 'Count: 0';
    
    desc.className = 'small muted';
    
    price.className = 'price-display small muted'; 
    price.setAttribute('data-price-for', item.id);
    
    btn.className = 'buy'; 
    btn.type = 'button'; 
    btn.textContent = 'BUY'; 
    btn.onclick = () => isUpgrade ? handleBuyUpgrade(item.id) : handleBuyItem(item.id);

    // Build the info block
    title.textContent = item.name;
    info.appendChild(title);
    
    if (!isUpgrade) {
        info.appendChild(document.createTextNode(' (')); 
        info.appendChild(statusEl);
        info.appendChild(document.createTextNode(')')); 
    }
    
    // Dynamic description setup for upgrade tracking
    desc.setAttribute('data-desc-for', item.id);
    desc.textContent = item.desc; // Set initial description (will be updated in updateUpgradeButtons)
    info.appendChild(desc);
    
    // Append to main container
    el.appendChild(info);
    el.appendChild(price);
    el.appendChild(btn);

    // Cache the elements for fast update access
    const cacheMap = isUpgrade ? upgradeElements : shopElements;
    cacheMap.set(item.id, { el, price, btn, statusEl, descEl: desc });

    return el; 
}

/** Updates the display state (cost, buyable, level/count) of all upgrade buttons. */
function updateUpgradeButtons() {
    const avail = state.credits ?? 0;
    
    for (const item of upgradeItems) {
        const cached = upgradeElements.get(item.id);
        if (!cached) continue;

        let cost = item.getCost ? item.getCost(state) : (item.cost ?? 0);
        let canBuy = avail >= cost;
        
        // 1. Handle One-Time Purchases (e.g., autoSellUnlock)
        if (item.isOneTime) {
            const purchased = item.isPurchased?.(state);
            canBuy = !purchased && avail >= cost;
            cached.btn.disabled = !canBuy;
            cached.btn.textContent = purchased ? 'PURCHASED' : 'PURCHASE';

            if (purchased) {
                cached.price.innerHTML = `STATUS: <strong style="color:var(--green)">[ PURCHASED ]</strong>`;
                cached.descEl.textContent = item.desc;
            } else {
                const color = canBuy ? 'var(--accent)' : 'var(--error-color)';
                cached.price.innerHTML = `COST: <strong style="color:${color}">${cost.toLocaleString('en-US')}</strong> ${item.currency.toUpperCase()}`;
                cached.descEl.textContent = item.desc;
            }
        } 
        // 2. Handle Levelled Upgrades
        else {
            cost = item.getCost(state); // Re-calculate cost based on current level
            canBuy = avail >= cost;
            cached.btn.disabled = !canBuy;
            cached.btn.textContent = 'UPGRADE';
            
            const color = canBuy ? 'var(--accent)' : 'var(--error-color)';
            cached.price.innerHTML = `COST: <strong style="color:${color}">${cost.toLocaleString('en-US')}</strong> ${item.currency.toUpperCase()}`;
            
            // Dynamic Description Update
            if (item.id === 'manualPower') {
                cached.descEl.textContent = `Increases Ore per Click. Current: +${state.clickPower ?? 1}`;
            } else if (item.id === 'baseProdBonus') {
                const level = state.baseProdBonusLevel ?? 0;
                const totalBonus = (level * BASE_PRODUCTION_BONUS_PER_UPGRADE * 100).toFixed(0);
                cached.descEl.textContent = `Increases *all* production by ${(BASE_PRODUCTION_BONUS_PER_UPGRADE*100).toFixed(0)}% per level. Current Bonus: +${totalBonus}%`;
            }
        }
    }
}

/** Initializes the shop and upgrade containers if needed, then updates their buttons. */
function updateShop(full = false){ 
    const { shop, upgrades } = elements;
    
    // Optimization: Only rebuild HTML fully if requested (on full render/load/reset)
    if(full){ 
        shop.innerHTML = ''; 
        shopElements.clear(); 
        shopItems.forEach(i => shop.appendChild(createShopItemElement(i, false))); 
        
        upgrades.innerHTML = '';
        upgradeElements.clear();
        upgradeItems.forEach(i => upgrades.appendChild(createShopItemElement(i, true)));
    }
    
    updateShopButtons();
    updateUpgradeButtons();
}

/** Updates the display state (cost, buyable, count) of all unit shop buttons. */
function updateShopButtons(){ 
    const avail = state.credits ?? 0;

    for(const item of shopItems){ 
        const cost = item.getCost(state[item.id] ?? 0);
        const cached = shopElements.get(item.id); 
        
        if(!cached || !cached.statusEl) continue; 
        
        const canBuy = avail >= cost;
        const color = canBuy ? 'var(--accent)' : 'var(--error-color)';
        
        // Use innerHTML for styled output
        cached.price.innerHTML = `COST: <strong style="color:${color}">${cost.toLocaleString('en-US')}</strong> ${item.currency.toUpperCase()}`; 
        cached.btn.disabled = !canBuy; 
        
        // Update count
        cached.statusEl.textContent = `Count: ${Math.floor(state[item.id] ?? 0).toLocaleString('en-US')}`;
    } 
}

/** Updates all display elements for resources and stats. */
function render(full = false){ 
    updateResourceDisplays(); 
    
    // Performance optimization: use a single map and loop for unit display updates
    const unitElements = {
        miners: elements.miners,
        drills: elements.drills,
        factories: elements.factories,
        rockets: elements.rockets,
        autofabs: elements.autofabs,
        stargates: elements.stargates
    };
    
    for (const [unit, el] of Object.entries(unitElements)) {
        if (el) {
            el.textContent = Math.floor(state[unit] ?? 0).toLocaleString('en-US');
        }
    }

    const opsRate = getOrePerSecond();
    if (elements.ops) elements.ops.textContent = opsRate.toFixed(2).toLocaleString('en-US'); // Use toLocaleString for large numbers too
    
    updateShop(full); // Calls updateShopButtons/updateUpgradeButtons
    
    if(elements.autoSellToggle) elements.autoSellToggle.checked = !!state.autoSellEnabled;
    
    // Update AutoSellLimit label text and sync slider position
    if (elements.autoSellLimit) {
        elements.autoSellLimit.textContent = Math.floor(state.autoSellLimit ?? defaultState.autoSellLimit).toLocaleString('en-US');
        updateSliderFromLimit(); 
    }
}

// --- Offline Handling ---

function handleOfflineProgress(){
    const prev = load(); 
    if(!prev){ 
        // Use defaultState (already cloned at top of file)
        state.lastTick = Date.now(); 
        logMsg('New game initialized'); 
        return; 
    }
    
    state = prev; 
    const timeOfflineSec = Math.floor((Date.now() - (prev.lastTick ?? Date.now())) / 1000);
    
    if(timeOfflineSec > 10){ 
        const effectiveTime = Math.min(timeOfflineSec, MAX_OFFLINE_TIME); 
        const ops = getOrePerSecond(prev); 
        const oreGained = ops * effectiveTime; 
        
        state.ore += oreGained; 
        state.totalMined += oreGained;
        
        logMsg(`Offline progress: Gained ${Math.floor(oreGained).toLocaleString('en-US')} ore over ${effectiveTime} seconds.`);
    } else { 
        logMsg('Offline time negligible'); 
    } 
    state.lastTick = Date.now(); 
    render(true);
}

// --- Game Loop ---
function gameLoop(){ 
    const now = Date.now(); 
    // Simplified lastTime initialization
    if(lastTime === 0) lastTime = now; 
    
    const dt = (now - lastTime) / 1000; // Delta time in seconds
    
    // Only process game logic if the required time step has passed
    if(dt >= (1 / TICK_RATE)){ 
        lastTime = now; 
        const ops = getOrePerSecond(); 
        const gained = ops * dt; 
        
        state.ore += gained; 
        state.totalMined += gained; 
        
        // AUTO-SELL LOGIC: More concise check
        if (state.autoSellEnabled && state.upgrades?.autoSellUnlock && state.ore >= (state.autoSellLimit ?? 1000)) {
            handleSellClick();
        }

        render(); // Always update UI after game logic
    } 
    
    animationFrameId = requestAnimationFrame(gameLoop);
}

// --- Initialization ---
function init(){
    handleOfflineProgress();
    
    // Setup event listeners: Use optional chaining where needed for safety
    elements.mineBtn?.addEventListener('click', handleMineClick);
    elements.sellBtn?.addEventListener('click', handleSellClick);
    elements.saveBtn?.addEventListener('click', save);
    elements.resetBtn?.addEventListener('click', () => reset(true));
    
    if(elements.autoSellToggle) {
        elements.autoSellToggle.addEventListener('change', (e) => {
            state.autoSellEnabled = !!e.target.checked;
            
            if(state.autoSellEnabled && !state.upgrades?.autoSellUnlock) {
                logMsg('Auto-Sell enabled locally, but Trade Automation not purchased yet. Purchase the upgrade to activate.');
            } else {
                logMsg(`Auto-Sell: ${state.autoSellEnabled ? 'ENABLED' : 'DISABLED'}`);
            }
        });
    }
    
    // Auto-Sell Slider Listener
    elements.autoSellSlider?.addEventListener('input', updateLimitFromSlider);

    // No separate listener for autoSellLimit display text, as it's driven by the slider/state on render/slider input.

    // Background tasks
    setInterval(save, AUTOSAVE_INTERVAL);
    window.addEventListener('beforeunload', save);
    
    // Spacebar to mine
    window.addEventListener('keydown', e => { 
        if(e.code === 'Space' && !e.repeat && elements.mineBtn){ 
            e.preventDefault(); 
            elements.mineBtn.click(); 
        } 
    });
    
    // Start game loop
    updateShop(true);
    animationFrameId = requestAnimationFrame(gameLoop);
    logMsg('SYSTEM BOOT: Welcome');
    
    // Final UI sync
    elements.autoSellToggle.checked = !!state.autoSellEnabled;
    elements.autoSellLimit.textContent = Math.floor(state.autoSellLimit ?? defaultState.autoSellLimit).toLocaleString('en-US');
    updateSliderFromLimit(); 
}

// Start the application
init();