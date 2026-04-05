import json, re, pdfplumber, os

APP_DIR = '/mnt/data/sns-price-app'
SRC = os.path.join(APP_DIR, 'src')
PUBLIC = os.path.join(APP_DIR, 'public')

def slugify(s):
    return re.sub(r'-+','-', re.sub(r'[^a-z0-9]+','-', s.lower())).strip('-')

raw_categories = [
  ("Screen Enclosure",[
      ("Renaissance Screen Framing",130,"PLF"),("Screen at 8' high w/ 2x2\" framing",151,"PLF"),("Every Foot higher than 8' ((Add))",16,"PLF"),("Chair Railings ((Add))",54,"PLF"),("Railing with Pickett",108,"PLF"),("Insulated Kick panel @2ft tall",60,"linear ft"),("Trim coil kick plate",30,"linear ft"),("Insulated Trapezoid",60,"linear ft"),("Suntex 80/90 ((Add))",65,"PLF"),("Install Second Story ((Add))",1000,"Per Job"),("Screen Arches/Gables",220,"PLF"),("Screen Traps 7 Ft high or over ((Add))",40,"PLF"),("Screen Under Decks (regular screen)",10,"Per sqft"),("Replace Bad Wood ((Add))",12,"PLF"),("Wrap Header with Aluminum ((Add))",16,"PLF"),("Cut Existing Capitals",50,"Per Side"),("Cut Existing Columns",200,"Per Side"),("Replace Posts 3x3\"",25,"PLF"),("Replace Posts 4x4\"",30,"PLF"),("Replace Posts 6x6\"",40,"PLF"),("Replace Posts 8x8\"",50,"PLF"),
  ]),
  ("Motorized Units",[("Motorized Unit <10ft width/height",3750,"each"),("Motorized Unit <16ft",375,"PLF"),("Motorized Unit >16ft but <22ft ((Add))",2000,"each"),("Motorized Vinyl Unit <16ft",625,"PLF")]),
  ("PCA Screen Doors",[("Standard",750,"each"),("French Doors (2 doors with astragal in center)",1500,"each"),("Dog Door 6'8\" 11x13 MED",800,"each"),("Dog Door 6'8\" 13x20 LG",800,"each"),("Dog Door 6'8\" 6x8 SM",800,"each"),("Dog Door 6'8\" 4x8 XSM",800,"each"),("04' wide x 6'8\" A100",850,"each")]),
  ("Electrical",[("Home run (connect at panel)",500,"each"),("110 Plug ((Add))",400,"each"),("Switch ((Add))",400,"each"),("220 Plug ((Add))",1500,"each"),("Install Customer's Light",300,"each"),("Install Customer's Ceiling Fan",600,"each"),("Install Outside GFCI's",400,"each")]),
  ("Custom Extras",[("Install Underpinning Vinyl",40,"PLF"),("Mule Hide Shingles (10x10')",600,"Per square"),("Shingles Attached to Roof",600,"Per square"),("6\" House Gutters",30,"PLF"),("Footers for System",200,"each"),("Water tap for sinks 10'",600,"each"),("Tankless Water Heater Install",1800,"each"),("Tear Out / Demo",1500,"each"),("Stain / Paint",4,"Per sqft")]),
  ("Cover My Pergola",[("Hercules system",32,"Per sqft"),("Apollo System",24,"Per sqft")]),
  ("Patio Covers",[("Flat Pan anything under 120sqft",4000,"Minimum"),("Flat Pan / Non-insulated Wheat/White",35,"Per sqft"),("3\" Insulated Cover T&C",45,"Per sqft"),("6\" Insulated Cover T&C",85,"Per sqft"),("(Add) Beam for Fan",50,"PLF"),("HD Post",394,"Each"),("Wide Post",433,"Each"),("Wide+Insert Post",1019,"Each"),("HD Beam",18,"PLF"),("Wide Beam",28,"PLF"),("Wide+Insert Beam",68,"PLF"),("Color Panel",4,"Per sqft"),("Upgrade Foam on Panel",9,"Per sqft"),("Upgrade Alum .032",9,"Per sqft"),("Structural Gutter & Beam 24'",2000,"Each"),("10x10 Column",200,"PLF"),("8x8 Column",140,"PLF"),("6x6 Column",125,"PLF"),("Custom wood structures",140,"Per sqft"),("Gabled Aluminum Structure",90,"Per sqft"),("Standard Lean to",76,"Per sqft"),("Standard PT Wood Pergola",40,"Per sqft"),("Louvered Roof System",140,"Per sqft")]),
  ("Sunrooms",[("Eze Breeze Vinyl 4 Track",425,"PLF"),("Summerspace kickpanel",900,"PLF"),("Summerspace window kickpanel",950,"PLF"),("Add Transom",125,"PLF"),("Insulated glass - horizontal sliders - Picture window kick panel - W/ door",950,"PLF"),("Insulated glass - horizontal sliders - Insulated Panel kick panel - W/ door",900,"PLF")]),
  ("Decking",[("Pressure Treated Wood Decks",40,"Per sqft"),("Pressure Treated Wood railing",35,"PLF"),("Pressure Treated Wood Stairs",400,"Per step"),("Deck Skirting",14,"Sqft"),("Trex Enhance",50,"Per sqft"),("Composite Deck",60,"Per sqft"),("PVC Deck",70,"Per sqft"),("Composite/PVC Stairs",600,"Per step"),("Post Lights",300,"Each"),("Add Drink Rail",55,"PLF"),("LVP Flooring",12,"Per sqft"),("Replace Decking with Subfloor",12,"Per sqft"),("Sky Lights",600,"PLF"),("Cable Railing",300,"PLF"),("Vinyl Railing",130,"PLF"),("Aluminum Railing",210,"PLF"),("HomeDepot Budget Aluminum Railing",120,"PLF"),("Aluminum UnderDecking",38,"Per sqft"),("Steel wood grain UnderDecking",60,"Per sqft"),("Tongue & Groove Ceiling",20,"Per sqft"),("Install Footers per code *Stairpad*",200,"each")]),
  ("Outdoor Living",[("Concrete > 400sqft",17,"Per sqft"),("Concrete < 400sqft",34,"Per sqft"),("Pump Concrete ((Add))",1600,"Per Job"),("Colors ((Add))",4,"Per sqft"),("Stamp Concrete > 400sqft ((Add))",10,"Per sqft"),("Stamp Concrete < 400sqft ((Add))",20,"Per sqft"),("Border ((Add))",2,"Per sqft"),("Concrete Steps 4' Wide",500,"each"),("Raised Concrete Sides ((Add))",60,"Per sqft"),("Pavers",43,"Per sqft"),("Paver Border ((Add))",3,"Per sqft"),("Inlay ((Add))",3,"Per sqft"),("Firepit",1500,"each"),("Custom Wood Burning Fireplace",170,"Per sqft"),("Electric Fireplace Insert",2000,"each"),("Counter Top (Granite) 1\"",70,"Per sqft"),("Outdoor Kitchen Block, Stucco, PVC Deck",150,"Per sqft"),("Installing Stacked Stone Veneer (add)",40,"Per sqft"),("Retaining Wall",100,"Per sqft"),("Stone Columns 2x2x4",1000,"each"),("Fencing",70,"PLF"),("Rosetta Out-Cropping retaining wall our Cost",200,"Per sqft"),("Engineering Wood Structures",3000,"Per Job"),("Engineering Renaissance",600,"Per Job"),("Permitting",500,"Per Job")]),
]

categories=[]
for cat_name, items in raw_categories:
    seen={}
    out=[]
    for name, price, unit in items:
        base_slug = slugify(f"{cat_name}-{name}")
        n = seen.get(base_slug, 0)+1
        seen[base_slug]=n
        item_id = base_slug if n==1 else f"{base_slug}-{n}"
        out.append({"id":item_id,"name":name,"basePrice":price,"unit":unit})
    categories.append({"name":cat_name,"items":out})

path='/mnt/data/Renaissance 40 - Sell Price.pdf'
with pdfplumber.open(path) as pdf:
    full = "\n".join(page.extract_text() for page in pdf.pages)
headers = [
    "Moderno Attached","Moderno Freestanding",
    "Contempo Attached Curved","Contempo Attached Straight","Contempo Freestanding Curved","Contempo Freestanding Straight",
    "Classico Attached Curved","Classico Attached Straight","Classico Freestanding Curved","Classico Freestanding Straight",
    "Fresco Attached Curved","Fresco Attached Straight","Fresco Freestanding Curved","Fresco Freestanding Straight",
    "Aria Attached Curved","Aria Attached Straight","Aria Freestanding Curved","Aria Freestanding Straight",
]
positions=[]
for h in headers:
    m=re.search(re.escape(h), full)
    positions.append((m.start(), h))
positions=sorted(positions)
sections={}
for i,(pos,h) in enumerate(positions):
    end=positions[i+1][0] if i+1 < len(positions) else full.find("Dolce Screen Walls")
    sections[h]=full[pos:end]

def parse_table(text):
    lines=[ln.strip() for ln in text.splitlines() if ln.strip()]
    widths=None
    rows={}
    for ln in lines:
        if ln.startswith('Width->'):
            widths=list(map(int,re.findall(r'\d+',ln)))
        elif re.match(r'^(10|11|12|13|14|15|16)\s',ln):
            vals=list(map(int,re.findall(r'\d+',ln)))
            proj=vals[0]
            rows[str(proj)]={str(w):v for w,v in zip(widths, vals[1:])}
    return rows

renaissance={h:parse_table(t) for h,t in sections.items()}
ids = {item['name']: item['id'] for cat in categories for item in cat['items']}

app_data = {
    "pricingTiers": {
        "volume": {"label":"Volume","multiplier":0.95},
        "tier5": {"label":"5%","multiplier":1.0},
        "tier7_5": {"label":"7.5%","multiplier":1.1},
        "tier10": {"label":"10%","multiplier":1.2},
        "tier15": {"label":"15%","multiplier":1.3}
    },
    "renaissanceTiers": {
        "r40":{"label":"40","multiplier":1.0},
        "r50":{"label":"50","multiplier":1.2},
        "r60":{"label":"60","multiplier":1.3}
    },
    "defaultSettings": {"taxRate":0.0925,"taxablePortion":0.40,"permittingFee":500,"financingMarkup":0.10},
    "categories": categories,
    "renaissance": {
        "widths":[10,12,14,16,18,20,22,24,26,28,30,32,34,36,38,40],
        "projections":[10,11,12,13,14,15,16],
        "styles": renaissance,
        "addOns": {
            "alum032PerSqft":9,
            "heavyFoamPerSqft":9,
            "customRoofColorPerSqft":4,
            "fanBeamByProjection":{"11":270,"12":295,"13":319,"14":344,"15":368,"16":393,"17":417,"18":442},
            "postUpgradeEach":{"none":0,"hd":394,"wide":433,"wideInsert":1019},
            "beamUpgradePerFoot":{"none":0,"hd":18,"wide":28,"wideInsert":68},
            "deductPost":-308
        }
    },
    "rules": [
        {"id":"concrete-gt-400-min","type":"minExclusive","itemId":ids["Concrete > 400sqft"],"threshold":400,"message":"Concrete > 400 sqft pricing should only be used when quantity is greater than 400 sqft."},
        {"id":"concrete-lt-400-max","type":"maxInclusive","itemId":ids["Concrete < 400sqft"],"threshold":400,"message":"Concrete < 400 sqft pricing cannot be used above 400 sqft."},
        {"id":"flat-pan-min-charge","type":"info","itemId":ids["Flat Pan anything under 120sqft"],"message":"Use the under-120 sqft flat pan line as a single minimum-charge line item."}
    ]
}

with open(os.path.join(SRC,'data.js'),'w') as f:
    f.write('export const appData = ' + json.dumps(app_data, indent=2) + ';\n')

main_js = '''import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
'''
with open(os.path.join(SRC,'main.jsx'),'w') as f: f.write(main_js)

app_js = '''import { useEffect, useMemo, useState } from "react";
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
'''
with open(os.path.join(SRC,'App.jsx'),'w') as f: f.write(app_js)

css = ''':root {
  --bg: #f7f3ec;
  --card: #ffffff;
  --ink: #222222;
  --muted: #6f6a63;
  --gold: #c79d3b;
  --gold-dark: #8d6b1a;
  --line: #e7dcc9;
  --alert: #8b1e1e;
  --alert-bg: #fff0f0;
}
* { box-sizing: border-box; }
body { margin: 0; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif; background: linear-gradient(180deg, #fff 0%, var(--bg) 100%); color: var(--ink); }
button, input, select { font: inherit; }
.page-shell { max-width: 1600px; margin: 0 auto; padding: 24px; }
.hero { display: grid; grid-template-columns: 1.6fr .9fr; gap: 20px; align-items: stretch; margin-bottom: 20px; }
.hero h1 { margin: 8px 0 12px; font-size: clamp(2rem, 4vw, 3.2rem); line-height: 1.05; }
.hero-copy, .small-note { color: var(--muted); line-height: 1.5; }
.eyebrow { text-transform: uppercase; letter-spacing: .14em; color: var(--gold-dark); font-size: .78rem; font-weight: 700; }
.card, .hero > div { background: rgba(255,255,255,.9); border: 1px solid var(--line); border-radius: 24px; box-shadow: 0 10px 30px rgba(48, 40, 24, .06); padding: 20px; }
.brand-card { display: flex; align-items: center; justify-content: center; gap: 14px; min-height: 180px; background: radial-gradient(circle at top, #fff8ea, #ffffff 65%); }
.brand-mark { width: 76px; height: 76px; border-radius: 22px; background: linear-gradient(180deg, var(--gold), #efd69f); color: #fff; display: grid; place-items: center; font-weight: 800; font-size: 1.3rem; }
.brand-card span { display: block; color: var(--muted); margin-top: 6px; }
.toolbar { display: grid; grid-template-columns: 1.1fr 1fr 1.8fr; gap: 18px; margin-bottom: 20px; }
.pill-row { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }
.pill, .ghost-btn, .primary-btn, .category-toggle { border: 1px solid var(--line); background: white; padding: 10px 14px; border-radius: 999px; cursor: pointer; }
.pill.active, .primary-btn { background: linear-gradient(180deg, var(--gold), #d9b15a); color: white; border-color: #caa04a; }
.primary-btn { width: 100%; margin-top: 14px; border-radius: 14px; }
.ghost-btn { margin-top: 12px; }
.settings-grid { display: grid; gap: 10px; }
.settings-grid.compact { grid-template-columns: repeat(2, minmax(0, 1fr)); }
label { display: grid; gap: 6px; color: var(--muted); font-size: .92rem; }
input, select { width: 100%; padding: 10px 12px; border: 1px solid var(--line); border-radius: 12px; background: white; }
.main-grid { display: grid; grid-template-columns: 1.4fr .8fr; gap: 20px; }
.section-head { display: flex; justify-content: space-between; gap: 12px; align-items: flex-start; margin-bottom: 16px; }
.section-head h2, .card h2 { margin: 0 0 6px; }
.category { border-top: 1px solid var(--line); padding-top: 8px; }
.category:first-of-type { border-top: none; padding-top: 0; }
.category-toggle { width: 100%; display: flex; justify-content: space-between; align-items: center; border-radius: 14px; margin: 8px 0; }
.table-wrap { overflow: auto; }
table { width: 100%; border-collapse: collapse; min-width: 820px; }
th, td { padding: 12px 10px; border-bottom: 1px solid #f0e8da; text-align: left; }
th { color: var(--muted); font-size: .84rem; text-transform: uppercase; letter-spacing: .03em; }
.qty-input { min-width: 110px; }
.renaissance-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.check { grid-template-columns: auto 1fr; align-items: center; gap: 10px; }
.check input { width: auto; }
.renaissance-summary, .summary-row { display: grid; grid-template-columns: 1fr auto; gap: 12px; align-items: center; }
.renaissance-summary { margin-top: 18px; gap: 10px; }
.summary-row { padding: 10px 0; border-bottom: 1px solid #f2ebdf; }
.summary-row.total { font-size: 1.05rem; font-weight: 700; }
.summary-row.accent strong { color: var(--gold-dark); font-size: 1.1rem; }
.flag-list.alert { border-color: #f0c7c7; background: var(--alert-bg); margin-bottom: 20px; }
.flag { background: white; color: var(--alert); border-left: 4px solid var(--alert); padding: 12px 14px; border-radius: 10px; margin-top: 10px; }
.sticky-card { position: sticky; top: 20px; }
@media (max-width: 1100px) { .hero, .toolbar, .main-grid { grid-template-columns: 1fr; } .sticky-card { position: static; } }
'''
with open(os.path.join(SRC,'styles.css'),'w') as f: f.write(css)

index_html = '''<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>S&S Design Build Estimator</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
'''
with open(os.path.join(APP_DIR,'index.html'),'w') as f: f.write(index_html)

package_json = {
  "name": "sns-design-build-estimator",
  "private": True,
  "version": "0.1.0",
  "type": "module",
  "scripts": {"dev": "vite", "build": "vite build", "preview": "vite preview"},
  "dependencies": {"react": "^18.3.1", "react-dom": "^18.3.1"},
  "devDependencies": {"vite": "^5.4.10"}
}
with open(os.path.join(APP_DIR,'package.json'),'w') as f: json.dump(package_json, f, indent=2)
with open(os.path.join(APP_DIR,'netlify.toml'),'w') as f: f.write('[build]\ncommand = "npm run build"\npublish = "dist"\n')

readme = '''# S&S Design Build Estimator

A Netlify-ready React/Vite web app built from the uploaded pricing sheets.

## What's included
- Standard pricing estimator using the uploaded `Estimating Template - 5.pdf` as the base sheet.
- Tier multipliers for Volume (-5%), 5% (base), 7.5% (+10%), 10% (+20%), and 15% (+30%).
- Renaissance estimator using the uploaded `Renaissance 40 - Sell Price.pdf`, plus derived 50 (+20%) and 60 (+30%) tiers.
- Sales tax logic set to tax only 40% of subtotal.
- Automatic $500 permit fee.
- Financing modeled as `totalNoFinancing * 1.10`, divided by 5, 10, or 15 years.
- Local browser persistence via `localStorage`.
- Copy-to-clipboard quote summary.
- Seeded rule warnings for concrete scope issues and flat-pan minimum-charge reminders.

## Important limitations before production use
1. This build is based only on the two uploaded PDFs.
2. Your requested "intelligence" rule engine is scaffolded, but only seeded with a few sample rules. Add the rest of your out-of-scope / restriction rules into `src/data.js`.
3. Automatic Renaissance post-sizing logic is not fully possible from the uploaded sheet alone because the post/beam sizing thresholds were not explicitly provided. The app currently lets the rep choose the upgrade manually.
4. The app style is inspired by the public S&S website (white surfaces, dark type, gold accents), but you should drop in the official logo asset for production.

## Local setup
```bash
npm install
npm run dev
```

## Build
```bash
npm install
npm run build
```

## GitHub + Netlify
1. Create a new empty GitHub repo.
2. Upload these files or push them with Git.
3. In Netlify, choose **Add new site** > **Import an existing project**.
4. Connect GitHub and pick the repo.
5. Build command: `npm run build`
6. Publish directory: `dist`
7. Deploy.

## Supabase?
Not needed for version 1. Add Supabase later only if you want:
- login per rep
- cloud-synced price sheets
- quote history
- commission tracking
- admin-only rules and pricing updates

## Source references used for this build
- Base 5 sheet pricing from the uploaded `Estimating Template - 5.pdf`.
- Renaissance 40 matrix and add-on pricing from the uploaded `Renaissance 40 - Sell Price.pdf`.
'''
with open(os.path.join(APP_DIR,'README.md'),'w') as f: f.write(readme)
print('[OK] generated app files')
