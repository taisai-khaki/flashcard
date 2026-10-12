import test from 'node:test';
import assert from 'node:assert/strict';
import { SEED_WORDS } from '../data/seedWords.js';
import { FIRST_PERSON_VERB_FORMS, YO_CONJUGATION_CARDS } from '../data/regularConjugations.js';
import { IRREGULAR_VERB_CARDS, IRREGULAR_VERB_COUNT } from '../data/irregularConjugations.js';
import {
  addWords,
  createEmptyState,
  createSession,
  getDueCount,
  getNextReviewAt,
  getStats,
  isLevelReady,
  parseWordLines,
  recordAnswer,
  finishSession,
  REVIEW_COOLDOWN_MS,
  ROUND_SIZE,
} from './flashcards.js';

function pairs(count) {
  return Array.from({ length: count }, (_, index) => ({
    spanish: `palabra${index + 1}`,
    english: `word${index + 1}`,
  }));
}

test('the vocabulary bank retains all 1518 complete unique pairs', () => {
  assert.equal(SEED_WORDS.length, 1518);
  assert.ok(SEED_WORDS.every((word) => word.spanish.trim() && word.english.trim()));
  const keys = SEED_WORDS.map((word) => JSON.stringify([word.english.toLocaleLowerCase(), word.spanish.toLocaleLowerCase()]));
  assert.equal(new Set(keys).size, SEED_WORDS.length);
});

test('116 verbs each contribute present and preterite forms without yo', () => {
  assert.equal(FIRST_PERSON_VERB_FORMS.length, 116);
  assert.equal(YO_CONJUGATION_CARDS.length, 232);
  assert.ok(YO_CONJUGATION_CARDS.every((word) => !word.spanish.toLocaleLowerCase().startsWith('yo ')));
});

test('66 irregular verbs each contribute five present and five preterite cards without subjects', () => {
  assert.equal(IRREGULAR_VERB_COUNT, 66);
  assert.equal(IRREGULAR_VERB_CARDS.length, 660);
  const subjectLabels = ['yo ', 'tú ', 'él ', 'ella ', 'usted ', 'nosotros ', 'nosotras ', 'ellos ', 'ellas ', 'ustedes '];
  assert.ok(IRREGULAR_VERB_CARDS.every((word) => {
    const spanish = word.spanish.toLocaleLowerCase();
    return !subjectLabels.some((label) => spanish.startsWith(label));
  }));
});

test('the bank fills Level 1 to 50 and leaves the rest waiting', () => {
  const result = addWords(createEmptyState(), pairs(53));
  assert.equal(result.added, 53);
  assert.equal(result.state.words.filter((word) => word.level === 1).length, ROUND_SIZE);
  assert.equal(getStats(result.state).banked, 3);
});

test('a completed Level 1 round tops up empty places from the bank', () => {
  let state = addWords(createEmptyState(), pairs(51)).state;
  const firstWord = state.words[0];
  state = recordAnswer(state, firstWord.id, true, '2026-10-11T10:00:00.000Z');
  state = finishSession(state, 1);

  assert.equal(state.words.find((word) => word.id === firstWord.id).level, 2);
  assert.equal(state.words.filter((word) => word.level === 1).length, ROUND_SIZE);
  assert.equal(state.words.filter((word) => word.status === 'banked').length, 0);
});

test('a correct answer advances and a wrong upper-level answer drops one level', () => {
  let state = addWords(createEmptyState(), pairs(1)).state;
  const id = state.words[0].id;
  const firstAnswerAt = '2026-10-10T10:00:00.000Z';
  state = recordAnswer(state, id, true, firstAnswerAt);
  assert.equal(state.words[0].level, 2);
  const secondAnswerAt = new Date(Date.parse(firstAnswerAt) + REVIEW_COOLDOWN_MS).toISOString();
  state = recordAnswer(state, id, false, secondAnswerAt);
  assert.equal(state.words[0].level, 1);
});

test('a word promoted to the next level is unavailable for a full 24 hours', () => {
  let state = addWords(createEmptyState(), pairs(1)).state;
  const id = state.words[0].id;
  const answeredAt = '2026-10-10T10:00:00.000Z';
  const answeredTimestamp = Date.parse(answeredAt);
  const availableAt = new Date(answeredTimestamp + REVIEW_COOLDOWN_MS).toISOString();
  state = recordAnswer(state, id, true, answeredAt);

  assert.equal(state.words[0].nextReviewAt, availableAt);
  assert.equal(getDueCount(state, 2, answeredTimestamp + REVIEW_COOLDOWN_MS - 1), 0);
  assert.equal(isLevelReady(state, 2, answeredTimestamp + REVIEW_COOLDOWN_MS - 1), false);
  assert.equal(createSession(state, 2, 'es-en', Math.random, answeredTimestamp + REVIEW_COOLDOWN_MS - 1), null);
  assert.equal(getDueCount(state, 2, availableAt), 1);
  assert.equal(getNextReviewAt(state, 2, answeredAt), availableAt);
  assert.equal(createSession(state, 2, 'es-en', Math.random, availableAt).cards.length, 1);
});

test('a word demoted to Level 1 also rests for a full day before review', () => {
  let state = addWords(createEmptyState(), pairs(1)).state;
  const id = state.words[0].id;
  const promotedAt = '2026-10-10T10:00:00.000Z';
  state = recordAnswer(state, id, true, promotedAt);
  const demotedAt = new Date(Date.parse(promotedAt) + REVIEW_COOLDOWN_MS).toISOString();
  state = recordAnswer(state, id, false, demotedAt);

  assert.equal(state.words[0].level, 1);
  assert.equal(isLevelReady(state, 1, demotedAt), false);
  assert.equal(createSession(state, 1, 'es-en', Math.random, demotedAt), null);
  assert.equal(getDueCount(state, 1, Date.parse(demotedAt) + REVIEW_COOLDOWN_MS), 1);
});

test('saved cards from before the cooldown use their last-answer time as a fallback', () => {
  const answeredAt = '2026-10-10T10:00:00.000Z';
  const state = addWords(createEmptyState(), pairs(1)).state;
  const legacyWord = { ...state.words[0], lastAnsweredAt: answeredAt };
  delete legacyWord.nextReviewAt;
  const restored = { ...state, words: [legacyWord] };
  const availableAt = new Date(Date.parse(answeredAt) + REVIEW_COOLDOWN_MS).toISOString();

  assert.equal(isLevelReady(restored, 1, answeredAt), false);
  assert.equal(getNextReviewAt(restored, 1, answeredAt), availableAt);
  assert.equal(isLevelReady(restored, 1, availableAt), true);
});

test('sessions include only due cards from a filled level', () => {
  const now = Date.parse('2026-10-10T10:00:00.000Z');
  const nextDay = new Date(now + REVIEW_COOLDOWN_MS).toISOString();
  const state = addWords(createEmptyState(), pairs(50)).state;
  const inLevelTwo = {
    ...state,
    words: state.words.map((word, index) => ({
      ...word,
      level: 2,
      nextReviewAt: index === 0 ? null : nextDay,
    })),
  };

  assert.equal(isLevelReady(inLevelTwo, 2, now), true);
  assert.equal(getDueCount(inLevelTwo, 2, now), 1);
  assert.equal(createSession(inLevelTwo, 2, 'es-en', () => 0.5, now).cards.length, 1);
  assert.equal(isLevelReady(inLevelTwo, 2, nextDay), true);
});

test('correctly reaching Level 5 marks the word learned permanently', () => {
  let state = addWords(createEmptyState(), pairs(1)).state;
  const id = state.words[0].id;
  let answeredAt = Date.parse('2026-10-10T10:00:00.000Z');
  for (let level = 1; level < 5; level += 1) {
    state = recordAnswer(state, id, true, new Date(answeredAt).toISOString());
    answeredAt += REVIEW_COOLDOWN_MS;
  }

  assert.equal(state.words[0].level, 5);
  assert.equal(state.words[0].status, 'learned');
  assert.equal(state.words[0].nextReviewAt, null);
  assert.equal(getStats(state).learned, 1);
  assert.equal(recordAnswer(state, id, false), state);
});

test('upper levels wait for 50 unless no earlier-stage words remain', () => {
  let state = addWords(createEmptyState(), pairs(50)).state;
  const first = state.words[0];
  const answeredAt = '2026-10-10T10:00:00.000Z';
  const readyAt = new Date(Date.parse(answeredAt) + REVIEW_COOLDOWN_MS);
  state = recordAnswer(state, first.id, true, answeredAt);
  assert.equal(isLevelReady(state, 2, readyAt), false);

  state = {
    ...state,
    words: state.words.map((word) =>
      word.level === 1 ? { ...word, status: 'learned', level: 5 } : word,
    ),
  };
  assert.equal(isLevelReady(state, 2, readyAt), true);
});

test('a mixed session records a direction for every card', () => {
  const state = addWords(createEmptyState(), pairs(4)).state;
  const session = createSession(state, 1, 'mixed', () => 0.25);
  assert.equal(session.cards.length, 4);
  assert.ok(session.cards.every((card) => card.direction === 'es-en' || card.direction === 'en-es'));
});

test('word pairs can be pasted in common delimiter formats', () => {
  const parsed = parseWordLines('casa — house\nperro | dog\nagua, water\nsol\t sun\nsolo palabra');
  assert.deepEqual(parsed.entries, [
    { spanish: 'casa', english: 'house' },
    { spanish: 'perro', english: 'dog' },
    { spanish: 'agua', english: 'water' },
    { spanish: 'sol', english: 'sun' },
  ]);
  assert.deepEqual(parsed.invalidLines, [{ line: 5, text: 'solo palabra' }]);
});
