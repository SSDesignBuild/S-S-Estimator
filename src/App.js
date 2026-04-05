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

const SCREENS = ["labs", "charts", "home", "body", "injections", "peptides"];
const SCREEN_LABELS = {
  labs: "Labs",
  charts: "Charts",
  home: "Home",
  body: "Body",
  injections: "Inject",
  peptides: "Peptides"
};
const HOME_INDEX = 2;

const DOCK_ITEM_DEFINITIONS = [
  { key: "food", emoji: "🍽️", label: "Food" },
  { key: "weight", emoji: "⚖️", label: "Weight" },
  { key: "workout", emoji: "💪", label: "Workout" },
  { key: "protocol", emoji: "💉", label: "Protocol" },
  { key: "cardio", emoji: "🏃", label: "Cardio" },
  { key: "photo", emoji: "📸", label: "Photo" }
];
const DOCK_STORAGE_KEY = "ironSyndicateDockItems";
const THEME_STORAGE_KEY = "ironSyndicateThemeMode";
const SIGNAL_ROTATION_STORAGE_KEY = "ironSyndicateSignalRotation";
const SIGNAL_HISTORY_STORAGE_KEY = "ironSyndicateSignalHistory";
const WORKOUT_CHECKLIST_STORAGE_KEY = "ironSyndicateWorkoutChecklist";
const WORKOUT_EXECUTION_STORAGE_KEY = "ironSyndicateWorkoutExecution";
const SAVED_MEALS_STORAGE_KEY = "ironSyndicateSavedMeals";
const BODY_METRIC_EXTRAS_STORAGE_KEY = "ironSyndicateBodyMetricExtras";
const APP_SETTINGS_STORAGE_KEY = "ironSyndicateAppSettings";
const REMINDER_LEDGER_STORAGE_KEY = "ironSyndicateReminderLedger";
const PLANNED_WORKOUT_PREFIX = "[PLANNED WORKOUT]";
const PLANNED_CARDIO_PREFIX = "[PLANNED CARDIO]";

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
const TRAINING_STYLE_OPTIONS = [
  "Full Body",
  "Upper / Lower",
  "Push / Pull / Legs",
  "Body Part Split",
  "Let App Decide"
];
const TRAINING_DAYS_OPTIONS = ["3", "4", "5", "6", "Flexible"];
const GOAL_EMPHASIS_OPTIONS = ["Size (Hypertrophy)", "Strength", "Fat Loss", "Performance", "Balanced"];
const CARDIO_PREFERENCE_OPTIONS = ["Minimal", "Moderate", "High frequency", "Only when cutting"];
const CARDIO_MINUTE_OPTIONS = Array.from({ length: 18 }, (_, index) => String((index + 1) * 5));
const REMINDER_MINUTE_OPTIONS = ["0", "5", "10", "15", "30", "60", "1440"];
const INJECTION_FREQUENCY_OPTIONS = ["", "Daily", "Every other day", "2x weekly", "3x weekly", "Weekly", "Every 10 days", "Custom"];
const PEPTIDE_NAME_OPTIONS = ["", "BPC-157", "TB-500", "GHK-Cu", "CJC-1295", "Ipamorelin", "Tesamorelin", "Semaglutide", "Tirzepatide", "Retatrutide", "Other"];

const DEFAULT_PROFILE = {
  sex: "Male",
  age: "",
  heightInches: "",
  activityLevel: "Moderate",
  onTRT: false,
  usingPeptides: false,
  trtType: "",
  injectionFrequency: "",
  peptideCategory: "",
  peptideName: "",
  peptideInjectionFrequency: "",
  currentWeightReference: ""
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

const WORKOUT_VARIATION_EXPANSIONS = {
  Chest: [
    { name: "Stretch and squeeze", focus: "Bias pec lengthening and controlled fly work.", plan: `Chest — Stretch and squeeze:
1. Incline dumbbell press — 4 sets x 8-10 reps
2. Flat machine press — 3 sets x 10-12 reps
3. Deep cable fly — 3 sets x 12-15 reps
4. Push-up mechanical drop set — 2 rounds

Focus:
- Slow the stretch
- Keep shoulders pinned down` },
    { name: "Strength anchor", focus: "One heavy press, then cleaner volume.", plan: `Chest — Strength anchor:
1. Barbell bench press — 4 sets x 4-6 reps
2. Incline smith press — 3 sets x 6-8 reps
3. Weighted dips — 2-3 sets x 6-10 reps
4. Pec deck — 2-3 sets x 12-15 reps

Focus:
- Own the setup
- Add reps before load when form slips` },
    { name: "Minimal equipment chest", focus: "Works in lighter gyms or busy sessions.", plan: `Chest — Minimal equipment:
1. Dumbbell floor press — 4 sets x 8-12 reps
2. Low-incline dumbbell press — 3 sets x 8-12 reps
3. Standing cable fly — 3 sets x 12-20 reps
4. Push-ups — 2 sets close to failure

Focus:
- Keep rest tight
- Chase clean reps and tension` }
  ],
  Back: [
    { name: "Pull-up priority", focus: "Vertical pulling first with lat bias.", plan: `Back — Pull-up priority:
1. Pull-up or assisted pull-up — 4 sets x 5-8 reps
2. Neutral pulldown — 3 sets x 8-10 reps
3. Chest-supported row — 3 sets x 8-12 reps
4. Straight-arm pulldown — 2-3 sets x 12-15 reps

Focus:
- Drive elbows down
- Limit momentum` },
    { name: "Row and stretch", focus: "Density through rows plus a long-length finish.", plan: `Back — Row and stretch:
1. Barbell row — 4 sets x 6-8 reps
2. Seated cable row — 3 sets x 8-12 reps
3. One-arm dumbbell row — 3 sets x 10-12 reps
4. Pullover machine — 2-3 sets x 12-15 reps

Focus:
- Pause in the squeeze
- Keep torso stable` },
    { name: "Minimal equipment back", focus: "Simple tools, hard contractions.", plan: `Back — Minimal equipment:
1. One-arm dumbbell row — 4 sets x 8-12 reps
2. Band or cable pulldown — 3 sets x 10-15 reps
3. Chest-supported dumbbell rear row — 3 sets x 12-15 reps
4. Dumbbell pullover — 2 sets x 12-15 reps

Focus:
- Long reach at the front
- Pull through the elbow` }
  ],
  Shoulders: [
    { name: "Press and cap", focus: "Heavy pressing with crisp lateral volume.", plan: `Shoulders — Press and cap:
1. Machine shoulder press — 4 sets x 6-8 reps
2. Dumbbell lateral raise — 4 sets x 12-18 reps
3. Cable lateral partials — 2 sets x 15-20 reps
4. Reverse fly — 3 sets x 15-20 reps

Focus:
- Own the top half on laterals
- Keep traps quiet` },
    { name: "Lateral specialization", focus: "Side delt workload with low joint stress.", plan: `Shoulders — Lateral specialization:
1. Cable lateral raise — 5 sets x 12-18 reps
2. Lean-away cable lateral — 3 sets x 10-14 reps
3. Machine press — 3 sets x 8-12 reps
4. Rear-delt cable fly — 3 sets x 15-20 reps

Focus:
- Sweep the elbows out
- Use smooth tempo` },
    { name: "Minimal equipment delts", focus: "Dumbbell-heavy shoulder day.", plan: `Shoulders — Minimal equipment:
1. Seated dumbbell press — 4 sets x 8-10 reps
2. Standing lateral raise — 4 sets x 12-20 reps
3. Bent-over rear-delt raise — 3 sets x 15-20 reps
4. Arnold press — 2-3 sets x 8-10 reps

Focus:
- No swinging
- Keep sets honest` }
  ],
  Biceps: [
    { name: "Peak squeeze", focus: "Shortened-position tension and high intent.", plan: `Biceps — Peak squeeze:
1. Preacher curl — 4 sets x 8-12 reps
2. Cable curl — 3 sets x 10-15 reps
3. Spider curl — 2-3 sets x 10-15 reps

Focus:
- Squeeze hard at the top
- Keep shoulders out` },
    { name: "Heavy curl day", focus: "Start heavy, finish clean.", plan: `Biceps — Heavy curl day:
1. EZ-bar curl — 4 sets x 6-8 reps
2. Incline dumbbell curl — 3 sets x 8-12 reps
3. Hammer curl — 3 sets x 10-12 reps

Focus:
- Stay strict
- Lower slower than you lift` },
    { name: "Cable-only biceps", focus: "Constant tension with easier setup.", plan: `Biceps — Cable-only:
1. Bayesian curl — 4 sets x 10-15 reps
2. Rope hammer curl — 3 sets x 10-15 reps
3. High-cable curl — 3 sets x 12-15 reps

Focus:
- Let the elbow fully open
- Keep the line of pull clean` }
  ],
  Triceps: [
    { name: "Pressdown focus", focus: "Joint-friendly triceps volume.", plan: `Triceps — Pressdown focus:
1. Straight-bar pressdown — 4 sets x 8-12 reps
2. Rope pressdown — 3 sets x 10-15 reps
3. Overhead rope extension — 3 sets x 10-15 reps

Focus:
- Full lockout
- Control the return` },
    { name: "Compound plus stretch", focus: "Heavy press then long-head work.", plan: `Triceps — Compound plus stretch:
1. Close-grip smith bench — 4 sets x 6-8 reps
2. Overhead cable extension — 3 sets x 8-12 reps
3. Skull crusher — 2-3 sets x 8-12 reps

Focus:
- Tuck elbows just enough
- Let overhead work stretch` },
    { name: "Cable-only triceps", focus: "Easy setup, high-quality reps.", plan: `Triceps — Cable-only:
1. Rope overhead extension — 4 sets x 10-15 reps
2. Straight-bar pressdown — 4 sets x 10-15 reps
3. Single-arm reverse-grip pressdown — 2-3 sets x 12-15 reps

Focus:
- Spread the rope wide
- Keep shoulders quiet` }
  ],
  Legs: [
    { name: "Strength and pump", focus: "Heavy opener followed by stable volume.", plan: `Legs — Strength and pump:
1. Back squat — 4 sets x 4-6 reps
2. Leg press — 3 sets x 10-15 reps
3. Romanian deadlift — 3 sets x 6-10 reps
4. Leg extension — 2-3 sets x 12-15 reps
5. Leg curl — 2-3 sets x 12-15 reps

Focus:
- Brace hard
- Leave one rep in reserve on compounds` },
    { name: "Machine lower body", focus: "Lower fatigue, high output.", plan: `Legs — Machine lower body:
1. Hack squat — 4 sets x 8-10 reps
2. Leg press — 3 sets x 12-15 reps
3. Seated leg curl — 4 sets x 10-15 reps
4. Leg extension — 3 sets x 15-20 reps
5. Calf raise — 4 sets x 10-15 reps

Focus:
- Keep rest moving
- Push close to failure safely` },
    { name: "Athletic legs", focus: "Unilateral work and posterior chain balance.", plan: `Legs — Athletic legs:
1. Front squat — 4 sets x 5-8 reps
2. Walking lunge — 3 sets x 12-16 steps
3. Romanian deadlift — 3 sets x 8-10 reps
4. Leg curl — 3 sets x 10-15 reps
5. Sled push — 4 rounds

Focus:
- Stay stable side to side
- Own the eccentric` }
  ],
  Glutes: [
    { name: "Shortened glutes", focus: "Hip thrust and lockout emphasis.", plan: `Glutes — Shortened bias:
1. Barbell hip thrust — 4 sets x 6-10 reps
2. Smith glute bridge — 3 sets x 10-12 reps
3. Cable kickback — 3 sets x 12-20 reps
4. Frog pump finisher — 2 sets x 20-30 reps

Focus:
- Hard squeeze at top
- Keep pelvis stable` },
    { name: "Lengthened glutes", focus: "Glute stretch under load.", plan: `Glutes — Lengthened bias:
1. Romanian deadlift — 4 sets x 6-10 reps
2. Deficit reverse lunge — 3 sets x 8-12 reps
3. 45-degree back extension — 3 sets x 10-15 reps
4. Cable pull-through — 2-3 sets x 12-15 reps

Focus:
- Reach hips back
- Keep shin mostly vertical` },
    { name: "Minimal equipment glutes", focus: "Dumbbell and bodyweight option.", plan: `Glutes — Minimal equipment:
1. Dumbbell Romanian deadlift — 4 sets x 8-12 reps
2. Bulgarian split squat — 3 sets x 8-12 reps
3. Dumbbell hip thrust — 3 sets x 10-15 reps
4. Banded abduction — 3 sets x 20-30 reps

Focus:
- Long step on split squats
- Own every lockout` }
  ],
  Hamstrings: [
    { name: "Curl priority", focus: "Ham curls first while fresh.", plan: `Hamstrings — Curl priority:
1. Seated leg curl — 4 sets x 8-12 reps
2. Lying leg curl — 3 sets x 10-15 reps
3. Romanian deadlift — 3 sets x 6-10 reps
4. Back extension — 2-3 sets x 12-15 reps

Focus:
- Drive heels down
- Stretch at the bottom` },
    { name: "Hinge priority", focus: "Start with long-length loading.", plan: `Hamstrings — Hinge priority:
1. Romanian deadlift — 4 sets x 6-8 reps
2. Dumbbell stiff-leg deadlift — 3 sets x 8-10 reps
3. Seated leg curl — 3 sets x 10-15 reps
4. Swiss-ball curl — 2 sets x 12-15 reps

Focus:
- Neutral spine
- Slow eccentrics` },
    { name: "Minimal equipment hamstrings", focus: "Solid hamstring work with limited tools.", plan: `Hamstrings — Minimal equipment:
1. Dumbbell Romanian deadlift — 4 sets x 8-12 reps
2. Slider or towel leg curl — 3 sets x 10-15 reps
3. Single-leg Romanian deadlift — 3 sets x 8-12 reps
4. Hip bridge walkout — 2 sets x 10-15 reps

Focus:
- Balance before speed
- Keep the hamstrings loaded` }
  ],
  Quads: [
    { name: "Front squat focus", focus: "More upright quad loading.", plan: `Quads — Front squat focus:
1. Front squat — 4 sets x 5-8 reps
2. Leg press — 3 sets x 10-15 reps
3. Leg extension — 4 sets x 12-20 reps
4. Walking lunge — 2 sets x 12-16 steps

Focus:
- Stay tall
- Let knees travel if pain-free` },
    { name: "Hack and burn", focus: "Machine-dominant quad volume.", plan: `Quads — Hack and burn:
1. Hack squat — 4 sets x 8-10 reps
2. Heels-elevated smith squat — 3 sets x 10-12 reps
3. Leg extension — 4 sets x 15-20 reps
4. Sissy squat or cyclist squat — 2 sets x 10-15 reps

Focus:
- Smooth bottom position
- Constant tension` },
    { name: "Minimal equipment quads", focus: "Quad work without heavy machines.", plan: `Quads — Minimal equipment:
1. Goblet squat — 4 sets x 10-15 reps
2. Heel-elevated split squat — 3 sets x 8-12 reps
3. Step-up — 3 sets x 10-12 reps
4. Spanish squat hold — 2 rounds x 30-45 sec

Focus:
- Keep torso upright
- Chase the burn cleanly` }
  ],
  Calves: [
    { name: "Standing calf focus", focus: "Heavy straight-leg calf work.", plan: `Calves — Standing focus:
1. Standing calf raise — 5 sets x 6-10 reps
2. Leg-press calf raise — 4 sets x 10-15 reps
3. Tibialis raise — 3 sets x 15-20 reps

Focus:
- Long pause in stretch
- Drive big toe down` },
    { name: "Seated soleus focus", focus: "Bent-knee calf volume.", plan: `Calves — Soleus focus:
1. Seated calf raise — 5 sets x 10-15 reps
2. Smith seated calf raise — 4 sets x 12-20 reps
3. Tibialis raise — 3 sets x 15-20 reps

Focus:
- Pause hard at top
- Don’t bounce` },
    { name: "Minimal equipment calves", focus: "Simple calf work anywhere.", plan: `Calves — Minimal equipment:
1. Single-leg bodyweight calf raise — 4 sets x 12-20 reps
2. Dumbbell standing calf raise — 4 sets x 10-15 reps
3. Bent-knee calf pulse — 3 sets x 20-30 reps

Focus:
- Use full range
- Slow the lowering phase` }
  ],
  Core: [
    { name: "Loaded abs", focus: "Treat abs like a real muscle group.", plan: `Core — Loaded abs:
1. Cable crunch — 4 sets x 10-15 reps
2. Decline sit-up — 3 sets x 8-12 reps
3. Hanging knee raise — 3 sets x 10-15 reps

Focus:
- Progress the load
- Don’t rush reps` },
    { name: "Stability core", focus: "Anti-rotation and anti-extension emphasis.", plan: `Core — Stability core:
1. Ab wheel rollout — 3 sets x 8-12 reps
2. Pallof press — 3 sets x 10-12 reps each side
3. Side plank — 2-3 rounds

Focus:
- Breathe behind the brace
- Keep ribs stacked` },
    { name: "Minimal equipment core", focus: "Fast trunk work with bodyweight and one cable.", plan: `Core — Minimal equipment:
1. Reverse crunch — 4 sets x 12-20 reps
2. Plank reach — 3 sets x 8-12 reps each side
3. Dead bug — 3 sets x 8-12 reps each side

Focus:
- Slow down
- Keep low back controlled` }
  ],
  Forearms: [
    { name: "Grip and carry", focus: "Forearms through carries and holds.", plan: `Forearms — Grip and carry:
1. Farmer carry — 4 rounds
2. Towel dead hang — 3 rounds
3. Hammer curl — 3 sets x 10-12 reps
4. Wrist curl — 2-3 sets x 15-20 reps

Focus:
- Crush the handle
- Keep posture tall` },
    { name: "Flexors and extensors", focus: "Balanced forearm training.", plan: `Forearms — Flexors and extensors:
1. Wrist curl — 3 sets x 15-20 reps
2. Reverse wrist curl — 3 sets x 15-20 reps
3. Reverse curl — 3 sets x 10-15 reps
4. Plate pinch — 3 rounds

Focus:
- No sloppy reps
- Let the wrist move fully` },
    { name: "Minimal equipment forearms", focus: "Simple dumbbell and bodyweight combo.", plan: `Forearms — Minimal equipment:
1. Hammer curl — 4 sets x 8-12 reps
2. Reverse curl — 3 sets x 10-15 reps
3. Dumbbell wrist curl — 3 sets x 15-20 reps
4. Timed dead hang — 2-3 rounds

Focus:
- Keep tension through the handle
- Build time under load` }
  ],
  "Full Body": [
    { name: "Strength-biased full body", focus: "Big lifts first, accessories after.", plan: `Full Body — Strength bias:
1. Squat — 4 sets x 4-6 reps
2. Bench press — 4 sets x 5-8 reps
3. Chest-supported row — 3 sets x 8-10 reps
4. Romanian deadlift — 3 sets x 6-8 reps
5. Lateral raise — 2-3 sets x 12-20 reps

Focus:
- Keep the main lifts crisp
- Cut fluff if recovery is low` },
    { name: "Hypertrophy full body", focus: "Balanced size work in one session.", plan: `Full Body — Hypertrophy bias:
1. Leg press — 3 sets x 10-15 reps
2. Incline dumbbell press — 3 sets x 8-12 reps
3. Lat pulldown — 3 sets x 8-12 reps
4. Romanian deadlift — 3 sets x 8-10 reps
5. Curl + overhead extension — 2-3 sets each

Focus:
- Keep rest moving
- Stay one rep off failure on compounds` },
    { name: "Minimal equipment full body", focus: "Simple setup when time or equipment is limited.", plan: `Full Body — Minimal equipment:
1. Goblet squat — 4 sets x 10-15 reps
2. Dumbbell floor press — 4 sets x 8-12 reps
3. One-arm dumbbell row — 4 sets x 8-12 reps
4. Dumbbell Romanian deadlift — 3 sets x 10-12 reps
5. Lateral raise + curl superset — 2-3 sets

Focus:
- Great for hotel or busy-gym sessions
- Chase clean reps, not chaos` }
  ]
};

function buildLibraryPlan(title, lines = [], cues = []) {
  return [
    `${title}:`,
    ...lines.map((line, index) => `${index + 1}. ${line}`),
    "",
    "Focus:",
    ...cues.map((item) => `- ${item}`)
  ].join("\n");
}

function svgToDataUri(svg = "") {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function escapeSvgText(value = "") {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function normalizeVisualTone(value = "") {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, "_");
}

const EXERCISE_DEMO_COLORS = {
  push: { accent: "#fb7185", glow: "rgba(251,113,133,0.22)" },
  pull: { accent: "#60a5fa", glow: "rgba(96,165,250,0.22)" },
  lower: { accent: "#34d399", glow: "rgba(52,211,153,0.22)" },
  core: { accent: "#a78bfa", glow: "rgba(167,139,250,0.22)" },
  arms: { accent: "#f59e0b", glow: "rgba(245,158,11,0.22)" },
  upper: { accent: "#22c55e", glow: "rgba(34,197,94,0.18)" }
};

const EXERCISE_LIBRARY = {
  bench_press: {
    name: "Barbell Bench Press",
    groups: ["Chest", "Triceps"],
    lane: "push",
    visual: "bench_press",
    headline: "Heavy horizontal press",
    cues: ["Pin the shoulder blades down before the first rep.", "Lower to the same touch point and drive straight back up."]
  },
  incline_db_press: {
    name: "Incline Dumbbell Press",
    groups: ["Chest", "Shoulders", "Triceps"],
    lane: "push",
    visual: "incline_press",
    headline: "Upper-chest lengthened press",
    cues: ["Keep the elbows slightly tucked as the dumbbells descend.", "Let the pecs stretch before pressing with intent."]
  },
  smith_incline_press: {
    name: "Incline Smith Press",
    groups: ["Chest", "Shoulders", "Triceps"],
    lane: "push",
    visual: "incline_press",
    headline: "Stable incline overload",
    cues: ["Lock the bench angle in and repeat the same bar path.", "Drive the bar up without letting the shoulders shrug."]
  },
  machine_chest_press: {
    name: "Machine Chest Press",
    groups: ["Chest", "Triceps"],
    lane: "push",
    visual: "machine_press",
    headline: "Stable chest volume",
    cues: ["Keep the ribcage stacked and press through the palm.", "Use the machine to chase tension, not momentum."]
  },
  cable_fly: {
    name: "Cable Fly",
    groups: ["Chest"],
    lane: "push",
    visual: "fly",
    headline: "Lengthened chest isolation",
    cues: ["Let the pecs load in the stretch without losing shoulder position.", "Bring the hands together in a smooth arc, not a shrug."]
  },
  cable_lateral_raise: {
    name: "Cable Lateral Raise",
    groups: ["Shoulders"],
    lane: "push",
    visual: "lateral_raise",
    headline: "Side-delt tension",
    cues: ["Lead with the elbow and keep the trap quiet.", "Float the handle out, then lower under control."]
  },
  db_shoulder_press: {
    name: "DB Shoulder Press",
    groups: ["Shoulders", "Triceps"],
    lane: "push",
    visual: "shoulder_press",
    headline: "Controlled overhead press",
    cues: ["Keep the forearms vertical in the bottom.", "Press up without flaring the ribs."]
  },
  overhead_cable_extension: {
    name: "Overhead Cable Extension",
    groups: ["Triceps"],
    lane: "push",
    visual: "overhead_extension",
    headline: "Long-head triceps work",
    cues: ["Reach long into the stretch before extending.", "Lock out hard while keeping the upper arm quiet."]
  },
  rope_pressdown: {
    name: "Rope Pressdown",
    groups: ["Triceps"],
    lane: "push",
    visual: "pressdown",
    headline: "Shortened triceps finish",
    cues: ["Pin the elbows and split the rope at lockout.", "Own the lowering phase instead of bouncing back up."]
  },
  weighted_pullup: {
    name: "Weighted Pull-Up",
    groups: ["Back", "Biceps"],
    lane: "pull",
    visual: "pull_up",
    headline: "Vertical pull anchor",
    cues: ["Start from a long hang and pull the elbows to the ribs.", "Keep the ribcage stacked instead of kipping."]
  },
  lat_pulldown: {
    name: "Lat Pulldown",
    groups: ["Back", "Biceps"],
    lane: "pull",
    visual: "pulldown",
    headline: "Lat-biased vertical pull",
    cues: ["Think elbows to hips and pause at the chest line.", "Let the shoulders reach at the top for a real stretch."]
  },
  chest_supported_row: {
    name: "Chest-Supported Row",
    groups: ["Back"],
    lane: "pull",
    visual: "row",
    headline: "Stable row for back density",
    cues: ["Drive the elbows back without losing chest pressure on the pad.", "Reach long in front before the next rep."]
  },
  one_arm_lat_row: {
    name: "One-Arm Lat Row",
    groups: ["Back"],
    lane: "pull",
    visual: "one_arm_row",
    headline: "Single-arm lat path",
    cues: ["Let the shoulder blade protract in the stretch.", "Pull the elbow toward the back pocket."]
  },
  seated_cable_row: {
    name: "Seated Cable Row",
    groups: ["Back"],
    lane: "pull",
    visual: "row",
    headline: "Mid-back volume",
    cues: ["Row to the lower ribs with a stacked torso.", "Pause briefly without rocking backward."]
  },
  rear_delt_fly: {
    name: "Rear-Delt Fly",
    groups: ["Shoulders", "Back"],
    lane: "pull",
    visual: "rear_delt",
    headline: "Posterior shoulder control",
    cues: ["Move the hands wide and keep the neck relaxed.", "Let the rear delt finish the rep, not the traps."]
  },
  straight_arm_pulldown: {
    name: "Straight-Arm Pulldown",
    groups: ["Back"],
    lane: "pull",
    visual: "pulldown",
    headline: "Lat length-to-shortened finisher",
    cues: ["Keep the arms soft and sweep from the shoulder.", "Finish at the thighs without folding the torso."]
  },
  incline_db_curl: {
    name: "Incline DB Curl",
    groups: ["Biceps"],
    lane: "pull",
    visual: "curl",
    headline: "Lengthened biceps curl",
    cues: ["Let the arm fully lengthen at the bottom.", "Curl without letting the shoulder roll forward."]
  },
  preacher_curl: {
    name: "Preacher Curl",
    groups: ["Biceps"],
    lane: "pull",
    visual: "curl",
    headline: "Strict curl tension",
    cues: ["Drive through the mid-range without losing pad contact.", "Lower slower than you lift."]
  },
  hammer_curl: {
    name: "Hammer Curl",
    groups: ["Biceps", "Forearms"],
    lane: "pull",
    visual: "curl",
    headline: "Brachialis and forearm finish",
    cues: ["Keep the wrist stacked and squeeze through the top.", "Avoid swinging the torso to finish reps."]
  },
  hack_squat: {
    name: "Hack Squat",
    groups: ["Quads", "Legs"],
    lane: "lower",
    visual: "squat",
    headline: "Quad-dominant squat pattern",
    cues: ["Brace before the descent and keep the feet planted.", "Own the bottom and drive evenly through the mid-foot."]
  },
  pendulum_squat: {
    name: "Pendulum Squat",
    groups: ["Quads", "Legs"],
    lane: "lower",
    visual: "squat",
    headline: "Deep quad loading",
    cues: ["Stay tucked under the pad and sink to honest depth.", "Drive up smoothly without collapsing forward."]
  },
  back_squat: {
    name: "Back Squat",
    groups: ["Quads", "Glutes", "Legs"],
    lane: "lower",
    visual: "squat",
    headline: "Global lower-body strength",
    cues: ["Brace hard before every rep and keep the bar over mid-foot.", "Hit depth you can repeat with control."]
  },
  romanian_deadlift: {
    name: "Romanian Deadlift",
    groups: ["Hamstrings", "Glutes", "Back"],
    lane: "lower",
    visual: "hinge",
    headline: "Posterior-chain hinge",
    cues: ["Push the hips back until the hamstrings load hard.", "Keep the bar close and the spine long."]
  },
  leg_press: {
    name: "Leg Press",
    groups: ["Quads", "Glutes", "Legs"],
    lane: "lower",
    visual: "leg_press",
    headline: "Stable lower-body volume",
    cues: ["Take the knees through full flexion you can own.", "Drive the sled without letting the hips roll up."]
  },
  walking_lunge: {
    name: "Walking Lunge",
    groups: ["Quads", "Glutes", "Hamstrings"],
    lane: "lower",
    visual: "lunge",
    headline: "Unilateral lower-body work",
    cues: ["Stay tall and take a deliberate step each rep.", "Sink straight down instead of diving forward."]
  },
  seated_leg_curl: {
    name: "Seated Leg Curl",
    groups: ["Hamstrings"],
    lane: "lower",
    visual: "leg_curl",
    headline: "Hamstring curl in lengthened position",
    cues: ["Set the hips down and curl through a full range.", "Pause in the squeeze before lowering."]
  },
  leg_extension: {
    name: "Leg Extension",
    groups: ["Quads"],
    lane: "lower",
    visual: "leg_extension",
    headline: "Constant-tension quad finisher",
    cues: ["Lock out with control and hold the squeeze.", "Lower slower than you extend."]
  },
  standing_calf_raise: {
    name: "Standing Calf Raise",
    groups: ["Calves"],
    lane: "lower",
    visual: "calf_raise",
    headline: "Straight-leg calf work",
    cues: ["Pause in the stretch before driving up.", "Finish every rep high on the big toe."]
  },
  seated_calf_raise: {
    name: "Seated Calf Raise",
    groups: ["Calves"],
    lane: "lower",
    visual: "calf_raise",
    headline: "Bent-knee soleus work",
    cues: ["Stay patient in the bottom stretch.", "Keep the reps smooth and complete."]
  },
  cable_crunch: {
    name: "Cable Crunch",
    groups: ["Core"],
    lane: "core",
    visual: "core",
    headline: "Loaded trunk flexion",
    cues: ["Round through the trunk, not just the hips.", "Exhale hard into the squeeze."]
  }
};

const COACH_ROUTINE_BLUEPRINTS = {
  push_primary: [
    {
      exerciseId: "bench_press",
      prescriptions: {
        default: "4x6-10",
        goal: { Strength: "5x4-6", Performance: "4x4-6" },
        phase: { Cut: "3-4x6-8", Blast: "4x5-8", "TRT Cruise": "3x6-8" }
      },
      cue: "Set the upper back first and make the first work set count."
    },
    {
      exerciseId: "incline_db_press",
      prescriptions: {
        default: "3x8-12",
        goal: { Strength: "3x6-8", Performance: "3x6-8" },
        phase: { Cut: "3x8-10", Blast: "3x6-10" }
      },
      cue: "Own the stretch and let the pecs drive the dumbbells out of the hole."
    },
    {
      exerciseId: "machine_chest_press",
      prescriptions: {
        default: "2-3x10-12",
        goal: { Strength: "2x8-10" },
        phase: { Cut: "2x10-12", "TRT Cruise": "2x10-12" }
      },
      cue: "Use this slot to add hard chest work without burning technique."
    },
    {
      exerciseId: "cable_lateral_raise",
      prescriptions: {
        default: "3-4x12-20",
        goal: { Strength: "3x10-15" },
        phase: { Cut: "3x12-18" }
      },
      cue: "Keep the shoulder quiet and stack clean delt reps."
    },
    {
      exerciseId: "overhead_cable_extension",
      prescriptions: {
        default: "3x10-15",
        goal: { Strength: "3x8-10" },
        phase: { Blast: "3x8-12" }
      },
      cue: "Use one true overhead triceps slot every push day."
    },
    {
      exerciseId: "rope_pressdown",
      prescriptions: {
        default: "2-3x12-15",
        goal: { Strength: "2x10-12" },
        phase: { Cut: "2-3x12-15" }
      },
      cue: "Finish with smooth lockouts instead of sloppy body English."
    }
  ],
  push_secondary: [
    {
      exerciseId: "smith_incline_press",
      prescriptions: {
        default: "4x6-10",
        goal: { Strength: "4x5-7", Performance: "4x5-7" },
        phase: { Cut: "3x6-8", Blast: "4x5-8" }
      },
      cue: "Stable incline loading gives you a second pressing driver for the week."
    },
    {
      exerciseId: "machine_chest_press",
      prescriptions: { default: "3x8-12", goal: { Strength: "3x6-8" }, phase: { Cut: "2-3x8-10" } },
      cue: "Keep tension high and take the joints out of the equation."
    },
    {
      exerciseId: "cable_fly",
      prescriptions: { default: "3x12-15", goal: { Strength: "2x10-12" }, phase: { Cut: "3x12-15" } },
      cue: "This is the stretch-based chest slot. Do not rush it."
    },
    {
      exerciseId: "db_shoulder_press",
      prescriptions: { default: "3x8-10", goal: { Strength: "3x6-8" }, phase: { "TRT Cruise": "2-3x8-10" } },
      cue: "Press only as hard as you can keep ribs and shoulders stacked."
    },
    {
      exerciseId: "overhead_cable_extension",
      prescriptions: { default: "3x8-12", goal: { Strength: "3x8-10" } },
      cue: "Let the long head stretch and earn the lockout."
    },
    {
      exerciseId: "rope_pressdown",
      prescriptions: { default: "2-3x12-15", goal: { Strength: "2x10-12" } },
      cue: "Shortened triceps work closes the day without a ton of fatigue."
    }
  ],
  pull_primary: [
    {
      exerciseId: "lat_pulldown",
      prescriptions: {
        default: "4x6-10",
        goal: { Strength: "4x5-8", Performance: "4x5-8" },
        phase: { Blast: "4x5-8", Cut: "3-4x6-10" }
      },
      cue: "Open with one vertical pull you can progress cleanly."
    },
    {
      exerciseId: "chest_supported_row",
      prescriptions: { default: "4x6-10", goal: { Strength: "4x5-8" }, phase: { Cut: "3x6-10" } },
      cue: "Drive elbows back and let the upper back stay braced on the pad."
    },
    {
      exerciseId: "one_arm_lat_row",
      prescriptions: { default: "3x8-12", goal: { Strength: "3x6-10" } },
      cue: "Use the single-arm row to clean up the lat path, not to yank weight."
    },
    {
      exerciseId: "rear_delt_fly",
      prescriptions: { default: "3x12-20", goal: { Strength: "3x10-15" } },
      cue: "Rear delts keep the shoulder girdle balanced for all the pressing."
    },
    {
      exerciseId: "incline_db_curl",
      prescriptions: { default: "3x8-12", goal: { Strength: "3x6-10" } },
      cue: "Start biceps with the lengthened curl, not the ego curl."
    },
    {
      exerciseId: "hammer_curl",
      prescriptions: { default: "2-3x10-12", goal: { Strength: "2-3x8-10" } },
      cue: "Finish the elbow flexors without swinging your torso."
    }
  ],
  pull_secondary: [
    {
      exerciseId: "weighted_pullup",
      prescriptions: { default: "4x5-8", goal: { Strength: "5x4-6" }, phase: { Cut: "3x5-8", "TRT Cruise": "3x5-8" } },
      cue: "Keep this heavy vertical pull honest and repeatable."
    },
    {
      exerciseId: "seated_cable_row",
      prescriptions: { default: "3-4x8-12", goal: { Strength: "3x6-10" } },
      cue: "Use the row to build density without grinding the lower back."
    },
    {
      exerciseId: "straight_arm_pulldown",
      prescriptions: { default: "3x12-15", goal: { Strength: "2x10-12" } },
      cue: "Bias the lats through a long range after the compounds."
    },
    {
      exerciseId: "rear_delt_fly",
      prescriptions: { default: "2-3x12-20", goal: { Strength: "2x10-15" } },
      cue: "Keep the shoulders feeling better than they did on the way in."
    },
    {
      exerciseId: "preacher_curl",
      prescriptions: { default: "3x8-12", goal: { Strength: "3x6-10" } },
      cue: "Use the preacher to keep the biceps strict under fatigue."
    },
    {
      exerciseId: "hammer_curl",
      prescriptions: { default: "2x10-12", goal: { Strength: "2x8-10" } },
      cue: "Forearm support closes the pull day well."
    }
  ],
  lower_primary: [
    {
      exerciseId: "hack_squat",
      prescriptions: {
        default: "4x6-10",
        goal: { Strength: "5x4-6", Performance: "4x4-6" },
        phase: { Cut: "3-4x6-8", Blast: "4x5-8" }
      },
      cue: "Start with a true knee-dominant driver and own the bottom position."
    },
    {
      exerciseId: "romanian_deadlift",
      prescriptions: { default: "3-4x6-10", goal: { Strength: "4x5-8" }, phase: { Cut: "3x6-8" } },
      cue: "One clean hinge slot keeps posterior-chain strength in the week."
    },
    {
      exerciseId: "leg_press",
      prescriptions: { default: "3x10-15", goal: { Strength: "3x8-10" }, phase: { Cut: "2-3x10-12" } },
      cue: "Push stable hard work here instead of sloppy grinders."
    },
    {
      exerciseId: "seated_leg_curl",
      prescriptions: { default: "3x10-15", goal: { Strength: "3x8-12" } },
      cue: "Let the hamstrings lengthen fully before curling."
    },
    {
      exerciseId: "leg_extension",
      prescriptions: { default: "2-3x12-15", goal: { Strength: "2x10-12" } },
      cue: "Constant-tension quad work rounds out the day."
    },
    {
      exerciseId: "standing_calf_raise",
      prescriptions: { default: "3x10-15", goal: { Strength: "3x8-12" } },
      cue: "Treat calves like a real lift and finish the rep."
    }
  ],
  lower_secondary: [
    {
      exerciseId: "pendulum_squat",
      prescriptions: { default: "4x6-10", goal: { Strength: "4x5-7", Performance: "4x5-7" }, phase: { Cut: "3x6-8" } },
      cue: "This second lower day is about quality depth, not surviving random fatigue."
    },
    {
      exerciseId: "walking_lunge",
      prescriptions: { default: "3x8-12 each side", goal: { Strength: "3x6-8 each side" } },
      cue: "Unilateral work keeps the week athletic and honest."
    },
    {
      exerciseId: "romanian_deadlift",
      prescriptions: { default: "3x6-8", goal: { Strength: "3x5-6" }, phase: { "TRT Cruise": "2-3x6-8" } },
      cue: "Use the hinge for clean tension, not max-fatigue heroics."
    },
    {
      exerciseId: "seated_leg_curl",
      prescriptions: { default: "3x10-12", goal: { Strength: "3x8-10" } },
      cue: "Lock the hips in and make the hamstrings do the curl."
    },
    {
      exerciseId: "seated_calf_raise",
      prescriptions: { default: "3x12-15", goal: { Strength: "3x10-12" } },
      cue: "Use the bent-knee pattern to catch the soleus."
    },
    {
      exerciseId: "cable_crunch",
      prescriptions: { default: "2-3x10-15", goal: { Strength: "3x8-12" } },
      cue: "A loaded trunk slot keeps bracing strong for the whole week."
    }
  ],
  full_body_balance: [
    {
      exerciseId: "hack_squat",
      prescriptions: { default: "3x6-10", goal: { Strength: "4x4-6" } },
      cue: "Open with a stable squat pattern you can recover from."
    },
    {
      exerciseId: "incline_db_press",
      prescriptions: { default: "3x6-10", goal: { Strength: "3x5-8" } },
      cue: "Get the press done early while you are fresh."
    },
    {
      exerciseId: "chest_supported_row",
      prescriptions: { default: "3x8-12", goal: { Strength: "3x6-8" } },
      cue: "One stable row keeps the back progressing without chaos."
    },
    {
      exerciseId: "romanian_deadlift",
      prescriptions: { default: "2-3x6-10", goal: { Strength: "3x5-8" } },
      cue: "Use one hinge slot, then move on."
    },
    {
      exerciseId: "cable_lateral_raise",
      prescriptions: { default: "2-3x12-20", goal: { Strength: "2x12-15" } },
      cue: "A quick delt slot rounds out the upper body."
    },
    {
      exerciseId: "rope_pressdown",
      prescriptions: { default: "2x12-15", goal: { Strength: "2x10-12" } },
      cue: "Finish with one low-cost arm slot and get out."
    }
  ]
};

function getExerciseColorToken(item = {}) {
  const lane = (item.groups || []).includes("Core") ? "core" : item.lane || "upper";
  return EXERCISE_DEMO_COLORS[lane] || EXERCISE_DEMO_COLORS.upper;
}

function buildExerciseLineArt(visual = "upper", accent = "#22c55e") {
  switch (normalizeVisualTone(visual)) {
    case "bench_press":
      return `<g stroke="${accent}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" fill="none"><line x1="38" y1="126" x2="166" y2="126" /><line x1="58" y1="126" x2="58" y2="154" /><line x1="142" y1="126" x2="142" y2="154" /><circle cx="78" cy="88" r="10" /><line x1="88" y1="88" x2="120" y2="98" /><line x1="114" y1="102" x2="136" y2="104" /><line x1="120" y1="98" x2="128" y2="84" /><line x1="108" y1="100" x2="98" y2="124" /><line x1="130" y1="82" x2="164" y2="82" /><line x1="164" y1="82" x2="176" y2="82" /><line x1="164" y1="74" x2="164" y2="90" /><line x1="176" y1="74" x2="176" y2="90" /></g>`;
    case "incline_press":
    case "machine_press":
      return `<g stroke="${accent}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" fill="none"><line x1="52" y1="136" x2="146" y2="98" /><line x1="70" y1="144" x2="70" y2="166" /><line x1="142" y1="116" x2="142" y2="166" /><circle cx="82" cy="88" r="10" /><line x1="92" y1="88" x2="116" y2="100" /><line x1="116" y1="100" x2="132" y2="92" /><line x1="116" y1="100" x2="112" y2="126" /><line x1="112" y1="126" x2="96" y2="148" /><line x1="132" y1="92" x2="160" y2="82" /><line x1="160" y1="74" x2="160" y2="90" /><line x1="172" y1="70" x2="172" y2="94" /></g>`;
    case "fly":
      return `<g stroke="${accent}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" fill="none"><circle cx="100" cy="74" r="10" /><line x1="100" y1="84" x2="100" y2="120" /><line x1="100" y1="94" x2="62" y2="86" /><line x1="100" y1="94" x2="138" y2="86" /><line x1="62" y1="86" x2="48" y2="72" /><line x1="138" y1="86" x2="152" y2="72" /><line x1="100" y1="120" x2="84" y2="156" /><line x1="100" y1="120" x2="116" y2="156" /><circle cx="44" cy="68" r="7" /><circle cx="156" cy="68" r="7" /></g>`;
    case "shoulder_press":
      return `<g stroke="${accent}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" fill="none"><circle cx="100" cy="70" r="10" /><line x1="100" y1="80" x2="100" y2="124" /><line x1="100" y1="92" x2="74" y2="112" /><line x1="100" y1="92" x2="126" y2="112" /><line x1="74" y1="112" x2="74" y2="74" /><line x1="126" y1="112" x2="126" y2="74" /><line x1="60" y1="74" x2="88" y2="74" /><line x1="112" y1="74" x2="140" y2="74" /><line x1="100" y1="124" x2="86" y2="158" /><line x1="100" y1="124" x2="114" y2="158" /></g>`;
    case "pressdown":
    case "overhead_extension":
      return `<g stroke="${accent}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" fill="none"><line x1="100" y1="34" x2="100" y2="76" /><line x1="100" y1="76" x2="72" y2="84" /><line x1="100" y1="76" x2="128" y2="84" /><line x1="72" y1="84" x2="72" y2="114" /><line x1="128" y1="84" x2="128" y2="114" /><circle cx="100" cy="96" r="22" opacity="0.18" fill="${accent}" /><circle cx="100" cy="132" r="10" /><line x1="100" y1="142" x2="100" y2="170" /><line x1="100" y1="152" x2="80" y2="170" /><line x1="100" y1="152" x2="120" y2="170" /></g>`;
    case "pull_up":
    case "pulldown":
      return `<g stroke="${accent}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" fill="none"><line x1="50" y1="44" x2="150" y2="44" /><line x1="62" y1="44" x2="62" y2="164" /><line x1="138" y1="44" x2="138" y2="164" /><circle cx="100" cy="82" r="10" /><line x1="100" y1="92" x2="100" y2="126" /><line x1="100" y1="100" x2="78" y2="76" /><line x1="100" y1="100" x2="122" y2="76" /><line x1="100" y1="126" x2="84" y2="160" /><line x1="100" y1="126" x2="116" y2="160" /><line x1="78" y1="76" x2="66" y2="56" /><line x1="122" y1="76" x2="134" y2="56" /></g>`;
    case "row":
    case "one_arm_row":
    case "rear_delt":
      return `<g stroke="${accent}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" fill="none"><line x1="48" y1="128" x2="142" y2="110" /><line x1="64" y1="128" x2="64" y2="160" /><line x1="132" y1="114" x2="132" y2="160" /><circle cx="80" cy="82" r="10" /><line x1="90" y1="82" x2="116" y2="96" /><line x1="116" y1="96" x2="136" y2="88" /><line x1="116" y1="96" x2="108" y2="126" /><line x1="108" y1="126" x2="92" y2="154" /><line x1="136" y1="88" x2="156" y2="74" /><circle cx="160" cy="70" r="8" /></g>`;
    case "squat":
    case "leg_press":
    case "lunge":
      return `<g stroke="${accent}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" fill="none"><circle cx="100" cy="58" r="10" /><line x1="100" y1="68" x2="100" y2="112" /><line x1="100" y1="80" x2="62" y2="82" /><line x1="100" y1="80" x2="138" y2="82" /><line x1="62" y1="82" x2="44" y2="76" /><line x1="138" y1="82" x2="156" y2="76" /><line x1="100" y1="112" x2="78" y2="140" /><line x1="100" y1="112" x2="126" y2="138" /><line x1="78" y1="140" x2="72" y2="168" /><line x1="126" y1="138" x2="138" y2="166" /><line x1="54" y1="50" x2="146" y2="50" /></g>`;
    case "hinge":
      return `<g stroke="${accent}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" fill="none"><circle cx="118" cy="64" r="10" /><line x1="108" y1="70" x2="86" y2="98" /><line x1="86" y1="98" x2="62" y2="122" /><line x1="88" y1="98" x2="132" y2="108" /><line x1="132" y1="108" x2="152" y2="116" /><line x1="62" y1="122" x2="54" y2="160" /><line x1="132" y1="108" x2="126" y2="160" /><line x1="58" y1="118" x2="158" y2="118" /><line x1="52" y1="118" x2="44" y2="132" /><line x1="158" y1="118" x2="166" y2="132" /></g>`;
    case "leg_curl":
    case "leg_extension":
    case "calf_raise":
      return `<g stroke="${accent}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" fill="none"><line x1="52" y1="126" x2="152" y2="126" /><line x1="64" y1="126" x2="64" y2="166" /><line x1="140" y1="126" x2="140" y2="166" /><circle cx="82" cy="86" r="10" /><line x1="92" y1="86" x2="116" y2="98" /><line x1="116" y1="98" x2="132" y2="126" /><line x1="116" y1="98" x2="106" y2="126" /><line x1="106" y1="126" x2="88" y2="152" /><line x1="132" y1="126" x2="162" y2="126" /></g>`;
    case "curl":
      return `<g stroke="${accent}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" fill="none"><circle cx="100" cy="64" r="10" /><line x1="100" y1="74" x2="100" y2="118" /><line x1="100" y1="88" x2="74" y2="104" /><line x1="100" y1="88" x2="126" y2="104" /><line x1="74" y1="104" x2="64" y2="88" /><line x1="126" y1="104" x2="136" y2="88" /><circle cx="60" cy="84" r="8" /><circle cx="140" cy="84" r="8" /><line x1="100" y1="118" x2="86" y2="158" /><line x1="100" y1="118" x2="114" y2="158" /></g>`;
    case "core":
      return `<g stroke="${accent}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" fill="none"><circle cx="88" cy="84" r="10" /><line x1="98" y1="88" x2="124" y2="100" /><line x1="124" y1="100" x2="144" y2="124" /><line x1="124" y1="100" x2="112" y2="132" /><line x1="112" y1="132" x2="92" y2="158" /><line x1="144" y1="124" x2="160" y2="154" /><line x1="42" y1="156" x2="166" y2="156" /></g>`;
    case "lateral_raise":
    default:
      return `<g stroke="${accent}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" fill="none"><circle cx="100" cy="64" r="10" /><line x1="100" y1="74" x2="100" y2="120" /><line x1="100" y1="88" x2="60" y2="82" /><line x1="100" y1="88" x2="140" y2="82" /><line x1="60" y1="82" x2="46" y2="66" /><line x1="140" y1="82" x2="154" y2="66" /><circle cx="42" cy="62" r="8" /><circle cx="158" cy="62" r="8" /><line x1="100" y1="120" x2="86" y2="158" /><line x1="100" y1="120" x2="114" y2="158" /></g>`;
  }
}

function buildExerciseDemoImage(item = {}) {
  const colors = getExerciseColorToken(item);
  const title = escapeSvgText(item.name || "Exercise demo");
  const subtitle = escapeSvgText((item.groups || []).slice(0, 2).join(" • ") || item.headline || "Movement");
  const cue = escapeSvgText(item.cue || item.supportCue || "Clean setup. Controlled reps.");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="220" height="220" viewBox="0 0 220 220" fill="none">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="220" y2="220" gradientUnits="userSpaceOnUse">
        <stop stop-color="#111827" />
        <stop offset="1" stop-color="#0f172a" />
      </linearGradient>
    </defs>
    <rect width="220" height="220" rx="26" fill="url(#bg)" />
    <rect x="14" y="14" width="192" height="192" rx="22" fill="${colors.glow}" stroke="${colors.accent}" stroke-opacity="0.42" />
    <rect x="26" y="24" width="82" height="24" rx="12" fill="${colors.accent}" fill-opacity="0.18" stroke="${colors.accent}" stroke-opacity="0.45" />
    <text x="38" y="40" fill="#e5e7eb" font-family="Arial, sans-serif" font-size="11" font-weight="700">DEMO VIEW</text>
    ${buildExerciseLineArt(item.visual || item.lane || "upper", colors.accent)}
    <text x="26" y="184" fill="#f8fafc" font-family="Arial, sans-serif" font-size="16" font-weight="700">${title}</text>
    <text x="26" y="202" fill="#cbd5e1" font-family="Arial, sans-serif" font-size="11">${subtitle}</text>
    <text x="26" y="218" fill="#94a3b8" font-family="Arial, sans-serif" font-size="10">${cue}</text>
  </svg>`;
  return svgToDataUri(svg);
}

function resolveRoutinePrescription(slot = {}, phaseType = "Maintenance", goalEmphasis = "Balanced") {
  return (
    slot?.prescriptions?.goal?.[goalEmphasis] ||
    slot?.prescriptions?.phase?.[phaseType] ||
    slot?.prescriptions?.default ||
    slot?.prescription ||
    "3x8-12"
  );
}

function getPrescriptionSetCount(prescription = "") {
  const match = String(prescription || "").match(/(\d+)(?:-(\d+))?x/i);
  const low = Number(match?.[1] || 0);
  const high = Number(match?.[2] || 0);
  const raw = high || low || 3;
  return Math.max(1, Math.min(8, raw));
}

function createLegacyRoutineItem(line = "", index = 0, fallbackLane = "upper") {
  const cleaned = String(line || "").replace(/^\d+\.\s*/, "").trim();
  if (!cleaned) return null;
  const [namePart, prescriptionPart] = cleaned.split(" — ");
  const name = (namePart || cleaned).trim();
  const prescription = (prescriptionPart || "3x8-12").trim();
  const item = {
    id: `legacy-${fallbackLane}-${index}-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    name,
    prescription,
    groups: [],
    cue: "Track your working sets and keep the reps clean.",
    lane: fallbackLane,
    visual: fallbackLane === "pull" ? "row" : fallbackLane === "lower" ? "squat" : fallbackLane === "core" ? "core" : "bench_press"
  };
  return {
    ...item,
    imageUrl: buildExerciseDemoImage(item)
  };
}

function createCoachRoutineItem(slot = {}, phaseType = "Maintenance", settings = {}, session = {}) {
  const exercise = EXERCISE_LIBRARY[slot.exerciseId] || {};
  const lane = slot.lane || exercise.lane || session.lane || getSessionFamilyFromGroups(slot.groups || exercise.groups || session.groups || []);
  const item = {
    id: slot.id || slot.exerciseId || exercise.id || `${lane}-${slot.name || exercise.name || "exercise"}`,
    exerciseId: slot.exerciseId || "",
    name: slot.name || exercise.name || "Exercise",
    prescription: resolveRoutinePrescription(slot, phaseType, settings.goalEmphasis || "Balanced"),
    cue: slot.cue || exercise.cues?.[0] || "",
    supportCue: slot.supportCue || exercise.cues?.[1] || "",
    headline: slot.headline || exercise.headline || "",
    groups: uniqueGroups([...(exercise.groups || []), ...(slot.groups || [])]),
    lane,
    visual: slot.visual || exercise.visual || (lane === "pull" ? "row" : lane === "lower" ? "squat" : lane === "core" ? "core" : "bench_press")
  };
  return {
    ...item,
    imageUrl: buildExerciseDemoImage(item)
  };
}

function serializeRoutineItems(items = []) {
  return (items || []).map((item) => ({
    id: item.id,
    exerciseId: item.exerciseId || "",
    name: item.name,
    prescription: item.prescription,
    cue: item.cue,
    supportCue: item.supportCue,
    headline: item.headline,
    groups: item.groups,
    lane: item.lane,
    visual: item.visual
  }));
}

function hydrateRoutineItems(items = [], fallbackLane = "upper") {
  return (items || [])
    .map((item, index) => {
      if (!item) return null;
      if (typeof item === "string") return createLegacyRoutineItem(item, index, fallbackLane);
      return createCoachRoutineItem({ ...item, lane: item.lane || fallbackLane }, "Maintenance", { goalEmphasis: "Balanced" }, { lane: item.lane || fallbackLane });
    })
    .filter(Boolean);
}

function buildRoutineItemsFromBlueprint(session = {}, phaseType = "Maintenance", settings = {}) {
  const tags = session.tags || [];
  let blueprintKey = session.routineKey || "";

  if (!blueprintKey) {
    if (tags.includes("full")) {
      blueprintKey = "full_body_balance";
    } else if (session.lane === "push") {
      blueprintKey = (session.groups || []).includes("Chest") ? "push_primary" : "push_secondary";
    } else if (session.lane === "pull") {
      blueprintKey = (session.groups || []).includes("Back") ? "pull_primary" : "pull_secondary";
    } else if (session.lane === "lower") {
      blueprintKey = /pump|posterior|volume|secondary/i.test(`${session.label || ""} ${(session.tags || []).join(" ")}`)
        ? "lower_secondary"
        : "lower_primary";
    } else {
      blueprintKey = "full_body_balance";
    }
  }

  const blueprint = COACH_ROUTINE_BLUEPRINTS[blueprintKey] || COACH_ROUTINE_BLUEPRINTS.full_body_balance || [];
  return blueprint.map((slot) => createCoachRoutineItem(slot, phaseType, settings, session)).filter(Boolean);
}

const PHASE_LIBRARY_TONES = {

  Bulk: {
    focus: "Growth-biased exercise order for surplus phases.",
    cues: ["Push load or reps while recovery is high.", "Use the first 2 movements as the main growth drivers."]
  },
  Cut: {
    focus: "Recovery-aware setup to hold output while bodyweight is moving down.",
    cues: ["Protect performance on the compounds first.", "Keep the session crisp and avoid junk fatigue."]
  },
  Maintenance: {
    focus: "Stable, repeatable work that is easy to recover from year-round.",
    cues: ["Stay close to your strongest repeatable patterns.", "Leave the gym feeling better than you walked in."]
  },
  "TRT Cruise": {
    focus: "Joint-friendly volume with enough work to stay productive without drama.",
    cues: ["Use calm, repeatable execution.", "Prioritize clean reps, positions, and recovery."]
  },
  Blast: {
    focus: "Performance-forward setup with extra pressure on control and recovery.",
    cues: ["Let heavy top sets lead the session.", "Keep accessories hard but clean so recovery stays readable."]
  }
};

const GROUP_LIBRARY_BASE = {
  Chest: {
    focus: "Chest gets the first clean pressing slot, then stretch-based accessory work.",
    lines: [
      "Bench Press — 4x6-10",
      "Incline DB Press — 3x8-12",
      "Cable Fly — 3x12-15",
      "Machine Chest Press or Dips — 2-3x8-12"
    ],
    phaseLines: {
      Cut: [
        "Incline Machine Press — 3-4x6-10",
        "Flat DB Press — 3x8-10",
        "Cable Fly — 2-3x12-15",
        "Push-Up Finisher — 2 sets near failure"
      ],
      Blast: [
        "Bench Press — 4x5-8",
        "Incline Smith Press — 3x6-10",
        "Weighted Dip — 3x6-10",
        "Cable Fly — 2-3x12-15"
      ]
    },
    cues: ["Own the stretch.", "Drive the press with stable shoulder position."]
  },
  Back: {
    focus: "A heavy row, a vertical pull, then lat/upper-back finishers.",
    lines: [
      "Chest-Supported Row — 4x6-10",
      "Lat Pulldown or Pull-Up — 3x8-12",
      "One-Arm Row — 3x8-12",
      "Straight-Arm Pulldown — 2-3x12-15"
    ],
    phaseLines: {
      Cut: [
        "Chest-Supported Row — 3-4x6-10",
        "Neutral-Grip Pulldown — 3x8-12",
        "Cable Row — 2-3x10-12",
        "Pullover Machine — 2x12-15"
      ],
      Blast: [
        "Weighted Pull-Up or Heavy Pulldown — 4x5-8",
        "Barbell or T-Bar Row — 4x6-10",
        "Chest-Supported Row — 3x8-12",
        "Straight-Arm Pulldown — 2-3x12-15"
      ]
    },
    cues: ["Drive elbows, not hands.", "Earn a full stretch before the next rep."]
  },
  Shoulders: {
    focus: "Pressing is supported, but lateral and rear-delt volume does the real work.",
    lines: [
      "DB Shoulder Press — 3-4x6-10",
      "Cable Lateral Raise — 4x10-20",
      "Reverse Pec Deck — 3x12-20",
      "Machine Press or Upright Cable Raise — 2-3x8-12"
    ],
    cues: ["Chase clean laterals.", "Keep tension on the delt, not momentum."]
  },
  Biceps: {
    focus: "Lengthened curls first, then denser arm work after the main pull pattern.",
    lines: [
      "Incline DB Curl — 3x8-12",
      "EZ-Bar Curl — 3x6-10",
      "Cable Curl — 2-3x10-15",
      "Hammer Curl — 2x10-12"
    ],
    cues: ["Let the arm fully lengthen.", "Stay strict through the mid-range."]
  },
  Triceps: {
    focus: "Use one overhead movement and one pressdown pattern every time.",
    lines: [
      "Overhead Cable Extension — 3x8-12",
      "EZ-Bar Skull Crusher — 3x8-10",
      "Cable Pressdown — 3x10-15",
      "Close-Grip Press or Dips — 2x6-10"
    ],
    cues: ["Control the stretch.", "Lock out hard without rushing."]
  },
  Legs: {
    focus: "One squat pattern, one hinge, one machine press, then lower-body finishers.",
    lines: [
      "Hack Squat or Back Squat — 4x5-10",
      "Romanian Deadlift — 3-4x6-10",
      "Leg Press — 3x10-15",
      "Leg Curl + Calf Raise — 3 sets each"
    ],
    phaseLines: {
      Cut: [
        "Hack Squat — 3-4x6-10",
        "Romanian Deadlift — 3x6-8",
        "Walking Lunge — 2-3x10-12 each side",
        "Seated Leg Curl + Calf Raise — 3 sets each"
      ],
      Blast: [
        "Back Squat or Pendulum Squat — 4x5-8",
        "Leg Press — 4x8-12",
        "Romanian Deadlift — 3x6-10",
        "Leg Curl + Leg Extension — 3 sets each"
      ]
    },
    cues: ["Own your brace.", "Let depth and control do the work."]
  },
  Glutes: {
    focus: "Heavy hip extension first, then unilateral glute volume.",
    lines: [
      "Barbell Hip Thrust — 4x6-10",
      "Romanian Deadlift — 3x8-10",
      "Bulgarian Split Squat — 3x8-12 each side",
      "Cable Kickback or Abduction — 2-3x12-20"
    ],
    cues: ["Pause at lockout.", "Use long steps on unilateral work."]
  },
  Hamstrings: {
    focus: "Hip hinge plus knee-flexion work so both hamstring functions get trained.",
    lines: [
      "Romanian Deadlift — 4x6-10",
      "Seated Leg Curl — 4x8-12",
      "45-Degree Back Extension — 3x10-15",
      "Slider Curl or Nordic Regression — 2x8-12"
    ],
    cues: ["Keep the hinge long.", "Make the curl controlled and honest."]
  },
  Quads: {
    focus: "Knee-dominant loading first, then constant-tension quad work.",
    lines: [
      "Hack Squat or Front Squat — 4x5-10",
      "Leg Press — 3x10-15",
      "Heel-Elevated Split Squat — 2-3x8-12 each side",
      "Leg Extension — 3-4x12-20"
    ],
    cues: ["Stay tall.", "Let the quads work through full depth."]
  },
  Calves: {
    focus: "One straight-leg pattern, one bent-knee pattern, then tibialis support.",
    lines: [
      "Standing Calf Raise — 4-5x8-12",
      "Seated Calf Raise — 4x12-15",
      "Leg Press Calf Raise — 3x10-15",
      "Tibialis Raise — 2-3x15-20"
    ],
    cues: ["Pause in the stretch.", "Finish every rep fully."]
  },
  Core: {
    focus: "Train abs with real intent, not just throwaway fatigue work.",
    lines: [
      "Cable Crunch — 4x10-15",
      "Hanging Knee Raise — 3x10-15",
      "Ab Wheel or Stability Rollout — 3x8-12",
      "Pallof Press — 2x10-12 each side"
    ],
    cues: ["Move the trunk, not just the hips.", "Breathe behind the brace."]
  },
  Forearms: {
    focus: "Grip, flexors, and extensors all get touched without wasting time.",
    lines: [
      "Hammer Curl — 3x8-12",
      "Reverse Curl — 3x10-15",
      "Wrist Curl — 2-3x15-20",
      "Farmer Carry or Dead Hang — 2-3 rounds"
    ],
    cues: ["Crush the handle.", "Do not rush the wrist work."]
  },
  "Full Body": {
    focus: "One squat, one press, one pull, one hinge, then a quick accessory finisher.",
    lines: [
      "Squat Pattern — 4x5-8",
      "Bench or Incline Press — 3-4x6-10",
      "Chest-Supported Row or Pulldown — 3-4x8-12",
      "Romanian Deadlift or Leg Curl — 3x8-10",
      "Lateral Raise or Curl/Pressdown Superset — 2-3 rounds"
    ],
    cues: ["Keep the session moving.", "Pick repeatable movements and own the basics."]
  }
};

function buildPhaseWorkoutVariant(group, phaseType = "Maintenance") {
  const base = GROUP_LIBRARY_BASE[group];
  if (!base) return null;
  const tone = PHASE_LIBRARY_TONES[phaseType] || PHASE_LIBRARY_TONES.Maintenance;
  const lines = base.phaseLines?.[phaseType] || base.lines;
  return {
    name: `${group} (${phaseType})`,
    focus: `${tone.focus} ${base.focus}`,
    plan: buildLibraryPlan(
      `${group} — ${phaseType} session`,
      lines,
      [...tone.cues, ...(base.cues || [])].slice(0, 4)
    )
  };
}

function getWorkoutVariants(group, phaseType = "Maintenance") {
  const base = WORKOUT_TEMPLATES[group]
    ? [{ name: "Evidence-based base", focus: "Reliable starting point.", plan: WORKOUT_TEMPLATES[group] }]
    : [];
  const phaseVariant = buildPhaseWorkoutVariant(group, phaseType);
  return [
    ...(phaseVariant ? [phaseVariant] : []),
    ...base,
    ...(WORKOUT_VARIATIONS[group] || []),
    ...(WORKOUT_VARIATION_EXPANSIONS[group] || [])
  ];
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
  "Total Cholesterol": {
    tier: "essential",
    unit: "mg/dL",
    low: null,
    high: 200
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


const LAB_IMPORT_ALIASES = {
  "Total Testosterone": [
    "total testosterone",
    "testosterone total",
    "testosterone, total",
    "testosterone total lc ms",
    "testosterone lc ms total"
  ],
  "Free Testosterone": [
    "free testosterone",
    "testosterone free",
    "testosterone, free",
    "free test"
  ],
  "Estradiol (Sensitive)": [
    "estradiol sensitive",
    "estradiol, sensitive",
    "sensitive estradiol",
    "estradiol ultrasensitive",
    "estradiol ultra sensitive",
    "e2 sensitive",
    "estradiol"
  ],
  Hematocrit: ["hematocrit", "hct"],
  Hemoglobin: ["hemoglobin", "hgb"],
  HDL: ["hdl cholesterol", "cholesterol hdl", "cholesterol, hdl", "hdl-c", "hdl"],
  "Total Cholesterol": ["cholesterol total", "cholesterol, total", "total cholesterol"],
  LDL: ["ldl cholesterol", "cholesterol ldl", "cholesterol, ldl", "ldl-c", "ldl"],
  Triglycerides: ["triglycerides", "triglyceride"],
  ALT: ["alanine aminotransferase", "sgpt", "alt"],
  AST: ["aspartate aminotransferase", "sgot", "ast"],
  SHBG: ["sex hormone binding globulin", "shbg"],
  Prolactin: ["prolactin"],
  PSA: ["prostate specific antigen", "prostate specific ag", "psa"],
  A1C: ["hemoglobin a1c", "hgb a1c", "glycated hemoglobin", "a1c"],
  "Fasting Glucose": ["fasting glucose", "glucose fasting", "glucose serum", "glucose"],
  Insulin: ["insulin"],
  "IGF-1": ["insulin like growth factor 1", "igf-1", "igf 1"],
  LH: ["luteinizing hormone", "lh"],
  FSH: ["follicle stimulating hormone", "fsh"],
  "DHEA-S": ["dehydroepiandrosterone sulfate", "dhea sulfate", "dhea-s", "dheas"],
  Cortisol: ["cortisol am", "cortisol total", "cortisol"]
};

const LAB_IMPORT_UNIT_MATCHERS = [
  { display: "ng/dL", regex: /ng\s*\/\s*dL/i },
  { display: "pg/mL", regex: /pg\s*\/\s*mL/i },
  { display: "%", regex: /%/ },
  { display: "g/dL", regex: /g\s*\/\s*dL/i },
  { display: "mg/dL", regex: /mg\s*\/\s*dL/i },
  { display: "U/L", regex: /U\s*\/\s*L/i },
  { display: "IU/L", regex: /IU\s*\/\s*L/i },
  { display: "nmol/L", regex: /nmol\s*\/\s*L/i },
  { display: "ng/mL", regex: /ng\s*\/\s*mL/i },
  { display: "uIU/mL", regex: /(?:u|µ)IU\s*\/\s*mL/i },
  { display: "mIU/mL", regex: /mIU\s*\/\s*mL/i },
  { display: "ug/dL", regex: /(?:u|µ|mc)g\s*\/\s*dL/i },
  { display: "mcg/dL", regex: /mcg\s*\/\s*dL/i }
];

const BODY_IMPORT_LABELS = {
  weight: "Weight",
  bodyFatPercent: "Body fat %",
  skeletalMuscleMass: "Skeletal muscle",
  visceralFatLevel: "Visceral fat level"
};

const BODY_IMPORT_ALIASES = {
  weight: ["body weight", "weight", "current weight", "body mass"],
  bodyFatPercent: ["body fat percent", "body fat %", "percent body fat", "body fat", "fat %", "pbf"],
  skeletalMuscleMass: ["skeletal muscle mass", "skeletal muscle", "muscle mass", "smm", "lean muscle mass"],
  visceralFatLevel: ["visceral fat level", "visceral fat", "visceral level"]
};

const BODY_IMPORT_UNIT_MATCHERS = [
  { display: "lb", regex: /\b(?:lb|lbs|pounds?)\b/i },
  { display: "kg", regex: /\bkg\b/i },
  { display: "%", regex: /%|percent/i },
  { display: "level", regex: /\blevel\b/i }
];

let pdfJsLoaderPromise = null;
let tesseractLoaderPromise = null;

function loadExternalScript(src, globalName) {
  return new Promise((resolve, reject) => {
    if (globalName && typeof window !== "undefined" && window[globalName]) {
      resolve(window[globalName]);
      return;
    }
    if (typeof document === "undefined") {
      reject(new Error("Browser APIs are unavailable."));
      return;
    }
    const existing = document.querySelector(`script[data-external-lib="${src}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve(globalName ? window[globalName] : true), { once: true });
      existing.addEventListener("error", () => reject(new Error(`Failed to load ${src}`)), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.dataset.externalLib = src;
    script.onload = () => resolve(globalName ? window[globalName] : true);
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(script);
  });
}

async function ensurePdfJsLib() {
  if (typeof window !== "undefined" && window.pdfjsLib) {
    if (window.pdfjsLib.GlobalWorkerOptions) {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
    }
    return window.pdfjsLib;
  }
  if (!pdfJsLoaderPromise) {
    pdfJsLoaderPromise = loadExternalScript(
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js",
      "pdfjsLib"
    ).then((lib) => {
      if (!lib) throw new Error("PDF parsing library unavailable.");
      if (lib.GlobalWorkerOptions) {
        lib.GlobalWorkerOptions.workerSrc =
          "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
      }
      return lib;
    });
  }
  return pdfJsLoaderPromise;
}

async function ensureTesseractLib() {
  if (typeof window !== "undefined" && window.Tesseract) return window.Tesseract;
  if (!tesseractLoaderPromise) {
    tesseractLoaderPromise = loadExternalScript(
      "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js",
      "Tesseract"
    ).then((lib) => {
      if (!lib) throw new Error("OCR library unavailable.");
      return lib;
    });
  }
  return tesseractLoaderPromise;
}

function normalizeLabImportText(text = "") {
  return String(text || "")
    .replace(/\u00a0/g, " ")
    .replace(/[|]+/g, " ")
    .replace(/\r/g, "")
    .replace(/(\d)[:;](\d)/g, "$1.$2")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function aliasToLooseRegex(alias) {
  const parts = String(alias || "")
    .toLowerCase()
    .replace(/[^a-z0-9%]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  return new RegExp(parts.join("[^a-z0-9%]{0,6}"), "i");
}

function parseImportNumber(raw) {
  if (raw === null || raw === undefined) return null;
  const cleaned = String(raw)
    .replace(/,/g, "")
    .replace(/^[<>~=\s]+/, "")
    .trim();
  if (!/^[-+]?\d*\.?\d+$/.test(cleaned)) return null;
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : null;
}

function formatImportNumber(value) {
  if (!Number.isFinite(Number(value))) return "";
  const numeric = Number(value);
  if (Math.abs(numeric) >= 100) return String(Math.round(numeric * 10) / 10).replace(/\.0$/, "");
  return String(Math.round(numeric * 100) / 100).replace(/(\.\d*[1-9])0+$/, "$1").replace(/\.0$/, "");
}

function valueToInputString(value) {
  if (value === null || value === undefined || value === "") return "";
  return formatImportNumber(value);
}

function parseFlexibleLabDate(raw) {
  const value = String(raw || "").trim();
  if (!value) return null;

  if (/^\d{4}[.\/-]\d{1,2}[.\/-]\d{1,2}$/.test(value)) {
    const [year, month, day] = value.split(/[.\/-]/).map(Number);
    const date = new Date(year, month - 1, day);
    return Number.isNaN(date.getTime()) ? null : localDateKey(date);
  }

  const slash = value.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if (slash) {
    let month = Number(slash[1]);
    let day = Number(slash[2]);
    let year = Number(slash[3]);
    if (year < 100) year += 2000;
    if (month > 12 && day <= 12) {
      const swap = month;
      month = day;
      day = swap;
    }
    const date = new Date(year, month - 1, day);
    return Number.isNaN(date.getTime()) ? null : localDateKey(date);
  }

  const natural = new Date(value.replace(/\.(?=\d{1,2}\b)/g, '/'));
  return Number.isNaN(natural.getTime()) ? null : localDateKey(natural);
}

function extractDateFromLabText(text) {
  const normalized = normalizeLabImportText(text);
  if (!normalized) return null;
  const lines = normalized.split("\n").map((line) => line.trim()).filter(Boolean);
  const priorityHints = [
    /collection\s*date/i,
    /collected/i,
    /draw\s*date/i,
    /specimen\s*collected/i,
    /date\s*collected/i,
    /ordered\s*on/i,
    /reported/i,
    /result\s*date/i
  ];
  const patterns = [
    /\b\d{4}[.\/-]\d{1,2}[.\/-]\d{1,2}\b/,
    /\b\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}\b/,
    /\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\s+\d{1,2},?\s+\d{4}\b/i
  ];

  for (const line of lines) {
    if (!priorityHints.some((hint) => hint.test(line))) continue;
    for (const pattern of patterns) {
      const match = line.match(pattern);
      const parsed = parseFlexibleLabDate(match?.[0]);
      if (parsed) return parsed;
    }
  }

  for (const line of lines.slice(0, 18)) {
    for (const pattern of patterns) {
      const match = line.match(pattern);
      const parsed = parseFlexibleLabDate(match?.[0]);
      if (parsed) return parsed;
    }
  }
  return null;
}

function extractUnitFromSnippet(snippet, fallbackUnit = "") {
  for (const matcher of LAB_IMPORT_UNIT_MATCHERS) {
    if (matcher.regex.test(snippet)) return matcher.display;
  }
  return fallbackUnit || "";
}

function extractRangeFromSnippet(snippet) {
  const cleaned = String(snippet || "").replace(/,/g, "");
  const between = cleaned.match(/(?:reference\s*range[:\s]*)?(-?\d+(?:\.\d+)?)\s*(?:-|–|to)\s*(-?\d+(?:\.\d+)?)/i);
  if (between) {
    return {
      low: parseImportNumber(between[1]),
      high: parseImportNumber(between[2])
    };
  }
  const lt = cleaned.match(/(?:reference\s*range[:\s]*)?(?:<=?|less than)\s*(-?\d+(?:\.\d+)?)/i);
  if (lt) {
    return {
      low: null,
      high: parseImportNumber(lt[1])
    };
  }
  const gt = cleaned.match(/(?:reference\s*range[:\s]*)?(?:>=?|greater than)\s*(-?\d+(?:\.\d+)?)/i);
  if (gt) {
    return {
      low: parseImportNumber(gt[1]),
      high: null
    };
  }
  return { low: null, high: null };
}

function extractValueAfterAlias(snippet, alias) {
  const regex = aliasToLooseRegex(alias);
  const match = regex.exec(snippet);
  if (!match) return null;
  const tail = snippet.slice(match.index + match[0].length);
  const numericMatches = [...tail.matchAll(/(^|[^\d])([<>~=]?\s*-?\d+(?:\.\d+)?)/g)];
  for (const candidate of numericMatches) {
    const raw = String(candidate[2] || "").trim();
    if (/^\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{2,4})?$/.test(raw)) continue;
    const value = parseImportNumber(raw);
    if (value === null) continue;
    return {
      value,
      raw,
      tail
    };
  }
  return null;
}

function scoreImportMatch({ alias, unit, range, tail }) {
  let score = 0.45 + Math.min(alias.length / 40, 0.2);
  if (unit) score += 0.18;
  if (Number.isFinite(range.low) || Number.isFinite(range.high)) score += 0.15;
  if (/reference\s*range/i.test(tail || "")) score += 0.08;
  if (/result|value|final/i.test(tail || "")) score += 0.04;
  return Math.max(0, Math.min(score, 0.98));
}

function confidenceLabelFromScore(score) {
  if (score >= 0.82) return "High confidence";
  if (score >= 0.62) return "Review suggested";
  return "Low confidence";
}

function extractMarkerFromLabText(text, marker, defaults = {}) {
  const aliases = LAB_IMPORT_ALIASES[marker] || [marker];
  const lines = normalizeLabImportText(text)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  let best = null;

  lines.forEach((line, index) => {
    const snippet = [lines[index - 1], line, lines[index + 1], lines[index + 2]]
      .filter(Boolean)
      .join(" ");

    aliases.forEach((alias) => {
      const valueMatch = extractValueAfterAlias(snippet, alias);
      if (!valueMatch) return;
      const unit = extractUnitFromSnippet(valueMatch.tail, defaults.unit || "");
      const range = extractRangeFromSnippet(valueMatch.tail);
      const candidate = {
        marker,
        value: valueMatch.value,
        unit: unit || defaults.unit || "",
        low: Number.isFinite(range.low) ? range.low : defaults.low ?? null,
        high: Number.isFinite(range.high) ? range.high : defaults.high ?? null,
        source: line,
        score: scoreImportMatch({ alias, unit, range, tail: valueMatch.tail })
      };
      if (!best || candidate.score > best.score) best = candidate;
    });
  });

  return best
    ? {
        ...best,
        confidence: confidenceLabelFromScore(best.score)
      }
    : null;
}

function parseAccessMedicalLabReportText(text, profile) {
  const normalized = normalizeLabImportText(text);
  if (!/access medical laboratories|gameday men/i.test(normalized)) return null;
  const defaults = getSmartLabDefaults(profile);
  const lines = normalized.split("\n").map((line) => line.trim()).filter(Boolean);
  const patterns = {
    A1C: /HEMOGLOBIN A1C\s+([0-9.]+)/i,
    Triglycerides: /TRIGLYCERIDES\s+([0-9.]+)/i,
    "Total Cholesterol": /CHOLESTEROL,\s*TOTAL\s+([0-9.]+)/i,
    HDL: /HDL CHOLESTEROL\s+([0-9.]+)/i,
    LDL: /LDL CHOLESTEROL.*?\s([0-9.]+)\s+(?:H|L|<|>|$)/i,
    TSH: /TSH\s+([0-9.]+)/i,
    FSH: /FSH\s+([0-9.]+)/i,
    LH: /LH\s+([0-9.]+)/i,
    Prolactin: /PROLACTIN\s+([0-9.]+)/i,
    "Estradiol (Sensitive)": /ESTRADIOL.*?\s([0-9.]+)\s+pg/i,
    "Total Testosterone": /TESTOSTERONE,\s*TOTAL\s+([0-9.]+)/i,
    SHBG: /SEX HORMONE BIND GLOBULIN\s+([0-9.]+)/i,
    "Free Testosterone": /TESTOSTERONE,\s*FREE\s+([0-9.]+)/i
  };
  const markerMap = {
    "Total Cholesterol": { marker: "Total Cholesterol", unit: "mg/dL" }
  };
  const matches = [];
  for (const [friendly, pattern] of Object.entries(patterns)) {
    const line = lines.find((entry) => pattern.test(entry));
    if (!line) continue;
    const hit = line.match(pattern);
    const marker = markerMap[friendly]?.marker || friendly;
    const defaultsForMarker = defaults[marker] || LAB_DEFAULTS[marker] || {};
    const unit = extractUnitFromSnippet(line, markerMap[friendly]?.unit || defaultsForMarker.unit || "");
    const range = extractRangeFromSnippet(line);
    const value = parseImportNumber(hit?.[1]);
    if (value == null) continue;
    matches.push({
      marker,
      value,
      unit: unit || defaultsForMarker.unit || "",
      low: Number.isFinite(range.low) ? range.low : defaultsForMarker.low ?? null,
      high: Number.isFinite(range.high) ? range.high : defaultsForMarker.high ?? null,
      source: line,
      score: 0.95,
      confidence: "High confidence"
    });
  }
  return {
    date: extractDateFromLabText(normalized),
    matches,
    text: normalized
  };
}

function parseLabReportText(text, profile) {
  const normalized = normalizeLabImportText(text);
  const accessMedical = parseAccessMedicalLabReportText(normalized, profile);
  const existing = new Set((accessMedical?.matches || []).map((match) => match.marker));
  const defaults = getSmartLabDefaults(profile);
  const genericMatches = Object.keys(LAB_DEFAULTS)
    .filter((marker) => !existing.has(marker))
    .map((marker) => extractMarkerFromLabText(normalized, marker, defaults[marker] || LAB_DEFAULTS[marker] || {}))
    .filter(Boolean)
    .sort((a, b) => b.score - a.score);

  return {
    date: accessMedical?.date || extractDateFromLabText(normalized),
    matches: [...(accessMedical?.matches || []), ...genericMatches],
    text: normalized
  };
}

function mergeImportedLabsIntoBatch(previousBatch, importMatches = []) {
  const next = { ...previousBatch };
  importMatches.forEach((match) => {
    const current = previousBatch[match.marker] || { value: "", low: "", high: "", unit: "" };
    next[match.marker] = {
      ...current,
      value: valueToInputString(match.value),
      low: match.low === null || match.low === undefined ? current.low : valueToInputString(match.low),
      high: match.high === null || match.high === undefined ? current.high : valueToInputString(match.high),
      unit: match.unit || current.unit || ""
    };
  });
  return next;
}

function extractBodyUnitFromSnippet(snippet = "", field = "") {
  const value = String(snippet || "");
  if (field === "bodyFatPercent") return /%|percent/i.test(value) ? "%" : "%";
  if (field === "visceralFatLevel") return /\blevel\b/i.test(value) ? "level" : "";
  for (const matcher of BODY_IMPORT_UNIT_MATCHERS) {
    if (matcher.regex.test(value)) return matcher.display;
  }
  return field === "weight" || field === "skeletalMuscleMass" ? "lb" : "";
}

function convertBodyImportValue(value, field, unit = "") {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  if ((field === "weight" || field === "skeletalMuscleMass") && unit === "kg") {
    return Math.round(numeric * 2.20462 * 10) / 10;
  }
  return numeric;
}

function scoreBodyImportMatch({ alias, unit, line, field }) {
  let score = 0.5 + Math.min(alias.length / 48, 0.16);
  if (unit) score += 0.12;
  if (/body|muscle|fat|visceral|weight/i.test(line || "")) score += 0.06;
  if (field === "visceralFatLevel" && /\blevel\b/i.test(line || "")) score += 0.14;
  return Math.max(0, Math.min(score, 0.97));
}

function extractBodyFieldFromText(text, field) {
  const aliases = BODY_IMPORT_ALIASES[field] || [];
  const lines = normalizeLabImportText(text)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  let best = null;

  lines.forEach((line, index) => {
    const snippet = [lines[index - 1], line, lines[index + 1], lines[index + 2]]
      .filter(Boolean)
      .join(" ");

    aliases.forEach((alias) => {
      const valueMatch = extractValueAfterAlias(snippet, alias);
      if (!valueMatch) return;
      const unit = extractBodyUnitFromSnippet(valueMatch.tail, field) || extractBodyUnitFromSnippet(snippet, field);
      const value = convertBodyImportValue(valueMatch.value, field, unit);
      if (value === null || value === undefined) return;
      const candidate = {
        field,
        label: BODY_IMPORT_LABELS[field] || field,
        value,
        unit: (field === "weight" || field === "skeletalMuscleMass") ? "lb" : unit || (field === "bodyFatPercent" ? "%" : field === "visceralFatLevel" ? "" : "lb"),
        source: line,
        score: scoreBodyImportMatch({ alias, unit, line: snippet, field })
      };
      if (!best || candidate.score > best.score) best = candidate;
    });
  });

  return best
    ? {
        ...best,
        confidence: confidenceLabelFromScore(best.score)
      }
    : null;
}

function buildBodyImportMatch(field, value, unit, source, score = 0.9) {
  const normalizedValue = convertBodyImportValue(value, field, unit);
  if (normalizedValue === null || normalizedValue === undefined) return null;
  return {
    field,
    label: BODY_IMPORT_LABELS[field] || field,
    value: normalizedValue,
    unit: field === "bodyFatPercent" ? "%" : field === "visceralFatLevel" ? "" : "lb",
    source: source || "InBody report",
    score,
    confidence: confidenceLabelFromScore(score)
  };
}

function getInBodyHistorySection(text) {
  const normalized = normalizeLabImportText(text);
  const match = normalized.match(/Body\s+Composition\s+History[\s\S]{0,900}/i);
  return match?.[0] || normalized;
}

function extractInBodyHistoryValue(text, label) {
  const history = getInBodyHistorySection(text);
  const fullText = String(text || "");
  const candidateLists = {
    Weight: [
      history.match(/Body\s+Composition\s+History[\s\S]{0,260}?Weight[^\d]{0,30}(\d{2,3}(?:[.:]\d)?)/i),
      history.match(/Weight\s*\(lb\)[\s\S]{0,120}?(\d{2,3}(?:[.:]\d)?)/i),
      fullText.match(/Muscle[-\s]?Fat\s+Analysis[\s\S]{0,220}?Weight[^\d]{0,30}(\d{2,3}(?:[.:]\d)?)/i),
      fullText.match(/Body\s+Composition\s+Analysis[\s\S]{0,260}?Weight[^\d]{0,30}(\d{2,3}(?:[.:]\d)?)/i),
      history.match(/Weight[\s\S]{0,40}?(\d{2,3}(?:[.:]\d)?)/i),
      fullText.match(/InBody\s+Results[\s\S]{0,240}?Weight[^\d]{0,20}(\d{2,3}(?:[.:]\d)?)/i),
      fullText.match(/Weight[^\d]{0,30}(\d{2,3}(?:[.:]\d)?)/i)
    ],
    SMM: [
      history.match(/SMM\s*\(lb\)[\s\S]{0,120}?(\d{2,3}(?:[.:]\d)?)/i),
      history.match(/Skeletal\s+Muscle\s+Mass[\s\S]{0,80}?(\d{2,3}(?:[.:]\d)?)/i),
      fullText.match(/SMM[^\d]{0,30}(\d{2,3}(?:[.:]\d)?)/i),
      fullText.match(/InBody\s+Results[\s\S]{0,420}?Skeletal\s+Muscle\s+Mass[^\d]{0,20}(\d{2,3}(?:[.:]\d)?)/i),
      fullText.match(/Skeletal\s+Muscle\s+Mass[^\d]{0,30}(\d{2,3}(?:[.:]\d)?)/i)
    ]
  };

  const candidates = (candidateLists[label] || [])
    .map((match) => parseImportNumber(String(match?.[1] || "").replace(":", ".")))
    .filter((value) => Number.isFinite(value));

  if (label === "Weight") {
    const valid = candidates.filter((value) => value > 60 && value < 700);
    return valid.sort((a, b) => Math.abs(230 - a) - Math.abs(230 - b))[0] ?? null;
  }
  if (label === "SMM") {
    const valid = candidates.filter((value) => value > 20 && value < 250);
    return valid[0] ?? null;
  }
  return candidates[0] ?? null;
}

function extractInBodyBodyFatPercent(text) {
  const history = getInBodyHistorySection(text);
  const patterns = [
    /PBF\s*\(%\)\s*(\d{1,2}(?:\.\d)?)/i,
    /Percent\s+Body\s+Fat[^\n]{0,40}?(\d{1,2}(?:\.\d)?)/i,
    /PBF\s*\(%\)[^\n]{0,120}?(\d{1,2}(?:\.\d)?)/i,
    /body\s*fat\s*%[^\n]{0,60}?(\d{1,2}(?:\.\d)?)/i,
    /InBody\s+Results[\s\S]{0,620}?Percent\s+Body\s+Fat[^\d]{0,20}(\d{1,2}(?:[.:]\d)?)/i
  ];
  for (const scope of [history, String(text || "")]) {
    for (const pattern of patterns) {
      const match = scope.match(pattern);
      const value = parseImportNumber(match?.[1]);
      if (Number.isFinite(value) && value > 1 && value < 80) return value;
    }
  }
  return null;
}

function extractInBodyVisceralFatLevel(text) {
  const patterns = [
    /Visceral\s+Fat\s+Level[\s\S]{0,80}?Level\s*(\d{1,2})\b/i,
    /Visceral\s+Fat\s+Level[\s\S]{0,80}?(\d{1,2})\s*(?:Low|High|$)/i,
    /InBody\s+Results[\s\S]{0,760}?Visceral\s+Fat\s+Level[^\d]{0,20}(\d{1,2})\b/i,
    /Level\s*(\d{1,2})\s*[—-]?\s*Basal\s+Metabolic\s+Rate/i
  ];
  for (const pattern of patterns) {
    const match = String(text || "").match(pattern);
    const value = parseImportNumber(match?.[1]);
    if (Number.isFinite(value) && value > 0 && value < 60) return value;
  }
  return null;
}

function parseInBodyReportText(text) {
  const normalized = normalizeLabImportText(text);
  if (!/\binbody\b/i.test(normalized) && !/\bPBF\b/i.test(normalized) && !/\bSMM\b/i.test(normalized)) {
    return null;
  }

  const datePatterns = [
    /\b(20\d{2}[.\/-]\d{2}[.\/-]\d{2})\b/,
    /Test\s*Date\s*\/\s*Time\s*(20\d{2}[.\/-]\d{2}[.\/-]\d{2})/i
  ];
  let detectedDate = null;
  for (const pattern of datePatterns) {
    const match = normalized.match(pattern);
    detectedDate = parseFlexibleLabDate(match?.[1] || match?.[0]);
    if (detectedDate) break;
  }

  const weight = extractInBodyHistoryValue(normalized, "Weight")
    ?? (() => {
      const match = normalized.match(/Weight[^\n]{0,120}?(\d{2,3}(?:\.\d)?)/i);
      const value = parseImportNumber(match?.[1]);
      return Number.isFinite(value) && value > 60 && value < 700 ? value : null;
    })();
  const skeletalMuscleMass = extractInBodyHistoryValue(normalized, "SMM")
    ?? (() => {
      const match = normalized.match(/SMM[^\n]{0,120}?(\d{2,3}(?:\.\d)?)/i);
      const value = parseImportNumber(match?.[1]);
      return Number.isFinite(value) && value > 20 && value < 250 ? value : null;
    })();
  const bodyFatPercent = extractInBodyBodyFatPercent(normalized);
  const visceralFatLevel = extractInBodyVisceralFatLevel(normalized);

  const matches = [
    buildBodyImportMatch("weight", weight, "lb", "InBody Weight", 0.96),
    buildBodyImportMatch("skeletalMuscleMass", skeletalMuscleMass, "lb", "InBody SMM", 0.95),
    buildBodyImportMatch("bodyFatPercent", bodyFatPercent, "%", "InBody PBF", 0.95),
    buildBodyImportMatch("visceralFatLevel", visceralFatLevel, "", "InBody Visceral Fat Level", 0.94)
  ].filter(Boolean);

  return {
    date: detectedDate || extractDateFromLabText(normalized),
    matches,
    text: normalized,
    parser: "inbody"
  };
}

function parseBodyReportText(text) {
  const normalized = normalizeLabImportText(text);
  const inBodyParsed = parseInBodyReportText(normalized);
  if (inBodyParsed?.matches?.length) return inBodyParsed;
  const matches = ["weight", "bodyFatPercent", "skeletalMuscleMass", "visceralFatLevel"]
    .map((field) => extractBodyFieldFromText(normalized, field))
    .filter(Boolean)
    .sort((a, b) => b.score - a.score);

  return {
    date: extractDateFromLabText(normalized),
    matches,
    text: normalized
  };
}

function mergeImportedBodyForm(previousForm = {}, parsed = {}) {
  const matchesByField = Object.fromEntries((parsed.matches || []).map((match) => [match.field, match]));
  return {
    ...previousForm,
    date: parsed.date || previousForm.date || todayInput(),
    weight: matchesByField.weight ? valueToInputString(matchesByField.weight.value) : previousForm.weight || "",
    bodyFatPercent: matchesByField.bodyFatPercent ? valueToInputString(matchesByField.bodyFatPercent.value) : previousForm.bodyFatPercent || "",
    skeletalMuscleMass: matchesByField.skeletalMuscleMass ? valueToInputString(matchesByField.skeletalMuscleMass.value) : previousForm.skeletalMuscleMass || "",
    visceralFatLevel: matchesByField.visceralFatLevel ? valueToInputString(matchesByField.visceralFatLevel.value) : previousForm.visceralFatLevel || ""
  };
}

async function extractPdfTextContent(file, onStageChange = () => {}) {
  const pdfjsLib = await ensurePdfJsLib();
  onStageChange("Reading PDF text…");
  const data = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data }).promise;
  let pages = [];

  for (let pageNumber = 1; pageNumber <= Math.min(pdf.numPages, 6); pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const rows = [];

    content.items.forEach((item) => {
      const str = String(item?.str || "").trim();
      if (!str) return;
      const y = Math.round((item?.transform?.[5] || 0) * 2) / 2;
      const x = item?.transform?.[4] || 0;
      let row = rows.find((entry) => Math.abs(entry.y - y) < 0.6);
      if (!row) {
        row = { y, items: [] };
        rows.push(row);
      }
      row.items.push({ x, str });
    });

    rows.sort((left, right) => right.y - left.y);
    const pageText = rows
      .map((row) => row.items.sort((left, right) => left.x - right.x).map((item) => item.str).join(" "))
      .join("\n");

    if (pageText.trim()) pages.push(pageText);
  }

  return normalizeLabImportText(pages.join("\n\n"));
}

async function prepareImageForOcr(source) {
  if (typeof document === "undefined") return source;
  try {
    const loadFromUrl = (url) => new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    });
    let canvas = null;
    if (source && typeof source.getContext === "function") {
      canvas = source;
    } else if (typeof source === "string" && source.startsWith("data:image")) {
      const img = await loadFromUrl(source);
      const scale = Math.max(1.8, 2200 / Math.max(img.width || 1, 1));
      canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return source;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    }
    if (!canvas) return source;
    const out = document.createElement("canvas");
    out.width = canvas.width;
    out.height = canvas.height;
    const ctx = out.getContext("2d", { willReadFrequently: true });
    if (!ctx) return source;
    ctx.filter = "grayscale(1) contrast(1.25) brightness(1.06)";
    ctx.drawImage(canvas, 0, 0, out.width, out.height);
    return out;
  } catch {
    return source;
  }
}

async function runImageOcr(source, onStageChange = () => {}) {
  const Tesseract = await ensureTesseractLib();
  const preparedSource = await prepareImageForOcr(source);
  onStageChange("Running OCR…");
  const { data } = await Tesseract.recognize(preparedSource, "eng", {
    logger: (message) => {
      if (message?.status === "recognizing text") {
        const pct = Math.round((message.progress || 0) * 100);
        onStageChange(`Running OCR… ${pct}%`);
      }
    }
  });
  return normalizeLabImportText(data?.text || "");
}

async function extractLabTextFromFile(file, onStageChange = () => {}) {
  const type = String(file?.type || "").toLowerCase();
  const name = String(file?.name || "").toLowerCase();

  if (type.includes("pdf") || name.endsWith(".pdf")) {
    const pdfText = await extractPdfTextContent(file, onStageChange);
    if (pdfText.replace(/\s/g, "").length >= 120) {
      return { text: pdfText, method: "PDF text" };
    }

    const pdfjsLib = await ensurePdfJsLib();
    onStageChange("PDF looks scanned — switching to OCR…");
    const data = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data }).promise;
    const parts = [];

    for (let pageNumber = 1; pageNumber <= Math.min(pdf.numPages, 3); pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 2.4 });
      const canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      await page.render({ canvasContext: context, viewport }).promise;
      const pageText = await runImageOcr(canvas, (message) => onStageChange(`Page ${pageNumber}: ${message}`));
      if (pageText) parts.push(pageText);
    }

    return { text: normalizeLabImportText(parts.join("\n\n")), method: "PDF OCR" };
  }

  if (type.startsWith("image/") || /\.(png|jpe?g|webp|gif|bmp|heic)$/i.test(name)) {
    const dataUrl = await blobToDataUrl(file);
    const text = await runImageOcr(dataUrl, onStageChange);
    return { text, method: "Image OCR" };
  }

  const text = normalizeLabImportText(await file.text());
  return { text, method: "Text import" };
}


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
  { name: "Dark chocolate square", category: "Treats", calories: 170, protein: 2, carbs: 13, fats: 12, fiber: 3 },
  { name: "Strawberries (1 cup)", category: "Fruit", calories: 49, protein: 1, carbs: 12, fats: 0, fiber: 3 },
  { name: "Raspberries (1 cup)", category: "Fruit", calories: 64, protein: 1, carbs: 15, fats: 1, fiber: 8 },
  { name: "Blackberries (1 cup)", category: "Fruit", calories: 62, protein: 2, carbs: 14, fats: 1, fiber: 8 },
  { name: "Pineapple (1 cup)", category: "Fruit", calories: 82, protein: 1, carbs: 22, fats: 0, fiber: 2 },
  { name: "Watermelon (2 cups)", category: "Fruit", calories: 90, protein: 2, carbs: 22, fats: 0, fiber: 1 },
  { name: "Grapes (1 cup)", category: "Fruit", calories: 104, protein: 1, carbs: 27, fats: 0, fiber: 1 },
  { name: "Mango (1 cup)", category: "Fruit", calories: 99, protein: 1, carbs: 25, fats: 1, fiber: 3 },
  { name: "Kiwi (2 fruit)", category: "Fruit", calories: 84, protein: 2, carbs: 20, fats: 1, fiber: 4 },
  { name: "Pear (1 medium)", category: "Fruit", calories: 101, protein: 1, carbs: 27, fats: 0, fiber: 6 },
  { name: "Peach (1 medium)", category: "Fruit", calories: 59, protein: 1, carbs: 14, fats: 0, fiber: 2 },
  { name: "Plum (2 medium)", category: "Fruit", calories: 60, protein: 1, carbs: 15, fats: 0, fiber: 2 },
  { name: "Broccoli (1 cup)", category: "Vegetables", calories: 31, protein: 3, carbs: 6, fats: 0, fiber: 2 },
  { name: "Cauliflower (1 cup)", category: "Vegetables", calories: 25, protein: 2, carbs: 5, fats: 0, fiber: 2 },
  { name: "Asparagus (1 cup)", category: "Vegetables", calories: 27, protein: 3, carbs: 5, fats: 0, fiber: 3 },
  { name: "Green beans (1 cup)", category: "Vegetables", calories: 31, protein: 2, carbs: 7, fats: 0, fiber: 3 },
  { name: "Brussels sprouts (1 cup)", category: "Vegetables", calories: 56, protein: 4, carbs: 11, fats: 1, fiber: 4 },
  { name: "Cabbage (1 cup)", category: "Vegetables", calories: 22, protein: 1, carbs: 5, fats: 0, fiber: 2 },
  { name: "Lettuce (2 cups)", category: "Vegetables", calories: 16, protein: 1, carbs: 3, fats: 0, fiber: 1 },
  { name: "Cucumber (1 cup)", category: "Vegetables", calories: 16, protein: 1, carbs: 4, fats: 0, fiber: 1 },
  { name: "Zucchini (1 cup)", category: "Vegetables", calories: 20, protein: 1, carbs: 4, fats: 0, fiber: 1 },
  { name: "Bell peppers (1 cup)", category: "Vegetables", calories: 30, protein: 1, carbs: 7, fats: 0, fiber: 2 },
  { name: "Tomatoes (1 cup)", category: "Vegetables", calories: 32, protein: 2, carbs: 7, fats: 0, fiber: 2 },
  { name: "Onions (1 cup)", category: "Vegetables", calories: 64, protein: 2, carbs: 15, fats: 0, fiber: 3 },
  { name: "Nopales (1 cup)", category: "Vegetables", calories: 14, protein: 1, carbs: 3, fats: 0, fiber: 2 },
  { name: "Mushrooms (1 cup)", category: "Vegetables", calories: 15, protein: 2, carbs: 2, fats: 0, fiber: 1 },
  { name: "Modelo Especial (12 oz)", category: "Beer", calories: 144, protein: 1, carbs: 14, fats: 0, fiber: 0 },
  { name: "Corona Extra (12 oz)", category: "Beer", calories: 148, protein: 1, carbs: 14, fats: 0, fiber: 0 },
  { name: "Pacifico (12 oz)", category: "Beer", calories: 145, protein: 1, carbs: 14, fats: 0, fiber: 0 },
  { name: "Dos Equis Lager (12 oz)", category: "Beer", calories: 131, protein: 1, carbs: 12, fats: 0, fiber: 0 },
  { name: "Tecate (12 oz)", category: "Beer", calories: 141, protein: 1, carbs: 13, fats: 0, fiber: 0 },
  { name: "Michelob Ultra (12 oz)", category: "Beer", calories: 95, protein: 1, carbs: 3, fats: 0, fiber: 0 },
  { name: "Bud Light (12 oz)", category: "Beer", calories: 110, protein: 1, carbs: 7, fats: 0, fiber: 0 },
  { name: "Budweiser (12 oz)", category: "Beer", calories: 145, protein: 1, carbs: 11, fats: 0, fiber: 0 },
  { name: "Coors Light (12 oz)", category: "Beer", calories: 102, protein: 1, carbs: 5, fats: 0, fiber: 0 },
  { name: "Miller Lite (12 oz)", category: "Beer", calories: 96, protein: 1, carbs: 3, fats: 0, fiber: 0 },
  { name: "Yuengling Lager (12 oz)", category: "Beer", calories: 127, protein: 1, carbs: 9, fats: 0, fiber: 0 },
  { name: "Carne asada (6 oz)", category: "Protein", calories: 340, protein: 36, carbs: 2, fats: 21, fiber: 0 },
  { name: "Arrachera (6 oz)", category: "Protein", calories: 330, protein: 34, carbs: 1, fats: 22, fiber: 0 },
  { name: "Picanha steak (6 oz)", category: "Protein", calories: 420, protein: 33, carbs: 0, fats: 32, fiber: 0 },
  { name: "Costillitas para asar (6 oz)", category: "Protein", calories: 410, protein: 28, carbs: 0, fats: 33, fiber: 0 },
  { name: "Pollo asado plate (1 plate)", category: "Mexican", calories: 520, protein: 42, carbs: 28, fats: 24, fiber: 4 },
  { name: "Carne asada tacos (3 tacos)", category: "Mexican", calories: 540, protein: 33, carbs: 42, fats: 26, fiber: 5 },
  { name: "Chicken fajitas (1 skillet)", category: "Mexican", calories: 610, protein: 42, carbs: 26, fats: 34, fiber: 5 },
  { name: "Steak fajitas (1 skillet)", category: "Mexican", calories: 690, protein: 39, carbs: 24, fats: 44, fiber: 5 },
  { name: "Burrito bowl with carne asada (1 bowl)", category: "Mexican", calories: 760, protein: 48, carbs: 67, fats: 30, fiber: 10 },
  { name: "Quesadilla with chicken (1 large)", category: "Mexican", calories: 710, protein: 39, carbs: 42, fats: 42, fiber: 3 },
  { name: "Pozole bowl (1 bowl)", category: "Mexican", calories: 420, protein: 28, carbs: 38, fats: 17, fiber: 5 },
  { name: "Rice and beans (1 cup each)", category: "Mexican", calories: 420, protein: 14, carbs: 79, fats: 4, fiber: 13 },
  { name: "Hattie B's hot chicken sandwich (1 sandwich)", category: "Restaurant", calories: 620, protein: 32, carbs: 48, fats: 31, fiber: 2 },
  { name: "Hattie B's tenders plate (3 tenders)", category: "Restaurant", calories: 780, protein: 44, carbs: 46, fats: 44, fiber: 2 },
  { name: "Prince's hot chicken plate (1 plate)", category: "Restaurant", calories: 860, protein: 46, carbs: 52, fats: 50, fiber: 3 },
  { name: "Martin's pulled pork sandwich (1 sandwich)", category: "Restaurant", calories: 610, protein: 32, carbs: 49, fats: 29, fiber: 2 },
  { name: "Martin's brisket plate (1 plate)", category: "Restaurant", calories: 780, protein: 46, carbs: 34, fats: 48, fiber: 3 },
  { name: "Edley's brisket tacos (2 tacos)", category: "Restaurant", calories: 560, protein: 28, carbs: 38, fats: 32, fiber: 4 },
  { name: "Edley's pulled pork nachos (1 order)", category: "Restaurant", calories: 980, protein: 41, carbs: 78, fats: 54, fiber: 8 },
  { name: "Waffle House All-Star Special (1 plate)", category: "Restaurant", calories: 1050, protein: 32, carbs: 109, fats: 54, fiber: 3 },
  { name: "Cracker Barrel grilled chicken tenders (1 order)", category: "Restaurant", calories: 540, protein: 62, carbs: 18, fats: 22, fiber: 4 },
  { name: "Chili's Oldtimer burger (1 burger)", category: "Restaurant", calories: 790, protein: 38, carbs: 48, fats: 47, fiber: 3 },
  { name: "Cook Out tray burger and fries (1 tray)", category: "Fast Food", calories: 940, protein: 32, carbs: 101, fats: 44, fiber: 6 },
  { name: "Zaxby's chicken fingers plate (1 plate)", category: "Fast Food", calories: 1120, protein: 53, carbs: 84, fats: 64, fiber: 5 },
  { name: "Raising Cane's Box Combo (1 combo)", category: "Fast Food", calories: 1290, protein: 48, carbs: 101, fats: 76, fiber: 5 },
  { name: "Five Guys cheeseburger (1 burger)", category: "Fast Food", calories: 980, protein: 45, carbs: 40, fats: 62, fiber: 2 },
  { name: "Whataburger Patty Melt (1 burger)", category: "Fast Food", calories: 940, protein: 36, carbs: 63, fats: 58, fiber: 3 },
  { name: "Subway footlong turkey (1 sandwich)", category: "Fast Food", calories: 560, protein: 36, carbs: 92, fats: 8, fiber: 10 },
  { name: "Panera chipotle chicken avocado melt (1 sandwich)", category: "Restaurant", calories: 900, protein: 45, carbs: 76, fats: 47, fiber: 8 },
  { name: "Orange (1 medium)", category: "Fruit", calories: 62, protein: 1, carbs: 15, fats: 0, fiber: 3 },
  { name: "Cantaloupe (1 cup)", category: "Fruit", calories: 54, protein: 1, carbs: 13, fats: 0, fiber: 1 },
  { name: "Honeydew (1 cup)", category: "Fruit", calories: 61, protein: 1, carbs: 16, fats: 0, fiber: 1 },
  { name: "Cherries (1 cup)", category: "Fruit", calories: 97, protein: 2, carbs: 25, fats: 0, fiber: 3 },
  { name: "Papaya (1 cup)", category: "Fruit", calories: 62, protein: 1, carbs: 16, fats: 0, fiber: 3 },
  { name: "Spinach (2 cups)", category: "Vegetables", calories: 14, protein: 2, carbs: 2, fats: 0, fiber: 1 },
  { name: "Kale (1 cup)", category: "Vegetables", calories: 33, protein: 3, carbs: 7, fats: 1, fiber: 1 },
  { name: "Carrots (1 cup)", category: "Vegetables", calories: 52, protein: 1, carbs: 12, fats: 0, fiber: 4 },
  { name: "Celery (2 cups)", category: "Vegetables", calories: 32, protein: 1, carbs: 6, fats: 0, fiber: 3 },
  { name: "Jalapenos (1 cup)", category: "Vegetables", calories: 27, protein: 1, carbs: 6, fats: 0, fiber: 2 },
  { name: "Guinness Draught (12 oz)", category: "Beer", calories: 125, protein: 1, carbs: 10, fats: 0, fiber: 0 },
  { name: "Margarita (8 oz)", category: "Cocktails", calories: 274, protein: 0, carbs: 25, fats: 0, fiber: 0 },
  { name: "Taco truck carne asada burrito (1 burrito)", category: "Mexican", calories: 830, protein: 41, carbs: 79, fats: 36, fiber: 8 },
  { name: "Street tacos al pastor (4 tacos)", category: "Mexican", calories: 640, protein: 30, carbs: 54, fats: 30, fiber: 5 },
  { name: "Chuys chicken fajita plate (1 plate)", category: "Restaurant", calories: 820, protein: 49, carbs: 49, fats: 45, fiber: 8 },
  { name: "Chuys steak burrito (1 burrito)", category: "Restaurant", calories: 930, protein: 40, carbs: 84, fats: 48, fiber: 8 },
  { name: "Taco Mama chicken bowl (1 bowl)", category: "Restaurant", calories: 690, protein: 41, carbs: 58, fats: 28, fiber: 9 },
  { name: "Mission BBQ brisket plate (1 plate)", category: "Restaurant", calories: 760, protein: 52, carbs: 32, fats: 44, fiber: 3 }
];


const FOOD_LIBRARY_SUPERSET = [
  { name: "Chicken wings (6 flats/drums)", category: "Protein", calories: 520, protein: 36, carbs: 0, fats: 40, fiber: 0 },
  { name: "Boneless wings (8 pieces)", category: "Fast Food", calories: 620, protein: 28, carbs: 34, fats: 40, fiber: 1 },
  { name: "Buffalo wings (10 pieces)", category: "Fast Food", calories: 860, protein: 52, carbs: 6, fats: 68, fiber: 0 },
  { name: "Lemon pepper wings (10 pieces)", category: "Fast Food", calories: 900, protein: 54, carbs: 8, fats: 71, fiber: 0 },
  { name: "Carnitas (6 oz)", category: "Protein", calories: 360, protein: 31, carbs: 1, fats: 26, fiber: 0 },
  { name: "Carnitas tacos (3 tacos)", category: "Mexican", calories: 570, protein: 31, carbs: 39, fats: 29, fiber: 5 },
  { name: "Carnitas burrito (1 burrito)", category: "Mexican", calories: 840, protein: 40, carbs: 81, fats: 38, fiber: 8 },
  { name: "Carnitas plate with rice and beans (1 plate)", category: "Mexican", calories: 910, protein: 44, carbs: 83, fats: 42, fiber: 10 },
  { name: "Pollo asado (6 oz)", category: "Protein", calories: 270, protein: 44, carbs: 1, fats: 9, fiber: 0 },
  { name: "Al pastor (6 oz)", category: "Protein", calories: 320, protein: 30, carbs: 5, fats: 20, fiber: 0 },
  { name: "Barbacoa (6 oz)", category: "Protein", calories: 340, protein: 29, carbs: 2, fats: 24, fiber: 0 },
  { name: "Birria tacos with consome (3 tacos)", category: "Mexican", calories: 690, protein: 36, carbs: 33, fats: 44, fiber: 4 },
  { name: "Quesabirria tacos (3 tacos)", category: "Mexican", calories: 780, protein: 40, carbs: 36, fats: 52, fiber: 4 },
  { name: "Chile verde pork plate (1 plate)", category: "Mexican", calories: 610, protein: 36, carbs: 28, fats: 38, fiber: 5 },
  { name: "Migas plate (1 plate)", category: "Breakfast", calories: 540, protein: 26, carbs: 34, fats: 34, fiber: 4 },
  { name: "Huevos rancheros (1 plate)", category: "Breakfast", calories: 520, protein: 23, carbs: 38, fats: 30, fiber: 7 },
  { name: "Machaca breakfast burrito (1 burrito)", category: "Breakfast", calories: 670, protein: 38, carbs: 48, fats: 34, fiber: 5 },
  { name: "Tamales verdes (2 tamales)", category: "Mexican", calories: 560, protein: 18, carbs: 61, fats: 27, fiber: 4 },
  { name: "Elote cup (1 cup)", category: "Mexican", calories: 310, protein: 8, carbs: 28, fats: 18, fiber: 3 },
  { name: "Chicken fajita quesadilla (1 large)", category: "Mexican", calories: 760, protein: 42, carbs: 46, fats: 42, fiber: 3 },
  { name: "Carne asada fries (1 tray)", category: "Mexican", calories: 1180, protein: 42, carbs: 87, fats: 72, fiber: 7 },
  { name: "Pupusas revueltas (3 pupusas)", category: "Meals", calories: 690, protein: 24, carbs: 72, fats: 33, fiber: 6 },
  { name: "Chicken tenders (4 tenders)", category: "Fast Food", calories: 540, protein: 31, carbs: 28, fats: 34, fiber: 1 },
  { name: "Grilled chicken nuggets (12 count)", category: "Fast Food", calories: 200, protein: 38, carbs: 2, fats: 4, fiber: 0 },
  { name: "Chick-fil-A sandwich (1 sandwich)", category: "Fast Food", calories: 440, protein: 29, carbs: 41, fats: 19, fiber: 2 },
  { name: "Chick-fil-A nuggets (12 count)", category: "Fast Food", calories: 380, protein: 40, carbs: 16, fats: 18, fiber: 1 },
  { name: "McDonald's McDouble (1 burger)", category: "Fast Food", calories: 400, protein: 22, carbs: 33, fats: 20, fiber: 2 },
  { name: "McDonald's 10 piece nuggets (1 order)", category: "Fast Food", calories: 410, protein: 24, carbs: 26, fats: 25, fiber: 1 },
  { name: "Taco Bell Crunchwrap Supreme (1 wrap)", category: "Fast Food", calories: 540, protein: 16, carbs: 71, fats: 21, fiber: 6 },
  { name: "Chipotle chicken bowl (1 bowl)", category: "Restaurant", calories: 760, protein: 52, carbs: 63, fats: 31, fiber: 12 },
  { name: "Chipotle steak burrito (1 burrito)", category: "Restaurant", calories: 1080, protein: 54, carbs: 103, fats: 48, fiber: 12 },
  { name: "Sonic cheeseburger (1 burger)", category: "Fast Food", calories: 720, protein: 30, carbs: 48, fats: 42, fiber: 2 },
  { name: "Cook Out chicken quesadilla tray (1 tray)", category: "Fast Food", calories: 1040, protein: 34, carbs: 102, fats: 56, fiber: 4 },
  { name: "Waffle House Texas bacon patty melt (1 melt)", category: "Restaurant", calories: 925, protein: 43, carbs: 64, fats: 54, fiber: 4 },
  { name: "Premier Protein shake (11 fl oz)", category: "Protein", calories: 160, protein: 30, carbs: 5, fats: 3, fiber: 1 },
  { name: "Core Power Elite shake (14 fl oz)", category: "Protein", calories: 230, protein: 42, carbs: 8, fats: 3, fiber: 1 },
  { name: "Muscle Milk Pro Series (14 fl oz)", category: "Protein", calories: 200, protein: 32, carbs: 9, fats: 4.5, fiber: 1 },
  { name: "Quest protein shake (11 fl oz)", category: "Protein", calories: 170, protein: 30, carbs: 4, fats: 3, fiber: 1 },
  { name: "Slate high protein shake (11 fl oz)", category: "Protein", calories: 120, protein: 20, carbs: 10, fats: 1, fiber: 0 },
  { name: "OWYN protein shake (12 fl oz)", category: "Protein", calories: 180, protein: 20, carbs: 8, fats: 7, fiber: 5 },
  { name: "Ensure Max Protein (11 fl oz)", category: "Protein", calories: 150, protein: 30, carbs: 6, fats: 1.5, fiber: 4 },
  { name: "Fairlife Core Power chocolate (14 fl oz)", category: "Protein", calories: 170, protein: 26, carbs: 8, fats: 4, fiber: 1 },
  { name: "Chicken thigh (6 oz)", category: "Protein", calories: 330, protein: 38, carbs: 0, fats: 18, fiber: 0 },
  { name: "Ground chicken (6 oz)", category: "Protein", calories: 280, protein: 31, carbs: 0, fats: 16, fiber: 0 },
  { name: "Rotisserie chicken dark meat (6 oz)", category: "Protein", calories: 360, protein: 39, carbs: 0, fats: 22, fiber: 0 },
  { name: "Turkey sandwich deli style (1 sandwich)", category: "Meals", calories: 420, protein: 30, carbs: 42, fats: 14, fiber: 5 },
  { name: "Cheese pizza (3 slices)", category: "Fast Food", calories: 855, protein: 36, carbs: 108, fats: 30, fiber: 6 },
  { name: "Pepperoni pizza (3 slices)", category: "Fast Food", calories: 930, protein: 39, carbs: 105, fats: 39, fiber: 6 },
  { name: "Avocado (1 medium)", category: "Fats", calories: 240, protein: 3, carbs: 13, fats: 22, fiber: 10 },
  { name: "Salsa roja (1/4 cup)", category: "Condiments", calories: 20, protein: 1, carbs: 4, fats: 0, fiber: 1 },
  { name: "Guacamole (1/4 cup)", category: "Fats", calories: 110, protein: 1, carbs: 6, fats: 10, fiber: 4 },
  { name: "Modelo Negra (12 oz)", category: "Beer", calories: 170, protein: 2, carbs: 16, fats: 0, fiber: 0 },
  { name: "Victoria cerveza (12 oz)", category: "Beer", calories: 135, protein: 1, carbs: 12, fats: 0, fiber: 0 },
  { name: "Estrella Jalisco (12 oz)", category: "Beer", calories: 140, protein: 1, carbs: 12, fats: 0, fiber: 0 },
  { name: "Budweiser Chelada (12 oz)", category: "Beer", calories: 151, protein: 1, carbs: 14, fats: 0, fiber: 0 },
  { name: "Chicken wing platter (10 bone-in wings)", category: "Fast Food", calories: 960, protein: 56, carbs: 10, fats: 76, fiber: 0 },
  { name: "Garlic parmesan wings (10 pieces)", category: "Fast Food", calories: 910, protein: 50, carbs: 8, fats: 72, fiber: 0 },
  { name: "Hot honey wings (8 pieces)", category: "Fast Food", calories: 760, protein: 38, carbs: 18, fats: 56, fiber: 0 },
  { name: "Smoked wings (6 pieces)", category: "Protein", calories: 430, protein: 38, carbs: 2, fats: 30, fiber: 0 },
  { name: "Carnitas torta (1 torta)", category: "Mexican", calories: 780, protein: 35, carbs: 62, fats: 40, fiber: 5 },
  { name: "Carnitas quesadilla (1 large)", category: "Mexican", calories: 720, protein: 34, carbs: 42, fats: 44, fiber: 3 },
  { name: "Carne asada tacos street style (4 tacos)", category: "Mexican", calories: 640, protein: 36, carbs: 42, fats: 35, fiber: 5 },
  { name: "Arrachera tacos (4 tacos)", category: "Mexican", calories: 690, protein: 39, carbs: 44, fats: 37, fiber: 5 },
  { name: "Costillitas para asar (8 oz)", category: "Protein", calories: 590, protein: 32, carbs: 0, fats: 50, fiber: 0 },
  { name: "Picanha steak grilled (8 oz)", category: "Protein", calories: 540, protein: 43, carbs: 0, fats: 40, fiber: 0 },
  { name: "Pollo con arroz plate (1 plate)", category: "Meals", calories: 650, protein: 42, carbs: 58, fats: 24, fiber: 4 },
  { name: "Menudo (2 cups)", category: "Mexican", calories: 320, protein: 24, carbs: 14, fats: 18, fiber: 2 },
  { name: "Pozole rojo (2 cups)", category: "Mexican", calories: 390, protein: 24, carbs: 33, fats: 16, fiber: 4 },
  { name: "Caldo de res (2 cups)", category: "Mexican", calories: 280, protein: 24, carbs: 12, fats: 14, fiber: 3 },
  { name: "Caldo de pollo (2 cups)", category: "Mexican", calories: 240, protein: 22, carbs: 10, fats: 11, fiber: 2 },
  { name: "Nopal salad (1 cup)", category: "Vegetables", calories: 70, protein: 2, carbs: 9, fats: 3, fiber: 4 },
  { name: "Mexican rice (1 cup)", category: "Carbs", calories: 230, protein: 4, carbs: 45, fats: 4, fiber: 2 },
  { name: "Refried beans (1 cup)", category: "Carbs", calories: 235, protein: 12, carbs: 31, fats: 8, fiber: 10 },
  { name: "Charro beans (1 cup)", category: "Carbs", calories: 180, protein: 10, carbs: 22, fats: 6, fiber: 8 },
  { name: "Flour tortillas street size (4 tortillas)", category: "Carbs", calories: 320, protein: 8, carbs: 52, fats: 8, fiber: 4 },
  { name: "Corn tortillas (4 tortillas)", category: "Carbs", calories: 220, protein: 6, carbs: 44, fats: 3, fiber: 6 },
  { name: "Chicken breast grilled (8 oz)", category: "Protein", calories: 370, protein: 70, carbs: 0, fats: 8, fiber: 0 },
  { name: "Ground beef 90/10 (6 oz)", category: "Protein", calories: 340, protein: 33, carbs: 0, fats: 22, fiber: 0 },
  { name: "Top sirloin steak (8 oz)", category: "Protein", calories: 470, protein: 52, carbs: 0, fats: 28, fiber: 0 },
  { name: "Ribeye steak (8 oz)", category: "Protein", calories: 620, protein: 46, carbs: 0, fats: 48, fiber: 0 },
  { name: "Buffalo chicken wrap (1 wrap)", category: "Meals", calories: 610, protein: 36, carbs: 42, fats: 30, fiber: 4 },
  { name: "Chicken Alfredo pasta (1 bowl)", category: "Meals", calories: 820, protein: 39, carbs: 74, fats: 40, fiber: 4 },
  { name: "Spaghetti with meat sauce (1 bowl)", category: "Meals", calories: 670, protein: 31, carbs: 78, fats: 24, fiber: 6 },
  { name: "Cheeseburger with fries (1 basket)", category: "Meals", calories: 1080, protein: 37, carbs: 92, fats: 62, fiber: 7 },
  { name: "Club sandwich (1 sandwich)", category: "Meals", calories: 620, protein: 32, carbs: 45, fats: 33, fiber: 4 },
  { name: "Chicken Caesar salad (1 large)", category: "Meals", calories: 540, protein: 34, carbs: 18, fats: 36, fiber: 5 },
  { name: "Whey isolate shake (1 scoop)", category: "Protein", calories: 120, protein: 25, carbs: 2, fats: 1, fiber: 0 },
  { name: "Gold Standard whey (1 scoop)", category: "Protein", calories: 120, protein: 24, carbs: 3, fats: 1, fiber: 1 },
  { name: "Dymatize ISO100 (1 scoop)", category: "Protein", calories: 110, protein: 25, carbs: 1, fats: 0, fiber: 0 },
  { name: "Fairlife Nutrition Plan shake (11.5 fl oz)", category: "Protein", calories: 150, protein: 30, carbs: 4, fats: 2.5, fiber: 2 },
  { name: "Alani Nu protein shake (12 fl oz)", category: "Protein", calories: 140, protein: 20, carbs: 6, fats: 4, fiber: 3 },
  { name: "Bud Light (12 oz)", category: "Beer", calories: 110, protein: 1, carbs: 7, fats: 0, fiber: 0 },
  { name: "Michelob Ultra (12 oz)", category: "Beer", calories: 95, protein: 1, carbs: 2.6, fats: 0, fiber: 0 },
  { name: "Coors Light (12 oz)", category: "Beer", calories: 102, protein: 1, carbs: 5, fats: 0, fiber: 0 },
  { name: "Miller Lite (12 oz)", category: "Beer", calories: 96, protein: 1, carbs: 3.2, fats: 0, fiber: 0 },
  { name: "Corona Extra (12 oz)", category: "Beer", calories: 148, protein: 1, carbs: 14, fats: 0, fiber: 0 },
  { name: "Corona Premier (12 oz)", category: "Beer", calories: 90, protein: 1, carbs: 2.6, fats: 0, fiber: 0 },
  { name: "Modelo Especial (12 oz)", category: "Beer", calories: 143, protein: 1, carbs: 13.6, fats: 0, fiber: 0 },
  { name: "Pacifico (12 oz)", category: "Beer", calories: 146, protein: 1, carbs: 13, fats: 0, fiber: 0 },
  { name: "Mango (1 cup)", category: "Fruit", calories: 99, protein: 1, carbs: 25, fats: 1, fiber: 3 },
  { name: "Pineapple (1 cup)", category: "Fruit", calories: 82, protein: 1, carbs: 22, fats: 0, fiber: 2 },
  { name: "Watermelon (2 cups)", category: "Fruit", calories: 91, protein: 2, carbs: 23, fats: 0, fiber: 1 },
  { name: "Cucumber (1 cup)", category: "Vegetables", calories: 16, protein: 1, carbs: 4, fats: 0, fiber: 1 },
  { name: "Zucchini (1 cup)", category: "Vegetables", calories: 20, protein: 1, carbs: 4, fats: 0, fiber: 1 },
  { name: "Bell peppers (1 cup)", category: "Vegetables", calories: 30, protein: 1, carbs: 7, fats: 0, fiber: 2 },
  { name: "Chicken wings buffalo (6 pieces)", category: "Meals", calories: 560, protein: 34, carbs: 6, fats: 42, fiber: 0 },
  { name: "Boneless wings (8 pieces)", category: "Meals", calories: 610, protein: 29, carbs: 36, fats: 38, fiber: 2 },
  { name: "Chicken tenders (4 tenders)", category: "Meals", calories: 540, protein: 32, carbs: 28, fats: 32, fiber: 2 },
  { name: "Chicken nuggets (10 nuggets)", category: "Meals", calories: 470, protein: 24, carbs: 28, fats: 29, fiber: 2 },
  { name: "Carnitas street tacos (4 tacos)", category: "Mexican", calories: 720, protein: 36, carbs: 46, fats: 40, fiber: 5 },
  { name: "Birria tacos with consommé (3 tacos)", category: "Mexican", calories: 690, protein: 34, carbs: 33, fats: 43, fiber: 4 },
  { name: "Barbacoa tacos (4 tacos)", category: "Mexican", calories: 640, protein: 38, carbs: 40, fats: 34, fiber: 5 },
  { name: "Al pastor tacos (4 tacos)", category: "Mexican", calories: 620, protein: 34, carbs: 44, fats: 31, fiber: 5 },
  { name: "Carne asada fries (1 tray)", category: "Mexican", calories: 980, protein: 38, carbs: 84, fats: 56, fiber: 7 },
  { name: "Quesabirria tacos (3 tacos)", category: "Mexican", calories: 760, protein: 39, carbs: 36, fats: 49, fiber: 4 },
  { name: "Carnitas torta ahogada (1 sandwich)", category: "Mexican", calories: 860, protein: 38, carbs: 66, fats: 45, fiber: 5 },
  { name: "Pozole rojo (1 bowl)", category: "Mexican", calories: 360, protein: 24, carbs: 32, fats: 15, fiber: 4 },
  { name: "Menudo (1 bowl)", category: "Mexican", calories: 300, protein: 19, carbs: 16, fats: 17, fiber: 2 },
  { name: "Tamales (2 tamales)", category: "Mexican", calories: 520, protein: 16, carbs: 52, fats: 26, fiber: 5 },
  { name: "Elote (1 ear)", category: "Mexican", calories: 240, protein: 7, carbs: 27, fats: 12, fiber: 3 },
  { name: "Esquites (1 cup)", category: "Mexican", calories: 280, protein: 8, carbs: 29, fats: 15, fiber: 4 },
  { name: "Chicharrones pork rinds (1 oz)", category: "Protein", calories: 160, protein: 17, carbs: 0, fats: 9, fiber: 0 },
  { name: "Nopales salad (1 cup)", category: "Vegetables", calories: 40, protein: 2, carbs: 8, fats: 0, fiber: 3 },
  { name: "Avocado salsa (1/4 cup)", category: "Fats", calories: 90, protein: 1, carbs: 4, fats: 8, fiber: 3 },
  { name: "Cottage cheese 2% (1 cup)", category: "Protein", calories: 180, protein: 26, carbs: 8, fats: 5, fiber: 0 },
  { name: "Greek yogurt nonfat vanilla (1 cup)", category: "Protein", calories: 140, protein: 20, carbs: 10, fats: 0, fiber: 0 },
  { name: "Core Power Elite vanilla (14 fl oz)", category: "Protein", calories: 230, protein: 42, carbs: 9, fats: 3.5, fiber: 1 },
  { name: "Orgain protein shake (11 fl oz)", category: "Protein", calories: 150, protein: 20, carbs: 12, fats: 4, fiber: 3 },
  { name: "Ensure Max Protein (11 fl oz)", category: "Protein", calories: 150, protein: 30, carbs: 6, fats: 1.5, fiber: 4 },
  { name: "Atkins Plus shake (16 fl oz)", category: "Protein", calories: 350, protein: 30, carbs: 7, fats: 20, fiber: 7 },
  { name: "Shamrock Farms Rockin Protein (12 fl oz)", category: "Protein", calories: 190, protein: 30, carbs: 9, fats: 3.5, fiber: 1 },
  { name: "Ghost protein RTD (11 fl oz)", category: "Protein", calories: 170, protein: 25, carbs: 8, fats: 4, fiber: 1 },
  { name: "Pizza pepperoni (2 slices)", category: "Meals", calories: 620, protein: 26, carbs: 62, fats: 28, fiber: 4 },
  { name: "Pizza cheese (2 slices)", category: "Meals", calories: 540, protein: 22, carbs: 60, fats: 22, fiber: 4 },
  { name: "McDonald's Quarter Pounder with Cheese (1 burger)", category: "Fast Food", calories: 520, protein: 30, carbs: 42, fats: 26, fiber: 3 },
  { name: "McDonald's 10-piece Chicken McNuggets (1 order)", category: "Fast Food", calories: 410, protein: 23, carbs: 26, fats: 25, fiber: 1 },
  { name: "Chick-fil-A sandwich (1 sandwich)", category: "Fast Food", calories: 440, protein: 28, carbs: 41, fats: 19, fiber: 2 },
  { name: "Chick-fil-A nuggets 12-count (1 order)", category: "Fast Food", calories: 390, protein: 40, carbs: 16, fats: 18, fiber: 1 },
  { name: "Chipotle chicken bowl with rice and beans (1 bowl)", category: "Fast Food", calories: 760, protein: 48, carbs: 70, fats: 29, fiber: 15 },
  { name: "Chipotle steak bowl with rice and beans (1 bowl)", category: "Fast Food", calories: 780, protein: 46, carbs: 71, fats: 31, fiber: 15 },
  { name: "Taco Bell Crunchwrap Supreme (1 item)", category: "Fast Food", calories: 540, protein: 16, carbs: 71, fats: 21, fiber: 6 },
  { name: "Taco Bell Chicken Quesadilla (1 item)", category: "Fast Food", calories: 510, protein: 27, carbs: 38, fats: 27, fiber: 4 },
  { name: "Raising Cane's Box Combo (1 combo)", category: "Fast Food", calories: 1290, protein: 48, carbs: 136, fats: 64, fiber: 7 },
  { name: "Zaxby's 5 Chicken Finger Plate (1 plate)", category: "Fast Food", calories: 1190, protein: 53, carbs: 101, fats: 63, fiber: 7 },
  { name: "Cook Out tray with burger fries and hushpuppies (1 tray)", category: "Fast Food", calories: 1320, protein: 37, carbs: 145, fats: 69, fiber: 9 },
  { name: "Whataburger Patty Melt (1 burger)", category: "Fast Food", calories: 940, protein: 41, carbs: 63, fats: 57, fiber: 3 },
  { name: "Modelo Negra (12 oz)", category: "Beer", calories: 169, protein: 2, carbs: 16, fats: 0, fiber: 0 },
  { name: "Dos Equis Lager (12 oz)", category: "Beer", calories: 131, protein: 1, carbs: 12, fats: 0, fiber: 0 },
  { name: "Tecate (12 oz)", category: "Beer", calories: 141, protein: 1, carbs: 13, fats: 0, fiber: 0 },
  { name: "Victoria beer (12 oz)", category: "Beer", calories: 135, protein: 1, carbs: 12, fats: 0, fiber: 0 },
  { name: "Mango chamoy cup (1 cup)", category: "Fruit", calories: 180, protein: 1, carbs: 42, fats: 1, fiber: 5 },
  { name: "Papaya (1 cup)", category: "Fruit", calories: 62, protein: 1, carbs: 16, fats: 0, fiber: 3 },
  { name: "Jicama sticks (1 cup)", category: "Vegetables", calories: 49, protein: 1, carbs: 12, fats: 0, fiber: 6 },
  { name: "Cabbage cooked (1 cup)", category: "Vegetables", calories: 34, protein: 1, carbs: 8, fats: 0, fiber: 4 },
  { name: "Cauliflower (1 cup)", category: "Vegetables", calories: 29, protein: 2, carbs: 5, fats: 0, fiber: 2 }
];

const FOOD_LIBRARY_CURATED_ADDITIONS = [
  { name: "Dried mango (1 oz)", category: "Snacks", calories: 90, protein: 0, carbs: 23, fats: 0, fiber: 2 },
  { name: "Steak taco (1 taco)", category: "Mexican", calories: 180, protein: 11, carbs: 15, fats: 8, fiber: 2 },
  { name: "Carnitas taco (1 taco)", category: "Mexican", calories: 190, protein: 9, carbs: 15, fats: 10, fiber: 1 },
  { name: "Chicken taco (1 taco)", category: "Mexican", calories: 165, protein: 11, carbs: 15, fats: 6, fiber: 2 },
  { name: "Muscle Milk Genuine (14 fl oz)", category: "Protein", calories: 160, protein: 25, carbs: 9, fats: 4.5, fiber: 1 },
  { name: "Muscle Milk Pro Series (14 fl oz)", category: "Protein", calories: 200, protein: 32, carbs: 9, fats: 4.5, fiber: 1 },
  { name: "Premier Protein shake (11 fl oz)", category: "Protein", calories: 160, protein: 30, carbs: 5, fats: 3, fiber: 1 },
  { name: "Quest protein shake (11 fl oz)", category: "Protein", calories: 170, protein: 30, carbs: 4, fats: 3, fiber: 1 },
  { name: "Isopure Zero Carb RTD (20 fl oz)", category: "Protein", calories: 160, protein: 40, carbs: 0, fats: 0, fiber: 0 },
  { name: "Pizza Hut pepperoni slice (1 slice)", category: "Fast Food", calories: 300, protein: 12, carbs: 33, fats: 13, fiber: 2 },
  { name: "Domino's pepperoni slice (1 slice)", category: "Fast Food", calories: 298, protein: 12, carbs: 34, fats: 13, fiber: 2 },
  { name: "Papa Johns pepperoni slice (1 slice)", category: "Fast Food", calories: 320, protein: 13, carbs: 36, fats: 14, fiber: 2 },
  { name: "Little Caesars pepperoni slice (1 slice)", category: "Fast Food", calories: 280, protein: 12, carbs: 29, fats: 11, fiber: 2 },
  { name: "C4 Energy (16 fl oz)", category: "Energy", calories: 0, protein: 0, carbs: 0, fats: 0, fiber: 0 },
  { name: "C4 Smart Energy (12 fl oz)", category: "Energy", calories: 0, protein: 0, carbs: 0, fats: 0, fiber: 0 },
  { name: "Celsius Live Fit (12 fl oz)", category: "Energy", calories: 10, protein: 0, carbs: 2, fats: 0, fiber: 0 },
  { name: "Uptime Energy original (12 fl oz)", category: "Energy", calories: 150, protein: 0, carbs: 39, fats: 0, fiber: 0 },
  { name: "Alani Nu Energy (12 fl oz)", category: "Energy", calories: 10, protein: 0, carbs: 3, fats: 0, fiber: 0 },
  { name: "Doritos Nacho Cheese (1 oz)", category: "Snacks", calories: 150, protein: 2, carbs: 18, fats: 8, fiber: 1 },
  { name: "Doritos Cool Ranch (1 oz)", category: "Snacks", calories: 150, protein: 2, carbs: 18, fats: 8, fiber: 1 },
  { name: "Cheetos Crunchy (1 oz)", category: "Snacks", calories: 160, protein: 2, carbs: 15, fats: 10, fiber: 1 },
  { name: "Hot Cheetos (1 oz)", category: "Snacks", calories: 170, protein: 2, carbs: 16, fats: 11, fiber: 1 },
  { name: "Lay's Classic chips (1 oz)", category: "Snacks", calories: 160, protein: 2, carbs: 15, fats: 10, fiber: 1 },
  { name: "Fritos Original (1 oz)", category: "Snacks", calories: 160, protein: 2, carbs: 16, fats: 10, fiber: 1 },
  { name: "Ruffles Cheddar & Sour Cream (1 oz)", category: "Snacks", calories: 160, protein: 2, carbs: 15, fats: 10, fiber: 1 },
  { name: "Sun Chips Harvest Cheddar (1 oz)", category: "Snacks", calories: 140, protein: 2, carbs: 19, fats: 6, fiber: 2 },
  { name: "Beef jerky bag (1 oz)", category: "Snacks", calories: 116, protein: 9, carbs: 6, fats: 7, fiber: 0 },
  { name: "String cheese stick (1)", category: "Snacks", calories: 80, protein: 7, carbs: 1, fats: 6, fiber: 0 },
  { name: "Pumpkin seeds (1 oz)", category: "Snacks", calories: 160, protein: 8, carbs: 4, fats: 13, fiber: 2 },
  { name: "Mixed berries (1 cup)", category: "Fruits", calories: 70, protein: 1, carbs: 17, fats: 0, fiber: 5 },
  { name: "Raspberries (1 cup)", category: "Fruits", calories: 65, protein: 1, carbs: 15, fats: 1, fiber: 8 },
  { name: "Blackberries (1 cup)", category: "Fruits", calories: 62, protein: 2, carbs: 14, fats: 1, fiber: 8 },
  { name: "Grapes (1 cup)", category: "Fruits", calories: 104, protein: 1, carbs: 27, fats: 0, fiber: 1 },
  { name: "Orange (1 medium)", category: "Fruits", calories: 62, protein: 1, carbs: 15, fats: 0, fiber: 3 },
  { name: "Croissant (1)", category: "Bakery", calories: 270, protein: 5, carbs: 31, fats: 14, fiber: 1 },
  { name: "Hawaiian rolls (2)", category: "Bakery", calories: 180, protein: 4, carbs: 32, fats: 4, fiber: 1 },
  { name: "Bagel plain (1)", category: "Bakery", calories: 280, protein: 10, carbs: 56, fats: 2, fiber: 2 },
  { name: "Sourdough slice (1)", category: "Bakery", calories: 95, protein: 4, carbs: 18, fats: 1, fiber: 1 },
  { name: "Wheat bread (2 slices)", category: "Bakery", calories: 140, protein: 6, carbs: 24, fats: 2, fiber: 4 },
  { name: "White bread (2 slices)", category: "Bakery", calories: 140, protein: 4, carbs: 26, fats: 2, fiber: 1 },
  { name: "Goldfish crackers (1 oz)", category: "Snacks", calories: 140, protein: 3, carbs: 20, fats: 5, fiber: 1 },
  { name: "Rice Krispies Treat (1 bar)", category: "Snacks", calories: 90, protein: 1, carbs: 17, fats: 2, fiber: 0 },
  { name: "Pop-Tarts frosted strawberry (2 pastries)", category: "Snacks", calories: 370, protein: 4, carbs: 69, fats: 9, fiber: 2 },
  { name: "Cheez-It crackers (1 oz)", category: "Snacks", calories: 150, protein: 3, carbs: 17, fats: 8, fiber: 1 }
];

const FOOD_LIBRARY_MEGA_V46 = [
  { name: 'Squirt soda (12 oz)', category: 'Drinks', calories: 140, protein: 0, carbs: 37, fats: 0, fiber: 0 },
  { name: 'Fresca (12 oz)', category: 'Drinks', calories: 0, protein: 0, carbs: 0, fats: 0, fiber: 0 },
  { name: 'Sprite (12 oz)', category: 'Drinks', calories: 140, protein: 0, carbs: 38, fats: 0, fiber: 0 },
  { name: 'Sprite Zero (12 oz)', category: 'Drinks', calories: 0, protein: 0, carbs: 0, fats: 0, fiber: 0 },
  { name: 'Dr Pepper (12 oz)', category: 'Drinks', calories: 150, protein: 0, carbs: 40, fats: 0, fiber: 0 },
  { name: 'Dr Pepper Zero (12 oz)', category: 'Drinks', calories: 0, protein: 0, carbs: 0, fats: 0, fiber: 0 },
  { name: 'Mountain Dew (12 oz)', category: 'Drinks', calories: 170, protein: 0, carbs: 46, fats: 0, fiber: 0 },
  { name: '7UP (12 oz)', category: 'Drinks', calories: 140, protein: 0, carbs: 38, fats: 0, fiber: 0 },
  { name: 'A&W Root Beer (12 oz)', category: 'Drinks', calories: 170, protein: 0, carbs: 45, fats: 0, fiber: 0 },
  { name: 'Pepsi (12 oz)', category: 'Drinks', calories: 150, protein: 0, carbs: 41, fats: 0, fiber: 0 },
  { name: 'Sparkling Ice (17 oz)', category: 'Drinks', calories: 5, protein: 0, carbs: 1, fats: 0, fiber: 0 },
  { name: 'LaCroix sparkling water (12 oz)', category: 'Drinks', calories: 0, protein: 0, carbs: 0, fats: 0, fiber: 0 },
  { name: 'BodyArmor (16 oz)', category: 'Drinks', calories: 120, protein: 0, carbs: 28, fats: 0, fiber: 0 },
  { name: 'Prime Hydration (16.9 oz)', category: 'Drinks', calories: 20, protein: 0, carbs: 5, fats: 0, fiber: 0 },
  { name: 'Vitamin Water (20 oz)', category: 'Drinks', calories: 120, protein: 0, carbs: 32, fats: 0, fiber: 0 },
  { name: 'Pure Leaf Sweet Tea (18.5 oz)', category: 'Drinks', calories: 160, protein: 0, carbs: 42, fats: 0, fiber: 0 },
  { name: 'Starbucks Frappuccino bottled coffee (13.7 oz)', category: 'Coffee Drinks', calories: 290, protein: 9, carbs: 46, fats: 9, fiber: 0 },
  { name: 'Starbucks Vanilla Frappuccino (grande)', category: 'Coffee Drinks', calories: 380, protein: 4, carbs: 53, fats: 16, fiber: 0 },
  { name: 'Starbucks Caramel Frappuccino (grande)', category: 'Coffee Drinks', calories: 380, protein: 4, carbs: 54, fats: 16, fiber: 0 },
  { name: 'Starbucks Pink Drink (grande)', category: 'Coffee Drinks', calories: 140, protein: 1, carbs: 27, fats: 2.5, fiber: 1 },
  { name: 'Tim Hortons Iced Capp (medium)', category: 'Coffee Drinks', calories: 360, protein: 3, carbs: 50, fats: 16, fiber: 0 },
  { name: 'Dunkin Iced Coffee with cream and sugar (medium)', category: 'Coffee Drinks', calories: 180, protein: 2, carbs: 29, fats: 6, fiber: 0 },
  { name: 'Twice Daily cold brew latte (16 oz)', category: 'Coffee Drinks', calories: 180, protein: 5, carbs: 24, fats: 7, fiber: 0 },
  { name: 'Iced vanilla latte (medium)', category: 'Coffee Drinks', calories: 190, protein: 6, carbs: 25, fats: 7, fiber: 0 },
  { name: 'PB&J sandwich', category: 'Meals', calories: 380, protein: 13, carbs: 43, fats: 18, fiber: 4 },
  { name: 'Tuna salad sandwich', category: 'Meals', calories: 430, protein: 28, carbs: 34, fats: 20, fiber: 3 },
  { name: 'Chicken salad sandwich', category: 'Meals', calories: 470, protein: 30, carbs: 34, fats: 23, fiber: 3 },
  { name: 'Lasagna slice', category: 'Meals', calories: 410, protein: 23, carbs: 31, fats: 22, fiber: 3 },
  { name: 'Beef lasagna plate', category: 'Meals', calories: 560, protein: 31, carbs: 42, fats: 28, fiber: 4 },
  { name: 'Tortellini alfredo bowl', category: 'Meals', calories: 690, protein: 24, carbs: 64, fats: 37, fiber: 4 },
  { name: 'Cheese tortellini with marinara', category: 'Meals', calories: 520, protein: 19, carbs: 74, fats: 15, fiber: 5 },
  { name: 'Spaghetti and meatballs', category: 'Meals', calories: 700, protein: 32, carbs: 78, fats: 28, fiber: 6 },
  { name: 'Fettuccine Alfredo', category: 'Meals', calories: 760, protein: 20, carbs: 74, fats: 42, fiber: 3 },
  { name: 'Ravioli with meat sauce', category: 'Meals', calories: 540, protein: 23, carbs: 58, fats: 24, fiber: 4 },
  { name: 'Chicken noodle soup (2 cups)', category: 'Meals', calories: 240, protein: 15, carbs: 26, fats: 8, fiber: 2 },
  { name: 'Ceviche cup', category: 'Meals', calories: 180, protein: 24, carbs: 8, fats: 5, fiber: 1 },
  { name: 'Aguachiles plate', category: 'Meals', calories: 220, protein: 28, carbs: 7, fats: 8, fiber: 1 },
  { name: 'Orange chicken with rice', category: 'Meals', calories: 720, protein: 27, carbs: 90, fats: 28, fiber: 3 },
  { name: 'Beef and broccoli with rice', category: 'Meals', calories: 580, protein: 31, carbs: 56, fats: 24, fiber: 4 },
  { name: 'Qdoba chicken bowl', category: 'Restaurant', calories: 720, protein: 46, carbs: 57, fats: 31, fiber: 10 },
  { name: "McDonald's Big Mac", category: 'Fast Food', calories: 590, protein: 25, carbs: 46, fats: 34, fiber: 3 },
  { name: "Wendy's Dave's Single", category: 'Fast Food', calories: 590, protein: 29, carbs: 37, fats: 34, fiber: 2 },
  { name: 'Burger King Whopper', category: 'Fast Food', calories: 670, protein: 31, carbs: 51, fats: 40, fiber: 3 },
  { name: "Domino's pepperoni slice", category: 'Pizza', calories: 300, protein: 13, carbs: 34, fats: 12, fiber: 2 },
  { name: 'Pizza Hut pepperoni slice', category: 'Pizza', calories: 320, protein: 13, carbs: 35, fats: 14, fiber: 2 },
  { name: 'Papa Johns cheese slice', category: 'Pizza', calories: 290, protein: 12, carbs: 37, fats: 10, fiber: 2 },
  { name: 'Little Caesars pepperoni slice', category: 'Pizza', calories: 280, protein: 12, carbs: 32, fats: 11, fiber: 2 },
  { name: 'Cheez-It serving pack', category: 'Snacks', calories: 150, protein: 3, carbs: 17, fats: 8, fiber: 0 },
  { name: 'Pretzels snack bag', category: 'Snacks', calories: 110, protein: 2, carbs: 23, fats: 1, fiber: 1 },
  { name: 'Sunflower seeds (1 oz)', category: 'Snacks', calories: 165, protein: 6, carbs: 7, fats: 14, fiber: 3 },
  { name: 'Turkey jerky (1 oz)', category: 'Snacks', calories: 80, protein: 12, carbs: 4, fats: 1, fiber: 0 },
  { name: 'Mixed nuts (1 oz)', category: 'Snacks', calories: 170, protein: 5, carbs: 6, fats: 15, fiber: 3 },
  { name: 'Peanut butter crackers pack', category: 'Snacks', calories: 190, protein: 4, carbs: 21, fats: 10, fiber: 1 },
  { name: 'Rice Krispies Treat', category: 'Snacks', calories: 90, protein: 1, carbs: 17, fats: 2, fiber: 0 },
  { name: 'Nature Valley bar pack', category: 'Snacks', calories: 190, protein: 4, carbs: 29, fats: 7, fiber: 2 },
  { name: 'Croissant plain', category: 'Bakery', calories: 270, protein: 5, carbs: 31, fats: 14, fiber: 1 },
  { name: 'Sausage croissant sandwich', category: 'Breakfast', calories: 450, protein: 17, carbs: 31, fats: 28, fiber: 1 },
  { name: 'Egg croissant sandwich', category: 'Breakfast', calories: 390, protein: 15, carbs: 30, fats: 23, fiber: 1 },
  { name: 'Bacon egg and cheese croissant', category: 'Breakfast', calories: 470, protein: 19, carbs: 31, fats: 30, fiber: 1 },
  { name: 'Hawaiian rolls (2)', category: 'Bakery', calories: 180, protein: 4, carbs: 32, fats: 4, fiber: 1 },
  { name: 'Sourdough bread (2 slices)', category: 'Bakery', calories: 160, protein: 6, carbs: 32, fats: 1, fiber: 2 },
  { name: 'Whole wheat bread (2 slices)', category: 'Bakery', calories: 140, protein: 6, carbs: 24, fats: 2, fiber: 4 },
  { name: 'Bagel with cream cheese', category: 'Bakery', calories: 360, protein: 10, carbs: 50, fats: 13, fiber: 2 },
  { name: 'Berries mixed (1 cup)', category: 'Fruits', calories: 70, protein: 1, carbs: 17, fats: 0, fiber: 6 },
  { name: 'Raspberries (1 cup)', category: 'Fruits', calories: 65, protein: 2, carbs: 15, fats: 1, fiber: 8 },
  { name: 'Blackberries (1 cup)', category: 'Fruits', calories: 62, protein: 2, carbs: 14, fats: 1, fiber: 8 },
  { name: 'Grapes (1 cup)', category: 'Fruits', calories: 104, protein: 1, carbs: 27, fats: 0, fiber: 1 },
  { name: 'Orange', category: 'Fruits', calories: 62, protein: 1, carbs: 15, fats: 0, fiber: 3 },
  { name: 'Pear', category: 'Fruits', calories: 100, protein: 1, carbs: 27, fats: 0, fiber: 6 },
  { name: 'Dried mango (1 oz)', category: 'Snacks', calories: 90, protein: 1, carbs: 22, fats: 0, fiber: 2 },
  { name: 'Applesauce cup', category: 'Snacks', calories: 50, protein: 0, carbs: 13, fats: 0, fiber: 1 },
  { name: 'Pickles (1 serving)', category: 'Snacks', calories: 5, protein: 0, carbs: 1, fats: 0, fiber: 0 },
  { name: 'Celsius energy drink (12 oz)', category: 'Energy', calories: 10, protein: 0, carbs: 2, fats: 0, fiber: 0 },
  { name: 'C4 Energy (16 oz)', category: 'Energy', calories: 0, protein: 0, carbs: 0, fats: 0, fiber: 0 },
  { name: 'Uptime Energy (12 oz)', category: 'Energy', calories: 140, protein: 0, carbs: 35, fats: 0, fiber: 0 },
  { name: 'Alani Nu Energy (12 oz)', category: 'Energy', calories: 10, protein: 0, carbs: 3, fats: 0, fiber: 0 },
  { name: 'Ghost Energy (16 oz)', category: 'Energy', calories: 5, protein: 0, carbs: 1, fats: 0, fiber: 0 },
  { name: 'Bang Energy (16 oz)', category: 'Energy', calories: 0, protein: 0, carbs: 0, fats: 0, fiber: 0 },
  { name: 'Reign Energy (16 oz)', category: 'Energy', calories: 10, protein: 0, carbs: 3, fats: 0, fiber: 0 },
  { name: 'NOS Energy (16 oz)', category: 'Energy', calories: 210, protein: 0, carbs: 54, fats: 0, fiber: 0 },
  { name: 'Gatorade Zero (20 oz)', category: 'Drinks', calories: 0, protein: 0, carbs: 0, fats: 0, fiber: 0 },
  { name: 'Chocolate milk (14 oz bottle)', category: 'Drinks', calories: 280, protein: 14, carbs: 38, fats: 8, fiber: 1 },
];


const FOOD_LIBRARY_ULTRA_V47 = [
  { name: 'Coca-Cola Cherry (12 oz)', category: 'Drinks', calories: 150, protein: 0, carbs: 42, fats: 0, fiber: 0 },
  { name: 'Coca-Cola Vanilla (12 oz)', category: 'Drinks', calories: 150, protein: 0, carbs: 42, fats: 0, fiber: 0 },
  { name: 'Cherry Coke Zero (12 oz)', category: 'Drinks', calories: 0, protein: 0, carbs: 0, fats: 0, fiber: 0 },
  { name: 'Diet Dr Pepper (12 oz)', category: 'Drinks', calories: 0, protein: 0, carbs: 0, fats: 0, fiber: 0 },
  { name: 'Barqs Root Beer (12 oz)', category: 'Drinks', calories: 160, protein: 0, carbs: 44, fats: 0, fiber: 0 },
  { name: 'Mug Root Beer (12 oz)', category: 'Drinks', calories: 160, protein: 0, carbs: 43, fats: 0, fiber: 0 },
  { name: 'Sunkist Orange Soda (12 oz)', category: 'Drinks', calories: 170, protein: 0, carbs: 44, fats: 0, fiber: 0 },
  { name: 'Fanta Orange (12 oz)', category: 'Drinks', calories: 160, protein: 0, carbs: 44, fats: 0, fiber: 0 },
  { name: 'Canada Dry Ginger Ale (12 oz)', category: 'Drinks', calories: 140, protein: 0, carbs: 36, fats: 0, fiber: 0 },
  { name: 'Minute Maid Lemonade (12 oz)', category: 'Drinks', calories: 150, protein: 0, carbs: 40, fats: 0, fiber: 0 },
  { name: 'Arizona Green Tea with Ginseng (23 oz)', category: 'Drinks', calories: 170, protein: 0, carbs: 43, fats: 0, fiber: 0 },
  { name: 'Arizona Mucho Mango (23 oz)', category: 'Drinks', calories: 180, protein: 0, carbs: 46, fats: 0, fiber: 0 },
  { name: 'Lipton Peach Tea (16.9 oz)', category: 'Drinks', calories: 100, protein: 0, carbs: 26, fats: 0, fiber: 0 },
  { name: 'Snapple Apple (16 oz)', category: 'Drinks', calories: 190, protein: 0, carbs: 48, fats: 0, fiber: 0 },
  { name: 'Starbucks Doubleshot Espresso and Cream (6.5 oz)', category: 'Coffee Drinks', calories: 140, protein: 6, carbs: 18, fats: 5, fiber: 0 },
  { name: 'Starbucks Mocha Frappuccino bottle (13.7 oz)', category: 'Coffee Drinks', calories: 280, protein: 9, carbs: 44, fats: 8, fiber: 0 },
  { name: 'Starbucks Caramel Macchiato (grande)', category: 'Coffee Drinks', calories: 250, protein: 10, carbs: 33, fats: 7, fiber: 0 },
  { name: 'Starbucks White Chocolate Mocha (grande)', category: 'Coffee Drinks', calories: 430, protein: 14, carbs: 53, fats: 18, fiber: 0 },
  { name: 'Tim Hortons French Vanilla (medium)', category: 'Coffee Drinks', calories: 250, protein: 3, carbs: 41, fats: 8, fiber: 0 },
  { name: 'Dunkin Caramel Iced Coffee (medium)', category: 'Coffee Drinks', calories: 170, protein: 2, carbs: 28, fats: 5, fiber: 0 },
  { name: 'Monster Energy Original (16 oz)', category: 'Energy', calories: 210, protein: 0, carbs: 54, fats: 0, fiber: 0 },
  { name: 'Monster Zero Ultra (16 oz)', category: 'Energy', calories: 10, protein: 0, carbs: 3, fats: 0, fiber: 0 },
  { name: 'Red Bull Original (8.4 oz)', category: 'Energy', calories: 110, protein: 1, carbs: 27, fats: 0, fiber: 0 },
  { name: 'Red Bull Sugarfree (8.4 oz)', category: 'Energy', calories: 10, protein: 0, carbs: 2, fats: 0, fiber: 0 },
  { name: 'Rockstar Energy Original (16 oz)', category: 'Energy', calories: 240, protein: 0, carbs: 62, fats: 0, fiber: 0 },
  { name: 'Fairlife Core Power (14 oz)', category: 'Protein Drinks', calories: 170, protein: 26, carbs: 8, fats: 4.5, fiber: 0 },
  { name: 'Fairlife Nutrition Plan (11.5 oz)', category: 'Protein Drinks', calories: 150, protein: 30, carbs: 4, fats: 2.5, fiber: 1 },
  { name: 'Ensure Max Protein (11 oz)', category: 'Protein Drinks', calories: 150, protein: 30, carbs: 6, fats: 1.5, fiber: 1 },
  { name: 'Premier Protein Cafe Latte (11 oz)', category: 'Protein Drinks', calories: 160, protein: 30, carbs: 5, fats: 3, fiber: 1 },
  { name: 'Muscle Milk Pro Series (14 oz)', category: 'Protein Drinks', calories: 200, protein: 32, carbs: 9, fats: 3.5, fiber: 2 },
  { name: 'Uncrustable PB&J sandwich', category: 'Snacks', calories: 210, protein: 6, carbs: 28, fats: 9, fiber: 2 },
  { name: 'Peanut butter sandwich', category: 'Meals', calories: 330, protein: 13, carbs: 30, fats: 18, fiber: 3 },
  { name: 'Grilled cheese sandwich', category: 'Meals', calories: 410, protein: 16, carbs: 30, fats: 25, fiber: 2 },
  { name: 'Ham and cheese sandwich', category: 'Meals', calories: 420, protein: 26, carbs: 34, fats: 19, fiber: 3 },
  { name: 'Turkey and cheese sandwich', category: 'Meals', calories: 430, protein: 30, carbs: 33, fats: 18, fiber: 3 },
  { name: 'Club sandwich', category: 'Meals', calories: 620, protein: 33, carbs: 43, fats: 34, fiber: 3 },
  { name: 'BLT sandwich', category: 'Meals', calories: 480, protein: 17, carbs: 33, fats: 31, fiber: 3 },
  { name: 'Chicken Caesar wrap', category: 'Meals', calories: 590, protein: 32, carbs: 41, fats: 33, fiber: 3 },
  { name: 'Buffalo chicken wrap', category: 'Meals', calories: 620, protein: 33, carbs: 45, fats: 34, fiber: 3 },
  { name: 'Turkey sub 6 inch', category: 'Meals', calories: 320, protein: 18, carbs: 39, fats: 8, fiber: 4 },
  { name: 'Italian sub 6 inch', category: 'Meals', calories: 520, protein: 23, carbs: 41, fats: 29, fiber: 3 },
  { name: 'Chicken quesadilla', category: 'Meals', calories: 510, protein: 30, carbs: 36, fats: 27, fiber: 2 },
  { name: 'Cheese quesadilla', category: 'Meals', calories: 470, protein: 18, carbs: 38, fats: 28, fiber: 2 },
  { name: 'Steak burrito', category: 'Meals', calories: 790, protein: 42, carbs: 76, fats: 35, fiber: 8 },
  { name: 'Chicken burrito bowl', category: 'Meals', calories: 670, protein: 40, carbs: 62, fats: 24, fiber: 10 },
  { name: 'Bean and cheese burrito', category: 'Meals', calories: 460, protein: 16, carbs: 54, fats: 19, fiber: 8 },
  { name: 'Chicken enchiladas plate', category: 'Meals', calories: 680, protein: 36, carbs: 48, fats: 37, fiber: 5 },
  { name: 'Beef taco single', category: 'Meals', calories: 210, protein: 10, carbs: 16, fats: 11, fiber: 2 },
  { name: 'Chicken taco single', category: 'Meals', calories: 180, protein: 12, carbs: 15, fats: 8, fiber: 2 },
  { name: 'Carnitas taco single', category: 'Meals', calories: 220, protein: 11, carbs: 15, fats: 12, fiber: 2 },
  { name: 'Breakfast burrito', category: 'Breakfast', calories: 620, protein: 24, carbs: 48, fats: 35, fiber: 3 },
  { name: 'Biscuits and gravy', category: 'Breakfast', calories: 620, protein: 12, carbs: 51, fats: 40, fiber: 2 },
  { name: 'Pancakes stack with syrup', category: 'Breakfast', calories: 530, protein: 10, carbs: 88, fats: 14, fiber: 2 },
  { name: 'French toast with syrup', category: 'Breakfast', calories: 470, protein: 12, carbs: 68, fats: 16, fiber: 2 },
  { name: 'Breakfast platter eggs bacon toast', category: 'Breakfast', calories: 640, protein: 27, carbs: 36, fats: 41, fiber: 2 },
  { name: 'Cinnamon roll large', category: 'Bakery', calories: 530, protein: 7, carbs: 77, fats: 22, fiber: 2 },
  { name: 'Blueberry muffin', category: 'Bakery', calories: 390, protein: 6, carbs: 56, fats: 16, fiber: 1 },
  { name: 'Chocolate chip muffin', category: 'Bakery', calories: 420, protein: 6, carbs: 59, fats: 18, fiber: 2 },
  { name: 'Donut glazed', category: 'Bakery', calories: 260, protein: 4, carbs: 31, fats: 14, fiber: 1 },
  { name: 'Apple pie slice', category: 'Desserts', calories: 320, protein: 2, carbs: 43, fats: 16, fiber: 2 },
  { name: 'Brownie square', category: 'Desserts', calories: 240, protein: 3, carbs: 31, fats: 12, fiber: 1 },
  { name: 'Chocolate chip cookie large', category: 'Desserts', calories: 210, protein: 2, carbs: 29, fats: 10, fiber: 1 },
  { name: 'Ice cream vanilla 1 cup', category: 'Desserts', calories: 270, protein: 5, carbs: 31, fats: 14, fiber: 0 },
  { name: 'Ice cream chocolate 1 cup', category: 'Desserts', calories: 285, protein: 5, carbs: 34, fats: 15, fiber: 1 },
  { name: 'Mac and cheese bowl', category: 'Meals', calories: 500, protein: 18, carbs: 54, fats: 23, fiber: 2 },
  { name: 'Chicken Alfredo bowl', category: 'Meals', calories: 760, protein: 38, carbs: 65, fats: 38, fiber: 3 },
  { name: 'Baked ziti', category: 'Meals', calories: 540, protein: 24, carbs: 58, fats: 24, fiber: 4 },
  { name: 'Chicken parmesan with pasta', category: 'Meals', calories: 820, protein: 46, carbs: 68, fats: 39, fiber: 5 },
  { name: 'Fried rice chicken', category: 'Meals', calories: 620, protein: 27, carbs: 76, fats: 21, fiber: 3 },
  { name: 'Lo mein chicken', category: 'Meals', calories: 690, protein: 24, carbs: 83, fats: 28, fiber: 4 },
  { name: 'General Tsos chicken', category: 'Meals', calories: 760, protein: 28, carbs: 89, fats: 32, fiber: 2 },
  { name: 'Sesame chicken with rice', category: 'Meals', calories: 740, protein: 28, carbs: 87, fats: 31, fiber: 3 },
  { name: 'Chicken tenders 4 piece', category: 'Meals', calories: 520, protein: 28, carbs: 28, fats: 31, fiber: 2 },
  { name: 'French fries medium', category: 'Sides', calories: 340, protein: 4, carbs: 44, fats: 16, fiber: 4 },
  { name: 'Mozzarella sticks 6 piece', category: 'Sides', calories: 540, protein: 24, carbs: 38, fats: 32, fiber: 2 },
  { name: 'Onion rings medium', category: 'Sides', calories: 410, protein: 5, carbs: 45, fats: 24, fiber: 3 },
  { name: 'Mashed potatoes 1 cup', category: 'Sides', calories: 230, protein: 4, carbs: 35, fats: 9, fiber: 3 },
  { name: 'Macaroni salad 1 cup', category: 'Sides', calories: 360, protein: 6, carbs: 39, fats: 20, fiber: 2 },
  { name: 'Potato salad 1 cup', category: 'Sides', calories: 360, protein: 5, carbs: 35, fats: 22, fiber: 3 },
  { name: 'Coleslaw 1 cup', category: 'Sides', calories: 170, protein: 1, carbs: 17, fats: 11, fiber: 2 },
  { name: 'Chicken salad cup', category: 'Meals', calories: 360, protein: 24, carbs: 7, fats: 26, fiber: 1 },
  { name: 'Tuna salad cup', category: 'Meals', calories: 310, protein: 23, carbs: 4, fats: 22, fiber: 0 },
  { name: 'Greek yogurt parfait', category: 'Breakfast', calories: 260, protein: 14, carbs: 38, fats: 6, fiber: 2 },
  { name: 'Cottage cheese 1 cup', category: 'Dairy', calories: 220, protein: 26, carbs: 8, fats: 10, fiber: 0 },
  { name: 'String cheese 1 stick', category: 'Dairy', calories: 80, protein: 7, carbs: 1, fats: 6, fiber: 0 },
  { name: 'Greek yogurt vanilla cup', category: 'Dairy', calories: 150, protein: 15, carbs: 18, fats: 2, fiber: 0 },
  { name: 'Trail mix 1 oz', category: 'Snacks', calories: 150, protein: 4, carbs: 15, fats: 9, fiber: 2 },
  { name: 'Granola bar chocolate chip', category: 'Snacks', calories: 190, protein: 3, carbs: 29, fats: 7, fiber: 1 },
  { name: 'Rice cakes plain 2 cakes', category: 'Snacks', calories: 70, protein: 1, carbs: 14, fats: 0, fiber: 0 },
  { name: 'Pita chips 1 oz', category: 'Snacks', calories: 130, protein: 3, carbs: 19, fats: 5, fiber: 1 },
  { name: 'Salsa 1/2 cup', category: 'Sides', calories: 35, protein: 1, carbs: 8, fats: 0, fiber: 2 },
  { name: 'Hummus 1/4 cup', category: 'Sides', calories: 160, protein: 4, carbs: 14, fats: 10, fiber: 4 },
  { name: 'Guacamole 1/4 cup', category: 'Sides', calories: 120, protein: 2, carbs: 8, fats: 10, fiber: 5 },
  { name: 'Avocado toast', category: 'Breakfast', calories: 300, protein: 7, carbs: 29, fats: 18, fiber: 8 },
  { name: 'Rotisserie chicken 6 oz', category: 'Proteins', calories: 290, protein: 38, carbs: 0, fats: 14, fiber: 0 },
  { name: 'Chicken salad lettuce wrap', category: 'Meals', calories: 260, protein: 24, carbs: 6, fats: 15, fiber: 2 },
  { name: 'Turkey chili 1 bowl', category: 'Meals', calories: 420, protein: 32, carbs: 34, fats: 18, fiber: 8 },
  { name: 'Beef chili 1 bowl', category: 'Meals', calories: 460, protein: 28, carbs: 30, fats: 24, fiber: 7 },
  { name: 'Chicken pot pie slice', category: 'Meals', calories: 430, protein: 17, carbs: 35, fats: 24, fiber: 3 },
  { name: 'Corn dog', category: 'Fast Food', calories: 220, protein: 7, carbs: 20, fats: 12, fiber: 1 },
  { name: 'Hot dog on bun', category: 'Fast Food', calories: 310, protein: 11, carbs: 24, fats: 19, fiber: 1 },
  { name: 'Cheeseburger single', category: 'Fast Food', calories: 520, protein: 27, carbs: 37, fats: 29, fiber: 2 },
  { name: 'Chicken sandwich crispy', category: 'Fast Food', calories: 540, protein: 24, carbs: 45, fats: 28, fiber: 2 },
  { name: 'Chicken nuggets 10 piece', category: 'Fast Food', calories: 420, protein: 24, carbs: 26, fats: 26, fiber: 1 },
  { name: 'Caesar salad with chicken', category: 'Salads', calories: 470, protein: 32, carbs: 14, fats: 31, fiber: 4 },
  { name: 'Garden salad with ranch', category: 'Salads', calories: 220, protein: 4, carbs: 11, fats: 18, fiber: 3 },
  { name: 'Chef salad', category: 'Salads', calories: 390, protein: 25, carbs: 13, fats: 25, fiber: 3 },
  { name: 'Fruit cup mixed', category: 'Fruits', calories: 70, protein: 1, carbs: 18, fats: 0, fiber: 2 },
  { name: 'Banana chips 1 oz', category: 'Snacks', calories: 150, protein: 1, carbs: 18, fats: 9, fiber: 1 },
  { name: 'Pudding cup chocolate', category: 'Desserts', calories: 150, protein: 2, carbs: 26, fats: 4, fiber: 0 },
  { name: 'Jello cup', category: 'Desserts', calories: 80, protein: 2, carbs: 19, fats: 0, fiber: 0 }
];

const FOOD_LIBRARY_AMERICAN_EXPANDED = [
  { name: "Starbucks iced coffee sweetened (1 bottle)", category: "Drinks", calories: 160, protein: 2, carbs: 29, fats: 4, fiber: 0 },
  { name: "Starbucks vanilla frappuccino (1 bottle)", category: "Drinks", calories: 290, protein: 6, carbs: 46, fats: 9, fiber: 0 },
  { name: "Starbucks doubleshot energy mocha (1 can)", category: "Energy", calories: 210, protein: 15, carbs: 24, fats: 6, fiber: 1 },
  { name: "Peanut butter and jelly sandwich (1 sandwich)", category: "Meals", calories: 380, protein: 13, carbs: 43, fats: 18, fiber: 4 },
  { name: "Sausage croissant (1 sandwich)", category: "Breakfast", calories: 430, protein: 11, carbs: 29, fats: 30, fiber: 1 },
  { name: "Egg croissant sandwich (1 sandwich)", category: "Breakfast", calories: 380, protein: 13, carbs: 28, fats: 24, fiber: 1 },
  { name: "Bacon egg and cheese croissant (1 sandwich)", category: "Breakfast", calories: 450, protein: 17, carbs: 30, fats: 29, fiber: 1 },
  { name: "Doritos Nacho Cheese (1 oz)", category: "Snacks", calories: 150, protein: 2, carbs: 18, fats: 8, fiber: 1 },
  { name: "Doritos Cool Ranch (1 oz)", category: "Snacks", calories: 150, protein: 2, carbs: 18, fats: 8, fiber: 1 },
  { name: "Cheetos Crunchy (1 oz)", category: "Snacks", calories: 160, protein: 2, carbs: 15, fats: 10, fiber: 1 },
  { name: "Hot Cheetos (1 oz)", category: "Snacks", calories: 170, protein: 2, carbs: 15, fats: 11, fiber: 1 },
  { name: "Lay's Classic (1 oz)", category: "Snacks", calories: 160, protein: 2, carbs: 15, fats: 10, fiber: 1 },
  { name: "Lay's Sour Cream and Onion (1 oz)", category: "Snacks", calories: 160, protein: 2, carbs: 15, fats: 10, fiber: 1 },
  { name: "Fritos Original (1 oz)", category: "Snacks", calories: 160, protein: 2, carbs: 16, fats: 10, fiber: 1 },
  { name: "Ruffles Cheddar and Sour Cream (1 oz)", category: "Snacks", calories: 160, protein: 2, carbs: 15, fats: 10, fiber: 1 },
  { name: "Pringles Original (1 oz)", category: "Snacks", calories: 150, protein: 1, carbs: 16, fats: 9, fiber: 1 },
  { name: "Cheese sticks (2)", category: "Snacks", calories: 160, protein: 12, carbs: 2, fats: 12, fiber: 0 },
  { name: "Pumpkin seeds (1 oz)", category: "Snacks", calories: 160, protein: 8, carbs: 4, fats: 13, fiber: 2 },
  { name: "Hawaiian rolls (2)", category: "Carbs", calories: 180, protein: 4, carbs: 32, fats: 4, fiber: 1 },
  { name: "Croissant plain (1)", category: "Carbs", calories: 230, protein: 5, carbs: 26, fats: 12, fiber: 1 },
  { name: "Sourdough bread (2 slices)", category: "Carbs", calories: 180, protein: 6, carbs: 34, fats: 2, fiber: 2 },
  { name: "Wheat bread (2 slices)", category: "Carbs", calories: 160, protein: 8, carbs: 28, fats: 2, fiber: 4 },
  { name: "White bread (2 slices)", category: "Carbs", calories: 150, protein: 4, carbs: 28, fats: 2, fiber: 1 },
  { name: "Celsius (12 oz)", category: "Energy", calories: 10, protein: 0, carbs: 2, fats: 0, fiber: 0 },
  { name: "C4 Energy (16 oz)", category: "Energy", calories: 0, protein: 0, carbs: 0, fats: 0, fiber: 0 },
  { name: "Uptime Energy (12 oz)", category: "Energy", calories: 150, protein: 0, carbs: 40, fats: 0, fiber: 0 },
  { name: "Vitaminwater XXX (20 oz)", category: "Drinks", calories: 120, protein: 0, carbs: 32, fats: 0, fiber: 0 },
  { name: "Gatorade (20 oz)", category: "Drinks", calories: 140, protein: 0, carbs: 34, fats: 0, fiber: 0 },
  { name: "Powerade (20 oz)", category: "Drinks", calories: 130, protein: 0, carbs: 35, fats: 0, fiber: 0 },
  { name: "Chocolate milk (14 oz)", category: "Drinks", calories: 280, protein: 14, carbs: 41, fats: 6, fiber: 1 },
  { name: "Iced latte whole milk (16 oz)", category: "Drinks", calories: 190, protein: 9, carbs: 18, fats: 9, fiber: 0 },
  { name: "Protein oatmeal packet (1 packet)", category: "Breakfast", calories: 220, protein: 10, carbs: 35, fats: 4, fiber: 5 },
  { name: "Turkey sandwich deli (1 sandwich)", category: "Meals", calories: 410, protein: 28, carbs: 39, fats: 16, fiber: 4 },
  { name: "Ham and cheese sandwich (1 sandwich)", category: "Meals", calories: 430, protein: 23, carbs: 34, fats: 22, fiber: 2 },
  { name: "Macaroni salad (1 cup)", category: "Sides", calories: 360, protein: 7, carbs: 42, fats: 18, fiber: 2 },
  { name: "Potato salad (1 cup)", category: "Sides", calories: 360, protein: 5, carbs: 35, fats: 22, fiber: 3 }
];


const FOOD_LIBRARY_PLUS_V48 = [
  { name: "Boiled eggs (2)", category: "Protein", calories: 140, protein: 12, carbs: 1, fats: 10, fiber: 0 },
  { name: "Boiled egg (1)", category: "Protein", calories: 70, protein: 6, carbs: 0.5, fats: 5, fiber: 0 },
  { name: "Ham and cheese Hot Pocket", category: "Frozen Meals", calories: 320, protein: 10, carbs: 37, fats: 14, fiber: 2 },
  { name: "Pepperoni Hot Pocket", category: "Frozen Meals", calories: 310, protein: 9, carbs: 36, fats: 14, fiber: 2 },
  { name: "Turkey and cheddar Lunchable", category: "Snacks", calories: 280, protein: 13, carbs: 27, fats: 13, fiber: 1 },
  { name: "Nachos with cheese", category: "Snacks", calories: 340, protein: 8, carbs: 37, fats: 18, fiber: 3 },
  { name: "Chex Mix handful", category: "Snacks", calories: 140, protein: 3, carbs: 17, fats: 7, fiber: 1 },
  { name: "Bugles (1 oz)", category: "Snacks", calories: 150, protein: 2, carbs: 16, fats: 9, fiber: 1 },
  { name: "Funyuns (1 oz)", category: "Snacks", calories: 160, protein: 2, carbs: 15, fats: 10, fiber: 1 },
  { name: "Takis Fuego (1 oz)", category: "Snacks", calories: 150, protein: 1, carbs: 16, fats: 8, fiber: 1 },
  { name: "Cheez-It snack pack", category: "Snacks", calories: 200, protein: 4, carbs: 24, fats: 10, fiber: 1 },
  { name: "Goldfish crackers (1 oz)", category: "Snacks", calories: 140, protein: 3, carbs: 20, fats: 5, fiber: 1 },
  { name: "Ritz crackers sleeve", category: "Snacks", calories: 220, protein: 3, carbs: 24, fats: 12, fiber: 1 },
  { name: "Pita chips (1 oz)", category: "Snacks", calories: 130, protein: 3, carbs: 19, fats: 5, fiber: 1 },
  { name: "Pretzel sticks (1 oz)", category: "Snacks", calories: 110, protein: 2, carbs: 23, fats: 1, fiber: 1 },
  { name: "Granola bar", category: "Snacks", calories: 190, protein: 3, carbs: 29, fats: 7, fiber: 2 },
  { name: "Nature Valley bar pack", category: "Snacks", calories: 190, protein: 4, carbs: 29, fats: 7, fiber: 2 },
  { name: "Kind bar", category: "Snacks", calories: 200, protein: 6, carbs: 16, fats: 15, fiber: 7 },
  { name: "Rice cake (2)", category: "Snacks", calories: 70, protein: 1, carbs: 14, fats: 0, fiber: 0 },
  { name: "Peanut butter crackers pack", category: "Snacks", calories: 210, protein: 5, carbs: 22, fats: 11, fiber: 1 },
  { name: "Apple slices with peanut butter", category: "Snacks", calories: 220, protein: 5, carbs: 24, fats: 12, fiber: 4 },
  { name: "Blueberries (1 cup)", category: "Fruit", calories: 85, protein: 1, carbs: 21, fats: 0, fiber: 4 },
  { name: "Strawberries (1 cup)", category: "Fruit", calories: 50, protein: 1, carbs: 12, fats: 0, fiber: 3 },
  { name: "Blackberries (1 cup)", category: "Fruit", calories: 62, protein: 2, carbs: 14, fats: 1, fiber: 8 },
  { name: "Raspberries (1 cup)", category: "Fruit", calories: 64, protein: 1, carbs: 15, fats: 1, fiber: 8 },
  { name: "Watermelon (2 cups)", category: "Fruit", calories: 90, protein: 2, carbs: 23, fats: 0, fiber: 1 },
  { name: "Pineapple chunks (1 cup)", category: "Fruit", calories: 82, protein: 1, carbs: 22, fats: 0, fiber: 2 },
  { name: "Mandarin oranges cup", category: "Fruit", calories: 80, protein: 1, carbs: 19, fats: 0, fiber: 1 },
  { name: "Cottage cheese cup", category: "Protein", calories: 160, protein: 14, carbs: 6, fats: 9, fiber: 0 },
  { name: "Fairlife Core Power 26g", category: "Protein", calories: 170, protein: 26, carbs: 8, fats: 4, fiber: 1 },
  { name: "Premier Protein cafe latte", category: "Protein", calories: 160, protein: 30, carbs: 5, fats: 3, fiber: 1 },
  { name: "Muscle Milk zero sugar", category: "Protein", calories: 100, protein: 20, carbs: 2, fats: 1, fiber: 1 },
  { name: "Quest protein bar", category: "Protein", calories: 200, protein: 20, carbs: 22, fats: 8, fiber: 14 },
  { name: "Power Crunch bar", category: "Protein", calories: 205, protein: 13, carbs: 10, fats: 13, fiber: 1 },
  { name: "Chicken ramen cup", category: "Meals", calories: 290, protein: 7, carbs: 38, fats: 13, fiber: 1 },
  { name: "Beef ramen cup", category: "Meals", calories: 300, protein: 7, carbs: 39, fats: 14, fiber: 1 },
  { name: "Cup mac and cheese", category: "Meals", calories: 220, protein: 6, carbs: 31, fats: 8, fiber: 1 },
  { name: "Frozen burrito beef and bean", category: "Meals", calories: 360, protein: 13, carbs: 43, fats: 15, fiber: 4 },
  { name: "Frozen burrito chicken and cheese", category: "Meals", calories: 350, protein: 14, carbs: 41, fats: 15, fiber: 3 },
  { name: "Taquitos (4)", category: "Meals", calories: 330, protein: 10, carbs: 28, fats: 20, fiber: 2 },
  { name: "Chicken tenders (4)", category: "Meals", calories: 360, protein: 21, carbs: 23, fats: 20, fiber: 1 },
  { name: "Mozzarella sticks (6)", category: "Snacks", calories: 440, protein: 18, carbs: 30, fats: 28, fiber: 2 },
  { name: "Onion rings medium", category: "Sides", calories: 410, protein: 5, carbs: 52, fats: 20, fiber: 4 },
  { name: "Mashed potatoes cup", category: "Sides", calories: 210, protein: 4, carbs: 35, fats: 7, fiber: 2 },
  { name: "Loaded baked potato", category: "Sides", calories: 400, protein: 10, carbs: 50, fats: 18, fiber: 5 },
  { name: "Queso dip with chips", category: "Snacks", calories: 320, protein: 7, carbs: 28, fats: 20, fiber: 2 },
  { name: "Chicken salad sandwich", category: "Meals", calories: 480, protein: 22, carbs: 35, fats: 28, fiber: 2 },
  { name: "Tuna salad sandwich", category: "Meals", calories: 430, protein: 24, carbs: 34, fats: 22, fiber: 2 },
  { name: "Lasagna slice", category: "Meals", calories: 380, protein: 20, carbs: 31, fats: 20, fiber: 3 },
  { name: "Cheese tortellini cup", category: "Meals", calories: 330, protein: 11, carbs: 43, fats: 12, fiber: 3 },
  { name: "Chicken tortellini soup cup", category: "Meals", calories: 190, protein: 9, carbs: 21, fats: 8, fiber: 2 },
  { name: "Squirt soda (12 oz)", category: "Drinks", calories: 140, protein: 0, carbs: 38, fats: 0, fiber: 0 },
  { name: "Fresca (12 oz)", category: "Drinks", calories: 0, protein: 0, carbs: 0, fats: 0, fiber: 0 },
  { name: "Crush orange soda (12 oz)", category: "Drinks", calories: 160, protein: 0, carbs: 43, fats: 0, fiber: 0 },
  { name: "Minute Maid fruit punch (12 oz)", category: "Drinks", calories: 170, protein: 0, carbs: 44, fats: 0, fiber: 0 },
  { name: "Starbucks pink drink grande", category: "Drinks", calories: 140, protein: 1, carbs: 27, fats: 2, fiber: 1 },
  { name: "Starbucks caramel macchiato grande", category: "Drinks", calories: 250, protein: 10, carbs: 33, fats: 7, fiber: 0 },
  { name: "Starbucks iced white mocha grande", category: "Drinks", calories: 390, protein: 11, carbs: 47, fats: 17, fiber: 0 },
  { name: "Starbucks vanilla sweet cream cold brew grande", category: "Drinks", calories: 110, protein: 1, carbs: 14, fats: 6, fiber: 0 },
  { name: "Dunkin iced coffee with cream and sugar medium", category: "Drinks", calories: 170, protein: 2, carbs: 26, fats: 6, fiber: 0 },
  { name: "Tim Hortons double double medium", category: "Drinks", calories: 220, protein: 3, carbs: 33, fats: 9, fiber: 0 },
  { name: "Twice Daily iced latte", category: "Drinks", calories: 180, protein: 8, carbs: 20, fats: 7, fiber: 0 },
  { name: "Bottled mocha coffee drink", category: "Drinks", calories: 220, protein: 6, carbs: 33, fats: 7, fiber: 0 },
  { name: "Ceviche cup", category: "Meals", calories: 180, protein: 21, carbs: 8, fats: 7, fiber: 1 },
  { name: "Aguachiles plate", category: "Meals", calories: 230, protein: 24, carbs: 9, fats: 10, fiber: 1 },
  { name: "Sushi California roll (8)", category: "Meals", calories: 255, protein: 9, carbs: 38, fats: 7, fiber: 1 },
  { name: "Sushi spicy tuna roll (8)", category: "Meals", calories: 290, protein: 12, carbs: 29, fats: 12, fiber: 1 },
  { name: "Pho chicken bowl", category: "Meals", calories: 430, protein: 28, carbs: 46, fats: 12, fiber: 2 },
  { name: "Orange chicken with rice", category: "Meals", calories: 690, protein: 27, carbs: 84, fats: 26, fiber: 3 },
  { name: "Chicken fried rice", category: "Meals", calories: 500, protein: 18, carbs: 55, fats: 22, fiber: 2 },
  { name: "Beef and broccoli with rice", category: "Meals", calories: 540, protein: 27, carbs: 50, fats: 24, fiber: 4 },
  { name: "Sesame chicken plate", category: "Meals", calories: 760, protein: 29, carbs: 85, fats: 31, fiber: 3 },
  { name: "Burger King Whopper", category: "Fast Food", calories: 670, protein: 31, carbs: 51, fats: 40, fiber: 3 },
  { name: "Burger King fries medium", category: "Fast Food", calories: 380, protein: 5, carbs: 49, fats: 17, fiber: 4 },
  { name: "Sonic cheeseburger", category: "Fast Food", calories: 720, protein: 30, carbs: 54, fats: 42, fiber: 3 },
  { name: "Sonic tots medium", category: "Fast Food", calories: 360, protein: 4, carbs: 41, fats: 20, fiber: 3 },
  { name: "Arby's roast beef classic", category: "Fast Food", calories: 360, protein: 23, carbs: 37, fats: 14, fiber: 2 },
  { name: "Arby's curly fries medium", category: "Fast Food", calories: 550, protein: 6, carbs: 65, fats: 29, fiber: 6 },
  { name: "KFC famous bowl", category: "Fast Food", calories: 590, protein: 26, carbs: 66, fats: 24, fiber: 5 },
  { name: "KFC original chicken breast", category: "Fast Food", calories: 390, protein: 39, carbs: 11, fats: 21, fiber: 1 },
  { name: "Panera mac and cheese", category: "Meals", calories: 470, protein: 17, carbs: 49, fats: 23, fiber: 1 },
  { name: "Panera broccoli cheddar soup bowl", category: "Meals", calories: 360, protein: 14, carbs: 30, fats: 21, fiber: 3 },
  { name: "Publix chicken tender sub half", category: "Meals", calories: 690, protein: 31, carbs: 61, fats: 36, fiber: 4 },
  { name: "Costco pizza slice cheese", category: "Fast Food", calories: 710, protein: 36, carbs: 70, fats: 32, fiber: 4 },
  { name: "Costco pizza slice pepperoni", category: "Fast Food", calories: 650, protein: 34, carbs: 68, fats: 28, fiber: 3 },
  { name: "Publix sweet tea (16 oz)", category: "Drinks", calories: 160, protein: 0, carbs: 42, fats: 0, fiber: 0 },
  { name: "Sweet tea (16 oz)", category: "Drinks", calories: 150, protein: 0, carbs: 38, fats: 0, fiber: 0 },
  { name: "Unsweet tea (16 oz)", category: "Drinks", calories: 0, protein: 0, carbs: 0, fats: 0, fiber: 0 },
  { name: "Lemonade (16 oz)", category: "Drinks", calories: 180, protein: 0, carbs: 46, fats: 0, fiber: 0 },
  { name: "Arnold Palmer (16 oz)", category: "Drinks", calories: 90, protein: 0, carbs: 23, fats: 0, fiber: 0 },
  { name: "Frozen Coke small", category: "Drinks", calories: 160, protein: 0, carbs: 42, fats: 0, fiber: 0 },
  { name: "Milkshake small vanilla", category: "Desserts", calories: 520, protein: 11, carbs: 70, fats: 22, fiber: 0 },
  { name: "Milkshake small chocolate", category: "Desserts", calories: 560, protein: 12, carbs: 78, fats: 23, fiber: 1 },
  { name: "Hostess cupcake", category: "Desserts", calories: 180, protein: 1, carbs: 26, fats: 8, fiber: 0 },
  { name: "Honey bun", category: "Desserts", calories: 300, protein: 4, carbs: 46, fats: 12, fiber: 1 },
  { name: "Donut glazed", category: "Desserts", calories: 270, protein: 4, carbs: 31, fats: 14, fiber: 1 },
  { name: "Brown sugar cinnamon Pop-Tart (1)", category: "Breakfast", calories: 190, protein: 2, carbs: 36, fats: 5, fiber: 1 },
  { name: "Bagel with cream cheese", category: "Breakfast", calories: 340, protein: 10, carbs: 50, fats: 11, fiber: 2 }
];

const FOOD_LIBRARY_PLUS_V50 = [
  { name: "Cheesecake slice", category: "Desserts", calories: 430, protein: 7, carbs: 32, fats: 32, fiber: 1 },
  { name: "New York cheesecake slice", category: "Desserts", calories: 470, protein: 8, carbs: 34, fats: 35, fiber: 1 },
  { name: "Strawberry cheesecake slice", category: "Desserts", calories: 450, protein: 7, carbs: 38, fats: 31, fiber: 1 },
  { name: "Chocolate cheesecake slice", category: "Desserts", calories: 480, protein: 8, carbs: 39, fats: 34, fiber: 2 },
  { name: "Ham and cheese Hot Pocket", category: "Convenience", calories: 310, protein: 11, carbs: 29, fats: 16, fiber: 1 },
  { name: "Pepperoni pizza Hot Pocket", category: "Convenience", calories: 320, protein: 10, carbs: 31, fats: 17, fiber: 1 },
  { name: "Philly steak and cheese Hot Pocket", category: "Convenience", calories: 330, protein: 11, carbs: 31, fats: 18, fiber: 1 },
  { name: "Mac and cheese cup", category: "Convenience", calories: 220, protein: 6, carbs: 31, fats: 8, fiber: 1 },
  { name: "Ramen noodles chicken pack", category: "Convenience", calories: 380, protein: 8, carbs: 52, fats: 14, fiber: 2 },
  { name: "Ramen noodles beef pack", category: "Convenience", calories: 390, protein: 8, carbs: 53, fats: 14, fiber: 2 },
  { name: "Cup noodles chicken", category: "Convenience", calories: 290, protein: 7, carbs: 38, fats: 13, fiber: 1 },
  { name: "Frozen burrito beef and bean", category: "Convenience", calories: 350, protein: 12, carbs: 38, fats: 16, fiber: 4 },
  { name: "Frozen burrito chicken and cheese", category: "Convenience", calories: 330, protein: 14, carbs: 35, fats: 15, fiber: 2 },
  { name: "Taquito chicken (3)", category: "Convenience", calories: 290, protein: 10, carbs: 27, fats: 16, fiber: 2 },
  { name: "Taquito beef (3)", category: "Convenience", calories: 310, protein: 9, carbs: 28, fats: 18, fiber: 2 },
  { name: "Corn dog (1)", category: "Convenience", calories: 220, protein: 6, carbs: 22, fats: 12, fiber: 1 },
  { name: "Mini corn dogs (6)", category: "Convenience", calories: 230, protein: 7, carbs: 22, fats: 12, fiber: 1 },
  { name: "Mozzarella sticks (6)", category: "Snacks", calories: 420, protein: 18, carbs: 30, fats: 25, fiber: 2 },
  { name: "Potato skins (3)", category: "Snacks", calories: 360, protein: 11, carbs: 30, fats: 21, fiber: 3 },
  { name: "Jalapeno poppers (6)", category: "Snacks", calories: 310, protein: 9, carbs: 22, fats: 20, fiber: 2 },
  { name: "Cheese pizza rolls (10)", category: "Snacks", calories: 370, protein: 9, carbs: 47, fats: 16, fiber: 2 },
  { name: "Pepperoni pizza rolls (10)", category: "Snacks", calories: 390, protein: 10, carbs: 47, fats: 18, fiber: 2 },
  { name: "Nachos with cheese", category: "Snacks", calories: 430, protein: 9, carbs: 42, fats: 25, fiber: 3 },
  { name: "Soft pretzel with cheese", category: "Snacks", calories: 450, protein: 11, carbs: 58, fats: 19, fiber: 2 },
  { name: "Pretzel rods (1 oz)", category: "Snacks", calories: 110, protein: 2, carbs: 23, fats: 1, fiber: 1 },
  { name: "Chex Mix (1 oz)", category: "Snacks", calories: 130, protein: 3, carbs: 20, fats: 4, fiber: 1 },
  { name: "Trail mix (1 oz)", category: "Snacks", calories: 140, protein: 3, carbs: 13, fats: 9, fiber: 2 },
  { name: "Mixed nuts (1 oz)", category: "Snacks", calories: 170, protein: 5, carbs: 6, fats: 15, fiber: 3 },
  { name: "Pistachios (1 oz)", category: "Snacks", calories: 160, protein: 6, carbs: 8, fats: 13, fiber: 3 },
  { name: "Cashews (1 oz)", category: "Snacks", calories: 160, protein: 5, carbs: 9, fats: 13, fiber: 1 },
  { name: "Almonds (1 oz)", category: "Snacks", calories: 164, protein: 6, carbs: 6, fats: 14, fiber: 3 },
  { name: "Peanuts (1 oz)", category: "Snacks", calories: 170, protein: 7, carbs: 5, fats: 14, fiber: 2 },
  { name: "Slim Jim original", category: "Snacks", calories: 80, protein: 6, carbs: 1, fats: 6, fiber: 0 },
  { name: "Beef stick", category: "Snacks", calories: 90, protein: 6, carbs: 1, fats: 7, fiber: 0 },
  { name: "Turkey stick", category: "Snacks", calories: 50, protein: 6, carbs: 1, fats: 2, fiber: 0 },
  { name: "String cheese", category: "Snacks", calories: 80, protein: 7, carbs: 1, fats: 6, fiber: 0 },
  { name: "Babybel cheese", category: "Snacks", calories: 70, protein: 5, carbs: 0, fats: 6, fiber: 0 },
  { name: "Cottage cheese (1 cup)", category: "Protein", calories: 206, protein: 28, carbs: 8, fats: 9, fiber: 0 },
  { name: "Greek yogurt plain (1 cup)", category: "Protein", calories: 130, protein: 23, carbs: 9, fats: 0, fiber: 0 },
  { name: "Greek yogurt vanilla (1 cup)", category: "Protein", calories: 150, protein: 15, carbs: 18, fats: 0, fiber: 0 },
  { name: "Yoplait yogurt cup", category: "Snacks", calories: 150, protein: 5, carbs: 26, fats: 2, fiber: 0 },
  { name: "Danimals smoothie", category: "Drinks", calories: 90, protein: 4, carbs: 15, fats: 2, fiber: 0 },
  { name: "Lunchables ham and cheese", category: "Convenience", calories: 250, protein: 12, carbs: 26, fats: 11, fiber: 1 },
  { name: "Lunchables pizza", category: "Convenience", calories: 300, protein: 13, carbs: 33, fats: 12, fiber: 1 },
  { name: "Lunchables turkey and cheddar", category: "Convenience", calories: 240, protein: 13, carbs: 23, fats: 11, fiber: 1 },
  { name: "Peanut butter and jelly sandwich", category: "Meals", calories: 380, protein: 13, carbs: 45, fats: 17, fiber: 3 },
  { name: "Grilled cheese sandwich", category: "Meals", calories: 370, protein: 13, carbs: 30, fats: 22, fiber: 1 },
  { name: "Turkey sandwich", category: "Meals", calories: 320, protein: 22, carbs: 31, fats: 11, fiber: 3 },
  { name: "Ham sandwich", category: "Meals", calories: 330, protein: 21, carbs: 31, fats: 12, fiber: 3 },
  { name: "Bologna sandwich", category: "Meals", calories: 360, protein: 13, carbs: 29, fats: 21, fiber: 2 },
  { name: "BLT sandwich", category: "Meals", calories: 420, protein: 16, carbs: 32, fats: 27, fiber: 2 },
  { name: "Club sandwich", category: "Meals", calories: 520, protein: 28, carbs: 39, fats: 28, fiber: 3 },
  { name: "Chicken Caesar wrap", category: "Meals", calories: 520, protein: 30, carbs: 38, fats: 27, fiber: 3 },
  { name: "Buffalo chicken wrap", category: "Meals", calories: 540, protein: 28, carbs: 39, fats: 29, fiber: 2 },
  { name: "Turkey and cheese wrap", category: "Meals", calories: 430, protein: 25, carbs: 34, fats: 21, fiber: 2 },
  { name: "Ham and cheese croissant", category: "Breakfast", calories: 410, protein: 16, carbs: 28, fats: 26, fiber: 1 },
  { name: "Sausage biscuit", category: "Breakfast", calories: 430, protein: 11, carbs: 34, fats: 28, fiber: 1 },
  { name: "Biscuit and gravy", category: "Breakfast", calories: 520, protein: 12, carbs: 44, fats: 33, fiber: 1 },
  { name: "Cinnamon roll", category: "Breakfast", calories: 420, protein: 6, carbs: 62, fats: 17, fiber: 1 },
  { name: "Blueberry muffin", category: "Breakfast", calories: 380, protein: 5, carbs: 55, fats: 16, fiber: 1 },
  { name: "Chocolate chip muffin", category: "Breakfast", calories: 410, protein: 6, carbs: 57, fats: 18, fiber: 1 },
  { name: "Apple fritter", category: "Desserts", calories: 420, protein: 5, carbs: 52, fats: 22, fiber: 1 },
  { name: "Brownie", category: "Desserts", calories: 240, protein: 3, carbs: 31, fats: 12, fiber: 1 },
  { name: "Chocolate chip cookie", category: "Desserts", calories: 160, protein: 2, carbs: 22, fats: 8, fiber: 1 },
  { name: "Ice cream sandwich", category: "Desserts", calories: 150, protein: 3, carbs: 25, fats: 5, fiber: 0 },
  { name: "Vanilla ice cream (1 cup)", category: "Desserts", calories: 270, protein: 5, carbs: 31, fats: 14, fiber: 0 },
  { name: "Chocolate ice cream (1 cup)", category: "Desserts", calories: 285, protein: 5, carbs: 33, fats: 15, fiber: 2 },
  { name: "Sherbet (1 cup)", category: "Desserts", calories: 220, protein: 3, carbs: 42, fats: 4, fiber: 1 },
  { name: "Pudding cup chocolate", category: "Desserts", calories: 150, protein: 3, carbs: 26, fats: 4, fiber: 0 },
  { name: "Jello cup", category: "Desserts", calories: 70, protein: 1, carbs: 17, fats: 0, fiber: 0 },
  { name: "Banana pudding cup", category: "Desserts", calories: 250, protein: 4, carbs: 38, fats: 9, fiber: 1 },
  { name: "Apple juice (12 oz)", category: "Drinks", calories: 170, protein: 0, carbs: 42, fats: 0, fiber: 0 },
  { name: "Orange juice (12 oz)", category: "Drinks", calories: 165, protein: 3, carbs: 38, fats: 0, fiber: 1 },
  { name: "Cranberry juice cocktail (12 oz)", category: "Drinks", calories: 180, protein: 0, carbs: 46, fats: 0, fiber: 0 },
  { name: "Fruit punch (12 oz)", category: "Drinks", calories: 190, protein: 0, carbs: 48, fats: 0, fiber: 0 },
  { name: "Chocolate milk (12 oz)", category: "Drinks", calories: 230, protein: 9, carbs: 33, fats: 6, fiber: 1 },
  { name: "Whole milk (1 cup)", category: "Drinks", calories: 150, protein: 8, carbs: 12, fats: 8, fiber: 0 },
  { name: "2 percent milk (1 cup)", category: "Drinks", calories: 120, protein: 8, carbs: 12, fats: 5, fiber: 0 },
  { name: "Skim milk (1 cup)", category: "Drinks", calories: 80, protein: 8, carbs: 12, fats: 0, fiber: 0 },
  { name: "Nesquik chocolate milk bottle", category: "Drinks", calories: 280, protein: 14, carbs: 44, fats: 6, fiber: 1 },
  { name: "Yoo-hoo bottle", category: "Drinks", calories: 150, protein: 2, carbs: 30, fats: 2, fiber: 0 },
  { name: "SunnyD (12 oz)", category: "Drinks", calories: 170, protein: 0, carbs: 41, fats: 0, fiber: 0 },
  { name: "Capri Sun pouch", category: "Drinks", calories: 35, protein: 0, carbs: 9, fats: 0, fiber: 0 },
  { name: "Arizona green tea (23 oz)", category: "Drinks", calories: 170, protein: 0, carbs: 43, fats: 0, fiber: 0 },
  { name: "BodyArmor (16 oz)", category: "Drinks", calories: 120, protein: 0, carbs: 29, fats: 0, fiber: 0 },
  { name: "BodyArmor Lyte (16 oz)", category: "Drinks", calories: 20, protein: 0, carbs: 5, fats: 0, fiber: 0 },
  { name: "Minute Maid lemonade (20 oz)", category: "Drinks", calories: 250, protein: 0, carbs: 65, fats: 0, fiber: 0 },
  { name: "Vitaminwater (20 oz)", category: "Drinks", calories: 120, protein: 0, carbs: 32, fats: 0, fiber: 0 },
  { name: "Core Power Elite (14 oz)", category: "Protein Drinks", calories: 230, protein: 42, carbs: 8, fats: 3.5, fiber: 1 },
  { name: "Fairlife protein shake (14 oz)", category: "Protein Drinks", calories: 150, protein: 30, carbs: 4, fats: 2.5, fiber: 1 },
  { name: "Orgain protein shake (11 oz)", category: "Protein Drinks", calories: 160, protein: 20, carbs: 10, fats: 4, fiber: 3 },
  { name: "Ghost energy (16 oz)", category: "Energy Drinks", calories: 5, protein: 0, carbs: 1, fats: 0, fiber: 0 },
  { name: "Bang energy (16 oz)", category: "Energy Drinks", calories: 0, protein: 0, carbs: 0, fats: 0, fiber: 0 },
  { name: "Red Bull sugar free (12 oz)", category: "Energy Drinks", calories: 15, protein: 0, carbs: 4, fats: 0, fiber: 0 },
  { name: "Monster zero ultra (16 oz)", category: "Energy Drinks", calories: 10, protein: 0, carbs: 3, fats: 0, fiber: 0 },
  { name: "Coke Zero (20 oz)", category: "Drinks", calories: 0, protein: 0, carbs: 0, fats: 0, fiber: 0 },
  { name: "Diet Dr Pepper (20 oz)", category: "Drinks", calories: 0, protein: 0, carbs: 0, fats: 0, fiber: 0 },
  { name: "Sprite Zero (20 oz)", category: "Drinks", calories: 0, protein: 0, carbs: 0, fats: 0, fiber: 0 },
  { name: "Root beer (12 oz)", category: "Drinks", calories: 160, protein: 0, carbs: 42, fats: 0, fiber: 0 },
  { name: "Cream soda (12 oz)", category: "Drinks", calories: 160, protein: 0, carbs: 43, fats: 0, fiber: 0 },
  { name: "Ginger ale (12 oz)", category: "Drinks", calories: 130, protein: 0, carbs: 33, fats: 0, fiber: 0 },
  { name: "Chicken noodle soup (1 cup)", category: "Meals", calories: 90, protein: 7, carbs: 11, fats: 2, fiber: 1 },
  { name: "Tomato soup (1 cup)", category: "Meals", calories: 100, protein: 2, carbs: 21, fats: 1, fiber: 2 },
  { name: "Broccoli cheddar soup (1 cup)", category: "Meals", calories: 210, protein: 6, carbs: 14, fats: 15, fiber: 2 },
  { name: "Chili with beans (1 cup)", category: "Meals", calories: 260, protein: 16, carbs: 24, fats: 11, fiber: 7 },
  { name: "Baked potato plain", category: "Meals", calories: 160, protein: 4, carbs: 37, fats: 0, fiber: 4 },
  { name: "Mashed potatoes (1 cup)", category: "Meals", calories: 210, protein: 4, carbs: 35, fats: 7, fiber: 3 },
  { name: "Macaroni and cheese (1 cup)", category: "Meals", calories: 310, protein: 12, carbs: 33, fats: 14, fiber: 2 },
  { name: "Chicken alfredo (1 cup)", category: "Meals", calories: 410, protein: 21, carbs: 28, fats: 23, fiber: 2 },
  { name: "Meatloaf slice", category: "Meals", calories: 280, protein: 21, carbs: 11, fats: 17, fiber: 1 },
  { name: "Pot roast (1 cup)", category: "Meals", calories: 340, protein: 28, carbs: 12, fats: 20, fiber: 2 }
];


function normalizeFoodLibraryName(name = "") {
  return String(name || "")
    .trim()
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/(oz|fl oz|slice|slices|piece|pieces|count|cup|cups|serving|servings|can|bottle|medium|large|small)/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function applyFoodLibraryCorrections(food = {}) {
  const key = normalizeFoodLibraryName(food?.name);
  const overrides = {
    "eggs": { name: "Eggs (2)", category: "Protein", calories: 140, protein: 12, carbs: 1, fats: 10, fiber: 0 },
    "boiled eggs": { name: "Boiled eggs (2)", category: "Protein", calories: 140, protein: 12, carbs: 1, fats: 10, fiber: 0 },
    "boiled egg": { name: "Boiled egg (1)", category: "Protein", calories: 70, protein: 6, carbs: 0.5, fats: 5, fiber: 0 },
    "peanut butter": { name: "Peanut butter (2 tbsp)", category: "Fats", calories: 190, protein: 7, carbs: 7, fats: 16, fiber: 2 },
    "white bread": { name: "White bread (2 slices)", category: "Carbs", calories: 140, protein: 4, carbs: 26, fats: 2, fiber: 1 },
    "wheat bread": { name: "Wheat bread (2 slices)", category: "Carbs", calories: 160, protein: 8, carbs: 28, fats: 2, fiber: 4 },
    "sourdough bread": { name: "Sourdough bread (2 slices)", category: "Carbs", calories: 180, protein: 6, carbs: 36, fats: 1, fiber: 2 },
    "hawaiian rolls": { name: "Hawaiian rolls (2)", category: "Carbs", calories: 180, protein: 4, carbs: 32, fats: 4, fiber: 1 },
    "blackberries": { name: "Blackberries (1 cup)", category: "Fruit", calories: 62, protein: 2, carbs: 14, fats: 1, fiber: 8 },
    "raspberries": { name: "Raspberries (1 cup)", category: "Fruit", calories: 64, protein: 1.5, carbs: 15, fats: 1, fiber: 8 },
    "strawberries": { name: "Strawberries (1 cup)", category: "Fruit", calories: 49, protein: 1, carbs: 12, fats: 0.5, fiber: 3 },
    "grapes": { name: "Grapes (1 cup)", category: "Fruit", calories: 104, protein: 1, carbs: 27, fats: 0, fiber: 1 },
    "watermelon": { name: "Watermelon (2 cups)", category: "Fruit", calories: 90, protein: 2, carbs: 22, fats: 0.5, fiber: 1 }
  };
  const override = overrides[key];
  return override ? { ...food, ...override } : food;
}

function foodSourcePriority(food = {}) {
  const category = String(food?.category || "").toLowerCase();
  if (category.includes("recent logs")) return 1;
  if (category.includes("saved meals")) return 2;
  if (category.includes("custom")) return 3;
  return 4;
}

function dedupeFoodLibraryEntries(entries = []) {
  const best = new Map();
  (entries || []).forEach((entry) => {
    const corrected = applyFoodLibraryCorrections(entry);
    const key = normalizeFoodLibraryName(corrected?.name);
    if (!key) return;
    const existing = best.get(key);
    if (!existing) {
      best.set(key, corrected);
      return;
    }
    const existingPriority = foodSourcePriority(existing);
    const nextPriority = foodSourcePriority(corrected);
    if (nextPriority > existingPriority) {
      best.set(key, corrected);
      return;
    }
    const existingProtein = Number(existing?.protein || 0);
    const nextProtein = Number(corrected?.protein || 0);
    if (nextPriority === existingPriority && nextProtein > existingProtein) {
      best.set(key, corrected);
    }
  });
  return Array.from(best.values());
}

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

function normalizeTimeString(timeString = "") {
  const raw = String(timeString || "").trim();
  if (!raw) return "09:00";
  const match = raw.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return "09:00";
  const hours = String(Math.max(0, Math.min(23, Number(match[1] || 0)))).padStart(2, "0");
  const minutes = String(Math.max(0, Math.min(59, Number(match[2] || 0)))).padStart(2, "0");
  return `${hours}:${minutes}`;
}

function timeInput(date = new Date()) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function parseDateTime(dateString, timeString = "09:00") {
  if (!dateString) return null;
  return new Date(`${dateString}T${normalizeTimeString(timeString)}:00`);
}

function formatTime(dateLike) {
  const date = dateLike instanceof Date ? dateLike : new Date(dateLike);
  if (Number.isNaN(date.getTime())) return "09:00";
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function formatDisplayTime(timeLike) {
  if (!timeLike) return "9:00 AM";
  const [rawH, rawM] = normalizeTimeString(timeLike).split(":");
  const hours = Number(rawH || 0);
  const minutes = Number(rawM || 0);
  const suffix = hours >= 12 ? "PM" : "AM";
  const h12 = hours % 12 || 12;
  return `${h12}:${String(minutes).padStart(2, "0")} ${suffix}`;
}

function addHoursToDateTime(dateString, timeString, hours) {
  const base = parseDateTime(dateString, timeString) || parseDateTime(todayInput(), timeInput());
  base.setTime(base.getTime() + Number(hours || 0) * 3600000);
  return {
    date: localDateKey(base),
    time: formatTime(base),
    dateTime: base
  };
}

function cadenceHoursFromEveryDays(value) {
  const everyDays = Number(value || 0);
  return Number.isFinite(everyDays) && everyDays > 0 ? everyDays * 24 : 0;
}

function entrySortTime(entry = {}, fallbackTime = "09:00") {
  return parseDateTime(entry.date, entry.time || fallbackTime)?.getTime() || 0;
}

function getScheduleMatchingInjections(schedule = {}, injections = []) {
  const fallbackTime = normalizeTimeString(schedule.time || "09:00");
  return (injections || [])
    .filter(
      (entry) =>
        String(entry.peptide || "").toLowerCase() ===
        String(schedule.peptide || "").toLowerCase()
    )
    .sort((left, right) => entrySortTime(right, fallbackTime) - entrySortTime(left, fallbackTime));
}

function getIntervalScheduleAnchor(schedule = {}, injections = []) {
  const fallbackTime = normalizeTimeString(schedule.time || "09:00");
  const matching = getScheduleMatchingInjections(schedule, injections);
  const latest = matching[0];
  if (latest?.date) {
    return {
      date: latest.date,
      time: normalizeTimeString(latest.time || fallbackTime),
      dateTime: parseDateTime(latest.date, latest.time || fallbackTime)
    };
  }
  return {
    date: schedule.startDate,
    time: fallbackTime,
    dateTime: parseDateTime(schedule.startDate, fallbackTime)
  };
}

function dayDistanceFromNow(dateString, timeString = "09:00") {
  const target = parseDateTime(dateString, timeString);
  if (!target) return 0;
  const todayStart = parseDateTime(todayInput(), "00:00");
  const todayEnd = parseDateTime(todayInput(), "23:59");
  if (target >= todayStart && target <= todayEnd) return 0;
  const targetStart = parseDateTime(localDateKey(target), "00:00");
  return Math.ceil((targetStart - todayStart) / 86400000);
}

function buildSchedulePreviewItem(schedule = {}, injections = [], referenceDate = todayInput()) {
  const fallbackTime = normalizeTimeString(schedule.time || "09:00");
  const meta = scheduleMetaFromRow(schedule);
  const matchingInjections = getScheduleMatchingInjections(schedule, injections);
  const injectedToday = matchingInjections.some((entry) => sameDay(entry.date, referenceDate));
  const now = new Date();
  const referenceStart = parseDateTime(referenceDate, "00:00") || now;
  const rangeEnd = addDaysToDateString(referenceDate, 45);

  let dueEntries = [];
  let nextDue = null;

  if (meta.patternType === "interval") {
    const cadenceHours = cadenceHoursFromEveryDays(schedule.everyDays);
    const anchor = cadenceHours > 0 ? getIntervalScheduleAnchor(schedule, injections) : null;
    if (anchor?.dateTime && cadenceHours > 0) {
      const firstDue = addHoursToDateTime(anchor.date, anchor.time, cadenceHours);
      nextDue = firstDue;
      dueEntries.push({ ...firstDue, scheduleId: schedule.id, peptide: schedule.peptide, id: `${schedule.id || schedule.peptide}-${firstDue.date}-${firstDue.time}` });
      let cursor = addHoursToDateTime(firstDue.date, firstDue.time, cadenceHours);
      let guard = 0;
      while (cursor?.dateTime && cursor.date <= rangeEnd && guard < 1200) {
        if (cursor.date >= referenceDate) {
          dueEntries.push({ ...cursor, scheduleId: schedule.id, peptide: schedule.peptide, id: `${schedule.id || schedule.peptide}-${cursor.date}-${cursor.time}` });
        }
        cursor = addHoursToDateTime(cursor.date, cursor.time, cadenceHours);
        guard += 1;
      }
    }
  } else {
    dueEntries = buildPatternDueEntriesForRange(schedule, addDaysToDateString(referenceDate, -14), addDaysToDateString(referenceDate, 45));
    const referenceNow = new Date();
    nextDue = dueEntries.find((entry) => (entry.dateTime?.getTime?.() || 0) >= referenceNow.getTime()) || null;
    if (!nextDue) {
      const pastDue = [...dueEntries].filter((entry) => (entry.dateTime?.getTime?.() || 0) <= referenceNow.getTime());
      nextDue = pastDue[pastDue.length - 1] || null;
    }
  }

  if (!nextDue) nextDue = dueEntries[0] || { date: schedule.startDate, time: fallbackTime, dateTime: parseDateTime(schedule.startDate, fallbackTime) };

  let cycleProgress = injectedToday ? 100 : 0;
  if (meta.patternType === "interval" && Number(schedule.everyDays || 0) > 0) {
    const anchor = getIntervalScheduleAnchor(schedule, injections);
    const anchorMs = anchor?.dateTime?.getTime();
    const nextMs = nextDue?.dateTime?.getTime();
    if (anchorMs && nextMs && nextMs > anchorMs) {
      cycleProgress = clamp(((Date.now() - anchorMs) / (nextMs - anchorMs)) * 100, 0, 100);
    } else if (nextMs && nextMs <= Date.now()) {
      cycleProgress = 100;
    }
  }

  const dueMs = nextDue?.dateTime?.getTime?.() || parseDateTime(nextDue?.date, nextDue?.time || fallbackTime)?.getTime?.() || 0;
  const isPastDue = Boolean(dueMs && dueMs < now.getTime() && !injectedToday);
  const daysAway = isPastDue ? -1 : dayDistanceFromNow(nextDue.date, nextDue.time);

  return {
    ...schedule,
    time: fallbackTime,
    nextDate: nextDue.date,
    nextTime: nextDue.time,
    dueDateTime: nextDue.dateTime,
    daysAway,
    isPastDue,
    cycleProgress,
    injectedToday,
    patternLabel: schedulePatternLabel(schedule),
    reminderLabel: scheduleReminderLabel(meta.reminderMinutes)
  };
}
function buildScheduleDueEntriesForRange(schedule = {}, injections = [], startDate, endDate) {
  const fallbackTime = normalizeTimeString(schedule.time || "09:00");
  const cadenceHours = cadenceHoursFromEveryDays(schedule.everyDays);
  const meta = scheduleMetaFromRow(schedule);
  if (!schedule?.startDate) return [];

  if (meta.patternType !== "interval") {
    return buildPatternDueEntriesForRange(schedule, startDate, endDate);
  }

  const rangeStart = parseDateTime(startDate, "00:00");
  const rangeEnd = parseDateTime(endDate, "23:59");
  if (!rangeStart || !rangeEnd || cadenceHours <= 0) return [];

  let cursor = getIntervalScheduleAnchor(schedule, injections);
  if (cursor?.dateTime) cursor = addHoursToDateTime(cursor.date, cursor.time, cadenceHours);
  const dueEntries = [];
  let guard = 0;
  while (cursor?.dateTime && cursor.dateTime < rangeStart && guard < 1000) {
    cursor = addHoursToDateTime(cursor.date, cursor.time, cadenceHours);
    guard += 1;
  }
  while (cursor?.dateTime && cursor.dateTime <= rangeEnd && guard < 1600) {
    if (cursor.date >= startDate && cursor.date <= endDate) {
      dueEntries.push({
        id: `${schedule.id || schedule.peptide}-${cursor.date}-${cursor.time}`,
        scheduleId: schedule.id,
        peptide: schedule.peptide,
        date: cursor.date,
        time: cursor.time,
        dateTime: cursor.dateTime
      });
    }
    cursor = addHoursToDateTime(cursor.date, cursor.time, cadenceHours);
    guard += 1;
  }
  return dueEntries;
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

function dateDiffDays(leftDate, rightDate) {
  if (!leftDate || !rightDate) return 0;
  const left = new Date(`${leftDate}T12:00:00`);
  const right = new Date(`${rightDate}T12:00:00`);
  return Math.round((left - right) / 86400000);
}

function daysBetweenNow(dateString) {
  const today = new Date(`${todayInput()}T00:00:00`);
  const target = new Date(`${dateString}T00:00:00`);
  return Math.round((target - today) / (1000 * 60 * 60 * 24));
}

function startOfWeek(dateLike = todayInput()) {
  const base = typeof dateLike === "string" ? new Date(`${dateLike}T12:00:00`) : new Date(dateLike);
  const day = base.getDay();
  const shift = day === 0 ? -6 : 1 - day;
  base.setDate(base.getDate() + shift);
  return localDateKey(base);
}

function buildWeekRange(anchorDate = todayInput()) {
  const start = startOfWeek(anchorDate);
  return Array.from({ length: 7 }, (_, index) => addDaysToDateString(start, index));
}

function isWithinLastDays(dateString, days) {
  if (!dateString) return false;
  const diff = daysBetweenNow(dateString);
  return diff <= 0 && diff >= -(days - 1);
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
      bg: "var(--progress-over-bg)",
      fill: "var(--progress-over-fill)",
      text: "var(--progress-over-text)",
      glow: "var(--progress-over-glow)"
    };
  }
  if (status === "met") {
    return {
      bg: "var(--progress-met-bg)",
      fill: "var(--progress-met-fill)",
      text: "var(--progress-met-text)",
      glow: "var(--progress-met-glow)"
    };
  }
  if (status === "under") {
    return {
      bg: "var(--progress-under-bg)",
      fill: "var(--progress-under-fill)",
      text: "var(--progress-under-text)",
      glow: "var(--progress-under-glow)"
    };
  }
  return {
    bg: "var(--progress-neutral-bg)",
    fill: "var(--progress-neutral-fill)",
    text: "var(--progress-neutral-text)",
    glow: "var(--progress-neutral-glow)"
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

function clampNumber(value, min, max) {
  if (!Number.isFinite(Number(value))) return min;
  return Math.min(max, Math.max(min, Number(value)));
}

function normalizeRateTargetForPhase(phaseType = "Maintenance", rawRate, fallbackRate = 0) {
  const fallback = Math.abs(Number(fallbackRate || 0)) || 0;
  if (rawRate === "" || rawRate == null) return fallback;
  const numeric = Number(rawRate);
  if (!Number.isFinite(numeric)) return fallback;
  if (phaseType === "Cut") return Math.max(0.15, Math.abs(numeric));
  if (phaseType === "Bulk" || phaseType === "Blast") return Math.max(0.15, numeric);
  return Math.max(0, Math.abs(numeric));
}

function getRateStepDelta(phaseType = "Maintenance", rateTarget, baselineRate = 0) {
  const resolved = normalizeRateTargetForPhase(phaseType, rateTarget, baselineRate);
  const baseline = Math.abs(Number(baselineRate || 0)) || 0;
  return (resolved - baseline) / 0.25;
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
  const phasePreset = PHASE_PRESETS[phaseType] || PHASE_PRESETS.Bulk;
  const resolvedRate = normalizeRateTargetForPhase(phaseType, phase?.rateTarget, flavor.rateTarget);
  const paceDeltaFromDefault = getRateStepDelta(phaseType, resolvedRate, phasePreset.defaultRate);
  const preserveWorkoutTarget = phase?.autoPilot === false || phase?.userLockedTrainingDays === true;
  const fallbackWorkouts = phasePreset.defaultWorkouts;

  if (!maintenance || !weight) {
    return {
      calories: null,
      protein: null,
      carbs: null,
      fats: null,
      fiber: null,
      workoutTarget:
        preserveWorkoutTarget && phase?.workoutTarget != null && phase?.workoutTarget !== ""
          ? Number(phase.workoutTarget)
          : flavor.workouts || fallbackWorkouts,
      rateTarget: resolvedRate,
      strategyName: flavor.strategyName,
      rationale: [
        "Add age, height, and bodyweight to unlock coach-calculated targets.",
        `Projected pace saved: ${resolvedRate.toFixed(2)} lb/week.`
      ]
    };
  }

  let calorieDelta = flavor.calorieDelta;
  let proteinPerKg = flavor.proteinPerKg;
  let fatPerLb = flavor.fatPerLb;
  let coachWorkouts = flavor.workouts || fallbackWorkouts;
  const adjustments = [`Projected pace saved: ${resolvedRate.toFixed(2)} lb/week.`];

  if (phaseType === "Cut") {
    calorieDelta -= paceDeltaFromDefault * 170;
    proteinPerKg = clampNumber(flavor.proteinPerKg + Math.max(0, paceDeltaFromDefault) * 0.06 + Math.min(0, paceDeltaFromDefault) * 0.03, 1.95, 2.4);
    fatPerLb = clampNumber(flavor.fatPerLb - Math.max(0, paceDeltaFromDefault) * 0.012 + Math.max(0, -paceDeltaFromDefault) * 0.01, 0.24, 0.34);
    coachWorkouts = clampNumber(Math.round((flavor.workouts || fallbackWorkouts) + paceDeltaFromDefault * 0.9), 3, 6);
    if (paceDeltaFromDefault > 0.15) {
      adjustments.push("Faster fat-loss pace now clearly lowers calories, raises cardio demand, and asks the planner for more weekly work.");
    } else if (paceDeltaFromDefault < -0.15) {
      adjustments.push("Slower fat-loss pace relaxes calories upward and lets weekly workload back off so recovery stays cleaner.");
    }
  } else if (phaseType === "Bulk" || phaseType === "Blast") {
    calorieDelta += paceDeltaFromDefault * 140;
    proteinPerKg = clampNumber(flavor.proteinPerKg + Math.max(0, paceDeltaFromDefault) * 0.02, 1.75, 2.12);
    fatPerLb = clampNumber(flavor.fatPerLb + Math.max(0, paceDeltaFromDefault) * 0.006, 0.28, 0.38);
    coachWorkouts = clampNumber(Math.round((flavor.workouts || fallbackWorkouts) + paceDeltaFromDefault * 0.6), 3, 6);
    if (paceDeltaFromDefault > 0.15) {
      adjustments.push("A faster growth pace now adds a more visible calorie bump and slightly more weekly training support.");
    } else if (paceDeltaFromDefault < -0.15) {
      adjustments.push("A slower growth pace trims food pressure and leaves more room for recovery quality.");
    }
  } else {
    calorieDelta += paceDeltaFromDefault * 65;
    coachWorkouts = clampNumber(Math.round((flavor.workouts || fallbackWorkouts) + paceDeltaFromDefault * 0.35), 3, 5);
    if (Math.abs(paceDeltaFromDefault) > 0.15) {
      adjustments.push("Your chosen pace lightly nudges food and weekly workload even in stability phases.");
    }
  }

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
  const protein = roundToNearest(kg * proteinPerKg, 5);
  const fats = roundToNearest(weight * fatPerLb, 5);
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
      preserveWorkoutTarget && phase?.workoutTarget != null && phase?.workoutTarget !== ""
        ? Number(phase.workoutTarget)
        : coachWorkouts,
    rateTarget: resolvedRate,
    strategyName: flavor.strategyName,
    rationale
  };
}

function buildCardioGuidance({ phase, profile }) {
  const phaseType = phase?.type || (profile.onTRT ? "TRT Cruise" : "Maintenance");
  const settings = getPhasePlannerSettings(phase, profile);
  const guide = {
    Bulk: {
      heading: "Use easy cardio like background support, not a second leg day.",
      frequency: "2–4 lighter sessions / week",
      duration: "15–30 min",
      intensity: "Mostly easy, conversational",
      timing: "Off days, after meals, or post-lift if legs feel good",
      ideas: ["Incline walk", "Easy bike", "Outdoor walk", "Rucking"],
      note: "Enough movement to support appetite, conditioning, and health without stealing recovery.",
      shortLabel: "Easy movement bias",
      nudgeHint: "If cardio is missing today, an easy walk is enough."
    },
    Cut: {
      heading: "Let cardio support the deficit without flattening your training week.",
      frequency: "3–6 repeatable sessions / week",
      duration: "20–45 min",
      intensity: "Mostly brisk to moderate",
      timing: "Morning walks, post-lift, or split later in the day",
      ideas: ["Incline treadmill", "Bike", "Stairmill", "Fast outdoor walks"],
      note: "Stack the easiest-to-repeat cardio first, then only add intensity if recovery stays clean.",
      shortLabel: "Repeatable deficit support",
      nudgeHint: "If cardio is missing today, a brisk incline walk fits this phase well."
    },
    Maintenance: {
      heading: "Keep cardio boring, steady, and easy to repeat.",
      frequency: "3–5 easy sessions / week",
      duration: "20–35 min",
      intensity: "Low-to-moderate",
      timing: "Post-meal walks or any slot you can keep year-round",
      ideas: ["Walks", "Bike", "Jog/walk blend", "Rowing"],
      note: "Maintenance works best when movement is consistent enough to disappear into routine.",
      shortLabel: "Steady maintenance lane",
      nudgeHint: "If cardio is missing today, a short easy walk still counts."
    },
    "TRT Cruise": {
      heading: "Cruise phases reward calm, repeatable movement and cleaner recovery.",
      frequency: "4–6 easy sessions / week",
      duration: "20–40 min",
      intensity: "Mostly low-to-moderate zone 2",
      timing: "Daily walks, after meals, or light standalone sessions",
      ideas: ["Daily walks", "Easy bike", "Elliptical", "Hiking"],
      note: "This is a strong phase for building aerobic base and keeping health markers stable without drama.",
      shortLabel: "Routine-first cardio",
      nudgeHint: "If cardio is missing today, easy movement is usually the best call."
    },
    Blast: {
      heading: "Use cardio as low-fatigue support so the rest of the phase stays readable.",
      frequency: "2–4 low-fatigue sessions / week",
      duration: "15–30 min",
      intensity: "Low-to-moderate with minimal leg fatigue",
      timing: "Away from hard lower-body sessions when possible",
      ideas: ["Incline walk", "Bike", "Sled drags", "Elliptical"],
      note: "A small dose of repeatable cardio usually does more here than chasing intensity.",
      shortLabel: "Low-fatigue support",
      nudgeHint: "If cardio is missing today, keep it simple and low-drama."
    }
  };
  const baseGuide = guide[phaseType] || guide.Maintenance;
  const cardioTargets = resolveCardioTargets({ phaseType, settings, rateTarget: phase?.rateTarget || 0 });
  const paceLabel = phaseType === "Cut"
    ? normalizeRateTargetForPhase(phaseType, phase?.rateTarget, PHASE_PRESETS.Cut.defaultRate) >= 1
      ? "Faster cut pace"
      : "Measured cut pace"
    : phaseType === "Bulk" || phaseType === "Blast"
    ? normalizeRateTargetForPhase(phaseType, phase?.rateTarget, (PHASE_PRESETS[phaseType] || PHASE_PRESETS.Bulk).defaultRate) >= (PHASE_PRESETS[phaseType] || PHASE_PRESETS.Bulk).defaultRate + 0.2
      ? "Pushed growth pace"
      : "Steady growth pace"
    : "Stable pace";

  return {
    ...baseGuide,
    frequency: cardioTargets.sessions <= 0
      ? "No scheduled cardio days required"
      : `${Math.max(1, cardioTargets.sessions - 1)}–${Math.min(7, cardioTargets.sessions + 1)} sessions / week`,
    duration: cardioTargets.sessions <= 0
      ? "Optional 10–20 min recovery walks"
      : `${Math.max(10, cardioTargets.minutes - 5)}–${cardioTargets.minutes + (phaseType === "Cut" ? 10 : 5)} min`,
    shortLabel: `${paceLabel} • ${baseGuide.shortLabel}`,
    note: cardioTargets.sessions <= 0
      ? `${baseGuide.note} Your cardio preference is currently telling the planner to leave cardio unscheduled unless recovery movement sounds helpful.`
      : `${baseGuide.note} Current setup is aiming for about ${cardioTargets.sessions} planned cardio slots around ${cardioTargets.minutes} min.`
  };
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
  const trtContext = [profile.trtType, profile.injectionFrequency].filter(Boolean).join(" • ");
  const peptideContext = profile.usingPeptides ? [profile.peptideName, profile.peptideCategory].filter(Boolean).join(" • ") || "Peptide context active." : "";
  return {
    headline:
      phaseType === "Blast"
        ? "Protocol tracking is high-priority this phase."
        : phaseType === "Cut"
        ? "Keep protocol timing steady so the rest of the phase stays predictable."
        : "Consistency beats complexity here.",
    detail:
      `This app now adds phase-aware protocol context, monitoring watchlists, and coaching notes — but not dosing or stack instructions.${trtContext ? ` Saved profile context: ${trtContext}.` : ""}`,
    focus:
      profile.onTRT || phaseType === "TRT Cruise"
        ? `Watch adherence, symptom notes, hematocrit, lipids, liver markers, and PSA context.${peptideContext ? ` ${peptideContext}` : ""}`
        : `Use this tab to keep protocol history tight, easy to review, and matched to labs over time.${peptideContext ? ` ${peptideContext}` : ""}`
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
      : []),
    ...(profile.peptideName && /bpc|tb-500|ghk/i.test(profile.peptideName) ? ["ALT", "AST"] : []),
    ...(profile.peptideName && /sema|tirz|reta/i.test(profile.peptideName) ? ["fasting glucose", "A1C"] : [])
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

function buildWorkoutPlan(groups, selection = {}, phaseType = "Maintenance") {
  if (!Array.isArray(groups) || groups.length === 0) return "";
  return groups
    .map((group) => {
      const variants = getWorkoutVariants(group, phaseType);
      const pick = variants[selection[group] || 0] || variants[0];
      return pick?.plan || pick?.template || WORKOUT_TEMPLATES[group] || "";
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
        <line x1={pad} y1={pad} x2={pad} y2={height - pad} stroke="var(--input-border)" />
        <line
          x1={pad}
          y1={height - pad}
          x2={width - pad}
          y2={height - pad}
          stroke="var(--input-border)"
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
              fill="var(--text-subtle)"
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

function MultiMetricChart({ data, series, emptyText, subtitle }) {
  if (!data || data.length < 2) return <div style={styles.emptyBox}>{emptyText}</div>;

  const width = 720;
  const height = 260;
  const padX = 34;
  const padY = 24;
  const usable = data.filter((row) =>
    series.some((item) => Number.isFinite(Number(row[item.key])))
  );

  if (usable.length < 2) return <div style={styles.emptyBox}>{emptyText}</div>;

  const xForIndex = (index) =>
    padX + (index * (width - padX * 2)) / Math.max(usable.length - 1, 1);

  const builtSeries = series
    .map((item) => {
      const values = usable
        .map((row) => Number(row[item.key]))
        .filter((value) => Number.isFinite(value));

      if (values.length < 2) return null;

      const min = Math.min(...values);
      const max = Math.max(...values);
      const range = Math.max(max - min, 1);

      const points = usable
        .map((row, index) => {
          const value = Number(row[item.key]);
          if (!Number.isFinite(value)) return null;
          return {
            x: xForIndex(index),
            y: height - padY - ((value - min) / range) * (height - padY * 2),
            value,
            date: row.date,
            id: `${item.key}-${row.date}-${index}`
          };
        })
        .filter(Boolean);

      if (points.length < 2) return null;

      const path = points
        .map((point, index) => `${index === 0 ? "M" : "L"}${point.x} ${point.y}`)
        .join(" ");

      return {
        ...item,
        points,
        path,
        min,
        max,
        latest: points[points.length - 1]?.value ?? null
      };
    })
    .filter(Boolean);

  if (builtSeries.length === 0) return <div style={styles.emptyBox}>{emptyText}</div>;

  return (
    <div style={styles.chartWrap}>
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", height: 260 }}>
        {[0, 1, 2, 3].map((line) => {
          const y = padY + (line * (height - padY * 2)) / 3;
          return (
            <line
              key={line}
              x1={padX}
              y1={y}
              x2={width - padX}
              y2={y}
              stroke="var(--chart-grid)"
              strokeDasharray="4 6"
            />
          );
        })}
        <line x1={padX} y1={padY} x2={padX} y2={height - padY} stroke="var(--input-border)" />
        <line
          x1={padX}
          y1={height - padY}
          x2={width - padX}
          y2={height - padY}
          stroke="var(--input-border)"
        />

        {builtSeries.map((item) => (
          <g key={item.key}>
            <path d={item.path} fill="none" stroke={item.color} strokeWidth="3.25" strokeLinecap="round" />
            {item.points.map((point) => (
              <circle key={point.id} cx={point.x} cy={point.y} r="4" fill={item.color} />
            ))}
          </g>
        ))}

        {usable.map((row, index) => (
          <text
            key={row.date}
            x={xForIndex(index)}
            y={height - 8}
            textAnchor="middle"
            fontSize="10"
            fill="var(--text-subtle)"
          >
            {shortDate(row.date)}
          </text>
        ))}
      </svg>

      <div style={styles.metricLegendGrid}>
        {builtSeries.map((item) => (
          <div key={item.key} style={styles.metricLegendCard}>
            <div style={styles.metricLegendTop}>
              <div style={{ ...styles.metricLegendDot, background: item.color }} />
              <div style={styles.metricLegendLabel}>{item.label}</div>
            </div>
            <div style={styles.metricLegendValue}>
              {item.latest != null ? `${item.latest}${item.unit || ""}` : "—"}
            </div>
            <div style={styles.smallText}>
              Range {item.min}{item.unit || ""} → {item.max}{item.unit || ""}
            </div>
          </div>
        ))}
      </div>
      {subtitle ? <div style={styles.smallText}>{subtitle}</div> : null}
    </div>
  );
}

function DailyRewardTile({ title, cadence, done, note, stateLabel, streakCount = 0, streakUnit = "d", fireSize = null }) {
  const glowStyle =
    done
      ? fireSize === "big"
        ? styles.dailyRewardGlowBig
        : fireSize === "medium"
        ? styles.dailyRewardGlowMedium
        : fireSize === "small"
        ? styles.dailyRewardGlowSmall
        : styles.dailyRewardGlowDone
      : styles.dailyRewardGlowTodo;

  const streakText = streakCount > 0 ? `${streakCount}${streakUnit}` : "0";
  const fireIconStyle =
    fireSize === "big"
      ? styles.dailyRewardFireBig
      : fireSize === "medium"
      ? styles.dailyRewardFireMedium
      : fireSize === "small"
      ? styles.dailyRewardFireSmall
      : null;

  return (
    <div
      style={
        done
          ? { ...styles.dailyRewardTile, ...styles.dailyRewardTileDone, ...glowStyle }
          : { ...styles.dailyRewardTile, ...styles.dailyRewardTileTodo, ...glowStyle }
      }
    >
      {fireIconStyle ? (
        <div style={{ ...styles.dailyRewardFireBadge, ...fireIconStyle }} aria-hidden="true">
          🔥
        </div>
      ) : null}
      <div style={styles.dailyRewardHeader}>
        <div style={styles.dailyRewardLabel}>{title}</div>
      </div>
      <div style={styles.dailyRewardStateRow}>
        <div style={styles.dailyRewardState}>{stateLabel || (done ? "Done" : "Open")}</div>
        <div style={styles.dailyRewardStreak}>{streakText}</div>
      </div>
      <div style={styles.dailyRewardCadence}>{cadence}</div>
      <div style={styles.dailyRewardNote}>{note}</div>
      <div style={styles.dailyRewardCornerBadge} aria-hidden="true">{done ? "💪" : "👎"}</div>
    </div>
  );
}

function ProgressBubble({ title, valueText, percent, status, subtitle, style = {}, compact = false }) {
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
        ...(compact ? styles.progressBubbleCompact : null),
        ...style,
        background: `linear-gradient(180deg, var(--progress-shell-top), ${colors.bg})`,
        boxShadow: `inset 0 1px 0 var(--progress-shell-inset), inset 0 -6px 12px var(--progress-shell-shadow), 0 10px 24px var(--progress-shell-drop), 0 0 6px ${colors.glow}`
      }}
    >
      <div style={styles.glassHighlight} />
      <div style={compact ? { ...styles.progressTopRow, marginBottom: 2 } : styles.progressTopRow}>
        <div style={compact ? styles.progressTitleCompact : styles.progressTitle}>
          {icon} {title}
        </div>
        <div
          style={{
            ...(compact ? styles.progressChipCompact : styles.progressChip),
            color: colors.text,
            border: `1px solid ${colors.glow}`
          }}
        >
          {Math.round(percent)}%
        </div>
      </div>
      <div
        style={{
          ...(compact ? styles.progressValueCompact : styles.progressValue),
          color: colors.text,
          fontSize: isCalories ? (compact ? 18 : 22) : compact ? 14 : 18
        }}
      >
        {valueText}
      </div>
      <div style={compact ? styles.progressBarCompact : styles.progressBarElite}>
        <div
          style={{
            ...styles.progressFillElite,
            width: `${percent}%`,
            background: `linear-gradient(90deg, ${colors.fill}, rgba(255,255,255,0.18))`
          }}
        />
      </div>
      {subtitle ? <div style={compact ? styles.progressSubCompact : styles.progressSub}>{subtitle}</div> : null}
    </div>
  );
}

function AdviceModal({ advice, onClose, themeMode = 'dark' }) {
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
    <div data-swipe-block="true" style={styles.modalOverlay} onClick={onClose}>
      <div data-swipe-block="true" className={themeMode === 'light' ? 'theme-light-panel' : ''} style={styles.modalCard} onClick={(e) => e.stopPropagation()}>
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

function ActionModal({ open, title, onClose, children, themeMode = 'dark' }) {
  if (!open) return null;
  return (
    <div data-swipe-block="true" style={styles.modalOverlay} onClick={onClose}>
      <div data-swipe-block="true" className={themeMode === 'light' ? 'theme-light-panel' : ''} style={styles.sheetCard} onClick={(e) => e.stopPropagation()}>
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

function compareDateAsc(a, b) {
  return a > b ? 1 : -1;
}

function compareDateDesc(a, b) {
  return a < b ? 1 : -1;
}

function normalizeDockItems(items) {
  const byKey = Object.fromEntries(DOCK_ITEM_DEFINITIONS.map((item) => [item.key, item]));
  const seeded = Array.isArray(items) ? items : [];
  const known = seeded
    .filter((item) => item && byKey[item.key])
    .map((item) => ({ ...byKey[item.key], visible: item.visible !== false }));
  const missing = DOCK_ITEM_DEFINITIONS.filter((item) => !known.some((entry) => entry.key === item.key)).map((item) => ({ ...item, visible: true }));
  return [...known, ...missing];
}

function getStoredDockItems() {
  try {
    return normalizeDockItems(JSON.parse(localStorage.getItem(DOCK_STORAGE_KEY) || "[]"));
  } catch {
    return normalizeDockItems([]);
  }
}

function saveStoredDockItems(items) {
  localStorage.setItem(
    DOCK_STORAGE_KEY,
    JSON.stringify((items || []).map(({ key, visible }) => ({ key, visible })))
  );
}

function getStoredThemeMode() {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    return saved === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}

function saveStoredThemeMode(mode) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, mode === "light" ? "light" : "dark");
  } catch {}
}

function getStoredWorkoutChecklist() {
  try {
    const saved = JSON.parse(localStorage.getItem(WORKOUT_CHECKLIST_STORAGE_KEY) || '{}');
    return saved && typeof saved === "object" ? saved : {};
  } catch {
    return {};
  }
}

function saveStoredWorkoutChecklist(value = {}) {
  try {
    localStorage.setItem(WORKOUT_CHECKLIST_STORAGE_KEY, JSON.stringify(value || {}));
  } catch {}
}

function getStoredWorkoutExecution() {
  try {
    const saved = JSON.parse(localStorage.getItem(WORKOUT_EXECUTION_STORAGE_KEY) || '{}');
    return saved && typeof saved === "object" ? saved : {};
  } catch {
    return {};
  }
}

function saveStoredWorkoutExecution(value = {}) {
  try {
    localStorage.setItem(WORKOUT_EXECUTION_STORAGE_KEY, JSON.stringify(value || {}));
  } catch {}
}

function getStoredBodyMetricExtras() {
  try {
    const saved = JSON.parse(localStorage.getItem(BODY_METRIC_EXTRAS_STORAGE_KEY) || "{}");
    return saved && typeof saved === "object" ? saved : {};
  } catch {
    return {};
  }
}

function saveStoredBodyMetricExtras(value = {}) {
  try {
    localStorage.setItem(BODY_METRIC_EXTRAS_STORAGE_KEY, JSON.stringify(value || {}));
  } catch {}
}

function normalizeAppSettings(value = {}) {
  return {
    protocolNotificationsEnabled: Boolean(value?.protocolNotificationsEnabled),
    protocolPermission: typeof value?.protocolPermission === "string" ? value.protocolPermission : "default",
    protocolReminderMinutes: String(value?.protocolReminderMinutes ?? "60"),
    motivationRemindersEnabled: value?.motivationRemindersEnabled !== false,
    reminderFoodEnabled: value?.reminderFoodEnabled !== false,
    reminderWorkoutEnabled: value?.reminderWorkoutEnabled !== false,
    reminderProteinEnabled: value?.reminderProteinEnabled !== false,
    reminderPhotoEnabled: value?.reminderPhotoEnabled !== false,
    tutorialSeen: Boolean(value?.tutorialSeen)
  };
}

function getStoredAppSettings() {
  try {
    return normalizeAppSettings(JSON.parse(localStorage.getItem(APP_SETTINGS_STORAGE_KEY) || "{}"));
  } catch {
    return normalizeAppSettings({});
  }
}

function saveStoredAppSettings(value = {}) {
  try {
    localStorage.setItem(APP_SETTINGS_STORAGE_KEY, JSON.stringify(normalizeAppSettings(value)));
  } catch {}
}

function getStoredReminderLedger() {
  try {
    const saved = JSON.parse(localStorage.getItem(REMINDER_LEDGER_STORAGE_KEY) || "{}");
    return saved && typeof saved === "object" ? saved : {};
  } catch {
    return {};
  }
}

function saveStoredReminderLedger(value = {}) {
  try {
    localStorage.setItem(REMINDER_LEDGER_STORAGE_KEY, JSON.stringify(value || {}));
  } catch {}
}

function normalizeSavedMeal(meal = {}) {
  return {
    id: meal.id || `meal-${Math.random().toString(36).slice(2, 10)}`,
    name: String(meal.name || "Saved meal").trim() || "Saved meal",
    calories: Number(meal.calories || 0),
    protein: Number(meal.protein || 0),
    carbs: Number(meal.carbs || 0),
    fats: Number(meal.fats || 0),
    fiber: Number(meal.fiber || 0)
  };
}

function getStoredSavedMeals() {
  try {
    const saved = JSON.parse(localStorage.getItem(SAVED_MEALS_STORAGE_KEY) || '[]');
    return Array.isArray(saved) ? saved.map((meal) => normalizeSavedMeal(meal)).filter((meal) => meal.name) : [];
  } catch {
    return [];
  }
}

function saveStoredSavedMeals(value = []) {
  try {
    localStorage.setItem(SAVED_MEALS_STORAGE_KEY, JSON.stringify((value || []).map((meal) => normalizeSavedMeal(meal)).slice(0, 24)));
  } catch {}
}

function getStoredSignalSeed() {
  try {
    const saved = JSON.parse(localStorage.getItem(SIGNAL_ROTATION_STORAGE_KEY) || '{}');
    return saved?.date === todayInput() ? Math.max(0, Number(saved.count || 0) - 1) : 0;
  } catch {
    return 0;
  }
}

function bumpStoredSignalSeed() {
  try {
    const saved = JSON.parse(localStorage.getItem(SIGNAL_ROTATION_STORAGE_KEY) || '{}');
    const today = todayInput();
    const nextCount = saved?.date === today ? Number(saved.count || 0) + 1 : 1;
    localStorage.setItem(SIGNAL_ROTATION_STORAGE_KEY, JSON.stringify({ date: today, count: nextCount }));
    return nextCount - 1;
  } catch {
    return 0;
  }
}

function getStoredSignalHistory() {
  try {
    const saved = JSON.parse(localStorage.getItem(SIGNAL_HISTORY_STORAGE_KEY) || '[]');
    return Array.isArray(saved) ? saved.filter(Boolean).slice(0, 12) : [];
  } catch {
    return [];
  }
}

function saveStoredSignalHistory(messages = []) {
  try {
    localStorage.setItem(
      SIGNAL_HISTORY_STORAGE_KEY,
      JSON.stringify((messages || []).filter(Boolean).slice(0, 12))
    );
  } catch {}
}

function buildRotatingSignalDeck(signalPool = [], nutritionIdeaSignal = null, seed = 0) {
  const normalizedSeed = Number.isFinite(Number(seed)) ? Math.max(0, Number(seed)) : 0;
  const nutritionSignal = nutritionIdeaSignal
    ? {
        kind: 'guide',
        priority: 62,
        icon: '🍽️',
        message: nutritionIdeaSignal.title,
        hint: nutritionIdeaSignal.foods?.length
          ? `Easy fixes: ${nutritionIdeaSignal.foods.map((food) => food.name).join(' • ')}`
          : nutritionIdeaSignal.hint
      }
    : null;

  const merged = [...(signalPool || []), ...(nutritionSignal ? [nutritionSignal] : [])]
    .filter((signal) => signal?.message)
    .sort((left, right) => (right.priority || 0) - (left.priority || 0));

  const unique = merged.filter(
    (signal, index, array) => array.findIndex((item) => item.message === signal.message) === index
  );
  const recentHistory = getStoredSignalHistory();
  const historyIndex = new Map(recentHistory.map((message, index) => [message, index]));
  const freshnessPenalty = (signal) => (historyIndex.has(signal.message) ? 24 - historyIndex.get(signal.message) : -6);
  const freshOrdered = [...unique].sort((left, right) => {
    const diff = freshnessPenalty(left) - freshnessPenalty(right);
    if (diff !== 0) return diff;
    return (right.priority || 0) - (left.priority || 0);
  });

  const byKind = {
    warning: freshOrdered.filter((signal) => signal.kind === 'warning'),
    positive: freshOrdered.filter((signal) => signal.kind === 'positive'),
    guide: freshOrdered.filter((signal) => signal.kind === 'guide' || !signal.kind)
  };

  const pickKindSignal = (pool = [], offset = 0) => {
    if (!pool.length) return null;
    const limited = pool.slice(0, Math.min(pool.length, 4));
    return limited[(normalizedSeed + offset) % limited.length] || limited[0];
  };

  const selected = [];
  const seen = new Set();
  [
    ['warning', 0],
    ['positive', 1],
    ['guide', 2]
  ].forEach(([kind, offset]) => {
    const signal = pickKindSignal(byKind[kind], offset);
    if (signal && !seen.has(signal.message)) {
      selected.push(signal);
      seen.add(signal.message);
    }
  });

  if (!freshOrdered.length) return selected;
  const rotationOffset = normalizedSeed % freshOrdered.length;
  const rotated = freshOrdered.slice(rotationOffset).concat(freshOrdered.slice(0, rotationOffset));
  rotated.forEach((signal) => {
    if (selected.length >= 4 || seen.has(signal.message)) return;
    selected.push(signal);
    seen.add(signal.message);
  });

  return selected.slice(0, 4);
}

function isPlannedWorkoutEntry(entry) {
  return String(entry?.notes || "").startsWith(PLANNED_WORKOUT_PREFIX);
}

function isPlannedCardioEntry(entry) {
  return String(entry?.notes || "").startsWith(PLANNED_CARDIO_PREFIX);
}

function encodePlannedMeta(prefix, payload = {}) {
  return `${prefix} ${JSON.stringify(payload)}`;
}

function parsePlannedMeta(notes = "", prefix = "") {
  const raw = String(notes || "").trim();
  if (!raw.startsWith(prefix)) return null;
  const body = raw.slice(prefix.length).trim();
  if (!body) return null;
  try {
    const parsed = JSON.parse(body);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function getPlannedWorkoutMeta(entry = {}) {
  const parsed = parsePlannedMeta(entry?.notes || "", PLANNED_WORKOUT_PREFIX);
  if (parsed) {
    const lane = parsed.lane || "";
    const routineItems = Array.isArray(parsed.routineItems) && parsed.routineItems.length
      ? hydrateRoutineItems(parsed.routineItems, lane)
      : Array.isArray(parsed.routine) && parsed.routine.length
      ? parsed.routine.map((line, index) => createLegacyRoutineItem(line, index, lane || "upper")).filter(Boolean)
      : [];
    const routine = routineItems.length
      ? routineItems.map((item) => `${item.name} — ${item.prescription}`)
      : Array.isArray(parsed.routine)
      ? parsed.routine
      : [];
    return {
      kind: parsed.kind || "train",
      label: parsed.label || "Planned workout",
      cue: parsed.cue || "",
      routine,
      routineItems,
      lane,
      groups: ensureStringArray(parsed.groups || entry?.groups),
      emphasis: parsed.emphasis || "",
      focus: parsed.focus || ""
    };
  }

  const groups = ensureStringArray(entry?.groups);
  const lane = getSessionFamilyFromGroups(groups);
  const legacyLabel = groups.length ? groups.join(" + ") : "Planned workout";
  return {
    kind: groups.length ? "train" : "rest",
    label: legacyLabel,
    cue: stripPlanPrefix(entry?.notes || ""),
    routine: [],
    routineItems: [],
    lane,
    groups,
    emphasis: "",
    focus: ""
  };
}

function getPlannedCardioMeta(entry = {}) {
  const parsed = parsePlannedMeta(entry?.notes || "", PLANNED_CARDIO_PREFIX);
  if (parsed) {
    return {
      kind: parsed.kind || (Number(parsed.minutes || entry?.minutes || 0) > 0 ? "cardio" : "none"),
      label: parsed.label || `${parsed.type || entry?.type || "Cardio"}${Number(parsed.minutes || entry?.minutes || 0) > 0 ? ` • ${parsed.minutes || entry?.minutes} min` : ""}`,
      cue: parsed.cue || "",
      type: parsed.type || entry?.type || "Cardio",
      minutes: Number(parsed.minutes ?? entry?.minutes ?? 0) || 0,
      zone: parsed.zone || "",
      intensity: parsed.intensity || ""
    };
  }

  const minutes = Number(entry?.minutes || 0) || 0;
  return {
    kind: minutes > 0 ? "cardio" : "none",
    label: minutes > 0 ? `${entry?.type || "Cardio"} • ${minutes} min` : "No cardio today",
    cue: stripPlanPrefix(entry?.notes || ""),
    type: entry?.type || (minutes > 0 ? "Cardio" : "No cardio"),
    minutes,
    zone: "",
    intensity: ""
  };
}

function stripPlanPrefix(notes = "") {
  const workoutMeta = parsePlannedMeta(notes, PLANNED_WORKOUT_PREFIX);
  if (workoutMeta) return [workoutMeta.label, workoutMeta.cue].filter(Boolean).join(" • ");
  const cardioMeta = parsePlannedMeta(notes, PLANNED_CARDIO_PREFIX);
  if (cardioMeta) return [cardioMeta.label, cardioMeta.cue].filter(Boolean).join(" • ");
  return String(notes || "")
    .replace(PLANNED_WORKOUT_PREFIX, "")
    .replace(PLANNED_CARDIO_PREFIX, "")
    .replace(/^\s*[-:–—]?\s*/, "")
    .trim();
}

function getConsecutiveDailyLogCount(entries = [], isDone) {
  let count = 0;
  let anchor = todayInput();
  if (!isDone(anchor)) anchor = addDaysToDateString(anchor, -1);
  for (let i = 0; i < 365; i += 1) {
    if (!isDone(anchor)) break;
    count += 1;
    anchor = addDaysToDateString(anchor, -1);
  }
  return count;
}

function getWeekAnchorLabel(dateString = todayInput()) {
  return startOfWeek(dateString);
}

function getConsecutiveWeeklyLogCount(entries = [], isDoneForWeek) {
  let count = 0;
  let anchor = getWeekAnchorLabel(todayInput());
  if (!isDoneForWeek(anchor)) anchor = addDaysToDateString(anchor, -7);
  for (let i = 0; i < 104; i += 1) {
    if (!isDoneForWeek(anchor)) break;
    count += 1;
    anchor = addDaysToDateString(anchor, -7);
  }
  return count;
}

function getStreakFireSize(count) {
  if (count >= 14) return "big";
  if (count >= 7) return "medium";
  if (count >= 3) return "small";
  return null;
}

function isLowerBodyGroup(group = "") {
  return ["Legs", "Quads", "Hamstrings", "Glutes", "Calves"].includes(group);
}

function groupsShareRecoveryBucket(left = "", right = "") {
  const leftGroup = String(left || "").trim();
  const rightGroup = String(right || "").trim();
  if (!leftGroup || !rightGroup) return false;
  if (leftGroup === rightGroup) return true;
  return isLowerBodyGroup(leftGroup) && isLowerBodyGroup(rightGroup);
}

function rotateArray(list = [], offset = 0) {
  if (!list.length) return [];
  const normalized = ((offset % list.length) + list.length) % list.length;
  return list.slice(normalized).concat(list.slice(0, normalized));
}

function countOverlap(left = [], right = []) {
  const rightGroups = right || [];
  return uniqueGroups(left || []).reduce(
    (sum, item) => sum + (rightGroups.some((candidate) => groupsShareRecoveryBucket(item, candidate)) ? 1 : 0),
    0
  );
}

function uniqueGroups(list = []) {
  return [...new Set((list || []).filter(Boolean))];
}

function ensureStringArray(value) {
  if (Array.isArray(value)) return uniqueGroups(value.map((item) => String(item || "").trim()).filter(Boolean));
  if (value == null) return [];
  const raw = String(value).trim();
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return uniqueGroups(parsed.map((item) => String(item || "").trim()).filter(Boolean));
  } catch {}
  const normalized = raw
    .replace(/^\{/, "")
    .replace(/\}$/, "")
    .replace(/^\[/, "")
    .replace(/\]$/, "")
    .replace(/"/g, "")
    .replace(/'/g, "");
  return uniqueGroups(normalized.split(/\s*,\s*|\s*\/\s*/).map((item) => item.trim()).filter(Boolean));
}

function parsePlannedGroupsFromNotes(notes = "") {
  const workoutMeta = parsePlannedMeta(notes, PLANNED_WORKOUT_PREFIX);
  if (workoutMeta?.groups) return ensureStringArray(workoutMeta.groups);
  const cleaned = stripPlanPrefix(notes);
  if (!cleaned) return [];
  const primary = cleaned.split("•")[0] || cleaned;
  return ensureStringArray(primary);
}

function getEntryGroups(entry = {}) {
  const direct = ensureStringArray(entry?.groups);
  if (direct.length) return direct;
  return parsePlannedGroupsFromNotes(entry?.notes || "");
}

function normalizeRowForTable(table, row = {}) {
  if (!row || typeof row !== "object") return row;
  if (table === "workouts") {
    return { ...row, groups: getEntryGroups(row) };
  }
  if (table === "injections") {
    const { Time, ...rest } = row;
    const resolvedTime = rest.time || Time || "";
    return { ...rest, time: resolvedTime ? normalizeTimeString(resolvedTime) : "" };
  }
  if (table === "schedules") {
    const meta = scheduleMetaFromRow(row);
    return {
      ...row,
      everyDays:
        row.everyDays === "" || row.everyDays == null ? row.everyDays : Number(row.everyDays),
      time: normalizeTimeString(row.time || "09:00"),
      tags: encodeScheduleTags(meta),
      patternType: meta.patternType,
      weekdays: meta.weekdays,
      onDays: meta.onDays,
      offDays: meta.offDays,
      reminderMinutes: meta.reminderMinutes
    };
  }
  if (table === "body_metrics") {
    return { ...row, time: row.time ? normalizeTimeString(row.time) : "" };
  }
  if (table === "progress_photos") {
    return { ...row, time: row.time ? normalizeTimeString(row.time) : "" };
  }
  return row;
}

function encodeScheduleTags(meta = {}) {
  const tags = [];
  if (meta.patternType) tags.push(`pattern:${meta.patternType}`);
  if (Array.isArray(meta.weekdays) && meta.weekdays.length) tags.push(`weekdays:${meta.weekdays.join(",")}`);
  if (Number(meta.onDays) > 0) tags.push(`onDays:${Number(meta.onDays)}`);
  if (Number(meta.offDays) >= 0) tags.push(`offDays:${Number(meta.offDays)}`);
  if (meta.reminderMinutes !== "" && meta.reminderMinutes != null) tags.push(`reminder:${Number(meta.reminderMinutes)}`);
  return tags;
}

function parseScheduleTags(tags = []) {
  const items = ensureStringArray(tags);
  const meta = { patternType: "interval", weekdays: [], onDays: 5, offDays: 2, reminderMinutes: 0 };
  items.forEach((tag) => {
    const [rawKey, rawValue] = String(tag || "").split(":");
    const key = String(rawKey || "").trim();
    const value = String(rawValue || "").trim();
    if (!key) return;
    if (key === "pattern" && value) meta.patternType = value;
    if (key === "weekdays") meta.weekdays = value ? value.split(",").map((entry) => entry.trim()).filter(Boolean) : [];
    if (key === "onDays") meta.onDays = Math.max(1, Number(value || 0) || 5);
    if (key === "offDays") meta.offDays = Math.max(0, Number(value || 0) || 0);
    if (key === "reminder") meta.reminderMinutes = Math.max(0, Number(value || 0) || 0);
  });
  return meta;
}

function scheduleMetaFromRow(row = {}) {
  const parsed = parseScheduleTags(row.tags);
  return {
    patternType: parsed.patternType || row.patternType || "interval",
    weekdays: parsed.weekdays?.length ? parsed.weekdays : ensureStringArray(row.weekdays),
    onDays: Number(parsed.onDays || row.onDays || 5),
    offDays: Number(parsed.offDays || row.offDays || 2),
    reminderMinutes: Number(parsed.reminderMinutes ?? row.reminderMinutes ?? 0) || 0
  };
}

function weekdayCodeFromDate(dateString = todayInput()) {
  const date = parseDateTime(dateString, "12:00");
  const codes = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];
  return date ? codes[date.getDay()] : "";
}

function schedulePatternLabel(schedule = {}) {
  const meta = scheduleMetaFromRow(schedule);
  if (meta.patternType === "weekdays") return meta.weekdays?.length ? meta.weekdays.join(", ") : "Selected weekdays";
  if (meta.patternType === "cycle") return `${meta.onDays} on / ${meta.offDays} off`;
  return `Every ${schedule.everyDays} day${Number(schedule.everyDays) === 1 ? "" : "s"}`;
}

function scheduleReminderLabel(minutes = 0) {
  const numeric = Math.max(0, Number(minutes || 0) || 0);
  if (numeric === 0) return "At dose time";
  if (numeric >= 1440) {
    const days = numeric / 1440;
    return days === 1 ? "1 day before" : `${days} days before`;
  }
  if (numeric >= 60 && numeric % 60 === 0) {
    const hours = numeric / 60;
    return hours === 1 ? "1 hour before" : `${hours} hours before`;
  }
  return `${numeric} min before`;
}

function scheduleOccursOnDate(schedule = {}, dateString = todayInput()) {
  const meta = scheduleMetaFromRow(schedule);
  if (!schedule?.startDate || dateString < schedule.startDate) return false;
  if (meta.patternType === "weekdays") {
    const weekdays = meta.weekdays?.length ? meta.weekdays : [weekdayCodeFromDate(schedule.startDate)];
    return weekdays.includes(weekdayCodeFromDate(dateString));
  }
  if (meta.patternType === "cycle") {
    const onDays = Math.max(1, Number(meta.onDays || 5) || 5);
    const offDays = Math.max(0, Number(meta.offDays || 2) || 0);
    const cycleLength = onDays + offDays;
    const diff = dateDiffDays(dateString, schedule.startDate);
    if (diff < 0) return false;
    return cycleLength <= 0 ? false : diff % cycleLength < onDays;
  }
  return false;
}

function buildPatternDueEntriesForRange(schedule = {}, startDate, endDate) {
  const fallbackTime = normalizeTimeString(schedule.time || "09:00");
  const entries = [];
  let cursor = startDate < schedule.startDate ? schedule.startDate : startDate;
  let guard = 0;
  while (cursor <= endDate && guard < 1000) {
    if (scheduleOccursOnDate(schedule, cursor)) {
      entries.push({
        id: `${schedule.id || schedule.peptide}-${cursor}-${fallbackTime}`,
        scheduleId: schedule.id,
        peptide: schedule.peptide,
        date: cursor,
        time: fallbackTime,
        dateTime: parseDateTime(cursor, fallbackTime)
      });
    }
    cursor = addDaysToDateString(cursor, 1);
    guard += 1;
  }
  return entries;
}

function normalizeRowsForTable(table, rows = []) {
  return (rows || []).map((row) => normalizeRowForTable(table, row));
}

function stripUndefinedFields(value = {}) {
  return Object.fromEntries(Object.entries(value || {}).filter(([, entry]) => entry !== undefined));
}

function prepareRowForWrite(table, row = {}) {
  if (!row || typeof row !== "object") return row;
  const { Time, ...rest } = row;
  if (table === "injections") {
    const resolvedTime = rest.time || Time || "";
    return stripUndefinedFields({
      id: rest.id,
      date: rest.date || todayInput(),
      time: resolvedTime ? normalizeTimeString(resolvedTime) : "",
      peptide: rest.peptide || "",
      dosage: rest.dosage || "",
      unit: rest.unit || "mg",
      notes: rest.notes || ""
    });
  }
  if (table === "schedules") {
    const meta = scheduleMetaFromRow(rest);
    return stripUndefinedFields({
      id: rest.id,
      peptide: rest.peptide || "",
      dosage: rest.dosage || "",
      unit: rest.unit || "mg",
      startDate: rest.startDate || todayInput(),
      everyDays: rest.everyDays === "" || rest.everyDays == null ? "" : Number(rest.everyDays),
      time: normalizeTimeString(rest.time || "09:00"),
      tags: encodeScheduleTags(meta)
    });
  }
  if (table === "body_metrics") {
    return stripUndefinedFields({
      ...rest,
      time: rest.time ? normalizeTimeString(rest.time) : ""
    });
  }
  if (table === "progress_photos") {
    return stripUndefinedFields({
      ...rest,
      time: rest.time ? normalizeTimeString(rest.time) : ""
    });
  }
  return stripUndefinedFields(rest);
}

function normalizeGoalEmphasis(value = "") {
  return GOAL_EMPHASIS_OPTIONS.includes(value) ? value : "Balanced";
}

function getPhasePlannerSettings(phase = {}, profile = {}) {
  const requestedStyle = TRAINING_STYLE_OPTIONS.includes(phase?.trainingStyle)
    ? phase.trainingStyle
    : "Let App Decide";
  const storedDays = TRAINING_DAYS_OPTIONS.includes(String(phase?.trainingDaysPreference || ""))
    ? String(phase.trainingDaysPreference)
    : "";
  const workoutTargetValue = Math.max(3, Math.min(6, Number(phase?.workoutTarget || 4) || 4));
  const legacyAutoPilotDays =
    phase?.autoPilot !== false &&
    phase?.userLockedTrainingDays !== true &&
    storedDays &&
    storedDays !== "Flexible" &&
    storedDays === String(workoutTargetValue);
  const requestedDays =
    phase?.userLockedTrainingDays === true
      ? storedDays && storedDays !== "Flexible"
        ? storedDays
        : String(workoutTargetValue)
      : storedDays
      ? legacyAutoPilotDays
        ? "Flexible"
        : storedDays
      : phase?.autoPilot !== false
      ? "Flexible"
      : String(workoutTargetValue);
  const sessionsPerWeek = requestedDays === "Flexible"
    ? workoutTargetValue
    : Math.max(3, Math.min(6, Number(requestedDays || 4) || 4));
  const resolvedStyle =
    requestedStyle === "Let App Decide"
      ? sessionsPerWeek <= 3
        ? "Full Body"
        : sessionsPerWeek === 4
        ? "Upper / Lower"
        : "Push / Pull / Legs"
      : requestedStyle;
  const weakPoints = uniqueGroups(
    ensureStringArray(phase?.weakPoints).filter((group) => WORKOUT_OPTIONS.includes(group))
  );
  const goalEmphasis = normalizeGoalEmphasis(
    phase?.goalEmphasis ||
      (phase?.type === "Cut"
        ? "Fat Loss"
        : phase?.type === "Blast"
        ? "Performance"
        : "Balanced")
  );
  const cardioPreference = CARDIO_PREFERENCE_OPTIONS.includes(phase?.cardioPreference)
    ? phase.cardioPreference
    : phase?.type === "Cut"
    ? "Only when cutting"
    : "Moderate";

  return {
    trainingStyle: requestedStyle,
    resolvedStyle,
    sessionsPerWeek,
    trainingDaysPreference: requestedDays,
    goalEmphasis,
    weakPoints,
    cardioPreference,
    isFlexible: requestedDays === "Flexible",
    profileSex: profile?.sex || ""
  };
}

function buildMuscleBias({ phaseType = "Maintenance", profile = {}, rateTarget = 0, recentCounts = {}, phase = {} }) {
  const bias = {
    Chest: 1,
    Back: 1,
    Shoulders: 1,
    Biceps: 0.85,
    Triceps: 0.85,
    Forearms: 0.55,
    Quads: 1,
    Hamstrings: 1,
    Glutes: 0.95,
    Calves: 0.65,
    Core: 0.7,
    Legs: 1
  };

  const settings = getPhasePlannerSettings(phase, profile);
  const isFemale = profile.sex === "Female";
  const isMale = profile.sex === "Male";
  const activity = profile.activityLevel || "Moderate";
  const age = Number(profile.age || 0);

  if (isFemale) {
    bias.Glutes += 0.95;
    bias.Hamstrings += 0.45;
    bias.Quads += 0.28;
    bias.Shoulders += 0.18;
    bias.Chest -= 0.12;
    bias.Biceps -= 0.08;
    bias.Triceps -= 0.08;
  } else if (isMale) {
    bias.Chest += 0.42;
    bias.Back += 0.42;
    bias.Shoulders += 0.32;
    bias.Biceps += 0.18;
    bias.Triceps += 0.18;
    bias.Glutes -= 0.12;
  }

  if (phaseType === "Bulk") {
    bias.Chest += 0.22;
    bias.Back += 0.22;
    bias.Quads += 0.18;
    bias.Hamstrings += 0.18;
    bias.Legs += 0.15;
  } else if (phaseType === "Blast") {
    bias.Chest += 0.32;
    bias.Back += 0.32;
    bias.Shoulders += 0.4;
    bias.Biceps += 0.24;
    bias.Triceps += 0.24;
    bias.Legs += 0.18;
  } else if (phaseType === "Cut") {
    bias.Back += 0.24;
    bias.Shoulders += 0.18;
    bias.Core += 0.3;
    bias.Forearms += 0.08;
  } else if (phaseType === "TRT Cruise") {
    bias.Back += 0.12;
    bias.Core += 0.18;
  }

  if (settings.goalEmphasis === "Size (Hypertrophy)") {
    bias.Chest += 0.14;
    bias.Back += 0.14;
    bias.Shoulders += 0.14;
    bias.Quads += 0.1;
    bias.Hamstrings += 0.08;
  } else if (settings.goalEmphasis === "Strength") {
    bias.Chest += 0.18;
    bias.Back += 0.18;
    bias.Quads += 0.18;
    bias.Hamstrings += 0.16;
    bias.Triceps -= 0.04;
    bias.Biceps -= 0.04;
  } else if (settings.goalEmphasis === "Fat Loss") {
    bias.Core += 0.24;
    bias.Back += 0.14;
    bias.Calves += 0.08;
  } else if (settings.goalEmphasis === "Performance") {
    bias.Back += 0.18;
    bias.Hamstrings += 0.12;
    bias.Shoulders += 0.08;
    bias.Core += 0.1;
  }

  if (activity === "High") {
    bias.Back += 0.08;
    bias.Core += 0.08;
  } else if (activity === "Low") {
    bias.Shoulders -= 0.04;
    bias.Forearms -= 0.04;
  }

  if (age >= 40) {
    bias.Back += 0.08;
    bias.Core += 0.1;
    bias.Forearms -= 0.03;
  }

  if (phaseType === "Cut" && normalizeRateTargetForPhase(phaseType, rateTarget, PHASE_PRESETS.Cut.defaultRate) >= 1) {
    bias.Core += 0.15;
    bias.Calves += 0.05;
  }

  settings.weakPoints.forEach((group) => {
    if (group in bias) bias[group] += 0.42;
  });

  Object.entries(recentCounts || {}).forEach(([group, count]) => {
    if (!(group in bias)) return;
    const touches = Number(count || 0);
    if (touches <= 1) bias[group] += 0.18;
    else if (touches >= 3) bias[group] -= 0.14;
  });

  Object.keys(bias).forEach((key) => {
    bias[key] = Number(Math.max(0.42, bias[key]).toFixed(2));
  });

  return bias;
}

function sortGroupsByBias(groups = [], bias = {}) {
  return [...groups].sort((left, right) => (bias[right] || 0) - (bias[left] || 0));
}

function getSessionFamilyFromGroups(groups = []) {
  const list = uniqueGroups(groups);
  if (!list.length) return "rest";

  const lowerGroups = ["Legs", "Quads", "Hamstrings", "Glutes", "Calves", "Core"];
  const pushGroups = ["Chest", "Shoulders", "Triceps"];
  const pullGroups = ["Back", "Biceps", "Forearms"];

  const lowerCount = list.filter((group) => lowerGroups.includes(group)).length;
  const pushCount = list.filter((group) => pushGroups.includes(group)).length;
  const pullCount = list.filter((group) => pullGroups.includes(group)).length;
  const upperCount = pushCount + pullCount;

  if (lowerCount && !upperCount) return "lower";
  if (pushCount && !pullCount && lowerCount <= 1) return "push";
  if (pullCount && !pushCount && lowerCount <= 1) return "pull";
  if (lowerCount >= Math.max(2, upperCount)) return "lower";
  if (pushCount > pullCount) return "push";
  if (pullCount > pushCount) return "pull";
  return upperCount ? "upper" : "rest";
}

function makeSession(label, groups, notes, tags = [], lane = "") {
  const normalizedGroups = uniqueGroups(groups);
  return {
    label,
    groups: normalizedGroups,
    notes,
    tags: uniqueGroups(tags),
    lane: lane || getSessionFamilyFromGroups(normalizedGroups)
  };
}

function pickWeakPointByLane(weakPoints = [], lane = "upper") {
  if (lane === "lower") {
    return weakPoints.find((group) => isLowerBodyGroup(group)) || "";
  }
  return weakPoints.find((group) => !isLowerBodyGroup(group) && group !== "Core") || "";
}

function buildSessionBlueprints({ phase = {}, phaseType = "Maintenance", profile = {}, bias = {} }) {
  const settings = getPhasePlannerSettings(phase, profile);
  const upperBias = sortGroupsByBias(["Chest", "Back", "Shoulders", "Biceps", "Triceps"], bias);
  const lowerBias = sortGroupsByBias(["Quads", "Hamstrings", "Glutes", "Calves", "Core"], bias);
  const upperWeak = pickWeakPointByLane(settings.weakPoints, "upper") || upperBias[0] || "Chest";
  const lowerWeak = pickWeakPointByLane(settings.weakPoints, "lower") || lowerBias[0] || "Quads";
  const leadWeakPoint = settings.weakPoints[0] || (settings.goalEmphasis === "Fat Loss" ? "Core" : upperWeak || lowerWeak);

  const pushPrimary = "Chest";
  const pullPrimary = "Back";
  const lowerPrimary = lowerWeak || "Quads";

  const fullBodySessions = [
    makeSession(
      "Full Body A - Push Bias",
      ["Chest", "Back", lowerPrimary, "Hamstrings", "Shoulders", "Core"],
      "Full-body session with a push lead so chest and triceps get the freshest work while lower-body volume still lands.",
      ["full", "push"],
      "push"
    ),
    makeSession(
      "Full Body B - Lower Bias",
      [lowerPrimary, "Hamstrings", "Glutes", "Back", "Shoulders", "Core"],
      "Lower-body biased full-body day to keep legs progressing without stacking another upper-heavy hit.",
      ["full", "lower"],
      "lower"
    ),
    makeSession(
      "Full Body C - Pull Bias",
      ["Back", "Chest", "Shoulders", "Biceps", lowerPrimary, "Core"],
      "Pull-led full-body day so back work comes in fresh while chest only gets a lighter support touch.",
      ["full", "pull"],
      "pull"
    ),
    makeSession(
      `Full Body Pump - ${leadWeakPoint}`,
      [leadWeakPoint, pushPrimary, pullPrimary, lowerPrimary, "Core"],
      `Balanced pump day with a little extra attention on ${leadWeakPoint.toLowerCase()} without wrecking recovery.`,
      ["full", "pump"],
      isLowerBodyGroup(leadWeakPoint) ? "lower" : pushPrimary === leadWeakPoint ? "push" : "pull"
    ),
    makeSession(
      "Full Body Reload",
      ["Back", lowerPrimary, "Chest", "Hamstrings", "Triceps", "Biceps"],
      "Reload session to keep the week moving with manageable fatigue and repeatable exercise quality.",
      ["full", "balanced"],
      "pull"
    ),
    makeSession(
      "Full Body D - Lower Reload",
      [lowerPrimary, "Glutes", "Calves", "Chest", "Back", "Core"],
      "Second lower-biased full-body touch so leg frequency stays high without repeating the same stress twice.",
      ["full", "lower"],
      "lower"
    )
  ];

  const upperLowerSessions = [
    makeSession(
      "Upper Push - Chest + Triceps",
      [pushPrimary, "Shoulders", "Triceps"],
      "Push-led upper day. Chest drives the session first, then shoulders and triceps finish the pressing lane.",
      ["upper", "push"],
      "push"
    ),
    makeSession(
      "Lower Strength",
      [lowerPrimary, "Hamstrings", "Glutes", "Calves", "Core"],
      "Lower day built around one hard squat or press pattern, one hinge, and just enough accessories to move the week forward.",
      ["lower", "strength"],
      "lower"
    ),
    makeSession(
      "Upper Pull - Back + Biceps",
      [pullPrimary, "Biceps", "Shoulders", "Core"],
      "Pull-led upper day so back and biceps get fresh attention without chest being crowded into the same session.",
      ["upper", "pull"],
      "pull"
    ),
    makeSession(
      "Lower Volume",
      ["Quads", "Hamstrings", "Glutes", "Calves", "Core"],
      "Second lower touch with cleaner fatigue so legs come back around without crushing recovery.",
      ["lower", "volume"],
      "lower"
    ),
    makeSession(
      `Upper Balance - ${upperWeak}`,
      [pushPrimary, pullPrimary, upperWeak, "Triceps", "Biceps"],
      `Balanced upper session that keeps both pressing and pulling in the week while biasing ${upperWeak.toLowerCase()} slightly.`,
      ["upper", "balanced"],
      upperWeak === "Back" || upperWeak === "Biceps" ? "pull" : "push"
    ),
    makeSession(
      "Lower Posterior",
      ["Glutes", "Hamstrings", "Quads", "Calves", "Core"],
      "Posterior-biased lower day to spread stress better across the week and avoid hammering the exact same leg pattern again.",
      ["lower", "posterior"],
      "lower"
    )
  ];

  const pplSessions = [
    {
      ...makeSession(
        "Push Day - Chest + Triceps",
        [pushPrimary, "Shoulders", "Triceps"],
        "Primary push day. Chest leads, triceps finish, and the whole session stays in the push lane.",
        ["push", "classic", "primary"],
        "push"
      ),
      routineKey: "push_primary"
    },
    {
      ...makeSession(
        "Leg Day - Quads + Hamstrings",
        [lowerPrimary, "Hamstrings", "Glutes", "Calves", "Core"],
        "Dedicated lower day so legs separate the upper sessions and recovery still feels coached instead of random.",
        ["lower", "classic", "primary"],
        "lower"
      ),
      routineKey: "lower_primary"
    },
    {
      ...makeSession(
        "Pull Day - Back + Biceps",
        [pullPrimary, "Biceps", "Forearms", "Core"],
        "Primary pull day with a vertical pull, a row, and direct arm work. No chest gets mixed in here.",
        ["pull", "classic", "primary"],
        "pull"
      ),
      routineKey: "pull_primary"
    },
    {
      ...makeSession(
        `Push Day 2 - ${pushPrimary} + Delts`,
        [pushPrimary, "Shoulders", "Triceps"],
        `Second push touch for the week. Still chest + triceps focused, just with slightly different exercise selection and fatigue profile.`,
        ["push", "classic", "secondary"],
        "push"
      ),
      routineKey: "push_secondary"
    },
    {
      ...makeSession(
        `Leg Day 2 - ${lowerWeak}`,
        [lowerPrimary, "Glutes", "Hamstrings", "Calves", "Core"],
        `Second lower touch with cleaner fatigue and a bit more attention on ${lowerWeak.toLowerCase()} without turning the week into a leg marathon.`,
        ["lower", "classic", "secondary"],
        "lower"
      ),
      routineKey: "lower_secondary"
    },
    {
      ...makeSession(
        "Pull Day 2 - Back Thickness + Biceps",
        ["Back", "Biceps", "Forearms", "Core"],
        "Second pull touch. Rows, lat finishers, and biceps stay in the pull lane instead of creating a random back-plus-chest mashup.",
        ["pull", "classic", "secondary"],
        "pull"
      ),
      routineKey: "pull_secondary"
    }
  ];

  const bodyPartSessions = [
    makeSession(
      "Chest Day - Chest + Triceps",
      ["Chest", "Shoulders", "Triceps"],
      "Bro-split chest day with triceps support. Chest gets the first clean priority slot.",
      ["push", "bro"],
      "push"
    ),
    makeSession(
      "Leg Day - Lower Body",
      [lowerPrimary, "Hamstrings", "Glutes", "Calves", "Core"],
      "Dedicated lower-body day so the week still respects leg recovery and keeps the split honest.",
      ["lower", "bro"],
      "lower"
    ),
    makeSession(
      "Back Day - Back + Biceps",
      ["Back", "Biceps", "Forearms", "Core"],
      "Dedicated back day with biceps support. Back owns the freshest pulling work.",
      ["pull", "bro"],
      "pull"
    ),
    makeSession(
      "Shoulder Day - Delts + Arms",
      ["Shoulders", "Triceps", "Biceps", "Core"],
      "Delt-driven day that fits cleanly after chest, legs, and back without crowding recovery.",
      ["upper", "bro"],
      "push"
    ),
    makeSession(
      `${leadWeakPoint} Focus Day`,
      [leadWeakPoint, pushPrimary, pullPrimary, isLowerBodyGroup(leadWeakPoint) ? "Core" : "Triceps"],
      `Weak-point slot so ${leadWeakPoint.toLowerCase()} can be nudged without overriding the whole split.`,
      ["focus", "bro"],
      isLowerBodyGroup(leadWeakPoint) ? "lower" : leadWeakPoint === "Back" || leadWeakPoint === "Biceps" ? "pull" : "push"
    ),
    makeSession(
      "Recovery Pump Day",
      [pushPrimary, pullPrimary, lowerPrimary, "Core"],
      "Optional sixth-day pump slot for high-frequency weeks that still keeps the week feeling intentional.",
      ["balanced", "bro"],
      pullPrimary === "Back" ? "pull" : "push"
    )
  ];

  const styles = {
    "Full Body": fullBodySessions,
    "Upper / Lower": upperLowerSessions,
    "Push / Pull / Legs": pplSessions,
    "Body Part Split": bodyPartSessions
  };

  return (styles[settings.resolvedStyle] || pplSessions)
    .slice(0, settings.sessionsPerWeek)
    .map((session, index) => ({ ...session, order: index }));
}

function getDaySlotsForSessionCount(target = 4, totalDays = 7) {
  const safeTotalDays = Math.max(0, Number(totalDays || 0) || 0);
  const count = Math.max(0, Math.min(safeTotalDays || 7, Number(target || 0) || 0));
  if (!safeTotalDays || count <= 0) return [];
  if (count >= safeTotalDays) return Array.from({ length: safeTotalDays }, (_, index) => index);

  if (safeTotalDays === 7) {
    const mapped = {
      1: [1],
      2: [1, 4],
      3: [0, 2, 4],
      4: [0, 1, 3, 5],
      5: [0, 1, 2, 4, 5],
      6: [0, 1, 2, 4, 5, 6]
    }[count];
    if (mapped) return mapped;
  }

  if (count === 1) return [0];
  const step = (safeTotalDays - 1) / (count - 1);
  const slots = Array.from({ length: count }, (_, index) => Math.round(index * step));
  return [...new Set(slots)].slice(0, count).sort((a, b) => a - b);
}

function getRecoveryWindowForGroup(group = "", emphasis = "Balanced") {
  const base = ["Chest", "Back", "Legs", "Quads", "Hamstrings", "Glutes"].includes(group)
    ? 3
    : ["Shoulders", "Biceps", "Triceps", "Forearms"].includes(group)
    ? 2
    : 1;
  return emphasis === "Strength" && ["Chest", "Back", "Legs", "Quads", "Hamstrings", "Glutes"].includes(group)
    ? base + 1
    : base;
}

function scoreSessionRecovery(session, sessionDate, history = [], bias = {}, settings = {}) {
  const groups = uniqueGroups(session.groups || []);
  const lane = session.lane || getSessionFamilyFromGroups(groups);
  let penalty = 0;

  history.forEach((entry, index) => {
    const entryGroups = uniqueGroups(entry.groups || []);
    const daysSince = dateDiffDays(sessionDate, entry.date);
    if (daysSince <= 0 || daysSince > 7) return;

    const overlap = countOverlap(groups, entryGroups);
    if (overlap) {
      penalty += overlap * (daysSince === 1 ? 34 : daysSince === 2 ? 20 : 8);
    }

    groups.forEach((group) => {
      if (entryGroups.some((entryGroup) => groupsShareRecoveryBucket(group, entryGroup)) && daysSince < getRecoveryWindowForGroup(group, settings.goalEmphasis)) {
        penalty += 24;
      }
    });

    const entryLane = entry.lane || getSessionFamilyFromGroups(entryGroups);
    if (lane && entryLane && lane === entryLane && daysSince < 3) {
      penalty += 18;
    }

    if (index === history.length - 1 && lane && entryLane && lane === entryLane) {
      penalty += 10;
    }
  });

  penalty -= groups.reduce((sum, group) => sum + (bias[group] || 0) * 5, 0);
  penalty -= groups.reduce((sum, group) => sum + (settings.weakPoints || []).includes(group) * 16, 0);

  if (settings.goalEmphasis === "Strength" && lane === "lower") penalty -= 4;
  if (settings.goalEmphasis === "Size (Hypertrophy)" && ["push", "pull"].includes(lane)) penalty -= 4;

  return penalty;
}

function rotateSequenceToBestFit(sequence = [], daySlots = [], weekDates = [], recentWorkouts = [], bias = {}, settings = {}) {
  if (sequence.length <= 1) return sequence;

  const relevantHistory = [...recentWorkouts]
    .sort((a, b) => compareDateAsc(a.date || "", b.date || ""))
    .map((entry) => ({
      date: entry.date,
      groups: getEntryGroups(entry),
      lane: getSessionFamilyFromGroups(getEntryGroups(entry))
    }));

  let best = sequence;
  let bestScore = Number.POSITIVE_INFINITY;

  for (let offset = 0; offset < sequence.length; offset += 1) {
    const rotated = rotateArray(sequence, offset);
    const synthetic = [];
    const score = rotated.reduce((sum, session, idx) => {
      const date = weekDates[daySlots[idx]];
      if (!date) return sum;
      const nextScore = scoreSessionRecovery(session, date, [...relevantHistory, ...synthetic], bias, settings);
      synthetic.push({ date, groups: session.groups, lane: session.lane });
      return sum + nextScore;
    }, 0);

    if (score < bestScore) {
      bestScore = score;
      best = rotated;
    }
  }

  return best;
}

function getGroupRoutineLines(group = "", phaseType = "Maintenance") {
  const base = GROUP_LIBRARY_BASE[group] || GROUP_LIBRARY_BASE.Legs;
  return [...(base?.phaseLines?.[phaseType] || base?.lines || [])];
}

function pickRoutineLines(group = "", phaseType = "Maintenance", count = 1, offset = 0) {
  const lines = getGroupRoutineLines(group, phaseType);
  if (!lines.length || count <= 0) return [];
  return Array.from({ length: Math.min(count, lines.length) }, (_, index) => lines[(offset + index) % lines.length]);
}

function dedupeRoutineLines(lines = []) {
  return [...new Set(lines.filter(Boolean))];
}

function buildCoachRoutine(session = {}, phaseType = "Maintenance", settings = {}, bias = {}) {
  if (session.lane === "rest") {
    return {
      title: "Rest Day",
      cue: "Recovery + light movement recommended.",
      routine: [],
      routineItems: [],
      focus: "Planned recovery"
    };
  }

  const weakHits = (settings.weakPoints || []).filter((group) => (session.groups || []).includes(group)).slice(0, 2);
  let routineItems = buildRoutineItemsFromBlueprint(session, phaseType, settings);

  if (!routineItems.length) {
    const fallbackLines = session.lane === "pull"
      ? dedupeRoutineLines([
          ...pickRoutineLines("Back", phaseType, 2),
          ...pickRoutineLines("Biceps", phaseType, 1),
          ...pickRoutineLines("Shoulders", phaseType, 1, 2)
        ]).slice(0, 5)
      : session.lane === "lower"
      ? dedupeRoutineLines([
          ...pickRoutineLines("Legs", phaseType, 2),
          ...pickRoutineLines("Quads", phaseType, 1),
          ...pickRoutineLines("Hamstrings", phaseType, 1),
          ...pickRoutineLines("Calves", phaseType, 1)
        ]).slice(0, 5)
      : session.lane === "push"
      ? dedupeRoutineLines([
          ...pickRoutineLines("Chest", phaseType, 2),
          ...pickRoutineLines("Shoulders", phaseType, 1),
          ...pickRoutineLines("Triceps", phaseType, 1)
        ]).slice(0, 5)
      : dedupeRoutineLines([
          ...pickRoutineLines("Full Body", phaseType, 4),
          ...pickRoutineLines("Core", phaseType, 1)
        ]).slice(0, 5);
    routineItems = fallbackLines.map((line, index) => createLegacyRoutineItem(line, index, session.lane || "upper")).filter(Boolean);
  }

  const lines = routineItems.map((item) => `${item.name} — ${item.prescription}`);
  const emphasisCue =
    settings.goalEmphasis === "Strength"
      ? "Keep the main lifts crisp, log your top sets, and leave technical reps in the tank."
      : settings.goalEmphasis === "Fat Loss"
      ? "Protect performance, keep transitions tight, and treat the accessory work like quality conditioning."
      : settings.goalEmphasis === "Performance"
      ? "Attack the first two lifts, then keep the rest clean enough to recover fast."
      : "Use the first two movements as the main progress drivers and push the accessories close to failure safely.";
  const weakPointCue = weakHits.length ? `Extra attention: ${weakHits.join(" + ")}.` : "";
  const topFocus = Object.entries(bias)
    .sort((left, right) => right[1] - left[1])
    .map(([group]) => group)
    .filter((group) => (session.groups || []).includes(group))
    .slice(0, 2)
    .join(" + ");

  return {
    title: session.label || "Planned session",
    cue: [session.notes, weakPointCue, emphasisCue].filter(Boolean).join(" "),
    routine: lines,
    routineItems,
    focus: topFocus || (session.groups || []).slice(0, 2).join(" + ") || "Balanced session"
  };
}

function resolveCardioTargets({ phaseType = "Maintenance", settings = {}, rateTarget = 0 }) {
  let sessions = phaseType === "Cut" ? 4 : phaseType === "TRT Cruise" ? 4 : phaseType === "Maintenance" ? 3 : 2;
  let minutes = phaseType === "Cut" ? 25 : phaseType === "TRT Cruise" ? 25 : 20;
  let catalog =
    phaseType === "Cut"
      ? [
          { type: "Incline walk", intensity: "moderate", note: "Repeatable deficit support.", lowerFriendly: true },
          { type: "Bike", intensity: "low intensity", note: "Low-impact conditioning.", lowerFriendly: true },
          { type: "Outdoor walk", intensity: "low intensity", note: "Easy movement that is hard to miss.", lowerFriendly: true },
          { type: "Elliptical", intensity: "moderate", note: "Brisk work with manageable joint cost.", lowerFriendly: true }
        ]
      : phaseType === "TRT Cruise"
      ? [
          { type: "Outdoor walk", intensity: "low intensity", note: "Aerobic base work that fits cruise phases well.", lowerFriendly: true },
          { type: "Easy bike", intensity: "low intensity", note: "Simple conditioning with very low fatigue.", lowerFriendly: true },
          { type: "Elliptical", intensity: "low intensity", note: "Steady state work with low joint stress.", lowerFriendly: true }
        ]
      : [
          { type: "Incline walk", intensity: "low intensity", note: "Low-interference cardio that supports recovery.", lowerFriendly: true },
          { type: "Outdoor walk", intensity: "low intensity", note: "Easy movement that keeps the week active.", lowerFriendly: true },
          { type: "Easy bike", intensity: "low intensity", note: "Low-fatigue conditioning support.", lowerFriendly: true }
        ];

  if (settings.cardioPreference === "Minimal") {
    sessions = Math.max(1, sessions - 1);
    minutes = Math.max(15, minutes - 5);
  } else if (settings.cardioPreference === "High frequency") {
    sessions = Math.min(6, sessions + 2);
    minutes += 5;
  } else if (settings.cardioPreference === "Only when cutting" && phaseType !== "Cut") {
    sessions = 0;
  }

  if (phaseType === "Cut") {
    const paceDelta = getRateStepDelta(phaseType, rateTarget, PHASE_PRESETS.Cut.defaultRate);
    sessions = Math.min(6, Math.max(2, Math.round(sessions + paceDelta * 0.75)));
    minutes = Math.max(20, Math.min(45, Math.round(minutes + paceDelta * 5)));
  } else if (phaseType === "Bulk" || phaseType === "Blast") {
    const paceDelta = getRateStepDelta(phaseType, rateTarget, (PHASE_PRESETS[phaseType] || PHASE_PRESETS.Bulk).defaultRate);
    sessions = Math.max(1, Math.min(4, Math.round(sessions - Math.max(0, paceDelta) * 0.35)));
    minutes = Math.max(15, Math.min(30, Math.round(minutes - Math.max(0, paceDelta) * 2 + Math.max(0, -paceDelta) * 2)));
  }

  return {
    sessions,
    minutes,
    catalog
  };
}

function buildWorkoutWeekPlan({ weekDates, phase = {}, workoutTarget, phaseType, cardioGuidance, recentWorkouts = [], profile = {}, rateTarget = 0 }) {
  const settings = getPhasePlannerSettings({ ...phase, workoutTarget, type: phaseType }, profile);
  const maxSessions = Math.max(0, Math.min(weekDates.length, 6));
  const requestedTarget = Number.isFinite(Number(workoutTarget)) ? Number(workoutTarget) : settings.sessionsPerWeek || 4;
  const target = Math.max(0, Math.min(maxSessions, requestedTarget || 0));
  const daySlots = getDaySlotsForSessionCount(target, weekDates.length);

  const recentSorted = [...recentWorkouts].sort((a, b) => compareDateDesc(a.date || "", b.date || ""));
  const recentCounts = recentSorted.slice(0, 12).reduce((map, entry) => {
    getEntryGroups(entry).forEach((group) => {
      map[group] = (map[group] || 0) + 1;
    });
    return map;
  }, {});

  const bias = buildMuscleBias({ phaseType, profile, rateTarget, recentCounts, phase });
  const focusGroups = uniqueGroups([
    ...(settings.weakPoints || []),
    ...Object.entries(bias)
      .sort((left, right) => right[1] - left[1])
      .slice(0, 3)
      .map(([group]) => group)
  ]).slice(0, 4);

  const blueprints = buildSessionBlueprints({ phase, phaseType, profile, bias });
  const orderedTemplate = rotateSequenceToBestFit(blueprints, daySlots, weekDates, recentSorted.slice(0, 10), bias, settings);

  let workoutIndex = 0;
  const workoutPlans = weekDates.map((date, dayIndex) => {
    if (daySlots.includes(dayIndex)) {
      const session = orderedTemplate[workoutIndex % orderedTemplate.length];
      workoutIndex += 1;
      const routine = buildCoachRoutine(session, phaseType, settings, bias);
      return {
        date,
        groups: session.groups,
        label: routine.title,
        notes: encodePlannedMeta(PLANNED_WORKOUT_PREFIX, {
          kind: "train",
          label: routine.title,
          cue: routine.cue,
          routine: routine.routine,
          routineItems: serializeRoutineItems(routine.routineItems),
          groups: session.groups,
          lane: session.lane,
          emphasis: settings.goalEmphasis,
          focus: routine.focus
        })
      };
    }

    return {
      date,
      groups: [],
      label: "Rest Day",
      notes: encodePlannedMeta(PLANNED_WORKOUT_PREFIX, {
        kind: "rest",
        label: "Rest Day",
        cue: "Recovery + light movement recommended.",
        routine: [],
        groups: [],
        lane: "rest",
        emphasis: settings.goalEmphasis,
        focus: "Planned recovery"
      })
    };
  });

  const workoutMetaByDate = workoutPlans.reduce((map, entry) => {
    map[entry.date] = getPlannedWorkoutMeta(entry);
    return map;
  }, {});

  const cardioTargets = resolveCardioTargets({ phaseType, settings, rateTarget });
  const restDates = weekDates.filter((date) => workoutMetaByDate[date]?.kind === "rest");
  const upperDates = weekDates.filter((date) => ["push", "pull", "upper"].includes(workoutMetaByDate[date]?.lane));
  const lowerDates = weekDates.filter((date) => workoutMetaByDate[date]?.lane === "lower");
  const preferredCardioDates = uniqueGroups([
    ...restDates,
    ...upperDates,
    ...weekDates.filter((date) => !restDates.includes(date) && !upperDates.includes(date) && !lowerDates.includes(date)),
    ...lowerDates
  ]);
  const chosenCardioDates = new Set(preferredCardioDates.slice(0, cardioTargets.sessions));

  const cardioPlans = weekDates.map((date, index) => {
    if (!chosenCardioDates.has(date) || cardioTargets.sessions <= 0) {
      return {
        date,
        type: "No cardio",
        minutes: 0,
        label: "No cardio today",
        notes: encodePlannedMeta(PLANNED_CARDIO_PREFIX, {
          kind: "none",
          label: "No cardio today",
          cue: "Recovery focus. No cardio was scheduled today on purpose.",
          type: "No cardio",
          minutes: 0,
          intensity: "recovery"
        })
      };
    }

    const workoutMeta = workoutMetaByDate[date] || { lane: "rest", kind: "rest" };
    const isRestDay = workoutMeta.kind === "rest";
    const isLowerDay = workoutMeta.lane === "lower";
    const preferredPick = cardioTargets.catalog.find((item) => !isLowerDay || item.lowerFriendly !== false);
    const pick = preferredPick || cardioTargets.catalog[index % cardioTargets.catalog.length] || {
      type: cardioGuidance?.ideas?.[0] || "Walk",
      intensity: "low intensity",
      note: cardioGuidance?.note || "Easy cardio support.",
      lowerFriendly: true
    };
    const minutes = cardioTargets.minutes + (phaseType === "Cut" && isRestDay ? 5 : 0);
    const cue = isRestDay
      ? "Easy movement on the rest slot keeps recovery intentional."
      : isLowerDay
      ? "Keep this one easy after legs so recovery does not get crowded."
      : "Low-fatigue support around the lift is the goal here.";
    const label = `${minutes} min ${String(pick.type || "Cardio").toLowerCase()} (${pick.intensity || "low intensity"})`;

    return {
      date,
      type: pick.type || "Cardio",
      minutes,
      label,
      notes: encodePlannedMeta(PLANNED_CARDIO_PREFIX, {
        kind: "cardio",
        label,
        cue: `${pick.note || "Repeatable cardio support."} ${cue}`.trim(),
        type: pick.type || "Cardio",
        minutes,
        intensity: pick.intensity || "low intensity",
        zone: pick.zone || ""
      })
    };
  });

  return { workoutPlans, cardioPlans, focusGroups, settings };
}


export default function App() {
  const [session, setSession] = useState(() => (hasSupabaseConfig ? null : LOCAL_SESSION));
  const [status, setStatus] = useState("");
  const [authMode, setAuthMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");

  const [screenIndex, setScreenIndex] = useState(HOME_INDEX);
  const swipeStartRef = useRef({ x: null, y: null, blocked: false, axis: null });

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
  const [dockItems, setDockItems] = useState(getStoredDockItems);
  const [themeMode, setThemeMode] = useState(getStoredThemeMode);
  const [appSettings, setAppSettings] = useState(getStoredAppSettings);
  const [signalSeed, setSignalSeed] = useState(getStoredSignalSeed);
  const [workoutChecklist, setWorkoutChecklist] = useState(getStoredWorkoutChecklist);
  const [workoutExecution, setWorkoutExecution] = useState(getStoredWorkoutExecution);
  const [savedMeals, setSavedMeals] = useState(getStoredSavedMeals);
  const [bodyMetricExtras, setBodyMetricExtras] = useState(getStoredBodyMetricExtras);

  const [peptideFilter, setPeptideFilter] = useState("all");
  const [activeLabAdvice, setActiveLabAdvice] = useState(null);

  const [showFoodDropdown, setShowFoodDropdown] = useState(false);
  const foodSearchRef = useRef(null);
  const [changeTimeframe, setChangeTimeframe] = useState("month");
  const [photoComparePose, setPhotoComparePose] = useState("All");
  const [photoCompareLeftDate, setPhotoCompareLeftDate] = useState("");
  const [photoCompareRightDate, setPhotoCompareRightDate] = useState("");
  const [weekViewAnchor, setWeekViewAnchor] = useState(() => startOfWeek(todayInput()));
  const [expandedWeekDate, setExpandedWeekDate] = useState(todayInput());
  const [weekDetailExpanded, setWeekDetailExpanded] = useState({
    food: false,
    workout: false,
    cardio: false,
    protocol: false
  });
  const [photoViewer, setPhotoViewer] = useState(null);
  const [customFoodNotice, setCustomFoodNotice] = useState("");
  const tutorialAutoShownRef = useRef(false);


  const [labFormOpen, setLabFormOpen] = useState(false);
  const [labHistoryOpen, setLabHistoryOpen] = useState(false);
  const [injLogOpen, setInjLogOpen] = useState(false);
  const [injScheduleOpen, setInjScheduleOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [dockEditorOpen, setDockEditorOpen] = useState(false);
  const [workoutCueOpen, setWorkoutCueOpen] = useState(false);
  const [movementCuesOpen, setMovementCuesOpen] = useState(false);
  const [cardioCueOpen, setCardioCueOpen] = useState(false);
  const [workoutNotesOpen, setWorkoutNotesOpen] = useState(false);
  const [foodFastLogOpen, setFoodFastLogOpen] = useState(false);
  const [bodyLogOpen, setBodyLogOpen] = useState(false);
  const [bodyHistoryOpen, setBodyHistoryOpen] = useState(false);
  const [weightDetailsOpen, setWeightDetailsOpen] = useState(false);
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
      const saved = JSON.parse(localStorage.getItem("recentFoodNames") || "[]");
      return Array.isArray(saved) ? saved.slice(0, 6) : [];
    } catch {
      return [];
    }
  });

  const [injForm, setInjForm] = useState({
    date: todayInput(),
    time: timeInput(),
    peptide: PEPTIDE_OPTIONS[0],
    dosage: "",
    unit: "mg",
    notes: ""
  });

  const [bodyForm, setBodyForm] = useState({
    date: todayInput(),
    time: timeInput(),
    weight: "",
    skeletalMuscleMass: "",
    bodyFatPercent: "",
    visceralFatLevel: ""
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
  const [quickMacroOpen, setQuickMacroOpen] = useState(false);
  const [quickMacroForm, setQuickMacroForm] = useState({
    name: "Quick meal",
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
    time: "09:00",
    patternType: "interval",
    weekdays: [],
    onDays: "5",
    offDays: "2",
    reminderMinutes: "0"
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
  const [labImporting, setLabImporting] = useState(false);
  const [labImportStatus, setLabImportStatus] = useState("");
  const [labImportReview, setLabImportReview] = useState(null);
  const [bodyImporting, setBodyImporting] = useState(false);
  const [bodyImportStatus, setBodyImportStatus] = useState("");
  const [bodyImportReview, setBodyImportReview] = useState(null);

  const [photoForm, setPhotoForm] = useState({
    date: todayInput(),
    time: timeInput(),
    pose: PHOTO_POSES[0],
    notes: "",
    imageUrl: "",
    previewUrl: "",
    uploading: false
  });

  const currentScreen = SCREENS[screenIndex];
  const activePhase = useMemo(() => getActivePhase(phases), [phases]);
  const profileSetupComplete = useMemo(
    () => Boolean(profile.age && profile.heightInches),
    [profile.age, profile.heightInches]
  );
  const phaseSetupComplete = Boolean(activePhase?.id);
  const needsSetupPrompt = !profileSetupComplete || !phaseSetupComplete;

  const bodyMetricsEnriched = useMemo(
    () =>
      bodyMetrics.map((entry) => ({
        ...entry,
        visceralFatLevel: entry?.visceralFatLevel ?? bodyMetricExtras?.[entry.id]?.visceralFatLevel ?? ""
      })),
    [bodyMetrics, bodyMetricExtras]
  );

  const latestMetric = useMemo(() => latestByDate(bodyMetricsEnriched), [bodyMetricsEnriched]);
  const effectiveWeightReference = useMemo(() => {
    const candidates = [profile.currentWeightReference, latestMetric?.weight, activePhase?.startWeight];
    const found = candidates.find((value) => value !== "" && value != null && Number(value || 0) > 0);
    return found == null ? "" : String(found);
  }, [profile.currentWeightReference, latestMetric?.weight, activePhase?.startWeight]);

  useEffect(() => {
    saveStoredProfile(profile);
  }, [profile]);

  useEffect(() => {
    if (latestMetric?.weight != null && String(latestMetric.weight) !== String(profile.currentWeightReference || "")) {
      setProfile((prev) => ({ ...prev, currentWeightReference: String(latestMetric.weight) }));
    }
  }, [latestMetric?.weight]);

  useEffect(() => {
    if (!latestMetric?.weight && activePhase?.startWeight != null && String(activePhase.startWeight) !== String(profile.currentWeightReference || "")) {
      setProfile((prev) => ({ ...prev, currentWeightReference: String(activePhase.startWeight) }));
    }
  }, [activePhase?.startWeight, latestMetric?.weight]);

  useEffect(() => {
    saveStoredPhases(phases);
  }, [phases]);

  useEffect(() => {
    saveStoredDockItems(dockItems);
  }, [dockItems]);

  useEffect(() => {
    saveStoredThemeMode(themeMode);
  }, [themeMode]);

  useEffect(() => {
    saveStoredAppSettings(appSettings);
  }, [appSettings]);

  useEffect(() => {
    if (tutorialAutoShownRef.current) return;
    if (appSettings.tutorialSeen) return;
    if (activeAction) return;
    tutorialAutoShownRef.current = true;
    setActiveAction("tutorial");
  }, [appSettings.tutorialSeen, activeAction]);

  useEffect(() => {
    if (activeAction === "cardio" && editing.table !== "cardio_entries") {
      resetCardioLogForm();
    }
  }, [activeAction, editing.table, cardio.length]);


  useEffect(() => {
    saveStoredWorkoutChecklist(workoutChecklist);
  }, [workoutChecklist]);

  useEffect(() => {
    saveStoredWorkoutExecution(workoutExecution);
  }, [workoutExecution]);

  useEffect(() => {
    saveStoredSavedMeals(savedMeals);
  }, [savedMeals]);

  useEffect(() => {
    saveStoredBodyMetricExtras(bodyMetricExtras);
  }, [bodyMetricExtras]);

  useEffect(() => {
    setSignalSeed(bumpStoredSignalSeed());
  }, []);

  useEffect(() => {
    if (currentScreen === "home") {
      setSignalSeed(bumpStoredSignalSeed());
    }
  }, [currentScreen]);

  useEffect(() => {
    function refreshSignalsOnFocus() {
      setSignalSeed(bumpStoredSignalSeed());
    }
    function handleVisibility() {
      if (typeof document !== "undefined" && !document.hidden) {
        refreshSignalsOnFocus();
      }
    }
    window.addEventListener("focus", refreshSignalsOnFocus);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.removeEventListener("focus", refreshSignalsOnFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return undefined;
    const body = document.body;
    const html = document.documentElement;
    const prevBodyBg = body.style.background;
    const prevHtmlBg = html.style.background;
    const prevBodyColorScheme = body.style.colorScheme;
    const nextBackground = themeMode === "light" ? "#f3f6fb" : "#111111";
    body.style.background = nextBackground;
    html.style.background = nextBackground;
    body.style.colorScheme = themeMode === "light" ? "light" : "dark";
    body.classList.toggle("theme-light", themeMode === "light");
    return () => {
      body.style.background = prevBodyBg;
      html.style.background = prevHtmlBg;
      body.style.colorScheme = prevBodyColorScheme;
      body.classList.remove("theme-light");
    };
  }, [themeMode]);

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
    if (!customFoodNotice) return;
    const timer = setTimeout(() => setCustomFoodNotice(""), 2400);
    return () => clearTimeout(timer);
  }, [customFoodNotice]);

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


  useEffect(() => {
    if (!session?.user || !needsSetupPrompt) return;
    setScreenIndex(HOME_INDEX);
  }, [session?.user, needsSetupPrompt]);


  const allFoods = useMemo(() => {
    const savedMealFoods = savedMeals.map((meal) => ({
      name: meal.name,
      category: "Saved Meals",
      calories: Number(meal.calories || 0),
      protein: Number(meal.protein || 0),
      carbs: Number(meal.carbs || 0),
      fats: Number(meal.fats || 0),
      fiber: Number(meal.fiber || 0)
    }));
    const loggedMealFoods = calories.map((entry) => ({
      name: entry.foodName,
      category: "Recent Logs",
      calories: Number(entry.totalCalories || 0) / Math.max(Number(entry.servings || 1), 1),
      protein: Number(entry.totalProtein || 0) / Math.max(Number(entry.servings || 1), 1),
      carbs: Number(entry.totalCarbs || 0) / Math.max(Number(entry.servings || 1), 1),
      fats: Number(entry.totalFats || 0) / Math.max(Number(entry.servings || 1), 1),
      fiber: Number(entry.totalFiber || 0) / Math.max(Number(entry.servings || 1), 1)
    }));
    return dedupeFoodLibraryEntries([
      ...FOOD_LIBRARY_PLUS_V50,
      ...FOOD_LIBRARY_PLUS_V48,
      ...FOOD_LIBRARY_ULTRA_V47,
      ...FOOD_LIBRARY_MEGA_V46,
      ...FOOD_LIBRARY_AMERICAN_EXPANDED,
      ...FOOD_LIBRARY_CURATED_ADDITIONS,
      ...FOOD_LIBRARY_SUPERSET,
      ...FOOD_LIBRARY_EXPANSION,
      ...BASE_FOODS,
      ...customFoods.map((food) => ({ ...food, category: food.category || "Custom Foods" })),
      ...savedMealFoods,
      ...loggedMealFoods
    ]);
  }, [customFoods, savedMeals, calories]);

  const foodCategories = useMemo(() => {
    return ["All", ...new Set(allFoods.map((f) => f.category || "Other"))];
  }, [allFoods]);

  const latestGoal = useMemo(() => goals[0] || null, [goals]);
  const intelligentTargets = useMemo(
    () =>
      buildIntelligentTargets({
        profile,
        phase: activePhase,
        weightLb: latestMetric?.weight || profile.currentWeightReference || activePhase?.startWeight
      }),
    [profile, activePhase, latestMetric]
  );
  const phaseFormCoachTargets = useMemo(
    () =>
      buildIntelligentTargets({
        profile,
        phase: phaseForm,
        weightLb: phaseForm.startWeight || latestMetric?.weight || profile.currentWeightReference || activePhase?.startWeight
      }),
    [profile, phaseForm, latestMetric?.weight, activePhase?.startWeight]
  );
  const phaseFormCardioGuidance = useMemo(
    () => buildCardioGuidance({ phase: { ...phaseForm, workoutTarget: phaseFormCoachTargets.workoutTarget }, profile }),
    [phaseForm, phaseFormCoachTargets.workoutTarget, profile]
  );
  const nutritionTargets = useMemo(
    () => buildEffectiveTargets(latestGoal, activePhase, intelligentTargets),
    [latestGoal, activePhase, intelligentTargets]
  );
  const cardioGuidance = useMemo(
    () => buildCardioGuidance({ phase: activePhase, profile }),
    [activePhase, profile]
  );
  const phasePlannerSettings = useMemo(
    () =>
      getPhasePlannerSettings(
        activePhase || { workoutTarget: intelligentTargets.workoutTarget, type: profile.onTRT ? "TRT Cruise" : "Maintenance" },
        profile
      ),
    [activePhase, intelligentTargets.workoutTarget, profile]
  );
  const bodyMetricCue = useMemo(
    () =>
      activePhase?.type === "Cut"
        ? "A quick weight or waist check-in keeps the cut readable without overthinking it."
        : activePhase?.type === "Bulk" || activePhase?.type === "Blast"
        ? "Quick body metrics help the app judge pace, not just scale noise."
        : "Quick check-ins keep the dashboard sharp without turning this into a chore.",
    [activePhase]
  );
  const protocolGuidance = useMemo(
    () => buildProtocolGuidance(profile, activePhase),
    [profile, activePhase]
  );
  const labCoach = useMemo(() => buildLabCoaching(profile, activePhase), [profile, activePhase]);
  const deferredFoodSearch = useDeferredValue(foodSearch);
  const filteredFoods = useMemo(() => {
    const query = deferredFoodSearch.trim().toLowerCase();
    const matches = allFoods.filter((food) => {
      const categoryMatch = !query ? foodCategory === "All" || (food.category || "Other") === foodCategory : true;
      const name = String(food.name || "").toLowerCase();
      const category = String(food.category || "Other").toLowerCase();
      const queryMatch = !query || name.includes(query) || category.includes(query);
      return categoryMatch && queryMatch;
    });

    return matches
      .sort((left, right) => {
        if (!query) return left.name.localeCompare(right.name);
        const leftName = String(left.name || "").toLowerCase();
        const rightName = String(right.name || "").toLowerCase();
        const leftStarts = leftName.startsWith(query) ? 0 : 1;
        const rightStarts = rightName.startsWith(query) ? 0 : 1;
        if (leftStarts !== rightStarts) return leftStarts - rightStarts;
        if (leftName.length !== rightName.length) return leftName.length - rightName.length;
        return leftName.localeCompare(rightName);
      })
      .slice(0, 220);
  }, [allFoods, foodCategory, deferredFoodSearch]);

  useEffect(() => {
    if (!activePhase?.id || activePhase.autoPilot === false) return;

    const nextCalories = intelligentTargets.calories ?? activePhase.calorieTarget ?? "";
    const nextProtein = intelligentTargets.protein ?? activePhase.proteinTarget ?? "";
    const nextCarbs = intelligentTargets.carbs ?? activePhase.carbTarget ?? "";
    const nextFats = intelligentTargets.fats ?? activePhase.fatTarget ?? "";
    const nextFiber = intelligentTargets.fiber ?? activePhase.fiberTarget ?? "";
    const nextWorkouts = intelligentTargets.workoutTarget ?? activePhase.workoutTarget ?? "";

    if (
      Number(activePhase.calorieTarget || 0) === Number(nextCalories || 0) &&
      Number(activePhase.proteinTarget || 0) === Number(nextProtein || 0) &&
      Number(activePhase.carbTarget || 0) === Number(nextCarbs || 0) &&
      Number(activePhase.fatTarget || 0) === Number(nextFats || 0) &&
      Number(activePhase.fiberTarget || 0) === Number(nextFiber || 0) &&
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
              carbTarget: nextCarbs,
              fatTarget: nextFats,
              fiberTarget: nextFiber,
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
    activePhase?.carbTarget,
    activePhase?.fatTarget,
    activePhase?.fiberTarget,
    activePhase?.workoutTarget,
    intelligentTargets.calories,
    intelligentTargets.protein,
    intelligentTargets.carbs,
    intelligentTargets.fats,
    intelligentTargets.fiber,
    intelligentTargets.workoutTarget
  ]);


  const sortedMetricsAsc = useMemo(
    () => [...bodyMetricsEnriched].sort((a, b) => (a.date > b.date ? 1 : -1)),
    [bodyMetricsEnriched]
  );

  const latestVisceralMetric = useMemo(
    () => bodyMetricsEnriched.find((entry) => entry.visceralFatLevel !== "" && entry.visceralFatLevel != null) || null,
    [bodyMetricsEnriched]
  );

  const recentFoodEntries = useMemo(
    () => [...calories].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 10),
    [calories]
  );

  const loggedWorkouts = useMemo(
    () => workouts.filter((entry) => !isPlannedWorkoutEntry(entry)),
    [workouts]
  );
  const plannedWorkouts = useMemo(
    () => workouts.filter((entry) => isPlannedWorkoutEntry(entry)),
    [workouts]
  );
  const loggedCardioEntriesAll = useMemo(
    () => cardio.filter((entry) => !isPlannedCardioEntry(entry)),
    [cardio]
  );
  const lastUsedCardioMinutes = useMemo(() => {
    const latest = [...loggedCardioEntriesAll]
      .filter((entry) => Number(entry?.minutes || 0) > 0)
      .sort((a, b) => compareDateDesc(a.date || "", b.date || ""))[0];
    return latest ? String(latest.minutes) : "";
  }, [loggedCardioEntriesAll]);
  const commonCardioMinuteOptions = useMemo(() => {
    const counts = {};
    loggedCardioEntriesAll.forEach((entry) => {
      const key = String(Number(entry?.minutes || 0) || "");
      if (!key) return;
      counts[key] = (counts[key] || 0) + 1;
    });
    const ranked = Object.keys(counts).sort((a, b) => counts[b] - counts[a] || Number(a) - Number(b));
    return Array.from(new Set([...(lastUsedCardioMinutes ? [String(lastUsedCardioMinutes)] : []), ...ranked, ...CARDIO_MINUTE_OPTIONS])).slice(0, 10);
  }, [loggedCardioEntriesAll, lastUsedCardioMinutes]);
  const plannedCardioEntries = useMemo(
    () => cardio.filter((entry) => isPlannedCardioEntry(entry)),
    [cardio]
  );
  const plannedWorkoutMetaByDate = useMemo(
    () =>
      plannedWorkouts.reduce((map, entry) => {
        map[entry.date] = getPlannedWorkoutMeta(entry);
        return map;
      }, {}),
    [plannedWorkouts]
  );
  const plannedCardioMetaByDate = useMemo(
    () =>
      plannedCardioEntries.reduce((map, entry) => {
        map[entry.date] = getPlannedCardioMeta(entry);
        return map;
      }, {}),
    [plannedCardioEntries]
  );
  const workoutCompletionByDate = useMemo(() => {
    const loggedDates = new Set(loggedWorkouts.map((entry) => entry.date));
    const dates = uniqueGroups([...loggedDates, ...Object.keys(plannedWorkoutMetaByDate)]);
    return dates.reduce((map, date) => {
      const plan = plannedWorkoutMetaByDate[date];
      map[date] = loggedDates.has(date) || plan?.kind === "rest";
      return map;
    }, {});
  }, [loggedWorkouts, plannedWorkoutMetaByDate]);
  const cardioCompletionByDate = useMemo(() => {
    const loggedDates = new Set(loggedCardioEntriesAll.map((entry) => entry.date));
    const dates = uniqueGroups([...loggedDates, ...Object.keys(plannedCardioMetaByDate)]);
    return dates.reduce((map, date) => {
      const plan = plannedCardioMetaByDate[date];
      map[date] = loggedDates.has(date) || plan?.kind === "none";
      return map;
    }, {});
  }, [loggedCardioEntriesAll, plannedCardioMetaByDate]);

  const todayFoodEntries = useMemo(
    () => calories.filter((x) => sameDay(x.date, todayInput())),
    [calories]
  );

  const todayFoodTotals = useMemo(() => calcTotals(todayFoodEntries), [todayFoodEntries]);

  const todayCardioEntries = useMemo(
    () => loggedCardioEntriesAll.filter((x) => sameDay(x.date, todayInput())),
    [loggedCardioEntriesAll]
  );

  const todayCardio = useMemo(
    () => todayCardioEntries.reduce((s, x) => s + Number(x.minutes || 0), 0),
    [todayCardioEntries]
  );

  const todayWorkoutEntries = useMemo(
    () => loggedWorkouts.filter((x) => sameDay(x.date, todayInput())),
    [loggedWorkouts]
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

  const combinedBodyTrendData = useMemo(
    () =>
      [...bodyMetricsEnriched]
        .filter(
          (x) =>
            (x.weight !== "" && x.weight != null) ||
            (x.skeletalMuscleMass !== "" && x.skeletalMuscleMass != null) ||
            (x.bodyFatPercent !== "" && x.bodyFatPercent != null)
        )
        .sort((a, b) => (a.date > b.date ? 1 : -1)),
    [bodyMetricsEnriched]
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
    () => getMetricDelta(bodyMetricsEnriched, "weight", changeTimeframe),
    [bodyMetricsEnriched, changeTimeframe]
  );

  const bodyFatDelta = useMemo(
    () => getMetricDelta(bodyMetricsEnriched, "bodyFatPercent", changeTimeframe),
    [bodyMetricsEnriched, changeTimeframe]
  );

  const skeletalMuscleDelta = useMemo(
    () => getMetricDelta(bodyMetricsEnriched, "skeletalMuscleMass", changeTimeframe),
    [bodyMetricsEnriched, changeTimeframe]
  );

  const visceralFatDelta = useMemo(
    () => getMetricDelta(bodyMetricsEnriched, "visceralFatLevel", changeTimeframe),
    [bodyMetricsEnriched, changeTimeframe]
  );

  const currentWeekStart = startOfWeek(todayInput());
  const currentWeekEnd = addDaysToDateString(currentWeekStart, 6);

  const weightLoggedThisWeek = useMemo(
    () =>
      bodyMetrics.some(
        (entry) =>
          entry.date >= currentWeekStart &&
          entry.date <= currentWeekEnd &&
          entry.weight !== "" &&
          entry.weight != null
      ),
    [bodyMetrics, currentWeekStart, currentWeekEnd]
  );
  const appOpenTimeRef = useRef(Date.now());

  const photoLoggedThisWeek = useMemo(
    () => progressPhotos.some((entry) => entry.date >= currentWeekStart && entry.date <= currentWeekEnd),
    [progressPhotos, currentWeekStart, currentWeekEnd]
  );


  useEffect(() => {
    if (typeof window === "undefined") return;
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
    if (!appSettings.protocolNotificationsEnabled && !appSettings.motivationRemindersEnabled) return;
    const tick = () => {
      const ledger = getStoredReminderLedger();
      const now = Date.now();
      const today = todayInput();
      const preview = (schedules || []).map((schedule) => buildSchedulePreviewItem(schedule, injections, today));
      if (appSettings.protocolNotificationsEnabled && now - appOpenTimeRef.current > 60000) {
        preview.forEach((entry) => {
          const reminderAt = parseDateTime(entry.nextDate, entry.nextTime || entry.time || "09:00");
          const metaLead = Number(scheduleMetaFromRow(entry).reminderMinutes ?? 0) || 0;
          const lead = metaLead > 0 ? metaLead : Number(appSettings.protocolReminderMinutes || 0) || 0;
          if (!reminderAt) return;
          const fireAt = reminderAt.getTime() - lead * 60000;
          const key = `${entry.id}-${lead}-${entry.nextDate}-${entry.nextTime}`;
          if (ledger[key]) return;
          if (now >= fireAt && now <= fireAt + 90000 && fireAt >= appOpenTimeRef.current - 30000) {
            try {
              new Notification(`${entry.peptide} reminder`, {
                body: `${entry.dosage || ""} ${entry.unit || ""}`.trim() ? `${entry.dosage || ""} ${entry.unit || ""} • ${scheduleReminderLabel(lead)}` : scheduleReminderLabel(lead),
                tag: key
              });
              ledger[key] = now;
            } catch {}
          }
        });
      }
      if (appSettings.motivationRemindersEnabled && now - appOpenTimeRef.current > 300000) {
        const hour = new Date().getHours();
        const proteinRemaining = Math.max(0, Number(nutritionTargets?.protein || 0) - Number(todayFoodTotals?.protein || 0));
        const plannedWorkout = plannedWorkoutMetaByDate[today];
        const workoutDone = Boolean(workoutCompletionByDate[today]);
        const foodLoggedToday = (calories || []).some((entry) => entry?.date === today && (Number(entry?.calories || 0) > 0 || String(entry?.name || "").trim()));
        const foodDone = foodLoggedToday || todayFoodEntries.length > 0 || Number(todayFoodTotals?.calories || 0) > 0;
        const photoKey = `${today}-photo-week-${startOfWeek(today)}`;
        const foodKey = `${today}-food-nudge`;
        const workoutKey = `${today}-workout-nudge`;
        const proteinKey = `${today}-protein-nudge`;
        if (appSettings.reminderFoodEnabled && !foodDone && hour >= 13 && !ledger[foodKey]) {
          try { new Notification("Food log check-in", { body: "Hey — you haven’t logged food today yet.", tag: foodKey }); ledger[foodKey] = now; } catch {}
        }
        if (appSettings.reminderWorkoutEnabled && plannedWorkout?.kind === "train" && !workoutDone && hour >= 17 && !ledger[workoutKey]) {
          try { new Notification("Workout check-in", { body: `Did you train today? ${plannedWorkout.label || "Your planned lift"} is still open.`, tag: workoutKey }); ledger[workoutKey] = now; } catch {}
        }
        if (appSettings.reminderProteinEnabled && proteinRemaining >= 25 && hour >= 19 && !ledger[proteinKey]) {
          try { new Notification("Protein goal nudge", { body: `Add an easy protein hit — you still have about ${Math.round(proteinRemaining)}g left today.`, tag: proteinKey }); ledger[proteinKey] = now; } catch {}
        }
        if (appSettings.reminderPhotoEnabled && !photoLoggedThisWeek && hour >= 18 && !ledger[photoKey] && weekdayCodeFromDate(today) === "SU") {
          try { new Notification("Progress photo reminder", { body: "Hey — you haven’t logged a progress photo this week yet.", tag: photoKey }); ledger[photoKey] = now; } catch {}
        }
      }
      saveStoredReminderLedger(ledger);
    };
    tick();
    const id = window.setInterval(tick, 60000);
    return () => window.clearInterval(id);
  }, [appSettings, schedules, injections, calories, nutritionTargets?.protein, todayFoodTotals?.protein, todayFoodEntries.length, plannedWorkoutMetaByDate, workoutCompletionByDate, photoLoggedThisWeek]);

  const foodLogStreak = useMemo(
    () => getConsecutiveDailyLogCount(calories, (date) => calories.some((entry) => entry.date === date)),
    [calories]
  );
  const cardioLogStreak = useMemo(
    () => getConsecutiveDailyLogCount(loggedCardioEntriesAll, (date) => Boolean(cardioCompletionByDate[date])),
    [loggedCardioEntriesAll, cardioCompletionByDate]
  );
  const workoutLogStreak = useMemo(
    () => getConsecutiveDailyLogCount(loggedWorkouts, (date) => Boolean(workoutCompletionByDate[date])),
    [loggedWorkouts, workoutCompletionByDate]
  );
  const weightWeeklyStreak = useMemo(
    () =>
      getConsecutiveWeeklyLogCount(bodyMetrics, (weekStart) =>
        bodyMetrics.some(
          (entry) =>
            entry.date >= weekStart &&
            entry.date <= addDaysToDateString(weekStart, 6) &&
            entry.weight !== "" &&
            entry.weight != null
        )
      ),
    [bodyMetrics]
  );
  const photoWeeklyStreak = useMemo(
    () =>
      getConsecutiveWeeklyLogCount(progressPhotos, (weekStart) =>
        progressPhotos.some((entry) => entry.date >= weekStart && entry.date <= addDaysToDateString(weekStart, 6))
      ),
    [progressPhotos]
  );

  const dailyRewardTiles = useMemo(
    () => {
      const today = todayInput();
      const todayWorkoutPlan = plannedWorkoutMetaByDate[today] || null;
      const todayCardioPlan = plannedCardioMetaByDate[today] || null;
      const workoutDone = Boolean(workoutCompletionByDate[today]);
      const cardioDone = Boolean(cardioCompletionByDate[today]);

      return [
        {
          title: "Food",
          cadence: "daily",
          done: todayFoodEntries.length > 0,
          note: todayFoodEntries.length > 0 ? `${todayFoodEntries.length} meal${todayFoodEntries.length === 1 ? "" : "s"}` : "Log 1 meal",
          stateLabel: todayFoodEntries.length > 0 ? "Done" : "Open",
          streakCount: foodLogStreak,
          streakUnit: "d",
          fireSize: getStreakFireSize(foodLogStreak)
        },
        {
          title: "Cardio",
          cadence: "daily",
          done: cardioDone,
          note: todayCardioEntries.length > 0
            ? `${todayCardio} min logged`
            : todayCardioPlan?.kind === "none"
            ? "Not scheduled"
            : todayCardioPlan?.label || "Quick walk",
          stateLabel: todayCardioEntries.length > 0 ? "Done" : todayCardioPlan?.kind === "none" ? "Planned" : "Open",
          streakCount: cardioLogStreak,
          streakUnit: "d",
          fireSize: getStreakFireSize(cardioLogStreak)
        },
        {
          title: "Workout",
          cadence: "daily",
          done: workoutDone,
          note: todayWorkoutEntries.length > 0
            ? `${todayWorkoutEntries.length} log${todayWorkoutEntries.length === 1 ? "" : "s"}`
            : todayWorkoutPlan?.kind === "rest"
            ? "Rest day"
            : todayWorkoutPlan?.label || "Short lift",
          stateLabel: todayWorkoutEntries.length > 0 ? "Done" : todayWorkoutPlan?.kind === "rest" ? "Rest" : "Open",
          streakCount: workoutLogStreak,
          streakUnit: "d",
          fireSize: getStreakFireSize(workoutLogStreak)
        },
        {
          title: "Weight",
          cadence: "weekly",
          done: weightLoggedThisWeek,
          note: weightLoggedThisWeek ? "Week done" : "1 weigh-in",
          stateLabel: weightLoggedThisWeek ? "Done" : "Open",
          streakCount: weightWeeklyStreak,
          streakUnit: "wk",
          fireSize: getStreakFireSize(weightWeeklyStreak)
        },
        {
          title: "Photo",
          cadence: "weekly",
          done: photoLoggedThisWeek,
          note: photoLoggedThisWeek ? "Week done" : "1 photo",
          stateLabel: photoLoggedThisWeek ? "Done" : "Open",
          streakCount: photoWeeklyStreak,
          streakUnit: "wk",
          fireSize: getStreakFireSize(photoWeeklyStreak)
        }
      ];
    },
    [
      todayFoodEntries,
      todayCardioEntries,
      todayCardio,
      todayWorkoutEntries,
      plannedWorkoutMetaByDate,
      plannedCardioMetaByDate,
      workoutCompletionByDate,
      cardioCompletionByDate,
      weightLoggedThisWeek,
      photoLoggedThisWeek,
      foodLogStreak,
      cardioLogStreak,
      workoutLogStreak,
      weightWeeklyStreak,
      photoWeeklyStreak
    ]
  );

  const coachingWindowDates = useMemo(
    () => Array.from({ length: 7 }, (_, index) => addDaysToDateString(todayInput(), -index)).reverse(),
    [todayFoodEntries.length, todayWorkoutEntries.length, todayCardioEntries.length, bodyMetrics.length]
  );

  const weeklyCoachingRecap = useMemo(() => {
    const proteinTarget = Number(nutritionTargets?.protein || 0);
    const workoutTargetDays = coachingWindowDates.filter((date) => plannedWorkoutMetaByDate[date]?.kind === "train");
    const cardioTargetDays = coachingWindowDates.filter((date) => plannedCardioMetaByDate[date]?.kind === "cardio");
    const workoutCompleted = workoutTargetDays.filter((date) => workoutCompletionByDate[date]).length;
    const cardioCompleted = cardioTargetDays.filter((date) => cardioCompletionByDate[date]).length;
    const proteinHits = coachingWindowDates.filter((date) => {
      const entries = calories.filter((entry) => entry.date === date);
      const totals = calcTotals(entries);
      return proteinTarget > 0 ? totals.protein >= proteinTarget * 0.9 : entries.length > 0;
    }).length;
    const weighIns = coachingWindowDates.filter((date) => bodyMetrics.some((entry) => entry.date === date && entry.weight !== "" && entry.weight != null)).length;
    const weekWeights = [...bodyMetrics]
      .filter((entry) => entry.date >= coachingWindowDates[0] && entry.date <= coachingWindowDates[coachingWindowDates.length - 1] && entry.weight !== "" && entry.weight != null)
      .sort((left, right) => (left.date > right.date ? 1 : -1));
    const weightTrend = weekWeights.length >= 2 ? Number(weekWeights[weekWeights.length - 1].weight || 0) - Number(weekWeights[0].weight || 0) : null;

    return {
      workoutCompleted,
      workoutTarget: workoutTargetDays.length,
      cardioCompleted,
      cardioTarget: cardioTargetDays.length,
      proteinHits,
      weighIns,
      weightTrend,
      summary:
        workoutTargetDays.length || cardioTargetDays.length
          ? `You closed ${workoutCompleted}/${workoutTargetDays.length || 0} planned lifts and ${cardioCompleted}/${cardioTargetDays.length || 0} planned cardio slots over the last 7 days.`
          : `You logged ${proteinHits} protein hits and ${weighIns} weigh-ins over the last 7 days.`
    };
  }, [coachingWindowDates, nutritionTargets?.protein, plannedWorkoutMetaByDate, plannedCardioMetaByDate, workoutCompletionByDate, cardioCompletionByDate, calories, bodyMetrics]);

  const yesterdayRecap = useMemo(() => {
    const date = addDaysToDateString(todayInput(), -1);
    const proteinTarget = Number(nutritionTargets?.protein || 0);
    const entries = calories.filter((entry) => entry.date === date);
    const totals = calcTotals(entries);
    const tasks = [
      {
        label: proteinTarget > 0 ? "Protein" : "Food",
        done: proteinTarget > 0 ? totals.protein >= proteinTarget * 0.9 : entries.length > 0,
        detail: proteinTarget > 0 ? `${Math.round(totals.protein)}g / ${Math.round(proteinTarget)}g` : `${entries.length} meal${entries.length === 1 ? "" : "s"}`
      },
      {
        label: plannedWorkoutMetaByDate[date]?.kind === "rest" ? "Rest" : "Workout",
        done: Boolean(workoutCompletionByDate[date]),
        detail: plannedWorkoutMetaByDate[date]?.label || (workoutCompletionByDate[date] ? "Completed" : "Open")
      },
      {
        label: plannedCardioMetaByDate[date]?.kind === "none" ? "Recovery" : "Cardio",
        done: Boolean(cardioCompletionByDate[date]),
        detail: plannedCardioMetaByDate[date]?.label || (cardioCompletionByDate[date] ? "Completed" : "Open")
      }
    ];
    const doneCount = tasks.filter((task) => task.done).length;
    const headline = doneCount === tasks.length ? "Yesterday closed clean." : doneCount === 0 ? "Yesterday never really got moving." : `Yesterday closed ${doneCount}/${tasks.length}.`;
    return { date, tasks, doneCount, headline };
  }, [nutritionTargets?.protein, calories, plannedWorkoutMetaByDate, workoutCompletionByDate, plannedCardioMetaByDate, cardioCompletionByDate]);

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
  const photoLibrary = useMemo(
    () =>
      [...progressPhotos]
        .filter((x) => photoComparePose === "All" || x.pose === photoComparePose)
        .sort((a, b) => compareDateDesc(a.date, b.date)),
    [progressPhotos, photoComparePose]
  );

  const recentWorkoutHistory = useMemo(() => loggedWorkouts.slice(0, 12), [loggedWorkouts]);
  const recentCardioHistory = useMemo(() => loggedCardioEntriesAll.slice(0, 12), [loggedCardioEntriesAll]);
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
    return filteredSchedules
      .map((schedule) => buildSchedulePreviewItem(schedule, injections))
      .filter((entry) => entry?.nextDate)
      .sort((left, right) => {
        const leftTime = left.dueDateTime?.getTime?.() || parseDateTime(left.nextDate, left.nextTime || left.time)?.getTime?.() || 0;
        const rightTime = right.dueDateTime?.getTime?.() || parseDateTime(right.nextDate, right.nextTime || right.time)?.getTime?.() || 0;
        return leftTime - rightTime;
      });
  }, [filteredSchedules, injections]);

  const weekDates = useMemo(() => buildWeekRange(weekViewAnchor), [weekViewAnchor]);
  const weekStartDate = weekDates[0] || startOfWeek(todayInput());
  const weekEndDate = weekDates[weekDates.length - 1] || addDaysToDateString(weekStartDate, 6);
  const scheduledInjectionsByDate = useMemo(() => {
    const map = {};
    weekDates.forEach((date) => {
      map[date] = [];
    });

    filteredSchedules.forEach((schedule) => {
      buildScheduleDueEntriesForRange(schedule, injections, weekStartDate, weekEndDate).forEach((entry) => {
        if (!map[entry.date]) map[entry.date] = [];
        map[entry.date].push(entry);
      });
    });

    return map;
  }, [filteredSchedules, injections, weekDates, weekStartDate, weekEndDate]);
  const weekCalendar = useMemo(
    () =>
      weekDates.map((date) => {
        const foodEntries = calories.filter((item) => item.date === date);
        const loggedWorkoutEntries = loggedWorkouts.filter((item) => item.date === date);
        const plannedWorkoutEntries = plannedWorkouts.filter((item) => item.date === date);
        const loggedCardioEntries = loggedCardioEntriesAll.filter((item) => item.date === date);
        const plannedCardioEntriesForDay = plannedCardioEntries.filter((item) => item.date === date);
        const workoutPlanMeta = plannedWorkoutMetaByDate[date] || null;
        const cardioPlanMeta = plannedCardioMetaByDate[date] || null;
        const weightEntries = bodyMetrics.filter((item) => item.date === date);
        const photoEntries = progressPhotos.filter((item) => item.date === date);
        const loggedInjections = injections.filter((item) => item.date === date);
        const scheduledInjections = scheduledInjectionsByDate[date] || [];
        const totals = calcTotals(foodEntries);
        const foodGoalMet =
          foodEntries.length > 0 &&
          (Number(nutritionTargets?.protein || 0) <= 0 || totals.protein >= Number(nutritionTargets.protein || 0) * 0.8);
        const workoutGroups = [...new Set([
          ...loggedWorkoutEntries.flatMap((entry) => getEntryGroups(entry)),
          ...plannedWorkoutEntries.flatMap((entry) => getEntryGroups(entry))
        ])].slice(0, 3);
        const workoutLabel = workoutGroups.length
          ? workoutGroups.slice(0, 2).join(" / ")
          : workoutPlanMeta?.label || "Workout";
        const cardioLabel = loggedCardioEntries.length
          ? `${loggedCardioEntries[0].type || "Cardio"}${loggedCardioEntries[0].minutes ? ` • ${loggedCardioEntries[0].minutes} min` : ""}`
          : cardioPlanMeta?.label || "Cardio";
        const workoutComplete = loggedWorkoutEntries.length > 0 || workoutPlanMeta?.kind === "rest";
        const cardioComplete = loggedCardioEntries.length > 0 || cardioPlanMeta?.kind === "none";

        return {
          date,
          foodEntries,
          workoutEntries: loggedWorkoutEntries,
          plannedWorkoutEntries,
          workoutPlanMeta,
          cardioEntries: loggedCardioEntries,
          plannedCardioEntries: plannedCardioEntriesForDay,
          cardioPlanMeta,
          weightEntries,
          photoEntries,
          loggedInjections,
          scheduledInjections,
          workoutGroups,
          workoutLabel,
          cardioLabel,
          status: {
            food: foodGoalMet || foodEntries.length > 0,
            workout: workoutComplete,
            cardio: cardioComplete
          },
          planned: {
            workout: plannedWorkoutEntries.length > 0,
            cardio: plannedCardioEntriesForDay.length > 0
          },
          totals
        };
      }),
    [
      weekDates,
      calories,
      loggedWorkouts,
      plannedWorkouts,
      loggedCardioEntriesAll,
      plannedCardioEntries,
      bodyMetrics,
      progressPhotos,
      injections,
      scheduledInjectionsByDate,
      nutritionTargets,
      plannedWorkoutMetaByDate,
      plannedCardioMetaByDate
    ]
  );
  const expandedWeekDay = useMemo(
    () => weekCalendar.find((day) => day.date === expandedWeekDate) || weekCalendar[0] || null,
    [weekCalendar, expandedWeekDate]
  );
  const weekMacroSummary = useMemo(() => weekCalendar.reduce((sum, day) => ({
    calories: sum.calories + Number(day.totals?.calories || 0),
    protein: sum.protein + Number(day.totals?.protein || 0),
    carbs: sum.carbs + Number(day.totals?.carbs || 0),
    fats: sum.fats + Number(day.totals?.fats || 0),
    fiber: sum.fiber + Number(day.totals?.fiber || 0),
    cardioMinutes: sum.cardioMinutes + day.cardioEntries.reduce((acc, item) => acc + Number(item.minutes || 0), 0)
  }), { calories: 0, protein: 0, carbs: 0, fats: 0, fiber: 0, cardioMinutes: 0 }), [weekCalendar]);
  const todayWeekStatus = useMemo(
    () => {
      const today = todayInput();
      return (
        weekCalendar.find((day) => day.date === today) || {
          date: today,
          workoutPlanMeta: plannedWorkoutMetaByDate[today] || null,
          cardioPlanMeta: plannedCardioMetaByDate[today] || null,
          status: {
            food: false,
            workout: plannedWorkoutMetaByDate[today]?.kind === "rest",
            cardio: plannedCardioMetaByDate[today]?.kind === "none"
          },
          foodEntries: [],
          workoutEntries: [],
          plannedWorkoutEntries: [],
          cardioEntries: [],
          plannedCardioEntries: [],
          scheduledInjections: [],
          loggedInjections: [],
          workoutGroups: [],
          workoutLabel: plannedWorkoutMetaByDate[today]?.label || "Workout",
          cardioLabel: plannedCardioMetaByDate[today]?.label || "Cardio",
          totals: calcTotals([])
        }
      );
    },
    [weekCalendar, plannedWorkoutMetaByDate, plannedCardioMetaByDate]
  );

  useEffect(() => {
    if (!weekCalendar.length) return;
    if (!weekCalendar.some((day) => day.date === expandedWeekDate)) {
      setExpandedWeekDate(weekCalendar[0].date);
    }
  }, [weekCalendar, expandedWeekDate]);

  useEffect(() => {
    if (activeAction !== "protocol" || editing.table === "injections") return;

    const preferred = schedulePreview[0] || filteredSchedules[0] || null;
    setInjForm((prev) => ({
      ...prev,
      date: prev.date || todayInput(),
      time: prev.time || preferred?.nextTime || preferred?.time || timeInput(),
      peptide: preferred?.peptide || prev.peptide || PEPTIDE_OPTIONS[0],
      dosage: prev.dosage || preferred?.dosage || "",
      unit: prev.unit || preferred?.unit || "mg"
    }));
  }, [activeAction, editing.table, schedulePreview, filteredSchedules]);

  useEffect(() => {
    if (activeAction !== "weight" || editing.table === "body_metrics") return;
    setBodyForm((prev) => ({
      ...prev,
      date: prev.date || todayInput()
    }));
  }, [activeAction, editing.table]);

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
        profile,
        phases,
        nutritionTargets,
        caloriesByDate,
        bodyMetrics: bodyMetricsEnriched,
        workouts: loggedWorkouts,
        cardio: loggedCardioEntriesAll,
        injections,
        schedules,
        progressPhotos
      }),
    [
      activePhase,
      profile,
      phases,
      nutritionTargets,
      caloriesByDate,
      bodyMetricsEnriched,
      loggedWorkouts,
      loggedCardioEntriesAll,
      injections,
      schedules,
      progressPhotos
    ]
  );

  const photoMetaById = dashboardModel.photoMetaMap || {};
  const currentHour = new Date().getHours();
  const currentDaypart = currentHour < 11 ? "morning" : currentHour < 16 ? "midday" : currentHour < 21 ? "evening" : "late";
  const welcomeName =
    profile?.name ||
    session?.user?.user_metadata?.display_name ||
    session?.user?.user_metadata?.full_name ||
    (session?.user?.email ? session.user.email.split("@")[0] : "Athlete");
  const welcomeTaglineOptions = {
    morning: [
      "Ready to set the tone early?",
      "Let’s build momentum before the day gets loud.",
      "A sharp start makes the whole day easier."
    ],
    midday: [
      "Still on pace — keep stacking clean wins.",
      "Midday check-in. Keep the chain alive.",
      "Stay tight through the middle of the day."
    ],
    evening: [
      "Finish strong and make the day count.",
      "A clean close tonight keeps the week moving.",
      "This is the window where consistency separates people."
    ],
    late: [
      "Quick closeout. Keep tomorrow easy.",
      "A small log now keeps the chain intact.",
      "Wrap the day up clean and let recovery work."
    ]
  };
  const welcomeTagline = (welcomeTaglineOptions[currentDaypart] || welcomeTaglineOptions.morning)[signalSeed % (welcomeTaglineOptions[currentDaypart] || welcomeTaglineOptions.morning).length];
  const nutritionFoodIdeas = useMemo(() => {
    const suggestionPools = {
      calories: [
        "Rice bowl",
        "Bagel",
        "Oats (1 cup dry)",
        "Chicken breast (6 oz)",
        "Salmon (6 oz)",
        "Peanut butter (2 tbsp)",
        "Chicken wings buffalo (6 pieces)",
        "Carnitas plate (1 plate)",
        "Core Power Elite vanilla (14 fl oz)",
        "Burrito chicken"
      ],
      protein: [
        "Chicken breast (6 oz)",
        "Protein shake",
        "Greek yogurt",
        "Cottage cheese",
        "Egg whites (1 cup)",
        "Fairlife protein shake",
        "Core Power Elite vanilla (14 fl oz)",
        "Chicken wings buffalo (6 pieces)",
        "Carnitas (6 oz)",
        "Greek yogurt cup"
      ],
      carbs: [
        "White rice (1 cup)",
        "Potato (large)",
        "Bagel",
        "Cream of rice",
        "Banana",
        "Oats (1 cup dry)",
        "Mexican rice (1 cup)",
        "Corn tortillas (4 tortillas)",
        "Flour tortilla large"
      ],
      fats: [
        "Peanut butter (2 tbsp)",
        "Avocado (1/2)",
        "Whole eggs (3)",
        "Salmon (6 oz)",
        "Mixed nuts (1 oz)",
        "Olive oil (1 tbsp)",
        "Carnitas (6 oz)",
        "Picanha steak (8 oz)"
      ],
      fiber: [
        "Berries (1 cup)",
        "Apple",
        "Broccoli (1 cup)",
        "Spinach (2 cups)",
        "Black beans (1/2 cup)",
        "Oats (1 cup dry)",
        "Nopales salad (1 cup)",
        "Pinto beans (1 cup)",
        "Greek salad bowl"
      ]
    };

    const foodPool = allFoods
      .map((food) => ({
        ...food,
        lowerName: String(food.name || "").toLowerCase(),
        categoryLabel: String(food.category || "Other")
      }))
      .filter((food) => food.lowerName);

    const recentBias = Array.isArray(recentFoodNames) ? recentFoodNames : [];
    const recentLower = recentBias.map((name) => String(name || "").toLowerCase()).filter(Boolean);
    const todayKey = todayInput();
    const phaseType = activePhase?.type || phaseForm.type || "Maintenance";
    const goalEmphasis = activePhase?.goalEmphasis || phaseForm.goalEmphasis || "Balanced";
    const trainingDay =
      todayWorkoutEntries.length > 0 ||
      plannedWorkoutMetaByDate[todayKey]?.kind === "train";
    const remaining = {
      calories: Math.max(Number(nutritionTargets?.calories || 0) - Math.round(todayFoodTotals.calories), 0),
      protein: Math.max(Number(nutritionTargets?.protein || 0) - Math.round(todayFoodTotals.protein), 0),
      carbs: Math.max(Number(nutritionTargets?.carbs || 0) - Math.round(todayFoodTotals.carbs), 0),
      fats: Math.max(Number(nutritionTargets?.fats || 0) - Math.round(todayFoodTotals.fats), 0),
      fiber: Math.max(Number(nutritionTargets?.fiber || 0) - Math.round(todayFoodTotals.fiber), 0)
    };

    const thresholds = { calories: 350, protein: 25, carbs: 35, fats: 12, fiber: 6 };
    const slotLabelMap = {
      morning: "breakfast",
      midday: "lunch",
      evening: "dinner",
      late: "late closeout"
    };
    const slotLabel = slotLabelMap[currentDaypart] || "meal";
    const daypartKeywords = {
      morning: ["egg", "oat", "bagel", "toast", "burrito", "yogurt", "shake", "banana", "pancake", "waffle"],
      midday: ["bowl", "taco", "burrito", "sandwich", "burger", "rice", "chicken", "carnitas", "salad", "quesadilla"],
      evening: ["steak", "salmon", "rice", "taco", "carnitas", "picanha", "arrachera", "wings", "pasta", "plate"],
      late: ["shake", "yogurt", "cottage", "protein", "milk", "banana", "oat"]
    };
    const daypartCategoryBias = {
      morning: ["Protein", "Carbs", "Dairy", "Saved meals"],
      midday: ["Meals", "Protein", "Carbs", "Saved meals"],
      evening: ["Meals", "Protein", "Carbs", "Southern", "Fast Food", "Saved meals"],
      late: ["Protein", "Dairy", "Saved meals"]
    };

    const cutoffRecent = addDaysToDateString(todayKey, -21);
    const historyCounts = {};
    const recentCounts = {};
    const slotCounts = { morning: {}, midday: {}, evening: {}, late: {} };
    const pairCounts = {};
    const entriesByDate = calories.reduce((acc, entry) => {
      const date = entry?.date;
      const lowerName = String(entry?.foodName || "").toLowerCase();
      if (!date || !lowerName) return acc;
      if (!acc[date]) acc[date] = [];
      acc[date].push(lowerName);
      return acc;
    }, {});

    Object.entries(entriesByDate).forEach(([date, names]) => {
      names.forEach((name, index) => {
        historyCounts[name] = (historyCounts[name] || 0) + 1;
        if (date >= cutoffRecent) {
          recentCounts[name] = (recentCounts[name] || 0) + 1;
        }

        const slotGuess =
          index === 0
            ? "morning"
            : index === 1
            ? "midday"
            : index >= Math.max(2, names.length - 1)
            ? "evening"
            : "midday";

        slotCounts[slotGuess][name] = (slotCounts[slotGuess][name] || 0) + 1;
      });

      if (date >= cutoffRecent) {
        const uniqueNames = [...new Set(names)];
        uniqueNames.forEach((left, leftIndex) => {
          uniqueNames.slice(leftIndex + 1).forEach((right) => {
            const key = [left, right].sort().join("|");
            pairCounts[key] = (pairCounts[key] || 0) + 1;
          });
        });
      }
    });

    const todayLoggedLower = todayFoodEntries
      .map((entry) => String(entry?.foodName || "").toLowerCase())
      .filter(Boolean);
    const slotFavorites = Object.entries(slotCounts[currentDaypart] || {})
      .sort((left, right) => right[1] - left[1])
      .slice(0, 6)
      .map(([name]) => name);
    const favoriteCurrentSlotFood = foodPool.find((food) => food.lowerName === slotFavorites[0]) || null;

    const macroGate = (food, macro) => {
      if (macro === "protein") return Number(food.protein || 0) >= 15;
      if (macro === "carbs") return Number(food.carbs || 0) >= 20;
      if (macro === "fats") return Number(food.fats || 0) >= 8;
      if (macro === "fiber") return Number(food.fiber || 0) >= 4;
      return Number(food.calories || 0) >= 180;
    };

    const macroDensity = (food, macro) => {
      if (macro === "protein") return Number(food.protein || 0) * 2.4 - Number(food.fats || 0) * 0.35;
      if (macro === "carbs") return Number(food.carbs || 0) * 1.25 + Number(food.protein || 0) * 0.3;
      if (macro === "fats") return Number(food.fats || 0) * 1.45;
      if (macro === "fiber") return Number(food.fiber || 0) * 3.2 + Number(food.protein || 0) * 0.15;
      return Number(food.calories || 0) * 0.045 + Number(food.protein || 0) * 0.2;
    };

    const phaseBias = (food, macro) => {
      let score = 0;
      const caloriesValue = Number(food.calories || 0);
      const proteinValue = Number(food.protein || 0);
      const carbValue = Number(food.carbs || 0);
      const fatValue = Number(food.fats || 0);
      const fiberValue = Number(food.fiber || 0);
      const lower = food.lowerName;

      if (phaseType === "Cut") {
        if (macro === "protein") score += proteinValue >= 25 ? 12 : 0;
        if (macro === "fiber") score += fiberValue >= 5 ? 12 : 0;
        if (macro === "calories" && caloriesValue > 750) score -= 20;
        if (fatValue > 28 && macro !== "fats") score -= 6;
        if (/shake|yogurt|chicken|salmon|beans|greek/.test(lower)) score += 5;
      } else if (phaseType === "Bulk" || phaseType === "Blast") {
        if (macro === "calories") score += caloriesValue >= 400 ? 12 : 0;
        if (macro === "carbs") score += carbValue >= 35 ? 9 : 0;
        if (macro === "protein") score += proteinValue >= 25 ? 6 : 0;
        if (/bowl|plate|burrito|burger|pasta|rice/.test(lower)) score += 5;
      } else {
        if (macro === "protein") score += proteinValue >= 20 ? 5 : 0;
        if (macro === "fiber") score += fiberValue >= 4 ? 4 : 0;
      }

      if (goalEmphasis === "Strength" && trainingDay && (macro === "carbs" || macro === "calories")) score += 8;
      if (goalEmphasis === "Size (Hypertrophy)" && (macro === "calories" || macro === "carbs")) score += 7;
      if (goalEmphasis === "Fat Loss" && (macro === "protein" || macro === "fiber")) score += 8;
      if (goalEmphasis === "Performance" && trainingDay && (macro === "carbs" || macro === "protein")) score += 7;

      return score;
    };

    const activityBias = (food, macro) => {
      if (profile?.activityLevel === "High" && (macro === "carbs" || macro === "calories")) {
        return Number(food.carbs || 0) >= 30 ? 6 : 0;
      }
      if (profile?.activityLevel === "Low" && phaseType === "Cut" && macro === "calories") {
        return Number(food.calories || 0) <= 450 ? 6 : 0;
      }
      return 0;
    };

    const pairedBias = (lowerName) =>
      todayLoggedLower.reduce((sum, loggedName) => {
        const key = [loggedName, lowerName].sort().join("|");
        return sum + (pairCounts[key] || 0) * 6;
      }, 0);

    const scoreFood = (food, macro) => {
      const lower = food.lowerName;
      const recentIndex = recentLower.indexOf(lower);
      const recentScore = recentIndex === -1 ? 0 : Math.max(0, 48 - recentIndex * 7);
      const historyScore =
        (historyCounts[lower] || 0) * 1.7 +
        (recentCounts[lower] || 0) * 4.8 +
        ((slotCounts[currentDaypart] || {})[lower] || 0) * 5.5;
      const daypartScore = (daypartKeywords[currentDaypart] || []).some((token) => lower.includes(token)) ? 18 : 0;
      const categoryScore = (daypartCategoryBias[currentDaypart] || []).includes(food.categoryLabel) ? 12 : 0;
      const trainingScore =
        macro === "protein" && trainingDay && /(shake|yogurt|fairlife|core power|whey|chicken|cottage)/.test(lower)
          ? 16
          : macro === "carbs" && trainingDay && /(rice|bagel|banana|oat|potato|cream of rice|pasta|tortilla)/.test(lower)
          ? 14
          : 0;
      const savedMealScore = food.categoryLabel === "Saved meals" ? 10 : 0;
      const noveltyPenalty = todayLoggedLower.includes(lower) ? -10 : 0;

      return (
        recentScore +
        historyScore +
        daypartScore +
        categoryScore +
        trainingScore +
        pairedBias(lower) +
        savedMealScore +
        macroDensity(food, macro) +
        phaseBias(food, macro) +
        activityBias(food, macro) +
        noveltyPenalty
      );
    };

    const buildHint = (macro, topFood) => {
      const baseHint =
        macro === "protein"
          ? trainingDay
            ? `A ${slotLabel}-friendly protein hit around training would move this fast.`
            : `A clean ${slotLabel}-friendly protein hit would close this gap fast.`
          : macro === "carbs"
          ? trainingDay
            ? `A cleaner carb around training will make the day easier to finish.`
            : `A better carb choice for ${slotLabel} would move the day back on pace.`
          : macro === "fats"
          ? `A small fat add-in can round out this ${slotLabel} without much friction.`
          : macro === "fiber"
          ? `A produce or bean add-in would clean up this ${slotLabel} fast.`
          : currentDaypart === "morning"
          ? "A stronger breakfast would close this gap cleanly."
          : currentDaypart === "midday"
          ? "A cleaner lunch-sized meal would move the day back on pace."
          : "A solid dinner or shake would close the gap cleanly.";

      const preferenceHint = favoriteCurrentSlotFood?.name
        ? ` This is biased toward foods you actually reach for around ${slotLabel}, like ${favoriteCurrentSlotFood.name}.`
        : recentBias[0]
        ? ` This is biased toward foods you already log, like ${recentBias[0]}.`
        : "";

      const pairingHint = todayLoggedLower.length && topFood
        ? ` It also looks at what you already ate today so the suggestions still fit your normal flow.`
        : "";

      const phaseHint =
        phaseType === "Cut"
          ? " Leaner, easier-to-track picks stay near the top."
          : phaseType === "Bulk" || phaseType === "Blast"
          ? " Bigger, easier-to-finish meals are pushed up so calories are easier to hit."
          : " Balanced options stay near the top so the day closes clean.";

      return `${baseHint}${preferenceHint}${pairingHint}${phaseHint}`;
    };

    return Object.entries(remaining)
      .filter(([macro, amount]) => amount >= thresholds[macro])
      .sort((left, right) => right[1] - left[1])
      .slice(0, 3)
      .map(([macro, amount]) => {
        const preferredNames = suggestionPools[macro] || [];
        const preferredFoods = preferredNames
          .map((name) => foodPool.find((food) => food.lowerName === name.toLowerCase()))
          .filter(Boolean);
        const recentFoods = recentLower
          .map((name) => foodPool.find((food) => food.lowerName === name))
          .filter(Boolean);
        const frequentFoods = Object.entries(recentCounts)
          .sort((left, right) => right[1] - left[1])
          .slice(0, 12)
          .map(([name]) => foodPool.find((food) => food.lowerName === name))
          .filter(Boolean);
        const slotFavoriteFoods = slotFavorites
          .map((name) => foodPool.find((food) => food.lowerName === name))
          .filter(Boolean);

        const candidateFoods = [
          ...preferredFoods,
          ...recentFoods,
          ...slotFavoriteFoods,
          ...frequentFoods,
          ...foodPool
        ].filter((food, index, array) => array.findIndex((item) => item.lowerName === food.lowerName) === index);

        const macroMatchedFoods = candidateFoods.filter((food) => macroGate(food, macro));
        const suggestions = (macroMatchedFoods.length ? macroMatchedFoods : candidateFoods)
          .sort((left, right) => scoreFood(right, macro) - scoreFood(left, macro))
          .slice(0, 4);

        const macroLabel =
          macro === "calories"
            ? "fuel"
            : macro === "protein"
            ? "protein"
            : macro === "carbs"
            ? "carbs"
            : macro === "fats"
            ? "fats"
            : "fiber";

        return {
          macro,
          amount,
          title:
            macro === "calories"
              ? `${amount} kcal still open today.`
              : `${amount}g ${macroLabel} still open today.`,
          hint: buildHint(macro, suggestions[0]?.name || ""),
          foods: suggestions
        };
      });
  }, [
    allFoods,
    recentFoodNames,
    nutritionTargets,
    todayFoodTotals,
    currentDaypart,
    todayWorkoutEntries,
    plannedWorkoutMetaByDate,
    calories,
    todayFoodEntries,
    activePhase,
    profile,
    phaseForm
  ]);
  const nutritionIdeaSignal = nutritionFoodIdeas[0] || null;
  const dynamicSignalPool = useMemo(() => {
    const pool = [];
    if (welcomeTagline) {
      pool.push({
        kind: 'guide',
        priority: 34,
        icon: currentDaypart === 'morning' ? '🌅' : currentDaypart === 'midday' ? '⚡' : currentDaypart === 'evening' ? '🌙' : '🛌',
        message: `${currentDaypart === 'morning' ? 'Morning' : currentDaypart === 'midday' ? 'Midday' : currentDaypart === 'evening' ? 'Evening' : 'Late-day'} cue: ${welcomeTagline}`,
        hint: activePhase?.type === 'Cut'
          ? 'Keep the phase simple: protein, movement, and one clean decision at a time.'
          : activePhase?.type === 'Bulk' || activePhase?.type === 'Blast'
          ? 'Food, recovery, and repeatable lifting keep this phase moving.'
          : 'Routine usually wins this phase.'
      });
    }

    const todayPlannedWorkout = todayWeekStatus?.workoutPlanMeta || null;
    if (todayPlannedWorkout?.kind === 'rest') {
      pool.push({
        kind: 'guide',
        priority: 72,
        icon: '🛌',
        message: 'Recovery day — stay active, light movement helps.',
        hint: todayPlannedWorkout.cue || 'Rest is planned here on purpose.'
      });
    } else if (todayPlannedWorkout?.label) {
      pool.push({
        kind: 'guide',
        priority: 67,
        icon: '🗓️',
        message: `${todayPlannedWorkout.label} is lined up for today.`,
        hint: todayPlannedWorkout.cue || 'Keep the session simple and hit the main work first.'
      });
    }

    const todayPlannedCardio = todayWeekStatus?.cardioPlanMeta || null;
    if (todayPlannedCardio?.kind === 'none') {
      pool.push({
        kind: 'guide',
        priority: 65,
        icon: '🟢',
        message: 'No cardio scheduled — recovery focus today.',
        hint: todayPlannedCardio.cue || 'That is intentional, not a miss.'
      });
    } else if (todayPlannedCardio?.label && !todayCardioEntries.length) {
      pool.push({
        kind: 'guide',
        priority: 63,
        icon: '🚶',
        message: `${todayPlannedCardio.label} is queued for today.`,
        hint: todayPlannedCardio.cue || `${todayPlannedCardio.minutes} min is enough to keep the week moving.`
      });
    }

    if (nutritionIdeaSignal?.foods?.length) {
      const topFood = nutritionIdeaSignal.foods[signalSeed % nutritionIdeaSignal.foods.length];
      if (topFood) {
        pool.push({
          kind: 'guide',
          priority: 61,
          icon: '🍽️',
          message: `${topFood.name} would help close today's gap fast.`,
          hint: nutritionIdeaSignal.hint
        });
      }
    }

    const proteinRemaining = Math.max(Number(nutritionTargets?.protein || 0) - Math.round(todayFoodTotals.protein), 0);
    const carbsRemaining = Math.max(Number(nutritionTargets?.carbs || 0) - Math.round(todayFoodTotals.carbs), 0);
    if (todayPlannedWorkout?.kind === 'train' && proteinRemaining >= 30) {
      pool.push({
        kind: 'warning',
        priority: 60,
        icon: '🥩',
        message: `Training day and ${proteinRemaining}g protein is still open.`,
        hint: 'Close protein before bed so recovery does not lag behind the plan.'
      });
    }
    if (todayPlannedWorkout?.lane === 'lower' && carbsRemaining >= 40) {
      pool.push({
        kind: 'guide',
        priority: 58,
        icon: '🍚',
        message: `Leg day still has ${carbsRemaining}g carbs open.`,
        hint: 'A cleaner carb meal is the easiest way to support lower-body performance and recovery.'
      });
    }

    const recentWindowDates = Array.from({ length: 7 }, (_, index) => addDaysToDateString(todayInput(), -index));
    const missedScheduledWorkouts = recentWindowDates.filter((date) => plannedWorkoutMetaByDate[date]?.kind === 'train' && !workoutCompletionByDate[date]).length;
    if (missedScheduledWorkouts >= 2) {
      pool.push({
        kind: 'warning',
        priority: 56,
        icon: '📉',
        message: `${missedScheduledWorkouts} planned workouts were missed in the last 7 days.`,
        hint: 'Pull the plan back to the next non-negotiable session and rebuild momentum there.'
      });
    }

    if (recentFoodNames?.length) {
      const recentPick = recentFoodNames[signalSeed % recentFoodNames.length];
      if (recentPick) {
        pool.push({
          kind: 'guide',
          priority: 38,
          icon: '🧠',
          message: `You usually log ${recentPick.toLowerCase()} well.`,
          hint: currentDaypart === 'morning' ? 'Use a familiar meal early and keep the day easy.' : 'Leaning on familiar meals keeps friction low.'
        });
      }
    }

    // ── Protocol Intelligence signals ──
    const protocolSignals = buildProtocolSignals(schedules, profile);
    protocolSignals.forEach(s => pool.push(s));

    return pool;
  }, [welcomeTagline, currentDaypart, activePhase, todayWeekStatus, todayCardioEntries.length, nutritionIdeaSignal, signalSeed, recentFoodNames, nutritionTargets?.protein, nutritionTargets?.carbs, todayFoodTotals.protein, todayFoodTotals.carbs, plannedWorkoutMetaByDate, workoutCompletionByDate, schedules, profile]);
  const displayedSignals = useMemo(
    () => buildRotatingSignalDeck([...(dashboardModel.signalPool || dashboardModel.signals || []), ...dynamicSignalPool], nutritionIdeaSignal, signalSeed),
    [dashboardModel.signalPool, dashboardModel.signals, dynamicSignalPool, nutritionIdeaSignal, signalSeed]
  );

  useEffect(() => {
    const nextMessages = displayedSignals.map((signal) => signal?.message).filter(Boolean);
    if (!nextMessages.length) return;
    saveStoredSignalHistory([...nextMessages, ...getStoredSignalHistory()]);
  }, [displayedSignals]);

  const visibleDockItems = useMemo(
    () => dockItems.filter((item) => item.visible !== false),
    [dockItems]
  );
  const setupPromptCopy = useMemo(() => {
    if (!profileSetupComplete) {
      return {
        title: "Welcome — set your profile once.",
        body:
          "Age, height, activity, and context give the app enough to start filling targets, training rhythm, and subtle coaching automatically.",
        primaryLabel: "Complete profile",
        primaryAction: () => setActiveAction("profile"),
        secondaryLabel: null,
        secondaryAction: null
      };
    }

    return {
      title: "Nice start — now lock in your phase.",
      body:
        "Your phase and projected pace tell the app what success looks like, so the dashboard can shape nutrition, cardio suggestions, reminders, and momentum around it.",
      primaryLabel: activePhase ? "Edit phase" : "Start phase",
      primaryAction: () => openPhaseEditor(),
      secondaryLabel: "Profile",
      secondaryAction: () => setActiveAction("profile")
    };
  }, [profileSetupComplete, activePhase]);
  const todayWorkoutCue = todayWeekStatus?.workoutPlanMeta || null;
  const todayCardioCue = todayWeekStatus?.cardioPlanMeta || null;

  function getWorkoutChecklistKey(date = "", item = {}) {
    return `${date || todayInput()}::${item.exerciseId || item.id || item.name || "exercise"}`;
  }

  function getWorkoutExecutionEntryKey(date = "", item = {}) {
    return getWorkoutChecklistKey(date, item);
  }

  function buildWorkoutExecutionSet(index = 0, set = {}) {
    const weightValue = String(set?.weight ?? "");
    const repsValue = String(set?.reps ?? "");
    return {
      weight: weightValue,
      reps: repsValue,
      done: Boolean(set?.done),
      weightAuto: index > 0 ? (typeof set?.weightAuto === "boolean" ? set.weightAuto : !weightValue.trim()) : false,
      repsAuto: index > 0 ? (typeof set?.repsAuto === "boolean" ? set.repsAuto : !repsValue.trim()) : false
    };
  }

  function buildWorkoutExecutionEntry(item = {}) {
    const setCount = getPrescriptionSetCount(item?.prescription || "");
    return {
      exerciseId: item.exerciseId || item.id || item.name || "exercise",
      name: item.name || "Exercise",
      prescription: item.prescription || "3x8-12",
      sets: Array.from({ length: setCount }, (_, index) => buildWorkoutExecutionSet(index)),
      updatedAt: Date.now()
    };
  }

  function getWorkoutExecutionEntry(date = "", item = {}) {
    return workoutExecution[getWorkoutExecutionEntryKey(date, item)] || buildWorkoutExecutionEntry(item);
  }

  function getLatestExercisePerformance(item = {}, date = "") {
    const targetDate = date || todayInput();
    const identity = String(item.exerciseId || item.id || item.name || "exercise");
    return Object.entries(workoutExecution || {})
      .filter(([key, entry]) => {
        if (!entry) return false;
        const [entryDate] = key.split("::");
        return entryDate < targetDate && String(entry.exerciseId || entry.name || "") === identity && (entry.sets || []).some((set) => set.weight || set.reps);
      })
      .sort((left, right) => (left[0] < right[0] ? 1 : -1))[0]?.[1] || null;
  }

  function formatExercisePerformance(entry = null) {
    if (!entry?.sets?.length) return "";
    const visibleSets = entry.sets.filter((set) => set.weight || set.reps);
    if (!visibleSets.length) return "";
    return visibleSets
      .map((set) => `${set.weight || "—"} × ${set.reps || "—"}`)
      .join(" • ");
  }

  function setExerciseCompletion(date = "", item = {}, checked = false) {
    const key = getWorkoutChecklistKey(date, item);
    setWorkoutChecklist((prev) => ({
      ...prev,
      [key]: checked
    }));
    setWorkoutExecution((prev) => {
      const next = { ...prev };
      const entry = next[key] || buildWorkoutExecutionEntry(item);
      next[key] = {
        ...entry,
        updatedAt: Date.now(),
        sets: (entry.sets || []).map((set) => ({ ...set, done: checked }))
      };
      return next;
    });
  }

  function toggleWorkoutChecklistItem(date = "", item = {}) {
    const key = getWorkoutChecklistKey(date, item);
    const nextChecked = !Boolean(workoutChecklist[key]);
    setExerciseCompletion(date, item, nextChecked);
  }

  function updateWorkoutSet(date = "", item = {}, setIndex = 0, patch = {}) {
    const key = getWorkoutExecutionEntryKey(date, item);
    setWorkoutExecution((prev) => {
      const next = { ...prev };
      const entry = next[key] || buildWorkoutExecutionEntry(item);
      const sets = (entry.sets || []).map((set, index) => buildWorkoutExecutionSet(index, set));
      while (sets.length <= setIndex) sets.push(buildWorkoutExecutionSet(sets.length));

      const hasWeightPatch = Object.prototype.hasOwnProperty.call(patch, "weight");
      const hasRepsPatch = Object.prototype.hasOwnProperty.call(patch, "reps");
      const normalizedPatch = { ...patch };
      if (hasWeightPatch) normalizedPatch.weightAuto = false;
      if (hasRepsPatch) normalizedPatch.repsAuto = false;

      sets[setIndex] = buildWorkoutExecutionSet(setIndex, {
        ...sets[setIndex],
        ...normalizedPatch
      });

      if (setIndex === 0 && sets.length > 1) {
        const leadSet = sets[0];
        for (let index = 1; index < sets.length; index += 1) {
          const currentSet = buildWorkoutExecutionSet(index, sets[index]);
          const nextSet = { ...currentSet };

          if (hasWeightPatch && (currentSet.weightAuto || !String(currentSet.weight || "").trim())) {
            nextSet.weight = leadSet.weight || "";
            nextSet.weightAuto = true;
          }

          if (hasRepsPatch && (currentSet.repsAuto || !String(currentSet.reps || "").trim())) {
            nextSet.reps = leadSet.reps || "";
            nextSet.repsAuto = true;
          }

          sets[index] = buildWorkoutExecutionSet(index, nextSet);
        }
      }

      const allDone = sets.length > 0 && sets.every((set) => Boolean(set.done));
      next[key] = { ...entry, updatedAt: Date.now(), sets };
      setWorkoutChecklist((prevChecklist) => ({
        ...prevChecklist,
        [key]: allDone
      }));
      return next;
    });
  }

  function copyLastPerformanceToCurrent(date = "", item = {}) {
    const key = getWorkoutExecutionEntryKey(date, item);
    const last = getLatestExercisePerformance(item, date);
    if (!last?.sets?.length) return;
    setWorkoutExecution((prev) => {
      const next = { ...prev };
      const entry = next[key] || buildWorkoutExecutionEntry(item);
      const targetSetCount = Math.max(entry.sets?.length || 0, last.sets.length || 0);
      const nextSets = Array.from({ length: targetSetCount }, (_, index) => buildWorkoutExecutionSet(index, {
        weight: last.sets[index]?.weight || last.sets[last.sets.length - 1]?.weight || "",
        reps: last.sets[index]?.reps || last.sets[last.sets.length - 1]?.reps || "",
        done: false,
        weightAuto: false,
        repsAuto: false
      }));
      next[key] = { ...entry, updatedAt: Date.now(), sets: nextSets };
      return next;
    });
    setWorkoutChecklist((prev) => ({
      ...prev,
      [key]: false
    }));
  }

  function clearWorkoutChecklistForDate(date = "") {
    const prefix = `${date || todayInput()}::`;
    setWorkoutChecklist((prev) =>
      Object.keys(prev).reduce((next, key) => {
        if (!key.startsWith(prefix)) next[key] = prev[key];
        return next;
      }, {})
    );
    setWorkoutExecution((prev) =>
      Object.keys(prev).reduce((next, key) => {
        if (!key.startsWith(prefix)) {
          next[key] = prev[key];
        } else {
          next[key] = {
            ...prev[key],
            updatedAt: Date.now(),
            sets: (prev[key]?.sets || []).map((set) => ({ ...set, done: false }))
          };
        }
        return next;
      }, {})
    );
  }

  function renderRoutineExerciseCards(meta, date = "", options = {}) {
    const items = meta?.routineItems || [];
    const limit = options.limit ? Math.max(1, Number(options.limit) || 0) : 0;
    const visibleItems = limit ? items.slice(0, limit) : items;
    const showCheckboxes = options.showCheckboxes !== false;
    const compact = options.compact === true;
    if (!visibleItems.length) return null;

    return (
      <div style={{ marginTop: 10, display: "grid", gap: compact ? 8 : 10 }}>
        {visibleItems.map((item, index) => {
          const key = getWorkoutChecklistKey(date, item);
          const execution = getWorkoutExecutionEntry(date, item);
          const checked = Boolean(workoutChecklist[key] || (execution.sets?.length && execution.sets.every((set) => Boolean(set.done))));
          const lastPerformance = getLatestExercisePerformance(item, date);
          const lastPerformanceText = formatExercisePerformance(lastPerformance);
          return (
            <div
              key={`${date}-${item.exerciseId || item.id || item.name}-${index}`}
              style={{
                borderRadius: 16,
                border: checked ? "1px solid rgba(34,197,94,0.36)" : "1px solid var(--panel-border)",
                background: checked ? "var(--success-surface)" : "var(--muted-bg)",
                padding: compact ? 8 : 10
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: showCheckboxes ? "28px 1fr" : "1fr",
                  gap: 10,
                  alignItems: "start"
                }}
              >
                {showCheckboxes ? (
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleWorkoutChecklistItem(date, item)}
                    style={{ width: 18, height: 18, accentColor: "#22c55e", marginTop: 2 }}
                  />
                ) : null}
                <div style={{ display: "grid", gap: compact ? 4 : 5 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "baseline", flexWrap: "wrap" }}>
                    <div style={{ fontSize: compact ? 13 : 14, fontWeight: 800, color: "var(--text-soft)" }}>{index + 1}. {item.name}</div>
                    <div style={{ fontSize: 11, fontWeight: 800, color: "var(--badge-text)" }}>{item.prescription}</div>
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.35 }}>{item.cue || item.headline || "Coach cue loaded."}</div>
                  {!compact ? <div style={{ fontSize: 10, color: "var(--text-faint)", lineHeight: 1.25 }}>Log set 1 once and the rest auto-fill to match until you change them.</div> : null}
                  {!compact ? <div style={{ fontSize: 10, color: "var(--text-faint)", lineHeight: 1.3 }}>{item.supportCue || item.headline || "Move with control and keep the target muscle honest."}</div> : null}
                  {!compact ? (
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", flexWrap: "wrap", marginTop: 2 }}>
                      <div style={{ fontSize: 10, color: "var(--text-faint)" }}>
                        {lastPerformanceText ? `Last: ${lastPerformanceText}` : "No prior performance logged yet."}
                      </div>
                      {lastPerformanceText ? (
                        <button
                          type="button"
                          style={{ ...styles.secondaryButton, padding: "6px 10px", fontSize: 11 }}
                          onClick={() => copyLastPerformanceToCurrent(date, item)}
                        >
                          Copy last
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>

              {!compact ? (
                <div style={{ display: "grid", gap: 6, marginTop: 10, paddingLeft: showCheckboxes ? 38 : 0 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "56px 42px 1fr 1fr", gap: 8, fontSize: 10, fontWeight: 700, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    <div>Set</div>
                    <div>Done</div>
                    <div>Weight</div>
                    <div>Reps</div>
                  </div>
                  {(execution.sets || []).map((set, setIndex) => (
                    <div key={`${key}-${setIndex}`} style={{ display: "grid", gridTemplateColumns: "56px 42px 1fr 1fr", gap: 8, alignItems: "center" }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)" }}>{setIndex + 1}</div>
                      <input
                        type="checkbox"
                        checked={Boolean(set.done)}
                        onChange={(e) => updateWorkoutSet(date, item, setIndex, { done: e.target.checked })}
                        style={{ width: 16, height: 16, accentColor: "#22c55e" }}
                      />
                      <input
                        style={{ ...styles.input, margin: 0, minWidth: 0, padding: "10px 12px" }}
                        value={set.weight || ""}
                        onChange={(e) => updateWorkoutSet(date, item, setIndex, { weight: e.target.value })}
                        placeholder="lb"
                        inputMode="decimal"
                      />
                      <input
                        style={{ ...styles.input, margin: 0, minWidth: 0, padding: "10px 12px" }}
                        value={set.reps || ""}
                        onChange={(e) => updateWorkoutSet(date, item, setIndex, { reps: e.target.value })}
                        placeholder="reps"
                        inputMode="numeric"
                      />
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    );
  }

  const todayRoutineItems = todayWorkoutCue?.routineItems || [];
  const todayRoutineCompleteCount = todayRoutineItems.filter((item) => workoutChecklist[getWorkoutChecklistKey(todayWeekStatus?.date || todayInput(), item)]).length;

  const movementCuesCard = (
    <div style={styles.card}>
      <button style={styles.collapseHeader} onClick={() => setMovementCuesOpen((prev) => !prev)}>
        <div>{movementCuesOpen ? "▾" : "▸"} Movement cues</div>
        <div style={styles.smallText}>{movementCuesOpen ? phasePlannerSettings.resolvedStyle : "Closed"}</div>
      </button>
      {movementCuesOpen ? (<>
      <div style={styles.sectionHeaderRow}>
        <div>
          <h2 style={styles.cardTitle}>Movement cues</h2>
          <div style={styles.smallText}>Planner, calendar, and daily coaching are aligned here.</div>
        </div>
        <div style={styles.progressChip}>{phasePlannerSettings.resolvedStyle}</div>
      </div>

      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={styles.glassHighlight} />
          <div style={styles.statLabel}>Split</div>
          <div style={styles.statValueMini}>{phasePlannerSettings.resolvedStyle}</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.glassHighlight} />
          <div style={styles.statLabel}>Emphasis</div>
          <div style={styles.statValueMini}>{phasePlannerSettings.goalEmphasis}</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.glassHighlight} />
          <div style={styles.statLabel}>Cardio tone</div>
          <div style={styles.statValueMini}>{todayCardioCue?.kind === "cardio" ? todayCardioCue.intensity || "planned" : "recovery"}</div>
        </div>
      </div>

      <div style={{ ...styles.weekDetailGrid, marginTop: 14 }}>
        <div style={styles.weekDetailColumn}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <div style={styles.listTitle}>Workout cue</div>
            {todayRoutineItems.length ? (
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <div style={styles.progressChip}>{todayRoutineCompleteCount}/{todayRoutineItems.length} checked</div>
                <button type="button" style={{ ...styles.secondaryButton, padding: "8px 10px" }} onClick={() => clearWorkoutChecklistForDate(todayWeekStatus?.date || todayInput())}>Clear checks</button>
              </div>
            ) : null}
          </div>
          <div style={styles.historyMiniCard}>
            <div style={styles.historyMiniTitle}>{todayWorkoutCue?.label || "No planned workout yet"}</div>
            <div style={styles.smallText}>
              {todayWorkoutCue?.cue || "Use the week planner to write the training schedule into the calendar first."}
            </div>
          </div>
          <CollapsibleSection
            title="Workout cue"
            open={workoutCueOpen}
            onToggle={() => setWorkoutCueOpen((prev) => !prev)}
            right={todayRoutineItems.length ? `${todayRoutineCompleteCount}/${todayRoutineItems.length}` : (todayWorkoutCue?.routine?.length ? `${todayWorkoutCue.routine.length} lines` : "Closed")}
          >
            {todayRoutineItems.length ? (
              renderRoutineExerciseCards(todayWorkoutCue, todayWeekStatus?.date || todayInput(), { showCheckboxes: todayWorkoutCue?.kind === "train" })
            ) : todayWorkoutCue?.routine?.length ? (
              <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                {todayWorkoutCue.routine.map((line) => (
                  <div key={line} style={styles.historyMiniCard}>
                    <div style={styles.smallText}>{line}</div>
                  </div>
                ))}
              </div>
            ) : <div style={styles.smallText}>No routine written for today yet.</div>}
          </CollapsibleSection>
        </div>

        <div style={styles.weekDetailColumn}>
          <CollapsibleSection
            title="Cardio cue"
            open={cardioCueOpen}
            onToggle={() => setCardioCueOpen((prev) => !prev)}
            right={cardioCueOpen ? (todayCardioCue?.kind === "cardio" ? formatDisplayTime(todayCardioCue?.time || "09:00") : "Recovery") : "Closed"}
          >
            <div style={styles.historyMiniCard}>
              <div style={styles.historyMiniTitle}>{todayCardioCue?.label || cardioGuidance.shortLabel}</div>
              <div style={styles.smallText}>{todayCardioCue?.cue || cardioGuidance.nudgeHint}</div>
            </div>
            <div style={{ ...styles.contextSummary, marginTop: 10 }}>
              <div style={styles.smallText}>{cardioGuidance.heading}</div>
              <div style={styles.smallText}>{cardioGuidance.note}</div>
            </div>
          </CollapsibleSection>
        </div>
      </div>

      <div style={{ ...styles.contextSummary, marginTop: 12 }}>
        <div style={styles.smallText}>
          {phasePlannerSettings.weakPoints.length
            ? `Priority weak points: ${phasePlannerSettings.weakPoints.join(" • ")}`
            : "No weak-point bias saved yet. The planner is leaning on phase and recent recovery first."}
        </div>
        <div style={styles.smallText}>
          {todayWorkoutCue?.focus
            ? `Primary focus today: ${todayWorkoutCue.focus}`
            : "Build the shown week and this card will turn into a coach-style daily brief."}
        </div>
        <div style={styles.smallText}>Set rows save on this device, and last performance carries forward into the next session so the workout cue feels usable in the gym.</div>
      </div>
      </>) : null}
    </div>
  );

  function moveDockItem(key, direction) {
    setDockItems((prev) => {
      const index = prev.findIndex((item) => item.key === key);
      if (index === -1) return prev;
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= prev.length) return prev;
      const clone = [...prev];
      const [item] = clone.splice(index, 1);
      clone.splice(nextIndex, 0, item);
      return clone;
    });
  }

  function toggleDockItemVisibility(key) {
    setDockItems((prev) =>
      prev.map((item) =>
        item.key === key ? { ...item, visible: item.visible === false ? true : false } : item
      )
    );
  }

  function clearWorkoutRegimen() {
    setWorkoutForm((prev) => ({ ...prev, notes: "" }));
  }

  async function clearPlannedWeek() {
    if (!session?.user) return;
    const workoutIds = plannedWorkouts
      .filter((entry) => entry.date >= weekStartDate && entry.date <= weekEndDate)
      .map((entry) => entry.id);
    const cardioIds = plannedCardioEntries
      .filter((entry) => entry.date >= weekStartDate && entry.date <= weekEndDate)
      .map((entry) => entry.id);

    if (!workoutIds.length && !cardioIds.length) {
      setStatus("No planned week items to clear.");
      return;
    }

    if (!supabase) {
      const nextWorkouts = workouts.filter((entry) => !workoutIds.includes(entry.id));
      const nextCardio = cardio.filter((entry) => !cardioIds.includes(entry.id));
      setLocalRows("workouts", sortRowsByColumn(nextWorkouts, "date"), session.user.id);
      setLocalRows("cardio_entries", sortRowsByColumn(nextCardio, "date"), session.user.id);
      setWorkouts(sortRowsByColumn(nextWorkouts, "date"));
      setCardio(sortRowsByColumn(nextCardio, "date"));
      setStatus("Planned week cleared.");
      return;
    }

    if (workoutIds.length) {
      await supabase.from("workouts").delete().in("id", workoutIds);
      setWorkouts((prev) => prev.filter((entry) => !workoutIds.includes(entry.id)));
    }
    if (cardioIds.length) {
      await supabase.from("cardio_entries").delete().in("id", cardioIds);
      setCardio((prev) => prev.filter((entry) => !cardioIds.includes(entry.id)));
    }
    setStatus("Planned week cleared.");
  }

  async function replacePlannedWeekSegment({ weekDatesToReplace = [], workoutPayload = [], cardioPayload = [] }) {
    if (!session?.user || !weekDatesToReplace.length) return;
    const dateSet = new Set(weekDatesToReplace);
    const plannedWorkoutIds = plannedWorkouts.filter((entry) => dateSet.has(entry.date)).map((entry) => entry.id);
    const plannedCardioIds = plannedCardioEntries.filter((entry) => dateSet.has(entry.date)).map((entry) => entry.id);

    if (!supabase) {
      const baseWorkouts = workouts.filter((entry) => !plannedWorkoutIds.includes(entry.id));
      const baseCardio = cardio.filter((entry) => !plannedCardioIds.includes(entry.id));
      const nextWorkouts = sortRowsByColumn([...workoutPayload, ...baseWorkouts], "date");
      const nextCardio = sortRowsByColumn([...cardioPayload, ...baseCardio], "date");
      setLocalRows("workouts", nextWorkouts, session.user.id);
      setLocalRows("cardio_entries", nextCardio, session.user.id);
      setWorkouts(nextWorkouts);
      setCardio(nextCardio);
      return;
    }

    if (plannedWorkoutIds.length) {
      await supabase.from("workouts").delete().in("id", plannedWorkoutIds);
    }
    if (plannedCardioIds.length) {
      await supabase.from("cardio_entries").delete().in("id", plannedCardioIds);
    }

    let insertedWorkouts = [];
    let insertedCardio = [];
    if (workoutPayload.length) {
      const { data, error } = await supabase
        .from("workouts")
        .insert(workoutPayload.map((entry) => ({ ...entry, owner_id: session.user.id })))
        .select("*");
      if (error) throw error;
      insertedWorkouts = normalizeRowsForTable("workouts", data?.length ? data : workoutPayload);
    }
    if (cardioPayload.length) {
      const { data, error } = await supabase
        .from("cardio_entries")
        .insert(cardioPayload.map((entry) => ({ ...entry, owner_id: session.user.id })))
        .select("*");
      if (error) throw error;
      insertedCardio = normalizeRowsForTable("cardio_entries", data?.length ? data : cardioPayload);
    }

    setWorkouts((prev) => sortRowsByColumn([...insertedWorkouts, ...prev.filter((entry) => !plannedWorkoutIds.includes(entry.id))], "date"));
    setCardio((prev) => sortRowsByColumn([...insertedCardio, ...prev.filter((entry) => !plannedCardioIds.includes(entry.id))], "date"));
  }

  async function syncPlannerAfterWorkoutOverride(savedWorkout) {
    if (!savedWorkout || !session?.user || !activePhase) return;
    const workoutDate = savedWorkout.date || todayInput();
    const weekStart = startOfWeek(workoutDate);
    const weekDatesForOverride = buildWeekRange(weekStart);
    const futureDates = weekDatesForOverride.filter((date) => date > workoutDate);

    const cleanedWorkouts = workouts.filter((entry) => !(isPlannedWorkoutEntry(entry) && entry.date === workoutDate));
    const mergedLogged = sortRowsByColumn(
      [...cleanedWorkouts.filter((entry) => !isPlannedWorkoutEntry(entry)), savedWorkout]
        .filter((entry, index, arr) => arr.findIndex((candidate) => candidate.id === entry.id) === index),
      "date"
    );

    if (!supabase) {
      if (cleanedWorkouts.length !== workouts.length) {
        setLocalRows("workouts", sortRowsByColumn(cleanedWorkouts, "date"), session.user.id);
        setWorkouts(sortRowsByColumn(cleanedWorkouts, "date"));
      }
    } else {
      const sameDayPlannedIds = plannedWorkouts.filter((entry) => entry.date === workoutDate).map((entry) => entry.id);
      if (sameDayPlannedIds.length) {
        await supabase.from("workouts").delete().in("id", sameDayPlannedIds);
        setWorkouts((prev) => prev.filter((entry) => !sameDayPlannedIds.includes(entry.id)));
      }
    }

    const sameWeekLoggedSoFar = mergedLogged.filter((entry) => entry.date >= weekStart && entry.date <= workoutDate);
    const completedWorkoutDates = [...new Set(sameWeekLoggedSoFar.map((entry) => entry.date).filter(Boolean))];
    const baseTarget = Number(activePhase.workoutTarget || intelligentTargets.workoutTarget || 4) || 4;
    const remainingWorkoutTarget = Math.max(0, Math.min(futureDates.length, baseTarget - completedWorkoutDates.length));

    if (!futureDates.length) {
      setStatus(`Logged ${savedWorkout.groups?.join(" + ") || "workout"}. No later days in this week needed a replan.`);
      return;
    }

    const historyAnchor = futureDates[futureDates.length - 1] || workoutDate;
    const plan = buildWorkoutWeekPlan({
      weekDates: futureDates,
      phase: activePhase,
      workoutTarget: remainingWorkoutTarget,
      phaseType: activePhase.type,
      cardioGuidance,
      profile,
      rateTarget: activePhase.rateTarget || intelligentTargets.rateTarget || 0,
      recentWorkouts: mergedLogged.filter((entry) => {
        const daysBack = dateDiffDays(historyAnchor, entry.date || "");
        return daysBack >= 0 && daysBack <= 10;
      })
    });

    await replacePlannedWeekSegment({
      weekDatesToReplace: futureDates,
      workoutPayload: plan.workoutPlans.map((entry) => ({
        id: makeId(),
        date: entry.date,
        groups: entry.groups,
        notes: entry.notes
      })),
      cardioPayload: plan.cardioPlans.map((entry) => ({
        id: makeId(),
        date: entry.date,
        type: entry.type,
        minutes: entry.minutes,
        notes: entry.notes
      }))
    });

    setStatus(`Logged ${savedWorkout.groups?.join(" + ") || "workout"} and replanned the rest of the week around what you actually trained.`);
  }

  async function autoPlanShownWeek() {
    if (!session?.user) return;
    if (!activePhase) {
      setStatus("Start a phase first so the planner knows what to build around.");
      return;
    }

    try {
      const plan = buildWorkoutWeekPlan({
        weekDates,
        phase: activePhase,
        workoutTarget: activePhase.workoutTarget || intelligentTargets.workoutTarget || 4,
        phaseType: activePhase.type,
        cardioGuidance,
        profile,
        rateTarget: activePhase.rateTarget || intelligentTargets.rateTarget || 0,
        recentWorkouts: loggedWorkouts.filter((entry) => isWithinLastDays(entry.date, 7))
      });

      const workoutPayload = plan.workoutPlans.map((entry) => ({
        id: makeId(),
        date: entry.date,
        groups: entry.groups,
        notes: entry.notes
      }));
      const cardioPayload = plan.cardioPlans.map((entry) => ({
        id: makeId(),
        date: entry.date,
        type: entry.type,
        minutes: entry.minutes,
        notes: entry.notes
      }));

      const plannedWorkoutIds = plannedWorkouts
        .filter((entry) => entry.date >= weekStartDate && entry.date <= weekEndDate)
        .map((entry) => entry.id);
      const plannedCardioIds = plannedCardioEntries
        .filter((entry) => entry.date >= weekStartDate && entry.date <= weekEndDate)
        .map((entry) => entry.id);

      if (!supabase) {
        const baseWorkouts = workouts.filter((entry) => !plannedWorkoutIds.includes(entry.id));
        const baseCardio = cardio.filter((entry) => !plannedCardioIds.includes(entry.id));
        const nextWorkouts = sortRowsByColumn([...workoutPayload, ...baseWorkouts], "date");
        const nextCardio = sortRowsByColumn([...cardioPayload, ...baseCardio], "date");
        setLocalRows("workouts", nextWorkouts, session.user.id);
        setLocalRows("cardio_entries", nextCardio, session.user.id);
        setWorkouts(nextWorkouts);
        setCardio(nextCardio);
        setStatus(`Built the shown week from your split preference, pace, last 7 days, and recovery spacing.`);
        return;
      }

      if (plannedWorkoutIds.length) {
        await supabase.from("workouts").delete().in("id", plannedWorkoutIds);
        setWorkouts((prev) => prev.filter((entry) => !plannedWorkoutIds.includes(entry.id)));
      }
      if (plannedCardioIds.length) {
        await supabase.from("cardio_entries").delete().in("id", plannedCardioIds);
        setCardio((prev) => prev.filter((entry) => !plannedCardioIds.includes(entry.id)));
      }

      let workoutError = null;
      let cardioError = null;
      if (workoutPayload.length) {
        const { data, error } = await supabase
          .from("workouts")
          .insert(workoutPayload.map((entry) => ({ ...entry, owner_id: session.user.id })))
          .select("*");
        if (error) workoutError = error;
        const insertedWorkouts = normalizeRowsForTable("workouts", data?.length ? data : workoutPayload);
        if (insertedWorkouts.length) {
          setWorkouts((prev) =>
            sortRowsByColumn([
              ...insertedWorkouts,
              ...prev.filter((entry) => !plannedWorkoutIds.includes(entry.id))
            ], "date")
          );
        }
      }
      if (cardioPayload.length) {
        const { data, error } = await supabase
          .from("cardio_entries")
          .insert(cardioPayload.map((entry) => ({ ...entry, owner_id: session.user.id })))
          .select("*");
        if (error) cardioError = error;
        const insertedCardio = data?.length ? data : cardioPayload;
        if (insertedCardio.length) {
          setCardio((prev) =>
            sortRowsByColumn([
              ...insertedCardio,
              ...prev.filter((entry) => !plannedCardioIds.includes(entry.id))
            ], "date")
          );
        }
      }
      if (workoutError || cardioError) {
        setStatus((workoutError || cardioError)?.message || "Planner hit a database error.");
        return;
      }
      setStatus(`Planned ${weekDates.length ? fmtDate(weekDates[0]) : "shown week"} from your saved split, phase, and recovery lanes.`);
    } catch (error) {
      console.error("autoPlanShownWeek failed", error);
      setStatus(error?.message || "Planner hit an unexpected error.");
    }
  }


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
        setter(sortRowsByColumn(normalizeRowsForTable(table, getLocalRows(table, userId)), orderCol));
      });
      setStatus("");
      return;
    }

    for (const [table, setter, orderCol] of tableConfigs) {
      let query = supabase.from(table).select("*").eq("owner_id", userId);
      if (orderCol) query = query.order(orderCol, { ascending: false });
      const { data, error } = await query;
      if (!error) setter(normalizeRowsForTable(table, data || []));
    }

    setStatus("");
  }

  async function saveRow(table, row, setter, current) {
    if (!session?.user) return;

    const preparedRow = prepareRowForWrite(table, row);

    if (!supabase) {
      const nextRows = sortRowsByColumn([normalizeRowForTable(table, { ...preparedRow }), ...current], table === "custom_foods" ? "created_at" : table === "schedules" ? "startDate" : "date");
      setLocalRows(table, nextRows, session.user.id);
      setter(nextRows);
      setStatus("Saved locally.");
      return true;
    }

    const payload = { ...preparedRow, owner_id: session.user.id };
    const { data, error } = await supabase.from(table).insert(payload).select().single();
    if (error) {
      setStatus(error.message);
      return false;
    }
    setter([normalizeRowForTable(table, data), ...current]);
    setStatus("Saved.");
    return true;
  }

  async function saveManyRows(table, rows, setter, current) {
    if (!session?.user) return false;
    const safeRows = (rows || []).filter(Boolean).map((row) => prepareRowForWrite(table, row));
    if (!safeRows.length) return true;
    const orderColumn = table === "custom_foods" ? "created_at" : table === "schedules" ? "startDate" : "date";

    if (!supabase) {
      const normalized = normalizeRowsForTable(table, safeRows);
      const nextRows = sortRowsByColumn([...normalized, ...current], orderColumn);
      setLocalRows(table, nextRows, session.user.id);
      setter(nextRows);
      setStatus(`Saved ${safeRows.length} locally.`);
      return true;
    }

    const payload = safeRows.map((row) => ({ ...row, owner_id: session.user.id }));
    const { data, error } = await supabase.from(table).insert(payload).select();
    if (error) {
      setStatus(error.message);
      return false;
    }
    const normalized = normalizeRowsForTable(table, data?.length ? data : safeRows);
    setter(sortRowsByColumn([...normalized, ...current], orderColumn));
    setStatus(`Saved ${normalized.length} entries.`);
    return true;
  }

  async function updateRow(table, id, row, setter, current) {
    if (!session?.user) return;

    const preparedRow = prepareRowForWrite(table, row);

    if (!supabase) {
      const nextRows = current.map((entry) => (entry.id === id ? normalizeRowForTable(table, { ...entry, ...preparedRow }) : entry));
      setLocalRows(table, nextRows, session.user.id);
      setter(nextRows);
      setEditing({ table: null, id: null });
      setStatus("Updated locally.");
      return true;
    }

    const { data, error } = await supabase
      .from(table)
      .update(preparedRow)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      setStatus(error.message);
      return false;
    }

    setter(current.map((x) => (x.id === id ? normalizeRowForTable(table, data) : x)));
    setEditing({ table: null, id: null });
    setStatus("Updated.");
    return true;
  }

  async function deleteRow(table, id, setter, current) {
    if (!session?.user) return;

    if (!supabase) {
      const nextRows = current.filter((entry) => entry.id !== id);
      setLocalRows(table, nextRows, session.user.id);
      setter(nextRows);
      if (table === "body_metrics") {
        setBodyMetricExtras((prev) => {
          if (!prev?.[id]) return prev;
          const next = { ...prev };
          delete next[id];
          return next;
        });
      }
      setStatus("Deleted locally.");
      return true;
    }

    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) {
      setStatus(error.message);
      return false;
    }
    setter(current.filter((x) => x.id !== id));
    if (table === "body_metrics") {
      setBodyMetricExtras((prev) => {
        if (!prev?.[id]) return prev;
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
    return true;
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
    const normalized = String(foodName || "").trim();
    if (!normalized) return;
    const next = [normalized, ...recentFoodNames.filter((x) => String(x || "").toLowerCase() != normalized.toLowerCase())].slice(0, 6);
    setRecentFoodNames(next);
    localStorage.setItem("recentFoodNames", JSON.stringify(next));
  }

  function saveMealPreset(preset = {}) {
    const normalized = normalizeSavedMeal(preset);
    setSavedMeals((prev) => {
      const next = [normalized, ...prev.filter((item) => item.name.toLowerCase() !== normalized.name.toLowerCase())].slice(0, 24);
      return next;
    });
  }

  function removeMealPreset(id = "") {
    setSavedMeals((prev) => prev.filter((meal) => meal.id !== id));
  }

  function buildFoodSelectionPreset() {
    const food = allFoods.find((entry) => entry.name === foodForm.name);
    if (!food) return null;
    const servings = Number(foodForm.servings || 1) || 1;
    return normalizeSavedMeal({
      id: makeId(),
      name: servings === 1 ? food.name : `${food.name} x${servings}`,
      calories: Math.round(Number(food.calories || 0) * servings),
      protein: Number((Number(food.protein || 0) * servings).toFixed(1)),
      carbs: Number((Number(food.carbs || 0) * servings).toFixed(1)),
      fats: Number((Number(food.fats || 0) * servings).toFixed(1)),
      fiber: Number((Number(food.fiber || 0) * servings).toFixed(1))
    });
  }

  async function logSavedMealToDate(preset = {}, date = "") {
    const meal = normalizeSavedMeal(preset);
    const ok = await saveRow(
      "calorie_entries",
      {
        id: makeId(),
        date: date || foodForm.date || todayInput(),
        foodName: meal.name,
        servings: 1,
        totalCalories: meal.calories,
        totalProtein: meal.protein,
        totalCarbs: meal.carbs,
        totalFats: meal.fats,
        totalFiber: meal.fiber
      },
      setCalories,
      calories
    );
    if (!ok) return false;
    pushRecentFood(meal.name);
    return true;
  }

  async function repeatPreviousDayFood(targetDate = "") {
    const destination = targetDate || foodForm.date || todayInput();
    const sourceDate = addDaysToDateString(destination, -1);
    const sourceEntries = calories.filter((entry) => entry.date === sourceDate);
    if (!sourceEntries.length) {
      setStatus(`No food logged on ${fmtDate(sourceDate)} to repeat.`);
      return false;
    }
    const rows = sourceEntries.map((entry) => ({
      id: makeId(),
      date: destination,
      foodName: entry.foodName,
      servings: entry.servings || 1,
      totalCalories: Number(entry.totalCalories || 0),
      totalProtein: Number(entry.totalProtein || 0),
      totalCarbs: Number(entry.totalCarbs || 0),
      totalFats: Number(entry.totalFats || 0),
      totalFiber: Number(entry.totalFiber || 0)
    }));
    const ok = await saveManyRows("calorie_entries", rows, setCalories, calories);
    if (!ok) return false;
    rows.forEach((row) => pushRecentFood(row.foodName));
    return true;
  }

  function buildQuickMacroPayload(form = quickMacroForm) {
    return normalizeSavedMeal({
      id: makeId(),
      name: form.name || "Quick meal",
      calories: form.calories,
      protein: form.protein,
      carbs: form.carbs,
      fats: form.fats,
      fiber: form.fiber
    });
  }

  function quickMacroHasAnyValue(meal = {}) {
    return [meal.calories, meal.protein, meal.carbs, meal.fats, meal.fiber].some((value) => Number(value || 0) > 0);
  }

  async function saveQuickMacroEntry() {
    const payload = buildQuickMacroPayload();
    if (!quickMacroHasAnyValue(payload)) {
      setStatus("Add at least one macro value first.");
      return false;
    }
    const cleanName = String(payload.name || "").trim();
    if (cleanName) {
      const exists = customFoods.some((item) => String(item.name || "").trim().toLowerCase() === cleanName.toLowerCase());
      if (!exists) {
        await saveQuickMacroToFoodLibrary();
      }
    }
    const ok = await logSavedMealToDate(payload, foodForm.date || todayInput());
    if (!ok) return false;
    setQuickMacroForm({ name: "Quick meal", calories: "", protein: "", carbs: "", fats: "", fiber: "" });
    setCustomFoodNotice(cleanName ? `${cleanName} logged and saved for next time.` : "");
    return true;
  }

  async function saveQuickMacroToFoodLibrary() {
    const payload = buildQuickMacroPayload();
    const cleanName = String(payload.name || "").trim();
    if (!cleanName) {
      setStatus("Add a name before saving to your food library.");
      return false;
    }
    if (!quickMacroHasAnyValue(payload)) {
      setStatus("Add at least one macro value first.");
      return false;
    }

    const rowPayload = {
      name: cleanName,
      calories: Number(payload.calories || 0),
      protein: Number(payload.protein || 0),
      carbs: Number(payload.carbs || 0),
      fats: Number(payload.fats || 0),
      fiber: Number(payload.fiber || 0),
      created_at: new Date().toISOString()
    };

    if (editing.table === "custom_foods") {
      const ok = await updateRow(
        "custom_foods",
        editing.id,
        rowPayload,
        setCustomFoods,
        customFoods
      );
      if (!ok) return false;
      setQuickMacroForm({ name: "Quick meal", calories: "", protein: "", carbs: "", fats: "", fiber: "" });
      setCustomFoodNotice("Custom food updated.");
      cancelEdit();
      return true;
    }

    const ok = await saveRow(
      "custom_foods",
      { id: makeId(), ...rowPayload },
      setCustomFoods,
      customFoods
    );
    if (!ok) return false;
    setCustomFoodNotice("Saved to your food library.");
    return true;
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
    const variants = getWorkoutVariants(group, activePhase?.type || phaseForm.type || "Maintenance");
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

${buildWorkoutPlan(prev.groups, workoutTemplateSelection, activePhase?.type || phaseForm.type || "Maintenance")}`
        : buildWorkoutPlan(prev.groups, workoutTemplateSelection, activePhase?.type || phaseForm.type || "Maintenance")
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
      weightLb: phaseForm.startWeight || latestMetric?.weight || profile.currentWeightReference || activePhase?.startWeight
    });
    setPhaseForm((prev) => ({
      ...prev,
      type: typeOverride,
      calorieTarget: coach.calories != null ? String(coach.calories) : prev.calorieTarget,
      proteinTarget: coach.protein != null ? String(coach.protein) : prev.proteinTarget,
      workoutTarget:
        prev.userLockedTrainingDays === true && prev.trainingDaysPreference !== "Flexible"
          ? prev.trainingDaysPreference
          : coach.workoutTarget != null
          ? String(coach.workoutTarget)
          : prev.workoutTarget
    }));
    setStatus("Targets refreshed from your saved profile and chosen pace.");
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
      weightLb: phase?.startWeight ?? latestMetric?.weight ?? profile.currentWeightReference
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
        rateTarget:
          phase?.rateTarget != null && phase?.rateTarget !== ""
            ? String(phase.rateTarget)
            : "",
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
      weightLb: phaseForm.startWeight || latestMetric?.weight || profile.currentWeightReference || activePhase?.startWeight
    });
    setPhaseForm((prev) => {
      const previousPreset = PHASE_PRESETS[prev.type] || PHASE_PRESETS.Bulk;
      return {
        ...prev,
        type,
        name:
          !prev.name ||
          prev.name === previousPreset.defaultName
            ? preset.defaultName
            : prev.name,
        calorieTarget: prev.autoPilot !== false ? coach.calories ?? prev.calorieTarget : prev.calorieTarget,
        proteinTarget: prev.autoPilot !== false ? coach.protein ?? prev.proteinTarget : prev.proteinTarget,
        rateTarget: prev.rateTarget,
        workoutTarget: String(
          prev.userLockedTrainingDays === true && prev.trainingDaysPreference !== "Flexible"
            ? prev.trainingDaysPreference
            : prev.autoPilot !== false
            ? coach.workoutTarget ?? preset.defaultWorkouts
            : prev.workoutTarget || preset.defaultWorkouts
        )
      };
    });
  }

  function handleSavePhase() {
    if (!phaseForm.startDate) {
      setStatus("Choose a phase start date.");
      return;
    }

    if (phaseForm.rateTarget === "" || phaseForm.rateTarget == null) {
      setStatus("Set your projected pace so the app can coach around your timeline.");
      return;
    }

    const preset = PHASE_PRESETS[phaseForm.type] || PHASE_PRESETS.Bulk;
    const coach = buildIntelligentTargets({
      profile,
      phase: phaseForm,
      weightLb: phaseForm.startWeight || latestMetric?.weight || profile.currentWeightReference || activePhase?.startWeight
    });
    const useAutoPilot = phaseForm.autoPilot !== false && (!phaseAdvancedOpen || !phaseManualTouched);
    const normalizedTrainingStyle = TRAINING_STYLE_OPTIONS.includes(phaseForm.trainingStyle)
      ? phaseForm.trainingStyle
      : "Let App Decide";
    const normalizedTrainingDaysPreference = TRAINING_DAYS_OPTIONS.includes(String(phaseForm.trainingDaysPreference || ""))
      ? String(phaseForm.trainingDaysPreference)
      : phaseForm.userLockedTrainingDays === true && phaseForm.workoutTarget != null && phaseForm.workoutTarget !== ""
      ? String(Math.max(3, Math.min(6, Number(phaseForm.workoutTarget) || preset.defaultWorkouts)))
      : "Flexible";
    const trainingDaysLocked =
      phaseForm.userLockedTrainingDays === true && normalizedTrainingDaysPreference !== "Flexible";
    const preferredSessionCount = trainingDaysLocked
      ? Math.max(3, Math.min(6, Number(normalizedTrainingDaysPreference) || preset.defaultWorkouts))
      : null;
    const normalizedWorkoutTarget = preferredSessionCount ?? (
      (useAutoPilot ? coach.workoutTarget : phaseForm.workoutTarget) === "" ||
      (useAutoPilot ? coach.workoutTarget : phaseForm.workoutTarget) == null
        ? preset.defaultWorkouts
        : Number(useAutoPilot ? coach.workoutTarget : phaseForm.workoutTarget)
    );
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
      carbTarget:
        useAutoPilot && coach.carbs != null
          ? Number(coach.carbs)
          : phaseForm.carbTarget != null && phaseForm.carbTarget !== ""
          ? Number(phaseForm.carbTarget)
          : "",
      fatTarget:
        useAutoPilot && coach.fats != null
          ? Number(coach.fats)
          : phaseForm.fatTarget != null && phaseForm.fatTarget !== ""
          ? Number(phaseForm.fatTarget)
          : "",
      fiberTarget:
        useAutoPilot && coach.fiber != null
          ? Number(coach.fiber)
          : phaseForm.fiberTarget != null && phaseForm.fiberTarget !== ""
          ? Number(phaseForm.fiberTarget)
          : "",
      rateTarget: Number(phaseForm.rateTarget),
      workoutTarget: normalizedWorkoutTarget,
      trainingStyle: normalizedTrainingStyle,
      trainingDaysPreference: trainingDaysLocked ? normalizedTrainingDaysPreference : "Flexible",
      userLockedTrainingDays: trainingDaysLocked,
      goalEmphasis: normalizeGoalEmphasis(phaseForm.goalEmphasis),
      weakPoints: uniqueGroups(ensureStringArray(phaseForm.weakPoints).filter((group) => WORKOUT_OPTIONS.includes(group))),
      cardioPreference: CARDIO_PREFERENCE_OPTIONS.includes(phaseForm.cardioPreference)
        ? phaseForm.cardioPreference
        : phaseForm.type === "Cut"
        ? "Only when cutting"
        : "Moderate",
      notes: phaseForm.notes || "",
      autoPilot: useAutoPilot,
      isActive: !phaseForm.endDate || phaseForm.endDate >= todayInput()
    };

    setProfile((prev) => ({
      ...prev,
      currentWeightReference:
        normalized.startWeight === "" || normalized.startWeight == null ? prev.currentWeightReference : String(normalized.startWeight)
    }));

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

    setStatus(
      phaseForm.id
        ? normalized.autoPilot
          ? "Phase updated. Coaching refreshed from your saved setup and chosen pace."
          : "Phase updated. Manual overrides are active."
        : normalized.autoPilot
        ? "Phase started. The app just rebuilt your targets, rhythm, and coaching around your chosen pace."
        : "Phase started with manual overrides."
    );
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
        time: item.time || "",
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
        bodyFatPercent: item.bodyFatPercent || "",
        visceralFatLevel: getBodyMetricVisceralValue(item) || ""
      });
      setBodyImportReview(null);
      setBodyImportStatus("");
      setWeightDetailsOpen(Boolean(item.bodyFatPercent || item.skeletalMuscleMass || getBodyMetricVisceralValue(item)));
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
        groups: getEntryGroups(item),
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
      setQuickMacroForm({
        name: item.name || "",
        calories: item.calories || "",
        protein: item.protein || "",
        carbs: item.carbs || "",
        fats: item.fats || "",
        fiber: item.fiber || ""
      });
      setQuickMacroOpen(true);
      setCustomFoodNotice("");
      setActiveAction("food");
    }

    if (table === "progress_photos") {
      setPhotoForm({
        date: item.date || todayInput(),
        pose: item.pose || PHOTO_POSES[0],
        notes: item.notes || "",
        imageUrl: item.imageUrl || "",
        previewUrl: item.imageUrl || "",
        uploading: false
      });
      setScreenIndex(SCREENS.indexOf("body"));
      setActiveAction("photo");
    }

    if (table === "schedules") {
      const meta = scheduleMetaFromRow(item);
      setScheduleForm({
        peptide: item.peptide,
        dosage: item.dosage || "",
        unit: item.unit || "mg",
        startDate: item.startDate,
        everyDays: String(item.everyDays || ""),
        time: item.time || "09:00",
        patternType: meta.patternType || "interval",
        weekdays: meta.weekdays || [],
        onDays: String(meta.onDays || 5),
        offDays: String(meta.offDays || 2),
        reminderMinutes: String(meta.reminderMinutes || 0)
      });
      setInjScheduleOpen(true);
      setScreenIndex(SCREENS.indexOf("injections"));
    }
  }

  function cancelEdit() {
    setEditing({ table: null, id: null });
  }

  function resetBodyLogForm() {
    setBodyForm({
      date: todayInput(),
      time: timeInput(),
      weight: "",
      skeletalMuscleMass: "",
      bodyFatPercent: "",
      visceralFatLevel: ""
    });
    setWeightDetailsOpen(false);
    setBodyImportStatus("");
    setBodyImportReview(null);
  }

  function resetProtocolLogForm() {
    const preferred = schedulePreview[0] || filteredSchedules[0] || null;
    setInjForm({
      date: todayInput(),
      time: preferred?.nextTime || preferred?.time || timeInput(),
      peptide: preferred?.peptide || PEPTIDE_OPTIONS[0],
      dosage: preferred?.dosage || "",
      unit: preferred?.unit || "mg",
      notes: ""
    });
  }

  function resetFoodLogForm() {
    setFoodForm({
      date: todayInput(),
      name: BASE_FOODS[0].name,
      servings: "1"
    });
    setFoodSearch("");
    setShowFoodDropdown(false);
    setQuickMacroForm({ name: "Quick meal", calories: "", protein: "", carbs: "", fats: "", fiber: "" });
    setCustomFoodNotice("");
  }

  function openPhotoViewer(photo = {}) {
    if (!photo?.imageUrl) return;
    const meta = photoMetaById[photo.id] || {};
    setPhotoViewer({
      imageUrl: photo.imageUrl,
      pose: photo.pose || "Progress photo",
      date: photo.date || "",
      notes: [photo.time ? formatDisplayTime(photo.time) : "", photo.notes || ""].filter(Boolean).join(" • "),
      weightLabel: meta.weightLabel || "",
      phaseLabel: [meta.phaseName, meta.phaseType].filter(Boolean).join(" • "),
      phaseDayLabel: meta.phaseDayLabel || ""
    });
  }

  function resetWorkoutLogForm() {
    const todayWorkoutPlan = plannedWorkoutMetaByDate[todayInput()] || null;
    setWorkoutForm({
      date: todayInput(),
      groups:
        todayWorkoutPlan?.kind === "train" && todayWorkoutPlan.groups?.length
          ? todayWorkoutPlan.groups
          : ["Chest", "Triceps"],
      notes: ""
    });
    setWorkoutTemplateSelection({});
  }

  function resetCardioLogForm() {
    const todayCardioPlan = plannedCardioMetaByDate[todayInput()] || null;
    setCardioForm({
      date: todayInput(),
      type: todayCardioPlan?.kind === "cardio" ? todayCardioPlan.type || CARDIO_OPTIONS[0] : CARDIO_OPTIONS[0],
      minutes: todayCardioPlan?.kind === "cardio" ? String(todayCardioPlan.minutes || "") : String(lastUsedCardioMinutes || commonCardioMinuteOptions[0] || ""),
      notes: ""
    });
  }

  function openAdvice(marker) {
    const entry = latestLabsByMarker[marker];
    if (!entry) return;
    const zone = labZone(entry);
    setActiveLabAdvice(getFriendlyLabAdvice(marker, zone, entry, profile));
  }

  function resetLabBatchToSmartDefaults() {
    setLabBatch(buildInitialLabBatch(profile));
    setLabImportReview(null);
    setLabImportStatus("");
    setStatus("Applied smart default ranges.");
  }

  function getBodyMetricVisceralValue(entry = {}) {
    return entry?.visceralFatLevel ?? bodyMetricExtras?.[entry.id]?.visceralFatLevel ?? "";
  }

  function saveBodyMetricExtra(id, patch = {}) {
    if (!id) return;
    setBodyMetricExtras((prev) => {
      const current = prev && typeof prev[id] === "object" ? prev[id] : {};
      const nextValue = String(patch?.visceralFatLevel || "").trim();
      if (!nextValue) {
        if (!prev?.[id]) return prev;
        const next = { ...prev };
        delete next[id];
        return next;
      }
      return {
        ...(prev || {}),
        [id]: {
          ...current,
          visceralFatLevel: nextValue
        }
      };
    });
  }

  async function importBodyReport(file) {
    if (!file) return;

    try {
      setBodyImporting(true);
      setBodyImportStatus(`Preparing ${file.name}…`);
      setWeightDetailsOpen(true);

      const extracted = await extractLabTextFromFile(file, (message) => setBodyImportStatus(message));
      const parsed = parseBodyReportText(extracted.text);

      setBodyForm((prev) => mergeImportedBodyForm(prev, parsed));
      setBodyImportReview({
        fileName: file.name,
        method: extracted.method,
        date: parsed.date,
        matches: parsed.matches,
        textLength: extracted.text.length
      });

      if (!parsed.matches.length) {
        setBodyImportStatus("No supported body metrics were confidently detected. You can still fill the fields manually.");
        setStatus("No supported body metrics detected from the upload.");
        return;
      }

      setBodyImportStatus(`Imported ${parsed.matches.length} body metrics from ${file.name}. Review the fields below, then save when ready.`);
      setStatus(`Imported ${parsed.matches.length} body metrics. Review the form, then tap save.`);
    } catch (error) {
      console.error(error);
      setBodyImportReview(null);
      setBodyImportStatus(error?.message || "Body report import failed.");
      setStatus(error?.message || "Body report import failed.");
    } finally {
      setBodyImporting(false);
    }
  }

  async function importLabReport(file) {
    if (!file) return;

    try {
      setLabImporting(true);
      setLabImportStatus(`Preparing ${file.name}…`);
      setLabFormOpen(true);

      const extracted = await extractLabTextFromFile(file, (message) => setLabImportStatus(message));
      const parsed = parseLabReportText(extracted.text, profile);

      if (!parsed.matches.length) {
        setLabImportReview({
          fileName: file.name,
          method: extracted.method,
          date: parsed.date,
          matches: [],
          textLength: extracted.text.length
        });
        setLabImportStatus("No supported lab markers were confidently detected. You can still review the file and enter values manually.");
        setStatus("No supported lab markers detected from the upload.");
        return;
      }

      setLabBatch((prev) => mergeImportedLabsIntoBatch(prev, parsed.matches));
      if (parsed.date) setLabBatchDate(parsed.date);
      setLabBatchNotes((prev) => prev || `Imported from ${file.name}`);
      setLabImportReview({
        fileName: file.name,
        method: extracted.method,
        date: parsed.date,
        matches: parsed.matches,
        textLength: extracted.text.length
      });
      setLabFormExpanded((prev) => {
        const next = { ...prev };
        parsed.matches.forEach((match) => {
          const tier = LAB_DEFAULTS[match.marker]?.tier;
          if (tier) next[tier] = true;
        });
        return next;
      });
      setLabImportStatus(`Imported ${parsed.matches.length} markers from ${file.name}. Review the values below, then save when ready.`);
      setStatus(`Imported ${parsed.matches.length} lab markers. Review the panel, then tap save.`);
    } catch (error) {
      console.error(error);
      setLabImportReview(null);
      setLabImportStatus(error?.message || "Lab import failed.");
      setStatus(error?.message || "Lab import failed.");
    } finally {
      setLabImporting(false);
    }
  }

  function goToScreen(screen) {
    const idx = SCREENS.indexOf(screen);
    if (idx >= 0) {
      closeAllSections();
      setScreenIndex(idx);
    }
  }

  function shouldIgnoreSwipeTarget(node) {
    if (!node || typeof node.closest !== "function") return false;
    return Boolean(
      node.closest('[data-swipe-block="true"]') ||
        node.closest("input, select, textarea, [contenteditable='true']")
    );
  }

  function getGesturePoint(e) {
    if (e?.touches?.[0]) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    if (e?.changedTouches?.[0]) return { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
    if (typeof e?.clientX === "number" && typeof e?.clientY === "number") {
      return { x: e.clientX, y: e.clientY };
    }
    return null;
  }

  function resetSwipeTracker(blocked = false) {
    swipeStartRef.current = { x: null, y: null, blocked, axis: null, pointerId: null, startedAt: 0 };
  }

  function handleSwipeStart(e) {
    if (shouldIgnoreSwipeTarget(e.target)) {
      resetSwipeTracker(true);
      return;
    }

    const point = getGesturePoint(e);
    if (!point) {
      resetSwipeTracker(false);
      return;
    }

    swipeStartRef.current = {
      x: point.x,
      y: point.y,
      blocked: false,
      axis: null,
      pointerId: typeof e.pointerId === "number" ? e.pointerId : null,
      startedAt: Date.now()
    };
  }

  function handleSwipeMove(e) {
    const start = swipeStartRef.current;
    if (!start || start.blocked || start.x == null || start.y == null) return;
    if (start.pointerId != null && typeof e.pointerId === "number" && e.pointerId !== start.pointerId) return;

    const point = getGesturePoint(e);
    if (!point) return;

    const diffX = point.x - start.x;
    const diffY = point.y - start.y;
    const absX = Math.abs(diffX);
    const absY = Math.abs(diffY);

    if (!start.axis && (absX > 10 || absY > 10)) {
      if (absX > absY * 0.72) {
        start.axis = "x";
      } else if (absY > absX * 1.08) {
        start.axis = "y";
      }
    }

    if ((start.axis === "x" || (absX > 18 && absX > absY * 0.74)) && e.cancelable) {
      e.preventDefault();
    }
  }

  function handleSwipeEnd(e) {
    const start = swipeStartRef.current;
    if (!start || start.blocked || start.x == null || start.y == null) return;
    if (start.pointerId != null && typeof e.pointerId === "number" && e.pointerId !== start.pointerId) return;

    const point = getGesturePoint(e);
    const duration = Date.now() - Number(start.startedAt || 0);
    const axis = start.axis;
    resetSwipeTracker(false);
    if (!point) return;

    const diffX = point.x - start.x;
    const diffY = point.y - start.y;
    const absX = Math.abs(diffX);
    const absY = Math.abs(diffY);
    const horizontalEnough = absX >= 40 && absX > absY * 0.78;
    const quickEnough = duration <= 800 || absX >= 72;

    if (!(axis === "x" || horizontalEnough) || !horizontalEnough || !quickEnough) return;

    closeAllSections();
    if (diffX < 0) {
      setScreenIndex((prev) => Math.min(prev + 1, SCREENS.length - 1));
    } else {
      setScreenIndex((prev) => Math.max(prev - 1, 0));
    }
  }

  useEffect(() => {
    const cancelHandler = () => resetSwipeTracker(false);
    const prefersTouch = typeof window !== "undefined" && (("ontouchstart" in window) || navigator.maxTouchPoints > 0);

    if (prefersTouch) {
      window.addEventListener("touchstart", handleSwipeStart, { capture: true, passive: true });
      window.addEventListener("touchmove", handleSwipeMove, { capture: true, passive: false });
      window.addEventListener("touchend", handleSwipeEnd, { capture: true, passive: true });
      window.addEventListener("touchcancel", cancelHandler, { capture: true, passive: true });

      return () => {
        window.removeEventListener("touchstart", handleSwipeStart, true);
        window.removeEventListener("touchmove", handleSwipeMove, true);
        window.removeEventListener("touchend", handleSwipeEnd, true);
        window.removeEventListener("touchcancel", cancelHandler, true);
      };
    }

    document.addEventListener("pointerdown", handleSwipeStart, { capture: true, passive: true });
    document.addEventListener("pointermove", handleSwipeMove, { capture: true, passive: false });
    document.addEventListener("pointerup", handleSwipeEnd, { capture: true, passive: true });
    document.addEventListener("pointercancel", cancelHandler, { capture: true, passive: true });

    return () => {
      document.removeEventListener("pointerdown", handleSwipeStart, true);
      document.removeEventListener("pointermove", handleSwipeMove, true);
      document.removeEventListener("pointerup", handleSwipeEnd, true);
      document.removeEventListener("pointercancel", cancelHandler, true);
    };
  }, []);

  if (!session) {
    return (
      <div className={themeMode === "light" ? "theme-light" : ""} style={styles.page}>
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
    <div className={themeMode === "light" ? "theme-light" : ""} style={styles.page}>
      <div style={styles.container}>
        <div className={themeMode === "light" ? "theme-light-panel" : ""} style={styles.themedContent}>
        <div style={styles.topBar}>
          <div style={styles.brandHeroCompact}>
            <img src={LOGO_URL} alt="logo" style={styles.logoCompact} />
            <div>
              <div style={styles.brandTextSmall}>Iron Syndicate</div>
              <div style={styles.brandTaglineSmall}>Track. Optimize. Dominate.</div>
            </div>
          </div>

          <div style={styles.headerActions}>
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
              <button
                style={styles.secondaryButton}
                onClick={() => setActiveAction((prev) => (prev === "settings" ? null : "settings"))}
              >
                Settings
              </button>
              {supabase ? (
                <button style={styles.secondaryButton} onClick={handleSignOut}>
                  Sign out
                </button>
              ) : null}
            </div>
          </div>
        </div>

        <div style={styles.swipeShell}>
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

          {currentScreen === "home" ? (
            <div style={styles.stackLayout}>
              <div style={styles.welcomeCard}>
                <div>
                  <div style={styles.welcomeEyebrow}>Welcome back, {welcomeName}.</div>
                  <div style={styles.welcomeTitle}>Ready to dominate?</div>
                  <div style={styles.smallText}>{welcomeTagline}</div>
                </div>
              </div>
              <div className={themeMode === "light" ? "theme-light-panel" : ""} style={{ ...styles.card, ...styles.phaseHeroCard }}>
                <div style={styles.phaseHeroTop}>
                  <div style={styles.phaseTitleBlock}>
                    <div style={styles.phaseEyebrow}>Current Phase</div>
                    <div style={styles.phaseTitleRow}>
                      <div style={styles.phaseTitleLead}>
                        <div style={styles.phaseEmoji}>{dashboardModel.phaseSummary.icon}</div>
                        <div style={styles.phaseTitleMain}>
                          <div style={styles.phaseTitleInlineRow}>
                            <div style={styles.phaseHeroTitle}>{dashboardModel.phaseSummary.name}</div>
                            <div style={styles.phaseTitleInlineMeta}>
                              {dashboardModel.phaseSummary.active
                                ? `${dashboardModel.phaseSummary.type} • Day ${dashboardModel.phaseSummary.dayNumber || 1}`
                                : "Setup needed"}
                            </div>
                          </div>
                          {!dashboardModel.phaseSummary.active ? (
                            <div style={styles.smallText}>Start a phase to give your progress context.</div>
                          ) : null}
                        </div>
                      </div>
                      {dashboardModel.phaseSummary.active ? (
                        <div style={styles.phaseHeaderPillsInline}>
                          <div style={{ ...styles.phaseInfoPill, ...styles.phaseHeaderInfoPill }}>
                            {dashboardModel.phaseSummary.targetText}
                          </div>
                          <div
                            style={
                              dashboardModel.phaseSummary.paceTone === "positive"
                                ? { ...styles.phaseInfoPill, ...styles.phaseInfoPillPositive, ...styles.phaseHeaderInfoPill }
                                : dashboardModel.phaseSummary.paceTone === "warning"
                                ? { ...styles.phaseInfoPill, ...styles.phaseInfoPillWarning, ...styles.phaseHeaderInfoPill }
                                : { ...styles.phaseInfoPill, ...styles.phaseHeaderInfoPill }
                            }
                          >
                            {dashboardModel.phaseSummary.paceMessage}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>

                {dashboardModel.phaseSummary.active ? (
                  <>
                    <div style={styles.phaseMicroRow}>
                      <div style={styles.phaseMicroText}>
                        {dashboardModel.phaseSummary.workoutTarget || intelligentTargets.workoutTarget
                          ? `${dashboardModel.phaseSummary.workoutTarget || intelligentTargets.workoutTarget} lifts / week`
                          : "Training rhythm pending"}
                      </div>
                      <div style={styles.phaseMicroDivider}>•</div>
                      <div style={styles.phaseMicroText}>Daily tracker below</div>
                    </div>

                    <div style={styles.dailyRewardGrid}>
                      {dailyRewardTiles.map((tile) => (
                        <DailyRewardTile
                          key={tile.title}
                          title={tile.title}
                          cadence={tile.cadence}
                          done={tile.done}
                          note={tile.note}
                          stateLabel={tile.stateLabel}
                          streakCount={tile.streakCount}
                          streakUnit={tile.streakUnit}
                          fireSize={tile.fireSize}
                        />
                      ))}
                    </div>
                  </>
                ) : (
                  <div style={styles.emptyBox}>
                    Bulk, cut, cruise, or blast — once a phase is set, the dashboard starts judging pace instead of only showing entries.
                  </div>
                )}
              </div>

              <ProtocolIntelligenceCard schedules={schedules} profile={profile} onNavigate={(screen) => { const idx = SCREENS.indexOf(screen); if (idx >= 0) setScreenIndex(idx); }} />

              {needsSetupPrompt ? (
                <div style={{ ...styles.card, border: "1px solid rgba(245,158,11,0.2)" }}>
                  <div style={styles.sectionHeaderRow}>
                    <div>
                      <h2 style={{ ...styles.cardTitle, margin: 0 }}>{setupPromptCopy.title}</h2>
                      <div style={styles.smallText}>{setupPromptCopy.body}</div>
                    </div>
                    <div style={styles.signalCountPill}>Setup</div>
                  </div>
                  <div style={{ ...styles.actionRowSmall, marginTop: 8 }}>
                    <button type="button" style={styles.primaryButton} onClick={setupPromptCopy.primaryAction}>
                      {setupPromptCopy.primaryLabel}
                    </button>
                    {setupPromptCopy.secondaryLabel ? (
                      <button type="button" style={styles.secondaryButton} onClick={setupPromptCopy.secondaryAction}>
                        {setupPromptCopy.secondaryLabel}
                      </button>
                    ) : null}
                  </div>
                </div>
              ) : null}

              <div
                style={{
                  ...styles.card,
                  border: "1px solid rgba(245,158,11,0.24)",
                  boxShadow: "0 20px 48px rgba(0,0,0,0.38)"
                }}
              >
                <div style={styles.sectionHeaderRow}>
                  <div>
                    <h2 style={{ ...styles.cardTitle, margin: 0 }}>Today’s Targets</h2>
                    <div style={styles.smallText}>
                      {activePhase
                        ? "Main focus for the day — keep these moving."
                        : nutritionTargets.source === "coach"
                        ? "Built from your saved profile. Add a phase to tighten the coaching."
                        : "Set your profile + phase once and the app will quietly handle the rest."}
                    </div>
                  </div>
                  <div style={styles.signalCountPill}>Live</div>
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
                    compact
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
                    compact
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
                    compact
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
                    compact
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

                {nutritionFoodIdeas.length ? (
                  <div style={{ ...styles.libraryCard, marginTop: 14 }}>
                    <div style={styles.listTop}>
                      <div>
                        <div style={styles.listTitle}>Quick food ideas</div>
                        <div style={styles.smallText}>Small nudges based on what is still open today.</div>
                      </div>
                      <div style={styles.signalCountPill}>Live</div>
                    </div>
                    <div style={{ marginTop: 8, display: "grid", gap: 8 }}>
                      {nutritionFoodIdeas.map((idea) => (
                        <div key={idea.macro} style={styles.listCard}>
                          <div style={styles.listTop}>
                            <div>
                              <div style={styles.listTitle}>{idea.title}</div>
                              <div style={styles.smallText}>{idea.hint}</div>
                            </div>
                            <div style={styles.progressChip}>{idea.macro}</div>
                          </div>
                          {idea.foods.length ? (
                            <div style={{ ...styles.phasePillRow, marginTop: 10 }}>
                              {idea.foods.map((food) => (
                                <button
                                  key={`${idea.macro}-${food.name}`}
                                  type="button"
                                  style={styles.phaseInfoPill}
                                  onClick={() => {
                                    setFoodForm((prev) => ({ ...prev, name: food.name }));
                                    setFoodSearch(food.name);
                                    setFoodCategory("All");
                                    setShowFoodDropdown(true);
                                    setActiveAction("food");
                                  }}
                                >
                                  {food.name}
                                </button>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div style={{ ...styles.phasePillRow, marginTop: 14 }}>
                  <div style={styles.phaseInfoPill}>
                    On-plan {dashboardModel.weeklyRecap.onPlan7}/7
                  </div>
                  <div style={styles.phaseInfoPill}>
                    Protein {dashboardModel.weeklyRecap.proteinHits7}/7
                  </div>
                  <div style={styles.phaseInfoPill}>
                    {dashboardModel.weeklyRecap.avgCalories7 != null
                      ? `Avg ${Math.round(dashboardModel.weeklyRecap.avgCalories7)} kcal`
                      : "7-day trend pending"}
                  </div>
                </div>

                <div style={{ ...styles.contextSummary, marginTop: 12 }}>
                  <div style={styles.smallText}>
                    {activePhase
                      ? `${activePhase.name} is quietly setting your fuel targets, pace calls, cardio tone, and coaching style.`
                      : nutritionTargets.source === "coach"
                      ? "Your saved profile is already shaping today’s targets. Add a phase to make the app more specific."
                      : "Set your profile + phase once and the rest of the app starts filling itself in for you."}
                  </div>
                  <div style={styles.smallText}>
                    {nutritionIdeaSignal?.hint ||
                      displayedSignals[0]?.hint ||
                      "Use the dock to log meals fast and watch these bars move in real time."}
                  </div>
                </div>
              </div>

              <div style={styles.card}>
                <div style={styles.sectionHeaderRow}>
                  <div>
                    <h2 style={{ ...styles.cardTitle, margin: 0 }}>Weekly Scorecard</h2>
                    <div style={styles.smallText}>A cleaner read on whether the last 7 days actually moved the phase.</div>
                  </div>
                  <div style={styles.signalCountPill}>7 days</div>
                </div>

                <div style={styles.statsGrid}>
                  <div style={styles.statCard}>
                    <div style={styles.glassHighlight} />
                    <div style={styles.statLabel}>Planned lifts</div>
                    <div style={styles.statValue}>{weeklyCoachingRecap.workoutCompleted}/{weeklyCoachingRecap.workoutTarget || 0}</div>
                  </div>
                  <div style={styles.statCard}>
                    <div style={styles.glassHighlight} />
                    <div style={styles.statLabel}>Planned cardio</div>
                    <div style={styles.statValue}>{weeklyCoachingRecap.cardioCompleted}/{weeklyCoachingRecap.cardioTarget || 0}</div>
                  </div>
                  <div style={styles.statCard}>
                    <div style={styles.glassHighlight} />
                    <div style={styles.statLabel}>Protein hits</div>
                    <div style={styles.statValue}>{weeklyCoachingRecap.proteinHits}/7</div>
                  </div>
                  <div style={styles.statCard}>
                    <div style={styles.glassHighlight} />
                    <div style={styles.statLabel}>Weight trend</div>
                    <div style={styles.statValue}>{weeklyCoachingRecap.weightTrend == null ? '—' : formatSigned(weeklyCoachingRecap.weightTrend, ' lb')}</div>
                    <div style={styles.smallText}>{weeklyCoachingRecap.weighIns} weigh-in{weeklyCoachingRecap.weighIns === 1 ? '' : 's'}</div>
                  </div>
                </div>

                <div style={{ ...styles.contextSummary, marginTop: 12 }}>
                  <div style={styles.smallText}>{weeklyCoachingRecap.summary}</div>
                  <div style={styles.smallText}>{yesterdayRecap.headline} {yesterdayRecap.tasks.map((task) => `${task.label}: ${task.done ? 'done' : 'open'}`).join(' • ')}</div>
                </div>
              </div>

              <div style={styles.card}>
                <div style={styles.sectionHeaderRow}>
                  <div>
                    <h2 style={{ ...styles.cardTitle, margin: 0 }}>Today’s Signals</h2>
                    <div style={styles.smallText}>What your recent logs actually mean.</div>
                  </div>
                  <div style={styles.signalCountPill}>
                    {displayedSignals.length} live
                  </div>
                </div>

                {displayedSignals.length === 0 ? (
                  <div style={styles.emptyBox}>
                    Log a few days of food, weight, training, and protocol data. This feed will start coaching back.
                  </div>
                ) : (
                  <div style={styles.signalStack}>
                    {displayedSignals.map((signal) => {
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
                              title="Tap to view full size"
                              onClick={() => openPhotoViewer(photo)}
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
            </div>
          ) : null}

          {currentScreen === "charts" ? (
            <div style={styles.stackLayout}>
              <div style={styles.card}>
                <div style={styles.sectionHeaderRow}>
                  <div>
                    <h2 style={{ ...styles.cardTitle, margin: 0 }}>Week view</h2>
                    <div style={styles.smallText}>Tap a day to open exact logs, planned muscle groups, cardio, and protocol timing.</div>
                  </div>
                  <div style={styles.weekNavRow}>
                    <button type="button" style={styles.secondaryButton} onClick={() => setWeekViewAnchor((prev) => addDaysToDateString(startOfWeek(prev), -7))}>←</button>
                    <button type="button" style={styles.secondaryButton} onClick={() => { setWeekViewAnchor(startOfWeek(todayInput())); setExpandedWeekDate(todayInput()); }}>Today</button>
                    <button type="button" style={styles.secondaryButton} onClick={() => setWeekViewAnchor((prev) => addDaysToDateString(startOfWeek(prev), 7))}>→</button>
                  </div>
                </div>
                <div style={styles.smallText}>{fmtDate(weekStartDate)} — {fmtDate(weekEndDate)}</div>
                <div style={{ ...styles.phasePillRow, marginTop: 8 }}>
                  <div style={styles.phaseInfoPill}>{Math.round(weekMacroSummary.calories)} kcal</div>
                  <div style={styles.phaseInfoPill}>P {Math.round(weekMacroSummary.protein)}g</div>
                  <div style={styles.phaseInfoPill}>C {Math.round(weekMacroSummary.carbs)}g</div>
                  <div style={styles.phaseInfoPill}>F {Math.round(weekMacroSummary.fats)}g</div>
                  <div style={styles.phaseInfoPill}>Fi {Math.round(weekMacroSummary.fiber)}g</div>
                  <div style={styles.phaseInfoPill}>{Math.round(weekMacroSummary.cardioMinutes)} cardio min</div>
                </div>
                <div style={{ ...styles.actionRowSmall, marginTop: 8 }}>
                  <button type="button" style={styles.secondaryButton} onClick={autoPlanShownWeek}>Auto-plan shown week</button>
                  <button type="button" style={styles.secondaryButton} onClick={clearPlannedWeek}>Clear planned week</button>
                </div>

                <div style={styles.weekCalendarGrid}>
                  {weekCalendar.map((day) => (
                    <button
                      key={day.date}
                      type="button"
                      style={
                        day.date === expandedWeekDate
                          ? { ...styles.weekDayCard, ...styles.weekDayCardActive }
                          : styles.weekDayCard
                      }
                      onClick={() => setExpandedWeekDate(day.date)}
                    >
                      <div style={styles.weekDayTop}>
                        <div>
                          <div style={styles.weekDayLabel}>{new Date(`${day.date}T12:00:00`).toLocaleDateString(undefined, { weekday: "short" })}</div>
                          <div style={styles.weekDayDate}>{shortDate(day.date)}</div>
                        </div>
                        {sameDay(day.date, todayInput()) ? <div style={styles.todayMiniPill}>Today</div> : null}
                      </div>
                      <div style={styles.weekStatusRow}>
                        {[
                          ["Food", day.status.food],
                          [day.workoutLabel, day.status.workout],
                          [day.cardioLabel, day.status.cardio]
                        ].map(([label, done]) => (
                          <div key={label} style={styles.weekStatusItem}>
                            <div style={done ? { ...styles.weekStatusDot, ...styles.weekStatusDotDone } : { ...styles.weekStatusDot, ...styles.weekStatusDotTodo }} />
                            <div style={styles.weekStatusLabel}>{label}</div>
                          </div>
                        ))}
                      </div>
                      {(day.scheduledInjections.length || day.loggedInjections.length) ? (
                        <div style={styles.weekInjectionPill}>💉 {Array.from(new Set([...day.scheduledInjections, ...day.loggedInjections].map((entry) => String(entry.peptide || '').slice(0, 5)))).join(' • ')}</div>
                      ) : null}
                    </button>
                  ))}
                </div>
                <div style={{ ...styles.weekNavRow, marginTop: 10, justifyContent: 'flex-end' }}>
                  <button type="button" style={styles.secondaryButton} onClick={() => setWeekViewAnchor((prev) => addDaysToDateString(startOfWeek(prev), -7))}>← Prev week</button>
                  <button type="button" style={styles.secondaryButton} onClick={() => setWeekViewAnchor((prev) => addDaysToDateString(startOfWeek(prev), 7))}>Next week →</button>
                </div>

                {expandedWeekDay ? (
                  <div style={styles.weekDetailCard}>
                    <div style={styles.sectionHeaderRow}>
                      <div>
                        <h3 style={{ ...styles.cardTitle, fontSize: 20, margin: 0 }}>{fmtDate(expandedWeekDay.date)}</h3>
                        <div style={styles.smallText}>Full view of what got logged, what is planned, and what is due.</div>
                      </div>
                      <div style={styles.signalCountPill}>
                        {[
                          expandedWeekDay.status.food,
                          expandedWeekDay.status.workout,
                          expandedWeekDay.status.cardio
                        ].filter(Boolean).length}/3
                      </div>
                    </div>

                    <div style={styles.weekDetailSectionStack}>
                      <CollapsibleSection
                        title="Food history"
                        open={weekDetailExpanded.food}
                        onToggle={() => setWeekDetailExpanded((prev) => ({ ...prev, food: !prev.food }))}
                        right={`${expandedWeekDay.foodEntries.length} logged`}
                      >
                        {expandedWeekDay.foodEntries.length ? expandedWeekDay.foodEntries.map((entry) => (
                          <div key={entry.id} style={styles.historyMiniCard}>
                            <div style={styles.historyMiniTitle}>{entry.foodName}</div>
                            <div style={styles.smallText}>Servings {Number(entry.servings || 1)} • {entry.totalCalories} cal • P {entry.totalProtein} • C {entry.totalCarbs} • F {entry.totalFats}</div>
                          </div>
                        )) : <div style={styles.emptyMiniBox}>No food logged.</div>}
                      </CollapsibleSection>

                      <CollapsibleSection
                        title="Workout history + planner"
                        open={weekDetailExpanded.workout}
                        onToggle={() => setWeekDetailExpanded((prev) => ({ ...prev, workout: !prev.workout }))}
                        right={`${expandedWeekDay.workoutEntries.length} logged`}
                      >
                        {expandedWeekDay.workoutEntries.length ? expandedWeekDay.workoutEntries.map((entry) => (
                          <div key={entry.id} style={styles.historyMiniCard}>
                            <div style={styles.historyMiniTitle}>{getEntryGroups(entry).length ? getEntryGroups(entry).join(", ") : "Workout"}</div>
                            <div style={styles.smallText}>{stripPlanPrefix(entry.notes) || "Logged"}</div>
                          </div>
                        )) : <div style={styles.emptyMiniBox}>No workout logged.</div>}
                        {expandedWeekDay.plannedWorkoutEntries.length ? (
                          <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                            <div style={styles.listTitle}>Planner</div>
                            {expandedWeekDay.plannedWorkoutEntries.map((entry) => {
                              const meta = getPlannedWorkoutMeta(entry);
                              return (
                                <div key={entry.id} style={styles.historyMiniCard}>
                                  <div style={styles.historyMiniTitle}>{meta.label || (getEntryGroups(entry).length ? getEntryGroups(entry).join(", ") : "Workout")}</div>
                                  <div style={styles.smallText}>{meta.cue || "Planned"}</div>
                                  {meta.routineItems?.length ? (
                                    renderRoutineExerciseCards(meta, entry.date, { showCheckboxes: false, compact: true, limit: 3 })
                                  ) : meta.routine?.length ? (
                                    <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
                                      {meta.routine.slice(0, 4).map((line) => (
                                        <div key={line} style={styles.smallText}>{line}</div>
                                      ))}
                                    </div>
                                  ) : null}
                                </div>
                              );
                            })}
                          </div>
                        ) : null}
                      </CollapsibleSection>

                      <CollapsibleSection
                        title="Cardio history + planner"
                        open={weekDetailExpanded.cardio}
                        onToggle={() => setWeekDetailExpanded((prev) => ({ ...prev, cardio: !prev.cardio }))}
                        right={`${expandedWeekDay.cardioEntries.length} logged`}
                      >
                        {expandedWeekDay.cardioEntries.length ? expandedWeekDay.cardioEntries.map((entry) => (
                          <div key={entry.id} style={styles.historyMiniCard}>
                            <div style={styles.historyMiniTitle}>{entry.type}</div>
                            <div style={styles.smallText}>{entry.minutes} min{entry.notes ? ` • ${stripPlanPrefix(entry.notes)}` : ""}</div>
                          </div>
                        )) : <div style={styles.emptyMiniBox}>No cardio logged.</div>}
                        {expandedWeekDay.plannedCardioEntries.length ? (
                          <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                            <div style={styles.listTitle}>Planner</div>
                            {expandedWeekDay.plannedCardioEntries.map((entry) => {
                              const meta = getPlannedCardioMeta(entry);
                              return (
                                <div key={entry.id} style={styles.historyMiniCard}>
                                  <div style={styles.historyMiniTitle}>{meta.label || entry.type}</div>
                                  <div style={styles.smallText}>{meta.cue || `${meta.minutes} min planned`}</div>
                                </div>
                              );
                            })}
                          </div>
                        ) : null}
                      </CollapsibleSection>

                      <CollapsibleSection
                        title="Protocol timing"
                        open={weekDetailExpanded.protocol}
                        onToggle={() => setWeekDetailExpanded((prev) => ({ ...prev, protocol: !prev.protocol }))}
                        right={`${expandedWeekDay.scheduledInjections.length + expandedWeekDay.loggedInjections.length} items`}
                      >
                        <div style={styles.weekProtocolRow}>
                          <div style={styles.weekProtocolBlock}>
                            <div style={styles.listTitle}>Scheduled protocol</div>
                            {expandedWeekDay.scheduledInjections.length ? expandedWeekDay.scheduledInjections.map((entry, index) => (
                              <div key={`${entry.peptide}-${index}`} style={styles.historyMiniCard}>
                                <div style={styles.historyMiniTitle}>{entry.peptide}</div>
                                <div style={styles.smallText}>{entry.time || "Time not set"}</div>
                              </div>
                            )) : <div style={styles.emptyMiniBox}>Nothing scheduled.</div>}
                          </div>
                          <div style={styles.weekProtocolBlock}>
                            <div style={styles.listTitle}>Logged protocol</div>
                            {expandedWeekDay.loggedInjections.length ? expandedWeekDay.loggedInjections.map((entry) => (
                              <div key={entry.id} style={styles.historyMiniCard}>
                                <div style={styles.historyMiniTitle}>{entry.peptide}</div>
                                <div style={styles.smallText}>{entry.dosage} {entry.unit}{entry.time ? ` • ${entry.time}` : ""}</div>
                              </div>
                            )) : <div style={styles.emptyMiniBox}>No protocol log on this day.</div>}
                          </div>
                        </div>
                      </CollapsibleSection>
                    </div>
                  </div>
                ) : null}
              </div>

              <div style={styles.card}>
                <div style={styles.sectionHeaderRow}>
                  <div>
                    <h2 style={{ ...styles.cardTitle, margin: 0 }}>Body trend overview</h2>
                    <div style={styles.smallText}>One clean chart for weight, skeletal muscle, and body fat.</div>
                  </div>
                  <div style={styles.signalCountPill}>3 lines</div>
                </div>
                <MultiMetricChart
                  data={combinedBodyTrendData}
                  series={[
                    { key: "weight", color: "#f59e0b", label: "Weight", unit: " lb" },
                    { key: "skeletalMuscleMass", color: "#ef4444", label: "Skeletal muscle", unit: " lb" },
                    { key: "bodyFatPercent", color: "#60a5fa", label: "Body fat", unit: "%" }
                  ]}
                  emptyText="Add at least two body-metric check-ins to build the trend view."
                  subtitle="Each line uses its own range so the direction is easy to read at a glance."
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
                            Servings {Number(item.servings || 1)} • {item.totalCalories} cal • P {item.totalProtein} • C {item.totalCarbs} • F {item.totalFats}
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
                right={`${loggedWorkouts.length} entries`}
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
                            {getEntryGroups(item).length ? getEntryGroups(item).join(", ") : "Workout"}
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
                right={`${loggedCardioEntriesAll.length} entries`}
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
              {movementCuesCard}
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
                  Compare changes over your selected timeframe. {dashboardModel.bodyMetrics?.lastLoggedLabel || bodyMetricCue}
                </div>
                <div style={{ ...styles.actionRow, marginTop: 12 }}>
                  <button
                    type="button"
                    style={styles.secondaryButton}
                    onClick={() => {
                      resetBodyLogForm();
                      setActiveAction("weight");
                    }}
                  >
                    Log / import body metrics
                  </button>
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
                    {latestMetric?.bodyFatPercent ? `${latestMetric.bodyFatPercent}%` : "—"}
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
                    {latestMetric?.skeletalMuscleMass ? `${latestMetric.skeletalMuscleMass} lb` : "—"}
                  </div>
                </div>
                <div style={styles.statCard}>
                  <div style={styles.glassHighlight} />
                  <div style={styles.statLabel}>Skeletal muscle change</div>
                  <div style={styles.statValue}>
                    {skeletalMuscleDelta ? formatSigned(skeletalMuscleDelta.diff, " lb") : "—"}
                  </div>
                  <div style={styles.smallText}>
                    {skeletalMuscleDelta ? `${fmtDate(skeletalMuscleDelta.startDate)} to ${fmtDate(skeletalMuscleDelta.endDate)}` : "Need at least 2 entries"}
                  </div>
                </div>
                <div style={styles.statCard}>
                  <div style={styles.glassHighlight} />
                  <div style={styles.statLabel}>Visceral fat level</div>
                  <div style={styles.statValue}>
                    {latestVisceralMetric?.visceralFatLevel || "—"}
                  </div>
                  <div style={styles.smallText}>Saved on this device for now.</div>
                </div>
                <div style={styles.statCard}>
                  <div style={styles.glassHighlight} />
                  <div style={styles.statLabel}>Visceral fat level change</div>
                  <div style={styles.statValue}>
                    {visceralFatDelta ? formatSigned(visceralFatDelta.diff, "") : "—"}
                  </div>
                  <div style={styles.smallText}>
                    {visceralFatDelta ? `${fmtDate(visceralFatDelta.startDate)} to ${fmtDate(visceralFatDelta.endDate)}` : "Need at least 2 entries"}
                  </div>
                </div>
              </div>

              <CollapsibleSection
                title="Body Metric History"
                open={bodyHistoryOpen}
                onToggle={() => setBodyHistoryOpen((p) => !p)}
                right={`${bodyMetrics.length} entries`}
              >
                {bodyMetrics.length === 0 ? (
                  <div style={styles.emptyBox}>No body metrics yet.</div>
                ) : (
                  bodyMetricsEnriched.map((x) => (
                    <div key={x.id} style={x.daysAway <= 0 ? { ...styles.listCard, border: "1px solid rgba(239,68,68,0.38)", background: "rgba(127,29,29,0.12)" } : { ...styles.listCard, border: "1px solid rgba(34,197,94,0.34)", background: "rgba(20,83,45,0.12)" }}>
                      <div style={styles.listTop}>
                        <div>
                          <div style={styles.badge}>{fmtDate(x.date)}{x.time ? ` • ${formatDisplayTime(x.time)}` : ""}</div>
                          <div style={styles.smallText}>
                            Weight {x.weight || "—"} • SMM {x.skeletalMuscleMass || "—"} •
                            BF {x.bodyFatPercent || "—"}% • VF {x.visceralFatLevel || "—"}
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
                                title="Tap to view full size"
                                onClick={() => openPhotoViewer(photo)}
                              />
                              <div style={styles.smallText}>
                                {photo.pose || "Photo"}{photo.time ? ` • ${formatDisplayTime(photo.time)}` : ""}{photo.notes ? ` • ${photo.notes}` : ""}
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
                                title="Tap to view full size"
                                onClick={() => openPhotoViewer(photo)}
                              />
                              <div style={styles.smallText}>
                                {photo.pose || "Photo"}{photo.time ? ` • ${formatDisplayTime(photo.time)}` : ""}{photo.notes ? ` • ${photo.notes}` : ""}
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

                    <div style={styles.sectionHeaderRow}>
                      <div>
                        <h3 style={{ ...styles.cardTitle, fontSize: 20, margin: 0 }}>Photo library</h3>
                        <div style={styles.smallText}>Edit dates, swap notes, or delete old check-ins here.</div>
                      </div>
                    </div>
                    <div style={styles.photoLibraryGrid}>
                      {photoLibrary.map((photo) => (
                        <div key={photo.id} style={styles.photoLibraryCard}>
                          <img src={photo.imageUrl} alt={photo.pose || "progress"} style={styles.photoGridImage} title="Tap to view full size" onClick={() => openPhotoViewer(photo)} />
                          <div style={styles.listTop}>
                            <div>
                              <div style={styles.photoCompareHeader}>{fmtDate(photo.date)}{photo.time ? ` • ${formatDisplayTime(photo.time)}` : ""}</div>
                              <div style={styles.smallText}>{photo.pose || "Photo"}{photo.notes ? ` • ${photo.notes}` : ""}</div>
                              <div style={styles.photoMetaText}>{photoMetaById[photo.id]?.weightLabel || "Weight not logged"}</div>
                            </div>
                            <div style={styles.actionRowSmall}>
                              <button type="button" style={styles.editButton} onClick={() => startEdit("progress_photos", photo)}>Edit</button>
                              <button type="button" style={styles.deleteButton} onClick={() => deleteRow("progress_photos", photo.id, setProgressPhotos, progressPhotos)}>Delete</button>
                            </div>
                          </div>
                        </div>
                      ))}
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
                    <h2 style={styles.cardTitle}>Schedule Progress</h2>
                    <div style={styles.smallText}>Main focus: stay on time and keep the streak clean.</div>
                  </div>
                  <button style={styles.secondaryButton} onClick={() => setInjScheduleOpen((p) => !p)}>
                    {injScheduleOpen ? "Hide schedule" : "Edit schedule"}
                  </button>
                </div>

                <div style={{ ...styles.actionRowSmall, marginBottom: 12 }}>
                  <div style={{ display: "grid", gap: 4, minWidth: 180 }}>
                    <div style={styles.filterLabel}>Peptide filter</div>
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
                </div>

                {schedulePreview.length === 0 ? (
                  <div style={styles.emptyBox}>
                    {peptideFilter === "none"
                      ? "Peptide filter is set to None."
                      : "Set a schedule once and the app will keep timing, due dates, and adherence visible here."}
                  </div>
                ) : (
                  <div style={styles.scheduleBubbleStack}>
                    {schedulePreview.map((s) => {
                      const scheduleCardStyle = s.daysAway < 0 || s.daysAway === 0
                        ? { ...styles.scheduleHeroCard, border: "1px solid rgba(239,68,68,0.4)", background: "rgba(127,29,29,0.16)" }
                        : { ...styles.scheduleHeroCard, border: "1px solid rgba(34,197,94,0.38)", background: "rgba(20,83,45,0.16)" };
                      return (
                      <div key={s.id} style={scheduleCardStyle}>
                        <div style={styles.listTop}>
                          <div>
                            <div style={styles.listTitle}>{s.peptide}</div>
                            <div style={styles.smallText}>
                              {s.dosage} {s.unit} • {s.patternLabel}
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
                              : s.isPastDue || s.daysAway < 0
                              ? "Past due"
                              : s.daysAway === 0
                              ? "Due today"
                              : `${s.daysAway}d`}
                          </div>
                        </div>

                        <div style={styles.scheduleDateRow}>
                          <div style={styles.scheduleDatePrimary}>{fmtDate(s.nextDate)}</div>
                          <div style={styles.smallText}>{formatDisplayTime(s.nextTime || s.time)}</div>
                        </div>

                        <div style={styles.progressBarElite}>
                          <div
                            style={{
                              ...styles.progressFillElite,
                              width: `${s.cycleProgress}%`,
                              background:
                                s.daysAway < 0 || s.daysAway === 0
                                  ? "linear-gradient(90deg, #ef4444, #fca5a5)"
                                  : "linear-gradient(90deg, #f59e0b, #fcd34d)"
                            }}
                          />
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
                    <h2 style={styles.cardTitle}>Protocol Pulse</h2>
                    <div style={styles.smallText}>{protocolGuidance.headline}</div>
                  </div>
                  <div style={styles.signalCountPill}>{activePhase?.type || "No phase"}</div>
                </div>
                <div style={styles.contextSummary}>
                  <div style={styles.smallText}>{protocolGuidance.detail}</div>
                  <div style={styles.smallText}>
                    {schedulePreview[0]
                      ? `${schedulePreview[0].isPastDue ? "Past due:" : "Next checkpoint:"} ${fmtDate(schedulePreview[0].nextDate)} • ${formatDisplayTime(schedulePreview[0].nextTime || schedulePreview[0].time)}`
                      : "Use the bottom dock to log protocol fast. This screen stays focused on timing and consistency."}
                  </div>
                  <div style={styles.smallText}>{protocolKnowledge.phaseFit}</div>
                </div>
                <div style={styles.phasePillRow}>
                  {(protocolKnowledge.monitoring || []).slice(0, 3).map((item) => (
                    <div key={item} style={styles.phaseInfoPill}>{item}</div>
                  ))}
                </div>
              </div>

              <CollapsibleSection
                title={editing.table === "schedules" ? "Edit Schedule" : "Protocol Schedule"}
                open={injScheduleOpen}
                onToggle={() => setInjScheduleOpen((p) => !p)}
                right={`${filteredSchedules.length} schedules`}
              >
                <div style={styles.formGrid}>
                  <div>
                    <label style={styles.label}>Protocol item</label>
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
                      <label style={styles.label}>Amount</label>
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

                  <div>
                    <label style={styles.label}>Pattern</label>
                    <select
                      style={styles.input}
                      value={scheduleForm.patternType}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, patternType: e.target.value })}
                    >
                      <option value="interval">Every X days</option>
                      <option value="weekdays">Selected weekdays</option>
                      <option value="cycle">On / off cycle</option>
                    </select>
                  </div>

                  {scheduleForm.patternType === "interval" ? (
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
                  ) : null}

                  {scheduleForm.patternType === "weekdays" ? (
                    <div style={styles.formGrid}>
                      <label style={styles.label}>Due on</label>
                      <div style={styles.phasePillRow}>
                        {["MO","TU","WE","TH","FR","SA","SU"].map((code) => {
                          const active = (scheduleForm.weekdays || []).includes(code);
                          return (
                            <button
                              key={code}
                              type="button"
                              style={active ? { ...styles.phaseInfoPill, borderColor: "var(--accent)", color: "var(--accent)" } : styles.phaseInfoPill}
                              onClick={() => setScheduleForm((prev) => ({
                                ...prev,
                                weekdays: active
                                  ? (prev.weekdays || []).filter((entry) => entry !== code)
                                  : [...(prev.weekdays || []), code]
                              }))}
                            >
                              {code}
                            </button>
                          );
                        })}
                      </div>
                      <div style={styles.row2}>
                        <div>
                          <label style={styles.label}>Time</label>
                          <input style={styles.input} type="time" value={scheduleForm.time} onChange={(e) => setScheduleForm({ ...scheduleForm, time: e.target.value })} />
                        </div>
                        <div>
                          <label style={styles.label}>Reminder</label>
                          <select style={styles.input} value={scheduleForm.reminderMinutes} onChange={(e) => setScheduleForm({ ...scheduleForm, reminderMinutes: e.target.value })}>
                            {REMINDER_MINUTE_OPTIONS.map((opt) => <option key={opt} value={opt}>{scheduleReminderLabel(opt)}</option>)}
                          </select>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {scheduleForm.patternType === "cycle" ? (
                    <div style={styles.formGrid}>
                      <div style={styles.row2}>
                        <div>
                          <label style={styles.label}>Days on</label>
                          <input style={styles.input} value={scheduleForm.onDays} onChange={(e) => setScheduleForm({ ...scheduleForm, onDays: e.target.value })} />
                        </div>
                        <div>
                          <label style={styles.label}>Days off</label>
                          <input style={styles.input} value={scheduleForm.offDays} onChange={(e) => setScheduleForm({ ...scheduleForm, offDays: e.target.value })} />
                        </div>
                      </div>
                      <div style={styles.row2}>
                        <div>
                          <label style={styles.label}>Time</label>
                          <input style={styles.input} type="time" value={scheduleForm.time} onChange={(e) => setScheduleForm({ ...scheduleForm, time: e.target.value })} />
                        </div>
                        <div>
                          <label style={styles.label}>Reminder</label>
                          <select style={styles.input} value={scheduleForm.reminderMinutes} onChange={(e) => setScheduleForm({ ...scheduleForm, reminderMinutes: e.target.value })}>
                            {REMINDER_MINUTE_OPTIONS.map((opt) => <option key={opt} value={opt}>{scheduleReminderLabel(opt)}</option>)}
                          </select>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {scheduleForm.patternType === "interval" ? (
                    <div>
                      <label style={styles.label}>Reminder</label>
                      <select style={styles.input} value={scheduleForm.reminderMinutes} onChange={(e) => setScheduleForm({ ...scheduleForm, reminderMinutes: e.target.value })}>
                        {REMINDER_MINUTE_OPTIONS.map((opt) => <option key={opt} value={opt}>{scheduleReminderLabel(opt)}</option>)}
                      </select>
                    </div>
                  ) : null}

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
                              everyDays: Number(scheduleForm.everyDays || 0),
                              tags: encodeScheduleTags(scheduleForm)
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
                            everyDays: Number(scheduleForm.everyDays || 0),
                            tags: encodeScheduleTags(scheduleForm)
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
                    <div key={x.id} style={x.daysAway <= 0 ? { ...styles.listCard, border: "1px solid rgba(239,68,68,0.38)", background: "rgba(127,29,29,0.12)" } : { ...styles.listCard, border: "1px solid rgba(34,197,94,0.34)", background: "rgba(20,83,45,0.12)" }}>
                      <div style={styles.listTop}>
                        <div>
                          <div style={styles.listTitle}>{x.peptide}</div>
                          <div style={styles.smallText}>
                            {x.dosage} {x.unit} • {x.patternLabel} • {formatDisplayTime(x.nextTime || x.time)}
                          </div>
                          <div style={styles.smallText}>
                            {x.injectedToday
                              ? `Done today • Next: ${fmtDate(x.nextDate)} • ${formatDisplayTime(x.nextTime || x.time)}`
                              : x.isPastDue
                              ? `Past due since ${fmtDate(x.nextDate)} • ${formatDisplayTime(x.nextTime || x.time)}`
                              : `Next: ${fmtDate(x.nextDate)} • ${
                                  x.daysAway < 0
                                    ? "Overdue"
                                    : x.daysAway === 0
                                    ? "Due today"
                                    : `${x.daysAway} day${x.daysAway === 1 ? "" : "s"} away`
                                }`}
                          </div>
                          <div style={{ ...styles.smallText, marginTop: 4 }}>{x.reminderLabel}</div>
                          <div style={styles.inlineProgress}>
                            <div
                              style={{
                                ...styles.inlineProgressFill,
                                width: `${x.cycleProgress}%`,
                                background: x.daysAway <= 0 ? "#ef4444" : "#f59e0b"
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
                    <div key={x.id} style={x.daysAway <= 0 ? { ...styles.listCard, border: "1px solid rgba(239,68,68,0.38)", background: "rgba(127,29,29,0.12)" } : { ...styles.listCard, border: "1px solid rgba(34,197,94,0.34)", background: "rgba(20,83,45,0.12)" }}>
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
            </div>
          ) : null}

          {currentScreen === "peptides" ? (
            <PeptideCalculatorScreen themeMode={themeMode} />
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

                  <div style={styles.importPanelCard}>
                    <div style={styles.listTop}>
                      <div>
                        <div style={styles.listTitle}>Import lab report</div>
                        <div style={styles.smallText}>
                          Upload a PDF, screenshot, or lab image and the app will prefill supported markers for review before you save.
                        </div>
                      </div>
                      <div style={styles.progressChip}>{labImporting ? "Importing…" : "Beta"}</div>
                    </div>

                    <div style={styles.smallText}>
                      Parsing runs in the browser. Text PDFs are the preferred path for labs like Access Medical / Gameday reports because the app can read the original report text before falling back to OCR. High-resolution screenshots still work better than compressed camera photos.
                    </div>

                    <input
                      style={styles.input}
                      type="file"
                      accept="application/pdf,image/*,.txt,text/plain"
                      disabled={labImporting}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) await importLabReport(file);
                        e.target.value = "";
                      }}
                    />

                    {labImportStatus ? (
                      <div style={styles.importStatusRow}>
                        <div style={styles.progressChip}>{labImporting ? "Working" : "Ready"}</div>
                        <div style={styles.smallText}>{labImportStatus}</div>
                      </div>
                    ) : null}

                    {labImportReview ? (
                      <div style={styles.importReviewCard}>
                        <div style={styles.listTop}>
                          <div>
                            <div style={styles.listTitle}>{labImportReview.fileName}</div>
                            <div style={styles.smallText}>
                              {labImportReview.method}
                              {labImportReview.date ? ` • ${fmtDate(labImportReview.date)}` : ""}
                              {labImportReview.matches?.length ? ` • ${labImportReview.matches.length} markers found` : " • No supported markers found yet"}
                            </div>
                          </div>
                          <div style={styles.progressChip}>{labImportReview.method}</div>
                        </div>

                        {labImportReview.matches?.length ? (
                          <div style={styles.importReviewGrid}>
                            {labImportReview.matches.map((match) => (
                              <div key={match.marker} style={styles.importMatchCard}>
                                <div style={styles.listTop}>
                                  <div style={{ fontWeight: 800 }}>{match.marker}</div>
                                  <div style={styles.progressChipCompact}>{match.confidence}</div>
                                </div>
                                <div style={styles.smallText}>
                                  {formatImportNumber(match.value)} {match.unit || ""}
                                  {(match.low !== null && match.low !== undefined) || (match.high !== null && match.high !== undefined)
                                    ? ` • Range ${match.low ?? "—"} to ${match.high ?? "—"}`
                                    : ""}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div style={styles.emptyBox}>
                            No supported markers were confidently detected from that upload. You can still use the manual fields below.
                          </div>
                        )}
                      </div>
                    ) : null}
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
                      setLabImportReview(null);
                      setLabImportStatus("");
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

          <div style={{ height: 24 }} />
        </div>
        </div>

        <div
          data-swipe-block="true"
          className={themeMode === "light" ? "theme-light-panel" : ""}
          style={{
            ...styles.bottomDock,
            justifyContent: visibleDockItems.length ? "center" : "stretch"
          }}
        >
          {visibleDockItems.length ? (
            visibleDockItems.map(({ key, emoji, label }) => (
              <button
                key={key}
                type="button"
                style={activeAction === key ? { ...styles.dockButton, ...styles.dockButtonActive } : styles.dockButton}
                onClick={() => setActiveAction((prev) => (prev === key ? null : key))}
              >
                <div style={styles.dockEmoji}>{emoji}</div>
                <div style={styles.dockLabel}>{label}</div>
              </button>
            ))
          ) : (
            <div style={styles.dockPlaceholder}>All quick logs are hidden. Open Settings to turn dock items back on.</div>
          )}
        </div>

        <ActionModal
          themeMode={themeMode}
          open={activeAction === "phase"}
          title={activePhase ? "Phase Mode" : "Start Phase"}
          onClose={() => setActiveAction(null)}
        >
          <div style={styles.formGrid}>
            <div style={styles.contextSummary}>
              <div style={styles.smallText}>
                Save your phase once. After that, the app uses this plus your profile to set targets, pace calls, workout rhythm, cardio tone, and subtle coaching automatically.
              </div>
            </div>

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
                <label style={styles.label}>End date (optional)</label>
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
                <label style={styles.label}>Projected pace ({(PHASE_PRESETS[phaseForm.type] || PHASE_PRESETS.Bulk).targetLabel.toLowerCase()})</label>
                <input
                  style={styles.input}
                  value={phaseForm.rateTarget}
                  onChange={(e) => setPhaseForm({ ...phaseForm, rateTarget: e.target.value })}
                  placeholder="0.5"
                />
                <div style={{ ...styles.smallText, marginTop: 6 }}>
                  You choose the pace. The app shapes targets, reminders, cardio suggestions, and pace calls around it.
                </div>
              </div>
            </div>

            <div style={{ ...styles.libraryCard, padding: 12, gap: 8 }}>
              <div style={styles.listTop}>
                <div>
                  <div style={styles.listTitle}>{phaseForm.autoPilot === false ? "Manual pins are active" : "This phase will auto-set"}</div>
                  <div style={styles.smallText}>
                    {phaseForm.autoPilot === false ? "Pinned targets will stay exactly as entered until you hide the manual pins again." : "Save the phase and the app quietly fills the rest in around the pace you chose."}
                  </div>
                </div>
                <div style={styles.badge}>{phaseForm.type}</div>
              </div>

              <div style={{ ...styles.statsGrid, marginTop: 12 }}>
                <div style={styles.statCard}>
                  <div style={styles.glassHighlight} />
                  <div style={styles.statLabel}>Calories</div>
                  <div style={styles.statValue}>{phaseForm.autoPilot === false ? phaseForm.calorieTarget || "—" : phaseFormCoachTargets.calories ?? phaseForm.calorieTarget ?? "—"}</div>
                </div>
                <div style={styles.statCard}>
                  <div style={styles.glassHighlight} />
                  <div style={styles.statLabel}>Protein</div>
                  <div style={styles.statValue}>{phaseForm.autoPilot === false ? phaseForm.proteinTarget ? `${phaseForm.proteinTarget}g` : "—" : phaseFormCoachTargets.protein != null ? `${phaseFormCoachTargets.protein}g` : phaseForm.proteinTarget ? `${phaseForm.proteinTarget}g` : "—"}</div>
                </div>
                <div style={styles.statCard}>
                  <div style={styles.glassHighlight} />
                  <div style={styles.statLabel}>Workouts</div>
                  <div style={styles.statValue}>
                    {phaseForm.userLockedTrainingDays === true && phaseForm.trainingDaysPreference && phaseForm.trainingDaysPreference !== "Flexible"
                      ? `${phaseForm.trainingDaysPreference} fixed`
                      : phaseForm.autoPilot === false ? phaseForm.workoutTarget || "—" : phaseFormCoachTargets.workoutTarget ?? phaseForm.workoutTarget ?? "—"}
                  </div>
                </div>
                <div style={styles.statCard}>
                  <div style={styles.glassHighlight} />
                  <div style={styles.statLabel}>Pace</div>
                  <div style={styles.statValueMini}>{phaseForm.rateTarget ? `${phaseForm.rateTarget} lb/wk` : "Set pace"}</div>
                </div>
              </div>

              <div style={{ ...styles.contextSummary, marginTop: 12 }}>
                <div style={styles.smallText}>
                  {phaseForm.type}, projected pace, training style, days per week, goal emphasis, weak points, cardio preference, and notes now all feed the planner, calendar, cues, and signals.
                </div>
                <div style={styles.smallText}>{phaseFormCardioGuidance.nudgeHint}</div>
              </div>

              <div style={{ ...styles.contextSummary, marginTop: 12 }}>
                <div style={styles.listTitle}>Training preference questionnaire</div>
                <div style={styles.smallText}>Set your preferred split once, then change it anytime mid-phase. Past logs stay intact and only future planning updates.</div>
              </div>

              <div style={{ ...styles.row2Equal, marginTop: 12 }}>
                <div>
                  <label style={styles.label}>Training style preference</label>
                  <select
                    style={styles.input}
                    value={phaseForm.trainingStyle}
                    onChange={(e) =>
                      setPhaseForm((prev) => ({
                        ...prev,
                        trainingStyle: e.target.value
                      }))
                    }
                  >
                    {TRAINING_STYLE_OPTIONS.map((option) => (
                      <option key={option}>{option}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={styles.label}>Days per week</label>
                  <select
                    style={styles.input}
                    value={phaseForm.trainingDaysPreference}
                    onChange={(e) => {
                      const nextValue = e.target.value;
                      setPhaseForm((prev) => ({
                        ...prev,
                        trainingDaysPreference: nextValue,
                        userLockedTrainingDays: nextValue !== "Flexible",
                        workoutTarget: nextValue === "Flexible" ? prev.workoutTarget : nextValue
                      }));
                    }}
                  >
                    {TRAINING_DAYS_OPTIONS.map((option) => (
                      <option key={option}>{option}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ ...styles.row2Equal, marginTop: 12 }}>
                <div>
                  <label style={styles.label}>Goal emphasis</label>
                  <select
                    style={styles.input}
                    value={phaseForm.goalEmphasis}
                    onChange={(e) =>
                      setPhaseForm((prev) => ({
                        ...prev,
                        goalEmphasis: e.target.value
                      }))
                    }
                  >
                    {GOAL_EMPHASIS_OPTIONS.map((option) => (
                      <option key={option}>{option}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={styles.label}>Cardio preference</label>
                  <select
                    style={styles.input}
                    value={phaseForm.cardioPreference}
                    onChange={(e) =>
                      setPhaseForm((prev) => ({
                        ...prev,
                        cardioPreference: e.target.value
                      }))
                    }
                  >
                    {CARDIO_PREFERENCE_OPTIONS.map((option) => (
                      <option key={option}>{option}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ marginTop: 12 }}>
                <label style={styles.label}>Weak points to prioritize (optional)</label>
                <MultiSelect
                  options={["Chest", "Back", "Biceps", "Triceps", "Legs", "Shoulders", "Glutes"]}
                  selected={phaseForm.weakPoints}
                  onToggle={(group) =>
                    setPhaseForm((prev) => ({
                      ...prev,
                      weakPoints: prev.weakPoints.includes(group)
                        ? prev.weakPoints.filter((item) => item !== group)
                        : [...prev.weakPoints, group]
                    }))
                  }
                />
              </div>

              <div style={{ ...styles.actionRow, marginTop: 12 }}>
                <button
                  style={styles.secondaryButton}
                  type="button"
                  onClick={() => {
                    if (phaseAdvancedOpen) {
                      setPhaseAdvancedOpen(false);
                      setPhaseManualTouched(false);
                      setPhaseForm((prev) => ({
                        ...prev,
                        autoPilot: true,
                        calorieTarget: "",
                        proteinTarget: "",
                        workoutTarget: ""
                      }));
                    } else {
                      setPhaseAdvancedOpen(true);
                      setPhaseForm((prev) => ({
                        ...prev,
                        calorieTarget: prev.calorieTarget || String(phaseFormCoachTargets.calories ?? ""),
                        proteinTarget: prev.proteinTarget || String(phaseFormCoachTargets.protein ?? ""),
                        workoutTarget: prev.workoutTarget || String(phaseFormCoachTargets.workoutTarget ?? "")
                      }));
                    }
                  }}
                >
                  {phaseAdvancedOpen ? "Hide manual target pins" : "Open manual target pins (optional)"}
                </button>
              </div>
            </div>

            {phaseAdvancedOpen ? (
              <div>
                <div style={styles.smallText}>
                  Leave these blank unless you want to pin them manually. When pins are active, they override pace-driven auto-sync until you hide them again.
                </div>
                <div style={{ ...styles.row3, marginTop: 12 }}>
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
              </div>
            ) : null}

            <div>
              <label style={styles.label}>Notes</label>
              <textarea
                style={styles.textarea}
                value={phaseForm.notes}
                onChange={(e) => setPhaseForm({ ...phaseForm, notes: e.target.value })}
                placeholder="Optional reminders or context"
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
          themeMode={themeMode}
          open={activeAction === "profile"}
          title="Profile"
          onClose={() => setActiveAction(null)}
        >
          <div style={styles.formGrid}>
            <div style={styles.contextSummary}>
              <div style={styles.smallText}>
                Save who you are once. From there, the app uses this with your active phase to quietly set the rest for you.
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
                  value={effectiveWeightReference}
                  onChange={(e) => setProfile({ ...profile, currentWeightReference: e.target.value })}
                  placeholder="185"
                />
                <div style={{ ...styles.smallText, marginTop: 6 }}>Uses your latest body-metric log when available, otherwise falls back to the phase start weight you save.</div>
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
                  <select
                    style={styles.input}
                    value={profile.injectionFrequency}
                    onChange={(e) =>
                      setProfile({ ...profile, injectionFrequency: e.target.value })
                    }
                  >
                    {INJECTION_FREQUENCY_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt || "Select"}</option>)}
                  </select>
                </div>
              </div>
            ) : null}

            {profile.usingPeptides ? (
              <div style={styles.formGrid}>
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
                <div style={styles.row2Equal}>
                  <div>
                    <label style={styles.label}>Peptide</label>
                    <select style={styles.input} value={profile.peptideName || ""} onChange={(e) => setProfile({ ...profile, peptideName: e.target.value })}>
                      {PEPTIDE_NAME_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt || "Select"}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={styles.label}>Injection frequency</label>
                    <select style={styles.input} value={profile.peptideInjectionFrequency || ""} onChange={(e) => setProfile({ ...profile, peptideInjectionFrequency: e.target.value })}>
                      {INJECTION_FREQUENCY_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt || "Select"}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            ) : null}

            <div style={{ ...styles.libraryCard, padding: 12, gap: 8 }}>
              <div style={styles.listTop}>
                <div>
                  <div style={styles.listTitle}>What the app will set from this</div>
                  <div style={styles.smallText}>
                    No extra prompts — just quieter automation after save.
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
                  <div style={styles.statValue}>{activePhase ? intelligentTargets.calories ?? "—" : "Phase needed"}</div>
                </div>
                <div style={styles.statCard}>
                  <div style={styles.glassHighlight} />
                  <div style={styles.statLabel}>Protein</div>
                  <div style={styles.statValue}>
                    {activePhase
                      ? intelligentTargets.protein != null
                        ? `${intelligentTargets.protein}g`
                        : "—"
                      : "Phase needed"}
                  </div>
                </div>
                <div style={styles.statCard}>
                  <div style={styles.glassHighlight} />
                  <div style={styles.statLabel}>Training</div>
                  <div style={styles.statValue}>
                    {activePhase ? intelligentTargets.workoutTarget ?? "—" : "Phase needed"}
                  </div>
                </div>
                <div style={styles.statCard}>
                  <div style={styles.glassHighlight} />
                  <div style={styles.statLabel}>Activity</div>
                  <div style={styles.statValueMini}>{profile.activityLevel || "Moderate"}</div>
                </div>
              </div>

              <div style={{ ...styles.contextSummary, marginTop: 12 }}>
                <div style={styles.smallText}>Lab focus: {labCoach.focus.join(" • ")}</div>
                <div style={styles.smallText}>{protocolGuidance.focus}</div>
                <div style={styles.smallText}>
                  Sex, age, height, activity, TRT context, peptide context, and your active phase now feed calories, protein, cardio tone, planner bias, lab focus, and protocol coaching.
                </div>
              </div>
            </div>

            <div style={styles.contextSummary}>
              <div style={styles.smallText}>Theme and dock layout now live under Settings so Profile stays focused on who you are.</div>
            </div>

            <div style={styles.actionRow}>
              <button
                style={styles.primaryButton}
                onClick={() => {
                  setStatus("Profile saved. The app will tailor the rest around it.");
                  setActiveAction(null);
                }}
              >
                Save profile
              </button>
            </div>
          </div>
        </ActionModal>

        <ActionModal
          themeMode={themeMode}
          open={activeAction === "settings"}
          title="Settings"
          onClose={() => setActiveAction(null)}
        >
          <div style={styles.formGrid}>
            <div style={{ ...styles.libraryCard, padding: 12, gap: 8 }}>
              <div style={styles.listTop}>
                <div>
                  <div style={styles.listTitle}>Appearance</div>
                  <div style={styles.smallText}>Switch between dark and light view.</div>
                </div>
                <div style={styles.badge}>{themeMode === "light" ? "Light" : "Dark"}</div>
              </div>
              <div style={{ ...styles.actionRowSmall, marginTop: 8 }}>
                <button type="button" style={themeMode === "dark" ? { ...styles.toggleButton, ...styles.toggleButtonActive } : styles.toggleButton} onClick={() => setThemeMode("dark")}>Dark</button>
                <button type="button" style={themeMode === "light" ? { ...styles.toggleButton, ...styles.toggleButtonActive } : styles.toggleButton} onClick={() => setThemeMode("light")}>Light</button>
              </div>
            </div>

            <div style={styles.libraryCard}>
              <div style={styles.listTop}>
                <div>
                  <div style={styles.listTitle}>Quick-log dock</div>
                  <div style={styles.smallText}>Pick the order left to right and hide anything you never use.</div>
                </div>
                <button
                  type="button"
                  style={styles.secondaryButton}
                  onClick={() => setDockEditorOpen((prev) => !prev)}
                >
                  {dockEditorOpen ? "Hide editor" : "Edit dock"}
                </button>
              </div>

              {dockEditorOpen ? (
                <div style={{ marginTop: 8, display: "grid", gap: 8 }}>
                  {dockItems.map((item, index) => (
                    <div key={item.key} style={styles.listCard}>
                      <div style={styles.listTop}>
                        <div>
                          <div style={styles.listTitle}>{item.emoji} {item.label}</div>
                          <div style={styles.smallText}>{item.visible !== false ? "Visible in quick-log dock" : "Hidden from quick-log dock"}</div>
                        </div>
                        <div style={styles.actionRowSmall}>
                          <button type="button" style={index === 0 ? { ...styles.secondaryButton, opacity: 0.45, cursor: "not-allowed" } : styles.secondaryButton} onClick={() => moveDockItem(item.key, -1)} disabled={index === 0}>Left</button>
                          <button type="button" style={index === dockItems.length - 1 ? { ...styles.secondaryButton, opacity: 0.45, cursor: "not-allowed" } : styles.secondaryButton} onClick={() => moveDockItem(item.key, 1)} disabled={index === dockItems.length - 1}>Right</button>
                          <button type="button" style={styles.secondaryButton} onClick={() => toggleDockItemVisibility(item.key)}>{item.visible !== false ? "Hide" : "Show"}</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            <div style={styles.libraryCard}>
              <div style={styles.listTop}>
                <div>
                  <div style={styles.listTitle}>Reminders</div>
                  <div style={styles.smallText}>Browser reminders work best while the app is open or installed to your home screen.</div>
                </div>
                <div style={styles.badge}>{appSettings.protocolNotificationsEnabled || appSettings.motivationRemindersEnabled ? "On" : "Off"}</div>
              </div>
              <div style={{ ...styles.actionRowSmall, marginTop: 8 }}>
                <button
                  type="button"
                  style={appSettings.protocolNotificationsEnabled || appSettings.motivationRemindersEnabled ? { ...styles.toggleButton, background: "rgba(34,197,94,0.2)", borderColor: "rgba(34,197,94,0.45)", color: "#86efac" } : styles.toggleButton}
                  onClick={async () => {
                    if (typeof Notification === "undefined") {
                      setStatus("This browser does not support notifications.");
                      return;
                    }
                    const permission = await Notification.requestPermission();
                    setAppSettings((prev) => ({
                      ...prev,
                      protocolNotificationsEnabled: permission === "granted",
                      motivationRemindersEnabled: permission === "granted",
                      protocolPermission: permission
                    }));
                    setStatus(permission === "granted" ? "Browser reminders enabled." : "Notification permission not granted.");
                  }}
                >
                  Enable reminders
                </button>
                <button
                  type="button"
                  style={!appSettings.protocolNotificationsEnabled && !appSettings.motivationRemindersEnabled ? { ...styles.toggleButton, background: "rgba(239,68,68,0.18)", borderColor: "rgba(239,68,68,0.4)", color: "#fca5a5" } : styles.toggleButton}
                  onClick={() => setAppSettings((prev) => ({ ...prev, protocolNotificationsEnabled: false, motivationRemindersEnabled: false }))}
                >
                  Disable reminders
                </button>
              </div>
              <div style={{ ...styles.smallText, marginTop: 8 }}>Permission: {appSettings.protocolPermission || (typeof Notification !== "undefined" ? Notification.permission : "unsupported")}</div>
              <div style={{ ...styles.row2Equal, marginTop: 10 }}>
                <div>
                  <label style={styles.label}>Default protocol reminder</label>
                  <select style={styles.input} value={appSettings.protocolReminderMinutes} onChange={(e) => setAppSettings((prev) => ({ ...prev, protocolReminderMinutes: e.target.value }))}>
                    {REMINDER_MINUTE_OPTIONS.map((opt) => <option key={opt} value={opt}>{scheduleReminderLabel(opt)}</option>)}
                  </select>
                </div>
                <div>
                  <label style={styles.label}>Motivation reminders</label>
                  <div style={{ ...styles.actionRowSmall, marginTop: 6 }}>
                    <button type="button" style={appSettings.motivationRemindersEnabled ? { ...styles.toggleButton, background: "rgba(34,197,94,0.2)", borderColor: "rgba(34,197,94,0.45)", color: "#86efac" } : styles.toggleButton} onClick={() => setAppSettings((prev) => ({ ...prev, motivationRemindersEnabled: true }))}>On</button>
                    <button type="button" style={!appSettings.motivationRemindersEnabled ? { ...styles.toggleButton, background: "rgba(239,68,68,0.18)", borderColor: "rgba(239,68,68,0.4)", color: "#fca5a5" } : styles.toggleButton} onClick={() => setAppSettings((prev) => ({ ...prev, motivationRemindersEnabled: false }))}>Off</button>
                  </div>
                </div>
              </div>
              <div style={{ ...styles.phasePillRow, marginTop: 10 }}>
                {[
                  ["Food", "reminderFoodEnabled"],
                  ["Workout", "reminderWorkoutEnabled"],
                  ["Protein", "reminderProteinEnabled"],
                  ["Photo", "reminderPhotoEnabled"]
                ].map(([label, key]) => (
                  <button key={key} type="button" style={appSettings[key] ? { ...styles.phaseInfoPill, borderColor: "rgba(34,197,94,0.45)", color: "#86efac", background: "rgba(34,197,94,0.12)" } : { ...styles.phaseInfoPill, borderColor: "rgba(239,68,68,0.35)", color: "#fca5a5", background: "rgba(239,68,68,0.10)" }} onClick={() => setAppSettings((prev) => ({ ...prev, [key]: !prev[key] }))}>{label} {appSettings[key] ? "On" : "Off"}</button>
                ))}
              </div>
            </div>

            <div style={styles.libraryCard}>
              <div style={styles.listTop}>
                <div>
                  <div style={styles.listTitle}>Add to home screen</div>
                  <div style={styles.smallText}>Installing the app makes logging and browser reminders feel much closer to a native app.</div>
                </div>
                <div style={styles.badge}>PWA</div>
              </div>
              <div style={{ ...styles.smallText, marginTop: 8 }}>iPhone: Safari → Share → Add to Home Screen.</div>
              <div style={styles.smallText}>Android: Chrome → menu ⋮ → Add to Home screen / Install app.</div>
            </div>

            <div style={styles.libraryCard}>
              <div style={styles.listTop}>
                <div>
                  <div style={styles.listTitle}>New user tutorial</div>
                  <div style={styles.smallText}>Walk through setup, logging, uploads, planner use, progress photos, theme changes, and dock editing.</div>
                </div>
                <div style={styles.badge}>{appSettings.tutorialSeen ? "Viewed" : "New"}</div>
              </div>
              <div style={{ ...styles.actionRowSmall, marginTop: 8 }}>
                <button
                  type="button"
                  style={styles.secondaryButton}
                  onClick={() => setActiveAction("tutorial")}
                >
                  Open tutorial
                </button>
                <button
                  type="button"
                  style={styles.secondaryButton}
                  onClick={() => setAppSettings((prev) => ({ ...prev, tutorialSeen: false }))}
                >
                  Reset first-run prompt
                </button>
              </div>
            </div>

            <div style={styles.contextSummary}>
              <div style={styles.smallText}>Wearable auto-sync stays limited in a browser. Manual logs stay the cleanest fallback until native health integrations are added.</div>
            </div>
          </div>
        </ActionModal>

        <ActionModal
          themeMode={themeMode}
          open={activeAction === "tutorial"}
          title="Welcome tutorial"
          onClose={() => {
            setAppSettings((prev) => ({ ...prev, tutorialSeen: true }));
            setActiveAction(null);
          }}
        >
          <div style={styles.formGrid}>
            <div style={styles.contextSummary}>
              <div style={styles.smallText}>Use this once to set up the app start to finish. You can always reopen it later from Settings.</div>
            </div>

            <div style={styles.tutorialGrid}>
              <div style={styles.tutorialStepCard}>
                <div style={styles.tutorialStepNumber}>1</div>
                <div>
                  <div style={styles.listTitle}>Set up Profile</div>
                  <div style={styles.smallText}>Enter your basics, activity level, training context, and preferences so coaching and targets feel personal.</div>
                </div>
                <button type="button" style={styles.secondaryButton} onClick={() => { setAppSettings((prev) => ({ ...prev, tutorialSeen: true })); setActiveAction("profile"); }}>Open Profile</button>
              </div>

              <div style={styles.tutorialStepCard}>
                <div style={styles.tutorialStepNumber}>2</div>
                <div>
                  <div style={styles.listTitle}>Create your Phase</div>
                  <div style={styles.smallText}>Set the phase type, pace, cardio preference, and training split so the planner and targets know what to build.</div>
                </div>
                <button type="button" style={styles.secondaryButton} onClick={() => { setAppSettings((prev) => ({ ...prev, tutorialSeen: true })); setActiveAction("phase"); }}>Open Phase</button>
              </div>

              <div style={styles.tutorialStepCard}>
                <div style={styles.tutorialStepNumber}>3</div>
                <div>
                  <div style={styles.listTitle}>Log or upload body metrics</div>
                  <div style={styles.smallText}>Use the Body log for manual entries or upload a scan/report so weight, body fat, muscle, and visceral fat fill faster.</div>
                </div>
                <button type="button" style={styles.secondaryButton} onClick={() => { setAppSettings((prev) => ({ ...prev, tutorialSeen: true })); setScreenIndex(SCREENS.indexOf("body")); setActiveAction("weight"); }}>Open Body log</button>
              </div>

              <div style={styles.tutorialStepCard}>
                <div style={styles.tutorialStepNumber}>4</div>
                <div>
                  <div style={styles.listTitle}>Upload labs</div>
                  <div style={styles.smallText}>Upload a lab PDF or image, review the autofill, then save the lab panel so trends and coaching stay accurate.</div>
                </div>
                <button type="button" style={styles.secondaryButton} onClick={() => { setAppSettings((prev) => ({ ...prev, tutorialSeen: true })); setScreenIndex(SCREENS.indexOf("labs")); setActiveAction("labs"); }}>Open Labs</button>
              </div>

              <div style={styles.tutorialStepCard}>
                <div style={styles.tutorialStepNumber}>5</div>
                <div>
                  <div style={styles.listTitle}>Use the workout planner</div>
                  <div style={styles.smallText}>Auto-plan the week, review today’s cue, and log what you actually do. If you override the plan, the app should adapt forward from there.</div>
                </div>
                <button type="button" style={styles.secondaryButton} onClick={() => { setAppSettings((prev) => ({ ...prev, tutorialSeen: true })); setScreenIndex(SCREENS.indexOf("home")); setActiveAction(null); }}>Go Home</button>
              </div>

              <div style={styles.tutorialStepCard}>
                <div style={styles.tutorialStepNumber}>6</div>
                <div>
                  <div style={styles.listTitle}>Log food fast</div>
                  <div style={styles.smallText}>Use the dock for quick access, repeat yesterday, save common meals, and use the search dropdown plus recent foods to log in seconds.</div>
                </div>
                <button type="button" style={styles.secondaryButton} onClick={() => { setAppSettings((prev) => ({ ...prev, tutorialSeen: true })); setActiveAction("food"); }}>Open Food log</button>
              </div>

              <div style={styles.tutorialStepCard}>
                <div style={styles.tutorialStepNumber}>7</div>
                <div>
                  <div style={styles.listTitle}>Progress photos and editing old entries</div>
                  <div style={styles.smallText}>Use the photo logger for front/side/back progress shots. Most history cards across the app include Edit and Delete so you can fix past entries anytime.</div>
                </div>
                <button type="button" style={styles.secondaryButton} onClick={() => { setAppSettings((prev) => ({ ...prev, tutorialSeen: true })); setActiveAction("photo"); }}>Open Photo log</button>
              </div>

              <div style={styles.tutorialStepCard}>
                <div style={styles.tutorialStepNumber}>8</div>
                <div>
                  <div style={styles.listTitle}>Theme and dock setup</div>
                  <div style={styles.smallText}>Switch between light and dark mode, control reminders, learn how to install the app, and edit which quick-log buttons appear in the dock.</div>
                </div>
                <button type="button" style={styles.secondaryButton} onClick={() => { setAppSettings((prev) => ({ ...prev, tutorialSeen: true })); setActiveAction("settings"); }}>Open Settings</button>
              </div>
            </div>

            <div style={styles.actionRow}>
              <button
                type="button"
                style={styles.primaryButton}
                onClick={() => {
                  setAppSettings((prev) => ({ ...prev, tutorialSeen: true }));
                  setActiveAction(null);
                }}
              >
                Finish tutorial
              </button>
            </div>
          </div>
        </ActionModal>

        <ActionModal
          themeMode={themeMode}
          open={activeAction === "weight"}
          title={editing.table === "body_metrics" ? "Edit Body Metrics" : "Log Body Metrics"}
          onClose={() => setActiveAction(null)}
        >
          <div style={styles.formGrid}>
            <div style={styles.contextSummary}>
              <div style={styles.smallText}>{bodyMetricCue}</div>
              <div style={styles.smallText}>
                {bodyForm.weight || bodyForm.bodyFatPercent || bodyForm.skeletalMuscleMass || bodyForm.visceralFatLevel
                  ? "Weight plus body-composition fields give the app a much cleaner read than scale weight alone."
                  : "A quick weight or waist check-in helps the app keep your pace calls accurate."}
              </div>
            </div>

            <div style={styles.importPanelCard}>
              <div style={styles.listTop}>
                <div>
                  <div style={styles.listTitle}>Import body report</div>
                  <div style={styles.smallText}>
                    Upload a smart-scale PDF, DEXA screenshot, or body-comp image and the app will prefill the fields below for review before you save.
                  </div>
                </div>
                <div style={styles.progressChip}>{bodyImporting ? "Importing…" : "Beta"}</div>
              </div>

              <div style={styles.smallText}>
                Text PDFs are fastest. High-resolution exports work best; screenshots from the original report usually read better than compressed camera images. Images and scanned PDFs use OCR and may take a little longer.
              </div>

              <input
                style={styles.input}
                type="file"
                accept="application/pdf,image/*,.txt,text/plain"
                disabled={bodyImporting}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) await importBodyReport(file);
                  e.target.value = "";
                }}
              />

              {bodyImportStatus ? (
                <div style={styles.importStatusRow}>
                  <div style={styles.progressChip}>{bodyImporting ? "Working" : "Ready"}</div>
                  <div style={styles.smallText}>{bodyImportStatus}</div>
                </div>
              ) : null}

              {bodyImportReview ? (
                <div style={styles.importReviewCard}>
                  <div style={styles.listTop}>
                    <div>
                      <div style={styles.listTitle}>{bodyImportReview.fileName}</div>
                      <div style={styles.smallText}>
                        {bodyImportReview.method}
                        {bodyImportReview.date ? ` • ${fmtDate(bodyImportReview.date)}` : ""}
                        {bodyImportReview.matches?.length ? ` • ${bodyImportReview.matches.length} fields found` : " • No supported fields found yet"}
                      </div>
                    </div>
                    <div style={styles.progressChip}>{bodyImportReview.method}</div>
                  </div>

                  {bodyImportReview.matches?.length ? (
                    <div style={styles.importReviewGrid}>
                      {bodyImportReview.matches.map((match) => (
                        <div key={match.field} style={styles.importMatchCard}>
                          <div style={styles.listTop}>
                            <div style={{ fontWeight: 800 }}>{match.label}</div>
                            <div style={styles.progressChipCompact}>{match.confidence}</div>
                          </div>
                          <div style={styles.smallText}>
                            {formatImportNumber(match.value)}{match.unit ? ` ${match.unit}` : ""}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={styles.emptyBox}>
                      No supported body metrics were confidently detected from that upload. You can still use the manual fields below.
                    </div>
                  )}
                </div>
              ) : null}

              <div style={styles.smallText}>Visceral fat level is saved on this device for now so you can add it without a database migration.</div>
            </div>

            <div style={styles.row3}>
              <div>
                <label style={styles.label}>Date</label>
                <input
                  style={styles.input}
                  type="date"
                  value={bodyForm.date}
                  onChange={(e) => setBodyForm({ ...bodyForm, date: e.target.value })}
                />
              </div>
              <div>
                <label style={styles.label}>Time</label>
                <input
                  style={styles.input}
                  type="time"
                  value={bodyForm.time || ""}
                  onChange={(e) => setBodyForm({ ...bodyForm, time: e.target.value })}
                />
              </div>
              <div>
                <label style={styles.label}>Weight</label>
                <input
                  style={styles.input}
                  value={bodyForm.weight}
                  onChange={(e) => setBodyForm({ ...bodyForm, weight: e.target.value })}
                  placeholder="185.0"
                />
              </div>
            </div>

            <div style={styles.actionRow}>
              <button
                type="button"
                style={styles.secondaryButton}
                onClick={() => setWeightDetailsOpen((prev) => !prev)}
              >
                {weightDetailsOpen ? "Hide optional metrics" : "Add optional metrics"}
              </button>
            </div>

            {weightDetailsOpen ? (
              <div style={styles.row3}>
                <div>
                  <label style={styles.label}>Body fat %</label>
                  <input
                    style={styles.input}
                    value={bodyForm.bodyFatPercent}
                    onChange={(e) => setBodyForm({ ...bodyForm, bodyFatPercent: e.target.value })}
                  />
                </div>
                <div>
                  <label style={styles.label}>Skeletal muscle mass</label>
                  <input
                    style={styles.input}
                    value={bodyForm.skeletalMuscleMass}
                    onChange={(e) => setBodyForm({ ...bodyForm, skeletalMuscleMass: e.target.value })}
                  />
                </div>
                <div>
                  <label style={styles.label}>Visceral fat level</label>
                  <input
                    style={styles.input}
                    value={bodyForm.visceralFatLevel}
                    onChange={(e) => setBodyForm({ ...bodyForm, visceralFatLevel: e.target.value })}
                    placeholder="10"
                  />
                </div>
              </div>
            ) : null}

            {editing.table === "body_metrics" ? (
              <div style={styles.actionRow}>
                <button
                  style={styles.primaryButton}
                  onClick={async () => {
                    const { visceralFatLevel, ...bodyPayload } = bodyForm;
                    const ok = await updateRow("body_metrics", editing.id, { ...bodyPayload, time: bodyForm.time ? normalizeTimeString(bodyForm.time) : "" }, setBodyMetrics, bodyMetrics);
                    if (!ok) return;
                    saveBodyMetricExtra(editing.id, { visceralFatLevel });
                    resetBodyLogForm();
                    setActiveAction(null);
                  }}
                >
                  Update body metrics
                </button>
                <button style={styles.secondaryButton} onClick={cancelEdit}>Cancel</button>
              </div>
            ) : (
              <button
                style={styles.primaryButton}
                onClick={async () => {
                  const nextId = makeId();
                  const { visceralFatLevel, ...bodyPayload } = bodyForm;
                  const ok = await saveRow("body_metrics", { id: nextId, ...bodyPayload, time: bodyForm.time ? normalizeTimeString(bodyForm.time) : "" }, setBodyMetrics, bodyMetrics);
                  if (!ok) return;
                  saveBodyMetricExtra(nextId, { visceralFatLevel });
                  resetBodyLogForm();
                  setActiveAction(null);
                }}
              >
                Save body metrics
              </button>
            )}
          </div>
        </ActionModal>

        <ActionModal
          themeMode={themeMode}
          open={activeAction === "protocol"}
          title={editing.table === "injections" ? "Edit Protocol Entry" : "Log Protocol"}
          onClose={() => setActiveAction(null)}
        >
          <div style={styles.formGrid}>
            <div style={styles.contextSummary}>
              <div style={styles.smallText}>{protocolGuidance.headline}</div>
              <div style={styles.smallText}>
                {schedulePreview[0]
                  ? `Next checkpoint: ${fmtDate(schedulePreview[0].nextDate)} • ${formatDisplayTime(schedulePreview[0].nextTime || schedulePreview[0].time)}`
                  : "Fast log only — the schedule card stays as the main focus on the injections tab."}
              </div>
              <div style={styles.smallText}>{protocolKnowledge.phaseFit}</div>
            </div>

            <div style={styles.row3}>
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
                <label style={styles.label}>Time</label>
                <input
                  style={styles.input}
                  type="time"
                  value={injForm.time || ""}
                  onChange={(e) => setInjForm({ ...injForm, time: e.target.value })}
                />
              </div>
              <div>
                <label style={styles.label}>Protocol item</label>
                <select
                  style={styles.input}
                  value={injForm.peptide}
                  onChange={(e) => setInjForm({ ...injForm, peptide: e.target.value })}
                >
                  {PEPTIDE_OPTIONS.map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={styles.row2}>
              <div>
                <label style={styles.label}>Amount</label>
                <input
                  style={styles.input}
                  value={injForm.dosage}
                  onChange={(e) => setInjForm({ ...injForm, dosage: e.target.value })}
                />
              </div>
              <div>
                <label style={styles.label}>Unit</label>
                <input
                  style={styles.input}
                  value={injForm.unit}
                  onChange={(e) => setInjForm({ ...injForm, unit: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label style={styles.label}>Notes</label>
              <textarea
                style={styles.textarea}
                value={injForm.notes}
                onChange={(e) => setInjForm({ ...injForm, notes: e.target.value })}
                placeholder="Optional timing, symptom, or feel notes"
              />
            </div>

            {editing.table === "injections" ? (
              <div style={styles.actionRow}>
                <button
                  style={styles.primaryButton}
                  onClick={async () => {
                    const ok = await updateRow("injections", editing.id, { ...injForm, time: injForm.time ? normalizeTimeString(injForm.time) : "" }, setInjections, injections);
                    if (!ok) return;
                    resetProtocolLogForm();
                    setActiveAction(null);
                  }}
                >
                  Update protocol entry
                </button>
                <button style={styles.secondaryButton} onClick={cancelEdit}>Cancel</button>
              </div>
            ) : (
              <button
                style={styles.primaryButton}
                onClick={async () => {
                  const ok = await saveRow("injections", { id: makeId(), ...injForm, time: injForm.time ? normalizeTimeString(injForm.time) : "" }, setInjections, injections);
                  if (!ok) return;
                  resetProtocolLogForm();
                  setActiveAction(null);
                }}
              >
                Save protocol entry
              </button>
            )}
          </div>
        </ActionModal>

        <ActionModal
          themeMode={themeMode}
          open={activeAction === "food"}
          title={editing.table === "calorie_entries" ? "Edit Food" : editing.table === "custom_foods" ? "Edit Custom Food" : "Log Food"}
          onClose={() => {
            cancelEdit();
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

            <CollapsibleSection
              title="Fast logging"
              open={foodFastLogOpen}
              onToggle={() => setFoodFastLogOpen((prev) => !prev)}
              right={`${savedMeals.length} saved`}
            >
              <div style={{ display: "grid", gap: 8 }}>
              <div style={{ ...styles.smallText, fontSize: 12 }}>Repeat yesterday or tap a saved preset.</div>
              <div style={{ ...styles.actionRowSmall, marginTop: 0 }}>
                <button
                  type="button"
                  style={styles.secondaryButton}
                  onClick={async () => {
                    const ok = await repeatPreviousDayFood(foodForm.date || todayInput());
                    if (!ok) return;
                    setActiveAction(null);
                    resetFoodLogForm();
                  }}
                >
                  Repeat previous day
                </button>
              </div>

              {savedMeals.length ? (
                <div style={{ marginTop: 4, display: "grid", gap: 6 }}>
                  <div style={styles.savedMealChipWrap}>
                    {savedMeals.slice(0, 2).map((meal) => (
                      <div key={meal.id} style={styles.savedMealChipCard}>
                        <button
                          type="button"
                          style={styles.savedMealChipButton}
                          onClick={async () => {
                            const ok = await logSavedMealToDate(meal, foodForm.date || todayInput());
                            if (!ok) return;
                            setActiveAction(null);
                            resetFoodLogForm();
                          }}
                          title={`${meal.calories} cal • P ${meal.protein} • C ${meal.carbs} • F ${meal.fats}`}
                        >
                          <span style={styles.savedMealChipName}>{meal.name}</span>
                          <span style={styles.savedMealChipMeta}>{meal.calories} cal</span>
                        </button>
                        <button type="button" style={styles.savedMealChipRemove} onClick={() => removeMealPreset(meal.id)} aria-label={`Remove ${meal.name}`}>✕</button>
                      </div>
                    ))}
                  </div>
                  {savedMeals.length > 3 ? (
                    <div style={{ ...styles.smallText, fontSize: 12 }}>Open Quick Add below to manage more saved presets.</div>
                  ) : null}
                </div>
              ) : (
                <div style={{ ...styles.smallText, marginTop: 4, fontSize: 12 }}>
                  No saved meals yet. Use Quick Add below to create one-tap presets.
                </div>
              )}
              </div>
            </CollapsibleSection>

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

              {recentFoodNames.length > 0 ? (
                <div style={{ marginBottom: 10 }}>
                  <div style={styles.label}>Recent Foods</div>
                  <div style={styles.recentFoodWrap}>
                    {recentFoodNames.slice(0, 6).map((name) => (
                      <button
                        key={name}
                        type="button"
                        style={styles.recentFoodBtn}
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
            </div>

            <div>
              <label style={styles.label}>Servings</label>
              <input
                style={styles.inputTouchFriendly}
                value={foodForm.servings}
                inputMode="decimal"
                enterKeyHint="done"
                onKeyDown={(e) => {
                  if (e.key === "Enter") e.currentTarget.blur();
                }}
                onChange={(e) => setFoodForm({ ...foodForm, servings: e.target.value })}
              />
              <div style={{ ...styles.actionRowSmall, marginTop: 10 }}>
                <button
                  type="button"
                  style={styles.secondaryButton}
                  onClick={() => {
                    const preset = buildFoodSelectionPreset();
                    if (!preset) {
                      setStatus("Choose a food and servings first.");
                      return;
                    }
                    saveMealPreset(preset);
                    setStatus(`${preset.name} saved.`);
                  }}
                >
                  Save selected food preset
                </button>
              </div>
              <div style={{ ...styles.smallText, marginTop: 8 }}>
                Saves the exact food + serving size you picked for one-tap logging later.
              </div>
            </div>

            <CollapsibleSection
              title={editing.table === "custom_foods" ? "Edit Custom Food" : "Quick Add / Custom Food"}
              open={quickMacroOpen || editing.table === "custom_foods"}
              onToggle={() => {
                if (editing.table === "custom_foods") {
                  setQuickMacroOpen(true);
                  return;
                }
                setQuickMacroOpen((prev) => !prev);
              }}
              right={editing.table === "custom_foods" ? "Editing" : "Fastest"}
            >
              <div style={styles.formGrid}>
                <div>
                  <label style={styles.label}>Name</label>
                  <input
                    style={styles.input}
                    value={quickMacroForm.name}
                    onChange={(e) => setQuickMacroForm({ ...quickMacroForm, name: e.target.value })}
                    placeholder="Chicken & rice"
                  />
                </div>
                <div>
                  <label style={styles.label}>Calories</label>
                  <input
                    style={styles.input}
                    value={quickMacroForm.calories}
                    onChange={(e) => setQuickMacroForm({ ...quickMacroForm, calories: e.target.value })}
                    inputMode="numeric"
                  />
                </div>
                <div style={styles.row4}>
                  <div>
                    <label style={styles.label}>Protein</label>
                    <input style={styles.input} value={quickMacroForm.protein} onChange={(e) => setQuickMacroForm({ ...quickMacroForm, protein: e.target.value })} inputMode="decimal" />
                  </div>
                  <div>
                    <label style={styles.label}>Carbs</label>
                    <input style={styles.input} value={quickMacroForm.carbs} onChange={(e) => setQuickMacroForm({ ...quickMacroForm, carbs: e.target.value })} inputMode="decimal" />
                  </div>
                  <div>
                    <label style={styles.label}>Fats</label>
                    <input style={styles.input} value={quickMacroForm.fats} onChange={(e) => setQuickMacroForm({ ...quickMacroForm, fats: e.target.value })} inputMode="decimal" />
                  </div>
                  <div>
                    <label style={styles.label}>Fiber</label>
                    <input style={styles.input} value={quickMacroForm.fiber} onChange={(e) => setQuickMacroForm({ ...quickMacroForm, fiber: e.target.value })} inputMode="decimal" />
                  </div>
                </div>

                <div style={styles.smallText}>
                  Use this when you already know the macros. Logging it once also saves it into your searchable food library for faster repeats.
                </div>

                {customFoodNotice ? <div style={styles.savedToastInline}>{customFoodNotice}</div> : null}

                {editing.table === "custom_foods" ? (
                  <div style={styles.actionRow}>
                    <button
                      type="button"
                      style={styles.primaryButton}
                      onClick={async () => {
                        const ok = await saveQuickMacroToFoodLibrary();
                        if (!ok) return;
                      }}
                    >
                      Update custom food
                    </button>
                    <button style={styles.secondaryButton} onClick={cancelEdit}>
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div style={styles.actionRow}>
                    <button
                      type="button"
                      style={styles.primaryButton}
                      onClick={async () => {
                        const ok = await saveQuickMacroEntry();
                        if (!ok) return;
                        setActiveAction(null);
                        resetFoodLogForm();
                      }}
                    >
                      Log quick macros
                    </button>
                  </div>
                )}
              </div>
            </CollapsibleSection>

            {editing.table === "calorie_entries" ? (
              <div style={styles.actionRow}>
                <button
                  style={styles.primaryButton}
                  onClick={async () => {
                    const food = allFoods.find((f) => f.name === foodForm.name);
                    if (!food) return;
                    pushRecentFood(food.name);
                    const servings = Number(foodForm.servings || 1);

                    const ok = await updateRow(
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
                    if (!ok) return;
                    resetFoodLogForm();
                    setActiveAction(null);
                  }}
                >
                  Update food
                </button>
                <button style={styles.secondaryButton} onClick={cancelEdit}>
                  Cancel
                </button>
              </div>
            ) : editing.table !== "custom_foods" ? (
              <button
                style={styles.primaryButton}
                onClick={async () => {
                  const food = allFoods.find((f) => f.name === foodForm.name);
                  if (!food) return;
                  pushRecentFood(food.name);
                  const servings = Number(foodForm.servings || 1);

                  const ok = await saveRow(
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
                  if (!ok) return;
                  resetFoodLogForm();
                  setActiveAction(null);
                }}
              >
                Log selected food
              </button>
            ) : null}
          </div>
        </ActionModal>

        <ActionModal
          themeMode={themeMode}
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

            <CollapsibleSection
              title="Notes"
              open={workoutNotesOpen}
              onToggle={() => setWorkoutNotesOpen((prev) => !prev)}
              right={workoutForm.notes ? "Saved" : "Optional"}
            >
              <textarea
                style={{ ...styles.textarea, minHeight: 180 }}
                value={workoutForm.notes}
                onChange={(e) =>
                  setWorkoutForm({ ...workoutForm, notes: e.target.value })
                }
              />
            </CollapsibleSection>

            {workoutForm.groups.length > 0 ? (
              <div style={styles.workoutLibraryGrid}>
                {workoutForm.groups.map((group) => {
                  const variants = getWorkoutVariants(group, activePhase?.type || phaseForm.type || "Maintenance");
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

            <div style={styles.actionRow}>
              <button type="button" style={styles.secondaryButton} onClick={insertWorkoutLibrary}>
                Insert selected workout library
              </button>
              <button type="button" style={styles.secondaryButton} onClick={clearWorkoutRegimen}>
                Clear regimen text
              </button>
            </div>
            <div style={styles.smallText}>Keeps your selected muscle groups, clears the pasted regimen notes fast.</div>

            {editing.table === "workouts" ? (
              <div style={styles.actionRow}>
                <button
                  style={styles.primaryButton}
                  onClick={async () => {
                    const ok = await updateRow(
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
                    if (!ok) return;
                    await syncPlannerAfterWorkoutOverride({ id: editing.id, date: workoutForm.date, groups: workoutForm.groups, notes: workoutForm.notes });
                    resetWorkoutLogForm();
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
                onClick={async () => {
                  const workoutId = makeId();
                  const ok = await saveRow(
                    "workouts",
                    {
                      id: workoutId,
                      date: workoutForm.date,
                      groups: workoutForm.groups,
                      notes: workoutForm.notes
                    },
                    setWorkouts,
                    workouts
                  );
                  if (!ok) return;
                  await syncPlannerAfterWorkoutOverride({ id: workoutId, date: workoutForm.date, groups: workoutForm.groups, notes: workoutForm.notes });
                  resetWorkoutLogForm();
                  setActiveAction(null);
                }}
              >
                Save workout
              </button>
            )}
          </div>
        </ActionModal>

        <ActionModal
          themeMode={themeMode}
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
              <label style={styles.label}>Quick-select minutes</label>
              <select
                style={styles.input}
                value={String(cardioForm.minutes || lastUsedCardioMinutes || commonCardioMinuteOptions[0] || "custom")}
                onChange={(e) => {
                  const nextValue = e.target.value;
                  if (nextValue === "custom") return;
                  setCardioForm({ ...cardioForm, minutes: nextValue });
                }}
              >
                {!commonCardioMinuteOptions.includes(String(cardioForm.minutes || lastUsedCardioMinutes || "")) && String(cardioForm.minutes || lastUsedCardioMinutes || "") ? (<option value={String(cardioForm.minutes || lastUsedCardioMinutes)}>{String(cardioForm.minutes || lastUsedCardioMinutes)} min</option>) : null}
                {commonCardioMinuteOptions.map((minutes) => (
                  <option key={minutes} value={minutes}>{minutes} min</option>
                ))}
                <option value="custom">Custom</option>
              </select>
            </div>

            <div>
              <label style={styles.label}>Manual override</label>
              <input
                style={styles.input}
                value={cardioForm.minutes}
                onChange={(e) =>
                  setCardioForm({ ...cardioForm, minutes: e.target.value })
                }
                placeholder="35"
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
                  onClick={async () => {
                    const ok = await updateRow(
                      "cardio_entries",
                      editing.id,
                      { ...cardioForm },
                      setCardio,
                      cardio
                    );
                    if (!ok) return;
                    resetCardioLogForm();
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
                onClick={async () => {
                  const ok = await saveRow(
                    "cardio_entries",
                    { id: makeId(), ...cardioForm },
                    setCardio,
                    cardio
                  );
                  if (!ok) return;
                  resetCardioLogForm();
                  setActiveAction(null);
                }}
              >
                Save cardio
              </button>
            )}
          </div>
        </ActionModal>

        <ActionModal
          themeMode={themeMode}
          open={activeAction === "photo"}
          title={editing.table === "progress_photos" ? "Edit Photo" : "Upload Photo"}
          onClose={() => {
            setActiveAction(null);
            cancelEdit();
            setPhotoForm({
              date: todayInput(),
              time: timeInput(),
              pose: PHOTO_POSES[0],
              notes: "",
              imageUrl: "",
              previewUrl: "",
              uploading: false
            });
          }}
        >
          <div style={styles.formGrid}>
            <div style={styles.row2}>
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
                <label style={styles.label}>Time</label>
                <input
                  style={styles.input}
                  type="time"
                  value={photoForm.time || ""}
                  onChange={(e) => setPhotoForm({ ...photoForm, time: e.target.value })}
                />
              </div>
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

            {editing.table === "progress_photos" ? (
              <div style={styles.actionRow}>
                <button
                  style={styles.primaryButton}
                  disabled={!photoForm.imageUrl || photoForm.uploading}
                  onClick={async () => {
                    const ok = await updateRow(
                      "progress_photos",
                      editing.id,
                      {
                        date: photoForm.date,
                        time: photoForm.time ? normalizeTimeString(photoForm.time) : "",
                        pose: photoForm.pose,
                        imageUrl: photoForm.imageUrl,
                        notes: photoForm.notes
                      },
                      setProgressPhotos,
                      progressPhotos
                    );
                    if (!ok) return;
                    setPhotoForm({
                      date: todayInput(),
                      time: timeInput(),
                      pose: PHOTO_POSES[0],
                      notes: "",
                      imageUrl: "",
                      previewUrl: "",
                      uploading: false
                    });
                    setActiveAction(null);
                  }}
                >
                  {photoForm.uploading ? "Uploading..." : "Update photo"}
                </button>
                <button type="button" style={styles.secondaryButton} onClick={cancelEdit}>
                  Cancel
                </button>
              </div>
            ) : (
              <button
                style={styles.primaryButton}
                disabled={!photoForm.imageUrl || photoForm.uploading}
                onClick={async () => {
                  const ok = await saveRow(
                    "progress_photos",
                    {
                      id: makeId(),
                      date: photoForm.date,
                      time: photoForm.time ? normalizeTimeString(photoForm.time) : "",
                      pose: photoForm.pose,
                      imageUrl: photoForm.imageUrl,
                      notes: photoForm.notes
                    },
                    setProgressPhotos,
                    progressPhotos
                  );
                  if (!ok) return;
                  setPhotoForm({
                    date: todayInput(),
                    time: timeInput(),
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
            )}
          </div>
        </ActionModal>

        {photoViewer ? (
          <div style={styles.modalOverlay} onClick={() => setPhotoViewer(null)}>
            <div style={styles.photoViewerCard} onClick={(e) => e.stopPropagation()}>
              <div style={styles.sectionHeaderRow}>
                <div>
                  <h3 style={{ ...styles.cardTitle, margin: 0 }}>{photoViewer.pose || "Progress photo"}</h3>
                  <div style={styles.smallText}>{photoViewer.date ? fmtDate(photoViewer.date) : ""}</div>
                </div>
                <button type="button" style={styles.secondaryButton} onClick={() => setPhotoViewer(null)}>
                  Close
                </button>
              </div>
              <div style={styles.smallText}>Pinch or browser zoom works best once the image is opened full size.</div>
              <div style={styles.photoViewerScroll}>
                <img src={photoViewer.imageUrl} alt={photoViewer.pose || "progress"} style={styles.photoViewerImage} />
              </div>
              {photoViewer.notes ? <div style={styles.photoMetaText}>{photoViewer.notes}</div> : null}
              {photoViewer.weightLabel ? <div style={styles.photoMetaText}>{photoViewer.weightLabel}</div> : null}
              {photoViewer.phaseLabel ? <div style={styles.photoMetaText}>{photoViewer.phaseLabel}</div> : null}
              {photoViewer.phaseDayLabel ? <div style={styles.photoMetaTextMuted}>{photoViewer.phaseDayLabel}</div> : null}
            </div>
          </div>
        ) : null}
        {status ? <div style={styles.statusBar}>{status}</div> : null}
        <AdviceModal themeMode={themeMode} advice={activeLabAdvice} onClose={() => setActiveLabAdvice(null)} />
      </div>
    </div>
  );
}

// ─── Peptide Calculator ────────────────────────────────────────────────
const PEPTIDE_LIST = [
  {
    name: "Retatrutide", aliases: "GLP-1/GIP/Glucagon Triple Agonist", category: "Triple Agonist",
    unit: "mg", vials: [2, 5, 10],
    doses: [{ v: 0.5, label: "0.5 mg (start)" }, { v: 1, label: "1 mg" }, { v: 2, label: "2 mg" }, { v: 4, label: "4 mg" }, { v: 8, label: "8 mg (max)" }],
    freq: "Once weekly",
    notes: "Triple agonist (GLP-1, GIP, Glucagon). Start at 0.5 mg/week, titrate every 4 weeks. Currently in Phase 3 trials.",
    research: ["Phase 3 TRIUMPH trials evaluating 24-week weight loss outcomes", "Research into cardiovascular risk reduction in obesity populations", "Studied for type 2 diabetes management alongside weight loss", "Investigating effects on non-alcoholic fatty liver disease (NAFLD)"],
    effects: ["Potent weight loss (up to 24% body weight in trials)", "Reduces fasting glucose and HbA1c", "Improves lipid panel — lower LDL, triglycerides", "Decreases appetite via GLP-1 and GIP pathways", "Glucagon component increases metabolic rate and lipolysis"],
    sideEffects: ["Nausea, vomiting, diarrhea (especially during titration)", "Reduced appetite / early satiety", "Fatigue during initial weeks", "Potential pancreatitis risk (monitor amylase/lipase)", "Injection site reactions", "Rare: gallbladder issues"],
    sources: ["Jastreboff et al. NEJM 2023 (TRIUMPH-1)", "Coskun et al. Cell Metab 2022 (preclinical mechanistic data)", "ClinicalTrials.gov NCT04881760"],
    labMarkers: ["HbA1c", "Fasting Glucose", "Lipid Panel (LDL, TG, HDL)", "Amylase & Lipase", "Liver enzymes (ALT, AST)", "Thyroid (TSH)"],
    foodTips: ["Prioritize protein (1g/lb bodyweight) to preserve muscle during weight loss", "Avoid high-fat meals immediately post-injection — increases GI side effects", "Small, frequent meals reduce nausea during titration", "Stay well hydrated — GI effects increase dehydration risk", "Limit alcohol — potentiates hypoglycemic risk and GI irritation"]
  },
  {
    name: "Semaglutide", aliases: "Wegovy / Ozempic", category: "GLP-1 Agonist",
    unit: "mg", vials: [2, 3, 5, 10],
    doses: [{ v: 0.25, label: "0.25 mg (start)" }, { v: 0.5, label: "0.5 mg" }, { v: 1, label: "1 mg" }, { v: 1.7, label: "1.7 mg" }, { v: 2.4, label: "2.4 mg (max)" }],
    freq: "Once weekly",
    notes: "Start at 0.25 mg/week, titrate up every 4 weeks as tolerated.",
    research: ["STEP 1–4 trials: 68-week weight management outcomes", "SELECT trial: 20% cardiovascular event reduction in non-diabetics", "SUSTAIN trials: type 2 diabetes glycemic control", "Research into kidney protection and NASH treatment"],
    effects: ["~15% average body weight reduction at 2.4 mg", "Significant HbA1c reduction in T2D patients", "Reduced cardiovascular events in high-risk populations", "Improved blood pressure and lipid profiles", "Appetite suppression via hypothalamic GLP-1 receptor activation"],
    sideEffects: ["Nausea and vomiting (most common, especially early)", "Constipation or diarrhea", "Headache", "Fatigue", "Rare: pancreatitis, gallbladder disease", "Possible thyroid C-cell tumors (animal data — avoid with MEN2 history)"],
    sources: ["Wilding et al. NEJM 2021 (STEP 1)", "Lincoff et al. NEJM 2023 (SELECT trial)", "Marso et al. NEJM 2016 (SUSTAIN-6)"],
    labMarkers: ["HbA1c", "Fasting Glucose", "Lipid Panel", "Amylase & Lipase", "Thyroid (TSH)", "Kidney function (eGFR, creatinine)"],
    foodTips: ["High protein intake critical to prevent muscle loss", "Eat slowly and stop at first sign of fullness", "Avoid greasy / fried foods post-injection day", "Consider protein shakes if solid food intake is too low", "Fiber-rich foods help manage constipation side effects"]
  },
  {
    name: "Tirzepatide", aliases: "Zepbound / Mounjaro", category: "Dual GIP/GLP-1",
    unit: "mg", vials: [5, 10, 15],
    doses: [{ v: 2.5, label: "2.5 mg (start)" }, { v: 5, label: "5 mg" }, { v: 7.5, label: "7.5 mg" }, { v: 10, label: "10 mg" }, { v: 12.5, label: "12.5 mg" }, { v: 15, label: "15 mg (max)" }],
    freq: "Once weekly",
    notes: "Start at 2.5 mg/week. Titrate by 2.5 mg every 4 weeks.",
    research: ["SURMOUNT 1–4 trials: obesity and weight management", "SURPASS trials: type 2 diabetes glucose control vs. insulin and semaglutide", "Ongoing cardiovascular outcomes trial (SURPASS-CVOT)", "SYNERGY-NASH trial for non-alcoholic steatohepatitis"],
    effects: ["Up to 22.5% average body weight loss at 15 mg (SURMOUNT-1)", "Superior HbA1c reduction vs semaglutide in head-to-head trial", "GIP receptor activity improves insulin sensitivity independently", "Preserves more lean mass than GLP-1-only agents in some analyses", "Improves triglycerides, LDL, and blood pressure"],
    sideEffects: ["Nausea, diarrhea, vomiting, constipation", "Decreased appetite (significant)", "Injection site reactions", "Fatigue and dizziness", "Rare: acute gallbladder disease, pancreatitis", "Possible thyroid concerns (same class warning as GLP-1s)"],
    sources: ["Jastreboff et al. NEJM 2022 (SURMOUNT-1)", "Frias et al. NEJM 2021 (SURPASS-2)", "Dahl et al. Lancet 2022 (SURMOUNT-2)"],
    labMarkers: ["HbA1c", "Fasting Glucose", "Lipid Panel", "Amylase & Lipase", "Liver enzymes", "Thyroid (TSH)"],
    foodTips: ["Extremely high protein priority (muscle loss risk is real at higher doses)", "Take nausea seriously — eat small frequent meals", "Avoid trigger foods post-injection: fatty, spicy, or heavy meals", "Electrolyte supplementation helpful if nausea limits intake", "Focus on nutrient density over caloric density"]
  },
  {
    name: "Liraglutide", aliases: "Saxenda", category: "GLP-1 Agonist",
    unit: "mg", vials: [6, 18],
    doses: [{ v: 0.6, label: "0.6 mg (wk 1)" }, { v: 1.2, label: "1.2 mg" }, { v: 1.8, label: "1.8 mg" }, { v: 2.4, label: "2.4 mg" }, { v: 3, label: "3 mg (maint.)" }],
    freq: "Once daily",
    notes: "Titrate weekly. Maintenance dose is 3 mg/day.",
    research: ["SCALE trials: chronic weight management in obesity", "LEADER trial: cardiovascular outcomes in T2D", "Research in PCOS and polycystic ovary syndrome weight management", "Pediatric obesity trials (Saxenda approved ages 12+)"],
    effects: ["~8% average weight loss vs placebo", "13% reduction in cardiovascular events (LEADER trial)", "Reduces blood pressure and improves lipid profiles", "Improves glycemic control in pre-diabetes and T2D", "Daily dosing allows flexible titration control"],
    sideEffects: ["Nausea (very common at initiation)", "Vomiting, diarrhea, constipation", "Headache and dizziness", "Injection site reactions", "Increased heart rate (+2–3 bpm)", "Rare: pancreatitis, gallstones"],
    sources: ["Pi-Sunyer et al. NEJM 2015 (SCALE Obesity)", "Marso et al. NEJM 2016 (LEADER)", "FDA Prescribing Information, Saxenda 2022"],
    labMarkers: ["HbA1c", "Fasting Glucose", "Amylase & Lipase", "Resting Heart Rate", "Thyroid (TSH)", "Liver enzymes"],
    foodTips: ["Daily injection — time it to minimize nausea (evening dosing often better tolerated)", "Small high-protein meals throughout the day", "Avoid skipping meals — increases dizziness risk", "Heart rate monitoring advised — limit high-intensity cardio if HR is elevated"]
  },
  {
    name: "CJC-1295", aliases: "w/ or w/o DAC", category: "GHRH Analog",
    unit: "mcg", vials: [2000, 5000],
    doses: [{ v: 100, label: "100 mcg" }, { v: 200, label: "200 mcg" }, { v: 300, label: "300 mcg" }, { v: 500, label: "500 mcg (DAC)" }],
    freq: "2–3x daily / Weekly (DAC)",
    notes: "Often stacked with Ipamorelin. Inject on empty stomach before sleep.",
    research: ["Human clinical trials showing dose-dependent GH pulse amplification", "Research into muscle mass and fat mass changes in healthy adults", "Studies on GH secretagogue combinations for anti-aging applications", "DAC form studies showing sustained IGF-1 elevation over 7–14 days"],
    effects: ["Amplifies natural GH pulsatility — does not create flat GH elevation", "Increases IGF-1 levels proportionally to GH release", "Supports fat loss via lipolysis when combined with caloric deficit", "Promotes muscle protein synthesis and recovery", "Better sleep quality reported by users (GH is sleep-linked)"],
    sideEffects: ["Water retention, especially in early use", "Tingling/numbness (paresthesia) — common and transient", "Fatigue or lethargy if overdosed", "Potential desensitization with DAC form if used too frequently", "Elevated fasting glucose over prolonged high-dose use"],
    sources: ["Teichman et al. JCEM 2006 (CJC-1295 with DAC)", "Ionescu & Frohman JCEM 2006", "Prakash & Bhambhani, Curr Opin Endocrinol 2011"],
    labMarkers: ["IGF-1", "Fasting Glucose", "HbA1c", "GH (AM fasting)", "Cortisol (if used long-term)"],
    foodTips: ["Inject on an empty stomach — food blunts GH release (especially carbs and fat)", "Avoid carbohydrates 2 hours before and 1 hour after injection", "Casein protein or cottage cheese before bed supports overnight GH window", "Stay hydrated — mild water retention is normal but manageable"]
  },
  {
    name: "Ipamorelin", category: "GH Secretagogue",
    unit: "mcg", vials: [2000, 5000],
    doses: [{ v: 100, label: "100 mcg" }, { v: 200, label: "200 mcg" }, { v: 300, label: "300 mcg" }],
    freq: "2–3x daily",
    notes: "Selective GH secretagogue. Stack with CJC-1295 for synergy.",
    research: ["Studies on selective GH release without cortisol/prolactin elevation", "Research into postoperative recovery and GI motility improvement", "Combination studies with GHRH analogs for GH pulse enhancement", "Animal research on bone density and body composition"],
    effects: ["Selective GH release with minimal impact on cortisol or prolactin", "Synergistic GH release when stacked with CJC-1295", "Promotes fat lipolysis and lean mass preservation", "May improve skin quality and joint health over time", "Supports sleep quality via nighttime GH pulses"],
    sideEffects: ["Mild water retention", "Tingling in hands/feet (paresthesia)", "Headache at higher doses", "Increased hunger (GH stimulation effect)", "Very rarely: cortisol spike if misdosed with other secretagogues"],
    sources: ["Raun et al. Eur J Endocrinol 1998 (Ipamorelin original)", "Gobburu et al. J Pharmacol Exp Ther 1999", "Prakash & Bhambhani review 2011"],
    labMarkers: ["IGF-1", "Fasting Glucose", "Cortisol (to confirm selectivity)", "GH (pulse testing)"],
    foodTips: ["Inject fasted or 2+ hours from last meal for best GH response", "Avoid insulin-spiking foods before injection", "Night dose (30 min before bed) is most effective — skip late-night carbs"]
  },
  {
    name: "Tesamorelin", category: "GHRH Analog",
    unit: "mg", vials: [1, 2],
    doses: [{ v: 1, label: "1 mg" }, { v: 2, label: "2 mg (standard)" }],
    freq: "Once daily",
    notes: "FDA-approved for HIV-associated lipodystrophy. Targets visceral fat.",
    research: ["FDA-approved (Egrifta) for HIV-associated abdominal lipodystrophy", "Studies in general obesity and visceral fat reduction", "Research into cognitive decline prevention in older adults", "Trials in NAFLD (non-alcoholic fatty liver disease)"],
    effects: ["Significant visceral abdominal fat reduction (FDA-proven)", "IGF-1 elevation and GH pulse amplification", "Cognitive benefit signals in older adults (trials ongoing)", "Improved lipid profiles — lower triglycerides", "Body composition improvement without significant weight change"],
    sideEffects: ["Fluid retention and joint pain (arthralgia)", "Tingling/numbness — paresthesia", "Injection site redness or irritation", "Elevated fasting glucose possible with long-term use", "Rare: hypersensitivity reactions"],
    sources: ["Falutz et al. NEJM 2007 (GLOW trial)", "Flippo et al. JCEM 2020 (cognitive trial)", "FDA NDA 022505 approval documents"],
    labMarkers: ["IGF-1", "Fasting Glucose", "Lipid Panel (especially TG)", "Waist circumference (tracking)", "Liver enzymes"],
    foodTips: ["Daily injection on empty stomach for maximal GH response", "Avoid carbohydrates 1 hour post-injection", "Mediterranean-style eating complements visceral fat reduction effects", "Monitor overall caloric intake — it does not suppress appetite"]
  },
  {
    name: "AOD-9604", aliases: "Anti-Obesity Drug", category: "HGH Fragment",
    unit: "mcg", vials: [5000],
    doses: [{ v: 250, label: "250 mcg" }, { v: 500, label: "500 mcg" }, { v: 1000, label: "1000 mcg" }],
    freq: "Once daily (fasted)",
    notes: "Fragment of HGH (176-191). Inject on empty stomach for fat loss.",
    research: ["Human obesity trials: up to 17 weeks at various doses (Metabolic Pharmaceuticals)", "Research into cartilage repair and osteoarthritis treatment", "Studies confirming no IGF-1 elevation (unlike full HGH)", "Animal data on fat cell metabolism and lipolysis mechanisms"],
    effects: ["Stimulates lipolysis without affecting blood glucose or IGF-1", "Targeted fat-burning mechanism (mimics HGH fat-metabolism domain only)", "Potential cartilage repair benefits at higher doses", "No anabolic effects — does not promote muscle growth like full HGH", "Generally well-tolerated in human trials"],
    sideEffects: ["Mild injection site reactions", "Occasional headache", "Transient flushing", "No significant systemic adverse effects in human trials at recommended doses"],
    sources: ["Ng et al. J Endocrinol 2000 (AOD-9604 mechanism)", "Heffernan et al. Endocrinology 2001", "Metabolic Pharmaceuticals Phase IIb trial data (2006)"],
    labMarkers: ["Fasting Glucose (to confirm no impact)", "IGF-1 (should remain unchanged)", "Body composition tracking (DEXA if available)"],
    foodTips: ["Must inject in a fasted state — minimum 2 hours from any meal", "Best effect when followed by 30–60 min of fasted cardio", "Low-carb diet amplifies fat oxidation effects", "Protein-rich diet prevents muscle loss during the fat loss phase"]
  },
  {
    name: "Sermorelin", category: "GHRH Analog",
    unit: "mcg", vials: [3000, 6000, 9000],
    doses: [{ v: 100, label: "100 mcg" }, { v: 200, label: "200 mcg" }, { v: 300, label: "300 mcg" }, { v: 500, label: "500 mcg" }],
    freq: "Once daily (before bed)",
    notes: "Best administered 30 min before sleep on empty stomach.",
    research: ["FDA-approved (1997, Geref) for childhood GH deficiency — withdrawn from market 2008 (commercial reasons)", "Studies in adult GH decline and anti-aging applications", "Research into cardiac function improvement", "Comparison trials with HGH in deficiency treatment"],
    effects: ["Stimulates pituitary to release natural GH — preserves pituitary function", "Improves body composition over 3–6 month protocols", "Enhanced sleep quality and recovery", "Mild increase in IGF-1 — less pronounced than HGH", "Safer long-term profile vs. exogenous HGH"],
    sideEffects: ["Flushing, warmth at injection site", "Headache", "Dizziness", "Swelling/water retention", "Potential antibody formation with long-term use (clinical significance unclear)"],
    sources: ["Prakash & Bhambhani, Curr Drug Targets 2011", "Sigalos & Pastuszak, Sex Med Rev 2018", "Corpas et al. JCEM 1993"],
    labMarkers: ["IGF-1 (primary tracking marker)", "GH (morning fasting)", "Fasting Glucose", "Thyroid (TSH)"],
    foodTips: ["Inject 30–60 minutes before sleep, minimum 3 hours after last meal", "Carbohydrates before injection blunt GH release — avoid them at night", "Protein at dinner supports overnight recovery and synthesis"]
  },
  {
    name: "MK-677", aliases: "Ibutamoren (oral)", category: "Oral GH Secretagogue",
    unit: "mg", vials: [10, 25],
    doses: [{ v: 10, label: "10 mg (start)" }, { v: 25, label: "25 mg (standard)" }],
    freq: "Once daily (oral)",
    notes: "Orally active — not injectable. Increases GH and IGF-1 levels.",
    research: ["MK-677 Phase II trials for elderly muscle wasting and GH deficiency", "Studies in bone density improvement in older populations", "Obesity research: paradoxical weight gain via appetite stimulation", "Research into Alzheimer's disease sleep quality improvement"],
    effects: ["Significant, sustained IGF-1 elevation (up to 79% in trials)", "GH pulse amplification over 24 hours", "Increased muscle mass and reduced fat mass over long-term use", "Improved bone mineral density", "Enhanced deep sleep quality (GH is sleep-linked)"],
    sideEffects: ["Increased appetite (often dramatic — plan for it)", "Water retention and bloating", "Elevated fasting glucose and insulin resistance over time", "Numbness/tingling", "Fatigue at higher doses", "Potential IGF-1-driven concern if already elevated"],
    sources: ["Nass et al. JCEM 2008 (elderly GH deficiency trial)", "Murphy et al. JCEM 1998", "Copinschi et al. Sleep 1997 (sleep quality study)"],
    labMarkers: ["IGF-1 (monitor for over-elevation)", "Fasting Glucose", "HbA1c", "Fasting Insulin", "Thyroid (TSH)"],
    foodTips: ["Take with or without food — oral bioavailability is not food-dependent", "Plan for increased hunger — pre-log meals to avoid overconsumption", "Monitor carbohydrate intake — insulin resistance risk increases with long-term use", "Higher protein diet helps direct the anabolic drive toward muscle vs fat"]
  },
  {
    name: "BPC-157", aliases: "Body Protecting Compound", category: "Repair & Recovery",
    unit: "mcg", vials: [5000],
    doses: [{ v: 250, label: "250 mcg" }, { v: 500, label: "500 mcg" }, { v: 1000, label: "1000 mcg" }],
    freq: "1–2x daily",
    notes: "Inject near site of injury. Also effective systemically.",
    research: ["Extensive rodent studies on tendon, ligament, and muscle healing", "Research into GI tract healing and ulcer protection", "Studies on angiogenesis promotion for wound healing", "Investigation into neurological protection and dopamine system modulation"],
    effects: ["Accelerates tendon and ligament healing (animal models)", "Promotes gut and intestinal healing (IBS, IBD potential)", "Stimulates angiogenesis — new blood vessel formation at injury sites", "Anti-inflammatory at injury sites", "May have neuroprotective properties"],
    sideEffects: ["Nausea (rare, usually at high doses)", "Dizziness or lightheadedness", "Injection site irritation", "Theoretically: could promote angiogenesis in existing tumors — avoid with cancer history", "Most human data is anecdotal — clinical trials limited"],
    sources: ["Sikirić et al. Curr Pharm Des 2018 (comprehensive BPC-157 review)", "Chang et al. Gut 1997 (GI healing)", "Gwyer et al. Regul Pept 2019 (tendon healing)"],
    labMarkers: ["No specific required markers", "CBC and CMP baseline recommended", "If used for GI: track symptoms objectively"],
    foodTips: ["Can be injected subcutaneously near injury site or systemically", "Oral BPC-157 works for GI issues — systemic injection for musculoskeletal", "Anti-inflammatory diet (omega-3s, turmeric) may synergize with BPC-157 healing effects", "Avoid NSAIDs during BPC-157 use — may blunt healing mechanisms"]
  },
  {
    name: "TB-500", aliases: "Thymosin Beta-4", category: "Tissue Regeneration",
    unit: "mg", vials: [2, 5, 10],
    doses: [{ v: 2, label: "2 mg" }, { v: 2.5, label: "2.5 mg" }, { v: 5, label: "5 mg (loading)" }],
    freq: "2x weekly → weekly",
    notes: "Loading: 4–6 weeks at 2–5 mg. Maintenance: 2–2.5 mg/week.",
    research: ["Thymosin Beta-4 studies in cardiac repair after myocardial infarction", "Research into actin regulation and wound healing mechanisms", "Studies in hair follicle regeneration", "Corneal wound healing clinical trials"],
    effects: ["Promotes systemic tissue healing and regeneration", "Reduces acute and chronic inflammation", "Improves flexibility and reduces adhesion formation", "Cardiac protection and repair signals (animal models)", "May improve hair growth via follicle stem cell activation"],
    sideEffects: ["Fatigue during initial loading phase", "Headache", "Nausea (rare)", "Injection site reactions", "Theoretical: pro-angiogenic effect — monitor with cancer history"],
    sources: ["Goldstein et al. Ann NY Acad Sci 2012 (cardiac review)", "Sosne et al. Cornea 2010 (corneal healing)", "Huff et al. Ann NY Acad Sci 2010 (wound healing)"],
    labMarkers: ["No specific required labs", "CBC baseline recommended", "Track inflammatory markers (CRP, ESR) if using for chronic inflammation"],
    foodTips: ["Anti-inflammatory nutrition amplifies TB-500 healing effects — omega-3s, leafy greens", "Adequate vitamin C supports collagen synthesis alongside TB-500", "Protein intake must be high — tissue repair demands amino acid availability"]
  },
  {
    name: "Thymosin Alpha-1", aliases: "Tα1", category: "Immune Enhancement",
    unit: "mg", vials: [1.6, 3.2],
    doses: [{ v: 0.8, label: "0.8 mg" }, { v: 1.6, label: "1.6 mg (standard)" }],
    freq: "2x weekly",
    notes: "Immune modulator. Used in chronic infections and cancer adjunct therapy.",
    research: ["Approved in 35+ countries for Hepatitis B and C treatment", "Research in cancer immunotherapy as adjunct to conventional treatment", "COVID-19 severity reduction trials (China, 2020)", "Studies in sepsis survival improvement"],
    effects: ["Potent immune modulation — enhances T-cell maturation and function", "Antiviral properties via interferon pathway activation", "Anti-tumor immune response enhancement", "Reduces chronic inflammation without immunosuppression", "May improve vaccine response in immunocompromised individuals"],
    sideEffects: ["Generally very well tolerated", "Mild injection site reactions", "Rare: fever or flu-like symptoms (immune activation)", "Potential over-activation in autoimmune conditions — use cautiously"],
    sources: ["Goldstein et al. Int J Immunopharmacol 1981 (original discovery)", "Zhang et al. Clin Infect Dis 2020 (COVID-19 trial)", "Billich et al. Curr Opin Investig Drugs 2002"],
    labMarkers: ["CD4/CD8 T-cell ratios (if tracking immune function)", "CBC with differential", "Inflammatory markers: CRP, IL-6", "Viral load markers (if treating infection)"],
    foodTips: ["Zinc and vitamin D support T-cell function alongside Tα1", "Avoid immune-suppressing habits during use: excess alcohol, poor sleep", "Fermented foods and prebiotics support the immune axis Tα1 targets"]
  },
  {
    name: "IGF-1 LR3", aliases: "Insulin-like Growth Factor", category: "Muscle Growth",
    unit: "mcg", vials: [1000],
    doses: [{ v: 20, label: "20 mcg" }, { v: 40, label: "40 mcg" }, { v: 50, label: "50 mcg" }, { v: 100, label: "100 mcg (max)" }],
    freq: "Once daily (post-workout)",
    notes: "Max 4–6 week cycle. Inject bilaterally in trained muscles post-workout.",
    research: ["Research into muscle hypertrophy mechanisms via mTOR pathway activation", "Studies in GH deficiency replacement alongside HGH", "Cancer research — IGF-1 pathway implicated in tumor growth (dual-edge)", "Pediatric short stature treatment (Mecasermin/Increlex — FDA approved)"],
    effects: ["Potent anabolic signaling via mTOR — muscle protein synthesis", "Satellite cell activation — potential hyperplasia (new muscle cells)", "Fat oxidation via improved insulin sensitivity", "Enhanced glucose uptake into muscle post-workout", "LR3 modification: 3x longer half-life than native IGF-1"],
    sideEffects: ["Hypoglycemia — serious risk, especially post-workout (have glucose source ready)", "Acromegalic effects with long-term high-dose use", "Organ growth concerns with sustained elevation", "Possible jaw/hand tingling", "Theoretical cancer risk with sustained IGF-1 elevation"],
    sources: ["Firth & Baxter, Front Endocrinol 2002 (IGF-1 muscle review)", "Rinderknecht & Humbel, J Biol Chem 1978 (original IGF-1)", "FDA NDA 021884 Increlex (mecasermin)"],
    labMarkers: ["IGF-1 (critical — keep within high-normal range, not above)", "Fasting Glucose", "Fasting Insulin", "HbA1c", "PSA (if male over 40)"],
    foodTips: ["Always have fast-acting carbohydrate available post-injection — hypoglycemia risk is real", "Post-workout protein + carbs maximizes the anabolic window IGF-1 opens", "Avoid injecting pre-workout — hypoglycemic risk during training", "Cycle off every 4–6 weeks to prevent receptor downregulation and tolerance"]
  },
  {
    name: "PEG-MGF", aliases: "PEGylated Mechano Growth Factor", category: "Local Muscle Growth",
    unit: "mcg", vials: [2000],
    doses: [{ v: 100, label: "100 mcg" }, { v: 200, label: "200 mcg" }, { v: 300, label: "300 mcg" }],
    freq: "Once weekly",
    notes: "Inject into target muscle post-workout. PEGylation extends half-life.",
    research: ["Research into mechano-growth factor as a local muscle repair signal", "PEGylation studies extending biological half-life from minutes to days", "Animal studies on satellite cell activation and localized hypertrophy", "Comparison research: native MGF vs PEG-MGF kinetics"],
    effects: ["Local satellite cell activation at injection site", "Muscle repair and recovery acceleration", "May support localized hypertrophy in lagging muscle groups", "PEGylation allows once-weekly dosing with sustained effect", "Synergy with IGF-1 LR3 for comprehensive anabolic signaling"],
    sideEffects: ["Injection site swelling/sensitivity (local effect — usually desired)", "Rare systemic effects at proper doses", "Fatigue in injected muscle transiently", "PEG polymer accumulation concerns with very long-term use (theoretical)"],
    sources: ["Hill & Goldspink, J Physiol 2003 (MGF splice variant)", "Yang & Goldspink, FEBS Lett 2002", "Carpenter & Bhambhani, Growth Factors 2008"],
    labMarkers: ["IGF-1 (to track overall GH/IGF-1 axis)", "CBC baseline", "No specific required markers"],
    foodTips: ["Inject into target lagging muscle immediately post-workout", "High protein meal within 60 minutes post-injection to supply building blocks", "Creatine supplementation supports the satellite cell activation PEG-MGF drives"]
  },
  {
    name: "Follistatin 344", category: "Myostatin Inhibitor",
    unit: "mcg", vials: [1000],
    doses: [{ v: 50, label: "50 mcg" }, { v: 100, label: "100 mcg" }],
    freq: "Daily × 10–30 days",
    notes: "Inhibits myostatin. Cycle 10–30 days, 30-day break between cycles.",
    research: ["Animal studies: myostatin inhibition via binding produces significant hypertrophy", "Gene therapy research using follistatin for muscular dystrophy treatment", "Clinical trial (Columbus Children's Research Institute) showing safety in DMD", "Research into fertility applications — follistatin regulates FSH"],
    effects: ["Inhibits myostatin — the 'muscle growth brake' protein", "Significant animal model muscle hypertrophy (200–400% in some models)", "Reduces adipogenesis (fat cell formation)", "Promotes satellite cell proliferation", "FSH suppression — relevant consideration for female users"],
    sideEffects: ["Injection site pain and swelling (common)", "Potential symmetry issues if injected into specific muscles only", "FSH suppression — may affect fertility temporarily", "Limited long-term safety data in humans", "Theoretical: organ size increase with very long-term use"],
    sources: ["Lee & McPherron, PNAS 2001 (myostatin/follistatin mechanism)", "Mendell et al. Mol Ther 2015 (DMD gene therapy trial)", "Glister et al. Endocrinology 2004 (FSH suppression)"],
    labMarkers: ["FSH and LH (monitor, especially in females)", "Testosterone (males — confirm no suppression)", "Liver enzymes (CBC + CMP baseline)", "No specific required markers otherwise"],
    foodTips: ["Very high protein intake to supply amino acids for rapid muscle growth", "Caloric surplus amplifies hypertrophic signaling", "Progressive overload training is essential — follistatin opens the door, training drives growth"]
  },
  {
    name: "Epitalon", aliases: "Epithalamin", category: "Anti-Aging",
    unit: "mg", vials: [10, 20],
    doses: [{ v: 5, label: "5 mg" }, { v: 10, label: "10 mg (standard)" }],
    freq: "Daily × 10–20 days/cycle",
    notes: "Pineal gland peptide. Run 10–20 day cycles 1–2x per year.",
    research: ["Russian Institute of Bioregulation and Gerontology trials (1980s–2000s)", "Studies on telomere elongation via telomerase activation", "Research into melatonin normalization in elderly populations", "Animal lifespan extension studies (rodent models)"],
    effects: ["Telomerase activation — potential telomere length maintenance", "Melatonin production normalization — improves sleep in elderly", "Antioxidant gene expression upregulation", "May reduce cortisol and stress hormone elevation", "Reported: improved energy, sleep quality, and skin appearance"],
    sideEffects: ["Generally considered very safe in Russian clinical data", "Possible mild fatigue during cycle", "Rare: sleep disturbance paradoxically in some users", "Limited Western clinical trial data — most evidence from Russian institute"],
    sources: ["Khavinson et al. Ann NY Acad Sci 2002 (telomere data)", "Anisimov et al. Mech Ageing Dev 2003 (lifespan extension)", "Goncharova et al. Neuro Endocrinol Lett 2008"],
    labMarkers: ["Telomere length (specialized test, optional)", "Melatonin levels (optional)", "Cortisol", "General health panel: CBC, CMP, lipids"],
    foodTips: ["Run cycles 1–2x per year — not a continuous compound", "Antioxidant-rich diet complements Epitalon's mechanisms: berries, leafy greens, vitamin C/E", "Consistent sleep schedule supports the melatonin normalization effect"]
  },
  {
    name: "Dihexa", category: "Cognitive Enhancement",
    unit: "mg", vials: [10],
    doses: [{ v: 1, label: "1 mg" }, { v: 2, label: "2 mg" }, { v: 5, label: "5 mg" }],
    freq: "Once daily",
    notes: "Potent nootropic. Also available as transdermal. Start low.",
    research: ["Washington State University research into HGF/c-Met pathway and cognition", "Studies showing reversal of cognitive decline in aged rodent models", "Research into Alzheimer's disease treatment potential", "Comparison data: shown 7x more potent than BDNF in hippocampal synaptogenesis"],
    effects: ["Promotes new synapse formation (synaptogenesis) in hippocampus", "Significant cognitive improvement in memory and learning (animal models)", "7x more potent than BDNF in some assays", "May protect against neurodegeneration", "Reported by users: improved working memory, focus, and verbal fluency"],
    sideEffects: ["Limited human safety data — use with caution", "Potential for over-stimulation at high doses", "Headache reported by some users", "Unknown long-term effects in humans", "Start at lowest dose and titrate slowly"],
    sources: ["McCoy et al. J Clin Invest 2010 (HGF/c-Met pathway)", "Bhambhani & Bhambhani, Curr Opin Investig Drugs 2012", "Wagner et al. Neuropsychopharmacology 2013"],
    labMarkers: ["No specific required markers", "Cognitive baseline testing (optional but useful)", "Liver enzymes if used long-term"],
    foodTips: ["Lions Mane mushroom and omega-3s complement the neuroplasticity effects", "Maintain consistent blood glucose — blood sugar swings impair the cognition Dihexa aims to enhance", "Quality sleep is the most powerful synergist — don't sacrifice sleep for dose timing"]
  },
  {
    name: "Semax", category: "Nootropic / Neuroprotective",
    unit: "mg", vials: [3, 30],
    doses: [{ v: 0.5, label: "0.5 mg" }, { v: 1, label: "1 mg" }, { v: 2, label: "2 mg" }, { v: 3, label: "3 mg" }],
    freq: "1–2x daily",
    notes: "Intranasal or subcutaneous. ACTH(4-7) analog.",
    research: ["Russian clinical approval for stroke recovery and cognitive decline", "Studies on BDNF upregulation and neuroprotection", "Research into ADHD symptom improvement", "Dopamine and serotonin system modulation studies"],
    effects: ["BDNF upregulation — supports neuroplasticity and learning", "Acute cognitive enhancement: focus, memory, processing speed", "Neuroprotection post-stroke (Russian clinical evidence)", "Dopaminergic modulation — mood improvement", "Anxiolytic effects at lower doses in some users"],
    sideEffects: ["Nasal irritation (intranasal route)", "Headache", "Irritability or anxiety at higher doses", "Fatigue or mood crash post-effect", "Short half-life — effects wear off within hours"],
    sources: ["Eremin et al. Neurosci Behav Physiol 2005", "Dolotov et al. J Neurochem 2006 (BDNF upregulation)", "Kolomin et al. Mol Biol (Mosk) 2013"],
    labMarkers: ["No specific required markers", "Cortisol if using for stress management", "Thyroid (TSH) with long-term use"],
    foodTips: ["Works acutely — time dose 30–60 min before cognitive work", "Caffeine has additive focus effects but may increase anxiety at higher Semax doses", "Quality sleep and low stress amplify the neuroplasticity benefits"]
  },
  {
    name: "GHK-Cu", aliases: "Copper Peptide", category: "Skin Repair",
    unit: "mg", vials: [50, 100, 200],
    doses: [{ v: 1, label: "1 mg" }, { v: 2, label: "2 mg" }, { v: 3, label: "3 mg" }],
    freq: "Once daily",
    notes: "Also used topically. Promotes collagen, elastin, and angiogenesis.",
    research: ["Extensively studied for wound healing and skin regeneration (Pickart, L. — original discoverer)", "Research on collagen and elastin synthesis stimulation", "Studies on anti-inflammatory and antioxidant gene expression", "Hair follicle research — GHK-Cu shown to stimulate hair growth"],
    effects: ["Stimulates collagen and elastin production", "Promotes angiogenesis at wound/repair sites", "Anti-inflammatory and antioxidant gene activation (SOD, catalase)", "Improves skin firmness, thickness, and elasticity", "Potential hair follicle stimulation"],
    sideEffects: ["Systemic subcutaneous injection: mild irritation", "Topical: occasional mild skin redness", "Copper toxicity theoretically possible at extreme doses (not with standard use)", "Generally considered very safe"],
    sources: ["Pickart & Margolina, Biomolecules 2018 (comprehensive review)", "Lau et al. Int J Mol Sci 2012 (skin repair)", "Buffoni et al. Arch Int Pharmacodyn Ther 1995"],
    labMarkers: ["Serum copper (if very long-term use)", "No specific required markers for standard use"],
    foodTips: ["Vitamin C supports collagen synthesis alongside GHK-Cu", "Zinc competes with copper absorption — space zinc supplementation away from GHK-Cu use", "Protein intake directly supplies amino acids for the collagen GHK-Cu triggers"]
  },
  {
    name: "MOTS-c", category: "Metabolic Regulation",
    unit: "mg", vials: [5, 10],
    doses: [{ v: 5, label: "5 mg" }, { v: 10, label: "10 mg" }, { v: 15, label: "15 mg" }],
    freq: "2–3x weekly",
    notes: "Mitochondrial peptide. Improves insulin sensitivity and exercise performance.",
    research: ["Discovery research at USC (Lee et al. 2015) — mitochondria-derived regulatory peptide", "Studies on AMPK activation and insulin sensitization", "Research into exercise-mimetic effects and metabolic disease", "Investigation into age-related metabolic decline"],
    effects: ["Activates AMPK — the body's cellular energy sensor", "Significant insulin sensitivity improvement", "Mimics some effects of exercise at the cellular level", "Reduces fat accumulation in metabolic stress models", "Supports mitochondrial health and biogenesis"],
    sideEffects: ["Very limited human data — most evidence from rodent studies", "Injection site reactions", "Potential hypoglycemia with diabetic medications — monitor glucose", "Long-term safety profile not established"],
    sources: ["Lee et al. Cell Metab 2015 (original MOTS-c discovery)", "Reynolds et al. Nat Commun 2021", "Kim et al. Aging Cell 2022"],
    labMarkers: ["Fasting Glucose", "Fasting Insulin", "HbA1c", "Lipid Panel", "IGF-1 (if stacking with GH secretagogues)"],
    foodTips: ["Low glycemic diet synergizes with MOTS-c insulin sensitization effects", "Time injection near workout — MOTS-c exercise-mimetic effects are amplified by actual exercise", "Berberine is a natural AMPK activator with complementary mechanisms"]
  },
  {
    name: "Humanin", category: "Cytoprotective",
    unit: "mg", vials: [5, 10],
    doses: [{ v: 2, label: "2 mg" }, { v: 4, label: "4 mg" }, { v: 5, label: "5 mg" }],
    freq: "2–3x weekly",
    notes: "Mitochondria-derived peptide. Protects neurons and cells from apoptosis.",
    research: ["Discovery research: Hashimoto et al. 2001 — identified as Alzheimer's protective peptide", "Studies on insulin sensitivity and metabolic protection", "Research into reproductive protection from chemotherapy", "Investigation in cardiovascular protection models"],
    effects: ["Protects neurons and cells from apoptosis (programmed death)", "Improves insulin sensitivity via similar mechanisms to MOTS-c", "Potential cardiovascular protection", "May protect reproductive cells from chemotherapy damage", "Anti-aging properties via cellular stress resistance"],
    sideEffects: ["Very limited human data", "Injection site reactions", "Potential headache", "Interactions with other mitochondrial peptides unclear"],
    sources: ["Hashimoto et al. Nature 2001 (original Humanin discovery)", "Muzumdar et al. Aging Cell 2009 (insulin sensitization)", "Gong et al. PNAS 2014 (cardiovascular protection)"],
    labMarkers: ["Fasting Glucose", "Fasting Insulin", "Inflammatory markers (CRP, IL-6)", "CBC baseline"],
    foodTips: ["Anti-inflammatory, Mediterranean-style eating complements Humanin's cytoprotective effects", "Mitochondrial support nutrients: CoQ10, alpha-lipoic acid, magnesium", "Avoid prolonged fasting during use — cellular energy status matters for Humanin pathways"]
  },
];

const SYRINGE_OPTS = [
  { ml: 0.3, label: "0.3 mL (30u)" },
  { ml: 0.5, label: "0.5 mL (50u)" },
  { ml: 1.0, label: "1.0 mL (100u)" },
];
const BAC_OPTS = [1, 2, 3];

// ─── Protocol Intelligence Engine ───────────────────────────────────────
const PROTOCOL_INTEL = {
  glp1: {
    match: ["retatrutide","semaglutide","tirzepatide","liraglutide","ozempic","wegovy","mounjaro","zepbound"],
    labs: ["HbA1c","Fasting Glucose","Lipid Panel (LDL, TG, HDL)","Amylase & Lipase","Thyroid (TSH)"],
    foods: [
      "Prioritize protein at every meal — GLP-1 agonists reduce appetite, making muscle-sparing protein intake essential",
      "Avoid high-fat meals on injection day — dramatically worsens nausea and GI side effects",
      "Small, frequent meals reduce GI discomfort during titration phases",
      "Stay well hydrated — GI effects significantly increase dehydration risk"
    ]
  },
  gh: {
    match: ["cjc-1295","ipamorelin","sermorelin","tesamorelin","mk-677","ibutamoren","aod-9604"],
    labs: ["IGF-1","Fasting Glucose","HbA1c","Fasting Insulin"],
    foods: [
      "Inject GH secretagogues fasted — carbohydrates and fat blunt GH release significantly",
      "Avoid carbs 2 hours before and 1 hour after GH peptide injection",
      "Casein protein before bed supports the overnight GH window without blunting release",
      "Watch fasting glucose trends — GH elevation increases insulin resistance over time"
    ]
  },
  trt: {
    match: ["testosterone","trt","test enanthate","test cyp","test prop","test e","test c","sustanon","androgel","nebido"],
    labs: ["Total Testosterone","Free Testosterone","Estradiol (E2)","Hematocrit / Hemoglobin","PSA (if 40+)","LH & FSH","SHBG","Lipid Panel"],
    foods: [
      "Zinc-rich foods support testosterone metabolism: oysters, red meat, pumpkin seeds",
      "Limit alcohol — it directly suppresses testosterone and raises estradiol",
      "Healthy fats (avocado, olive oil, nuts) are precursors to steroid hormone synthesis",
      "Monitor hematocrit — stay well hydrated and limit iron supplementation unless deficient"
    ]
  },
  repair: {
    match: ["bpc-157","tb-500","thymosin beta"],
    labs: ["CBC (baseline)","CRP (inflammatory marker)","Liver enzymes (ALT, AST)"],
    foods: [
      "Anti-inflammatory diet amplifies healing peptide effects: omega-3s, turmeric, leafy greens",
      "Vitamin C is critical for collagen synthesis — pair with BPC-157 or TB-500",
      "Adequate protein supplies amino acids for the tissue repair these peptides drive",
      "Avoid NSAIDs — they may blunt the prostaglandin-mediated healing pathways"
    ]
  },
  igf: {
    match: ["igf-1","igf1","lr3","peg-mgf","mgf"],
    labs: ["IGF-1 (keep within high-normal range)","Fasting Glucose","Fasting Insulin","HbA1c","PSA (males 40+)"],
    foods: [
      "Always keep fast-acting carbohydrate on hand post-injection — hypoglycemia risk is real",
      "Post-workout protein + carbs maximizes the anabolic window IGF-1 opens",
      "Never inject IGF-1 pre-workout — hypoglycemic risk during training is dangerous",
      "Cycle nutrition with IGF-1 cycles — caloric surplus amplifies hypertrophic effects"
    ]
  }
};

function getProtocolCategory(peptideName) {
  const lower = (peptideName || '').toLowerCase();
  for (const [cat, data] of Object.entries(PROTOCOL_INTEL)) {
    if (data.match.some(k => lower.includes(k))) return cat;
  }
  return null;
}

function buildProtocolSignals(schedules = [], profile = {}) {
  const signals = [];
  if (!schedules || !schedules.length) return signals;

  const activeCompounds = schedules.map(s => s.peptide || s.name || '').filter(Boolean);
  if (!activeCompounds.length) return signals;

  const seenCats = new Set();
  const allLabs = new Set();
  const allFoods = [];

  activeCompounds.forEach(compound => {
    const cat = getProtocolCategory(compound);
    if (cat && !seenCats.has(cat)) {
      seenCats.add(cat);
      const intel = PROTOCOL_INTEL[cat];
      intel.labs.forEach(l => allLabs.add(l));
      intel.foods.forEach(f => allFoods.push(f));
    }
  });

  if (profile.onTRT && !seenCats.has('trt')) {
    seenCats.add('trt');
    PROTOCOL_INTEL.trt.labs.forEach(l => allLabs.add(l));
    PROTOCOL_INTEL.trt.foods.forEach(f => allFoods.push(f));
  }

  if (allLabs.size > 0) {
    const labList = Array.from(allLabs).slice(0, 5).join(', ');
    signals.push({
      kind: 'warning',
      priority: 82,
      icon: '🔬',
      message: `Protocol labs to monitor: ${labList}`,
      hint: `Based on your active protocol (${[...seenCats].map(c => c.toUpperCase()).join(' + ')}). Track these every 4–12 weeks.`
    });
  }

  if (allFoods.length > 0) {
    const tip = allFoods[Math.floor(Math.random() * allFoods.length)];
    signals.push({
      kind: 'guide',
      priority: 75,
      icon: '🧬',
      message: `Protocol nutrition tip: ${tip.split(' — ')[0]}`,
      hint: tip.includes(' — ') ? tip.split(' — ')[1] : tip
    });
  }

  return signals;
}

function ProtocolIntelligenceCard({ schedules = [], profile = {}, onNavigate }) {
  const [expanded, setExpanded] = React.useState(false);

  const activeCompounds = (schedules || []).map(s => s.peptide || s.name || '').filter(Boolean);
  const hasTRT = profile && profile.onTRT;

  if (!activeCompounds.length && !hasTRT) return null;

  const seenCats = new Set();
  const allLabs = [];
  const allFoods = [];
  const compoundCategories = {};

  activeCompounds.forEach(compound => {
    const cat = getProtocolCategory(compound);
    if (cat && !seenCats.has(cat)) {
      seenCats.add(cat);
      const intel = PROTOCOL_INTEL[cat];
      intel.labs.forEach(l => { if (!allLabs.includes(l)) allLabs.push(l); });
      intel.foods.forEach(f => allFoods.push(f));
    }
    if (cat) compoundCategories[compound] = cat;
  });

  if (hasTRT && !seenCats.has('trt')) {
    seenCats.add('trt');
    PROTOCOL_INTEL.trt.labs.forEach(l => { if (!allLabs.includes(l)) allLabs.push(l); });
    PROTOCOL_INTEL.trt.foods.forEach(f => allFoods.push(f));
  }

  if (!allLabs.length && !allFoods.length) return null;

  return (
    <div style={{ background: "var(--card-bg)", border: "1px solid rgba(220,38,38,0.2)", borderRadius: 20, overflow: "hidden" }}>
      <div style={{ padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }} onClick={() => setExpanded(e => !e)}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 10, background: "linear-gradient(135deg,#dc2626,#f59e0b)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>🧬</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 900, color: "var(--text-main)" }}>Protocol Intelligence</div>
            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
              {activeCompounds.length + (hasTRT && !activeCompounds.some(c => getProtocolCategory(c) === 'trt') ? 1 : 0)} active compound{activeCompounds.length !== 1 ? 's' : ''} · {allLabs.length} labs to watch
            </div>
          </div>
        </div>
        <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-subtle)", padding: "4px 10px", background: "rgba(220,38,38,0.08)", borderRadius: 20, border: "1px solid rgba(220,38,38,0.2)" }}>
          {expanded ? "Hide ▲" : "View ▼"}
        </div>
      </div>

      {expanded && (
        <div style={{ padding: "0 16px 16px", display: "grid", gap: 14 }}>
          {activeCompounds.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {activeCompounds.map(c => (
                <span key={c} style={{ fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 20, background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.2)", color: "#dc2626" }}>💉 {c}</span>
              ))}
              {hasTRT && <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 20, background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", color: "#f59e0b" }}>💊 TRT</span>}
            </div>
          )}

          {allLabs.length > 0 && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1.2, color: "var(--text-subtle)", marginBottom: 8 }}>🔬 Lab Markers to Watch</div>
              <div style={{ display: "grid", gap: 6 }}>
                {allLabs.map((lab, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", background: "var(--surface-1)", border: "1px solid var(--border-1)", borderRadius: 10 }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: "linear-gradient(135deg,#dc2626,#f59e0b)", flexShrink: 0 }} />
                    <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-soft)" }}>{lab}</span>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 8 }}>
                <button onClick={() => onNavigate && onNavigate('labs')} style={{ fontSize: 11, fontWeight: 700, color: "#f59e0b", background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 10, padding: "6px 12px", cursor: "pointer" }}>
                  Open Labs → log your results
                </button>
              </div>
            </div>
          )}

          {allFoods.length > 0 && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1.2, color: "var(--text-subtle)", marginBottom: 8 }}>🍽️ Protocol Nutrition Tips</div>
              <div style={{ display: "grid", gap: 8 }}>
                {allFoods.map((food, i) => {
                  const [title, detail] = food.includes(' — ') ? food.split(' — ') : [food, null];
                  return (
                    <div key={i} style={{ padding: "8px 10px", background: "var(--surface-1)", border: "1px solid var(--border-1)", borderRadius: 10 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-main)", marginBottom: detail ? 2 : 0 }}>{title}</div>
                      {detail && <div style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.4 }}>{detail}</div>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
// ─── End Protocol Intelligence ───────────────────────────────────────────

function PeptideCalcSyringe({ syringeMl, drawMl, unit }) {
  const totalUnits = syringeMl * 100;
  const drawUnits = Math.min((drawMl || 0) * 100, totalUnits);
  const fillPct = Math.min(((drawMl || 0) / syringeMl) * 100, 100);
  const H = 220;
  const W = 44;
  const fillH = (fillPct / 100) * H;
  const majEvery = syringeMl === 0.3 ? 5 : 10;
  const ticks = syringeMl === 0.3 ? 30 : syringeMl === 0.5 ? 50 : 100;
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 20, justifyContent: "center" }}>
      <svg width={W + 70} height={H + 60} viewBox={`0 0 ${W + 70} ${H + 60}`}>
        <rect x={(W + 70) / 2 - 2.5} y={10} width={5} height={H - fillH + 10} fill="var(--border-1)" rx={2} />
        <rect x={(W + 70) / 2 - 12} y={H - fillH + 10} width={24} height={7} fill="var(--border-1)" rx={2} />
        <rect x={30} y={20} width={W} height={H} fill="var(--surface-1)" stroke="var(--input-border)" strokeWidth={1.5} rx={3} />
        {fillH > 0 && (
          <>
            <defs>
              <linearGradient id="pcFluid" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#dc2626" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.75" />
              </linearGradient>
            </defs>
            <rect x={31.5} y={20 + H - fillH} width={W - 3} height={fillH} fill="url(#pcFluid)" rx={1.5} />
          </>
        )}
        {Array.from({ length: ticks + 1 }, (_, i) => {
          const isMaj = i % majEvery === 0;
          const y = 20 + H - (i / ticks) * H;
          const tw = isMaj ? 12 : 7;
          const lbl = Math.round((i / ticks) * totalUnits);
          return (
            <g key={i}>
              <line x1={30} y1={y} x2={30 - tw} y2={y} stroke="var(--border-1)" strokeWidth={isMaj ? 1.5 : 0.75} />
              {isMaj && i > 0 && (
                <text x={30 - tw - 3} y={y + 3.5} textAnchor="end" fontSize={8.5} fill="var(--text-subtle)" fontFamily="Arial, sans-serif" fontWeight="600">{lbl}</text>
              )}
            </g>
          );
        })}
        {fillH > 0 && (
          <g>
            <line x1={30} y1={20 + H - fillH} x2={30 + W + 10} y2={20 + H - fillH} stroke="#dc2626" strokeWidth={1.5} strokeDasharray="3 2" />
            <text x={30 + W + 14} y={20 + H - fillH + 3.5} fontSize={8} fill="#dc2626" fontFamily="Arial, sans-serif" fontWeight="700">{drawUnits.toFixed(1)}u</text>
          </g>
        )}
        <rect x={(W + 70) / 2 - 1.5} y={20 + H} width={3} height={18} fill="var(--border-1)" rx={1} />
        <polygon points={`${(W + 70) / 2 - 1.5},${20 + H + 18} ${(W + 70) / 2 + 1.5},${20 + H + 18} ${(W + 70) / 2},${20 + H + 25}`} fill="var(--border-1)" />
        <text x={(W + 70) / 2} y={20 + H + 12} textAnchor="middle" fontSize={8.5} fill="var(--text-subtle)" fontFamily="Arial, sans-serif" fontWeight="600">0</text>
      </svg>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingBottom: 24 }}>
        <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.2, color: "var(--text-subtle)" }}>Draw to:</div>
        <div style={{ fontSize: 38, fontWeight: 900, lineHeight: 1, background: "linear-gradient(90deg,#dc2626,#f59e0b)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{drawUnits.toFixed(1)}</div>
        <div style={{ fontSize: 12, color: "var(--text-subtle)", fontWeight: 700 }}>units</div>
        <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{(drawMl || 0).toFixed(3)} mL</div>
      </div>
    </div>
  );
}

function PeptideInfoPanel({ peptide }) {
  const [tab, setTab] = React.useState('research');
  const tabs = [
    { id: 'research', label: '📚 Research' },
    { id: 'effects', label: '✅ Effects' },
    { id: 'sideEffects', label: '⚠️ Side Effects' },
    { id: 'labs', label: '🔬 Labs' },
    { id: 'food', label: '🍽️ Nutrition' },
  ];
  const pill = (active) => ({
    padding: "5px 10px", borderRadius: 20, fontSize: 10, fontWeight: 700, cursor: "pointer",
    border: active ? "1px solid transparent" : "1px solid var(--border-1)",
    background: active ? "linear-gradient(90deg,#dc2626,#f59e0b)" : "var(--muted-bg)",
    color: active ? "#fff" : "var(--text-soft)",
    whiteSpace: "nowrap"
  });

  const items = tab === 'research' ? peptide.research
    : tab === 'effects' ? peptide.effects
    : tab === 'sideEffects' ? peptide.sideEffects
    : tab === 'labs' ? peptide.labMarkers
    : peptide.foodTips;

  const icons = { research: '📚', effects: '✅', sideEffects: '⚠️', labs: '🔬', food: '🍽️' };
  const colors = { research: '#3b82f6', effects: '#22c55e', sideEffects: '#f59e0b', labs: '#dc2626', food: '#a855f7' };

  if (!items || !items.length) return null;

  return (
    <div style={{ background: "var(--surface-1)", border: "1px solid var(--border-1)", borderRadius: 16, padding: 14, marginTop: 10 }}>
      <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 10, marginBottom: 10 }}>
        {tabs.map(t => <button key={t.id} style={pill(tab === t.id)} onClick={() => setTab(t.id)}>{t.label}</button>)}
      </div>
      {tab === 'research' && (
        <div style={{ fontSize: 10, color: "var(--text-subtle)", fontStyle: "italic", marginBottom: 8 }}>
          Sources: {peptide.sources?.join(' • ')}
        </div>
      )}
      <div style={{ display: "grid", gap: 7 }}>
        {items.map((item, i) => (
          <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "8px 10px", background: "var(--card-bg)", border: "1px solid var(--border-1)", borderRadius: 10 }}>
            <span style={{ color: colors[tab], flexShrink: 0, marginTop: 1 }}>{icons[tab]}</span>
            <span style={{ fontSize: 12, color: "var(--text-soft)", lineHeight: 1.5 }}>{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PeptideCalculatorScreen({ themeMode }) {
  const [pIdx, setPIdx] = React.useState(0);
  const [syringeMl, setSyringeMl] = React.useState(1.0);
  const [vialPreset, setVialPreset] = React.useState(null);
  const [customVial, setCustomVial] = React.useState("");
  const [isCustomVial, setIsCustomVial] = React.useState(false);
  const [bacWater, setBacWater] = React.useState(1);
  const [customBac, setCustomBac] = React.useState("");
  const [isCustomBac, setIsCustomBac] = React.useState(false);
  const [dosePreset, setDosePreset] = React.useState(null);
  const [customDose, setCustomDose] = React.useState("");
  const [isCustomDose, setIsCustomDose] = React.useState(false);
  const [showInfo, setShowInfo] = React.useState(false);

  const peptide = PEPTIDE_LIST[pIdx];
  const effectiveBac = isCustomBac ? (parseFloat(customBac) || 0) : bacWater;
  const effectiveVial = isCustomVial ? (parseFloat(customVial) || 0) : (vialPreset || 0);
  const effectiveDose = isCustomDose ? (parseFloat(customDose) || 0) : (dosePreset || 0);
  const concentration = effectiveVial > 0 && effectiveBac > 0 ? effectiveVial / effectiveBac : 0;
  const drawMl = concentration > 0 && effectiveDose > 0 ? effectiveDose / concentration : 0;
  const drawUnits = drawMl * 100;
  const valid = concentration > 0 && effectiveDose > 0 && drawMl > 0;
  const overSyringe = drawMl > syringeMl;

  const handlePeptideChange = (i) => {
    setPIdx(i); setShowInfo(false);
    setVialPreset(null); setCustomVial(""); setIsCustomVial(false);
    setDosePreset(null); setCustomDose(""); setIsCustomDose(false);
  };

  const card = { background: "var(--card-bg)", border: "1px solid var(--border-1)", borderRadius: 20, padding: 16 };
  const stepLabel = { fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1.4, color: "var(--text-subtle)", marginBottom: 10 };
  const pillBase = { border: "1px solid var(--border-1)", background: "var(--muted-bg)", color: "var(--text-soft)", borderRadius: 12, padding: "8px 12px", fontWeight: 700, cursor: "pointer", fontSize: 12 };
  const pillActive = { ...pillBase, background: "linear-gradient(90deg,#dc2626,#f59e0b)", color: "#fff", border: "1px solid transparent" };
  const inputStyle = { width: "100%", background: "var(--surface-1)", border: "1px solid var(--input-border)", color: "var(--text-main)", borderRadius: 12, padding: "9px 12px", fontSize: 13, outline: "none", boxSizing: "border-box" };
  const resultTile = { background: "var(--surface-1)", border: "1px solid var(--border-1)", borderRadius: 14, padding: "10px 12px" };
  const smallLabel = { fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "var(--text-subtle)", marginBottom: 4 };

  return (
    <div style={{ display: "grid", gap: 14, maxWidth: 860, margin: "0 auto" }}>
      {/* Step 1 — Peptide */}
      <div style={card}>
        <div style={stepLabel}>Step 1 — Select Peptide</div>
        <select value={pIdx} onChange={e => handlePeptideChange(Number(e.target.value))} style={{ ...inputStyle, cursor: "pointer", marginBottom: 10 }}>
          {PEPTIDE_LIST.map((p, i) => (
            <option key={p.name} value={i}>{p.name}{p.aliases ? ` — ${p.aliases}` : ""}</option>
          ))}
        </select>

        <div style={{ background: "var(--surface-1)", border: "1px solid var(--border-1)", borderRadius: 12, padding: "10px 12px" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, color: "#f59e0b", border: "1px solid rgba(245,158,11,0.25)", background: "rgba(245,158,11,0.08)" }}>{peptide.category}</span>
              <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, color: "#dc2626", border: "1px solid rgba(220,38,38,0.25)", background: "rgba(220,38,38,0.08)" }}>{peptide.freq}</span>
            </div>
            <button
              onClick={() => setShowInfo(v => !v)}
              style={{ fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 20, border: showInfo ? "1px solid transparent" : "1px solid var(--border-1)", background: showInfo ? "linear-gradient(90deg,#dc2626,#f59e0b)" : "var(--muted-bg)", color: showInfo ? "#fff" : "var(--text-soft)", cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}
            >
              {showInfo ? "Hide Info ▲" : "Research Info ▼"}
            </button>
          </div>
          <div style={{ fontSize: 12, color: "var(--text-soft)", lineHeight: 1.5 }}>{peptide.notes}</div>
          {showInfo && <PeptideInfoPanel peptide={peptide} />}
        </div>
      </div>

      {/* Step 2 — Syringe */}
      <div style={card}>
        <div style={stepLabel}>Step 2 — Syringe Volume</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
          {SYRINGE_OPTS.map(s => (
            <button key={s.ml} onClick={() => setSyringeMl(s.ml)} style={syringeMl === s.ml ? pillActive : pillBase}>{s.label}</button>
          ))}
        </div>
      </div>

      {/* Step 3 — Vial Amount */}
      <div style={card}>
        <div style={stepLabel}>Step 3 — Vial Amount ({peptide.unit})</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
          {peptide.vials.map(v => (
            <button key={v} onClick={() => { setIsCustomVial(false); setVialPreset(v); setCustomVial(""); }} style={!isCustomVial && vialPreset === v ? pillActive : pillBase}>{v} {peptide.unit}</button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input type="number" min="0" step="any" placeholder={`Custom amount in ${peptide.unit}`}
            value={isCustomVial ? customVial : ""}
            onFocus={() => { setIsCustomVial(true); setVialPreset(null); }}
            onChange={e => { setIsCustomVial(true); setVialPreset(null); setCustomVial(e.target.value); }}
            style={{ ...inputStyle, flex: 1 }} />
          <span style={{ fontWeight: 700, color: "var(--text-muted)", fontSize: 13 }}>{peptide.unit}</span>
        </div>
      </div>

      {/* Step 4 — BAC Water */}
      <div style={card}>
        <div style={stepLabel}>Step 4 — BAC Water Added</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: isCustomBac ? 10 : 0 }}>
          {BAC_OPTS.map(b => (
            <button key={b} onClick={() => { setIsCustomBac(false); setBacWater(b); setCustomBac(""); }} style={!isCustomBac && bacWater === b ? pillActive : pillBase}>{b} mL</button>
          ))}
          <button onClick={() => setIsCustomBac(true)} style={isCustomBac ? pillActive : pillBase}>Other</button>
        </div>
        {isCustomBac && (
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 10 }}>
            <input type="number" min="0" step="any" placeholder="e.g. 2.5" value={customBac} onChange={e => setCustomBac(e.target.value)} autoFocus style={{ ...inputStyle, flex: 1 }} />
            <span style={{ fontWeight: 700, color: "var(--text-muted)", fontSize: 13 }}>mL</span>
          </div>
        )}
      </div>

      {/* Step 5 — Dose */}
      <div style={card}>
        <div style={stepLabel}>Step 5 — Desired Dose ({peptide.unit})</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
          {peptide.doses.map(d => (
            <button key={d.v} onClick={() => { setIsCustomDose(false); setDosePreset(d.v); setCustomDose(""); }} style={!isCustomDose && dosePreset === d.v ? pillActive : pillBase}>{d.label}</button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input type="number" min="0" step="any" placeholder={`Custom dose in ${peptide.unit}`}
            value={isCustomDose ? customDose : ""}
            onFocus={() => { setIsCustomDose(true); setDosePreset(null); }}
            onChange={e => { setIsCustomDose(true); setDosePreset(null); setCustomDose(e.target.value); }}
            style={{ ...inputStyle, flex: 1 }} />
          <span style={{ fontWeight: 700, color: "var(--text-muted)", fontSize: 13 }}>{peptide.unit}</span>
        </div>
      </div>

      {/* Results */}
      <div style={{ ...card, border: valid ? "1px solid rgba(220,38,38,0.25)" : "1px solid var(--border-1)" }}>
        <div style={stepLabel}>Calculation Results</div>
        {!valid ? (
          <div style={{ textAlign: "center", padding: "28px 0", color: "var(--text-subtle)", fontSize: 13 }}>Complete all 5 steps to see your draw volume</div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {overSyringe && (
              <div style={{ background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.3)", borderRadius: 12, padding: "8px 12px", fontSize: 12, color: "#dc2626", fontWeight: 600 }}>
                ⚠️ Draw volume exceeds syringe capacity. Use a larger syringe or add more BAC water.
              </div>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div style={{ ...resultTile, background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.2)" }}>
                <div style={smallLabel}>Draw Volume</div>
                <div style={{ fontSize: 22, fontWeight: 900, background: "linear-gradient(90deg,#dc2626,#f59e0b)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{drawUnits.toFixed(1)} units</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{drawMl.toFixed(3)} mL</div>
              </div>
              <div style={resultTile}>
                <div style={smallLabel}>Concentration</div>
                <div style={{ fontSize: 16, fontWeight: 900, color: "var(--text-main)" }}>{concentration.toFixed(2)} {peptide.unit}/mL</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>per {effectiveBac} mL BAC water</div>
              </div>
              <div style={resultTile}>
                <div style={smallLabel}>Doses per Vial</div>
                <div style={{ fontSize: 16, fontWeight: 900, color: "var(--text-main)" }}>{Math.floor(effectiveBac / drawMl)}</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>at this dose</div>
              </div>
              <div style={resultTile}>
                <div style={smallLabel}>Syringe</div>
                <div style={{ fontSize: 16, fontWeight: 900, color: "var(--text-main)" }}>{syringeMl} mL</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{syringeMl * 100} unit capacity</div>
              </div>
            </div>
            <div style={{ background: "var(--surface-1)", border: "1px solid var(--border-1)", borderRadius: 14, padding: "10px 12px" }}>
              <div style={{ ...smallLabel, marginBottom: 6 }}>Tick Mark Guide</div>
              <div style={{ fontSize: 14, fontWeight: 800, color: "var(--text-main)" }}>
                Draw to the{" "}
                <span style={{ background: "linear-gradient(90deg,#dc2626,#f59e0b)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                  {drawUnits.toFixed(1)} unit
                </span>{" "}
                mark on your {syringeMl * 100}-unit syringe
              </div>
              {drawUnits % 5 !== 0 && (
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
                  Nearest major tick: {Math.round(drawUnits / 5) * 5} units — draw just {drawUnits < Math.round(drawUnits / 5) * 5 ? "below" : "above"} it.
                </div>
              )}
            </div>

            {/* Protocol-specific lab + food tips inline */}
            {(() => {
              const cat = getProtocolCategory(peptide.name);
              if (!cat) return null;
              const intel = PROTOCOL_INTEL[cat];
              return (
                <div style={{ background: "rgba(220,38,38,0.04)", border: "1px solid rgba(220,38,38,0.15)", borderRadius: 14, padding: "10px 12px" }}>
                  <div style={{ ...smallLabel, marginBottom: 6 }}>🧬 Protocol Intelligence for {peptide.name}</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-subtle)", marginBottom: 4 }}>🔬 Key Labs:</div>
                  <div style={{ fontSize: 11, color: "var(--text-soft)" }}>{intel.labs.join(' · ')}</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-subtle)", marginTop: 8, marginBottom: 4 }}>🍽️ Nutrition Tip:</div>
                  <div style={{ fontSize: 11, color: "var(--text-soft)" }}>{intel.foods[0]}</div>
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* Syringe Visual */}
      <div style={card}>
        <div style={stepLabel}>Syringe Visual</div>
        <PeptideCalcSyringe syringeMl={syringeMl} drawMl={valid ? drawMl : 0} unit={peptide.unit} />
        <div style={{ fontSize: 10, color: "var(--text-subtle)", textAlign: "center", marginTop: 10 }}>
          Each unit = 0.01 mL on a U-100 insulin syringe. {syringeMl * 100} units total capacity.
        </div>
      </div>

      {/* Reconstitution Guide */}
      <div style={card}>
        <div style={stepLabel}>Reconstitution Guide</div>
        <div style={{ display: "grid", gap: 10 }}>
          {[
            "Allow vial to reach room temperature before reconstituting.",
            "Inject BAC water slowly down the inside wall of the vial — do not spray directly on the powder.",
            "Gently swirl — do not shake — until fully dissolved.",
            "Store reconstituted peptide refrigerated at 2–8°C. Use within 28–30 days.",
          ].map((step, i) => (
            <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <div style={{ width: 20, height: 20, borderRadius: "50%", background: "linear-gradient(135deg,#dc2626,#f59e0b)", color: "#fff", fontSize: 10, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>{i + 1}</div>
              <div style={{ fontSize: 12, color: "var(--text-soft)", lineHeight: 1.5 }}>{step}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Disclaimer */}
      <div style={{ background: "rgba(245,158,11,0.05)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 16, padding: "12px 14px", fontSize: 11, color: "var(--text-muted)", lineHeight: 1.6 }}>
        <span style={{ fontWeight: 900, color: "#f59e0b" }}>Medical Disclaimer: </span>
        This calculator is for informational and research purposes only. Peptide dosing should be discussed with a qualified healthcare provider. Sources referenced are from peer-reviewed literature and clinical trials; this does not constitute medical advice.
      </div>

      <div style={{ height: 24 }} />
    </div>
  );
}
// ─── End Peptide Calculator ─────────────────────────────────────────────

const styles = {
  page: {
    minHeight: "100dvh",
    background: "var(--app-bg)",
    color: "var(--text-main)",
    fontFamily: "Arial, sans-serif",
    padding: "calc(env(safe-area-inset-top, 0px) + 14px) 12px calc(env(safe-area-inset-bottom, 0px) + 10px)",
    margin: 0,
    overscrollBehavior: "none",
    overflowX: "hidden",
    touchAction: "manipulation"
  },
  themedContent: {
    display: "grid",
    gap: 14
  },
  container: {
    maxWidth: 860,
    margin: "0 auto",
    display: "grid",
    gap: 14,
    paddingBottom: 154
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
    color: "var(--text-muted)"
  },
  authCard: {
    background: "var(--surface-1)",
    border: "1px solid var(--panel-border)",
    borderRadius: 22,
    padding: 20,
    display: "grid",
    gap: 12
  },
  topBar: {
    display: "grid",
    gap: 12,
    background: "var(--panel-bg)",
    border: "1px solid var(--panel-border)",
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
    alignItems: "center",
    flexWrap: "wrap"
  },
  filterLabel: {
    color: "var(--text-muted)",
    fontSize: 12,
    fontWeight: 700
  },
  swipeShell: {
    display: "grid",
    gap: 14,
    touchAction: "manipulation"
  },
  screenPillRow: {
    display: "grid",
    gridTemplateColumns: "repeat(6, minmax(0,1fr))",
    gap: 8
  },
  screenPill: {
    border: "1px solid var(--border-1)",
    background: "var(--muted-bg)",
    color: "var(--text-soft)",
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
    color: "var(--text-subtle)",
    fontSize: 12,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: 1.2
  },
  screenTitle: {
    fontSize: 26,
    fontWeight: 900,
    color: "var(--text-soft)"
  },
  quickActions: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0,1fr))",
    gap: 10
  },
  quickActionBtn: {
    border: "1px solid var(--border-1)",
    background: "var(--card-bg-soft)",
    color: "var(--text-soft)",
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
    background: "var(--card-bg)",
    border: "1px solid var(--border-1)",
    borderRadius: 24,
    padding: 16,
    boxShadow: "var(--shadow-1)",
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)"
  },
  cardTitle: {
    margin: "0 0 14px",
    fontSize: 22,
    color: "var(--accent-gold)"
  },
  formGrid: {
    display: "grid",
    gap: 12
  },
  label: {
    display: "block",
    marginBottom: 6,
    fontSize: 13,
    color: "var(--text-main)",
    fontWeight: 700
  },
  input: {
    width: "100%",
    minWidth: 0,
    boxSizing: "border-box",
    background: "var(--input-bg)",
    color: "var(--text-soft)",
    border: "1px solid var(--input-border)",
    borderRadius: 12,
    padding: "7px 9px",
    fontSize: 12
  },
  inputCompact: {
    minWidth: 0,
    background: "var(--input-bg)",
    color: "var(--text-soft)",
    border: "1px solid var(--input-border)",
    borderRadius: 12,
    padding: "8px 10px",
    fontSize: 13
  },
  textarea: {
    width: "100%",
    boxSizing: "border-box",
    minHeight: 90,
    background: "var(--input-bg)",
    color: "var(--text-soft)",
    border: "1px solid var(--input-border)",
    borderRadius: 14,
    padding: 10,
    fontSize: 13
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
    border: "1px solid var(--border-1)",
    background: "var(--surface-3)",
    backdropFilter: "blur(10px)",
    color: "var(--text-soft)",
    borderRadius: 14,
    padding: "7px 11px",
    minHeight: 34,
    lineHeight: 1,
    whiteSpace: "nowrap",
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
    boxShadow: "var(--shadow-2)"
  },
  editButton: {
    border: "1px solid #f59e0b",
    background: "rgba(245,158,11,0.14)",
    color: "var(--badge-text)",
    borderRadius: 12,
    padding: "8px 10px",
    cursor: "pointer"
  },
  deleteButton: {
    border: "1px solid var(--border-2)",
    background: "var(--surface-5)",
    color: "var(--text-soft)",
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
    background: "var(--card-bg-soft)",
    border: "1px solid var(--border-1)",
    borderRadius: 16,
    padding: 12,
    marginTop: 10,
    boxShadow: "var(--shadow-2)"
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
    background: "var(--badge-bg)",
    color: "var(--badge-text)",
    border: "1px solid var(--badge-border)",
    borderRadius: 999,
    padding: "4px 9px",
    fontSize: 11,
    fontWeight: 800,
    marginBottom: 8
  },
  note: {
    marginTop: 8,
    color: "var(--text-muted)",
    lineHeight: 1.5
  },
  emptyBox: {
    border: "1px dashed var(--empty-border)",
    background: "var(--empty-bg)",
    borderRadius: 16,
    padding: 18,
    color: "var(--text-muted)",
    textAlign: "center"
  },
  smallText: {
    color: "var(--text-muted)",
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
    background: "var(--glass-bg)",
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
    border: "1px solid var(--panel-border)",
    boxShadow: "var(--shadow-2)"
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
    color: "var(--accent-gold)",
    fontSize: 12,
    marginBottom: 8
  },
  statValue: {
    fontSize: 20,
    fontWeight: 800,
    color: "var(--text-soft)"
  },
  statValueMini: {
    fontSize: 16,
    fontWeight: 800,
    color: "var(--text-soft)",
    lineHeight: 1.25
  },
  progressBubble: {
    borderRadius: 18,
    padding: 12,
    position: "relative",
    overflow: "hidden",
    minHeight: 106,
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between"
  },
  progressBubbleCompact: {
    borderRadius: 13,
    padding: 7,
    minHeight: 64
  },
  dashboardBubbles: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0,1fr))",
    gap: 8
  },
  bubbleWide: {
    gridColumn: "span 2",
    minHeight: 118
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
    color: "var(--text-main)",
    marginBottom: 6,
    fontWeight: 700
  },
  progressTitleCompact: {
    fontSize: 10,
    color: "var(--text-main)",
    fontWeight: 800,
    letterSpacing: 0.3,
    textTransform: "uppercase"
  },
  progressValue: {
    fontSize: 18,
    fontWeight: 900,
    marginBottom: 8
  },
  progressValueCompact: {
    fontSize: 13,
    fontWeight: 900,
    marginBottom: 4,
    lineHeight: 1.2
  },
  progressChip: {
    fontSize: 11,
    fontWeight: 800,
    padding: "5px 8px",
    borderRadius: 999,
    background: "var(--pill-bg)",
    border: "1px solid var(--border-1)"
  },
  progressChipCompact: {
    fontSize: 9,
    fontWeight: 900,
    padding: "3px 6px",
    borderRadius: 999,
    background: "var(--pill-bg)",
    border: "1px solid var(--border-1)"
  },
  progressBarElite: {
    width: "100%",
    height: 12,
    background: "var(--muted-bg-strong)",
    borderRadius: 999,
    overflow: "hidden",
    boxShadow: "inset 0 1px 3px rgba(0,0,0,0.35)"
  },
  progressBarCompact: {
    width: "100%",
    height: 8,
    background: "var(--muted-bg-strong)",
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
    color: "var(--text-main)"
  },
  progressSubCompact: {
    marginTop: 5,
    fontSize: 10,
    color: "var(--text-main)",
    lineHeight: 1.2
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
    border: "1px solid var(--success-border)",
    background: "var(--success-surface)",
    boxShadow: "var(--success-shadow)"
  },
  completionBadgeElite: {
    background: "var(--success-pill-bg)",
    color: "var(--success-pill-text)",
    border: "1px solid var(--success-border)",
    borderRadius: 999,
    padding: "6px 10px",
    fontSize: 12,
    fontWeight: 900
  },
  completionBadgeMuted: {
    background: "var(--muted-bg-strong)",
    color: "var(--text-main)",
    border: "1px solid var(--border-1)",
    borderRadius: 999,
    padding: "6px 10px",
    fontSize: 12,
    fontWeight: 800
  },
  completionFooterText: {
    marginTop: 10,
    color: "var(--text-main)",
    fontSize: 12,
    fontWeight: 700
  },
  completionRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "8px 10px",
    borderRadius: 14,
    background: "var(--surface-3)",
    border: "1px solid var(--border-2)",
    minHeight: 54
  },
  completionRowDone: {
    border: "1px solid var(--success-border)",
    background: "var(--success-surface)"
  },
  completionIconDone: {
    width: 28,
    height: 28,
    borderRadius: 999,
    display: "grid",
    placeItems: "center",
    background: "linear-gradient(180deg, rgba(34,197,94,0.22), rgba(245,158,11,0.16))",
    color: "var(--success-pill-text)",
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
    color: "var(--text-muted)",
    fontWeight: 900,
    fontSize: 14
  },
  completionTitle: {
    fontWeight: 800,
    color: "var(--text-soft)",
    fontSize: 13
  },
  completionDetail: {
    color: "var(--text-muted)",
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
    border: "1px solid var(--input-border)",
    background: "var(--surface-3)",
    color: "var(--text-soft)",
    borderRadius: 14,
    padding: "12px 14px",
    fontWeight: 800,
    cursor: "pointer"
  },
  toggleButtonActive: {
    background: "linear-gradient(90deg,#991b1b,#b45309)",
    borderColor: "transparent",
    color: "#fff"
  },
  contextSummary: {
    display: "grid",
    gap: 6,
    padding: 12,
    borderRadius: 16,
    background: "var(--surface-3)",
    border: "1px solid var(--border-2)"
  },
  readOnlyBox: {
    minHeight: 48,
    display: "flex",
    alignItems: "center",
    padding: "0 12px",
    background: "var(--surface-5)",
    border: "1px solid var(--input-border)",
    borderRadius: 14,
    color: "var(--text-muted)",
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
    color: "var(--text-soft)",
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
    background: "var(--warning-surface)",
    border: "1px solid var(--warning-border)",
    borderRadius: 20,
    padding: 14,
    display: "grid",
    gap: 10,
    boxShadow: "var(--shadow-2)"
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
    color: "var(--text-soft)"
  },
  scheduleBadgeUpcoming: {
    fontSize: 11,
    fontWeight: 800,
    padding: "6px 10px",
    borderRadius: 999,
    background: "rgba(255,255,255,0.08)",
    color: "var(--text-main)",
    border: "1px solid var(--border-1)"
  },
  scheduleBadgeToday: {
    fontSize: 11,
    fontWeight: 800,
    padding: "6px 10px",
    borderRadius: 999,
    background: "rgba(245,158,11,0.16)",
    color: "var(--badge-text)",
    border: "1px solid rgba(245,158,11,0.24)"
  },
  scheduleBadgeOverdue: {
    fontSize: 11,
    fontWeight: 800,
    padding: "6px 10px",
    borderRadius: 999,
    background: "rgba(239,68,68,0.16)",
    color: "var(--badge-text)",
    border: "1px solid rgba(239,68,68,0.24)"
  },
  scheduleBadgeDone: {
    fontSize: 11,
    fontWeight: 800,
    padding: "6px 10px",
    borderRadius: 999,
    background: "rgba(34,197,94,0.16)",
    color: "var(--success-pill-text)",
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
    background: "var(--progress-over-fill)",
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
    background: "var(--card-bg-soft)",
    border: "1px solid var(--badge-border)",
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
    border: "1px solid var(--border-2)",
    background: "var(--surface-1)",
    color: "var(--text-soft)",
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
    background: "var(--surface-2)",
    border: "1px solid var(--border-2)",
    borderRadius: 16,
    padding: 12,
    display: "grid",
    gap: 10
  },
  importPanelCard: {
    background: "var(--surface-2)",
    border: "1px solid var(--border-2)",
    borderRadius: 18,
    padding: 12,
    display: "grid",
    gap: 10
  },
  importStatusRow: {
    display: "grid",
    gridTemplateColumns: "auto 1fr",
    gap: 10,
    alignItems: "center",
    padding: 10,
    borderRadius: 14,
    border: "1px solid var(--border-2)",
    background: "var(--surface-3)"
  },
  importReviewCard: {
    display: "grid",
    gap: 10,
    padding: 12,
    borderRadius: 16,
    border: "1px solid var(--border-2)",
    background: "var(--surface-3)"
  },
  importReviewGrid: {
    display: "grid",
    gap: 8
  },
  importMatchCard: {
    padding: 10,
    borderRadius: 14,
    border: "1px solid var(--border-2)",
    background: "var(--surface-5)",
    display: "grid",
    gap: 6
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
    background: "var(--surface-1)",
    border: "1px solid var(--border-1)",
    borderRadius: 24,
    padding: 18,
    boxShadow: "0 20px 40px rgba(0,0,0,0.45)"
  },
  sheetCard: {
    width: "100%",
    maxWidth: 760,
    maxHeight: "85dvh",
    overflowY: "auto",
    background: "var(--surface-1)",
    border: "1px solid var(--border-1)",
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
    color: "var(--text-soft)"
  },
  tipBubble: {
    background: "var(--surface-4)",
    border: "1px solid var(--input-border)",
    borderRadius: 16,
    padding: 12,
    color: "var(--text-main)",
    lineHeight: 1.45
  },
  segment: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 8
  },
  segmentBtn: {
    border: "1px solid var(--border-2)",
    background: "var(--surface-5)",
    color: "var(--text-main)",
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
  tutorialGrid: {
    display: "grid",
    gap: 10
  },
  tutorialStepCard: {
    display: "grid",
    gridTemplateColumns: "auto 1fr auto",
    gap: 10,
    alignItems: "center",
    padding: 12,
    borderRadius: 16,
    background: "var(--surface-3)",
    border: "1px solid var(--border-2)"
  },
  tutorialStepNumber: {
    width: 30,
    height: 30,
    borderRadius: 999,
    display: "grid",
    placeItems: "center",
    background: "linear-gradient(90deg,#991b1b,#b45309)",
    color: "#fff",
    fontWeight: 900,
    fontSize: 14
  },
  savedMealChipWrap: {
    display: "grid",
    gap: 6
  },
  savedMealChipCard: {
    display: "grid",
    gridTemplateColumns: "1fr auto",
    gap: 6,
    alignItems: "center"
  },
  savedMealChipButton: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
    width: "100%",
    border: "1px solid var(--input-border)",
    background: "var(--surface-3)",
    color: "var(--text-soft)",
    borderRadius: 999,
    padding: "7px 10px",
    cursor: "pointer",
    fontWeight: 700,
    minWidth: 0
  },
  savedMealChipName: {
    minWidth: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    textAlign: "left"
  },
  savedMealChipMeta: {
    fontSize: 11,
    color: "var(--text-muted)",
    whiteSpace: "nowrap"
  },
  savedMealChipRemove: {
    width: 30,
    height: 30,
    borderRadius: 999,
    border: "1px solid var(--border-1)",
    background: "var(--surface-5)",
    color: "var(--text-soft)",
    cursor: "pointer",
    fontSize: 14,
    lineHeight: 1
  },
  recentFoodWrap: {
    display: "flex",
    flexWrap: "wrap",
    gap: 6
  },
  multiBtn: {
    border: "1px solid var(--input-border)",
    background: "var(--surface-3)",
    color: "var(--text-soft)",
    borderRadius: 999,
    padding: "8px 12px",
    cursor: "pointer",
    fontWeight: 700
  },
  recentFoodBtn: {
    border: "1px solid var(--input-border)",
    background: "var(--surface-3)",
    color: "var(--text-soft)",
    borderRadius: 999,
    padding: "5px 9px",
    cursor: "pointer",
    fontWeight: 700,
    fontSize: 11
  },
  multiBtnActive: {
    background: "linear-gradient(90deg,#991b1b,#b45309)",
    borderColor: "var(--accent-gold)",
    color: "#fff"
  },
  searchInputWrap: {
    position: "relative"
  },
  inputWithClear: {
    width: "100%",
    boxSizing: "border-box",
    background: "var(--input-bg)",
    color: "var(--text-soft)",
    border: "1px solid var(--input-border)",
    borderRadius: 14,
    padding: "12px 42px 12px 12px",
    fontSize: 16
  },
  inputTouchFriendly: {
    width: "100%",
    minWidth: 0,
    boxSizing: "border-box",
    background: "var(--input-bg)",
    color: "var(--text-soft)",
    border: "1px solid var(--input-border)",
    borderRadius: 12,
    padding: "9px 10px",
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
    border: "1px solid var(--border-1)",
    background: "var(--muted-bg-strong)",
    color: "var(--text-soft)",
    cursor: "pointer",
    fontSize: 18,
    lineHeight: 1
  },
  searchItemMuted: {
    padding: 10,
    borderBottom: "1px solid var(--border-2)",
    cursor: "pointer",
    fontSize: 14,
    color: "#fbbf24",
    fontWeight: 700
  },
  searchDropdown: {
    maxHeight: 240,
    overflowY: "auto",
    border: "1px solid var(--input-border)",
    borderRadius: 12,
    background: "var(--surface-5)",
    marginTop: 8
  },
  searchItem: {
    padding: 10,
    borderBottom: "1px solid var(--border-2)",
    cursor: "pointer",
    fontSize: 14
  },
  photoPreview: {
    width: "100%",
    maxHeight: 320,
    objectFit: "cover",
    borderRadius: 16,
    border: "1px solid var(--input-border)"
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
    color: "var(--text-soft)"
  },
  photoCard: {
    background: "var(--surface-2)",
    border: "1px solid var(--border-2)",
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
    border: "1px solid var(--input-border)",
    cursor: "zoom-in"
  },
  bottomDock: {
    position: "fixed",
    left: "50%",
    right: "auto",
    transform: "translateX(-50%)",
    bottom: 0,
    width: "min(calc(100vw - 18px), 430px)",
    maxWidth: "calc(100vw - 18px)",
    margin: 0,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    padding: "8px 10px calc(10px + env(safe-area-inset-bottom, 0px))",
    background: "var(--dock-bg)",
    border: "1px solid var(--panel-border)",
    borderBottom: "none",
    borderRadius: "22px 22px 0 0",
    boxShadow: "0 -10px 28px rgba(0,0,0,0.26)",
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    zIndex: 40,
    touchAction: "pan-y",
    userSelect: "none",
    WebkitUserSelect: "none",
    overflow: "hidden"
  },
  dockButton: {
    border: "1px solid var(--panel-border)",
    background: "var(--muted-bg)",
    color: "var(--text-soft)",
    borderRadius: 16,
    padding: "8px 5px",
    minWidth: 62,
    width: 62,
    cursor: "pointer",
    display: "grid",
    gap: 3,
    justifyItems: "center",
    flex: "1 1 0",
    touchAction: "manipulation",
    userSelect: "none",
    WebkitUserSelect: "none"
  },
  dockButtonActive: {
    background: "linear-gradient(90deg,#991b1b,#b45309)",
    borderColor: "transparent"
  },
  dockEmoji: {
    fontSize: 19
  },
  dockLabel: {
    fontSize: 10,
    fontWeight: 800,
    lineHeight: 1,
    maxWidth: "100%",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap"
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
    background: "var(--card-bg-muted)",
    border: "1px solid var(--border-1)",
    borderRadius: 14,
    padding: "14px 16px",
    color: "var(--text-main)",
    fontWeight: 700
  },
  phaseHeroCard: {
    background: "var(--phase-hero-bg)"
  },
  welcomeCard: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    padding: "12px 14px",
    borderRadius: 18,
    border: "1px solid var(--border-1)",
    background: "var(--card-bg-soft)",
    boxShadow: "var(--shadow-2)"
  },
  welcomeEyebrow: {
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.9,
    color: "var(--text-muted)",
    fontWeight: 800
  },
  welcomeTitle: {
    fontSize: 20,
    fontWeight: 900,
    color: "var(--text-soft)",
    marginTop: 2,
    marginBottom: 4
  },
  welcomePill: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 62,
    padding: "8px 12px",
    borderRadius: 999,
    background: "var(--pill-bg)",
    border: "1px solid var(--border-1)",
    color: "var(--text-main)",
    fontSize: 12,
    fontWeight: 900
  },
  phaseHeroTop: {
    display: "grid",
    gap: 8
  },
  phaseTitleBlock: {
    display: "grid",
    gap: 4
  },
  phaseEyebrow: {
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    color: "var(--phase-accent-text)",
    fontWeight: 800
  },
  phaseTitleRow: {
    display: "flex",
    gap: 12,
    alignItems: "flex-start",
    justifyContent: "space-between"
  },
  phaseTitleLead: {
    display: "flex",
    gap: 12,
    alignItems: "center",
    flex: "1 1 auto",
    minWidth: 0
  },
  phaseEmoji: {
    width: 48,
    height: 48,
    display: "grid",
    placeItems: "center",
    borderRadius: 16,
    background: "var(--phase-accent-bg)",
    border: "1px solid var(--phase-accent-border)",
    fontSize: 24
  },
  phaseHeroTitle: {
    fontSize: 28,
    fontWeight: 900,
    lineHeight: 1.05,
    color: "var(--text-soft)"
  },
  phaseTitleMain: {
    display: "grid",
    gap: 6,
    flex: 1,
    minWidth: 0
  },
  phaseTitleInlineRow: {
    display: "flex",
    alignItems: "baseline",
    gap: 10,
    flexWrap: "wrap"
  },
  phaseTitleInlineMeta: {
    fontSize: 11,
    fontWeight: 800,
    color: "var(--text-main)",
    textTransform: "uppercase",
    letterSpacing: 0.7
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
    gap: 6,
    padding: "8px 10px",
    borderRadius: 999,
    background: "var(--pill-bg)",
    border: "1px solid var(--border-1)",
    fontSize: 12,
    fontWeight: 700,
    color: "var(--text-main)"
  },
  phaseInfoPillPositive: {
    background: "var(--success-pill-bg)",
    borderColor: "var(--success-border)",
    color: "var(--success-pill-text)"
  },
  phaseInfoPillWarning: {
    background: "var(--badge-bg)",
    borderColor: "var(--badge-border)",
    color: "var(--badge-text)"
  },
  phaseStatsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
    gap: 10,
    marginTop: 14
  },
  phaseStatCard: {
    background: "var(--card-bg-muted)",
    border: "1px solid var(--panel-border)",
    borderRadius: 18,
    padding: 14,
    display: "grid",
    gap: 6
  },
  phaseStatLabel: {
    fontSize: 12,
    color: "var(--text-muted)",
    textTransform: "uppercase",
    letterSpacing: 0.9,
    fontWeight: 800
  },
  phaseStatValue: {
    fontSize: 22,
    fontWeight: 900,
    color: "var(--text-soft)"
  },
  signalCountPill: {
    padding: "8px 12px",
    borderRadius: 999,
    background: "var(--pill-bg)",
    border: "1px solid var(--border-1)",
    fontSize: 12,
    fontWeight: 800,
    color: "var(--text-main)"
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
    border: "1px solid var(--border-1)"
  },
  signalWarning: {
    background: "var(--warning-soft-bg)",
    borderColor: "var(--warning-soft-border)"
  },
  signalPositive: {
    background: "var(--success-soft-bg)",
    borderColor: "var(--success-soft-border)"
  },
  signalGuide: {
    background: "var(--guide-soft-bg)",
    borderColor: "var(--guide-soft-border)"
  },
  signalIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    display: "grid",
    placeItems: "center",
    background: "var(--signal-icon-bg)",
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
    color: "var(--text-soft)"
  },
  signalHint: {
    fontSize: 13,
    lineHeight: 1.45,
    color: "var(--text-muted)"
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
    border: "1px solid var(--border-1)",
    background: "var(--card-bg-muted)"
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
    background: "var(--card-bg-muted)",
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
    color: "var(--text-soft)"
  },
  streakStateText: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    color: "var(--text-muted)",
    fontWeight: 800
  },
  streakValue: {
    fontSize: 24,
    fontWeight: 900,
    color: "var(--text-soft)"
  },
  streakHint: {
    fontSize: 13,
    lineHeight: 1.45,
    color: "var(--text-muted)"
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
    border: "1px solid var(--border-1)",
    display: "grid",
    gap: 8
  },
  proofHeading: {
    fontSize: 18,
    fontWeight: 900,
    lineHeight: 1.25,
    color: "var(--text-soft)"
  },
  proofDetail: {
    fontSize: 13,
    color: "var(--text-muted)"
  },
  recapBadge: {
    padding: "8px 12px",
    borderRadius: 999,
    background: "var(--pill-bg)",
    border: "1px solid var(--border-1)",
    fontSize: 12,
    fontWeight: 800,
    color: "var(--text-main)"
  },
  recapBadgePositive: {
    background: "var(--success-pill-bg)",
    borderColor: "var(--success-border)",
    color: "var(--success-pill-text)"
  },
  recapBadgeWarning: {
    background: "var(--badge-bg)",
    borderColor: "var(--badge-border)",
    color: "var(--badge-text)"
  },
  recapGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
    gap: 10
  },
  recapStatCard: {
    borderRadius: 18,
    padding: 14,
    background: "var(--card-bg-muted)",
    border: "1px solid var(--border-1)",
    display: "grid",
    gap: 6
  },
  recapStatLabel: {
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    color: "var(--text-muted)",
    fontWeight: 800
  },
  recapStatValue: {
    fontSize: 22,
    fontWeight: 900,
    color: "var(--text-soft)"
  },
  recapStatSubtext: {
    fontSize: 12,
    color: "var(--text-muted)"
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
    color: "var(--text-muted)"
  },
  progressCompareGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0,1fr))",
    gap: 12
  },
  progressCompareCard: {
    borderRadius: 18,
    padding: 12,
    background: "var(--card-bg-muted)",
    border: "1px solid var(--border-1)",
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
    border: "1px solid var(--input-border)",
    cursor: "zoom-in"
  },
  progressCompareDate: {
    fontSize: 16,
    fontWeight: 800,
    color: "var(--text-soft)"
  },
  progressCompareText: {
    fontSize: 13,
    color: "var(--text-main)",
    lineHeight: 1.45
  },
  progressCompareTextMuted: {
    fontSize: 12,
    color: "var(--text-faint)"
  },
  homeQuickLogGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
    gap: 10
  },
  photoMetaText: {
    fontSize: 13,
    lineHeight: 1.45,
    color: "var(--text-main)"
  },
  photoMetaTextMuted: {
    fontSize: 12,
    color: "var(--text-faint)"
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
    background: "var(--card-bg-muted)",
    border: "1px solid var(--border-1)",
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
    background: "var(--success-pill-bg)",
    border: "1px solid var(--success-border)",
    color: "var(--success-pill-text)",
    fontSize: 12,
    fontWeight: 800
  },
  localModeBadge: {
    padding: "8px 11px",
    minHeight: 36,
    display: "inline-flex",
    alignItems: "center",
    borderRadius: 999,
    background: "rgba(96,165,250,0.12)",
    border: "1px solid rgba(96,165,250,0.24)",
    color: "#dbeafe",
    fontSize: 12,
    fontWeight: 800
  },
  chartWrap: {
    display: "grid",
    gap: 12
  },
  metricLegendGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
    gap: 10
  },
  metricLegendCard: {
    borderRadius: 16,
    border: "1px solid var(--panel-border)",
    background: "var(--muted-bg)",
    padding: 12,
    display: "grid",
    gap: 6
  },
  metricLegendTop: {
    display: "flex",
    alignItems: "center",
    gap: 8
  },
  metricLegendDot: {
    width: 10,
    height: 10,
    borderRadius: 999
  },
  metricLegendLabel: {
    fontSize: 13,
    fontWeight: 800,
    color: "var(--text-soft)"
  },
  metricLegendValue: {
    fontSize: 22,
    fontWeight: 900,
    color: "var(--text-soft)"
  },
  phaseHeaderPills: {
    display: "flex",
    flexWrap: "wrap",
    gap: 6,
    justifyContent: "flex-start",
    alignItems: "center"
  },
  phaseHeaderPillsInline: {
    display: "grid",
    gap: 8,
    justifyItems: "stretch",
    alignContent: "center",
    width: "min(46vw, 236px)",
    minWidth: 148,
    marginLeft: "auto",
    flex: "0 0 auto"
  },
  phaseHeaderInfoPill: {
    width: "100%",
    justifyContent: "center",
    textAlign: "center",
    lineHeight: 1.25
  },
  phaseMicroRow: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
    marginTop: 6,
    color: "var(--text-muted)"
  },
  phaseMicroText: {
    fontSize: 13,
    fontWeight: 700,
    color: "var(--text-soft)"
  },
  phaseMicroDivider: {
    color: "var(--text-faint)",
    fontWeight: 900
  },
  dailyRewardGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(5, minmax(0,1fr))",
    gap: 6,
    marginTop: 8
  },
  dailyRewardTile: {
    borderRadius: 12,
    padding: 6,
    minHeight: 60,
    display: "grid",
    gap: 1,
    alignContent: "start",
    position: "relative",
    overflow: "visible",
    border: "1px solid var(--border-1)",
    boxShadow: "0 10px 18px rgba(0,0,0,0.18)",
    transition: "transform 0.18s ease, box-shadow 0.18s ease"
  },
  dailyRewardGlowDone: {
    boxShadow: "0 10px 18px rgba(0,0,0,0.18), 0 0 10px rgba(74,222,128,0.16)"
  },
  dailyRewardGlowSmall: {
    boxShadow: "0 12px 20px rgba(0,0,0,0.18), 0 0 12px rgba(249,115,22,0.22)"
  },
  dailyRewardGlowMedium: {
    boxShadow: "0 12px 20px rgba(0,0,0,0.18), 0 0 16px rgba(249,115,22,0.28)"
  },
  dailyRewardGlowBig: {
    boxShadow: "0 12px 22px rgba(0,0,0,0.18), 0 0 20px rgba(249,115,22,0.34)"
  },
  dailyRewardGlowTodo: {
    boxShadow: "0 10px 18px rgba(0,0,0,0.18), 0 0 10px rgba(248,113,113,0.12)"
  },
  dailyRewardTileDone: {
    background: "var(--success-surface)",
    borderColor: "var(--success-border)"
  },
  dailyRewardTileTodo: {
    background: "var(--warning-surface)",
    borderColor: "var(--warning-border)"
  },
  dailyRewardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 6
  },
  dailyRewardLabel: {
    fontSize: 9,
    fontWeight: 900,
    color: "var(--text-soft)",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis"
  },
  dailyRewardBadgeRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 4,
    minHeight: 14,
    paddingRight: 2
  },
  dailyRewardFireBadge: {
    position: "absolute",
    top: -10,
    right: -8,
    minWidth: 24,
    height: 24,
    borderRadius: 999,
    display: "grid",
    placeItems: "center",
    background: "var(--warning-badge-bg)",
    border: "1px solid var(--warning-border)",
    boxShadow: "0 10px 18px rgba(0,0,0,0.18)",
    zIndex: 2,
    lineHeight: 1,
    pointerEvents: "none"
  },
  dailyRewardFireSmall: {
    fontSize: 12
  },
  dailyRewardFireMedium: {
    fontSize: 14
  },
  dailyRewardFireBig: {
    fontSize: 16
  },
  dailyRewardEmoji: {
    fontSize: 13,
    lineHeight: 1,
    pointerEvents: "none"
  },
  dailyRewardStateRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "baseline",
    gap: 6
  },
  dailyRewardState: {
    fontSize: 11,
    fontWeight: 900,
    color: "var(--text-soft)"
  },
  dailyRewardStreak: {
    fontSize: 8,
    fontWeight: 900,
    color: "var(--badge-text)",
    whiteSpace: "nowrap"
  },
  dailyRewardCadence: {
    fontSize: 8,
    fontWeight: 800,
    color: "var(--badge-text)",
    textTransform: "uppercase",
    letterSpacing: 0.6
  },
  dailyRewardNote: {
    fontSize: 8,
    color: "var(--text-main)",
    lineHeight: 1.15,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis"
  },
  weekNavRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap"
  },
  weekCalendarGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
    gap: 10,
    marginTop: 12
  },
  weekDayCard: {
    border: "1px solid var(--panel-border)",
    background: "var(--muted-bg)",
    borderRadius: 18,
    padding: 12,
    display: "grid",
    gap: 10,
    textAlign: "left",
    cursor: "pointer"
  },
  weekDayCardActive: {
    borderColor: "var(--badge-border)",
    background: "var(--card-bg)",
    boxShadow: "var(--shadow-1)"
  },
  weekDayTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 8
  },
  weekDayLabel: {
    fontSize: 12,
    fontWeight: 800,
    color: "var(--text-main)",
    textTransform: "uppercase",
    letterSpacing: 0.8
  },
  weekDayDate: {
    fontSize: 18,
    fontWeight: 900,
    color: "var(--text-soft)"
  },
  todayMiniPill: {
    padding: "6px 9px",
    borderRadius: 999,
    background: "rgba(245,158,11,0.12)",
    border: "1px solid rgba(245,158,11,0.24)",
    color: "var(--badge-text)",
    fontSize: 11,
    fontWeight: 800
  },
  weekStatusRow: {
    display: "grid",
    gap: 8
  },
  weekStatusItem: {
    display: "flex",
    alignItems: "flex-start",
    gap: 8
  },
  weekStatusDot: {
    width: 11,
    height: 11,
    borderRadius: 999,
    boxShadow: "0 0 10px rgba(255,255,255,0.08)"
  },
  weekStatusDotDone: {
    background: "#22c55e",
    boxShadow: "0 0 12px rgba(34,197,94,0.32)"
  },
  weekStatusDotTodo: {
    background: "var(--progress-over-fill)",
    boxShadow: "0 0 12px rgba(239,68,68,0.28)"
  },
  weekStatusLabel: {
    fontSize: 11,
    fontWeight: 700,
    color: "var(--text-muted)",
    lineHeight: 1.2,
    wordBreak: "break-word"
  },
  weekInjectionPill: {
    padding: "7px 10px",
    borderRadius: 999,
    background: "var(--info-pill-bg)",
    border: "1px solid var(--info-pill-border)",
    color: "var(--info-pill-text)",
    fontSize: 12,
    fontWeight: 800,
    justifySelf: "start"
  },
  weekWorkoutMeta: {
    fontSize: 11,
    fontWeight: 800,
    color: "var(--badge-text)",
    lineHeight: 1.25
  },
  weekPlannedPill: {
    padding: "6px 9px",
    borderRadius: 999,
    background: "var(--success-pill-bg)",
    border: "1px solid var(--success-border)",
    color: "var(--success-pill-text)",
    fontSize: 11,
    fontWeight: 800,
    justifySelf: "start"
  },
  weekDetailCard: {
    marginTop: 14,
    borderRadius: 20,
    border: "1px solid var(--border-1)",
    background: "var(--card-bg-soft)",
    padding: 14,
    display: "grid",
    gap: 14
  },
  weekDetailSectionStack: {
    display: "grid",
    gap: 10
  },
  weekDetailGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: 12
  },
  weekDetailColumn: {
    display: "grid",
    gap: 8,
    alignContent: "start"
  },
  historyMiniCard: {
    borderRadius: 14,
    border: "1px solid var(--panel-border)",
    background: "var(--muted-bg)",
    padding: 10,
    display: "grid",
    gap: 4
  },
  historyMiniTitle: {
    fontSize: 13,
    fontWeight: 800,
    color: "var(--text-soft)"
  },
  emptyMiniBox: {
    borderRadius: 14,
    border: "1px dashed var(--empty-border)",
    background: "var(--empty-bg)",
    padding: 12,
    color: "var(--text-faint)",
    fontSize: 12
  },
  weekProtocolRow: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 12
  },
  weekProtocolBlock: {
    display: "grid",
    gap: 8,
    alignContent: "start"
  },
  photoLibraryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: 12,
    marginTop: 10
  },
  photoLibraryCard: {
    borderRadius: 16,
    border: "1px solid var(--panel-border)",
    background: "var(--muted-bg)",
    padding: 10,
    display: "grid",
    gap: 8
  },
  photoViewerCard: {
    width: "min(860px, calc(100% - 24px))",
    maxHeight: "88dvh",
    overflowY: "auto",
    background: "var(--surface-1)",
    border: "1px solid var(--border-1)",
    borderRadius: 24,
    padding: 16,
    display: "grid",
    gap: 12,
    boxShadow: "0 20px 40px rgba(0,0,0,0.45)"
  },
  photoViewerScroll: {
    overflow: "auto",
    borderRadius: 18,
    border: "1px solid var(--input-border)",
    background: "rgba(0,0,0,0.2)",
    padding: 8
  },
  photoViewerImage: {
    width: "100%",
    height: "auto",
    display: "block",
    borderRadius: 14
  },
  savedToastInline: {
    borderRadius: 14,
    background: "var(--success-pill-bg)",
    border: "1px solid var(--success-border)",
    color: "var(--success-pill-text)",
    padding: "10px 12px",
    fontSize: 12,
    fontWeight: 800
  },
  dockPlaceholder: {
    textAlign: "center",
    color: "var(--text-faint)",
    fontSize: 13,
    padding: "10px 12px",
    width: "100%"
  },
  status: {
    color: "var(--badge-text)",
    fontSize: 13
  },
  statusBar: {
    position: "fixed",
    left: "50%",
    transform: "translateX(-50%)",
    bottom: "calc(env(safe-area-inset-bottom, 0px) + 86px)",
    width: "min(760px, calc(100% - 28px))",
    background: "var(--panel-bg)",
    border: "1px solid var(--border-1)",
    borderRadius: 16,
    padding: 10,
    color: "var(--text-main)",
    backdropFilter: "blur(10px)",
    WebkitBackdropFilter: "blur(10px)",
    zIndex: 30
  }
};

