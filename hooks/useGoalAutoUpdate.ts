import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { updateAllGoalsForAccount } from '@/lib/goalProgressCalculator';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

/**
 * Custom hook that automatically updates goal progress when trades change
 * @param accountId - The account ID to monitor
 * @param enabled - Whether the auto-update is enabled
 */
export function useGoalAutoUpdate(accountId: string | null, enabled: boolean = true) {
  const { user } = useAuth();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const isUpdatingRef = useRef(false);

  useEffect(() => {
    // Skip if not configured or disabled
    if (!isSupabaseConfigured || !enabled || !user || !accountId) {
      return;
    }

    // Function to update all goals for the account
    const updateAllGoals = async () => {
      // Prevent concurrent updates
      if (isUpdatingRef.current) {
        return;
      }

      isUpdatingRef.current = true;

      try {
        await updateAllGoalsForAccount(user.id, accountId);
      } catch (error) {
        console.error('Error updating goals:', error);
      } finally {
        isUpdatingRef.current = false;
      }
    };

    // Subscribe to trade changes for this account
    const setupSubscription = async () => {
      try {
        const channelName = `trade_changes_for_goals_${accountId}`;

        channelRef.current = supabase
          .channel(channelName)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'trades',
              filter: `account_id=eq.${accountId}`,
            },
            (payload) => {
              // Only update if the trade belongs to the current user
              if (payload.new && 'user_id' in payload.new && payload.new.user_id === user.id) {
                updateAllGoals();
              } else if (payload.old && 'user_id' in payload.old && payload.old.user_id === user.id) {
                updateAllGoals();
              }
            }
          )
          .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              console.log(`✅ Subscribed to trade changes for goal updates (account: ${accountId})`);
            } else if (status === 'CHANNEL_ERROR') {
              console.error(`❌ Error subscribing to trade changes for goal updates`);
            }
          });
      } catch (error) {
        console.error('Error setting up goal auto-update subscription:', error);
      }
    };

    // Initial update
    updateAllGoals();

    // Setup subscription
    setupSubscription();

    // Cleanup function
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
        console.log(`🔌 Unsubscribed from trade changes for goal updates`);
      }
    };
  }, [user, accountId, enabled]);
}

/**
 * Hook to manually trigger goal progress recalculation
 * @returns Function to manually update goals
 */
export function useManualGoalUpdate() {
  const { user } = useAuth();

  const updateGoals = async (accountId: string) => {
    if (!user || !accountId) {
      return { success: false, message: 'User or account not found' };
    }

    try {
      const updatedGoals = await updateAllGoalsForAccount(user.id, accountId);
      return {
        success: true,
        message: `Updated ${updatedGoals.length} goal(s)`,
        goals: updatedGoals,
      };
    } catch (error) {
      console.error('Error manually updating goals:', error);
      return {
        success: false,
        message: 'Failed to update goals',
      };
    }
  };

  return updateGoals;
}