import { useMemo, useState } from 'react';
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  CalendarClock,
  Check,
  ChevronsUp,
  Flame,
  Gauge,
  Layers3,
  MousePointerClick,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  Trophy,
} from 'lucide-react';
import {
  ANALYTICS_WINDOWS,
  getProgressReport,
  intensityFor,
} from '../domain/analytics.js';

const LEVEL_LABELS = [
  { short: 'L1', title: 'Starting out', tone: 'sage' },
  { short: 'L2', title: 'Finding rhythm', tone: 'blue' },
  { short: 'L3', title: 'Growing fluent', tone: 'violet' },
  { short: 'L4', title: 'Almost there', tone: 'amber' },
  { short: 'L5', title: 'Learned', tone: 'gold' },
];

const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const dayFormatter = new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' });
const longDayFormatter = new Intl.DateTimeFormat('en', {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
});
function formatDay(value) {
  return dayFormatter.format(new Date(value));
}

function formatLongDay(value) {
  return longDayFormatter.format(new Date(value));
}

function formatNumber(value) {
  return Number(value ?? 0).toLocaleString('en');
}

/* ------------------------------------------------------------------ charts */

function Sparkline({ points, tone = 'green', height = 30 }) {
  if (!points.length) return null;
  // A single reading draws as a flat line rather than a lone point on the edge.
  const values = points.length === 1 ? [points[0], points[0]] : points;
  const max = Math.max(...values, 1);
  const step = 100 / (values.length - 1);
  const path = values
    .map((value, index) => {
      const x = index * step;
      const y = 28 - (value / max) * 24;
      return `${index === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(' ');
  const area = `${path} L100,30 L0,30 Z`;

  return (
    <svg className={`sparkline sparkline-${tone}`} viewBox="0 0 100 30" preserveAspectRatio="none" height={height} aria-hidden="true">
      <path className="sparkline-area" d={area} />
      <path className="sparkline-line" d={path} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

const CHART = { width: 760, height: 252, padLeft: 36, padRight: 14, padTop: 18, padBottom: 30 };

function niceCeiling(value) {
  if (value <= 5) return 5;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  return Math.ceil(value / magnitude) * magnitude;
}

function VolumeAccuracyChart({ buckets, hoverIndex, onHover }) {
  const plotWidth = CHART.width - CHART.padLeft - CHART.padRight;
  const plotHeight = CHART.height - CHART.padTop - CHART.padBottom;
  const slot = plotWidth / buckets.length;
  const barWidth = Math.max(1.5, Math.min(slot * 0.62, 22));
  const maxTotal = niceCeiling(Math.max(...buckets.map((bucket) => bucket.total), 1));

  const toX = (index) => CHART.padLeft + slot * (index + 0.5);
  const toBarY = (total) => CHART.padTop + plotHeight - (total / maxTotal) * plotHeight;
  const toLineY = (accuracy) => CHART.padTop + plotHeight - (accuracy / 100) * plotHeight;

  // The accuracy line only spans days that actually have answers.
  const segments = [];
  let running = [];
  buckets.forEach((bucket, index) => {
    if (bucket.total > 0) running.push({ index, accuracy: Math.round((bucket.correct / bucket.total) * 100) });
    else if (running.length) {
      segments.push(running);
      running = [];
    }
  });
  if (running.length) segments.push(running);

  const labelEvery = Math.max(1, Math.ceil(buckets.length / 7));
  const gridValues = [0, maxTotal / 2, maxTotal];

  return (
    <svg
      className="volume-chart"
      viewBox={`0 0 ${CHART.width} ${CHART.height}`}
      role="img"
      aria-label={`Cards practised per day with accuracy, ${buckets.length} day window`}
    >
      {gridValues.map((value) => (
        <g key={value}>
          <line
            className="chart-grid"
            x1={CHART.padLeft}
            x2={CHART.width - CHART.padRight}
            y1={toBarY(value)}
            y2={toBarY(value)}
          />
          <text className="chart-axis-label" x={CHART.padLeft - 9} y={toBarY(value) + 3} textAnchor="end">
            {Math.round(value)}
          </text>
        </g>
      ))}

      {buckets.map((bucket, index) => {
        const height = Math.max(bucket.total > 0 ? 2 : 0, plotHeight - (toBarY(bucket.total) - CHART.padTop));
        return (
          <rect
            className={`chart-bar ${hoverIndex === index ? 'is-hovered' : ''} ${bucket.total === 0 ? 'is-empty' : ''}`}
            key={bucket.key}
            x={toX(index) - barWidth / 2}
            y={CHART.padTop + plotHeight - height}
            width={barWidth}
            height={height}
            rx={Math.min(barWidth / 2, 4)}
          />
        );
      })}

      {segments.map((segment) => (
        <path
          className="accuracy-line"
          key={segment[0].index}
          d={segment
            .map((point, index) => `${index === 0 ? 'M' : 'L'}${toX(point.index)},${toLineY(point.accuracy)}`)
            .join(' ')}
        />
      ))}
      {segments.map((segment) =>
        segment.map((point) => (
          <circle
            className={`accuracy-dot ${hoverIndex === point.index ? 'is-hovered' : ''}`}
            key={point.index}
            cx={toX(point.index)}
            cy={toLineY(point.accuracy)}
            r={hoverIndex === point.index ? 4.5 : 2.6}
          />
        )),
      )}

      {buckets.map((bucket, index) => (
        <text
          className="chart-x-label"
          key={`label-${bucket.key}`}
          x={toX(index)}
          y={CHART.height - 10}
          textAnchor="middle"
        >
          {index % labelEvery === 0 ? formatDay(bucket.date) : ''}
        </text>
      ))}

      {buckets.map((bucket, index) => (
        <rect
          className="chart-hit"
          key={`hit-${bucket.key}`}
          x={CHART.padLeft + slot * index}
          y={CHART.padTop}
          width={slot}
          height={plotHeight}
          onMouseEnter={() => onHover(index)}
          onMouseLeave={() => onHover(null)}
        />
      ))}
    </svg>
  );
}

function ConsistencyRing({ percentage, label, caption }) {
  const radius = 46;
  const circumference = 2 * Math.PI * radius;
  const filled = (Math.min(percentage, 100) / 100) * circumference;

  return (
    <div className="consistency-ring-wrap">
      <svg className="consistency-ring" viewBox="0 0 120 120" role="img" aria-label={`${label} consistency`}>
        <circle className="ring-track" cx="60" cy="60" r={radius} />
        <circle
          className="ring-value"
          cx="60"
          cy="60"
          r={radius}
          strokeDasharray={`${filled} ${circumference}`}
          transform="rotate(-90 60 60)"
        />
      </svg>
      <div className="ring-center">
        <strong>{percentage}%</strong>
        <span>{label}</span>
      </div>
      <p>{caption}</p>
    </div>
  );
}

function ActivityHeatmap({ activity, onHoverDay, hoveredDay }) {
  const monthLabels = activity.grid.map((week, index) => {
    const first = week[0].date;
    const previous = activity.grid[index - 1]?.[0].date;
    const isNewMonth = !previous || first.getMonth() !== previous.getMonth();
    // Skip the final column: its label would overflow the right edge.
    const fits = index < activity.grid.length - 1;
    return isNewMonth && fits
      ? new Intl.DateTimeFormat('en', { month: 'short' }).format(first)
      : '';
  });

  return (
    <div className="heatmap">
      <div className="heatmap-grid-area">
        <div className="heatmap-weekdays" aria-hidden="true">
          {WEEKDAY_LABELS.map((label, index) => (
            <span key={`${label}-${index}`}>{index % 2 === 1 ? label : ''}</span>
          ))}
        </div>
        <div className="heatmap-columns">
          <div className="heatmap-months" aria-hidden="true">
            {monthLabels.map((label, index) => (
              <span key={`${label}-${index}`}>{label}</span>
            ))}
          </div>
          <div className="heatmap-cells">
            {activity.grid.map((week, weekIndex) => (
              <div className="heatmap-week" key={week[0].key}>
                {week.map((day) => {
                  const level = day.isFuture ? -1 : intensityFor(day.total, activity.max);
                  return (
                    <span
                      className={`heat-cell level-${level} ${day.isToday ? 'is-today' : ''} ${hoveredDay?.key === day.key ? 'is-hovered' : ''}`}
                      key={day.key}
                      onMouseEnter={() => !day.isFuture && onHoverDay(day)}
                      title={day.isFuture ? undefined : `${formatLongDay(day.date)} · ${day.total} cards`}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="heatmap-footer">
        <div className="heatmap-readout" role="status">
          {hoveredDay ? (
            <>
              <strong>{formatLongDay(hoveredDay.date)}</strong>
              <span>
                {hoveredDay.total
                  ? `${hoveredDay.total} ${hoveredDay.total === 1 ? 'card' : 'cards'} · ${Math.round((hoveredDay.correct / hoveredDay.total) * 100)}% right`
                  : 'Rest day — no cards practised'}
              </span>
            </>
          ) : (
            <span className="heatmap-readout-idle">Hover any day to see what you did</span>
          )}
        </div>
        <div className="heatmap-legend" aria-hidden="true">
          <span>Quiet</span>
          <i className="heat-cell level-0" />
          <i className="heat-cell level-1" />
          <i className="heat-cell level-2" />
          <i className="heat-cell level-3" />
          <i className="heat-cell level-4" />
          <span>Busy</span>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ pieces */

function DeltaPill({ value, suffix = '', invert = false }) {
  if (value === null || value === undefined || Number.isNaN(value)) return null;
  const rounded = Math.round(value);
  if (rounded === 0) {
    return <span className="delta-pill is-flat">— no change</span>;
  }
  const positive = invert ? rounded < 0 : rounded > 0;
  const Icon = rounded > 0 ? TrendingUp : TrendingDown;
  return (
    <span className={`delta-pill ${positive ? 'is-up' : 'is-down'}`}>
      <Icon size={12} />
      {rounded > 0 ? '+' : ''}
      {rounded}
      {suffix}
    </span>
  );
}

function MetricCard({ icon: Icon, label, value, unit, footnote, delta, spark, tone = 'green' }) {
  return (
    <article className={`metric-card tone-${tone}`}>
      <div className="metric-top">
        <span className="metric-icon"><Icon size={17} /></span>
        <div className="metric-label">{label}</div>
      </div>
      <div className="metric-value">{value}{unit && <span>{unit}</span>}</div>
      <div className="metric-foot">{typeof footnote === 'string' ? <span>{footnote}</span> : footnote}</div>
      {spark && <div className="metric-spark">{spark}</div>}
      {delta}
    </article>
  );
}

function LevelPipelineRow({ level, count, accuracy, total, tone }) {
  return (
    <div className={`pipeline-row tone-${tone}`}>
      <span className="pipeline-badge">{LEVEL_LABELS[level - 1].short}</span>
      <div className="pipeline-body">
        <div className="pipeline-head">
          <strong>{LEVEL_LABELS[level - 1].title}</strong>
          <span>{formatNumber(count)} {count === 1 ? 'word' : 'words'}</span>
        </div>
        <div className="pipeline-track">
          <span style={{ width: `${accuracy === null ? 0 : accuracy}%` }} />
        </div>
      </div>
      <span className="pipeline-accuracy">
        {accuracy === null ? <em>not yet</em> : <>{accuracy}%<small>{total} answers</small></>}
      </span>
    </div>
  );
}

/* -------------------------------------------------------------------- page */

export function AnalyticsPage({ state, onNavigate, onStartSession }) {
  const [range, setRange] = useState(30);
  const [hoverIndex, setHoverIndex] = useState(null);
  const [hoveredDay, setHoveredDay] = useState(null);

  const report = useMemo(() => getProgressReport(state, range), [state, range]);
  const { comparison, streak, forecast, stats, activity, buckets, levelAccuracy, movement, toughest, levelCounts, insights } = report;

  const current = comparison.current;
  const accuracyPoints = buckets
    .filter((bucket) => bucket.total > 0)
    .map((bucket) => Math.round((bucket.correct / bucket.total) * 100));
  const volumePoints = buckets.map((bucket) => bucket.total);
  const graduatedPoints = buckets.map((bucket) => bucket.graduated ?? 0);
  const lastSeven = buckets.slice(-7);
  const consistency = range ? Math.round((current.activeDays / range) * 100) : 0;
  const hovered = hoverIndex === null ? null : buckets[hoverIndex];
  const totalWordsDistributed = levelCounts.reduce((total, item) => total + item.count, 0) || 1;
  const recentDays = buckets.filter((bucket) => bucket.total > 0).slice(-7).reverse();
  const recentMax = Math.max(...recentDays.map((day) => day.total), 1);

  const nextLevel = forecast.readyLevels[0] ?? null;

  function startNextRound() {
    if (nextLevel) onStartSession(nextLevel.level, 'progress');
    else onNavigate('study');
  }

  return (
    <div className="page-stack analytics-page">
      <div className="page-heading analytics-heading">
        <div>
          <div className="eyebrow"><span className="eyebrow-dot" /> YOUR PROGRESS</div>
          <h1>Every answer, <span>counted.</span></h1>
          <p>See how your Spanish is really moving — then get straight back to it.</p>
        </div>
        <div className="range-switch" role="group" aria-label="Time range">
          {ANALYTICS_WINDOWS.map((option) => (
            <button
              className={`range-option ${range === option.id ? 'is-selected' : ''}`}
              key={option.id}
              onClick={() => {
                setRange(option.id);
                setHoverIndex(null);
              }}
              aria-pressed={range === option.id}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {!report.hasHistory ? (
        <section className="analytics-empty">
          <div className="analytics-empty-art" aria-hidden="true">
            <span className="empty-ring empty-ring-one" />
            <span className="empty-ring empty-ring-two" />
            <span className="empty-badge"><Activity size={26} /></span>
            <span className="empty-dot empty-dot-one" />
            <span className="empty-dot empty-dot-two">✳</span>
          </div>
          <div className="analytics-empty-copy">
            <div className="welcome-kicker"><Sparkles size={14} /> NOTHING TO CHART YET</div>
            <h2>Your first round writes the first dot.</h2>
            <p>
              Answer a few cards and this page fills in on its own: a day-by-day activity map,
              accuracy by level, a live streak, and a projection of when your bank will be learned.
            </p>
            <ul className="analytics-empty-list">
              <li><Flame size={14} /> Daily streak and momentum</li>
              <li><Gauge size={14} /> Accuracy per level</li>
              <li><CalendarClock size={14} /> Finish-date forecast</li>
            </ul>
            <div className="analytics-empty-actions">
              <button className="button button-primary" onClick={startNextRound}>
                {nextLevel ? `Start ${nextLevel.count} cards` : 'Open study room'} <ArrowRight size={16} />
              </button>
              <button className="text-button" onClick={() => onNavigate('bank')}>
                Add more words <ArrowUpRight size={15} />
              </button>
            </div>
          </div>
        </section>
      ) : (
        <>
          <section className="metric-grid" aria-label={`Key numbers for the last ${range} days`}>
            <MetricCard
              icon={Layers3}
              tone="green"
              label="CARDS PRACTISED"
              value={formatNumber(current.total)}
              footnote={current.bestDay ? `Best day: ${current.bestDay.total} cards` : 'No cards yet'}
              delta={<DeltaPill value={comparison.deltas.total} />}
              spark={<Sparkline points={volumePoints} tone="green" />}
            />
            <MetricCard
              icon={Target}
              tone="blue"
              label="ACCURACY"
              value={current.accuracy === null ? '—' : current.accuracy}
              unit={current.accuracy === null ? undefined : '%'}
              footnote={`${formatNumber(current.correct)} right · ${formatNumber(current.incorrect)} to revisit`}
              delta={<DeltaPill value={comparison.deltas.accuracy} suffix=" pts" />}
              spark={<Sparkline points={accuracyPoints} tone="blue" />}
            />
            <MetricCard
              icon={Flame}
              tone="amber"
              label="DAY STREAK"
              value={streak.current}
              footnote={`Longest run: ${streak.longest} ${streak.longest === 1 ? 'day' : 'days'}`}
              delta={
                streak.practicedToday ? (
                  <span className="delta-pill is-up"><Check size={12} /> Practised today</span>
                ) : (
                  <span className="delta-pill is-down"><MousePointerClick size={12} /> Keep it alive today</span>
                )
              }
              spark={
                <div className="streak-dots" aria-hidden="true">
                  {lastSeven.map((bucket) => (
                    <span className={`streak-dot ${bucket.total > 0 ? 'is-on' : ''}`} key={bucket.key} />
                  ))}
                </div>
              }
            />
            <MetricCard
              icon={Trophy}
              tone="gold"
              label="WORDS LEARNED"
              value={formatNumber(stats.learned)}
              footnote={`${formatNumber(current.graduated)} graduated in this window`}
              delta={
                <span className="delta-pill is-flat">
                  {stats.total ? `${Math.round((stats.learned / stats.total) * 100)}% of your bank` : 'Bank is empty'}
                </span>
              }
              spark={<Sparkline points={graduatedPoints} tone="gold" />}
            />
          </section>

          {insights.length > 0 && (
            <section className="insight-strip" aria-label="Insights from your data">
              {insights.map((insight) => (
                <div className={`insight-chip tone-${insight.tone}`} key={insight.id}>
                  <span className="insight-icon">
                    {insight.tone === 'good' ? <ChevronsUp size={14} /> : insight.tone === 'warn' ? <Activity size={14} /> : <Sparkles size={14} />}
                  </span>
                  <span>{insight.text}</span>
                </div>
              ))}
            </section>
          )}

          <section className="analytics-split">
            <article className="panel chart-panel">
              <div className="panel-heading">
                <div>
                  <div className="section-kicker">VOLUME & ACCURACY</div>
                  <h2>Your rhythm</h2>
                </div>
                <div className="panel-legend">
                  <span><i className="legend-swatch legend-bar" /> cards</span>
                  <span><i className="legend-swatch legend-line" /> accuracy</span>
                </div>
              </div>
              <div className="chart-holder">
                <VolumeAccuracyChart buckets={buckets} hoverIndex={hoverIndex} onHover={setHoverIndex} />
                {hovered && (
                  <div
                    className="chart-tooltip"
                    style={{ left: `${((CHART.padLeft + ((CHART.width - CHART.padLeft - CHART.padRight) / buckets.length) * (hoverIndex + 0.5)) / CHART.width) * 100}%` }}
                  >
                    <strong>{formatLongDay(hovered.date)}</strong>
                    <span>{hovered.total} {hovered.total === 1 ? 'card' : 'cards'}</span>
                    {hovered.total > 0 && <span className="tooltip-accuracy">{Math.round((hovered.correct / hovered.total) * 100)}% right</span>}
                  </div>
                )}
              </div>
            </article>

            <article className="panel consistency-panel">
              <div className="panel-heading">
                <div>
                  <div className="section-kicker">SHOWING UP</div>
                  <h2>Consistency</h2>
                </div>
              </div>
              <ConsistencyRing
                percentage={consistency}
                label="days active"
                caption={`${current.activeDays} of the last ${range} days`}
              />
              <div className="consistency-stats">
                <div><strong>{current.averagePerActiveDay ? current.averagePerActiveDay.toFixed(1) : '0'}</strong><span>cards per active day</span></div>
                <div><strong>{formatNumber(streak.totalDays)}</strong><span>days practised all time</span></div>
              </div>
            </article>
          </section>

          <section className="panel heatmap-panel">
            <div className="panel-heading">
              <div>
                <div className="section-kicker">LAST 13 WEEKS</div>
                <h2>Every day counts</h2>
              </div>
              <div className="heatmap-summary">
                <span><Flame size={14} /> {streak.current}-day streak</span>
                <span><Trophy size={14} /> {formatNumber(current.total)} cards practised</span>
              </div>
            </div>
            <ActivityHeatmap activity={activity} onHoverDay={setHoveredDay} hoveredDay={hoveredDay} />
          </section>

          <section className="analytics-split analytics-split-wide">
            <article className="panel pipeline-panel">
              <div className="panel-heading">
                <div>
                  <div className="section-kicker">WHERE YOUR WORDS SIT</div>
                  <h2>Level pipeline</h2>
                </div>
                <span className="panel-note">{formatNumber(movement.promoted)} promoted · {formatNumber(movement.demoted)} dropped, all time</span>
              </div>
              <div className="pipeline-bar" aria-hidden="true">
                {levelCounts.map((item, index) => (
                  <span
                    className={`pipeline-segment tone-${LEVEL_LABELS[index].tone}`}
                    key={item.level}
                    style={{ width: `${(item.count / totalWordsDistributed) * 100}%` }}
                  />
                ))}
              </div>
              <div className="pipeline-rows">
                {levelAccuracy.map((row, index) => (
                  <LevelPipelineRow
                    key={row.level}
                    level={row.level}
                    count={levelCounts[index].count}
                    accuracy={row.accuracy}
                    total={row.total}
                    tone={LEVEL_LABELS[index].tone}
                  />
                ))}
                <div className="pipeline-row tone-gold is-final">
                  <span className="pipeline-badge">L5</span>
                  <div className="pipeline-body">
                    <div className="pipeline-head">
                      <strong>Learned for good</strong>
                      <span>{formatNumber(stats.learned)} {stats.learned === 1 ? 'word' : 'words'}</span>
                    </div>
                    <div className="pipeline-track is-complete"><span style={{ width: '100%' }} /></div>
                  </div>
                  <span className="pipeline-accuracy"><Check size={14} /></span>
                </div>
              </div>
            </article>

            <div className="analytics-side-stack">
              <article className="panel forecast-panel">
                <div className="panel-heading">
                  <div>
                    <div className="section-kicker">IF YOU KEEP THIS PACE</div>
                    <h2>Finish line</h2>
                  </div>
                  <span className="forecast-icon"><CalendarClock size={17} /></span>
                </div>
                {forecast.hasPace && forecast.daysRemaining !== null ? (
                  <>
                    <div className="forecast-main">
                      <strong>{forecast.daysRemaining}</strong>
                      <span>{forecast.daysRemaining === 1 ? 'day' : 'days'} to go</span>
                    </div>
                    <p className="forecast-date">
                      Around <strong>{formatDay(forecast.projectedDate)}</strong> your whole bank could be learned.
                    </p>
                  </>
                ) : (
                  <>
                    <div className="forecast-main is-idle"><strong>—</strong><span>no pace yet</span></div>
                    <p className="forecast-date">Practise a round and this turns into a real finish date.</p>
                  </>
                )}
                <dl className="forecast-facts">
                  <div><dt>Answers still needed</dt><dd>{formatNumber(forecast.answersNeeded)}</dd></div>
                  <div><dt>Words left to learn</dt><dd>{formatNumber(forecast.remainingWords)}</dd></div>
                  <div><dt>Cards per active day</dt><dd>{forecast.pace ? forecast.pace.toFixed(1) : '—'}</dd></div>
                </dl>
              </article>

              <article className="panel toughest-panel">
                <div className="panel-heading">
                  <div>
                    <div className="section-kicker">WORTH ANOTHER LOOK</div>
                    <h2>Trickiest words</h2>
                  </div>
                </div>
                {toughest.length === 0 ? (
                  <div className="toughest-empty">
                    <Check size={16} />
                    <span>Nothing has slipped yet. Remarkable.</span>
                  </div>
                ) : (
                  <ul className="toughest-list">
                    {toughest.map((word) => (
                      <li key={word.id}>
                        <div className="toughest-word">
                          <strong>{word.spanish}</strong>
                          <span>{word.english}</span>
                        </div>
                        <div className="toughest-meter"><span style={{ width: `${word.accuracy}%` }} /></div>
                        <span className="toughest-count">{word.misses}× missed</span>
                      </li>
                    ))}
                  </ul>
                )}
              </article>
            </div>
          </section>

          <section className="analytics-cta">
            <div className="analytics-cta-copy">
              <div className="welcome-kicker"><Flame size={14} /> {streak.practicedToday ? 'ALREADY TODAY' : 'KEEP IT GOING'}</div>
              <h2>
                {streak.practicedToday
                  ? `You're ${streak.current} ${streak.current === 1 ? 'day' : 'days'} in. One more round makes it stick.`
                  : 'A two-minute round keeps your streak alive.'}
              </h2>
              <p>
                {nextLevel
                  ? `${formatNumber(nextLevel.count)} cards are ready right now in Level ${nextLevel.level}.`
                  : 'Your next set is filling up — check the study room for what is ready.'}
              </p>
            </div>
            <div className="analytics-cta-actions">
              <button className="button button-light" onClick={startNextRound}>
                {nextLevel ? `Review ${nextLevel.count} cards` : 'Open study room'} <ArrowRight size={16} />
              </button>
              <button className="cta-ghost" onClick={() => onNavigate('bank')}>Add words</button>
            </div>
          </section>
        </>
      )}

      {report.hasHistory === false && (
        <section className="panel pipeline-panel">
          <div className="panel-heading">
            <div>
              <div className="section-kicker">WHERE YOUR WORDS SIT</div>
              <h2>Level pipeline</h2>
            </div>
            <span className="panel-note">{formatNumber(stats.total)} words in your bank</span>
          </div>
          <div className="pipeline-bar" aria-hidden="true">
            {levelCounts.map((item, index) => (
              <span
                className={`pipeline-segment tone-${LEVEL_LABELS[index].tone}`}
                key={item.level}
                style={{ width: `${(item.count / totalWordsDistributed) * 100}%` }}
              />
            ))}
          </div>
          <div className="pipeline-rows">
            {levelCounts.map((item, index) => (
              <div className={`pipeline-row tone-${LEVEL_LABELS[index].tone}`} key={item.level}>
                <span className="pipeline-badge">{LEVEL_LABELS[index].short}</span>
                <div className="pipeline-body">
                  <div className="pipeline-head">
                    <strong>{LEVEL_LABELS[index].title}</strong>
                    <span>{formatNumber(item.count)} {item.count === 1 ? 'word' : 'words'}</span>
                  </div>
                  <div className="pipeline-track"><span style={{ width: `${item.count ? 100 : 0}%` }} /></div>
                </div>
                <span className="pipeline-accuracy"><em>no answers yet</em></span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
