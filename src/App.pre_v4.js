import React, { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  LOCAL_SESSION,
  PHASE_PRESETS,
  blobToDataUrl,
  buildDashboardModel,
  buildEffectiveTargets,
  buildPhaseForm,
  getActivePhase,
  getStoredPhases,
  saveStoredPhases,
  sortRowsByColumn,
  getLocalRows,
  setLocalRows
} from "./dashboardEngine";

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || "YOUR_SUPABASE_URL";
const SUPABASE_ANON_KEY =
  process.env.REACT_APP_SUPABASE_ANON_KEY || "YOUR_PUBLISHABLE_KEY";

const hasSupabaseConfig =
  SUPABASE_URL &&
  SUPABASE_ANON_KEY &&
  SUPABASE_URL !== "YOUR_SUPABASE_URL" &&
  SUPABASE_ANON_KEY !== "YOUR_PUBLISHABLE_KEY";

const supabase = hasSupabaseConfig
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

const LOGO_URL = "/logo.png";

const SCREENS = ["labs", "charts", "home", "body", "injections"];
const SCREEN_LABELS = {
  labs: "Labs",
  charts: "Charts",
  home: "Home",
  body: "Body",
  injections: "Injections"
};
const HOME_INDEX = 2;

const PEPTIDE_OPTIONS = [
  "Retatrutide",
  "Semorelin",
  "Tesamorelin",
  "CJC-1295",
  "Ipamorelin",
  "BPC-157",
  "TB-500",
  "AOD-9604",
  "MOTS-c",
  "GHK-Cu",
  "Testosterone Enanthate",
  "Testosterone Cypionate",
  "HCG",
  "NAD+"
];

const CARDIO_OPTIONS = [
  "Treadmill",
  "Stairs",
  "Bike",
  "Rowing",
  "Elliptical",
  "Outdoor Walk",
  "Outdoor Run",
  "Jog",
  "Sled Push",
  "Jump Rope",
  "HIIT",
  "Swimming",
  "Rucking"
];

const WORKOUT_OPTIONS = [
  "Chest",
  "Back",
  "Shoulders",
  "Biceps",
  "Triceps",
  "Legs",
  "Glutes",
  "Hamstrings",
  "Quads",
  "Calves",
  "Core",
  "Forearms",
  "Full Body"
];

const PHOTO_POSES = ["Front", "Side", "Back", "Relaxed", "Flexed"];
const ACTIVITY_LEVELS = ["Low", "Moderate", "High"];
const SEX_OPTIONS = ["Male", "Female", "Other / Prefer not to say"];
const TRT_TYPE_OPTIONS = [
  "",
  "Testosterone Cypionate",
  "Testosterone Enanthate",
  "Other"
];
const PEPTIDE_CATEGORY_OPTIONS = [
  "",
  "Fat loss",
  "Recovery",
  "GH / IGF support",
  "Longevity",
  "Other"
];

const PHASE_OPTIONS = Object.keys(PHASE_PRESETS);

const DEFAULT_PROFILE = {
  sex: "Male",
  age: "",
  heightInches: "",
  activityLevel: "Moderate",
  onTRT: false,
  usingPeptides: false,
  trtType: "",
  injectionFrequency: "",
  peptideCategory: ""
};

const PROTOCOL_LIBRARY = {
  Retatrutide: {
    family: "Appetite / fat-loss discussion",
    summary:
      "Usually tracked in cutting conversations where appetite control and weekly loss pace matter most.",
    communityContext: [
      "People usually care more about repeatable food adherence than flashy single-day scale drops.",
      "GI tolerance, hydration, bowel regularity, and training energy are often logged alongside bodyweight."
    ],
    phaseFit: {
      Cut: "Best matched to cut phases where the app can compare appetite control against weekly loss pace.",
      default:
        "Most useful when paired with waist, bodyweight, appetite, and cardio consistency notes."
    },
    watch: ["bodyweight trend", "waist", "GI tolerance", "fasting glucose", "resting heart rate"],
    logFocus: ["appetite", "meal adherence", "hydration", "energy", "nausea / GI notes"],
    timing:
      "Keep weigh-ins, food logs, and symptom notes consistent so the weekly trend is easy to read."
  },
  Semorelin: {
    family: "GH-support discussion",
    summary:
      "Usually discussed around sleep, recovery, and body-composition experiments rather than day-to-day scale moves.",
    communityContext: [
      "People usually watch whether sleep quality and recovery notes improve before they judge body composition.",
      "Labs and logs matter more when compared as trends than as single readings."
    ],
    phaseFit: {
      default:
        "Best treated like a recovery-context variable and paired with sleep, recovery, and glucose markers."
    },
    watch: ["IGF-1", "fasting glucose", "sleep quality", "water retention", "training recovery"],
    logFocus: ["sleep", "recovery", "energy", "hunger", "water retention"],
    timing:
      "Use similar meal timing and similar lab timing if you want cleaner before-vs-after comparisons."
  },
  Tesamorelin: {
    family: "GH-support discussion",
    summary:
      "Usually discussed around physique changes, glucose awareness, and longer trend windows.",
    communityContext: [
      "People usually monitor body composition and glucose markers, not just bodyweight alone.",
      "Trend quality is better when photo, waist, and bodyweight logs all stay current."
    ],
    phaseFit: {
      Cut: "Fits cutting contexts best when waist and scale trend are logged alongside glucose markers.",
      default:
        "Use it like a body-composition context variable and compare longer trend windows instead of single days."
    },
    watch: ["IGF-1", "fasting glucose", "A1C", "waist", "bodyweight trend"],
    logFocus: ["waist", "scale trend", "photos", "sleep", "glucose notes"],
    timing:
      "Pair this log with consistent waist and photo check-ins so the story is not just scale weight."
  },
  "CJC-1295": {
    family: "GH-support discussion",
    summary:
      "Usually talked about for recovery, sleep, and slower-moving body-composition changes.",
    communityContext: [
      "Most users watch sleep quality and recovery notes first.",
      "Progress photos and waist tend to be more useful than one random weigh-in."
    ],
    phaseFit: {
      default:
        "Works best as a recovery and body-composition context layer, not as a daily scale-weight driver."
    },
    watch: ["IGF-1", "fasting glucose", "sleep quality", "water retention", "recovery"],
    logFocus: ["sleep", "recovery", "pumps", "hunger", "scale trend"],
    timing:
      "Stable logging windows make it easier to judge whether recovery and body-composition changes are real."
  },
  Ipamorelin: {
    family: "GH-secretagogue discussion",
    summary:
      "Usually tracked around sleep, recovery, and hunger changes rather than strength spikes.",
    communityContext: [
      "People usually care about sleep quality, appetite changes, and how recovery feels across the week.",
      "Body-composition signals are easier to read when food adherence stays consistent."
    ],
    phaseFit: {
      default:
        "Best paired with sleep, hunger, and recovery notes so the app can tell a coherent story."
    },
    watch: ["fasting glucose", "sleep quality", "hunger", "bodyweight trend", "IGF-1"],
    logFocus: ["sleep", "recovery", "hunger", "water retention", "bodyweight"],
    timing:
      "Keep bodyweight and food logs steady so the app can separate appetite changes from real progress."
  },
  "BPC-157": {
    family: "Recovery discussion",
    summary:
      "Usually logged in rehab or return-to-training conversations, not as a mass or fat-loss driver.",
    communityContext: [
      "People usually pair it with pain notes, range of motion, and modified training blocks.",
      "The useful question is whether function improves, not whether one day feels magical."
    ],
    phaseFit: {
      default:
        "Most useful when you also log pain, exercise selection changes, and return-to-lift tolerance."
    },
    watch: ["pain notes", "range of motion", "exercise tolerance", "sleep", "training modifications"],
    logFocus: ["pain", "ROM", "exercise swaps", "sleep", "recovery"],
    timing:
      "Use specific notes about the affected area so later reviews are actually useful."
  },
  "TB-500": {
    family: "Recovery discussion",
    summary:
      "Usually discussed around connective-tissue recovery and modified training blocks.",
    communityContext: [
      "People usually want to know whether movement quality and pain-free ROM improve over time.",
      "This is easier to judge when exercise substitutions are logged clearly."
    ],
    phaseFit: {
      default:
        "Best tracked with rehab consistency, pain notes, and exercise-tolerance changes."
    },
    watch: ["pain notes", "range of motion", "exercise tolerance", "sleep", "training modifications"],
    logFocus: ["pain", "ROM", "exercise swaps", "recovery", "sleep"],
    timing:
      "Specific note-taking beats vague comments here — list the movement and what changed."
  },
  "AOD-9604": {
    family: "Fat-loss support discussion",
    summary:
      "Usually discussed in cutting conversations where users care about scale pace and waist more than gym PRs.",
    communityContext: [
      "People usually pair it with daily weigh-ins, waist tracking, and cardio compliance.",
      "Food adherence still matters more than any single protocol variable."
    ],
    phaseFit: {
      Cut: "Best paired with a cut where the app can compare it against bodyweight pace and cardio adherence.",
      default:
        "Treat it like a cutting-context variable and compare against waist, scale trend, and cardio."
    },
    watch: ["bodyweight trend", "waist", "cardio adherence", "appetite", "sleep quality"],
    logFocus: ["scale trend", "waist", "steps / cardio", "appetite", "sleep"],
    timing:
      "Match it with repeatable weigh-ins and cardio logs if you want useful trend analysis."
  },
  "MOTS-c": {
    family: "Metabolic-support discussion",
    summary:
      "Usually tracked for conditioning, glucose awareness, and general energy direction.",
    communityContext: [
      "People usually look for changes in conditioning, perceived energy, and glucose markers over time.",
      "A stronger cardio and step log makes this easier to interpret."
    ],
    phaseFit: {
      default:
        "Most useful when the app has cardio, bodyweight, and glucose-context data to compare."
    },
    watch: ["fasting glucose", "conditioning", "energy", "bodyweight trend", "cardio consistency"],
    logFocus: ["conditioning", "steps", "cardio tolerance", "energy", "weight"],
    timing:
      "Tie it to cardio logs so changes in conditioning are not just guesswork."
  },
  "GHK-Cu": {
    family: "Recovery / cosmetic-support discussion",
    summary:
      "Usually discussed for skin, tissue quality, or surface recovery rather than bodyweight pace.",
    communityContext: [
      "The most useful notes are visual or recovery related, not scale focused.",
      "Progress photos are usually more informative than macros or cardio here."
    ],
    phaseFit: {
      default:
        "Best paired with photos, skin notes, or localized recovery notes."
    },
    watch: ["progress photos", "skin notes", "healing notes", "sleep", "recovery"],
    logFocus: ["photos", "skin changes", "recovery", "sleep", "healing notes"],
    timing:
      "Use dated photos or short notes so comparisons stay objective."
  },
  "Testosterone Enanthate": {
    family: "Androgen / TRT-base discussion",
    summary:
      "Usually logged as a background routine variable where consistency and lab timing matter more than hype.",
    communityContext: [
      "In cruise or prescribed-TRT conversations, users usually care most about stable routine and symptom trends.",
      "In harder growth phases, people usually watch blood pressure, water retention, lipids, and hematocrit more closely."
    ],
    phaseFit: {
      Bulk:
        "Growth phases usually care about weekly weight pace, recovery, blood pressure, and water-retention notes.",
      "TRT Cruise":
        "Cruise phases reward stable timing, symptom logs, and clean lab comparisons.",
      Blast:
        "Performance-push phases usually bring health-marker tracking to the front of the dashboard.",
      default:
        "Treat this as a consistency variable and keep symptoms, blood pressure, and labs tied to the log."
    },
    watch: ["hematocrit", "hemoglobin", "estradiol", "PSA", "HDL / LDL", "blood pressure"],
    logFocus: ["injection timing", "energy", "libido", "recovery", "water retention"],
    timing:
      "Keep injection timing and lab timing repeatable so comparisons stay meaningful."
  },
  "Testosterone Cypionate": {
    family: "Androgen / TRT-base discussion",
    summary:
      "Usually logged as a background routine variable where consistency and lab timing matter more than hype.",
    communityContext: [
      "In cruise or prescribed-TRT conversations, users usually care most about stable routine and symptom trends.",
      "In harder growth phases, people usually watch blood pressure, water retention, lipids, and hematocrit more closely."
    ],
    phaseFit: {
      Bulk:
        "Growth phases usually care about weekly weight pace, recovery, blood pressure, and water-retention notes.",
      "TRT Cruise":
        "Cruise phases reward stable timing, symptom logs, and clean lab comparisons.",
      Blast:
        "Performance-push phases usually bring health-marker tracking to the front of the dashboard.",
      default:
        "Treat this as a consistency variable and keep symptoms, blood pressure, and labs tied to the log."
    },
    watch: ["hematocrit", "hemoglobin", "estradiol", "PSA", "HDL / LDL", "blood pressure"],
    logFocus: ["injection timing", "energy", "libido", "recovery", "water retention"],
    timing:
      "Keep injection timing and lab timing repeatable so comparisons stay meaningful."
  },
  HCG: {
    family: "Fertility / support discussion",
    summary:
      "Usually discussed as a support variable where symptom tracking and lab context matter more than the scale.",
    communityContext: [
      "People usually pair it with libido, mood, water-retention, and estradiol-aware notes.",
      "The useful question is whether the broader routine feels more stable over time."
    ],
    phaseFit: {
      default:
        "Most useful when symptom notes and lab trends stay tied to the same timeframe."
    },
    watch: ["estradiol", "mood", "water retention", "libido", "weight trend"],
    logFocus: ["mood", "libido", "water", "injection timing", "energy"],
    timing:
      "Use simple symptom notes so you can compare routine changes without guessing later."
  },
  "NAD+": {
    family: "Recovery / energy discussion",
    summary:
      "Usually tracked for general energy, conditioning, and recovery feel rather than direct physique changes.",
    communityContext: [
      "People usually judge this by energy, conditioning, and how consistent their routine feels.",
      "Cardio and sleep logs usually make the trend easier to interpret."
    ],
    phaseFit: {
      default:
        "Most useful when paired with cardio, sleep, and recovery notes."
    },
    watch: ["energy", "cardio tolerance", "sleep quality", "recovery", "bodyweight stability"],
    logFocus: ["energy", "sleep", "cardio tolerance", "recovery", "stress"],
    timing:
      "A steady routine makes this easier to judge than scattered, one-off logs."
  },
  __default__: {
    family: "Protocol tracking context",
    summary:
      "Use the protocol tab to tie timing, symptoms, labs, and progress together instead of treating one entry like a miracle switch.",
    communityContext: [
      "The most useful pattern is always consistency plus clean notes.",
      "Weight, waist, cardio, food, and labs make protocol logs smarter."
    ],
    phaseFit: {
      default:
        "Match the log to the phase goal so the app can tell whether progress is actually on pace."
    },
    watch: ["bodyweight trend", "waist", "energy", "sleep", "blood pressure"],
    logFocus: ["timing", "symptoms", "energy", "recovery", "bodyweight"],
    timing:
      "Keep logging windows stable so comparisons stay clean."
  }
};

const PHASE_FLAVOR_PRESETS = {
  "lean-growth": {
    strategyName: "Lean growth",
    calorieDelta: 180,
    proteinPerKg: 1.9,
    fatPerLb: 0.33,
    workouts: 4,
    rateTarget: 0.4,
    note:
      "Slow surplus, steady food execution, and enough cardio to keep appetite and recovery smooth."
  },
  "aggressive-growth": {
    strategyName: "Aggressive growth",
    calorieDelta: 360,
    proteinPerKg: 1.85,
    fatPerLb: 0.34,
    workouts: 5,
    rateTarget: 0.75,
    note:
      "Faster scale movement with tighter pressure on recovery, blood pressure, and food consistency."
  },
  "steady-cut": {
    strategyName: "Steady cut",
    calorieDelta: -425,
    proteinPerKg: 2.1,
    fatPerLb: 0.30,
    workouts: 4,
    rateTarget: 0.75,
    note:
      "Enough deficit to move bodyweight while still protecting lifting performance and recovery."
  },
  "aggressive-cut": {
    strategyName: "Aggressive cut",
    calorieDelta: -600,
    proteinPerKg: 2.25,
    fatPerLb: 0.28,
    workouts: 4,
    rateTarget: 1.2,
    note:
      "Harder deficit with more emphasis on protein, fatigue control, and daily weigh-ins."
  },
  stability: {
    strategyName: "Stability",
    calorieDelta: 0,
    proteinPerKg: 1.8,
    fatPerLb: 0.32,
    workouts: 3,
    rateTarget: 0.4,
    note:
      "Hold routine steady, keep bodyweight in range, and focus on repeatable habits."
  },
  "health-stability": {
    strategyName: "Health-first stability",
    calorieDelta: 0,
    proteinPerKg: 1.8,
    fatPerLb: 0.33,
    workouts: 3,
    rateTarget: 0.35,
    note:
      "Cruise-style defaults prioritize consistent habits, cardio, and lab readability."
  },
  "performance-push": {
    strategyName: "Performance push",
    calorieDelta: 250,
    proteinPerKg: 2.0,
    fatPerLb: 0.33,
    workouts: 5,
    rateTarget: 0.75,
    note:
      "Performance-focused defaults with extra pressure on recovery and health-marker tracking."
  }
};

const WORKOUT_TEMPLATES = {
  Chest: [
    "Chest (evidence-based):",
    "1. Incline dumbbell press — 3-4 sets x 6-10 reps",
    "2. Flat barbell or smith bench press — 3-4 sets x 5-8 reps",
    "3. Cable fly or pec deck — 2-4 sets x 10-15 reps",
    "4. Weighted dips or machine chest press — 2-3 sets x 8-12 reps",
    "",
    "Focus:",
    "- Use full ROM and control the stretch",
    "- Keep 0-2 reps in reserve on most working sets",
    "- Progress load or reps each week"
  ].join("\n"),
  Back: [
    "Back (evidence-based):",
    "1. Chest-supported row or barbell row — 3-4 sets x 6-10 reps",
    "2. Lat pulldown or weighted pull-up — 3-4 sets x 6-10 reps",
    "3. One-arm dumbbell row or cable row — 2-3 sets x 8-12 reps",
    "4. Straight-arm pulldown or pullover — 2-3 sets x 10-15 reps",
    "",
    "Focus:",
    "- Include both a horizontal row and a vertical pull",
    "- Drive elbows, don’t yank with momentum",
    "- Pause briefly in the stretched position when safe"
  ].join("\n"),
  Shoulders: [
    "Shoulders (evidence-based):",
    "1. Seated dumbbell shoulder press — 3-4 sets x 6-10 reps",
    "2. Cable or dumbbell lateral raise — 4-6 sets x 10-20 reps",
    "3. Reverse pec deck or rear-delt cable fly — 3-4 sets x 12-20 reps",
    "4. Upright cable raise or machine press — 2-3 sets x 8-12 reps",
    "",
    "Focus:",
    "- Prioritize laterals and rear delts, not just pressing",
    "- Smooth tempo, no ego swinging",
    "- High-quality reps beat heavier sloppy reps"
  ].join("\n"),
  Biceps: [
    "Biceps (evidence-based):",
    "1. Incline dumbbell curl — 3-4 sets x 8-12 reps",
    "2. EZ-bar curl — 3-4 sets x 6-10 reps",
    "3. Cable curl or preacher curl — 2-4 sets x 10-15 reps",
    "",
    "Focus:",
    "- Let the arm fully lengthen at the bottom",
    "- Keep upper arm stable",
    "- Train close to failure"
  ].join("\n"),
  Triceps: [
    "Triceps (evidence-based):",
    "1. Overhead cable triceps extension — 3-4 sets x 8-12 reps",
    "2. Skull crushers or PJR pullover — 2-3 sets x 8-12 reps",
    "3. Pressdown — 3-4 sets x 10-15 reps",
    "4. Dips or close-grip bench — 2-3 sets x 6-10 reps",
    "",
    "Focus:",
    "- Include at least one overhead movement for long-head bias",
    "- Control the stretch",
    "- Lock out hard without bouncing"
  ].join("\n"),
  Legs: [
    "Legs (evidence-based):",
    "1. Hack squat, pendulum squat, or back squat — 3-4 sets x 5-10 reps",
    "2. Leg press — 3-4 sets x 8-15 reps",
    "3. Romanian deadlift — 3-4 sets x 6-10 reps",
    "4. Leg extension — 2-4 sets x 10-15 reps",
    "5. Seated or lying leg curl — 2-4 sets x 10-15 reps",
    "",
    "Focus:",
    "- Deep ROM where safe",
    "- Control eccentrics",
    "- Use both knee-dominant and hip-dominant work"
  ].join("\n"),
  Quads: [
    "Quads (evidence-based):",
    "1. Hack squat or high-bar squat — 3-4 sets x 5-10 reps",
    "2. Leg press with deep knee flexion — 3-4 sets x 10-15 reps",
    "3. Bulgarian split squat — 2-3 sets x 8-12 reps each side",
    "4. Leg extension — 3-4 sets x 10-15 reps",
    "",
    "Focus:",
    "- Prioritize knee flexion and controlled depth",
    "- Don’t rush the bottom"
  ].join("\n"),
  Hamstrings: [
    "Hamstrings (evidence-based):",
    "1. Romanian deadlift — 3-4 sets x 6-10 reps",
    "2. Seated leg curl — 3-4 sets x 8-15 reps",
    "3. Lying leg curl — 2-3 sets x 10-15 reps",
    "4. 45-degree back extension with hip bias — 2-3 sets x 10-15 reps",
    "",
    "Focus:",
    "- Include both hip hinge and curl patterns",
    "- Full stretch matters"
  ].join("\n"),
  Glutes: [
    "Glutes (evidence-based):",
    "1. Barbell hip thrust — 3-4 sets x 6-10 reps",
    "2. Bulgarian split squat — 3-4 sets x 8-12 reps each side",
    "3. Romanian deadlift — 3-4 sets x 6-10 reps",
    "4. Cable kickback or 45-degree back extension — 2-4 sets x 10-15 reps",
    "",
    "Focus:",
    "- Use both shortened-position and lengthened-position exercises",
    "- Hard lockout on thrusts, stretch on hinges"
  ].join("\n"),
  Calves: [
    "Calves (evidence-based):",
    "1. Standing calf raise — 4-6 sets x 6-12 reps",
    "2. Seated calf raise — 4-6 sets x 10-20 reps",
    "",
    "Focus:",
    "- Full stretch at the bottom",
    "- Pause at peak contraction",
    "- Calves usually need high consistency"
  ].join("\n"),
  Core: [
    "Core (evidence-based):",
    "1. Cable crunch — 3-4 sets x 10-15 reps",
    "2. Hanging leg raise or reverse crunch — 3-4 sets x 8-15 reps",
    "3. Ab wheel rollout or plank variation — 2-3 sets",
    "",
    "Focus:",
    "- Progressive overload still matters",
    "- Don’t turn abs into random burnout work"
  ].join("\n"),
  Forearms: [
    "Forearms (evidence-based):",
    "1. Hammer curl — 3-4 sets x 8-12 reps",
    "2. Wrist curl — 2-3 sets x 12-20 reps",
    "3. Reverse curl — 2-3 sets x 10-15 reps",
    "4. Farmer carry — 2-3 rounds",
    "",
    "Focus:",
    "- Use both flexion and grip work"
  ].join("\n"),
  "Full Body": [
    "Full Body (evidence-based):",
    "1. Squat or leg press — 3-4 sets x 5-10 reps",
    "2. Bench or incline dumbbell press — 3-4 sets x 6-10 reps",
    "3. Row or pulldown — 3-4 sets x 6-10 reps",
    "4. Romanian deadlift — 2-3 sets x 6-10 reps",
    "5. Lateral raise — 2-3 sets x 12-20 reps",
    "6. Curl + triceps extension — 2-3 sets each",
    "",
    "Focus:",
    "- Great option when schedule is inconsistent",
    "- Keep effort high and total session tight"
  ].join("\n")
};

const WORKOUT_VARIATIONS = {
  Chest: [
    { name: "Upper chest bias", focus: "Press-heavy with a deep stretch.", plan: ["Chest — Upper chest bias:","1. Incline smith press — 4 sets x 5-8 reps","2. Low-incline dumbbell press — 3 sets x 8-10 reps","3. High-to-low cable fly — 3 sets x 12-15 reps","4. Machine chest press — 2 sets x 10-12 reps","","Focus:","- Keep shoulder blades locked down","- Own the stretch on every rep","- Stop 0-1 reps short of form breakdown"].join("\n") },
    { name: "Machine pump day", focus: "Stable pressing with higher-rep tension.", plan: ["Chest — Machine pump day:","1. Plate-loaded incline press — 3 sets x 8-12 reps","2. Flat machine press — 3 sets x 8-12 reps","3. Pec deck fly — 3 sets x 12-18 reps","4. Deficit push-ups — 2 sets close to failure","","Focus:","- Short rest periods","- Drive blood into the muscle without beating up joints"].join("\n") }
  ],
  Back: [
    { name: "Lat width day", focus: "Vertical pulling with stretch emphasis.", plan: ["Back — Lat width day:","1. Neutral-grip pulldown — 4 sets x 6-10 reps","2. Assisted or weighted pull-up — 3 sets x 5-8 reps","3. One-arm cable lat row — 3 sets x 8-12 reps","4. Straight-arm pulldown — 2-3 sets x 12-15 reps","","Focus:","- Think elbows to hips","- Limit torso swing"].join("\n") },
    { name: "Mid-back density", focus: "Rows, pauses, and controlled eccentrics.", plan: ["Back — Mid-back density:","1. Chest-supported T-bar row — 4 sets x 6-10 reps","2. Seated cable row — 3 sets x 8-12 reps","3. Meadows row — 2-3 sets x 8-10 reps","4. Reverse fly or rear-delt row — 2-3 sets x 12-15 reps","","Focus:","- Pause at contraction","- Keep ribcage stacked and stable"].join("\n") }
  ],
  Shoulders: [
    { name: "Capped delts", focus: "Lateral delt volume with controlled pressing.", plan: ["Shoulders — Capped delts:","1. Seated dumbbell press — 3 sets x 6-10 reps","2. Cable lateral raise — 4 sets x 12-18 reps","3. Lean-away lateral raise — 3 sets x 12-15 reps","4. Reverse pec deck — 3 sets x 15-20 reps","","Focus:","- Let the side delt do the work","- Avoid shrugging through raises"].join("\n") },
    { name: "Rear-delt bias", focus: "Posterior shoulder and scap control.", plan: ["Shoulders — Rear-delt bias:","1. Reverse cable fly — 4 sets x 12-20 reps","2. Chest-supported rear-delt row — 3 sets x 10-15 reps","3. Machine shoulder press — 3 sets x 8-12 reps","4. Cable Y-raise — 2-3 sets x 12-15 reps","","Focus:","- Smooth tempo","- Keep traps from taking over"].join("\n") }
  ],
  Biceps: [
    { name: "Lengthened biceps", focus: "Bias the bottom stretch.", plan: ["Biceps — Lengthened bias:","1. Incline dumbbell curl — 4 sets x 8-12 reps","2. Bayesian cable curl — 3 sets x 10-15 reps","3. EZ-bar curl — 3 sets x 6-10 reps","","Focus:","- Full elbow extension","- Minimal shoulder swing"].join("\n") }
  ],
  Triceps: [
    { name: "Long-head bias", focus: "Overhead work first, pressdown second.", plan: ["Triceps — Long-head bias:","1. Overhead rope extension — 4 sets x 8-12 reps","2. PJR pullover — 3 sets x 8-10 reps","3. Straight-bar pressdown — 3 sets x 10-15 reps","","Focus:","- Stretch hard overhead","- Lockout with control"].join("\n") }
  ],
  Legs: [
    { name: "Quad dominant", focus: "More knee flexion and higher total work.", plan: ["Legs — Quad dominant:","1. Hack squat — 4 sets x 6-10 reps","2. Leg press — 3 sets x 10-15 reps","3. Bulgarian split squat — 2-3 sets x 8-12 reps","4. Leg extension — 3 sets x 12-15 reps","5. Seated leg curl — 3 sets x 10-15 reps","","Focus:","- Deep, controlled ROM","- Drive knees forward confidently if pain-free"].join("\n") },
    { name: "Posterior chain", focus: "Hinge, hamstrings, and glutes first.", plan: ["Legs — Posterior chain:","1. Romanian deadlift — 4 sets x 6-10 reps","2. Seated leg curl — 4 sets x 8-12 reps","3. Pendulum or front squat — 3 sets x 6-10 reps","4. Hip thrust — 3 sets x 8-12 reps","5. Walking lunge — 2 sets x 12-16 steps","","Focus:","- Long eccentrics","- Own hip position on hinges"].join("\n") }
  ],
  Quads: [
    { name: "Quad sweep", focus: "High-tension squat pattern plus extensions.", plan: ["Quads — Sweep session:","1. Front squat — 4 sets x 5-8 reps","2. Leg press — 3 sets x 10-15 reps","3. Heel-elevated split squat — 2-3 sets x 8-12 reps","4. Leg extension — 4 sets x 12-20 reps","","Focus:","- Keep pressure through mid-foot","- Chase clean depth"].join("\n") }
  ],
  Hamstrings: [
    { name: "Hamstring length", focus: "Curl + hinge pairing.", plan: ["Hamstrings — Length bias:","1. Romanian deadlift — 4 sets x 6-10 reps","2. Seated leg curl — 4 sets x 8-12 reps","3. Lying leg curl — 2-3 sets x 12-15 reps","4. Back extension — 2 sets x 12-15 reps","","Focus:","- Stretch at the bottom","- Avoid bouncing out of the hinge"].join("\n") }
  ],
  Glutes: [
    { name: "Glute growth", focus: "Heavy hip extension and unilateral work.", plan: ["Glutes — Growth session:","1. Barbell hip thrust — 4 sets x 6-10 reps","2. Romanian deadlift — 3 sets x 6-10 reps","3. Bulgarian split squat — 3 sets x 8-12 reps","4. Cable kickback — 2-3 sets x 12-20 reps","","Focus:","- Hard lockout on thrusts","- Long step length on split squats"].join("\n") }
  ],
  Core: [
    { name: "Anti-extension", focus: "Build trunk control under tension.", plan: ["Core — Stability bias:","1. Ab wheel rollout — 3 sets x 8-12 reps","2. Cable crunch — 3 sets x 10-15 reps","3. Dead bug or hollow hold — 2-3 rounds","","Focus:","- Brace hard before each rep","- Slow the lowering phase"].join("\n") }
  ],
  "Full Body": [
    { name: "3-day rotation", focus: "Strength and hypertrophy with tight sessions.", plan: ["Full Body — 3-day rotation:","1. Squat or leg press — 3 sets x 5-8 reps","2. Incline dumbbell press — 3 sets x 6-10 reps","3. Chest-supported row — 3 sets x 8-12 reps","4. Romanian deadlift — 2-3 sets x 6-10 reps","5. Lateral raise — 2 sets x 12-20 reps","6. Curl + pressdown superset — 2 sets each","","Focus:","- Great for busy weeks","- Keep rests moving"].join("\n") }
  ]
};

function getWorkoutVariants(group) {
  const base = WORKOUT_TEMPLATES[group]
    ? [{ name: "Evidence-based base", focus: "Reliable starting point.", plan: WORKOUT_TEMPLATES[group] }]
    : [];
  return [...base, ...(WORKOUT_VARIATIONS[group] || [])];
}

const LAB_DEFAULTS = {
  "Total Testosterone": {
    tier: "essential",
    unit: "ng/dL",
    low: 264,
    high: 916
  },
  "Free Testosterone": {
    tier: "essential",
    unit: "pg/mL",
    low: 9.3,
    high: 26.5,
    note: "Default adult male range"
  },
  "Estradiol (Sensitive)": {
    tier: "essential",
    unit: "pg/mL",
    low: 8,
    high: 35
  },
  Hematocrit: {
    tier: "essential",
    unit: "%",
    low: 40.7,
    high: 50.3
  },
  Hemoglobin: {
    tier: "essential",
    unit: "g/dL",
    low: 13.8,
    high: 17.2
  },
  HDL: {
    tier: "essential",
    unit: "mg/dL",
    low: 40,
    high: null
  },
  LDL: {
    tier: "essential",
    unit: "mg/dL",
    low: null,
    high: 100
  },
  Triglycerides: {
    tier: "essential",
    unit: "mg/dL",
    low: null,
    high: 150
  },
  ALT: {
    tier: "essential",
    unit: "U/L",
    low: 4,
    high: 36
  },
  AST: {
    tier: "essential",
    unit: "U/L",
    low: 8,
    high: 33
  },
  SHBG: {
    tier: "important",
    unit: "nmol/L",
    low: 10,
    high: 50
  },
  Prolactin: {
    tier: "important",
    unit: "ng/mL",
    low: 4.04,
    high: 15.2
  },
  PSA: {
    tier: "important",
    unit: "ng/mL",
    low: 0,
    high: 4
  },
  A1C: {
    tier: "important",
    unit: "%",
    low: null,
    high: 5.6
  },
  "Fasting Glucose": {
    tier: "important",
    unit: "mg/dL",
    low: null,
    high: 99
  },
  Insulin: {
    tier: "important",
    unit: "uIU/mL",
    low: null,
    high: 18.4
  },
  "IGF-1": {
    tier: "advanced",
    unit: "ng/mL",
    low: null,
    high: null
  },
  LH: {
    tier: "advanced",
    unit: "mIU/mL",
    low: 1.5,
    high: 9.3
  },
  FSH: {
    tier: "advanced",
    unit: "mIU/mL",
    low: 1.5,
    high: 12.4
  },
  "DHEA-S": {
    tier: "advanced",
    unit: "ug/dL",
    low: null,
    high: null
  },
  Cortisol: {
    tier: "advanced",
    unit: "ug/dL",
    low: 6.2,
    high: 19.4,
    note: "AM default range"
  }
};

const BASE_FOODS = [
  { name: "Eggs (2)", category: "Protein", calories: 140, protein: 12, carbs: 1, fats: 10, fiber: 0 },
  { name: "Chicken breast (6 oz)", category: "Protein", calories: 280, protein: 53, carbs: 0, fats: 6, fiber: 0 },
  { name: "Ground beef (6 oz)", category: "Protein", calories: 360, protein: 34, carbs: 0, fats: 24, fiber: 0 },
  { name: "Salmon (6 oz)", category: "Protein", calories: 350, protein: 34, carbs: 0, fats: 22, fiber: 0 },
  { name: "Protein shake", category: "Protein", calories: 160, protein: 30, carbs: 5, fats: 2, fiber: 1 },
  { name: "Greek yogurt cup", category: "Dairy", calories: 130, protein: 12, carbs: 9, fats: 4, fiber: 0 },
  { name: "Scrambled eggs (3)", category: "Protein", calories: 210, protein: 18, carbs: 2, fats: 15, fiber: 0 },
  { name: "White rice (1 cup)", category: "Carbs", calories: 205, protein: 4, carbs: 45, fats: 0.4, fiber: 0.6 },
  { name: "Corn tortilla (3)", category: "Carbs", calories: 180, protein: 4, carbs: 36, fats: 3, fiber: 5 },
  { name: "Flour tortilla large", category: "Carbs", calories: 220, protein: 6, carbs: 35, fats: 6, fiber: 2 },
  { name: "Mexican rice (1 cup)", category: "Carbs", calories: 240, protein: 4, carbs: 45, fats: 5, fiber: 2 },
  { name: "Toast (1 slice)", category: "Carbs", calories: 80, protein: 3, carbs: 15, fats: 1, fiber: 2 },
  { name: "Bagel", category: "Carbs", calories: 250, protein: 9, carbs: 48, fats: 1, fiber: 2 },
  { name: "Chicken tacos (3)", category: "Meals", calories: 420, protein: 30, carbs: 36, fats: 18, fiber: 5 },
  { name: "Carne asada tacos (3)", category: "Meals", calories: 510, protein: 33, carbs: 36, fats: 24, fiber: 5 },
  { name: "Al pastor tacos (3)", category: "Meals", calories: 540, protein: 27, carbs: 39, fats: 27, fiber: 5 },
  { name: "Burrito carne asada", category: "Meals", calories: 760, protein: 38, carbs: 74, fats: 33, fiber: 8 },
  { name: "Burrito chicken", category: "Meals", calories: 690, protein: 42, carbs: 70, fats: 24, fiber: 7 },
  { name: "Quesadilla cheese", category: "Meals", calories: 430, protein: 18, carbs: 32, fats: 26, fiber: 2 },
  { name: "Quesadilla chicken", category: "Meals", calories: 500, protein: 34, carbs: 34, fats: 24, fiber: 2 },
  { name: "Enchiladas rojas (3)", category: "Meals", calories: 580, protein: 24, carbs: 48, fats: 31, fiber: 5 },
  { name: "Chilaquiles with chicken", category: "Meals", calories: 620, protein: 28, carbs: 54, fats: 32, fiber: 6 },
  { name: "Pozole bowl", category: "Meals", calories: 390, protein: 24, carbs: 31, fats: 18, fiber: 4 },
  { name: "Menudo bowl", category: "Meals", calories: 330, protein: 22, carbs: 18, fats: 17, fiber: 1 },
  { name: "Tamales (2)", category: "Meals", calories: 520, protein: 14, carbs: 58, fats: 24, fiber: 4 },
  { name: "Arroz con pollo plate", category: "Meals", calories: 640, protein: 36, carbs: 58, fats: 26, fiber: 4 },
  { name: "Caldo de pollo bowl", category: "Meals", calories: 280, protein: 24, carbs: 16, fats: 12, fiber: 2 },
  { name: "Mole chicken plate", category: "Meals", calories: 670, protein: 35, carbs: 42, fats: 38, fiber: 5 },
  { name: "Torta carne asada", category: "Meals", calories: 710, protein: 36, carbs: 61, fats: 35, fiber: 4 },
  { name: "Fried chicken (1 piece)", category: "Southern", calories: 320, protein: 20, carbs: 8, fats: 22, fiber: 0 },
  { name: "Hot chicken (Nashville)", category: "Southern", calories: 400, protein: 28, carbs: 12, fats: 26, fiber: 1 },
  { name: "Pulled pork (6 oz)", category: "Southern", calories: 420, protein: 32, carbs: 6, fats: 30, fiber: 0 },
  { name: "BBQ ribs (6 oz)", category: "Southern", calories: 480, protein: 34, carbs: 10, fats: 34, fiber: 0 },
  { name: "Mac and cheese (1 cup)", category: "Southern", calories: 310, protein: 10, carbs: 35, fats: 15, fiber: 2 },
  { name: "Biscuits (2)", category: "Southern", calories: 300, protein: 6, carbs: 40, fats: 12, fiber: 2 },
  { name: "Burger", category: "Fast Food", calories: 520, protein: 26, carbs: 40, fats: 28, fiber: 2 },
  { name: "Cheeseburger", category: "Fast Food", calories: 300, protein: 17, carbs: 30, fats: 14, fiber: 2 },
  { name: "Double cheeseburger", category: "Fast Food", calories: 450, protein: 25, carbs: 32, fats: 26, fiber: 2 },
  { name: "Chicken sandwich", category: "Fast Food", calories: 420, protein: 28, carbs: 40, fats: 18, fiber: 2 },
  { name: "Fries (medium)", category: "Fast Food", calories: 365, protein: 4, carbs: 48, fats: 17, fiber: 4 },
  { name: "Pizza slice", category: "Fast Food", calories: 285, protein: 12, carbs: 36, fats: 10, fiber: 2.5 },
  { name: "Pizza (2 slices)", category: "Fast Food", calories: 570, protein: 24, carbs: 72, fats: 20, fiber: 4 },
  { name: "Refried beans (1 cup)", category: "Fiber", calories: 240, protein: 12, carbs: 30, fats: 8, fiber: 9 },
  { name: "Charro beans (1 cup)", category: "Fiber", calories: 210, protein: 11, carbs: 24, fats: 8, fiber: 8 },
  { name: "Edamame (1 cup)", category: "Fiber", calories: 190, protein: 17, carbs: 14, fats: 8, fiber: 8 },
  { name: "Chia seeds (1 tbsp)", category: "Fiber", calories: 60, protein: 2, carbs: 5, fats: 4, fiber: 5 },
  { name: "Flax seeds (1 tbsp)", category: "Fiber", calories: 55, protein: 2, carbs: 3, fats: 4, fiber: 3 },
  { name: "Black beans (1 cup)", category: "Fiber", calories: 225, protein: 15, carbs: 40, fats: 1, fiber: 15 },
  { name: "Banana", category: "Fruits", calories: 105, protein: 1.3, carbs: 27, fats: 0.4, fiber: 3 },
  { name: "Apple", category: "Fruits", calories: 95, protein: 0.5, carbs: 25, fats: 0.3, fiber: 4 },
  { name: "Strawberries (1 cup)", category: "Fruits", calories: 50, protein: 1, carbs: 12, fats: 0.5, fiber: 3 },
  { name: "Blueberries (1 cup)", category: "Fruits", calories: 85, protein: 1, carbs: 21, fats: 0.5, fiber: 4 },
  { name: "Watermelon (1 cup)", category: "Fruits", calories: 45, protein: 1, carbs: 11, fats: 0, fiber: 0.5 },
  { name: "Broccoli (1 cup)", category: "Vegetables", calories: 55, protein: 4, carbs: 11, fats: 0.5, fiber: 5 },
  { name: "Green beans (1 cup)", category: "Vegetables", calories: 40, protein: 2, carbs: 9, fats: 0, fiber: 4 },
  { name: "Corn (1 cup)", category: "Vegetables", calories: 155, protein: 5, carbs: 32, fats: 2, fiber: 3 },
  { name: "Mashed potatoes (1 cup)", category: "Vegetables", calories: 210, protein: 4, carbs: 35, fats: 8, fiber: 3 },
  { name: "Spinach (1 cup)", category: "Vegetables", calories: 7, protein: 1, carbs: 1, fats: 0, fiber: 1 },
  { name: "Kale (1 cup)", category: "Vegetables", calories: 33, protein: 3, carbs: 6, fats: 0.5, fiber: 2 },
  { name: "Coca Cola (12 oz)", category: "Drinks", calories: 140, protein: 0, carbs: 39, fats: 0, fiber: 0 },
  { name: "Diet Coke", category: "Drinks", calories: 0, protein: 0, carbs: 0, fats: 0, fiber: 0 },
  { name: "Sweet tea (16 oz)", category: "Drinks", calories: 180, protein: 0, carbs: 45, fats: 0, fiber: 0 },
  { name: "Orange juice (8 oz)", category: "Drinks", calories: 110, protein: 2, carbs: 26, fats: 0, fiber: 0.5 },
  { name: "Monster (16 oz)", category: "Energy", calories: 210, protein: 0, carbs: 54, fats: 0, fiber: 0 },
  { name: "Sugar-free Monster", category: "Energy", calories: 10, protein: 0, carbs: 3, fats: 0, fiber: 0 },
  { name: "Red Bull (8.4 oz)", category: "Energy", calories: 110, protein: 0, carbs: 27, fats: 0, fiber: 0 },
  { name: "Peanut butter (2 tbsp)", category: "Snacks", calories: 190, protein: 8, carbs: 6, fats: 16, fiber: 2 },
  { name: "Oatmeal (1 cup)", category: "Snacks", calories: 150, protein: 5, carbs: 27, fats: 3, fiber: 4 },
  { name: "Granola bar", category: "Snacks", calories: 180, protein: 3, carbs: 30, fats: 7, fiber: 2 },
  { name: "Trail mix (1 oz)", category: "Snacks", calories: 140, protein: 4, carbs: 12, fats: 9, fiber: 2 },
  { name: "Popcorn (air popped, 3 cups)", category: "Snacks", calories: 90, protein: 3, carbs: 18, fats: 1, fiber: 4 },
  { name: "Whole milk (1 cup)", category: "Dairy", calories: 150, protein: 8, carbs: 12, fats: 8, fiber: 0 },
  { name: "Almond milk (unsweetened)", category: "Dairy", calories: 30, protein: 1, carbs: 1, fats: 2.5, fiber: 0 },
  { name: "Cheddar cheese (1 oz)", category: "Dairy", calories: 110, protein: 7, carbs: 1, fats: 9, fiber: 0 },
  { name: "Pan dulce", category: "Sweets", calories: 290, protein: 5, carbs: 42, fats: 11, fiber: 1 }
];

const FOOD_LIBRARY_EXPANSION = [
  { name: "Oatmeal cup", category: "Breakfast", calories: 150, protein: 5, carbs: 27, fats: 3, fiber: 4 },
  { name: "Overnight oats jar", category: "Breakfast", calories: 320, protein: 20, carbs: 42, fats: 8, fiber: 7 },
  { name: "Pancakes (3)", category: "Breakfast", calories: 350, protein: 8, carbs: 58, fats: 9, fiber: 2 },
  { name: "French toast (3 slices)", category: "Breakfast", calories: 360, protein: 16, carbs: 45, fats: 12, fiber: 3 },
  { name: "Breakfast burrito", category: "Breakfast", calories: 540, protein: 28, carbs: 42, fats: 28, fiber: 4 },
  { name: "Turkey bacon (4)", category: "Protein", calories: 140, protein: 12, carbs: 1, fats: 9, fiber: 0 },
  { name: "Sirloin steak (6 oz)", category: "Protein", calories: 340, protein: 42, carbs: 0, fats: 18, fiber: 0 },
  { name: "Ground turkey (6 oz)", category: "Protein", calories: 240, protein: 33, carbs: 0, fats: 11, fiber: 0 },
  { name: "Tilapia (6 oz)", category: "Protein", calories: 190, protein: 40, carbs: 0, fats: 3, fiber: 0 },
  { name: "Shrimp (6 oz)", category: "Protein", calories: 170, protein: 36, carbs: 1, fats: 2, fiber: 0 },
  { name: "Cottage cheese cup", category: "Dairy", calories: 160, protein: 26, carbs: 6, fats: 3, fiber: 0 },
  { name: "String cheese (2)", category: "Dairy", calories: 160, protein: 12, carbs: 2, fats: 12, fiber: 0 },
  { name: "Fairlife protein shake", category: "Protein", calories: 150, protein: 30, carbs: 4, fats: 2, fiber: 1 },
  { name: "Whey isolate scoop", category: "Supplements", calories: 120, protein: 25, carbs: 2, fats: 1, fiber: 0 },
  { name: "Mass gainer shake", category: "Supplements", calories: 640, protein: 50, carbs: 84, fats: 12, fiber: 5 },
  { name: "Cream of rice bowl", category: "Carbs", calories: 180, protein: 3, carbs: 40, fats: 0, fiber: 1 },
  { name: "Sweet potato (1 medium)", category: "Carbs", calories: 112, protein: 2, carbs: 26, fats: 0, fiber: 4 },
  { name: "Jasmine rice (1 cup)", category: "Carbs", calories: 205, protein: 4, carbs: 45, fats: 0, fiber: 1 },
  { name: "Sourdough bread (2 slices)", category: "Carbs", calories: 190, protein: 8, carbs: 36, fats: 2, fiber: 2 },
  { name: "English muffin", category: "Carbs", calories: 130, protein: 5, carbs: 26, fats: 1, fiber: 1 },
  { name: "Rice cakes (4)", category: "Carbs", calories: 140, protein: 3, carbs: 30, fats: 1, fiber: 1 },
  { name: "Blueberries cup", category: "Fruit", calories: 84, protein: 1, carbs: 21, fats: 0, fiber: 4 },
  { name: "Banana", category: "Fruit", calories: 105, protein: 1, carbs: 27, fats: 0, fiber: 3 },
  { name: "Apple", category: "Fruit", calories: 95, protein: 0, carbs: 25, fats: 0, fiber: 4 },
  { name: "Avocado (half)", category: "Fats", calories: 120, protein: 2, carbs: 6, fats: 11, fiber: 5 },
  { name: "Peanut butter (2 tbsp)", category: "Fats", calories: 190, protein: 8, carbs: 7, fats: 16, fiber: 2 },
  { name: "Almonds (1 oz)", category: "Fats", calories: 164, protein: 6, carbs: 6, fats: 14, fiber: 3 },
  { name: "Olive oil (1 tbsp)", category: "Fats", calories: 120, protein: 0, carbs: 0, fats: 14, fiber: 0 },
  { name: "Chicken and rice bowl", category: "Meals", calories: 560, protein: 43, carbs: 55, fats: 15, fiber: 4 },
  { name: "Steak and potatoes", category: "Meals", calories: 690, protein: 48, carbs: 48, fats: 32, fiber: 5 },
  { name: "Salmon rice bowl", category: "Meals", calories: 620, protein: 38, carbs: 52, fats: 28, fiber: 4 },
  { name: "Turkey sandwich", category: "Meals", calories: 420, protein: 34, carbs: 38, fats: 14, fiber: 4 },
  { name: "Chipotle chicken bowl", category: "Restaurant", calories: 760, protein: 54, carbs: 71, fats: 28, fiber: 10 },
  { name: "Chipotle steak bowl", category: "Restaurant", calories: 790, protein: 49, carbs: 74, fats: 32, fiber: 10 },
  { name: "Sushi roll (8 pcs)", category: "Restaurant", calories: 300, protein: 12, carbs: 46, fats: 6, fiber: 2 },
  { name: "Pho bowl", category: "Restaurant", calories: 500, protein: 28, carbs: 58, fats: 16, fiber: 3 },
  { name: "In-N-Out double-double", category: "Fast Food", calories: 670, protein: 37, carbs: 39, fats: 41, fiber: 3 },
  { name: "Chick-fil-A grilled nuggets (12)", category: "Fast Food", calories: 200, protein: 38, carbs: 2, fats: 4, fiber: 0 },
  { name: "Chick-fil-A sandwich", category: "Fast Food", calories: 440, protein: 29, carbs: 41, fats: 19, fiber: 1 },
  { name: "McDonald's McChicken", category: "Fast Food", calories: 400, protein: 14, carbs: 40, fats: 21, fiber: 2 },
  { name: "Taco Bell power bowl", category: "Fast Food", calories: 460, protein: 27, carbs: 46, fats: 18, fiber: 8 },
  { name: "Protein bar", category: "Snacks", calories: 220, protein: 20, carbs: 23, fats: 7, fiber: 7 },
  { name: "Greek yogurt parfait", category: "Snacks", calories: 240, protein: 15, carbs: 32, fats: 6, fiber: 3 },
  { name: "Trail mix handful", category: "Snacks", calories: 180, protein: 5, carbs: 16, fats: 11, fiber: 2 },
  { name: "Beef jerky bag", category: "Snacks", calories: 110, protein: 12, carbs: 6, fats: 1, fiber: 0 },
  { name: "Cereal with milk", category: "Breakfast", calories: 280, protein: 11, carbs: 46, fats: 5, fiber: 2 },
  { name: "Pasta bowl", category: "Meals", calories: 520, protein: 18, carbs: 82, fats: 12, fiber: 4 },
  { name: "Spaghetti and meatballs", category: "Meals", calories: 690, protein: 34, carbs: 78, fats: 26, fiber: 6 },
  { name: "Cheat meal burger and fries", category: "Meals", calories: 920, protein: 32, carbs: 88, fats: 48, fiber: 6 },
  { name: "Ice cream pint", category: "Treats", calories: 960, protein: 16, carbs: 104, fats: 54, fiber: 0 },
  { name: "Dark chocolate square", category: "Treats", calories: 170, protein: 2, carbs: 13, fats: 12, fiber: 3 }
];

const LAB_MARKERS = {
  essential: Object.entries(LAB_DEFAULTS)
    .filter(([, cfg]) => cfg.tier === "essential")
    .map(([name, cfg]) => ({ name, unit: cfg.unit })),
  important: Object.entries(LAB_DEFAULTS)
    .filter(([, cfg]) => cfg.tier === "important")
    .map(([name, cfg]) => ({ name, unit: cfg.unit })),
  advanced: Object.entries(LAB_DEFAULTS)
    .filter(([, cfg]) => cfg.tier === "advanced")
    .map(([name, cfg]) => ({ name, unit: cfg.unit }))
};

function localDateKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function todayInput() {
  return localDateKey(new Date());
}

function fmtDate(s) {
  if (!s) return "";
  return new Date(`${s}T12:00:00`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

function shortDate(s) {
  if (!s) return "";
  return new Date(`${s}T12:00:00`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric"
  });
}

function sameDay(a, b) {
  return a === b;
}

function makeId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function calcTotals(entries) {
  return entries.reduce(
    (sum, item) => ({
      calories: sum.calories + Number(item.totalCalories || 0),
      protein: sum.protein + Number(item.totalProtein || 0),
      carbs: sum.carbs + Number(item.totalCarbs || 0),
      fats: sum.fats + Number(item.totalFats || 0),
      fiber: sum.fiber + Number(item.totalFiber || 0)
    }),
    { calories: 0, protein: 0, carbs: 0, fats: 0, fiber: 0 }
  );
}

function latestByDate(list, primary = "date") {
  return [...list].sort((a, b) =>
    (a[primary] || a.created_at || "") < (b[primary] || b.created_at || "")
      ? 1
      : -1
  )[0];
}

function addDaysToDateString(dateString, days) {
  const d = new Date(`${dateString}T12:00:00`);
  const whole = Math.floor(days);
  const frac = days - whole;
  d.setDate(d.getDate() + whole);
  if (frac >= 0.5) d.setDate(d.getDate() + 1);
  return localDateKey(d);
}

function daysBetweenNow(dateString) {
  const today = new Date(`${todayInput()}T00:00:00`);
  const target = new Date(`${dateString}T00:00:00`);
  return Math.round((target - today) / (1000 * 60 * 60 * 24));
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function progressStatus(current, goal) {
  if (!goal || Number(goal) <= 0) return "neutral";
  if (current > goal) return "over";
  if (current === goal) return "met";
  return "under";
}

function progressPercent(current, goal) {
  if (!goal || Number(goal) <= 0) return 0;
  return clamp((current / goal) * 100, 0, 100);
}

function statusColors(status) {
  if (status === "over") {
    return {
      bg: "#1c0b0b",
      fill: "#dc2626",
      text: "#fca5a5",
      glow: "rgba(220,38,38,0.14)"
    };
  }
  if (status === "met") {
    return {
      bg: "#0d1a12",
      fill: "#16a34a",
      text: "#86efac",
      glow: "rgba(22,163,74,0.14)"
    };
  }
  if (status === "under") {
    return {
      bg: "#0b1220",
      fill: "#2563eb",
      text: "#93c5fd",
      glow: "rgba(37,99,235,0.12)"
    };
  }
  return {
    bg: "#171717",
    fill: "#525252",
    text: "#d4d4d8",
    glow: "rgba(255,255,255,0.05)"
  };
}

function labZone(entry) {
  const value = Number(entry?.value);
  const low =
    entry?.low === null || entry?.low === "" || entry?.low === undefined
      ? null
      : Number(entry?.low);
  const high =
    entry?.high === null || entry?.high === "" || entry?.high === undefined
      ? null
      : Number(entry?.high);

  if (!Number.isFinite(value)) return "neutral";
  if (Number.isFinite(low) && value < low) return "under";
  if (Number.isFinite(high) && value > high) return "over";
  return Number.isFinite(low) || Number.isFinite(high) ? "met" : "neutral";
}

function getStoredProfile() {
  try {
    const raw = localStorage.getItem("ironSyndicateProfile");
    return raw ? { ...DEFAULT_PROFILE, ...JSON.parse(raw) } : DEFAULT_PROFILE;
  } catch {
    return DEFAULT_PROFILE;
  }
}

function saveStoredProfile(profile) {
  try {
    localStorage.setItem("ironSyndicateProfile", JSON.stringify(profile));
  } catch {}
}

function getSmartLabDefaults(profile) {
  const next = JSON.parse(JSON.stringify(LAB_DEFAULTS));

  if (profile.sex === "Female") {
    next["Total Testosterone"].low = 15;
    next["Total Testosterone"].high = 70;
    next["Free Testosterone"].low = 0.5;
    next["Free Testosterone"].high = 6.5;
    next.Hematocrit.low = 36;
    next.Hematocrit.high = 46;
    next.Hemoglobin.low = 12;
    next.Hemoglobin.high = 15.5;
    next.PSA.high = null;
  }

  if (profile.onTRT) {
    next["Total Testosterone"].low =
      profile.sex === "Female" ? next["Total Testosterone"].low : 500;
    next["Total Testosterone"].high =
      profile.sex === "Female" ? next["Total Testosterone"].high : 1100;
  }

  return next;
}

function buildInitialLabBatch(profile) {
  const defaults = getSmartLabDefaults(profile);
  return Object.fromEntries(
    Object.entries(defaults).map(([marker, cfg]) => [
      marker,
      {
        value: "",
        low: cfg.low,
        high: cfg.high,
        unit: cfg.unit
      }
    ])
  );
}

function calculateBMI(weightLb, heightInches) {
  const w = Number(weightLb);
  const h = Number(heightInches);
  if (!w || !h) return null;
  return (w / (h * h)) * 703;
}

function estimateCalories({ profile, weightLb }) {
  const weight = Number(weightLb || 0);
  const heightInches = Number(profile.heightInches || 0);
  const age = Number(profile.age || 0);
  if (!weight || !heightInches || !age) return null;

  const kg = weight * 0.453592;
  const cm = heightInches * 2.54;
  const isFemale = profile.sex === "Female";
  const bmr = isFemale
    ? 10 * kg + 6.25 * cm - 5 * age - 161
    : 10 * kg + 6.25 * cm - 5 * age + 5;

  const multipliers = {
    Low: 1.35,
    Moderate: 1.55,
    High: 1.75
  };

  return Math.round(bmr * (multipliers[profile.activityLevel] || 1.55));
}

function roundToNearest(value, step = 5) {
  if (value == null || Number.isNaN(Number(value))) return null;
  return Math.round(Number(value) / step) * step;
}

function detectPhaseFlavor(phase) {
  const phaseType = phase?.type || "Maintenance";
  const text = `${phase?.name || ""} ${phase?.notes || ""}`.toLowerCase();

  if (phaseType === "Bulk") {
    if (/dirty|aggressive|push|mass|off[- ]?season/.test(text)) return "aggressive-growth";
    return "lean-growth";
  }

  if (phaseType === "Cut") {
    if (/mini|aggressive|hard|fast|peel|photo|prep/.test(text)) return "aggressive-cut";
    return "steady-cut";
  }

  if (phaseType === "TRT Cruise") return "health-stability";
  if (phaseType === "Blast") return "performance-push";
  return "stability";
}

function buildIntelligentTargets({ profile, phase, weightLb }) {
  const weight = Number(weightLb || 0);
  const maintenance = estimateCalories({ profile, weightLb: weight });
  const phaseType = phase?.type || (profile.onTRT ? "TRT Cruise" : "Maintenance");
  const flavorKey = detectPhaseFlavor(phase);
  const flavor = PHASE_FLAVOR_PRESETS[flavorKey] || PHASE_FLAVOR_PRESETS.stability;

  if (!maintenance || !weight) {
    return {
      calories: null,
      protein: null,
      carbs: null,
      fats: null,
      fiber: null,
      workoutTarget:
        phase?.workoutTarget != null && phase?.workoutTarget !== ""
          ? Number(phase.workoutTarget)
          : (PHASE_PRESETS[phaseType] || PHASE_PRESETS.Bulk).defaultWorkouts,
      rateTarget:
        phase?.rateTarget != null && phase?.rateTarget !== ""
          ? Number(phase.rateTarget)
          : flavor.rateTarget,
      strategyName: flavor.strategyName,
      rationale: [
        "Add age, height, and bodyweight to unlock coach-calculated targets."
      ]
    };
  }

  let calorieDelta = flavor.calorieDelta;
  const adjustments = [];

  if (profile.activityLevel === "High") {
    calorieDelta += phaseType === "Cut" ? 0 : 125;
    adjustments.push("High activity bumps calories and carbs slightly to support output.");
  } else if (profile.activityLevel === "Low") {
    calorieDelta += phaseType === "Cut" ? 0 : -100;
    adjustments.push("Lower activity trims calories slightly so the pace stays cleaner.");
  }

  if (Number(profile.age || 0) >= 40) {
    adjustments.push("40+ profile context keeps fiber and cardio hygiene slightly higher.");
  }

  if (profile.usingPeptides && profile.peptideCategory === "Fat loss" && phaseType === "Cut") {
    calorieDelta += 75;
    adjustments.push("Fat-loss peptide context softens the deficit slightly to keep training quality up.");
  }

  if (profile.onTRT) {
    adjustments.push("TRT context keeps recovery, cardio, and lab coaching visible across the app.");
  }

  const calories = roundToNearest(maintenance + calorieDelta, 5);
  const kg = weight * 0.453592;
  const protein = roundToNearest(kg * flavor.proteinPerKg, 5);
  const fats = roundToNearest(weight * flavor.fatPerLb, 5);
  const fiberBase = (calories / 1000) * 14 + (Number(profile.age || 0) >= 40 ? 4 : 0);
  const fiber = roundToNearest(fiberBase, 1);
  const proteinCals = (protein || 0) * 4;
  const fatCals = (fats || 0) * 9;
  const remaining = Math.max(
    calories - proteinCals - fatCals,
    phaseType === "Cut" ? 380 : 560
  );
  const carbsFloor =
    phaseType === "Cut"
      ? profile.activityLevel === "High"
        ? 130
        : 100
      : profile.activityLevel === "High"
      ? 180
      : 140;
  const carbs = Math.max(roundToNearest(remaining / 4, 5), carbsFloor);

  const rationale = [
    `${flavor.strategyName}: ${flavor.note}`,
    `Maintenance estimate: ${maintenance} kcal from profile + activity level.`,
    phaseType === "Cut"
      ? "Cut defaults bias higher protein, tighter calories, and cardio that supports the deficit without wrecking training."
      : phaseType === "Bulk" || phaseType === "Blast"
      ? "Growth defaults bias a controlled surplus, strong carb support, and enough cardio to protect work capacity."
      : "Stability defaults hold calories closer to maintenance and make consistency the main lever.",
    ...adjustments
  ];

  if (profile.usingPeptides) {
    rationale.push(
      "Peptide context keeps glucose, appetite, and symptom tracking closer to the surface."
    );
  }

  return {
    calories,
    protein,
    carbs,
    fats,
    fiber,
    workoutTarget:
      phase?.workoutTarget != null && phase?.workoutTarget !== ""
        ? Number(phase.workoutTarget)
        : flavor.workouts,
    rateTarget:
      phase?.rateTarget != null && phase?.rateTarget !== ""
        ? Number(phase.rateTarget)
        : flavor.rateTarget,
    strategyName: flavor.strategyName,
    rationale
  };
}

function buildCardioGuidance({ phase, profile }) {
  const phaseType = phase?.type || (profile.onTRT ? "TRT Cruise" : "Maintenance");
  const guide = {
    Bulk: {
      heading: "Keep cardio light enough to protect recovery.",
      frequency: "2–4 sessions / week",
      duration: "20–35 min",
      intensity: "Mostly low-to-moderate, conversational pace",
      timing: "Best on off days, post-lift, or after meals",
      ideas: ["Incline walk", "Easy bike", "Outdoor walk", "Rucking"],
      note: "The goal is appetite, recovery, and conditioning support without stealing from lower-body output."
    },
    Cut: {
      heading: "Use cardio to support the deficit, not bury recovery.",
      frequency: "3–6 sessions / week",
      duration: "25–45 min",
      intensity: "Mostly moderate with short hard intervals only if recovery stays good",
      timing: "Morning walks, post-lift sessions, or split later in the day",
      ideas: ["Incline treadmill", "Bike intervals", "Stairmill", "Fast outdoor walks"],
      note: "Stack the easiest-to-repeat cardio first, then add intensity only when your lifting quality holds."
    },
    Maintenance: {
      heading: "Aim for repeatable cardio that keeps bodyweight stable and work capacity high.",
      frequency: "3–5 sessions / week",
      duration: "20–35 min",
      intensity: "Low-to-moderate",
      timing: "Post-meal walks or any slot you can keep year-round",
      ideas: ["Walks", "Bike", "Jog/walk blend", "Rowing"],
      note: "Consistency matters more than crushing one heroic session."
    },
    "TRT Cruise": {
      heading: "Cruise phases reward steady movement and recovery hygiene.",
      frequency: "4–6 sessions / week",
      duration: "20–40 min",
      intensity: "Mostly low-to-moderate zone 2",
      timing: "Daily walks, after meals, or light standalone sessions",
      ideas: ["Daily walks", "Easy bike", "Elliptical", "Hiking"],
      note: "This phase is ideal for building aerobic base and keeping health markers stable."
    },
    Blast: {
      heading: "Keep cardio efficient so it supports health without blunting performance.",
      frequency: "2–4 sessions / week",
      duration: "20–30 min",
      intensity: "Low-to-moderate with minimal leg fatigue",
      timing: "Separate from hard lower-body days when possible",
      ideas: ["Incline walk", "Bike", "Sled pushes", "Elliptical"],
      note: "Use the lowest effective dose of cardio to support conditioning, blood pressure, and appetite management."
    }
  };
  return guide[phaseType] || guide.Maintenance;
}

function buildWeighInGuidance(phase) {
  const phaseType = phase?.type || "Maintenance";
  if (phaseType === "Bulk" || phaseType === "Blast") {
    return "Morning weigh-ins 4–7 days per week keep growth phases honest. Look at weekly averages, not single spikes.";
  }
  if (phaseType === "Cut") {
    return "Daily morning weigh-ins make cut pacing easier to read. Use the weekly average before adjusting calories or cardio.";
  }
  return "Three to seven morning weigh-ins per week gives enough signal to judge stability without obsessing over one day.";
}

function buildProtocolGuidance(profile, phase) {
  const phaseType = phase?.type || (profile.onTRT ? "TRT Cruise" : "Maintenance");
  return {
    headline:
      phaseType === "Blast"
        ? "Protocol tracking is high-priority this phase."
        : phaseType === "Cut"
        ? "Keep protocol timing steady so the rest of the phase stays predictable."
        : "Consistency beats complexity here.",
    detail:
      "This app now adds phase-aware protocol context, monitoring watchlists, and coaching notes — but not dosing or stack instructions.",
    focus:
      profile.onTRT || phaseType === "TRT Cruise"
        ? "Watch adherence, symptom notes, hematocrit, lipids, liver markers, and PSA context."
        : "Use this tab to keep protocol history tight, easy to review, and matched to labs over time."
  };
}

function buildProtocolKnowledge({ item, phase, profile }) {
  const phaseType = phase?.type || (profile.onTRT ? "TRT Cruise" : "Maintenance");
  const entry = PROTOCOL_LIBRARY[item] || PROTOCOL_LIBRARY.__default__;
  const phaseFit =
    entry.phaseFit?.[phaseType] || entry.phaseFit?.default || entry.phaseFit || "";
  const monitoring = [...new Set([
    ...(entry.watch || []),
    ...(phaseType === "Blast" ? ["blood pressure"] : []),
    ...(profile.onTRT ? ["hematocrit"] : []),
    ...(profile.usingPeptides && profile.peptideCategory === "Fat loss"
      ? ["fasting glucose"]
      : [])
  ])].slice(0, 6);

  const context = [...new Set([
    ...(entry.communityContext || []),
    phaseType === "Cut"
      ? "In cuts, the most useful notes are appetite, GI tolerance, steps/cardio, and whether lifting quality holds."
      : phaseType === "Bulk" || phaseType === "Blast"
      ? "In growth phases, the most useful notes are appetite, blood pressure, water retention, sleep, and weekly weight pace."
      : "In stability phases, routine consistency and repeatable lab timing matter more than flashy short-term changes."
  ])];

  return {
    item,
    family: entry.family,
    summary: entry.summary,
    phaseFit,
    monitoring,
    logFocus: entry.logFocus || [],
    context,
    timing: entry.timing,
    boundary:
      "Entertainment + tracking context only — no cycle design, stack design, or dosing advice is provided here."
  };
}

function buildLabCoaching(profile, phase) {
  const phaseType = phase?.type || (profile.onTRT ? "TRT Cruise" : "Maintenance");
  const focus = getLabPriorityMarkers(profile, phase);
  const cadence =
    phaseType === "Blast"
      ? "Higher-risk phases usually benefit from tighter lab review windows."
      : phaseType === "TRT Cruise"
      ? "Cruise phases work best with regular trend checks instead of reactive single readings."
      : phaseType === "Cut"
      ? "Cut phases should keep an eye on recovery, glucose control, and lipids while bodyweight is moving down."
      : "Use baseline, mid-phase, and trend-based checks when habits or bodyweight shift meaningfully.";

  return {
    cadence,
    focus,
    note:
      "Marker ranges here are educational defaults only. Always confirm your own lab interpretation with a qualified clinician."
  };
}

function buildWorkoutPlan(groups, selection = {}) {
  if (!Array.isArray(groups) || groups.length === 0) return "";
  return groups
    .map((group) => {
      const variants = getWorkoutVariants(group);
      const pick = variants[selection[group] || 0] || variants[0];
      return pick?.template || WORKOUT_TEMPLATES[group] || "";
    })
    .filter(Boolean)
    .join("\n\n--------------------\n\n");
}

function getLabPriorityMarkers(profile, phase) {
  const base = ["HDL", "LDL", "Triglycerides", "ALT", "AST", "A1C"];
  const trt = [
    "Total Testosterone",
    "Free Testosterone",
    "Estradiol (Sensitive)",
    "Hematocrit",
    "Hemoglobin",
    "PSA",
    "SHBG"
  ];
  const peptides = ["IGF-1", "Fasting Glucose", "Insulin", "A1C"];
  const phaseType = phase?.type || "Maintenance";
  const phaseExtras = {
    Bulk: ["Fasting Glucose", "Insulin", "ALT", "AST"],
    Cut: ["A1C", "Fasting Glucose", "Insulin", "HDL", "LDL"],
    Maintenance: ["A1C", "HDL", "LDL"],
    "TRT Cruise": ["Hematocrit", "Hemoglobin", "PSA", "Estradiol (Sensitive)"],
    Blast: ["Hematocrit", "Hemoglobin", "ALT", "AST", "HDL", "LDL", "Triglycerides"]
  };

  const combined = [
    ...(profile.onTRT ? trt : ["Total Testosterone", "Free Testosterone"]),
    ...(profile.usingPeptides ? peptides : []),
    ...(phaseExtras[phaseType] || []),
    ...base
  ];

  return [...new Set(combined)].slice(0, 10);
}


function getFriendlyLabAdvice(marker, zone, entry, profile) {
  const tips = [];
  const insight = [];
  const effects = [];
  const avoid = [];

  const valueText = entry ? `${entry.value} ${entry.unit || ""}`.trim() : "";

  if (zone === "met") {
    insight.push(`${marker} looks in range right now.`);
    tips.push("Keep watching trends over time instead of reacting to one good reading.");
  } else if (zone === "under") {
    insight.push(`${marker} is running a bit low right now.`);
  } else if (zone === "over") {
    insight.push(`${marker} is running a bit high right now.`);
  } else {
    insight.push(`${marker} does not have enough range context yet.`);
  }

  switch (marker) {
    case "Total Testosterone":
    case "Free Testosterone":
      effects.push("Energy, strength, recovery, libido, and training output can all be affected.");
      if (zone === "under") {
        tips.push("Prioritize sleep quality, enough calories, and consistent lifting.");
        tips.push("Make sure recent dieting or poor recovery is not dragging you down.");
      }
      if (zone === "over") {
        tips.push("Bigger numbers are not always better if recovery markers and side effects also drift.");
      }
      if (profile.onTRT) {
        tips.push("Since you're on TRT, timing of the blood draw versus injection day matters a lot.");
        tips.push("Look at total testosterone, free testosterone, estradiol, hematocrit, and symptoms together.");
      }
      break;

    case "Estradiol (Sensitive)":
      effects.push("Mood, joints, water retention, libido, and overall feel can shift with estradiol changes.");
      if (zone === "under") {
        tips.push("Very low estradiol can feel worse than slightly high estradiol for many people.");
      }
      if (zone === "over") {
        tips.push("Look for patterns like water retention, mood swings, or nipple sensitivity instead of panic.");
      }
      if (profile.onTRT) {
        tips.push("On TRT, estradiol is best viewed in context with dose, frequency, and symptoms.");
      }
      break;

    case "Hematocrit":
    case "Hemoglobin":
      effects.push("These markers can influence how 'thick' blood trends over time and how you feel in training.");
      if (zone === "over") {
        tips.push("Hydration, sleep apnea risk, and smoking status can all matter here.");
      }
      if (profile.onTRT) {
        tips.push("These deserve extra attention when using TRT because they commonly trend upward.");
      }
      break;

    case "PSA":
      effects.push("This is usually better viewed as a trend than as one isolated reading.");
      tips.push("Compare it with your previous readings whenever possible.");
      if (profile.onTRT) {
        tips.push("Because you're on TRT, staying consistent with trend tracking is especially helpful.");
      }
      break;

    case "SHBG":
      effects.push("SHBG can change how your total and free testosterone line up.");
      tips.push("Do not judge testosterone status from one testosterone number alone if SHBG is drifting.");
      break;

    case "IGF-1":
      effects.push("IGF-1 often matters more if you're using GH-related peptides or chasing recovery/body-comp goals.");
      if (profile.usingPeptides) {
        tips.push("Since you're using peptides, monitor the trend instead of obsessing over a single IGF-1 result.");
      } else {
        tips.push("If you're not using peptides, IGF-1 can still be useful for context, but it may not need center stage.");
      }
      break;

    case "Fasting Glucose":
    case "Insulin":
    case "A1C":
      effects.push("These markers connect to energy stability, body composition, and recovery quality.");
      if (zone === "over") {
        tips.push("Tighten sleep, food quality, steps, and cardio before assuming anything dramatic.");
      }
      if (profile.usingPeptides) {
        tips.push("With peptide use, glucose markers are worth watching closely alongside body composition trends.");
      }
      break;

    case "HDL":
      effects.push("HDL can reflect broader cardio-metabolic habits.");
      if (zone === "under") {
        tips.push("More cardio, better food quality, and body-fat control often help over time.");
      }
      break;

    case "LDL":
    case "Triglycerides":
      effects.push("These can reflect diet quality, body composition, and overall cardio-metabolic direction.");
      if (zone === "over") {
        tips.push("Look first at food quality, total calories, activity, and consistency.");
      }
      break;

    case "ALT":
    case "AST":
      effects.push("Hard training, recovery status, alcohol, and body-fat level can all influence these.");
      if (zone === "over") {
        tips.push("Consider whether training was especially hard right before the lab draw.");
      }
      break;

    default:
      tips.push("Use this reading as one data point and compare it with trend, context, and how you feel.");
      break;
  }

  if (profile.activityLevel === "High") {
    tips.push("Because your activity level is high, make sure recovery stress is not muddying the picture.");
  }

  avoid.push("Avoid treating one lab draw like a full diagnosis.");
  avoid.push("Avoid changing everything at once — trends are more useful than panic reactions.");

  return {
    marker,
    zone,
    valueText,
    insight,
    effects,
    tips: [...new Set(tips)],
    avoid: [...new Set(avoid)]
  };
}

function MultiSelect({ options, selected, onToggle }) {
  return (
    <div style={styles.multiWrap}>
      {options.map((opt) => {
        const active = selected.includes(opt);
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onToggle(opt)}
            style={
              active
                ? { ...styles.multiBtn, ...styles.multiBtnActive }
                : styles.multiBtn
            }
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

function LineChart({ data, keyName, color, label, emptyText }) {
  if (!data || data.length < 2) return <div style={styles.emptyBox}>{emptyText}</div>;

  const width = 680;
  const height = 220;
  const pad = 28;
  const vals = data
    .map((d) => Number(d[keyName]))
    .filter((v) => !Number.isNaN(v));

  if (vals.length < 2) return <div style={styles.emptyBox}>{emptyText}</div>;

  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const range = Math.max(max - min, 1);

  const points = data.map((d, i) => {
    const x = pad + (i * (width - pad * 2)) / Math.max(data.length - 1, 1);
    const y =
      height - pad - ((Number(d[keyName]) - min) / range) * (height - pad * 2);
    return { x, y, ...d };
  });

  const path = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x} ${p.y}`)
    .join(" ");

  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", height: 220 }}>
        <line x1={pad} y1={pad} x2={pad} y2={height - pad} stroke="#4b5563" />
        <line
          x1={pad}
          y1={height - pad}
          x2={width - pad}
          y2={height - pad}
          stroke="#4b5563"
        />
        <path d={path} fill="none" stroke={color} strokeWidth="3" />
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="4" fill={color} />
            <text
              x={p.x}
              y={height - 8}
              textAnchor="middle"
              fontSize="10"
              fill="#9ca3af"
            >
              {shortDate(p.date)}
            </text>
          </g>
        ))}
      </svg>
      <div style={styles.smallText}>{label}</div>
    </div>
  );
}

function ProgressBubble({ title, valueText, percent, status, subtitle, style = {} }) {
  const colors = statusColors(status);
  const icons = {
    Calories: "🔥",
    Protein: "💪",
    Carbs: "⚡",
    Fats: "🧈",
    Fiber: "🌾"
  };
  const icon = icons[title] || "";
  const isCalories = title === "Calories";

  return (
    <div
      style={{
        ...styles.progressBubble,
        ...style,
        background: `linear-gradient(180deg, rgba(16,16,16,0.96), ${colors.bg})`,
        boxShadow: `inset 0 1px 0 rgba(255,255,255,0.04), inset 0 -6px 12px rgba(0,0,0,0.55), 0 10px 24px rgba(0,0,0,0.34), 0 0 6px ${colors.glow}`
      }}
    >
      <div style={styles.glassHighlight} />
      <div style={styles.progressTopRow}>
        <div style={styles.progressTitle}>
          {icon} {title}
        </div>
        <div
          style={{
            ...styles.progressChip,
            color: colors.text,
            border: `1px solid ${colors.glow}`
          }}
        >
          {Math.round(percent)}%
        </div>
      </div>
      <div
        style={{
          ...styles.progressValue,
          color: colors.text,
          fontSize: isCalories ? 22 : 18
        }}
      >
        {valueText}
      </div>
      <div style={styles.progressBarElite}>
        <div
          style={{
            ...styles.progressFillElite,
            width: `${percent}%`,
            background: `linear-gradient(90deg, ${colors.fill}, rgba(255,255,255,0.18))`
          }}
        />
      </div>
      {subtitle ? <div style={styles.progressSub}>{subtitle}</div> : null}
    </div>
  );
}

function AdviceModal({ advice, onClose }) {
  if (!advice) return null;

  const zoneLabel =
    advice.zone === "over"
      ? "High"
      : advice.zone === "under"
      ? "Low"
      : advice.zone === "met"
      ? "In range"
      : "Context needed";

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.modalCard} onClick={(e) => e.stopPropagation()}>
        <div style={styles.listTop}>
          <div>
            <div style={styles.cardTitle}>{advice.marker}</div>
            <div style={styles.smallText}>
              {zoneLabel}
              {advice.valueText ? ` • ${advice.valueText}` : ""}
            </div>
          </div>
          <button style={styles.deleteButton} onClick={onClose}>
            Close
          </button>
        </div>

        <div style={styles.adviceSection}>
          <div style={styles.adviceHeader}>💡 Insight</div>
          {advice.insight.map((item, idx) => (
            <div key={idx} style={styles.tipBubble}>
              {item}
            </div>
          ))}
        </div>

        {advice.effects.length > 0 ? (
          <div style={styles.adviceSection}>
            <div style={styles.adviceHeader}>🔥 What this can affect</div>
            {advice.effects.map((item, idx) => (
              <div key={idx} style={styles.tipBubble}>
                {item}
              </div>
            ))}
          </div>
        ) : null}

        <div style={styles.adviceSection}>
          <div style={styles.adviceHeader}>⚡ Friendly suggestions</div>
          {advice.tips.map((item, idx) => (
            <div key={idx} style={styles.tipBubble}>
              {item}
            </div>
          ))}
        </div>

        <div style={styles.adviceSection}>
          <div style={styles.adviceHeader}>🚫 Avoid</div>
          {advice.avoid.map((item, idx) => (
            <div key={idx} style={styles.tipBubble}>
              {item}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ActionModal({ open, title, onClose, children }) {
  if (!open) return null;
  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.sheetCard} onClick={(e) => e.stopPropagation()}>
        <div style={styles.listTop}>
          <div style={styles.cardTitle}>{title}</div>
          <button style={styles.deleteButton} onClick={onClose}>
            Close
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function CollapsibleSection({ title, open, onToggle, right, children }) {
  return (
    <div style={styles.card}>
      <button style={styles.collapseHeader} onClick={onToggle}>
        <div>
          {open ? "▾" : "▸"} {title}
        </div>
        {right ? <div style={styles.smallText}>{right}</div> : null}
      </button>
      {open ? <div style={{ marginTop: 12 }}>{children}</div> : null}
    </div>
  );
}

function CompletionRow({ done, title, detail }) {
  return (
    <div style={done ? { ...styles.completionRow, ...styles.completionRowDone } : styles.completionRow}>
      <div style={done ? styles.completionIconDone : styles.completionIconTodo}>
        {done ? "💪" : "◦"}
      </div>
      <div style={{ flex: 1 }}>
        <div style={styles.completionTitle}>{title}</div>
        <div style={styles.smallText}>{detail}</div>
      </div>
    </div>
  );
}

function formatSigned(value, suffix = "") {
  if (value == null || Number.isNaN(Number(value))) return "—";
  const n = Number(value);
  return `${n > 0 ? "+" : ""}${n.toFixed(1)}${suffix}`;
}

function getTimeframeStart(range) {
  const now = new Date(`${todayInput()}T12:00:00`);
  if (range === "today") return todayInput();
  if (range === "week") {
    const d = new Date(now);
    d.setDate(d.getDate() - 7);
    return localDateKey(d);
  }
  if (range === "month") {
    const d = new Date(now);
    d.setMonth(d.getMonth() - 1);
    return localDateKey(d);
  }
  if (range === "year") {
    const d = new Date(now);
    d.setFullYear(d.getFullYear() - 1);
    return localDateKey(d);
  }
  return "0000-01-01";
}

function getMetricDelta(metrics, field, range) {
  const filtered = [...metrics]
    .filter((x) => x[field] !== "" && x[field] != null)
    .sort((a, b) => (a.date > b.date ? 1 : -1));

  if (filtered.length < 2) return null;

  const latest = filtered[filtered.length - 1];
  const start = getTimeframeStart(range);
  const earlier = filtered.filter((x) => x.date >= start && x.date <= latest.date);
  const baselinePool = earlier.length > 1 ? earlier : filtered;
  const baseline = baselinePool[0];

  if (!baseline || baseline.id === latest.id) return null;

  return {
    latest: Number(latest[field]),
    previous: Number(baseline[field]),
    diff: Number(latest[field]) - Number(baseline[field]),
    startDate: baseline.date,
    endDate: latest.date
  };
}

function compareDateDesc(a, b) {
  return a < b ? 1 : -1;
}



export default function App() {
  const [session, setSession] = useState(() => (hasSupabaseConfig ? null : LOCAL_SESSION));
  const [status, setStatus] = useState("");
  const [authMode, setAuthMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");

  const [screenIndex, setScreenIndex] = useState(HOME_INDEX);
  const [touchStartX, setTouchStartX] = useState(null);
  const [touchStartY, setTouchStartY] = useState(null);

  const [activeAction, setActiveAction] = useState(null);

  const [profile, setProfile] = useState(getStoredProfile);
  const [phases, setPhases] = useState(getStoredPhases);
  const [phaseForm, setPhaseForm] = useState(() => buildPhaseForm());

  const [goals, setGoals] = useState([]);
  const [labEntries, setLabEntries] = useState([]);
  const [progressPhotos, setProgressPhotos] = useState([]);
  const [editing, setEditing] = useState({ table: null, id: null });

  const [injections, setInjections] = useState([]);
  const [bodyMetrics, setBodyMetrics] = useState([]);
  const [cardio, setCardio] = useState([]);
  const [workouts, setWorkouts] = useState([]);
  const [calories, setCalories] = useState([]);
  const [customFoods, setCustomFoods] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [workoutTemplateSelection, setWorkoutTemplateSelection] = useState({});

  const [peptideFilter, setPeptideFilter] = useState("all");
  const [activeLabAdvice, setActiveLabAdvice] = useState(null);

  const [showCustomFood, setShowCustomFood] = useState(false);
  const [showFoodDropdown, setShowFoodDropdown] = useState(false);
  const foodSearchRef = useRef(null);
  const [changeTimeframe, setChangeTimeframe] = useState("month");
  const [photoComparePose, setPhotoComparePose] = useState("All");
  const [photoCompareLeftDate, setPhotoCompareLeftDate] = useState("");
  const [photoCompareRightDate, setPhotoCompareRightDate] = useState("");


  const [labFormOpen, setLabFormOpen] = useState(false);
  const [labHistoryOpen, setLabHistoryOpen] = useState(false);
  const [injLogOpen, setInjLogOpen] = useState(false);
  const [injScheduleOpen, setInjScheduleOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [bodyLogOpen, setBodyLogOpen] = useState(false);
  const [bodyHistoryOpen, setBodyHistoryOpen] = useState(false);
  const [goalEditorOpen, setGoalEditorOpen] = useState(false);
  const [phaseAdvancedOpen, setPhaseAdvancedOpen] = useState(false);
  const [phaseManualTouched, setPhaseManualTouched] = useState(false);

  const [labHistoryExpanded, setLabHistoryExpanded] = useState({
    essential: false,
    important: false,
    advanced: false
  });

  const [labFormExpanded, setLabFormExpanded] = useState({
    essential: false,
    important: false,
    advanced: false
  });

  const [recentFoodNames, setRecentFoodNames] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("recentFoodNames") || "[]");
    } catch {
      return [];
    }
  });

  const [injForm, setInjForm] = useState({
    date: todayInput(),
    peptide: PEPTIDE_OPTIONS[0],
    dosage: "",
    unit: "mg",
    notes: ""
  });

  const [bodyForm, setBodyForm] = useState({
    date: todayInput(),
    weight: "",
    skeletalMuscleMass: "",
    bodyFatPercent: ""
  });

  const [cardioForm, setCardioForm] = useState({
    date: todayInput(),
    type: CARDIO_OPTIONS[0],
    minutes: "",
    notes: ""
  });

  const [workoutForm, setWorkoutForm] = useState({
    date: todayInput(),
    groups: ["Chest", "Triceps"],
    notes: ""
  });

  const [foodForm, setFoodForm] = useState({
    date: todayInput(),
    name: BASE_FOODS[0].name,
    servings: "1"
  });

  const [foodSearch, setFoodSearch] = useState("");
  const [foodCategory, setFoodCategory] = useState("All");

  const [customFoodForm, setCustomFoodForm] = useState({
    name: "",
    calories: "",
    protein: "",
    carbs: "",
    fats: "",
    fiber: ""
  });

  const [scheduleForm, setScheduleForm] = useState({
    peptide: PEPTIDE_OPTIONS[0],
    dosage: "",
    unit: "mg",
    startDate: todayInput(),
    everyDays: "3.5",
    time: "09:00"
  });

  const [goalForm, setGoalForm] = useState({
    calories: "",
    protein: "",
    carbs: "",
    fats: "",
    fiber: ""
  });

  const [labBatchDate, setLabBatchDate] = useState(todayInput());
  const [labBatchNotes, setLabBatchNotes] = useState("");
  const [labBatch, setLabBatch] = useState(buildInitialLabBatch(profile));

  const [photoForm, setPhotoForm] = useState({
    date: todayInput(),
    pose: PHOTO_POSES[0],
    notes: "",
    imageUrl: "",
    previewUrl: "",
    uploading: false
  });

  const currentScreen = SCREENS[screenIndex];
  const activePhase = useMemo(() => getActivePhase(phases), [phases]);

  useEffect(() => {
    saveStoredProfile(profile);
  }, [profile]);

  useEffect(() => {
    saveStoredPhases(phases);
  }, [phases]);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session || null));
    const { data: listener } = supabase.auth.onAuthStateChange((_evt, s) =>
      setSession(s || null)
    );
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session?.user) return;
    loadAll();
  }, [session]);

  useEffect(() => {
    if (!status || status.startsWith("Loading")) return;
    const timer = setTimeout(() => setStatus(""), 2200);
    return () => clearTimeout(timer);
  }, [status]);

  useEffect(() => {
    if (goals.length > 0 && editing.table !== "goals") {
      const goal = latestByDate(goals, "date");
      setGoalForm({
        calories: String(goal?.calories || ""),
        protein: String(goal?.protein || ""),
        carbs: String(goal?.carbs || ""),
        fats: String(goal?.fats || ""),
        fiber: String(goal?.fiber || "")
      });
    }
  }, [goals, editing.table]);

  useEffect(() => {
    if (goals.length === 0 && activePhase && editing.table !== "goals") {
      setGoalForm((prev) => ({
        ...prev,
        calories:
          activePhase.calorieTarget != null && activePhase.calorieTarget !== ""
            ? String(activePhase.calorieTarget)
            : prev.calories,
        protein:
          activePhase.proteinTarget != null && activePhase.proteinTarget !== ""
            ? String(activePhase.proteinTarget)
            : prev.protein
      }));
    }
  }, [goals.length, activePhase, editing.table]);

  useEffect(() => {
    if (!activePhase?.id || activePhase.autoPilot === false) return;

    const nextCalories = intelligentTargets.calories ?? activePhase.calorieTarget ?? "";
    const nextProtein = intelligentTargets.protein ?? activePhase.proteinTarget ?? "";
    const nextRate = intelligentTargets.rateTarget ?? activePhase.rateTarget ?? "";
    const nextWorkouts = intelligentTargets.workoutTarget ?? activePhase.workoutTarget ?? "";

    if (
      Number(activePhase.calorieTarget || 0) === Number(nextCalories || 0) &&
      Number(activePhase.proteinTarget || 0) === Number(nextProtein || 0) &&
      Number(activePhase.rateTarget || 0) === Number(nextRate || 0) &&
      Number(activePhase.workoutTarget || 0) === Number(nextWorkouts || 0)
    ) {
      return;
    }

    setPhases((prev) =>
      prev.map((phase) =>
        phase.id === activePhase.id
          ? {
              ...phase,
              calorieTarget: nextCalories,
              proteinTarget: nextProtein,
              rateTarget: nextRate,
              workoutTarget: nextWorkouts,
              autoPilot: true
            }
          : phase
      )
    );
  }, [
    activePhase?.id,
    activePhase?.autoPilot,
    activePhase?.calorieTarget,
    activePhase?.proteinTarget,
    activePhase?.rateTarget,
    activePhase?.workoutTarget,
    intelligentTargets.calories,
    intelligentTargets.protein,
    intelligentTargets.rateTarget,
    intelligentTargets.workoutTarget
  ]);

  useEffect(() => {
    if (!showFoodDropdown) return;

    function handleOutsideClick(e) {
      if (foodSearchRef.current && !foodSearchRef.current.contains(e.target)) {
        setShowFoodDropdown(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("touchstart", handleOutsideClick);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("touchstart", handleOutsideClick);
    };
  }, [showFoodDropdown]);


  const allFoods = useMemo(() => {
    const seen = new Set();
    return [...BASE_FOODS, ...FOOD_LIBRARY_EXPANSION, ...customFoods].filter((food) => {
      const key = `${(food.name || "").trim().toLowerCase()}::${food.category || "Other"}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [customFoods]);

  const foodCategories = useMemo(() => {
    return ["All", ...new Set(allFoods.map((f) => f.category || "Other"))];
  }, [allFoods]);

  const latestMetric = useMemo(() => latestByDate(bodyMetrics), [bodyMetrics]);
  const latestGoal = useMemo(() => goals[0] || null, [goals]);
  const intelligentTargets = useMemo(
    () =>
      buildIntelligentTargets({
        profile,
        phase: activePhase,
        weightLb: latestMetric?.weight || activePhase?.startWeight
      }),
    [profile, activePhase, latestMetric]
  );
  const nutritionTargets = useMemo(
    () => buildEffectiveTargets(latestGoal, activePhase, intelligentTargets),
    [latestGoal, activePhase, intelligentTargets]
  );
  const cardioGuidance = useMemo(
    () => buildCardioGuidance({ phase: activePhase, profile }),
    [activePhase, profile]
  );
  const weighInGuidance = useMemo(
    () => buildWeighInGuidance(activePhase),
    [activePhase]
  );
  const protocolGuidance = useMemo(
    () => buildProtocolGuidance(profile, activePhase),
    [profile, activePhase]
  );
  const labCoach = useMemo(() => buildLabCoaching(profile, activePhase), [profile, activePhase]);
  const deferredFoodSearch = useDeferredValue(foodSearch);
  const filteredFoods = useMemo(
    () =>
      allFoods
        .filter(
          (f) =>
            (foodCategory === "All" || (f.category || "Other") === foodCategory) &&
            f.name.toLowerCase().includes(deferredFoodSearch.toLowerCase())
        )
        .slice(0, 80),
    [allFoods, foodCategory, deferredFoodSearch]
  );

  const sortedMetricsAsc = useMemo(
    () => [...bodyMetrics].sort((a, b) => (a.date > b.date ? 1 : -1)),
    [bodyMetrics]
  );

  const recentFoodEntries = useMemo(
    () => [...calories].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 10),
    [calories]
  );

  const todayFoodEntries = useMemo(
    () => calories.filter((x) => sameDay(x.date, todayInput())),
    [calories]
  );

  const todayFoodTotals = useMemo(() => calcTotals(todayFoodEntries), [todayFoodEntries]);

  const todayCardioEntries = useMemo(
    () => cardio.filter((x) => sameDay(x.date, todayInput())),
    [cardio]
  );

  const todayCardio = useMemo(
    () => todayCardioEntries.reduce((s, x) => s + Number(x.minutes || 0), 0),
    [todayCardioEntries]
  );

  const todayWorkoutEntries = useMemo(
    () => workouts.filter((x) => sameDay(x.date, todayInput())),
    [workouts]
  );

  const todayPhotoEntries = useMemo(
    () => progressPhotos.filter((x) => sameDay(x.date, todayInput())),
    [progressPhotos]
  );

  const caloriesByDate = useMemo(() => {
    const map = {};
    calories.forEach((x) => {
      if (!map[x.date]) map[x.date] = [];
      map[x.date].push(x);
    });
    return Object.entries(map)
      .map(([date, items]) => ({ date, ...calcTotals(items) }))
      .sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [calories]);

  const weightChart = useMemo(
    () =>
      [...bodyMetrics]
        .filter((x) => x.weight !== "" && x.weight != null)
        .sort((a, b) => (a.date > b.date ? 1 : -1)),
    [bodyMetrics]
  );

  const smmChart = useMemo(
    () =>
      [...bodyMetrics]
        .filter((x) => x.skeletalMuscleMass !== "" && x.skeletalMuscleMass != null)
        .sort((a, b) => (a.date > b.date ? 1 : -1)),
    [bodyMetrics]
  );

  const bfChart = useMemo(
    () =>
      [...bodyMetrics]
        .filter((x) => x.bodyFatPercent !== "" && x.bodyFatPercent != null)
        .sort((a, b) => (a.date > b.date ? 1 : -1)),
    [bodyMetrics]
  );

  const weightChange = useMemo(() => {
    const withWeight = sortedMetricsAsc.filter(
      (x) => x.weight !== "" && x.weight != null
    );
    if (withWeight.length < 2) return "—";
    const diff =
      Number(withWeight[withWeight.length - 1].weight) -
      Number(withWeight[0].weight);
    return `${diff > 0 ? "+" : ""}${diff.toFixed(1)} lb`;
  }, [sortedMetricsAsc]);

  const bmi = useMemo(
    () => calculateBMI(latestMetric?.weight, profile.heightInches),
    [latestMetric, profile.heightInches]
  );

  const weightDelta = useMemo(
    () => getMetricDelta(bodyMetrics, "weight", changeTimeframe),
    [bodyMetrics, changeTimeframe]
  );

  const bodyFatDelta = useMemo(
    () => getMetricDelta(bodyMetrics, "bodyFatPercent", changeTimeframe),
    [bodyMetrics, changeTimeframe]
  );

  const completedCount = useMemo(
    () =>
      [
        todayFoodEntries.length > 0,
        todayWorkoutEntries.length > 0,
        todayCardioEntries.length > 0,
        todayPhotoEntries.length > 0
      ].filter(Boolean).length,
    [todayFoodEntries, todayWorkoutEntries, todayCardioEntries, todayPhotoEntries]
  );

  const allCompleted = completedCount === 4;

  const photoDateOptions = useMemo(
    () =>
      [...new Set(
        progressPhotos
          .filter((x) => photoComparePose === "All" || x.pose === photoComparePose)
          .sort((a, b) => compareDateDesc(a.date, b.date))
          .map((x) => x.date)
      )],
    [progressPhotos, photoComparePose]
  );

  useEffect(() => {
    if (!photoDateOptions.length) {
      setPhotoCompareLeftDate("");
      setPhotoCompareRightDate("");
      return;
    }
    setPhotoCompareLeftDate((prev) => prev || photoDateOptions[0] || "");
    setPhotoCompareRightDate((prev) => prev || photoDateOptions[1] || photoDateOptions[0] || "");
  }, [photoDateOptions]);

  const leftComparePhotos = useMemo(
    () =>
      progressPhotos.filter(
        (x) =>
          x.date === photoCompareLeftDate &&
          (photoComparePose === "All" || x.pose === photoComparePose)
      ),
    [progressPhotos, photoCompareLeftDate, photoComparePose]
  );

  const rightComparePhotos = useMemo(
    () =>
      progressPhotos.filter(
        (x) =>
          x.date === photoCompareRightDate &&
          (photoComparePose === "All" || x.pose === photoComparePose)
      ),
    [progressPhotos, photoCompareRightDate, photoComparePose]
  );

  const recentWorkoutHistory = useMemo(() => workouts.slice(0, 12), [workouts]);
  const recentCardioHistory = useMemo(() => cardio.slice(0, 12), [cardio]);
  const recentFoodHistory = useMemo(() => calories.slice(0, 12), [calories]);

  const estimatedCalories = useMemo(
    () => estimateCalories({ profile, weightLb: latestMetric?.weight }),
    [profile, latestMetric]
  );

  const nutritionStatuses = useMemo(
    () => ({
      calories: progressStatus(
        Math.round(todayFoodTotals.calories),
        Number(nutritionTargets?.calories || 0)
      ),
      protein: progressStatus(
        Math.round(todayFoodTotals.protein),
        Number(nutritionTargets?.protein || 0)
      ),
      carbs: progressStatus(
        Math.round(todayFoodTotals.carbs),
        Number(nutritionTargets?.carbs || 0)
      ),
      fats: progressStatus(
        Math.round(todayFoodTotals.fats),
        Number(nutritionTargets?.fats || 0)
      ),
      fiber: progressStatus(
        Math.round(todayFoodTotals.fiber),
        Number(nutritionTargets?.fiber || 0)
      )
    }),
    [todayFoodTotals, nutritionTargets]
  );

  const filteredInjections = useMemo(() => {
    if (peptideFilter === "all") return injections;
    if (peptideFilter === "none") return [];
    return injections.filter(
      (x) =>
        String(x.peptide || "").toLowerCase() ===
        String(peptideFilter || "").toLowerCase()
    );
  }, [injections, peptideFilter]);

  const filteredSchedules = useMemo(() => {
    if (peptideFilter === "all") return schedules;
    if (peptideFilter === "none") return [];
    return schedules.filter(
      (x) =>
        String(x.peptide || "").toLowerCase() ===
        String(peptideFilter || "").toLowerCase()
    );
  }, [schedules, peptideFilter]);

  const protocolContextItem = useMemo(() => {
    if (peptideFilter !== "all" && peptideFilter !== "none") return peptideFilter;
    return (
      injForm.peptide ||
      filteredSchedules[0]?.peptide ||
      filteredInjections[0]?.peptide ||
      profile.trtType ||
      (profile.usingPeptides && profile.peptideCategory === "Fat loss"
        ? "Retatrutide"
        : PEPTIDE_OPTIONS[0])
    );
  }, [
    peptideFilter,
    injForm.peptide,
    filteredSchedules,
    filteredInjections,
    profile.trtType,
    profile.usingPeptides,
    profile.peptideCategory
  ]);

  const protocolKnowledge = useMemo(
    () =>
      buildProtocolKnowledge({
        item: protocolContextItem,
        phase: activePhase,
        profile
      }),
    [protocolContextItem, activePhase, profile]
  );

  const schedulePreview = useMemo(() => {
    const now = todayInput();

    return filteredSchedules
      .map((s) => {
        const every = Number(s.everyDays || 0);

        const matchingInjections = injections
          .filter(
            (inj) =>
              String(inj.peptide || "").toLowerCase() ===
              String(s.peptide || "").toLowerCase()
          )
          .sort((a, b) => (a.date < b.date ? 1 : -1));

        const lastInjection = matchingInjections[0];
        const anchorDate = lastInjection?.date || s.startDate;
        const injectedToday = !!lastInjection && sameDay(lastInjection.date, now);
        const nextDate = every > 0 ? addDaysToDateString(anchorDate, every) : anchorDate;
        const daysAway = injectedToday ? every : daysBetweenNow(nextDate);
        const cycleProgress = injectedToday
          ? 100
          : every > 0
          ? clamp(((every - Math.max(daysAway, 0)) / every) * 100, 0, 100)
          : 0;

        return {
          ...s,
          anchorDate,
          lastInjectionDate: lastInjection?.date || null,
          nextDate,
          daysAway,
          cycleProgress,
          injectedToday
        };
      })
      .sort((a, b) => (a.nextDate > b.nextDate ? 1 : -1));
  }, [filteredSchedules, injections]);

  const latestLabsByMarker = useMemo(() => {
    const map = {};
    labEntries.forEach((x) => {
      if (!map[x.marker] || map[x.marker].date < x.date) map[x.marker] = x;
    });
    return map;
  }, [labEntries]);

  const priorityMarkers = useMemo(() => getLabPriorityMarkers(profile, activePhase), [profile, activePhase]);

  const priorityLabCards = useMemo(() => {
    return priorityMarkers
      .map((marker) => latestLabsByMarker[marker])
      .filter(Boolean)
      .slice(0, 6);
  }, [priorityMarkers, latestLabsByMarker]);

  const dashboardModel = useMemo(
    () =>
      buildDashboardModel({
        phase: activePhase,
        phases,
        nutritionTargets,
        caloriesByDate,
        bodyMetrics,
        workouts,
        cardio,
        injections,
        schedules,
        progressPhotos
      }),
    [
      activePhase,
      phases,
      nutritionTargets,
      caloriesByDate,
      bodyMetrics,
      workouts,
      cardio,
      injections,
      schedules,
      progressPhotos
    ]
  );

  const photoMetaById = dashboardModel.photoMetaMap || {};

  const coachPlanCards = useMemo(() => {
    const cardioIdeas = (cardioGuidance.ideas || []).slice(0, 2).join(" • ");
    return [
      {
        title: "Fuel",
        value: nutritionTargets?.calories ? `${Math.round(nutritionTargets.calories)} kcal` : "Set phase",
        detail: nutritionTargets?.protein ? `${Math.round(nutritionTargets.protein)}g protein` : "Protein auto-fills from your phase"
      },
      {
        title: "Train",
        value: dashboardModel.phaseSummary.workoutTarget ? `${dashboardModel.phaseSummary.workoutTarget} lifts / week` : "Training target pending",
        detail: activePhase?.type ? `${activePhase.type} focus` : "Start a phase to shape training"
      },
      {
        title: "Move",
        value: cardioGuidance.frequency || "Cardio plan pending",
        detail: cardioIdeas || cardioGuidance.note
      },
      {
        title: "Check in",
        value: weighInGuidance.split(".")[0] || weighInGuidance,
        detail: dashboardModel.phaseSummary.targetText || "Phase pace updates after a few logs"
      }
    ];
  }, [
    cardioGuidance.frequency,
    cardioGuidance.ideas,
    cardioGuidance.note,
    nutritionTargets?.calories,
    nutritionTargets?.protein,
    dashboardModel.phaseSummary.workoutTarget,
    dashboardModel.phaseSummary.targetText,
    activePhase?.type,
    weighInGuidance
  ]);

  async function loadAll() {
    if (!session?.user) return;
    if (supabase) setStatus("Loading...");
    const userId = session.user.id;

    const tableConfigs = [
      ["injections", setInjections, "date"],
      ["body_metrics", setBodyMetrics, "date"],
      ["cardio_entries", setCardio, "date"],
      ["workouts", setWorkouts, "date"],
      ["calorie_entries", setCalories, "date"],
      ["custom_foods", setCustomFoods, "created_at"],
      ["schedules", setSchedules, "startDate"],
      ["goals", setGoals, "date"],
      ["lab_entries", setLabEntries, "date"],
      ["progress_photos", setProgressPhotos, "date"]
    ];

    if (!supabase) {
      tableConfigs.forEach(([table, setter, orderCol]) => {
        setter(sortRowsByColumn(getLocalRows(table, userId), orderCol));
      });
      setStatus("");
      return;
    }

    for (const [table, setter, orderCol] of tableConfigs) {
      let query = supabase.from(table).select("*").eq("owner_id", userId);
      if (orderCol) query = query.order(orderCol, { ascending: false });
      const { data, error } = await query;
      if (!error) setter(data || []);
    }

    setStatus("");
  }

  async function saveRow(table, row, setter, current) {
    if (!session?.user) return;

    if (!supabase) {
      const nextRows = sortRowsByColumn([{ ...row }, ...current], table === "custom_foods" ? "created_at" : table === "schedules" ? "startDate" : "date");
      setLocalRows(table, nextRows, session.user.id);
      setter(nextRows);
      setStatus("Saved locally.");
      return;
    }

    const payload = { ...row, owner_id: session.user.id };
    const { data, error } = await supabase.from(table).insert(payload).select().single();
    if (error) {
      setStatus(error.message);
      return;
    }
    setter([data, ...current]);
    setStatus("Saved.");
  }

  async function updateRow(table, id, row, setter, current) {
    if (!session?.user) return;

    if (!supabase) {
      const nextRows = current.map((entry) => (entry.id === id ? { ...entry, ...row } : entry));
      setLocalRows(table, nextRows, session.user.id);
      setter(nextRows);
      setEditing({ table: null, id: null });
      setStatus("Updated locally.");
      return;
    }

    const { data, error } = await supabase
      .from(table)
      .update(row)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      setStatus(error.message);
      return;
    }

    setter(current.map((x) => (x.id === id ? data : x)));
    setEditing({ table: null, id: null });
    setStatus("Updated.");
  }

  async function deleteRow(table, id, setter, current) {
    if (!session?.user) return;

    if (!supabase) {
      const nextRows = current.filter((entry) => entry.id !== id);
      setLocalRows(table, nextRows, session.user.id);
      setter(nextRows);
      setStatus("Deleted locally.");
      return;
    }

    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) {
      setStatus(error.message);
      return;
    }
    setter(current.filter((x) => x.id !== id));
  }

  async function saveOrUpdateGoal() {
    if (!session?.user) return;
    const latest = goals[0];

    const payload = {
      date: todayInput(),
      calories: Number(goalForm.calories || 0),
      protein: Number(goalForm.protein || 0),
      carbs: Number(goalForm.carbs || 0),
      fats: Number(goalForm.fats || 0),
      fiber: Number(goalForm.fiber || 0)
    };

    if (latest) {
      await updateRow("goals", latest.id, payload, setGoals, goals);
    } else {
      await saveRow("goals", { id: makeId(), ...payload }, setGoals, goals);
    }
  }

  async function handleAuth(e) {
    e.preventDefault();
    if (!supabase) {
      setStatus("Add your Supabase URL and publishable key first.");
      return;
    }

    if (authMode === "signup") {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { display_name: displayName } }
      });
      setStatus(error ? error.message : "Check your email to confirm sign-up.");
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setStatus(error ? error.message : "Signed in.");
    }
  }

  async function handleSignOut() {
    if (!supabase) return;
    await supabase.auth.signOut();
    setSession(null);
  }

  async function uploadCompressedImage(file) {
    if (!session?.user || !file) return null;

    const compressed = await compressImage(file);

    if (!supabase) {
      return blobToDataUrl(compressed);
    }

    const path = `${session.user.id}/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}.jpg`;

    const { error } = await supabase.storage
      .from("progress-photos")
      .upload(path, compressed, { upsert: false, contentType: "image/jpeg" });

    if (error) {
      setStatus(error.message);
      return null;
    }

    const { data } = supabase.storage.from("progress-photos").getPublicUrl(path);
    return data.publicUrl;
  }

  function compressImage(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const maxDim = 1280;
          const scale = Math.min(maxDim / img.width, maxDim / img.height, 1);
          const canvas = document.createElement("canvas");
          canvas.width = Math.round(img.width * scale);
          canvas.height = Math.round(img.height * scale);
          const ctx = canvas.getContext("2d");
          if (!ctx) return reject(new Error("Could not create canvas context"));
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          canvas.toBlob(
            (blob) => {
              if (!blob) return reject(new Error("Compression failed"));
              resolve(blob);
            },
            "image/jpeg",
            0.78
          );
        };
        img.onerror = reject;
        img.src = reader.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function pushRecentFood(foodName) {
    const next = [foodName, ...recentFoodNames.filter((x) => x !== foodName)].slice(0, 8);
    setRecentFoodNames(next);
    localStorage.setItem("recentFoodNames", JSON.stringify(next));
  }

  function toggleWorkoutGroup(group) {
    setWorkoutForm((prev) => ({
      ...prev,
      groups: prev.groups.includes(group)
        ? prev.groups.filter((g) => g !== group)
        : [...prev.groups, group]
    }));
  }

  function cycleWorkoutTemplate(group, direction = 1) {
    const variants = getWorkoutVariants(group);
    if (!variants.length) return;
    setWorkoutTemplateSelection((prev) => {
      const current = prev[group] || 0;
      const next = (current + direction + variants.length) % variants.length;
      return { ...prev, [group]: next };
    });
  }

  function insertWorkoutLibrary() {
    setWorkoutForm((prev) => ({
      ...prev,
      notes: prev.notes
        ? `${prev.notes}

--------------------

${buildWorkoutPlan(prev.groups, workoutTemplateSelection)}`
        : buildWorkoutPlan(prev.groups, workoutTemplateSelection)
    }));
  }

  function applyCoachTargetsToGoals() {
    setGoalForm((prev) => ({
      ...prev,
      calories: intelligentTargets.calories != null ? String(intelligentTargets.calories) : prev.calories,
      protein: intelligentTargets.protein != null ? String(intelligentTargets.protein) : prev.protein,
      carbs: intelligentTargets.carbs != null ? String(intelligentTargets.carbs) : prev.carbs,
      fats: intelligentTargets.fats != null ? String(intelligentTargets.fats) : prev.fats,
      fiber: intelligentTargets.fiber != null ? String(intelligentTargets.fiber) : prev.fiber
    }));
    setStatus("Coach targets copied into daily goals.");
  }

  function applyCoachTargetsToPhase(typeOverride = phaseForm.type) {
    const coach = buildIntelligentTargets({
      profile,
      phase: { ...phaseForm, type: typeOverride },
      weightLb: phaseForm.startWeight || latestMetric?.weight || activePhase?.startWeight
    });
    setPhaseForm((prev) => ({
      ...prev,
      type: typeOverride,
      calorieTarget: coach.calories != null ? String(coach.calories) : prev.calorieTarget,
      proteinTarget: coach.protein != null ? String(coach.protein) : prev.proteinTarget,
      rateTarget: coach.rateTarget != null ? String(coach.rateTarget) : prev.rateTarget,
      workoutTarget: coach.workoutTarget != null ? String(coach.workoutTarget) : prev.workoutTarget
    }));
    setStatus("Coach defaults applied to this phase.");
  }

  function toggleLabFormTier(tier) {
    setLabFormExpanded((prev) => ({ ...prev, [tier]: !prev[tier] }));
  }

  function toggleLabHistoryTier(tier) {
    setLabHistoryExpanded((prev) => ({ ...prev, [tier]: !prev[tier] }));
  }

  function openPhaseEditor(phase = activePhase) {
    const nextType = phase?.type || (profile.onTRT ? "TRT Cruise" : "Bulk");
    const coach = buildIntelligentTargets({
      profile,
      phase: { ...phase, type: nextType },
      weightLb: phase?.startWeight ?? latestMetric?.weight
    });
    const isAutoPilot = phase?.autoPilot !== false;

    setPhaseForm(
      buildPhaseForm({
        ...phase,
        type: nextType,
        startDate: phase?.startDate || todayInput(),
        startWeight: phase?.startWeight ?? latestMetric?.weight ?? "",
        calorieTarget:
          isAutoPilot
            ? coach.calories ?? phase?.calorieTarget ?? ""
            : phase?.calorieTarget ?? coach.calories ?? "",
        proteinTarget:
          isAutoPilot
            ? coach.protein ?? phase?.proteinTarget ?? ""
            : phase?.proteinTarget ?? coach.protein ?? "",
        rateTarget: isAutoPilot
          ? coach.rateTarget ?? phase?.rateTarget ?? (PHASE_PRESETS[nextType] || PHASE_PRESETS.Bulk).defaultRate
          : phase?.rateTarget ?? coach.rateTarget ?? (PHASE_PRESETS[nextType] || PHASE_PRESETS.Bulk).defaultRate,
        workoutTarget: isAutoPilot
          ? coach.workoutTarget ?? phase?.workoutTarget ?? (PHASE_PRESETS[nextType] || PHASE_PRESETS.Bulk).defaultWorkouts
          : phase?.workoutTarget ?? coach.workoutTarget ?? (PHASE_PRESETS[nextType] || PHASE_PRESETS.Bulk).defaultWorkouts,
        autoPilot: isAutoPilot
      })
    );
    setPhaseAdvancedOpen(!isAutoPilot);
    setPhaseManualTouched(false);
    setActiveAction("phase");
  }

  function handlePhaseTypeChange(type) {
    const preset = PHASE_PRESETS[type] || PHASE_PRESETS.Bulk;
    const coach = buildIntelligentTargets({
      profile,
      phase: { ...phaseForm, type },
      weightLb: phaseForm.startWeight || latestMetric?.weight || activePhase?.startWeight
    });
    setPhaseForm((prev) => ({
      ...prev,
      type,
      name:
        !prev.name ||
        prev.name === (PHASE_PRESETS[prev.type] || PHASE_PRESETS.Bulk).defaultName
          ? preset.defaultName
          : prev.name,
      calorieTarget: prev.autoPilot !== false ? coach.calories ?? prev.calorieTarget : prev.calorieTarget,
      proteinTarget: prev.autoPilot !== false ? coach.protein ?? prev.proteinTarget : prev.proteinTarget,
      rateTarget: String(prev.autoPilot !== false ? coach.rateTarget ?? preset.defaultRate : prev.rateTarget || preset.defaultRate),
      workoutTarget: String(prev.autoPilot !== false ? coach.workoutTarget ?? preset.defaultWorkouts : prev.workoutTarget || preset.defaultWorkouts)
    }));
  }

  function handleSavePhase() {
    if (!phaseForm.startDate) {
      setStatus("Choose a phase start date.");
      return;
    }

    const preset = PHASE_PRESETS[phaseForm.type] || PHASE_PRESETS.Bulk;
    const coach = buildIntelligentTargets({
      profile,
      phase: phaseForm,
      weightLb: phaseForm.startWeight || latestMetric?.weight || activePhase?.startWeight
    });
    const useAutoPilot = phaseForm.autoPilot !== false && (!phaseAdvancedOpen || !phaseManualTouched);
    const normalized = {
      id: phaseForm.id || makeId(),
      type: phaseForm.type,
      name: phaseForm.name || preset.defaultName,
      startDate: phaseForm.startDate,
      endDate: phaseForm.endDate || "",
      startWeight:
        phaseForm.startWeight === "" || phaseForm.startWeight == null
          ? latestMetric?.weight || ""
          : Number(phaseForm.startWeight),
      calorieTarget:
        (useAutoPilot ? coach.calories : phaseForm.calorieTarget) === "" ||
        (useAutoPilot ? coach.calories : phaseForm.calorieTarget) == null
          ? ""
          : Number(useAutoPilot ? coach.calories : phaseForm.calorieTarget),
      proteinTarget:
        (useAutoPilot ? coach.protein : phaseForm.proteinTarget) === "" ||
        (useAutoPilot ? coach.protein : phaseForm.proteinTarget) == null
          ? ""
          : Number(useAutoPilot ? coach.protein : phaseForm.proteinTarget),
      rateTarget:
        (useAutoPilot ? coach.rateTarget : phaseForm.rateTarget) === "" ||
        (useAutoPilot ? coach.rateTarget : phaseForm.rateTarget) == null
          ? preset.defaultRate
          : Number(useAutoPilot ? coach.rateTarget : phaseForm.rateTarget),
      workoutTarget:
        (useAutoPilot ? coach.workoutTarget : phaseForm.workoutTarget) === "" ||
        (useAutoPilot ? coach.workoutTarget : phaseForm.workoutTarget) == null
          ? preset.defaultWorkouts
          : Number(useAutoPilot ? coach.workoutTarget : phaseForm.workoutTarget),
      notes: phaseForm.notes || "",
      autoPilot: useAutoPilot,
      isActive: !phaseForm.endDate || phaseForm.endDate >= todayInput()
    };

    setPhases((prev) => {
      const next = prev
        .filter((phase) => phase.id !== normalized.id)
        .map((phase) =>
          normalized.isActive && phase.isActive
            ? {
                ...phase,
                isActive: false,
                endDate: phase.endDate || addDaysToDateString(normalized.startDate, -1)
              }
            : phase
        );

      return [normalized, ...next].sort((a, b) => (a.startDate < b.startDate ? 1 : -1));
    });

    setStatus(phaseForm.id ? (normalized.autoPilot ? "Phase updated. Autopilot refreshed." : "Phase updated.") : (normalized.autoPilot ? "Phase started. Autopilot is running." : "Phase started."));
    setPhaseAdvancedOpen(false);
    setPhaseManualTouched(false);
    setActiveAction(null);
  }

  function handleEndActivePhase() {
    if (!activePhase) return;
    setPhases((prev) =>
      prev.map((phase) =>
        phase.id === activePhase.id
          ? { ...phase, isActive: false, endDate: todayInput() }
          : phase
      )
    );
    setStatus("Active phase closed.");
    setActiveAction(null);
  }

  function closeAllSections() {
    setLabFormOpen(false);
    setLabHistoryOpen(false);
    setInjLogOpen(false);
    setInjScheduleOpen(false);
    setBodyLogOpen(false);
    setBodyHistoryOpen(false);
    setGoalEditorOpen(false);
    setPhaseAdvancedOpen(false);
    setPhaseManualTouched(false);
    setLabHistoryExpanded({
      essential: false,
      important: false,
      advanced: false
    });
    setLabFormExpanded({
      essential: false,
      important: false,
      advanced: false
    });
  }

  function startEdit(table, item) {
    setEditing({ table, id: item.id });

    if (table === "injections") {
      setInjForm({
        date: item.date,
        peptide: item.peptide,
        dosage: item.dosage || "",
        unit: item.unit || "mg",
        notes: item.notes || ""
      });
      setScreenIndex(SCREENS.indexOf("injections"));
      setActiveAction("protocol");
    }

    if (table === "body_metrics") {
      setBodyForm({
        date: item.date,
        weight: item.weight || "",
        skeletalMuscleMass: item.skeletalMuscleMass || "",
        bodyFatPercent: item.bodyFatPercent || ""
      });
      setActiveAction("weight");
      setScreenIndex(SCREENS.indexOf("body"));
    }

    if (table === "cardio_entries") {
      setCardioForm({
        date: item.date,
        type: item.type || CARDIO_OPTIONS[0],
        minutes: item.minutes || "",
        notes: item.notes || ""
      });
      setActiveAction("cardio");
    }

    if (table === "workouts") {
      setWorkoutForm({
        date: item.date,
        groups: Array.isArray(item.groups) ? item.groups : [],
        notes: item.notes || ""
      });
      setActiveAction("workout");
    }

    if (table === "calorie_entries") {
      setFoodForm({
        date: item.date,
        name: item.foodName,
        servings: String(item.servings || 1)
      });
      setFoodSearch(item.foodName || "");
      setActiveAction("food");
    }

    if (table === "custom_foods") {
      setCustomFoodForm({
        name: item.name || "",
        calories: item.calories || "",
        protein: item.protein || "",
        carbs: item.carbs || "",
        fats: item.fats || "",
        fiber: item.fiber || ""
      });
      setShowCustomFood(true);
      setActiveAction("food");
    }

    if (table === "schedules") {
      setScheduleForm({
        peptide: item.peptide,
        dosage: item.dosage || "",
        unit: item.unit || "mg",
        startDate: item.startDate,
        everyDays: String(item.everyDays || ""),
        time: item.time || "09:00"
      });
      setInjScheduleOpen(true);
      setScreenIndex(SCREENS.indexOf("injections"));
    }
  }

  function cancelEdit() {
    setEditing({ table: null, id: null });
  }

  function openAdvice(marker) {
    const entry = latestLabsByMarker[marker];
    if (!entry) return;
    const zone = labZone(entry);
    setActiveLabAdvice(getFriendlyLabAdvice(marker, zone, entry, profile));
  }

  function resetLabBatchToSmartDefaults() {
    setLabBatch(buildInitialLabBatch(profile));
    setStatus("Applied smart default ranges.");
  }

  function goToScreen(screen) {
    const idx = SCREENS.indexOf(screen);
    if (idx >= 0) {
      closeAllSections();
      setScreenIndex(idx);
    }
  }

  function onTouchStart(e) {
    setTouchStartX(e.changedTouches[0].clientX);
    setTouchStartY(e.changedTouches[0].clientY);
  }

  function onTouchEnd(e) {
    if (touchStartX == null || touchStartY == null) return;

    const diffX = e.changedTouches[0].clientX - touchStartX;
    const diffY = e.changedTouches[0].clientY - touchStartY;

    setTouchStartX(null);
    setTouchStartY(null);

    if (Math.abs(diffX) < 90) return;
    if (Math.abs(diffX) < Math.abs(diffY) + 24) return;

    closeAllSections();
    if (diffX < 0) {
      setScreenIndex((prev) => Math.min(prev + 1, SCREENS.length - 1));
    } else {
      setScreenIndex((prev) => Math.max(prev - 1, 0));
    }
  }

  const screenTitle = SCREEN_LABELS[currentScreen];

  if (!session) {
    return (
      <div style={styles.page}>
        <div style={styles.authWrap}>
          <div style={styles.brandHero}>
            <img src={LOGO_URL} alt="logo" style={styles.logoElite} />
            <div style={styles.brandText}>IRON SYNDICATE</div>
            <div style={styles.brandTagline}>Track. Optimize. Dominate.</div>
          </div>

          <form onSubmit={handleAuth} style={styles.authCard}>
            <div style={styles.segment}>
              <button
                type="button"
                onClick={() => setAuthMode("signin")}
                style={
                  authMode === "signin"
                    ? { ...styles.segmentBtn, ...styles.segmentBtnActive }
                    : styles.segmentBtn
                }
              >
                Sign in
              </button>
              <button
                type="button"
                onClick={() => setAuthMode("signup")}
                style={
                  authMode === "signup"
                    ? { ...styles.segmentBtn, ...styles.segmentBtnActive }
                    : styles.segmentBtn
                }
              >
                Create account
              </button>
            </div>

            {authMode === "signup" ? (
              <div>
                <label style={styles.label}>Display name</label>
                <input
                  style={styles.input}
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                />
              </div>
            ) : null}

            <div>
              <label style={styles.label}>Email</label>
              <input
                style={styles.input}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label style={styles.label}>Password</label>
              <input
                style={styles.input}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button style={styles.primaryButton} type="submit">
              {authMode === "signup" ? "Create account" : "Sign in"}
            </button>

            {status ? <div style={styles.status}>{status}</div> : null}
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <div style={styles.topBar}>
          <div style={styles.brandHeroCompact}>
            <img src={LOGO_URL} alt="logo" style={styles.logoCompact} />
            <div>
              <div style={styles.brandTextSmall}>Iron Syndicate</div>
              <div style={styles.brandTaglineSmall}>Track. Optimize. Dominate.</div>
            </div>
          </div>

          <div style={styles.headerActions}>
            <div style={{ display: "grid", gap: 4 }}>
              <div style={styles.filterLabel}>Peptide Filter</div>
              <select
                style={styles.inputCompact}
                value={peptideFilter}
                onChange={(e) => setPeptideFilter(e.target.value)}
              >
                <option value="all">All peptides</option>
                <option value="none">None</option>
                {PEPTIDE_OPTIONS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            <div style={styles.headerActionButtons}>
              {!supabase ? <div style={styles.localModeBadge}>Local mode</div> : null}
              <button style={styles.secondaryButton} onClick={() => openPhaseEditor()}>
                Phase
              </button>
              <button
                style={styles.secondaryButton}
                onClick={() => setActiveAction((prev) => (prev === "profile" ? null : "profile"))}
              >
                Profile
              </button>
              {supabase ? (
                <button style={styles.secondaryButton} onClick={handleSignOut}>
                  Sign out
                </button>
              ) : null}
            </div>
          </div>
        </div>

        <div
          style={styles.swipeShell}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          <div style={styles.screenPillRow}>
            {SCREENS.map((screen, idx) => (
              <button
                key={screen}
                onClick={() => setScreenIndex(idx)}
                style={
                  idx === screenIndex
                    ? { ...styles.screenPill, ...styles.screenPillActive }
                    : styles.screenPill
                }
              >
                {SCREEN_LABELS[screen]}
              </button>
            ))}
          </div>

          <div style={styles.screenHeader}>
            <div>
              <div style={styles.screenLabel}>Swipe between views</div>
              <div style={styles.screenTitle}>{screenTitle}</div>
            </div>
            <div style={styles.smallText}>
              {screenIndex > 0 ? `← ${SCREEN_LABELS[SCREENS[screenIndex - 1]]}` : " "}
              {screenIndex < SCREENS.length - 1
                ? ` • ${SCREEN_LABELS[SCREENS[screenIndex + 1]]} →`
                : ""}
            </div>
          </div>

          {currentScreen === "home" ? (
            <div style={styles.stackLayout}>
              <div style={{ ...styles.card, ...styles.phaseHeroCard }}>
                <div style={styles.phaseHeroTop}>
                  <div style={styles.phaseTitleBlock}>
                    <div style={styles.phaseEyebrow}>Current Phase</div>
                    <div style={styles.phaseTitleRow}>
                      <div style={styles.phaseEmoji}>{dashboardModel.phaseSummary.icon}</div>
                      <div>
                        <div style={styles.phaseHeroTitle}>{dashboardModel.phaseSummary.name}</div>
                        <div style={styles.smallText}>
                          {dashboardModel.phaseSummary.active
                            ? `${dashboardModel.phaseSummary.type} • Day ${
                                dashboardModel.phaseSummary.dayNumber || 1
                              }`
                            : "Start a phase to give your progress context."}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div style={styles.actionRowSmall}>
                    <button style={styles.secondaryButton} onClick={() => openPhaseEditor()}>
                      {dashboardModel.phaseSummary.active ? "Edit phase" : "Start phase"}
                    </button>
                    <button
                      style={styles.primaryButton}
                      onClick={() => setActiveAction("profile")}
                    >
                      Profile
                    </button>
                  </div>
                </div>

                {dashboardModel.phaseSummary.active ? (
                  <>
                    <div style={styles.phasePillRow}>
                      <div style={styles.phaseInfoPill}>
                        {dashboardModel.phaseSummary.targetText}
                      </div>
                      <div
                        style={
                          dashboardModel.phaseSummary.paceTone === "positive"
                            ? { ...styles.phaseInfoPill, ...styles.phaseInfoPillPositive }
                            : dashboardModel.phaseSummary.paceTone === "warning"
                            ? { ...styles.phaseInfoPill, ...styles.phaseInfoPillWarning }
                            : styles.phaseInfoPill
                        }
                      >
                        {dashboardModel.phaseSummary.paceMessage}
                      </div>
                      <div style={styles.phaseInfoPill}>
                        {activePhase?.autoPilot === false ? "Manual phase settings" : "Autopilot live"}
                      </div>
                    </div>

                    <div style={styles.phaseStatsGrid}>
                      <div style={styles.phaseStatCard}>
                        <div style={styles.phaseStatLabel}>Current weight</div>
                        <div style={styles.phaseStatValue}>
                          {dashboardModel.phaseSummary.currentWeight != null
                            ? `${dashboardModel.phaseSummary.currentWeight.toFixed(1)} lb`
                            : "—"}
                        </div>
                      </div>
                      <div style={styles.phaseStatCard}>
                        <div style={styles.phaseStatLabel}>From start</div>
                        <div style={styles.phaseStatValue}>
                          {dashboardModel.phaseSummary.phaseWeightChange != null
                            ? `${
                                dashboardModel.phaseSummary.phaseWeightChange > 0 ? "+" : ""
                              }${dashboardModel.phaseSummary.phaseWeightChange.toFixed(1)} lb`
                            : "—"}
                        </div>
                      </div>
                      <div style={styles.phaseStatCard}>
                        <div style={styles.phaseStatLabel}>Calories</div>
                        <div style={styles.phaseStatValue}>
                          {dashboardModel.phaseSummary.calorieTarget != null
                            ? Math.round(dashboardModel.phaseSummary.calorieTarget)
                            : "—"}
                        </div>
                      </div>
                      <div style={styles.phaseStatCard}>
                        <div style={styles.phaseStatLabel}>Protein</div>
                        <div style={styles.phaseStatValue}>
                          {dashboardModel.phaseSummary.proteinTarget != null
                            ? `${Math.round(dashboardModel.phaseSummary.proteinTarget)}g`
                            : "—"}
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div style={styles.emptyBox}>
                    Bulk, cut, cruise, or blast — once a phase is set, the dashboard starts judging pace instead of only showing entries.
                  </div>
                )}
              </div>

              <div style={styles.card}>
                <div style={styles.sectionHeaderRow}>
                  <div>
                    <h2 style={{ ...styles.cardTitle, margin: 0 }}>Today’s Signals</h2>
                    <div style={styles.smallText}>What your recent logs actually mean.</div>
                  </div>
                  <div style={styles.signalCountPill}>
                    {dashboardModel.signals.length} live
                  </div>
                </div>

                {dashboardModel.signals.length === 0 ? (
                  <div style={styles.emptyBox}>
                    Log a few days of food, weight, training, and protocol data. This feed will start coaching back.
                  </div>
                ) : (
                  <div style={styles.signalStack}>
                    {dashboardModel.signals.map((signal) => {
                      const toneStyle =
                        signal.kind === "warning"
                          ? styles.signalWarning
                          : signal.kind === "positive"
                          ? styles.signalPositive
                          : styles.signalGuide;

                      return (
                        <div
                          key={signal.message}
                          style={{ ...styles.signalCard, ...toneStyle }}
                        >
                          <div style={styles.signalIcon}>{signal.icon}</div>
                          <div style={styles.signalCopy}>
                            <div style={styles.signalTitle}>{signal.message}</div>
                            {signal.hint ? (
                              <div style={styles.signalHint}>{signal.hint}</div>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div style={styles.card}>
                <div style={styles.sectionHeaderRow}>
                  <div>
                    <h2 style={{ ...styles.cardTitle, margin: 0 }}>Consistency</h2>
                    <div style={styles.smallText}>Streaks worth protecting.</div>
                  </div>
                  <div style={styles.smallText}>{dashboardModel.atRiskMessage}</div>
                </div>

                <div style={styles.consistencyGrid}>
                  {dashboardModel.streaks.map((item) => {
                    const stateStyle =
                      item.state === "healthy"
                        ? styles.streakHealthy
                        : item.state === "at-risk"
                        ? styles.streakAtRisk
                        : item.state === "broken"
                        ? styles.streakBroken
                        : styles.streakNeutral;

                    return (
                      <div key={item.label} style={{ ...styles.streakCard, ...stateStyle }}>
                        <div style={styles.streakHeaderRow}>
                          <div style={styles.streakLabel}>{`${item.icon} ${item.label}`}</div>
                          <div style={styles.streakStateText}>
                            {item.state === "healthy"
                              ? "Strong"
                              : item.state === "at-risk"
                              ? "At risk"
                              : item.state === "broken"
                              ? "Broken"
                              : "Idle"}
                          </div>
                        </div>
                        <div style={styles.streakValue}>{item.display}</div>
                        <div style={styles.streakHint}>{item.helper}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div style={styles.card}>
                <div style={styles.sectionHeaderRow}>
                  <div>
                    <h2 style={{ ...styles.cardTitle, margin: 0 }}>Proof It’s Working</h2>
                    <div style={styles.smallText}>Make the wins obvious.</div>
                  </div>
                </div>

                {dashboardModel.proofMetrics.length === 0 ? (
                  <div style={styles.emptyBox}>
                    Once this phase has a little data behind it, your standout wins will show up here.
                  </div>
                ) : (
                  <div style={styles.proofGrid}>
                    {dashboardModel.proofMetrics.map((metric) => (
                      <div key={metric.heading} style={styles.proofCard}>
                        <div style={styles.proofHeading}>{metric.heading}</div>
                        <div style={styles.proofDetail}>{metric.detail}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={styles.card}>
                <div style={styles.sectionHeaderRow}>
                  <div>
                    <h2 style={{ ...styles.cardTitle, margin: 0 }}>Coach Lane</h2>
                    <div style={styles.smallText}>The app handles the setup. You just execute.</div>
                  </div>
                  <div style={styles.recapBadge}>Auto</div>
                </div>

                <div style={styles.recapGrid}>
                  {coachPlanCards.map((item) => (
                    <div key={item.title} style={styles.recapStatCard}>
                      <div style={styles.recapStatLabel}>{item.title}</div>
                      <div style={styles.recapStatValue}>{item.value}</div>
                      <div style={styles.recapStatSubtext}>{item.detail}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={styles.card}>
                <div style={styles.sectionHeaderRow}>
                  <div>
                    <h2 style={{ ...styles.cardTitle, margin: 0 }}>Progress Compare</h2>
                    <div style={styles.smallText}>Photo + bodyweight tells the story fast.</div>
                  </div>
                  <button style={styles.secondaryButton} onClick={() => setActiveAction("photo")}>
                    Add photo
                  </button>
                </div>

                {!dashboardModel.photoCompare ? (
                  <div style={styles.emptyBox}>
                    Add at least two progress photos and the app will build a then-vs-now compare card here.
                  </div>
                ) : (
                  <div style={styles.progressCompareHero}>
                    <div style={styles.progressCompareMetaRow}>
                      <div style={styles.progressCompareDelta}>
                        {dashboardModel.photoCompare.deltaWeight != null
                          ? `${dashboardModel.photoCompare.deltaWeight > 0 ? "+" : ""}${dashboardModel.photoCompare.deltaWeight.toFixed(1)} lb`
                          : "Weight delta pending"}
                      </div>
                      <div style={styles.progressCompareSpan}>
                        {dashboardModel.photoCompare.daysApart} days apart
                        {dashboardModel.photoCompare.samePose ? " • same pose" : ""}
                      </div>
                    </div>

                    <div style={styles.progressCompareGrid}>
                      {[dashboardModel.photoCompare.left, dashboardModel.photoCompare.right].map((photo, index) => {
                        const meta = index === 0
                          ? dashboardModel.photoCompare.leftMeta
                          : dashboardModel.photoCompare.rightMeta;
                        const label = index === 0 ? "Then" : "Now";

                        return (
                          <div key={photo.id} style={styles.progressCompareCard}>
                            <div style={styles.progressCompareLabel}>{label}</div>
                            <img
                              src={photo.imageUrl}
                              alt={photo.pose || "progress"}
                              style={styles.progressCompareImage}
                            />
                            <div style={styles.progressCompareDate}>{fmtDate(photo.date)}</div>
                            <div style={styles.progressCompareText}>{meta?.weightLabel || "Weight not logged"}</div>
                            <div style={styles.progressCompareText}>
                              {meta?.phaseName}
                              {meta?.phaseType ? ` • ${meta.phaseType}` : ""}
                            </div>
                            <div style={styles.progressCompareTextMuted}>
                              {meta?.phaseDayLabel || ""}
                              {photo.pose ? `${meta?.phaseDayLabel ? " • " : ""}${photo.pose}` : ""}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>


              <div
                style={
                  allCompleted
                    ? { ...styles.card, ...styles.completionCelebrateCard }
                    : styles.card
                }
              >
                <div style={styles.sectionHeaderRow}>
                  <h2 style={{ ...styles.cardTitle, margin: 0 }}>Daily Dominance</h2>
                  <div style={allCompleted ? styles.completionBadgeElite : styles.completionBadgeMuted}>
                    {allCompleted ? "💪 Full lock-in" : `${completedCount}/4 locked in`}
                  </div>
                </div>

                <div style={styles.completionMiniGrid}>
                  <CompletionRow
                    done={todayFoodEntries.length > 0}
                    title="Food"
                    detail={todayFoodEntries.length > 0 ? `${todayFoodEntries.length} logged` : "Not yet"}
                  />
                  <CompletionRow
                    done={todayWorkoutEntries.length > 0}
                    title="Workout"
                    detail={todayWorkoutEntries.length > 0 ? "Complete" : "Not yet"}
                  />
                  <CompletionRow
                    done={todayCardioEntries.length > 0}
                    title="Cardio"
                    detail={todayCardioEntries.length > 0 ? `${todayCardio} min` : "Not yet"}
                  />
                  <CompletionRow
                    done={todayPhotoEntries.length > 0}
                    title="Photo"
                    detail={todayPhotoEntries.length > 0 ? `${todayPhotoEntries.length} saved` : "Not yet"}
                  />
                </div>

                <div style={styles.completionFooterText}>
                  {allCompleted
                    ? "Full lock-in today. Momentum is on your side."
                    : "Small wins stack fast. Knock out the rest and own the day."}
                </div>
              </div>

              <div style={styles.card}>
                <div style={styles.sectionHeaderRow}>
                  <div>
                    <h2 style={{ ...styles.cardTitle, margin: 0 }}>Today’s Targets</h2>
                    <div style={styles.smallText}>
                      {activePhase
                        ? "Quietly set from your saved phase + profile."
                        : nutritionTargets.source === "coach"
                        ? "Generated from your saved profile."
                        : "Nutrition progress"}
                    </div>
                  </div>
                </div>

                <div style={styles.dashboardBubbles}>
                  <ProgressBubble
                    title="Calories"
                    valueText={`${Math.round(todayFoodTotals.calories)} / ${
                      Math.round(Number(nutritionTargets?.calories || 0)) || "—"
                    }`}
                    percent={progressPercent(
                      Math.round(todayFoodTotals.calories),
                      Number(nutritionTargets?.calories || 0)
                    )}
                    status={nutritionStatuses.calories}
                    subtitle={
                      nutritionTargets?.calories
                        ? `${Math.max(
                            Number(nutritionTargets.calories) -
                              Math.round(todayFoodTotals.calories),
                            0
                          )} left`
                        : estimatedCalories
                        ? `Suggested: ${estimatedCalories}`
                        : "Set target"
                    }
                    style={styles.bubbleWide}
                  />

                  <ProgressBubble
                    title="Protein"
                    valueText={`${Math.round(todayFoodTotals.protein)}g / ${
                      Math.round(Number(nutritionTargets?.protein || 0)) || "—"
                    }g`}
                    percent={progressPercent(
                      Math.round(todayFoodTotals.protein),
                      Number(nutritionTargets?.protein || 0)
                    )}
                    status={nutritionStatuses.protein}
                    subtitle={
                      nutritionTargets?.protein
                        ? `${Math.max(
                            Number(nutritionTargets.protein) -
                              Math.round(todayFoodTotals.protein),
                            0
                          )}g left`
                        : "Set target"
                    }
                  />

                  <ProgressBubble
                    title="Carbs"
                    valueText={`${Math.round(todayFoodTotals.carbs)}g / ${
                      Math.round(Number(nutritionTargets?.carbs || 0)) || "—"
                    }g`}
                    percent={progressPercent(
                      Math.round(todayFoodTotals.carbs),
                      Number(nutritionTargets?.carbs || 0)
                    )}
                    status={nutritionStatuses.carbs}
                    subtitle={
                      nutritionTargets?.carbs
                        ? `${Math.max(
                            Number(nutritionTargets.carbs) - Math.round(todayFoodTotals.carbs),
                            0
                          )}g left`
                        : "Optional"
                    }
                  />

                  <ProgressBubble
                    title="Fats"
                    valueText={`${Math.round(todayFoodTotals.fats)}g / ${
                      Math.round(Number(nutritionTargets?.fats || 0)) || "—"
                    }g`}
                    percent={progressPercent(
                      Math.round(todayFoodTotals.fats),
                      Number(nutritionTargets?.fats || 0)
                    )}
                    status={nutritionStatuses.fats}
                    subtitle={
                      nutritionTargets?.fats
                        ? `${Math.max(
                            Number(nutritionTargets.fats) - Math.round(todayFoodTotals.fats),
                            0
                          )}g left`
                        : "Optional"
                    }
                  />

                  <ProgressBubble
                    title="Fiber"
                    valueText={`${Math.round(todayFoodTotals.fiber)}g / ${
                      Math.round(Number(nutritionTargets?.fiber || 0)) || "—"
                    }g`}
                    percent={progressPercent(
                      Math.round(todayFoodTotals.fiber),
                      Number(nutritionTargets?.fiber || 0)
                    )}
                    status={nutritionStatuses.fiber}
                    subtitle={
                      nutritionTargets?.fiber
                        ? `${Math.max(
                            Number(nutritionTargets.fiber) - Math.round(todayFoodTotals.fiber),
                            0
                          )}g left`
                        : "Optional"
                    }
                  />
                </div>
              </div>

              <div style={styles.card}>
                <div style={styles.sectionHeaderRow}>
                  <div>
                    <h2 style={{ ...styles.cardTitle, margin: 0 }}>Auto Targets</h2>
                    <div style={styles.smallText}>Built quietly from your saved profile + phase.</div>
                  </div>
                  <button style={styles.secondaryButton} onClick={() => openPhaseEditor()}>
                    Fine-tune
                  </button>
                </div>

                {nutritionTargets.source !== "none" ? (
                  <>
                    <div style={styles.recapGrid}>
                      <div style={styles.recapStatCard}>
                        <div style={styles.recapStatLabel}>Calories</div>
                        <div style={styles.recapStatValue}>{nutritionTargets.calories || "—"}</div>
                        <div style={styles.recapStatSubtext}>Daily target</div>
                      </div>
                      <div style={styles.recapStatCard}>
                        <div style={styles.recapStatLabel}>Protein</div>
                        <div style={styles.recapStatValue}>{nutritionTargets.protein ? `${Math.round(nutritionTargets.protein)}g` : "—"}</div>
                        <div style={styles.recapStatSubtext}>Anchor metric</div>
                      </div>
                      <div style={styles.recapStatCard}>
                        <div style={styles.recapStatLabel}>Carbs</div>
                        <div style={styles.recapStatValue}>{nutritionTargets.carbs ? `${Math.round(nutritionTargets.carbs)}g` : "—"}</div>
                        <div style={styles.recapStatSubtext}>Flex with phase output</div>
                      </div>
                      <div style={styles.recapStatCard}>
                        <div style={styles.recapStatLabel}>Fats</div>
                        <div style={styles.recapStatValue}>{nutritionTargets.fats ? `${Math.round(nutritionTargets.fats)}g` : "—"}</div>
                        <div style={styles.recapStatSubtext}>Recovery support</div>
                      </div>
                    </div>

                    <div style={{ ...styles.contextSummary, marginTop: 12 }}>
                      <div style={styles.smallText}>
                        {activePhase
                          ? `${activePhase.name} is steering nutrition, training frequency, cardio bias, and pace calls.`
                          : "Save a phase and the app will shape the rest of the experience around it."}
                      </div>
                      <div style={styles.smallText}>
                        {activePhase?.autoPilot === false
                          ? "You are running manual targets for this phase."
                          : "Autopilot keeps these values synced in the background as your data changes."}
                      </div>
                    </div>
                  </>
                ) : (
                  <div style={styles.emptyBox}>Start a phase and the app will set the rhythm for you.</div>
                )}
              </div>
            </div>
          ) : null}

          {currentScreen === "charts" ? (
            <div style={styles.stackLayout}>
              <div style={styles.card}>
                <div style={styles.sectionHeaderRow}>
                  <div>
                    <h2 style={styles.cardTitle}>Coach Cardio Plan</h2>
                    <div style={styles.smallText}>{cardioGuidance.heading}</div>
                  </div>
                  <div style={styles.progressChip}>{cardioGuidance.frequency}</div>
                </div>
                <div style={styles.statsGrid}>
                  <div style={styles.statCard}>
                    <div style={styles.glassHighlight} />
                    <div style={styles.statLabel}>Duration</div>
                    <div style={styles.statValueMini}>{cardioGuidance.duration}</div>
                  </div>
                  <div style={styles.statCard}>
                    <div style={styles.glassHighlight} />
                    <div style={styles.statLabel}>Intensity</div>
                    <div style={styles.statValueMini}>{cardioGuidance.intensity}</div>
                  </div>
                  <div style={styles.statCard}>
                    <div style={styles.glassHighlight} />
                    <div style={styles.statLabel}>Timing</div>
                    <div style={styles.statValueMini}>{cardioGuidance.timing}</div>
                  </div>
                </div>
                <div style={{ ...styles.contextSummary, marginTop: 12 }}>
                  <div style={styles.smallText}>Best-fit modes: {cardioGuidance.ideas.join(" • ")}</div>
                  <div style={styles.smallText}>{cardioGuidance.note}</div>
                </div>
              </div>
              <div style={styles.card}>
                <h2 style={styles.cardTitle}>Weight trend</h2>
                <LineChart
                  data={weightChart}
                  keyName="weight"
                  color="#f59e0b"
                  label="Body weight"
                  emptyText="Add at least two weight entries."
                />
              </div>
              <div style={styles.card}>
                <h2 style={styles.cardTitle}>Skeletal muscle trend</h2>
                <LineChart
                  data={smmChart}
                  keyName="skeletalMuscleMass"
                  color="#ef4444"
                  label="Skeletal muscle mass"
                  emptyText="Add at least two SMM entries."
                />
              </div>
              <div style={styles.card}>
                <h2 style={styles.cardTitle}>Body fat trend</h2>
                <LineChart
                  data={bfChart}
                  keyName="bodyFatPercent"
                  color="#60a5fa"
                  label="Body fat %"
                  emptyText="Add at least two body-fat entries."
                />
              </div>

              <CollapsibleSection
                title="Food History"
                open={activeAction === "food-history"}
                onToggle={() =>
                  setActiveAction((prev) => (prev === "food-history" ? null : "food-history"))
                }
                right={`${calories.length} entries`}
              >
                {recentFoodHistory.length === 0 ? (
                  <div style={styles.emptyBox}>No food history yet.</div>
                ) : (
                  recentFoodHistory.map((item) => (
                    <div key={item.id} style={styles.listCard}>
                      <div style={styles.listTop}>
                        <div>
                          <div style={styles.badge}>{fmtDate(item.date)}</div>
                          <div style={styles.listTitle}>{item.foodName}</div>
                          <div style={styles.smallText}>
                            {item.totalCalories} cal • P {item.totalProtein} • C {item.totalCarbs} • F {item.totalFats}
                          </div>
                        </div>
                        <div style={styles.actionRowSmall}>
                          <button
                            style={styles.editButton}
                            onClick={() => startEdit("calorie_entries", item)}
                          >
                            Edit
                          </button>
                          <button
                            style={styles.deleteButton}
                            onClick={() => deleteRow("calorie_entries", item.id, setCalories, calories)}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </CollapsibleSection>

              <CollapsibleSection
                title="Workout History"
                open={activeAction === "workout-history"}
                onToggle={() =>
                  setActiveAction((prev) => (prev === "workout-history" ? null : "workout-history"))
                }
                right={`${workouts.length} entries`}
              >
                {recentWorkoutHistory.length === 0 ? (
                  <div style={styles.emptyBox}>No workout history yet.</div>
                ) : (
                  recentWorkoutHistory.map((item) => (
                    <div key={item.id} style={styles.listCard}>
                      <div style={styles.listTop}>
                        <div>
                          <div style={styles.badge}>{fmtDate(item.date)}</div>
                          <div style={styles.listTitle}>
                            {Array.isArray(item.groups) ? item.groups.join(", ") : "Workout"}
                          </div>
                          {item.notes ? <div style={styles.smallText}>{item.notes}</div> : null}
                        </div>
                        <div style={styles.actionRowSmall}>
                          <button
                            style={styles.editButton}
                            onClick={() => startEdit("workouts", item)}
                          >
                            Edit
                          </button>
                          <button
                            style={styles.deleteButton}
                            onClick={() => deleteRow("workouts", item.id, setWorkouts, workouts)}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </CollapsibleSection>

              <CollapsibleSection
                title="Cardio History"
                open={activeAction === "cardio-history"}
                onToggle={() =>
                  setActiveAction((prev) => (prev === "cardio-history" ? null : "cardio-history"))
                }
                right={`${cardio.length} entries`}
              >
                {recentCardioHistory.length === 0 ? (
                  <div style={styles.emptyBox}>No cardio history yet.</div>
                ) : (
                  recentCardioHistory.map((item) => (
                    <div key={item.id} style={styles.listCard}>
                      <div style={styles.listTop}>
                        <div>
                          <div style={styles.badge}>{fmtDate(item.date)}</div>
                          <div style={styles.listTitle}>{item.type}</div>
                          <div style={styles.smallText}>
                            {item.minutes} min{item.notes ? ` • ${item.notes}` : ""}
                          </div>
                        </div>
                        <div style={styles.actionRowSmall}>
                          <button
                            style={styles.editButton}
                            onClick={() => startEdit("cardio_entries", item)}
                          >
                            Edit
                          </button>
                          <button
                            style={styles.deleteButton}
                            onClick={() => deleteRow("cardio_entries", item.id, setCardio, cardio)}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </CollapsibleSection>
            </div>
          ) : null}

          {currentScreen === "body" ? (
            <div style={styles.stackLayout}>
              <div style={styles.card}>
                <div style={styles.sectionHeaderRow}>
                  <div>
                    <h2 style={styles.cardTitle}>Weigh-in Coaching</h2>
                    <div style={styles.smallText}>{weighInGuidance}</div>
                  </div>
                  <button style={styles.secondaryButton} onClick={() => setActiveAction("weight")}>
                    Log weight
                  </button>
                </div>
                <div style={styles.contextSummary}>
                  <div style={styles.smallText}>{dashboardModel.phaseSummary.paceMessage}</div>
                  <div style={styles.smallText}>Target pace: {dashboardModel.phaseSummary.targetText}</div>
                </div>
              </div>
              <div style={styles.card}>
                <div style={styles.sectionHeaderRow}>
                  <h2 style={styles.cardTitle}>Change Tracking</h2>
                  <select
                    style={styles.inputCompact}
                    value={changeTimeframe}
                    onChange={(e) => setChangeTimeframe(e.target.value)}
                  >
                    <option value="today">Today</option>
                    <option value="week">Week</option>
                    <option value="month">Month</option>
                    <option value="year">Year</option>
                    <option value="all">All time</option>
                  </select>
                </div>
                <div style={styles.smallText}>
                  Compare changes over your selected timeframe.
                </div>
              </div>

              <div style={styles.statsGrid}>
                <div style={styles.statCard}>
                  <div style={styles.glassHighlight} />
                  <div style={styles.statLabel}>Latest weight</div>
                  <div style={styles.statValue}>
                    {latestMetric?.weight ? `${latestMetric.weight} lb` : "—"}
                  </div>
                </div>
                <div style={styles.statCard}>
                  <div style={styles.glassHighlight} />
                  <div style={styles.statLabel}>Weight change</div>
                  <div style={styles.statValue}>
                    {weightDelta ? formatSigned(weightDelta.diff, " lb") : "—"}
                  </div>
                  <div style={styles.smallText}>
                    {weightDelta ? `${fmtDate(weightDelta.startDate)} to ${fmtDate(weightDelta.endDate)}` : "Need at least 2 entries"}
                  </div>
                </div>
                <div style={styles.statCard}>
                  <div style={styles.glassHighlight} />
                  <div style={styles.statLabel}>Body fat</div>
                  <div style={styles.statValue}>
                    {latestMetric?.bodyFatPercent
                      ? `${latestMetric.bodyFatPercent}%`
                      : "—"}
                  </div>
                </div>
                <div style={styles.statCard}>
                  <div style={styles.glassHighlight} />
                  <div style={styles.statLabel}>Body fat % change</div>
                  <div style={styles.statValue}>
                    {bodyFatDelta ? formatSigned(bodyFatDelta.diff, "%") : "—"}
                  </div>
                  <div style={styles.smallText}>
                    {bodyFatDelta ? `${fmtDate(bodyFatDelta.startDate)} to ${fmtDate(bodyFatDelta.endDate)}` : "Need at least 2 entries"}
                  </div>
                </div>
                <div style={styles.statCard}>
                  <div style={styles.glassHighlight} />
                  <div style={styles.statLabel}>Skeletal muscle</div>
                  <div style={styles.statValue}>
                    {latestMetric?.skeletalMuscleMass || "—"}
                  </div>
                </div>
                <div style={styles.statCard}>
                  <div style={styles.glassHighlight} />
                  <div style={styles.statLabel}>BMI</div>
                  <div style={styles.statValue}>
                    {bmi ? bmi.toFixed(1) : "—"}
                  </div>
                </div>
              </div>

              <CollapsibleSection
                title={editing.table === "body_metrics" ? "Edit Body Metrics" : "Log Body Metrics"}
                open={bodyLogOpen}
                onToggle={() => setBodyLogOpen((p) => !p)}
                right="Weight / SMM / BF / BMI"
              >
                <div style={styles.formGrid}>
                  <div>
                    <label style={styles.label}>Date</label>
                    <input
                      style={styles.input}
                      type="date"
                      value={bodyForm.date}
                      onChange={(e) =>
                        setBodyForm({ ...bodyForm, date: e.target.value })
                      }
                    />
                  </div>

                  <div className="row4" style={styles.row4}>
                    <div>
                      <label style={styles.label}>Weight</label>
                      <input
                        style={styles.input}
                        value={bodyForm.weight}
                        onChange={(e) =>
                          setBodyForm({ ...bodyForm, weight: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <label style={styles.label}>Skeletal muscle mass</label>
                      <input
                        style={styles.input}
                        value={bodyForm.skeletalMuscleMass}
                        onChange={(e) =>
                          setBodyForm({
                            ...bodyForm,
                            skeletalMuscleMass: e.target.value
                          })
                        }
                      />
                    </div>
                    <div>
                      <label style={styles.label}>Body fat %</label>
                      <input
                        style={styles.input}
                        value={bodyForm.bodyFatPercent}
                        onChange={(e) =>
                          setBodyForm({
                            ...bodyForm,
                            bodyFatPercent: e.target.value
                          })
                        }
                      />
                    </div>
                    <div>
                      <label style={styles.label}>BMI</label>
                      <div style={styles.readOnlyBox}>
                        {calculateBMI(bodyForm.weight, profile.heightInches)?.toFixed(1) ||
                          "Add weight + height"}
                      </div>
                    </div>
                  </div>

                  {editing.table === "body_metrics" ? (
                    <div style={styles.actionRow}>
                      <button
                        style={styles.primaryButton}
                        onClick={() =>
                          updateRow(
                            "body_metrics",
                            editing.id,
                            { ...bodyForm },
                            setBodyMetrics,
                            bodyMetrics
                          )
                        }
                      >
                        Update metrics
                      </button>
                      <button style={styles.secondaryButton} onClick={cancelEdit}>
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      style={styles.primaryButton}
                      onClick={() =>
                        saveRow(
                          "body_metrics",
                          { id: makeId(), ...bodyForm },
                          setBodyMetrics,
                          bodyMetrics
                        )
                      }
                    >
                      Save metrics
                    </button>
                  )}
                </div>
              </CollapsibleSection>

              <CollapsibleSection
                title="Body Metric History"
                open={bodyHistoryOpen}
                onToggle={() => setBodyHistoryOpen((p) => !p)}
                right={`${bodyMetrics.length} entries`}
              >
                {bodyMetrics.length === 0 ? (
                  <div style={styles.emptyBox}>No body metrics yet.</div>
                ) : (
                  bodyMetrics.map((x) => (
                    <div key={x.id} style={styles.listCard}>
                      <div style={styles.listTop}>
                        <div>
                          <div style={styles.badge}>{fmtDate(x.date)}</div>
                          <div style={styles.smallText}>
                            Weight {x.weight || "—"} • SMM {x.skeletalMuscleMass || "—"} •
                            BF {x.bodyFatPercent || "—"}%
                          </div>
                        </div>
                        <div style={styles.actionRowSmall}>
                          <button
                            style={styles.editButton}
                            onClick={() => startEdit("body_metrics", x)}
                          >
                            Edit
                          </button>
                          <button
                            style={styles.deleteButton}
                            onClick={() =>
                              deleteRow("body_metrics", x.id, setBodyMetrics, bodyMetrics)
                            }
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </CollapsibleSection>

              <CollapsibleSection
                title="Progress Photos"
                open={activeAction === "photo-history"}
                onToggle={() =>
                  setActiveAction((prev) => (prev === "photo-history" ? null : "photo-history"))
                }
                right={`${progressPhotos.length} photos`}
              >
                {progressPhotos.length === 0 ? (
                  <div style={styles.emptyBox}>No progress photos yet.</div>
                ) : (
                  <div style={styles.formGrid}>
                    <div style={styles.row3}>
                      <div>
                        <label style={styles.label}>Pose filter</label>
                        <select
                          style={styles.input}
                          value={photoComparePose}
                          onChange={(e) => setPhotoComparePose(e.target.value)}
                        >
                          <option value="All">All</option>
                          {PHOTO_POSES.map((pose) => (
                            <option key={pose} value={pose}>
                              {pose}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label style={styles.label}>Left date</label>
                        <select
                          style={styles.input}
                          value={photoCompareLeftDate}
                          onChange={(e) => setPhotoCompareLeftDate(e.target.value)}
                        >
                          {photoDateOptions.map((d) => (
                            <option key={d} value={d}>
                              {fmtDate(d)}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label style={styles.label}>Right date</label>
                        <select
                          style={styles.input}
                          value={photoCompareRightDate}
                          onChange={(e) => setPhotoCompareRightDate(e.target.value)}
                        >
                          {photoDateOptions.map((d) => (
                            <option key={d} value={d}>
                              {fmtDate(d)}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div style={styles.photoCompareGrid}>
                      <div style={styles.photoCompareColumn}>
                        <div style={styles.photoCompareHeader}>{photoCompareLeftDate ? fmtDate(photoCompareLeftDate) : "Select date"}</div>
                        {leftComparePhotos.length === 0 ? (
                          <div style={styles.emptyBox}>No photos for this selection.</div>
                        ) : (
                          leftComparePhotos.map((photo) => (
                            <div key={photo.id} style={styles.photoCard}>
                              <img
                                src={photo.imageUrl}
                                alt={photo.pose || "progress"}
                                style={styles.photoGridImage}
                              />
                              <div style={styles.smallText}>
                                {photo.pose || "Photo"}{photo.notes ? ` • ${photo.notes}` : ""}
                              </div>
                              <div style={styles.photoMetaText}>
                                {photoMetaById[photo.id]?.weightLabel || "Weight not logged"}
                              </div>
                              <div style={styles.photoMetaText}>
                                {photoMetaById[photo.id]?.phaseName}
                                {photoMetaById[photo.id]?.phaseType
                                  ? ` • ${photoMetaById[photo.id]?.phaseType}`
                                  : ""}
                              </div>
                              {photoMetaById[photo.id]?.phaseDayLabel ? (
                                <div style={styles.photoMetaTextMuted}>
                                  {photoMetaById[photo.id]?.phaseDayLabel}
                                </div>
                              ) : null}
                            </div>
                          ))
                        )}
                      </div>

                      <div style={styles.photoCompareColumn}>
                        <div style={styles.photoCompareHeader}>{photoCompareRightDate ? fmtDate(photoCompareRightDate) : "Select date"}</div>
                        {rightComparePhotos.length === 0 ? (
                          <div style={styles.emptyBox}>No photos for this selection.</div>
                        ) : (
                          rightComparePhotos.map((photo) => (
                            <div key={photo.id} style={styles.photoCard}>
                              <img
                                src={photo.imageUrl}
                                alt={photo.pose || "progress"}
                                style={styles.photoGridImage}
                              />
                              <div style={styles.smallText}>
                                {photo.pose || "Photo"}{photo.notes ? ` • ${photo.notes}` : ""}
                              </div>
                              <div style={styles.photoMetaText}>
                                {photoMetaById[photo.id]?.weightLabel || "Weight not logged"}
                              </div>
                              <div style={styles.photoMetaText}>
                                {photoMetaById[photo.id]?.phaseName}
                                {photoMetaById[photo.id]?.phaseType
                                  ? ` • ${photoMetaById[photo.id]?.phaseType}`
                                  : ""}
                              </div>
                              {photoMetaById[photo.id]?.phaseDayLabel ? (
                                <div style={styles.photoMetaTextMuted}>
                                  {photoMetaById[photo.id]?.phaseDayLabel}
                                </div>
                              ) : null}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </CollapsibleSection>
            </div>
          ) : null}

          {currentScreen === "injections" ? (
            <div style={styles.stackLayout}>
              <div style={styles.card}>
                <div style={styles.sectionHeaderRow}>
                  <div>
                    <h2 style={styles.cardTitle}>Protocol Context</h2>
                    <div style={styles.smallText}>{protocolGuidance.headline}</div>
                  </div>
                  <button style={styles.secondaryButton} onClick={() => setActiveAction("protocol")}>
                    Quick log protocol
                  </button>
                </div>
                <div style={styles.contextSummary}>
                  <div style={styles.smallText}>{protocolGuidance.detail}</div>
                  <div style={styles.smallText}>{protocolGuidance.focus}</div>
                </div>
              </div>
              <div style={styles.card}>
                <div style={styles.sectionHeaderRow}>
                  <div>
                    <h2 style={styles.cardTitle}>Coach Notes</h2>
                    <div style={styles.smallText}>Quiet protocol context, not a wall of info.</div>
                  </div>
                  <div style={styles.signalCountPill}>
                    {activePhase?.type || "No phase"}
                  </div>
                </div>

                <div style={styles.contextSummary}>
                  <div style={styles.smallText}>{protocolKnowledge.phaseFit}</div>
                  <div style={styles.smallText}>{protocolKnowledge.timing}</div>
                  <div style={styles.smallText}>{protocolKnowledge.boundary}</div>
                </div>

                <div style={styles.phasePillRow}>
                  {(protocolKnowledge.monitoring || []).slice(0, 3).map((item) => (
                    <div key={item} style={styles.phaseInfoPill}>
                      {item}
                    </div>
                  ))}
                </div>
              </div>

              <div style={styles.card}>
                <div style={styles.sectionHeaderRow}>
                  <h2 style={styles.cardTitle}>Schedule Progress</h2>
                  <div style={styles.smallText}></div>
                </div>

                {schedulePreview.length === 0 ? (
                  <div style={styles.emptyBox}>
                    {peptideFilter === "none"
                      ? "Peptide filter is set to None."
                      : "No schedules yet."}
                  </div>
                ) : (
                  <div style={styles.scheduleBubbleStack}>
                    {schedulePreview.map((s) => (
                      <div key={s.id} style={styles.scheduleHeroCard}>
                        <div style={styles.listTop}>
                          <div>
                            <div style={styles.listTitle}>{s.peptide}</div>
                            <div style={styles.smallText}>
                              {s.dosage} {s.unit} • every {s.everyDays} days
                            </div>
                          </div>

                          <div
                            style={
                              s.injectedToday
                                ? styles.scheduleBadgeDone
                                : s.daysAway < 0
                                ? styles.scheduleBadgeOverdue
                                : s.daysAway === 0
                                ? styles.scheduleBadgeToday
                                : styles.scheduleBadgeUpcoming
                            }
                          >
                            {s.injectedToday
                              ? "Done today"
                              : s.daysAway < 0
                              ? "Overdue"
                              : s.daysAway === 0
                              ? "Due today"
                              : `${s.daysAway}d`}
                          </div>
                        </div>

                        <div style={styles.scheduleDateRow}>
                          <div style={styles.scheduleDatePrimary}>
                            {fmtDate(s.nextDate)}
                          </div>
                          <div style={styles.smallText}>{s.time}</div>
                        </div>

                        <div style={styles.progressBarElite}>
                          <div
                            style={{
                              ...styles.progressFillElite,
                              width: `${s.cycleProgress}%`,
                              background: "linear-gradient(90deg, #ef4444, #fca5a5)"
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <CollapsibleSection
                title={editing.table === "injections" ? "Edit Protocol Entry" : "Log Protocol"}
                open={injLogOpen}
                onToggle={() => setInjLogOpen((p) => !p)}
                right="Fast entry"
              >
                <div style={styles.formGrid}>
                  <div>
                    <label style={styles.label}>Date</label>
                    <input
                      style={styles.input}
                      type="date"
                      value={injForm.date}
                      onChange={(e) => setInjForm({ ...injForm, date: e.target.value })}
                    />
                  </div>

                  <div>
                    <label style={styles.label}>Peptide</label>
                    <select
                      style={styles.input}
                      value={injForm.peptide}
                      onChange={(e) =>
                        setInjForm({ ...injForm, peptide: e.target.value })
                      }
                    >
                      {PEPTIDE_OPTIONS.map((p) => (
                        <option key={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                  <div style={styles.row2}>
                    <div>
                      <label style={styles.label}>Dosage</label>
                      <input
                        style={styles.input}
                        value={injForm.dosage}
                        onChange={(e) =>
                          setInjForm({ ...injForm, dosage: e.target.value })
                        }
                      />
                    </div>

                    <div>
                      <label style={styles.label}>Unit</label>
                      <input
                        style={styles.input}
                        value={injForm.unit}
                        onChange={(e) =>
                          setInjForm({ ...injForm, unit: e.target.value })
                        }
                      />
                    </div>
                  </div>

                  <div>
                    <label style={styles.label}>Notes</label>
                    <textarea
                      style={styles.textarea}
                      value={injForm.notes}
                      onChange={(e) =>
                        setInjForm({ ...injForm, notes: e.target.value })
                      }
                    />
                  </div>

                  {editing.table === "injections" ? (
                    <div style={styles.actionRow}>
                      <button
                        style={styles.primaryButton}
                        onClick={() =>
                          updateRow(
                            "injections",
                            editing.id,
                            { ...injForm },
                            setInjections,
                            injections
                          )
                        }
                      >
                        Update protocol entry
                      </button>
                      <button style={styles.secondaryButton} onClick={cancelEdit}>
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      style={styles.primaryButton}
                      onClick={() =>
                        saveRow(
                          "injections",
                          { id: makeId(), ...injForm },
                          setInjections,
                          injections
                        )
                      }
                    >
                      Save protocol entry
                    </button>
                  )}
                </div>

              </CollapsibleSection>

              <CollapsibleSection
                title="Protocol History"
                open={activeAction === "protocol-history"}
                onToggle={() => setActiveAction((prev) => (prev === "protocol-history" ? null : "protocol-history"))}
                right={`${filteredInjections.length} entries`}
              >
                {filteredInjections.length === 0 ? (
                  <div style={styles.emptyBox}>No protocol entries yet.</div>
                ) : (
                  filteredInjections.map((x) => (
                    <div key={x.id} style={styles.listCard}>
                      <div style={styles.listTop}>
                        <div>
                          <div style={styles.badge}>{fmtDate(x.date)}</div>
                          <div style={styles.listTitle}>{x.peptide}</div>
                          <div style={styles.smallText}>{x.dosage} {x.unit}</div>
                        </div>
                        <div style={styles.actionRowSmall}>
                          <button style={styles.editButton} onClick={() => startEdit("injections", x)}>Edit</button>
                          <button style={styles.deleteButton} onClick={() => deleteRow("injections", x.id, setInjections, injections)}>Delete</button>
                        </div>
                      </div>
                      {x.notes ? <div style={styles.note}>{x.notes}</div> : null}
                    </div>
                  ))
                )}
              </CollapsibleSection>

              <CollapsibleSection
                title={editing.table === "schedules" ? "Edit Schedule" : "Injection Schedule"}
                open={injScheduleOpen}
                onToggle={() => setInjScheduleOpen((p) => !p)}
                right={`${filteredSchedules.length} schedules`}
              >
                <div style={styles.formGrid}>
                  <div>
                    <label style={styles.label}>Peptide</label>
                    <select
                      style={styles.input}
                      value={scheduleForm.peptide}
                      onChange={(e) =>
                        setScheduleForm({ ...scheduleForm, peptide: e.target.value })
                      }
                    >
                      {PEPTIDE_OPTIONS.map((p) => (
                        <option key={p}>{p}</option>
                      ))}
                    </select>
                  </div>

                  <div style={styles.row2}>
                    <div>
                      <label style={styles.label}>Dosage</label>
                      <input
                        style={styles.input}
                        value={scheduleForm.dosage}
                        onChange={(e) =>
                          setScheduleForm({ ...scheduleForm, dosage: e.target.value })
                        }
                      />
                    </div>

                    <div>
                      <label style={styles.label}>Unit</label>
                      <input
                        style={styles.input}
                        value={scheduleForm.unit}
                        onChange={(e) =>
                          setScheduleForm({ ...scheduleForm, unit: e.target.value })
                        }
                      />
                    </div>
                  </div>

                  <div>
                    <label style={styles.label}>Start date</label>
                    <input
                      style={styles.input}
                      type="date"
                      value={scheduleForm.startDate}
                      onChange={(e) =>
                        setScheduleForm({ ...scheduleForm, startDate: e.target.value })
                      }
                    />
                  </div>

                  <div style={styles.row2}>
                    <div>
                      <label style={styles.label}>Every how many days</label>
                      <input
                        style={styles.input}
                        value={scheduleForm.everyDays}
                        onChange={(e) =>
                          setScheduleForm({ ...scheduleForm, everyDays: e.target.value })
                        }
                      />
                    </div>

                    <div>
                      <label style={styles.label}>Time</label>
                      <input
                        style={styles.input}
                        type="time"
                        value={scheduleForm.time}
                        onChange={(e) =>
                          setScheduleForm({ ...scheduleForm, time: e.target.value })
                        }
                      />
                    </div>
                  </div>

                  {editing.table === "schedules" ? (
                    <div style={styles.actionRow}>
                      <button
                        style={styles.primaryButton}
                        onClick={() =>
                          updateRow(
                            "schedules",
                            editing.id,
                            {
                              ...scheduleForm,
                              everyDays: Number(scheduleForm.everyDays || 0)
                            },
                            setSchedules,
                            schedules
                          )
                        }
                      >
                        Update schedule
                      </button>
                      <button style={styles.secondaryButton} onClick={cancelEdit}>
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      style={styles.primaryButton}
                      onClick={() =>
                        saveRow(
                          "schedules",
                          {
                            id: makeId(),
                            ...scheduleForm,
                            everyDays: Number(scheduleForm.everyDays || 0)
                          },
                          setSchedules,
                          schedules
                        )
                      }
                    >
                      Save schedule
                    </button>
                  )}
                </div>

                {schedulePreview.length === 0 ? (
                  <div style={styles.emptyBox}>No schedules yet.</div>
                ) : (
                  schedulePreview.map((x) => (
                    <div key={x.id} style={styles.listCard}>
                      <div style={styles.listTop}>
                        <div>
                          <div style={styles.listTitle}>{x.peptide}</div>
                          <div style={styles.smallText}>
                            {x.dosage} {x.unit} • every {x.everyDays} days • {x.time}
                          </div>
                          <div style={styles.smallText}>
                            {x.injectedToday
                              ? `Done today • Next: ${fmtDate(x.nextDate)}`
                              : `Next: ${fmtDate(x.nextDate)} • ${
                                  x.daysAway < 0
                                    ? "Overdue"
                                    : x.daysAway === 0
                                    ? "Due today"
                                    : `${x.daysAway} day${x.daysAway === 1 ? "" : "s"} away`
                                }`}
                          </div>
                          <div style={styles.inlineProgress}>
                            <div
                              style={{
                                ...styles.inlineProgressFill,
                                width: `${x.cycleProgress}%`
                              }}
                            />
                          </div>
                        </div>

                        <div style={styles.actionRowSmall}>
                          <button
                            style={styles.editButton}
                            onClick={() => startEdit("schedules", x)}
                          >
                            Edit
                          </button>
                          <button
                            style={styles.deleteButton}
                            onClick={() =>
                              deleteRow("schedules", x.id, setSchedules, schedules)
                            }
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </CollapsibleSection>
            </div>
          ) : null}

          {currentScreen === "labs" ? (
            <div style={styles.stackLayout}>
              <div style={styles.card}>
                <div style={styles.sectionHeaderRow}>
                  <div>
                    <h2 style={styles.cardTitle}>Lab Focus This Phase</h2>
                    <div style={styles.smallText}>{labCoach.cadence}</div>
                  </div>
                </div>
                <div style={styles.contextSummary}>
                  <div style={styles.smallText}>Priority focus: {labCoach.focus.join(" • ")}</div>
                  <div style={styles.smallText}>{labCoach.note}</div>
                </div>
              </div>
              <div style={styles.card}>
                <div style={styles.sectionHeaderRow}>
                  <h2 style={styles.cardTitle}>Priority Markers</h2>
                  <div style={styles.smallText}>Based on your profile context</div>
                </div>

                {priorityLabCards.length === 0 ? (
                  <div style={styles.emptyBox}>No lab markers logged yet.</div>
                ) : (
                  <div style={styles.priorityGrid}>
                    {priorityLabCards.map((entry) => {
                      const zone = labZone(entry);
                      const colors = statusColors(zone);

                      return (
                        <div
                          key={entry.id}
                          style={{
                            ...styles.listCard,
                            background: colors.bg,
                            border: `1px solid ${colors.glow}`
                          }}
                        >
                          <div style={styles.listTop}>
                            <div>
                              <div style={styles.listTitle}>{entry.marker}</div>
                              <div style={styles.smallText}>
                                {entry.value} {entry.unit} • {fmtDate(entry.date)}
                              </div>
                            </div>

                            <div
                              style={{
                                ...styles.progressChip,
                                color: colors.text,
                                border: `1px solid ${colors.glow}`
                              }}
                            >
                              {zone === "over"
                                ? "High"
                                : zone === "under"
                                ? "Low"
                                : zone === "met"
                                ? "In range"
                                : "—"}
                            </div>
                          </div>

                          <button
                            style={{ ...styles.secondaryButton, marginTop: 10 }}
                            onClick={() => openAdvice(entry.marker)}
                          >
                            Tips
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <CollapsibleSection
                title="Log Lab Panel"
                open={labFormOpen}
                onToggle={() => setLabFormOpen((p) => !p)}
                right="Batch entry"
              >
                <div style={styles.formGrid}>
                  <div style={styles.row2Equal}>
                    <div>
                      <label style={styles.label}>Lab date</label>
                      <input
                        style={styles.input}
                        type="date"
                        value={labBatchDate}
                        onChange={(e) => setLabBatchDate(e.target.value)}
                      />
                    </div>

                    <div>
                      <label style={styles.label}>Notes</label>
                      <input
                        style={styles.input}
                        value={labBatchNotes}
                        onChange={(e) => setLabBatchNotes(e.target.value)}
                        placeholder="Optional note"
                      />
                    </div>
                  </div>

                  <div style={styles.actionRow}>
                    <button
                      type="button"
                      style={styles.secondaryButton}
                      onClick={resetLabBatchToSmartDefaults}
                    >
                      Apply smart defaults
                    </button>
                  </div>

                  {Object.entries(LAB_MARKERS).map(([tier, markers]) => (
                    <div key={tier} style={styles.labTierBlock}>
                      <button
                        type="button"
                        style={styles.tierToggle}
                        onClick={() => toggleLabFormTier(tier)}
                      >
                        {labFormExpanded[tier] ? "▾" : "▸"}{" "}
                        {tier.charAt(0).toUpperCase() + tier.slice(1)}
                      </button>

                      {labFormExpanded[tier] ? (
                        <div style={styles.labTierBody}>
                          {markers.map((markerObj) => {
                            const marker = markerObj.name;
                            const row = labBatch[marker] || {
                              value: "",
                              low: "",
                              high: "",
                              unit: markerObj.unit
                            };

                            return (
                              <div key={marker} style={styles.batchLabCard}>
                                <div style={styles.listTitle}>{marker}</div>

                                <div style={styles.row4}>
                                  <div>
                                    <label style={styles.label}>Value</label>
                                    <input
                                      style={styles.input}
                                      value={row.value}
                                      onChange={(e) =>
                                        setLabBatch((prev) => ({
                                          ...prev,
                                          [marker]: {
                                            ...prev[marker],
                                            value: e.target.value
                                          }
                                        }))
                                      }
                                    />
                                  </div>

                                  <div>
                                    <label style={styles.label}>Low</label>
                                    <input
                                      style={styles.input}
                                      value={row.low ?? ""}
                                      onChange={(e) =>
                                        setLabBatch((prev) => ({
                                          ...prev,
                                          [marker]: {
                                            ...prev[marker],
                                            low:
                                              e.target.value === ""
                                                ? ""
                                                : e.target.value
                                          }
                                        }))
                                      }
                                    />
                                  </div>

                                  <div>
                                    <label style={styles.label}>High</label>
                                    <input
                                      style={styles.input}
                                      value={row.high ?? ""}
                                      onChange={(e) =>
                                        setLabBatch((prev) => ({
                                          ...prev,
                                          [marker]: {
                                            ...prev[marker],
                                            high:
                                              e.target.value === ""
                                                ? ""
                                                : e.target.value
                                          }
                                        }))
                                      }
                                    />
                                  </div>

                                  <div>
                                    <label style={styles.label}>Unit</label>
                                    <input
                                      style={styles.input}
                                      value={row.unit || ""}
                                      onChange={(e) =>
                                        setLabBatch((prev) => ({
                                          ...prev,
                                          [marker]: {
                                            ...prev[marker],
                                            unit: e.target.value
                                          }
                                        }))
                                      }
                                    />
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : null}
                    </div>
                  ))}

                  <button
                    style={styles.primaryButton}
                    onClick={async () => {
                      if (!supabase || !session?.user) return;

                      const rows = Object.entries(labBatch)
                        .filter(([, v]) => v.value !== "" && v.value !== null)
                        .map(([marker, v]) => ({
                          id: makeId(),
                          date: labBatchDate,
                          marker,
                          value: Number(v.value),
                          low: v.low === "" || v.low == null ? null : Number(v.low),
                          high: v.high === "" || v.high == null ? null : Number(v.high),
                          unit: v.unit,
                          notes: labBatchNotes
                        }));

                      if (!rows.length) {
                        setStatus("Enter at least one lab value.");
                        return;
                      }

                      const payload = rows.map((row) => ({
                        ...row,
                        owner_id: session.user.id
                      }));

                      const { data, error } = await supabase
                        .from("lab_entries")
                        .insert(payload)
                        .select();

                      if (error) {
                        setStatus(error.message);
                        return;
                      }

                      setLabEntries([...(data || []), ...labEntries]);
                      setStatus("Labs saved.");
                      setLabBatchDate(todayInput());
                      setLabBatchNotes("");
                      setLabBatch(buildInitialLabBatch(profile));
                    }}
                  >
                    Save full lab panel
                  </button>
                </div>
              </CollapsibleSection>

              <CollapsibleSection
                title="Lab History"
                open={labHistoryOpen}
                onToggle={() => setLabHistoryOpen((p) => !p)}
                right={`${labEntries.length} entries`}
              >
                {Object.entries(LAB_MARKERS).map(([tier, markers]) => (
                  <div key={tier} style={styles.labTierBlock}>
                    <button
                      type="button"
                      style={styles.tierToggle}
                      onClick={() => toggleLabHistoryTier(tier)}
                    >
                      {labHistoryExpanded[tier] ? "▾" : "▸"}{" "}
                      {tier.charAt(0).toUpperCase() + tier.slice(1)}
                    </button>

                    {labHistoryExpanded[tier] ? (
                      <div style={styles.labTierBody}>
                        {markers.map((markerObj) => {
                          const marker = markerObj.name;
                          const rows = labEntries
                            .filter((x) => x.marker === marker)
                            .sort((a, b) => (a.date < b.date ? 1 : -1));

                          const latest = rows[0];
                          const zone = latest ? labZone(latest) : "neutral";
                          const colors = statusColors(zone);

                          return (
                            <div
                              key={marker}
                              style={{
                                ...styles.listCard,
                                background: colors.bg,
                                border: `1px solid ${colors.glow}`
                              }}
                            >
                              <div style={styles.listTop}>
                                <div>
                                  <div style={styles.listTitle}>{marker}</div>
                                  {latest ? (
                                    <div style={styles.smallText}>
                                      {latest.value} {latest.unit} • {fmtDate(latest.date)}
                                    </div>
                                  ) : (
                                    <div style={styles.smallText}>No entries yet</div>
                                  )}
                                </div>

                                <div style={styles.actionRowSmall}>
                                  {latest ? (
                                    <button
                                      style={styles.secondaryButton}
                                      onClick={() => openAdvice(marker)}
                                    >
                                      Tips
                                    </button>
                                  ) : null}

                                  {latest ? (
                                    <div
                                      style={{
                                        ...styles.progressChip,
                                        color: colors.text,
                                        border: `1px solid ${colors.glow}`
                                      }}
                                    >
                                      {zone === "met"
                                        ? "In range"
                                        : zone === "under"
                                        ? "Low"
                                        : zone === "over"
                                        ? "High"
                                        : "—"}
                                    </div>
                                  ) : null}
                                </div>
                              </div>

                              {rows.length > 0
                                ? rows.slice(0, 3).map((r) => (
                                    <div key={r.id} style={styles.labRow}>
                                      <div style={styles.smallText}>
                                        {fmtDate(r.date)} • {r.value} {r.unit} • range{" "}
                                        {r.low ?? "—"} - {r.high ?? "—"}
                                      </div>

                                      <button
                                        style={styles.deleteButton}
                                        onClick={() =>
                                          deleteRow(
                                            "lab_entries",
                                            r.id,
                                            setLabEntries,
                                            labEntries
                                          )
                                        }
                                      >
                                        Delete
                                      </button>
                                    </div>
                                  ))
                                : null}
                            </div>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                ))}
              </CollapsibleSection>
            </div>
          ) : null}

          <div style={{ height: 120 }} />
        </div>

        <div style={styles.bottomDock}>
          {[
            ["food", "🍽️", "Food"],
            ["weight", "⚖️", "Weight"],
            ["workout", "💪", "Workout"],
            ["protocol", "💉", "Protocol"],
            ["cardio", "🏃", "Cardio"],
            ["photo", "📸", "Photo"]
          ].map(([key, emoji, label]) => (
            <button
              key={key}
              style={activeAction === key ? { ...styles.dockButton, ...styles.dockButtonActive } : styles.dockButton}
              onClick={() => setActiveAction((prev) => (prev === key ? null : key))}
            >
              <div style={styles.dockEmoji}>{emoji}</div>
              <div style={styles.dockLabel}>{label}</div>
            </button>
          ))}
        </div>

        <ActionModal
          open={activeAction === "phase"}
          title={activePhase ? "Phase Mode" : "Start Phase"}
          onClose={() => setActiveAction(null)}
        >
          <div style={styles.formGrid}>
            <div style={styles.row2Equal}>
              <div>
                <label style={styles.label}>Phase type</label>
                <select
                  style={styles.input}
                  value={phaseForm.type}
                  onChange={(e) => handlePhaseTypeChange(e.target.value)}
                >
                  {PHASE_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={styles.label}>Phase name</label>
                <input
                  style={styles.input}
                  value={phaseForm.name}
                  onChange={(e) => setPhaseForm({ ...phaseForm, name: e.target.value })}
                  placeholder="Lean Bulk"
                />
              </div>
            </div>

            <div style={styles.row2Equal}>
              <div>
                <label style={styles.label}>Start date</label>
                <input
                  style={styles.input}
                  type="date"
                  value={phaseForm.startDate}
                  onChange={(e) =>
                    setPhaseForm({ ...phaseForm, startDate: e.target.value })
                  }
                />
              </div>

              <div>
                <label style={styles.label}>End date</label>
                <input
                  style={styles.input}
                  type="date"
                  value={phaseForm.endDate}
                  onChange={(e) =>
                    setPhaseForm({ ...phaseForm, endDate: e.target.value })
                  }
                />
              </div>
            </div>

            <div style={styles.row2Equal}>
              <div>
                <label style={styles.label}>Start weight</label>
                <input
                  style={styles.input}
                  value={phaseForm.startWeight}
                  onChange={(e) =>
                    setPhaseForm({ ...phaseForm, startWeight: e.target.value })
                  }
                  placeholder="185.0"
                />
              </div>

              <div>
                <label style={styles.label}>Target pace (lb/week)</label>
                <input
                  style={styles.input}
                  value={phaseForm.rateTarget}
                  onChange={(e) =>
                    setPhaseForm({ ...phaseForm, rateTarget: e.target.value })
                  }
                  placeholder="0.5"
                />
              </div>
            </div>

            <div style={styles.libraryCard}>
              <div style={styles.listTop}>
                <div>
                  <div style={styles.listTitle}>Autopilot preview</div>
                  <div style={styles.smallText}>
                    Save the phase and the app quietly sets food targets, training rhythm, cardio tone, and coaching style from this setup.
                  </div>
                </div>
                <div style={styles.badge}>{phaseForm.autoPilot === false ? "Manual" : "Auto"}</div>
              </div>

              <div style={{ ...styles.statsGrid, marginTop: 12 }}>
                <div style={styles.statCard}>
                  <div style={styles.glassHighlight} />
                  <div style={styles.statLabel}>Calories</div>
                  <div style={styles.statValue}>{intelligentTargets.calories ?? phaseForm.calorieTarget ?? "—"}</div>
                </div>
                <div style={styles.statCard}>
                  <div style={styles.glassHighlight} />
                  <div style={styles.statLabel}>Protein</div>
                  <div style={styles.statValue}>{intelligentTargets.protein != null ? `${intelligentTargets.protein}g` : phaseForm.proteinTarget ? `${phaseForm.proteinTarget}g` : "—"}</div>
                </div>
                <div style={styles.statCard}>
                  <div style={styles.glassHighlight} />
                  <div style={styles.statLabel}>Pace</div>
                  <div style={styles.statValue}>{intelligentTargets.rateTarget ?? phaseForm.rateTarget ?? "—"}</div>
                </div>
                <div style={styles.statCard}>
                  <div style={styles.glassHighlight} />
                  <div style={styles.statLabel}>Workouts</div>
                  <div style={styles.statValue}>{intelligentTargets.workoutTarget ?? phaseForm.workoutTarget ?? "—"}</div>
                </div>
              </div>

              <div style={{ ...styles.contextSummary, marginTop: 12 }}>
                <div style={styles.smallText}>
                  {phaseForm.type} sets the lens for targets, pace calls, cardio guidance, lab cues, and the tone of every signal.
                </div>
                <div style={styles.smallText}>Cardio lane: {cardioGuidance.frequency} • {cardioGuidance.duration}</div>
                <div style={styles.smallText}>
                  {activePhase
                    ? `Live phase: ${activePhase.name} • ${activePhase.type}`
                    : "No active phase yet."}
                </div>
              </div>

              <div style={{ ...styles.actionRow, marginTop: 12 }}>
                <button
                  style={styles.secondaryButton}
                  type="button"
                  onClick={() => {
                    if (phaseAdvancedOpen) {
                      setPhaseAdvancedOpen(false);
                      setPhaseManualTouched(false);
                      setPhaseForm((prev) => ({ ...prev, autoPilot: true }));
                    } else {
                      setPhaseAdvancedOpen(true);
                      setPhaseForm((prev) => ({ ...prev, autoPilot: false }));
                    }
                  }}
                >
                  {phaseAdvancedOpen ? "Return to autopilot" : "Fine-tune targets"}
                </button>
              </div>
            </div>

            {phaseAdvancedOpen ? (
              <div style={styles.row3}>
                <div>
                  <label style={styles.label}>Calorie target</label>
                  <input
                    style={styles.input}
                    value={phaseForm.calorieTarget}
                    onChange={(e) => {
                      setPhaseManualTouched(true);
                      setPhaseForm({ ...phaseForm, autoPilot: false, calorieTarget: e.target.value });
                    }}
                    placeholder="3200"
                  />
                </div>

                <div>
                  <label style={styles.label}>Protein target</label>
                  <input
                    style={styles.input}
                    value={phaseForm.proteinTarget}
                    onChange={(e) => {
                      setPhaseManualTouched(true);
                      setPhaseForm({ ...phaseForm, autoPilot: false, proteinTarget: e.target.value });
                    }}
                    placeholder="230"
                  />
                </div>

                <div>
                  <label style={styles.label}>Workout target / week</label>
                  <input
                    style={styles.input}
                    value={phaseForm.workoutTarget}
                    onChange={(e) => {
                      setPhaseManualTouched(true);
                      setPhaseForm({ ...phaseForm, autoPilot: false, workoutTarget: e.target.value });
                    }}
                    placeholder="4"
                  />
                </div>
              </div>
            ) : null}

            <div>
              <label style={styles.label}>Notes</label>
              <textarea
                style={styles.textarea}
                value={phaseForm.notes}
                onChange={(e) => setPhaseForm({ ...phaseForm, notes: e.target.value })}
                placeholder="Optional reminders, goals, or protocol context"
              />
            </div>

            <div style={styles.actionRow}>
              <button style={styles.primaryButton} onClick={handleSavePhase}>
                {phaseForm.id ? "Update phase" : "Save phase"}
              </button>
              {activePhase ? (
                <button style={styles.secondaryButton} onClick={handleEndActivePhase}>
                  End active phase
                </button>
              ) : null}
            </div>

            {phases.length ? (
              <div style={styles.phaseHistoryWrap}>
                <div style={styles.label}>Phase history</div>
                <div style={styles.phaseHistoryList}>
                  {phases.slice(0, 6).map((phase) => (
                    <div key={phase.id} style={styles.phaseHistoryCard}>
                      <div>
                        <div style={styles.listTitle}>{phase.name}</div>
                        <div style={styles.smallText}>
                          {phase.type} • {fmtDate(phase.startDate)}
                          {phase.endDate ? ` → ${fmtDate(phase.endDate)}` : " → Active"}
                        </div>
                      </div>
                      <div style={styles.actionRowSmall}>
                        {phase.isActive ? <div style={styles.phaseHistoryActive}>Active</div> : null}
                        <button
                          style={styles.editButton}
                          onClick={() => openPhaseEditor(phase)}
                        >
                          Load
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </ActionModal>

        <ActionModal
          open={activeAction === "profile"}
          title="Profile"
          onClose={() => setActiveAction(null)}
        >
          <div style={styles.formGrid}>
            <div style={styles.contextSummary}>
              <div style={styles.smallText}>
                Save who you are once. From there, the app uses this with your active phase to shape targets, workout/cardio rhythm, lab focus, and coaching tone automatically.
              </div>
            </div>

            <div style={styles.row3}>
              <div>
                <label style={styles.label}>Sex</label>
                <select
                  style={styles.input}
                  value={profile.sex}
                  onChange={(e) => setProfile({ ...profile, sex: e.target.value })}
                >
                  {SEX_OPTIONS.map((opt) => (
                    <option key={opt}>{opt}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={styles.label}>Age</label>
                <input
                  style={styles.input}
                  value={profile.age}
                  onChange={(e) => setProfile({ ...profile, age: e.target.value })}
                  placeholder="30"
                />
              </div>

              <div>
                <label style={styles.label}>Height (inches)</label>
                <input
                  style={styles.input}
                  value={profile.heightInches}
                  onChange={(e) =>
                    setProfile({ ...profile, heightInches: e.target.value })
                  }
                  placeholder="70"
                />
              </div>
            </div>

            <div style={styles.row2Equal}>
              <div>
                <label style={styles.label}>Activity level</label>
                <select
                  style={styles.input}
                  value={profile.activityLevel}
                  onChange={(e) =>
                    setProfile({ ...profile, activityLevel: e.target.value })
                  }
                >
                  {ACTIVITY_LEVELS.map((opt) => (
                    <option key={opt}>{opt}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={styles.label}>Current weight reference</label>
                <input
                  style={styles.input}
                  value={latestMetric?.weight || activePhase?.startWeight || ""}
                  readOnly
                  placeholder="Log weight to unlock"
                />
              </div>
            </div>

            <div style={styles.row2Equal}>
              <label style={styles.profileToggleRow}>
                <input
                  type="checkbox"
                  checked={profile.onTRT}
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      onTRT: e.target.checked,
                      trtType: e.target.checked ? profile.trtType : "",
                      injectionFrequency: e.target.checked ? profile.injectionFrequency : ""
                    })
                  }
                />
                <span>On TRT</span>
              </label>

              <label style={styles.profileToggleRow}>
                <input
                  type="checkbox"
                  checked={profile.usingPeptides}
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      usingPeptides: e.target.checked,
                      peptideCategory: e.target.checked ? profile.peptideCategory : ""
                    })
                  }
                />
                <span>Using peptides</span>
              </label>
            </div>

            {profile.onTRT ? (
              <div style={styles.row2Equal}>
                <div>
                  <label style={styles.label}>TRT type</label>
                  <select
                    style={styles.input}
                    value={profile.trtType}
                    onChange={(e) => setProfile({ ...profile, trtType: e.target.value })}
                  >
                    {TRT_TYPE_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt || "Select"}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={styles.label}>Injection frequency</label>
                  <input
                    style={styles.input}
                    value={profile.injectionFrequency}
                    onChange={(e) =>
                      setProfile({ ...profile, injectionFrequency: e.target.value })
                    }
                    placeholder="2x weekly"
                  />
                </div>
              </div>
            ) : null}

            {profile.usingPeptides ? (
              <div>
                <label style={styles.label}>Primary peptide category</label>
                <select
                  style={styles.input}
                  value={profile.peptideCategory}
                  onChange={(e) =>
                    setProfile({ ...profile, peptideCategory: e.target.value })
                  }
                >
                  {PEPTIDE_CATEGORY_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt || "Select"}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            <div style={styles.libraryCard}>
              <div style={styles.listTop}>
                <div>
                  <div style={styles.listTitle}>What this profile is driving</div>
                  <div style={styles.smallText}>
                    Quiet guidance across the app once a phase is active.
                  </div>
                </div>
                <div style={styles.badge}>
                  {activePhase?.type || (profile.onTRT ? "TRT Cruise" : "Maintenance")}
                </div>
              </div>

              <div style={{ ...styles.statsGrid, marginTop: 12 }}>
                <div style={styles.statCard}>
                  <div style={styles.glassHighlight} />
                  <div style={styles.statLabel}>Fuel</div>
                  <div style={styles.statValue}>{intelligentTargets.calories ?? "—"}</div>
                </div>
                <div style={styles.statCard}>
                  <div style={styles.glassHighlight} />
                  <div style={styles.statLabel}>Protein</div>
                  <div style={styles.statValue}>
                    {intelligentTargets.protein != null
                      ? `${intelligentTargets.protein}g`
                      : "—"}
                  </div>
                </div>
                <div style={styles.statCard}>
                  <div style={styles.glassHighlight} />
                  <div style={styles.statLabel}>Training</div>
                  <div style={styles.statValue}>
                    {intelligentTargets.workoutTarget ?? "—"}
                  </div>
                </div>
                <div style={styles.statCard}>
                  <div style={styles.glassHighlight} />
                  <div style={styles.statLabel}>Cardio</div>
                  <div style={styles.statValueMini}>{cardioGuidance.frequency}</div>
                </div>
              </div>

              <div style={{ ...styles.contextSummary, marginTop: 12 }}>
                <div style={styles.smallText}>Lab focus: {labCoach.focus.join(" • ")}</div>
                <div style={styles.smallText}>{protocolGuidance.focus}</div>
                <div style={styles.smallText}>
                  Save the profile, then let phase selection shape the rest. You can still fine-tune in Phase Setup anytime.
                </div>
              </div>
            </div>
          </div>
        </ActionModal>

        <ActionModal
          open={activeAction === "weight"}          </div>
        </ActionModal>

        <ActionModal
          open={activeAction === "weight"}
          title={editing.table === "body_metrics" ? "Edit Weight Check-in" : "Log Weight"}
          onClose={() => setActiveAction(null)}
        >
          <div style={styles.formGrid}>
            <div style={styles.contextSummary}>
              <div style={styles.smallText}>{weighInGuidance}</div>
              <div style={styles.smallText}>BMI preview: {calculateBMI(bodyForm.weight, profile.heightInches)?.toFixed(1) || "Add weight + height"}</div>
            </div>
            <div>
              <label style={styles.label}>Date</label>
              <input style={styles.input} type="date" value={bodyForm.date} onChange={(e) => setBodyForm({ ...bodyForm, date: e.target.value })} />
            </div>
            <div style={styles.row3}>
              <div>
                <label style={styles.label}>Weight</label>
                <input style={styles.input} value={bodyForm.weight} onChange={(e) => setBodyForm({ ...bodyForm, weight: e.target.value })} />
              </div>
              <div>
                <label style={styles.label}>Body fat %</label>
                <input style={styles.input} value={bodyForm.bodyFatPercent} onChange={(e) => setBodyForm({ ...bodyForm, bodyFatPercent: e.target.value })} />
              </div>
              <div>
                <label style={styles.label}>Skeletal muscle mass</label>
                <input style={styles.input} value={bodyForm.skeletalMuscleMass} onChange={(e) => setBodyForm({ ...bodyForm, skeletalMuscleMass: e.target.value })} />
              </div>
            </div>
            {editing.table === "body_metrics" ? (
              <div style={styles.actionRow}>
                <button style={styles.primaryButton} onClick={() => { updateRow("body_metrics", editing.id, { ...bodyForm }, setBodyMetrics, bodyMetrics); setActiveAction(null); }}>
                  Update weight check-in
                </button>
                <button style={styles.secondaryButton} onClick={cancelEdit}>Cancel</button>
              </div>
            ) : (
              <button style={styles.primaryButton} onClick={() => { saveRow("body_metrics", { id: makeId(), ...bodyForm }, setBodyMetrics, bodyMetrics); setActiveAction(null); }}>
                Save weight check-in
              </button>
            )}
          </div>
        </ActionModal>

        <ActionModal
          open={activeAction === "protocol"}
          title={editing.table === "injections" ? "Edit Protocol Entry" : "Log Protocol"}
          onClose={() => setActiveAction(null)}
        >
          <div style={styles.formGrid}>
            <div style={styles.contextSummary}>
              <div style={styles.smallText}>{protocolGuidance.headline}</div>
              <div style={styles.smallText}>{protocolGuidance.detail}</div>
            </div>

            <div style={styles.libraryCard}>
              <div style={styles.listTop}>
                <div>
                  <div style={styles.listTitle}>Protocol pulse</div>
                  <div style={styles.smallText}>{protocolKnowledge.item} • {activePhase?.type || "No phase"}</div>
                </div>
                <div style={styles.badge}>
                  {schedulePreview[0]?.injectedToday
                    ? "On time"
                    : schedulePreview[0]?.daysAway < 0
                    ? "Overdue"
                    : schedulePreview[0]?.daysAway === 0
                    ? "Due today"
                    : "Watch"}
                </div>
              </div>

              <div style={{ ...styles.contextSummary, marginTop: 12 }}>
                <div style={styles.smallText}>{protocolGuidance.headline}</div>
                <div style={styles.smallText}>{protocolKnowledge.phaseFit}</div>
                <div style={styles.smallText}>{protocolKnowledge.timing}</div>
                {schedulePreview[0] ? (
                  <div style={styles.smallText}>
                    Next checkpoint: {fmtDate(schedulePreview[0].nextDate)} • {schedulePreview[0].time}
                  </div>
                ) : null}
              </div>
            </div>

            <div>
              <label style={styles.label}>Date</label>
              <input style={styles.input} type="date" value={injForm.date} onChange={(e) => setInjForm({ ...injForm, date: e.target.value })} />
            </div>
            <div>
              <label style={styles.label}>Protocol item</label>
              <select style={styles.input} value={injForm.peptide} onChange={(e) => setInjForm({ ...injForm, peptide: e.target.value })}>
                {PEPTIDE_OPTIONS.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </div>
            <div style={styles.row2}>
              <div>
                <label style={styles.label}>Amount</label>
                <input style={styles.input} value={injForm.dosage} onChange={(e) => setInjForm({ ...injForm, dosage: e.target.value })} />
              </div>
              <div>
                <label style={styles.label}>Unit</label>
                <input style={styles.input} value={injForm.unit} onChange={(e) => setInjForm({ ...injForm, unit: e.target.value })} />
              </div>
            </div>
            <div>
              <label style={styles.label}>Notes</label>
              <textarea style={styles.textarea} value={injForm.notes} onChange={(e) => setInjForm({ ...injForm, notes: e.target.value })} />
            </div>
            {editing.table === "injections" ? (
              <div style={styles.actionRow}>
                <button style={styles.primaryButton} onClick={() => { updateRow("injections", editing.id, { ...injForm }, setInjections, injections); setActiveAction(null); }}>
                  Update protocol entry
                </button>
                <button style={styles.secondaryButton} onClick={cancelEdit}>Cancel</button>
              </div>
            ) : (
              <button style={styles.primaryButton} onClick={() => { saveRow("injections", { id: makeId(), ...injForm }, setInjections, injections); setActiveAction(null); }}>
                Save protocol entry
              </button>
            )}
          </div>
        </ActionModal>

        <ActionModal
          open={activeAction === "food"}
          title={editing.table === "calorie_entries" ? "Edit Food" : "Log Food"}
          onClose={() => {
            setActiveAction(null);
            setShowFoodDropdown(false);
          }}
        >
          <div style={styles.formGrid}>
            <div>
              <label style={styles.label}>Date</label>
              <input
                style={styles.input}
                type="date"
                value={foodForm.date}
                onChange={(e) => setFoodForm({ ...foodForm, date: e.target.value })}
              />
            </div>

            <div ref={foodSearchRef}>
              <label style={styles.label}>Food</label>
              <div style={styles.searchInputWrap}>
                <input
                  style={styles.inputWithClear}
                  placeholder="Search food..."
                  value={foodSearch}
                  onFocus={() => setShowFoodDropdown(foodCategory !== "__hide__" && Boolean(foodSearch.trim()))}
                  onChange={(e) => {
                    const value = e.target.value;
                    setFoodSearch(value);
                    setShowFoodDropdown(foodCategory !== "__hide__" && Boolean(value.trim()));

                    const exactMatch = allFoods.find(
                      (f) => f.name.toLowerCase() === value.toLowerCase()
                    );

                    if (exactMatch) {
                      setFoodForm({ ...foodForm, name: exactMatch.name });
                    }
                  }}
                />
                {foodSearch ? (
                  <button
                    type="button"
                    style={styles.searchClearBtn}
                    onClick={() => {
                      setFoodSearch("");
                      setFoodForm({ ...foodForm, name: "" });
                      setShowFoodDropdown(false);
                    }}
                  >
                    ✕
                  </button>
                ) : null}
              </div>

              <div style={{ marginTop: 8 }}>
                <select
                  style={styles.input}
                  value={foodCategory}
                  onChange={(e) => {
                    const nextCategory = e.target.value;
                    setFoodCategory(nextCategory);
                    if (nextCategory === "__hide__") {
                      setShowFoodDropdown(false);
                    } else if (foodSearch.trim()) {
                      setShowFoodDropdown(true);
                    }
                  }}
                >
                  <option value="__hide__">None / Hide list</option>
                  {foodCategories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {recentFoodNames.length > 0 ? (
                <div style={{ marginTop: 10 }}>
                  <div style={styles.label}>Recent Foods</div>
                  <div style={styles.multiWrap}>
                    {recentFoodNames.map((name) => (
                      <button
                        key={name}
                        type="button"
                        style={styles.multiBtn}
                        onClick={() => {
                          setFoodForm({ ...foodForm, name });
                          setFoodSearch(name);
                          setShowFoodDropdown(false);
                        }}
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {showFoodDropdown && foodCategory !== "__hide__" ? (
                <div style={styles.searchDropdown}>
                  <div
                    style={styles.searchItemMuted}
                    onClick={() => setShowFoodDropdown(false)}
                  >
                    None / Hide list
                  </div>
                  {filteredFoods.map((f) => (
                      <div
                        key={f.id || f.name}
                        style={styles.searchItem}
                        onClick={() => {
                          setFoodForm({ ...foodForm, name: f.name });
                          setFoodSearch(f.name);
                          setShowFoodDropdown(false);
                        }}
                      >
                        {f.name} {f.category ? `• ${f.category}` : ""} ({f.calories} cal)
                      </div>
                    ))}
                </div>
              ) : null}
            </div>

            <div>
              <label style={styles.label}>Servings</label>
              <input
                style={styles.input}
                value={foodForm.servings}
                onChange={(e) => setFoodForm({ ...foodForm, servings: e.target.value })}
              />
            </div>

            <CollapsibleSection
              title={editing.table === "custom_foods" ? "Edit Custom Food" : "Custom Food"}
              open={showCustomFood}
              onToggle={() => setShowCustomFood((p) => !p)}
              right="Optional"
            >
              <div style={styles.formGrid}>
                <div>
                  <label style={styles.label}>Name</label>
                  <input
                    style={styles.input}
                    value={customFoodForm.name}
                    onChange={(e) =>
                      setCustomFoodForm({ ...customFoodForm, name: e.target.value })
                    }
                  />
                </div>

                <div>
                  <label style={styles.label}>Calories</label>
                  <input
                    style={styles.input}
                    value={customFoodForm.calories}
                    onChange={(e) =>
                      setCustomFoodForm({
                        ...customFoodForm,
                        calories: e.target.value
                      })
                    }
                  />
                </div>

                <div style={styles.row4}>
                  <div>
                    <label style={styles.label}>Protein</label>
                    <input
                      style={styles.input}
                      value={customFoodForm.protein}
                      onChange={(e) =>
                        setCustomFoodForm({
                          ...customFoodForm,
                          protein: e.target.value
                        })
                      }
                    />
                  </div>
                  <div>
                    <label style={styles.label}>Carbs</label>
                    <input
                      style={styles.input}
                      value={customFoodForm.carbs}
                      onChange={(e) =>
                        setCustomFoodForm({
                          ...customFoodForm,
                          carbs: e.target.value
                        })
                      }
                    />
                  </div>
                  <div>
                    <label style={styles.label}>Fats</label>
                    <input
                      style={styles.input}
                      value={customFoodForm.fats}
                      onChange={(e) =>
                        setCustomFoodForm({
                          ...customFoodForm,
                          fats: e.target.value
                        })
                      }
                    />
                  </div>
                  <div>
                    <label style={styles.label}>Fiber</label>
                    <input
                      style={styles.input}
                      value={customFoodForm.fiber}
                      onChange={(e) =>
                        setCustomFoodForm({
                          ...customFoodForm,
                          fiber: e.target.value
                        })
                      }
                    />
                  </div>
                </div>

                {editing.table === "custom_foods" ? (
                  <div style={styles.actionRow}>
                    <button
                      style={styles.primaryButton}
                      onClick={() =>
                        updateRow(
                          "custom_foods",
                          editing.id,
                          {
                            ...customFoodForm,
                            calories: Number(customFoodForm.calories || 0),
                            protein: Number(customFoodForm.protein || 0),
                            carbs: Number(customFoodForm.carbs || 0),
                            fats: Number(customFoodForm.fats || 0),
                            fiber: Number(customFoodForm.fiber || 0)
                          },
                          setCustomFoods,
                          customFoods
                        )
                      }
                    >
                      Update custom food
                    </button>
                    <button style={styles.secondaryButton} onClick={cancelEdit}>
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    style={styles.primaryButton}
                    onClick={() =>
                      saveRow(
                        "custom_foods",
                        {
                          id: makeId(),
                          ...customFoodForm,
                          calories: Number(customFoodForm.calories || 0),
                          protein: Number(customFoodForm.protein || 0),
                          carbs: Number(customFoodForm.carbs || 0),
                          fats: Number(customFoodForm.fats || 0),
                          fiber: Number(customFoodForm.fiber || 0)
                        },
                        setCustomFoods,
                        customFoods
                      )
                    }
                  >
                    Save custom food
                  </button>
                )}
              </div>
            </CollapsibleSection>

            {editing.table === "calorie_entries" ? (
              <div style={styles.actionRow}>
                <button
                  style={styles.primaryButton}
                  onClick={() => {
                    const food = allFoods.find((f) => f.name === foodForm.name);
                    if (!food) return;
                    pushRecentFood(food.name);
                    const servings = Number(foodForm.servings || 1);

                    updateRow(
                      "calorie_entries",
                      editing.id,
                      {
                        date: foodForm.date,
                        foodName: food.name,
                        servings,
                        totalCalories: Math.round(food.calories * servings),
                        totalProtein: Number((food.protein * servings).toFixed(1)),
                        totalCarbs: Number((food.carbs * servings).toFixed(1)),
                        totalFats: Number((food.fats * servings).toFixed(1)),
                        totalFiber: Number((food.fiber * servings).toFixed(1))
                      },
                      setCalories,
                      calories
                    );
                    setActiveAction(null);
                  }}
                >
                  Update food
                </button>
                <button style={styles.secondaryButton} onClick={cancelEdit}>
                  Cancel
                </button>
              </div>
            ) : (
              <button
                style={styles.primaryButton}
                onClick={() => {
                  const food = allFoods.find((f) => f.name === foodForm.name);
                  if (!food) return;
                  pushRecentFood(food.name);
                  const servings = Number(foodForm.servings || 1);

                  saveRow(
                    "calorie_entries",
                    {
                      id: makeId(),
                      date: foodForm.date,
                      foodName: food.name,
                      servings,
                      totalCalories: Math.round(food.calories * servings),
                      totalProtein: Number((food.protein * servings).toFixed(1)),
                      totalCarbs: Number((food.carbs * servings).toFixed(1)),
                      totalFats: Number((food.fats * servings).toFixed(1)),
                      totalFiber: Number((food.fiber * servings).toFixed(1))
                    },
                    setCalories,
                    calories
                  );
                  setActiveAction(null);
                }}
              >
                Save food
              </button>
            )}
          </div>
        </ActionModal>

        <ActionModal
          open={activeAction === "workout"}
          title={editing.table === "workouts" ? "Edit Workout" : "Log Workout"}
          onClose={() => setActiveAction(null)}
        >
          <div style={styles.formGrid}>
            <div>
              <label style={styles.label}>Date</label>
              <input
                style={styles.input}
                type="date"
                value={workoutForm.date}
                onChange={(e) =>
                  setWorkoutForm({ ...workoutForm, date: e.target.value })
                }
              />
            </div>

            <div>
              <label style={styles.label}>Muscle groups</label>
              <MultiSelect
                options={WORKOUT_OPTIONS}
                selected={workoutForm.groups}
                onToggle={toggleWorkoutGroup}
              />
            </div>

            <div>
              <label style={styles.label}>Notes</label>
              <textarea
                style={{ ...styles.textarea, minHeight: 260 }}
                value={workoutForm.notes}
                onChange={(e) =>
                  setWorkoutForm({ ...workoutForm, notes: e.target.value })
                }
              />
            </div>

            {workoutForm.groups.length > 0 ? (
              <div style={styles.workoutLibraryGrid}>
                {workoutForm.groups.map((group) => {
                  const variants = getWorkoutVariants(group);
                  const index = workoutTemplateSelection[group] || 0;
                  const current = variants[index] || variants[0];
                  return (
                    <div key={group} style={styles.libraryCard}>
                      <div style={styles.listTop}>
                        <div>
                          <div style={styles.listTitle}>{group}</div>
                          <div style={styles.smallText}>{current?.name || "Default template"}</div>
                        </div>
                        <div style={styles.progressChip}>{index + 1}/{variants.length}</div>
                      </div>
                      <div style={styles.smallText}>{current?.focus || "Balanced hypertrophy work."}</div>
                      <div style={styles.actionRow}>
                        <button type="button" style={styles.secondaryButton} onClick={() => cycleWorkoutTemplate(group, -1)}>Previous</button>
                        <button type="button" style={styles.secondaryButton} onClick={() => cycleWorkoutTemplate(group, 1)}>Next</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : null}

            <button type="button" style={styles.secondaryButton} onClick={insertWorkoutLibrary}>
              Insert selected workout library
            </button>

            {editing.table === "workouts" ? (
              <div style={styles.actionRow}>
                <button
                  style={styles.primaryButton}
                  onClick={() => {
                    updateRow(
                      "workouts",
                      editing.id,
                      {
                        date: workoutForm.date,
                        groups: workoutForm.groups,
                        notes: workoutForm.notes
                      },
                      setWorkouts,
                      workouts
                    );
                    setActiveAction(null);
                  }}
                >
                  Update workout
                </button>
                <button style={styles.secondaryButton} onClick={cancelEdit}>
                  Cancel
                </button>
              </div>
            ) : (
              <button
                style={styles.primaryButton}
                onClick={() => {
                  saveRow(
                    "workouts",
                    {
                      id: makeId(),
                      date: workoutForm.date,
                      groups: workoutForm.groups,
                      notes: workoutForm.notes
                    },
                    setWorkouts,
                    workouts
                  );
                  setActiveAction(null);
                }}
              >
                Save workout
              </button>
            )}
          </div>
        </ActionModal>

        <ActionModal
          open={activeAction === "cardio"}
          title={editing.table === "cardio_entries" ? "Edit Cardio" : "Log Cardio"}
          onClose={() => setActiveAction(null)}
        >
          <div style={styles.formGrid}>
            <div>
              <label style={styles.label}>Date</label>
              <input
                style={styles.input}
                type="date"
                value={cardioForm.date}
                onChange={(e) => setCardioForm({ ...cardioForm, date: e.target.value })}
              />
            </div>

            <div>
              <label style={styles.label}>Type</label>
              <select
                style={styles.input}
                value={cardioForm.type}
                onChange={(e) => setCardioForm({ ...cardioForm, type: e.target.value })}
              >
                {CARDIO_OPTIONS.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={styles.label}>Minutes</label>
              <input
                style={styles.input}
                value={cardioForm.minutes}
                onChange={(e) =>
                  setCardioForm({ ...cardioForm, minutes: e.target.value })
                }
              />
            </div>

            <div>
              <label style={styles.label}>Notes</label>
              <textarea
                style={styles.textarea}
                value={cardioForm.notes}
                onChange={(e) => setCardioForm({ ...cardioForm, notes: e.target.value })}
              />
            </div>

            {editing.table === "cardio_entries" ? (
              <div style={styles.actionRow}>
                <button
                  style={styles.primaryButton}
                  onClick={() => {
                    updateRow(
                      "cardio_entries",
                      editing.id,
                      { ...cardioForm },
                      setCardio,
                      cardio
                    );
                    setActiveAction(null);
                  }}
                >
                  Update cardio
                </button>
                <button style={styles.secondaryButton} onClick={cancelEdit}>
                  Cancel
                </button>
              </div>
            ) : (
              <button
                style={styles.primaryButton}
                onClick={() => {
                  saveRow(
                    "cardio_entries",
                    { id: makeId(), ...cardioForm },
                    setCardio,
                    cardio
                  );
                  setActiveAction(null);
                }}
              >
                Save cardio
              </button>
            )}
          </div>
        </ActionModal>

        <ActionModal
          open={activeAction === "photo"}
          title="Upload Photo"
          onClose={() => setActiveAction(null)}
        >
          <div style={styles.formGrid}>
            <div>
              <label style={styles.label}>Date</label>
              <input
                style={styles.input}
                type="date"
                value={photoForm.date}
                onChange={(e) => setPhotoForm({ ...photoForm, date: e.target.value })}
              />
            </div>

            <div>
              <label style={styles.label}>Pose</label>
              <select
                style={styles.input}
                value={photoForm.pose}
                onChange={(e) => setPhotoForm({ ...photoForm, pose: e.target.value })}
              >
                {PHOTO_POSES.map((pose) => (
                  <option key={pose}>{pose}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={styles.label}>Photo</label>
              <input
                style={styles.input}
                type="file"
                accept="image/*"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const previewUrl = URL.createObjectURL(file);
                  setPhotoForm((prev) => ({
                    ...prev,
                    previewUrl,
                    uploading: true
                  }));
                  const imageUrl = await uploadCompressedImage(file);
                  setPhotoForm((prev) => ({
                    ...prev,
                    imageUrl: imageUrl || "",
                    uploading: false
                  }));
                }}
              />
            </div>

            <div>
              <label style={styles.label}>Notes</label>
              <textarea
                style={styles.textarea}
                value={photoForm.notes}
                onChange={(e) => setPhotoForm({ ...photoForm, notes: e.target.value })}
              />
            </div>

            {photoForm.previewUrl ? (
              <img src={photoForm.previewUrl} alt="preview" style={styles.photoPreview} />
            ) : null}

            <button
              style={styles.primaryButton}
              disabled={!photoForm.imageUrl || photoForm.uploading}
              onClick={() => {
                saveRow(
                  "progress_photos",
                  {
                    id: makeId(),
                    date: photoForm.date,
                    pose: photoForm.pose,
                    imageUrl: photoForm.imageUrl,
                    notes: photoForm.notes
                  },
                  setProgressPhotos,
                  progressPhotos
                );
                setPhotoForm({
                  date: todayInput(),
                  pose: PHOTO_POSES[0],
                  notes: "",
                  imageUrl: "",
                  previewUrl: "",
                  uploading: false
                });
                setActiveAction(null);
              }}
            >
              {photoForm.uploading ? "Uploading..." : "Save photo"}
            </button>
          </div>
        </ActionModal>

        {status ? <div style={styles.statusBar}>{status}</div> : null}
        <AdviceModal advice={activeLabAdvice} onClose={() => setActiveLabAdvice(null)} />
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100dvh",
    background: "linear-gradient(180deg,#080808 0%, #111111 50%, #171717 100%)",
    color: "#f5f5f5",
    fontFamily: "Arial, sans-serif",
    padding: "calc(env(safe-area-inset-top, 0px) + 18px) 14px 14px",
    margin: 0,
    overscrollBehavior: "none"
  },
  container: {
    maxWidth: 860,
    margin: "0 auto",
    display: "grid",
    gap: 14,
    paddingBottom: 24
  },
  authWrap: {
    maxWidth: 460,
    margin: "0 auto",
    display: "grid",
    gap: 16,
    paddingTop: 30
  },
  brandHero: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginBottom: 6
  },
  brandHeroCompact: {
    display: "flex",
    alignItems: "center",
    gap: 12
  },
  logoElite: {
    width: 220,
    height: 220,
    objectFit: "contain",
    filter:
      "drop-shadow(0 0 10px rgba(245,158,11,0.45)) drop-shadow(0 0 18px rgba(220,38,38,0.28))",
    borderRadius: 16
  },
  logoCompact: {
    width: 56,
    height: 56,
    objectFit: "contain",
    borderRadius: 12,
    filter: "drop-shadow(0 0 8px rgba(245,158,11,0.25))"
  },
  brandText: {
    fontSize: 30,
    fontWeight: 900,
    letterSpacing: 2.5,
    textAlign: "center",
    background: "linear-gradient(90deg,#dc2626,#f59e0b)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    textShadow: "0 6px 24px rgba(0,0,0,0.45)"
  },
  brandTextSmall: {
    fontSize: 20,
    fontWeight: 900,
    letterSpacing: 1.4,
    background: "linear-gradient(90deg,#dc2626,#f59e0b)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent"
  },
  brandTagline: {
    fontSize: 12,
    letterSpacing: 2.2,
    textTransform: "uppercase",
    marginTop: 4,
    textAlign: "center",
    background:
      "linear-gradient(90deg, rgba(220,38,38,0.7), rgba(245,158,11,0.7))",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    opacity: 0.85
  },
  brandTaglineSmall: {
    fontSize: 11,
    letterSpacing: 1.6,
    textTransform: "uppercase",
    color: "#bdbdbd"
  },
  authCard: {
    background: "#171717",
    border: "1px solid #303030",
    borderRadius: 22,
    padding: 20,
    display: "grid",
    gap: 12
  },
  topBar: {
    display: "grid",
    gap: 12,
    background: "rgba(20,20,20,0.92)",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: 24,
    padding: 18,
    paddingTop: 24,
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)"
  },
  headerActions: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between"
  },
  headerActionButtons: {
    display: "flex",
    gap: 8,
    alignItems: "center"
  },
  filterLabel: {
    color: "#bdbdbd",
    fontSize: 12,
    fontWeight: 700
  },
  swipeShell: {
    display: "grid",
    gap: 14
  },
  screenPillRow: {
    display: "grid",
    gridTemplateColumns: "repeat(5, minmax(0,1fr))",
    gap: 8
  },
  screenPill: {
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(255,255,255,0.03)",
    color: "#e5e5e5",
    borderRadius: 16,
    padding: "10px 8px",
    fontWeight: 700,
    cursor: "pointer",
    fontSize: 12
  },
  screenPillActive: {
    background: "linear-gradient(90deg,#dc2626,#f59e0b)",
    color: "#fff",
    borderColor: "transparent"
  },
  screenHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: 10
  },
  screenLabel: {
    color: "#9ca3af",
    fontSize: 12,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: 1.2
  },
  screenTitle: {
    fontSize: 26,
    fontWeight: 900,
    color: "#fafafa"
  },
  quickActions: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0,1fr))",
    gap: 10
  },
  quickActionBtn: {
    border: "1px solid rgba(255,255,255,0.07)",
    background:
      "linear-gradient(180deg, rgba(28,28,28,0.96), rgba(16,16,16,0.98))",
    color: "#fafafa",
    borderRadius: 18,
    padding: "14px 12px",
    fontWeight: 800,
    cursor: "pointer",
    boxShadow: "0 10px 20px rgba(0,0,0,0.22)",
    backdropFilter: "blur(10px)",
    WebkitBackdropFilter: "blur(10px)"
  },
  sectionHeaderRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    marginBottom: 12
  },
  card: {
    background:
      "radial-gradient(circle at top right, rgba(245,158,11,0.16), transparent 34%), linear-gradient(180deg, rgba(24,24,24,0.9), rgba(10,10,10,0.97))",
    border: "1px solid rgba(255,255,255,0.07)",
    borderRadius: 24,
    padding: 16,
    boxShadow: "0 18px 40px rgba(0,0,0,0.34)",
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)"
  },
  cardTitle: {
    margin: "0 0 14px",
    fontSize: 22,
    color: "#f59e0b"
  },
  formGrid: {
    display: "grid",
    gap: 12
  },
  label: {
    display: "block",
    marginBottom: 6,
    fontSize: 13,
    color: "#f5f5f5",
    fontWeight: 700
  },
  input: {
    width: "100%",
    boxSizing: "border-box",
    background: "#222222",
    color: "#fafafa",
    border: "1px solid #3f3f46",
    borderRadius: 14,
    padding: 12,
    fontSize: 16
  },
  inputCompact: {
    background: "#222222",
    color: "#fafafa",
    border: "1px solid #3f3f46",
    borderRadius: 12,
    padding: "10px 12px",
    fontSize: 14
  },
  textarea: {
    width: "100%",
    boxSizing: "border-box",
    minHeight: 90,
    background: "#222222",
    color: "#fafafa",
    border: "1px solid #3f3f46",
    borderRadius: 14,
    padding: 12,
    fontSize: 16
  },
  row2: {
    display: "grid",
    gridTemplateColumns: "1fr 110px",
    gap: 10
  },
  row2Equal: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 10
  },
  row3: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 10
  },
  row4: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: 10
  },
  primaryButton: {
    border: "none",
    background: "linear-gradient(90deg,#dc2626,#f59e0b)",
    color: "#fff",
    borderRadius: 16,
    padding: "12px 16px",
    fontWeight: 800,
    cursor: "pointer",
    boxShadow: "0 10px 20px rgba(124,45,18,0.28)"
  },
  secondaryButton: {
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(38,38,38,0.7)",
    backdropFilter: "blur(10px)",
    color: "#fafafa",
    borderRadius: 16,
    padding: "10px 14px",
    fontWeight: 700,
    cursor: "pointer",
    boxShadow: "0 8px 18px rgba(0,0,0,0.18)"
  },
  editButton: {
    border: "1px solid #f59e0b",
    background: "#3b2a10",
    color: "#fde68a",
    borderRadius: 12,
    padding: "8px 10px",
    cursor: "pointer"
  },
  deleteButton: {
    border: "1px solid #4b5563",
    background: "#111111",
    color: "#fafafa",
    borderRadius: 12,
    padding: "8px 10px",
    cursor: "pointer"
  },
  actionRow: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap"
  },
  actionRowSmall: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap"
  },
  stackLayout: {
    display: "grid",
    gap: 14
  },
  listCard: {
    background: "linear-gradient(180deg, rgba(31,31,31,0.96), rgba(20,20,20,0.96))",
    border: "1px solid rgba(255,255,255,0.07)",
    borderRadius: 16,
    padding: 12,
    marginTop: 10,
    boxShadow: "0 10px 20px rgba(0,0,0,0.18)"
  },
  listTop: {
    display: "flex",
    justifyContent: "space-between",
    gap: 10,
    alignItems: "flex-start"
  },
  listTitle: {
    fontWeight: 800,
    fontSize: 17
  },
  badge: {
    display: "inline-block",
    background: "#7c2d12",
    color: "#ffedd5",
    borderRadius: 999,
    padding: "4px 9px",
    fontSize: 11,
    fontWeight: 800,
    marginBottom: 8
  },
  note: {
    marginTop: 8,
    color: "#d4d4d8",
    lineHeight: 1.5
  },
  emptyBox: {
    border: "1px dashed #444",
    borderRadius: 16,
    padding: 18,
    color: "#a3a3a3",
    textAlign: "center"
  },
  smallText: {
    color: "#bdbdbd",
    fontSize: 13,
    lineHeight: 1.45
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0,1fr))",
    gap: 10
  },
  statCard: {
    borderRadius: 24,
    padding: 16,
    position: "relative",
    overflow: "hidden",
    background:
      "linear-gradient(145deg, rgba(255,255,255,0.045), rgba(255,255,255,0.018))",
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
    border: "1px solid rgba(255,255,255,0.06)",
    boxShadow:
      "inset 0 1px 1px rgba(255,255,255,0.05), inset 0 -2px 6px rgba(0,0,0,0.55), 0 10px 30px rgba(0,0,0,0.35)"
  },
  glassHighlight: {
    position: "absolute",
    top: 0,
    left: "-40%",
    width: "60%",
    height: "100%",
    background: "linear-gradient(120deg, rgba(255,255,255,0.08), transparent)",
    transform: "skewX(-20deg)",
    pointerEvents: "none"
  },
  statLabel: {
    color: "#b38a39",
    fontSize: 12,
    marginBottom: 8
  },
  statValue: {
    fontSize: 20,
    fontWeight: 800,
    color: "#fafafa"
  },
  statValueMini: {
    fontSize: 16,
    fontWeight: 800,
    color: "#fafafa",
    lineHeight: 1.25
  },
  progressBubble: {
    borderRadius: 24,
    padding: 16,
    position: "relative",
    overflow: "hidden"
  },
  dashboardBubbles: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0,1fr))",
    gap: 14
  },
  bubbleWide: {
    gridColumn: "span 2"
  },
  progressTopRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 6
  },
  progressTitle: {
    fontSize: 12,
    color: "#d1d5db",
    marginBottom: 6,
    fontWeight: 700
  },
  progressValue: {
    fontSize: 18,
    fontWeight: 900,
    marginBottom: 8
  },
  progressChip: {
    fontSize: 11,
    fontWeight: 800,
    padding: "5px 8px",
    borderRadius: 999,
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.07)"
  },
  progressBarElite: {
    width: "100%",
    height: 12,
    background: "rgba(255,255,255,0.06)",
    borderRadius: 999,
    overflow: "hidden",
    boxShadow: "inset 0 1px 3px rgba(0,0,0,0.35)"
  },
  progressFillElite: {
    height: "100%",
    borderRadius: 999,
    transition: "width 0.7s cubic-bezier(.22,1,.36,1)"
  },
  progressSub: {
    marginTop: 8,
    fontSize: 12,
    color: "#e5e7eb"
  },
  completionList: {
    display: "grid",
    gap: 10
  },
  completionMiniGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0,1fr))",
    gap: 8
  },
  completionCelebrateCard: {
    border: "1px solid rgba(34,197,94,0.28)",
    background: "linear-gradient(180deg, rgba(14,30,18,0.94), rgba(12,18,14,0.98))",
    boxShadow: "0 0 0 1px rgba(34,197,94,0.10), 0 14px 34px rgba(10,60,28,0.34)"
  },
  completionBadgeElite: {
    background: "linear-gradient(90deg, rgba(22,163,74,0.22), rgba(245,158,11,0.18))",
    color: "#dcfce7",
    border: "1px solid rgba(34,197,94,0.28)",
    borderRadius: 999,
    padding: "6px 10px",
    fontSize: 12,
    fontWeight: 900
  },
  completionBadgeMuted: {
    background: "rgba(255,255,255,0.06)",
    color: "#e5e7eb",
    border: "1px solid rgba(255,255,255,0.10)",
    borderRadius: 999,
    padding: "6px 10px",
    fontSize: 12,
    fontWeight: 800
  },
  completionFooterText: {
    marginTop: 10,
    color: "#d1d5db",
    fontSize: 12,
    fontWeight: 700
  },
  completionRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "8px 10px",
    borderRadius: 14,
    background: "#1b1b1b",
    border: "1px solid #2f2f35",
    minHeight: 54
  },
  completionRowDone: {
    border: "1px solid rgba(34,197,94,0.20)",
    background: "linear-gradient(180deg, rgba(20,40,24,0.86), rgba(24,24,24,0.94))"
  },
  completionIconDone: {
    width: 28,
    height: 28,
    borderRadius: 999,
    display: "grid",
    placeItems: "center",
    background: "linear-gradient(180deg, rgba(34,197,94,0.22), rgba(245,158,11,0.16))",
    color: "#dcfce7",
    fontWeight: 900,
    fontSize: 14
  },
  completionIconTodo: {
    width: 28,
    height: 28,
    borderRadius: 999,
    display: "grid",
    placeItems: "center",
    background: "rgba(255,255,255,0.07)",
    color: "#d4d4d8",
    fontWeight: 900,
    fontSize: 14
  },
  completionTitle: {
    fontWeight: 800,
    color: "#fafafa",
    fontSize: 13
  },
  completionDetail: {
    color: "#bdbdbd",
    fontSize: 11,
    lineHeight: 1.35,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis"
  },
  toggleRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 10
  },
  toggleButton: {
    border: "1px solid #3f3f46",
    background: "#1a1a1a",
    color: "#fafafa",
    borderRadius: 14,
    padding: "12px 14px",
    fontWeight: 800,
    cursor: "pointer"
  },
  toggleButtonActive: {
    background: "linear-gradient(90deg,#991b1b,#b45309)",
    borderColor: "transparent"
  },
  contextSummary: {
    display: "grid",
    gap: 6,
    padding: 12,
    borderRadius: 16,
    background: "#1a1a1a",
    border: "1px solid #2f2f35"
  },
  readOnlyBox: {
    minHeight: 48,
    display: "flex",
    alignItems: "center",
    padding: "0 12px",
    background: "#181818",
    border: "1px solid #3f3f46",
    borderRadius: 14,
    color: "#d4d4d8",
    fontWeight: 700
  },
  collapseHeader: {
    width: "100%",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    background: "transparent",
    border: "none",
    color: "#fafafa",
    fontWeight: 800,
    fontSize: 16,
    cursor: "pointer",
    padding: 0
  },
  scheduleBubbleStack: {
    display: "grid",
    gap: 10
  },
  scheduleHeroCard: {
    background: "linear-gradient(180deg, rgba(36,12,12,0.95), rgba(16,16,16,0.96))",
    border: "1px solid rgba(239,68,68,0.14)",
    borderRadius: 20,
    padding: 14,
    display: "grid",
    gap: 10,
    boxShadow: "0 10px 24px rgba(80,0,0,0.14)"
  },
  scheduleDateRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10
  },
  scheduleDatePrimary: {
    fontSize: 18,
    fontWeight: 900,
    color: "#fff5f5"
  },
  scheduleBadgeUpcoming: {
    fontSize: 11,
    fontWeight: 800,
    padding: "6px 10px",
    borderRadius: 999,
    background: "rgba(255,255,255,0.08)",
    color: "#f5f5f5",
    border: "1px solid rgba(255,255,255,0.08)"
  },
  scheduleBadgeToday: {
    fontSize: 11,
    fontWeight: 800,
    padding: "6px 10px",
    borderRadius: 999,
    background: "rgba(245,158,11,0.16)",
    color: "#fde68a",
    border: "1px solid rgba(245,158,11,0.24)"
  },
  scheduleBadgeOverdue: {
    fontSize: 11,
    fontWeight: 800,
    padding: "6px 10px",
    borderRadius: 999,
    background: "rgba(239,68,68,0.16)",
    color: "#fecaca",
    border: "1px solid rgba(239,68,68,0.24)"
  },
  scheduleBadgeDone: {
    fontSize: 11,
    fontWeight: 800,
    padding: "6px 10px",
    borderRadius: 999,
    background: "rgba(34,197,94,0.16)",
    color: "#bbf7d0",
    border: "1px solid rgba(34,197,94,0.24)"
  },
  inlineProgress: {
    width: "100%",
    height: 8,
    background: "rgba(255,255,255,0.08)",
    borderRadius: 999,
    overflow: "hidden",
    marginTop: 8
  },
  inlineProgressFill: {
    height: "100%",
    background: "#ef4444",
    borderRadius: 999
  },
  priorityGrid: {
    display: "grid",
    gap: 10
  },
  workoutLibraryGrid: {
    display: "grid",
    gap: 10
  },
  libraryCard: {
    background: "linear-gradient(180deg, rgba(34,26,18,0.96), rgba(20,20,20,0.98))",
    border: "1px solid rgba(245,158,11,0.18)",
    borderRadius: 18,
    padding: 12,
    display: "grid",
    gap: 8,
    boxShadow: "0 10px 20px rgba(0,0,0,0.16)"
  },
  labTierBlock: {
    display: "grid",
    gap: 10
  },
  tierToggle: {
    width: "100%",
    textAlign: "left",
    border: "1px solid #34343a",
    background: "#171717",
    color: "#fafafa",
    borderRadius: 14,
    padding: "12px 14px",
    fontWeight: 800,
    cursor: "pointer"
  },
  labTierBody: {
    display: "grid",
    gap: 10
  },
  batchLabCard: {
    background: "#1f1f1f",
    border: "1px solid #323238",
    borderRadius: 16,
    padding: 12,
    display: "grid",
    gap: 10
  },
  labRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    marginTop: 8
  },
  modalOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.62)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    zIndex: 100
  },
  modalCard: {
    width: "100%",
    maxWidth: 560,
    maxHeight: "85dvh",
    overflowY: "auto",
    background: "#171717",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 24,
    padding: 18,
    boxShadow: "0 20px 40px rgba(0,0,0,0.45)"
  },
  sheetCard: {
    width: "100%",
    maxWidth: 760,
    maxHeight: "85dvh",
    overflowY: "auto",
    background: "#171717",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 24,
    padding: 18,
    boxShadow: "0 20px 40px rgba(0,0,0,0.45)"
  },
  adviceSection: {
    display: "grid",
    gap: 8,
    marginTop: 14
  },
  adviceHeader: {
    fontWeight: 900,
    color: "#f3f4f6"
  },
  tipBubble: {
    background: "#202020",
    border: "1px solid #3f3f46",
    borderRadius: 16,
    padding: 12,
    color: "#e5e7eb",
    lineHeight: 1.45
  },
  segment: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 8
  },
  segmentBtn: {
    border: "1px solid #4b5563",
    background: "#111111",
    color: "#f5f5f5",
    borderRadius: 12,
    padding: 10,
    fontWeight: 800,
    cursor: "pointer"
  },
  segmentBtnActive: {
    background: "#b91c1c",
    borderColor: "#dc2626"
  },
  multiWrap: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8
  },
  multiBtn: {
    border: "1px solid #525252",
    background: "#262626",
    color: "#f3f4f6",
    borderRadius: 999,
    padding: "8px 12px",
    cursor: "pointer",
    fontWeight: 700
  },
  multiBtnActive: {
    background: "#991b1b",
    borderColor: "#f59e0b",
    color: "#fff7ed"
  },
  searchInputWrap: {
    position: "relative"
  },
  inputWithClear: {
    width: "100%",
    boxSizing: "border-box",
    background: "#222222",
    color: "#fafafa",
    border: "1px solid #3f3f46",
    borderRadius: 14,
    padding: "12px 42px 12px 12px",
    fontSize: 16
  },
  searchClearBtn: {
    position: "absolute",
    right: 8,
    top: "50%",
    transform: "translateY(-50%)",
    width: 28,
    height: 28,
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(255,255,255,0.06)",
    color: "#fafafa",
    cursor: "pointer",
    fontSize: 18,
    lineHeight: 1
  },
  searchItemMuted: {
    padding: 10,
    borderBottom: "1px solid #2e2e2e",
    cursor: "pointer",
    fontSize: 14,
    color: "#fbbf24",
    fontWeight: 700
  },
  searchDropdown: {
    maxHeight: 240,
    overflowY: "auto",
    border: "1px solid #404040",
    borderRadius: 12,
    background: "#181818",
    marginTop: 8
  },
  searchItem: {
    padding: 10,
    borderBottom: "1px solid #2e2e2e",
    cursor: "pointer",
    fontSize: 14
  },
  photoPreview: {
    width: "100%",
    maxHeight: 320,
    objectFit: "cover",
    borderRadius: 16,
    border: "1px solid #3f3f46"
  },
  photoCompareGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0,1fr))",
    gap: 12
  },
  photoCompareColumn: {
    display: "grid",
    gap: 10,
    alignContent: "start"
  },
  photoCompareHeader: {
    fontSize: 13,
    fontWeight: 800,
    color: "#f3f4f6"
  },
  photoCard: {
    background: "#1d1d1d",
    border: "1px solid #323238",
    borderRadius: 16,
    padding: 10,
    display: "grid",
    gap: 8
  },
  photoGridImage: {
    width: "100%",
    aspectRatio: "3 / 4",
    objectFit: "cover",
    borderRadius: 12,
    border: "1px solid #3f3f46"
  },
  bottomDock: {
    position: "sticky",
    bottom: 0,
    display: "grid",
    gridTemplateColumns: "repeat(6, minmax(0,1fr))",
    gap: 8,
    padding: 10,
    background: "rgba(12,12,12,0.92)",
    borderTop: "1px solid rgba(255,255,255,0.06)",
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    zIndex: 20
  },
  dockButton: {
    border: "1px solid rgba(255,255,255,0.06)",
    background: "rgba(255,255,255,0.03)",
    color: "#fafafa",
    borderRadius: 18,
    padding: "9px 6px",
    cursor: "pointer",
    display: "grid",
    gap: 4,
    justifyItems: "center"
  },
  dockButtonActive: {
    background: "linear-gradient(90deg,#991b1b,#b45309)",
    borderColor: "transparent"
  },
  dockEmoji: {
    fontSize: 20
  },
  dockLabel: {
    fontSize: 11,
    fontWeight: 800
  },
  knowledgeGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 12,
    marginTop: 12
  },
  knowledgePanel: {
    display: "grid",
    gap: 8,
    alignContent: "start"
  },
  profileToggleRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 14,
    padding: "14px 16px",
    color: "#f5f5f5",
    fontWeight: 700
  },
  phaseHeroCard: {
    background:
      "radial-gradient(circle at top right, rgba(245,158,11,0.22), transparent 36%), linear-gradient(180deg, rgba(26,20,12,0.96), rgba(12,12,12,0.98))"
  },
  phaseHeroTop: {
    display: "flex",
    justifyContent: "space-between",
    gap: 14,
    alignItems: "flex-start",
    flexWrap: "wrap"
  },
  phaseTitleBlock: {
    display: "grid",
    gap: 8
  },
  phaseEyebrow: {
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    color: "#fbbf24",
    fontWeight: 800
  },
  phaseTitleRow: {
    display: "flex",
    gap: 12,
    alignItems: "center"
  },
  phaseEmoji: {
    width: 48,
    height: 48,
    display: "grid",
    placeItems: "center",
    borderRadius: 16,
    background: "rgba(245,158,11,0.12)",
    border: "1px solid rgba(245,158,11,0.25)",
    fontSize: 24
  },
  phaseHeroTitle: {
    fontSize: 28,
    fontWeight: 900,
    lineHeight: 1.05,
    color: "#fafafa"
  },
  phasePillRow: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    marginTop: 14
  },
  phaseInfoPill: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "10px 12px",
    borderRadius: 999,
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.08)",
    fontSize: 13,
    fontWeight: 700,
    color: "#f5f5f5"
  },
  phaseInfoPillPositive: {
    background: "rgba(16,185,129,0.12)",
    borderColor: "rgba(16,185,129,0.24)",
    color: "#d1fae5"
  },
  phaseInfoPillWarning: {
    background: "rgba(245,158,11,0.12)",
    borderColor: "rgba(245,158,11,0.24)",
    color: "#fde68a"
  },
  phaseStatsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
    gap: 10,
    marginTop: 14
  },
  phaseStatCard: {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: 18,
    padding: 14,
    display: "grid",
    gap: 6
  },
  phaseStatLabel: {
    fontSize: 12,
    color: "#bdbdbd",
    textTransform: "uppercase",
    letterSpacing: 0.9,
    fontWeight: 800
  },
  phaseStatValue: {
    fontSize: 22,
    fontWeight: 900,
    color: "#fafafa"
  },
  signalCountPill: {
    padding: "8px 12px",
    borderRadius: 999,
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.08)",
    fontSize: 12,
    fontWeight: 800,
    color: "#f5f5f5"
  },
  signalStack: {
    display: "grid",
    gap: 10
  },
  signalCard: {
    display: "grid",
    gridTemplateColumns: "40px 1fr",
    gap: 12,
    alignItems: "flex-start",
    borderRadius: 18,
    padding: 12,
    border: "1px solid rgba(255,255,255,0.07)"
  },
  signalWarning: {
    background: "rgba(245,158,11,0.1)",
    borderColor: "rgba(245,158,11,0.2)"
  },
  signalPositive: {
    background: "rgba(16,185,129,0.1)",
    borderColor: "rgba(16,185,129,0.2)"
  },
  signalGuide: {
    background: "rgba(96,165,250,0.1)",
    borderColor: "rgba(96,165,250,0.2)"
  },
  signalIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    display: "grid",
    placeItems: "center",
    background: "rgba(0,0,0,0.18)",
    fontSize: 18,
    fontWeight: 900
  },
  signalCopy: {
    display: "grid",
    gap: 4
  },
  signalTitle: {
    fontSize: 15,
    fontWeight: 800,
    color: "#fafafa"
  },
  signalHint: {
    fontSize: 13,
    lineHeight: 1.45,
    color: "#d4d4d8"
  },
  consistencyGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
    gap: 10
  },
  streakCard: {
    borderRadius: 18,
    padding: 14,
    display: "grid",
    gap: 8,
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(255,255,255,0.04)"
  },
  streakHealthy: {
    background: "rgba(16,185,129,0.08)",
    borderColor: "rgba(16,185,129,0.2)"
  },
  streakAtRisk: {
    background: "rgba(245,158,11,0.1)",
    borderColor: "rgba(245,158,11,0.24)"
  },
  streakBroken: {
    background: "rgba(239,68,68,0.09)",
    borderColor: "rgba(239,68,68,0.2)"
  },
  streakNeutral: {
    background: "rgba(255,255,255,0.04)",
    borderColor: "rgba(255,255,255,0.08)"
  },
  streakHeaderRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: 10,
    alignItems: "center"
  },
  streakLabel: {
    fontSize: 13,
    fontWeight: 800,
    color: "#fafafa"
  },
  streakStateText: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    color: "#d4d4d8",
    fontWeight: 800
  },
  streakValue: {
    fontSize: 24,
    fontWeight: 900,
    color: "#fafafa"
  },
  streakHint: {
    fontSize: 13,
    lineHeight: 1.45,
    color: "#d4d4d8"
  },
  proofGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
    gap: 10
  },
  proofCard: {
    borderRadius: 20,
    padding: 16,
    background:
      "linear-gradient(180deg, rgba(245,158,11,0.08), rgba(255,255,255,0.02))",
    border: "1px solid rgba(255,255,255,0.08)",
    display: "grid",
    gap: 8
  },
  proofHeading: {
    fontSize: 18,
    fontWeight: 900,
    lineHeight: 1.25,
    color: "#fafafa"
  },
  proofDetail: {
    fontSize: 13,
    color: "#d4d4d8"
  },
  recapBadge: {
    padding: "8px 12px",
    borderRadius: 999,
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.08)",
    fontSize: 12,
    fontWeight: 800,
    color: "#f5f5f5"
  },
  recapBadgePositive: {
    background: "rgba(16,185,129,0.1)",
    borderColor: "rgba(16,185,129,0.24)",
    color: "#d1fae5"
  },
  recapBadgeWarning: {
    background: "rgba(245,158,11,0.1)",
    borderColor: "rgba(245,158,11,0.24)",
    color: "#fde68a"
  },
  recapGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
    gap: 10
  },
  recapStatCard: {
    borderRadius: 18,
    padding: 14,
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.07)",
    display: "grid",
    gap: 6
  },
  recapStatLabel: {
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    color: "#bdbdbd",
    fontWeight: 800
  },
  recapStatValue: {
    fontSize: 22,
    fontWeight: 900,
    color: "#fafafa"
  },
  recapStatSubtext: {
    fontSize: 12,
    color: "#d4d4d8"
  },
  progressCompareHero: {
    display: "grid",
    gap: 12
  },
  progressCompareMetaRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: 10,
    alignItems: "center",
    flexWrap: "wrap"
  },
  progressCompareDelta: {
    fontSize: 24,
    fontWeight: 900,
    color: "#fbbf24"
  },
  progressCompareSpan: {
    fontSize: 13,
    color: "#d4d4d8"
  },
  progressCompareGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0,1fr))",
    gap: 12
  },
  progressCompareCard: {
    borderRadius: 18,
    padding: 12,
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    display: "grid",
    gap: 8
  },
  progressCompareLabel: {
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1,
    color: "#fbbf24",
    fontWeight: 800
  },
  progressCompareImage: {
    width: "100%",
    aspectRatio: "3 / 4",
    objectFit: "cover",
    borderRadius: 14,
    border: "1px solid #3f3f46"
  },
  progressCompareDate: {
    fontSize: 16,
    fontWeight: 800,
    color: "#fafafa"
  },
  progressCompareText: {
    fontSize: 13,
    color: "#e5e7eb",
    lineHeight: 1.45
  },
  progressCompareTextMuted: {
    fontSize: 12,
    color: "#a1a1aa"
  },
  homeQuickLogGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
    gap: 10
  },
  photoMetaText: {
    fontSize: 13,
    lineHeight: 1.45,
    color: "#e5e7eb"
  },
  photoMetaTextMuted: {
    fontSize: 12,
    color: "#a1a1aa"
  },
  phaseHistoryWrap: {
    display: "grid",
    gap: 10
  },
  phaseHistoryList: {
    display: "grid",
    gap: 10
  },
  phaseHistoryCard: {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.07)",
    borderRadius: 16,
    padding: 12,
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "center",
    flexWrap: "wrap"
  },
  phaseHistoryActive: {
    padding: "8px 10px",
    borderRadius: 999,
    background: "rgba(16,185,129,0.12)",
    border: "1px solid rgba(16,185,129,0.24)",
    color: "#d1fae5",
    fontSize: 12,
    fontWeight: 800
  },
  localModeBadge: {
    padding: "10px 12px",
    borderRadius: 999,
    background: "rgba(96,165,250,0.12)",
    border: "1px solid rgba(96,165,250,0.24)",
    color: "#dbeafe",
    fontSize: 12,
    fontWeight: 800
  },
  status: {
    color: "#fca5a5",
    fontSize: 13
  },
  statusBar: {
    position: "fixed",
    left: "50%",
    transform: "translateX(-50%)",
    bottom: 92,
    width: "min(760px, calc(100% - 28px))",
    background: "rgba(17,17,17,0.92)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 16,
    padding: 10,
    color: "#f5f5f5",
    backdropFilter: "blur(10px)",
    WebkitBackdropFilter: "blur(10px)",
    zIndex: 30
  }
};
