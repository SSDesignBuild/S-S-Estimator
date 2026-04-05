import React, { useEffect, useMemo, useState } from "react";
import { appData } from "./data";

const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const storageKey = "sns-design-build-estimator-v2";

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

const cityRules = {
  clarksville: {
    fee: 1500,
    message: "Clarksville requires a $1,500 survey fee. Lead time for survey if permit is needed is about 4 weeks."
  },
  brentwood: {
    fee: 0,
    message: "Brentwood requires engineering. Aluminum: add $800. Wood: add $3,000."
  },
  franklin: {
    fee: 0,
    message: "Franklin requires engineering. Aluminum: add $800. Wood: add $3,000."
  }
};

const defaultLineState = Object.fromEntries(appData.categories.flatMap((cat) => cat.items.map((item) => [item.id, ""])));
const defaultExpanded = Object.fromEntries(appData.categories.map((cat) => [cat.name, false]));
const widthOptions = [0, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38, 40];
const projectionOptions = [0, 10, 11, 12, 13, 14, 15, 16];

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
  roofColor: false,
  deductPosts: 0
};

const defaultSettings = {
  taxRate: 0.0925,
  taxablePortion: 0.4,
  permittingFee: 500,
  city: "",
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

function getPanelTypeMeta(panelType) {
  if (panelType === "6upgraded") {
    return {
      label: '6" upgraded panel',
      multiplier: 2,
      includesHeavyFoam: true,
      includes032: true,
      maxProjection: 24
    };
  }
  if (panelType === "3upgraded") {
    return {
      label: '3" upgraded panel + .032 skin',
      multiplier: 1,
      includesHeavyFoam: true,
      includes032: true,
      maxProjection: 19
    };
  }
  return {
    label: '3" standard panel',
    multiplier: 1,
    includesHeavyFoam: false,
    includes032: false,
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

  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (!saved) return;

    try {
      const parsed = JSON.parse(saved);

      if (parsed.selectedTier && appData.pricingTiers[parsed.selectedTier]) {
        setSelectedTier(parsed.selectedTier);
      }

      if (parsed.lineQtys && typeof parsed.lineQtys === "object") {
        setLineQtys({ ...defaultLineState, ...parsed.lineQtys });
      }

      if (parsed.settings && typeof parsed.settings === "object") {
        setSettings({ ...defaultSettings, ...parsed.settings });
      }

      if (parsed.selectedPlanId && financingPlans.some((plan) => plan.id === parsed.selectedPlanId)) {
        setSelectedPlanId(parsed.selectedPlanId);
      }

      if (parsed.renaissance && typeof parsed.renaissance === "object") {
        setRenaissance({ ...defaultRenaissance, ...parsed.renaissance });
      }

      if (parsed.expanded && typeof parsed.expanded === "object") {
        setExpanded({ ...defaultExpanded, ...parsed.expanded });
      }

      if (typeof parsed.toolbarOpen === "boolean") setToolbarOpen(parsed.toolbarOpen);
      if (typeof parsed.renaissanceOpen === "boolean") setRenaissanceOpen(parsed.renaissanceOpen);
    } catch (err) {
      console.error("Failed to load saved estimator state:", err);
      localStorage.removeItem(storageKey);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(
      storageKey,
      JSON.stringify({ selectedTier, lineQtys, settings, selectedPlanId, renaissance, expanded, toolbarOpen, renaissanceOpen })
    );
  }, [selectedTier, lineQtys, settings, selectedPlanId, renaissance, expanded, toolbarOpen, renaissanceOpen]);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = settings.darkMode ? "dark" : "light";
  }, [settings.darkMode]);

  useEffect(() => {
    setRenaissance((current) => ({ ...current, beamLength: current.width || 0 }));
  }, [renaissance.width]);

  const activeTier = appData.pricingTiers[selectedTier] || appData.pricingTiers.tier5;
  const selectedPlan = financingPlans.find((plan) => plan.id === selectedPlanId) || financingPlans[0];

  const lineItems = useMemo(() => {
    return appData.categories.flatMap((cat) =>
      cat.items.map((item) => {
        const qty = safeNumber(lineQtys[item.id] || 0);
        const extended = qty * item.basePrice * activeTier.multiplier;
        return {
          ...item,
          category: cat.name,
          qty,
          extended,
          displayPrice: item.basePrice * activeTier.multiplier
        };
      })
    );
  }, [lineQtys, activeTier.multiplier]);

  const renaissanceCalc = useMemo(() => {
    const key = getRenaissanceKey(renaissance.section, renaissance.mount, renaissance.profile);
    const table = appData.renaissance.styles[key] || {};
    const width = safeNumber(renaissance.width);
    const projection = safeNumber(renaissance.projection);
    const base = width && projection ? table[String(projection)]?.[String(width)] || 0 : 0;
    const tierMultiplier = appData.renaissanceTiers[renaissance.tier]?.multiplier || 1;
    const panelMeta = getPanelTypeMeta(renaissance.panelType);
    const postCountRequired = getRequiredPostCount(width);
    const postCount = safeNumber(renaissance.postCountOverride || postCountRequired);
    const rsqft = roofSqft(renaissance.mount, width, projection);
    const addOns = appData.renaissance.addOns;

    const baseTiered = base * tierMultiplier * panelMeta.multiplier;
    const adders = [];

    if (renaissance.roofColor && rsqft) {
      adders.push({ label: "Roof color", amount: rsqft * addOns.customRoofColorPerSqft * tierMultiplier });
    }

    if (panelMeta.includesHeavyFoam && rsqft) {
      adders.push({ label: "Heavy foam upgrade", amount: rsqft * addOns.heavyFoamPerSqft * tierMultiplier });
    }

    if (panelMeta.includes032 && rsqft) {
      adders.push({ label: ".032 skin upgrade", amount: rsqft * addOns.alum032PerSqft * tierMultiplier });
    }

    const fanBeamUnit = addOns.fanBeamByProjection[String(projection)] || 0;
    const fanBeamAmount = safeNumber(renaissance.fanBeams) * fanBeamUnit * tierMultiplier;
    if (fanBeamAmount) adders.push({ label: "Fan beam(s)", amount: fanBeamAmount });

    const deductPostAmount = safeNumber(renaissance.deductPosts) * addOns.deductPost * tierMultiplier;
    if (deductPostAmount) adders.push({ label: "Deduct post(s)", amount: deductPostAmount });

    const totalAdders = adders.reduce((sum, item) => sum + item.amount, 0);

    return {
      key,
      width,
      projection,
      base,
      rsqft,
      panelMeta,
      tierMultiplier,
      postCountRequired,
      postCount,
      adders,
      baseTiered,
      total: baseTiered + totalAdders,
      missingBasePrice: !!(width && projection && !base)
    };
  }, [renaissance]);

  const standardSubtotal = useMemo(() => lineItems.reduce((sum, item) => sum + item.extended, 0), [lineItems]);
  const subtotal = standardSubtotal + renaissanceCalc.total;

  const matchedCityRule = cityRules[(settings.city || "").trim().toLowerCase()] || null;
  const locationFee = matchedCityRule?.fee || 0;
  const taxableBase = subtotal * settings.taxablePortion;
  const salesTax = taxableBase * settings.taxRate;
  const permittingFee = settings.permittingFee + locationFee;
  const totalNoFinancing = subtotal + salesTax + permittingFee;
  const financedSaleAmount = totalNoFinancing * (1 + selectedPlan.merchantFee / 100);
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

    if (renaissanceCalc.width === 0 && renaissanceCalc.projection === 0) {
      // no-op
    } else {
      if (renaissanceCalc.missingBasePrice) {
        issues.push("That Renaissance width/projection combination is not available in the uploaded 40 sheet. Current sheet pricing only shows widths 10-40 and projections 10-16.");
      }
      if (renaissanceCalc.projection > renaissanceCalc.panelMeta.maxProjection) {
        issues.push(`${renaissanceCalc.panelMeta.label} cannot be used over ${renaissanceCalc.panelMeta.maxProjection}' projection.`);
      }
      if (renaissanceCalc.projection > 16) {
        issues.push("Uploaded Renaissance base pricing currently only covers projections through 16'.");
      }
      if (renaissanceCalc.postCount < renaissanceCalc.postCountRequired) {
        issues.push(`This cover width requires at least ${renaissanceCalc.postCountRequired} posts based on the color-coded Renaissance sheet.`);
      }
      if (safeNumber(renaissance.fanBeams) > 0 && renaissanceCalc.projection < 11) {
        issues.push("Fan beam pricing on the uploaded sheet starts at 11' projection.");
      }
    }

    return Array.from(new Set(issues));
  }, [lineQtys, renaissanceCalc, renaissance.fanBeams, matchedCityRule]);

  const activeItems = lineItems.filter((item) => item.qty > 0);
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
  }

  function copySummary() {
    const text = [
      "S&S Design Build Quick Quote",
      `Sales Sheet Tier: ${activeTier.label}`,
      ...activeItems.map((item) => `${item.category} | ${item.name} | Qty ${item.qty} | ${currency.format(item.extended)}`),
      renaissanceCalc.total > 0
        ? `Renaissance | ${renaissanceCalc.key} | ${renaissanceCalc.width}x${renaissanceCalc.projection} | ${currency.format(renaissanceCalc.total)}`
        : null,
      `Subtotal: ${currency.format(subtotal)}`,
      `Sales tax: ${currency.format(salesTax)}`,
      `Permitting + location fees: ${currency.format(permittingFee)}`,
      `Total no financing: ${currency.format(totalNoFinancing)}`,
      `${selectedPlan.label}: ${currency.format(monthlyPayment)}/mo`
    ]
      .filter(Boolean)
      .join("\n");

    navigator.clipboard.writeText(text).catch(() => {});
  }

  return (
    <div className="page-shell">
      <header className="topbar card">
        <div className="brand-lockup">
          <img className="brand-logo" src="/logo-mark.png" alt="S&S Design Build" />
          <div>
            <h1>S&amp;S Design Build</h1>
            <p>Quick pricing tool for consultations.</p>
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
              <p className="small-note">Tap a category, enter the quantity, and the total updates instantly.</p>
            </div>
            <div className="toolbar-buttons inline-actions">
              <button className="ghost-btn" onClick={clearAll}>Clear inputs</button>
              <button className="ghost-btn" onClick={() => expandAll(true)}>Expand all</button>
              <button className="ghost-btn" onClick={() => expandAll(false)}>Collapse all</button>
            </div>
          </div>

          {appData.categories.map((cat) => (
            <div className="category" key={cat.name}>
              <button className="category-toggle" onClick={() => setExpanded((current) => ({ ...current, [cat.name]: !current[cat.name] }))}>
                <strong>{cat.name}</strong>
                <span>{expanded[cat.name] ? "Hide" : "Show"}</span>
              </button>
              {expanded[cat.name] && (
                <div className="item-list">
                  {cat.items.map((item) => {
                    const qty = lineQtys[item.id] || "";
                    const total = safeNumber(qty) * item.basePrice * activeTier.multiplier;
                    return (
                      <div className="line-card" key={item.id}>
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
                          <input
                            className="qty-input"
                            type="number"
                            min="0"
                            step="any"
                            value={qty}
                            onChange={(e) => updateQty(item.id, e.target.value)}
                          />
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
              <div>
                <h2>Renaissance</h2>
                <p className="small-note">Base built from the uploaded Renaissance 40 sheet, with 50 and 60 tier multipliers layered on top.</p>
              </div>
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
                      {Object.keys(appData.renaissance.sectionOptions).map((section) => (
                        <option key={section} value={section}>{section}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Mount
                    <select value={renaissance.mount} onChange={(e) => setRenaissance((current) => ({ ...current, mount: e.target.value }))}>
                      {appData.renaissance.sectionOptions[renaissance.section].mounts.map((option) => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  </label>
                  {renaissance.section !== "Moderno" && (
                    <label>
                      End cut
                      <select value={renaissance.profile} onChange={(e) => setRenaissance((current) => ({ ...current, profile: e.target.value }))}>
                        {appData.renaissance.sectionOptions[renaissance.section].profiles.map((option) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
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
                      <option value="3standard">3&quot; standard</option>
                      <option value="3upgraded">3&quot; upgraded foam + .032</option>
                      <option value="6upgraded">6&quot; upgraded foam + .032</option>
                    </select>
                  </label>
                  <label>
                    Post count
                    <input
                      type="number"
                      min="0"
                      value={renaissance.postCountOverride || renaissanceCalc.postCountRequired || 0}
                      onChange={(e) => setRenaissance((current) => ({ ...current, postCountOverride: e.target.value }))}
                    />
                  </label>
                  <label>
                    Beam length (auto width)
                    <input type="number" min="0" value={renaissance.beamLength} readOnly />
                  </label>
                  <label>
                    Fan beams
                    <input type="number" min="0" value={renaissance.fanBeams} onChange={(e) => setRenaissance((current) => ({ ...current, fanBeams: e.target.value }))} />
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
                  {renaissanceCalc.adders.map((adder) => (
                    <div className="summary-row" key={adder.label}><span>{adder.label}</span><strong>{currency.format(adder.amount)}</strong></div>
                  ))}
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
            <div className="summary-row total"><span>Total no financing</span><strong>{currency.format(totalNoFinancing)}</strong></div>

            <div className="summary-section">
              <h3>Financing plans</h3>
              <div className="plan-list">
                {financingPlans.map((plan) => (
                  <button key={plan.id} className={selectedPlanId === plan.id ? "plan-card active" : "plan-card"} onClick={() => setSelectedPlanId(plan.id)}>
                    <strong>{plan.label}</strong>
                    <span>{plan.term}</span>
                    <span>{plan.apr}</span>
                    <span>Merchant fee {plan.merchantFee}%</span>
                    <span>Payment factor {plan.paymentFactor}%</span>
                  </button>
                ))}
              </div>
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
                <p className="small-note">Theme, tax defaults, tutorial, and add-to-home-screen instructions.</p>
              </div>
              <button className="ghost-btn" onClick={() => setSettingsOpen(false)}>Close</button>
            </div>
            <div className="settings-grid">
              <label>
                Sales tax rate
                <input type="number" step="0.0001" value={settings.taxRate} onChange={(e) => setSettings((current) => ({ ...current, taxRate: safeNumber(e.target.value) }))} />
              </label>
              <label>
                Taxable portion
                <input type="number" step="0.01" value={settings.taxablePortion} onChange={(e) => setSettings((current) => ({ ...current, taxablePortion: safeNumber(e.target.value) }))} />
              </label>
              <label>
                Base permitting fee
                <input type="number" step="1" value={settings.permittingFee} onChange={(e) => setSettings((current) => ({ ...current, permittingFee: safeNumber(e.target.value) }))} />
              </label>
              <label className="check">
                <input type="checkbox" checked={settings.darkMode} onChange={(e) => setSettings((current) => ({ ...current, darkMode: e.target.checked }))} />
                <span>Dark mode</span>
              </label>
            </div>

            <div className="help-block">
              <h3>How to use</h3>
              <ol>
                <li>Select the sales sheet tier you want to use.</li>
                <li>Open the category you need and enter only the quantity field.</li>
                <li>Use the Renaissance section only when that cover is being sold.</li>
                <li>Choose a financing plan to see the estimated monthly payment.</li>
                <li>Watch the red flag section for restrictions and missing add-ons.</li>
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
