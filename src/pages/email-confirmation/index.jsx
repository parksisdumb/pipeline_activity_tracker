import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Mail, Clock, RefreshCw, AlertCircle } from 'lucide-react';
import Button from '../../components/ui/Button';
import { supabase } from '../../lib/supabase';

const EmailConfirmationPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState('');
  const [resendAttempts, setResendAttempts] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Get email from location state or URL params
  const email = location?.state?.email || new URLSearchParams(location?.search)?.get('email');

  useEffect(() => {
    // Check if this is a redirect from email confirmation
    const checkAuthState = async () => {
      try {
        const { data: { session }, error } = await supabase?.auth?.getSession();
        
        if (error) {
          setError('Error checking authentication status');
          console.error('Auth session error:', error);
          setLoading(false);
          return;
        }

        if (session?.user) {
          // User is authenticated, check if they need to complete password setup
          const { data: profile, error: profileError } = await supabase
            ?.from('user_profiles')
            ?.select('full_name, password_set, profile_completed')
            ?.eq('id', session?.user?.id)
            ?.single();

          if (profileError && profileError?.code !== 'PGRST116') {
            console.error('Profile fetch error:', profileError);
            setError('Error loading user profile');
            setLoading(false);
            return;
          }

          // If user needs to set up password or complete profile, redirect to password setup
          if (!profile?.password_set || !profile?.profile_completed) {
            navigate('/password-setup', { 
              replace: true,
              state: { 
                email: session?.user?.email,
                userId: session?.user?.id,
                needsPasswordSetup: true 
              }
            });
            return;
          }

          // User is fully set up, redirect to dashboard
          navigate('/today', { replace: true });
          return;
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Session check error:', error);
        setError('Unexpected error during authentication check');
        setLoading(false);
      }
    };

    checkAuthState();

    // Listen for auth state changes (when user clicks confirmation link)
    const { data: { subscription } } = supabase?.auth?.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        // Redirect to password setup after successful email confirmation
        navigate('/password-setup', { 
          replace: true,
          state: { 
            email: session?.user?.email,
            userId: session?.user?.id,
            needsPasswordSetup: true,
            justConfirmed: true 
          }
        });
      }
    });

    return () => subscription?.unsubscribe();
  }, [navigate]);

  const handleResendEmail = async () => {
    if (!email) {
      setResendMessage('No email address available. Please try signing up again.');
      return;
    }

    if (resendAttempts >= 3) {
      setResendMessage('Maximum resend attempts reached. Please try again later or contact support.');
      return;
    }

    setResending(true);
    setResendMessage('');

    try {
      const { error } = await supabase?.auth?.resend({
        type: 'signup',
        email: email
      });

      if (error) {
        setResendMessage(`Failed to resend confirmation email: ${error?.message}`);
      } else {
        setResendAttempts(prev => prev + 1);
        setResendMessage('Confirmation email resent successfully! Please check your inbox.');
      }
    } catch (error) {
      console.error('Resend email error:', error);
      setResendMessage('Failed to resend confirmation email. Please try again.');
    } finally {
      setResending(false);
    }
  };

  const handleBackToSignup = () => {
    navigate('/signup', { replace: true });
  };

  const handleGoToLogin = () => {
    navigate('/login', { replace: true });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-card border border-border rounded-lg p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Checking authentication status...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Main Confirmation Card */}
        <div className="bg-card border border-border rounded-lg p-8 text-center space-y-6">
          {/* Icon */}
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <Mail className="w-8 h-8 text-primary" />
          </div>

          {/* Title and Description */}
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-foreground">
              Check Your Email
            </h1>
            <p className="text-muted-foreground">
              We've sent a confirmation email to
            </p>
            {email && (
              <p className="font-medium text-foreground break-all">
                {email}
              </p>
            )}
          </div>

          {/* Instructions */}
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground space-y-2">
              <p>Please check your inbox and click the confirmation link to activate your account.</p>
              <p>After confirming your email, you'll be redirected to complete your profile setup.</p>
            </div>

            {/* Delivery Time Estimate */}
            <div className="flex items-center justify-center space-x-2 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>Usually arrives within 2-5 minutes</span>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-destructive" />
                <p className="text-sm text-destructive">{error}</p>
              </div>
            </div>
          )}

          {/* Resend Message */}
          {resendMessage && (
            <div className={`p-3 rounded-md ${
              resendMessage?.includes('Failed') || resendMessage?.includes('Maximum')
                ? 'bg-destructive/10 border border-destructive/20' :'bg-green-50 border border-green-200'
            }`}>
              <p className={`text-sm ${
                resendMessage?.includes('Failed') || resendMessage?.includes('Maximum')
                  ? 'text-destructive' :'text-green-700'
              }`}>
                {resendMessage}
              </p>
            </div>
          )}

          {/* Resend Button */}
          <Button
            onClick={handleResendEmail}
            disabled={resending || resendAttempts >= 3}
            variant="outline"
            className="w-full"
          >
            {resending ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Resend Email {resendAttempts > 0 && `(${resendAttempts}/3)`}
              </>
            )}
          </Button>

          {/* Action Buttons */}
          <div className="space-y-3">
            <Button
              onClick={handleGoToLogin}
              variant="default"
              className="w-full"
            >
              Already confirmed? Sign In
            </Button>
            
            <Button
              onClick={handleBackToSignup}
              variant="ghost"
              className="w-full"
            >
              Back to Sign Up
            </Button>
          </div>
        </div>

        {/* Troubleshooting */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="font-medium text-foreground mb-3">
            Not seeing the email?
          </h3>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>• Check your spam/junk folder</p>
            <p>• Make sure {email ? email?.split('@')?.[1] : 'your email provider'} isn't blocking our emails</p>
            <p>• Wait a few more minutes - sometimes delivery can be delayed</p>
            <p>• Try the resend button above if it's been more than 10 minutes</p>
          </div>
          
          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-sm text-muted-foreground">
              Still having trouble? Contact our support team and we'll help you get set up.
            </p>
          </div>
        </div>

        {/* Background Pattern */}
        <div className="fixed inset-0 -z-10 overflow-hidden">
          <div className="absolute -top-40 -right-32 w-80 h-80 bg-primary/5 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-40 -left-32 w-80 h-80 bg-accent/5 rounded-full blur-3xl"></div>
        </div>
      </div>
    </div>
  );
};

export default EmailConfirmationPage;