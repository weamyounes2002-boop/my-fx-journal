export interface Trade {
  id: string;
  symbol: string; // keeping for backward compatibility
  pair: string;
  type: 'buy' | 'sell';
  entryPrice: number;
  exitPrice?: number;
  stopLoss: number;
  takeProfit: number;
  positionSize: number; // in lots
  entryDate: string;
  exitDate?: string;
  pnl?: number;
  status: 'open' | 'closed';
  tags: string[];
  exitType?: 'stop_loss' | 'take_profit' | 'manual' | 'trailing_stop';
  notes: string; // HTML string for rich text
  volume?: number; // keeping for backward compatibility
  screenshot?: string;
  rulesFollowed?: string[]; // IDs of trading rules followed
  session?: 'Asian Session' | 'London Session' | 'NY AM Session' | 'NY PM Session' | 'London Close' | 'CBDR';
  accountId: string; // Link trade to specific account
}

export interface Account {
  id: string;
  name: string;
  broker: string;
  accountNumber: string;
  balance: number;
  equity: number;
  connected: boolean;
  currency: string;
  accountType: 'live' | 'demo';
}

export interface Goal {
  id: string;
  type: 'monthly' | 'quarterly';
  targetProfit: number;
  targetWinRate: number;
  targetTrades: number;
  currentProfit: number;
  currentWinRate: number;
  currentTrades: number;
  startDate: string;
  endDate: string;
  description: string;
  status: 'active' | 'completed' | 'failed' | 'expired';
  createdAt: string;
  accountId: string; // Link goal to specific account
}

export interface TradingRule {
  id: string;
  rule: string;
  isCustom: boolean;
  complianceRate: number;
  totalChecks: number;
  followed: number;
  violated: number;
}

export interface Milestone {
  id: string;
  name: string;
  description: string;
  type: 'profit' | 'winstreak' | 'trades' | 'winrate' | 'consistency';
  threshold: number;
  achieved: boolean;
  dateAchieved?: string;
  icon: string;
}

export interface InstrumentGroup {
  label: string;
  instruments: Array<{ value: string; label: string; type: string }>;
}

// Expanded instrument list with categories
export const INSTRUMENT_GROUPS: InstrumentGroup[] = [
  {
    label: 'Forex Majors',
    instruments: [
      { value: 'EUR/USD', label: 'EUR/USD', type: '💱 Forex' },
      { value: 'GBP/USD', label: 'GBP/USD', type: '💱 Forex' },
      { value: 'USD/JPY', label: 'USD/JPY', type: '💱 Forex' },
      { value: 'USD/CHF', label: 'USD/CHF', type: '💱 Forex' },
      { value: 'AUD/USD', label: 'AUD/USD', type: '💱 Forex' },
      { value: 'USD/CAD', label: 'USD/CAD', type: '💱 Forex' },
      { value: 'NZD/USD', label: 'NZD/USD', type: '💱 Forex' }
    ]
  },
  {
    label: 'Forex Crosses',
    instruments: [
      { value: 'EUR/GBP', label: 'EUR/GBP', type: '💱 Forex' },
      { value: 'EUR/JPY', label: 'EUR/JPY', type: '💱 Forex' },
      { value: 'GBP/JPY', label: 'GBP/JPY', type: '💱 Forex' },
      { value: 'EUR/AUD', label: 'EUR/AUD', type: '💱 Forex' },
      { value: 'GBP/AUD', label: 'GBP/AUD', type: '💱 Forex' },
      { value: 'EUR/CAD', label: 'EUR/CAD', type: '💱 Forex' },
      { value: 'AUD/JPY', label: 'AUD/JPY', type: '💱 Forex' },
      { value: 'NZD/JPY', label: 'NZD/JPY', type: '💱 Forex' },
      { value: 'GBP/CAD', label: 'GBP/CAD', type: '💱 Forex' },
      { value: 'EUR/NZD', label: 'EUR/NZD', type: '💱 Forex' },
      { value: 'AUD/CAD', label: 'AUD/CAD', type: '💱 Forex' },
      { value: 'GBP/NZD', label: 'GBP/NZD', type: '💱 Forex' }
    ]
  },
  {
    label: 'Commodities',
    instruments: [
      { value: 'XAU/USD', label: 'XAU/USD (Gold)', type: '🥇 Commodity' },
      { value: 'XAG/USD', label: 'XAG/USD (Silver)', type: '🥇 Commodity' },
      { value: 'WTI/USD', label: 'WTI/USD (Crude Oil)', type: '🥇 Commodity' },
      { value: 'BRN/USD', label: 'BRN/USD (Brent Oil)', type: '🥇 Commodity' },
      { value: 'XPT/USD', label: 'XPT/USD (Platinum)', type: '🥇 Commodity' },
      { value: 'XPD/USD', label: 'XPD/USD (Palladium)', type: '🥇 Commodity' },
      { value: 'NatGas/USD', label: 'NatGas/USD (Natural Gas)', type: '🥇 Commodity' }
    ]
  },
  {
    label: 'Indices',
    instruments: [
      { value: 'US30', label: 'US30 (Dow Jones)', type: '📊 Index' },
      { value: 'NAS100', label: 'NAS100 (Nasdaq 100)', type: '📊 Index' },
      { value: 'SPX500', label: 'SPX500 (S&P 500)', type: '📊 Index' },
      { value: 'UK100', label: 'UK100 (FTSE 100)', type: '📊 Index' },
      { value: 'GER40', label: 'GER40 (DAX 40)', type: '📊 Index' },
      { value: 'FRA40', label: 'FRA40 (CAC 40)', type: '📊 Index' },
      { value: 'JPN225', label: 'JPN225 (Nikkei 225)', type: '📊 Index' },
      { value: 'AUS200', label: 'AUS200 (ASX 200)', type: '📊 Index' }
    ]
  }
];

// Legacy currency pairs for backward compatibility
export const CURRENCY_PAIRS = [
  'EUR/USD', 'GBP/USD', 'USD/JPY', 'AUD/USD', 'USD/CAD',
  'USD/CHF', 'NZD/USD', 'EUR/GBP', 'EUR/JPY', 'GBP/JPY'
];

export const TRADING_SESSIONS = [
  'Asian Session',
  'London Session',
  'NY AM Session',
  'NY PM Session',
  'London Close',
  'CBDR'
] as const;

export const EXIT_TYPES = [
  { value: 'manual', label: 'Manual Exit' },
  { value: 'stop_loss', label: 'Stop Loss Hit' },
  { value: 'take_profit', label: 'Take Profit Hit' },
  { value: 'trailing_stop', label: 'Trailing Stop' }
] as const;

export const PREDEFINED_RULES = [
  'Always set stop loss',
  'Risk max 2% per trade',
  'Trade during high liquidity hours',
  'Wait for confirmation signal',
  'No revenge trading',
  'Follow trading plan strictly',
  'Use consistent position sizing',
  'Don\'t overtrade'
];

export const mockAccounts: Account[] = [
  {
    id: 'acc-1',
    name: 'Main Trading Account',
    broker: 'MetaTrader 5',
    accountNumber: '12345678',
    balance: 15420.50,
    equity: 15420.50,
    connected: true,
    currency: 'USD',
    accountType: 'live'
  },
  {
    id: 'acc-2',
    name: 'Demo Account',
    broker: 'cTrader',
    accountNumber: '87654321',
    balance: 10000.00,
    equity: 10150.00,
    connected: true,
    currency: 'USD',
    accountType: 'demo'
  },
  {
    id: 'acc-3',
    name: 'Swing Trading',
    broker: 'MetaTrader 4',
    accountNumber: '11223344',
    balance: 25000.00,
    equity: 26200.00,
    connected: true,
    currency: 'USD',
    accountType: 'live'
  }
];

export const mockTrades: Trade[] = [
  // Account 1 trades (Main Trading Account)
  {
    id: '1',
    symbol: 'EUR/USD',
    pair: 'EUR/USD',
    type: 'buy',
    entryPrice: 1.0850,
    exitPrice: 1.0920,
    stopLoss: 1.0820,
    takeProfit: 1.0920,
    positionSize: 0.1,
    entryDate: '2024-01-15T09:30:00',
    exitDate: '2024-01-15T14:20:00',
    pnl: 700,
    status: 'closed',
    tags: ['Momentum', 'Breakout'],
    exitType: 'take_profit',
    notes: '<p>Strong breakout above resistance at 1.0840. <strong>Entry signal:</strong> 15min bullish engulfing candle.</p><ul><li>Market sentiment: Bullish</li><li>News: Positive US economic data</li></ul>',
    volume: 0.1,
    screenshot: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800',
    rulesFollowed: ['rule-1', 'rule-2', 'rule-3', 'rule-4'],
    session: 'London Session',
    accountId: 'acc-1'
  },
  {
    id: '2',
    symbol: 'GBP/USD',
    pair: 'GBP/USD',
    type: 'sell',
    entryPrice: 1.2650,
    exitPrice: 1.2680,
    stopLoss: 1.2700,
    takeProfit: 1.2600,
    positionSize: 0.05,
    entryDate: '2024-01-14T11:00:00',
    exitDate: '2024-01-14T15:30:00',
    pnl: -150,
    status: 'closed',
    tags: ['Reversal'],
    exitType: 'stop_loss',
    notes: '<p>Failed reversal trade. Price broke above key resistance instead of reversing.</p><p><em>Lesson learned:</em> Wait for confirmation before entering reversal trades.</p>',
    volume: 0.05,
    screenshot: 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=800',
    rulesFollowed: ['rule-1', 'rule-2'],
    session: 'NY AM Session',
    accountId: 'acc-1'
  },
  {
    id: '3',
    symbol: 'USD/JPY',
    pair: 'USD/JPY',
    type: 'buy',
    entryPrice: 148.50,
    exitPrice: 149.20,
    stopLoss: 148.00,
    takeProfit: 149.50,
    positionSize: 0.2,
    entryDate: '2024-01-13T08:15:00',
    exitDate: '2024-01-13T16:45:00',
    pnl: 1400,
    status: 'closed',
    tags: ['Trend Following', 'Daily Chart'],
    exitType: 'manual',
    notes: '<p>Riding the uptrend. Closed manually as price approached major resistance zone.</p><p><strong>Technical Analysis:</strong></p><ul><li>50 EMA support holding</li><li>RSI showing strength</li><li>Higher highs and higher lows pattern</li></ul>',
    volume: 0.2,
    screenshot: 'https://images.unsplash.com/photo-1642790106117-e829e14a795f?w=800',
    rulesFollowed: ['rule-1', 'rule-2', 'rule-3', 'rule-4', 'rule-5', 'rule-6'],
    session: 'Asian Session',
    accountId: 'acc-1'
  },
  {
    id: '6',
    symbol: 'GBP/USD',
    pair: 'GBP/USD',
    type: 'buy',
    entryPrice: 1.2700,
    stopLoss: 1.2650,
    takeProfit: 1.2800,
    positionSize: 0.1,
    entryDate: '2024-01-16T10:00:00',
    pnl: 0,
    status: 'open',
    tags: ['Swing Trade', 'Support Bounce'],
    notes: '<p>Entered on pullback to support. Waiting for price to reach TP at 1.2800.</p><p><strong>Plan:</strong> Hold until TP or major trend reversal signal.</p>',
    volume: 0.1,
    rulesFollowed: ['rule-1', 'rule-2', 'rule-6'],
    session: 'CBDR',
    accountId: 'acc-1'
  },

  // Account 2 trades (Demo Account)
  {
    id: '4',
    symbol: 'AUD/USD',
    pair: 'AUD/USD',
    type: 'buy',
    entryPrice: 0.6580,
    exitPrice: 0.6620,
    stopLoss: 0.6550,
    takeProfit: 0.6650,
    positionSize: 0.15,
    entryDate: '2024-01-12T10:30:00',
    exitDate: '2024-01-12T18:00:00',
    pnl: 600,
    status: 'closed',
    tags: ['News Trading'],
    exitType: 'manual',
    notes: '<p><strong>News Event:</strong> Australian employment data beat expectations.</p><p>Quick reaction trade on positive news. Exited early to secure profits before US session volatility.</p>',
    volume: 0.15,
    screenshot: 'https://images.unsplash.com/photo-1642543492481-44e81e3914a7?w=800',
    rulesFollowed: ['rule-1', 'rule-2', 'rule-4'],
    session: 'NY PM Session',
    accountId: 'acc-2'
  },
  {
    id: '5',
    symbol: 'EUR/USD',
    pair: 'EUR/USD',
    type: 'sell',
    entryPrice: 1.0880,
    exitPrice: 1.0850,
    stopLoss: 1.0910,
    takeProfit: 1.0820,
    positionSize: 0.1,
    entryDate: '2024-01-11T13:00:00',
    exitDate: '2024-01-11T17:30:00',
    pnl: 300,
    status: 'closed',
    tags: ['Scalping'],
    exitType: 'manual',
    notes: '<p>Quick scalp during low volatility period. Took profit at first sign of reversal.</p>',
    volume: 0.1,
    rulesFollowed: ['rule-1', 'rule-2', 'rule-3'],
    session: 'London Close',
    accountId: 'acc-2'
  },
  {
    id: '7',
    symbol: 'USD/CAD',
    pair: 'USD/CAD',
    type: 'sell',
    entryPrice: 1.3450,
    stopLoss: 1.3500,
    takeProfit: 1.3350,
    positionSize: 0.08,
    entryDate: '2024-01-16T14:30:00',
    pnl: 0,
    status: 'open',
    tags: ['Pattern Trade'],
    notes: '<p>Potential double top formation. Entered short position.</p>',
    volume: 0.08,
    rulesFollowed: ['rule-1', 'rule-2'],
    session: 'NY AM Session',
    accountId: 'acc-2'
  },

  // Account 3 trades (Swing Trading)
  {
    id: '8',
    symbol: 'XAU/USD',
    pair: 'XAU/USD',
    type: 'buy',
    entryPrice: 2050.00,
    exitPrice: 2080.00,
    stopLoss: 2030.00,
    takeProfit: 2100.00,
    positionSize: 0.5,
    entryDate: '2024-01-10T09:00:00',
    exitDate: '2024-01-14T16:00:00',
    pnl: 1500,
    status: 'closed',
    tags: ['Swing Trade', 'Commodity'],
    exitType: 'manual',
    notes: '<p>Gold swing trade. Strong bullish momentum on daily chart.</p>',
    volume: 0.5,
    rulesFollowed: ['rule-1', 'rule-2', 'rule-6'],
    session: 'London Session',
    accountId: 'acc-3'
  },
  {
    id: '9',
    symbol: 'NAS100',
    pair: 'NAS100',
    type: 'buy',
    entryPrice: 16500,
    exitPrice: 16650,
    stopLoss: 16400,
    takeProfit: 16700,
    positionSize: 0.2,
    entryDate: '2024-01-09T14:30:00',
    exitDate: '2024-01-10T20:00:00',
    pnl: 3000,
    status: 'closed',
    tags: ['Index Trading', 'Breakout'],
    exitType: 'manual',
    notes: '<p>Nasdaq breakout above key resistance. Tech sector strength.</p>',
    volume: 0.2,
    rulesFollowed: ['rule-1', 'rule-2', 'rule-3'],
    session: 'NY AM Session',
    accountId: 'acc-3'
  },
  {
    id: '10',
    symbol: 'EUR/GBP',
    pair: 'EUR/GBP',
    type: 'sell',
    entryPrice: 0.8650,
    stopLoss: 0.8680,
    takeProfit: 0.8600,
    positionSize: 0.3,
    entryDate: '2024-01-16T08:00:00',
    pnl: 0,
    status: 'open',
    tags: ['Swing Trade', 'Cross Pair'],
    notes: '<p>EUR/GBP showing weakness. Targeting 0.8600 support level.</p>',
    volume: 0.3,
    rulesFollowed: ['rule-1', 'rule-2'],
    session: 'London Session',
    accountId: 'acc-3'
  }
];

export const mockGoals: Goal[] = [
  {
    id: 'goal-1',
    type: 'monthly',
    targetProfit: 5000,
    targetWinRate: 70,
    targetTrades: 50,
    currentProfit: 2050,
    currentWinRate: 75,
    currentTrades: 4,
    startDate: '2024-01-01',
    endDate: '2024-01-31',
    description: 'January 2024 - Main Account Goals',
    status: 'active',
    createdAt: '2024-01-01T00:00:00',
    accountId: 'acc-1'
  },
  {
    id: 'goal-2',
    type: 'quarterly',
    targetProfit: 15000,
    targetWinRate: 65,
    targetTrades: 150,
    currentProfit: 2050,
    currentWinRate: 75,
    currentTrades: 4,
    startDate: '2024-01-01',
    endDate: '2024-03-31',
    description: 'Q1 2024 - Main Account Goals',
    status: 'active',
    createdAt: '2024-01-01T00:00:00',
    accountId: 'acc-1'
  },
  {
    id: 'goal-3',
    type: 'monthly',
    targetProfit: 2000,
    targetWinRate: 60,
    targetTrades: 30,
    currentProfit: 900,
    currentWinRate: 66.7,
    currentTrades: 3,
    startDate: '2024-01-01',
    endDate: '2024-01-31',
    description: 'January 2024 - Demo Account Practice',
    status: 'active',
    createdAt: '2024-01-01T00:00:00',
    accountId: 'acc-2'
  },
  {
    id: 'goal-4',
    type: 'monthly',
    targetProfit: 10000,
    targetWinRate: 65,
    targetTrades: 20,
    currentProfit: 4500,
    currentWinRate: 100,
    currentTrades: 2,
    startDate: '2024-01-01',
    endDate: '2024-01-31',
    description: 'January 2024 - Swing Trading Goals',
    status: 'active',
    createdAt: '2024-01-01T00:00:00',
    accountId: 'acc-3'
  }
];

export const mockTradingRules: TradingRule[] = [
  {
    id: 'rule-1',
    rule: 'Always set stop loss',
    isCustom: false,
    complianceRate: 100,
    totalChecks: 10,
    followed: 10,
    violated: 0
  },
  {
    id: 'rule-2',
    rule: 'Risk max 2% per trade',
    isCustom: false,
    complianceRate: 100,
    totalChecks: 10,
    followed: 10,
    violated: 0
  },
  {
    id: 'rule-3',
    rule: 'Trade during high liquidity hours',
    isCustom: false,
    complianceRate: 70,
    totalChecks: 10,
    followed: 7,
    violated: 3
  },
  {
    id: 'rule-4',
    rule: 'Wait for confirmation signal',
    isCustom: false,
    complianceRate: 50,
    totalChecks: 10,
    followed: 5,
    violated: 5
  },
  {
    id: 'rule-5',
    rule: 'No revenge trading',
    isCustom: false,
    complianceRate: 90,
    totalChecks: 10,
    followed: 9,
    violated: 1
  },
  {
    id: 'rule-6',
    rule: 'Follow trading plan strictly',
    isCustom: false,
    complianceRate: 80,
    totalChecks: 10,
    followed: 8,
    violated: 2
  },
  {
    id: 'rule-7',
    rule: 'Use consistent position sizing',
    isCustom: false,
    complianceRate: 90,
    totalChecks: 10,
    followed: 9,
    violated: 1
  },
  {
    id: 'rule-8',
    rule: 'Don\'t overtrade',
    isCustom: false,
    complianceRate: 100,
    totalChecks: 10,
    followed: 10,
    violated: 0
  }
];

export const mockMilestones: Milestone[] = [
  {
    id: 'milestone-1',
    name: 'First Profit',
    description: 'Achieved your first profitable trade',
    type: 'profit',
    threshold: 1,
    achieved: true,
    dateAchieved: '2024-01-11T13:00:00',
    icon: '🎯'
  },
  {
    id: 'milestone-2',
    name: '$100 Profit',
    description: 'Reached $100 in total profits',
    type: 'profit',
    threshold: 100,
    achieved: true,
    dateAchieved: '2024-01-12T10:30:00',
    icon: '💰'
  },
  {
    id: 'milestone-3',
    name: '$500 Profit',
    description: 'Reached $500 in total profits',
    type: 'profit',
    threshold: 500,
    achieved: true,
    dateAchieved: '2024-01-13T08:15:00',
    icon: '💵'
  },
  {
    id: 'milestone-4',
    name: '$1K Profit',
    description: 'Reached $1,000 in total profits',
    type: 'profit',
    threshold: 1000,
    achieved: true,
    dateAchieved: '2024-01-13T16:45:00',
    icon: '💸'
  },
  {
    id: 'milestone-5',
    name: '$5K Profit',
    description: 'Reached $5,000 in total profits',
    type: 'profit',
    threshold: 5000,
    achieved: false,
    icon: '🏆'
  },
  {
    id: 'milestone-6',
    name: '5 Win Streak',
    description: 'Achieved 5 consecutive winning trades',
    type: 'winstreak',
    threshold: 5,
    achieved: true,
    dateAchieved: '2024-01-15T14:20:00',
    icon: '🔥'
  },
  {
    id: 'milestone-7',
    name: '10 Win Streak',
    description: 'Achieved 10 consecutive winning trades',
    type: 'winstreak',
    threshold: 10,
    achieved: false,
    icon: '⚡'
  },
  {
    id: 'milestone-8',
    name: '10 Total Trades',
    description: 'Completed 10 trades',
    type: 'trades',
    threshold: 10,
    achieved: true,
    dateAchieved: '2024-01-15T09:30:00',
    icon: '📊'
  },
  {
    id: 'milestone-9',
    name: '50 Total Trades',
    description: 'Completed 50 trades',
    type: 'trades',
    threshold: 50,
    achieved: false,
    icon: '📈'
  },
  {
    id: 'milestone-10',
    name: '70% Win Rate',
    description: 'Achieved 70% win rate',
    type: 'winrate',
    threshold: 70,
    achieved: false,
    icon: '🎖️'
  }
];

export const mockPerformanceData = [
  { date: '2024-01-08', balance: 10000 },
  { date: '2024-01-09', balance: 10200 },
  { date: '2024-01-10', balance: 10150 },
  { date: '2024-01-11', balance: 10450 },
  { date: '2024-01-12', balance: 11050 },
  { date: '2024-01-13', balance: 12450 },
  { date: '2024-01-14', balance: 12300 },
  { date: '2024-01-15', balance: 13000 },
  { date: '2024-01-16', balance: 13000 }
];

export function getTagColor(tagName: string): string {
  // Generate a consistent color based on tag name
  const colors = [
    'bg-blue-100 text-blue-800 border-blue-200',
    'bg-green-100 text-green-800 border-green-200',
    'bg-orange-100 text-orange-800 border-orange-200',
    'bg-red-100 text-red-800 border-red-200',
    'bg-purple-100 text-purple-800 border-purple-200',
    'bg-teal-100 text-teal-800 border-teal-200',
    'bg-pink-100 text-pink-800 border-pink-200',
    'bg-indigo-100 text-indigo-800 border-indigo-200'
  ];
  
  // Simple hash function to get consistent color for same tag
  let hash = 0;
  for (let i = 0; i < tagName.length; i++) {
    hash = tagName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  return colors[index];
}

export function getSessionColor(session: string): string {
  const sessionColors: Record<string, string> = {
    'Asian Session': 'bg-blue-100 text-blue-800 border-blue-300',
    'London Session': 'bg-green-100 text-green-800 border-green-300',
    'NY AM Session': 'bg-orange-100 text-orange-800 border-orange-300',
    'NY PM Session': 'bg-red-100 text-red-800 border-red-300',
    'London Close': 'bg-purple-100 text-purple-800 border-purple-300',
    'CBDR': 'bg-gray-100 text-gray-800 border-gray-300'
  };
  return sessionColors[session] || 'bg-gray-100 text-gray-800 border-gray-300';
}

export function getExitTypeLabel(exitType?: string): string {
  const labels: Record<string, string> = {
    'stop_loss': 'SL',
    'take_profit': 'TP',
    'manual': 'Manual',
    'trailing_stop': 'Trail'
  };
  return exitType ? labels[exitType] || exitType : '-';
}

export function getExitTypeColor(exitType?: string): string {
  const colors: Record<string, string> = {
    'stop_loss': 'bg-red-100 text-red-800 border-red-300',
    'take_profit': 'bg-green-100 text-green-800 border-green-300',
    'manual': 'bg-blue-100 text-blue-800 border-blue-300',
    'trailing_stop': 'bg-purple-100 text-purple-800 border-purple-300'
  };
  return exitType ? colors[exitType] || 'bg-gray-100 text-gray-800 border-gray-300' : 'bg-gray-100 text-gray-800 border-gray-300';
}

export function calculateRisk(entryPrice: number, stopLoss: number, positionSize: number, type: 'buy' | 'sell'): number {
  const pipValue = 10; // Standard lot pip value for most pairs
  const pips = type === 'buy' 
    ? Math.abs(entryPrice - stopLoss) * 10000 
    : Math.abs(stopLoss - entryPrice) * 10000;
  return pips * positionSize * pipValue;
}

export function calculateReward(entryPrice: number, takeProfit: number, positionSize: number, type: 'buy' | 'sell'): number {
  const pipValue = 10;
  const pips = type === 'buy'
    ? Math.abs(takeProfit - entryPrice) * 10000
    : Math.abs(entryPrice - takeProfit) * 10000;
  return pips * positionSize * pipValue;
}

export function calculateRR(risk: number, reward: number): number {
  return risk > 0 ? reward / risk : 0;
}

export function calculatePnL(entryPrice: number, exitPrice: number, positionSize: number, type: 'buy' | 'sell'): number {
  const pipValue = 10;
  const pips = type === 'buy'
    ? (exitPrice - entryPrice) * 10000
    : (entryPrice - exitPrice) * 10000;
  return pips * positionSize * pipValue;
}

// Position sizing calculator helper functions
export function getPipValue(pair: string, accountCurrency: string = 'USD'): number {
  // Simplified pip value calculation for major pairs
  // In reality, this would need to account for current exchange rates
  const pairBase = pair.split('/')[0];
  const pairQuote = pair.split('/')[1];
  
  // For pairs where USD is the quote currency (e.g., EUR/USD, GBP/USD)
  if (pairQuote === 'USD') {
    return 10; // $10 per pip for 1 standard lot
  }
  
  // For pairs where USD is the base currency (e.g., USD/JPY, USD/CAD)
  if (pairBase === 'USD') {
    // Approximate values - in reality would need current exchange rate
    if (pair === 'USD/JPY') return 9.09; // Approximate
    if (pair === 'USD/CAD') return 7.69; // Approximate
    if (pair === 'USD/CHF') return 10.87; // Approximate
    return 10;
  }
  
  // For cross pairs (e.g., EUR/GBP, EUR/JPY)
  return 10; // Simplified - would need conversion
}

export function calculatePositionSize(
  accountBalance: number,
  riskPercentage: number,
  entryPrice: number,
  stopLoss: number,
  pair: string
): {
  standardLots: number;
  miniLots: number;
  microLots: number;
  riskAmount: number;
  pipValue: number;
  pips: number;
  units: number;
} {
  const riskAmount = accountBalance * (riskPercentage / 100);
  const pips = Math.abs(entryPrice - stopLoss) * 10000;
  const pipValue = getPipValue(pair);
  
  // Calculate position size in standard lots
  const standardLots = pips > 0 ? riskAmount / (pips * pipValue) : 0;
  const miniLots = standardLots * 10;
  const microLots = standardLots * 100;
  
  // Calculate units (1 standard lot = 100,000 units)
  const units = standardLots * 100000;
  
  return {
    standardLots: Math.round(standardLots * 100) / 100,
    miniLots: Math.round(miniLots * 10) / 10,
    microLots: Math.round(microLots),
    riskAmount: Math.round(riskAmount * 100) / 100,
    pipValue: Math.round(pipValue * 100) / 100,
    pips: Math.round(pips * 10) / 10,
    units: Math.round(units)
  };
}