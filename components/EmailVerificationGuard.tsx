import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ResendVerification } from './ResendVerification';
import { Mail, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface EmailVerificationGuardProps {
  children: React.ReactNode;
}

export function EmailVerificationGuard({ children }: EmailVerificationGuardProps) {
  const { user } = useAuth();

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast.success('Logged out successfully');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Failed to log out');
    }
  };

  // Check if user exists and email is not confirmed
  if (user && !user.email_confirmed_at) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-blue-600" />
              Verify Your Email
            </CardTitle>
            <CardDescription>
              Please verify your email address to access the platform
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Your account is pending email verification. Please check your inbox.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                We've sent a verification email to:
              </p>
              <p className="text-sm font-medium text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800 p-3 rounded-lg">
                {user.email}
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Please check your inbox and click the verification link. If you don't see the email:
              </p>
              <ul className="text-sm text-gray-600 dark:text-gray-400 list-disc list-inside space-y-1 ml-2">
                <li>Check your spam or junk folder</li>
                <li>Make sure the email address is correct</li>
                <li>Wait a few minutes for the email to arrive</li>
                <li>Click the button below to resend</li>
              </ul>
            </div>

            <ResendVerification email={user.email || ''} />

            <div className="pt-4 border-t">
              <Button
                variant="ghost"
                onClick={handleLogout}
                className="w-full"
              >
                Sign Out
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}