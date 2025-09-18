import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { CheckCircle, AlertCircle, Loader2, Mail, ArrowRight, RefreshCw } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { authService } from '../../services/authService';

const MagicLinkAuthentication = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  
  const [authState, setAuthState] = useState({
    loading: true,
    success: false,
    error: null,
    message: '',
    userEmail: '',
    needsPasswordSetup: false
  });

  const [resending, setResending] = useState(false);

  useEffect(() => {
    handleMagicLinkAuth();
  }, []);

  const handleMagicLinkAuth = async () => {
    setAuthState(prev => ({ ...prev, loading: true, error: null }));

    try {
      // Get the auth tokens from URL parameters
      const accessToken = searchParams?.get('access_token');
      const refreshToken = searchParams?.get('refresh_token');
      const tokenType = searchParams?.get('token_type');
      const type = searchParams?.get('type');
      const error = searchParams?.get('error');
      const errorDescription = searchParams?.get('error_description');

      // Check for errors first
      if (error) {
        throw new Error(errorDescription || error);
      }

      // Check if this is a password reset/recovery
      if (type === 'recovery' && accessToken && refreshToken) {
        // Set the session first for password reset
        const { error: sessionError } = await supabase?.auth?.setSession({
          access_token: accessToken,
          refresh_token: refreshToken
        });

        if (sessionError) {
          throw new Error(`Session setup failed: ${sessionError.message}`);
        }

        setAuthState({
          loading: false,
          success: true,
          error: null,
          message: 'Password reset link verified! Redirecting to set new password...',
          userEmail: searchParams?.get('email') || '',
          needsPasswordSetup: false
        });

        // Redirect to password reset confirmation with proper URL params
        setTimeout(() => {
          const params = new URLSearchParams({
            access_token: accessToken,
            refresh_token: refreshToken,
            type: 'recovery'
          });
          
          const email = searchParams?.get('email');
          if (email) {
            params?.set('email', email);
          }
          
          navigate(`/password-reset-confirmation?${params?.toString()}`);
        }, 2000);
        return;
      }

      // Check if this is a magic link authentication
      if (type === 'magiclink' && accessToken && refreshToken) {
        // Set the session using the tokens
        const { data: sessionData, error: sessionError } = await supabase?.auth?.setSession({
          access_token: accessToken,
          refresh_token: refreshToken
        });

        if (sessionError) {
          throw new Error(`Authentication failed: ${sessionError.message}`);
        }

        if (sessionData?.user) {
          // Get user profile to determine next steps
          const { data: profile, error: profileError } = await supabase?.from('user_profiles')?.select('*')?.eq('id', sessionData?.user?.id)?.single();

          setAuthState({
            loading: false,
            success: true,
            error: null,
            message: 'Successfully authenticated! Redirecting to dashboard...',
            userEmail: sessionData?.user?.email,
            needsPasswordSetup: false
          });

          // Redirect based on user role
          setTimeout(() => {
            const userRole = profile?.role || 'rep';
            switch (userRole) {
              case 'super_admin': navigate('/super-admin-dashboard');
                break;
              case 'admin': navigate('/admin-dashboard');
                break;
              case 'manager': navigate('/manager-dashboard');
                break;
              default:
                navigate('/today');
            }
          }, 2000);
          return;
        }
      }

      // Check if this is an email confirmation
      if (type === 'signup' || type === 'confirmation') {
        const { data: { user }, error: userError } = await supabase?.auth?.getUser();
        
        if (userError || !user) {
          throw new Error('Unable to confirm email. Please try again.');
        }

        setAuthState({
          loading: false,
          success: true,
          error: null,
          message: 'Email confirmed successfully! You can now set up your password.',
          userEmail: user?.email,
          needsPasswordSetup: true
        });

        // Redirect to password setup
        setTimeout(() => {
          navigate('/password-setup', { 
            state: { 
              email: user?.email,
              confirmed: true,
              message: 'Email confirmed! Please set up your password to complete registration.'
            }
          });
        }, 2000);
        return;
      }

      // If we get here, it's an invalid or expired link
      setAuthState({
        loading: false,
        success: false,
        error: 'Invalid or expired authentication link',
        message: 'This link may have expired or is invalid. Please request a new one.',
        userEmail: '',
        needsPasswordSetup: false
      });

    } catch (error) {
      console.error('Magic link auth error:', error);
      setAuthState({
        loading: false,
        success: false,
        error: error?.message || 'Authentication failed',
        message: 'There was a problem with the authentication link. Please try again.',
        userEmail: '',
        needsPasswordSetup: false
      });
    }
  };

  const handleResendMagicLink = async () => {
    if (!authState?.userEmail) return;

    setResending(true);
    try {
      const result = await authService?.sendMagicLink(authState?.userEmail);
      
      if (result?.success) {
        setAuthState(prev => ({
          ...prev,
          message: 'New magic link sent! Please check your email.',
          error: null
        }));
      } else {
        setAuthState(prev => ({
          ...prev,
          error: result?.error || 'Failed to send magic link'
        }));
      }
    } catch (error) {
      setAuthState(prev => ({
        ...prev,
        error: 'Failed to send magic link. Please try again.'
      }));
    } finally {
      setResending(false);
    }
  };

  const handleReturnToLogin = () => {
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-xl shadow-lg p-8 text-center">
          {/* Status Icon */}
          <div className="mb-6">
            {authState?.loading && (
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
              </div>
            )}
            
            {!authState?.loading && authState?.success && (
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            )}
            
            {!authState?.loading && authState?.error && (
              <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
            )}
          </div>

          {/* Status Message */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {authState?.loading && 'Authenticating...'}
              {!authState?.loading && authState?.success && 'Authentication Successful'}
              {!authState?.loading && authState?.error && 'Authentication Failed'}
            </h1>
            
            <p className="text-gray-600">
              {authState?.loading && 'Please wait while we verify your authentication...'}
              {!authState?.loading && authState?.message}
            </p>
          </div>

          {/* User Email Display */}
          {authState?.userEmail && !authState?.loading && (
            <div className="mb-6 p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-center text-sm text-gray-700">
                <Mail className="w-4 h-4 mr-2" />
                {authState?.userEmail}
              </div>
            </div>
          )}

          {/* Loading Progress */}
          {authState?.loading && (
            <div className="mb-6">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{ width: '70%' }}></div>
              </div>
              <p className="text-sm text-gray-500 mt-2">Verifying your authentication...</p>
            </div>
          )}

          {/* Success Actions */}
          {!authState?.loading && authState?.success && (
            <div className="space-y-3">
              {authState?.needsPasswordSetup && (
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-700">
                    You'll be redirected to set up your password...
                  </p>
                </div>
              )}
              
              {!authState?.needsPasswordSetup && (
                <div className="p-3 bg-green-50 rounded-lg">
                  <p className="text-sm text-green-700">
                    Redirecting to your dashboard...
                  </p>
                </div>
              )}
              
              <button
                onClick={() => navigate('/today')}
                className="inline-flex items-center justify-center w-full px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Continue to Dashboard
                <ArrowRight className="w-4 h-4 ml-2" />
              </button>
            </div>
          )}

          {/* Error Actions */}
          {!authState?.loading && authState?.error && (
            <div className="space-y-4">
              <div className="p-3 bg-red-50 rounded-lg">
                <p className="text-sm text-red-700">{authState?.error}</p>
              </div>
              
              <div className="space-y-2">
                {authState?.userEmail && (
                  <button
                    onClick={handleResendMagicLink}
                    disabled={resending}
                    className="inline-flex items-center justify-center w-full px-4 py-2 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {resending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Send New Magic Link
                      </>
                    )}
                  </button>
                )}
                
                <button
                  onClick={handleReturnToLogin}
                  className="inline-flex items-center justify-center w-full px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Return to Login
                </button>
              </div>
            </div>
          )}

          {/* Help Text */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              If you continue to have problems, please contact support or try logging in with your email and password.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MagicLinkAuthentication;