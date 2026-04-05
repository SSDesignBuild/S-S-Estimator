export const LOCAL_SESSION = Object.freeze({
  user: {
    id: "local-device-user",
    email: "local@device"
  }
});

export const PHASE_PRESETS = {
  Bulk: {
    defaultName: "Lean Bulk",
    defaultRate: 0.5,
    defaultWorkouts: 4,
    targetLabel: "Target gain",
    icon: "📈"
  },
  Cut: {
    defaultName: "Cut",
    defaultRate: 1,
    defaultWorkouts: 4,
    targetLabel: "Target loss",
    icon: "🪓"
  },
  Maintenance: {
    defaultName: "Maintenance",
    defaultRate: 0.4,
    defaultWorkouts: 3,
    targetLabel: "Target range",
    icon: "⚖️"
  },
  "TRT Cruise": {
    defaultName: "Cruise",
    defaultRate: 0.35,
    defaultWorkouts: 3,
    targetLabel: "Stability range",
    icon: "🛡️"
  },
  Blast: {
    defaultName: "Blast",
    defaultRate: 0.75,
    defaultWorkouts: 5,
    targetLabel: "Target response",
    icon: "🚀"
  }
};

const PHASE_STORAGE_KEY = "ironSyndicatePhases";
const LOCAL_NAMESPACE = "ironSyndicateLocal";

function localDateKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function todayInput() {
  return localDateKey(new Date());
}

function toDate(dateString) {
  return dateString ? new Date(`${dateString}T12:00:00`) : null;
}

function safeNumber(value) {
  if (value === "" || value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function average(values) {
  const valid = values.filter((value) => Number.isFinite(value));
  if (!valid.length) return null;
  return valid.reduce((sum, value) => sum + value, 0) / valid.length;
}

function formatSigned(value, suffix = "") {
  if (value == null || Number.isNaN(Number(value))) return null;
  const n = Number(value);
  return `${n > 0 ? "+" : ""}${n.toFixed(1)}${suffix}`;
}

function dateDiffDays(a, b) {
  const left = toDate(a);
  const right = toDate(b);
  if (!left || !right) return 0;
  return Math.round((left - right) / 86400000);
}

function addDaysToDateString(dateString, days) {
  const date = toDate(dateString);
  if (!date) return todayInput();
  const whole = Math.floor(days);
  const frac = days - whole;
  date.setDate(date.getDate() + whole);
  if (frac >= 0.5) date.setDate(date.getDate() + 1);
  return localDateKey(date);
}

function startOfWeekInput(dateString = todayInput()) {
  const date = toDate(dateString) || toDate(todayInput());
  const weekday = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - weekday);
  return localDateKey(date);
}

function dateRange(endDate, count) {
  return Array.from({ length: count }, (_, index) =>
    addDaysToDateString(endDate, -index)
  );
}

function compareDateAsc(a, b) {
  return a < b ? -1 : 1;
}

function compareDateDesc(a, b) {
  return a < b ? 1 : -1;
}

export function sortRowsByColumn(rows = [], orderCol = "date") {
  return [...rows].sort((a, b) => {
    const left = a?.[orderCol] || a?.created_at || "";
    const right = b?.[orderCol] || b?.created_at || "";
    return left < right ? 1 : -1;
  });
}

function localTableKey(table, ownerId = LOCAL_SESSION.user.id) {
  return `${LOCAL_NAMESPACE}:${ownerId}:${table}`;
}

export function getLocalRows(table, ownerId = LOCAL_SESSION.user.id) {
  try {
    const raw = localStorage.getItem(localTableKey(table, ownerId));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function setLocalRows(table, rows, ownerId = LOCAL_SESSION.user.id) {
  localStorage.setItem(localTableKey(table, ownerId), JSON.stringify(rows || []));
}

export function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function getPhasePreset(type = "Bulk") {
  return PHASE_PRESETS[type] || PHASE_PRESETS.Bulk;
}

export function buildPhaseForm(seed = {}) {
  const preset = getPhasePreset(seed.type || "Bulk");
  return {
    id: seed.id || "",
    type: seed.type || "Bulk",
    name: seed.name || preset.defaultName,
    startDate: seed.startDate || todayInput(),
    endDate: seed.endDate || "",
    startWeight: seed.startWeight ?? "",
    calorieTarget: seed.calorieTarget ?? "",
    proteinTarget: seed.proteinTarget ?? "",
    rateTarget: seed.rateTarget ?? "",
    workoutTarget: seed.workoutTarget ?? String(preset.defaultWorkouts),
    notes: seed.notes || "",
    autoPilot: seed.autoPilot !== false
  };
}

export function getStoredPhases() {
  try {
    const raw = localStorage.getItem(PHASE_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.sort((a, b) => compareDateDesc(a.startDate || "", b.startDate || ""));
  } catch {
    return [];
  }
}

export function saveStoredPhases(phases) {
  localStorage.setItem(PHASE_STORAGE_KEY, JSON.stringify(phases || []));
}

export function getActivePhase(phases = []) {
  const active = phases.filter((phase) => phase?.isActive);
  if (active.length) {
    return [...active].sort((a, b) => compareDateDesc(a.startDate || "", b.startDate || ""))[0];
  }

  return [...phases]
    .filter((phase) => phase && (!phase.endDate || phase.endDate >= todayInput()))
    .sort((a, b) => compareDateDesc(a.startDate || "", b.startDate || ""))[0] || null;
}

export function getPhaseDayNumber(phase, date = todayInput()) {
  if (!phase?.startDate || !date) return null;
  return Math.max(1, dateDiffDays(date, phase.startDate) + 1);
}

export function getPhaseForDate(phases = [], date) {
  if (!date) return null;
  return [...phases]
    .filter(
      (phase) =>
        phase?.startDate &&
        phase.startDate <= date &&
        (!phase.endDate || phase.endDate >= date)
    )
    .sort((a, b) => compareDateDesc(a.startDate || "", b.startDate || ""))[0] || null;
}

export function getPhaseTargetLabel(phase) {
  if (!phase) return "Target pace";
  return getPhasePreset(phase.type).targetLabel;
}

export function formatPhaseTarget(phase) {
  if (!phase) return "Start a phase to set the pace.";
  const preset = getPhasePreset(phase.type);
  const rate = safeNumber(phase.rateTarget) ?? preset.defaultRate;

  if (phase.type === "Maintenance" || phase.type === "TRT Cruise") {
    return `${preset.targetLabel}: ±${rate.toFixed(1)} lb/week`;
  }

  return `${preset.targetLabel}: ${rate.toFixed(1)} lb/week`;
}

export function buildEffectiveTargets(latestGoal, phase, coachTargets = {}) {
  const phaseCalories = safeNumber(phase?.calorieTarget);
  const phaseProtein = safeNumber(phase?.proteinTarget);
  const coachCalories = safeNumber(coachTargets?.calories);
  const coachProtein = safeNumber(coachTargets?.protein);
  const goalCalories = safeNumber(latestGoal?.calories);
  const goalProtein = safeNumber(latestGoal?.protein);

  const calories =
    phaseCalories ?? goalCalories ?? coachCalories ?? null;
  const protein =
    phaseProtein ?? goalProtein ?? coachProtein ?? null;

  return {
    calories,
    protein,
    carbs:
      safeNumber(phase?.carbTarget) ??
      safeNumber(latestGoal?.carbs) ??
      safeNumber(coachTargets?.carbs),
    fats:
      safeNumber(phase?.fatTarget) ??
      safeNumber(latestGoal?.fats) ??
      safeNumber(coachTargets?.fats),
    fiber:
      safeNumber(phase?.fiberTarget) ??
      safeNumber(latestGoal?.fiber) ??
      safeNumber(coachTargets?.fiber),
    source: phaseCalories != null || phaseProtein != null
      ? "phase"
      : goalCalories != null || goalProtein != null
      ? "goals"
      : coachCalories != null || coachProtein != null
      ? "coach"
      : "none"
  };
}

function buildNutritionMap(caloriesByDate = []) {
  return caloriesByDate.reduce((map, entry) => {
    map[entry.date] = {
      date: entry.date,
      calories: safeNumber(entry.calories) ?? 0,
      protein: safeNumber(entry.protein) ?? 0,
      carbs: safeNumber(entry.carbs) ?? 0,
      fats: safeNumber(entry.fats) ?? 0,
      fiber: safeNumber(entry.fiber) ?? 0,
      logged: true
    };
    return map;
  }, {});
}

function buildBodySeries(bodyMetrics = []) {
  const ordered = [...bodyMetrics].sort((a, b) => compareDateAsc(a.date || "", b.date || ""));
  const map = {};

  ordered.forEach((entry) => {
    const weight = safeNumber(entry.weight);
    const bodyFat = safeNumber(entry.bodyFatPercent);
    const muscle = safeNumber(entry.skeletalMuscleMass);

    map[entry.date] = {
      date: entry.date,
      weight: weight ?? map[entry.date]?.weight ?? null,
      bodyFatPercent: bodyFat ?? map[entry.date]?.bodyFatPercent ?? null,
      skeletalMuscleMass: muscle ?? map[entry.date]?.skeletalMuscleMass ?? null
    };
  });

  return Object.values(map).sort((a, b) => compareDateAsc(a.date || "", b.date || ""));
}

function findNearestBodyPoint(series, targetDate, maxGapDays = 5) {
  if (!targetDate || !series.length) return null;

  let best = null;
  let bestGap = Infinity;

  series.forEach((point) => {
    const gap = Math.abs(dateDiffDays(point.date, targetDate));
    if (gap <= maxGapDays && gap < bestGap) {
      best = point;
      bestGap = gap;
      return;
    }

    if (gap === bestGap && best && point.date <= targetDate && best.date > targetDate) {
      best = point;
    }
  });

  return best;
}

function getLatestWeighted(series, field) {
  return [...series].reverse().find((point) => point[field] != null) || null;
}

function getPhaseStartPoint(series, phase) {
  if (!phase?.startDate) return null;
  return (
    findNearestBodyPoint(series.filter((point) => point.weight != null), phase.startDate, 14) ||
    null
  );
}

function getWeeklyWeightChange(series) {
  const weighted = series.filter((point) => point.weight != null);
  if (weighted.length < 2) return null;

  const today = todayInput();
  const recent = weighted
    .filter((point) => {
      const diff = dateDiffDays(today, point.date);
      return diff >= 0 && diff < 7;
    })
    .map((point) => point.weight);

  const previous = weighted
    .filter((point) => {
      const diff = dateDiffDays(today, point.date);
      return diff >= 7 && diff < 14;
    })
    .map((point) => point.weight);

  if (recent.length >= 2 && previous.length >= 2) {
    return average(recent) - average(previous);
  }

  const latest = weighted[weighted.length - 1];
  const baseline = weighted.find(
    (point) => point.date < latest.date && dateDiffDays(latest.date, point.date) >= 3
  );

  if (!baseline) return null;

  const days = Math.max(1, dateDiffDays(latest.date, baseline.date));
  return ((latest.weight - baseline.weight) / days) * 7;
}

function getFieldChangeSinceDate(series, field, startDate, fallbackMaxGap = 21) {
  const latest = getLatestWeighted(series, field);
  if (!latest || !startDate) return null;

  const baseline =
    findNearestBodyPoint(
      series.filter((point) => point[field] != null),
      startDate,
      fallbackMaxGap
    ) || null;

  if (!baseline || baseline[field] == null) return null;

  return {
    current: latest[field],
    baseline: baseline[field],
    diff: latest[field] - baseline[field],
    startDate: baseline.date,
    endDate: latest.date
  };
}

function interpretPhasePace(phase, weeklyChange) {
  if (!phase || weeklyChange == null) {
    return {
      tone: "neutral",
      message: "Add more weigh-ins to read your pace.",
      short: "Pace pending"
    };
  }

  const preset = getPhasePreset(phase.type);
  const rate = safeNumber(phase.rateTarget) ?? preset.defaultRate;

  if (phase.type === "Bulk" || phase.type === "Blast") {
    const lower = Math.max(0.15, rate - 0.25);
    const upper = rate + 0.25;

    if (weeklyChange < lower) {
      return {
        tone: "warning",
        message: "Weight gain is slower than planned.",
        short: "Below pace"
      };
    }

    if (weeklyChange > upper) {
      return {
        tone: "warning",
        message: "Weight is climbing faster than planned.",
        short: "Above pace"
      };
    }

    return {
      tone: "positive",
      message: "Weight gain is on pace.",
      short: "On pace"
    };
  }

  if (phase.type === "Cut") {
    const target = -Math.abs(rate);
    const lower = target - 0.35;
    const upper = target + 0.35;

    if (weeklyChange > upper) {
      return {
        tone: "warning",
        message: "Weight loss is slower than target.",
        short: "Below pace"
      };
    }

    if (weeklyChange < lower) {
      return {
        tone: "warning",
        message: "Weight is dropping faster than planned.",
        short: "Above pace"
      };
    }

    return {
      tone: "positive",
      message: "Fat loss pace is on track.",
      short: "On pace"
    };
  }

  if (Math.abs(weeklyChange) <= rate) {
    return {
      tone: "positive",
      message:
        phase.type === "TRT Cruise"
          ? "Bodyweight is stable this week."
          : "Weight is stable.",
      short: "Stable"
    };
  }

  return {
    tone: "warning",
    message:
      phase.type === "TRT Cruise"
        ? "Bodyweight moved outside your cruise range."
        : "Weight is outside your maintenance range.",
    short: "Off range"
  };
}

function buildMeaningfulLogDates({ caloriesByDate, bodyMetrics, workouts, cardio, injections, progressPhotos }) {
  const set = new Set();

  caloriesByDate.forEach((entry) => set.add(entry.date));
  bodyMetrics.forEach((entry) => set.add(entry.date));
  workouts.forEach((entry) => set.add(entry.date));
  cardio.forEach((entry) => set.add(entry.date));
  injections.forEach((entry) => set.add(entry.date));
  progressPhotos.forEach((entry) => set.add(entry.date));

  return set;
}

function countTrailingDays(predicate, endDate, maxDays = 120) {
  let count = 0;
  let cursor = endDate;

  for (let index = 0; index < maxDays; index += 1) {
    if (!predicate(cursor)) break;
    count += 1;
    cursor = addDaysToDateString(cursor, -1);
  }

  return count;
}

function buildStreak({ label, icon, predicate, helperHealthy, helperRisk }) {
  const today = todayInput();
  const yesterday = addDaysToDateString(today, -1);
  const metToday = predicate(today);
  const metYesterday = predicate(yesterday);

  if (metToday) {
    const count = countTrailingDays(predicate, today);
    return {
      icon,
      label,
      count,
      display: `${count} day${count === 1 ? "" : "s"}`,
      state: "healthy",
      helper: helperHealthy
    };
  }

  const count = metYesterday ? countTrailingDays(predicate, yesterday) : 0;
  return {
    icon,
    label,
    count,
    display: `${count} day${count === 1 ? "" : "s"}`,
    state: count > 0 ? "at-risk" : "broken",
    helper: count > 0 ? helperRisk : `Start ${label.toLowerCase()} again today.`
  };
}

function generateDueDates(schedule, startDate, endDate) {
  const every = Math.max(1, Math.round(safeNumber(schedule.everyDays) || 0));
  if (!schedule?.startDate || !every) return [];

  const dates = [];
  let cursor = schedule.startDate;
  let guard = 0;

  while (cursor < startDate && guard < 500) {
    cursor = addDaysToDateString(cursor, every);
    guard += 1;
  }

  while (cursor <= endDate && guard < 1000) {
    dates.push(cursor);
    cursor = addDaysToDateString(cursor, every);
    guard += 1;
  }

  return dates;
}

function buildScheduleStatuses(schedules, injections) {
  const now = todayInput();

  return schedules
    .map((schedule) => {
      const every = Math.round(safeNumber(schedule.everyDays) || 0);
      if (!schedule?.startDate || !every) return null;

      const matchingInjections = injections
        .filter(
          (entry) =>
            String(entry.peptide || "").toLowerCase() ===
            String(schedule.peptide || "").toLowerCase()
        )
        .sort((a, b) => compareDateDesc(a.date || "", b.date || ""));

      const lastInjection = matchingInjections[0];
      const injectedToday = lastInjection?.date === now;
      const anchorDate = lastInjection?.date || schedule.startDate;
      const nextDate = addDaysToDateString(anchorDate, every);
      const daysAway = injectedToday ? every : dateDiffDays(nextDate, now);

      return {
        ...schedule,
        everyDays: every,
        lastInjectionDate: lastInjection?.date || null,
        nextDate,
        daysAway,
        injectedToday
      };
    })
    .filter(Boolean)
    .sort((a, b) => compareDateAsc(a.nextDate || "", b.nextDate || ""));
}

function evaluateProtocolWindow(schedules, injections, days = 14) {
  const end = todayInput();
  const start = addDaysToDateString(end, -(days - 1));
  const events = [];

  schedules.forEach((schedule) => {
    const dueDates = generateDueDates(schedule, start, end);
    const matching = injections
      .filter(
        (entry) =>
          String(entry.peptide || "").toLowerCase() ===
          String(schedule.peptide || "").toLowerCase()
      )
      .sort((a, b) => compareDateAsc(a.date || "", b.date || ""));

    const used = new Set();

    dueDates.forEach((dueDate) => {
      const foundIndex = matching.findIndex((entry, index) => {
        if (used.has(index)) return false;
        const diff = dateDiffDays(entry.date, dueDate);
        return diff >= 0 && diff <= 1;
      });

      const completed = foundIndex !== -1;
      if (completed) used.add(foundIndex);

      events.push({
        scheduleId: schedule.id || `${schedule.peptide}-${dueDate}`,
        peptide: schedule.peptide,
        due: dueDate,
        completed
      });
    });
  });

  const ordered = events.sort((a, b) => compareDateAsc(a.due || "", b.due || ""));
  const total = ordered.length;
  const completed = ordered.filter((event) => event.completed).length;

  return {
    events: ordered,
    total,
    completed,
    adherence: total ? completed / total : null
  };
}

function buildProtocolStreak(scheduleStatuses, protocolWindow30) {
  if (!scheduleStatuses.length) {
    return {
      icon: "💉",
      label: "Protocol",
      count: 0,
      display: "—",
      state: "neutral",
      helper: "Set a schedule to track protocol adherence."
    };
  }

  if (scheduleStatuses.some((status) => status.daysAway < 0 && !status.injectedToday)) {
    return {
      icon: "💉",
      label: "Protocol",
      count: 0,
      display: "0 days",
      state: "broken",
      helper: "Protocol log is overdue."
    };
  }

  const missed = protocolWindow30.events.filter((event) => !event.completed);
  const anchor = missed.length
    ? addDaysToDateString(missed[missed.length - 1].due, 1)
    : protocolWindow30.events[0]?.due || todayInput();

  const count = Math.max(0, dateDiffDays(todayInput(), anchor) + 1);
  const atRisk = scheduleStatuses.some((status) => status.daysAway === 0 && !status.injectedToday);

  return {
    icon: "💉",
    label: "Protocol",
    count,
    display: `${count} day${count === 1 ? "" : "s"}`,
    state: atRisk ? "at-risk" : "healthy",
    helper: atRisk
      ? "Log today's protocol to keep the streak alive."
      : "Protocol timing is locked in."
  };
}

function buildPhotoComparison(progressPhotos, bodySeries, phases) {
  const sortedPhotos = [...progressPhotos].sort((a, b) => compareDateDesc(a.date || "", b.date || ""));
  const latest = sortedPhotos[0];
  if (!latest) return null;

  const desired = addDaysToDateString(latest.date, -14);
  const samePose = sortedPhotos.filter(
    (photo) => photo.id !== latest.id && (!latest.pose || photo.pose === latest.pose)
  );
  const generic = sortedPhotos.filter((photo) => photo.id !== latest.id);

  const chooseNearest = (list, preferredDate) =>
    [...list].sort((left, right) => {
      const leftGap = Math.abs(dateDiffDays(left.date, preferredDate));
      const rightGap = Math.abs(dateDiffDays(right.date, preferredDate));
      return leftGap - rightGap;
    })[0] || null;

  const phase = getPhaseForDate(phases, latest.date);
  const phaseStartPhoto = phase
    ? chooseNearest(
        generic.filter((photo) => photo.date >= phase.startDate && photo.date < latest.date),
        phase.startDate
      )
    : null;

  const comparison =
    chooseNearest(samePose.filter((photo) => photo.date <= latest.date), desired) ||
    phaseStartPhoto ||
    chooseNearest(generic.filter((photo) => photo.date < latest.date), desired);

  if (!comparison) return null;

  const latestMeta = buildSinglePhotoMeta(latest, bodySeries, phases);
  const comparisonMeta = buildSinglePhotoMeta(comparison, bodySeries, phases);
  const deltaWeight =
    latestMeta.weight != null && comparisonMeta.weight != null
      ? latestMeta.weight - comparisonMeta.weight
      : null;

  return {
    left: comparison,
    right: latest,
    leftMeta: comparisonMeta,
    rightMeta: latestMeta,
    daysApart: Math.max(1, dateDiffDays(latest.date, comparison.date)),
    deltaWeight,
    samePose: latest.pose && comparison.pose && latest.pose === comparison.pose
  };
}

function buildSinglePhotoMeta(photo, bodySeries, phases) {
  if (!photo) return null;
  const weightPoint = findNearestBodyPoint(bodySeries.filter((point) => point.weight != null), photo.date, 5);
  const phase = getPhaseForDate(phases, photo.date);
  const dayNumber = phase ? getPhaseDayNumber(phase, photo.date) : null;

  return {
    weight: weightPoint?.weight ?? null,
    weightLabel: weightPoint?.weight != null ? `${weightPoint.weight.toFixed(1)} lb` : "Weight not logged",
    phaseName: phase?.name || "No phase",
    phaseType: phase?.type || "",
    phaseDay: dayNumber,
    phaseDayLabel: dayNumber ? `Day ${dayNumber}` : ""
  };
}

export function buildPhotoMetaMap(progressPhotos = [], bodyMetrics = [], phases = []) {
  const bodySeries = buildBodySeries(bodyMetrics);
  return progressPhotos.reduce((map, photo) => {
    map[photo.id] = buildSinglePhotoMeta(photo, bodySeries, phases);
    return map;
  }, {});
}

function pickTopSignals(candidates) {
  const byKind = {
    warning: [],
    positive: [],
    guide: []
  };

  candidates.forEach((signal) => {
    if (!signal?.message) return;
    byKind[signal.kind] = [...(byKind[signal.kind] || []), signal].sort(
      (left, right) => right.priority - left.priority
    );
  });

  const selected = [];
  const seen = new Set();

  ["warning", "positive", "guide"].forEach((kind) => {
    const signal = byKind[kind]?.[0];
    if (signal && !seen.has(signal.message)) {
      selected.push(signal);
      seen.add(signal.message);
    }
  });

  const remainder = candidates
    .sort((left, right) => right.priority - left.priority)
    .filter((signal) => !seen.has(signal.message));

  return [...selected, ...remainder].slice(0, 3);
}

export function buildDashboardModel({
  phase,
  profile = {},
  phases = [],
  nutritionTargets,
  caloriesByDate = [],
  bodyMetrics = [],
  workouts = [],
  cardio = [],
  injections = [],
  schedules = [],
  progressPhotos = []
}) {
  const today = todayInput();
  const nutritionMap = buildNutritionMap(caloriesByDate);
  const bodySeries = buildBodySeries(bodyMetrics);
  const weightSeries = bodySeries.filter((point) => point.weight != null);
  const latestWeightPoint = weightSeries[weightSeries.length - 1] || null;
  const phaseStartPoint = getPhaseStartPoint(bodySeries, phase);
  const phaseDay = phase ? getPhaseDayNumber(phase, today) : null;
  const phaseWeightChange =
    latestWeightPoint && (safeNumber(phase?.startWeight) ?? phaseStartPoint?.weight) != null
      ? latestWeightPoint.weight - (safeNumber(phase?.startWeight) ?? phaseStartPoint?.weight)
      : null;

  const weeklyWeightChange = getWeeklyWeightChange(bodySeries);
  const pace = interpretPhasePace(phase, weeklyWeightChange);

  const last7Dates = dateRange(today, 7);
  const last14Dates = dateRange(today, 14);
  const nutritionLogged7 = last7Dates
    .map((date) => nutritionMap[date])
    .filter(Boolean);
  const nutritionLogged14 = last14Dates
    .map((date) => nutritionMap[date])
    .filter(Boolean);

  const avgCalories7 = average(nutritionLogged7.map((entry) => entry.calories));
  const avgProtein7 = average(nutritionLogged7.map((entry) => entry.protein));

  const caloriesTarget = safeNumber(nutritionTargets?.calories);
  const proteinTarget = safeNumber(nutritionTargets?.protein);

  const macroMet = (date) => {
    const entry = nutritionMap[date];
    return !!entry && caloriesTarget != null && Math.abs(entry.calories - caloriesTarget) <= 150;
  };

  const proteinMet = (date) => {
    const entry = nutritionMap[date];
    return !!entry && proteinTarget != null && entry.protein >= proteinTarget * 0.9;
  };

  const logDates = buildMeaningfulLogDates({
    caloriesByDate,
    bodyMetrics,
    workouts,
    cardio,
    injections,
    progressPhotos
  });

  const checkInMet = (date) => logDates.has(date);
  const weightMet = (date) => bodyMetrics.some((entry) => entry.date === date && entry.weight !== "" && entry.weight != null);

  const todayCardioMinutes = cardio
    .filter((entry) => entry.date === today)
    .reduce((sum, entry) => sum + (safeNumber(entry.minutes) || 0), 0);
  const lastCardio = [...cardio].sort((a, b) => compareDateDesc(a.date || "", b.date || ""))[0] || null;
  const daysSinceLastCardio = lastCardio ? dateDiffDays(today, lastCardio.date) : null;
  const lastBodyMetric = [...bodyMetrics].sort((a, b) => compareDateDesc(a.date || "", b.date || ""))[0] || null;
  const daysSinceLastMetric = lastBodyMetric ? dateDiffDays(today, lastBodyMetric.date) : null;
  const metricReminderGap =
    phase?.type === "Cut"
      ? 1
      : phase?.type === "Bulk" || phase?.type === "Blast"
      ? 2
      : phase?.type === "TRT Cruise"
      ? 3
      : 4;
  const lastMetricLabel =
    daysSinceLastMetric == null
      ? null
      : daysSinceLastMetric === 0
      ? "Body metrics logged today."
      : daysSinceLastMetric === 1
      ? "Last body check-in yesterday."
      : `Last body check-in ${daysSinceLastMetric} days ago.`;

  const weekStart = startOfWeekInput(today);
  const previousWeekStart = addDaysToDateString(weekStart, -7);
  const previousWeekEnd = addDaysToDateString(weekStart, -1);
  const workoutsThisWeek = workouts.filter((entry) => entry.date >= weekStart && entry.date <= today).length;
  const workoutsLastWeek = workouts.filter(
    (entry) => entry.date >= previousWeekStart && entry.date <= previousWeekEnd
  ).length;
  const lastWorkout = [...workouts].sort((a, b) => compareDateDesc(a.date || "", b.date || ""))[0] || null;
  const daysSinceLastWorkout = lastWorkout ? dateDiffDays(today, lastWorkout.date) : null;
  const workoutTarget =
    safeNumber(phase?.workoutTarget) ?? getPhasePreset(phase?.type || "Maintenance").defaultWorkouts;
  const weekdayIndex = (toDate(today)?.getDay?.() + 6) % 7;
  const daysLeftThisWeek = 6 - weekdayIndex;
  const workoutState =
    workoutsThisWeek >= workoutTarget
      ? "healthy"
      : workoutsThisWeek + daysLeftThisWeek >= workoutTarget
      ? "at-risk"
      : "broken";

  const scheduleStatuses = buildScheduleStatuses(schedules, injections);
  const protocol14 = evaluateProtocolWindow(schedules, injections, 14);
  const protocol30 = evaluateProtocolWindow(schedules, injections, 30);
  const protocolStreak = buildProtocolStreak(scheduleStatuses, protocol30);
  const protocolAdherencePercent =
    protocol14.adherence != null ? Math.round(protocol14.adherence * 100) : null;

  const bodyFatChange = getFieldChangeSinceDate(bodySeries, "bodyFatPercent", phase?.startDate || today);
  const muscleChange = getFieldChangeSinceDate(bodySeries, "skeletalMuscleMass", phase?.startDate || today);

  const macroStreak = buildStreak({
    label: "Macros",
    icon: "🔥",
    predicate: macroMet,
    helperHealthy: "Calories have been inside range consistently.",
    helperRisk: "Log today to keep the macro streak alive."
  });

  const proteinStreak = buildStreak({
    label: "Protein",
    icon: "🍗",
    predicate: proteinMet,
    helperHealthy: "Protein consistency is stacking up.",
    helperRisk: "Protein streak is at risk today."
  });

  const checkInStreak = buildStreak({
    label: "Check-ins",
    icon: "🧾",
    predicate: checkInMet,
    helperHealthy: "Daily accountability is locked in.",
    helperRisk: "Log something meaningful today to protect the streak."
  });

  const weightStreak = buildStreak({
    label: "Weight",
    icon: "⚖️",
    predicate: weightMet,
    helperHealthy: "Bodyweight check-ins are consistent.",
    helperRisk: "Log weight today to keep the streak alive."
  });

  const workoutWindow = {
    icon: "🏋️",
    label: "Workouts",
    count: workoutsThisWeek,
    display: `${workoutsThisWeek} / ${workoutTarget} this week`,
    state: workoutState,
    helper:
      workoutState === "healthy"
        ? "Training target is already hit this week."
        : workoutState === "at-risk"
        ? "One more session keeps the weekly target intact."
        : "Training target is slipping this week."
  };

  const photoCompare = buildPhotoComparison(progressPhotos, bodySeries, phases);
  const latestPhoto = [...progressPhotos].sort((a, b) => compareDateDesc(a.date || "", b.date || ""))[0] || null;
  const daysSincePhoto = latestPhoto ? dateDiffDays(today, latestPhoto.date) : null;

  const signals = [];
  const yesterday = addDaysToDateString(today, -1);
  const yesterdayNutrition = nutritionMap[yesterday];

  if (proteinTarget != null && yesterdayNutrition && yesterdayNutrition.protein < proteinTarget - 20) {
    signals.push({
      kind: "warning",
      priority: 94,
      icon: "⚠",
      message: `Protein came in ${Math.round(proteinTarget - yesterdayNutrition.protein)}g low yesterday.`,
      hint: "One solid shake today puts you back in range."
    });
  }

  if (proteinStreak.count >= 5) {
    signals.push({
      kind: "positive",
      priority: 70,
      icon: "✅",
      message: `Protein target hit ${proteinStreak.count} straight days.`,
      hint: "Keep that chain alive today."
    });
  }

  if (caloriesTarget != null && nutritionLogged7.length >= 4 && avgCalories7 != null) {
    if ((phase?.type === "Bulk" || phase?.type === "Blast") && avgCalories7 < caloriesTarget - 250) {
      signals.push({
        kind: "warning",
        priority: 80,
        icon: "⚠",
        message: "Calories are running low for your growth phase.",
        hint: "Push food today to stay on pace."
      });
    }

    if (phase?.type === "Cut" && avgCalories7 > caloriesTarget + 250) {
      signals.push({
        kind: "warning",
        priority: 80,
        icon: "⚠",
        message: `Calories are averaging ${Math.round(avgCalories7 - caloriesTarget)} over target.`,
        hint: "A tighter day keeps the weekly deficit intact."
      });
    }

    if (Math.abs(avgCalories7 - caloriesTarget) <= 150) {
      signals.push({
        kind: "positive",
        priority: 66,
        icon: "✅",
        message: "Calories have been steady this week.",
        hint: "Consistency is doing the heavy lifting."
      });
    }
  }

  if (phase && weeklyWeightChange != null) {
    signals.push({
      kind: pace.tone === "warning" ? "warning" : "positive",
      priority: 78,
      icon: pace.tone === "warning" ? "⚠" : "✅",
      message: pace.message,
      hint:
        phase.type === "Bulk"
          ? "Keep food and weigh-ins tight this week."
          : phase.type === "Cut"
          ? "Stay tight today and let the week work."
          : "Stable trends are the goal right now."
    });
  }

  if (daysSinceLastWorkout != null && daysSinceLastWorkout >= 2) {
    signals.push({
      kind: "warning",
      priority: 88,
      icon: "⏰",
      message: `No workout logged in ${daysSinceLastWorkout} days.`,
      hint: "A short session today keeps momentum alive."
    });
  } else if (workoutsThisWeek >= workoutTarget && workoutTarget > 0) {
    signals.push({
      kind: "positive",
      priority: 64,
      icon: "✅",
      message: "Training target hit this week.",
      hint: "Recovery can do its job now."
    });
  } else if (workoutsThisWeek > workoutsLastWeek && workoutsThisWeek > 0) {
    signals.push({
      kind: "positive",
      priority: 56,
      icon: "✅",
      message: "Training frequency is up this week.",
      hint: "That extra touchpoint matters."
    });
  }

  if (scheduleStatuses.some((status) => status.daysAway < 0 && !status.injectedToday)) {
    signals.push({
      kind: "warning",
      priority: 99,
      icon: "⚠",
      message: "Protocol log is overdue.",
      hint: "Get it logged to keep adherence clean."
    });
  } else if (scheduleStatuses.some((status) => status.daysAway === 0 && !status.injectedToday)) {
    signals.push({
      kind: "guide",
      priority: 72,
      icon: "💉",
      message: "Injection scheduled for today.",
      hint: "Log it after the pin to protect the streak."
    });
  } else if (protocolAdherencePercent === 100 && protocol14.total > 0) {
    signals.push({
      kind: "positive",
      priority: 60,
      icon: "✅",
      message: "Protocol adherence is 100% this week.",
      hint: "Everything is landing on time."
    });
  }

  if (phase && todayCardioMinutes === 0) {
    const cardioTips = {
      Bulk: { message: "No cardio logged yet today.", hint: "An easy walk is enough for a growth phase." },
      Cut: { message: "No cardio logged yet today.", hint: "A brisk walk or incline session fits this cut." },
      Maintenance: { message: "No cardio logged yet today.", hint: "A short walk keeps maintenance feeling easy." },
      "TRT Cruise": { message: "No cardio logged yet today.", hint: "Easy movement usually fits cruise phases best." },
      Blast: { message: "No cardio logged yet today.", hint: "A low-fatigue session keeps this phase cleaner." }
    };
    const cardioTip = cardioTips[phase.type] || cardioTips.Maintenance;
    signals.push({
      kind: "guide",
      priority: daysSinceLastCardio != null && daysSinceLastCardio >= 2 ? 50 : 43,
      icon: "🚶",
      message: cardioTip.message,
      hint: cardioTip.hint
    });
  }

  if (daysSinceLastMetric == null) {
    signals.push({
      kind: "guide",
      priority: 58,
      icon: "⚖",
      message: "No body metrics logged yet.",
      hint: phase
        ? phase.type === "Cut"
          ? "A quick morning weight or waist entry sharpens the cut fast."
          : "A quick weight or waist entry helps the app read your phase better."
        : "A quick weight entry gives the app something useful to work from."
    });
  } else if (daysSinceLastMetric >= metricReminderGap) {
    signals.push({
      kind: "guide",
      priority: 57,
      icon: "⚖",
      message:
        daysSinceLastMetric <= 1
          ? "No body check-in yet today."
          : `No body metrics logged in ${daysSinceLastMetric} days.`,
      hint: phase
        ? phase.type === "Cut"
          ? "A quick morning check-in keeps the pace read cleaner."
          : "A quick check-in keeps the trend sharp without much effort."
        : "A quick weight entry helps the dashboard make better calls."
    });
  }

  if (daysSincePhoto != null && daysSincePhoto >= 14) {
    signals.push({
      kind: "guide",
      priority: 52,
      icon: "📸",
      message: `No progress photo in ${daysSincePhoto} days.`,
      hint: "A fresh check-in makes the change real."
    });
  } else if (photoCompare && photoCompare.daysApart >= 13) {
    signals.push({
      kind: "guide",
      priority: 48,
      icon: "📸",
      message: `New ${photoCompare.daysApart}-day comparison is ready.`,
      hint: "Compare today to see the difference."
    });
  }

  if (phase) {
    const proactiveByPhase = {
      Bulk: {
        message: "Lean bulk cue: keep food steady and let recovery lead.",
        hint: "Easy cardio and carbs around training usually keep this readable."
      },
      Cut: {
        message: "Cut cue: protein early and repeatable movement usually carry the week.",
        hint: "Protect lifting quality first, then let the deficit do the work."
      },
      Maintenance: {
        message: "Maintenance cue: steady meals and easy movement beat hero days.",
        hint: "The whole edge here is being boring in a good way."
      },
      "TRT Cruise": {
        message: "Cruise cue: routine usually matters more than intensity.",
        hint: "Movement, schedule timing, and calm trends make this phase easier to read."
      },
      Blast: {
        message: "Blast cue: recovery and schedule discipline keep the data useful.",
        hint: "Low-drama cardio and stable food make the trend easier to interpret."
      }
    };

    const phaseGuide = proactiveByPhase[phase.type] || proactiveByPhase.Maintenance;
    signals.push({
      kind: "guide",
      priority: 28,
      icon: "🧠",
      message: phaseGuide.message,
      hint: phaseGuide.hint
    });
  } else if (Number(profile?.age || 0) > 0 && Number(profile?.heightInches || 0) > 0) {
    signals.push({
      kind: "guide",
      priority: 40,
      icon: "🧠",
      message: "Profile saved. Start a phase and the app will take over the rest.",
      hint: "That is what turns this from a logger into a system."
    });
  }

  const proofCandidates = [];

  if (phase && phaseWeightChange != null) {
    if ((phase.type === "Bulk" || phase.type === "Blast") && phaseWeightChange > 0.2) {
      proofCandidates.push({
        score: 95,
        heading: `Up ${Math.abs(phaseWeightChange).toFixed(1)} lb since phase start.`,
        detail: `${phase.type} • Day ${phaseDay || 1}`
      });
    }

    if (phase.type === "Cut" && phaseWeightChange < -0.2) {
      proofCandidates.push({
        score: 95,
        heading: `Down ${Math.abs(phaseWeightChange).toFixed(1)} lb since phase start.`,
        detail: `${phase.type} • Day ${phaseDay || 1}`
      });
    }

    if ((phase.type === "Maintenance" || phase.type === "TRT Cruise") && Math.abs(phaseWeightChange) <= 1.5) {
      proofCandidates.push({
        score: 90,
        heading: `Weight stayed within ${Math.abs(phaseWeightChange).toFixed(1)} lb this phase.`,
        detail: `${phase.type} stability`
      });
    }
  }

  if (bodyFatChange?.diff != null && bodyFatChange.diff < -0.2) {
    proofCandidates.push({
      score: phase?.type === "Cut" ? 92 : 72,
      heading: `Body fat down ${Math.abs(bodyFatChange.diff).toFixed(1)}% this cycle.`,
      detail: `${bodyFatChange.startDate} → ${bodyFatChange.endDate}`
    });
  }

  if (muscleChange?.diff != null && muscleChange.diff > 0.2) {
    proofCandidates.push({
      score: phase?.type === "Bulk" || phase?.type === "Blast" ? 92 : 68,
      heading: `Skeletal muscle up ${muscleChange.diff.toFixed(1)} lb this cycle.`,
      detail: `${muscleChange.startDate} → ${muscleChange.endDate}`
    });
  }

  const onPlan14 = last14Dates.filter((date) => macroMet(date)).length;
  if (caloriesTarget != null && onPlan14 > 0) {
    proofCandidates.push({
      score: 84,
      heading: `On-plan ${onPlan14} of the last 14 days.`,
      detail: "Calorie consistency"
    });
  }

  const proteinHits14 = last14Dates.filter((date) => proteinMet(date)).length;
  if (proteinTarget != null && proteinHits14 > 0) {
    proofCandidates.push({
      score: 78,
      heading: `Protein target hit ${proteinHits14} of the last 14 days.`,
      detail: "Protein adherence"
    });
  }

  if (protocolAdherencePercent != null) {
    proofCandidates.push({
      score: phase?.type === "TRT Cruise" || phase?.type === "Blast" ? 88 : 70,
      heading: `Protocol adherence ${protocolAdherencePercent}% over 14 days.`,
      detail: "Scheduled doses logged"
    });
  }

  if (workoutsThisWeek > 0) {
    proofCandidates.push({
      score: 68,
      heading: `${workoutsThisWeek} workout${workoutsThisWeek === 1 ? "" : "s"} logged this week.`,
      detail: `${workoutTarget} planned`
    });
  }

  if (photoCompare?.deltaWeight != null) {
    proofCandidates.push({
      score: 62,
      heading: `You are ${formatSigned(photoCompare.deltaWeight, " lb")} from this compare.`,
      detail: `${photoCompare.daysApart} days apart`
    });
  }

  const proofMetrics = proofCandidates
    .sort((left, right) => right.score - left.score)
    .filter((candidate, index, list) => list.findIndex((item) => item.heading === candidate.heading) === index)
    .slice(0, 3);

  const weeklyRecap = {
    avgCalories7,
    avgProtein7,
    nutritionLogged7: nutritionLogged7.length,
    weightChange: weeklyWeightChange,
    workoutsThisWeek,
    pace: pace.short,
    paceTone: pace.tone,
    protocolAdherencePercent,
    caloriesTarget,
    proteinTarget,
    onPlan7: last7Dates.filter((date) => macroMet(date)).length,
    proteinHits7: last7Dates.filter((date) => proteinMet(date)).length
  };

  const selectedSignals = pickTopSignals(signals);
  const streaks = [macroStreak, proteinStreak, workoutWindow, checkInStreak, weightStreak];
  if (scheduleStatuses.length) streaks.splice(2, 0, protocolStreak);

  const atRiskMessage =
    streaks.find((item) => item.state === "at-risk")?.helper ||
    streaks.find((item) => item.state === "broken")?.helper ||
    "Consistency is clean right now.";

  return {
    phaseSummary: {
      active: !!phase,
      type: phase?.type || "",
      name: phase?.name || "No active phase",
      icon: phase ? getPhasePreset(phase.type).icon : "🧭",
      dayNumber: phaseDay,
      targetLabel: getPhaseTargetLabel(phase),
      targetText: formatPhaseTarget(phase),
      paceMessage: pace.message,
      paceTone: pace.tone,
      currentWeight: latestWeightPoint?.weight ?? null,
      startWeight: safeNumber(phase?.startWeight) ?? phaseStartPoint?.weight ?? null,
      phaseWeightChange,
      calorieTarget: caloriesTarget,
      proteinTarget,
      workoutTarget
    },
    signals: selectedSignals,
    streaks,
    atRiskMessage,
    proofMetrics,
    weeklyRecap,
    photoCompare,
    photoMetaMap: buildPhotoMetaMap(progressPhotos, bodyMetrics, phases),
    protocol: {
      scheduleStatuses,
      adherencePercent: protocolAdherencePercent,
      dueTodayCount: scheduleStatuses.filter((status) => status.daysAway === 0 && !status.injectedToday).length,
      overdueCount: scheduleStatuses.filter((status) => status.daysAway < 0 && !status.injectedToday).length
    },
    bodyMetrics: {
      lastLoggedDate: lastBodyMetric?.date || null,
      lastLoggedLabel: lastMetricLabel,
      daysSinceLastMetric,
      reminderGap: metricReminderGap,
      needsReminder: daysSinceLastMetric == null || daysSinceLastMetric >= metricReminderGap
    }
  };
}
