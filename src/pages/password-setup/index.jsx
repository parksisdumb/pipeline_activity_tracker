import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, User, Building, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Select from '../../components/ui/Select';

const PasswordSetupPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, userProfile, completeProfileSetup, updatePassword } = useAuth();

  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
    fullName: '',
    role: 'rep',
    organization: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [passwordStrength, setPasswordStrength] = useState({
    score: 0,
    feedback: []
  });

  const stateData = location?.state || {};
  const needsPasswordSetup = stateData?.needsPasswordSetup;
  const profileIncomplete = stateData?.profileIncomplete;
  const isRecovery = stateData?.isRecovery;

  const roleOptions = [
    { value: 'rep', label: 'Sales Representative' },
    { value: 'manager', label: 'Sales Manager' },
    { value: 'admin', label: 'Administrator' }
  ];

  // Enhanced password strength checker
  const checkPasswordStrength = (password) => {
    const feedback = [];
    let score = 0;

    if (password?.length >= 8) {
      score += 1;
    } else {
      feedback?.push('At least 8 characters');
    }

    if (/[A-Z]/?.test(password)) {
      score += 1;
    } else {
      feedback?.push('One uppercase letter');
    }

    if (/[a-z]/?.test(password)) {
      score += 1;
    } else {
      feedback?.push('One lowercase letter');
    }

    if (/\d/?.test(password)) {
      score += 1;
    } else {
      feedback?.push('One number');
    }

    if (/[^A-Za-z\d]/?.test(password)) {
      score += 1;
    } else {
      feedback?.push('One special character');
    }

    return { score, feedback };
  };

  useEffect(() => {
    // Check if user is authenticated
    if (!user) {
      navigate('/login', { 
        replace: true, 
        state: { message: 'Please sign in to access password setup.' }
      });
      return;
    }

    // Get detailed auth status on component mount
    checkAuthenticationStatus();

    // Pre-fill form data from user profile if available
    if (userProfile) {
      setFormData(prev => ({
        ...prev,
        fullName: userProfile?.full_name || '',
        role: userProfile?.role || 'rep',
        organization: userProfile?.organization || '',
      }));
    }

    // Pre-fill email from state if available
    if (stateData?.email) {
      setFormData(prev => ({
        ...prev,
        email: stateData?.email
      }));
    }
  }, [user, userProfile, stateData, navigate]);

  const checkAuthenticationStatus = async () => {
    if (!user?.id) return;

    try {
      const { data: authStatus, error: statusError } = await supabase?.rpc(
        'get_detailed_user_auth_status',
        { user_uuid: user?.id }
      );

      if (statusError) {
        console.warn('Could not get detailed auth status:', statusError);
        return;
      }

      const status = authStatus?.[0];
      if (status && status?.next_action === 'dashboard') {
        // User is fully set up, redirect to appropriate dashboard
        navigate(status?.redirect_url || '/today', { replace: true });
      }
    } catch (error) {
      console.warn('Error checking authentication status:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e?.target || {};
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Check password strength in real-time
    if (name === 'password') {
      const strength = checkPasswordStrength(value);
      setPasswordStrength(strength);
    }

    // Clear messages when user starts typing
    if (error) setError('');
    if (success) setSuccess('');
  };

  const handleSelectChange = (fieldName) => (value) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value
    }));

    if (error) setError('');
    if (success) setSuccess('');
  };

  const validateForm = () => {
    if (!formData?.fullName?.trim()) {
      return 'Full name is required';
    }

    if (needsPasswordSetup && !isRecovery) {
      if (!formData?.password) {
        return 'Password is required';
      }

      if (passwordStrength?.score < 3) {
        return 'Password doesn\'t meet security requirements';
      }

      if (formData?.password !== formData?.confirmPassword) {
        return 'Passwords do not match';
      }
    }

    return null;
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    setError('');
    setSuccess('');

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);

    try {
      // Step 1: Update password if needed (including recovery)
      if ((needsPasswordSetup || isRecovery) && formData?.password) {
        const passwordResult = await updatePassword(formData?.password);
        if (!passwordResult?.success) {
          setError(`Failed to set password: ${passwordResult?.error}`);
          return;
        }

        // Mark password as completed in database
        if (user?.id) {
          const { data: passwordCompleteResult, error: passwordCompleteError } = await supabase?.rpc(
            'complete_password_setup',
            { 
              user_uuid: user?.id,
              mark_password_complete: true
            }
          );

          if (passwordCompleteError) {
            console.warn('Could not mark password as complete:', passwordCompleteError);
          }
        }
      }

      // Step 2: Complete profile setup using enhanced function
      const { data: setupResult, error: setupError } = await supabase?.rpc(
        'complete_user_setup_enhanced',
        {
          user_email: user?.email,
          profile_data: {
            fullName: formData?.fullName,
            role: formData?.role,
            organization: formData?.organization || null
          },
          mark_password_set: needsPasswordSetup || isRecovery
        }
      );

      if (setupError) {
        setError(`Failed to complete profile setup: ${setupError?.message}`);
        return;
      }

      const result = setupResult?.[0];
      if (result?.success) {
        setSuccess('Account setup completed successfully! Redirecting to your dashboard...');

        // Redirect based on the function's recommendation
        const redirectUrl = result?.redirect_to;
        const dashboardUrl = getDashboardUrl(redirectUrl);

        setTimeout(() => {
          navigate(dashboardUrl, { replace: true });
        }, 2000);
      } else {
        setError(result?.message || 'Failed to complete profile setup');
      }

    } catch (error) {
      console.error('Password setup error:', error);
      setError('An unexpected error occurred during setup. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getDashboardUrl = (redirectTo) => {
    switch (redirectTo) {
      case 'super-admin-dashboard': 
        return '/super-admin-dashboard';
      case 'admin-dashboard': 
        return '/admin-dashboard';
      case 'manager-dashboard': 
        return '/manager-dashboard';
      case 'today':
      default:
        return '/today';
    }
  };

  const getPasswordStrengthColor = (score) => {
    if (score <= 2) return 'bg-red-500';
    if (score === 3) return 'bg-yellow-500';
    if (score === 4) return 'bg-green-500';
    return 'bg-green-600';
  };

  const getPasswordStrengthText = (score) => {
    if (score <= 2) return 'Weak';
    if (score === 3) return 'Good';
    if (score === 4) return 'Strong';
    return 'Very Strong';
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Enhanced welcome message based on setup type */}
        {(needsPasswordSetup || profileIncomplete || isRecovery) && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-blue-600" />
              <div>
                <h3 className="font-medium text-blue-800">
                  {isRecovery ? 'Password Reset' : 'Setup Required'}
                </h3>
                <p className="text-sm text-blue-700">
                  {isRecovery && 
                    'Please set your new password and update your profile information.'
                  }
                  {!isRecovery && needsPasswordSetup && profileIncomplete && 
                    'Please create a password and complete your profile to continue.'
                  }
                  {!isRecovery && needsPasswordSetup && !profileIncomplete && 
                    'Please create a password to complete your account setup.'
                  }
                  {!isRecovery && !needsPasswordSetup && profileIncomplete && 
                    'Please complete your profile information to continue.'
                  }
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Main Setup Card */}
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="text-center space-y-2 mb-6">
            <h1 className="text-2xl font-bold text-foreground">
              {isRecovery ? 'Reset Your Password' : needsPasswordSetup ?'Complete Your Setup' : 'Update Your Profile'}
            </h1>
            <p className="text-muted-foreground">
              {isRecovery ? 
                'Set your new password and update your profile information' :
                needsPasswordSetup ? 
                'Set up your password and complete your profile to access your dashboard' :
                'Update your profile information to continue'
              }
            </p>
            {stateData?.email && (
              <p className="text-sm text-muted-foreground">
                Account: <span className="font-medium">{stateData?.email}</span>
              </p>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Error/Success Messages */}
            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-destructive" />
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              </div>
            )}

            {success && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <p className="text-sm text-green-700">{success}</p>
                </div>
              </div>
            )}

            {/* Full Name */}
            <div className="space-y-2">
              <label htmlFor="fullName" className="block text-sm font-medium text-foreground">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="fullName"
                  name="fullName"
                  type="text"
                  value={formData?.fullName}
                  onChange={handleInputChange}
                  placeholder="Enter your full name"
                  className="pl-10"
                  disabled={loading}
                  required
                />
              </div>
            </div>

            {/* Role */}
            <div className="space-y-2">
              <label htmlFor="role" className="block text-sm font-medium text-foreground">
                Role
              </label>
              <Select
                id="role"
                name="role"
                value={formData?.role}
                onChange={handleSelectChange('role')}
                options={roleOptions}
                disabled={loading}
                required
                onSearchChange={() => {}}
                error=""
                onOpenChange={() => {}}
                label="Role"
                description=""
                ref={null}
              />
            </div>

            {/* Organization */}
            <div className="space-y-2">
              <label htmlFor="organization" className="block text-sm font-medium text-foreground">
                Organization <span className="text-muted-foreground">(Optional)</span>
              </label>
              <div className="relative">
                <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="organization"
                  name="organization"
                  type="text"
                  value={formData?.organization}
                  onChange={handleInputChange}
                  placeholder="Enter your organization name"
                  className="pl-10"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Show password fields if password setup is needed OR this is a recovery */}
            {(needsPasswordSetup || isRecovery) && (
              <>
                {/* Password */}
                <div className="space-y-2">
                  <label htmlFor="password" className="block text-sm font-medium text-foreground">
                    {isRecovery ? 'New Password' : 'Password'}
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      value={formData?.password}
                      onChange={handleInputChange}
                      placeholder={isRecovery ? "Enter your new password" : "Create a secure password"}
                      className="pl-10 pr-10"
                      disabled={loading}
                      autoComplete="new-password"
                      required
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={loading}
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>

                  {/* Password Strength Indicator */}
                  {formData?.password && (
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full transition-all duration-300 ${getPasswordStrengthColor(passwordStrength?.score)}`}
                            style={{ width: `${(passwordStrength?.score / 5) * 100}%` }}
                          ></div>
                        </div>
                        <span className="text-xs font-medium">
                          {getPasswordStrengthText(passwordStrength?.score)}
                        </span>
                      </div>
                      {passwordStrength?.feedback?.length > 0 && (
                        <div className="text-xs text-muted-foreground">
                          <p>Missing: {passwordStrength?.feedback?.join(', ')}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Confirm Password */}
                <div className="space-y-2">
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-foreground">
                    Confirm {isRecovery ? 'New ' : ''}Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      value={formData?.confirmPassword}
                      onChange={handleInputChange}
                      placeholder="Confirm your password"
                      className="pl-10 pr-10"
                      disabled={loading}
                      autoComplete="new-password"
                      required
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      disabled={loading}
                      tabIndex={-1}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Password Match Indicator */}
                {formData?.confirmPassword && formData?.password && (
                  <div className={`text-xs ${
                    formData?.password === formData?.confirmPassword 
                      ? 'text-green-600' :'text-red-600'
                  }`}>
                    {formData?.password === formData?.confirmPassword 
                      ? '✓ Passwords match' :'✗ Passwords do not match'
                    }
                  </div>
                )}
              </>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full"
              disabled={loading || ((needsPasswordSetup || isRecovery) && passwordStrength?.score < 3)}
              loading={loading}
            >
              {loading ? 
                'Setting Up Account...' : 
                isRecovery ? 
                'Reset Password & Update Profile' :
                needsPasswordSetup ? 
                'Complete Setup' : 
                'Update Profile'
              }
            </Button>
          </form>
        </div>

        {/* Security Info */}
        {(needsPasswordSetup || isRecovery) && (
          <div className="bg-card border border-border rounded-lg p-4">
            <h3 className="font-medium text-foreground mb-2">Security Requirements</h3>
            <div className="space-y-1 text-sm text-muted-foreground">
              <p>• Minimum 8 characters</p>
              <p>• At least one uppercase and lowercase letter</p>
              <p>• At least one number</p>
              <p>• At least one special character</p>
            </div>
          </div>
        )}

        {/* Background Pattern */}
        <div className="fixed inset-0 -z-10 overflow-hidden">
          <div className="absolute -top-40 -right-32 w-80 h-80 bg-primary/5 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-40 -left-32 w-80 h-80 bg-accent/5 rounded-full blur-3xl"></div>
        </div>
      </div>
    </div>
  );
};

export default PasswordSetupPage;