import test from 'node:test';
import assert from 'node:assert/strict';
import { addWords, createEmptyState, recordAnswer } from './flashcards.js';
import {
  ANALYTICS_WINDOWS,
  getActivityWeeks,
  getBestHour,
  getDayBuckets,
  getForecast,
  getInsights,
  getLevelAccuracy,
  getLevelMovement,
  getPeriodComparison,
  getProgressReport,
  getStreak,
  getToughestWords,
  intensityFor,
  summarizeBuckets,
} from './analytics.js';

/** Noon local time keeps generated dates on the intended calendar day in any timezone. */
function at(dayOfMonth, hour = 12) {
  return new Date(2026, 2, dayOfMonth, hour, 0, 0).toISOString();
}

const NOW = new Date(2026, 2, 15, 12, 0, 0);

function seed(count) {
  const pairs = Array.from({ length: count }, (_, index) => ({
    spanish: `palabra${index + 1}`,
    english: `word${index + 1}`,
  }));
  return addWords(createEmptyState(), pairs).state;
}

test('day buckets cover the whole window and count answers per local day', () => {
  let state = seed(4);
  state = recordAnswer(state, state.words[0].id, true, at(14));
  state = recordAnswer(state, state.words[1].id, false, at(14));
  state = recordAnswer(state, state.words[2].id, true, at(10));

  const buckets = getDayBuckets(state, 30, NOW);
  assert.equal(buckets.length, 30);
  assert.equal(buckets.at(-1).total, 0, 'nothing was answered on Mar 15 itself');
  assert.equal(buckets.at(-2).total, 2);
  assert.equal(buckets.at(-2).correct, 1);
  assert.equal(buckets.at(-2).incorrect, 1);
  assert.equal(buckets.at(-6).total, 1, 'Mar 10 sits five days back from Mar 15');
  assert.equal(buckets[0].total, 0, 'days outside the window are not counted');
});

test('summaries report accuracy, active days and the best day', () => {
  let state = seed(4);
  state = recordAnswer(state, state.words[0].id, true, at(14));
  state = recordAnswer(state, state.words[1].id, true, at(14));
  state = recordAnswer(state, state.words[2].id, false, at(12));

  const summary = summarizeBuckets(getDayBuckets(state, 30, NOW));
  assert.equal(summary.total, 3);
  assert.equal(summary.correct, 2);
  assert.equal(summary.accuracy, 67);
  assert.equal(summary.activeDays, 2);
  assert.equal(summary.bestDay.total, 2);
});

test('a window with no answers reports null accuracy rather than zero', () => {
  const summary = summarizeBuckets(getDayBuckets(seed(2), 7, NOW));
  assert.equal(summary.total, 0);
  assert.equal(summary.accuracy, null);
  assert.equal(summary.bestDay, null);
});

test('period comparison measures the current window against the previous one', () => {
  let state = seed(4);
  // Previous 7-day window: Mar 5. Current window: Mar 12 onwards.
  state = recordAnswer(state, state.words[0].id, true, at(4));
  state = recordAnswer(state, state.words[0].id, true, at(11));
  state = recordAnswer(state, state.words[1].id, true, at(11));

  const { current, previous, deltas } = getPeriodComparison(state, 7, NOW);
  assert.equal(previous.total, 1);
  assert.equal(current.total, 2);
  assert.equal(deltas.total, 1);
  assert.equal(deltas.accuracy, 0);
});

test('streaks count consecutive days and survive a day not yet practised', () => {
  let state = seed(6);
  state = recordAnswer(state, state.words[0].id, true, at(12));
  state = recordAnswer(state, state.words[1].id, true, at(13));
  state = recordAnswer(state, state.words[2].id, true, at(14));
  state = recordAnswer(state, state.words[3].id, false, at(8));

  const streak = getStreak(state, NOW);
  assert.equal(streak.current, 3);
  assert.equal(streak.longest, 3);
  assert.equal(streak.practicedToday, false, 'nothing answered on Mar 15 yet');
  assert.equal(streak.totalDays, 4);
});

test('streak keeps today alive when the learner has already practised', () => {
  let state = seed(3);
  state = recordAnswer(state, state.words[0].id, true, at(15));
  state = recordAnswer(state, state.words[1].id, true, at(15, 9));

  const streak = getStreak(state, NOW);
  assert.equal(streak.current, 1);
  assert.equal(streak.practicedToday, true);
});

test('a fresh bank has no streak at all', () => {
  const streak = getStreak(seed(3), NOW);
  assert.deepEqual(
    { current: streak.current, longest: streak.longest, practicedToday: streak.practicedToday },
    { current: 0, longest: 0, practicedToday: false },
  );
});

test('level accuracy is attributed to the level the card was answered from', () => {
  let state = seed(3);
  const id = state.words[0].id;
  state = recordAnswer(state, id, true, at(10)); // from Level 1
  state = recordAnswer(state, id, false, at(11)); // from Level 2
  state = recordAnswer(state, id, false, at(12)); // back to Level 1

  const rows = getLevelAccuracy(state);
  assert.equal(rows[0].total, 2);
  assert.equal(rows[0].accuracy, 50);
  assert.equal(rows[1].total, 1);
  assert.equal(rows[1].accuracy, 0);
  assert.equal(rows[2].accuracy, null, 'levels never answered stay unknown');
});

test('movement counts promotions, demotions and graduations', () => {
  let state = seed(2);
  const id = state.words[0].id;
  state = recordAnswer(state, id, true, at(10)); // 1 -> 2 promoted
  state = recordAnswer(state, id, false, at(11)); // 2 -> 1 demoted
  state = recordAnswer(state, state.words[1].id, true, at(12));
  state = recordAnswer(state, state.words[1].id, true, at(12, 13));
  state = recordAnswer(state, state.words[1].id, true, at(13));
  state = recordAnswer(state, state.words[1].id, true, at(13, 15));

  const movement = getLevelMovement(state);
  assert.equal(movement.promoted, 5, 'one promotion for word one, four to graduate word two');
  assert.equal(movement.demoted, 1);
  assert.equal(movement.graduated, 1);
});

test('toughest words are ranked by misses and ignore unmissed words', () => {
  let state = seed(4);
  state = recordAnswer(state, state.words[0].id, false, at(10));
  state = recordAnswer(state, state.words[0].id, true, at(10, 13));
  state = recordAnswer(state, state.words[0].id, false, at(11));
  state = recordAnswer(state, state.words[1].id, true, at(11, 15));
  state = recordAnswer(state, state.words[2].id, false, at(12));

  const tough = getToughestWords(state, 5);
  assert.equal(tough.length, 2);
  assert.equal(tough[0].id, state.words[0].id);
  assert.equal(tough[0].misses, 2);
  assert.equal(tough[0].accuracy, 33);
  assert.equal(tough[1].misses, 1);
});

test('the activity grid is 13 weeks wide and marks today', () => {
  let state = seed(3);
  state = recordAnswer(state, state.words[0].id, true, at(14));

  const { grid, max } = getActivityWeeks(state, 13, NOW);
  assert.equal(grid.length, 13);
  assert.ok(grid.every((week) => week.length === 7));
  assert.equal(grid.flat().length, 91);

  const flat = grid.flat();
  assert.equal(flat.filter((day) => day.isToday).length, 1);
  assert.equal(flat.at(-1).date.getDay(), 6, 'the grid ends on the Saturday of the current week');
  assert.equal(flat.filter((day) => day.isFuture).length, 6, 'Mar 15 2026 is a Sunday');
  assert.equal(max, 1);
  assert.equal(intensityFor(0, max), 0);
  assert.equal(intensityFor(1, max), 4);
});

test('intensity scales across four shades', () => {
  assert.equal(intensityFor(1, 20), 1);
  assert.equal(intensityFor(4, 20), 2);
  assert.equal(intensityFor(10, 20), 3);
  assert.equal(intensityFor(18, 20), 4);
});

test('best hour reflects the learner local clock', () => {
  let state = seed(4);
  state = recordAnswer(state, state.words[0].id, true, at(10, 21));
  state = recordAnswer(state, state.words[1].id, true, at(11, 21));
  state = recordAnswer(state, state.words[2].id, true, at(12, 8));

  assert.deepEqual(getBestHour(state), { hour: 21, count: 2 });
});

test('forecast needs four answers per untouched word and no pace before practice', () => {
  const state = seed(3);
  const forecast = getForecast(state, 30, NOW);
  assert.equal(forecast.answersNeeded, 12);
  assert.equal(forecast.hasPace, false);
  assert.equal(forecast.daysRemaining, null);
  assert.equal(forecast.projectedDate, null);
  assert.equal(forecast.readyWords, 3, 'Level 1 is a short set, but it is ready');
});

test('forecast projects a finish date once there is a measurable pace', () => {
  let state = seed(3);
  state = recordAnswer(state, state.words[0].id, true, at(14));
  state = recordAnswer(state, state.words[1].id, true, at(14, 13));

  const forecast = getForecast(state, 30, NOW);
  assert.equal(forecast.hasPace, true);
  assert.equal(forecast.pace, 2);
  assert.equal(forecast.answersNeeded, 10, 'two words sit at Level 2, one is still at Level 1');
  assert.equal(forecast.expectedAnswers, 10, 'perfect accuracy means no retries are expected');
  assert.equal(forecast.daysRemaining, 5);
  assert.equal(forecast.projectedDate.getDate(), 20);
});

test('insights stay silent until there is something to say', () => {
  assert.deepEqual(getInsights(seed(3), 30, NOW), []);
});

test('insights are drawn from the learner own numbers', () => {
  let state = seed(4);
  state = recordAnswer(state, state.words[0].id, true, at(10, 21));
  state = recordAnswer(state, state.words[0].id, true, at(11, 21));
  state = recordAnswer(state, state.words[1].id, false, at(12, 21));
  state = recordAnswer(state, state.words[2].id, true, at(13));
  state = recordAnswer(state, state.words[3].id, false, at(14));

  const insights = getInsights(state, 30, NOW);
  assert.ok(insights.length > 0);
  assert.ok(insights.length <= 4);
  assert.ok(insights.every((insight) => typeof insight.text === 'string' && insight.text.length > 0));
  assert.equal(new Set(insights.map((insight) => insight.id)).size, insights.length);
  assert.ok(insights.some((insight) => insight.id === 'tough'));
});

test('the progress report is empty-but-safe for a fresh bank', () => {
  const report = getProgressReport(seed(5), 30, NOW);
  assert.equal(report.hasHistory, false);
  assert.equal(report.insights.length, 0);
  assert.equal(report.streak.current, 0);
  assert.equal(report.buckets.length, 30);
  assert.equal(report.activity.grid.length, 13);
  assert.equal(report.forecast.hasPace, false);
});

test('the progress report reflects real study activity', () => {
  let state = seed(4);
  state = recordAnswer(state, state.words[0].id, true, at(14));
  state = recordAnswer(state, state.words[1].id, false, at(14, 20));

  const report = getProgressReport(state, 30, NOW);
  assert.equal(report.hasHistory, true);
  assert.equal(report.comparison.current.total, 2);
  assert.equal(report.comparison.current.accuracy, 50);
  assert.equal(report.streak.current, 1);
  assert.equal(report.movement.promoted, 1);
  assert.equal(report.stats.learned, 0);
});

test('analytics windows cover a week, a month and a quarter', () => {
  assert.deepEqual(
    ANALYTICS_WINDOWS.map((window) => window.id),
    [7, 30, 90],
  );
});
