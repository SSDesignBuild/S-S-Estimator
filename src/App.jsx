import { useEffect, useMemo, useState } from "react";
import { appData } from "./data";

const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const qtyLabels = { "Per sqft": "SQFT", Sqft: "SQFT", PLF: "LFT", "linear ft": "LFT", each: "Each", Each: "Each", "Per Job": "Job Qty", Minimum: "Job Qty", "Per square": "Squares", "Per step": "Steps", "Per Side": "Sides" };
const storageKey = "sns-design-build-estimator";

const defaultLineState = Object.fromEntries(appData.categories.flatMap(cat => cat.items.map(item => [item.id, ""])));
const defaultRenaissance = { section: "Moderno", mount: "Attached", profile: "Straight", width: 12, projection: 10, tier: "r40", postCount: 2, postUpgrade: "none", beamUpgrade: "none", beamLength: 0, fanBeams: 0, colorPanel: false, heavyFoam: false, alum032: false, customRoofColor: false, deductPosts: 0 };

function roofSqft(mount, width, projection) {
  return mount === "Attached" ? (width + 2) * (projection + 1) : (width + 2) * (projection + 2);
}

function getRenaissanceKey(section, mount, profile) {
  if (section === "Moderno") return `${section} ${mount}`;
  return `${section} ${mount} ${profile}`;
}

function App() {
  const [selectedTier, setSelectedTier] = useState("tier5");
  const [lineQtys, setLineQtys] = useState(defaultLineState);
  const [settings, setSettings] = useState(appData.defaultSettings);
  const [termYears, setTermYears] = useState(10);
  const [renaissance, setRenaissance] = useState(defaultRenaissance);
  const [expanded, setExpanded] = useState(Object.fromEntries(appData.categories.map(cat => [cat.name, false])));

  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved);
      if (parsed.selectedTier) setSelectedTier(parsed.selectedTier);
      if (parsed.lineQtys) setLineQtys({ ...defaultLineState, ...parsed.lineQtys });
      if (parsed.settings) setSettings({ ...appData.defaultSettings, ...parsed.settings });
      if (parsed.termYears) setTermYears(parsed.termYears);
      if (parsed.renaissance) setRenaissance({ ...defaultRenaissance, ...parsed.renaissance });
    } catch {}
  }, []);

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify({ selectedTier, lineQtys, settings, termYears, renaissance }));
  }, [selectedTier, lineQtys, settings, termYears, renaissance]);

  const lineItems = useMemo(() => {
    const multiplier = appData.pricingTiers[selectedTier].multiplier;
    return appData.categories.flatMap(cat => cat.items.map(item => {
      const qty = Number(lineQtys[item.id] || 0);
      const extended = qty * item.basePrice * multiplier;
      return { ...item, category: cat.name, qty, extended, displayPrice: item.basePrice * multiplier };
    }));
  }, [lineQtys, selectedTier]);

  const renaissanceCalc = useMemo(() => {
    const key = getRenaissanceKey(renaissance.section, renaissance.mount, renaissance.profile);
    const table = appData.renaissance.styles[key] || {};
    const base = table[String(renaissance.projection)]?.[String(renaissance.width)] || 0;
    const tierMultiplier = appData.renaissanceTiers[renaissance.tier].multiplier;
    const baseTiered = base * tierMultiplier;
    const rsqft = roofSqft(renaissance.mount, Number(renaissance.width), Number(renaissance.projection));
    const addOns = appData.renaissance.addOns;
    const adders = [];
    if (renaissance.colorPanel) adders.push({ label: "Color panel", amount: rsqft * addOns.customRoofColorPerSqft * tierMultiplier });
    if (renaissance.heavyFoam) adders.push({ label: "Heavy foam", amount: rsqft * addOns.heavyFoamPerSqft * tierMultiplier });
    if (renaissance.alum032) adders.push({ label: ".032 alum skin", amount: rsqft * addOns.alum032PerSqft * tierMultiplier });
    if (renaissance.customRoofColor) adders.push({ label: "Custom roof color", amount: rsqft * addOns.customRoofColorPerSqft * tierMultiplier });
    const fanAmount = Number(renaissance.fanBeams || 0) * (addOns.fanBeamByProjection[String(renaissance.projection)] || 0) * tierMultiplier;
    if (fanAmount) adders.push({ label: "Fan beam(s)", amount: fanAmount });
    const postAmount = Number(renaissance.postCount || 0) * (addOns.postUpgradeEach[renaissance.postUpgrade] || 0) * tierMultiplier;
    if (postAmount) adders.push({ label: "Post upgrade", amount: postAmount });
    const beamAmount = Number(renaissance.beamLength || 0) * (addOns.beamUpgradePerFoot[renaissance.beamUpgrade] || 0) * tierMultiplier;
    if (beamAmount) adders.push({ label: "Beam upgrade", amount: beamAmount });
    const deductPostAmount = Number(renaissance.deductPosts || 0) * addOns.deductPost * tierMultiplier;
    if (deductPostAmount) adders.push({ label: "Deduct post", amount: deductPostAmount });
    const totalAdders = adders.reduce((sum, item) => sum + item.amount, 0);
    return { key, rsqft, base, baseTiered, adders, total: baseTiered + totalAdders };
  }, [renaissance]);

  const subtotal = useMemo(() => lineItems.reduce((sum, item) => sum + item.extended, 0) + renaissanceCalc.total, [lineItems, renaissanceCalc.total]);
  const salesTax = subtotal * settings.taxablePortion * settings.taxRate;
  const permittingFee = settings.permittingFee;
  const totalNoFinancing = subtotal + salesTax + permittingFee;
  const totalWithFinancing = totalNoFinancing * (1 + settings.financingMarkup);
  const monthlyPayment = totalWithFinancing / (termYears * 12);

  const flags = useMemo(() => {
    const issues = [];
    for (const rule of appData.rules) {
      const qty = Number(lineQtys[rule.itemId] || 0);
      if (!qty) continue;
      if (rule.type === "minExclusive" && qty <= rule.threshold) issues.push(rule.message);
      if (rule.type === "maxInclusive" && qty > rule.threshold) issues.push(rule.message);
      if (rule.type === "info") issues.push(rule.message);
    }
    if (renaissance.section === "Moderno" && renaissance.profile !== "Straight") issues.push("Moderno pricing only exists as Attached or Freestanding in the uploaded sheet. Curved vs straight is not listed separately.");
    if (!appData.renaissance.styles[renaissanceCalc.key]) issues.push("That Renaissance combination is not in the uploaded 40-sheet table.");
    if (renaissance.mount === "Attached" && renaissance.projection > 16) issues.push("Uploaded Renaissance table only covers projections 10-16.");
    return Array.from(new Set(issues));
  }, [lineQtys, renaissance, renaissanceCalc.key]);

  const activeItems = lineItems.filter(item => item.qty > 0);

  const summaryText = [
    `S&S Design Build Quick Quote`,
    `Sales Sheet Tier: ${appData.pricingTiers[selectedTier].label}`,
    ...activeItems.map(item => `${item.category} | ${item.name} | Qty ${item.qty} | ${currency.format(item.extended)}`),
    renaissanceCalc.total > 0 ? `Renaissance | ${renaissanceCalc.key} ${renaissance.width}x${renaissance.projection} | ${currency.format(renaissanceCalc.total)}` : null,
    `Subtotal: ${currency.format(subtotal)}`,
    `Sales tax (${(settings.taxablePortion * 100).toFixed(0)}% taxable @ ${(settings.taxRate * 100).toFixed(2)}%): ${currency.format(salesTax)}`,
    `Permitting: ${currency.format(permittingFee)}`,
    `Total no financing: ${currency.format(totalNoFinancing)}`,
    `Total w/ financing: ${currency.format(totalWithFinancing)}`,
    `${termYears}-year payment: ${currency.format(monthlyPayment)}/mo`
  ].filter(Boolean).join("\n");

  return (
    <div className="page-shell">
      <header className="hero">
        <div>
          <div className="eyebrow">S&S Design Build estimator</div>
          <h1>Fast, on-the-spot pricing for consultations.</h1>
          <p className="hero-copy">Built around your uploaded 5-sheet pricing PDF and Renaissance 40 pricing matrix. Styling is based on the public S&S site: clean white surfaces, charcoal typography, warm gold accents, and strong service-card layouts.</p>
        </div>
        <div className="brand-card">
          <div className="brand-mark">S&amp;S</div>
          <div>
            <strong>Design Build</strong>
            <span>Replace with official logo in /public if needed.</span>
          </div>
        </div>
      </header>

      <section className="toolbar card">
        <div>
          <label>Sales sheet tier</label>
          <div className="pill-row">
            {Object.entries(appData.pricingTiers).map(([key, tier]) => (
              <button key={key} className={selectedTier === key ? "pill active" : "pill"} onClick={() => setSelectedTier(key)}>{tier.label}</button>
            ))}
          </div>
        </div>
        <div>
          <label>Financing term</label>
          <div className="pill-row">
            {[5, 10, 15].map(year => (
              <button key={year} className={termYears === year ? "pill active" : "pill"} onClick={() => setTermYears(year)}>{year} years</button>
            ))}
          </div>
        </div>
        <div className="settings-grid compact">
          <label>Tax rate<input type="number" step="0.0001" value={settings.taxRate} onChange={e => setSettings(s => ({ ...s, taxRate: Number(e.target.value) }))} /></label>
          <label>Taxable portion<input type="number" step="0.01" value={settings.taxablePortion} onChange={e => setSettings(s => ({ ...s, taxablePortion: Number(e.target.value) }))} /></label>
          <label>Permit fee<input type="number" step="1" value={settings.permittingFee} onChange={e => setSettings(s => ({ ...s, permittingFee: Number(e.target.value) }))} /></label>
          <label>Finance markup<input type="number" step="0.01" value={settings.financingMarkup} onChange={e => setSettings(s => ({ ...s, financingMarkup: Number(e.target.value) }))} /></label>
        </div>
      </section>

      {flags.length > 0 && (
        <section className="flag-list card alert">
          <h2>Red flags / restrictions</h2>
          {flags.map(flag => <div className="flag" key={flag}>{flag}</div>)}
        </section>
      )}

      <section className="main-grid">
        <div className="left-col">
          <section className="card">
            <div className="section-head">
              <div>
                <h2>Standard pricing sheets</h2>
                <p>Enter SQFT, LFT, or Each quantities. Tier pricing updates instantly.</p>
              </div>
              <button className="ghost-btn" onClick={() => setExpanded(Object.fromEntries(appData.categories.map(cat => [cat.name, true])))}>Expand all</button>
            </div>
            {appData.categories.map(cat => (
              <div className="category" key={cat.name}>
                <button className="category-toggle" onClick={() => setExpanded(s => ({ ...s, [cat.name]: !s[cat.name] }))}>
                  <span>{cat.name}</span>
                  <span>{expanded[cat.name] ? "−" : "+"}</span>
                </button>
                {expanded[cat.name] && (
                  <div className="table-wrap">
                    <table>
                      <thead><tr><th>Service</th><th>Unit</th><th>Tier Price</th><th>Qty</th><th>Total</th></tr></thead>
                      <tbody>
                        {cat.items.map(item => {
                          const row = lineItems.find(line => line.id === item.id);
                          return (
                            <tr key={item.id}>
                              <td>{item.name}</td>
                              <td>{item.unit}</td>
                              <td>{currency.format(row.displayPrice)}</td>
                              <td><input className="qty-input" type="number" min="0" step="any" value={lineQtys[item.id]} placeholder={qtyLabels[item.unit] || "Qty"} onChange={e => setLineQtys(s => ({ ...s, [item.id]: e.target.value }))} /></td>
                              <td>{currency.format(row.extended)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </section>
        </div>

        <div className="right-col">
          <section className="card">
            <div className="section-head">
              <div>
                <h2>Renaissance estimator</h2>
                <p>Using the uploaded Renaissance 40 sell-price matrix with 50 and 60 tiers layered on top.</p>
              </div>
            </div>
            <div className="renaissance-grid">
              <label>Style<select value={renaissance.section} onChange={e => setRenaissance(r => ({ ...r, section: e.target.value }))}>{["Moderno","Contempo","Classico","Fresco","Aria"].map(v => <option key={v}>{v}</option>)}</select></label>
              <label>Mount<select value={renaissance.mount} onChange={e => setRenaissance(r => ({ ...r, mount: e.target.value }))}><option>Attached</option><option>Freestanding</option></select></label>
              <label>Profile<select value={renaissance.profile} onChange={e => setRenaissance(r => ({ ...r, profile: e.target.value }))}><option>Straight</option><option>Curved</option></select></label>
              <label>Tier<select value={renaissance.tier} onChange={e => setRenaissance(r => ({ ...r, tier: e.target.value }))}>{Object.entries(appData.renaissanceTiers).map(([key, tier]) => <option value={key} key={key}>{tier.label}</option>)}</select></label>
              <label>Width<select value={renaissance.width} onChange={e => setRenaissance(r => ({ ...r, width: Number(e.target.value) }))}>{appData.renaissance.widths.map(v => <option value={v} key={v}>{v}</option>)}</select></label>
              <label>Projection<select value={renaissance.projection} onChange={e => setRenaissance(r => ({ ...r, projection: Number(e.target.value) }))}>{appData.renaissance.projections.map(v => <option value={v} key={v}>{v}</option>)}</select></label>
              <label>Post count<input type="number" min="0" value={renaissance.postCount} onChange={e => setRenaissance(r => ({ ...r, postCount: Number(e.target.value) }))} /></label>
              <label>Post upgrade<select value={renaissance.postUpgrade} onChange={e => setRenaissance(r => ({ ...r, postUpgrade: e.target.value }))}><option value="none">Standard</option><option value="hd">HD</option><option value="wide">Wide</option><option value="wideInsert">Wide + Insert</option></select></label>
              <label>Beam upgrade<select value={renaissance.beamUpgrade} onChange={e => setRenaissance(r => ({ ...r, beamUpgrade: e.target.value }))}><option value="none">Standard</option><option value="hd">HD</option><option value="wide">Wide</option><option value="wideInsert">Wide + Insert</option></select></label>
              <label>Beam length (ft)<input type="number" min="0" value={renaissance.beamLength} onChange={e => setRenaissance(r => ({ ...r, beamLength: Number(e.target.value) }))} /></label>
              <label>Fan beams<input type="number" min="0" value={renaissance.fanBeams} onChange={e => setRenaissance(r => ({ ...r, fanBeams: Number(e.target.value) }))} /></label>
              <label>Deduct posts<input type="number" min="0" value={renaissance.deductPosts} onChange={e => setRenaissance(r => ({ ...r, deductPosts: Number(e.target.value) }))} /></label>
              <label className="check"><input type="checkbox" checked={renaissance.colorPanel} onChange={e => setRenaissance(r => ({ ...r, colorPanel: e.target.checked }))} />Color panel</label>
              <label className="check"><input type="checkbox" checked={renaissance.heavyFoam} onChange={e => setRenaissance(r => ({ ...r, heavyFoam: e.target.checked }))} />Heavy foam</label>
              <label className="check"><input type="checkbox" checked={renaissance.alum032} onChange={e => setRenaissance(r => ({ ...r, alum032: e.target.checked }))} />.032 alum</label>
              <label className="check"><input type="checkbox" checked={renaissance.customRoofColor} onChange={e => setRenaissance(r => ({ ...r, customRoofColor: e.target.checked }))} />Custom roof color</label>
            </div>
            <div className="renaissance-summary">
              <div className="summary-row"><span>Matrix key</span><strong>{renaissanceCalc.key}</strong></div>
              <div className="summary-row"><span>Roof SQFT</span><strong>{renaissanceCalc.rsqft}</strong></div>
              <div className="summary-row"><span>Base 40-sheet price</span><strong>{currency.format(renaissanceCalc.base)}</strong></div>
              <div className="summary-row"><span>Tier-adjusted base</span><strong>{currency.format(renaissanceCalc.baseTiered)}</strong></div>
              {renaissanceCalc.adders.map(adder => <div className="summary-row" key={adder.label}><span>{adder.label}</span><strong>{currency.format(adder.amount)}</strong></div>)}
              <div className="summary-row total"><span>Renaissance total</span><strong>{currency.format(renaissanceCalc.total)}</strong></div>
            </div>
          </section>

          <section className="card sticky-card">
            <h2>Quote totals</h2>
            <div className="summary-row"><span>Subtotal</span><strong>{currency.format(subtotal)}</strong></div>
            <div className="summary-row"><span>Sales tax</span><strong>{currency.format(salesTax)}</strong></div>
            <div className="summary-row"><span>Permitting fee</span><strong>{currency.format(permittingFee)}</strong></div>
            <div className="summary-row total"><span>Total no financing</span><strong>{currency.format(totalNoFinancing)}</strong></div>
            <div className="summary-row"><span>Total with financing</span><strong>{currency.format(totalWithFinancing)}</strong></div>
            <div className="summary-row accent"><span>{termYears}-year payment</span><strong>{currency.format(monthlyPayment)}/mo</strong></div>
            <div className="small-note">Financing is currently modeled exactly how you described: a 10% markup on total cost, then divided across 5, 10, or 15 years.</div>
            <button className="primary-btn" onClick={() => navigator.clipboard.writeText(summaryText)}>Copy quote summary</button>
            <button className="ghost-btn" onClick={() => { setLineQtys(defaultLineState); setRenaissance(defaultRenaissance); }}>Clear inputs</button>
          </section>
        </div>
      </section>
    </div>
  );
}

export default App;
