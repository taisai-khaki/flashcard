# Palabra · Spanish flashcards

A responsive, browser-based Spanish vocabulary practice app. The repository includes the app shell, word-bank importer, five-level learning flow, progress analytics, and local progress persistence. The starter bank contains 1,518 unique English–Spanish pairs from the learner’s submitted lists: first-person present/preterite forms for 116 regular verbs, plus present and preterite conjugations for 66 irregular verbs across five subject groups. Spanish subject pronouns are omitted from conjugation cards.

## Run locally

```bash
npm install
npm run dev
```

Open the Vite URL printed in the terminal. Production build and tests:

```bash
npm run build
npm test
```

## Add vocabulary

Pairs can be pasted in the **Word bank** screen, one per line, with Spanish first. Supported separators include a dash, comma, semicolon, pipe, or tab:

```text
hola — hello
casa | house
perro, dog
```

You can also import a `.txt` or `.csv` file in the same format. Pairs entered in `src/data/seedWords.js` are loaded as starter vocabulary too. Progress is stored in the browser's local storage.

## Progress

The **Progress** page charts the real answer history already stored on your device — nothing is estimated or faked, and a fresh bank shows a designed empty state instead of placeholder numbers.

- **Key numbers** — cards practised, accuracy, current/longest streak, and words learned, each with a sparkline and a comparison against the previous window. Switch between 7, 30, and 90 days.
- **Your rhythm** — a combined bar-and-line chart of cards per day against daily accuracy, with a hover readout.
- **Consistency** — the share of days in the window you actually practised, plus cards per active day.
- **Every day counts** — a 13-week activity grid shaded by volume, with a live streak badge.
- **Level pipeline** — where your words currently sit, and how accurate you are at each level.
- **Finish line** — answers still needed to learn the whole bank, and the projected date at your current pace.
- **Trickiest words** — the pairs that have slipped most often.
- **Insights** — short sentences generated from your own numbers (best hour, weakest level, consistency).

Analytics live in `src/domain/analytics.js` as pure functions over the app state, so the page can never drift from what the study flow recorded. The answer history keeps the most recent 1,500 entries (raised from 200) so 90-day trends stay complete.

## Learning rules

- Level 1 is kept topped up to 50 words when the bank has words available. The app can practice a smaller set when the entire bank is smaller than 50.
- Correct answers move a word forward one level. A missed Level 1 word stays there; a missed word in Levels 2–4 drops one level.
- Levels 2–4 normally wait until 50 words have accumulated before a review round. If no words remain in lower levels or the bank, a smaller final set can be reviewed so a short list does not get stuck.
- A correct answer that moves a word from Level 4 marks it learned at Level 5; learned words are not put back into regular review.
- Practice direction can be Spanish → English, English → Spanish, or mixed randomly per card.
