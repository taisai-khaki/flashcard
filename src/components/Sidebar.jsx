import {
  BookOpenText,
  ChartNoAxesColumnIncreasing,
  CircleHelp,
  LayoutDashboard,
  LibraryBig,
  Plus,
  Sparkles,
} from 'lucide-react';

const NAV_ITEMS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'study', label: 'Study room', icon: BookOpenText },
  { id: 'bank', label: 'Word bank', icon: LibraryBig },
];

export function Sidebar({ activeView, onNavigate, totalWords, learnedWords, onAddWords }) {
  return (
    <aside className="sidebar">
      <button className="brand-lockup" onClick={() => onNavigate('overview')} aria-label="Palabra home">
        <span className="brand-mark"><BookOpenText size={20} strokeWidth={2.2} /></span>
        <span className="brand-word">palabra<span>.</span></span>
      </button>

      <div className="sidebar-label">YOUR SPACE</div>
      <nav className="sidebar-nav" aria-label="Main navigation">
        {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
          <button
            className={`nav-link ${activeView === id ? 'is-active' : ''}`}
            key={id}
            onClick={() => onNavigate(id)}
            aria-current={activeView === id ? 'page' : undefined}
          >
            <Icon size={18} strokeWidth={1.9} />
            <span>{label}</span>
            {id === 'bank' && totalWords > 0 && <span className="nav-count">{totalWords}</span>}
          </button>
        ))}
      </nav>

      <div className="sidebar-card">
        <div className="sidebar-card-top">
          <span className="sidebar-card-icon"><ChartNoAxesColumnIncreasing size={16} /></span>
          <span className="sidebar-card-kicker">YOUR JOURNEY</span>
        </div>
        <div className="sidebar-progress-copy">
          <span>{learnedWords} learned</span>
          <span>{totalWords} total</span>
        </div>
        <div className="sidebar-progress-track">
          <span style={{ width: `${totalWords ? (learnedWords / totalWords) * 100 : 0}%` }} />
        </div>
        <p>Small steps add up to fluency.</p>
      </div>

      <div className="sidebar-bottom">
        <button className="quick-add-link" onClick={onAddWords}>
          <span className="quick-add-icon"><Plus size={16} /></span>
          <span>Add words to your bank</span>
        </button>
        <div className="sidebar-footer">
          <span className="footer-sparkle"><Sparkles size={14} /></span>
          <span>Made for steady progress</span>
          <CircleHelp className="help-icon" size={15} />
        </div>
      </div>
    </aside>
  );
}
