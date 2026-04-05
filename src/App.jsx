import React, { useEffect, useMemo, useState } from "react";
import { appData } from "./data";

const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const storageKey = "sns-design-build-estimator-v6";

const qtyLabels = {
  "Per sqft": "SQFT",
  Sqft: "SQFT",
  PLF: "LFT",
  "linear ft": "LFT",
  each: "Each",
  Each: "Each",
  "Per Job": "Qty",
  Minimum: "Qty",
  "Per square": "Squares",
  "Per step": "Steps",
  "Per Side": "Sides"
};

const financingPlans = [
  { id: "promo-6", label: "6 mo no pay / no interest", apr: "29.49% APR", term: "10 year term", merchantFee: 4.75, paymentFactor: 2.72, details: "Loan paid in full within 6 month promo period." },
  { id: "promo-12", label: "12 mo no pay / no interest", apr: "29.49% APR", term: "10 year term", merchantFee: 8, paymentFactor: 2.84, details: "Loan paid in full within 12 month promo period." },
  { id: "899-5", label: "8.99% for 5 years", apr: "8.99% APR", term: "5 year term", merchantFee: 5.75, paymentFactor: 2.08 },
  { id: "699-5", label: "6.99% for 5 years", apr: "6.99% APR", term: "5 year term", merchantFee: 9.5, paymentFactor: 1.98 },
  { id: "999-7", label: "9.99% for 7 years", apr: "9.99% APR", term: "7 year term", merchantFee: 4.5, paymentFactor: 1.66 },
  { id: "799-7", label: "7.99% for 7 years", apr: "7.99% APR", term: "7 year term", merchantFee: 9.5, paymentFactor: 1.56 },
  { id: "999-10", label: "9.99% for 10 years", apr: "9.99% APR", term: "10 year term", merchantFee: 5, paymentFactor: 1.32 },
  { id: "899-10", label: "8.99% for 10 years", apr: "8.99% APR", term: "10 year term", merchantFee: 8.5, paymentFactor: 1.27 },
  { id: "999-12", label: "9.99% for 12 years", apr: "9.99% APR", term: "12 year term", merchantFee: 5.25, paymentFactor: 1.19 },
  { id: "899-12", label: "8.99% for 12 years", apr: "8.99% APR", term: "12 year term", merchantFee: 9, paymentFactor: 1.14 },
  { id: "999-15", label: "9.99% for 15 years", apr: "9.99% APR", term: "15 year term", merchantFee: 5.75, paymentFactor: 1.07 },
  { id: "899-15", label: "8.99% for 15 years", apr: "8.99% APR", term: "15 year term", merchantFee: 10, paymentFactor: 1.01 }
];

const engineeringCities = ["brentwood", "franklin", "nolensville", "fairview", "spring hill", "thompson's station", "thompsons station"];

const cityRules = {
  clarksville: {
    fee: 1500,
    message: "Clarksville requires a $1,500 survey fee. Lead time for survey if permit is needed is about 4 weeks."
  },
  ...Object.fromEntries(
    engineeringCities.map((city) => [
      city,
      {
        fee: 0,
        message: `${city.replace(/(^|\s)\S/g, (c) => c.toUpperCase())} requires engineering. Aluminum: add $800. Wood: add $3,000.`
      }
    ])
  )
};

const defaultLineState = Object.fromEntries(appData.categories.flatMap((cat) => cat.items.map((item) => [item.id, ""])));
const defaultExpanded = Object.fromEntries(appData.categories.map((cat) => [cat.name, false]));
const widthOptions = [0, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38, 40];
const projectionOptions = [0, ...Array.from({ length: 21 }, (_, i) => i + 10)];

const defaultRenaissance = {
  section: "Moderno",
  mount: "Attached",
  profile: "Straight",
  tier: "r40",
  width: 0,
  projection: 0,
  panelType: "3standard",
  postCountOverride: "",
  beamLength: 0,
  fanBeams: 0,
  postUpgrade: "none",
  beamUpgrade: "none",
  roofColor: false,
  upgradeFoam: false,
  upgrade032: false,
  deductPosts: 0
};

const renaissanceSectionOptions = {
  Moderno: { mounts: ["Attached", "Freestanding"], profiles: ["Straight"] },
  Contempo: { mounts: ["Attached", "Freestanding"], profiles: ["Straight", "Curved"] },
  Classico: { mounts: ["Attached", "Freestanding"], profiles: ["Straight", "Curved"] },
  Fresco: { mounts: ["Attached", "Freestanding"], profiles: ["Straight", "Curved"] },
  Aria: { mounts: ["Attached", "Freestanding"], profiles: ["Straight", "Curved"] }
};

const defaultSettings = {
  taxRate: 0.0925,
  taxablePortion: 0.4,
  permittingFee: 500,
  city: "",
  depositAmount: "",
  darkMode: false
};

function roofSqft(mount, width, projection) {
  if (!width || !projection) return 0;
  return mount === "Attached" ? (width + 2) * (projection + 1) : (width + 2) * (projection + 2);
}

function getRenaissanceKey(section, mount, profile) {
  if (section === "Moderno") return `${section} ${mount}`;
  return `${section} ${mount} ${profile}`;
}

function getRequiredPostCount(width) {
  if (!width) return 0;
  if (width <= 12) return 2;
  if (width <= 24) return 3;
  if (width <= 36) return 4;
  return 5;
}

function getPanelTypeMeta(panelType, upgradeFoam = false, upgrade032 = false) {
  const is6 = panelType === "6upgraded";
  const includesHeavyFoam = is6 || !!upgradeFoam;
  const includes032 = is6 || !!upgrade032;

  if (is6) {
    return {
      label: '6" upgraded panel',
      multiplier: 2,
      includesHeavyFoam: true,
      includes032: true,
      maxProjection: 24
    };
  }

  if (includesHeavyFoam && includes032) {
    return {
      label: '3" panel with upgraded foam + .032 skin',
      multiplier: 1,
      includesHeavyFoam: true,
      includes032: true,
      maxProjection: 19
    };
  }

  return {
    label: '3" standard panel',
    multiplier: 1,
    includesHeavyFoam,
    includes032,
    maxProjection: 13
  };
}

function formatQtyLabel(unit) {
  return qtyLabels[unit] || unit;
}

function safeNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function getBaseProjectionPrice(table, width, projection) {
  if (!width || !projection) return 0;
  const exact = table?.[String(projection)]?.[String(width)];
  if (exact) return exact;
  if (projection > 16) {
    const p16 = safeNumber(table?.["16"]?.[String(width)]);
    const p15 = safeNumber(table?.["15"]?.[String(width)]);
    if (!p16 || !p15) return 0;
    const step = p16 - p15;
    return Math.round(p16 + step * (projection - 16));
  }
  return 0;
}

function getFanBeamUnit(addOns, projection) {
  const mapped = safeNumber(addOns.fanBeamByProjection?.[String(projection)]);
  if (mapped) return mapped;
  if (projection < 11) return 0;
  const p18 = safeNumber(addOns.fanBeamByProjection?.["18"]);
  const p17 = safeNumber(addOns.fanBeamByProjection?.["17"]);
  const step = p18 && p17 ? p18 - p17 : 25;
  return Math.round(p18 + step * (projection - 18));
}

function App() {
  const [selectedTier, setSelectedTier] = useState("tier5");
  const [lineQtys, setLineQtys] = useState(defaultLineState);
  const [settings, setSettings] = useState(defaultSettings);
  const [selectedPlanId, setSelectedPlanId] = useState(financingPlans[0].id);
  const [renaissance, setRenaissance] = useState(defaultRenaissance);
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [toolbarOpen, setToolbarOpen] = useState(true);
  const [renaissanceOpen, setRenaissanceOpen] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [financingOpen, setFinancingOpen] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (!saved) return;

    try {
      const parsed = JSON.parse(saved);

      if (parsed.selectedTier && appData.pricingTiers[parsed.selectedTier]) setSelectedTier(parsed.selectedTier);
      if (parsed.lineQtys && typeof parsed.lineQtys === "object") setLineQtys({ ...defaultLineState, ...parsed.lineQtys });
      if (parsed.settings && typeof parsed.settings === "object") setSettings({ ...defaultSettings, ...parsed.settings });
      if (parsed.selectedPlanId && financingPlans.some((plan) => plan.id === parsed.selectedPlanId)) setSelectedPlanId(parsed.selectedPlanId);
      if (parsed.renaissance && typeof parsed.renaissance === "object") setRenaissance({ ...defaultRenaissance, ...parsed.renaissance });
      if (parsed.expanded && typeof parsed.expanded === "object") setExpanded({ ...defaultExpanded, ...parsed.expanded });
      if (typeof parsed.toolbarOpen === "boolean") setToolbarOpen(parsed.toolbarOpen);
      if (typeof parsed.renaissanceOpen === "boolean") setRenaissanceOpen(parsed.renaissanceOpen);
      if (typeof parsed.financingOpen === "boolean") setFinancingOpen(parsed.financingOpen);
    } catch (err) {
      console.error("Failed to load saved estimator state:", err);
      localStorage.removeItem(storageKey);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(
      storageKey,
      JSON.stringify({ selectedTier, lineQtys, settings, selectedPlanId, renaissance, expanded, toolbarOpen, renaissanceOpen, financingOpen })
    );
  }, [selectedTier, lineQtys, settings, selectedPlanId, renaissance, expanded, toolbarOpen, renaissanceOpen, financingOpen]);

  useEffect(() => {
    document.documentElement.dataset.theme = settings.darkMode ? "dark" : "light";
  }, [settings.darkMode]);

  useEffect(() => {
    setRenaissance((current) => ({ ...current, beamLength: current.width || 0 }));
  }, [renaissance.width]);

  useEffect(() => {
    const options = renaissanceSectionOptions[renaissance.section] || renaissanceSectionOptions.Moderno;
    if (!options.mounts.includes(renaissance.mount) || !options.profiles.includes(renaissance.profile)) {
      setRenaissance((current) => ({
        ...current,
        mount: options.mounts.includes(current.mount) ? current.mount : options.mounts[0],
        profile: options.profiles.includes(current.profile) ? current.profile : options.profiles[0]
      }));
    }
  }, [renaissance.section, renaissance.mount, renaissance.profile]);

  const activeTier = appData.pricingTiers[selectedTier] || appData.pricingTiers.tier5;
  const selectedPlan = financingPlans.find((plan) => plan.id === selectedPlanId) || financingPlans[0];
  const currentRenaissanceOptions = renaissanceSectionOptions[renaissance.section] || renaissanceSectionOptions.Moderno;

  const lineItems = useMemo(
    () =>
      appData.categories.flatMap((cat) =>
        cat.items.map((item) => {
          const qty = safeNumber(lineQtys[item.id] || 0);
          const extended = qty * item.basePrice * activeTier.multiplier;
          return { ...item, category: cat.name, qty, extended, displayPrice: item.basePrice * activeTier.multiplier };
        })
      ),
    [lineQtys, activeTier.multiplier]
  );

  const activeItems = lineItems.filter((item) => item.qty > 0);
  const activeCategoryNames = new Set(activeItems.map((item) => item.category));

  const renaissanceCalc = useMemo(() => {
    const key = getRenaissanceKey(renaissance.section, renaissance.mount, renaissance.profile);
    const table = appData.renaissance.styles[key] || {};
    const width = safeNumber(renaissance.width);
    const projection = safeNumber(renaissance.projection);
    const base = getBaseProjectionPrice(table, width, projection);
    const tierMultiplier = appData.renaissanceTiers[renaissance.tier]?.multiplier || 1;
    const panelMeta = getPanelTypeMeta(renaissance.panelType, renaissance.upgradeFoam, renaissance.upgrade032);
    const postCountRequired = getRequiredPostCount(width);
    const postCount = safeNumber(renaissance.postCountOverride || postCountRequired);
    const beamLength = width || 0;
    const rsqft = roofSqft(renaissance.mount, width, projection);
    const addOns = appData.renaissance.addOns;
    const fanBeamUnit = getFanBeamUnit(addOns, projection);

    const baseTiered = base * tierMultiplier * panelMeta.multiplier;
    const adders = [];

    if (renaissance.roofColor && rsqft) adders.push({ label: "Roof color", amount: rsqft * addOns.customRoofColorPerSqft * tierMultiplier });
    if (panelMeta.includesHeavyFoam && rsqft) adders.push({ label: "Heavy foam upgrade", amount: rsqft * addOns.heavyFoamPerSqft * tierMultiplier });
    if (panelMeta.includes032 && rsqft) adders.push({ label: ".032 skin upgrade", amount: rsqft * addOns.alum032PerSqft * tierMultiplier });

    const postUpgradeAmount = postCount * safeNumber(addOns.postUpgradeEach?.[renaissance.postUpgrade]) * tierMultiplier;
    if (postUpgradeAmount) adders.push({ label: `Post upgrade (${renaissance.postUpgrade})`, amount: postUpgradeAmount });

    const beamUpgradeAmount = beamLength * safeNumber(addOns.beamUpgradePerFoot?.[renaissance.beamUpgrade]) * tierMultiplier;
    if (beamUpgradeAmount) adders.push({ label: `Beam upgrade (${renaissance.beamUpgrade})`, amount: beamUpgradeAmount });

    const fanBeamAmount = safeNumber(renaissance.fanBeams) * fanBeamUnit * tierMultiplier;
    if (fanBeamAmount) adders.push({ label: `Fan beam(s) @ ${projection}'`, amount: fanBeamAmount });

    const deductPostAmount = safeNumber(renaissance.deductPosts) * safeNumber(addOns.deductPost) * tierMultiplier;
    if (deductPostAmount) adders.push({ label: "Deduct post(s)", amount: deductPostAmount });

    const totalAdders = adders.reduce((sum, item) => sum + item.amount, 0);

    return {
      key,
      width,
      projection,
      base,
      rsqft,
      beamLength,
      panelMeta,
      tierMultiplier,
      fanBeamUnit,
      postCountRequired,
      postCount,
      adders,
      baseTiered,
      total: baseTiered + totalAdders,
      missingBasePrice: !!(width && projection && !base),
      usesProjectedMath: projection > 16 && !!base
    };
  }, [renaissance]);

  const standardSubtotal = useMemo(() => lineItems.reduce((sum, item) => sum + item.extended, 0), [lineItems]);
  const subtotal = standardSubtotal + renaissanceCalc.total;

  const normalizedCity = (settings.city || "").trim().toLowerCase();
  const matchedCityRule = cityRules[normalizedCity] || null;
  const locationFee = matchedCityRule?.fee || 0;
  const taxableBase = subtotal * defaultSettings.taxablePortion;
  const salesTax = taxableBase * defaultSettings.taxRate;
  const permittingFee = defaultSettings.permittingFee + locationFee;
  const totalNoFinancing = subtotal + salesTax + permittingFee;
  const depositAmount = Math.min(Math.max(safeNumber(settings.depositAmount), 0), totalNoFinancing);
  const financedBase = Math.max(totalNoFinancing - depositAmount, 0);
  const financedSaleAmount = financedBase * (1 + selectedPlan.merchantFee / 100);
  const monthlyPayment = financedSaleAmount * (selectedPlan.paymentFactor / 100);

  const flags = useMemo(() => {
    const issues = [];
    for (const rule of appData.rules) {
      const qty = safeNumber(lineQtys[rule.itemId] || 0);
      if (!qty) continue;
      if (rule.type === "minExclusive" && qty <= rule.threshold) issues.push(rule.message);
      if (rule.type === "maxInclusive" && qty > rule.threshold) issues.push(rule.message);
      if (rule.type === "info") issues.push(rule.message);
    }

    if (matchedCityRule?.message) issues.push(matchedCityRule.message);

    const hasDeck = activeItems.some((item) => item.category === "Decking");
    const hasSunroom = activeItems.some((item) => item.category === "Sunrooms");
    const hasMotorized = activeItems.some((item) => item.category === "Motorized Units");
    const hasConcrete = activeItems.some((item) => item.id.startsWith("outdoor-living-concrete") || item.id.includes("stamp-concrete") || item.id.includes("raised-concrete") || item.id.includes("pump-concrete") || item.id.includes("colors-add") || item.id.includes("border-add"));
    const hasScreenRoom = activeItems.some((item) => item.category === "Screen Enclosure");

    if (hasDeck) {
      issues.push("Deck quote check: make sure Footers, Railing, Stairs, and possibly Tear Out / Demo are included if needed.");
    }
    if (hasSunroom) {
      issues.push("Sunroom check: add Transoms if the wall height is over 9'.");
    }
    if (hasMotorized) {
      if (safeNumber(lineQtys["motorized-units-motorized-unit-16ft"]) > 16) {
        issues.push("Motorized Unit <16ft line is over 16'. Move the size correctly and add the >16ft but <22ft flat fee.");
      }
      if (safeNumber(lineQtys["motorized-units-motorized-unit-16ft-but-22ft-add"]) === 0 && safeNumber(lineQtys["motorized-units-motorized-unit-16ft"]) > 16) {
        issues.push("Motorized units over 16' need the >16ft but <22ft add-on fee.");
      }
      if (safeNumber(lineQtys["motorized-units-motorized-unit-10ft-width-height"]) > 0) {
        issues.push("Motorized <10ft line: confirm the opening is truly under 10'.");
      }
    }
    if (hasConcrete) {
      issues.push("Concrete check: confirm if Pump Concrete is needed for access, and add Stamp, Color, and Border if required.");
      issues.push("Concrete check: if slab height is over 4 inches, add Raised Concrete Sides.");
    }
    if (hasScreenRoom) {
      issues.push("Screen room check: verify capitals, columns, post brick cuts, and any replaced or added posts are included.");
    }

    if (renaissanceCalc.width === 0 && renaissanceCalc.projection === 0) {
      // no-op
    } else {
      if (renaissanceCalc.missingBasePrice) issues.push("That Renaissance width/projection combination is not available from the current table logic.");
      if (renaissanceCalc.usesProjectedMath) issues.push("Renaissance base price for projections over 16' is extrapolated from the sheet's current projection pattern.");
      if (renaissanceCalc.projection > renaissanceCalc.panelMeta.maxProjection) issues.push(`${renaissanceCalc.panelMeta.label} cannot be used over ${renaissanceCalc.panelMeta.maxProjection}' projection.`);
      if (renaissanceCalc.postCount < renaissanceCalc.postCountRequired) issues.push(`This cover width requires at least ${renaissanceCalc.postCountRequired} posts based on the color-coded Renaissance sheet.`);
      if (safeNumber(renaissance.fanBeams) > 0 && renaissanceCalc.projection < 11) issues.push("Fan beam pricing starts at 11' projection.");
    }

    return Array.from(new Set(issues));
  }, [activeItems, lineQtys, matchedCityRule, renaissance.fanBeams, renaissanceCalc]);

  const lineCount = activeItems.length + (renaissanceCalc.total > 0 ? 1 : 0);

  function updateQty(id, value) {
    setLineQtys((current) => ({ ...current, [id]: value }));
  }

  function expandAll(value) {
    setExpanded(Object.fromEntries(appData.categories.map((cat) => [cat.name, value])));
  }

  function clearAll() {
    setLineQtys(defaultLineState);
    setRenaissance(defaultRenaissance);
    setSettings((current) => ({ ...current, depositAmount: "" }));
  }

  async function copySummary() {
    const text = [
      "S&S Design Build Quick Quote",
      `Sales Sheet Tier: ${activeTier.label}`,
      ...activeItems.map((item) => `${item.category} | ${item.name} | Qty ${item.qty} | ${currency.format(item.extended)}`),
      renaissanceCalc.total > 0 ? `Renaissance | ${renaissanceCalc.key} | ${renaissanceCalc.width}x${renaissanceCalc.projection} | ${currency.format(renaissanceCalc.total)}` : null,
      `Subtotal: ${currency.format(subtotal)}`,
      `Sales tax: ${currency.format(salesTax)}`,
      `Permitting + location fees: ${currency.format(permittingFee)}`,
      `Deposit: ${currency.format(depositAmount)}`,
      `Total no financing: ${currency.format(totalNoFinancing)}`,
      `Financing plan: ${selectedPlan.label}`,
      `Monthly payment: ${currency.format(monthlyPayment)}`
    ].filter(Boolean).join("\n");

    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error("Copy failed", err);
    }
  }

  return (
    <div className="page-shell">
      <header className="topbar card">
        <div className="brand-lockup">
          <img className="brand-logo" src="/logo-mark.png" alt="S&S Design Build" />
          <div>
            <h1>S&amp;S Design Build</h1>
          </div>
        </div>
        <div className="topbar-actions">
          <button className="ghost-btn" onClick={clearAll}>Clear inputs</button>
          <button className="ghost-btn" onClick={() => setSettingsOpen(true)}>Settings</button>
        </div>
      </header>

      <section className="toolbar card">
        <div className="section-head compact-head">
          <div>
            <h2>Sales sheet tier</h2>
            <p className="small-note">Choose the sheet first, then collapse it if you want more room.</p>
          </div>
          <button className="ghost-btn" onClick={() => setToolbarOpen((value) => !value)}>{toolbarOpen ? "Hide" : "Show"}</button>
        </div>
        {toolbarOpen && (
          <div className="toolbar-stack">
            <div className="pill-row">
              {Object.entries(appData.pricingTiers).map(([key, tier]) => (
                <button key={key} className={selectedTier === key ? "pill active" : "pill"} onClick={() => setSelectedTier(key)}>
                  {tier.label}
                </button>
              ))}
            </div>
            <div className="toolbar-meta">
              <div className="stat-box">
                <span>Pricing tier</span>
                <strong>{activeTier.label}</strong>
              </div>
              <label>
                City / county
                <input
                  type="text"
                  placeholder="Clarksville, Brentwood, Franklin..."
                  value={settings.city}
                  onChange={(e) => setSettings((current) => ({ ...current, city: e.target.value }))}
                />
              </label>
              <div className="toolbar-buttons">
                <button className="ghost-btn" onClick={() => expandAll(true)}>Expand all</button>
                <button className="ghost-btn" onClick={() => expandAll(false)}>Collapse all</button>
              </div>
            </div>
          </div>
        )}
      </section>

      {flags.length > 0 && (
        <section className="flag-list card alert">
          <h2>Red flags / restrictions</h2>
          {flags.map((flag) => (
            <div className="flag" key={flag}>{flag}</div>
          ))}
        </section>
      )}

      <div className="main-grid">
        <section className="card">
          <div className="section-head">
            <div>
              <h2>Standard pricing sheet</h2>
              <p className="small-note">Tap a category, enter only the quantity, and the total updates instantly.</p>
            </div>
            <div className="toolbar-buttons inline-actions">
              <button className="ghost-btn" onClick={clearAll}>Clear inputs</button>
              <button className="ghost-btn" onClick={() => expandAll(true)}>Expand all</button>
              <button className="ghost-btn" onClick={() => expandAll(false)}>Collapse all</button>
            </div>
          </div>

          {appData.categories.map((cat) => (
            <div className="category" key={cat.name}>
              <button className={activeCategoryNames.has(cat.name) ? "category-toggle active-cat" : "category-toggle"} onClick={() => setExpanded((current) => ({ ...current, [cat.name]: !current[cat.name] }))}>
                <strong>{cat.name}</strong>
                <span>{expanded[cat.name] ? "Hide" : "Show"}</span>
              </button>
              {expanded[cat.name] && (
                <div className="item-list">
                  {cat.items.map((item) => {
                    const qty = lineQtys[item.id] || "";
                    const total = safeNumber(qty) * item.basePrice * activeTier.multiplier;
                    const active = safeNumber(qty) > 0;
                    return (
                      <div className={active ? "line-card active-line" : "line-card"} key={item.id}>
                        <div className="line-copy">
                          <strong>{item.name}</strong>
                          <div className="line-meta">
                            <span>{item.unit}</span>
                            <span>{currency.format(item.basePrice * activeTier.multiplier)}</span>
                            <span>{qty ? currency.format(total) : currency.format(0)}</span>
                          </div>
                        </div>
                        <label className="qty-box">
                          <span>{formatQtyLabel(item.unit)}</span>
                          <input className="qty-input" type="number" min="0" step="any" value={qty} onChange={(e) => updateQty(item.id, e.target.value)} />
                        </label>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}

          <div className="bottom-actions">
            <button className="ghost-btn" onClick={clearAll}>Clear inputs</button>
            <button className="ghost-btn" onClick={() => expandAll(true)}>Expand all</button>
            <button className="ghost-btn" onClick={() => expandAll(false)}>Collapse all</button>
          </div>
        </section>

        <aside className="summary-column">
          <section className="card renaissance-card">
            <div className="section-head compact-head">
              <div><h2>Renaissance</h2></div>
              <button className="ghost-btn" onClick={() => setRenaissanceOpen((value) => !value)}>{renaissanceOpen ? "Hide" : "Show"}</button>
            </div>

            {renaissanceOpen && (
              <>
                <div className="pill-row tight">
                  {Object.entries(appData.renaissanceTiers).map(([key, tier]) => (
                    <button key={key} className={renaissance.tier === key ? "pill active" : "pill"} onClick={() => setRenaissance((current) => ({ ...current, tier: key }))}>
                      {tier.label}
                    </button>
                  ))}
                </div>

                <div className="renaissance-grid">
                  <label>
                    Style
                    <select value={renaissance.section} onChange={(e) => setRenaissance((current) => ({ ...current, section: e.target.value }))}>
                      {Object.keys(renaissanceSectionOptions).map((section) => <option key={section} value={section}>{section}</option>)}
                    </select>
                  </label>
                  <label>
                    Mount
                    <select value={renaissance.mount} onChange={(e) => setRenaissance((current) => ({ ...current, mount: e.target.value }))}>
                      {currentRenaissanceOptions.mounts.map((option) => <option key={option} value={option}>{option}</option>)}
                    </select>
                  </label>
                  {renaissance.section !== "Moderno" && (
                    <label>
                      End cut
                      <select value={renaissance.profile} onChange={(e) => setRenaissance((current) => ({ ...current, profile: e.target.value }))}>
                        {currentRenaissanceOptions.profiles.map((option) => <option key={option} value={option}>{option}</option>)}
                      </select>
                    </label>
                  )}
                  <label>
                    Width
                    <select value={renaissance.width} onChange={(e) => setRenaissance((current) => ({ ...current, width: safeNumber(e.target.value) }))}>
                      {widthOptions.map((value) => <option key={value} value={value}>{value}</option>)}
                    </select>
                  </label>
                  <label>
                    Projection
                    <select value={renaissance.projection} onChange={(e) => setRenaissance((current) => ({ ...current, projection: safeNumber(e.target.value) }))}>
                      {projectionOptions.map((value) => <option key={value} value={value}>{value}</option>)}
                    </select>
                  </label>
                  <label>
                    Panel type
                    <select value={renaissance.panelType} onChange={(e) => setRenaissance((current) => ({ ...current, panelType: e.target.value }))}>
                      <option value="3standard">3&quot; panel</option>
                      <option value="6upgraded">6&quot; upgraded panel</option>
                    </select>
                  </label>
                  <label className="check solo-check">
                    <input
                      type="checkbox"
                      checked={renaissance.panelType === "6upgraded" ? true : renaissance.upgradeFoam}
                      disabled={renaissance.panelType === "6upgraded"}
                      onChange={(e) => setRenaissance((current) => ({ ...current, upgradeFoam: e.target.checked }))}
                    />
                    <span>Add upgraded foam</span>
                  </label>
                  <label className="check solo-check">
                    <input
                      type="checkbox"
                      checked={renaissance.panelType === "6upgraded" ? true : renaissance.upgrade032}
                      disabled={renaissance.panelType === "6upgraded"}
                      onChange={(e) => setRenaissance((current) => ({ ...current, upgrade032: e.target.checked }))}
                    />
                    <span>Add .032 skin</span>
                  </label>
                  <label>
                    Required / quoted posts
                    <input type="number" min="0" value={renaissance.postCountOverride || renaissanceCalc.postCountRequired || 0} onChange={(e) => setRenaissance((current) => ({ ...current, postCountOverride: e.target.value }))} />
                  </label>
                  <label>
                    Beam length (auto)
                    <input type="number" min="0" value={renaissanceCalc.beamLength} readOnly />
                  </label>
                  <label>
                    Fan beams
                    <input type="number" min="0" value={renaissance.fanBeams} onChange={(e) => setRenaissance((current) => ({ ...current, fanBeams: e.target.value }))} />
                  </label>
                  <label>
                    Fan beam unit
                    <input type="text" value={renaissanceCalc.fanBeamUnit ? currency.format(renaissanceCalc.fanBeamUnit * renaissanceCalc.tierMultiplier) : "$0.00"} readOnly />
                  </label>
                  <label>
                    Post upgrade
                    <select value={renaissance.postUpgrade} onChange={(e) => setRenaissance((current) => ({ ...current, postUpgrade: e.target.value }))}>
                      <option value="none">Standard</option>
                      <option value="hd">HD</option>
                      <option value="wide">Wide</option>
                      <option value="wideInsert">Wide + Insert</option>
                    </select>
                  </label>
                  <label>
                    Beam upgrade
                    <select value={renaissance.beamUpgrade} onChange={(e) => setRenaissance((current) => ({ ...current, beamUpgrade: e.target.value }))}>
                      <option value="none">Standard</option>
                      <option value="hd">HD</option>
                      <option value="wide">Wide</option>
                      <option value="wideInsert">Wide + Insert</option>
                    </select>
                  </label>
                  <label>
                    Deduct posts
                    <input type="number" min="0" value={renaissance.deductPosts} onChange={(e) => setRenaissance((current) => ({ ...current, deductPosts: e.target.value }))} />
                  </label>
                  <label className="check solo-check">
                    <input type="checkbox" checked={renaissance.roofColor} onChange={(e) => setRenaissance((current) => ({ ...current, roofColor: e.target.checked }))} />
                    <span>Add roof color</span>
                  </label>
                </div>

                <div className="renaissance-summary">
                  <div className="summary-row"><span>Style</span><strong>{renaissanceCalc.key}</strong></div>
                  <div className="summary-row"><span>Required posts by sheet</span><strong>{renaissanceCalc.postCountRequired || 0}</strong></div>
                  <div className="summary-row"><span>Roof sqft</span><strong>{renaissanceCalc.rsqft || 0}</strong></div>
                  <div className="summary-row"><span>Base price</span><strong>{currency.format(renaissanceCalc.baseTiered)}</strong></div>
                  {renaissanceCalc.adders.map((adder) => <div className="summary-row" key={adder.label}><span>{adder.label}</span><strong>{currency.format(adder.amount)}</strong></div>)}
                  <div className="summary-row"><span>Panel setup</span><strong>{renaissanceCalc.panelMeta.label}</strong></div>
                  <div className="summary-row total"><span>Renaissance total</span><strong>{currency.format(renaissanceCalc.total)}</strong></div>
                </div>
              </>
            )}
          </section>

          <section className="card sticky-card">
            <div className="section-head compact-head">
              <div>
                <h2>Quote summary</h2>
                <p className="small-note">{lineCount} active line item{lineCount === 1 ? "" : "s"}</p>
              </div>
              <button className="ghost-btn" onClick={copySummary}>Copy</button>
            </div>
            <div className="summary-row"><span>Subtotal</span><strong>{currency.format(subtotal)}</strong></div>
            <div className="summary-row"><span>Sales tax on 40%</span><strong>{currency.format(salesTax)}</strong></div>
            <div className="summary-row"><span>Permitting + location fees</span><strong>{currency.format(permittingFee)}</strong></div>
            <div className="summary-row"><span>Optional deposit</span><strong>{currency.format(depositAmount)}</strong></div>
            <div className="summary-row total"><span>Total no financing</span><strong>{currency.format(totalNoFinancing)}</strong></div>

            <div className="summary-section">
              <div className="section-head compact-head no-margin-bottom">
                <h3>Financing plan</h3>
                <button className="ghost-btn" onClick={() => setFinancingOpen((value) => !value)}>{financingOpen ? "Hide options" : "Change plan"}</button>
              </div>
              <label>
                Deposit / cash down
                <input type="number" min="0" step="0.01" value={settings.depositAmount} onChange={(e) => setSettings((current) => ({ ...current, depositAmount: e.target.value }))} />
              </label>
              <div className="selected-plan-card">
                <strong>{selectedPlan.label}</strong>
                <span>{selectedPlan.term} · {selectedPlan.apr}</span>
                <span>Merchant fee {selectedPlan.merchantFee}% · Payment factor {selectedPlan.paymentFactor}%</span>
              </div>
              {financingOpen && (
                <div className="plan-list compact-plan-list">
                  {financingPlans.map((plan) => (
                    <button
                      key={plan.id}
                      className={selectedPlanId === plan.id ? "plan-card active" : "plan-card"}
                      onClick={() => {
                        setSelectedPlanId(plan.id);
                        setFinancingOpen(false);
                      }}
                    >
                      <strong>{plan.label}</strong>
                      <span>{plan.term}</span>
                      <span>{plan.apr}</span>
                      <span>Merchant fee {plan.merchantFee}%</span>
                      <span>Payment factor {plan.paymentFactor}%</span>
                    </button>
                  ))}
                </div>
              )}
              <div className="summary-row"><span>Amount being financed</span><strong>{currency.format(financedBase)}</strong></div>
              <div className="summary-row"><span>Financed sale amount</span><strong>{currency.format(financedSaleAmount)}</strong></div>
              <div className="summary-row accent"><span>{selectedPlan.label}</span><strong>{currency.format(monthlyPayment)}/mo</strong></div>
              {selectedPlan.details ? <p className="small-note">{selectedPlan.details}</p> : null}
            </div>
          </section>
        </aside>
      </div>

      {settingsOpen && (
        <div className="modal-backdrop" onClick={() => setSettingsOpen(false)}>
          <section className="modal card" onClick={(e) => e.stopPropagation()}>
            <div className="section-head compact-head">
              <div>
                <h2>Settings & help</h2>
                <p className="small-note">Theme, tutorial, and add-to-home-screen instructions.</p>
              </div>
              <button className="ghost-btn" onClick={() => setSettingsOpen(false)}>Close</button>
            </div>
            <div className="settings-grid compact-settings">
              <div className="read-only-box"><span>Sales tax rate</span><strong>{(defaultSettings.taxRate * 100).toFixed(2)}%</strong></div>
              <div className="read-only-box"><span>Taxable portion</span><strong>{(defaultSettings.taxablePortion * 100).toFixed(0)}%</strong></div>
              <div className="read-only-box"><span>Base permitting fee</span><strong>{currency.format(defaultSettings.permittingFee)}</strong></div>
              <label className="check">
                <input type="checkbox" checked={settings.darkMode} onChange={(e) => setSettings((current) => ({ ...current, darkMode: e.target.checked }))} />
                <span>Dark mode</span>
              </label>
            </div>

            <div className="help-block">
              <h3>How to use</h3>
              <ol>
                <li>Select the sales sheet tier first.</li>
                <li>Open only the category you need and enter quantity.</li>
                <li>Use Renaissance only when that cover is being quoted.</li>
                <li>Add a deposit if only part of the sale is being financed.</li>
                <li>Watch the red flags for missing add-ons and restrictions.</li>
              </ol>
            </div>

            <div className="help-block">
              <h3>Add to iPhone home screen</h3>
              <ol>
                <li>Open the site in Safari.</li>
                <li>Tap the Share button.</li>
                <li>Tap <strong>Add to Home Screen</strong>.</li>
                <li>Rename it if you want, then tap <strong>Add</strong>.</li>
              </ol>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

export default App;
