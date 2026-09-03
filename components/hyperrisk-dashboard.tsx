'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BookOpen,
  Bot,
  CircleDot,
  Gauge,
  Info,
  LayoutDashboard,
  Pause,
  Play,
  Radio,
  RotateCcw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  WalletCards,
  WifiOff,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  alerts,
  equityHistory,
  fmtUsd,
  markets,
  positions,
} from '@/lib/demo-data';

const nav = [
  ['Overview', LayoutDashboard],
  ['Markets', Activity],
  ['Portfolio', WalletCards],
  ['Stress test', SlidersHorizontal],
  ['Alerts', AlertTriangle],
  ['Replay', BookOpen],
] as const;

function Metric({
  label,
  value,
  delta,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  delta: string;
  tone?: 'neutral' | 'positive' | 'warning';
}) {
  return (
    <div className="metric-card">
      <div className="metric-label">{label}</div>
      <div className="metric-value">{value}</div>
      <div className={`metric-delta ${tone}`}>{delta}</div>
    </div>
  );
}

const depth = [
  { price: 112839.2, bid: 18.4, ask: 0 },
  { price: 112840.1, bid: 12.1, ask: 0 },
  { price: 112841.6, bid: 7.8, ask: 0 },
  { price: 112842.0, bid: 3.1, ask: 0 },
  { price: 112842.4, bid: 0, ask: 2.8 },
  { price: 112842.8, bid: 0, ask: 6.4 },
  { price: 112844.1, bid: 0, ask: 11.9 },
  { price: 112845.5, bid: 0, ask: 17.2 },
];

const replayFrames = Array.from({ length: 20 }, (_, index) => ({
  offset: index * 250,
  bid: 112839.8 + ((index % 5) - 2) * 1.25,
  ask: 112840.25 + ((index % 5) - 2) * 1.25 + (index % 4) * 0.05,
  imbalance: ((index % 7) - 3) / 10,
  bidDepth: 18.2 + index / 5,
  askDepth: 17.6 - (index % 5) / 6,
  event: index === 14 ? 'Spread z-score crossed 2.0' : '',
}));

function MarketsView() {
  return (
    <div className="detail-view">
      <section className="metric-grid three">
        <Metric
          label="BTC MID PRICE"
          value="$112,842.40"
          delta="84ms last update"
          tone="positive"
        />
        <Metric label="TOP-OF-BOOK SPREAD" value="$0.40" delta="0.035 bps" />
        <Metric
          label="BOOK IMBALANCE"
          value="+0.17"
          delta="Bid weighted · 20 levels"
        />
      </section>
      <div className="detail-grid">
        <div className="panel detail-panel">
          <div className="section-heading">
            <div>
              <span className="panel-kicker">LIVE MARKET DATA</span>
              <h2>Perpetuals terminal</h2>
            </div>
            <span className="fresh-badge">
              <CircleDot size={12} /> Fresh
            </span>
          </div>
          <table className="market-table">
            <thead>
              <tr>
                <th>Market</th>
                <th>Mark</th>
                <th>24h</th>
                <th>Funding / hr</th>
                <th>Open interest</th>
                <th>Spread</th>
              </tr>
            </thead>
            <tbody>
              {markets.map((market) => (
                <tr key={market.asset}>
                  <td>
                    <b>{market.asset}-USD</b>
                  </td>
                  <td>{fmtUsd(market.price, 2)}</td>
                  <td className={market.change > 0 ? 'up' : 'down'}>
                    {market.change > 0 ? '+' : ''}
                    {market.change}%
                  </td>
                  <td>{market.funding.toFixed(4)}%</td>
                  <td>{market.oi}</td>
                  <td>{fmtUsd(market.spread, 2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="ingestion-state">
            <span>
              <CircleDot size={12} /> WebSocket snapshot stream
            </span>
            <span>Reconnect attempts: 0</span>
            <span>Queue: 4 / 1,000</span>
            <span>Stale after: 10s</span>
          </div>
        </div>
        <div className="panel detail-panel">
          <div className="section-heading">
            <div>
              <span className="panel-kicker">BTC ORDER BOOK</span>
              <h2>Aggregated depth</h2>
            </div>
            <span className="mono">0.40 spread</span>
          </div>
          <ResponsiveContainer width="100%" height={290}>
            <BarChart
              data={depth}
              layout="vertical"
              margin={{ top: 15, right: 16, bottom: 5, left: 12 }}
            >
              <CartesianGrid stroke="#202b29" horizontal={false} />
              <XAxis type="number" tick={{ fill: '#74827e', fontSize: 9 }} />
              <YAxis
                dataKey="price"
                type="category"
                width={72}
                tick={{ fill: '#9aaba6', fontSize: 9 }}
              />
              <Tooltip
                contentStyle={{
                  background: '#101716',
                  border: '1px solid #2b3835',
                  fontSize: 11,
                }}
              />
              <Bar dataKey="bid" stackId="a" fill="#3aa788" />
              <Bar dataKey="ask" stackId="a" fill="#c65f66" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="state-strip">
        <Info size={14} />
        <span>
          <b>Failure-state ready:</b> malformed frames are discarded, oldest
          queued messages are dropped under backpressure, and stale data is
          visibly labelled after 10 seconds.
        </span>
      </div>
    </div>
  );
}

function PortfolioView() {
  const allocationColors = ['#56d6b0', '#8295d2', '#d7a45b'];
  const allocation = positions.map((position, index) => ({
    name: position.asset,
    value: Math.abs(position.size * position.markPrice),
    fill: allocationColors[index],
  }));
  const drawdown = equityHistory.map((point, index) => ({
    ...point,
    drawdown: [0, -0.8, -1.4, -0.2, 0, -0.9, -0.3][index],
  }));
  return (
    <div className="detail-view">
      <section className="metric-grid">
        <Metric
          label="LONG EXPOSURE"
          value="$97,308.28"
          delta="72.8% of gross"
        />
        <Metric
          label="SHORT EXPOSURE"
          value="$36,276.24"
          delta="27.2% of gross"
        />
        <Metric label="NET EXPOSURE" value="$61,032.04" delta="Net long" />
        <Metric
          label="EST. FUNDING / HOUR"
          value="-$1.06"
          delta="Local estimate"
          tone="warning"
        />
      </section>
      <div className="detail-grid portfolio-detail">
        <div className="panel detail-panel">
          <div className="section-heading">
            <div>
              <span className="panel-kicker">HISTORICAL ANALYTICS</span>
              <h2>Equity, exposure & drawdown</h2>
            </div>
            <span className="fixture-label">SYNTHETIC FIXTURE</span>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart
              data={drawdown}
              margin={{ top: 20, right: 20, left: 5, bottom: 0 }}
            >
              <CartesianGrid stroke="#202b29" strokeDasharray="3 5" />
              <XAxis dataKey="time" tick={{ fill: '#74827e', fontSize: 9 }} />
              <YAxis yAxisId="left" hide />
              <YAxis yAxisId="right" hide />
              <Tooltip
                contentStyle={{
                  background: '#101716',
                  border: '1px solid #2b3835',
                  fontSize: 11,
                }}
              />
              <Line
                yAxisId="left"
                dataKey="equity"
                stroke="#56d6b0"
                strokeWidth={2}
                dot={false}
              />
              <Line
                yAxisId="right"
                dataKey="exposure"
                stroke="#7894d4"
                strokeWidth={1.5}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
          <div className="chart-legend">
            <span>
              <i className="equity-dot" />
              Equity
            </span>
            <span>
              <i className="blue-dot" />
              Gross exposure
            </span>
            <span>
              Max drawdown <b>-4.8%</b>
            </span>
          </div>
        </div>
        <div className="panel detail-panel">
          <div className="section-heading">
            <div>
              <span className="panel-kicker">CONCENTRATION</span>
              <h2>Gross exposure</h2>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={230}>
            <PieChart>
              <Pie
                data={allocation}
                dataKey="value"
                nameKey="name"
                innerRadius={58}
                outerRadius={86}
                paddingAngle={3}
              />
              <Tooltip
                formatter={(value) => fmtUsd(Number(value))}
                contentStyle={{
                  background: '#101716',
                  border: '1px solid #2b3835',
                  fontSize: 11,
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="allocation-list">
            {allocation.map((item, index) => (
              <div key={item.name}>
                <span>
                  <i
                    style={{
                      background: allocationColors[index],
                    }}
                  />
                  {item.name}
                </span>
                <b>
                  {(
                    (item.value /
                      allocation.reduce((sum, row) => sum + row.value, 0)) *
                    100
                  ).toFixed(1)}
                  %
                </b>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="formula-card">
        <Info size={15} />
        <div>
          <b>Exact vs. estimated</b>
          <p>
            Account equity, margin used, mark price, reported P&L, and
            liquidation prices are protocol values when returned. Exposure,
            effective leverage, concentration, funding impact, and
            mark-to-liquidation distance are local Decimal calculations.
          </p>
        </div>
      </div>
    </div>
  );
}

function StressView() {
  const [btc, setBtc] = useState(-10);
  const [eth, setEth] = useState(-15);
  const [vol, setVol] = useState(25);
  const [funding, setFunding] = useState(3);
  const result = useMemo(() => {
    const btcPnl = (0.684 * 112842.4 * btc) / 100;
    const ethPnl = (-8.4 * 4318.6 * eth) / 100;
    const haircut = ((133584.52 * vol) / 100) * 0.015;
    const fundingImpact = -1.06 * (funding - 1);
    const pnl = btcPnl + ethPnl - haircut + fundingImpact;
    const equity = 49842.18 + pnl;
    return { pnl, equity, leverage: equity > 0 ? 133584.52 / equity : null };
  }, [btc, eth, vol, funding]);
  const applyPreset = (name: string) => {
    if (name === 'Crash') {
      setBtc(-10);
      setEth(-15);
      setVol(60);
      setFunding(5);
    } else if (name === 'Funding') {
      setBtc(0);
      setEth(0);
      setVol(0);
      setFunding(10);
    } else {
      setBtc(-5);
      setEth(-8);
      setVol(25);
      setFunding(3);
    }
  };
  return (
    <div className="stress-layout">
      <div className="panel scenario-panel">
        <div className="section-heading">
          <div>
            <span className="panel-kicker">SCENARIO CONTROLS</span>
            <h2>Interactive market shock</h2>
          </div>
          <button
            onClick={() => {
              setBtc(0);
              setEth(0);
              setVol(0);
              setFunding(1);
            }}
          >
            <RotateCcw size={13} /> Reset
          </button>
        </div>
        <div className="presets">
          <button onClick={() => applyPreset('Crash')}>Crypto crash</button>
          <button onClick={() => applyPreset('Funding')}>Funding spike</button>
          <button onClick={() => applyPreset('Risk-off')}>Risk-off</button>
        </div>
        <div className="sliders">
          <label>
            <span>
              BTC price shock <b>{btc}%</b>
            </span>
            <input
              aria-label="BTC price shock"
              type="range"
              min="-40"
              max="30"
              value={btc}
              onChange={(event) => setBtc(Number(event.target.value))}
            />
          </label>
          <label>
            <span>
              ETH price shock <b>{eth}%</b>
            </span>
            <input
              aria-label="ETH price shock"
              type="range"
              min="-40"
              max="30"
              value={eth}
              onChange={(event) => setEth(Number(event.target.value))}
            />
          </label>
          <label>
            <span>
              Volatility expansion <b>+{vol}%</b>
            </span>
            <input
              aria-label="Volatility expansion"
              type="range"
              min="0"
              max="150"
              value={vol}
              onChange={(event) => setVol(Number(event.target.value))}
            />
          </label>
          <label>
            <span>
              Funding-rate multiplier <b>{funding}×</b>
            </span>
            <input
              aria-label="Funding multiplier"
              type="range"
              min="1"
              max="12"
              value={funding}
              onChange={(event) => setFunding(Number(event.target.value))}
            />
          </label>
        </div>
      </div>
      <div className="stress-results">
        <section className="metric-grid two">
          <Metric
            label="EST. P&L CHANGE"
            value={fmtUsd(result.pnl, 2)}
            delta="Linear mark-to-market"
            tone={result.pnl < 0 ? 'warning' : 'positive'}
          />
          <Metric
            label="EST. ACCOUNT EQUITY"
            value={fmtUsd(result.equity, 2)}
            delta={`${((result.equity / 49842.18 - 1) * 100).toFixed(1)}% vs baseline`}
            tone={result.equity < 35000 ? 'warning' : 'neutral'}
          />
          <Metric
            label="EST. EFFECTIVE LEVERAGE"
            value={result.leverage ? `${result.leverage.toFixed(2)}×` : 'N/M'}
            delta="Gross / stressed equity"
          />
          <Metric
            label="LIQUIDATION RISK"
            value={btc < -18 || eth > 13 ? 'Critical' : 'Elevated'}
            delta="Protocol prices held constant"
            tone="warning"
          />
        </section>
        <div className="panel formula-panel">
          <span className="panel-kicker">TRANSPARENT METHODOLOGY</span>
          <h2>How this scenario is calculated</h2>
          <ol>
            <li>
              <b>Position P&L:</b> signed size × (stressed mark − current mark).
            </li>
            <li>
              <b>Equity:</b> protocol account equity + total scenario P&L −
              modelled haircuts.
            </li>
            <li>
              <b>Volatility haircut:</b> gross notional × expansion % × 1.5%.
            </li>
            <li>
              <b>Funding:</b> one estimated hourly payment × selected
              multiplier.
            </li>
          </ol>
          <p>
            Position sizes, entry prices, and reported liquidation prices stay
            fixed. Results are local estimates, not official Hyperliquid margin
            or liquidation calculations.
          </p>
        </div>
      </div>
    </div>
  );
}

function AlertsView() {
  return (
    <div className="detail-view">
      <div className="alert-summary">
        <Metric
          label="ACTIVE ALERTS"
          value="3"
          delta="1 high · 1 medium · 1 info"
          tone="warning"
        />
        <div className="state-strip">
          <Info size={14} />
          <span>
            Alerts describe unusual conditions using configurable thresholds.
            They do not forecast returns or price direction.
          </span>
        </div>
      </div>
      <div className="panel alerts-ledger">
        <div className="section-heading">
          <div>
            <span className="panel-kicker">EXPLAINABLE SIGNALS</span>
            <h2>Risk event timeline</h2>
          </div>
          <button>Configure thresholds</button>
        </div>
        {alerts.map((alert, index) => (
          <article key={alert.title}>
            <div className="timeline-mark">
              <span className={alert.severity.toLowerCase()} />
            </div>
            <div className="event-body">
              <div>
                <span className={`severity ${alert.severity.toLowerCase()}`}>
                  {alert.severity}
                </span>
                <time>13:{50 - index * 7}:12 UTC</time>
              </div>
              <h3>{alert.title}</h3>
              <p>{alert.detail}</p>
              <dl>
                <div>
                  <dt>Observed</dt>
                  <dd>
                    {index === 0 ? '13.2%' : index === 1 ? '57.8%' : '2.10 z'}
                  </dd>
                </div>
                <div>
                  <dt>Threshold</dt>
                  <dd>
                    {index === 0
                      ? '≤ 22.0%'
                      : index === 1
                        ? '≥ 50.0%'
                        : '≥ 2.00 z'}
                  </dd>
                </div>
                <div>
                  <dt>Method</dt>
                  <dd>{index === 2 ? 'Rolling z-score' : 'Configured rule'}</dd>
                </div>
              </dl>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function ReplayView() {
  const [frame, setFrame] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(
      () =>
        setFrame((value) => (value >= replayFrames.length - 1 ? 0 : value + 1)),
      250 / speed,
    );
    return () => clearInterval(timer);
  }, [playing, speed]);
  const current = replayFrames[frame];
  return (
    <div className="detail-view">
      <div className="replay-controls">
        <button
          className="play-button"
          onClick={() => setPlaying((value) => !value)}
        >
          {playing ? <Pause size={16} /> : <Play size={16} />}{' '}
          {playing ? 'Pause' : 'Play replay'}
        </button>
        <button onClick={() => setFrame(0)}>
          <RotateCcw size={14} /> Restart
        </button>
        <div className="speed-control">
          {[0.5, 1, 2, 4].map((value) => (
            <button
              className={speed === value ? 'selected' : ''}
              key={value}
              onClick={() => setSpeed(value)}
            >
              {value}×
            </button>
          ))}
        </div>
        <span>
          Frame {frame + 1} / {replayFrames.length} · {current.offset}ms
        </span>
      </div>
      <div className="detail-grid replay-grid">
        <div className="panel detail-panel">
          <div className="section-heading">
            <div>
              <span className="panel-kicker">DETERMINISTIC L2 REPLAY</span>
              <h2>BTC bid / ask</h2>
            </div>
            <span className="fixture-label">synthetic-btc-l2-2026-08-31</span>
          </div>
          <ResponsiveContainer width="100%" height={310}>
            <LineChart
              data={replayFrames.slice(0, frame + 1)}
              margin={{ top: 20, right: 20, left: 5, bottom: 5 }}
            >
              <CartesianGrid stroke="#202b29" strokeDasharray="3 5" />
              <XAxis dataKey="offset" tick={{ fill: '#74827e', fontSize: 9 }} />
              <YAxis
                domain={['dataMin - 2', 'dataMax + 2']}
                tick={{ fill: '#74827e', fontSize: 9 }}
                width={55}
              />
              <Tooltip
                contentStyle={{
                  background: '#101716',
                  border: '1px solid #2b3835',
                  fontSize: 11,
                }}
              />
              <Line
                type="stepAfter"
                dataKey="bid"
                stroke="#56d6b0"
                dot={false}
              />
              <Line
                type="stepAfter"
                dataKey="ask"
                stroke="#f07d80"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="panel replay-stats">
          <span className="panel-kicker">CURRENT FRAME</span>
          <div>
            <span>Best bid</span>
            <b className="up">{fmtUsd(current.bid, 2)}</b>
          </div>
          <div>
            <span>Best ask</span>
            <b className="down">{fmtUsd(current.ask, 2)}</b>
          </div>
          <div>
            <span>Spread</span>
            <b>{fmtUsd(current.ask - current.bid, 2)}</b>
          </div>
          <div>
            <span>Imbalance</span>
            <b>
              {current.imbalance > 0 ? '+' : ''}
              {current.imbalance.toFixed(2)}
            </b>
          </div>
          <div>
            <span>Bid / ask depth</span>
            <b>
              {current.bidDepth.toFixed(1)} / {current.askDepth.toFixed(1)}
            </b>
          </div>
          {current.event && (
            <div className="replay-event">
              <AlertTriangle size={15} />
              <span>{current.event}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DetailView({ active }: { active: string }) {
  if (active === 'Markets') return <MarketsView />;
  if (active === 'Portfolio') return <PortfolioView />;
  if (active === 'Stress test') return <StressView />;
  if (active === 'Alerts') return <AlertsView />;
  return <ReplayView />;
}

export function HyperRiskDashboard() {
  const [active, setActive] = useState('Overview');
  const shellRef = useRef<HTMLDivElement>(null);
  const [wallet, setWallet] = useState('0x7a3E...91C2');
  const [connection, setConnection] = useState<
    'fixture' | 'loading' | 'live' | 'error'
  >('fixture');
  const titles: Record<string, [string, string]> = {
    Overview: [
      'Risk overview',
      'Monitor exposure, leverage, and liquidation risk in real time.',
    ],
    Markets: [
      'Market terminal',
      'Inspect prices, funding, open interest, spread, and order-book depth.',
    ],
    Portfolio: [
      'Portfolio analytics',
      'Trace P&L, exposure, concentration, funding, and liquidation distance.',
    ],
    'Stress test': [
      'Stress testing',
      'Apply transparent market shocks and inspect the estimated portfolio impact.',
    ],
    Alerts: [
      'Risk alerts',
      'Review statistical anomalies and threshold-based portfolio events.',
    ],
    Replay: [
      'Order-book replay',
      'Replay a reproducible BTC depth session at deterministic speeds.',
    ],
  };
  const loadWallet = async () => {
    if (!/^0x[0-9a-fA-F]{40}$/.test(wallet)) {
      setConnection('error');
      return;
    }
    setConnection('loading');
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'}/api/v1/portfolio/${wallet}`,
      );
      if (!response.ok) throw new Error('upstream failure');
      await response.json();
      setConnection('live');
    } catch {
      setConnection('error');
    }
  };
  useEffect(() => {
    const shell = shellRef.current;
    if (!shell) return;
    shell.dataset.hydrated = 'true';
    return () => {
      delete shell.dataset.hydrated;
    };
  }, []);
  useEffect(() => {
    type ToolContext = {
      registerTool: (
        tool: Record<string, unknown>,
        options?: { signal: AbortSignal },
      ) => void | Promise<void>;
    };
    const context = (document as Document & { modelContext?: ToolContext })
      .modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    const views = nav.map(([label]) => label);
    void Promise.resolve(
      context.registerTool(
        {
          name: 'open_hyperrisk_view',
          title: 'Open HyperRisk view',
          description:
            'Navigate the visible read-only HyperRisk dashboard to a named analytics view.',
          inputSchema: {
            type: 'object',
            properties: { view: { type: 'string', enum: views } },
            required: ['view'],
            additionalProperties: false,
          },
          annotations: { readOnlyHint: true, untrustedContentHint: false },
          execute: (input: unknown) => {
            const view = (input as { view?: string })?.view;
            if (!view || !views.includes(view as (typeof views)[number]))
              throw new Error('Unknown HyperRisk view');
            setActive(view);
            return { view, status: 'opened' };
          },
        },
        { signal: lifecycle.signal },
      ),
    ).catch(() => undefined);
    return () => lifecycle.abort();
  }, []);

  return (
    <div ref={shellRef} className="terminal-shell" data-hydrated="false">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">
            <Gauge size={18} />
          </span>
          <div>
            <strong>HyperRisk</strong>
            <span>Risk intelligence</span>
          </div>
        </div>
        <div className="market-tape" aria-label="Live market summary">
          {markets.map((market) => (
            <div className="ticker" key={market.asset}>
              <b>{market.asset}</b>
              <span>
                {fmtUsd(market.price, market.asset === 'BTC' ? 0 : 2)}
              </span>
              <span className={market.change > 0 ? 'up' : 'down'}>
                {market.change > 0 ? '+' : ''}
                {market.change}%
              </span>
            </div>
          ))}
        </div>
        <div className={`connection ${connection}`}>
          <span className="status-dot" />{' '}
          {connection === 'fixture'
            ? 'Fixture'
            : connection === 'loading'
              ? 'Connecting'
              : connection === 'live'
                ? 'Live'
                : 'Disconnected'}{' '}
          <span className="latency">
            {connection === 'live' ? '84ms' : 'read-only'}
          </span>
        </div>
      </header>
      <aside className="sidebar">
        <nav aria-label="Primary navigation">
          {nav.map(([label, Icon]) => (
            <button
              className={active === label ? 'active' : ''}
              key={label}
              onClick={() => setActive(label)}
            >
              <Icon size={17} />
              <span>{label}</span>
              {label === 'Alerts' && <i>3</i>}
            </button>
          ))}
        </nav>
        <div className="sidebar-foot">
          <div className="read-only">
            <ShieldCheck size={16} />
            <div>
              <b>Read-only</b>
              <span>No trading permissions</span>
            </div>
          </div>
          <button className="docs-link">
            <Bot size={16} /> Methodology
          </button>
        </div>
      </aside>
      <main className="main-content">
        <section className="page-head">
          <div>
            <p className="eyebrow">
              PORTFOLIO /{' '}
              {connection === 'live' ? 'PUBLIC WALLET' : 'DEMO ACCOUNT'}
            </p>
            <h1>{titles[active][0]}</h1>
            <p>{titles[active][1]}</p>
          </div>
          <div
            className={`wallet-control ${connection === 'error' ? 'invalid' : ''}`}
          >
            <Search size={16} />
            <input
              aria-label="Public wallet address"
              aria-invalid={connection === 'error'}
              value={wallet}
              onChange={(event) => {
                setWallet(event.target.value);
                if (connection === 'error') setConnection('fixture');
              }}
            />
            <button onClick={loadWallet} disabled={connection === 'loading'}>
              {connection === 'loading' ? 'Loading…' : 'Load'}
            </button>
          </div>
        </section>
        <div className={`data-notice ${connection === 'error' ? 'error' : ''}`}>
          {connection === 'error' ? (
            <WifiOff size={15} />
          ) : (
            <CircleDot size={15} />
          )}
          <span>
            <b>
              {connection === 'live'
                ? 'Live public account'
                : connection === 'error'
                  ? 'Wallet unavailable'
                  : 'Seeded demonstration'}
            </b>{' '}
            ·{' '}
            {connection === 'live'
              ? 'Read-only Hyperliquid account state'
              : connection === 'error'
                ? 'Enter a 42-character 0x address and confirm the API is running'
                : 'Synthetic account history with reproducible market fixtures'}
          </span>
          <button
            onClick={() => {
              setWallet('0x7a3E...91C2');
              setConnection('fixture');
            }}
          >
            {connection === 'fixture' ? 'Use live wallet' : 'Return to demo'}
          </button>
        </div>
        {active === 'Overview' ? (
          <>
            <section className="metric-grid">
              <Metric
                label="ACCOUNT EQUITY"
                value="$49,842.18"
                delta="+$1,102.24 today"
                tone="positive"
              />
              <Metric
                label="GROSS EXPOSURE"
                value="$133,584.52"
                delta="2.68× effective leverage"
              />
              <Metric
                label="UNREALIZED P&L"
                value="+$5,684.30"
                delta="11.4% of equity"
                tone="positive"
              />
              <Metric
                label="MIN. LIQ. DISTANCE"
                value="13.2%"
                delta="ETH · cross margin"
                tone="warning"
              />
            </section>
            <section className="overview-grid">
              <div className="panel chart-panel">
                <div className="panel-head">
                  <div>
                    <span className="panel-kicker">PORTFOLIO EQUITY</span>
                    <h2>$49,842.18</h2>
                  </div>
                  <div className="range-picker">
                    <button>1D</button>
                    <button className="selected">1W</button>
                    <button>1M</button>
                    <button>ALL</button>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={245}>
                  <AreaChart
                    data={equityHistory}
                    margin={{ top: 16, right: 4, left: 2, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="equity" x1="0" y1="0" x2="0" y2="1">
                        <stop
                          offset="0%"
                          stopColor="#56d6b0"
                          stopOpacity={0.28}
                        />
                        <stop
                          offset="100%"
                          stopColor="#56d6b0"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      stroke="#26312f"
                      strokeDasharray="3 5"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="time"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: '#74827e', fontSize: 11 }}
                    />
                    <YAxis hide domain={['dataMin - 1000', 'dataMax + 1000']} />
                    <Tooltip
                      contentStyle={{
                        background: '#101716',
                        border: '1px solid #2b3835',
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                      formatter={(value) => fmtUsd(Number(value))}
                    />
                    <Area
                      type="monotone"
                      dataKey="equity"
                      stroke="#56d6b0"
                      strokeWidth={2}
                      fill="url(#equity)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
                <div className="chart-legend">
                  <span>
                    <i className="equity-dot" />
                    Equity
                  </span>
                  <span>
                    Max drawdown <b>-4.8%</b>
                  </span>
                  <span>
                    Realized P&L <b className="up">+$2,184</b>
                  </span>
                </div>
              </div>
              <div className="panel risk-panel">
                <div className="panel-title">
                  <div>
                    <span className="panel-kicker">RISK SIGNAL</span>
                    <h2>Elevated</h2>
                  </div>
                  <span className="risk-score">
                    72<span>/100</span>
                  </span>
                </div>
                <div className="risk-bar">
                  <span style={{ width: '72%' }} />
                </div>
                <div className="risk-factors">
                  <div>
                    <span>Concentration</span>
                    <b>High</b>
                  </div>
                  <div>
                    <span>Leverage</span>
                    <b className="medium">Moderate</b>
                  </div>
                  <div>
                    <span>Liquidation buffer</span>
                    <b>Watch</b>
                  </div>
                </div>
                <div className="ai-summary">
                  <Bot size={17} />
                  <div>
                    <b>Deterministic risk brief</b>
                    <p>
                      BTC drives 57.8% of gross exposure. The nearest
                      liquidation level is ETH at a 13.2% buffer. Current
                      effective leverage is moderate.
                    </p>
                    <button>View full explanation →</button>
                  </div>
                </div>
              </div>
            </section>
            <section className="bottom-grid">
              <div className="panel positions-panel">
                <div className="section-heading">
                  <div>
                    <span className="panel-kicker">OPEN POSITIONS</span>
                    <h2>3 active positions</h2>
                  </div>
                  <button>Portfolio details →</button>
                </div>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Asset</th>
                        <th>Side</th>
                        <th>Notional</th>
                        <th>Entry / Mark</th>
                        <th>Unrealized P&L</th>
                        <th>Liq. distance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {positions.map((position) => {
                        const notional = position.size * position.markPrice;
                        const liqDistance =
                          (Math.abs(
                            position.markPrice - position.liquidationPrice,
                          ) /
                            position.markPrice) *
                          100;
                        return (
                          <tr key={position.asset}>
                            <td>
                              <span
                                className={`asset-icon ${position.asset.toLowerCase()}`}
                              >
                                {position.asset.slice(0, 1)}
                              </span>
                              <b>{position.asset}</b>
                            </td>
                            <td>
                              <span
                                className={
                                  position.side === 'Long'
                                    ? 'side-long'
                                    : 'side-short'
                                }
                              >
                                {position.side === 'Long' ? (
                                  <ArrowUpRight size={13} />
                                ) : (
                                  <ArrowDownRight size={13} />
                                )}{' '}
                                {position.side}
                              </span>
                            </td>
                            <td>{fmtUsd(notional)}</td>
                            <td>
                              <span>{fmtUsd(position.entryPrice, 2)}</span>
                              <b>{fmtUsd(position.markPrice, 2)}</b>
                            </td>
                            <td className="up">
                              +{fmtUsd(position.unrealizedPnl, 2)}
                            </td>
                            <td>
                              <span
                                className={
                                  liqDistance < 22
                                    ? 'distance warning'
                                    : 'distance'
                                }
                              >
                                {liqDistance.toFixed(1)}%
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="panel alerts-panel">
                <div className="section-heading">
                  <div>
                    <span className="panel-kicker">ACTIVE ALERTS</span>
                    <h2>Attention required</h2>
                  </div>
                  <button>View all</button>
                </div>
                <div className="alert-list">
                  {alerts.map((alert) => (
                    <article key={alert.title}>
                      <span
                        className={`alert-icon ${alert.severity.toLowerCase()}`}
                      >
                        <AlertTriangle size={15} />
                      </span>
                      <div>
                        <div>
                          <b>{alert.title}</b>
                          <time>{alert.time}</time>
                        </div>
                        <p>{alert.detail}</p>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            </section>
          </>
        ) : (
          <DetailView active={active} />
        )}
        <footer>
          <span>
            <Radio size={13} />{' '}
            {connection === 'live'
              ? 'Hyperliquid mainnet · API connected'
              : 'Reproducible demo fixture · no network required'}
          </span>
          <span>All timestamps UTC · Read-only by design</span>
        </footer>
      </main>
    </div>
  );
}
