import { useState, useEffect, useCallback } from 'react';
import { DollarSign, TrendingUp, TrendingDown, Activity, Target, PieChart, Calendar as CalendarIcon, X, Loader2, RefreshCw } from 'lucide-react';
import MetricsCard from '@/components/MetricsCard';
import TradeChart from '@/components/TradeChart';
import Sidebar from '@/components/Sidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { toast } from 'sonner';
import AccountSelector, { useSelectedAccount } from '@/components/AccountSelector';

type DateRange = {
  from: Date | undefined;
  to: Date | undefined;
};

interface DashboardStats {
  totalPnL: number;
  winRate: number;
  totalTrades: number;
  openTrades: number;
  closedTrades: number;
  accountBalance: number;
  todayPnL: number;
  weekPnL: number;
  monthPnL: number;
}

interface RecentTrade {
  id: string;
  symbol: string;
  entry_price: string;
  exit_price: string | null;
  profit_loss: string | null;
  status: string;
  entry_date: string;
  exit_date: string | null;
}

interface PerformanceDataPoint {
  date: string;
  balance: number;
  pnl: number;
}

export default function Dashboard() {
  const { user } = useAuth();
  const selectedAccountId = useSelectedAccount();
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [customDateRange, setCustomDateRange] = useState<DateRange>({
    from: undefined,
    to: undefined
  });
  const [showCustomPicker, setShowCustomPicker] = useState(false);
  
  // Data states
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentTrades, setRecentTrades] = useState<RecentTrade[]>([]);
  const [performanceData, setPerformanceData] = useState<PerformanceDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch dashboard data
  const fetchDashboardData = useCallback(async () => {
    if (!isSupabaseConfigured || !user || !selectedAccountId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Build date filter query
      let tradesQuery = supabase
        .from('trades')
        .select('*')
        .eq('user_id', user.id)
        .eq('account_id', selectedAccountId)
        .order('entry_date', { ascending: false });

      // Apply date filter
      if (dateFilter !== 'all') {
        let startDate: Date | null = null;
        
        if (dateFilter === 'custom' && customDateRange.from && customDateRange.to) {
          startDate = customDateRange.from;
          const endDate = new Date(customDateRange.to);
          endDate.setHours(23, 59, 59, 999);
          tradesQuery = tradesQuery
            .gte('entry_date', startDate.toISOString())
            .lte('entry_date', endDate.toISOString());
        } else {
          const endDate = new Date();
          startDate = new Date();
          
          switch (dateFilter) {
            case '7d':
              startDate.setDate(startDate.getDate() - 7);
              break;
            case '30d':
              startDate.setDate(startDate.getDate() - 30);
              break;
            case '90d':
              startDate.setDate(startDate.getDate() - 90);
              break;
            case 'ytd':
              startDate = new Date(startDate.getFullYear(), 0, 1);
              break;
          }
          
          tradesQuery = tradesQuery.gte('entry_date', startDate.toISOString());
        }
      }

      const { data: trades, error: tradesError } = await tradesQuery;

      if (tradesError) {
        console.error('Error fetching trades:', tradesError);
        throw new Error('Failed to fetch trades data');
      }

      // Fetch account data
      const { data: account, error: accountError } = await supabase
        .from('accounts')
        .select('balance, initial_balance')
        .eq('id', selectedAccountId)
        .eq('user_id', user.id)
        .single();

      if (accountError) {
        console.error('Error fetching account:', accountError);
        throw new Error('Failed to fetch account data');
      }

      // Calculate statistics
      const allTrades = trades || [];
      const closedTrades = allTrades.filter(t => t.status === 'closed');
      const openTrades = allTrades.filter(t => t.status === 'open');
      
      const totalPnL = closedTrades.reduce((sum, t) => sum + parseFloat(t.profit_loss || '0'), 0);
      const winningTrades = closedTrades.filter(t => parseFloat(t.profit_loss || '0') > 0);
      const winRate = closedTrades.length > 0 ? (winningTrades.length / closedTrades.length) * 100 : 0;

      // Calculate today's P&L
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayPnL = closedTrades
        .filter(t => new Date(t.exit_date || t.entry_date) >= today)
        .reduce((sum, t) => sum + parseFloat(t.profit_loss || '0'), 0);

      // Calculate week's P&L
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const weekPnL = closedTrades
        .filter(t => new Date(t.exit_date || t.entry_date) >= weekAgo)
        .reduce((sum, t) => sum + parseFloat(t.profit_loss || '0'), 0);

      // Calculate month's P&L
      const monthAgo = new Date();
      monthAgo.setDate(monthAgo.getDate() - 30);
      const monthPnL = closedTrades
        .filter(t => new Date(t.exit_date || t.entry_date) >= monthAgo)
        .reduce((sum, t) => sum + parseFloat(t.profit_loss || '0'), 0);

      setStats({
        totalPnL,
        winRate,
        totalTrades: allTrades.length,
        openTrades: openTrades.length,
        closedTrades: closedTrades.length,
        accountBalance: parseFloat(account?.balance || '0'),
        todayPnL,
        weekPnL,
        monthPnL,
      });

      // Set recent trades (last 5)
      setRecentTrades(allTrades.slice(0, 5));

      // Generate performance data for chart
      const sortedClosedTrades = closedTrades.sort((a, b) => 
        new Date(a.exit_date || a.entry_date).getTime() - new Date(b.exit_date || b.entry_date).getTime()
      );

      const initialBalance = parseFloat(account?.initial_balance || account?.balance || '10000');
      const performancePoints: PerformanceDataPoint[] = [];
      let runningBalance = initialBalance;

      sortedClosedTrades.forEach((trade) => {
        const pnl = parseFloat(trade.profit_loss || '0');
        runningBalance += pnl;
        performancePoints.push({
          date: format(new Date(trade.exit_date || trade.entry_date), 'MMM dd'),
          balance: runningBalance,
          pnl: pnl,
        });
      });

      // If no trades, show initial balance
      if (performancePoints.length === 0) {
        performancePoints.push({
          date: format(new Date(), 'MMM dd'),
          balance: initialBalance,
          pnl: 0,
        });
      }

      setPerformanceData(performancePoints);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError(error instanceof Error ? error.message : 'Failed to load dashboard data');
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [user, selectedAccountId, dateFilter, customDateRange]);

  // Fetch data on mount and when dependencies change
  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Real-time subscription for trades updates
  useEffect(() => {
    if (!isSupabaseConfigured || !user || !selectedAccountId) return;

    const tradesSubscription = supabase
      .channel(`dashboard-trades-${selectedAccountId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trades',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchDashboardData();
        }
      )
      .subscribe();

    return () => {
      tradesSubscription.unsubscribe();
    };
  }, [user, selectedAccountId, fetchDashboardData]);

  const handleDateFilterChange = (value: string) => {
    setDateFilter(value);
    if (value === 'custom') {
      setShowCustomPicker(true);
    } else {
      setShowCustomPicker(false);
      setCustomDateRange({ from: undefined, to: undefined });
    }
  };

  const applyCustomDateRange = () => {
    if (customDateRange.from && customDateRange.to) {
      setShowCustomPicker(false);
    }
  };

  const clearCustomDateRange = () => {
    setCustomDateRange({ from: undefined, to: undefined });
    setDateFilter('all');
    setShowCustomPicker(false);
  };

  const getDateRangeLabel = () => {
    if (dateFilter === 'custom' && customDateRange.from && customDateRange.to) {
      return `${format(customDateRange.from, 'MMM dd, yyyy')} - ${format(customDateRange.to, 'MMM dd, yyyy')}`;
    }
    switch (dateFilter) {
      case '7d': return 'Last 7 Days';
      case '30d': return 'Last 30 Days';
      case '90d': return 'Last 90 Days';
      case 'ytd': return 'Year to Date';
      case 'all': return 'All Time';
      default: return 'All Time';
    }
  };

  // Loading skeleton
  if (loading && !stats) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Sidebar />
        <div className="md:ml-64">
          <div className="p-6">
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="text-center">
                <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
                <p className="text-gray-600">Loading dashboard data...</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // No account selected
  if (!selectedAccountId) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Sidebar />
        <div className="md:ml-64">
          <div className="p-6">
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-gray-900">Trading Dashboard</h1>
              <p className="text-gray-600 mt-2">Monitor your trading performance and analytics</p>
            </div>
            <div className="mb-8 pb-6 border-b border-gray-200">
              <AccountSelector />
            </div>
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="text-center">
                <Activity className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Select an Account</h3>
                <p className="text-gray-600">Choose an account above to view your dashboard</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      
      <div className="md:ml-64">
        <div className="p-6">
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Trading Dashboard</h1>
                <p className="text-gray-600 mt-2">Monitor your trading performance and analytics</p>
              </div>

              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchDashboardData}
                  disabled={loading}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>

                <Select value={dateFilter} onValueChange={handleDateFilterChange}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Select date range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7d">Last 7 Days</SelectItem>
                    <SelectItem value="30d">Last 30 Days</SelectItem>
                    <SelectItem value="90d">Last 90 Days</SelectItem>
                    <SelectItem value="ytd">Year to Date</SelectItem>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="custom">Custom Range</SelectItem>
                  </SelectContent>
                </Select>

                {dateFilter === 'custom' && (
                  <Popover open={showCustomPicker} onOpenChange={setShowCustomPicker}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="gap-2">
                        <CalendarIcon className="h-4 w-4" />
                        {customDateRange.from && customDateRange.to
                          ? `${format(customDateRange.from, 'MMM dd')} - ${format(customDateRange.to, 'MMM dd')}`
                          : 'Pick dates'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="end">
                      <div className="p-4 space-y-4">
                        <div>
                          <label className="text-sm font-medium mb-2 block">Start Date</label>
                          <Calendar
                            mode="single"
                            selected={customDateRange.from}
                            onSelect={(date) => setCustomDateRange(prev => ({ ...prev, from: date }))}
                            disabled={(date) => date > new Date()}
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-2 block">End Date</label>
                          <Calendar
                            mode="single"
                            selected={customDateRange.to}
                            onSelect={(date) => setCustomDateRange(prev => ({ ...prev, to: date }))}
                            disabled={(date) => 
                              date > new Date() || (customDateRange.from ? date < customDateRange.from : false)
                            }
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            onClick={applyCustomDateRange}
                            disabled={!customDateRange.from || !customDateRange.to}
                            className="flex-1"
                          >
                            Apply
                          </Button>
                          <Button variant="outline" onClick={clearCustomDateRange}>
                            Clear
                          </Button>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                )}
              </div>
            </div>

            {/* Account Selector */}
            <div className="mb-6 pb-6 border-b border-gray-200">
              <AccountSelector />
            </div>

            {/* Error Alert */}
            {error && (
              <Alert variant="destructive" className="mb-6">
                <AlertDescription className="flex items-center justify-between">
                  <span>{error}</span>
                  <Button variant="outline" size="sm" onClick={fetchDashboardData}>
                    Retry
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            {/* Date Range Display */}
            <div className="flex items-center gap-2 mt-4">
              <Badge variant="secondary" className="text-sm py-1 px-3">
                <CalendarIcon className="h-3 w-3 mr-2" />
                {getDateRangeLabel()}
              </Badge>
              {dateFilter !== 'all' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearCustomDateRange}
                  className="h-7 px-2"
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
              <span className="text-sm text-gray-500 ml-2">
                {stats?.totalTrades || 0} {stats?.totalTrades === 1 ? 'trade' : 'trades'} in this period
              </span>
            </div>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <MetricsCard
              title="Account Balance"
              value={`$${stats?.accountBalance.toLocaleString() || '0'}`}
              change={stats?.monthPnL ? `${stats.monthPnL >= 0 ? '+' : ''}$${stats.monthPnL.toFixed(2)} this month` : 'No data'}
              changeType={stats?.monthPnL && stats.monthPnL >= 0 ? "positive" : "negative"}
              icon={DollarSign}
            />
            <MetricsCard
              title="Total P&L"
              value={`${stats?.totalPnL && stats.totalPnL >= 0 ? '+' : ''}$${stats?.totalPnL.toFixed(2) || '0'}`}
              change={stats?.weekPnL ? `${stats.weekPnL >= 0 ? '+' : ''}$${stats.weekPnL.toFixed(2)} this week` : 'No data'}
              changeType={stats?.totalPnL && stats.totalPnL >= 0 ? "positive" : "negative"}
              icon={stats?.totalPnL && stats.totalPnL >= 0 ? TrendingUp : TrendingDown}
            />
            <MetricsCard
              title="Open Positions"
              value={stats?.openTrades || 0}
              description={`${stats?.closedTrades || 0} closed trades`}
              icon={Activity}
            />
            <MetricsCard
              title="Win Rate"
              value={`${stats?.winRate.toFixed(1) || '0'}%`}
              change={`${stats?.closedTrades || 0} closed trades`}
              changeType="neutral"
              icon={Target}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Performance Chart */}
            <div className="lg:col-span-2">
              <TradeChart 
                data={performanceData} 
                title="Account Performance" 
              />
            </div>

            {/* Recent Trades */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Recent Trades
                </CardTitle>
              </CardHeader>
              <CardContent>
                {recentTrades.length === 0 ? (
                  <div className="text-center py-8">
                    <Activity className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-sm text-gray-500">No trades yet</p>
                    <p className="text-xs text-gray-400 mt-1">Start trading to see your activity here</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {recentTrades.map((trade) => (
                      <div key={trade.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <div className="font-medium">{trade.symbol}</div>
                          <div className="text-sm text-gray-600">
                            {trade.status === 'open' ? 'OPEN' : 'CLOSED'} • {format(new Date(trade.entry_date), 'MMM dd, yyyy')}
                          </div>
                        </div>
                        <div className="text-right">
                          {trade.status === 'open' ? (
                            <Badge variant="secondary">Open</Badge>
                          ) : (
                            <Badge variant={parseFloat(trade.profit_loss || '0') > 0 ? 'default' : 'destructive'}>
                              {parseFloat(trade.profit_loss || '0') > 0 ? '+' : ''}${parseFloat(trade.profit_loss || '0').toFixed(2)}
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}