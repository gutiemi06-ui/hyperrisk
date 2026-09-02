export type Position = {
  asset: string;
  side: 'Long' | 'Short';
  size: number;
  markPrice: number;
  entryPrice: number;
  liquidationPrice: number;
  leverage: number;
  marginMode: 'Cross' | 'Isolated';
  unrealizedPnl: number;
  funding: number;
};

export const positions: Position[] = [
  {
    asset: 'BTC',
    side: 'Long',
    size: 0.684,
    markPrice: 112842.4,
    entryPrice: 108215.2,
    liquidationPrice: 93420,
    leverage: 3.2,
    marginMode: 'Cross',
    unrealizedPnl: 3165.8,
    funding: -42.38,
  },
  {
    asset: 'ETH',
    side: 'Short',
    size: 8.4,
    markPrice: 4318.6,
    entryPrice: 4472.1,
    liquidationPrice: 4890.7,
    leverage: 2.4,
    marginMode: 'Cross',
    unrealizedPnl: 1289.4,
    funding: 18.22,
  },
  {
    asset: 'SOL',
    side: 'Long',
    size: 92,
    markPrice: 218.74,
    entryPrice: 205.38,
    liquidationPrice: 174.12,
    leverage: 4.1,
    marginMode: 'Isolated',
    unrealizedPnl: 1229.1,
    funding: -14.8,
  },
];

export const markets = [
  {
    asset: 'BTC',
    price: 112842.4,
    change: 2.84,
    funding: 0.0012,
    oi: '$3.82B',
    spread: 0.4,
  },
  {
    asset: 'ETH',
    price: 4318.6,
    change: -0.92,
    funding: 0.0008,
    oi: '$1.74B',
    spread: 0.2,
  },
  {
    asset: 'SOL',
    price: 218.74,
    change: 4.18,
    funding: 0.0021,
    oi: '$684M',
    spread: 0.03,
  },
];

export const equityHistory = [
  { time: '00:00', equity: 46510, exposure: 116200 },
  { time: '04:00', equity: 47120, exposure: 118400 },
  { time: '08:00', equity: 46880, exposure: 121800 },
  { time: '12:00', equity: 48320, exposure: 127600 },
  { time: '16:00', equity: 49180, exposure: 131400 },
  { time: '20:00', equity: 48740, exposure: 133585 },
  { time: 'Now', equity: 49842, exposure: 133585 },
];

export const alerts = [
  {
    severity: 'High',
    title: 'ETH liquidation buffer narrowing',
    detail: '13.2% mark-to-liquidation distance, below the 22% threshold.',
    time: '2m',
  },
  {
    severity: 'Medium',
    title: 'BTC exposure concentration',
    detail: '57.8% of gross exposure is concentrated in BTC.',
    time: '8m',
  },
  {
    severity: 'Info',
    title: 'ETH funding changed rapidly',
    detail: '3-hour funding z-score is 2.1; this is not a price prediction.',
    time: '17m',
  },
];

export const fmtUsd = (value: number, digits = 0) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: digits,
  }).format(value);
