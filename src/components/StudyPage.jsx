import {
  ArrowRight,
  ArrowUpRight,
  Check,
  CheckCheck,
  CircleDashed,
  Layers3,
  LockKeyhole,
  RotateCcw,
  Shuffle,
} from 'lucide-react';
import { getLevelCounts, getReadyCount, getStats, isLevelReady } from '../domain/flashcards.js';

const LEVEL_COPY = [
  { title: 'First steps', note: 'New words find their rhythm here.', tone: 'sage' },
  { title: 'Building recall', note: 'Words you already know a little better.', tone: 'blue' },
  { title: 'Growing confidence', note: 'Bring familiar words closer to memory.', tone: 'violet' },
  { title: 'Making it stick', note: 'One more step toward long-term recall.', tone: 'amber' },
  { title: 'Learned for good', note: 'Words that have made it all the way.', tone: 'gold' },
];

const DIRECTIONS = [
  { id: 'es-en', title: 'Spanish → English', hint: 'Recognize the meaning' },
  { id: 'en-es', title: 'English → Spanish', hint: 'Recall the Spanish word' },
  { id: 'mixed', title: 'Mix it up', hint: 'A little of both', icon: Shuffle },
];

export function StudyPage({ state, direction, onDirectionChange, onStartSession, summary }) {
  const levelCounts = getLevelCounts(state);
  const stats = getStats(state);
  const hasAnyReady = [1, 2, 3, 4].some((level) => isLevelReady(state, level));

  return (
    <div className="page-stack">
      <div className="page-heading study-heading">
        <div>
          <div className="eyebrow"><span className="eyebrow-dot" /> YOUR PRACTICE</div>
          <h1>Study room</h1>
          <p>Focused rounds of up to 50 cards, at your pace.</p>
        </div>
        <div className="study-total-pill"><Layers3 size={16} /><strong>{stats.active}</strong> words in progress</div>
      </div>

      {summary && (
        <section className="session-success-banner">
          <span className="success-check"><CheckCheck size={20} /></span>
          <div>
            <strong>Round complete — nice work.</strong>
            <span>{summary.correct} right · {summary.incorrect} to revisit · {summary.total} cards practiced</span>
          </div>
          <span className="summary-score">{summary.total ? Math.round((summary.correct / summary.total) * 100) : 0}%</span>
        </section>
      )}

      <section className="direction-panel">
        <div className="direction-copy">
          <div className="section-kicker">PICK YOUR DIRECTION</div>
          <h2>How do you want to practice?</h2>
          <p>You can switch this any time. Your level progress stays the same.</p>
        </div>
        <div className="direction-options" role="group" aria-label="Flashcard direction">
          {DIRECTIONS.map(({ id, title, hint, icon: Icon }) => (
            <button
              className={`direction-option ${direction === id ? 'is-selected' : ''}`}
              key={id}
              onClick={() => onDirectionChange(id)}
              aria-pressed={direction === id}
            >
              <span className="direction-option-top">
                <span className="direction-choice-icon">{Icon ? <Icon size={17} /> : <span className="direction-arrows">⇄</span>}</span>
                <span className="radio-dot">{direction === id && <span />}</span>
              </span>
              <strong>{title}</strong>
              <small>{hint}</small>
            </button>
          ))}
        </div>
      </section>

      <section className="study-levels-section">
        <div className="section-heading levels-list-heading">
          <div>
            <div className="section-kicker">YOUR FIVE-LEVEL PATH</div>
            <h2>Choose a set to review</h2>
          </div>
          <span className="batch-note"><CircleDashed size={14} /> Sets unlock as they fill</span>
        </div>

        {stats.total === 0 ? (
          <div className="study-empty-state">
            <div className="empty-illustration"><Layers3 size={25} /></div>
            <h3>Your study room is ready.</h3>
            <p>Add a few Spanish–English pairs to start your first Level 1 round.</p>
          </div>
        ) : (
          <div className="study-level-list">
            {LEVEL_COPY.map((item, index) => {
              const level = index + 1;
              const data = levelCounts[index];
              const ready = level < 5 && isLevelReady(state, level);
              const readyCount = level < 5 ? getReadyCount(state, level) : 0;
              const percentage = level === 5 ? (data.count ? 100 : 0) : Math.min((data.count / 50) * 100, 100);
              const isLearned = level === 5;
              const isBuilding = !ready && !isLearned && data.count > 0;
              const lowerLevelPending = level > 1 && level < 5 && state.words.some(
                (word) => word.status === 'banked' || (word.status === 'active' && word.level < level),
              );

              return (
                <article className={`study-level-row tone-${item.tone} ${ready ? 'is-ready' : ''} ${isLearned ? 'is-complete' : ''}`} key={item.title}>
                  <div className="level-row-number">{isLearned ? <Check size={19} /> : `0${level}`}</div>
                  <div className="level-row-main">
                    <div className="level-row-titleline">
                      <h3>Level {level} <span>{item.title}</span></h3>
                      {ready && <span className="ready-label"><span /> READY</span>}
                      {isLearned && <span className="learned-label"><Check size={12} /> LEARNED</span>}
                    </div>
                    <p>{item.note}</p>
                    <div className="level-row-meter-wrap">
                      <div className="level-row-meter"><span style={{ width: `${percentage}%` }} /></div>
                      <span className="level-row-count">
                        {isLearned ? `${data.count} words` : `${data.count} / 50`}
                      </span>
                    </div>
                  </div>
                  <div className="level-row-action">
                    {ready ? (
                      <button className="button button-primary button-compact" onClick={() => onStartSession(level)}>
                        Review {readyCount} <ArrowRight size={15} />
                      </button>
                    ) : isLearned ? (
                      <span className="learned-forever"><CheckCheck size={16} /> Yours for good</span>
                    ) : (
                      <div className="level-waiting">
                        {data.count === 0 ? <LockKeyhole size={15} /> : <CircleDashed size={15} />}
                        <span>{data.count === 0 ? 'Waiting for words' : lowerLevelPending ? 'Building the next set' : 'Set is taking shape'}</span>
                      </div>
                    )}
                  </div>
                  <span className="level-row-index">{level === 5 ? <CheckCheck size={17} /> : <span>0{level}</span>}</span>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {!hasAnyReady && stats.total > 0 && (
        <div className="study-footnote-card">
          <span className="footnote-icon"><RotateCcw size={16} /></span>
          <span>As you answer cards, words move through the path. Once a full set is ready, it will appear here for review.</span>
          <ArrowUpRight size={15} />
        </div>
      )}
    </div>
  );
}
