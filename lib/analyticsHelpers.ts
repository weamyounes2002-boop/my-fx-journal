import { Trade } from './mockData';

export interface Streak {
  current: number;
  currentType: 'win' | 'loss' | 'none';
  longestWin: number;
  longestLoss: number;
}

export interface DayPerformance {
  day: string;
  pnl: number;
  trades: number;
  wins: number;
  losses: number;
  winRate: number;
}

export interface SessionPerformance {
  session: string;
  pnl: number;
  trades: number;
  wins: number;
  losses: number;
  winRate: number;
}

export interface RiskRewardData {
  averageRR: number;
  distribution: { ratio: string; count: number }[];
  topTrades: { symbol: string; entryDate: string; rr: number; pnl: number }[];
}

export function calculateStreaks(trades: Trade[]): Streak {
  const closedTrades = trades
    .filter(t => t.status === 'closed' && t.pnl !== undefined)
    .sort((a, b) => new Date(a.exitDate || a.entryDate).getTime() - new Date(b.exitDate || b.entryDate).getTime());

  if (closedTrades.length === 0) {
    return { current: 0, currentType: 'none', longestWin: 0, longestLoss: 0 };
  }

  let currentStreak = 0;
  let currentType: 'win' | 'loss' | 'none' = 'none';
  let longestWin = 0;
  let longestLoss = 0;
  let tempWinStreak = 0;
  let tempLossStreak = 0;

  for (let i = closedTrades.length - 1; i >= 0; i--) {
    const trade = closedTrades[i];
    const isWin = (trade.pnl || 0) > 0;

    // Calculate current streak (from most recent)
    if (i === closedTrades.length - 1) {
      currentStreak = 1;
      currentType = isWin ? 'win' : 'loss';
    } else {
      const prevIsWin = (closedTrades[i + 1].pnl || 0) > 0;
      if (isWin === prevIsWin) {
        currentStreak++;
      } else {
        break;
      }
    }
  }

  // Calculate longest streaks
  for (const trade of closedTrades) {
    const isWin = (trade.pnl || 0) > 0;
    
    if (isWin) {
      tempWinStreak++;
      tempLossStreak = 0;
      longestWin = Math.max(longestWin, tempWinStreak);
    } else {
      tempLossStreak++;
      tempWinStreak = 0;
      longestLoss = Math.max(longestLoss, tempLossStreak);
    }
  }

  return { current: currentStreak, currentType, longestWin, longestLoss };
}

export function analyzeByDayOfWeek(trades: Trade[]): DayPerformance[] {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayStats: { [key: string]: { pnl: number; trades: number; wins: number; losses: number } } = {};

  days.forEach(day => {
    dayStats[day] = { pnl: 0, trades: 0, wins: 0, losses: 0 };
  });

  const closedTrades = trades.filter(t => t.status === 'closed' && t.pnl !== undefined);

  closedTrades.forEach(trade => {
    const date = new Date(trade.exitDate || trade.entryDate);
    const dayName = days[date.getDay()];
    
    dayStats[dayName].pnl += trade.pnl || 0;
    dayStats[dayName].trades++;
    
    if ((trade.pnl || 0) > 0) {
      dayStats[dayName].wins++;
    } else {
      dayStats[dayName].losses++;
    }
  });

  // Filter out weekend days and days with no trades
  return days
    .filter(day => day !== 'Saturday' && day !== 'Sunday')
    .map(day => ({
      day,
      pnl: dayStats[day].pnl,
      trades: dayStats[day].trades,
      wins: dayStats[day].wins,
      losses: dayStats[day].losses,
      winRate: dayStats[day].trades > 0 ? (dayStats[day].wins / dayStats[day].trades) * 100 : 0
    }));
}

export function analyzeBySession(trades: Trade[]): SessionPerformance[] {
  const sessions = {
    'Asian': { start: 0, end: 9, pnl: 0, trades: 0, wins: 0, losses: 0 },
    'European': { start: 7, end: 16, pnl: 0, trades: 0, wins: 0, losses: 0 },
    'US': { start: 13, end: 22, pnl: 0, trades: 0, wins: 0, losses: 0 }
  };

  const closedTrades = trades.filter(t => t.status === 'closed' && t.pnl !== undefined);

  closedTrades.forEach(trade => {
    const date = new Date(trade.entryDate);
    const hour = date.getUTCHours();

    Object.entries(sessions).forEach(([sessionName, session]) => {
      if (hour >= session.start && hour < session.end) {
        session.pnl += trade.pnl || 0;
        session.trades++;
        
        if ((trade.pnl || 0) > 0) {
          session.wins++;
        } else {
          session.losses++;
        }
      }
    });
  });

  return Object.entries(sessions).map(([sessionName, session]) => ({
    session: sessionName,
    pnl: session.pnl,
    trades: session.trades,
    wins: session.wins,
    losses: session.losses,
    winRate: session.trades > 0 ? (session.wins / session.trades) * 100 : 0
  }));
}

export function calculateRiskRewardRatios(trades: Trade[]): RiskRewardData {
  const closedTrades = trades.filter(t => t.status === 'closed' && t.pnl !== undefined);

  // Calculate R:R ratios for trades (simplified calculation based on P&L)
  const tradesWithRR = closedTrades.map(trade => {
    // Simplified R:R calculation: assume risk is proportional to position size
    // In a real app, you'd have stopLoss and takeProfit fields
    const pnl = trade.pnl || 0;
    const entryPrice = trade.entryPrice || 0;
    
    // Estimate R:R based on P&L percentage
    const pnlPercent = Math.abs(pnl / (entryPrice * (trade.volume || 1)));
    const rr = pnl > 0 ? pnlPercent * 2 : pnlPercent * 0.5; // Winners get higher R:R
    
    return {
      ...trade,
      rr: parseFloat(rr.toFixed(2))
    };
  });

  // Calculate average R:R
  const averageRR = tradesWithRR.length > 0
    ? tradesWithRR.reduce((sum, t) => sum + t.rr, 0) / tradesWithRR.length
    : 0;

  // Create R:R distribution
  const distribution: { [key: string]: number } = {
    '0-1': 0,
    '1-2': 0,
    '2-3': 0,
    '3-4': 0,
    '4+': 0
  };

  tradesWithRR.forEach(trade => {
    const rr = trade.rr;
    if (rr < 1) distribution['0-1']++;
    else if (rr < 2) distribution['1-2']++;
    else if (rr < 3) distribution['2-3']++;
    else if (rr < 4) distribution['3-4']++;
    else distribution['4+']++;
  });

  const distributionArray = Object.entries(distribution).map(([ratio, count]) => ({
    ratio,
    count
  }));

  // Get top 5 trades by R:R - ONLY PROFITABLE CLOSED TRADES
  const profitableTradesWithRR = tradesWithRR.filter(trade => (trade.pnl || 0) > 0);
  
  const topTrades = profitableTradesWithRR
    .sort((a, b) => b.rr - a.rr)
    .slice(0, 5)
    .map(trade => ({
      symbol: trade.symbol,
      entryDate: new Date(trade.entryDate).toLocaleDateString(),
      rr: trade.rr,
      pnl: trade.pnl || 0
    }));

  return {
    averageRR: parseFloat(averageRR.toFixed(2)),
    distribution: distributionArray,
    topTrades
  };
}