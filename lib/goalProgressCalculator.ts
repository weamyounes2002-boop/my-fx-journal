import { supabase, isSupabaseConfigured } from './supabase';

export interface GoalProgress {
  currentProfit: number;
  currentWinRate: number;
  currentTrades: number;
}

export interface Goal {
  id: string;
  user_id: string;
  account_id: string;
  goal_type: 'profit_target' | 'win_rate' | 'trade_count';
  target_value: number;
  current_value: number;
  start_date: string;
  end_date: string;
  status: 'active' | 'completed' | 'failed';
}

/**
 * Calculate goal progress from actual trade data
 * @param userId - User ID
 * @param accountId - Account ID
 * @param goalId - Goal ID
 * @param startDate - Optional start date filter
 * @param endDate - Optional end date filter
 * @returns Goal progress metrics
 */
export async function calculateGoalProgress(
  userId: string,
  accountId: string,
  goalId: string,
  startDate?: string,
  endDate?: string
): Promise<GoalProgress | null> {
  if (!isSupabaseConfigured) {
    console.warn('Supabase is not configured');
    return null;
  }

  try {
    // Fetch the goal to get date range
    const { data: goal, error: goalError } = await supabase
      .from('goals')
      .select('*')
      .eq('id', goalId)
      .eq('user_id', userId)
      .single();

    if (goalError || !goal) {
      console.error('Error fetching goal:', goalError);
      return null;
    }

    // Use goal's date range if not provided
    const filterStartDate = startDate || goal.start_date;
    const filterEndDate = endDate || goal.end_date;

    // Fetch all closed trades for the account within the date range
    let query = supabase
      .from('trades')
      .select('*')
      .eq('user_id', userId)
      .eq('account_id', accountId)
      .eq('status', 'closed');

    // Apply date filters
    if (filterStartDate) {
      query = query.gte('entry_date', filterStartDate);
    }
    if (filterEndDate) {
      query = query.lte('entry_date', filterEndDate);
    }

    const { data: trades, error: tradesError } = await query;

    if (tradesError) {
      console.error('Error fetching trades:', tradesError);
      return null;
    }

    // If no trades, return zero progress
    if (!trades || trades.length === 0) {
      return {
        currentProfit: 0,
        currentWinRate: 0,
        currentTrades: 0,
      };
    }

    // Calculate metrics
    const totalTrades = trades.length;
    const winningTrades = trades.filter((t) => {
      const pnl = parseFloat(String(t.pnl || 0));
      return pnl > 0;
    }).length;
    const totalProfit = trades.reduce((sum, t) => {
      const pnl = parseFloat(String(t.pnl || 0));
      return sum + pnl;
    }, 0);
    const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;

    return {
      currentProfit: Math.round(totalProfit * 100) / 100, // Round to 2 decimal places
      currentWinRate: Math.round(winRate * 100) / 100, // Round to 2 decimal places
      currentTrades: totalTrades,
    };
  } catch (error) {
    console.error('Unexpected error calculating goal progress:', error);
    return null;
  }
}

/**
 * Update a single goal's progress based on actual trade data
 * @param userId - User ID
 * @param accountId - Account ID
 * @param goalId - Goal ID
 * @returns Updated goal or null if error
 */
export async function updateGoalProgress(
  userId: string,
  accountId: string,
  goalId: string
): Promise<Goal | null> {
  if (!isSupabaseConfigured) {
    console.warn('Supabase is not configured');
    return null;
  }

  try {
    // Fetch the goal
    const { data: goal, error: goalError } = await supabase
      .from('goals')
      .select('*')
      .eq('id', goalId)
      .eq('user_id', userId)
      .single();

    if (goalError || !goal) {
      console.error('Error fetching goal:', goalError);
      return null;
    }

    // Calculate progress
    const progress = await calculateGoalProgress(
      userId,
      accountId,
      goalId,
      goal.start_date,
      goal.end_date
    );

    if (!progress) {
      return null;
    }

    // Determine current value based on goal type
    let currentValue = 0;
    switch (goal.goal_type) {
      case 'profit_target':
        currentValue = progress.currentProfit;
        break;
      case 'win_rate':
        currentValue = progress.currentWinRate;
        break;
      case 'trade_count':
        currentValue = progress.currentTrades;
        break;
      default:
        currentValue = 0;
    }

    // Determine goal status
    let status = goal.status;
    const now = new Date();
    const endDate = new Date(goal.end_date);

    if (currentValue >= goal.target_value) {
      status = 'completed';
    } else if (now > endDate) {
      status = 'failed';
    } else {
      status = 'active';
    }

    // Update the goal
    const { data: updatedGoal, error: updateError } = await supabase
      .from('goals')
      .update({
        current_value: currentValue,
        status: status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', goalId)
      .eq('user_id', userId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating goal:', updateError);
      return null;
    }

    return updatedGoal as Goal;
  } catch (error) {
    console.error('Unexpected error updating goal progress:', error);
    return null;
  }
}

/**
 * Update all goals for a specific account
 * @param userId - User ID
 * @param accountId - Account ID
 * @returns Array of updated goals
 */
export async function updateAllGoalsForAccount(
  userId: string,
  accountId: string
): Promise<Goal[]> {
  if (!isSupabaseConfigured) {
    console.warn('Supabase is not configured');
    return [];
  }

  try {
    // Fetch all active goals for the account
    const { data: goals, error: goalsError } = await supabase
      .from('goals')
      .select('*')
      .eq('user_id', userId)
      .eq('account_id', accountId);

    if (goalsError || !goals) {
      console.error('Error fetching goals:', goalsError);
      return [];
    }

    // Update each goal
    const updatedGoals: Goal[] = [];
    for (const goal of goals) {
      const updatedGoal = await updateGoalProgress(userId, accountId, goal.id);
      if (updatedGoal) {
        updatedGoals.push(updatedGoal);
      }
    }

    return updatedGoals;
  } catch (error) {
    console.error('Unexpected error updating all goals:', error);
    return [];
  }
}

/**
 * Calculate progress percentage for a goal
 * @param currentValue - Current progress value
 * @param targetValue - Target value
 * @returns Progress percentage (0-100)
 */
export function calculateProgressPercentage(
  currentValue: number,
  targetValue: number
): number {
  if (targetValue <= 0) return 0;
  const percentage = (currentValue / targetValue) * 100;
  return Math.min(Math.round(percentage * 100) / 100, 100); // Cap at 100%
}

/**
 * Format goal value based on goal type
 * @param value - Value to format
 * @param goalType - Type of goal
 * @returns Formatted string
 */
export function formatGoalValue(
  value: number,
  goalType: 'profit_target' | 'win_rate' | 'trade_count'
): string {
  switch (goalType) {
    case 'profit_target':
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(value);
    case 'win_rate':
      return `${value.toFixed(1)}%`;
    case 'trade_count':
      return value.toString();
    default:
      return value.toString();
  }
}