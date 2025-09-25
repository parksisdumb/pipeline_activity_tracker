import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, Lock, User, Building, AlertCircle, CheckCircle, Mail, Shield } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Select from '../../components/ui/Select';

const TemporaryPasswordSetup = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const [formData, setFormData] = useState({
    email: '',
    temporaryPassword: '',
    newPassword: '',
    confirmPassword: '',
    fullName: '',
    role: 'rep',
    organization: '',
    securityQuestion: '',
    securityAnswer: ''
  });

  const [showTempPassword, setShowTempPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [step, setStep] = useState('verification'); // verification, profile-setup, complete
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [passwordStrength, setPasswordStrength] = useState({
    score: 0,
    feedback: []
  });

  const roleOptions = [
    { value: 'rep', label: 'Sales Representative' },
    { value: 'manager', label: 'Sales Manager' },
    { value: 'admin', label: 'Administrator' }
  ];

  const securityQuestions = [
    { value: 'pet', label: 'What was the name of your first pet?' },
    { value: 'school', label: 'What was the name of your elementary school?' },
    { value: 'city', label: 'What city were you born in?' },
    { value: 'mother', label: 'What is your mother\'s maiden name?' },
    { value: 'car', label: 'What was your first car?' }
  ];

  useEffect(() => {
    // Check for email from URL params or redirect state
    const emailFromParams = searchParams?.get('email');
    if (emailFromParams) {
      setFormData(prev => ({ ...prev, email: emailFromParams }));
    }

    // Check if user is already authenticated
    checkExistingSession();
  }, [searchParams]);

  const checkExistingSession = async () => {
    try {
      const { data: { session } } = await supabase?.auth?.getSession();
      
      if (session?.user) {
        setUser(session?.user);
        setFormData(prev => ({ ...prev, email: session?.user?.email || prev?.email }));
        
        // Get user profile
        const { data: profile } = await supabase
          ?.from('user_profiles')
          ?.select('*')
          ?.eq('id', session?.user?.id)
          ?.single();
        
        if (profile) {
          setUserProfile(profile);
          
          // Determine current step based on profile state
          if (!profile?.password_set) {
            setStep('verification');
          } else if (!profile?.profile_completed || !profile?.full_name) {
            setStep('profile-setup');
            setFormData(prev => ({
              ...prev,
              fullName: profile?.full_name || '',
              role: profile?.role || 'rep',
              organization: profile?.organization || ''
            }));
          } else {
            // User is fully set up, redirect to dashboard
            navigate('/today', { replace: true });
          }
        }
      }
    } catch (error) {
      console.error('Error checking session:', error);
    }
  };

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

  const handleInputChange = (e) => {
    const { name, value } = e?.target || {};
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Check password strength in real-time
    if (name === 'newPassword') {
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

  const validateStep = (currentStep) => {
    switch (currentStep) {
      case 'verification':
        if (!formData?.email?.trim()) {
          return 'Email address is required';
        }
        if (!formData?.temporaryPassword?.trim()) {
          return 'Temporary password is required';
        }
        if (!formData?.securityQuestion || !formData?.securityAnswer?.trim()) {
          return 'Security question and answer are required';
        }
        break;
        
      case 'profile-setup':
        if (!formData?.fullName?.trim()) {
          return 'Full name is required';
        }
        if (!formData?.newPassword) {
          return 'New password is required';
        }
        if (passwordStrength?.score < 3) {
          return 'Password doesn\'t meet security requirements';
        }
        if (formData?.newPassword !== formData?.confirmPassword) {
          return 'Passwords do not match';
        }
        break;
    }
    return null;
  };

  const handleVerification = async () => {
    const validationError = validateStep('verification');
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Attempt to sign in with temporary password
      const { data: signInData, error: signInError } = await supabase?.auth?.signInWithPassword({
        email: formData?.email,
        password: formData?.temporaryPassword,
      });

      if (signInError) {
        setError('Invalid email or temporary password. Please check your credentials.');
        return;
      }

      if (signInData?.user) {
        setUser(signInData?.user);
        
        // Get user profile to check setup status
        const { data: profile, error: profileError } = await supabase
          ?.from('user_profiles')
          ?.select('*')
          ?.eq('id', signInData?.user?.id)
          ?.single();

        if (profileError) {
          setError('User profile not found. Please contact support.');
          return;
        }

        setUserProfile(profile);
        
        // Check if password was set with temporary password
        if (!profile?.password_set) {
          setStep('profile-setup');
          setFormData(prev => ({
            ...prev,
            fullName: profile?.full_name || '',
            role: profile?.role || 'rep',
            organization: profile?.organization || ''
          }));
          setSuccess('Verification successful! Please set your new password and complete your profile.');
        } else {
          // User already has password set, just needs profile completion
          if (!profile?.profile_completed || !profile?.full_name) {
            setStep('profile-setup');
            setFormData(prev => ({
              ...prev,
              fullName: profile?.full_name || '',
              role: profile?.role || 'rep',
              organization: profile?.organization || ''
            }));
            setSuccess('Verification successful! Please complete your profile setup.');
          } else {
            // User is fully set up
            setStep('complete');
            setSuccess('Welcome back! Redirecting to your dashboard...');
            setTimeout(() => {
              navigate(getDashboardUrl(profile?.role), { replace: true });
            }, 2000);
          }
        }
      }
    } catch (error) {
      console.error('Verification error:', error);
      setError('An error occurred during verification. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleProfileSetup = async () => {
    const validationError = validateStep('profile-setup');
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Update password if user needs it
      if (!userProfile?.password_set && formData?.newPassword) {
        const { error: passwordError } = await supabase?.auth?.updateUser({
          password: formData?.newPassword
        });

        if (passwordError) {
          setError(`Failed to update password: ${passwordError?.message}`);
          return;
        }
      }

      // Complete profile setup using enhanced function
      const { data: setupResult, error: setupError } = await supabase?.rpc(
        'complete_user_setup_enhanced',
        {
          user_email: formData?.email,
          profile_data: {
            fullName: formData?.fullName,
            role: formData?.role,
            organization: formData?.organization || null
          },
          mark_password_set: !userProfile?.password_set && formData?.newPassword
        }
      );

      if (setupError) {
        setError(`Failed to complete profile setup: ${setupError?.message}`);
        return;
      }

      const result = setupResult?.[0];
      if (result?.success) {
        setStep('complete');
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
      console.error('Profile setup error:', error);
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

  const handleRequestEmailVerification = async () => {
    if (!formData?.email) {
      setError('Please enter your email address first');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase?.auth?.resetPasswordForEmail(formData?.email, {
        redirectTo: `${window.location?.origin}/password-setup`
      });

      if (error) {
        setError(error?.message);
        return;
      }

      setSuccess('Password reset email sent! Please check your email for instructions.');
    } catch (error) {
      setError('Failed to send email verification. Please try again.');
    } finally {
      setLoading(false);
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

  const renderStepContent = () => {
    switch (step) {
      case 'verification':
        return (
          <div className="space-y-6">
            {/* Verification Header */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <Shield className="w-5 h-5 text-blue-600" />
                <div>
                  <h3 className="font-medium text-blue-800">Account Verification Required</h3>
                  <p className="text-sm text-blue-700">
                    Use your temporary password to verify your identity and complete account setup.
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={(e) => { e?.preventDefault(); handleVerification(); }} className="space-y-4">
              {/* Email */}
              <div className="space-y-2">
                <label htmlFor="email" className="block text-sm font-medium text-foreground">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData?.email}
                    onChange={handleInputChange}
                    placeholder="Enter your email address"
                    className="pl-10"
                    disabled={loading}
                    required
                  />
                </div>
              </div>

              {/* Temporary Password */}
              <div className="space-y-2">
                <label htmlFor="temporaryPassword" className="block text-sm font-medium text-foreground">
                  Temporary Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="temporaryPassword"
                    name="temporaryPassword"
                    type={showTempPassword ? "text" : "password"}
                    value={formData?.temporaryPassword}
                    onChange={handleInputChange}
                    placeholder="Enter temporary password"
                    className="pl-10 pr-10"
                    disabled={loading}
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => setShowTempPassword(!showTempPassword)}
                    disabled={loading}
                    tabIndex={-1}
                  >
                    {showTempPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Security Question */}
              <div className="space-y-2">
                <label htmlFor="securityQuestion" className="block text-sm font-medium text-foreground">
                  Security Question
                </label>
                <Select
                  id="securityQuestion"
                  name="securityQuestion"
                  value={formData?.securityQuestion}
                  onChange={handleSelectChange('securityQuestion')}
                  options={securityQuestions}
                  disabled={loading}
                  required
                  onSearchChange={() => {}}
                  error=""
                  onOpenChange={() => {}}
                  label=""
                  description=""
                  ref={null}
                />
              </div>

              {/* Security Answer */}
              <div className="space-y-2">
                <label htmlFor="securityAnswer" className="block text-sm font-medium text-foreground">
                  Security Answer
                </label>
                <Input
                  id="securityAnswer"
                  name="securityAnswer"
                  type="text"
                  value={formData?.securityAnswer}
                  onChange={handleInputChange}
                  placeholder="Enter your answer"
                  disabled={loading}
                  required
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={loading}
                loading={loading}
              >
                Verify & Continue
              </Button>
            </form>

            {/* Alternative Options */}
            <div className="space-y-3">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">Alternative Options</span>
                </div>
              </div>

              <Button
                onClick={handleRequestEmailVerification}
                variant="outline"
                className="w-full"
                disabled={loading}
                iconName="Mail"
                iconPosition="left"
              >
                Request Email Verification Instead
              </Button>

              <Button
                onClick={() => navigate('/login')}
                variant="outline"
                className="w-full"
                iconName="ArrowLeft"
                iconPosition="left"
              >
                Back to Login
              </Button>
            </div>
          </div>
        );

      case 'profile-setup':
        return (
          <div className="space-y-6">
            {/* Profile Setup Header */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <div>
                  <h3 className="font-medium text-green-800">Verification Successful</h3>
                  <p className="text-sm text-green-700">
                    Now complete your profile and set up your permanent password.
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={(e) => { e?.preventDefault(); handleProfileSetup(); }} className="space-y-4">
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
                  label=""
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

              {/* Only show password fields if user doesn't have password set */}
              {!userProfile?.password_set && (
                <>
                  {/* New Password */}
                  <div className="space-y-2">
                    <label htmlFor="newPassword" className="block text-sm font-medium text-foreground">
                      New Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="newPassword"
                        name="newPassword"
                        type={showNewPassword ? "text" : "password"}
                        value={formData?.newPassword}
                        onChange={handleInputChange}
                        placeholder="Create a secure password"
                        className="pl-10 pr-10"
                        disabled={loading}
                        autoComplete="new-password"
                        required
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        disabled={loading}
                        tabIndex={-1}
                      >
                        {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>

                    {/* Password Strength Indicator */}
                    {formData?.newPassword && (
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
                      Confirm New Password
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
                  {formData?.confirmPassword && formData?.newPassword && (
                    <div className={`text-xs ${
                      formData?.newPassword === formData?.confirmPassword 
                        ? 'text-green-600' :'text-red-600'
                    }`}>
                      {formData?.newPassword === formData?.confirmPassword 
                        ? '✓ Passwords match' :'✗ Passwords do not match'
                      }
                    </div>
                  )}
                </>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={loading || (!userProfile?.password_set && passwordStrength?.score < 3)}
                loading={loading}
              >
                Complete Setup
              </Button>
            </form>
          </div>
        );

      case 'complete':
        return (
          <div className="text-center space-y-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            
            <div>
              <h3 className="text-2xl font-bold text-foreground mb-2">Setup Complete!</h3>
              <p className="text-muted-foreground">
                Your account has been successfully configured. Redirecting to your dashboard...
              </p>
            </div>

            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-green-600 h-2 rounded-full animate-pulse" style={{ width: '100%' }}></div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Main Setup Card */}
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="text-center space-y-2 mb-6">
            <h1 className="text-2xl font-bold text-foreground">Temporary Password Setup</h1>
            <p className="text-muted-foreground">
              {step === 'verification' && 'Verify your identity using temporary credentials'}
              {step === 'profile-setup' && 'Complete your account setup'}
              {step === 'complete' && 'Welcome to your account!'}
            </p>
          </div>

          {/* Error/Success Messages */}
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md mb-4">
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-destructive" />
                <p className="text-sm text-destructive">{error}</p>
              </div>
            </div>
          )}

          {success && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-md mb-4">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <p className="text-sm text-green-700">{success}</p>
              </div>
            </div>
          )}

          {/* Step Content */}
          {renderStepContent()}
        </div>

        {/* Security Info for password steps */}
        {(step === 'profile-setup' && !userProfile?.password_set) && (
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

export default TemporaryPasswordSetup;