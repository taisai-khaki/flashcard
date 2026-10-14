export const LEVEL_COUNT = 5;
export const ROUND_SIZE = 50;
/**
 * Answers kept for the progress page. 90-day accuracy trends and the activity
 * heatmap read from this list, so it needs to outlast a few heavy study weeks.
 * (Roughly 165 KB of local storage at capacity.)
 */
export const HISTORY_LIMIT = 1500;
/** A card that changes levels rests for a full day before becoming reviewable. */
export const REVIEW_COOLDOWN_MS = 24 * 60 * 60 * 1000;

const DATE_NOW = () => new Date().toISOString();

function makeId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `word-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function cleanText(value) {
  return String(value ?? '').trim().replace(/\s+/g, ' ');
}

function spanishKey(spanish) {
  return cleanText(spanish).toLocaleLowerCase();
}

function wordKey(word) {
  return `${spanishKey(word.spanish)}\u0000${cleanText(word.english).toLocaleLowerCase()}`;
}

function toTimestamp(value) {
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}

function currentTimestamp(now = Date.now()) {
  return toTimestamp(now) ?? Date.now();
}

/**
 * Older saved cards only recorded `lastAnsweredAt`. Use it as a compatibility
 * fallback so cards answered just before this cooldown was introduced do not
 * immediately become reviewable after an app upgrade.
 */
function wordReviewTimestamp(word) {
  if (word.nextReviewAt !== undefined) {
    if (word.nextReviewAt === null || word.nextReviewAt === '') return null;
    return toTimestamp(word.nextReviewAt);
  }

  const lastAnswered = toTimestamp(word.lastAnsweredAt);
  return lastAnswered === null ? null : lastAnswered + REVIEW_COOLDOWN_MS;
}

function wordIsDue(word, nowTimestamp) {
  const reviewTimestamp = wordReviewTimestamp(word);
  return reviewTimestamp === null || reviewTimestamp <= nowTimestamp;
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
      nextReviewAt: null,
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

function dueAtLevel(state, level, nowTimestamp) {
  return activeAtLevel(state, level).filter((word) => wordIsDue(word, nowTimestamp));
}

/** Number of active words at this level whose review date has arrived. */
export function getDueCount(state, level, now = Date.now()) {
  return dueAtLevel(state, level, currentTimestamp(now)).length;
}

/** The next future review time for a level, or for the whole bank if omitted. */
export function getNextReviewAt(state, level = null, now = Date.now()) {
  const nowTimestamp = currentTimestamp(now);
  const timestamps = state.words
    .filter((word) =>
      word.status === 'active' && (level === null || word.level === level),
    )
    .map(wordReviewTimestamp)
    .filter((timestamp) => timestamp !== null && timestamp > nowTimestamp);

  if (!timestamps.length) return null;
  const earliest = timestamps.reduce((minimum, timestamp) => Math.min(minimum, timestamp), Infinity);
  return new Date(earliest).toISOString();
}

/**
 * Levels 2–4 normally wait until a full set of 50 accumulates. If no words
 * remain in a lower level or in the bank, a smaller final set can be reviewed
 * so a short vocabulary list can still progress all the way through. Only
 * cards whose review date has arrived count as ready or enter a session.
 */
export function isLevelReady(state, level, now = Date.now()) {
  if (level < 1 || level >= LEVEL_COUNT) return false;
  const activeWords = activeAtLevel(state, level);
  const dueCount = dueAtLevel(state, level, currentTimestamp(now)).length;
  if (dueCount === 0) return false;
  if (level === 1 || activeWords.length >= ROUND_SIZE) return true;

  const hasWordsStillWorkingThroughEarlierStages = state.words.some(
    (word) =>
      word.status === 'banked' ||
      (word.status === 'active' && word.level < level),
  );
  return !hasWordsStillWorkingThroughEarlierStages;
}

export function getReadyCount(state, level, now = Date.now()) {
  if (!isLevelReady(state, level, now)) return 0;
  return Math.min(dueAtLevel(state, level, currentTimestamp(now)).length, ROUND_SIZE);
}

/** Count visible cards for a fixed practice direction. Spanish prompts merge by word. */
export function getReadyCardCount(state, level, direction, now = Date.now()) {
  if (!isLevelReady(state, level, now)) return 0;
  const dueWords = dueAtLevel(state, level, currentTimestamp(now));
  if (direction === 'es-en') {
    return Math.min(new Set(dueWords.map((word) => spanishKey(word.spanish))).size, ROUND_SIZE);
  }
  return Math.min(dueWords.length, ROUND_SIZE);
}

function shuffled(items, random = Math.random) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapWith = Math.floor(random() * (index + 1));
    [result[index], result[swapWith]] = [result[swapWith], result[index]];
  }
  return result;
}

/** Build a round. Spanish → English merges words that share one Spanish prompt. */
export function createSession(
  state,
  level,
  direction = 'mixed',
  random = Math.random,
  now = Date.now(),
) {
  const nowTimestamp = currentTimestamp(now);
  if (!isLevelReady(state, level, nowTimestamp)) return null;

  const dueWords = shuffled(dueAtLevel(state, level, nowTimestamp), random);
  const meaningsBySpanish = new Map();
  for (const word of state.words) {
    const key = spanishKey(word.spanish);
    const meanings = meaningsBySpanish.get(key) ?? [];
    const english = cleanText(word.english);
    if (!meanings.some((meaning) => meaning.toLocaleLowerCase() === english.toLocaleLowerCase())) {
      meanings.push(english);
    }
    meaningsBySpanish.set(key, meanings);
  }

  const cards = [];
  const spanishCards = new Map();

  for (const word of dueWords) {
    const cardDirection = direction === 'mixed'
      ? (random() < 0.5 ? 'es-en' : 'en-es')
      : direction;

    if (cardDirection === 'en-es') {
      cards.push({ wordId: word.id, wordIds: [word.id], direction: cardDirection });
      continue;
    }

    const key = spanishKey(word.spanish);
    const existingCard = spanishCards.get(key);
    if (existingCard) {
      existingCard.wordIds.push(word.id);
      continue;
    }

    const card = {
      wordId: word.id,
      wordIds: [word.id],
      direction: 'es-en',
      prompt: word.spanish,
      answer: meaningsBySpanish.get(key) ?? [word.english],
    };
    spanishCards.set(key, card);
    cards.push(card);
  }

  return { level, direction, cards: cards.slice(0, ROUND_SIZE) };
}

/** Move one or more word pairs represented by a flashcard. */
export function recordAnswers(state, wordIds, correct, answeredAt = DATE_NOW()) {
  const ids = [...new Set(Array.isArray(wordIds) ? wordIds : [wordIds])];
  const answeredTimestamp = toTimestamp(answeredAt) ?? Date.now();
  const updates = new Map();
  const historyEntries = [];

  for (const wordId of ids) {
    const target = state.words.find((word) => word.id === wordId);
    if (!target || target.status !== 'active') continue;

    const nextLevel = correct
      ? Math.min(LEVEL_COUNT, target.level + 1)
      : Math.max(1, target.level - 1);
    const learned = correct && nextLevel === LEVEL_COUNT;
    const changedLevel = nextLevel !== target.level;
    const nextReviewAt = learned
      ? null
      : changedLevel
        ? new Date(answeredTimestamp + REVIEW_COOLDOWN_MS).toISOString()
        : target.nextReviewAt ?? null;

    updates.set(wordId, {
      ...target,
      level: nextLevel,
      status: learned ? 'learned' : 'active',
      correctCount: target.correctCount + (correct ? 1 : 0),
      incorrectCount: target.incorrectCount + (correct ? 0 : 1),
      lastAnsweredAt: answeredAt,
      nextReviewAt,
    });
    historyEntries.push({
      wordId,
      correct: Boolean(correct),
      fromLevel: target.level,
      toLevel: nextLevel,
      answeredAt,
    });
  }

  if (updates.size === 0) return state;

  return {
    ...state,
    words: state.words.map((word) => updates.get(word.id) ?? word),
    history: [...historyEntries, ...state.history].slice(0, HISTORY_LIMIT),
    updatedAt: answeredAt,
  };
}

/** Move a single word pair based on the learner's self-assessment. */
export function recordAnswer(state, wordId, correct, answeredAt = DATE_NOW()) {
  return recordAnswers(state, [wordId], correct, answeredAt);
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
