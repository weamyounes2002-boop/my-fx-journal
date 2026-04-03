import { useState, useEffect, useCallback, useRef } from 'react';
import Sidebar from '@/components/Sidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
import { Progress } from '@/components/ui/progress';
import { Account } from '@/lib/mockData';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import { Plus, Trash2, CheckCircle, AlertCircle, Loader2, Lock, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { provisionMetaApiAccount, syncHistoricalData, checkSyncCooldown, getTimeSinceLastSync } from '@/api/metaApiClient';

interface AccountRecord {
  id: string;
  name: string;
  broker: string;
  account_number: string;
  balance: string | number;
  currency: string;
  user_id: string;
  created_at?: string;
}

interface SyncProgressState {
  accountId: string;
  stage: string;
  percentage: number;
}

export default function Accounts() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isConnecting, setIsConnecting] = useState<string | null>(null);
  const [connectionProgress, setConnectionProgress] = useState<string>('');
  const [accountToDelete, setAccountToDelete] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [syncingAccounts, setSyncingAccounts] = useState<Set<string>>(new Set());
  const [syncProgress, setSyncProgress] = useState<SyncProgressState | null>(null);

  // MT credentials form
  const [mtLogin, setMtLogin] = useState('');
  const [mtServer, setMtServer] = useState('');
  const [mtPassword, setMtPassword] = useState('');
  const [platform, setPlatform] = useState<'mt4' | 'mt5'>('mt5');

  // Manual account form
  const [newAccount, setNewAccount] = useState({
    name: '',
    broker: 'Other',
    accountNumber: '',
    currency: 'USD',
  });

  const isSavingRef = useRef(false);

  const transformAccountRecord = useCallback((record: AccountRecord): Account => ({
    id: record.id,
    name: record.name,
    broker: record.broker,
    accountNumber: record.account_number,
    balance: parseFloat(String(record.balance || '0')),
    equity: parseFloat(String(record.balance || '0')),
    connected: true,
    currency: record.currency || 'USD',
    accountType: 'live' as const
  }), []);

  const fetchAccounts = useCallback(async () => {
    if (!isSupabaseConfigured || !user) {
      setAccounts([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching accounts:', error);
        toast.error('Failed to load accounts. Please try again.');
        setAccounts([]);
        return;
      }

      const transformedAccounts: Account[] = (data || []).map((record) =>
        transformAccountRecord(record as AccountRecord)
      );

      setAccounts(transformedAccounts);
    } catch (error) {
      console.error('Unexpected error fetching accounts:', error);
      toast.error('An unexpected error occurred while loading accounts.');
      setAccounts([]);
    } finally {
      setIsLoading(false);
    }
  }, [user, transformAccountRecord]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  useRealtimeSubscription({
    table: 'accounts',
    filter: user ? { column: 'user_id', value: user.id } : null,
    enabled: isSupabaseConfigured && !!user,
    onInsert: (payload) => {
      if (!isSavingRef.current && payload.user_id === user?.id) {
        const newAcc = transformAccountRecord(payload as AccountRecord);
        setAccounts(prev => [newAcc, ...prev]);
        toast.success('New account added', { description: newAcc.name });
        window.dispatchEvent(new CustomEvent('accountsUpdated'));
      }
    },
    onUpdate: (payload) => {
      if (!isSavingRef.current && payload.user_id === user?.id) {
        const updatedAccount = transformAccountRecord(payload as AccountRecord);
        setAccounts(prev => prev.map(a => a.id === updatedAccount.id ? updatedAccount : a));
        toast.info('Account updated', { description: updatedAccount.name });
        window.dispatchEvent(new CustomEvent('accountsUpdated'));
      }
    },
    onDelete: (payload) => {
      if (!isSavingRef.current && payload.user_id === user?.id) {
        setAccounts(prev => prev.filter(a => a.id !== payload.id));
        toast.info('Account deleted', { description: 'An account was removed from another session' });

        const storedAccountId = localStorage.getItem('selectedAccountId');
        if (storedAccountId === payload.id) {
          localStorage.removeItem('selectedAccountId');
          window.dispatchEvent(new CustomEvent('accountDeleted', { detail: { accountId: payload.id } }));
        }
        window.dispatchEvent(new CustomEvent('accountsUpdated'));
      }
    },
  });

  // ─── Sync Trades for an Account ─────────────────────────────────────────────
  const handleSyncAccount = async (accountId: string) => {
    // Check cooldown
    const cooldown = checkSyncCooldown(accountId);
    if (cooldown.isActive) {
      toast.info(`Please wait ${cooldown.remainingMinutes} minute${cooldown.remainingMinutes > 1 ? 's' : ''} before syncing again`);
      return;
    }

    setSyncingAccounts(prev => new Set(prev).add(accountId));
    setSyncProgress({ accountId, stage: 'Starting sync...', percentage: 0 });

    try {
      const result = await syncHistoricalData(
        accountId,
        undefined,
        undefined,
        (progress) => {
          setSyncProgress({
            accountId,
            stage: progress.stage,
            percentage: progress.percentage,
          });
        }
      );

      if (result.success) {
        toast.success('Trades synced successfully!', {
          description: result.message || 'Your trade data has been updated.',
          duration: 5000,
        });
        // Refresh accounts to update balances
        await fetchAccounts();
      } else {
        toast.error('Sync failed', {
          description: result.error || 'Unknown error occurred during sync.',
          duration: 8000,
        });
      }
    } catch (error) {
      console.error('[Accounts] Sync error:', error);
      toast.error('Sync failed', {
        description: error instanceof Error ? error.message : 'Unknown error',
        duration: 8000,
      });
    } finally {
      setSyncingAccounts(prev => {
        const next = new Set(prev);
        next.delete(accountId);
        return next;
      });
      setSyncProgress(null);
    }
  };

  // ─── Connect MT Account (fully automatic — no manual Step 2) ───────────────
  const handleConnectMTAccount = async () => {
    if (!mtLogin.trim() || !mtServer.trim() || !mtPassword.trim()) {
      toast.error('Please fill in all MT account credentials');
      return;
    }

    if (!isSupabaseConfigured || !user) {
      toast.error('Please configure Supabase and sign in to add accounts.');
      return;
    }

    setIsConnecting('mt');
    setConnectionProgress('Creating account record...');
    isSavingRef.current = true;

    try {
      // Step 1: Create account record in Supabase
      const accountData = {
        user_id: user.id,
        name: `${platform.toUpperCase()} - ${mtLogin}`,
        broker: mtServer.split('-')[0] || 'MetaTrader',
        account_number: mtLogin,
        balance: 0,
        currency: 'USD',
      };

      const { data: insertedAccount, error: insertError } = await supabase
        .from('accounts')
        .insert([accountData])
        .select()
        .single();

      if (insertError || !insertedAccount) {
        console.error('[Accounts] Database error:', insertError);
        toast.error('Failed to create account record. Please try again.');
        return;
      }

      setConnectionProgress('Connecting to MetaAPI...');

      // Step 2: Automatically provision the MetaAPI account — no manual step
      const result = await provisionMetaApiAccount({
        login: mtLogin.trim(),
        server: mtServer.trim(),
        password: mtPassword.trim(),
        platform,
        account_id: insertedAccount.id,
        name: accountData.name,
      });

      if (result.success) {
        toast.success('Account connected successfully!', {
          description: 'Your MT account is now connected. Starting initial data sync...',
          duration: 8000,
        });

        // Reset form and close dialog
        setMtLogin('');
        setMtServer('');
        setMtPassword('');
        setPlatform('mt5');
        setConnectionProgress('');
        setIsAddDialogOpen(false);

        // Refresh accounts list
        await fetchAccounts();

        // Trigger initial trade sync automatically
        // Use a slight delay to let the provisioning settle
        setTimeout(() => {
          handleSyncAccount(insertedAccount.id);
        }, 2000);
      } else {
        // Clean up the account record if MetaAPI provisioning failed
        await supabase.from('accounts').delete().eq('id', insertedAccount.id);
        setConnectionProgress('');
        toast.error('Failed to connect to MetaAPI', {
          description: result.error || 'Unknown error. Please check your credentials and try again.',
          duration: 8000,
        });
      }
    } catch (error) {
      console.error('[Accounts] Unexpected error:', error);
      setConnectionProgress('');
      toast.error('An unexpected error occurred', {
        description: error instanceof Error ? error.message : 'Unknown error',
        duration: 8000,
      });
    } finally {
      setIsConnecting(null);
      setTimeout(() => { isSavingRef.current = false; }, 1000);
    }
  };

  // ─── Add Manual Account ────────────────────────────────────────────────────
  const handleAddManualAccount = async () => {
    if (!newAccount.name || !newAccount.accountNumber) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (!isSupabaseConfigured || !user) {
      toast.error('Please configure Supabase and sign in to add accounts.');
      return;
    }

    setIsConnecting('manual');
    isSavingRef.current = true;

    try {
      const accountData = {
        user_id: user.id,
        name: newAccount.name,
        broker: newAccount.broker,
        account_number: newAccount.accountNumber,
        balance: 0,
        currency: newAccount.currency,
      };

      const { error } = await supabase.from('accounts').insert([accountData]);

      if (error) {
        console.error('[Accounts] Database error:', error);
        toast.error('Failed to add account. Please try again.');
        return;
      }

      toast.success('Account added successfully!');
      await fetchAccounts();

      setNewAccount({ name: '', broker: 'Other', accountNumber: '', currency: 'USD' });
      setIsAddDialogOpen(false);
    } catch (error) {
      console.error('[Accounts] Unexpected error:', error);
      toast.error('An unexpected error occurred', {
        description: error instanceof Error ? error.message : 'Unknown error',
        duration: 8000,
      });
    } finally {
      setIsConnecting(null);
      setTimeout(() => { isSavingRef.current = false; }, 1000);
    }
  };

  // ─── Delete Account ────────────────────────────────────────────────────────
  const handleDeleteAccount = (accountId: string) => {
    setAccountToDelete(accountId);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!accountToDelete || !user) return;

    if (!isSupabaseConfigured) {
      toast.error('Please configure Supabase to delete accounts.');
      setIsDeleteDialogOpen(false);
      return;
    }

    isSavingRef.current = true;

    try {
      const { error } = await supabase
        .from('accounts')
        .delete()
        .eq('id', accountToDelete)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error deleting account:', error);
        toast.error('Failed to delete account. Please try again.');
        return;
      }

      toast.success('Account removed successfully');

      const storedAccountId = localStorage.getItem('selectedAccountId');
      if (storedAccountId === accountToDelete) {
        localStorage.removeItem('selectedAccountId');
        window.dispatchEvent(new CustomEvent('accountDeleted', { detail: { accountId: accountToDelete } }));
      }

      await fetchAccounts();
      setAccountToDelete(null);
      setIsDeleteDialogOpen(false);
    } catch (error) {
      console.error('Unexpected error deleting account:', error);
      toast.error('An unexpected error occurred while deleting the account.');
    } finally {
      setTimeout(() => { isSavingRef.current = false; }, 1000);
    }
  };

  const formatCurrency = (value: number | undefined | null) => {
    const numValue = typeof value === 'number' ? value : 0;
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(numValue);
  };

  // ─── Loading state ─────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Sidebar />
        <div className="md:ml-64 pt-16 md:pt-0">
          <div className="p-4 sm:p-6 flex items-center justify-center min-h-screen">
            <div className="text-center">
              <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
              <p className="text-gray-600">Loading accounts...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Main render ───────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />

      <div className="md:ml-64 pt-16 md:pt-0">
        <div className="p-4 sm:p-6">
          <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Trading Accounts</h1>
              <p className="text-gray-600 mt-2 text-sm sm:text-base">Manage your trading accounts</p>
            </div>

            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2 w-full sm:w-auto" disabled={!user}>
                  <Plus className="h-4 w-4" />
                  Connect Account
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Connect Trading Account</DialogTitle>
                </DialogHeader>

                {connectionProgress && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg mb-4">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                      <p className="text-sm text-blue-800">{connectionProgress}</p>
                    </div>
                  </div>
                )}

                <div className="space-y-6">
                  {/* MT4/MT5 credentials section */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white font-bold">1</div>
                      <h3 className="font-semibold text-gray-900 text-sm sm:text-base">Enter Your MT4/MT5 Credentials</h3>
                    </div>

                    <div>
                      <Label htmlFor="platform">Platform *</Label>
                      <Select value={platform} onValueChange={(value: 'mt4' | 'mt5') => setPlatform(value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="mt4">MetaTrader 4 (MT4)</SelectItem>
                          <SelectItem value="mt5">MetaTrader 5 (MT5)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="mt-server">Broker Server *</Label>
                      <Input
                        id="mt-server"
                        type="text"
                        placeholder="e.g., ICMarkets-Demo"
                        value={mtServer}
                        onChange={(e) => setMtServer(e.target.value)}
                      />
                    </div>

                    <div>
                      <Label htmlFor="mt-login">Login ID *</Label>
                      <Input
                        id="mt-login"
                        type="number"
                        placeholder="MT4/MT5 Login ID"
                        value={mtLogin}
                        onChange={(e) => setMtLogin(e.target.value)}
                      />
                    </div>

                    <div>
                      <Label htmlFor="mt-password">Investor Password *</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          id="mt-password"
                          type="password"
                          placeholder="Investor (read-only) Password"
                          value={mtPassword}
                          onChange={(e) => setMtPassword(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>

                    <Button
                      onClick={handleConnectMTAccount}
                      disabled={!mtLogin.trim() || !mtServer.trim() || !mtPassword.trim() || isConnecting === 'mt'}
                      className="w-full"
                    >
                      {isConnecting === 'mt' ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Connecting...
                        </>
                      ) : (
                        'Connect Account'
                      )}
                    </Button>
                  </div>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-white px-2 text-gray-500">Or add manually</span>
                    </div>
                  </div>

                  {/* Manual account section */}
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="accountName">Account Name *</Label>
                      <Input
                        id="accountName"
                        placeholder="My Trading Account"
                        value={newAccount.name}
                        onChange={(e) => setNewAccount({ ...newAccount, name: e.target.value })}
                      />
                    </div>

                    <div>
                      <Label htmlFor="broker">Broker/Platform *</Label>
                      <Select
                        value={newAccount.broker}
                        onValueChange={(value) => setNewAccount({ ...newAccount, broker: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cTrader">cTrader</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="accountNumber">Account Number *</Label>
                      <Input
                        id="accountNumber"
                        placeholder="12345678"
                        value={newAccount.accountNumber}
                        onChange={(e) => setNewAccount({ ...newAccount, accountNumber: e.target.value })}
                      />
                    </div>

                    <div>
                      <Label htmlFor="currency">Currency</Label>
                      <Select
                        value={newAccount.currency}
                        onValueChange={(value) => setNewAccount({ ...newAccount, currency: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="USD">USD</SelectItem>
                          <SelectItem value="EUR">EUR</SelectItem>
                          <SelectItem value="GBP">GBP</SelectItem>
                          <SelectItem value="JPY">JPY</SelectItem>
                          <SelectItem value="AUD">AUD</SelectItem>
                          <SelectItem value="CAD">CAD</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <Button
                      onClick={handleAddManualAccount}
                      disabled={isConnecting === 'manual'}
                      className="w-full"
                      variant="outline"
                    >
                      {isConnecting === 'manual' ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Adding...
                        </>
                      ) : (
                        'Add Manual Account'
                      )}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {!user && (
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-yellow-800 text-sm">
                Please sign in to manage your trading accounts.
              </p>
            </div>
          )}

          {/* Info Card */}
          <Card className="mb-6 bg-blue-50 border-blue-200">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <Lock className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-blue-900 mb-1 text-sm sm:text-base">How to Connect Your MT4/MT5 Account</h3>
                  <ol className="text-xs sm:text-sm text-blue-800 space-y-1 list-decimal list-inside">
                    <li>Enter your broker server, login ID, and investor (read-only) password</li>
                    <li>Click "Connect Account" — the connection happens automatically</li>
                    <li>Once connected, click "Sync Trades" to load your trade history</li>
                  </ol>
                  <p className="text-xs sm:text-sm text-blue-800 mt-2">
                    <strong>Security:</strong> We only use your investor password for read-only access. We cannot place trades or modify your account.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Delete Confirmation Dialog */}
          <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Account</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete this account? This will also delete all associated trades and data. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setAccountToDelete(null)}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Accounts grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {accounts.length === 0 ? (
              <Card className="lg:col-span-2">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <AlertCircle className="h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Accounts Yet</h3>
                  <p className="text-gray-600 text-center mb-4 text-sm">
                    Connect your first trading account to start tracking your trades
                  </p>
                  <Button onClick={() => setIsAddDialogOpen(true)} disabled={!user}>
                    <Plus className="h-4 w-4 mr-2" />
                    Connect Your First Account
                  </Button>
                </CardContent>
              </Card>
            ) : (
              accounts.map((account) => {
                const isSyncing = syncingAccounts.has(account.id);
                const currentSyncProgress = syncProgress?.accountId === account.id ? syncProgress : null;
                const lastSync = getTimeSinceLastSync(account.id);

                return (
                  <Card key={account.id} className="relative">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg sm:text-xl mb-2">{account.name}</CardTitle>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline">{account.broker}</Badge>
                            <Badge variant="default" className="flex items-center gap-1">
                              <CheckCircle className="h-3 w-3" />
                              Active
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-xs text-gray-500">Account Number</Label>
                            <p className="font-semibold text-sm sm:text-base">{account.accountNumber}</p>
                          </div>
                          <div>
                            <Label className="text-xs text-gray-500">Currency</Label>
                            <p className="font-semibold text-sm sm:text-base">{account.currency}</p>
                          </div>
                          <div>
                            <Label className="text-xs text-gray-500">Balance</Label>
                            <p className="font-semibold text-sm sm:text-base">{formatCurrency(account.balance)}</p>
                          </div>
                          <div>
                            <Label className="text-xs text-gray-500">Equity</Label>
                            <p className="font-semibold text-sm sm:text-base">{formatCurrency(account.equity)}</p>
                          </div>
                        </div>

                        {/* Sync Progress */}
                        {isSyncing && currentSyncProgress && (
                          <div className="space-y-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <div className="flex items-center gap-2">
                              <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                              <p className="text-sm text-blue-800">{currentSyncProgress.stage}</p>
                            </div>
                            <Progress value={currentSyncProgress.percentage} className="h-2" />
                            <p className="text-xs text-blue-600 text-right">{currentSyncProgress.percentage}%</p>
                          </div>
                        )}

                        {/* Last sync info */}
                        {lastSync && !isSyncing && (
                          <p className="text-xs text-gray-400">Last synced: {lastSync}</p>
                        )}

                        <div className="flex gap-2 pt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSyncAccount(account.id)}
                            disabled={isSyncing}
                            className="flex items-center gap-2"
                          >
                            <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
                            {isSyncing ? 'Syncing...' : 'Sync Trades'}
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteAccount(account.id)}
                            className="flex items-center gap-2"
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>

          {/* Information Card */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <AlertCircle className="h-5 w-5 text-blue-600" />
                About Trading Accounts
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs sm:text-sm text-gray-600">
              <div>
                <h4 className="font-semibold text-gray-900 mb-1">Automatic Connection</h4>
                <p>
                  Enter your broker credentials and we handle the MetaAPI connection automatically.
                  No manual steps required — just enter your details and click Connect.
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-1">Trade Sync</h4>
                <p>
                  After connecting, click "Sync Trades" to fetch your trade history. The first sync
                  fetches the last year of data. Subsequent syncs only fetch new data since the last sync.
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-1">Security & Privacy</h4>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>We only use your <strong>investor password</strong> (read-only access)</li>
                  <li>Your credentials are encrypted and stored securely</li>
                  <li>We cannot place trades or modify your account</li>
                  <li>Only you can access and manage your accounts</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}