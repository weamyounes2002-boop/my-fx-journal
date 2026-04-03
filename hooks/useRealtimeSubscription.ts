import { useEffect, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface RealtimeSubscriptionOptions {
  table: string;
  filter?: { column: string; value: string | number } | null;
  onInsert?: (payload: Record<string, unknown>) => void;
  onUpdate?: (payload: Record<string, unknown>) => void;
  onDelete?: (payload: Record<string, unknown>) => void;
  enabled?: boolean;
}

/**
 * Custom hook for subscribing to Supabase real-time changes
 * Automatically handles subscription lifecycle and cleanup
 * 
 * @param options - Configuration for the real-time subscription
 * @returns void
 * 
 * @example
 * useRealtimeSubscription({
 *   table: 'trades',
 *   filter: { column: 'user_id', value: user.id },
 *   onInsert: (newTrade) => console.log('New trade:', newTrade),
 *   onUpdate: (updatedTrade) => console.log('Updated trade:', updatedTrade),
 *   onDelete: (deletedTrade) => console.log('Deleted trade:', deletedTrade),
 * });
 */
export function useRealtimeSubscription({
  table,
  filter = null,
  onInsert,
  onUpdate,
  onDelete,
  enabled = true,
}: RealtimeSubscriptionOptions) {
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    // Skip if Supabase is not configured or subscription is disabled
    if (!isSupabaseConfigured || !enabled) {
      return;
    }

    // Skip if no callbacks are provided
    if (!onInsert && !onUpdate && !onDelete) {
      return;
    }

    const setupSubscription = async () => {
      try {
        // Create a unique channel name
        const channelName = filter
          ? `${table}_${filter.column}_${filter.value}`
          : `${table}_all`;

        // Build filter string for Supabase
        const filterString = filter
          ? `${filter.column}=eq.${filter.value}`
          : undefined;

        // Create and configure the channel
        channelRef.current = supabase
          .channel(channelName)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: table,
              filter: filterString,
            },
            (payload) => {
              // Handle different event types
              switch (payload.eventType) {
                case 'INSERT':
                  if (onInsert && payload.new) {
                    onInsert(payload.new as Record<string, unknown>);
                  }
                  break;
                case 'UPDATE':
                  if (onUpdate && payload.new) {
                    onUpdate(payload.new as Record<string, unknown>);
                  }
                  break;
                case 'DELETE':
                  if (onDelete && payload.old) {
                    onDelete(payload.old as Record<string, unknown>);
                  }
                  break;
              }
            }
          )
          .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              console.log(`✅ Subscribed to ${table} changes`);
            } else if (status === 'CHANNEL_ERROR') {
              console.error(`❌ Error subscribing to ${table} changes`);
            }
          });
      } catch (error) {
        console.error('Error setting up real-time subscription:', error);
      }
    };

    setupSubscription();

    // Cleanup function
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
        console.log(`🔌 Unsubscribed from ${table} changes`);
      }
    };
  }, [table, filter?.column, filter?.value, onInsert, onUpdate, onDelete, enabled]);
}