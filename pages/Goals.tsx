import { useState, useMemo, useEffect, useCallback } from 'react';
import Sidebar from '@/components/Sidebar';
import GoalCard from '@/components/GoalCard';
import TradingRulesChecklist from '@/components/TradingRulesChecklist';
import AccountSelector, { useSelectedAccount } from '@/components/AccountSelector';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { 
  mockMilestones, 
  Goal, 
  TradingRule, 
  Milestone 
} from '@/lib/mockData';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useGoalAutoUpdate, useManualGoalUpdate } from '@/hooks/useGoalAutoUpdate';
import { 
  Plus, 
  Target, 
  Trophy, 
  CheckCircle2, 
  Lock, 
  Calendar, 
  TrendingUp,
  Bell,
  AlertTriangle,
  Info,
  XCircle,
  Trash2,
  CheckCheck,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';
import { format } from 'date-fns';

interface Notification {
  id: string;
  type: 'warning' | 'critical' | 'success' | 'info';
  message: string;
  timestamp: string;
  read: boolean;
}

interface AlertSettings {
  dailyLossLimit: string;
  dailyLossLimitPct: string;
  weeklyLossLimit: string;
  weeklyLossLimitPct: string;
  goalMilestoneAlerts: boolean;
  ruleViolationAlerts: boolean;
}

export default function Goals() {
  const { user } = useAuth();
  const selectedAccountId = useSelectedAccount();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [rules, setRules] = useState<TradingRule[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>(mockMilestones);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingRules, setIsLoadingRules] = useState(true);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [isAddGoalOpen, setIsAddGoalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [goalToDelete, setGoalToDelete] = useState<string | null>(null);
  const [isDeleteGoalDialogOpen, setIsDeleteGoalDialogOpen] = useState(false);

  const [newGoal, setNewGoal] = useState({
    type: 'monthly' as 'monthly' | 'quarterly',
    targetProfit: '',
    targetWinRate: '',
    targetTrades: '',
    startDate: '',
    endDate: '',
    description: ''
  });

  // Alert Settings State
  const [alertSettings, setAlertSettings] = useState<AlertSettings>({
    dailyLossLimit: '500',
    dailyLossLimitPct: '5',
    weeklyLossLimit: '2000',
    weeklyLossLimitPct: '10',
    goalMilestoneAlerts: true,
    ruleViolationAlerts: true
  });

  // Enable automatic goal progress tracking
  useGoalAutoUpdate(selectedAccountId, isSupabaseConfigured && !!user && !!selectedAccountId);
  
  // Manual goal update function
  const manualUpdateGoals = useManualGoalUpdate();

  // Mock Notifications
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: '1',
      type: 'success',
      message: 'Goal "Reach $10,000" is 80% complete!',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      read: false
    },
    {
      id: '2',
      type: 'warning',
      message: 'Daily loss limit warning: $380/$500 used (76%)',
      timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
      read: false
    },
    {
      id: '3',
      type: 'critical',
      message: 'Trading Rule #2 violated: Max 3 trades per day exceeded',
      timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      read: false
    },
    {
      id: '4',
      type: 'success',
      message: 'Congratulations! 5-trade winning streak achieved 🔥',
      timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      read: true
    },
    {
      id: '5',
      type: 'info',
      message: 'Monthly goal progress: 60% complete with 10 days remaining',
      timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      read: true
    },
    {
      id: '6',
      type: 'warning',
      message: '3 consecutive losses detected - consider taking a break',
      timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      read: true
    }
  ]);

  // Mock Active Warnings
  const activeWarnings = [
    {
      id: 'w1',
      type: 'warning' as const,
      title: 'Daily Loss Limit Approaching',
      message: "You've lost $450 today (90% of daily limit)",
      percentage: 90
    },
    {
      id: 'w2',
      type: 'warning' as const,
      title: 'Consecutive Losses',
      message: '3 consecutive losses - consider taking a break',
      percentage: 0
    }
  ];

  // Fetch goals from Supabase
  const fetchGoals = useCallback(async () => {
    if (!isSupabaseConfigured || !user) {
      setGoals([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      const { data, error } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching goals:', error);
        toast.error('Failed to load goals. Please try again.');
        setGoals([]);
        return;
      }

      // Transform database records to Goal interface
      const transformedGoals: Goal[] = (data || []).map(record => ({
        id: record.id,
        type: record.goal_type as 'monthly' | 'quarterly',
        targetProfit: parseFloat(record.target_profit || '0'),
        targetWinRate: parseFloat(record.target_win_rate || '0'),
        targetTrades: parseInt(record.target_trades || '0'),
        currentProfit: parseFloat(record.current_profit || '0'),
        currentWinRate: parseFloat(record.current_win_rate || '0'),
        currentTrades: parseInt(record.current_trades || '0'),
        startDate: record.start_date,
        endDate: record.end_date,
        description: record.description || '',
        status: record.status as 'active' | 'completed' | 'failed',
        createdAt: record.created_at,
        accountId: record.account_id
      }));

      setGoals(transformedGoals);
    } catch (error) {
      console.error('Unexpected error fetching goals:', error);
      toast.error('An unexpected error occurred while loading goals.');
      setGoals([]);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Fetch trading rules from Supabase
  const fetchTradingRules = useCallback(async () => {
    if (!isSupabaseConfigured || !user) {
      setRules([]);
      setIsLoadingRules(false);
      return;
    }

    try {
      setIsLoadingRules(true);

      const { data, error } = await supabase
        .from('trading_rules')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching trading rules:', error);
        toast.error('Failed to load trading rules. Please try again.');
        setRules([]);
        return;
      }

      // Transform database records to TradingRule interface
      const transformedRules: TradingRule[] = (data || []).map(record => ({
        id: record.id,
        rule: record.rule_text,
        isCustom: record.is_custom || false,
        complianceRate: parseFloat(record.compliance_rate || '100'),
        totalChecks: parseInt(record.total_checks || '0'),
        followed: parseInt(record.followed || '0'),
        violated: parseInt(record.violated || '0')
      }));

      setRules(transformedRules);
    } catch (error) {
      console.error('Unexpected error fetching trading rules:', error);
      toast.error('An unexpected error occurred while loading trading rules.');
      setRules([]);
    } finally {
      setIsLoadingRules(false);
    }
  }, [user]);

  // Fetch data on mount and when user changes
  useEffect(() => {
    fetchGoals();
    fetchTradingRules();
  }, [fetchGoals, fetchTradingRules]);

  // Filter goals by selected account
  const accountGoals = useMemo(() => {
    return goals.filter(goal => goal.accountId === selectedAccountId);
  }, [goals, selectedAccountId]);

  const activeGoals = accountGoals.filter(g => g.status === 'active');
  const completedGoalsThisYear = accountGoals.filter(
    g => g.status === 'completed' && 
    new Date(g.endDate).getFullYear() === new Date().getFullYear()
  ).length;

  const achievedMilestones = milestones.filter(m => m.achieved);
  const nextMilestone = milestones.find(m => !m.achieved);

  // Manual recalculate all goals
  const handleRecalculateProgress = async () => {
    if (!selectedAccountId) {
      toast.error('Please select an account first');
      return;
    }

    setIsRecalculating(true);
    toast.info('Recalculating goal progress...');

    try {
      const result = await manualUpdateGoals(selectedAccountId);
      
      if (result.success) {
        toast.success(result.message);
        // Refresh goals to show updated values
        await fetchGoals();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error('Error recalculating goals:', error);
      toast.error('Failed to recalculate goal progress');
    } finally {
      setIsRecalculating(false);
    }
  };

  const handleAddGoal = async () => {
    if (!newGoal.targetProfit || !newGoal.targetWinRate || !newGoal.targetTrades || 
        !newGoal.startDate || !newGoal.endDate || !newGoal.description) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (!isSupabaseConfigured || !user || !selectedAccountId) {
      toast.error('Please configure Supabase, sign in, and select an account to add goals.');
      return;
    }

    try {
      const goalData = {
        user_id: user.id,
        account_id: selectedAccountId,
        goal_type: newGoal.type,
        target_profit: parseFloat(newGoal.targetProfit),
        target_win_rate: parseFloat(newGoal.targetWinRate),
        target_trades: parseInt(newGoal.targetTrades),
        current_profit: 0,
        current_win_rate: 0,
        current_trades: 0,
        start_date: newGoal.startDate,
        end_date: newGoal.endDate,
        description: newGoal.description,
        status: 'active'
      };

      if (editingGoal) {
        // Update existing goal
        const { error } = await supabase
          .from('goals')
          .update(goalData)
          .eq('id', editingGoal.id)
          .eq('user_id', user.id);

        if (error) {
          console.error('Error updating goal:', error);
          toast.error('Failed to update goal. Please try again.');
          return;
        }

        toast.success('Goal updated successfully');
      } else {
        // Add new goal
        const { error } = await supabase
          .from('goals')
          .insert([goalData]);

        if (error) {
          console.error('Error adding goal:', error);
          toast.error('Failed to add goal. Please try again.');
          return;
        }

        toast.success('Goal created successfully. Progress will be calculated automatically.');
      }

      // Refresh goals list
      await fetchGoals();

      // Reset form
      setNewGoal({
        type: 'monthly',
        targetProfit: '',
        targetWinRate: '',
        targetTrades: '',
        startDate: '',
        endDate: '',
        description: ''
      });
      setEditingGoal(null);
      setIsAddGoalOpen(false);
    } catch (error) {
      console.error('Unexpected error saving goal:', error);
      toast.error('An unexpected error occurred while saving the goal.');
    }
  };

  const handleEditGoal = (goal: Goal) => {
    setEditingGoal(goal);
    setNewGoal({
      type: goal.type,
      targetProfit: goal.targetProfit.toString(),
      targetWinRate: goal.targetWinRate.toString(),
      targetTrades: goal.targetTrades.toString(),
      startDate: goal.startDate,
      endDate: goal.endDate,
      description: goal.description
    });
    setIsAddGoalOpen(true);
  };

  const handleDeleteGoal = (goalId: string) => {
    setGoalToDelete(goalId);
    setIsDeleteGoalDialogOpen(true);
  };

  const confirmDeleteGoal = async () => {
    if (!goalToDelete || !user) return;

    if (!isSupabaseConfigured) {
      toast.error('Please configure Supabase to delete goals.');
      setIsDeleteGoalDialogOpen(false);
      return;
    }

    try {
      const { error } = await supabase
        .from('goals')
        .delete()
        .eq('id', goalToDelete)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error deleting goal:', error);
        toast.error('Failed to delete goal. Please try again.');
        return;
      }

      toast.success('Goal deleted successfully');

      // Refresh goals list
      await fetchGoals();

      setGoalToDelete(null);
      setIsDeleteGoalDialogOpen(false);
    } catch (error) {
      console.error('Unexpected error deleting goal:', error);
      toast.error('An unexpected error occurred while deleting the goal.');
    }
  };

  const handleAddRule = async (rule: string) => {
    if (!isSupabaseConfigured || !user) {
      toast.error('Please configure Supabase and sign in to add trading rules.');
      return;
    }

    try {
      const ruleData = {
        user_id: user.id,
        rule_text: rule,
        is_custom: true,
        compliance_rate: 100,
        total_checks: 0,
        followed: 0,
        violated: 0
      };

      const { error } = await supabase
        .from('trading_rules')
        .insert([ruleData]);

      if (error) {
        console.error('Error adding trading rule:', error);
        toast.error('Failed to add trading rule. Please try again.');
        return;
      }

      toast.success('Custom rule added');

      // Refresh rules list
      await fetchTradingRules();
    } catch (error) {
      console.error('Unexpected error adding trading rule:', error);
      toast.error('An unexpected error occurred while adding the trading rule.');
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (!isSupabaseConfigured || !user) {
      toast.error('Please configure Supabase to delete trading rules.');
      return;
    }

    try {
      const { error } = await supabase
        .from('trading_rules')
        .delete()
        .eq('id', ruleId)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error deleting trading rule:', error);
        toast.error('Failed to delete trading rule. Please try again.');
        return;
      }

      toast.success('Trading rule deleted');

      // Refresh rules list
      await fetchTradingRules();
    } catch (error) {
      console.error('Unexpected error deleting trading rule:', error);
      toast.error('An unexpected error occurred while deleting the trading rule.');
    }
  };

  const handleMilestoneClick = (milestone: Milestone) => {
    if (milestone.achieved) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
      toast.success(`🎉 ${milestone.name} achieved!`);
    }
  };

  const handleSaveAlertSettings = () => {
    toast.success('Alert settings saved successfully');
  };

  const handleMarkAsRead = (notificationId: string) => {
    setNotifications(notifications.map(n => 
      n.id === notificationId ? { ...n, read: true } : n
    ));
  };

  const handleMarkAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
    toast.success('All notifications marked as read');
  };

  const handleClearNotifications = () => {
    setNotifications([]);
    toast.success('All notifications cleared');
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case 'critical':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'success':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case 'info':
        return <Info className="h-5 w-5 text-blue-600" />;
      default:
        return <Bell className="h-5 w-5 text-gray-600" />;
    }
  };

  const getNotificationBgColor = (type: string) => {
    switch (type) {
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      case 'critical':
        return 'bg-red-50 border-red-200';
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'info':
        return 'bg-blue-50 border-blue-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value);
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  // Show loading state
  if (isLoading || isLoadingRules) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Sidebar />
        <div className="md:ml-64 pt-16 md:pt-0">
          <div className="p-4 sm:p-6 flex items-center justify-center min-h-screen">
            <div className="text-center">
              <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
              <p className="text-gray-600">Loading goals and trading rules...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      
      <div className="md:ml-64 pt-16 md:pt-0">
        <div className="p-4 sm:p-6">
          {/* Page Title */}
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Goals & Progress</h1>
              <p className="text-gray-600 mt-2 text-sm sm:text-base">Track your trading goals, rules compliance, and achievements</p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-2">
              <Button 
                variant="outline"
                onClick={handleRecalculateProgress}
                disabled={!selectedAccountId || isRecalculating}
                className="flex items-center gap-2 w-full sm:w-auto"
                size="sm"
              >
                <RefreshCw className={`h-4 w-4 ${isRecalculating ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">{isRecalculating ? 'Recalculating...' : 'Recalculate Progress'}</span>
                <span className="sm:hidden">{isRecalculating ? 'Recalculating...' : 'Recalculate'}</span>
              </Button>
              
              <Dialog open={isAddGoalOpen} onOpenChange={setIsAddGoalOpen}>
                <DialogTrigger asChild>
                  <Button className="flex items-center gap-2 w-full sm:w-auto" size="sm" disabled={!user || !selectedAccountId}>
                    <Plus className="h-4 w-4" />
                    New Goal
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{editingGoal ? 'Edit Goal' : 'Create New Goal'}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-start gap-2">
                        <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-blue-800">
                          <p className="font-semibold mb-1">Automatic Progress Tracking</p>
                          <p>Goal progress is calculated automatically from your closed trades. You don't need to update progress manually.</p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="type">Goal Type *</Label>
                      <Select 
                        value={newGoal.type} 
                        onValueChange={(value: 'monthly' | 'quarterly') => setNewGoal({...newGoal, type: value})}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="quarterly">Quarterly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="targetProfit">Target Profit ($) *</Label>
                        <Input
                          id="targetProfit"
                          type="number"
                          placeholder="5000"
                          value={newGoal.targetProfit}
                          onChange={(e) => setNewGoal({...newGoal, targetProfit: e.target.value})}
                        />
                      </div>
                      <div>
                        <Label htmlFor="targetWinRate">Target Win Rate (%) *</Label>
                        <Input
                          id="targetWinRate"
                          type="number"
                          placeholder="70"
                          value={newGoal.targetWinRate}
                          onChange={(e) => setNewGoal({...newGoal, targetWinRate: e.target.value})}
                        />
                      </div>
                      <div>
                        <Label htmlFor="targetTrades">Target Trades *</Label>
                        <Input
                          id="targetTrades"
                          type="number"
                          placeholder="50"
                          value={newGoal.targetTrades}
                          onChange={(e) => setNewGoal({...newGoal, targetTrades: e.target.value})}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="startDate">Start Date *</Label>
                        <Input
                          id="startDate"
                          type="date"
                          value={newGoal.startDate}
                          onChange={(e) => setNewGoal({...newGoal, startDate: e.target.value})}
                        />
                      </div>
                      <div>
                        <Label htmlFor="endDate">End Date *</Label>
                        <Input
                          id="endDate"
                          type="date"
                          value={newGoal.endDate}
                          onChange={(e) => setNewGoal({...newGoal, endDate: e.target.value})}
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="description">Description *</Label>
                      <Textarea
                        id="description"
                        placeholder="e.g., January 2024 Trading Goals"
                        value={newGoal.description}
                        onChange={(e) => setNewGoal({...newGoal, description: e.target.value})}
                      />
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2">
                      <Button onClick={handleAddGoal} className="w-full sm:w-auto">
                        {editingGoal ? 'Update Goal' : 'Create Goal'}
                      </Button>
                      <Button variant="outline" onClick={() => {
                        setIsAddGoalOpen(false);
                        setEditingGoal(null);
                      }} className="w-full sm:w-auto">
                        Cancel
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {!user && (
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-yellow-800 text-sm">
                Please sign in to manage your goals and trading rules.
              </p>
            </div>
          )}

          {!selectedAccountId && user && (
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-yellow-800 text-sm">
                Please select an account to view and manage goals.
              </p>
            </div>
          )}

          {/* Auto-Update Info Banner */}
          {selectedAccountId && user && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-start gap-3">
                <TrendingUp className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-green-800 font-semibold text-sm sm:text-base">Automatic Progress Tracking Enabled</p>
                  <p className="text-green-700 text-xs sm:text-sm mt-1">
                    Goal progress is calculated automatically from your closed trades. Changes update in real-time across all devices.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Account Selector - Moved below page title */}
          <div className="mb-8 pb-6 border-b border-gray-200">
            <AccountSelector />
          </div>

          {/* Delete Goal Confirmation Dialog */}
          <AlertDialog open={isDeleteGoalDialogOpen} onOpenChange={setIsDeleteGoalDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Goal</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete this goal? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setGoalToDelete(null)}>
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={confirmDeleteGoal}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Overview Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium text-gray-600">Active Goals</CardTitle>
                <Target className="h-4 w-4 text-gray-400" />
              </CardHeader>
              <CardContent>
                <div className="text-xl sm:text-2xl font-bold">{activeGoals.length}</div>
                <p className="text-xs text-gray-500 mt-1">In progress</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium text-gray-600">Completed</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-xl sm:text-2xl font-bold text-green-600">{completedGoalsThisYear}</div>
                <p className="text-xs text-gray-500 mt-1">This year</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium text-gray-600">Milestones</CardTitle>
                <Trophy className="h-4 w-4 text-yellow-600" />
              </CardHeader>
              <CardContent>
                <div className="text-xl sm:text-2xl font-bold">{achievedMilestones.length}/{milestones.length}</div>
                <p className="text-xs text-gray-500 mt-1">Unlocked</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium text-gray-600">Notifications</CardTitle>
                <Bell className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-xl sm:text-2xl font-bold text-blue-600">{unreadCount}</div>
                <p className="text-xs text-gray-500 mt-1">Unread</p>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Tabs */}
          <Tabs defaultValue="goals" className="space-y-6">
            <TabsList className="w-full grid grid-cols-2 lg:grid-cols-4 h-auto">
              <TabsTrigger value="goals" className="text-xs sm:text-sm">Goals</TabsTrigger>
              <TabsTrigger value="rules" className="text-xs sm:text-sm">Rules</TabsTrigger>
              <TabsTrigger value="milestones" className="text-xs sm:text-sm">Milestones</TabsTrigger>
              <TabsTrigger value="notifications" className="relative text-xs sm:text-sm">
                <span className="hidden sm:inline">Notifications & Alerts</span>
                <span className="sm:hidden">Alerts</span>
                {unreadCount > 0 && (
                  <Badge className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                    {unreadCount}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="goals" className="space-y-6">
              {accountGoals.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No goals yet</h3>
                    <p className="text-gray-500 mb-4 text-sm">Create your first trading goal to start tracking progress</p>
                    <Button onClick={() => setIsAddGoalOpen(true)} disabled={!user || !selectedAccountId}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Goal
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                  {accountGoals.map((goal) => (
                    <GoalCard
                      key={goal.id}
                      goal={goal}
                      onEdit={handleEditGoal}
                      onDelete={handleDeleteGoal}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="rules">
              <TradingRulesChecklist
                rules={rules}
                onAddRule={handleAddRule}
                onUpdateCompliance={(ruleId, followed) => {
                  // Update compliance logic here
                }}
                onDeleteRule={handleDeleteRule}
              />
            </TabsContent>

            <TabsContent value="milestones" className="space-y-6">
              {/* Next Milestone */}
              {nextMilestone && (
                <Card className="border-2 border-blue-500 bg-blue-50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                      <Target className="h-5 w-5 text-blue-600" />
                      Next Milestone
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                      <div className="text-3xl sm:text-4xl">{nextMilestone.icon}</div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-base sm:text-lg">{nextMilestone.name}</h3>
                        <p className="text-sm text-gray-600">{nextMilestone.description}</p>
                      </div>
                      <Badge variant="outline" className="text-blue-600 border-blue-600">
                        In Progress
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Milestones Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {milestones.map((milestone) => (
                  <Card
                    key={milestone.id}
                    className={`cursor-pointer transition-all hover:shadow-lg ${
                      milestone.achieved ? 'border-green-500 bg-green-50' : 'opacity-60'
                    }`}
                    onClick={() => handleMilestoneClick(milestone)}
                  >
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <div className="text-4xl sm:text-5xl mb-3 relative">
                          {milestone.icon}
                          {!milestone.achieved && (
                            <Lock className="h-5 w-5 sm:h-6 sm:w-6 absolute top-0 right-0 text-gray-400" />
                          )}
                        </div>
                        <h3 className="font-semibold text-base sm:text-lg mb-1">{milestone.name}</h3>
                        <p className="text-xs sm:text-sm text-gray-600 mb-3">{milestone.description}</p>
                        {milestone.achieved ? (
                          <>
                            <Badge className="bg-green-600 mb-2">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Achieved
                            </Badge>
                            <p className="text-xs text-gray-500">
                              {milestone.dateAchieved && format(new Date(milestone.dateAchieved), 'MMM dd, yyyy')}
                            </p>
                          </>
                        ) : (
                          <Badge variant="outline">
                            <Lock className="h-3 w-3 mr-1" />
                            Locked
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Achievement Timeline */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <Calendar className="h-5 w-5" />
                    Achievement Timeline
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {achievedMilestones.map((milestone, index) => (
                      <div key={milestone.id} className="flex items-start gap-4">
                        <div className="flex flex-col items-center">
                          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-green-100 flex items-center justify-center text-lg sm:text-xl">
                            {milestone.icon}
                          </div>
                          {index < achievedMilestones.length - 1 && (
                            <div className="w-0.5 h-12 bg-gray-200 my-1" />
                          )}
                        </div>
                        <div className="flex-1 pb-4">
                          <h4 className="font-semibold text-sm sm:text-base">{milestone.name}</h4>
                          <p className="text-xs sm:text-sm text-gray-600">{milestone.description}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {milestone.dateAchieved && format(new Date(milestone.dateAchieved), 'MMMM dd, yyyy')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Notifications & Alerts Tab */}
            <TabsContent value="notifications" className="space-y-6">
              <Tabs defaultValue="settings" className="space-y-6">
                <TabsList className="w-full grid grid-cols-3 h-auto">
                  <TabsTrigger value="settings" className="text-xs sm:text-sm">Settings</TabsTrigger>
                  <TabsTrigger value="center" className="text-xs sm:text-sm">
                    <span className="hidden sm:inline">Notification Center</span>
                    <span className="sm:hidden">Center</span>
                    {unreadCount > 0 && (
                      <Badge className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                        {unreadCount}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="warnings" className="text-xs sm:text-sm">Warnings</TabsTrigger>
                </TabsList>

                {/* Alert Settings Tab Content */}
                <TabsContent value="settings">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base sm:text-lg">Risk Management Settings</CardTitle>
                      <p className="text-xs sm:text-sm text-gray-500">Configure loss limits and alert preferences</p>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="space-y-4">
                        <h3 className="font-semibold text-base sm:text-lg">Daily Loss Limits</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="dailyLossLimit">Daily Loss Limit ($)</Label>
                            <Input
                              id="dailyLossLimit"
                              type="number"
                              placeholder="500"
                              value={alertSettings.dailyLossLimit}
                              onChange={(e) => setAlertSettings({...alertSettings, dailyLossLimit: e.target.value})}
                            />
                          </div>
                          <div>
                            <Label htmlFor="dailyLossLimitPct">Daily Loss Limit (%)</Label>
                            <Input
                              id="dailyLossLimitPct"
                              type="number"
                              placeholder="5"
                              value={alertSettings.dailyLossLimitPct}
                              onChange={(e) => setAlertSettings({...alertSettings, dailyLossLimitPct: e.target.value})}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4 pt-4 border-t">
                        <h3 className="font-semibold text-base sm:text-lg">Weekly Loss Limits</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="weeklyLossLimit">Weekly Loss Limit ($)</Label>
                            <Input
                              id="weeklyLossLimit"
                              type="number"
                              placeholder="2000"
                              value={alertSettings.weeklyLossLimit}
                              onChange={(e) => setAlertSettings({...alertSettings, weeklyLossLimit: e.target.value})}
                            />
                          </div>
                          <div>
                            <Label htmlFor="weeklyLossLimitPct">Weekly Loss Limit (%)</Label>
                            <Input
                              id="weeklyLossLimitPct"
                              type="number"
                              placeholder="10"
                              value={alertSettings.weeklyLossLimitPct}
                              onChange={(e) => setAlertSettings({...alertSettings, weeklyLossLimitPct: e.target.value})}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4 pt-4 border-t">
                        <h3 className="font-semibold text-base sm:text-lg">Alert Preferences</h3>
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                              <Label className="text-sm sm:text-base">Goal Milestone Alerts</Label>
                              <p className="text-xs sm:text-sm text-gray-500">Get notified when you reach goal milestones</p>
                            </div>
                            <Switch
                              checked={alertSettings.goalMilestoneAlerts}
                              onCheckedChange={(checked) => setAlertSettings({...alertSettings, goalMilestoneAlerts: checked})}
                            />
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                              <Label className="text-sm sm:text-base">Trading Rule Violation Alerts</Label>
                              <p className="text-xs sm:text-sm text-gray-500">Get notified when trading rules are violated</p>
                            </div>
                            <Switch
                              checked={alertSettings.ruleViolationAlerts}
                              onCheckedChange={(checked) => setAlertSettings({...alertSettings, ruleViolationAlerts: checked})}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="pt-4">
                        <Button onClick={handleSaveAlertSettings} className="w-full sm:w-auto">
                          Save Settings
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Notification Center Tab */}
                <TabsContent value="center">
                  <Card>
                    <CardHeader>
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                          <CardTitle className="text-base sm:text-lg">Notification Center</CardTitle>
                          <p className="text-xs sm:text-sm text-gray-500">Recent alerts and notifications (last 30 days)</p>
                        </div>
                        <div className="flex gap-2">
                          {unreadCount > 0 && (
                            <Button variant="outline" size="sm" onClick={handleMarkAllAsRead}>
                              <CheckCheck className="h-4 w-4 mr-2" />
                              <span className="hidden sm:inline">Mark All Read</span>
                              <span className="sm:hidden">Mark Read</span>
                            </Button>
                          )}
                          {notifications.length > 0 && (
                            <Button variant="ghost" size="sm" onClick={handleClearNotifications} className="text-red-600 hover:text-red-700 hover:bg-red-50">
                              <Trash2 className="h-4 w-4 mr-2" />
                              <span className="hidden sm:inline">Clear All</span>
                              <span className="sm:hidden">Clear</span>
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {notifications.length > 0 ? (
                        <div className="space-y-3">
                          {notifications.map((notification) => (
                            <div
                              key={notification.id}
                              className={`p-3 sm:p-4 rounded-lg border ${getNotificationBgColor(notification.type)} ${
                                !notification.read ? 'border-l-4' : ''
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                {getNotificationIcon(notification.type)}
                                <div className="flex-1 min-w-0">
                                  <p className={`text-xs sm:text-sm ${!notification.read ? 'font-semibold' : ''}`}>
                                    {notification.message}
                                  </p>
                                  <p className="text-xs text-gray-500 mt-1">
                                    {format(new Date(notification.timestamp), 'MMM dd, yyyy HH:mm')}
                                  </p>
                                </div>
                                {!notification.read && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleMarkAsRead(notification.id)}
                                  >
                                    <CheckCircle2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-12 text-gray-500">
                          <Bell className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                          <p>No notifications</p>
                          <p className="text-sm mt-1">You're all caught up!</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Active Warnings Tab */}
                <TabsContent value="warnings">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                        <AlertTriangle className="h-5 w-5 text-yellow-600" />
                        Active Risk Warnings
                      </CardTitle>
                      <p className="text-xs sm:text-sm text-gray-500">Current alerts requiring your attention</p>
                    </CardHeader>
                    <CardContent>
                      {activeWarnings.length > 0 ? (
                        <div className="space-y-4">
                          {activeWarnings.map((warning) => (
                            <Card key={warning.id} className={`border-2 ${
                              warning.type === 'critical' ? 'border-red-500 bg-red-50' : 'border-yellow-500 bg-yellow-50'
                            }`}>
                              <CardContent className="pt-6">
                                <div className="flex items-start gap-3">
                                  {warning.type === 'critical' ? (
                                    <XCircle className="h-5 w-5 sm:h-6 sm:w-6 text-red-600 flex-shrink-0" />
                                  ) : (
                                    <AlertTriangle className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-600 flex-shrink-0" />
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <h4 className="font-semibold text-base sm:text-lg mb-1">{warning.title}</h4>
                                    <p className="text-xs sm:text-sm text-gray-700 mb-3">{warning.message}</p>
                                    {warning.percentage > 0 && (
                                      <div>
                                        <div className="flex items-center justify-between mb-1">
                                          <span className="text-xs font-semibold">Limit Usage</span>
                                          <span className="text-xs font-semibold">{warning.percentage}%</span>
                                        </div>
                                        <Progress 
                                          value={warning.percentage} 
                                          className={`h-2 ${warning.percentage >= 90 ? '[&>div]:bg-red-600' : '[&>div]:bg-yellow-600'}`}
                                        />
                                      </div>
                                    )}
                                  </div>
                                  <Badge variant={warning.type === 'critical' ? 'destructive' : 'default'} className={
                                    warning.type === 'critical' ? '' : 'bg-yellow-600'
                                  }>
                                    {warning.type === 'critical' ? 'CRITICAL' : 'WARNING'}
                                  </Badge>
                                </div>
                              </CardContent>
                            </Card>
                          ))}

                          <Card className="border-blue-500 bg-blue-50">
                            <CardContent className="pt-6">
                              <div className="flex items-start gap-3">
                                <Info className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 flex-shrink-0" />
                                <div>
                                  <h4 className="font-semibold mb-1 text-sm sm:text-base">Risk Management Tips</h4>
                                  <ul className="text-xs sm:text-sm text-gray-700 space-y-1 list-disc list-inside">
                                    <li>Take a break after consecutive losses</li>
                                    <li>Review your trading plan and rules</li>
                                    <li>Consider reducing position sizes</li>
                                    <li>Focus on high-probability setups only</li>
                                  </ul>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      ) : (
                        <div className="text-center py-12 text-gray-500">
                          <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-600" />
                          <p className="font-semibold text-green-600">All Clear!</p>
                          <p className="text-sm mt-1">No active warnings at this time</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}