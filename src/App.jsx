import React, { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "./lib/supabase";
import { appData } from "./data";

const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const storageKey = "sns-design-build-estimator-v16";

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


function selectInputText(event) {
  if (typeof event?.target?.select === "function") {
    event.target.select();
  }
}


const validRoles = ["admin", "manager", "sales_rep"];

function formatRole(role) {
  return (role || "No role").replaceAll("_", " ");
}

function resolveRole(profile, session) {
  return profile?.role || session?.user?.app_metadata?.role || session?.user?.user_metadata?.role || null;
}

function getPermissions(role) {
  return {
    canUseEstimator: validRoles.includes(role),
    canViewTeamQuotes: role === "admin" || role === "manager",
    canManagePricing: role === "admin",
    canManageUsers: role === "admin",
    canReviewTeamPerformance: role === "admin" || role === "manager"
  };
}

function cleanJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function formatSupabaseError(error, fallback) {
  if (!error) return fallback;
  return error.message || error.details || error.hint || fallback;
}

function AccessDeniedScreen({ profile, onSignOut }) {
  return (
    <div className="auth-shell">
      <div className="auth-card card">
        <div className="brand-lockup auth-lockup">
          <img className="brand-logo" src="/logo-mark.png" alt="S&S Design Build" />
          <div>
            <h1>Access needs review</h1>
            <p>Your account is signed in, but it is missing a valid app role.</p>
          </div>
        </div>
        <div className="access-denied-box">
          <strong>Current role:</strong> {profile?.role || "No role assigned"}
          <p className="small-note">Ask an admin to set your role to sales_rep, manager, or admin in Supabase.</p>
        </div>
        <button className="auth-submit" type="button" onClick={onSignOut}>Sign out</button>
      </div>
    </div>
  );
}

function AccessPanel({ profile, permissions }) {
  return (
    <section className="access-panel card">
      <div className="section-head compact-head">
        <div>
          <h2>Protected access</h2>
          <p className="small-note">The estimator now understands rep, manager, and admin access.</p>
        </div>
        <span className={`role-pill role-${profile?.role || "none"}`}>{formatRole(profile?.role)}</span>
      </div>
      <div className="access-grid">
        <div className="access-item">
          <strong>Estimator access</strong>
          <span>{permissions.canUseEstimator ? "Enabled" : "Blocked"}</span>
          <p>Build quotes and use the estimator.</p>
        </div>
        <div className="access-item">
          <strong>Team quote visibility</strong>
          <span>{permissions.canViewTeamQuotes ? "Manager+" : "Own quotes only"}</span>
          <p>Managers and admins can review rep quotes and statuses.</p>
        </div>
        <div className="access-item">
          <strong>Pricing controls</strong>
          <span>{permissions.canManagePricing ? "Admin only" : "Locked"}</span>
          <p>Admins can now start editing pricing foundations from inside the app.</p>
        </div>
        <div className="access-item">
          <strong>User controls</strong>
          <span>{permissions.canManageUsers ? "Admin only" : "Locked"}</span>
          <p>Admins will manage users and roles from inside the app in a later step.</p>
        </div>
      </div>
    </section>
  );
}

function organizeCategories(categories) {
  const engineeringIds = new Set([
    "outdoor-living-engineering-wood-structures",
    "outdoor-living-engineering-renaissance",
    "outdoor-living-permitting"
  ]);
  const uiCategories = [];
  const engineeringItems = [];

  categories.forEach((cat) => {
    const kept = [];
    cat.items.forEach((item) => {
      if (engineeringIds.has(item.id)) engineeringItems.push(item);
      else kept.push(item);
    });
    if (kept.length) uiCategories.push({ ...cat, items: kept });
  });

  uiCategories.push({ name: "Engineering", items: engineeringItems });
  return uiCategories;
}

function normalizeCustomService(service, index = 0) {
  const category = String(service?.category || service?.categoryName || "Custom Services").trim() || "Custom Services";
  const name = String(service?.name || service?.service_name || "").trim();
  const unit = String(service?.unit || "Each").trim() || "Each";
  const basePrice = safeNumber(service?.basePrice ?? service?.price);
  const fallbackId = `custom-${slugify(category)}-${slugify(name || `item-${index + 1}`)}`;
  const id = String(service?.id || fallbackId).trim() || fallbackId;
  return { id, category, name, unit, basePrice: +basePrice.toFixed(2) };
}

function mergeCategoriesWithCustomServices(baseCategories, customServices) {
  const merged = baseCategories.map((cat) => ({ ...cat, items: [...cat.items] }));
  const byName = new Map(merged.map((cat) => [cat.name, cat]));

  (customServices || []).forEach((raw, index) => {
    const service = normalizeCustomService(raw, index);
    if (!service.name || !Number.isFinite(service.basePrice)) return;
    let category = byName.get(service.category);
    if (!category) {
      category = { name: service.category, items: [] };
      merged.push(category);
      byName.set(service.category, category);
    }
    const existingIndex = category.items.findIndex((item) => item.id === service.id);
    const item = { id: service.id, name: service.name, unit: service.unit, basePrice: service.basePrice, isCustom: true };
    if (existingIndex >= 0) category.items[existingIndex] = item;
    else category.items.push(item);
  });

  return merged.filter((cat) => cat.items.length);
}

function buildRenaissanceStylesWithOverrides(styles, percentUpdate) {
  const merged = JSON.parse(JSON.stringify(styles || {}));
  const percent = safeNumber(percentUpdate);
  const factor = 1 + percent / 100;
  Object.keys(merged).forEach((styleKey) => {
    Object.keys(merged[styleKey] || {}).forEach((projection) => {
      Object.keys(merged[styleKey][projection] || {}).forEach((width) => {
        merged[styleKey][projection][width] = +(safeNumber(merged[styleKey][projection][width]) * factor).toFixed(2);
      });
    });
  });
  return merged;
}

const baseUiCategories = organizeCategories(appData.categories);
const defaultLineState = Object.fromEntries(baseUiCategories.flatMap((cat) => cat.items.map((item) => [item.id, ""])));
const defaultExpanded = Object.fromEntries(baseUiCategories.map((cat) => [cat.name, false]));
const defaultTierMultipliers = Object.fromEntries(Object.entries(appData.pricingTiers).map(([key, tier]) => [key, tier.multiplier]));
const defaultLinePrices = Object.fromEntries(baseUiCategories.flatMap((cat) => cat.items.map((item) => [item.id, item.basePrice])));
const widthOptions = [0, ...Array.from({ length: 31 }, (_, i) => i + 10)];
const projectionOptions = [0, ...Array.from({ length: 21 }, (_, i) => i + 10)];

const defaultRenaissance = {
  section: "Moderno",
  mount: "Attached",
  profile: "Straight",
  width: 0,
  projection: 0,
  panelType: "3standard",
  postCountOverride: "",
  beamLength: 0,
  fanBeams: 0,
  postUpgrade: "none",
  beamUpgrade: "none",
  supportUpgrade: "none",
  frontOverhang: 0,
  sideOverhang: 0,
  roofColor: false,
  upgradeFoam: false,
  upgrade032: false,
  deductPosts: 0,
  supportBeams: 0,
  windSpeed: 110,
  exposure: "B"
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
  county: "",
  depositAmount: "",
  darkMode: false,
  showCommission: true,
  removePermit: false,
  showNoFinancingTotal: true
};

const defaultCustomer = {
  name: "",
  email: "",
  phone: ""
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
  if (width <= 16) return 2;
  if (width <= 26) return 3;
  if (width <= 34) return 4;
  return 5;
}

const windSpeedOptions = [110, 120, 130, 140, 150, 160, 156, 165, 170, 175, 180, 186];
const exposureOptions = ["B", "C", "D"];

const spanTables = {
  Moderno: {
    windSpans: {
      110: { 8: 19.6, 10: 18.4, 12: 17.4, 14: 16.7, 15: 16.4, 16: 16.1 },
      120: { 8: 19.2, 10: 18.1, 12: 17.1, 14: 16.3, 15: 16.1, 16: 15.8 },
      130: { 8: 18.9, 10: 17.8, 12: 16.8, 14: 16.0, 15: 15.8, 16: 15.5 },
      140: { 8: 18.5, 10: 17.5, 12: 16.5, 14: 15.8, 15: 15.6, 16: 15.3 },
      150: { 8: 18.3, 10: 17.3, 12: 16.3, 14: 15.6, 15: 15.4, 16: 15.1 },
      160: { 8: 17.9, 10: 16.9, 12: 16.0, 14: 15.3, 15: 15.1, 16: 14.8 },
      156: { 8: 17.9, 10: 16.9, 12: 16.0, 14: 15.3, 15: 15.1, 16: 14.8 },
      165: { 8: 17.8, 10: 16.7, 12: 15.8, 14: 15.2, 15: 14.9, 16: 14.6 },
      170: { 8: 17.6, 10: 16.5, 12: 15.7, 14: 15.0, 15: 14.7, 16: 14.5 },
      175: { 8: 17.4, 10: 16.3, 12: 15.5, 14: 14.8, 15: 14.5, 16: 14.3 },
      180: { 8: 17.3, 10: 16.2, 12: 15.4, 14: 14.7, 15: 14.4, 16: 14.2 },
      186: { 8: 17.0, 10: 15.9, 12: 15.1, 14: 14.4, 15: 14.2, 16: 13.9 }
    },
    exposureFactors: { none: { B: 1.0, C: 0.97, D: 0.93 }, hd: { B: 1.15, C: 1.11, D: 1.07 }, wide: { B: 1.29, C: 1.25, D: 1.20 }, wideInsert: { B: 1.56, C: 1.51, D: 1.45 } }
  },
  Contempo: {
    windSpans: {
      110: { 8: 19.6, 10: 18.4, 12: 17.4, 14: 16.9, 15: 16.3, 16: 16.1 },
      120: { 8: 19.2, 10: 18.1, 12: 17.1, 14: 16.3, 15: 16.1, 16: 15.8 },
      130: { 8: 18.9, 10: 17.8, 12: 16.8, 14: 16.0, 15: 15.8, 16: 15.5 },
      140: { 8: 18.5, 10: 17.4, 12: 16.5, 14: 15.8, 15: 15.6, 16: 15.2 },
      150: { 8: 18.3, 10: 17.3, 12: 16.3, 14: 15.6, 15: 15.4, 16: 15.1 },
      160: { 8: 17.9, 10: 16.9, 12: 16.0, 14: 15.3, 15: 15.1, 16: 14.8 },
      156: { 8: 17.9, 10: 16.9, 12: 16.0, 14: 15.4, 15: 15.0, 16: 14.8 },
      165: { 8: 17.8, 10: 16.7, 12: 15.8, 14: 15.2, 15: 14.9, 16: 14.6 },
      170: { 8: 17.6, 10: 16.5, 12: 15.7, 14: 15.1, 15: 14.7, 16: 14.5 },
      175: { 8: 17.4, 10: 16.3, 12: 15.5, 14: 14.8, 15: 14.5, 16: 14.3 },
      180: { 8: 17.3, 10: 16.2, 12: 15.4, 14: 14.7, 15: 14.4, 16: 14.2 },
      186: { 8: 17.0, 10: 15.9, 12: 15.1, 14: 14.4, 15: 14.2, 16: 13.9 }
    },
    exposureFactors: { none: { B: 1.0, C: 0.96, D: 0.93 }, hd: { B: 1.15, C: 1.11, D: 1.07 }, wide: { B: 1.29, C: 1.25, D: 1.20 }, wideInsert: { B: 1.56, C: 1.51, D: 1.45 } }
  },
  Classico: {
    windSpans: {
      110: { 8: 19.4, 10: 18.3, 12: 17.2, 14: 16.5, 15: 16.3, 16: 16.0 },
      120: { 8: 19.0, 10: 17.9, 12: 16.9, 14: 16.2, 15: 16.0, 16: 15.7 },
      130: { 8: 18.7, 10: 17.6, 12: 16.6, 14: 15.9, 15: 15.7, 16: 15.4 },
      140: { 8: 18.4, 10: 17.3, 12: 16.4, 14: 15.7, 15: 15.4, 16: 15.1 },
      150: { 8: 18.2, 10: 17.1, 12: 16.2, 14: 15.5, 15: 15.3, 16: 15.0 },
      160: { 8: 17.8, 10: 16.8, 12: 15.9, 14: 15.2, 15: 14.9, 16: 14.7 },
      156: { 8: 17.8, 10: 16.8, 12: 15.9, 14: 15.3, 15: 14.9, 16: 14.7 },
      165: { 8: 17.6, 10: 16.6, 12: 15.7, 14: 15.1, 15: 14.8, 16: 14.5 },
      170: { 8: 17.5, 10: 16.4, 12: 15.6, 14: 14.9, 15: 14.6, 16: 14.4 },
      175: { 8: 17.3, 10: 16.2, 12: 15.4, 14: 14.7, 15: 14.5, 16: 14.2 },
      180: { 8: 17.2, 10: 16.1, 12: 15.3, 14: 14.6, 15: 14.3, 16: 14.1 },
      186: { 8: 16.9, 10: 15.8, 12: 15.0, 14: 14.4, 15: 14.1, 16: 13.9 }
    },
    exposureFactors: { none: { B: 1.0, C: 0.97, D: 0.94 }, hd: { B: 1.15, C: 1.11, D: 1.07 }, wide: { B: 1.29, C: 1.26, D: 1.21 }, wideInsert: { B: 1.55, C: 1.51, D: 1.45 } }
  },
  Fresco: {
    windSpans: {
      110: { 8: 19.7, 10: 18.6, 12: 17.7, 14: 16.9, 15: 16.6, 16: 16.2 },
      120: { 8: 19.3, 10: 18.2, 12: 17.3, 14: 16.6, 15: 16.2, 16: 15.9 },
      130: { 8: 19.0, 10: 17.9, 12: 17.0, 14: 16.3, 15: 15.9, 16: 15.66 },
      140: { 8: 18.6, 10: 17.6, 12: 16.7, 14: 16.0, 15: 15.6, 16: 15.4 },
      150: { 8: 18.4, 10: 17.4, 12: 16.5, 14: 15.8, 15: 15.5, 16: 15.2 },
      160: { 8: 18.0, 10: 17.0, 12: 16.1, 14: 15.4, 15: 15.1, 16: 14.9 },
      156: { 8: 18.0, 10: 17.0, 12: 16.1, 14: 15.4, 15: 15.1, 16: 14.9 },
      165: { 8: 17.9, 10: 16.8, 12: 16.0, 14: 15.3, 15: 15.0, 16: 14.7 },
      170: { 8: 17.7, 10: 16.7, 12: 15.8, 14: 15.1, 15: 14.8, 16: 14.6 },
      175: { 8: 17.5, 10: 16.5, 12: 15.7, 14: 15.0, 15: 14.7, 16: 14.4 },
      180: { 8: 17.4, 10: 16.3, 12: 15.5, 14: 14.8, 15: 14.6, 16: 14.3 },
      186: { 8: 17.0, 10: 16.0, 12: 15.2, 14: 14.6, 15: 14.3, 16: 14.0 }
    },
    exposureFactors: { none: { B: 1.0, C: 0.97, D: 0.93 }, hd: { B: 1.15, C: 1.11, D: 1.07 }, wide: { B: 1.29, C: 1.26, D: 1.21 }, wideInsert: { B: 1.56, C: 1.51, D: 1.45 } }
  },
  Aria: {
    windSpans: {
      110: { 8: 26.6, 10: 25.1, 12: 23.9, 14: 22.9, 15: 22.4, 16: 22.0 },
      120: { 8: 26.2, 10: 24.7, 12: 23.5, 14: 22.5, 15: 22.1, 16: 21.7 },
      130: { 8: 25.8, 10: 24.3, 12: 23.1, 14: 22.2, 15: 21.7, 16: 21.3 },
      140: { 8: 25.4, 10: 24.0, 12: 22.8, 14: 21.8, 15: 21.4, 16: 21.0 },
      150: { 8: 25.2, 10: 23.7, 12: 22.6, 14: 21.6, 15: 21.2, 16: 20.8 },
      160: { 8: 24.7, 10: 23.3, 12: 22.2, 14: 21.2, 15: 20.8, 16: 20.4 },
      156: { 8: 24.7, 10: 23.3, 12: 22.2, 14: 21.2, 15: 20.8, 16: 20.4 },
      165: { 8: 24.5, 10: 23.1, 12: 22.0, 14: 21.0, 15: 20.6, 16: 20.2 },
      170: { 8: 24.3, 10: 22.9, 12: 21.8, 14: 20.8, 15: 20.4, 16: 20.1 },
      175: { 8: 24.1, 10: 22.7, 12: 21.6, 14: 20.7, 15: 20.3, 16: 19.9 },
      180: { 8: 23.9, 10: 22.5, 12: 21.4, 14: 20.5, 15: 20.1, 16: 19.7 },
      186: { 8: 23.5, 10: 22.2, 12: 21.1, 14: 20.2, 15: 19.8, 16: 19.4 }
    },
    exposureFactors: { none: { B: 1.0, C: 0.97, D: 0.93 }, hd: { B: 1.14, C: 1.11, D: 1.07 }, wide: { B: 1.28, C: 1.25, D: 1.21 }, wideInsert: { B: 1.54, C: 1.50, D: 1.45 } }
  }
};

function getBaseAllowedSpan(section, projection, windSpeed = 110) {
  const table = spanTables[section];
  if (!table) return 0;
  const spans = table.windSpans?.[windSpeed] || table.windSpans?.[110] || {};
  const keys = Object.keys(spans).map(Number).sort((a,b)=>a-b);
  if (spans[projection]) return spans[projection];
  if (projection < keys[0]) return spans[keys[0]];
  if (projection > keys[keys.length - 1]) {
    const p16 = spans[16];
    const p15 = spans[15];
    const step = p15 - p16 || 0.3;
    return Math.max(8, +(p16 - step * (projection - 16)).toFixed(2));
  }
  let lower = keys[0], upper = keys[keys.length - 1];
  for (let i = 0; i < keys.length - 1; i += 1) {
    if (projection > keys[i] && projection < keys[i + 1]) {
      lower = keys[i];
      upper = keys[i + 1];
      break;
    }
  }
  const ratio = (projection - lower) / (upper - lower);
  return +(spans[lower] + (spans[upper] - spans[lower]) * ratio).toFixed(2);
}

function getAllowedSpan(section, effectiveProjection, upgrade, windSpeed = 110, exposure = "B") {
  const base = getBaseAllowedSpan(section, effectiveProjection, windSpeed);
  const factor = spanTables[section]?.exposureFactors?.[upgrade]?.[exposure] || 1;
  return +(base * factor).toFixed(2);
}

function getRequiredPostsBySpan(width, allowedSpan) {
  if (!width || !allowedSpan) return 0;
  return Math.ceil(width / allowedSpan) + 1;
}

function getProjectionSegments(projection, supportBeams) {
  return supportBeams + 1 > 0 ? projection / (supportBeams + 1) : projection;
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

function interpolateFromRow(row, width) {
  if (!row || !width) return 0;
  const widths = Object.keys(row).map(Number).sort((a, b) => a - b);
  if (!widths.length) return 0;
  if (row[String(width)]) return safeNumber(row[String(width)]);
  if (width < widths[0] || width > widths[widths.length - 1]) return 0;
  let lower = widths[0], upper = widths[widths.length - 1];
  for (let i = 0; i < widths.length - 1; i += 1) {
    if (width > widths[i] && width < widths[i + 1]) {
      lower = widths[i];
      upper = widths[i + 1];
      break;
    }
  }
  const low = safeNumber(row[String(lower)]);
  const high = safeNumber(row[String(upper)]);
  if (!low || !high) return 0;
  const ratio = (width - lower) / (upper - lower);
  return Math.round(low + (high - low) * ratio);
}

function getBaseProjectionPrice(table, width, projection) {
  if (!width || !projection) return 0;
  const p = Number(projection);
  const exactRow = table?.[String(p)];
  if (exactRow) return interpolateFromRow(exactRow, width);

  const rows = Object.keys(table || {}).map(Number).sort((a, b) => a - b);
  if (!rows.length) return 0;

  if (p > 16) {
    const p16 = interpolateFromRow(table?.["16"], width);
    const p15 = interpolateFromRow(table?.["15"], width);
    if (!p16 || !p15) return 0;
    const step = p16 - p15;
    return Math.round(p16 + step * (p - 16));
  }

  let lower = rows[0], upper = rows[rows.length - 1];
  for (let i = 0; i < rows.length - 1; i += 1) {
    if (p > rows[i] && p < rows[i + 1]) {
      lower = rows[i];
      upper = rows[i + 1];
      break;
    }
  }
  const low = interpolateFromRow(table?.[String(lower)], width);
  const high = interpolateFromRow(table?.[String(upper)], width);
  if (!low || !high) return 0;
  const ratio = (p - lower) / (upper - lower);
  return Math.round(low + (high - low) * ratio);
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "item";
}

function getFanBeamUnit(addOns, projection) {
  if (projection === 10) {
    const explicit10 = safeNumber(addOns.fanBeamByProjection?.["10"]);
    if (explicit10) return explicit10;
  }
  const mapped = safeNumber(addOns.fanBeamByProjection?.[String(projection)]);
  if (mapped) return mapped;
  const p11 = safeNumber(addOns.fanBeamByProjection?.["11"]);
  const p12 = safeNumber(addOns.fanBeamByProjection?.["12"]);
  if (projection === 10 && p11 && p12) return Math.round(p11 - (p12 - p11));
  if (projection < 10) return 0;
  const p18 = safeNumber(addOns.fanBeamByProjection?.["18"]);
  const p17 = safeNumber(addOns.fanBeamByProjection?.["17"]);
  const step = p18 && p17 ? p18 - p17 : 25;
  return Math.round(p18 + step * (projection - 18));
}

function AuthScreen({ email, password, setEmail, setPassword, onSubmit, loading, error }) {
  return (
    <div className="auth-shell">
      <div className="auth-card card">
        <div className="brand-lockup auth-lockup">
          <img className="brand-logo" src="/logo-mark.png" alt="S&S Design Build" />
          <div>
            <h1>S&amp;S Design Build</h1>
            <p>Sign in with your rep email and password to open the estimator.</p>
          </div>
        </div>

        <form className="auth-form" onSubmit={onSubmit}>
          <label>
            Email
            <input
              type="email"
              autoComplete="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>

          <label>
            Password
            <input
              type="password"
              autoComplete="current-password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>

          {error ? <div className="auth-error">{error}</div> : null}

          <button className="auth-submit" type="submit" disabled={loading}>
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p className="auth-help">
          Admin can create rep accounts in Supabase. Role access is now enforced for reps, managers, and admins.
        </p>
      </div>
    </div>
  );
}

function App() {
  const [selectedTier, setSelectedTier] = useState("tier5");
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [lineQtys, setLineQtys] = useState(defaultLineState);
  const [settings, setSettings] = useState(defaultSettings);
  const [customer, setCustomer] = useState(defaultCustomer);
  const [savedQuotes, setSavedQuotes] = useState([]);
  const [quotesLoading, setQuotesLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [selectedQuoteId, setSelectedQuoteId] = useState(null);
  const [selectedQuoteStatus, setSelectedQuoteStatus] = useState("draft");
  const [quoteScope, setQuoteScope] = useState("mine");
  const [quoteStatusFilter, setQuoteStatusFilter] = useState("all");
  const [selectedPlanId, setSelectedPlanId] = useState(financingPlans[0].id);
  const [renaissance, setRenaissance] = useState(defaultRenaissance);
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [toolbarOpen, setToolbarOpen] = useState(true);
  const [renaissanceOpen, setRenaissanceOpen] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [financingOpen, setFinancingOpen] = useState(false);
  const [activeView, setActiveView] = useState("standard");
  const [searchTerm, setSearchTerm] = useState("");
  const [pricingOverrides, setPricingOverrides] = useState({ appDefaults: {}, tierMultipliers: {}, linePrices: {}, customServices: [], renaissanceTablePercent: 0, renaissanceAddOns: {} });
  const [pricingDraft, setPricingDraft] = useState({ appDefaults: {}, tierMultipliers: {}, linePrices: {}, customServices: [], renaissanceTablePercent: 0, renaissanceAddOns: {} });
  const [pricingLoading, setPricingLoading] = useState(false);
  const [pricingSaving, setPricingSaving] = useState(false);
  const [pricingMessage, setPricingMessage] = useState("");
  const [pricingEditorOpen, setPricingEditorOpen] = useState(false);
  const [pricingEditorSearch, setPricingEditorSearch] = useState("");
  const [newServiceDraft, setNewServiceDraft] = useState({ category: "Custom Services", name: "", unit: "Each", basePrice: "" });
    const touchStartX = useRef(null);

  useEffect(() => {
    let isMounted = true;

    supabase.auth.getSession().then(({ data, error }) => {
      if (!isMounted) return;
      if (error) console.error("Supabase session error", error);
      setSession(data?.session ?? null);
      setAuthReady(true);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession ?? null);
      setAuthReady(true);
    });

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session?.user?.id) {
      setProfile(null);
      setProfileLoading(false);
      return;
    }

    let isMounted = true;
    setProfileLoading(true);

    supabase
      .from("profiles")
      .select("id, full_name, email, role")
      .eq("id", session.user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!isMounted) return;
        if (error) {
          console.error("Profile fetch failed", error);
          setProfile(null);
          setProfileLoading(false);
          return;
        }
        if (data) {
          setProfile(data);
          setProfileLoading(false);
          return;
        }

        const fallbackProfile = {
          id: session.user.id,
          full_name: session.user.user_metadata?.full_name || "",
          email: session.user.email || "",
          role: session.user.app_metadata?.role || session.user.user_metadata?.role || null
        };

        supabase
          .from("profiles")
          .upsert(fallbackProfile, { onConflict: "id" })
          .select("id, full_name, email, role")
          .single()
          .then(({ data: upserted, error: upsertError }) => {
            if (!isMounted) return;
            if (upsertError) {
              console.error("Profile bootstrap failed", upsertError);
              setProfile(fallbackProfile);
              setProfileLoading(false);
              return;
            }
            setProfile(upserted ?? fallbackProfile);
            setProfileLoading(false);
          });
      });

    return () => {
      isMounted = false;
    };
  }, [session?.user?.id]);

  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (!saved) return;

    try {
      const parsed = JSON.parse(saved);

      if (parsed.selectedTier && appData.pricingTiers[parsed.selectedTier]) setSelectedTier(parsed.selectedTier);
      if (parsed.lineQtys && typeof parsed.lineQtys === "object") setLineQtys({ ...defaultLineState, ...parsed.lineQtys });
      if (parsed.settings && typeof parsed.settings === "object") setSettings({ ...defaultSettings, ...parsed.settings });
      if (parsed.customer && typeof parsed.customer === "object") setCustomer({ ...defaultCustomer, ...parsed.customer });
      if (parsed.selectedPlanId && financingPlans.some((plan) => plan.id === parsed.selectedPlanId)) setSelectedPlanId(parsed.selectedPlanId);
      if (parsed.renaissance && typeof parsed.renaissance === "object") setRenaissance({ ...defaultRenaissance, ...parsed.renaissance, tier: undefined });
      if (parsed.expanded && typeof parsed.expanded === "object") setExpanded({ ...defaultExpanded, ...parsed.expanded });
      if (typeof parsed.toolbarOpen === "boolean") setToolbarOpen(parsed.toolbarOpen);
      if (typeof parsed.renaissanceOpen === "boolean") setRenaissanceOpen(parsed.renaissanceOpen);
      if (typeof parsed.financingOpen === "boolean") setFinancingOpen(parsed.financingOpen);
      if (["standard", "renaissance"].includes(parsed.activeView)) setActiveView(parsed.activeView);
      if (typeof parsed.searchTerm === "string") setSearchTerm(parsed.searchTerm);
      if (typeof parsed.selectedQuoteId === "string" || parsed.selectedQuoteId === null) setSelectedQuoteId(parsed.selectedQuoteId);
      if (["draft", "sent", "accepted", "declined"].includes(parsed.selectedQuoteStatus)) setSelectedQuoteStatus(parsed.selectedQuoteStatus);
      if (["mine", "team"].includes(parsed.quoteScope)) setQuoteScope(parsed.quoteScope);
      if (["all", "draft", "sent", "accepted", "declined"].includes(parsed.quoteStatusFilter)) setQuoteStatusFilter(parsed.quoteStatusFilter);
    } catch (err) {
      console.error("Failed to load saved estimator state:", err);
      localStorage.removeItem(storageKey);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(
      storageKey,
      JSON.stringify({ selectedTier, lineQtys, settings, customer, selectedPlanId, renaissance, expanded, toolbarOpen, renaissanceOpen, financingOpen, activeView, searchTerm, selectedQuoteId, selectedQuoteStatus, quoteScope, quoteStatusFilter })
    );
  }, [selectedTier, lineQtys, settings, customer, selectedPlanId, renaissance, expanded, toolbarOpen, renaissanceOpen, financingOpen, activeView, searchTerm, selectedQuoteId, selectedQuoteStatus, quoteScope, quoteStatusFilter]);

  const pricingTiers = useMemo(() => Object.fromEntries(Object.entries(appData.pricingTiers).map(([key, tier]) => [key, { ...tier, multiplier: pricingOverrides.tierMultipliers?.[key] ?? tier.multiplier }])), [pricingOverrides.tierMultipliers]);
  const effectiveAppDefaults = useMemo(() => ({ ...appData.defaultSettings, ...pricingOverrides.appDefaults }), [pricingOverrides.appDefaults]);
  const mergedRenaissanceStyles = useMemo(() => buildRenaissanceStylesWithOverrides(appData.renaissance.styles, pricingOverrides.renaissanceTablePercent), [pricingOverrides.renaissanceTablePercent]);
  const renaissanceAddOns = useMemo(() => ({
    ...appData.renaissance.addOns,
    ...pricingOverrides.renaissanceAddOns,
    fanBeamByProjection: {
      ...appData.renaissance.addOns.fanBeamByProjection,
      ...(pricingOverrides.renaissanceAddOns?.fanBeamByProjection || {})
    },
    postUpgradeEach: {
      ...appData.renaissance.addOns.postUpgradeEach,
      ...(pricingOverrides.renaissanceAddOns?.postUpgradeEach || {})
    },
    beamUpgradePerFoot: {
      ...appData.renaissance.addOns.beamUpgradePerFoot,
      ...(pricingOverrides.renaissanceAddOns?.beamUpgradePerFoot || {})
    }
  }), [pricingOverrides.renaissanceAddOns]);
  const categories = useMemo(() => mergeCategoriesWithCustomServices(
    baseUiCategories.map((cat) => ({ ...cat, items: cat.items.map((item) => ({ ...item, basePrice: pricingOverrides.linePrices?.[item.id] ?? item.basePrice })) })),
    pricingOverrides.customServices
  ), [pricingOverrides.linePrices, pricingOverrides.customServices]);

  useEffect(() => {
    setExpanded((current) => {
      const next = { ...current };
      let changed = false;
      categories.forEach((cat) => {
        if (!(cat.name in next)) {
          next[cat.name] = false;
          changed = true;
        }
      });
      return changed ? next : current;
    });
  }, [categories]);

  useEffect(() => {
    document.documentElement.dataset.theme = settings.darkMode ? "dark" : "light";
  }, [settings.darkMode]);

  useEffect(() => {
    setPricingDraft({
      appDefaults: {
        taxRate: String(effectiveAppDefaults.taxRate ?? ""),
        taxablePortion: String(effectiveAppDefaults.taxablePortion ?? ""),
        permittingFee: String(effectiveAppDefaults.permittingFee ?? ""),
        financingMarkup: String(effectiveAppDefaults.financingMarkup ?? "")
      },
      tierMultipliers: Object.fromEntries(Object.keys(pricingTiers).map((key) => [key, String(pricingTiers[key]?.multiplier ?? "")])),
      linePrices: Object.fromEntries(baseUiCategories.flatMap((cat) => cat.items.map((item) => [item.id, String(pricingOverrides.linePrices?.[item.id] ?? item.basePrice)]))),
      customServices: (pricingOverrides.customServices || []).map((service, index) => normalizeCustomService(service, index)),
      renaissanceTablePercent: String(pricingOverrides.renaissanceTablePercent ?? 0),
      renaissanceAddOns: cleanJson(renaissanceAddOns)
    });
  }, [effectiveAppDefaults, pricingTiers, pricingOverrides.linePrices, pricingOverrides.customServices, pricingOverrides.renaissanceTablePercent, renaissanceAddOns]);

  useEffect(() => {
    setRenaissance((current) => ({ ...current, beamLength: Math.max(safeNumber(current.width) - safeNumber(current.sideOverhang) * 2, 0) }));
  }, [renaissance.width, renaissance.sideOverhang]);

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

  useEffect(() => {
    const framedProjection = Math.max(safeNumber(renaissance.projection) - safeNumber(renaissance.frontOverhang), 0);
    const framedWidth = Math.max(safeNumber(renaissance.width) - safeNumber(renaissance.sideOverhang) * 2, 0);
    const effectiveProjection = framedProjection ? getProjectionSegments(framedProjection, safeNumber(renaissance.supportBeams)) : 0;
    const validOptions = ["none", "hd", "wide", "wideInsert"].filter((upgradeKey) => {
      const allowed = getAllowedSpan(renaissance.section, Math.max(8, Math.min(30, effectiveProjection || 8)), upgradeKey, renaissance.windSpeed, renaissance.exposure);
      const postCount = safeNumber(renaissance.postCountOverride || getRequiredPostCount(framedWidth));
      return !framedWidth || !postCount || framedWidth <= allowed * Math.max(postCount - 1, 1);
    });

    if (validOptions.length && !validOptions.includes(renaissance.beamUpgrade)) {
      setRenaissance((current) => ({ ...current, beamUpgrade: validOptions[0], postUpgrade: validOptions[0] }));
    }
  }, [renaissance.section, renaissance.width, renaissance.projection, renaissance.frontOverhang, renaissance.sideOverhang, renaissance.supportBeams, renaissance.postCountOverride, renaissance.beamUpgrade, renaissance.windSpeed, renaissance.exposure]);

  const activeTier = pricingTiers[selectedTier] || pricingTiers.tier5 || appData.pricingTiers.tier5;
  const currentRole = resolveRole(profile, session);
  const permissions = getPermissions(currentRole);
  const hasValidRole = !currentRole || validRoles.includes(currentRole);
  const selectedPlan = financingPlans.find((plan) => plan.id === selectedPlanId) || financingPlans[0];

  useEffect(() => {
    if (permissions.canViewTeamQuotes) return;
    if (quoteScope !== "mine") setQuoteScope("mine");
  }, [permissions.canViewTeamQuotes, quoteScope]);

  const currentRenaissanceOptions = renaissanceSectionOptions[renaissance.section] || renaissanceSectionOptions.Moderno;
  const renaissanceStyleKey = renaissance.section;

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredCategories = useMemo(() => categories.map((cat) => ({
    ...cat,
    items: cat.items.filter((item) => !normalizedSearch || item.name.toLowerCase().includes(normalizedSearch) || cat.name.toLowerCase().includes(normalizedSearch))
  })).filter((cat) => cat.items.length), [categories, normalizedSearch]);

  const lineItems = useMemo(
    () =>
      categories.flatMap((cat) =>
        cat.items.map((item) => {
          const qty = safeNumber(lineQtys[item.id] || 0);
          const extended = qty * item.basePrice * activeTier.multiplier;
          return { ...item, category: cat.name, qty, extended, displayPrice: item.basePrice * activeTier.multiplier };
        })
      ),
    [categories, lineQtys, activeTier.multiplier]
  );

  const activeItems = lineItems.filter((item) => item.qty > 0);
  const activeCategoryNames = new Set(activeItems.map((item) => item.category));

  const renaissanceCalc = useMemo(() => {
    const key = getRenaissanceKey(renaissance.section, renaissance.mount, renaissance.profile);
    const table = mergedRenaissanceStyles[key] || {};
    const width = safeNumber(renaissance.width);
    const projection = safeNumber(renaissance.projection);
    const frontOverhang = safeNumber(renaissance.frontOverhang);
    const sideOverhang = safeNumber(renaissance.sideOverhang);
    const framedWidth = Math.max(width - sideOverhang * 2, 0);
    const framedProjection = Math.max(projection - frontOverhang, 0);
    const base = getBaseProjectionPrice(table, width, projection);
    const tierMultiplier = activeTier.multiplier;
    const panelMeta = getPanelTypeMeta(renaissance.panelType, renaissance.upgradeFoam, renaissance.upgrade032);
    const supportBeams = safeNumber(renaissance.supportBeams);
    const effectiveProjection = framedProjection ? +getProjectionSegments(framedProjection, supportBeams).toFixed(2) : 0;
    const minSupportBeamsForPanels = framedProjection ? Math.max(0, Math.ceil(framedProjection / panelMeta.maxProjection) - 1) : 0;
    const allowedMainSpan = getAllowedSpan(renaissance.section, Math.max(8, Math.min(30, effectiveProjection || 8)), renaissance.beamUpgrade, renaissance.windSpeed, renaissance.exposure);
    const legendPostCountRequired = getRequiredPostCount(framedWidth);
    const spanPostCountRequired = getRequiredPostsBySpan(framedWidth, allowedMainSpan);
    const postCountRequired = Math.max(legendPostCountRequired, spanPostCountRequired);
    const postCount = safeNumber(renaissance.postCountOverride || postCountRequired);
    const beamLength = framedWidth || 0;
    const rsqft = roofSqft(renaissance.mount, width, projection);
    const addOns = renaissanceAddOns;
    const fanBeamUnit = getFanBeamUnit(addOns, projection);
    const fanBeamCount = safeNumber(renaissance.fanBeams);

    const baseTiered = base * tierMultiplier * panelMeta.multiplier;
    const adders = [];

    if (renaissance.roofColor && rsqft) adders.push({ label: "Roof color", amount: rsqft * addOns.customRoofColorPerSqft * tierMultiplier });
    if (panelMeta.includesHeavyFoam && rsqft) adders.push({ label: "Heavy foam upgrade", amount: rsqft * addOns.heavyFoamPerSqft * tierMultiplier });
    if (panelMeta.includes032 && rsqft) adders.push({ label: ".032 skin upgrade", amount: rsqft * addOns.alum032PerSqft * tierMultiplier });

    const postUpgradeAmount = postCount * safeNumber(addOns.postUpgradeEach?.[renaissance.postUpgrade]) * tierMultiplier;
    if (postUpgradeAmount) adders.push({ label: `Front/main post upgrade (${renaissance.postUpgrade})`, amount: postUpgradeAmount });

    const beamUpgradeRate = safeNumber(addOns.beamUpgradePerFoot?.[renaissance.beamUpgrade]);
    const selectedPostUpgradeRate = safeNumber(addOns.postUpgradeEach?.[renaissance.postUpgrade]);
    const standardSupportPostRate = +(safeNumber(addOns.postUpgradeEach?.hd) * 0.9).toFixed(2);
    const standardSupportBeamRate = +(safeNumber(addOns.beamUpgradePerFoot?.hd) * 0.9).toFixed(2);
    const supportBeamRate = renaissance.supportUpgrade === "none" ? standardSupportBeamRate : safeNumber(addOns.beamUpgradePerFoot?.[renaissance.supportUpgrade]);
    const supportPostRate = renaissance.supportUpgrade === "none" ? standardSupportPostRate : safeNumber(addOns.postUpgradeEach?.[renaissance.supportUpgrade]);

    const beamUpgradeAmount = beamLength * beamUpgradeRate * tierMultiplier;
    if (beamUpgradeAmount) adders.push({ label: `Front/main beam upgrade (${renaissance.beamUpgrade})`, amount: beamUpgradeAmount });

    const supportRowBeamAmount = supportBeams * beamLength * supportBeamRate * tierMultiplier;
    if (supportRowBeamAmount) adders.push({ label: `Added support beam row(s) x${supportBeams}`, amount: supportRowBeamAmount });

    const supportRowPostAmount = supportBeams * postCount * supportPostRate * tierMultiplier;
    if (supportRowPostAmount) adders.push({ label: `Added support post row(s) x${supportBeams}`, amount: supportRowPostAmount });

    const fanBeamAmount = fanBeamCount > 0 ? fanBeamCount * fanBeamUnit * tierMultiplier : 0;
    if (fanBeamCount > 0 && fanBeamAmount) adders.push({ label: `Fan beam(s) @ ${projection}'`, amount: fanBeamAmount });

    const deductPostAmount = safeNumber(renaissance.deductPosts) * safeNumber(addOns.deductPost) * tierMultiplier;
    if (deductPostAmount) adders.push({ label: "Deduct post(s)", amount: deductPostAmount });

    const totalAdders = adders.reduce((sum, item) => sum + item.amount, 0);
    const maxWidthWithCurrentSetup = allowedMainSpan && postCount > 1 ? +(allowedMainSpan * (postCount - 1)).toFixed(2) : 0;
    const validUpgradeOptions = ["none", "hd", "wide", "wideInsert"].filter((upgradeKey) => {
      const span = getAllowedSpan(renaissance.section, Math.max(8, Math.min(30, effectiveProjection || 8)), upgradeKey, renaissance.windSpeed, renaissance.exposure);
      return !framedWidth || !postCount || framedWidth <= span * Math.max(postCount - 1, 1);
    });

    return {
      key,
      width,
      projection,
      frontOverhang,
      sideOverhang,
      framedWidth,
      framedProjection,
      base,
      rsqft,
      beamLength,
      panelMeta,
      tierMultiplier,
      fanBeamUnit,
      postCountRequired,
      legendPostCountRequired,
      spanPostCountRequired,
      postCount,
      supportBeams,
      supportBeamRate,
      supportPostRate,
      minSupportBeamsForPanels,
      effectiveProjection,
      allowedMainSpan,
      maxWidthWithCurrentSetup,
      validUpgradeOptions,
      adders,
      fanBeamCount,
      baseTiered,
      windSpeed: renaissance.windSpeed,
      exposure: renaissance.exposure,
      total: baseTiered + totalAdders,
      missingBasePrice: !!(width && projection && !base),
      usesProjectedMath: projection > 16 && !!base,
      spanTableDriven: !!(width && projection)
    };
  }, [renaissance, activeTier.multiplier, mergedRenaissanceStyles, renaissanceAddOns]);

  const standardSubtotal = useMemo(() => lineItems.reduce((sum, item) => sum + item.extended, 0), [lineItems]);
  const subtotal = standardSubtotal + renaissanceCalc.total;

  const normalizedLocation = `${settings.city || ""} ${settings.county || ""}`.trim().toLowerCase();
  const matchedCityRule = Object.entries(cityRules).find(([key]) => normalizedLocation.includes(key))?.[1] || null;
  const locationFee = matchedCityRule?.fee || 0;
  const taxableBase = subtotal * effectiveAppDefaults.taxablePortion;
  const salesTax = taxableBase * effectiveAppDefaults.taxRate;
  const permittingFee = settings.removePermit ? 0 : effectiveAppDefaults.permittingFee + locationFee;
  const totalNoFinancing = subtotal + salesTax + permittingFee;
  const depositAmount = Math.min(Math.max(safeNumber(settings.depositAmount), 0), totalNoFinancing);
  const financedSaleAmount = totalNoFinancing * (1 + effectiveAppDefaults.financingMarkup);
  const financedBase = Math.max(financedSaleAmount - depositAmount, 0);
  const monthlyPayment = financedBase * (selectedPlan.paymentFactor / 100);
  const commissionRate = selectedTier === "volume" ? 0 : selectedTier === "tier7_5" ? 0.075 : selectedTier === "tier5" ? 0.05 : selectedTier === "tier10" ? 0.10 : 0.15;
  const commissionAmount = totalNoFinancing * commissionRate;

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
      if (renaissanceCalc.postCount < renaissanceCalc.postCountRequired) issues.push(`This cover width requires at least ${renaissanceCalc.postCountRequired} posts with the selected beam upgrade and span-table logic.`);
      if (renaissanceCalc.supportBeams < renaissanceCalc.minSupportBeamsForPanels) issues.push(`Projection ${renaissanceCalc.projection}' needs at least ${renaissanceCalc.minSupportBeamsForPanels} added support beam/post row(s) with ${renaissanceCalc.panelMeta.label}, or switch to a deeper panel setup.`);
      if (renaissanceCalc.maxWidthWithCurrentSetup && renaissanceCalc.width > renaissanceCalc.maxWidthWithCurrentSetup) issues.push(`Current front/main beam setup only supports about ${renaissanceCalc.maxWidthWithCurrentSetup}' of width. Add posts and/or upgrade beam/post size.`);
      if (!renaissanceCalc.validUpgradeOptions.includes(renaissance.beamUpgrade)) issues.push("Selected Renaissance beam/post upgrade is under-spanned for this width/projection. Choose a stronger upgrade or more posts.");
      if (renaissanceCalc.supportBeams > 0) issues.push(`Support beam/post rows are being checked against ${renaissanceCalc.windSpeed} mph / Exposure ${renaissanceCalc.exposure} span logic.`);
      if (renaissanceCalc.fanBeamCount > 0 && !renaissanceCalc.fanBeamUnit) issues.push("Fan beam pricing could not be determined for the selected projection. Verify the sheet.");
    }

    return Array.from(new Set(issues));
  }, [activeItems, lineQtys, matchedCityRule, renaissance.fanBeams, renaissanceCalc]);

  const lineCount = activeItems.length + (renaissanceCalc.total > 0 ? 1 : 0);

  function updateQty(id, value) {
    setLineQtys((current) => ({ ...current, [id]: value }));
  }

  function expandAll(value) {
    setExpanded(Object.fromEntries(categories.map((cat) => [cat.name, value])));
  }

  function clearAll() {
    setLineQtys(defaultLineState);
    setRenaissance(defaultRenaissance);
    setCustomer(defaultCustomer);
    setSelectedQuoteId(null);
    setSelectedQuoteStatus("draft");
    setSaveMessage("");
    setSettings((current) => ({ ...current, ...defaultSettings, darkMode: current.darkMode, showCommission: current.showCommission, showNoFinancingTotal: current.showNoFinancingTotal }));
  }

  async function refreshPricingSettings() {
    if (!session?.user?.id) return;
    setPricingLoading(true);
    setPricingMessage("");

    const { data, error } = await supabase
      .from("pricing_settings")
      .select("setting_key, setting_value")
      .in("setting_key", ["app_defaults", "tier_multipliers", "line_price_overrides", "custom_services", "renaissance_table_percent", "renaissance_addon_overrides"]);

    if (error) {
      console.error("Load pricing settings failed", error);
      if (permissions.canManagePricing) setPricingMessage(`Could not load admin pricing: ${formatSupabaseError(error, "unknown error")}`);
      setPricingLoading(false);
      return;
    }

    const next = { appDefaults: {}, tierMultipliers: {}, linePrices: {}, customServices: [], renaissanceTablePercent: 0, renaissanceAddOns: {} };
    (data || []).forEach((row) => {
      if (row.setting_key === "app_defaults" && row.setting_value) next.appDefaults = row.setting_value;
      if (row.setting_key === "tier_multipliers" && row.setting_value) next.tierMultipliers = row.setting_value;
      if (row.setting_key === "line_price_overrides" && row.setting_value) next.linePrices = row.setting_value;
      if (row.setting_key === "custom_services" && row.setting_value) next.customServices = Array.isArray(row.setting_value) ? row.setting_value : [];
      if (row.setting_key === "renaissance_table_percent" && row.setting_value != null) next.renaissanceTablePercent = safeNumber(row.setting_value);
      if (row.setting_key === "renaissance_addon_overrides" && row.setting_value) next.renaissanceAddOns = row.setting_value;
    });

    setPricingOverrides(next);
    setPricingLoading(false);
  }

  async function savePricingSettings() {
    if (!permissions.canManagePricing || !session?.user?.id) return;
    setPricingSaving(true);
    setPricingMessage("");

    const parsedDefaults = {
      taxRate: safeNumber(pricingDraft.appDefaults.taxRate),
      taxablePortion: safeNumber(pricingDraft.appDefaults.taxablePortion),
      permittingFee: safeNumber(pricingDraft.appDefaults.permittingFee),
      financingMarkup: safeNumber(pricingDraft.appDefaults.financingMarkup)
    };

    const parsedTierMultipliers = Object.fromEntries(Object.keys(defaultTierMultipliers).map((key) => [key, safeNumber(pricingDraft.tierMultipliers[key]) || defaultTierMultipliers[key]]));
    const parsedLinePrices = {};
    Object.entries(defaultLinePrices).forEach(([itemId, basePrice]) => {
      const nextPrice = safeNumber(pricingDraft.linePrices[itemId]);
      if (nextPrice > 0 && Math.abs(nextPrice - basePrice) > 0.0001) parsedLinePrices[itemId] = +nextPrice.toFixed(2);
    });

    const parsedCustomServices = (pricingDraft.customServices || [])
      .map((service, index) => normalizeCustomService(service, index))
      .filter((service) => service.name && service.basePrice > 0);

    const parsedRenaissanceTablePercent = +safeNumber(pricingDraft.renaissanceTablePercent).toFixed(2);

    const parsedRenaissanceAddOns = {
      alum032PerSqft: safeNumber(pricingDraft.renaissanceAddOns?.alum032PerSqft),
      heavyFoamPerSqft: safeNumber(pricingDraft.renaissanceAddOns?.heavyFoamPerSqft),
      customRoofColorPerSqft: safeNumber(pricingDraft.renaissanceAddOns?.customRoofColorPerSqft),
      deductPost: safeNumber(pricingDraft.renaissanceAddOns?.deductPost),
      fanBeamByProjection: Object.fromEntries(Object.entries(pricingDraft.renaissanceAddOns?.fanBeamByProjection || {}).map(([key, value]) => [key, safeNumber(value)])),
      postUpgradeEach: Object.fromEntries(Object.entries(pricingDraft.renaissanceAddOns?.postUpgradeEach || {}).map(([key, value]) => [key, safeNumber(value)])),
      beamUpgradePerFoot: Object.fromEntries(Object.entries(pricingDraft.renaissanceAddOns?.beamUpgradePerFoot || {}).map(([key, value]) => [key, safeNumber(value)]))
    };

    const rows = [
      { setting_key: "app_defaults", setting_value: parsedDefaults, updated_by: session.user.id },
      { setting_key: "tier_multipliers", setting_value: parsedTierMultipliers, updated_by: session.user.id },
      { setting_key: "line_price_overrides", setting_value: parsedLinePrices, updated_by: session.user.id },
      { setting_key: "custom_services", setting_value: parsedCustomServices, updated_by: session.user.id },
      { setting_key: "renaissance_table_percent", setting_value: parsedRenaissanceTablePercent, updated_by: session.user.id },
      { setting_key: "renaissance_addon_overrides", setting_value: parsedRenaissanceAddOns, updated_by: session.user.id }
    ];

    const { error } = await supabase.from("pricing_settings").upsert(rows, { onConflict: "setting_key" });

    if (error) {
      console.error("Save pricing settings failed", error);
      setPricingSaving(false);
      setPricingMessage(`Could not save admin pricing: ${formatSupabaseError(error, "unknown error")}`);
      return;
    }

    setPricingOverrides({ appDefaults: parsedDefaults, tierMultipliers: parsedTierMultipliers, linePrices: parsedLinePrices, customServices: parsedCustomServices, renaissanceTablePercent: parsedRenaissanceTablePercent, renaissanceAddOns: parsedRenaissanceAddOns });
    setPricingSaving(false);
    setPricingMessage("Admin pricing saved to Supabase.");
  }

  function addCustomServiceToDraft() {
    const normalized = normalizeCustomService(newServiceDraft, pricingDraft.customServices?.length || 0);
    if (!normalized.name || !(normalized.basePrice > 0)) {
      setPricingMessage("New service needs a name and base price before you add it.");
      return;
    }
    setPricingDraft((current) => ({ ...current, customServices: [...(current.customServices || []), normalized] }));
    setNewServiceDraft({ category: normalized.category, name: "", unit: normalized.unit || "Each", basePrice: "" });
    setPricingMessage("Custom service added to the pricing draft. Save pricing to make it live.");
  }

  function updateCustomServiceDraft(serviceId, field, value) {
    setPricingDraft((current) => ({
      ...current,
      customServices: (current.customServices || []).map((service, index) => {
        if (service.id !== serviceId) return service;
        return normalizeCustomService({ ...service, [field]: value }, index);
      })
    }));
  }

  function removeCustomServiceDraft(serviceId) {
    setPricingDraft((current) => ({
      ...current,
      customServices: (current.customServices || []).filter((service) => service.id !== serviceId)
    }));
  }

  function updateRenaissanceAddon(path, value) {
    setPricingDraft((current) => {
      const nextAddOns = cleanJson(current.renaissanceAddOns || renaissanceAddOns);
      if (path.length === 1) nextAddOns[path[0]] = value;
      if (path.length === 2) nextAddOns[path[0]] = { ...(nextAddOns[path[0]] || {}), [path[1]]: value };
      return { ...current, renaissanceAddOns: nextAddOns };
    });
  }

  useEffect(() => {
    if (!session?.user?.id || !currentRole || !permissions.canUseEstimator) {
      setSavedQuotes([]);
      setQuotesLoading(false);
      return;
    }

    refreshSavedQuotes();
  }, [session?.user?.id, currentRole, permissions.canUseEstimator, permissions.canViewTeamQuotes, quoteScope, quoteStatusFilter]);



  useEffect(() => {
    if (!session?.user?.id) return;
    refreshPricingSettings();
  }, [session?.user?.id, currentRole]);


  async function refreshSavedQuotes() {
    if (!session?.user?.id) {
      setSavedQuotes([]);
      setQuotesLoading(false);
      return;
    }

    setQuotesLoading(true);
    let query = supabase
      .from("quotes")
      .select("id, created_by, customer_name, customer_email, customer_phone, financing_price, cash_price, tier, status, updated_at")
      .order("updated_at", { ascending: false })
      .limit(100);

    if (!permissions.canViewTeamQuotes || quoteScope === "mine") {
      query = query.eq("created_by", session.user.id);
    }

    if (quoteStatusFilter !== "all") {
      query = query.eq("status", quoteStatusFilter);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Refresh saved quotes failed", error);
      setSavedQuotes([]);
      setQuotesLoading(false);
      return;
    }

    const quotes = data || [];
    const creatorIds = [...new Set(quotes.map((q) => q.created_by).filter(Boolean))];
    let profileMap = {};

    if (creatorIds.length) {
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", creatorIds);

      if (profilesError) {
        console.error("Fetch quote owners failed", profilesError);
      } else {
        profileMap = Object.fromEntries((profilesData || []).map((row) => [row.id, row]));
      }
    }

    setSavedQuotes(
      quotes.map((quote) => ({
        ...quote,
        owner_name: profileMap[quote.created_by]?.full_name || profileMap[quote.created_by]?.email || null,
        owner_email: profileMap[quote.created_by]?.email || null
      }))
    );
    setQuotesLoading(false);
  }

  function hydrateQuoteSnapshot(snapshot) {
    setSelectedTier(snapshot?.selectedTier && pricingTiers[snapshot.selectedTier] ? snapshot.selectedTier : "tier5");
    setLineQtys({ ...defaultLineState, ...(snapshot?.lineQtys || {}) });
    setSettings((current) => ({ ...current, ...defaultSettings, ...(snapshot?.settings || {}), darkMode: current.darkMode, showCommission: current.showCommission, showNoFinancingTotal: current.showNoFinancingTotal }));
    setCustomer({ ...defaultCustomer, ...(snapshot?.customer || {}) });
    setSelectedPlanId(financingPlans.some((plan) => plan.id === snapshot?.selectedPlanId) ? snapshot.selectedPlanId : financingPlans[0].id);
    setRenaissance({ ...defaultRenaissance, ...(snapshot?.renaissance || {}), tier: undefined });
    setExpanded({ ...defaultExpanded, ...(snapshot?.expanded || {}) });
    setToolbarOpen(typeof snapshot?.toolbarOpen === "boolean" ? snapshot.toolbarOpen : true);
    setRenaissanceOpen(typeof snapshot?.renaissanceOpen === "boolean" ? snapshot.renaissanceOpen : true);
    setFinancingOpen(false);
    setActiveView(["standard", "renaissance"].includes(snapshot?.activeView) ? snapshot.activeView : "standard");
    setSearchTerm(typeof snapshot?.searchTerm === "string" ? snapshot.searchTerm : "");
  }

  async function loadQuote(quoteId) {
    setSaveMessage("");
    const { data, error } = await supabase
      .from("quotes")
      .select("id, status, quote_data")
      .eq("id", quoteId)
      .single();

    if (error) {
      console.error("Load quote failed", error);
      setSaveMessage("Could not load that quote.");
      return;
    }

    hydrateQuoteSnapshot(data?.quote_data || {});
    setSelectedQuoteId(data?.id || quoteId);
    setSelectedQuoteStatus(data?.status || "draft");
    setSaveMessage("Quote loaded.");
  }

  async function saveQuote() {
    if (!session?.user?.id) return;
    setSaveLoading(true);
    setSaveMessage("");

    const roleForSave = resolveRole(profile, session);
    const sanitizedSnapshot = cleanJson({
      selectedTier,
      lineQtys,
      settings,
      customer,
      selectedPlanId,
      renaissance,
      expanded,
      toolbarOpen,
      renaissanceOpen,
      activeView,
      searchTerm
    });

    const quotePayload = {
      created_by: session.user.id,
      customer_name: customer.name || null,
      customer_email: customer.email || null,
      customer_phone: customer.phone || null,
      city: settings.city || null,
      county: settings.county || null,
      tier: selectedTier,
      quote_data: sanitizedSnapshot,
      subtotal: Number.isFinite(subtotal) ? +subtotal.toFixed(2) : 0,
      tax: Number.isFinite(salesTax) ? +salesTax.toFixed(2) : 0,
      permit_fee: Number.isFinite(permittingFee) ? +permittingFee.toFixed(2) : 0,
      cash_price: Number.isFinite(totalNoFinancing) ? +totalNoFinancing.toFixed(2) : 0,
      financing_price: Number.isFinite(financedSaleAmount) ? +financedSaleAmount.toFixed(2) : 0,
      financed_amount: Number.isFinite(financedBase) ? +financedBase.toFixed(2) : 0,
      monthly_payment: Number.isFinite(monthlyPayment) ? +monthlyPayment.toFixed(2) : 0,
      financing_plan_name: selectedPlan?.label || null,
      status: selectedQuoteStatus || "draft"
    };

    const lineRows = activeItems
      .map((item) => ({
        category: item.category || "General",
        service_name: item.name || "Line item",
        unit: item.unit || null,
        quantity: Number.isFinite(+item.qty) ? +item.qty : 0,
        unit_price: Number.isFinite(item.displayPrice) ? +item.displayPrice.toFixed(2) : 0,
        line_total: Number.isFinite(item.extended) ? +item.extended.toFixed(2) : 0,
        source_type: "standard"
      }))
      .filter((row) => row.quantity > 0 || row.line_total > 0);

    if (renaissanceCalc.total > 0) {
      lineRows.push({
        category: "Renaissance",
        service_name: `${renaissanceCalc.key} ${renaissanceCalc.width}' x ${renaissanceCalc.projection}'`,
        unit: "Each",
        quantity: 1,
        unit_price: +renaissanceCalc.total.toFixed(2),
        line_total: +renaissanceCalc.total.toFixed(2),
        source_type: "renaissance"
      });
      renaissanceCalc.adders.forEach((adder) => {
        if (!Number.isFinite(adder.amount) || adder.amount <= 0) return;
        lineRows.push({
          category: "Renaissance",
          service_name: adder.label,
          unit: "Each",
          quantity: 1,
          unit_price: +adder.amount.toFixed(2),
          line_total: +adder.amount.toFixed(2),
          source_type: "renaissance"
        });
      });
    }

    const { error: profileError } = await supabase.from("profiles").upsert({
      id: session.user.id,
      full_name: profile?.full_name || session.user.user_metadata?.full_name || "",
      email: profile?.email || session.user.email || null,
      role: roleForSave || "sales_rep"
    }, { onConflict: "id" });

    if (profileError) {
      console.error("Profile sync before save failed", profileError);
      setSaveLoading(false);
      setSaveMessage(`Could not save quote: ${formatSupabaseError(profileError, "profile sync failed")}`);
      return;
    }

    let quoteId = selectedQuoteId;
    const isUpdating = Boolean(quoteId);

    if (quoteId) {
      const { error: updateError } = await supabase.from("quotes").update(quotePayload).eq("id", quoteId);
      if (updateError) {
        console.error("Update quote failed", updateError);
        setSaveLoading(false);
        setSaveMessage(`Could not update quote: ${formatSupabaseError(updateError, "unknown error")}`);
        return;
      }
      const { error: deleteError } = await supabase.from("quote_lines").delete().eq("quote_id", quoteId);
      if (deleteError) console.error("Delete old quote lines failed", deleteError);
    } else {
      const { data: inserted, error: insertError } = await supabase.from("quotes").insert(quotePayload).select("id").single();
      if (insertError) {
        console.error("Save quote failed", insertError);
        setSaveLoading(false);
        setSaveMessage(`Could not save quote: ${formatSupabaseError(insertError, "unknown error")}`);
        return;
      }
      quoteId = inserted.id;
      setSelectedQuoteId(quoteId);
    }

    let lineSaveWarning = "";
    if (lineRows.length) {
      const rows = lineRows.map((row) => ({ ...row, quote_id: quoteId }));
      const { error: linesError } = await supabase.from("quote_lines").insert(rows);
      if (linesError) {
        console.error("Save quote lines failed", linesError);
        lineSaveWarning = ` Line items may need a follow-up save: ${formatSupabaseError(linesError, "line save failed")}`;
      }
    }

    await refreshSavedQuotes();
    setSaveLoading(false);
    setSaveMessage(`${isUpdating ? "Quote updated." : "Quote saved."}${lineSaveWarning}`);
  }

  async function setQuoteStatus(status) {
    if (!selectedQuoteId) {
      setSelectedQuoteStatus(status);
      setSaveMessage(`Quote status set to ${status}. Save the quote to keep it.`);
      return;
    }

    const { error } = await supabase
      .from("quotes")
      .update({ status })
      .eq("id", selectedQuoteId);

    if (error) {
      console.error("Update quote status failed", error);
      setSaveMessage(`Could not update status: ${formatSupabaseError(error, "unknown error")}`);
      return;
    }

    setSelectedQuoteStatus(status);
    setSaveMessage(`Quote marked ${status}.`);
    await refreshSavedQuotes();
  }

  async function deleteSelectedQuote() {
    if (!selectedQuoteId) {
      setSaveMessage("Load a saved quote before deleting.");
      return;
    }

    const quoteIdToDelete = selectedQuoteId;
    const confirmed = window.confirm("Delete this saved quote? This cannot be undone.");
    if (!confirmed) return;

    const { error: lineDeleteError } = await supabase.from("quote_lines").delete().eq("quote_id", quoteIdToDelete);
    if (lineDeleteError) {
      console.error("Delete quote lines failed", lineDeleteError);
    }

    const { error } = await supabase.from("quotes").delete().eq("id", quoteIdToDelete);
    if (error) {
      console.error("Delete quote failed", error);
      setSaveMessage(`Could not delete quote: ${formatSupabaseError(error, "unknown error")}`);
      return;
    }

    setSavedQuotes((current) => current.filter((quote) => quote.id !== quoteIdToDelete));
    clearAll();
    await refreshSavedQuotes();
    setSaveMessage("Quote deleted.");
  }

  async function handleLogin(event) {
    event.preventDefault();
    setAuthError("");
    setAuthLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: authEmail.trim(),
      password: authPassword
    });

    if (error) {
      setAuthError(error.message || "Sign-in failed. Check your email and password.");
    } else {
      setAuthPassword("");
    }

    setAuthLoading(false);
  }

  async function handleSignOut() {
    const { error } = await supabase.auth.signOut();
    if (error) console.error("Sign-out failed", error);
  }

  async function copySummary() {
    const useFinancedLineSpread = !settings.showNoFinancingTotal;
    const copySpreadRatio = useFinancedLineSpread && subtotal > 0
      ? Math.max((financedSaleAmount - salesTax - permittingFee) / subtotal, 1)
      : 1;
    const quotedItems = activeItems.map((item) => {
      const shownAmount = useFinancedLineSpread ? item.extended * copySpreadRatio : item.extended;
      return `${item.category} | ${item.name} | Qty ${item.qty} | ${currency.format(shownAmount)}`;
    });
    const renaissanceLine = renaissanceCalc.total > 0
      ? `Renaissance | ${renaissanceCalc.key} | ${renaissanceCalc.width}x${renaissanceCalc.projection} | Support rows ${renaissanceCalc.supportBeams} | ${currency.format(useFinancedLineSpread ? renaissanceCalc.total * copySpreadRatio : renaissanceCalc.total)}`
      : null;

    const text = [
      "S&S Design Build Quick Quote",
      ...quotedItems,
      renaissanceLine,
      `Subtotal: ${currency.format(useFinancedLineSpread ? subtotal * copySpreadRatio : subtotal)}`,
      `Sales tax: ${currency.format(salesTax)}`,
      `Permitting + location fees: ${currency.format(permittingFee)}`,
      `Deposit: ${currency.format(depositAmount)}`,
      settings.showNoFinancingTotal ? `Cash Price: ${currency.format(totalNoFinancing)}` : null,
      `Financing plan: ${selectedPlan.label}`,
      `Financing Price: ${currency.format(financedSaleAmount)}`,
      `Amount being financed: ${currency.format(financedBase)}`,
      `Monthly payment: ${currency.format(monthlyPayment)}`
    ].filter(Boolean).join("\n");

    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error("Copy failed", err);
    }
  }

  if (!authReady) {
    return (
      <div className="auth-shell">
        <div className="auth-card card">
          <h1>Loading estimator…</h1>
          <p className="small-note">Checking your secure session.</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <AuthScreen
        email={authEmail}
        password={authPassword}
        setEmail={setAuthEmail}
        setPassword={setAuthPassword}
        onSubmit={handleLogin}
        loading={authLoading}
        error={authError}
      />
    );
  }

  if (profileLoading) {
    return (
      <div className="auth-shell">
        <div className="auth-card card">
          <h1>Loading your access…</h1>
          <p className="small-note">Checking your role and permissions.</p>
        </div>
      </div>
    );
  }

  if (profile && !hasValidRole) {
    return <AccessDeniedScreen profile={profile} onSignOut={handleSignOut} />;
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
          <div className="user-chip">
            <strong>{profile?.full_name || session.user.email}</strong>
            <span>{formatRole(currentRole)}</span>
          </div>
          <button className="ghost-btn" onClick={clearAll}>Clear inputs</button>
          <button className="ghost-btn" onClick={() => setSettingsOpen(true)}>Settings</button>
          <button className="ghost-btn" onClick={handleSignOut}>Sign out</button>
        </div>
      </header>


      <section className="toolbar card">
        <div className="section-head compact-head">
          <div>
            <h2>Tier</h2>
            <p className="small-note">Global tier controls both Standard and Renaissance pricing.</p>
          </div>
          <button className="ghost-btn" onClick={() => setToolbarOpen((value) => !value)}>{toolbarOpen ? "Hide" : "Show"}</button>
        </div>
        {toolbarOpen && (
          <div className="toolbar-stack">
            <div className="pill-row">
              {Object.entries(pricingTiers).map(([key, tier]) => (
                <button key={key} className={selectedTier === key ? "pill active" : "pill"} onClick={() => setSelectedTier(key)}>
                  {tier.label}
                </button>
              ))}
            </div>
            <div className="pill-row view-pill-row">
              <button className={activeView === "standard" ? "pill active" : "pill"} onClick={() => setActiveView("standard")}>Standard pricing</button>
              <button className={activeView === "renaissance" ? "pill active" : "pill"} onClick={() => setActiveView("renaissance")}>Renaissance</button>
            </div>
            <div className="toolbar-meta toolbar-meta-wide">
              <div className="location-grid">
                <label>
                  City
                  <input type="text" placeholder="Clarksville, Brentwood..." value={settings.city} onChange={(e) => setSettings((current) => ({ ...current, city: e.target.value }))} />
                </label>
                <label>
                  County
                  <input type="text" placeholder="Williamson, Montgomery..." value={settings.county} onChange={(e) => setSettings((current) => ({ ...current, county: e.target.value }))} />
                </label>
              </div>
              <div className="toolbar-buttons">
                <button className="ghost-btn" onClick={() => expandAll(true)}>Expand all</button>
                <button className="ghost-btn" onClick={() => expandAll(false)}>Collapse all</button>
              </div>
            </div>
          </div>
        )}
      </section>

      <AccessPanel profile={profile || { role: currentRole }} permissions={permissions} />


      {permissions.canManagePricing && (
        <section className="card admin-pricing-card">
          <div className="section-head compact-head">
            <div>
              <h2>Admin pricing foundation</h2>
              <p className="small-note">Edit live constants, tier multipliers, and base line prices. This is the first step toward full in-app pricing control.</p>
            </div>
            <div className="toolbar-buttons inline-actions">
              <button className="ghost-btn" onClick={() => setPricingEditorOpen((value) => !value)}>{pricingEditorOpen ? "Hide" : "Show"}</button>
              <button className="ghost-btn" onClick={refreshPricingSettings} disabled={pricingLoading}>{pricingLoading ? "Refreshing…" : "Refresh"}</button>
              <button className="ghost-btn" onClick={savePricingSettings} disabled={pricingSaving}>{pricingSaving ? "Saving…" : "Save pricing"}</button>
            </div>
          </div>
          {pricingMessage ? <p className="small-note success-note">{pricingMessage}</p> : null}
          {pricingEditorOpen && (
            <>
              <div className="admin-pricing-grid">
                <label>
                  Tax rate
                  <input type="number" inputMode="decimal" step="0.0001" value={pricingDraft.appDefaults.taxRate || ""} onChange={(e) => setPricingDraft((current) => ({ ...current, appDefaults: { ...current.appDefaults, taxRate: e.target.value } }))} />
                </label>
                <label>
                  Taxable portion
                  <input type="number" inputMode="decimal" step="0.01" value={pricingDraft.appDefaults.taxablePortion || ""} onChange={(e) => setPricingDraft((current) => ({ ...current, appDefaults: { ...current.appDefaults, taxablePortion: e.target.value } }))} />
                </label>
                <label>
                  Permitting fee
                  <input type="number" inputMode="decimal" step="0.01" value={pricingDraft.appDefaults.permittingFee || ""} onChange={(e) => setPricingDraft((current) => ({ ...current, appDefaults: { ...current.appDefaults, permittingFee: e.target.value } }))} />
                </label>
                <label>
                  Financing markup
                  <input type="number" inputMode="decimal" step="0.01" value={pricingDraft.appDefaults.financingMarkup || ""} onChange={(e) => setPricingDraft((current) => ({ ...current, appDefaults: { ...current.appDefaults, financingMarkup: e.target.value } }))} />
                </label>
              </div>
              <div className="admin-tier-grid">
                {Object.entries(pricingTiers).map(([key, tier]) => (
                  <label key={`admin-tier-${key}`}>
                    {tier.label} multiplier
                    <input type="number" inputMode="decimal" step="0.01" value={pricingDraft.tierMultipliers[key] || ""} onChange={(e) => setPricingDraft((current) => ({ ...current, tierMultipliers: { ...current.tierMultipliers, [key]: e.target.value } }))} />
                  </label>
                ))}
              </div>
              <label className="standard-search-label admin-search-label">
                Search line items
                <input type="text" placeholder="Search permit, concrete, screen..." value={pricingEditorSearch} onChange={(e) => setPricingEditorSearch(e.target.value)} />
              </label>
              <div className="admin-subcard">
                <div className="section-head compact-head">
                  <div>
                    <h3>Add standard pricing service</h3>
                    <p className="small-note">Add new services right into the standard pricing sheet without touching code again.</p>
                  </div>
                </div>
                <div className="admin-pricing-grid">
                  <label>
                    Category
                    <input type="text" value={newServiceDraft.category} onChange={(e) => setNewServiceDraft((current) => ({ ...current, category: e.target.value }))} />
                  </label>
                  <label>
                    Service name
                    <input type="text" value={newServiceDraft.name} onChange={(e) => setNewServiceDraft((current) => ({ ...current, name: e.target.value }))} />
                  </label>
                  <label>
                    Unit
                    <input type="text" value={newServiceDraft.unit} onChange={(e) => setNewServiceDraft((current) => ({ ...current, unit: e.target.value }))} />
                  </label>
                  <label>
                    Base price
                    <input type="number" inputMode="decimal" step="0.01" value={newServiceDraft.basePrice} onChange={(e) => setNewServiceDraft((current) => ({ ...current, basePrice: e.target.value }))} />
                  </label>
                </div>
                <div className="toolbar-buttons inline-actions">
                  <button className="ghost-btn" onClick={addCustomServiceToDraft}>Add service</button>
                </div>
                {!!pricingDraft.customServices?.length && (
                  <div className="admin-pricing-list compact-list">
                    {(pricingDraft.customServices || []).map((service) => (
                      <div className="admin-line-price-row custom-service-row" key={`custom-service-${service.id}`}>
                        <span>
                          <strong>{service.name}</strong>
                          <small>{service.category} • {service.unit}</small>
                        </span>
                        <input type="text" value={service.category} onChange={(e) => updateCustomServiceDraft(service.id, "category", e.target.value)} />
                        <input type="text" value={service.name} onChange={(e) => updateCustomServiceDraft(service.id, "name", e.target.value)} />
                        <input type="text" value={service.unit} onChange={(e) => updateCustomServiceDraft(service.id, "unit", e.target.value)} />
                        <input type="number" inputMode="decimal" step="0.01" value={service.basePrice} onChange={(e) => updateCustomServiceDraft(service.id, "basePrice", e.target.value)} />
                        <button className="ghost-btn danger-btn" onClick={() => removeCustomServiceDraft(service.id)}>Remove</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="admin-pricing-list">
                {categories.map((cat) => {
                  const visibleItems = cat.items.filter((item) => !item.isCustom && (!pricingEditorSearch.trim() || item.name.toLowerCase().includes(pricingEditorSearch.trim().toLowerCase()) || cat.name.toLowerCase().includes(pricingEditorSearch.trim().toLowerCase())));
                  if (!visibleItems.length) return null;
                  return (
                    <div key={`admin-${cat.name}`} className="admin-pricing-group">
                      <h3>{cat.name}</h3>
                      <div className="admin-pricing-group-list">
                        {visibleItems.map((item) => (
                          <label key={`admin-line-${item.id}`} className="admin-line-price-row">
                            <span>
                              <strong>{item.name}</strong>
                              <small>{item.unit}</small>
                            </span>
                            <input type="number" inputMode="decimal" step="0.01" value={pricingDraft.linePrices[item.id] || ""} onChange={(e) => setPricingDraft((current) => ({ ...current, linePrices: { ...current.linePrices, [item.id]: e.target.value } }))} />
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="admin-subcard">
                <div className="section-head compact-head">
                  <div>
                    <h3>Renaissance standard pricing</h3>
                    <p className="small-note">Change the whole Renaissance base table at once with one percentage update instead of editing every width and projection.</p>
                  </div>
                </div>
                <div className="admin-pricing-grid single-row-grid">
                  <label>
                    Table update percent
                    <input type="number" inputMode="decimal" step="0.01" value={pricingDraft.renaissanceTablePercent ?? 0} onChange={(e) => setPricingDraft((current) => ({ ...current, renaissanceTablePercent: e.target.value }))} />
                    <small className="small-note">Use positive numbers to raise pricing and negative numbers to lower it. Example: 5 = 5% increase, -3 = 3% decrease.</small>
                  </label>
                </div>
                <div className="admin-tier-grid renaissance-addon-grid">
                  <label>
                    .032 skin / sqft
                    <input type="number" inputMode="decimal" step="0.01" value={pricingDraft.renaissanceAddOns?.alum032PerSqft || ""} onChange={(e) => updateRenaissanceAddon(["alum032PerSqft"], e.target.value)} />
                  </label>
                  <label>
                    Heavy foam / sqft
                    <input type="number" inputMode="decimal" step="0.01" value={pricingDraft.renaissanceAddOns?.heavyFoamPerSqft || ""} onChange={(e) => updateRenaissanceAddon(["heavyFoamPerSqft"], e.target.value)} />
                  </label>
                  <label>
                    Roof color / sqft
                    <input type="number" inputMode="decimal" step="0.01" value={pricingDraft.renaissanceAddOns?.customRoofColorPerSqft || ""} onChange={(e) => updateRenaissanceAddon(["customRoofColorPerSqft"], e.target.value)} />
                  </label>
                  <label>
                    Deduct post
                    <input type="number" inputMode="decimal" step="0.01" value={pricingDraft.renaissanceAddOns?.deductPost || ""} onChange={(e) => updateRenaissanceAddon(["deductPost"], e.target.value)} />
                  </label>
                  <label>
                    Fan beam 10'
                    <input type="number" inputMode="decimal" step="0.01" value={pricingDraft.renaissanceAddOns?.fanBeamByProjection?.["10"] || ""} onChange={(e) => updateRenaissanceAddon(["fanBeamByProjection", "10"], e.target.value)} />
                  </label>
                  <label>
                    Fan beam 12'
                    <input type="number" inputMode="decimal" step="0.01" value={pricingDraft.renaissanceAddOns?.fanBeamByProjection?.["12"] || ""} onChange={(e) => updateRenaissanceAddon(["fanBeamByProjection", "12"], e.target.value)} />
                  </label>
                  <label>
                    HD post
                    <input type="number" inputMode="decimal" step="0.01" value={pricingDraft.renaissanceAddOns?.postUpgradeEach?.hd || ""} onChange={(e) => updateRenaissanceAddon(["postUpgradeEach", "hd"], e.target.value)} />
                  </label>
                  <label>
                    Wide post
                    <input type="number" inputMode="decimal" step="0.01" value={pricingDraft.renaissanceAddOns?.postUpgradeEach?.wide || ""} onChange={(e) => updateRenaissanceAddon(["postUpgradeEach", "wide"], e.target.value)} />
                  </label>
                  <label>
                    Wide + insert post
                    <input type="number" inputMode="decimal" step="0.01" value={pricingDraft.renaissanceAddOns?.postUpgradeEach?.wideInsert || ""} onChange={(e) => updateRenaissanceAddon(["postUpgradeEach", "wideInsert"], e.target.value)} />
                  </label>
                  <label>
                    HD beam / ft
                    <input type="number" inputMode="decimal" step="0.01" value={pricingDraft.renaissanceAddOns?.beamUpgradePerFoot?.hd || ""} onChange={(e) => updateRenaissanceAddon(["beamUpgradePerFoot", "hd"], e.target.value)} />
                  </label>
                  <label>
                    Wide beam / ft
                    <input type="number" inputMode="decimal" step="0.01" value={pricingDraft.renaissanceAddOns?.beamUpgradePerFoot?.wide || ""} onChange={(e) => updateRenaissanceAddon(["beamUpgradePerFoot", "wide"], e.target.value)} />
                  </label>
                  <label>
                    Wide + insert beam / ft
                    <input type="number" inputMode="decimal" step="0.01" value={pricingDraft.renaissanceAddOns?.beamUpgradePerFoot?.wideInsert || ""} onChange={(e) => updateRenaissanceAddon(["beamUpgradePerFoot", "wideInsert"], e.target.value)} />
                  </label>
                </div>
              </div>
            </>
          )}
        </section>
      )}

      {settings.showCommission && (
        <section className="commission-box card">
          <div>
            <span>Commission at this tier</span>
            <strong>{currency.format(commissionAmount)}</strong>
          </div>
          <p>{selectedTier === "volume" ? "Volume tier pays no commission but still counts toward monthly volume." : `Current tier pays ${(commissionRate * 100).toFixed(1).replace(/\.0$/, "")}% of the quoted total.`}</p>
        </section>
      )}

      {flags.length > 0 && (
        <section className="flag-list card alert">
          <h2>Red flags / restrictions</h2>
          {flags.map((flag) => (
            <div className="flag" key={flag}>{flag}</div>
          ))}
        </section>
      )}

      <div
        className="main-grid"
        onTouchStart={(e) => { touchStartX.current = e.changedTouches[0]?.clientX ?? null; }}
        onTouchEnd={(e) => {
          const endX = e.changedTouches[0]?.clientX ?? null;
          if (touchStartX.current == null || endX == null) return;
          const delta = endX - touchStartX.current;
          if (Math.abs(delta) < 50) return;
          setActiveView(delta < 0 ? "renaissance" : "standard");
        }}
      >
        <section className="card">
          {activeView === "standard" ? (
            <>
              <div className="section-head">
                <div>
                  <h2>Standard pricing sheet</h2>
                  <p className="small-note">Fast-fill layout for on-the-spot quoting. Search, tap quantity, and swipe left for Renaissance.</p>
                </div>
                <div className="toolbar-buttons inline-actions">
                  <button className="ghost-btn" onClick={clearAll}>Clear inputs</button>
                  <button className="ghost-btn" onClick={() => expandAll(true)}>Expand all</button>
                  <button className="ghost-btn" onClick={() => expandAll(false)}>Collapse all</button>
                </div>
              </div>

              <div className="standard-search-row">
                <label className="standard-search-label">
                  Search services
                  <input
                    type="text"
                    placeholder="Search concrete, screen, deck, permit..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </label>
              </div>

              {filteredCategories.map((cat) => (
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
                              <input className="qty-input" type="number" inputMode="decimal" min="0" step="any" value={qty} onChange={(e) => updateQty(item.id, e.target.value)} />
                            </label>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}

              {filteredCategories.length === 0 && <p className="small-note">No matching services found for “{searchTerm}”.</p>}

              <div className="bottom-actions">
                <button className="ghost-btn" onClick={clearAll}>Clear inputs</button>
                <button className="ghost-btn" onClick={() => expandAll(true)}>Expand all</button>
                <button className="ghost-btn" onClick={() => expandAll(false)}>Collapse all</button>
              </div>
              <div className="pill-row bottom-tier-row">
                {Object.entries(pricingTiers).map(([key, tier]) => (
                  <button key={`bottom-${key}`} className={selectedTier === key ? "pill active" : "pill"} onClick={() => setSelectedTier(key)}>{tier.label}</button>
                ))}
              </div>
            </>
          ) : (
            <>
                            <div className="section-head compact-head">
                <div><h2>Renaissance</h2><p className="small-note">Premium patio cover pricing. Swipe right to return to the standard sheet.</p></div>
                <button className="ghost-btn" onClick={() => setRenaissanceOpen((value) => !value)}>{renaissanceOpen ? "Hide" : "Show"}</button>
              </div>

              {renaissanceOpen && (
                <>
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
                    <label>
                      Profile
                      <select value={renaissance.profile} onChange={(e) => setRenaissance((current) => ({ ...current, profile: e.target.value }))}>
                        {currentRenaissanceOptions.profiles.map((option) => <option key={option} value={option}>{option}</option>)}
                      </select>
                    </label>
                    <label>
                      Width
                      <input type="number" inputMode="decimal" min="0" max="40" step="1" value={renaissance.width} onFocus={selectInputText} onChange={(e) => setRenaissance((current) => ({ ...current, width: safeNumber(e.target.value) }))} />
                    </label>
                    <label>
                      Projection
                      <input type="number" inputMode="decimal" min="0" max="30" step="1" value={renaissance.projection} onFocus={selectInputText} onChange={(e) => setRenaissance((current) => ({ ...current, projection: safeNumber(e.target.value) }))} />
                    </label>
                    <label>
                      Front overhang
                      <select value={renaissance.frontOverhang} onChange={(e) => setRenaissance((current) => ({ ...current, frontOverhang: safeNumber(e.target.value) }))}>
                        {[0,1,2].map((value) => <option key={value} value={value}>{value}'</option>)}
                      </select>
                    </label>
                    <label>
                      Side overhang (each side)
                      <select value={renaissance.sideOverhang} onChange={(e) => setRenaissance((current) => ({ ...current, sideOverhang: safeNumber(e.target.value) }))}>
                        {[0,1,2].map((value) => <option key={value} value={value}>{value}'</option>)}
                      </select>
                    </label>
                    <label>
                      Wind speed
                      <select value={renaissance.windSpeed} onChange={(e) => setRenaissance((current) => ({ ...current, windSpeed: safeNumber(e.target.value) }))}>
                        {windSpeedOptions.map((option) => <option key={option} value={option}>{option} mph</option>)}
                      </select>
                    </label>
                    <label>
                      Exposure
                      <select value={renaissance.exposure} onChange={(e) => setRenaissance((current) => ({ ...current, exposure: e.target.value }))}>
                        {exposureOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                      </select>
                    </label>
                    <label>
                      Panel type
                      <select value={renaissance.panelType} onChange={(e) => setRenaissance((current) => ({ ...current, panelType: e.target.value }))}>
                        <option value="3standard">3" standard</option>
                        <option value="6upgraded">6" upgraded</option>
                      </select>
                    </label>
                    <label className="check inline-check">
                      <input type="checkbox" checked={renaissance.upgradeFoam} onChange={(e) => setRenaissance((current) => ({ ...current, upgradeFoam: e.target.checked }))} disabled={renaissance.panelType === "6upgraded"} />
                      <span>Upgrade foam</span>
                    </label>
                    <label className="check inline-check">
                      <input type="checkbox" checked={renaissance.upgrade032} onChange={(e) => setRenaissance((current) => ({ ...current, upgrade032: e.target.checked }))} disabled={renaissance.panelType === "6upgraded"} />
                      <span>.032 skin</span>
                    </label>
                    <label className="check inline-check">
                      <input type="checkbox" checked={renaissance.roofColor} onChange={(e) => setRenaissance((current) => ({ ...current, roofColor: e.target.checked }))} />
                      <span>Roof color</span>
                    </label>
                    <label>
                      Post count override
                      <input type="number" inputMode="decimal" min="0" value={renaissance.postCountOverride || renaissanceCalc.postCountRequired || 0} onChange={(e) => setRenaissance((current) => ({ ...current, postCountOverride: e.target.value }))} />
                    </label>
                    <label>
                      Fan beams
                      <input type="number" inputMode="decimal" min="0" value={renaissance.fanBeams} onChange={(e) => setRenaissance((current) => ({ ...current, fanBeams: e.target.value }))} />
                    </label>
                    <label>
                      Front/main upgrade
                      <select value={renaissance.beamUpgrade} onChange={(e) => setRenaissance((current) => ({ ...current, beamUpgrade: e.target.value, postUpgrade: e.target.value }))}>
                        {[ ["none", "Standard"], ["hd", "HD"], ["wide", "Wide"], ["wideInsert", "Wide + Insert"] ].map(([value, label]) => (
                          <option key={value} value={value} disabled={!renaissanceCalc.validUpgradeOptions.includes(value)}>{label}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Added support rows
                      <select value={renaissance.supportBeams} onChange={(e) => setRenaissance((current) => ({ ...current, supportBeams: safeNumber(e.target.value) }))}>
                        {[0,1,2,3].map((value) => <option key={value} value={value}>{value}</option>)}
                      </select>
                    </label>
                    <label>
                      Support row upgrade
                      <select value={renaissance.supportUpgrade} onChange={(e) => setRenaissance((current) => ({ ...current, supportUpgrade: e.target.value }))}>
                        {[ ["none", "Standard"], ["hd", "HD"], ["wide", "Wide"], ["wideInsert", "Wide + Insert"] ].map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Deduct posts
                      <input type="number" inputMode="decimal" min="0" value={renaissance.deductPosts} onChange={(e) => setRenaissance((current) => ({ ...current, deductPosts: e.target.value }))} />
                    </label>
                  </div>

                  <div className="renaissance-summary">
                    <div className="summary-row"><span>Style</span><strong>{renaissanceCalc.key}</strong></div>
                    <div className="summary-row"><span>Actual size</span><strong>{renaissanceCalc.width || 0}' x {renaissanceCalc.projection || 0}'</strong></div>
                    <div className="summary-row"><span>Framed size</span><strong>{renaissanceCalc.framedWidth || 0}' x {renaissanceCalc.framedProjection || 0}'</strong></div>
                    <div className="summary-row"><span>Wind / exposure</span><strong>{renaissanceCalc.windSpeed} mph · {renaissanceCalc.exposure}</strong></div>
                    <div className="summary-row"><span>Required posts</span><strong>{renaissanceCalc.postCountRequired || 0}</strong></div>
                    <div className="summary-row"><span>Support beam/post rows</span><strong>{renaissanceCalc.supportBeams || 0}</strong></div>
                    <div className="summary-row"><span>Effective projection per span</span><strong>{renaissanceCalc.effectiveProjection ? `${renaissanceCalc.effectiveProjection.toFixed(2)}'` : "0'"}</strong></div>
                    <div className="summary-row"><span>Allowed beam span now</span><strong>{renaissanceCalc.allowedMainSpan ? `${renaissanceCalc.allowedMainSpan.toFixed(2)}'` : "0'"}</strong></div>
                    <div className="summary-row"><span>Max width with current setup</span><strong>{renaissanceCalc.maxWidthWithCurrentSetup ? `${renaissanceCalc.maxWidthWithCurrentSetup.toFixed(2)}'` : "0'"}</strong></div>
                    <div className="summary-row"><span>Roof sqft</span><strong>{renaissanceCalc.rsqft || 0}</strong></div>
                    <div className="summary-row"><span>Base price</span><strong>{currency.format(renaissanceCalc.baseTiered)}</strong></div>
                    {renaissanceCalc.adders.map((adder) => <div className="summary-row" key={adder.label}><span>{adder.label}</span><strong>{currency.format(adder.amount)}</strong></div>)}
                    <div className="summary-row"><span>Panel setup</span><strong>{renaissanceCalc.panelMeta.label}</strong></div>
                    <div className="summary-row total"><span>Renaissance total</span><strong>{currency.format(renaissanceCalc.total)}</strong></div>
                  </div>
                </>
              )}
              <div className="pill-row bottom-tier-row">
                {Object.entries(pricingTiers).map(([key, tier]) => (
                  <button key={`r-bottom-${key}`} className={selectedTier === key ? "pill active" : "pill"} onClick={() => setSelectedTier(key)}>{tier.label}</button>
                ))}
              </div>
            </>
          )}
        </section>

      </div>

              <aside className="summary-column">
          {flags.length > 0 && (
            <section className="flag-list card alert inline-alert summary-alert">
              <h2>Red flags / restrictions</h2>
              {flags.map((flag) => (
                <div className="flag" key={`summary-${flag}`}>{flag}</div>
              ))}
            </section>
          )}
          <section className="card sticky-card">
            <div className="section-head compact-head">
              <div>
                <h2>Quote summary</h2>
                <p className="small-note">{lineCount} active line item{lineCount === 1 ? "" : "s"}</p>
              </div>
              <div className="toolbar-buttons inline-actions">
                <button className="ghost-btn" onClick={saveQuote} disabled={saveLoading}>{saveLoading ? "Saving…" : selectedQuoteId ? "Update" : "Save Quote"}</button>
                <button className="ghost-btn" onClick={copySummary}>Copy</button>
                <button className="ghost-btn danger-btn" onClick={deleteSelectedQuote}>Delete</button>
              </div>
            </div>
            <div className="customer-grid compact-customer-grid">
              <label>
                Customer name
                <input type="text" value={customer.name} onChange={(e) => setCustomer((current) => ({ ...current, name: e.target.value }))} placeholder="Customer name" />
              </label>
              <label>
                Customer email
                <input type="email" value={customer.email} onChange={(e) => setCustomer((current) => ({ ...current, email: e.target.value }))} placeholder="customer@email.com" />
              </label>
              <label>
                Customer phone
                <input type="text" value={customer.phone} onChange={(e) => setCustomer((current) => ({ ...current, phone: e.target.value }))} placeholder="(615) 555-1234" />
              </label>
            </div>
            {saveMessage ? <p className="small-note success-note">{saveMessage}</p> : null}
            <div className="quote-status-strip">
              <span className={`status-pill status-${selectedQuoteStatus}`}>Status: {selectedQuoteStatus}</span>
              <div className="status-actions">
                {["draft", "sent", "accepted", "declined"].map((status) => (
                  <button key={status} type="button" className={selectedQuoteStatus === status ? "status-btn active" : "status-btn"} onClick={() => setQuoteStatus(status)}>{status}</button>
                ))}
              </div>
            </div>
            <div className="summary-row"><span>Subtotal</span><strong>{currency.format(subtotal)}</strong></div>
            <div className="summary-row"><span>Sales tax on 40%</span><strong>{currency.format(salesTax)}</strong></div>
            <div className="summary-row"><span>Permitting + location fees</span><strong>{currency.format(permittingFee)}</strong></div>
            <label className="check inline-check summary-check">
              <input type="checkbox" checked={settings.removePermit} onChange={(e) => setSettings((current) => ({ ...current, removePermit: e.target.checked }))} />
              <span>Remove permit cost</span>
            </label>
            <div className="summary-row"><span>Optional deposit</span><strong>{currency.format(depositAmount)}</strong></div>
            {settings.showNoFinancingTotal && <div className="summary-row total"><span>Cash Price</span><strong>{currency.format(totalNoFinancing)}</strong></div>}

            <div className="summary-section">
              <div className="section-head compact-head no-margin-bottom">
                <h3>Financing plan</h3>
              </div>
              <button className="ghost-btn financing-toggle" onClick={() => setFinancingOpen((value) => !value)}>{financingOpen ? "Hide options" : "Change plan"}</button>
              <div className="selected-plan-card">
                <strong>{selectedPlan.label}</strong>
                <span>{selectedPlan.term} · {selectedPlan.apr}</span>
                <span>Payment factor {selectedPlan.paymentFactor}%</span>
              </div>
              <label>
                Deposit / cash down
                <input type="number" inputMode="decimal" min="0" step="0.01" value={settings.depositAmount} onChange={(e) => setSettings((current) => ({ ...current, depositAmount: e.target.value }))} />
              </label>
              {financingOpen && (
                <div className="plan-list compact-plan-list">
                  {financingPlans.map((plan) => (
                    <button key={plan.id} className={selectedPlanId === plan.id ? "plan-card active" : "plan-card"} onClick={() => { setSelectedPlanId(plan.id); setFinancingOpen(false); }}>
                      <strong>{plan.label}</strong>
                      <span>{plan.term}</span>
                      <span>{plan.apr}</span>
                      <span>Merchant fee {plan.merchantFee}%</span>
                      <span>Payment factor {plan.paymentFactor}%</span>
                    </button>
                  ))}
                </div>
              )}
              <div className="summary-row"><span>Financing Price</span><strong>{currency.format(financedSaleAmount)}</strong></div>
              <div className="summary-row"><span>Amount being financed after deposit</span><strong>{currency.format(financedBase)}</strong></div>
              <div className="summary-row accent"><span>{selectedPlan.label}</span><strong>{currency.format(monthlyPayment)}/mo</strong></div>
              {selectedPlan.details ? <p className="small-note">{selectedPlan.details}</p> : null}
            </div>
          </section>

          <section className="card sticky-card saved-quotes-card">
            <div className="section-head compact-head">
              <div>
                <h2>Saved quotes</h2>
                <p className="small-note">Admins and managers can see team quotes. Reps see their own.</p>
              </div>
              <span className="saved-count-pill">{savedQuotes.length} shown</span>
            </div>
            <div className="saved-quote-controls">
              {permissions.canViewTeamQuotes && (
                <div className="segmented-control">
                  <button className={quoteScope === "mine" ? "segmented-btn active" : "segmented-btn"} onClick={() => setQuoteScope("mine")}>My quotes</button>
                  <button className={quoteScope === "team" ? "segmented-btn active" : "segmented-btn"} onClick={() => setQuoteScope("team")}>Team quotes</button>
                </div>
              )}
              <label className="inline-select">
                <span>Status</span>
                <select value={quoteStatusFilter} onChange={(e) => setQuoteStatusFilter(e.target.value)}>
                  <option value="all">All</option>
                  <option value="draft">Draft</option>
                  <option value="sent">Sent</option>
                  <option value="accepted">Accepted</option>
                  <option value="declined">Declined</option>
                </select>
              </label>
            </div>
            {quotesLoading ? <p className="small-note">Loading saved quotes…</p> : null}
            {!quotesLoading && savedQuotes.length === 0 ? <p className="small-note">No saved quotes yet.</p> : null}
            <div className="saved-quotes-list">
              {savedQuotes.map((quote) => (
                <button key={quote.id} className={selectedQuoteId === quote.id ? "saved-quote-row active" : "saved-quote-row"} onClick={() => loadQuote(quote.id)}>
                  <div>
                    <strong>{quote.customer_name || "Untitled quote"}</strong>
                    <span>{quote.customer_email || quote.customer_phone || "No customer contact yet"}</span>
                    {permissions.canViewTeamQuotes && quote.owner_name ? <span className="owner-line">Owner: {quote.owner_name}</span> : null}
                  </div>
                  <div>
                    <strong>{currency.format(quote.financing_price || quote.cash_price || 0)}</strong>
                    <span>{quote.tier} · {new Date(quote.updated_at).toLocaleDateString()}</span>
                    <span className={`status-pill mini status-${quote.status || "draft"}`}>{quote.status || "draft"}</span>
                  </div>
                </button>
              ))}
            </div>
          </section>

          {settings.showCommission && (
            <section className="commission-box card bottom-commission">
              <div>
                <span>Commission at this tier</span>
                <strong>{currency.format(commissionAmount)}</strong>
              </div>
              <p>{selectedTier === "volume" ? "Volume tier counts revenue only." : `Stay at or move up tiers to improve payout on the same sale.`}</p>
            </section>
          )}
        </aside>

      {settingsOpen && (
        <div className="modal-backdrop" onClick={() => setSettingsOpen(false)}>
          <section className="modal card" onClick={(e) => e.stopPropagation()}>
            <div className="section-head compact-head">
              <div>
                <h2>Settings & help</h2>
                <p className="small-note">Theme, totals visibility, tutorial, and add-to-home-screen instructions.</p>
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
              <label className="check">
                <input type="checkbox" checked={settings.showCommission} onChange={(e) => setSettings((current) => ({ ...current, showCommission: e.target.checked }))} />
                <span>Show commission boxes</span>
              </label>
              <label className="check">
                <input type="checkbox" checked={settings.showNoFinancingTotal} onChange={(e) => setSettings((current) => ({ ...current, showNoFinancingTotal: e.target.checked }))} />
                <span>Show cash price</span>
              </label>
            </div>

            <div className="help-block access-help-block">
              <h3>Access level</h3>
              <div className="access-summary-list">
                <div><strong>Signed in as:</strong> {profile?.full_name || session.user.email}</div>
                <div><strong>Role:</strong> {formatRole(currentRole)}</div>
                <div><strong>Estimator:</strong> {permissions.canUseEstimator ? "Enabled" : "Blocked"}</div>
                <div><strong>Team quotes:</strong> {permissions.canViewTeamQuotes ? "Manager / admin access" : "Own quotes only"}</div>
                <div><strong>Pricing editor:</strong> {permissions.canManagePricing ? "Admin access" : "Locked"}</div>
              </div>
            </div>

            <div className="help-block">
              <h3>How to use</h3>
              <ol>
                <li>Select the tier first.</li>
                <li>Use the search bar to jump straight to the service you need.</li>
                <li>Swipe left or tap Renaissance view when quoting patio covers.</li>
                <li>Front and side overhangs reduce the framed span used for the structural checks.</li>
                <li>Add a deposit only to reduce the financed balance. It does not change the quoted sale amount.</li>
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
