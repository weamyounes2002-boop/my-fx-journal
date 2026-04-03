import { useState, useEffect, useCallback } from 'react';
import { Account } from '@/lib/mockData';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Building2, CheckCircle2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface AccountSelectorProps {
  onAccountChange?: (accountId: string) => void;
  className?: string;
}

export default function AccountSelector({ onAccountChange, className = '' }: AccountSelectorProps) {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  // Fetch accounts from Supabase
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
        setAccounts([]);
        return;
      }

      // Transform database records to Account interface
      const transformedAccounts: Account[] = (data || []).map(record => ({
        id: record.id,
        name: record.name,
        broker: record.broker,
        accountNumber: record.account_number,
        balance: parseFloat(record.balance || '0'),
        equity: parseFloat(record.balance || '0'),
        connected: true,
        currency: record.currency || 'USD',
        accountType: 'live' as 'live' | 'demo'
      }));

      setAccounts(transformedAccounts);

      // Set selected account if not already set
      const storedAccountId = localStorage.getItem('selectedAccountId');
      if (storedAccountId && transformedAccounts.find(acc => acc.id === storedAccountId)) {
        setSelectedAccountId(storedAccountId);
      } else if (transformedAccounts.length > 0) {
        const defaultAccount = transformedAccounts[0].id;
        setSelectedAccountId(defaultAccount);
        localStorage.setItem('selectedAccountId', defaultAccount);
        
        // Dispatch event for other components
        window.dispatchEvent(new CustomEvent('accountChanged', { 
          detail: { accountId: defaultAccount } 
        }));
      } else {
        // No accounts available
        setSelectedAccountId('');
        localStorage.removeItem('selectedAccountId');
      }
    } catch (error) {
      console.error('Unexpected error fetching accounts:', error);
      setAccounts([]);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Fetch accounts on mount and when user changes
  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  // Listen for account deletion events
  useEffect(() => {
    const handleAccountDeleted = (event: Event) => {
      const customEvent = event as CustomEvent<{ accountId: string }>;
      const deletedAccountId = customEvent.detail.accountId;
      
      // Refresh accounts list
      fetchAccounts();
      
      // If deleted account was selected, clear selection
      if (selectedAccountId === deletedAccountId) {
        setSelectedAccountId('');
        localStorage.removeItem('selectedAccountId');
      }
    };

    window.addEventListener('accountDeleted', handleAccountDeleted);

    return () => {
      window.removeEventListener('accountDeleted', handleAccountDeleted);
    };
  }, [selectedAccountId, fetchAccounts]);

  // Listen for new accounts being added
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'accountsUpdated') {
        fetchAccounts();
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [fetchAccounts]);

  const handleAccountChange = (accountId: string) => {
    setSelectedAccountId(accountId);
    localStorage.setItem('selectedAccountId', accountId);
    
    // Trigger callback if provided
    if (onAccountChange) {
      onAccountChange(accountId);
    }

    // Dispatch custom event for other components to listen
    window.dispatchEvent(new CustomEvent('accountChanged', { detail: { accountId } }));
  };

  const selectedAccount = accounts.find(acc => acc.id === selectedAccountId);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(value);
  };

  if (isLoading) {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <div className="flex items-center gap-2 px-4 py-3 border rounded-md bg-white">
          <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
          <span className="text-sm text-gray-600">Loading accounts...</span>
        </div>
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <div className="px-4 py-3 border rounded-md bg-yellow-50 border-yellow-200">
          <span className="text-sm text-yellow-800">No accounts available. Please add an account.</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <Select value={selectedAccountId} onValueChange={handleAccountChange}>
        <SelectTrigger className="w-[320px] h-auto py-3">
          <SelectValue>
            {selectedAccount ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100">
                  <Building2 className="h-5 w-5 text-blue-600" />
                </div>
                <div className="flex flex-col items-start">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">{selectedAccount.name}</span>
                    <Badge 
                      variant={selectedAccount.accountType === 'live' ? 'default' : 'secondary'}
                      className="text-xs px-1.5 py-0"
                    >
                      {selectedAccount.accountType.toUpperCase()}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span>{selectedAccount.broker}</span>
                    <span>•</span>
                    <span>#{selectedAccount.accountNumber}</span>
                    <span>•</span>
                    <span className="font-semibold text-gray-700">{formatCurrency(selectedAccount.balance)}</span>
                  </div>
                </div>
              </div>
            ) : (
              <span>Select Account</span>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {accounts.map((account) => (
            <SelectItem key={account.id} value={account.id} className="py-3">
              <div className="flex items-center gap-3 w-full">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100">
                  <Building2 className="h-5 w-5 text-blue-600" />
                </div>
                <div className="flex flex-col items-start flex-1">
                  <div className="flex items-center gap-2 w-full">
                    <span className="font-semibold text-sm">{account.name}</span>
                    <Badge 
                      variant={account.accountType === 'live' ? 'default' : 'secondary'}
                      className="text-xs px-1.5 py-0"
                    >
                      {account.accountType.toUpperCase()}
                    </Badge>
                    {account.connected && (
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-600 ml-auto" />
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span>{account.broker}</span>
                    <span>•</span>
                    <span>#{account.accountNumber}</span>
                  </div>
                  <div className="text-xs font-semibold text-gray-700 mt-1">
                    Balance: {formatCurrency(account.balance)} | Equity: {formatCurrency(account.equity)}
                  </div>
                </div>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

// Hook to get current selected account ID
export function useSelectedAccount(): string {
  const { user } = useAuth();
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');

  useEffect(() => {
    // Get initial value from localStorage
    const storedAccountId = localStorage.getItem('selectedAccountId');
    if (storedAccountId) {
      setSelectedAccountId(storedAccountId);
    }

    // Listen for account changes
    const handleAccountChange = (event: Event) => {
      const customEvent = event as CustomEvent<{ accountId: string }>;
      setSelectedAccountId(customEvent.detail.accountId);
    };

    // Listen for account deletion
    const handleAccountDeleted = (event: Event) => {
      const customEvent = event as CustomEvent<{ accountId: string }>;
      if (selectedAccountId === customEvent.detail.accountId) {
        setSelectedAccountId('');
      }
    };

    window.addEventListener('accountChanged', handleAccountChange);
    window.addEventListener('accountDeleted', handleAccountDeleted);

    return () => {
      window.removeEventListener('accountChanged', handleAccountChange);
      window.removeEventListener('accountDeleted', handleAccountDeleted);
    };
  }, [selectedAccountId, user]);

  return selectedAccountId;
}