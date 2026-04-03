import { useState, useMemo, useCallback, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import PerformanceAnalytics from '@/components/PerformanceAnalytics';
import ExportDialog from '@/components/ExportDialog';
import AIAnalysisAgent from '@/components/AIAnalysisAgent';
import HistoricalDataSync from '@/components/HistoricalDataSync';
import AccountSelector, { useSelectedAccount } from '@/components/AccountSelector';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trade, getTagColor } from '@/lib/mockData';
import { 
  TrendingUp, 
  TrendingDown,
  Target, 
  Calendar as CalendarIcon,
  DollarSign,
  Activity,
  X,
  CheckCircle2,
  XCircle,
  MinusCircle,
  Clock,
  Flame,
  AlertTriangle,
  Trash2,
  Loader2,
  BarChart
} from 'lucide-react';
import {
  BarChart as ReBarChart,
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
  Area,
  ComposedChart,
  Line
} from 'recharts';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

type TimePeriod = 'daily' | 'weekly' | 'monthly' | 'custom' | 'all';

interface TradeRecord {
  id: string;
  user_id: string;
  account_id: string;
  symbol: string;
  position_type: string;
  entry_price: string | number;
  exit_price?: string | number | null;
  stop_loss: string | number;
  take_profit: string | number;
  lot_size: string | number;
  entry_date: string;
  exit_date?: string | null;
  pnl?: string | number | null;
  status: string;
  tags?: string[];
  exit_type?: string | null;
  notes?: string | null;
}

interface HistoryTradeRecord {
  id: string;
  user_id: string;
  account_id: string;
  symbol: string;
  trade_type: string;
  open_price: string | number;
  close_price?: string | number | null;
  stop_loss?: string | number | null;
  take_profit?: string | number | null;
  volume: string | number;
  open_time: string;
  close_time?: string | null;
  profit?: string | number | null;
  state: string;
  comment?: string | null;
}

export default function Analytics() {
  const { user } = useAuth();
  const selectedAccountId = useSelectedAccount();
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('all');
  const [strategyFilter, setStrategyFilter] = useState<string>(
    localStorage.getItem('selectedStrategy') || 'all'
  );
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>(undefined);
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>(undefined);
  const [selectedTimezone, setSelectedTimezone] = useState<string>('Local');
  
  // Data loading states
  const [trades, setTrades] = useState<Trade[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Strategy management states
  const [customStrategies, setCustomStrategies] = useState<string[]>(() => {
    const stored = localStorage.getItem('customStrategies');
    return stored ? JSON.parse(stored) : [];
  });
  const [showCreateStrategyDialog, setShowCreateStrategyDialog] = useState(false);
  const [showManageStrategiesDialog, setShowManageStrategiesDialog] = useState(false);
  const [newStrategyName, setNewStrategyName] = useState('');
  const [strategyToDelete, setStrategyToDelete] = useState<string | null>(null);
  const [showDeleteConfirmDialog, setShowDeleteConfirmDialog] = useState(false);

  // Transform database record to Trade interface
  const transformTradeRecord = useCallback((record: TradeRecord): Trade => ({
    id: record.id,
    symbol: record.symbol,
    pair: record.symbol,
    type: record.position_type as 'buy' | 'sell',
    entryPrice: parseFloat(String(record.entry_price)),
    exitPrice: record.exit_price ? parseFloat(String(record.exit_price)) : undefined,
    stopLoss: parseFloat(String(record.stop_loss)),
    takeProfit: parseFloat(String(record.take_profit)),
    positionSize: parseFloat(String(record.lot_size)),
    entryDate: record.entry_date,
    exitDate: record.exit_date || undefined,
    pnl: record.pnl ? parseFloat(String(record.pnl)) : undefined,
    status: record.status as 'open' | 'closed',
    tags: record.tags || [],
    exitType: record.exit_type as 'tp' | 'sl' | 'manual' | undefined,
    notes: record.notes || '',
    volume: parseFloat(String(record.lot_size)),
    accountId: record.account_id
  }), []);

  // Fetch trades from Supabase (both trades and trades_history tables)
  const fetchTrades = useCallback(async () => {
    if (!isSupabaseConfigured || !user || !selectedAccountId) {
      setTrades([]);
      setIsLoading(false);
      return;
    }

    try {
      const isRefresh = trades.length > 0;
      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      // Fetch from both trades and trades_history tables
      const [manualTradesResult, historyTradesResult] = await Promise.all([
        supabase
          .from('trades')
          .select('*')
          .eq('user_id', user.id)
          .eq('account_id', selectedAccountId)
          .order('entry_date', { ascending: false }),
        supabase
          .from('trades_history')
          .select('*')
          .eq('user_id', user.id)
          .eq('account_id', selectedAccountId)
          .order('open_time', { ascending: false })
      ]);

      if (manualTradesResult.error) {
        console.error('Error fetching manual trades:', manualTradesResult.error);
      }

      if (historyTradesResult.error) {
        console.error('Error fetching history trades:', historyTradesResult.error);
      }

      // Transform manual trades
      const manualTrades: Trade[] = (manualTradesResult.data || []).map((record) => 
        transformTradeRecord(record as TradeRecord)
      );

      // Transform history trades
      const historyTrades: Trade[] = (historyTradesResult.data || []).map((record) => {
        const historyRecord = record as HistoryTradeRecord;
        return {
          id: historyRecord.id,
          symbol: historyRecord.symbol,
          pair: historyRecord.symbol,
          type: historyRecord.trade_type as 'buy' | 'sell',
          entryPrice: parseFloat(String(historyRecord.open_price)),
          exitPrice: historyRecord.close_price ? parseFloat(String(historyRecord.close_price)) : undefined,
          stopLoss: historyRecord.stop_loss ? parseFloat(String(historyRecord.stop_loss)) : 0,
          takeProfit: historyRecord.take_profit ? parseFloat(String(historyRecord.take_profit)) : 0,
          positionSize: parseFloat(String(historyRecord.volume)),
          entryDate: historyRecord.open_time,
          exitDate: historyRecord.close_time || undefined,
          pnl: historyRecord.profit ? parseFloat(String(historyRecord.profit)) : undefined,
          status: historyRecord.state as 'open' | 'closed',
          tags: [],
          exitType: undefined,
          notes: historyRecord.comment || '',
          volume: parseFloat(String(historyRecord.volume)),
          accountId: historyRecord.account_id
        };
      });

      // Combine and deduplicate trades (prefer manual trades over history trades)
      const combinedTrades = [...manualTrades];
      const manualTradeIds = new Set(manualTrades.map(t => t.id));
      
      historyTrades.forEach(trade => {
        if (!manualTradeIds.has(trade.id)) {
          combinedTrades.push(trade);
        }
      });

      // Sort by entry date
      combinedTrades.sort((a, b) => 
        new Date(b.entryDate).getTime() - new Date(a.entryDate).getTime()
      );

      setTrades(combinedTrades);
    } catch (error) {
      console.error('Unexpected error fetching trades:', error);
      toast.error('An unexpected error occurred while loading trades.');
      setTrades([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [user, selectedAccountId, transformTradeRecord, trades.length]);

  // Fetch trades on component mount and when dependencies change
  useEffect(() => {
    fetchTrades();
  }, [user, selectedAccountId]);

  // Listen for strategy filter changes from other pages
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'selectedStrategy' && e.newValue) {
        setStrategyFilter(e.newValue);
      }
      if (e.key === 'customStrategies' && e.newValue) {
        setCustomStrategies(JSON.parse(e.newValue));
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Filter trades by selected account first
  const accountTrades = useMemo(() => {
    return trades.filter(trade => trade.accountId === selectedAccountId);
  }, [trades, selectedAccountId]);

  // Timezone options with GMT offsets
  const timezoneOptions = useMemo(() => [
    { value: 'Local', label: 'Local Time', offset: null },
    { value: 'GMT-12', label: 'GMT-12', offset: -12 },
    { value: 'GMT-11', label: 'GMT-11', offset: -11 },
    { value: 'GMT-10', label: 'GMT-10', offset: -10 },
    { value: 'GMT-9', label: 'GMT-9', offset: -9 },
    { value: 'GMT-8', label: 'GMT-8', offset: -8 },
    { value: 'GMT-7', label: 'GMT-7', offset: -7 },
    { value: 'GMT-6', label: 'GMT-6', offset: -6 },
    { value: 'GMT-5', label: 'GMT-5', offset: -5 },
    { value: 'GMT-4', label: 'GMT-4', offset: -4 },
    { value: 'GMT-3', label: 'GMT-3', offset: -3 },
    { value: 'GMT-2', label: 'GMT-2', offset: -2 },
    { value: 'GMT-1', label: 'GMT-1', offset: -1 },
    { value: 'GMT+0', label: 'GMT+0 (UTC)', offset: 0 },
    { value: 'GMT+1', label: 'GMT+1', offset: 1 },
    { value: 'GMT+2', label: 'GMT+2', offset: 2 },
    { value: 'GMT+3', label: 'GMT+3', offset: 3 },
    { value: 'GMT+4', label: 'GMT+4', offset: 4 },
    { value: 'GMT+5', label: 'GMT+5', offset: 5 },
    { value: 'GMT+6', label: 'GMT+6', offset: 6 },
    { value: 'GMT+7', label: 'GMT+7', offset: 7 },
    { value: 'GMT+8', label: 'GMT+8', offset: 8 },
    { value: 'GMT+9', label: 'GMT+9', offset: 9 },
    { value: 'GMT+10', label: 'GMT+10', offset: 10 },
    { value: 'GMT+11', label: 'GMT+11', offset: 11 },
    { value: 'GMT+12', label: 'GMT+12', offset: 12 },
    { value: 'GMT+13', label: 'GMT+13', offset: 13 },
    { value: 'GMT+14', label: 'GMT+14', offset: 14 },
  ], []);

  // Helper function to get hour in specific GMT offset
  const getHourInTimezone = useCallback((dateString: string, timezone: string): number => {
    const date = new Date(dateString);
    
    if (timezone === 'Local') {
      return date.getHours();
    }
    
    // Extract offset from timezone string (e.g., "GMT+8" -> 8, "GMT-5" -> -5)
    const offset = parseInt(timezone.replace('GMT', ''));
    
    // Get UTC hour and add offset
    const utcHour = date.getUTCHours();
    let adjustedHour = utcHour + offset;
    
    // Handle hour wrapping (0-23)
    if (adjustedHour < 0) adjustedHour += 24;
    if (adjustedHour >= 24) adjustedHour -= 24;
    
    return adjustedHour;
  }, []);

  // Get all unique tags from account trades combined with custom strategies
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    // Add custom strategies from localStorage
    customStrategies.forEach(tag => tagSet.add(tag));
    // Add tags from existing trades
    accountTrades.forEach(trade => {
      trade.tags.forEach(tag => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  }, [accountTrades, customStrategies]);

  // Strategy management functions
  const handleCreateStrategy = () => {
    const trimmedName = newStrategyName.trim();
    
    if (!trimmedName) {
      toast.error('Strategy name cannot be empty');
      return;
    }
    
    if (trimmedName.length > 50) {
      toast.error('Strategy name must be 50 characters or less');
      return;
    }
    
    // Check for duplicates (case-insensitive)
    const exists = allTags.some(tag => tag.toLowerCase() === trimmedName.toLowerCase());
    if (exists) {
      toast.error('A strategy with this name already exists');
      return;
    }
    
    const updatedStrategies = [...customStrategies, trimmedName];
    setCustomStrategies(updatedStrategies);
    localStorage.setItem('customStrategies', JSON.stringify(updatedStrategies));
    
    toast.success(`Strategy '${trimmedName}' created successfully`);
    setNewStrategyName('');
    setShowCreateStrategyDialog(false);
    
    // Optionally auto-select the new strategy
    handleStrategyFilterChange(trimmedName);
  };

  const handleDeleteStrategy = (strategyName: string) => {
    setStrategyToDelete(strategyName);
    setShowDeleteConfirmDialog(true);
  };

  const confirmDeleteStrategy = () => {
    if (!strategyToDelete) return;
    
    const updatedStrategies = customStrategies.filter(s => s !== strategyToDelete);
    setCustomStrategies(updatedStrategies);
    localStorage.setItem('customStrategies', JSON.stringify(updatedStrategies));
    
    // If deleted strategy was selected, reset to "all"
    if (strategyFilter === strategyToDelete) {
      handleStrategyFilterChange('all');
    }
    
    toast.success(`Strategy '${strategyToDelete}' deleted`);
    setStrategyToDelete(null);
    setShowDeleteConfirmDialog(false);
  };

  // Validate custom date range
  const validateCustomDateRange = () => {
    if (customStartDate && customEndDate) {
      if (customStartDate > customEndDate) {
        toast.error('Start date cannot be after end date');
        return false;
      }
    }
    return true;
  };

  // Handle time period change
  const handleTimePeriodChange = (value: TimePeriod) => {
    setTimePeriod(value);
    if (value !== 'custom') {
      setCustomStartDate(undefined);
      setCustomEndDate(undefined);
    }
  };

  // Clear custom date range
  const handleClearCustomDates = () => {
    setCustomStartDate(undefined);
    setCustomEndDate(undefined);
    toast.success('Custom date range cleared');
  };

  // Handle strategy filter change with localStorage sync
  const handleStrategyFilterChange = (value: string) => {
    setStrategyFilter(value);
    localStorage.setItem('selectedStrategy', value);
  };

  // Handle strategy select change
  const handleStrategySelectChange = (value: string) => {
    if (value === 'create_new') {
      setShowCreateStrategyDialog(true);
    } else if (value === 'manage') {
      setShowManageStrategiesDialog(true);
    } else {
      handleStrategyFilterChange(value);
    }
  };

  // Filter trades based on time period and strategy
  const getFilteredTrades = useCallback((): Trade[] => {
    let filtered = accountTrades;

    // Time period filter
    if (timePeriod !== 'all') {
      const now = new Date();
      let cutoffDate: Date | null = null;

      if (timePeriod === 'custom') {
        // Custom date range
        filtered = filtered.filter(trade => {
          const tradeDate = new Date(trade.entryDate);
          tradeDate.setHours(0, 0, 0, 0);
          
          let matchesStart = true;
          let matchesEnd = true;
          
          if (customStartDate) {
            const startDate = new Date(customStartDate);
            startDate.setHours(0, 0, 0, 0);
            matchesStart = tradeDate >= startDate;
          }
          
          if (customEndDate) {
            const endDate = new Date(customEndDate);
            endDate.setHours(23, 59, 59, 999);
            matchesEnd = tradeDate <= endDate;
          }
          
          return matchesStart && matchesEnd;
        });
      } else {
        // Preset time periods
        cutoffDate = new Date();
        switch (timePeriod) {
          case 'daily':
            cutoffDate.setDate(now.getDate() - 1);
            break;
          case 'weekly':
            cutoffDate.setDate(now.getDate() - 7);
            break;
          case 'monthly':
            cutoffDate.setDate(now.getDate() - 30);
            break;
        }

        if (cutoffDate) {
          filtered = filtered.filter(trade => {
            const tradeDate = new Date(trade.entryDate);
            return tradeDate >= cutoffDate!;
          });
        }
      }
    }

    // Strategy filter
    if (strategyFilter !== 'all') {
      filtered = filtered.filter(trade => trade.tags.includes(strategyFilter));
    }

    return filtered;
  }, [strategyFilter, accountTrades, timePeriod, customStartDate, customEndDate]);

  const filteredTrades = getFilteredTrades();

  // Calculate analytics
  const totalTrades = filteredTrades.length;
  const closedTrades = filteredTrades.filter(t => t.status === 'closed');
  const openTrades = filteredTrades.filter(t => t.status === 'open');
  
  const winningTrades = closedTrades.filter(t => t.pnl && t.pnl > 0);
  const losingTrades = closedTrades.filter(t => t.pnl && t.pnl < 0);
  
  const totalPnL = closedTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
  const totalWins = winningTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
  const totalLosses = Math.abs(losingTrades.reduce((sum, t) => sum + (t.pnl || 0), 0));
  
  const winRate = closedTrades.length > 0 ? (winningTrades.length / closedTrades.length) * 100 : 0;
  const avgWin = winningTrades.length > 0 ? totalWins / winningTrades.length : 0;
  const avgLoss = losingTrades.length > 0 ? totalLosses / losingTrades.length : 0;
  const profitFactor = totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? Infinity : 0;
  const expectancy = closedTrades.length > 0 ? totalPnL / closedTrades.length : 0;

  // SL/TP Hit Rate Analysis
  const tpHitTrades = closedTrades.filter(t => t.exitType === 'tp');
  const slHitTrades = closedTrades.filter(t => t.exitType === 'sl');
  const manualCloseTrades = closedTrades.filter(t => t.exitType === 'manual');
  
  const tpHitRate = closedTrades.length > 0 ? (tpHitTrades.length / closedTrades.length) * 100 : 0;
  const slHitRate = closedTrades.length > 0 ? (slHitTrades.length / closedTrades.length) * 100 : 0;
  const manualCloseRate = closedTrades.length > 0 ? (manualCloseTrades.length / closedTrades.length) * 100 : 0;

  // Hourly Performance Analysis with GMT offset support
  const hourlyPerformance = useMemo(() => {
    const hourlyStats: Record<number, { trades: number; wins: number; pnl: number }> = {};
    
    for (let i = 0; i < 24; i++) {
      hourlyStats[i] = { trades: 0, wins: 0, pnl: 0 };
    }
    
    closedTrades.forEach(trade => {
      const hour = getHourInTimezone(trade.entryDate, selectedTimezone);
      hourlyStats[hour].trades++;
      if (trade.pnl) {
        hourlyStats[hour].pnl += trade.pnl;
        if (trade.pnl > 0) hourlyStats[hour].wins++;
      }
    });
    
    return Object.entries(hourlyStats).map(([hour, stats]) => ({
      hour: `${String(hour).padStart(2, '0')}:00`,
      trades: stats.trades,
      winRate: stats.trades > 0 ? (stats.wins / stats.trades) * 100 : 0,
      avgProfit: stats.trades > 0 ? stats.pnl / stats.trades : 0,
      totalPnL: stats.pnl
    }));
  }, [closedTrades, selectedTimezone, getHourInTimezone]);

  // Streak Tracking
  const streakData = useMemo(() => {
    const sortedTrades = [...closedTrades].sort((a, b) => 
      new Date(a.exitDate || a.entryDate).getTime() - new Date(b.exitDate || b.entryDate).getTime()
    );

    let currentStreak = 0;
    let currentStreakType: 'win' | 'loss' | null = null;
    let longestWinStreak = 0;
    let longestLossStreak = 0;

    sortedTrades.forEach((trade) => {
      if (!trade.pnl) return;
      
      const isWin = trade.pnl > 0;
      
      if (currentStreakType === null) {
        currentStreakType = isWin ? 'win' : 'loss';
        currentStreak = 1;
      } else if ((currentStreakType === 'win' && isWin) || (currentStreakType === 'loss' && !isWin)) {
        currentStreak++;
      } else {
        if (currentStreakType === 'win') {
          longestWinStreak = Math.max(longestWinStreak, currentStreak);
        } else {
          longestLossStreak = Math.max(longestLossStreak, currentStreak);
        }
        currentStreakType = isWin ? 'win' : 'loss';
        currentStreak = 1;
      }
    });

    if (currentStreakType === 'win') {
      longestWinStreak = Math.max(longestWinStreak, currentStreak);
    } else if (currentStreakType === 'loss') {
      longestLossStreak = Math.max(longestLossStreak, currentStreak);
    }

    return {
      currentStreak,
      currentStreakType,
      longestWinStreak,
      longestLossStreak
    };
  }, [closedTrades]);

  // Drawdown Calculation
  const drawdownData = useMemo(() => {
    const equityCurve = closedTrades
      .sort((a, b) => new Date(a.exitDate || a.entryDate).getTime() - new Date(b.exitDate || b.entryDate).getTime())
      .reduce((acc: Array<{ date: string; balance: number; peak: number; drawdown: number; drawdownPct: number }>, trade, index) => {
        const prevBalance = index > 0 ? acc[index - 1].balance : 10000;
        const newBalance = prevBalance + (trade.pnl || 0);
        const peak = index > 0 ? Math.max(acc[index - 1].peak, newBalance) : newBalance;
        const drawdown = peak - newBalance;
        const drawdownPct = peak > 0 ? (drawdown / peak) * 100 : 0;
        
        acc.push({
          date: new Date(trade.exitDate || trade.entryDate).toLocaleDateString(),
          balance: newBalance,
          peak,
          drawdown,
          drawdownPct
        });
        return acc;
      }, []);

    const maxDrawdown = equityCurve.reduce((max, point) => Math.max(max, point.drawdown), 0);
    const maxDrawdownPct = equityCurve.reduce((max, point) => Math.max(max, point.drawdownPct), 0);
    const currentDrawdown = equityCurve.length > 0 ? equityCurve[equityCurve.length - 1].drawdown : 0;
    const currentDrawdownPct = equityCurve.length > 0 ? equityCurve[equityCurve.length - 1].drawdownPct : 0;

    return {
      equityCurve,
      maxDrawdown,
      maxDrawdownPct,
      currentDrawdown,
      currentDrawdownPct
    };
  }, [closedTrades]);

  // Strategy Performance Analysis
  const strategyStats = useMemo(() => {
    const stats: Record<string, { trades: number; wins: number; losses: number; pnl: number; totalRR: number }> = {};
    
    filteredTrades.forEach(trade => {
      trade.tags.forEach(tag => {
        if (!stats[tag]) {
          stats[tag] = { trades: 0, wins: 0, losses: 0, pnl: 0, totalRR: 0 };
        }
        stats[tag].trades++;
        if (trade.pnl) {
          stats[tag].pnl += trade.pnl;
          if (trade.pnl > 0) stats[tag].wins++;
          else stats[tag].losses++;
        }
        if (trade.entryPrice && trade.stopLoss && trade.takeProfit) {
          const risk = Math.abs(trade.entryPrice - trade.stopLoss);
          const reward = Math.abs(trade.takeProfit - trade.entryPrice);
          stats[tag].totalRR += reward / risk;
        }
      });
    });

    return Object.entries(stats).map(([strategy, data]) => ({
      strategy,
      trades: data.trades,
      winRate: data.trades > 0 ? (data.wins / data.trades) * 100 : 0,
      pnl: data.pnl,
      avgRR: data.trades > 0 ? data.totalRR / data.trades : 0
    })).sort((a, b) => b.pnl - a.pnl);
  }, [filteredTrades]);

  // Tag Distribution for Pie Chart
  const tagDistribution = useMemo(() => {
    const tagCounts: Record<string, number> = {};
    filteredTrades.forEach(trade => {
      trade.tags.forEach(tag => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    });
    
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#14b8a6'];
    return Object.entries(tagCounts).map(([name, value], index) => ({
      name,
      value,
      color: colors[index % colors.length]
    }));
  }, [filteredTrades]);

  // Symbol performance
  const symbolStats = filteredTrades.reduce((acc: Record<string, { trades: number; wins: number; losses: number; pnl: number }>, trade) => {
    if (!acc[trade.symbol]) {
      acc[trade.symbol] = { trades: 0, wins: 0, losses: 0, pnl: 0 };
    }
    acc[trade.symbol].trades++;
    if (trade.pnl) {
      acc[trade.symbol].pnl += trade.pnl;
      if (trade.pnl > 0) acc[trade.symbol].wins++;
      else acc[trade.symbol].losses++;
    }
    return acc;
  }, {});

  const symbolPerformance = Object.entries(symbolStats).map(([symbol, stats]) => ({
    symbol,
    ...stats,
    winRate: stats.trades > 0 ? (stats.wins / stats.trades) * 100 : 0
  })).sort((a, b) => b.pnl - a.pnl);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value);
  };

  const getTimePeriodLabel = () => {
    switch (timePeriod) {
      case 'daily': 
        return 'Today';
      case 'weekly': 
        return 'Last 7 Days';
      case 'monthly': 
        return 'Last 30 Days';
      case 'custom':
        if (customStartDate && customEndDate) {
          return `${format(customStartDate, 'MMM d')} - ${format(customEndDate, 'MMM d')}`;
        } else if (customStartDate) {
          return `From ${format(customStartDate, 'MMM d')}`;
        } else if (customEndDate) {
          return `Until ${format(customEndDate, 'MMM d')}`;
        }
        return 'Select dates';
      case 'all': 
        return 'All Time';
      default: 
        return 'All Time';
    }
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Sidebar />
        <div className="md:ml-64">
          <div className="p-6 flex items-center justify-center min-h-screen">
            <div className="text-center">
              <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
              <p className="text-gray-600">Loading analytics data...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show empty state when no account selected
  if (!selectedAccountId) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Sidebar />
        <div className="md:ml-64">
          <div className="p-6">
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
              <p className="text-gray-600 mt-2">Comprehensive trading performance analysis</p>
            </div>
            <div className="mb-8 pb-6 border-b border-gray-200">
              <AccountSelector />
            </div>
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="text-center">
                <Activity className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Select an Account</h3>
                <p className="text-gray-600">Choose an account above to view analytics</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show empty state when no trades
  if (totalTrades === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Sidebar />
        <div className="md:ml-64">
          <div className="p-6">
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
              <p className="text-gray-600 mt-2">Comprehensive trading performance analysis</p>
            </div>
            <div className="mb-8 pb-6 border-b border-gray-200">
              <AccountSelector />
            </div>
            
            {/* Show Sync button even when no trades */}
            <div className="mb-6">
              <HistoricalDataSync 
                accountId={selectedAccountId} 
                onSyncComplete={fetchTrades}
              />
            </div>

            <div className="flex items-center justify-center min-h-[400px]">
              <div className="text-center">
                <BarChart className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No Trades Yet</h3>
                <p className="text-gray-600 mb-4">Sync your MetaTrader history or start adding trades manually</p>
                <Button onClick={() => window.location.href = '/journal'}>
                  Go to Trade Journal
                </Button>
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
          {/* Page Title */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
            <p className="text-gray-600 mt-2">Comprehensive trading performance analysis</p>
          </div>

          {/* Account Selector */}
          <div className="mb-8 pb-6 border-b border-gray-200">
            <AccountSelector />
          </div>

          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <HistoricalDataSync 
                  accountId={selectedAccountId} 
                  onSyncComplete={fetchTrades}
                />
                
                <ExportDialog trades={filteredTrades} />

                <div className="flex flex-col gap-2">
                  <Select 
                    value={timePeriod} 
                    onValueChange={handleTimePeriodChange}
                    disabled={isRefreshing}
                  >
                    <SelectTrigger className="w-48">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        <SelectValue placeholder="Time Period" />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="custom">Custom Range</SelectItem>
                      <SelectItem value="all">All Time</SelectItem>
                    </SelectContent>
                  </Select>

                  {timePeriod === 'custom' && (
                    <div className="flex items-center gap-2 p-3 bg-white rounded-lg border">
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                          <Label className="text-xs whitespace-nowrap">From:</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className={`w-[140px] justify-start text-left font-normal text-xs ${!customStartDate && 'text-muted-foreground'}`}
                              >
                                <CalendarIcon className="mr-2 h-3 w-3" />
                                {customStartDate ? format(customStartDate, 'MMM d, yyyy') : 'Pick date'}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={customStartDate}
                                onSelect={(date) => {
                                  setCustomStartDate(date);
                                  validateCustomDateRange();
                                }}
                                disabled={(date) => date > new Date()}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                        <div className="flex items-center gap-2">
                          <Label className="text-xs whitespace-nowrap">To:</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className={`w-[140px] justify-start text-left font-normal text-xs ${!customEndDate && 'text-muted-foreground'}`}
                              >
                                <CalendarIcon className="mr-2 h-3 w-3" />
                                {customEndDate ? format(customEndDate, 'MMM d, yyyy') : 'Pick date'}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={customEndDate}
                                onSelect={(date) => {
                                  setCustomEndDate(date);
                                  validateCustomDateRange();
                                }}
                                disabled={(date) => date > new Date() || (customStartDate ? date < customStartDate : false)}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                      </div>
                      {(customStartDate || customEndDate) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleClearCustomDates}
                          className="h-8 px-2"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  )}
                </div>

                <Select 
                  value={strategyFilter} 
                  onValueChange={handleStrategySelectChange}
                  disabled={isRefreshing}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filter by strategy" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="create_new">➕ Create New Strategy</SelectItem>
                    <SelectItem value="manage">🗑️ Manage Strategies</SelectItem>
                    <SelectItem value="all">All Strategies</SelectItem>
                    {allTags.map(tag => (
                      <SelectItem key={tag} value={tag}>{tag}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-2 mt-4 flex-wrap">
              <Badge variant="secondary" className="text-sm py-1 px-3">
                <CalendarIcon className="h-3 w-3 mr-2" />
                {getTimePeriodLabel()}
              </Badge>
              {strategyFilter !== 'all' && (
                <Badge variant="outline" className={getTagColor(strategyFilter)}>
                  {strategyFilter}
                </Badge>
              )}
              {(timePeriod !== 'all' || strategyFilter !== 'all') && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setTimePeriod('all');
                    setStrategyFilter('all');
                    localStorage.setItem('selectedStrategy', 'all');
                    setCustomStartDate(undefined);
                    setCustomEndDate(undefined);
                  }}
                  className="h-7 px-2"
                  disabled={isRefreshing}
                >
                  <X className="h-3 w-3 mr-1" />
                  Clear Filters
                </Button>
              )}
              <span className="text-sm text-gray-500 ml-2">
                {totalTrades} {totalTrades === 1 ? 'trade' : 'trades'} in this period
              </span>
              {isRefreshing && (
                <div className="flex items-center gap-2 text-sm text-blue-600">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>Refreshing...</span>
                </div>
              )}
            </div>
          </div>

          {/* Create Strategy Dialog */}
          <Dialog open={showCreateStrategyDialog} onOpenChange={setShowCreateStrategyDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Strategy</DialogTitle>
                <DialogDescription>
                  Create a custom strategy tag that will appear in the filter dropdown
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="strategyName">Strategy Name *</Label>
                  <Input
                    id="strategyName"
                    placeholder="Enter strategy name"
                    value={newStrategyName}
                    onChange={(e) => setNewStrategyName(e.target.value)}
                    maxLength={50}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleCreateStrategy();
                      }
                    }}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {newStrategyName.length}/50 characters
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowCreateStrategyDialog(false);
                    setNewStrategyName('');
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={handleCreateStrategy}>
                  Create
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Manage Strategies Dialog */}
          <Dialog open={showManageStrategiesDialog} onOpenChange={setShowManageStrategiesDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Manage Strategies</DialogTitle>
                <DialogDescription>
                  View and delete custom strategy tags. Note: Deleting a strategy will not remove it from existing trades.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {customStrategies.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">
                    No custom strategies yet. Create one using the filter dropdown.
                  </p>
                ) : (
                  customStrategies.map((strategy) => (
                    <div
                      key={strategy}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
                    >
                      <span className="font-medium">{strategy}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteStrategy(strategy)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
              <DialogFooter>
                <Button onClick={() => setShowManageStrategiesDialog(false)}>
                  Close
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Delete Confirmation Dialog */}
          <AlertDialog open={showDeleteConfirmDialog} onOpenChange={setShowDeleteConfirmDialog}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete '{strategyToDelete}'? This will not affect existing trades.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setStrategyToDelete(null)}>
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={confirmDeleteStrategy}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Total P&L</CardTitle>
                <DollarSign className="h-4 w-4 text-gray-400" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${totalPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(totalPnL)}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {closedTrades.length} closed trades
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Win Rate</CardTitle>
                <Target className="h-4 w-4 text-gray-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{winRate.toFixed(1)}%</div>
                <p className="text-xs text-gray-500 mt-1">
                  {winningTrades.length}W / {losingTrades.length}L
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Profit Factor</CardTitle>
                <TrendingUp className="h-4 w-4 text-gray-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {profitFactor === Infinity ? '∞' : profitFactor.toFixed(2)}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {formatCurrency(totalWins)} / {formatCurrency(totalLosses)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Expectancy</CardTitle>
                <Activity className="h-4 w-4 text-gray-400" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${expectancy >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(expectancy)}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Per trade average
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Streak Tracking Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className={streakData.currentStreakType === 'win' ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Current Streak</CardTitle>
                <Flame className={`h-4 w-4 ${streakData.currentStreakType === 'win' ? 'text-green-600' : 'text-red-600'}`} />
              </CardHeader>
              <CardContent>
                <div className={`text-3xl font-bold ${streakData.currentStreakType === 'win' ? 'text-green-600' : 'text-red-600'}`}>
                  {streakData.currentStreak} {streakData.currentStreakType === 'win' ? 'Wins' : 'Losses'}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {streakData.currentStreakType === 'win' ? 'Keep the momentum!' : 'Stay disciplined'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Longest Win Streak</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">{streakData.longestWinStreak}</div>
                <p className="text-xs text-gray-500 mt-1">
                  Consecutive winning trades
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Longest Loss Streak</CardTitle>
                <TrendingDown className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-600">{streakData.longestLossStreak}</div>
                <p className="text-xs text-gray-500 mt-1">
                  Consecutive losing trades
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Drawdown Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Max Drawdown</CardTitle>
                <AlertTriangle className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {formatCurrency(drawdownData.maxDrawdown)}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {drawdownData.maxDrawdownPct.toFixed(2)}% of peak balance
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Current Drawdown</CardTitle>
                <Activity className="h-4 w-4 text-gray-400" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${drawdownData.currentDrawdown > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {formatCurrency(drawdownData.currentDrawdown)}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {drawdownData.currentDrawdownPct.toFixed(2)}% from peak
                </p>
              </CardContent>
            </Card>
          </div>

          {/* SL/TP Hit Rate */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">TP Hit Rate</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{tpHitRate.toFixed(1)}%</div>
                <p className="text-xs text-gray-500 mt-1">
                  {tpHitTrades.length} trades hit take profit
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">SL Hit Rate</CardTitle>
                <XCircle className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{slHitRate.toFixed(1)}%</div>
                <p className="text-xs text-gray-500 mt-1">
                  {slHitTrades.length} trades hit stop loss
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Manual Close Rate</CardTitle>
                <MinusCircle className="h-4 w-4 text-gray-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-600">{manualCloseRate.toFixed(1)}%</div>
                <p className="text-xs text-gray-500 mt-1">
                  {manualCloseTrades.length} trades closed manually
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Strategy Performance Table */}
          {strategyStats.length > 0 && (
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>Strategy Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Strategy</TableHead>
                      <TableHead>Total Trades</TableHead>
                      <TableHead>Win Rate</TableHead>
                      <TableHead>Total P&L</TableHead>
                      <TableHead>Avg R:R</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {strategyStats.map((stat) => (
                      <TableRow key={stat.strategy}>
                        <TableCell>
                          <Badge variant="outline" className={getTagColor(stat.strategy)}>
                            {stat.strategy}
                          </Badge>
                        </TableCell>
                        <TableCell>{stat.trades}</TableCell>
                        <TableCell>{stat.winRate.toFixed(1)}%</TableCell>
                        <TableCell>
                          <span className={stat.pnl >= 0 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                            {formatCurrency(stat.pnl)}
                          </span>
                        </TableCell>
                        <TableCell>{stat.avgRR.toFixed(2)}:1</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Charts */}
          <Tabs defaultValue="equity" className="space-y-6">
            <TabsList className="flex-wrap h-auto">
              <TabsTrigger value="equity">Equity & Drawdown</TabsTrigger>
              <TabsTrigger value="time">Time-Based Analysis</TabsTrigger>
              <TabsTrigger value="symbols">Symbol Analysis</TabsTrigger>
              <TabsTrigger value="strategies">Strategy Distribution</TabsTrigger>
            </TabsList>

            <TabsContent value="equity" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Equity Curve with Drawdown</CardTitle>
                </CardHeader>
                <CardContent>
                  {drawdownData.equityCurve.length > 0 ? (
                    <ResponsiveContainer width="100%" height={400}>
                      <ComposedChart data={drawdownData.equityCurve}>
                        <defs>
                          <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis yAxisId="left" />
                        <YAxis yAxisId="right" orientation="right" />
                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                        <Legend />
                        <Area 
                          yAxisId="left"
                          type="monotone" 
                          dataKey="balance" 
                          stroke="#3b82f6" 
                          fillOpacity={1} 
                          fill="url(#colorBalance)" 
                          name="Account Balance"
                        />
                        <Line 
                          yAxisId="right"
                          type="monotone" 
                          dataKey="drawdownPct" 
                          stroke="#ef4444" 
                          strokeWidth={2}
                          name="Drawdown %"
                          dot={false}
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[400px] flex items-center justify-center text-gray-500">
                      No closed trades in this period
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Average Win</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">
                      {formatCurrency(avgWin)}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {winningTrades.length} winning trades
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Average Loss</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-600">
                      {formatCurrency(avgLoss)}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {losingTrades.length} losing trades
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Risk/Reward Ratio</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {avgLoss > 0 ? (avgWin / avgLoss).toFixed(2) : '∞'}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Average win to loss
                    </p>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="time" className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Hourly Performance (0-23 Hours)</CardTitle>
                    <Select value={selectedTimezone} onValueChange={setSelectedTimezone}>
                      <SelectTrigger className="w-[180px]">
                        <div className="flex items-center gap-2">
                          <Clock className="h-3 w-3" />
                          <SelectValue />
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        {timezoneOptions.map(tz => (
                          <SelectItem key={tz.value} value={tz.value}>
                            {tz.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <ReBarChart data={hourlyPerformance}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="hour" />
                      <YAxis />
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      <Legend />
                      <Bar dataKey="totalPnL" name="Total P&L" fill="#3b82f6">
                        {hourlyPerformance.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.totalPnL >= 0 ? '#10b981' : '#ef4444'} />
                        ))}
                      </Bar>
                    </ReBarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="symbols">
              <Card>
                <CardHeader>
                  <CardTitle>Symbol Performance Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  {symbolPerformance.length > 0 ? (
                    <div className="space-y-4">
                      {symbolPerformance.map((symbol) => (
                        <div key={symbol.symbol} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <h3 className="text-lg font-bold">{symbol.symbol}</h3>
                              <Badge variant={symbol.pnl >= 0 ? 'default' : 'destructive'}>
                                {formatCurrency(symbol.pnl)}
                              </Badge>
                            </div>
                            <div className="text-sm text-gray-600">
                              {symbol.trades} trades
                            </div>
                          </div>
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                              <span className="text-gray-500">Win Rate:</span>
                              <span className="ml-2 font-semibold">{symbol.winRate.toFixed(1)}%</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Wins:</span>
                              <span className="ml-2 font-semibold text-green-600">{symbol.wins}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Losses:</span>
                              <span className="ml-2 font-semibold text-red-600">{symbol.losses}</span>
                            </div>
                          </div>
                          <div className="mt-3">
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-green-600 h-2 rounded-full" 
                                style={{ width: `${symbol.winRate}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-12 text-center text-gray-500">
                      No trades in this period
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="strategies">
              <Card>
                <CardHeader>
                  <CardTitle>Strategy Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  {tagDistribution.length > 0 ? (
                    <ResponsiveContainer width="100%" height={400}>
                      <RePieChart>
                        <Pie
                          data={tagDistribution}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          outerRadius={120}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {tagDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </RePieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[400px] flex items-center justify-center text-gray-500">
                      No strategy data available
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Performance Analytics Section */}
          <PerformanceAnalytics trades={filteredTrades} />

          {/* AI Analysis Agent */}
          <AIAnalysisAgent 
            trades={filteredTrades}
            metrics={{
              winRate,
              profitFactor,
              totalPnL,
              expectancy,
              maxDrawdown: drawdownData.maxDrawdown,
              currentStreak: streakData.currentStreakType === 'win' ? streakData.currentStreak : -streakData.currentStreak,
              avgWin,
              avgLoss
            }}
            analyticsData={{
              hourlyPerformance,
              sessionPerformance: [],
              symbolPerformance,
              drawdownData: {
                maxDrawdown: drawdownData.maxDrawdown,
                maxDrawdownPct: drawdownData.maxDrawdownPct,
                currentDrawdown: drawdownData.currentDrawdown,
                currentDrawdownPct: drawdownData.currentDrawdownPct
              },
              streakData: {
                currentStreak: streakData.currentStreak,
                currentStreakType: streakData.currentStreakType,
                longestWinStreak: streakData.longestWinStreak,
                longestLossStreak: streakData.longestLossStreak
              },
              tpHitRate,
              slHitRate,
              manualCloseRate
            }}
          />
        </div>
      </div>
    </div>
  );
}