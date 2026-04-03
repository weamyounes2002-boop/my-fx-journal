import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import SEO from '@/components/SEO';
import { useAuth } from '@/contexts/AuthContext';
import { BarChart3, AlertCircle, Loader2, Shield, Lock } from 'lucide-react';
import { toast } from 'sonner';
import {
  checkRateLimit,
  resetRateLimit,
  formatRemainingTime,
  checkAccountLockout,
  recordFailedLogin,
  resetAccountLockout,
  sanitizeEmail,
  logSecurityEvent,
} from '@/utils/security';

export default function Login() {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [rateLimited, setRateLimited] = useState(false);
  const [rateLimitTime, setRateLimitTime] = useState('');
  const [accountLocked, setAccountLocked] = useState(false);
  const [lockoutTime, setLockoutTime] = useState('');
  const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setRateLimited(false);
    setAccountLocked(false);

    const sanitizedEmail = sanitizeEmail(email);

    // Check rate limiting
    const rateLimitCheck = checkRateLimit('login');
    if (!rateLimitCheck.allowed) {
      const timeRemaining = formatRemainingTime(rateLimitCheck.remainingTime!);
      setRateLimited(true);
      setRateLimitTime(timeRemaining);
      setError(`Too many login attempts. Please try again in ${timeRemaining}.`);
      logSecurityEvent({
        type: 'rate_limited',
        email: sanitizedEmail,
        timestamp: Date.now(),
        details: 'Login rate limit exceeded',
      });
      return;
    }

    // Check account lockout
    const lockoutCheck = checkAccountLockout(sanitizedEmail);
    if (lockoutCheck.locked) {
      const timeRemaining = formatRemainingTime(lockoutCheck.remainingTime!);
      setAccountLocked(true);
      setLockoutTime(timeRemaining);
      setError(`Account temporarily locked due to multiple failed login attempts. Please try again in ${timeRemaining}.`);
      logSecurityEvent({
        type: 'account_locked',
        email: sanitizedEmail,
        timestamp: Date.now(),
        details: `Account locked, ${timeRemaining} remaining`,
      });
      return;
    }

    setIsLoading(true);

    try {
      console.log('Attempting to sign in with email:', sanitizedEmail);
      
      logSecurityEvent({
        type: 'login_attempt',
        email: sanitizedEmail,
        timestamp: Date.now(),
      });

      const result = await signIn(sanitizedEmail, password);
      
      // Check if there's an error
      if (result.error) {
        console.error('Sign in failed:', result.error);
        setError(result.error.message || 'Invalid email or password');
        
        // Record failed login attempt
        recordFailedLogin(sanitizedEmail);
        
        // Check remaining attempts
        const newLockoutCheck = checkAccountLockout(sanitizedEmail);
        if (newLockoutCheck.attemptsRemaining !== undefined) {
          setAttemptsRemaining(newLockoutCheck.attemptsRemaining);
          if (newLockoutCheck.attemptsRemaining > 0) {
            toast.warning(`${newLockoutCheck.attemptsRemaining} attempt${newLockoutCheck.attemptsRemaining !== 1 ? 's' : ''} remaining before account lockout`, {
              duration: 5000,
            });
          }
        }

        logSecurityEvent({
          type: 'login_failure',
          email: sanitizedEmail,
          timestamp: Date.now(),
          details: result.error.message,
        });
      } else {
        console.log('Sign in successful, redirecting to dashboard');
        
        // Reset rate limit and lockout on successful login
        resetRateLimit('login');
        resetAccountLockout(sanitizedEmail);
        
        logSecurityEvent({
          type: 'login_success',
          email: sanitizedEmail,
          timestamp: Date.now(),
        });

        toast.success('Welcome back!');
        navigate('/dashboard');
      }
    } catch (err) {
      console.error('Unexpected login error:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <SEO
        title="Sign In - My FX Journal"
        description="Sign in to your My FX Journal account to access your trading analytics, performance tracking, and AI-powered insights."
        noindex={true}
      />
      
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <div className="flex items-center justify-center mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <BarChart3 className="h-6 w-6 text-white" />
              </div>
            </div>
            <CardTitle className="text-2xl text-center">Welcome back</CardTitle>
            <CardDescription className="text-center">
              Sign in to your account to continue
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {rateLimited && (
                <Alert className="border-orange-200 bg-orange-50">
                  <Shield className="h-4 w-4 text-orange-600" />
                  <AlertDescription className="text-orange-800">
                    <strong>Security Protection:</strong> Too many attempts detected. 
                    Please wait {rateLimitTime} before trying again.
                  </AlertDescription>
                </Alert>
              )}

              {accountLocked && (
                <Alert className="border-red-200 bg-red-50">
                  <Lock className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-800">
                    <strong>Account Locked:</strong> Your account has been temporarily locked 
                    due to multiple failed login attempts. Please try again in {lockoutTime}.
                  </AlertDescription>
                </Alert>
              )}

              {attemptsRemaining !== null && attemptsRemaining > 0 && attemptsRemaining < 5 && (
                <Alert className="border-yellow-200 bg-yellow-50">
                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                  <AlertDescription className="text-yellow-800">
                    <strong>Warning:</strong> {attemptsRemaining} login attempt{attemptsRemaining !== 1 ? 's' : ''} remaining 
                    before your account is temporarily locked.
                  </AlertDescription>
                </Alert>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                  maxLength={100}
                />
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Link to="/forgot-password" className="text-sm text-blue-600 hover:underline">
                    Forgot password?
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  maxLength={128}
                />
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading || rateLimited || accountLocked}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm">
              <span className="text-gray-600">Don't have an account? </span>
              <Link to="/signup" className="text-blue-600 hover:underline font-semibold">
                Sign up
              </Link>
            </div>

            <div className="mt-4 text-center">
              <Link to="/" className="text-sm text-gray-600 hover:text-gray-900">
                ← Back to home
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}