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
    base: 20, // Scarce and essential off-Earth
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
    base: 10, // Critical to operations, regulated
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
};


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
