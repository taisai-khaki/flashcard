export const LEVEL_COUNT = 5;
export const ROUND_SIZE = 50;

const DATE_NOW = () => new Date().toISOString();

function makeId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `word-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function cleanText(value) {
  return String(value ?? '').trim().replace(/\s+/g, ' ');
}

function wordKey(word) {
  return `${cleanText(word.spanish).toLocaleLowerCase()}\u0000${cleanText(word.english).toLocaleLowerCase()}`;
}

export function createEmptyState() {
  return {
    words: [],
    history: [],
    sessionsCompleted: 0,
    updatedAt: DATE_NOW(),
  };
}

/** Add unique Spanish/English pairs, then top up Level 1 to a 50-word set. */
export function addWords(state, entries) {
  const known = new Set(state.words.map(wordKey));
  const additions = [];
  let skipped = 0;

  for (const entry of entries) {
    const spanish = cleanText(entry?.spanish);
    const english = cleanText(entry?.english);
    if (!spanish || !english) {
      skipped += 1;
      continue;
    }

    const candidate = { spanish, english };
    const key = wordKey(candidate);
    if (known.has(key)) {
      skipped += 1;
      continue;
    }

    known.add(key);
    additions.push({
      id: entry.id || makeId(),
      spanish,
      english,
      level: null,
      status: 'banked',
      correctCount: 0,
      incorrectCount: 0,
      addedAt: entry.addedAt || DATE_NOW(),
      lastAnsweredAt: null,
    });
  }

  const nextState = topUpLevelOne({
    ...state,
    words: [...state.words, ...additions],
    updatedAt: DATE_NOW(),
  });

  return { state: nextState, added: additions.length, skipped };
}

export function createInitialState(seedWords = []) {
  return addWords(createEmptyState(), seedWords).state;
}

/** Fill empty Level 1 places from the oldest words waiting in the bank. */
export function topUpLevelOne(state) {
  const currentLevelOne = state.words.filter(
    (word) => word.status === 'active' && word.level === 1,
  ).length;
  const slots = Math.max(0, ROUND_SIZE - currentLevelOne);
  if (!slots) return state;

  let remaining = slots;
  let changed = false;
  const words = state.words.map((word) => {
    if (remaining > 0 && word.status === 'banked') {
      remaining -= 1;
      changed = true;
      return { ...word, level: 1, status: 'active' };
    }
    return word;
  });

  return changed ? { ...state, words, updatedAt: DATE_NOW() } : state;
}

export function parseWordLines(input) {
  const entries = [];
  const invalidLines = [];

  String(input ?? '')
    .split(/\r?\n/)
    .forEach((rawLine, index) => {
      const line = rawLine.trim();
      if (!line) return;

      if (/^(spanish|español|espanol)\s*[,;|\t]/i.test(line)) return;

      // Accept common paste formats: Spanish | English, Spanish; English,
      // Spanish — English, Spanish - English, tab-separated, or CSV.
      const pair = line.match(/^(.+?)\s*(?:\||;|\t|—|–|\s+-\s+|,)\s*(.+)$/u);
      if (!pair) {
        invalidLines.push({ line: index + 1, text: line });
        return;
      }

      const spanish = cleanText(pair[1]);
      const english = cleanText(pair[2]);
      if (!spanish || !english) {
        invalidLines.push({ line: index + 1, text: line });
        return;
      }
      entries.push({ spanish, english });
    });

  return { entries, invalidLines };
}

export function getLevelCounts(state) {
  return Array.from({ length: LEVEL_COUNT }, (_, index) => {
    const level = index + 1;
    return {
      level,
      count: state.words.filter((word) => word.level === level).length,
      activeCount: state.words.filter(
        (word) => word.level === level && word.status === 'active',
      ).length,
    };
  });
}

export function getStats(state) {
  return {
    total: state.words.length,
    banked: state.words.filter((word) => word.status === 'banked').length,
    learned: state.words.filter((word) => word.status === 'learned').length,
    active: state.words.filter((word) => word.status === 'active').length,
    reviewed: state.words.reduce(
      (total, word) => total + word.correctCount + word.incorrectCount,
      0,
    ),
  };
}

function activeAtLevel(state, level) {
  return state.words.filter(
    (word) => word.status === 'active' && word.level === level,
  );
}

/**
 * Levels 2–4 normally wait until a full set of 50 accumulates. If no words
 * remain in a lower level or in the bank, a smaller final set can be reviewed
 * so a short vocabulary list can still progress all the way through.
 */
export function isLevelReady(state, level) {
  if (level < 1 || level >= LEVEL_COUNT) return false;
  const count = activeAtLevel(state, level).length;
  if (count === 0) return false;
  if (level === 1 || count >= ROUND_SIZE) return true;

  const hasWordsStillWorkingThroughEarlierStages = state.words.some(
    (word) =>
      word.status === 'banked' ||
      (word.status === 'active' && word.level < level),
  );
  return !hasWordsStillWorkingThroughEarlierStages;
}

export function getReadyCount(state, level) {
  if (!isLevelReady(state, level)) return 0;
  return Math.min(activeAtLevel(state, level).length, ROUND_SIZE);
}

function shuffled(items, random = Math.random) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapWith = Math.floor(random() * (index + 1));
    [result[index], result[swapWith]] = [result[swapWith], result[index]];
  }
  return result;
}

/** Build a snapshot for one study round, with mixed direction chosen per card. */
export function createSession(state, level, direction = 'mixed', random = Math.random) {
  if (!isLevelReady(state, level)) return null;

  const cards = shuffled(activeAtLevel(state, level), random)
    .slice(0, ROUND_SIZE)
    .map((word) => ({
      wordId: word.id,
      direction:
        direction === 'mixed'
          ? random() < 0.5
            ? 'es-en'
            : 'en-es'
          : direction,
    }));

  return { level, direction, cards };
}

/** Move a single card based on the learner's self-assessment. */
export function recordAnswer(state, wordId, correct, answeredAt = DATE_NOW()) {
  const target = state.words.find((word) => word.id === wordId);
  if (!target || target.status !== 'active') return state;

  const nextLevel = correct
    ? Math.min(LEVEL_COUNT, target.level + 1)
    : Math.max(1, target.level - 1);
  const learned = correct && nextLevel === LEVEL_COUNT;

  const words = state.words.map((word) => {
    if (word.id !== wordId) return word;
    return {
      ...word,
      level: nextLevel,
      status: learned ? 'learned' : 'active',
      correctCount: word.correctCount + (correct ? 1 : 0),
      incorrectCount: word.incorrectCount + (correct ? 0 : 1),
      lastAnsweredAt: answeredAt,
    };
  });

  return {
    ...state,
    words,
    history: [
      { wordId, correct: Boolean(correct), fromLevel: target.level, toLevel: nextLevel, answeredAt },
      ...state.history,
    ].slice(0, 200),
    updatedAt: answeredAt,
  };
}

/** Complete a round; Level 1 is replenished after all its cards are answered. */
export function finishSession(state, level) {
  const completed = {
    ...state,
    sessionsCompleted: state.sessionsCompleted + 1,
    updatedAt: DATE_NOW(),
  };
  return level === 1 ? topUpLevelOne(completed) : completed;
}
