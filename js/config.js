const RESOURCE_TYPES = [
    "Carbon",
    "Cobalt",
    "Copper",
    "Fuel",
    "FuelXR",
    "Gold",
    "Helium",
    "Hydrogen",
    "Iron",
    "Iridium",
    "Lithium",
    "Neon",
    "Nickel",
    "Oxygen",
    "Platinum",
    "Scrap",
    "Silicon",
    "Soil",
    "Titanium",
    "Uranium",
    "Water",
];

const RESOURCE_DATA = {
    Carbon: {
    base: 28, // Versatile industrial element, organic compounds
    volatility: 0.03,
    },
    Cobalt: {
    base: 120, // Essential for aerospace alloys and batteries
    volatility: 0.035,
    },
    Copper: {
    base: 80, // Electronics and wiring, steady demand
    volatility: 0.02,
    },
    Fuel: {
    base: 5, // Basic propulsion fuel, highly regulated
    volatility: 0.02,
    },
    FuelXR: {
    base: 101, // Advanced fuel, critical for long-range ops
    volatility: 0.02,
    },
    Gold: {
    base: 950, // Stable, high-value precious metal
    volatility: 0.01,
    },
    Helium: {
    base: 22, // Inert transport gas, low mass cost
    volatility: 0.04,
    },
    Hydrogen: {
    base: 35, // Light fuel gas, high volume use
    volatility: 0.05,
    },
    Iron: {
    base: 45, // Abundant metal for construction
    volatility: 0.01,
    },
    Iridium: {
    base: 1100, // Rare catalytic metal, very stable
    volatility: 0.015,
    },
    Lithium: {
    base: 140, // Key battery material, demand volatility
    volatility: 0.05,
    },
    Neon: {
    base: 18, // Rare noble gas, limited industrial use
    volatility: 0.05,
    },
    Nickel: {
    base: 55, // Used in alloys and plating
    volatility: 0.02,
    },
    Oxygen: {
    base: 75, // Critical for life support systems
    volatility: 0.035,
    },
    Platinum: {
    base: 850, // Precious metal, catalytic applications
    volatility: 0.015,
    },
    Scrap: {
    base: 2, // Recycled materials, fluctuating utility
    volatility: 0.02,
    },
    Silicon: {
    base: 65, // Semiconductors and solar tech
    volatility: 0.025,
    },
    Soil: {
    base: 2, // Agriculture and terraforming base
    volatility: 0.02,
    },
    Titanium: {
    base: 300, // High-strength alloy, aerospace-grade
    volatility: 0.02,
    },
    Uranium: {
    base: 1200, // Nuclear fuel, restricted trade
    volatility: 0.02,
    },
    Water: {
    base: 20, // Essential for survival, scarce off-world
    volatility: 0.03,
    },
};




const SYSTEM_NAMES = [
    "55 Cancri",
    "Alpha Centauri",
    "Altair",
    "Barnard's Star",
    "Beta Pictoris",
    "Deneb",
    "Epsilon Eridani",
    "Fomalhaut",
    "Gliese 581",
    "Gliese 667 C",
    "HD 40307",
    "Kapteyn's Star",
    "Kepler-22b",
    "Kepler-442b",
    "Luyten's Star",
    "Tau Ceti",
    "TRAPPIST-1",
    "Wolf 359",
];

const SPECIALIZATION_EFFECTS = {
    "Base Metals": ["Iron", "Nickel", "Copper", "Cobalt", "Scrap"],
    "High-Tech Materials": ["Lithium", "Silicon", "Cobalt", "Platinum"],
    "Fuel & Energy": ["Fuel", "FuelXR", "Hydrogen", "Helium", "Uranium"],
    "Noble Gases": ["Helium", "Neon"],
    "Water & Oxygen": ["Water", "Oxygen"],
    "Organic Materials": ["Carbon", "Soil", "Silicon", "Oxygen"],
    "Precious Metals": ["Gold", "Platinum", "Iridium"],
    "Structural Alloys": ["Titanium", "Iron", "Nickel"],
    "Exotic Resources": ["Iridium", "Uranium", "Neon"],
};

const SYSTEM_SPECIALIZATIONS = {
    "55 Cancri": ["Rare Earths", "Exotic Resources"],
    "Alpha Centauri": ["Base Metals", "Structural Alloys"],
    "Altair": ["Ice", "Water & Oxygen"],
    "Barnard's Star": ["Gases", "Noble Gases"],
    "Beta Pictoris": ["Fuel & Energy"],
    "Deneb": ["Precious Metals", "Exotic Resources"],
    "Epsilon Eridani": ["Fuel & Energy", "Base Metals"],
    "Fomalhaut": ["Organic Materials", "Water & Oxygen"],
    "Gliese 581": ["Rare Earths", "High-Tech Materials"],
    "Gliese 667 C": ["Gases", "Noble Gases"],
    "HD 40307": ["Base Metals", "Structural Alloys"],
    "Kapteyn's Star": ["Ice", "Water & Oxygen"],
    "Kepler-22b": ["Gases", "Fuel & Energy"],
    "Kepler-442b": ["Ice", "Organic Materials"],
    "Luyten's Star": ["High-Tech Materials", "Rare Earths"],
    "Tau Ceti": ["Precious Metals", "Organic Materials"],
    "TRAPPIST-1": ["Water & Oxygen", "Structural Alloys"],
    "Wolf 359": ["Base Metals", "Fuel & Energy"],
};
  


const WARP_GRAPH = {
    "55 Cancri": ["Beta Pictoris", "Kepler-452b", "Vega"],
    "Alpha Centauri": ["Proxima Centauri", "Ross 128", "Sol"],
    "Altair": ["Fomalhaut", "Vega", "YZ Ceti"],
    "Barnard's Star": ["Kapteyn's Star", "Tau Ceti", "Wolf 359"],
    "Beta Pictoris": ["55 Cancri", "Gliese 667 C", "Kepler-442b"],
    "Epsilon Eridani": ["Gliese 581", "Luyten's Star", "TRAPPIST-1e"],
    "Fomalhaut": ["Altair", "Sirius", "TRAPPIST-1e"],
    "Gliese 581": ["Epsilon Eridani", "Kapteyn's Star"],
    "Gliese 667 C": ["Beta Pictoris", "Kepler-22b"],
    "HD 40307": ["Kepler-22b", "Lalande 21185", "Tau Ceti"],
    "Kapteyn's Star": ["Barnard's Star", "Gliese 581", "Lalande 21185"],
    "Kepler-22b": ["Gliese 667 C", "HD 40307", "Kepler-442b"],
    "Kepler-442b": ["Beta Pictoris", "Kepler-22b", "Wolf 359"],
    "Kepler-452b": ["55 Cancri"],
    "Lalande 21185": ["HD 40307", "Kapteyn's Star"],
    "Luyten's Star": ["Epsilon Eridani"],
    "Proxima Centauri": ["Alpha Centauri"],
    "Ross 128": ["Alpha Centauri"],
    "Sirius": ["Fomalhaut"],
    "Sol": ["Alpha Centauri"],
    "Tau Ceti": ["Barnard's Star", "HD 40307"],
    "TRAPPIST-1e": ["Epsilon Eridani", "Fomalhaut"],
    "Vega": ["55 Cancri", "Altair"],
    "Wolf 359": ["Barnard's Star", "Kepler-442b"],
    "YZ Ceti": ["Altair"],
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


const TARIFF_SETTINGS = {
    baseImport: 0.06,
    baseExport: 0.04,
    minRate: 0.01,
    maxRate: 0.25,
    dynamicAdjustmentFactor: 0.02, // per unit of supply/demand imbalance
    highValueThreshold: 500,
    highValuePenalty: 0.02,
};
  
