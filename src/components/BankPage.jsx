import { useMemo, useRef, useState } from 'react';
import {
  ArrowDownToLine,
  Check,
  FileUp,
  Search,
  Sparkles,
  Upload,
  X,
} from 'lucide-react';
import { getStats, parseWordLines } from '../domain/flashcards.js';

function progressLabel(word) {
  if (word.status === 'learned') return { text: 'Learned', className: 'status-learned' };
  if (word.status === 'banked') return { text: 'In bank', className: 'status-banked' };
  return { text: `Level ${word.level}`, className: `status-level-${word.level}` };
}

export function BankPage({ state, onImport }) {
  const [draft, setDraft] = useState('');
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState(null);
  const [invalidRows, setInvalidRows] = useState([]);
  const fileInputRef = useRef(null);
  const stats = getStats(state);

  const visibleWords = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    if (!query) return state.words;
    return state.words.filter((word) =>
      `${word.spanish} ${word.english}`.toLocaleLowerCase().includes(query),
    );
  }, [search, state.words]);

  function importText(text = draft) {
    const parsed = parseWordLines(text);
    setInvalidRows(parsed.invalidLines);
    if (parsed.entries.length === 0) {
      setMessage({ type: 'error', text: 'No word pairs found. Add a Spanish word and its English meaning on each line.' });
      return;
    }

    const result = onImport(parsed.entries);
    setDraft('');
    setMessage({
      type: result.added ? 'success' : 'error',
      text: result.added
        ? `${result.added} ${result.added === 1 ? 'word pair' : 'word pairs'} added to your bank${result.skipped ? ` · ${result.skipped} duplicate or incomplete line${result.skipped === 1 ? '' : 's'} skipped` : ''}.`
        : 'Those pairs are already in your bank, or could not be read.',
    });
  }

  async function handleFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    importText(text);
    event.target.value = '';
  }

  return (
    <div className="page-stack bank-page">
      <div className="page-heading bank-heading">
        <div>
          <div className="eyebrow"><span className="eyebrow-dot" /> YOUR VOCABULARY</div>
          <h1>Word bank</h1>
          <p>Your personal collection. Add pairs now, and they’ll enter the learning path as space opens up.</p>
        </div>
        <button className="button button-primary import-top-button" onClick={() => document.getElementById('word-import')?.focus()}>
          <Upload size={16} /> Add word pairs
        </button>
      </div>

      <section className="bank-summary-row" aria-label="Word bank totals">
        <div><span className="summary-number">{stats.total}</span><span>Total pairs</span></div>
        <div><span className="summary-number">{stats.active}</span><span>In the learning path</span></div>
        <div><span className="summary-number">{stats.banked}</span><span>Waiting for Level 1</span></div>
        <div><span className="summary-number">{stats.learned}</span><span>Learned for good</span></div>
      </section>

      <section className="import-panel">
        <div className="import-panel-heading">
          <div className="import-title-wrap">
            <span className="import-icon"><FileUp size={18} /></span>
            <div>
              <div className="section-kicker">GROW YOUR COLLECTION</div>
              <h2>Add Spanish–English pairs</h2>
            </div>
          </div>
          <button className="file-upload-button" onClick={() => fileInputRef.current?.click()}>
            <ArrowDownToLine size={15} /> Import .txt or .csv
          </button>
          <input ref={fileInputRef} className="visually-hidden" type="file" accept=".txt,.csv,text/plain,text/csv" onChange={handleFile} />
        </div>
        <p className="import-instructions">One pair per line. Put Spanish first, then English — commas, dashes, tabs, or pipes all work.</p>
        <label className="visually-hidden" htmlFor="word-import">Paste word pairs</label>
        <textarea
          id="word-import"
          className="word-import-input"
          placeholder={'hola — hello\ncasa — house\nperro — dog'}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          spellCheck="false"
        />
        <div className="import-panel-bottom">
          <div className="format-hint"><Sparkles size={14} /> Example: <code>gato | cat</code></div>
          <button className="button button-primary" onClick={() => importText()} disabled={!draft.trim()}>
            Add to word bank <Upload size={15} />
          </button>
        </div>
        {message && (
          <div className={`import-feedback ${message.type}`} role="status">
            {message.type === 'success' ? <Check size={16} /> : <X size={16} />}
            <span>{message.text}</span>
            <button onClick={() => setMessage(null)} aria-label="Dismiss message"><X size={14} /></button>
          </div>
        )}
        {invalidRows.length > 0 && (
          <div className="invalid-row-note">Couldn’t read line{invalidRows.length === 1 ? '' : 's'} {invalidRows.map((row) => row.line).join(', ')}. Use a format like <code>palabra — meaning</code>.</div>
        )}
      </section>

      <section className="word-list-section">
        <div className="word-list-heading">
          <div>
            <div className="section-kicker">ALL YOUR WORDS</div>
            <h2>Vocabulary collection <span>{state.words.length}</span></h2>
          </div>
          <div className="search-box">
            <Search size={16} />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search words" aria-label="Search word bank" />
            {search && <button onClick={() => setSearch('')} aria-label="Clear search"><X size={14} /></button>}
          </div>
        </div>

        <div className="word-table-wrap">
          <table className="word-table">
            <thead>
              <tr><th>SPANISH</th><th>ENGLISH</th><th>LEARNING STATUS</th><th className="table-number">PRACTICED</th></tr>
            </thead>
            <tbody>
              {visibleWords.map((word) => {
                const status = progressLabel(word);
                return (
                  <tr key={word.id}>
                    <td className="spanish-word">{word.spanish}</td>
                    <td className="english-word">{word.english}</td>
                    <td><span className={`word-status ${status.className}`}>{status.text}</span></td>
                    <td className="table-number practice-count">{word.correctCount + word.incorrectCount}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {visibleWords.length === 0 && (
            <div className="word-list-empty">
              {state.words.length === 0 ? (
                <><span className="empty-list-icon"><FileUp size={20} /></span><strong>Your bank is ready for its first words.</strong><span>Paste pairs above or import a text/CSV file.</span></>
              ) : (
                <><strong>No matches found.</strong><span>Try searching for another Spanish or English word.</span></>
              )}
            </div>
          )}
          {visibleWords.length > 0 && search && <div className="table-result-count">Showing {visibleWords.length} of {state.words.length} word pairs</div>}
        </div>
      </section>

      <div className="bank-note"><Sparkles size={15} /><span>Level 1 stays topped up to 50 when words are available. Extra pairs wait in your bank until a spot opens.</span></div>
    </div>
  );
}
