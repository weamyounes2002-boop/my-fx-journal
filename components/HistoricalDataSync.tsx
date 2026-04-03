import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { RefreshCw, Download, CheckCircle, AlertCircle, Clock, Calendar } from 'lucide-react';
import { syncHistoricalData, checkSyncCooldown, getTimeSinceLastSync } from '@/api/metaApiClient';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface HistoricalDataSyncProps {
  accountId: string;
  onSyncComplete?: () => void;
}

interface SyncProgress {
  stage: string;
  percentage: number;
  currentChunk?: number;
  totalChunks?: number;
  dateRange?: string;
}

interface FailedChunk {
  chunk: number;
  error: string;
  dateRange: string;
}

interface SyncResultData {
  tradesCount?: number;
  positionsCount?: number;
  totalChunks?: number;
  failedChunks?: number;
  failedChunkDetails?: FailedChunk[];
  syncType?: 'initial' | 'incremental';
}

interface SyncResult {
  success: boolean;
  message?: string;
  error?: string;
  data?: SyncResultData;
}

export default function HistoricalDataSync({ accountId, onSyncComplete }: HistoricalDataSyncProps) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [syncProgress, setSyncProgress] = useState<SyncProgress>({ stage: '', percentage: 0 });
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [lastSyncedDate, setLastSyncedDate] = useState<string | null>(null);
  const [isInitialSync, setIsInitialSync] = useState(true);
  const [cooldownInfo, setCooldownInfo] = useState<{ isActive: boolean; remainingMinutes: number }>({ 
    isActive: false, 
    remainingMinutes: 0 
  });

  // Fetch last synced date on mount and when accountId changes
  useEffect(() => {
    const fetchLastSyncedDate = async () => {
      if (!accountId) return;

      try {
        const { data, error } = await supabase
          .from('mt_connections')
          .select('last_synced_date')
          .eq('account_id', accountId)
          .single();

        if (error) {
          console.error('Error fetching last_synced_date:', error);
          return;
        }

        if (data?.last_synced_date) {
          setLastSyncedDate(data.last_synced_date);
          setIsInitialSync(false);
        } else {
          setLastSyncedDate(null);
          setIsInitialSync(true);
        }
      } catch (error) {
        console.error('Error in fetchLastSyncedDate:', error);
      }
    };

    fetchLastSyncedDate();
  }, [accountId]);

  // Check cooldown status
  useEffect(() => {
    if (!accountId) return;

    const checkCooldown = () => {
      const cooldown = checkSyncCooldown(accountId);
      setCooldownInfo({
        isActive: cooldown.isActive,
        remainingMinutes: cooldown.remainingMinutes,
      });
    };

    // Check immediately
    checkCooldown();

    // Check every 30 seconds to update the cooldown timer
    const interval = setInterval(checkCooldown, 30000);

    return () => clearInterval(interval);
  }, [accountId]);

  const formatLastSyncedDate = (dateString: string | null): string => {
    if (!dateString) return 'Never synced';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleSync = async () => {
    // Check cooldown before starting sync
    const cooldown = checkSyncCooldown(accountId);
    if (cooldown.isActive) {
      toast.error(`Please wait ${cooldown.remainingMinutes} minute${cooldown.remainingMinutes > 1 ? 's' : ''} before syncing again`, {
        description: 'This prevents excessive API calls and reduces costs',
        duration: 5000,
      });
      return;
    }

    setIsSyncing(true);
    setShowDialog(true);
    setSyncProgress({ stage: 'Initializing...', percentage: 0 });
    setSyncResult(null);

    try {
      const result = await syncHistoricalData(
        accountId,
        undefined, // startTime - will use incremental logic
        undefined, // endTime - up to now
        (progress) => {
          setSyncProgress(progress);
        }
      );

      setSyncResult(result);

      if (result.success) {
        toast.success(result.message || 'Historical data synced successfully');
        
        // Refresh last synced date
        const { data } = await supabase
          .from('mt_connections')
          .select('last_synced_date')
          .eq('account_id', accountId)
          .single();
        
        if (data?.last_synced_date) {
          setLastSyncedDate(data.last_synced_date);
          setIsInitialSync(false);
        }
        
        // Update cooldown info
        const cooldown = checkSyncCooldown(accountId);
        setCooldownInfo({
          isActive: cooldown.isActive,
          remainingMinutes: cooldown.remainingMinutes,
        });
        
        onSyncComplete?.();
      } else {
        toast.error(result.error || 'Failed to sync historical data');
      }
    } catch (error) {
      console.error('Sync error:', error);
      setSyncResult({
        success: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
      });
      toast.error('Failed to sync historical data');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleClose = () => {
    if (!isSyncing) {
      setShowDialog(false);
      setSyncProgress({ stage: '', percentage: 0 });
      setSyncResult(null);
    }
  };

  const getButtonText = () => {
    if (isSyncing) return 'Syncing...';
    if (cooldownInfo.isActive) {
      return `Wait ${cooldownInfo.remainingMinutes}min`;
    }
    return isInitialSync ? 'Initial Sync (1 Year)' : 'Update Sync (New Data)';
  };

  const getButtonTooltip = () => {
    if (cooldownInfo.isActive) {
      return `Please wait ${cooldownInfo.remainingMinutes} minute${cooldownInfo.remainingMinutes > 1 ? 's' : ''} before syncing again`;
    }
    if (isInitialSync) {
      return 'Fetch last 1 year of trading history (~100-500 API calls)';
    }
    return 'Fetch new data since last sync (~5-20 API calls)';
  };

  return (
    <>
      <div className="flex flex-col gap-2">
        <Button
          variant="outline"
          onClick={handleSync}
          disabled={isSyncing || !accountId || cooldownInfo.isActive}
          className="flex items-center gap-2"
          title={getButtonTooltip()}
        >
          <Download className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
          {getButtonText()}
        </Button>
        
        <div className="flex flex-col gap-1 px-1">
          {lastSyncedDate && (
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <Calendar className="h-3 w-3" />
              <span>Last synced: {formatLastSyncedDate(lastSyncedDate)}</span>
            </div>
          )}
          
          {cooldownInfo.isActive && (
            <div className="flex items-center gap-1.5 text-xs text-amber-600">
              <Clock className="h-3 w-3" />
              <span>Cooldown: {cooldownInfo.remainingMinutes} minute{cooldownInfo.remainingMinutes > 1 ? 's' : ''} remaining</span>
            </div>
          )}
        </div>
      </div>

      <Dialog open={showDialog} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {isSyncing ? 'Syncing Historical Data' : syncResult?.success ? 'Sync Complete' : 'Sync Failed'}
            </DialogTitle>
            <DialogDescription>
              {isSyncing
                ? isInitialSync
                  ? 'Fetching your trading history (last 1 year) from MetaAPI...'
                  : 'Fetching new trading data since last sync...'
                : syncResult?.success
                ? 'Your historical data has been successfully synced.'
                : 'There was an error syncing your data.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {isSyncing && (
              <>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">{syncProgress.stage}</span>
                    <span className="font-semibold">{syncProgress.percentage}%</span>
                  </div>
                  <Progress value={syncProgress.percentage} className="h-2" />
                </div>
                
                {syncProgress.currentChunk && syncProgress.totalChunks && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
                    <Clock className="h-4 w-4 text-blue-600" />
                    <div>
                      <p className="font-medium text-blue-900">
                        Processing chunk {syncProgress.currentChunk} of {syncProgress.totalChunks}
                      </p>
                      {syncProgress.dateRange && (
                        <p className="text-xs text-blue-700 mt-0.5">
                          {syncProgress.dateRange}
                        </p>
                      )}
                    </div>
                  </div>
                )}
                
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>
                    {isInitialSync 
                      ? 'Initial sync may take a few minutes...' 
                      : 'Incremental sync - only fetching new data...'}
                  </span>
                </div>
              </>
            )}

            {!isSyncing && syncResult && (
              <div className="flex items-start gap-3">
                {syncResult.success ? (
                  <>
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-green-900">Success!</p>
                      <p className="text-sm text-gray-600 mt-1">{syncResult.message}</p>
                      {syncResult.data && (
                        <div className="mt-3 p-3 bg-green-50 rounded-lg space-y-1">
                          <p className="text-xs text-green-800">
                            <strong>Sync type:</strong> {syncResult.data.syncType === 'initial' ? 'Initial (1 year)' : 'Incremental (new data only)'}
                          </p>
                          <p className="text-xs text-green-800">
                            <strong>Trades synced:</strong> {syncResult.data.tradesCount || 0}
                          </p>
                          <p className="text-xs text-green-800">
                            <strong>Open positions:</strong> {syncResult.data.positionsCount || 0}
                          </p>
                          {syncResult.data.totalChunks && (
                            <p className="text-xs text-green-800">
                              <strong>Time periods processed:</strong> {syncResult.data.totalChunks}
                            </p>
                          )}
                          {syncResult.data.failedChunks && syncResult.data.failedChunks > 0 && (
                            <p className="text-xs text-amber-800 mt-2 pt-2 border-t border-amber-200">
                              <strong>Note:</strong> {syncResult.data.failedChunks} time period(s) failed to sync
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-red-900">Error</p>
                      <p className="text-sm text-gray-600 mt-1">{syncResult.error}</p>
                      {syncResult.data?.failedChunkDetails && (
                        <div className="mt-3 p-3 bg-red-50 rounded-lg">
                          <p className="text-xs font-medium text-red-900 mb-2">Failed time periods:</p>
                          <ul className="text-xs text-red-800 space-y-1">
                            {syncResult.data.failedChunkDetails.map((chunk: FailedChunk, idx: number) => (
                              <li key={idx}>
                                • {chunk.dateRange}: {chunk.error}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {!isSyncing && (
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleClose}>
                Close
              </Button>
              {syncResult?.success && (
                <Button onClick={() => window.location.reload()}>
                  Refresh Page
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}