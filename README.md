# Palabra · Spanish flashcards

A responsive, browser-based Spanish vocabulary practice app. The repository includes the app shell, word-bank importer, five-level learning flow, and local progress persistence. The starter bank contains 858 unique English–Spanish pairs from the learner’s submitted lists, including present and preterite first-person forms for 116 regular verbs. Spanish conjugation cards omit the subject pronoun "yo".

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

## Learning rules

- Level 1 is kept topped up to 50 words when the bank has words available. The app can practice a smaller set when the entire bank is smaller than 50.
- Correct answers move a word forward one level. A missed Level 1 word stays there; a missed word in Levels 2–4 drops one level.
- Levels 2–4 normally wait until 50 words have accumulated before a review round. If no words remain in lower levels or the bank, a smaller final set can be reviewed so a short list does not get stuck.
- A correct answer that moves a word from Level 4 marks it learned at Level 5; learned words are not put back into regular review.
- Practice direction can be Spanish → English, English → Spanish, or mixed randomly per card.
