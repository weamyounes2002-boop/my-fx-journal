import { useState } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Mail, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface ResendVerificationProps {
  email: string;
}

export function ResendVerification({ email }: ResendVerificationProps) {
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const handleResend = async () => {
    if (!isSupabaseConfigured) {
      toast.error('Email verification is not configured');
      return;
    }

    if (cooldown > 0) {
      toast.error(`Please wait ${cooldown} seconds before resending`);
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
      });

      if (error) {
        toast.error(error.message || 'Failed to resend verification email');
      } else {
        toast.success('Verification email has been resent. Please check your inbox.');
        
        // Set 60 second cooldown
        setCooldown(60);
        const interval = setInterval(() => {
          setCooldown((prev) => {
            if (prev <= 1) {
              clearInterval(interval);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }
    } catch (error) {
      console.error('Resend error:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      onClick={handleResend}
      disabled={loading || cooldown > 0}
      className="w-full"
    >
      {loading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Sending...
        </>
      ) : cooldown > 0 ? (
        <>
          <Mail className="mr-2 h-4 w-4" />
          Resend in {cooldown}s
        </>
      ) : (
        <>
          <Mail className="mr-2 h-4 w-4" />
          Resend Verification Email
        </>
      )}
    </Button>
  );
}