import test from 'node:test';
import assert from 'node:assert/strict';
import { SEED_WORDS } from '../data/seedWords.js';
import { FIRST_PERSON_VERB_FORMS, YO_CONJUGATION_CARDS } from '../data/regularConjugations.js';
import {
  addWords,
  createEmptyState,
  createSession,
  getStats,
  isLevelReady,
  parseWordLines,
  recordAnswer,
  finishSession,
  ROUND_SIZE,
} from './flashcards.js';

function pairs(count) {
  return Array.from({ length: count }, (_, index) => ({
    spanish: `palabra${index + 1}`,
    english: `word${index + 1}`,
  }));
}

test('the vocabulary bank retains all 858 complete unique pairs', () => {
  assert.equal(SEED_WORDS.length, 858);
  assert.ok(SEED_WORDS.every((word) => word.spanish.trim() && word.english.trim()));
  const keys = SEED_WORDS.map((word) => JSON.stringify([word.english.toLocaleLowerCase(), word.spanish.toLocaleLowerCase()]));
  assert.equal(new Set(keys).size, SEED_WORDS.length);
});

test('116 verbs each contribute present and preterite forms without yo', () => {
  assert.equal(FIRST_PERSON_VERB_FORMS.length, 116);
  assert.equal(YO_CONJUGATION_CARDS.length, 232);
  assert.ok(YO_CONJUGATION_CARDS.every((word) => !word.spanish.toLocaleLowerCase().startsWith('yo ')));
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
  state = recordAnswer(state, id, true);
  assert.equal(state.words[0].level, 2);
  state = recordAnswer(state, id, false);
  assert.equal(state.words[0].level, 1);
});

test('correctly reaching Level 5 marks the word learned permanently', () => {
  let state = addWords(createEmptyState(), pairs(1)).state;
  const id = state.words[0].id;
  state = recordAnswer(state, id, true);
  state = recordAnswer(state, id, true);
  state = recordAnswer(state, id, true);
  state = recordAnswer(state, id, true);

  assert.equal(state.words[0].level, 5);
  assert.equal(state.words[0].status, 'learned');
  assert.equal(getStats(state).learned, 1);
  assert.equal(recordAnswer(state, id, false), state);
});

test('upper levels wait for 50 unless no earlier-stage words remain', () => {
  let state = addWords(createEmptyState(), pairs(50)).state;
  const first = state.words[0];
  state = recordAnswer(state, first.id, true);
  assert.equal(isLevelReady(state, 2), false);

  state = {
    ...state,
    words: state.words.map((word) =>
      word.level === 1 ? { ...word, status: 'learned', level: 5 } : word,
    ),
  };
  assert.equal(isLevelReady(state, 2), true);
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
