import { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { toast } from 'sonner';
import SessionTimeoutModal from '@/components/SessionTimeoutModal';
import {
  initSessionTimeout,
  clearSessionTimeout,
  extendSession,
  getRemainingSessionTime,
  logSecurityEvent,
} from '@/utils/security';
import { startBackgroundSync } from '@/services/metaapiSync';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showTimeoutWarning, setShowTimeoutWarning] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(120);
  const backgroundSyncCleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    // Show warning if Supabase is not configured
    if (!isSupabaseConfigured) {
      console.warn('⚠️ Supabase is not configured. Running in demo mode with mock data.');
      toast.warning('Running in demo mode. To enable full features, configure Supabase in .env file.', {
        duration: 5000,
      });
      setLoading(false);
      return;
    }

    // Check active sessions and get current user
    const initializeAuth = async () => {
      try {
        console.log('Initializing authentication...');
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
          setUser(null);
        } else {
          console.log('Current session:', session ? 'Active' : 'None');
          setUser(session?.user ?? null);
          
          // Initialize session timeout if user is logged in
          if (session?.user) {
            initSessionTimeout(
              handleSessionWarning,
              handleSessionTimeout
            );
            // Start background sync for trade data
            backgroundSyncCleanupRef.current = startBackgroundSync();
          }
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session?.user?.email || 'No user');
      setUser(session?.user ?? null);
      
      // Handle specific auth events
      if (event === 'SIGNED_IN') {
        console.log('✅ User signed in:', session?.user?.email);
        // Initialize session timeout
        initSessionTimeout(
          handleSessionWarning,
          handleSessionTimeout
        );
        // Start background sync
        if (backgroundSyncCleanupRef.current) {
          backgroundSyncCleanupRef.current();
        }
        backgroundSyncCleanupRef.current = startBackgroundSync();
      } else if (event === 'SIGNED_OUT') {
        console.log('👋 User signed out');
        // Clear session timeout
        clearSessionTimeout();
        setShowTimeoutWarning(false);
        // Stop background sync
        if (backgroundSyncCleanupRef.current) {
          backgroundSyncCleanupRef.current();
          backgroundSyncCleanupRef.current = null;
        }
      } else if (event === 'TOKEN_REFRESHED') {
        console.log('🔄 Token refreshed');
      } else if (event === 'USER_UPDATED') {
        console.log('📝 User updated');
      }
    });

    return () => {
      subscription.unsubscribe();
      clearSessionTimeout();
      if (backgroundSyncCleanupRef.current) {
        backgroundSyncCleanupRef.current();
        backgroundSyncCleanupRef.current = null;
      }
    };
  }, []);

  const handleSessionWarning = () => {
    console.log('⚠️ Session timeout warning');
    setShowTimeoutWarning(true);
    setRemainingSeconds(120); // 2 minutes
    
    // Update countdown
    const interval = setInterval(() => {
      const remaining = Math.floor(getRemainingSessionTime() / 1000);
      setRemainingSeconds(remaining);
      
      if (remaining <= 0) {
        clearInterval(interval);
      }
    }, 1000);
  };

  const handleSessionTimeout = async () => {
    console.log('⏰ Session timed out');
    setShowTimeoutWarning(false);
    
    logSecurityEvent({
      type: 'session_timeout',
      email: user?.email,
      timestamp: Date.now(),
    });

    toast.error('Your session has expired due to inactivity. Please sign in again.');
    await signOut();
  };

  const handleExtendSession = () => {
    console.log('✅ Session extended');
    extendSession();
    setShowTimeoutWarning(false);
    toast.success('Session extended successfully');
  };

  const signUp = async (email: string, password: string, fullName?: string) => {
    if (!isSupabaseConfigured) {
      console.error('❌ Supabase not configured');
      return { error: new Error('Supabase not configured. Please add credentials to .env file.') };
    }

    try {
      console.log('📝 Attempting to sign up:', email);
      
      // Sign up the user
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName || '',
          },
        },
      });

      if (signUpError) {
        console.error('❌ Sign up error:', signUpError.message);
        return { error: signUpError };
      }

      // Check if user was created
      if (!data.user) {
        console.error('❌ No user data returned');
        return { error: new Error('Failed to create user account') };
      }

      console.log('✅ User signed up successfully:', data.user.email);
      console.log('📧 Email confirmation required:', data.user.identities?.length === 0);
      
      // If email confirmation is required, show a message
      if (data.user.identities?.length === 0) {
        toast.info('Please check your email to confirm your account', {
          duration: 5000,
        });
      }
      
      return { error: null };
    } catch (error) {
      console.error('❌ Unexpected error during sign up:', error);
      return { error: error as Error };
    }
  };

  const signIn = async (email: string, password: string) => {
    if (!isSupabaseConfigured) {
      console.error('❌ Supabase not configured');
      return { error: new Error('Supabase not configured. Please add credentials to .env file.') };
    }

    try {
      console.log('🔐 Attempting to sign in:', email);
      
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        console.error('❌ Sign in error:', signInError.message);
        
        // Provide user-friendly error messages
        if (signInError.message.includes('Invalid login credentials')) {
          return { error: new Error('Invalid email or password. Please try again.') };
        } else if (signInError.message.includes('Email not confirmed')) {
          return { error: new Error('Please verify your email address before signing in.') };
        }
        
        return { error: signInError };
      }

      if (!data.user) {
        console.error('❌ No user data returned');
        return { error: new Error('Failed to sign in') };
      }

      console.log('✅ User signed in successfully:', data.user.email);
      
      return { error: null };
    } catch (error) {
      console.error('❌ Unexpected error during sign in:', error);
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    if (!isSupabaseConfigured) {
      setUser(null);
      clearSessionTimeout();
      return;
    }

    try {
      console.log('👋 Attempting to sign out');
      
      // Clear session timeout first
      clearSessionTimeout();
      
      // Stop background sync
      if (backgroundSyncCleanupRef.current) {
        backgroundSyncCleanupRef.current();
        backgroundSyncCleanupRef.current = null;
      }
      
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('❌ Sign out error:', error);
        toast.error('Failed to sign out. Please try again.');
      } else {
        console.log('✅ User signed out successfully');
        setUser(null);
      }
    } catch (error) {
      console.error('❌ Unexpected error during sign out:', error);
      toast.error('An unexpected error occurred during sign out.');
    }
  };

  const resetPassword = async (email: string) => {
    if (!isSupabaseConfigured) {
      return { error: new Error('Supabase not configured. Please add credentials to .env file.') };
    }

    try {
      console.log('🔑 Attempting to reset password for:', email);
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      
      if (error) {
        console.error('❌ Password reset error:', error);
        return { error };
      }
      
      console.log('✅ Password reset email sent to:', email);
      return { error: null };
    } catch (error) {
      console.error('❌ Unexpected error during password reset:', error);
      return { error: error as Error };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signUp,
        signIn,
        signOut,
        resetPassword,
      }}
    >
      {children}
      <SessionTimeoutModal
        open={showTimeoutWarning}
        remainingSeconds={remainingSeconds}
        onExtend={handleExtendSession}
      />
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}