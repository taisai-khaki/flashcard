/**
 * Read-only analytics over a learner's stored history.
 *
 * Everything here is a pure function of the app state, so the progress page can
 * be rendered from the same data the study flow already records — no separate
 * counters to keep in sync, and nothing is written back.
 */
import {
  LEVEL_COUNT,
  ROUND_SIZE,
  getLevelCounts,
  getReadyCount,
  getStats,
  isLevelReady,
} from './flashcards.js';

const DAY_MS = 86_400_000;

function startOfDay(value) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

/** Local-time bucket key, so a day means the same thing to the learner as to us. */
export function dayKey(value) {
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function addDays(date, amount) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function isValidDate(value) {
  const date = new Date(value);
  return !Number.isNaN(date.getTime());
}

function historyEntries(state) {
  return (state?.history ?? []).filter((entry) => entry?.answeredAt && isValidDate(entry.answeredAt));
}

/** One bucket per day across the window, oldest first, with any answers counted in. */
export function getDayBuckets(state, days = 30, now = new Date()) {
  const end = startOfDay(now);
  const buckets = new Map();

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = addDays(end, -offset);
    const key = dayKey(date);
    buckets.set(key, { key, date, total: 0, correct: 0, incorrect: 0, graduated: 0 });
  }

  for (const entry of historyEntries(state)) {
    const bucket = buckets.get(dayKey(entry.answeredAt));
    if (!bucket) continue;
    bucket.total += 1;
    if (entry.correct) bucket.correct += 1;
    else bucket.incorrect += 1;
    if (entry.correct && Number(entry.toLevel) >= LEVEL_COUNT) bucket.graduated += 1;
  }

  return [...buckets.values()];
}

export function summarizeBuckets(buckets) {
  let total = 0;
  let correct = 0;
  let incorrect = 0;
  let graduated = 0;
  let activeDays = 0;
  let bestDay = null;

  for (const bucket of buckets) {
    total += bucket.total;
    correct += bucket.correct;
    incorrect += bucket.incorrect;
    graduated += bucket.graduated ?? 0;
    if (bucket.total > 0) activeDays += 1;
    if (!bestDay || bucket.total > bestDay.total) bestDay = bucket;
  }

  return {
    total,
    correct,
    incorrect,
    graduated,
    activeDays,
    accuracy: total ? Math.round((correct / total) * 100) : null,
    averagePerActiveDay: activeDays ? total / activeDays : 0,
    bestDay: bestDay && bestDay.total > 0 ? bestDay : null,
  };
}

/** Current window against the immediately preceding window of the same length. */
export function getPeriodComparison(state, days = 30, now = new Date()) {
  const current = summarizeBuckets(getDayBuckets(state, days, now));
  const previousStart = addDays(startOfDay(now), -days);
  const previous = summarizeBuckets(getDayBuckets(state, days, previousStart));

  return {
    current,
    previous,
    deltas: {
      total: current.total - previous.total,
      graduated: current.graduated - previous.graduated,
      accuracy:
        current.accuracy === null || previous.accuracy === null
          ? null
          : current.accuracy - previous.accuracy,
      activeDays: current.activeDays - previous.activeDays,
    },
  };
}

/** Consecutive days with at least one answer, counted back from today (or yesterday). */
export function getStreak(state, now = new Date()) {
  const days = new Set(historyEntries(state).map((entry) => dayKey(entry.answeredAt)));
  if (days.size === 0) {
    return { current: 0, longest: 0, practicedToday: false, lastDay: null, totalDays: 0 };
  }

  const sorted = [...days].sort();
  let longest = 1;
  let run = 1;
  for (let index = 1; index < sorted.length; index += 1) {
    const previous = new Date(`${sorted[index - 1]}T00:00:00`);
    const currentDate = new Date(`${sorted[index]}T00:00:00`);
    const gap = Math.round((currentDate - previous) / DAY_MS);
    run = gap === 1 ? run + 1 : 1;
    if (run > longest) longest = run;
  }

  const todayKey = dayKey(now);
  let cursor = startOfDay(now);
  if (!days.has(todayKey)) cursor = addDays(cursor, -1);

  let current = 0;
  while (days.has(dayKey(cursor))) {
    current += 1;
    cursor = addDays(cursor, -1);
  }

  return {
    current,
    longest,
    practicedToday: days.has(todayKey),
    lastDay: sorted[sorted.length - 1],
    totalDays: days.size,
  };
}

/** Levels 1–4 accuracy, measured by the level a card was answered from. */
export function getLevelAccuracy(state) {
  const rows = Array.from({ length: LEVEL_COUNT - 1 }, (_, index) => ({
    level: index + 1,
    correct: 0,
    incorrect: 0,
    total: 0,
    accuracy: null,
  }));

  for (const entry of historyEntries(state)) {
    const index = Number(entry.fromLevel) - 1;
    if (index < 0 || index >= rows.length) continue;
    if (entry.correct) rows[index].correct += 1;
    else rows[index].incorrect += 1;
  }

  return rows.map((row) => {
    const total = row.correct + row.incorrect;
    return { ...row, total, accuracy: total ? Math.round((row.correct / total) * 100) : null };
  });
}

/** How many answers moved a word up, down, or all the way to learned. */
export function getLevelMovement(state) {
  let promoted = 0;
  let demoted = 0;
  let held = 0;
  let graduated = 0;

  for (const entry of historyEntries(state)) {
    const from = Number(entry.fromLevel);
    const to = Number(entry.toLevel);
    if (!Number.isFinite(from) || !Number.isFinite(to)) continue;
    if (to > from) promoted += 1;
    else if (to < from) demoted += 1;
    else held += 1;
    if (to >= LEVEL_COUNT && entry.correct) graduated += 1;
  }

  return { promoted, demoted, held, graduated };
}

/** Words the learner has missed at least once, hardest first. */
export function getToughestWords(state, limit = 6) {
  return state.words
    .filter((word) => word.incorrectCount > 0)
    .sort((a, b) => b.incorrectCount - a.incorrectCount || a.correctCount - b.correctCount)
    .slice(0, limit)
    .map((word) => ({
      id: word.id,
      spanish: word.spanish,
      english: word.english,
      misses: word.incorrectCount,
      hits: word.correctCount,
      level: word.level,
      status: word.status,
      accuracy: Math.round((word.correctCount / (word.correctCount + word.incorrectCount)) * 100),
    }));
}

/** Hour of day with the most answers, in the learner's local time. */
export function getBestHour(state) {
  const hours = new Map();
  for (const entry of historyEntries(state)) {
    const hour = new Date(entry.answeredAt).getHours();
    hours.set(hour, (hours.get(hour) ?? 0) + 1);
  }

  let best = null;
  for (const [hour, count] of hours) {
    if (!best || count > best.count) best = { hour, count };
  }
  return best;
}

/** GitHub-style grid of weeks, aligned to the learner's week start (Sunday). */
export function getActivityWeeks(state, weeks = 13, now = new Date()) {
  const end = startOfDay(now);
  const trailing = end.getDay();
  const lastCell = addDays(end, 6 - trailing);
  const firstCell = addDays(lastCell, -(weeks * 7 - 1));

  const counts = new Map();
  for (const entry of historyEntries(state)) {
    const key = dayKey(entry.answeredAt);
    const bucket = counts.get(key) ?? { key, total: 0, correct: 0 };
    bucket.total += 1;
    if (entry.correct) bucket.correct += 1;
    counts.set(key, bucket);
  }

  const grid = [];
  for (let week = 0; week < weeks; week += 1) {
    const days = [];
    for (let weekday = 0; weekday < 7; weekday += 1) {
      const date = addDays(firstCell, week * 7 + weekday);
      const key = dayKey(date);
      const bucket = counts.get(key);
      days.push({
        key,
        date,
        total: bucket?.total ?? 0,
        correct: bucket?.correct ?? 0,
        isFuture: date > end,
        isToday: key === dayKey(end),
      });
    }
    grid.push(days);
  }

  const max = Math.max(1, ...grid.flat().map((day) => day.total));
  return { grid, max, start: firstCell, end: lastCell };
}

/** 0–4 intensity used for heatmap shading. */
export function intensityFor(total, max) {
  if (!total) return 0;
  const ratio = total / max;
  if (ratio > 0.66) return 4;
  if (ratio > 0.4) return 3;
  if (ratio > 0.15) return 2;
  return 1;
}

/**
 * A rough but honest projection: how many answers are left before every word in
 * the bank is learned, and how long that takes at the learner's current pace.
 */
export function getForecast(state, days = 30, now = new Date()) {
  const stats = getStats(state);
  const { current } = getPeriodComparison(state, days, now);

  const answersNeeded = state.words.reduce((total, word) => {
    if (word.status === 'learned') return total;
    if (word.status === 'banked') return total + LEVEL_COUNT - 1;
    return total + Math.max(0, LEVEL_COUNT - Number(word.level ?? 1));
  }, 0);

  const accuracyRate = current.accuracy === null ? null : Math.max(current.accuracy, 5) / 100;
  const pace = current.averagePerActiveDay;
  const expectedAnswers = accuracyRate === null ? null : Math.ceil(answersNeeded / accuracyRate);
  const daysRemaining =
    expectedAnswers === null || pace <= 0 ? null : Math.ceil(expectedAnswers / pace);

  const readyLevels = [1, 2, 3, 4]
    .map((level) => ({ level, ready: isLevelReady(state, level), count: getReadyCount(state, level) }))
    .filter((item) => item.ready && item.count > 0);

  return {
    answersNeeded,
    expectedAnswers,
    daysRemaining,
    pace,
    readyLevels,
    readyWords: readyLevels.reduce((total, item) => total + item.count, 0),
    remainingWords: stats.total - stats.learned,
    projectedDate: daysRemaining === null ? null : addDays(startOfDay(now), daysRemaining),
    hasPace: pace > 0 && current.total > 0,
  };
}

/** Short, specific sentences generated from the learner's own numbers. */
export function getInsights(state, days = 30, now = new Date()) {
  const { current, previous, deltas } = getPeriodComparison(state, days, now);
  const levelAccuracy = getLevelAccuracy(state);
  const toughest = getToughestWords(state, 1);
  const bestHour = getBestHour(state);
  const stats = getStats(state);
  const insights = [];

  if (current.total === 0) return insights;

  if (deltas.accuracy !== null && previous.total > 0 && Math.abs(deltas.accuracy) >= 3) {
    insights.push({
      id: 'accuracy',
      tone: deltas.accuracy > 0 ? 'good' : 'warn',
      text:
        deltas.accuracy > 0
          ? `Accuracy is up ${deltas.accuracy} points versus the previous ${days} days.`
          : `Accuracy is down ${Math.abs(deltas.accuracy)} points versus the previous ${days} days — shorter rounds usually help.`,
    });
  }

  if (bestHour && bestHour.count >= 5) {
    const label = new Intl.DateTimeFormat('en', { hour: 'numeric' }).format(
      new Date(2020, 0, 1, bestHour.hour),
    );
    insights.push({
      id: 'hour',
      tone: 'info',
      text: `Your busiest hour is around ${label} — ${bestHour.count} answers landed there.`,
    });
  }

  const rated = levelAccuracy.filter((row) => row.accuracy !== null && row.total >= 3);
  if (rated.length) {
    const weakest = rated.reduce((low, row) => (row.accuracy < low.accuracy ? row : low), rated[0]);
    const strongest = rated.reduce((high, row) => (row.accuracy > high.accuracy ? row : high), rated[0]);
    if (weakest.level !== strongest.level) {
      insights.push({
        id: 'levels',
        tone: weakest.accuracy < 70 ? 'warn' : 'info',
        text: `Level ${strongest.level} is your strongest at ${strongest.accuracy}%. Level ${weakest.level} sits at ${weakest.accuracy}%.`,
      });
    }
  }

  if (toughest.length) {
    insights.push({
      id: 'tough',
      tone: 'warn',
      text: `“${toughest[0].spanish}” has tripped you up ${toughest[0].misses} ${toughest[0].misses === 1 ? 'time' : 'times'}. It is worth one more look.`,
    });
  }

  const consistency = days ? Math.round((current.activeDays / days) * 100) : 0;
  if (current.activeDays >= 3) {
    insights.push({
      id: 'consistency',
      tone: consistency >= 50 ? 'good' : 'info',
      text: `You practised on ${current.activeDays} of the last ${days} days — ${consistency}% consistency.`,
    });
  }

  if (stats.banked > 0) {
    insights.push({
      id: 'banked',
      tone: 'info',
      text: `${stats.banked} ${stats.banked === 1 ? 'word is' : 'words are'} still waiting in your bank for a Level 1 place.`,
    });
  }

  return insights.slice(0, 4);
}

/** Everything the progress page renders, in one pass. */
export function getProgressReport(state, days = 30, now = new Date()) {
  const stats = getStats(state);
  const comparison = getPeriodComparison(state, days, now);
  const levelCounts = getLevelCounts(state);

  return {
    days,
    stats,
    levelCounts,
    buckets: getDayBuckets(state, days, now),
    comparison,
    streak: getStreak(state, now),
    levelAccuracy: getLevelAccuracy(state),
    movement: getLevelMovement(state),
    toughest: getToughestWords(state),
    activity: getActivityWeeks(state, 13, now),
    forecast: getForecast(state, days, now),
    insights: getInsights(state, days, now),
    hasHistory: historyEntries(state).length > 0,
  };
}

export const ANALYTICS_WINDOWS = [
  { id: 7, label: '7 days' },
  { id: 30, label: '30 days' },
  { id: 90, label: '90 days' },
];

export const PROGRESS_LEVEL_TONES = ['sage', 'blue', 'violet', 'amber', 'gold'];
export { ROUND_SIZE };
