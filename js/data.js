// All numbers on the site live here, with the source they came from.
// Snapshot date: 8 October 2026.
window.DATA = (() => {
  const AS_OF = "8 October 2026";

  // NOAA CPC weekly OISST indices (1991–2020 base), file wksst9120.for.
  // [week centred on, Niño 1+2, Niño 3, Niño 3.4, Niño 4] — anomalies in °C.
  const weekly = [
    ["2026-01-07", -0.6, -0.9, -0.7, -0.1], ["2026-01-14", -0.2, -0.4, -0.6, -0.1],
    ["2026-01-21", -0.1, -0.2, -0.4, 0.1], ["2026-01-28", 0.3, -0.2, -0.5, 0.0],
    ["2026-02-04", 0.6, -0.1, -0.4, 0.0], ["2026-02-11", 0.8, 0.0, -0.2, 0.2],
    ["2026-02-18", 1.1, 0.1, -0.1, 0.3], ["2026-02-25", 1.0, 0.0, -0.1, 0.3],
    ["2026-03-04", 1.0, 0.2, -0.1, 0.1], ["2026-03-11", 1.4, 0.4, -0.1, 0.1],
    ["2026-03-18", 1.4, 0.3, 0.0, 0.3], ["2026-03-25", 1.3, 0.1, 0.1, 0.6],
    ["2026-04-01", 1.3, 0.1, 0.1, 0.6], ["2026-04-08", 1.6, 0.3, 0.2, 0.7],
    ["2026-04-15", 1.7, 0.6, 0.5, 0.9], ["2026-04-22", 1.8, 0.9, 0.8, 1.0],
    ["2026-04-29", 1.3, 1.0, 0.9, 0.9], ["2026-05-06", 1.6, 1.0, 0.8, 0.9],
    ["2026-05-13", 1.9, 1.1, 0.9, 1.0], ["2026-05-20", 2.1, 1.2, 0.9, 1.0],
    ["2026-05-27", 2.2, 1.3, 1.0, 1.1], ["2026-06-03", 2.5, 1.5, 1.3, 1.2],
    ["2026-06-10", 2.6, 1.6, 1.5, 1.3], ["2026-06-17", 3.1, 1.9, 1.7, 1.3],
    ["2026-06-24", 3.1, 2.0, 1.8, 1.2], ["2026-07-01", 3.3, 2.0, 1.7, 1.1],
    ["2026-07-08", 3.3, 2.2, 2.0, 1.2], ["2026-07-15", 3.7, 2.3, 2.1, 1.1],
    ["2026-07-22", 3.6, 2.5, 2.2, 1.0], ["2026-07-29", 3.8, 2.8, 2.4, 1.0],
    ["2026-08-05", 4.0, 3.0, 2.5, 1.0], ["2026-08-12", 4.1, 3.2, 2.6, 1.0],
    ["2026-08-19", 4.0, 3.2, 2.6, 0.8], ["2026-08-26", 4.2, 3.3, 2.6, 0.9],
    ["2026-09-02", 4.4, 3.5, 2.8, 1.0], ["2026-09-09", 4.6, 3.7, 2.8, 0.8],
    ["2026-09-16", 4.6, 3.8, 3.0, 1.0], ["2026-09-23", 4.7, 3.9, 3.1, 1.1],
    ["2026-09-30", 5.3, 4.0, 3.2, 1.2],
  ].map(([date, n12, n3, n34, n4]) => ({ date, n12, n3, n34, n4 }));

  // Niño regions (lon in 0–360°E).
  const regions = [
    { id: "n4", name: "Niño 4", lon: [160, 210], lat: [-5, 5], blurb: "Central Pacific, around the Date Line" },
    { id: "n34", name: "Niño 3.4", lon: [190, 240], lat: [-5, 5], blurb: "The region forecasters use to define El Niño" },
    { id: "n3", name: "Niño 3", lon: [210, 270], lat: [-5, 5], blurb: "Eastern equatorial Pacific" },
    { id: "n12", name: "Niño 1+2", lon: [270, 280], lat: [-10, 0], blurb: "Off the coast of Peru and Ecuador" },
  ];

  // Key moments, pinned to the weekly scrubber.
  const timeline = [
    { date: "2026-01-07", title: "A fading La Niña", text: "The year opens with the equatorial Pacific slightly cooler than normal. Niño 3.4 sits at −0.7°C." },
    { date: "2026-02-18", title: "Almost nobody is calling it", text: "WMO's February update gives El Niño just a 10% chance for March–May. But the water off Peru is already +1°C. NOAA switches its official yardstick to a new relative index (RONI) this month." },
    { date: "2026-04-22", title: "Neutral — and climbing fast", text: "Columbia's climate school reports La Niña is over (20 Apr). Niño 3.4 jumps from +0.2 to +0.8°C in two weeks." },
    { date: "2026-05-20", title: "The odds flip", text: "WMO now sees an 80% chance of El Niño by June–August. NOAA says it is likely before hurricane season peaks." },
    { date: "2026-06-10", title: "El Niño declared", text: "WMO confirms El Niño is developing (2 Jun); NOAA declares El Niño conditions (11 Jun). Global average sea surface temperature reaches a record 21.1°C." },
    { date: "2026-07-15", title: "Already ‘very strong’ territory", text: "Weekly Niño 3.4 passes +2°C in July. Fires burn about 230,000 acres in Indonesia during the month — more than the previous six months combined." },
    { date: "2026-08-19", title: "Hottest ocean ever measured", text: "On 22 Aug Copernicus logs a record 21.11°C average sea surface temperature between 60°N and 60°S. El Salvador, Honduras and Panama declare drought emergencies." },
    { date: "2026-09-09", title: "NOAA: 75% odds of a ‘historic’ event", text: "The 10 Sep discussion gives a >90% chance of a very strong El Niño and 75% odds that it beats every event since 1950. Panama cuts canal transits from 36 to 32 a day." },
    { date: "2026-09-23", title: "The all-time record falls", text: "On 21 Sep the daily Niño 3.4 anomaly reaches 3.11°C, passing the 3.08°C mark set on 18 Nov 2015 — two months earlier in the season than the old record." },
    { date: "2026-09-30", title: "Still rising", text: "Weekly Niño 3.4 reaches +3.2°C. Off Peru, Niño 1+2 is +5.3°C. El Niños usually peak in November–January, so this one has months left to grow." },
  ];

  // Monthly Niño 3.4 anomalies, NOAA CPC OISST (1991–2020 base), file sstoi.indices. 24 months from January of the onset year.
  // The same dataset is used for every event, including 2026, so like is compared with like.
  const events = [
    { id: "e1982", label: "1982–83", year0: 1982, tone: "muted",
      n34: [0.08, -0.2, -0.14, 0.02, 0.49, 0.65, 0.27, 0.86, 1.24, 1.73, 1.68, 2.21, 2.13, 1.81, 1.22, 0.68, 0.68, 0.45, -0.33, -0.44, -0.38, -1.02, -1.29, -1.16],
      roni: [0.11, 0.22, 0.23, 0.46, 0.74, 0.84, 0.89, 1.14, 1.64, 2.03, 2.24, 2.36, 2.4, 2.15, 1.67, 1.3, 0.87, 0.47, 0.03, -0.23, -0.59, -0.9, -1.1, -0.96] },
    { id: "e1997", label: "1997–98", year0: 1997, tone: "aqua",
      n34: [-0.61, -0.39, -0.36, -0.11, 0.4, 0.81, 1.27, 1.68, 1.84, 1.96, 2.11, 2.1, 2.03, 1.74, 1.18, 0.5, 0.45, -0.75, -1.15, -1.2, -1.03, -1.34, -1.31, -1.73],
      roni: [-0.21, -0.03, 0.17, 0.47, 0.83, 1.2, 1.5, 1.84, 2.07, 2.22, 2.25, 2.28, 2.13, 1.82, 1.22, 0.81, 0.07, -0.46, -1.05, -1.14, -1.24, -1.33, -1.51, -1.61] },
    { id: "e2015", label: "2015–16", year0: 2015, tone: "blue",
      n34: [0.51, 0.75, 0.44, 0.82, 0.83, 1.02, 1.26, 1.65, 1.79, 2.21, 2.72, 2.39, 2.47, 2.23, 1.61, 0.98, 0.27, 0.02, -0.42, -0.49, -0.43, -0.7, -0.64, -0.33],
      roni: [0.54, 0.47, 0.59, 0.72, 0.89, 1.02, 1.27, 1.54, 1.8, 2.03, 2.18, 2.25, 2.14, 1.81, 1.3, 0.65, 0.08, -0.43, -0.7, -0.81, -0.88, -0.96, -0.96, -0.89] },
    { id: "e2023", label: "2023–24", year0: 2023, tone: "muted2",
      n34: [-0.69, -0.44, -0.01, 0.19, 0.47, 0.88, 1.07, 1.3, 1.53, 1.59, 1.9, 1.99, 1.78, 1.53, 1.24, 0.81, 0.31, 0.24, 0.21, -0.07, -0.15, -0.28, -0.14, -0.62],
      roni: [-0.86, -0.68, -0.55, -0.31, -0.04, 0.28, 0.54, 0.79, 1.04, 1.3, 1.42, 1.4, 1.13, 0.78, 0.42, 0.04, -0.28, -0.45, -0.49, -0.56, -0.67, -0.76, -0.88, -1.05] },
  ];

  const current = {
    id: "e2026", label: "2026–27", year0: 2026, tone: "hot",
    n34: [-0.54, -0.2, 0.03, 0.47, 0.94, 1.55, 2.03, 2.52, 2.84],
    roni: [-0.91, -0.76, -0.44, -0.04, 0.49, 0.97, 1.36, 1.69], // 3-month seasons DJF…JAS, plotted at the centre month
  };

  // Published peak guidance. The month-by-month path is drawn by this site, not published by anyone:
  // it rises to the stated peak in December and then decays along the average shape of 2015–16.
  const forecast = {
    peakMean: 4.1, peakLow: 3.4, peakHigh: 4.6, // Carbon Brief, 14 systems / 674 runs, 80% of runs between low and high
    shape: [null, 0.96, 1.0, 0.95, 0.82, 0.6, 0.36, 0.16, 0.04, -0.08], // Oct 2026 … Jul 2027, as a share of the peak
    priorRecord: 2.72, // Nov 2015, OISST monthly
    roniRecord: 2.4, // DJF 1982–83
    roniHistoric: 2.5, // NOAA: 75% chance OND 2026 RONI reaches this
  };

  const thresholds = [
    { v: 0.5, label: "El Niño" },
    { v: 1.0, label: "Moderate" },
    { v: 1.5, label: "Strong" },
    { v: 2.0, label: "Very strong" },
  ];

  // Seasons used by the impact map.
  const seasons = [
    { id: "jjas", label: "Jun–Sep 2026", note: "Already happened" },
    { id: "ond", label: "Oct–Dec 2026", note: "Happening now" },
    { id: "djf", label: "Dec–Feb", note: "The peak" },
    { id: "mam", label: "Mar–May 2027", note: "The aftermath" },
  ];

  const types = {
    dry: { label: "Drought, heat & fire", glyph: "◐" },
    wet: { label: "Flood & heavy rain", glyph: "◆" },
    storm: { label: "Storms & ocean", glyph: "✦" },
    trade: { label: "Food & trade", glyph: "■" },
  };

  // status: "observed" = reported in 2026; "expected" = forecast or typical El Niño response.
  const impacts = [
    { id: "indonesia", name: "Indonesia & Malaysia", lon: 108, lat: -1, r: 15, type: "dry", status: "observed", seasons: ["jjas", "ond"],
      headline: "The most fire hotspots since 2015",
      stat: "230,000 acres", statLabel: "burned across Indonesia in July alone",
      text: "That is more than the previous six months combined. August hotspots passed 3,500, emergency-room visits rose tenfold to 5,000 a week, and on 25 Aug Kuala Lumpur was briefly the most polluted city on Earth.",
      source: "Wikipedia event summary; IQAir" },
    { id: "india", name: "India, Pakistan & Sri Lanka", lon: 77, lat: 21, r: 15, type: "dry", status: "observed", seasons: ["jjas", "ond"],
      headline: "The monsoon faltered",
      stat: "≈50% below", statLabel: "India's September monsoon rainfall vs average",
      text: "Rice, maize and cotton yields are under threat. Rains were well below average across Sindh, Balochistan and southern Punjab, and more than 160,000 people in Sri Lanka faced drinking-water shortages. USDA expects India's rice crop to fall 4.6%.",
      source: "FEWS NET, Oct 2026; Wikipedia event summary" },
    { id: "png", name: "Papua New Guinea & Fiji", lon: 147, lat: -7, r: 11, type: "dry", status: "observed", seasons: ["jjas", "ond", "djf"],
      headline: "Wells drying, gardens failing",
      stat: "1.2 million", statLabel: "people estimated to need direct food relief in PNG",
      text: "The government set up a task force and approved a $112 million supplementary budget. The largest hit to food security is expected from November.",
      source: "UN News, 6 Oct 2026" },
    { id: "australia", name: "Australia", lon: 139, lat: -28, r: 16, type: "dry", status: "expected", seasons: ["jjas", "ond", "djf"],
      headline: "A smaller harvest, a longer fire season",
      stat: "−14 to −17%", statLabel: "forecast drop in the wheat crop (USDA, ABARES)",
      text: "Australian wheat has averaged 15% below normal in El Niño years since 1980. Drought and severe bushfires are expected through summer.",
      source: "FEWS NET, Oct 2026" },
    { id: "seasia", name: "Mainland South-East Asia & Philippines", lon: 108, lat: 15, r: 12, type: "dry", status: "expected", seasons: ["ond", "djf", "mam"],
      headline: "Late planting, then the hot season",
      stat: "70%+", statLabel: "of South-East Asia's land was in drought in 2015–16",
      text: "Rice planting is already delayed in the Philippines, Cambodia, Thailand and Vietnam. Heat and water stress usually peak in March–May after an El Niño winter.",
      source: "UNESCAP via UN News; Wikipedia event summary" },
    { id: "typhoons", name: "East Asia typhoon track", lon: 132, lat: 27, r: 10, type: "storm", status: "expected", seasons: ["jjas", "ond"],
      headline: "Typhoons form further east — and travel further",
      stat: "Longer tracks", statLabel: "give storms more time over warm water",
      text: "Storms become less likely to hit the Philippines and more likely to curve toward China, Japan and Korea, with a higher chance of reaching major intensity.",
      source: "Carbon Brief explainer" },
    { id: "reef", name: "Coral reefs", lon: 152, lat: -17, r: 8, type: "storm", status: "expected", seasons: ["djf", "mam"],
      headline: "Marine heat puts reefs on watch",
      stat: "≈16%", statLabel: "of the world's reef systems died in the 1997–98 event",
      text: "Record-warm seas are the main trigger for mass bleaching. Global sea surface temperature already set a new all-time high in August.",
      source: "Wikipedia: Super El Niño events; Copernicus" },
    { id: "kiribati", name: "Central Pacific islands", lon: 187, lat: 0, r: 11, type: "storm", status: "expected", seasons: ["ond", "djf", "mam"],
      headline: "Where the rain went",
      stat: "East", statLabel: "the Pacific's main rain band has shifted toward Kiribati and Tuvalu",
      text: "Warm water drags heavy rainfall and tropical storms toward islands that are usually dry. Hurricanes Lala and Lowell affected Hawaii, and Nolo threatened it.",
      source: "NOAA CPC; Carbon Brief; Wikipedia event summary" },
    { id: "epac", name: "Eastern Pacific hurricanes", lon: 247, lat: 16, r: 11, type: "storm", status: "observed", seasons: ["jjas", "ond"],
      headline: "A hyperactive hurricane basin",
      stat: "+40%", statLabel: "named storms vs average by September",
      text: "Lowell and Polo both reached Category 5. Polo made landfall in western Mexico; Nolo peaked as a high-end Category 4.",
      source: "Wikipedia event summary" },
    { id: "atlantic", name: "Atlantic hurricanes", lon: 305, lat: 24, r: 11, type: "storm", status: "observed", seasons: ["jjas", "ond"],
      headline: "The Atlantic went quiet",
      stat: "Zero", statLabel: "Atlantic hurricanes through late September",
      text: "The latest start to hurricane activity in the satellite era. El Niño strengthens the high-level winds that tear developing storms apart.",
      source: "Wikipedia event summary" },
    { id: "centam", name: "Central America's Dry Corridor", lon: 271, lat: 14.5, r: 8, type: "dry", status: "observed", seasons: ["jjas", "ond", "mam"],
      headline: "Three emergencies declared",
      stat: "85% below", statLabel: "Guatemala's rainfall vs its July average",
      text: "El Salvador, Honduras and Panama declared states of emergency in August. Food needs are expected to peak between March and August 2027.",
      source: "FEWS NET; Wikipedia event summary" },
    { id: "panama", name: "Panama Canal", lon: 280.3, lat: 9, r: 5, type: "trade", status: "observed", seasons: ["jjas", "ond", "djf"],
      headline: "A choke point runs low on water",
      stat: "36 → 32", statLabel: "daily ship transits allowed since 15 September",
      text: "The canal's locks run on fresh water from a rain-fed lake. In mid-August one container ship paid $4 million at auction for a slot — double the previous week's average.",
      source: "Wikipedia event summary" },
    { id: "caribbean", name: "Caribbean", lon: 291, lat: 18.5, r: 7, type: "dry", status: "observed", seasons: ["jjas", "ond"],
      headline: "Islands rationing water",
      stat: "75%", statLabel: "of Puerto Rico in drought by late August (44% extreme)",
      text: "Jamaica, the Dominican Republic, Puerto Rico and the Virgin Islands have all introduced water rationing.",
      source: "Wikipedia event summary" },
    { id: "usa-south", name: "California & the US South", lon: 259, lat: 31, r: 15, type: "wet", status: "expected", seasons: ["ond", "djf", "mam"],
      headline: "A wetter, stormier winter",
      stat: "Nov → Mar", statLabel: "peak window for Southern California flood risk",
      text: "The jet stream shifts south, steering storms into California, the Southwest, the Gulf Coast and Florida. King tides were already unusually severe in August.",
      source: "UC ANR factsheet, Aug 2026" },
    { id: "usa-north", name: "Northern US & western Canada", lon: 250, lat: 52, r: 14, type: "dry", status: "expected", seasons: ["djf"],
      headline: "A milder, drier winter",
      stat: "Warmer", statLabel: "than normal from Alaska to the Great Lakes",
      text: "With the storm track displaced south, the northern tier typically sees less snow and higher temperatures in a strong El Niño winter.",
      source: "Carbon Brief explainer; NOAA CPC" },
    { id: "peru", name: "Peru & Ecuador", lon: 281, lat: -6, r: 8, type: "storm", status: "observed", seasons: ["jjas", "ond", "djf", "mam"],
      headline: "Ground zero",
      stat: "+5.3°C", statLabel: "sea surface anomaly off the coast (Niño 1+2, 30 Sep)",
      text: "Peru had summer-like weather in winter. Warm water has shut down the cold upwelling that feeds the world's largest fishery by volume; NASA's PACE satellite shows a sharp fall in ocean chlorophyll. Coastal flooding typically follows from January.",
      source: "NOAA CPC weekly indices; NASA PACE via Wikipedia" },
    { id: "nsa", name: "Colombia, Venezuela & the Amazon", lon: 295, lat: 2, r: 13, type: "dry", status: "expected", seasons: ["ond", "djf", "mam"],
      headline: "Drought and wildfire risk",
      stat: "Early 2027", statLabel: "food needs peak on Colombia's Caribbean coast",
      text: "Northern South America turns warmer and drier. La Guajira in Colombia is expected to be hit hardest.",
      source: "FEWS NET; Carbon Brief explainer" },
    { id: "ssa", name: "Southern Brazil, Uruguay & Argentina", lon: 303, lat: -31, r: 11, type: "wet", status: "expected", seasons: ["ond", "djf"],
      headline: "Too much rain",
      stat: "Flood risk", statLabel: "through the southern spring and summer",
      text: "South-eastern South America is one of the most reliable wet responses to El Niño. Central Chile has already been hit by severe storms.",
      source: "Carbon Brief explainer; Gulf News" },
    { id: "sahel", name: "The Sahel", lon: 8, lat: 15, r: 12, type: "dry", status: "observed", seasons: ["jjas"],
      headline: "A broken rainy season",
      stat: "40%+ below", statLabel: "average rainfall in parts of Chad, Niger and Mali",
      text: "Late onset and long dry spells. Chad is where El Niño contributes most to hunger; pastoral needs peak March–June 2027.",
      source: "FEWS NET, Oct 2026" },
    { id: "sudan", name: "Sudan, South Sudan & Ethiopia", lon: 33, lat: 11, r: 11, type: "dry", status: "observed", seasons: ["jjas", "mam"],
      headline: "On track for the driest year on record",
      stat: "≤45%", statLabel: "of normal June–September rain in northern Sudan",
      text: "South Sudan and Uganda's Karamoja are on track for their driest year on record. Lower Nile levels are deepening an existing famine in Sudan.",
      source: "FEWS NET, Oct 2026" },
    { id: "eafrica", name: "Somalia, Kenya & southern Ethiopia", lon: 43, lat: 1, r: 9, type: "wet", status: "expected", seasons: ["ond", "mam"],
      headline: "From drought straight to flood",
      stat: "150%+", statLabel: "of average rainfall forecast for October–December",
      text: "A positive Indian Ocean Dipole is piling on. Flood risk is highest along the Juba and Shabelle rivers, in areas still recovering from consecutive droughts.",
      source: "FEWS NET, Oct 2026" },
    { id: "safrica", name: "Southern Africa", lon: 28, lat: -20, r: 14, type: "dry", status: "expected", seasons: ["ond", "djf", "mam"],
      headline: "The rains are forecast to fail",
      stat: "−40%", statLabel: "South Africa's maize crop in the 2015–16 El Niño",
      text: "High confidence of below-normal rain through February in Zimbabwe, Mozambique, Malawi and Zambia. Hunger lags the weather: needs peak November 2027 – March 2028.",
      source: "FEWS NET, Oct 2026" },
  ];

  const ledger = [
    { value: "347 million", label: "children in nearly 100 countries face unusually wet or dry conditions this quarter", source: "UNICEF" },
    { value: "≈50 million", label: "more people could be pushed into acute hunger by 2027", source: "WFP" },
    { value: "$15", label: "saved in recovery for every $1 spent on prevention — yet under 1% of humanitarian funding is anticipatory", source: "UNICEF" },
  ];

  // US export prices, August 2026 vs August 2025 (FEWS NET, Oct 2026).
  const prices = [
    { crop: "Wheat", change: 43 },
    { crop: "Rice", change: 26 },
    { crop: "Maize", change: 21 },
  ];

  const sources = [
    { name: "NOAA Climate Prediction Center — ENSO Diagnostic Discussion (10 Sep 2026)", url: "https://www.cpc.ncep.noaa.gov/products/analysis_monitoring/enso_advisory/ensodisc.shtml" },
    { name: "NOAA CPC — weekly OISST Niño indices", url: "https://www.cpc.ncep.noaa.gov/data/indices/wksst9120.for" },
    { name: "NOAA CPC — monthly OISST Niño indices", url: "https://www.cpc.ncep.noaa.gov/data/indices/sstoi.indices" },
    { name: "NOAA CPC — Relative Oceanic Niño Index (RONI)", url: "https://www.cpc.ncep.noaa.gov/data/indices/RONI.ascii.txt" },
    { name: "Columbia CCSR/IRI — ENSO forecast (21 Sep 2026)", url: "https://iri.columbia.edu/our-expertise/climate/forecasts/enso/current/" },
    { name: "WMO — El Niño/La Niña Update (August 2026)", url: "https://wmo.int/resources/publication-series/el-ninola-nina-updates/august-2026" },
    { name: "Carbon Brief — ‘Super El Niño’ breaks ‘remarkable’ all-time record (21 Sep 2026)", url: "https://www.carbonbrief.org/analysis-super-el-nino-reaches-remarkable-all-time-record" },
    { name: "Carbon Brief — How the ‘super El Niño’ will reshape the world's weather", url: "https://interactive.carbonbrief.org/el-nino-explainer/index.html" },
    { name: "Carbon Brief — State of the climate", url: "https://www.carbonbrief.org/state-of-the-climate-rapidly-developing-el-nino-raises-chance-of-record-warm-2026" },
    { name: "FEWS NET — 2026–2027 El Niño food security impacts (Oct 2026)", url: "https://fews.net/global/special-report/october-2026" },
    { name: "UN News — From drought to deluge: ‘Super’ El Niño's expanding reach (6 Oct 2026)", url: "https://news.un.org/en/story/2026/10/1168537" },
    { name: "Wikipedia — 2026–2027 El Niño event", url: "https://en.wikipedia.org/wiki/2026%E2%80%932027_El_Ni%C3%B1o_event" },
    { name: "UC ANR — El Niño 2026–27 factsheet", url: "https://ucanr.edu/sites/default/files/2026-08/el-nino-2026-27-factsheet_0.pdf" },
  ];

  return { AS_OF, weekly, regions, timeline, events, current, forecast, thresholds, seasons, types, impacts, ledger, prices, sources };
})();
