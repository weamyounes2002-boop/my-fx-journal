import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Trade } from '@/lib/mockData';
import {
  calculateStreaks,
  analyzeByDayOfWeek,
  analyzeBySession,
  calculateRiskRewardRatios
} from '@/lib/analyticsHelpers';
import {
  BarChart,
  Bar,
  PieChart as RePieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LabelList
} from 'recharts';
import { TrendingUp, TrendingDown, Target, Clock, AlertCircle, CheckCircle, Info } from 'lucide-react';

interface PerformanceAnalyticsProps {
  trades: Trade[];
}

type PerformanceView = 'dayOfWeek' | 'weekOfMonth' | 'monthOfYear';

// Define trading session time ranges in UTC (GMT+0)
interface SessionTimeRange {
  name: string;
  startHour: number;
  endHour: number;
}

const SESSION_DEFINITIONS: SessionTimeRange[] = [
  { name: 'Asian Session', startHour: 0, endHour: 9 },
  { name: 'London Session', startHour: 8, endHour: 17 },
  { name: 'NY AM Session', startHour: 13, endHour: 17 },
  { name: 'NY PM Session', startHour: 17, endHour: 21 },
  { name: 'London Close', startHour: 15, endHour: 17 },
  { name: 'CBDR', startHour: 8, endHour: 10 }
];

export default function PerformanceAnalytics({ trades }: PerformanceAnalyticsProps) {
  const [performanceView, setPerformanceView] = useState<PerformanceView>('dayOfWeek');
  
  const streaks = calculateStreaks(trades);
  const dayPerformance = analyzeByDayOfWeek(trades);
  const sessionPerformance = analyzeBySession(trades);
  const rrData = calculateRiskRewardRatios(trades);

  // Helper function to check if an hour falls within a session time range
  const isHourInSession = (hour: number, startHour: number, endHour: number): boolean => {
    if (startHour <= endHour) {
      return hour >= startHour && hour < endHour;
    } else {
      // Handle sessions that cross midnight
      return hour >= startHour || hour < endHour;
    }
  };

  // Helper function to format session time range for display (UTC)
  const formatSessionTimeRange = (session: SessionTimeRange): string => {
    const startStr = `${String(session.startHour).padStart(2, '0')}:00`;
    const endStr = `${String(session.endHour).padStart(2, '0')}:00`;
    return `UTC: ${startStr} - ${endStr}`;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value);
  };

  // Helper function to get week of month (1-5)
  const getWeekOfMonth = (date: Date): number => {
    const dayOfMonth = date.getDate();
    return Math.ceil(dayOfMonth / 7);
  };

  // Filter closed trades
  const closedTrades = useMemo(() => {
    return trades.filter(t => t.status === 'closed');
  }, [trades]);

  // Enhanced R:R Analysis with categorization
  const enhancedRRAnalysis = useMemo(() => {
    const categories = {
      excellent: { min: 2, count: 0, pnl: 0, label: '2:1+ (Excellent)', color: '#10b981' },
      good: { min: 1.5, max: 2, count: 0, pnl: 0, label: '1.5-2:1 (Good)', color: '#3b82f6' },
      fair: { min: 1, max: 1.5, count: 0, pnl: 0, label: '1-1.5:1 (Fair)', color: '#f59e0b' },
      poor: { max: 1, count: 0, pnl: 0, label: 'Below 1:1 (Poor)', color: '#ef4444' }
    };

    let totalRR = 0;
    let rrCount = 0;

    closedTrades.forEach(trade => {
      if (trade.entryPrice && trade.stopLoss && trade.takeProfit) {
        const risk = Math.abs(trade.entryPrice - trade.stopLoss);
        const reward = Math.abs(trade.takeProfit - trade.entryPrice);
        const rr = reward / risk;
        
        totalRR += rr;
        rrCount++;

        if (rr >= 2) {
          categories.excellent.count++;
          categories.excellent.pnl += trade.pnl || 0;
        } else if (rr >= 1.5) {
          categories.good.count++;
          categories.good.pnl += trade.pnl || 0;
        } else if (rr >= 1) {
          categories.fair.count++;
          categories.fair.pnl += trade.pnl || 0;
        } else {
          categories.poor.count++;
          categories.poor.pnl += trade.pnl || 0;
        }
      }
    });

    const avgRR = rrCount > 0 ? totalRR / rrCount : 0;
    const totalTrades = rrCount;

    return {
      avgRR,
      totalTrades,
      categories: [
        { ...categories.excellent, percentage: totalTrades > 0 ? (categories.excellent.count / totalTrades) * 100 : 0 },
        { ...categories.good, percentage: totalTrades > 0 ? (categories.good.count / totalTrades) * 100 : 0 },
        { ...categories.fair, percentage: totalTrades > 0 ? (categories.fair.count / totalTrades) * 100 : 0 },
        { ...categories.poor, percentage: totalTrades > 0 ? (categories.poor.count / totalTrades) * 100 : 0 }
      ]
    };
  }, [closedTrades]);

  // Get R:R performance rating
  const getRRRating = (avgRR: number) => {
    if (avgRR >= 2) return { text: 'Excellent', color: 'text-green-600', icon: CheckCircle };
    if (avgRR >= 1.5) return { text: 'Good', color: 'text-blue-600', icon: CheckCircle };
    if (avgRR >= 1) return { text: 'Fair', color: 'text-yellow-600', icon: AlertCircle };
    return { text: 'Needs Improvement', color: 'text-red-600', icon: AlertCircle };
  };

  const rrRating = getRRRating(enhancedRRAnalysis.avgRR);
  const RatingIcon = rrRating.icon;

  // UTC Session Performance Calculation with Average Loss
  const utcSessionPerformance = useMemo(() => {
    const sessionStats: Record<string, { 
      trades: number; 
      wins: number; 
      losses: number;
      pnl: number; 
      winningPnl: number;
      losingPnl: number;
      timeRange: string;
    }> = {};
    
    // Initialize all sessions
    SESSION_DEFINITIONS.forEach(session => {
      sessionStats[session.name] = { 
        trades: 0, 
        wins: 0,
        losses: 0,
        pnl: 0,
        winningPnl: 0,
        losingPnl: 0,
        timeRange: formatSessionTimeRange(session)
      };
    });
    
    // Calculate stats for each trade based on UTC hours
    closedTrades.forEach(trade => {
      const date = new Date(trade.entryDate);
      const tradeHour = date.getUTCHours();
      
      // Check which sessions this trade belongs to
      SESSION_DEFINITIONS.forEach(session => {
        if (isHourInSession(tradeHour, session.startHour, session.endHour)) {
          sessionStats[session.name].trades++;
          if (trade.pnl) {
            sessionStats[session.name].pnl += trade.pnl;
            if (trade.pnl > 0) {
              sessionStats[session.name].wins++;
              sessionStats[session.name].winningPnl += trade.pnl;
            } else {
              sessionStats[session.name].losses++;
              sessionStats[session.name].losingPnl += trade.pnl;
            }
          }
        }
      });
    });
    
    // Return all sessions with their stats including average loss
    return SESSION_DEFINITIONS.map(session => ({
      session: session.name,
      trades: sessionStats[session.name].trades,
      winRate: sessionStats[session.name].trades > 0 
        ? (sessionStats[session.name].wins / sessionStats[session.name].trades) * 100 
        : 0,
      avgProfit: sessionStats[session.name].wins > 0 
        ? sessionStats[session.name].winningPnl / sessionStats[session.name].wins 
        : 0,
      avgLoss: sessionStats[session.name].losses > 0 
        ? Math.abs(sessionStats[session.name].losingPnl / sessionStats[session.name].losses)
        : 0,
      totalPnL: sessionStats[session.name].pnl,
      timeRange: sessionStats[session.name].timeRange,
      wins: sessionStats[session.name].wins,
      losses: sessionStats[session.name].losses
    }));
  }, [closedTrades]);

  // Day of Week Performance
  const dayOfWeekPerformance = useMemo(() => {
    const dayStats: Record<string, { trades: number; wins: number; pnl: number }> = {
      'Mon': { trades: 0, wins: 0, pnl: 0 },
      'Tue': { trades: 0, wins: 0, pnl: 0 },
      'Wed': { trades: 0, wins: 0, pnl: 0 },
      'Thu': { trades: 0, wins: 0, pnl: 0 },
      'Fri': { trades: 0, wins: 0, pnl: 0 },
      'Sat': { trades: 0, wins: 0, pnl: 0 },
      'Sun': { trades: 0, wins: 0, pnl: 0 }
    };
    
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    closedTrades.forEach(trade => {
      const dayIndex = new Date(trade.entryDate).getDay();
      const dayName = dayNames[dayIndex];
      dayStats[dayName].trades++;
      if (trade.pnl) {
        dayStats[dayName].pnl += trade.pnl;
        if (trade.pnl > 0) dayStats[dayName].wins++;
      }
    });
    
    return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => ({
      label: day,
      trades: dayStats[day].trades,
      winRate: dayStats[day].trades > 0 ? (dayStats[day].wins / dayStats[day].trades) * 100 : 0,
      avgProfit: dayStats[day].trades > 0 ? dayStats[day].pnl / dayStats[day].trades : 0,
      totalPnL: dayStats[day].pnl
    }));
  }, [closedTrades]);

  // Week of Month Performance
  const weekOfMonthPerformance = useMemo(() => {
    const weekStats: Record<string, { trades: number; wins: number; pnl: number }> = {
      'Week 1': { trades: 0, wins: 0, pnl: 0 },
      'Week 2': { trades: 0, wins: 0, pnl: 0 },
      'Week 3': { trades: 0, wins: 0, pnl: 0 },
      'Week 4': { trades: 0, wins: 0, pnl: 0 },
      'Week 5': { trades: 0, wins: 0, pnl: 0 }
    };
    
    closedTrades.forEach(trade => {
      const tradeDate = new Date(trade.entryDate);
      const weekNum = getWeekOfMonth(tradeDate);
      const weekLabel = `Week ${weekNum}`;
      
      weekStats[weekLabel].trades++;
      if (trade.pnl) {
        weekStats[weekLabel].pnl += trade.pnl;
        if (trade.pnl > 0) weekStats[weekLabel].wins++;
      }
    });
    
    return ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5'].map(week => ({
      label: week,
      trades: weekStats[week].trades,
      winRate: weekStats[week].trades > 0 ? (weekStats[week].wins / weekStats[week].trades) * 100 : 0,
      avgProfit: weekStats[week].trades > 0 ? weekStats[week].pnl / weekStats[week].trades : 0,
      totalPnL: weekStats[week].pnl
    }));
  }, [closedTrades]);

  // Month of Year Performance
  const monthOfYearPerformance = useMemo(() => {
    const monthStats: Record<string, { trades: number; wins: number; pnl: number }> = {};
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    monthNames.forEach(month => {
      monthStats[month] = { trades: 0, wins: 0, pnl: 0 };
    });
    
    closedTrades.forEach(trade => {
      const monthIndex = new Date(trade.exitDate || trade.entryDate).getMonth();
      const monthName = monthNames[monthIndex];
      monthStats[monthName].trades++;
      if (trade.pnl) {
        monthStats[monthName].pnl += trade.pnl;
        if (trade.pnl > 0) monthStats[monthName].wins++;
      }
    });
    
    return monthNames.map(month => ({
      label: month,
      trades: monthStats[month].trades,
      winRate: monthStats[month].trades > 0 ? (monthStats[month].wins / monthStats[month].trades) * 100 : 0,
      avgProfit: monthStats[month].trades > 0 ? monthStats[month].pnl / monthStats[month].trades : 0,
      totalPnL: monthStats[month].pnl
    }));
  }, [closedTrades]);

  // Get current performance data based on selected view
  const currentPerformanceData = useMemo(() => {
    switch (performanceView) {
      case 'dayOfWeek':
        return dayOfWeekPerformance;
      case 'weekOfMonth':
        return weekOfMonthPerformance;
      case 'monthOfYear':
        return monthOfYearPerformance;
      default:
        return dayOfWeekPerformance;
    }
  }, [performanceView, dayOfWeekPerformance, weekOfMonthPerformance, monthOfYearPerformance]);

  // Get performance view title
  const getPerformanceViewTitle = () => {
    switch (performanceView) {
      case 'dayOfWeek':
        return 'Performance by Day of Week';
      case 'weekOfMonth':
        return 'Performance by Week of Month';
      case 'monthOfYear':
        return 'Performance by Month of Year';
      default:
        return 'Performance Analysis';
    }
  };

  // Find best and worst periods
  const bestPeriod = currentPerformanceData.reduce((max, period) => period.totalPnL > max.totalPnL ? period : max, currentPerformanceData[0] || { totalPnL: 0 });
  const worstPeriod = currentPerformanceData.reduce((min, period) => period.totalPnL < min.totalPnL ? period : min, currentPerformanceData[0] || { totalPnL: 0 });

  return (
    <div className="space-y-6 mt-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Performance Analytics</h2>
        <p className="text-gray-600">Deep dive into your trading patterns and performance metrics</p>
      </div>

      {/* Win/Loss Streak Tracker */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-600">Current Streak</CardTitle>
          </CardHeader>
          <CardContent>
            {streaks.currentType !== 'none' ? (
              <>
                <div className="flex items-center gap-2 mb-2">
                  {streaks.currentType === 'win' ? (
                    <TrendingUp className="h-5 w-5 text-green-600" />
                  ) : (
                    <TrendingDown className="h-5 w-5 text-red-600" />
                  )}
                  <span className="text-3xl font-bold">
                    {streaks.current}
                  </span>
                </div>
                <Badge variant={streaks.currentType === 'win' ? 'default' : 'destructive'}>
                  {streaks.currentType === 'win' ? 'Winning Streak' : 'Losing Streak'}
                </Badge>
              </>
            ) : (
              <div className="text-gray-500">No active streak</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-600">Longest Win Streak</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              <span className="text-3xl font-bold text-green-600">
                {streaks.longestWin}
              </span>
            </div>
            <p className="text-sm text-gray-500">Consecutive winning trades</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-600">Longest Loss Streak</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown className="h-5 w-5 text-red-600" />
              <span className="text-3xl font-bold text-red-600">
                {streaks.longestLoss}
              </span>
            </div>
            <p className="text-sm text-gray-500">Consecutive losing trades</p>
          </CardContent>
        </Card>
      </div>

      {/* Multi-View Performance Chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{getPerformanceViewTitle()}</CardTitle>
              <CardDescription>
                Identify your most and least profitable trading periods
              </CardDescription>
            </div>
            <Tabs value={performanceView} onValueChange={(value) => setPerformanceView(value as PerformanceView)} className="w-auto">
              <TabsList>
                <TabsTrigger value="dayOfWeek">Day of Week</TabsTrigger>
                <TabsTrigger value="weekOfMonth">Week of Month</TabsTrigger>
                <TabsTrigger value="monthOfYear">Month of Year</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          {currentPerformanceData.some(d => d.trades > 0) ? (
            <>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={currentPerformanceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
                            <p className="font-semibold">{data.label}</p>
                            <p className="text-sm">P&L: {formatCurrency(data.totalPnL)}</p>
                            <p className="text-sm">Trades: {data.trades}</p>
                            <p className="text-sm">Win Rate: {data.winRate.toFixed(1)}%</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend />
                  <Bar dataKey="totalPnL" name="Total P&L" fill="#3b82f6">
                    {currentPerformanceData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={
                          entry.label === bestPeriod?.label ? '#10b981' : 
                          entry.label === worstPeriod?.label ? '#ef4444' : 
                          entry.totalPnL >= 0 ? '#10b981' : '#ef4444'
                        } 
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-sm font-medium text-green-900">Best Period</p>
                  <p className="text-lg font-bold text-green-600">{bestPeriod?.label}</p>
                  <p className="text-sm text-green-700">{formatCurrency(bestPeriod?.totalPnL || 0)}</p>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm font-medium text-red-900">Worst Period</p>
                  <p className="text-lg font-bold text-red-600">{worstPeriod?.label}</p>
                  <p className="text-sm text-red-700">{formatCurrency(worstPeriod?.totalPnL || 0)}</p>
                </div>
              </div>
            </>
          ) : (
            <div className="h-[350px] flex items-center justify-center text-gray-500">
              No trades in this period
            </div>
          )}
        </CardContent>
      </Card>

      {/* Trading Session Performance and Statistics */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Trading Session Performance and Statistics
            </CardTitle>
            <CardDescription>
              Performance breakdown by trading session (all times in UTC)
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {/* Session Summary Cards - Display all 6 sessions with UTC time ranges */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {utcSessionPerformance.map((session) => (
              <Card key={session.session} className="border-2">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-lg">{session.session}</h4>
                    <Badge variant={session.totalPnL >= 0 ? 'default' : 'destructive'}>
                      {formatCurrency(session.totalPnL)}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-500 mb-3">{session.timeRange}</p>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Total Trades:</span>
                      <span className="font-semibold">{session.trades}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Win Rate:</span>
                      <span className="font-semibold">{session.winRate.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Avg Profit:</span>
                      <span className={`font-semibold ${session.avgProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(session.avgProfit)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Avg Loss:</span>
                      <span className="font-semibold text-red-600">
                        {session.avgLoss > 0 ? formatCurrency(session.avgLoss) : '$0.00'}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Session Comparison Chart */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-4">Session Comparison Chart</h3>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={utcSessionPerformance}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="session" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip 
                  formatter={(value: number) => formatCurrency(value)}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
                          <p className="font-semibold">{data.session}</p>
                          <p className="text-sm">{data.timeRange}</p>
                          <p className="text-sm">P&L: {formatCurrency(data.totalPnL)}</p>
                          <p className="text-sm">Trades: {data.trades}</p>
                          <p className="text-sm">Win Rate: {data.winRate.toFixed(1)}%</p>
                          <p className="text-sm">Avg Profit: {formatCurrency(data.avgProfit)}</p>
                          <p className="text-sm">Avg Loss: {data.avgLoss > 0 ? formatCurrency(data.avgLoss) : '$0.00'}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend />
                <Bar dataKey="totalPnL" name="Total P&L" fill="#3b82f6">
                  {utcSessionPerformance.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.totalPnL >= 0 ? '#10b981' : '#ef4444'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Risk/Reward Analysis */}
      <div className="space-y-6">
        <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Target className="h-6 w-6 text-blue-600" />
              Risk/Reward Ratio Analysis
            </CardTitle>
            <CardDescription className="text-base">
              Understanding your risk management and reward optimization
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Info Banner */}
            <div className="bg-blue-100 border border-blue-300 rounded-lg p-4 flex items-start gap-3">
              <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-900">
                <p className="font-semibold mb-1">What is Risk/Reward Ratio?</p>
                <p>The R:R ratio measures potential profit against potential loss. Professional traders typically aim for ratios of <strong>2:1 or higher</strong>, meaning they risk $1 to potentially make $2. A higher ratio indicates better risk management and trade selection.</p>
              </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="border-2">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-sm text-gray-600 mb-2">Your Average R:R</p>
                    <p className="text-5xl font-bold text-blue-600 mb-2">
                      {enhancedRRAnalysis.avgRR.toFixed(2)}:1
                    </p>
                    <div className="flex items-center justify-center gap-2">
                      <RatingIcon className={`h-5 w-5 ${rrRating.color}`} />
                      <Badge variant="outline" className={rrRating.color}>
                        {rrRating.text}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-2">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-sm text-gray-600 mb-2">Total Trades Analyzed</p>
                    <p className="text-5xl font-bold text-gray-900 mb-2">
                      {enhancedRRAnalysis.totalTrades}
                    </p>
                    <p className="text-sm text-gray-500">
                      With defined R:R ratios
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-2">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-sm text-gray-600 mb-2">Target Benchmark</p>
                    <p className="text-5xl font-bold text-green-600 mb-2">
                      2.0:1
                    </p>
                    <p className="text-sm text-gray-500">
                      Professional standard
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Progress Bar to Target */}
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-gray-700">Progress to Professional Target (2:1)</p>
                    <p className="text-sm font-bold text-blue-600">
                      {Math.min((enhancedRRAnalysis.avgRR / 2) * 100, 100).toFixed(0)}%
                    </p>
                  </div>
                  <Progress 
                    value={Math.min((enhancedRRAnalysis.avgRR / 2) * 100, 100)} 
                    className="h-3"
                  />
                  <p className="text-xs text-gray-500 text-center">
                    {enhancedRRAnalysis.avgRR >= 2 
                      ? '🎉 Excellent! You\'ve reached the professional benchmark!' 
                      : `You need ${(2 - enhancedRRAnalysis.avgRR).toFixed(2)} more to reach the 2:1 target`}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* R:R Category Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Distribution Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">R:R Distribution by Category</CardTitle>
                  <CardDescription>Breakdown of your trades by risk/reward quality</CardDescription>
                </CardHeader>
                <CardContent>
                  {enhancedRRAnalysis.totalTrades > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={enhancedRRAnalysis.categories} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis dataKey="label" type="category" width={120} />
                        <Tooltip 
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload;
                              return (
                                <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
                                  <p className="font-semibold text-sm">{data.label}</p>
                                  <p className="text-sm">Trades: {data.count}</p>
                                  <p className="text-sm">Percentage: {data.percentage.toFixed(1)}%</p>
                                  <p className="text-sm">Total P&L: {formatCurrency(data.pnl)}</p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Bar dataKey="count" name="Number of Trades">
                          <LabelList dataKey="count" position="right" />
                          {enhancedRRAnalysis.categories.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-gray-500">
                      No R:R data available
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Category Statistics */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Category Performance</CardTitle>
                  <CardDescription>Detailed breakdown of each R:R category</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {enhancedRRAnalysis.categories.map((category, index) => (
                      <div key={index} className="border rounded-lg p-4" style={{ borderColor: category.color }}>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-4 h-4 rounded" 
                              style={{ backgroundColor: category.color }}
                            />
                            <span className="font-semibold text-sm">{category.label}</span>
                          </div>
                          <Badge 
                            variant={category.pnl >= 0 ? 'default' : 'destructive'}
                            className="text-xs"
                          >
                            {formatCurrency(category.pnl)}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600">Trades:</span>
                            <span className="font-semibold">{category.count}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600">Percentage:</span>
                            <span className="font-semibold">{category.percentage.toFixed(1)}%</span>
                          </div>
                        </div>
                        <div className="mt-2">
                          <Progress 
                            value={category.percentage} 
                            className="h-2"
                            style={{ 
                              backgroundColor: `${category.color}20`,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Insights and Recommendations */}
            <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Info className="h-5 w-5 text-blue-600" />
                  Key Insights & Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  {enhancedRRAnalysis.avgRR >= 2 ? (
                    <div className="flex items-start gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                      <p className="text-gray-700">
                        <strong>Excellent risk management!</strong> Your average R:R of {enhancedRRAnalysis.avgRR.toFixed(2)}:1 exceeds the professional benchmark. Continue maintaining this discipline.
                      </p>
                    </div>
                  ) : enhancedRRAnalysis.avgRR >= 1.5 ? (
                    <div className="flex items-start gap-2">
                      <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                      <p className="text-gray-700">
                        <strong>Good progress!</strong> You're close to the 2:1 target. Focus on improving trade selection and position sizing to reach professional standards.
                      </p>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                      <p className="text-gray-700">
                        <strong>Room for improvement.</strong> Consider widening your take-profit targets or tightening stop-losses to improve your R:R ratio.
                      </p>
                    </div>
                  )}
                  
                  {enhancedRRAnalysis.categories[3].percentage > 30 && (
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                      <p className="text-gray-700">
                        <strong>High-risk trades detected:</strong> {enhancedRRAnalysis.categories[3].percentage.toFixed(0)}% of your trades have R:R below 1:1. Review your entry and exit strategies.
                      </p>
                    </div>
                  )}
                  
                  {enhancedRRAnalysis.categories[0].percentage > 40 && (
                    <div className="flex items-start gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                      <p className="text-gray-700">
                        <strong>Strong trade selection:</strong> {enhancedRRAnalysis.categories[0].percentage.toFixed(0)}% of your trades have excellent R:R ratios of 2:1 or better. Keep identifying these high-quality setups.
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </CardContent>
        </Card>

        {/* Top Trades by R:R */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Top 5 Trades by Risk/Reward Ratio
            </CardTitle>
            <CardDescription>
              Your best risk-managed trades with highest R:R ratios
            </CardDescription>
          </CardHeader>
          <CardContent>
            {rrData.topTrades.length > 0 ? (
              <div className="space-y-3">
                {rrData.topTrades.map((trade, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-white border rounded-lg hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 text-blue-600 font-bold">
                        #{index + 1}
                      </div>
                      <div>
                        <p className="font-semibold text-base">{trade.symbol}</p>
                        <p className="text-sm text-gray-500">{new Date(trade.entryDate).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="text-right flex items-center gap-4">
                      <div>
                        <Badge 
                          variant="outline" 
                          className="mb-1 text-base px-3 py-1"
                          style={{
                            borderColor: trade.rr >= 2 ? '#10b981' : trade.rr >= 1.5 ? '#3b82f6' : '#f59e0b',
                            color: trade.rr >= 2 ? '#10b981' : trade.rr >= 1.5 ? '#3b82f6' : '#f59e0b'
                          }}
                        >
                          {trade.rr.toFixed(2)}:1 R:R
                        </Badge>
                        <p className={`text-base font-bold ${trade.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatCurrency(trade.pnl)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-gray-500">
                No trades with R:R data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}