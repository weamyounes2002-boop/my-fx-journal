import { supabase, isSupabaseConfigured } from './supabase';

export interface ReferralStats {
  totalReferrals: number;
  activeReferrals: number;
  pendingReferrals: number;
  completedReferrals: number;
  totalEarnings: number;
  availableBalance: number;
  pendingWithdrawals: number;
}

export interface Referral {
  id: string;
  referrer_user_id: string;
  referred_user_id: string | null;
  referral_code: string;
  status: 'pending' | 'active' | 'completed' | 'expired';
  earnings: number;
  commission_rate: number;
  is_active?: boolean;
  subscription_status?: string;
  created_at: string;
  completed_at: string | null;
}

export interface Withdrawal {
  id: string;
  user_id: string;
  amount: number;
  method: 'paypal' | 'bank_transfer' | 'crypto';
  payment_details: PaymentDetails;
  status: 'pending' | 'processing' | 'completed' | 'rejected';
  notes: string | null;
  created_at: string;
  processed_at: string | null;
  processed_by: string | null;
}

export interface ReferralEarning {
  id: string;
  referral_id: string;
  user_id: string;
  amount: number;
  description: string | null;
  created_at: string;
}

export interface PayPalDetails {
  email: string;
}

export interface BankTransferDetails {
  accountNumber: string;
  routingNumber: string;
  accountHolder: string;
}

export interface CryptoDetails {
  walletAddress: string;
  network: string;
}

export type PaymentDetails = PayPalDetails | BankTransferDetails | CryptoDetails;

/**
 * Generate a unique referral code for a user
 * @param userId - User ID
 * @returns Referral code
 */
export async function generateReferralCode(userId: string): Promise<string> {
  // Generate unique referral code based on user ID
  const shortId = userId.substring(0, 8).toUpperCase();
  const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `REF${shortId}${randomSuffix}`;
}

/**
 * Create initial referral code for a new user
 * @param userId - User ID
 * @returns Referral record
 */
export async function createUserReferralCode(userId: string): Promise<Referral | null> {
  console.log('Creating referral code for user:', userId);
  console.log('Supabase configured:', isSupabaseConfigured);
  
  if (!isSupabaseConfigured) {
    console.warn('Supabase is not configured, using localStorage fallback');
    // Fallback to localStorage
    const referralCode = await generateReferralCode(userId);
    const referral: Referral = {
      id: Date.now().toString(),
      referrer_user_id: userId,
      referred_user_id: null,
      referral_code: referralCode,
      status: 'active',
      earnings: 0,
      commission_rate: 10.00,
      is_active: true,
      subscription_status: 'active',
      created_at: new Date().toISOString(),
      completed_at: null
    };
    
    localStorage.setItem(`referralCode_${userId}`, referralCode);
    localStorage.setItem(`referralData_${userId}`, JSON.stringify(referral));
    console.log('Created referral code in localStorage:', referralCode);
    return referral;
  }

  try {
    // Check if user already has a referral code
    const { data: existing, error: fetchError } = await supabase
      .from('referrals')
      .select('*')
      .eq('referrer_user_id', userId)
      .is('referred_user_id', null)
      .maybeSingle();

    if (fetchError) {
      console.error('Error checking existing referral:', fetchError);
      // Fallback to localStorage on error
      const referralCode = await generateReferralCode(userId);
      localStorage.setItem(`referralCode_${userId}`, referralCode);
      const referral: Referral = {
        id: Date.now().toString(),
        referrer_user_id: userId,
        referred_user_id: null,
        referral_code: referralCode,
        status: 'active',
        earnings: 0,
        commission_rate: 10.00,
        is_active: true,
        subscription_status: 'active',
        created_at: new Date().toISOString(),
        completed_at: null
      };
      localStorage.setItem(`referralData_${userId}`, JSON.stringify(referral));
      return referral;
    }

    if (existing) {
      console.log('Found existing referral code:', existing.referral_code);
      return existing;
    }

    // Generate new referral code
    const referralCode = await generateReferralCode(userId);
    console.log('Generated new referral code:', referralCode);

    // Create referral record
    const { data, error } = await supabase
      .from('referrals')
      .insert({
        referrer_user_id: userId,
        referred_user_id: null,
        referral_code: referralCode,
        status: 'active',
        earnings: 0,
        commission_rate: 10.00
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating referral code in database:', error);
      // Fallback to localStorage
      localStorage.setItem(`referralCode_${userId}`, referralCode);
      const referral: Referral = {
        id: Date.now().toString(),
        referrer_user_id: userId,
        referred_user_id: null,
        referral_code: referralCode,
        status: 'active',
        earnings: 0,
        commission_rate: 10.00,
        is_active: true,
        subscription_status: 'active',
        created_at: new Date().toISOString(),
        completed_at: null
      };
      localStorage.setItem(`referralData_${userId}`, JSON.stringify(referral));
      return referral;
    }

    console.log('Successfully created referral code in database:', data);
    return data;
  } catch (error) {
    console.error('Unexpected error creating referral code:', error);
    // Fallback to localStorage
    const referralCode = await generateReferralCode(userId);
    localStorage.setItem(`referralCode_${userId}`, referralCode);
    const referral: Referral = {
      id: Date.now().toString(),
      referrer_user_id: userId,
      referred_user_id: null,
      referral_code: referralCode,
      status: 'active',
      earnings: 0,
      commission_rate: 10.00,
      is_active: true,
      subscription_status: 'active',
      created_at: new Date().toISOString(),
      completed_at: null
    };
    localStorage.setItem(`referralData_${userId}`, JSON.stringify(referral));
    return referral;
  }
}

/**
 * Get user's referral code
 * @param userId - User ID
 * @returns Referral code or null
 */
export async function getUserReferralCode(userId: string): Promise<string | null> {
  console.log('Getting referral code for user:', userId);
  
  // First check localStorage
  const storedCode = localStorage.getItem(`referralCode_${userId}`);
  if (storedCode) {
    console.log('Found referral code in localStorage:', storedCode);
    return storedCode;
  }
  
  if (!isSupabaseConfigured) {
    console.log('Supabase not configured, generating new code');
    const newCode = await generateReferralCode(userId);
    localStorage.setItem(`referralCode_${userId}`, newCode);
    return newCode;
  }

  try {
    const { data, error } = await supabase
      .from('referrals')
      .select('referral_code')
      .eq('referrer_user_id', userId)
      .is('referred_user_id', null)
      .maybeSingle();

    if (error) {
      console.error('Error fetching referral code from database:', error);
      // Generate and store in localStorage as fallback
      const newCode = await generateReferralCode(userId);
      localStorage.setItem(`referralCode_${userId}`, newCode);
      return newCode;
    }

    if (data?.referral_code) {
      console.log('Found referral code in database:', data.referral_code);
      // Cache in localStorage
      localStorage.setItem(`referralCode_${userId}`, data.referral_code);
      return data.referral_code;
    }

    console.log('No referral code found in database');
    return null;
  } catch (error) {
    console.error('Error fetching referral code:', error);
    // Generate and store in localStorage as fallback
    const newCode = await generateReferralCode(userId);
    localStorage.setItem(`referralCode_${userId}`, newCode);
    return newCode;
  }
}

/**
 * Track a referral when a new user signs up with a referral code
 * @param referralCode - Referral code
 * @param referredUserId - New user's ID
 * @returns Referral record or null
 */
export async function trackReferral(
  referralCode: string,
  referredUserId: string
): Promise<Referral | null> {
  if (!isSupabaseConfigured) {
    console.warn('Supabase is not configured');
    return null;
  }

  try {
    // Find referrer by code
    const { data: referrerData } = await supabase
      .from('referrals')
      .select('referrer_user_id')
      .eq('referral_code', referralCode)
      .is('referred_user_id', null)
      .single();

    if (!referrerData) {
      console.error('Invalid referral code');
      return null;
    }

    // Check if referral already exists
    const { data: existingReferral } = await supabase
      .from('referrals')
      .select('*')
      .eq('referrer_user_id', referrerData.referrer_user_id)
      .eq('referred_user_id', referredUserId)
      .single();

    if (existingReferral) {
      return existingReferral;
    }

    // Create referral record
    const { data, error } = await supabase
      .from('referrals')
      .insert({
        referrer_user_id: referrerData.referrer_user_id,
        referred_user_id: referredUserId,
        referral_code: referralCode,
        status: 'active',
        earnings: 0,
        commission_rate: 10.00
      })
      .select()
      .single();

    if (error) {
      console.error('Error tracking referral:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Unexpected error tracking referral:', error);
    return null;
  }
}

/**
 * Get referral statistics for a user
 * @param userId - User ID
 * @returns Referral statistics
 */
export async function getReferralStats(userId: string): Promise<ReferralStats> {
  if (!isSupabaseConfigured) {
    // Fallback to localStorage
    const storedStats = localStorage.getItem(`referralStats_${userId}`);
    if (storedStats) {
      return JSON.parse(storedStats);
    }
    
    return {
      totalReferrals: 0,
      activeReferrals: 0,
      pendingReferrals: 0,
      completedReferrals: 0,
      totalEarnings: 0,
      availableBalance: 0,
      pendingWithdrawals: 0
    };
  }

  try {
    // Get all referrals
    const { data: referrals } = await supabase
      .from('referrals')
      .select('*')
      .eq('referrer_user_id', userId)
      .not('referred_user_id', 'is', null);

    const totalReferrals = referrals?.length || 0;
    const activeReferrals = referrals?.filter(r => r.status === 'active').length || 0;
    const pendingReferrals = referrals?.filter(r => r.status === 'pending').length || 0;
    const completedReferrals = referrals?.filter(r => r.status === 'completed').length || 0;

    // Calculate total earnings
    const { data: earnings } = await supabase
      .from('referral_earnings')
      .select('amount')
      .eq('user_id', userId);

    const totalEarnings = earnings?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;

    // Calculate pending withdrawals
    const { data: withdrawals } = await supabase
      .from('withdrawals')
      .select('amount')
      .eq('user_id', userId)
      .in('status', ['pending', 'processing']);

    const pendingWithdrawals = withdrawals?.reduce((sum, w) => sum + Number(w.amount), 0) || 0;

    // Available balance = total earnings - pending withdrawals - completed withdrawals
    const { data: completedWithdrawals } = await supabase
      .from('withdrawals')
      .select('amount')
      .eq('user_id', userId)
      .eq('status', 'completed');

    const completedWithdrawalsAmount = completedWithdrawals?.reduce((sum, w) => sum + Number(w.amount), 0) || 0;
    const availableBalance = totalEarnings - pendingWithdrawals - completedWithdrawalsAmount;

    return {
      totalReferrals,
      activeReferrals,
      pendingReferrals,
      completedReferrals,
      totalEarnings,
      availableBalance: Math.max(0, availableBalance),
      pendingWithdrawals
    };
  } catch (error) {
    console.error('Error fetching referral stats:', error);
    return {
      totalReferrals: 0,
      activeReferrals: 0,
      pendingReferrals: 0,
      completedReferrals: 0,
      totalEarnings: 0,
      availableBalance: 0,
      pendingWithdrawals: 0
    };
  }
}

/**
 * Get user's referrals
 * @param userId - User ID
 * @returns List of referrals
 */
export async function getUserReferrals(userId: string): Promise<Referral[]> {
  if (!isSupabaseConfigured) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('referrals')
      .select('*')
      .eq('referrer_user_id', userId)
      .not('referred_user_id', 'is', null)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching referrals:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Unexpected error fetching referrals:', error);
    return [];
  }
}

/**
 * Get user's withdrawal history
 * @param userId - User ID
 * @returns List of withdrawals
 */
export async function getUserWithdrawals(userId: string): Promise<Withdrawal[]> {
  if (!isSupabaseConfigured) {
    // Fallback to localStorage
    const storedWithdrawals = localStorage.getItem(`withdrawals_${userId}`);
    if (storedWithdrawals) {
      return JSON.parse(storedWithdrawals);
    }
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('withdrawals')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching withdrawals:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Unexpected error fetching withdrawals:', error);
    return [];
  }
}

/**
 * Create a withdrawal request
 * @param userId - User ID
 * @param amount - Withdrawal amount
 * @param method - Payment method
 * @param paymentDetails - Payment details
 * @returns Withdrawal record or null
 */
export async function createWithdrawalRequest(
  userId: string,
  amount: number,
  method: 'paypal' | 'bank_transfer' | 'crypto',
  paymentDetails: PaymentDetails
): Promise<Withdrawal | null> {
  if (!isSupabaseConfigured) {
    // Fallback to localStorage
    const withdrawal: Withdrawal = {
      id: Date.now().toString(),
      user_id: userId,
      amount,
      method,
      payment_details: paymentDetails,
      status: 'pending',
      notes: null,
      created_at: new Date().toISOString(),
      processed_at: null,
      processed_by: null
    };

    const storedWithdrawals = localStorage.getItem(`withdrawals_${userId}`);
    const withdrawals = storedWithdrawals ? JSON.parse(storedWithdrawals) : [];
    withdrawals.unshift(withdrawal);
    localStorage.setItem(`withdrawals_${userId}`, JSON.stringify(withdrawals));

    return withdrawal;
  }

  try {
    // Validate amount
    if (amount <= 0) {
      throw new Error('Withdrawal amount must be greater than 0');
    }

    // Check minimum withdrawal amount
    const MIN_WITHDRAWAL = 50;
    if (amount < MIN_WITHDRAWAL) {
      throw new Error(`Minimum withdrawal amount is $${MIN_WITHDRAWAL}`);
    }

    // Check available balance
    const stats = await getReferralStats(userId);
    if (amount > stats.availableBalance) {
      throw new Error('Insufficient balance');
    }

    // Create withdrawal request
    const { data, error } = await supabase
      .from('withdrawals')
      .insert({
        user_id: userId,
        amount,
        method,
        payment_details: paymentDetails,
        status: 'pending'
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating withdrawal request:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Unexpected error creating withdrawal request:', error);
    throw error;
  }
}

/**
 * Add earnings to a referral
 * @param referralId - Referral ID
 * @param userId - User ID (referrer)
 * @param amount - Earning amount
 * @param description - Description
 * @returns Earning record or null
 */
export async function addReferralEarning(
  referralId: string,
  userId: string,
  amount: number,
  description: string
): Promise<ReferralEarning | null> {
  if (!isSupabaseConfigured) {
    console.warn('Supabase is not configured');
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('referral_earnings')
      .insert({
        referral_id: referralId,
        user_id: userId,
        amount,
        description
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding referral earning:', error);
      return null;
    }

    // Update referral earnings total
    const { error: updateError } = await supabase
      .from('referrals')
      .update({
        earnings: supabase.rpc('increment_earnings', { referral_id: referralId, amount })
      })
      .eq('id', referralId);

    if (updateError) {
      console.error('Error updating referral earnings:', updateError);
    }

    return data;
  } catch (error) {
    console.error('Unexpected error adding referral earning:', error);
    return null;
  }
}

/**
 * Get referral earnings history
 * @param userId - User ID
 * @returns List of earnings
 */
export async function getReferralEarnings(userId: string): Promise<ReferralEarning[]> {
  if (!isSupabaseConfigured) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('referral_earnings')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching referral earnings:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Unexpected error fetching referral earnings:', error);
    return [];
  }
}

/**
 * Validate payment details based on method
 * @param method - Payment method
 * @param details - Payment details
 * @returns Validation result
 */
export function validatePaymentDetails(
  method: 'paypal' | 'bank_transfer' | 'crypto',
  details: Partial<PaymentDetails>
): { valid: boolean; error?: string } {
  if (!details) {
    return { valid: false, error: 'Payment details are required' };
  }

  switch (method) {
    case 'paypal':
      if (!('email' in details) || !details.email) {
        return { valid: false, error: 'PayPal email is required' };
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(details.email)) {
        return { valid: false, error: 'Invalid PayPal email format' };
      }
      break;

    case 'bank_transfer':
      if (!('accountNumber' in details) || !('routingNumber' in details) || !('accountHolder' in details)) {
        return { valid: false, error: 'Bank account details are incomplete' };
      }
      if (!details.accountNumber || !details.routingNumber || !details.accountHolder) {
        return { valid: false, error: 'Bank account details are incomplete' };
      }
      break;

    case 'crypto':
      if (!('walletAddress' in details) || !('network' in details)) {
        return { valid: false, error: 'Crypto wallet details are incomplete' };
      }
      if (!details.walletAddress || !details.network) {
        return { valid: false, error: 'Crypto wallet details are incomplete' };
      }
      break;

    default:
      return { valid: false, error: 'Invalid payment method' };
  }

  return { valid: true };
}