import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { Sidebar } from './components/Sidebar.jsx';
import { Overview } from './components/Overview.jsx';
import { StudyPage } from './components/StudyPage.jsx';
import { StudySession } from './components/StudySession.jsx';
import { AnalyticsPage } from './components/AnalyticsPage.jsx';
import { BankPage } from './components/BankPage.jsx';
import {
  addWords,
  createEmptyState,
  createInitialState,
  createSession,
  finishSession,
  recordAnswers,
} from './domain/flashcards.js';
import { SEED_WORDS } from './data/seedWords.js';

const STORAGE_KEY = 'palabra.flashcards.v1';
const VIEW_LABELS = {
  overview: 'Overview',
  study: 'Study room',
  progress: 'Progress',
  bank: 'Word bank',
};

function loadState() {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed.words)) {
        const restored = {
          ...createEmptyState(),
          ...parsed,
          words: parsed.words,
          history: Array.isArray(parsed.history) ? parsed.history : [],
        };
        return addWords(restored, SEED_WORDS).state;
      }
    }
  } catch (error) {
    console.warn('Could not restore saved flashcard progress.', error);
  }
  return createInitialState(SEED_WORDS);
}

export default function App() {
  const [appState, setAppState] = useState(loadState);
  const [activeView, setActiveView] = useState('overview');
  const [direction, setDirection] = useState('mixed');
  const [now, setNow] = useState(() => Date.now());
  const [session, setSession] = useState(null);
  const [summary, setSummary] = useState(null);
  // Where "back to study room" should actually lead, once a round is over.
  const [sessionReturn, setSessionReturn] = useState('study');

  useEffect(() => {
    setAppState((current) => {
      const result = addWords(current, SEED_WORDS);
      return result.added ? result.state : current;
    });
  }, [SEED_WORDS]);

  // Keep date-gated review sets current if the app stays open or regains focus.
  useEffect(() => {
    const updateClock = () => setNow(Date.now());
    const interval = window.setInterval(updateClock, 60_000);
    window.addEventListener('focus', updateClock);
    document.addEventListener('visibilitychange', updateClock);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', updateClock);
      document.removeEventListener('visibilitychange', updateClock);
    };
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
    } catch (error) {
      console.warn('Could not save flashcard progress.', error);
    }
  }, [appState]);

  function startSession(level, returnView = 'study') {
    const next = createSession(appState, level, direction);
    if (!next) return;
    setSession({
      ...next,
      index: 0,
      revealed: false,
      correct: 0,
      incorrect: 0,
    });
    setSummary(null);
    setSessionReturn(returnView);
    setActiveView('study');
  }

  function revealAnswer() {
    setSession((current) => current ? { ...current, revealed: true } : current);
  }

  function answerCard(correct) {
    if (!session?.cards[session.index]) return;
    const currentCard = session.cards[session.index];
    const nextCorrect = session.correct + (correct ? 1 : 0);
    const nextIncorrect = session.incorrect + (correct ? 0 : 1);
    const updated = recordAnswers(
      appState,
      currentCard.wordIds ?? [currentCard.wordId],
      correct,
    );
    const isLastCard = session.index === session.cards.length - 1;

    if (isLastCard) {
      setAppState(finishSession(updated, session.level));
      setSummary({
        level: session.level,
        total: session.cards.length,
        correct: nextCorrect,
        incorrect: nextIncorrect,
      });
      setSession(null);
    } else {
      setAppState(updated);
      setSession((current) => current ? {
        ...current,
        index: current.index + 1,
        revealed: false,
        correct: nextCorrect,
        incorrect: nextIncorrect,
      } : current);
    }
  }

  function exitSession() {
    setSession(null);
    setActiveView(sessionReturn);
  }

  function importWords(entries) {
    const result = addWords(appState, entries);
    setAppState(result.state);
    return result;
  }

  function navigateTo(view) {
    setSession(null);
    setActiveView(view);
  }

  if (session) {
    return (
      <StudySession
        session={session}
        state={appState}
        onReveal={revealAnswer}
        onAnswer={answerCard}
        onExit={exitSession}
      />
    );
  }

  return (
    <div className="app-shell">
      <Sidebar
        activeView={activeView}
        onNavigate={navigateTo}
        totalWords={appState.words.length}
        learnedWords={appState.words.filter((word) => word.status === 'learned').length}
        onAddWords={() => navigateTo('bank')}
      />

      <div className="main-shell">
        <header className="topbar">
          <div className="topbar-context">
            <span className="topbar-context-dot" />
            <span>LEARNING SPACE</span>
            <span className="context-slash">/</span>
            <strong>{VIEW_LABELS[activeView]}</strong>
          </div>
          <div className="topbar-actions">
            <div className="language-chip"><span>ES</span> Spanish</div>
            <button className="topbar-add-button" onClick={() => navigateTo('bank')}>
              <Plus size={16} /> <span>Add words</span>
            </button>
          </div>
        </header>

        <main className="content-area">
          {activeView === 'overview' && (
            <Overview state={appState} onNavigate={navigateTo} onStartSession={startSession} now={now} />
          )}
          {activeView === 'study' && (
            <StudyPage
              state={appState}
              direction={direction}
              onDirectionChange={setDirection}
              onStartSession={startSession}
              summary={summary}
              now={now}
            />
          )}
          {activeView === 'progress' && (
            <AnalyticsPage
              state={appState}
              onNavigate={navigateTo}
              onStartSession={startSession}
              now={now}
            />
          )}
          {activeView === 'bank' && <BankPage state={appState} onImport={importWords} />}
        </main>
      </div>
    </div>
  );
}
