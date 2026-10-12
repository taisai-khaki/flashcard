import {
  ArrowRight,
  ArrowUpRight,
  BookMarked,
  Check,
  CircleDashed,
  GraduationCap,
  Layers3,
  Sparkles,
  Target,
} from 'lucide-react';
import { getLevelCounts, getReadyCount, getStats, isLevelReady } from '../domain/flashcards.js';

const LEVELS = [
  { label: 'Starting out', short: 'Start', tone: 'sage' },
  { label: 'Finding rhythm', short: 'Build', tone: 'blue' },
  { label: 'Growing fluent', short: 'Grow', tone: 'violet' },
  { label: 'Almost there', short: 'Polish', tone: 'amber' },
  { label: 'Learned for good', short: 'Learned', tone: 'gold' },
];

export function Overview({ state, onNavigate, onStartSession }) {
  const stats = getStats(state);
  const levelCounts = getLevelCounts(state);
  const recommendedLevel = [1, 2, 3, 4].find((level) => isLevelReady(state, level));
  const today = new Intl.DateTimeFormat('en', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(new Date());

  return (
    <div className="page-stack">
      <div className="page-heading overview-heading">
        <div>
          <div className="eyebrow"><span className="eyebrow-dot" /> SPANISH · ENGLISH</div>
          <h1>Your Spanish, <span>one word at a time.</span></h1>
          <p>A little practice today goes a long way.</p>
        </div>
        <div className="date-chip"><span className="date-dot" />{today}</div>
      </div>

      <section className={`welcome-card ${stats.total === 0 ? 'is-empty' : ''}`}>
        <div className="welcome-copy">
          <div className="welcome-kicker"><Sparkles size={14} /> YOUR NEXT SMALL WIN</div>
          {stats.total > 0 ? (
            <>
              <h2>Ready to keep your<br className="desktop-break" /> Spanish in motion?</h2>
              <p>
                {recommendedLevel
                  ? `${getReadyCount(state, recommendedLevel)} words are ready when you are.`
                  : 'Your next set is taking shape. Keep moving through your current words.'}
              </p>
              {recommendedLevel ? (
                <button className="button button-light" onClick={() => onStartSession(recommendedLevel)}>
                  Start a study round <ArrowRight size={17} />
                </button>
              ) : (
                <button className="button button-light" onClick={() => onNavigate('study')}>
                  See your levels <ArrowRight size={17} />
                </button>
              )}
            </>
          ) : (
            <>
              <h2>Your word journey<br className="desktop-break" /> starts here.</h2>
              <p>Add your Spanish–English pairs and Palabra will take care of the level-by-level practice.</p>
              <button className="button button-light" onClick={() => onNavigate('bank')}>
                Build your word bank <ArrowRight size={17} />
              </button>
            </>
          )}
        </div>
        <div className="welcome-art" aria-hidden="true">
          <div className="art-orbit art-orbit-one" />
          <div className="art-orbit art-orbit-two" />
          <div className="art-spark art-spark-one">✳</div>
          <div className="art-spark art-spark-two">✦</div>
          <div className="mini-flashcard">
            <span className="mini-card-label">SPANISH</span>
            <strong>{stats.total ? 'hola' : 'hola'}</strong>
            <span className="mini-card-translation">hello</span>
            <span className="mini-card-mark"><Check size={14} /></span>
          </div>
          <div className="floating-level"><Layers3 size={14} /> LEVEL {recommendedLevel ?? 1}</div>
        </div>
      </section>

      <section className="stats-grid" aria-label="Your progress at a glance">
        <article className="stat-card">
          <span className="stat-icon stat-icon-green"><BookMarked size={18} /></span>
          <div className="stat-label">IN YOUR BANK</div>
          <div className="stat-value">{stats.total}<span> words</span></div>
          <div className="stat-footnote">{stats.banked ? `${stats.banked} waiting to enter Level 1` : 'Your personal vocabulary collection'}</div>
        </article>
        <article className="stat-card">
          <span className="stat-icon stat-icon-blue"><Target size={18} /></span>
          <div className="stat-label">IN PROGRESS</div>
          <div className="stat-value">{stats.active}<span> words</span></div>
          <div className="stat-footnote">Moving through the five levels</div>
        </article>
        <article className="stat-card">
          <span className="stat-icon stat-icon-gold"><GraduationCap size={18} /></span>
          <div className="stat-label">LEARNED FOR GOOD</div>
          <div className="stat-value">{stats.learned}<span> words</span></div>
          <div className="stat-footnote">{stats.total ? `${Math.round((stats.learned / stats.total) * 100)}% of your bank` : 'A little progress adds up'}</div>
        </article>
      </section>

      <section className="levels-section">
        <div className="section-heading">
          <div>
            <div className="section-kicker">THE LEARNING PATH</div>
            <h2>Five levels. Real progress.</h2>
          </div>
          <button className="text-button" onClick={() => onNavigate('study')}>
            View study room <ArrowUpRight size={16} />
          </button>
        </div>
        <div className="level-roadmap">
          {LEVELS.map((item, index) => {
            const level = index + 1;
            const count = levelCounts[index].count;
            const percentage = level === 5 ? (count ? 100 : 0) : Math.min((count / 50) * 100, 100);
            const ready = level < 5 && isLevelReady(state, level);
            return (
              <article className={`roadmap-card tone-${item.tone} ${ready ? 'is-ready' : ''}`} key={item.label}>
                <div className="roadmap-topline">
                  <span className="roadmap-number">0{level}</span>
                  {level === 5 ? <Check size={16} /> : ready ? <span className="ready-pip" /> : <CircleDashed size={15} />}
                </div>
                <h3>{item.label}</h3>
                <div className="roadmap-count">
                  <strong>{count}</strong>
                  <span>{level === 5 ? 'learned' : ' / 50 words'}</span>
                </div>
                <div className="roadmap-track"><span style={{ width: `${percentage}%` }} /></div>
                <div className="roadmap-foot">
                  {level === 5 ? 'Learned for good' : ready ? `${getReadyCount(state, level)} ready to review` : 'Building your set'}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {stats.total === 0 && (
        <section className="how-it-works-card">
          <div className="how-icon"><Layers3 size={19} /></div>
          <div className="how-copy">
            <strong>A simple system that remembers for you</strong>
            <span>Get a word right to move it forward. Miss one and it returns to an earlier level. Reach Level 5 and it’s yours.</span>
          </div>
          <span className="how-levels">1 <i /> 2 <i /> 3 <i /> 4 <i /> 5</span>
        </section>
      )}
    </div>
  );
}
