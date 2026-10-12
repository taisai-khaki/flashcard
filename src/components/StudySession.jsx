import { useEffect } from 'react';
import {
  ArrowLeft,
  Check,
  ChevronLeft,
  Eye,
  Keyboard,
  RotateCcw,
  Sparkles,
  X,
} from 'lucide-react';

export function StudySession({ session, state, onReveal, onAnswer, onExit }) {
  const card = session?.cards[session.index];
  const word = state.words.find((item) => item.id === card?.wordId);
  const revealed = session?.revealed ?? false;
  const directionLabel = card?.direction === 'es-en' ? 'SPANISH → ENGLISH' : 'ENGLISH → SPANISH';
  const prompt = card?.direction === 'es-en' ? word?.spanish : word?.english;
  const answer = card?.direction === 'es-en' ? word?.english : word?.spanish;
  const answerLanguage = card?.direction === 'es-en' ? 'ENGLISH' : 'SPANISH';

  useEffect(() => {
    function handleKey(event) {
      if (event.code === 'Space' && !revealed) {
        event.preventDefault();
        onReveal();
      } else if (revealed && (event.key === '1' || event.key.toLowerCase() === 'x')) {
        onAnswer(false);
      } else if (revealed && (event.key === '2' || event.key.toLowerCase() === 'j')) {
        onAnswer(true);
      }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onAnswer, onReveal, revealed]);

  if (!session || !word || !card) return null;

  const percent = ((session.index + (revealed ? 1 : 0)) / session.cards.length) * 100;

  return (
    <div className="session-shell">
      <div className="session-topbar">
        <button className="session-back-button" onClick={onExit}><ChevronLeft size={17} /> Back to study room</button>
        <div className="session-level-tag"><span /> LEVEL {session.level}</div>
        <div className="session-card-counter"><strong>{String(session.index + 1).padStart(2, '0')}</strong><span> / {String(session.cards.length).padStart(2, '0')}</span></div>
      </div>

      <div className="session-progress-track"><span style={{ width: `${percent}%` }} /></div>

      <main className="session-main">
        <div className="session-kicker"><Sparkles size={14} /> A MOMENT FOR YOUR MEMORY</div>
        <h1>{revealed ? 'How did it feel?' : 'What does this mean?'}</h1>
        <p className="session-subtitle">Take your time. Trust what you remember.</p>

        <section className={`flashcard ${revealed ? 'is-revealed' : ''}`} aria-live="polite">
          <div className="flashcard-topline">
            <span className="flashcard-direction">{directionLabel}</span>
            <span className="flashcard-card-number">CARD {String(session.index + 1).padStart(2, '0')}</span>
          </div>
          <div className="flashcard-center">
            <span className="flashcard-language">{card.direction === 'es-en' ? 'ESPAÑOL' : 'ENGLISH'}</span>
            <div className="flashcard-word">{prompt}</div>
            {revealed ? (
              <div className="flashcard-answer">
                <span className="answer-divider"><i /></span>
                <span className="flashcard-language answer-language">{answerLanguage}</span>
                <strong>{answer}</strong>
              </div>
            ) : (
              <span className="flashcard-hint">Think of the meaning, then reveal it</span>
            )}
          </div>
          <div className="flashcard-bottomline">
            <span><Keyboard size={14} /> <kbd>SPACE</kbd> to reveal</span>
            <span className="flashcard-level-mini">LEVEL {session.level}</span>
          </div>
        </section>

        {!revealed ? (
          <button className="button button-primary reveal-button" onClick={onReveal}>
            <Eye size={17} /> Reveal answer <span className="button-shortcut">SPACE</span>
          </button>
        ) : (
          <div className="answer-actions">
            <button className="answer-action missed-action" onClick={() => onAnswer(false)}>
              <span className="answer-action-icon"><RotateCcw size={17} /></span>
              <span><strong>Not quite</strong><small>Move this word back</small></span>
              <kbd>1</kbd>
            </button>
            <button className="answer-action correct-action" onClick={() => onAnswer(true)}>
              <span className="answer-action-icon"><Check size={18} /></span>
              <span><strong>I knew it</strong><small>Move this word forward</small></span>
              <kbd>2</kbd>
            </button>
          </div>
        )}
        <p className="session-reminder"><X size={13} /> Your honest answer helps put this word at the right level.</p>
      </main>

      <div className="session-bottom-note">
        <span className="bottom-note-icon"><ArrowLeft size={15} /></span>
        {session.level === 1
          ? 'Correct answers move up; missed words stay here. Any level change starts a 24-hour rest before the next review.'
          : 'Correct answers move up; missed words drop back one level. A level change starts a 24-hour rest before the next review.'}
      </div>
    </div>
  );
}
