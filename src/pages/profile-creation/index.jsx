import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { User, Mail, Building, Phone, UserCircle, Shield, CheckCircle, AlertCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Select from '../../components/ui/Select';

const ProfileCreationPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, userProfile, completeProfileSetup } = useAuth();

  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    jobTitle: '',
    department: '',
    organization: '',
    timezone: 'UTC',
    notificationSettings: {
      systemAlerts: true,
      emailNotifications: true,
      smsNotifications: false
    }
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 3;

  const stateData = location?.state || {};
  const isFromEmailConfirmation = stateData?.fromEmailConfirmation;
  const userEmail = stateData?.email || user?.email;
  const assignedOrganization = stateData?.organization;
  const assignedRole = stateData?.role;

  const timezoneOptions = [
    { value: 'UTC', label: 'UTC' },
    { value: 'America/New_York', label: 'Eastern Time (ET)' },
    { value: 'America/Chicago', label: 'Central Time (CT)' },
    { value: 'America/Denver', label: 'Mountain Time (MT)' },
    { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
    { value: 'America/Phoenix', label: 'Arizona Time (MST)' },
    { value: 'Europe/London', label: 'Greenwich Mean Time (GMT)' },
    { value: 'Europe/Paris', label: 'Central European Time (CET)' }
  ];

  const jobTitleOptions = [
    { value: 'sales_rep', label: 'Sales Representative' },
    { value: 'senior_sales_rep', label: 'Senior Sales Representative' },
    { value: 'sales_manager', label: 'Sales Manager' },
    { value: 'regional_manager', label: 'Regional Manager' },
    { value: 'account_manager', label: 'Account Manager' },
    { value: 'business_development', label: 'Business Development' },
    { value: 'operations_manager', label: 'Operations Manager' },
    { value: 'administrator', label: 'Administrator' },
    { value: 'other', label: 'Other' }
  ];

  useEffect(() => {
    // Check if user is authenticated and came from email confirmation
    if (!user) {
      navigate('/login', { 
        replace: true, 
        state: { message: 'Please sign in to complete your profile setup.' }
      });
      return;
    }

    // Check if user already has a complete profile
    checkUserProfileStatus();

    // Pre-fill form data from existing profile or state
    if (userProfile) {
      setFormData(prev => ({
        ...prev,
        fullName: userProfile?.full_name || '',
        phone: userProfile?.phone || '',
        organization: userProfile?.organization || assignedOrganization || '',
        // Add other profile fields as they become available
      }));
    }

    // If assigned organization and role from super admin creation
    if (assignedOrganization || assignedRole) {
      setFormData(prev => ({
        ...prev,
        organization: assignedOrganization || prev?.organization,
        // Note: Role is handled separately in the system
      }));
    }
  }, [user, userProfile, navigate, assignedOrganization, assignedRole]);

  const checkUserProfileStatus = async () => {
    if (!user?.id) return;

    try {
      // Check current authentication status
      const { data: authStatus, error: statusError } = await supabase?.rpc(
        'get_detailed_user_auth_status',
        { user_uuid: user?.id }
      );

      if (statusError) {
        console.warn('Could not check auth status:', statusError);
        return;
      }

      const status = authStatus?.[0];
      
      // If user has complete setup, redirect to dashboard
      if (status?.next_action === 'dashboard' && !status?.needs_setup) {
        const redirectUrl = status?.redirect_url || '/today';
        navigate(redirectUrl, { 
          replace: true,
          state: { message: 'Profile setup already completed.' }
        });
        return;
      }

      // If user still needs password setup, redirect there
      if (status?.next_action === 'set-password') {
        navigate('/password-setup', {
          replace: true,
          state: {
            needsPasswordSetup: true,
            profileIncomplete: true,
            email: userEmail,
            message: 'Please complete password setup first.'
          }
        });
        return;
      }
    } catch (error) {
      console.warn('Error checking profile status:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e?.target || {};
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

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

  const handleNotificationChange = (settingName) => (value) => {
    setFormData(prev => ({
      ...prev,
      notificationSettings: {
        ...prev?.notificationSettings,
        [settingName]: value
      }
    }));
  };

  const validateCurrentStep = () => {
    switch (currentStep) {
      case 1: // Personal Information
        if (!formData?.fullName?.trim()) {
          return 'Full name is required';
        }
        break;
      case 2: // Professional Information
        if (!formData?.jobTitle?.trim()) {
          return 'Job title is required';
        }
        break;
      case 3: // Preferences
        // All preferences are optional, no validation needed
        break;
      default:
        break;
    }
    return null;
  };

  const handleNext = () => {
    const validationError = validateCurrentStep();
    if (validationError) {
      setError(validationError);
      return;
    }

    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
      setError('');
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      setError('');
    }
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    
    const validationError = validateCurrentStep();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError('');
    setSuccess('');
    setLoading(true);

    try {
      // Complete profile setup using enhanced function
      const { data: setupResult, error: setupError } = await supabase?.rpc(
        'complete_user_profile_setup',
        {
          user_uuid: user?.id,
          full_name_param: formData?.fullName,
          organization_param: formData?.organization || null,
          role_param: assignedRole || 'rep' // Use assigned role or default to rep
        }
      );

      if (setupError) {
        throw new Error(`Failed to complete profile setup: ${setupError?.message}`);
      }

      const result = setupResult?.[0];
      if (result?.success) {
        // Also update additional profile fields if needed
        const { error: profileUpdateError } = await supabase
          ?.from('user_profiles')
          ?.update({
            phone: formData?.phone || null,
            // Note: Add more fields as they become available in schema
            updated_at: new Date()?.toISOString()
          })
          ?.eq('id', user?.id);

        if (profileUpdateError) {
          console.warn('Could not update additional profile fields:', profileUpdateError);
        }

        setSuccess('Profile created successfully! Redirecting to your dashboard...');

        // Determine redirect URL based on user role
        const redirectUrl = getDashboardUrl(assignedRole || userProfile?.role || 'rep');

        setTimeout(() => {
          navigate(redirectUrl, { 
            replace: true,
            state: { message: 'Welcome! Your profile has been set up successfully.' }
          });
        }, 2000);
      } else {
        setError(result?.message || 'Failed to complete profile setup');
      }

    } catch (error) {
      console.error('Profile creation error:', error);
      setError('An unexpected error occurred while creating your profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getDashboardUrl = (role) => {
    switch (role) {
      case 'super_admin':
        return '/super-admin-dashboard';
      case 'admin':
        return '/admin-dashboard';
      case 'manager':
        return '/manager-dashboard';
      case 'rep':
      default:
        return '/today';
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <UserCircle className="w-12 h-12 text-blue-600 mx-auto mb-3" />
              <h2 className="text-xl font-semibold text-foreground">Personal Information</h2>
              <p className="text-muted-foreground">Tell us about yourself</p>
            </div>

            {/* Full Name */}
            <div className="space-y-2">
              <label htmlFor="fullName" className="block text-sm font-medium text-foreground">
                Full Name *
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

            {/* Phone */}
            <div className="space-y-2">
              <label htmlFor="phone" className="block text-sm font-medium text-foreground">
                Phone Number <span className="text-muted-foreground">(Optional)</span>
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={formData?.phone}
                  onChange={handleInputChange}
                  placeholder="Enter your phone number"
                  className="pl-10"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Email Display (Read-only) */}
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
                  value={userEmail}
                  className="pl-10 bg-gray-50 text-gray-600"
                  disabled
                  readOnly
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Email address is verified and cannot be changed
              </p>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <Building className="w-12 h-12 text-blue-600 mx-auto mb-3" />
              <h2 className="text-xl font-semibold text-foreground">Professional Information</h2>
              <p className="text-muted-foreground">Your work details</p>
            </div>

            {/* Job Title */}
            <div className="space-y-2">
              <label htmlFor="jobTitle" className="block text-sm font-medium text-foreground">
                Job Title *
              </label>
              <Select
                id="jobTitle"
                name="jobTitle"
                value={formData?.jobTitle}
                onChange={handleSelectChange('jobTitle')}
                options={jobTitleOptions}
                disabled={loading}
                required
                onSearchChange={() => {}}
                error=""
                onOpenChange={() => {}}
                label="Job Title"
                description=""
                ref={null}
              />
            </div>

            {/* Department */}
            <div className="space-y-2">
              <label htmlFor="department" className="block text-sm font-medium text-foreground">
                Department <span className="text-muted-foreground">(Optional)</span>
              </label>
              <Input
                id="department"
                name="department"
                type="text"
                value={formData?.department}
                onChange={handleInputChange}
                placeholder="e.g., Sales, Marketing, Operations"
                disabled={loading}
              />
            </div>

            {/* Organization */}
            <div className="space-y-2">
              <label htmlFor="organization" className="block text-sm font-medium text-foreground">
                Organization
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
                  className={`pl-10 ${assignedOrganization ? 'bg-gray-50 text-gray-600' : ''}`}
                  disabled={loading || !!assignedOrganization}
                  readOnly={!!assignedOrganization}
                />
              </div>
              {assignedOrganization && (
                <p className="text-xs text-muted-foreground">
                  Organization assigned by administrator
                </p>
              )}
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <Shield className="w-12 h-12 text-blue-600 mx-auto mb-3" />
              <h2 className="text-xl font-semibold text-foreground">Preferences & Settings</h2>
              <p className="text-muted-foreground">Customize your experience</p>
            </div>
            {/* Timezone */}
            <div className="space-y-2">
              <label htmlFor="timezone" className="block text-sm font-medium text-foreground">
                Timezone
              </label>
              <Select
                id="timezone"
                name="timezone"
                value={formData?.timezone}
                onChange={handleSelectChange('timezone')}
                options={timezoneOptions}
                disabled={loading}
                onSearchChange={() => {}}
                error=""
                onOpenChange={() => {}}
                label="Timezone"
                description=""
                ref={null}
              />
            </div>
            {/* Notification Settings */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-foreground">Notification Preferences</h3>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <h4 className="text-sm font-medium text-foreground">System Alerts</h4>
                    <p className="text-xs text-muted-foreground">Important system notifications</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData?.notificationSettings?.systemAlerts}
                    onChange={(e) => handleNotificationChange('systemAlerts')(e?.target?.checked)}
                    disabled={loading}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <h4 className="text-sm font-medium text-foreground">Email Notifications</h4>
                    <p className="text-xs text-muted-foreground">Receive updates via email</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData?.notificationSettings?.emailNotifications}
                    onChange={(e) => handleNotificationChange('emailNotifications')(e?.target?.checked)}
                    disabled={loading}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <h4 className="text-sm font-medium text-foreground">SMS Notifications</h4>
                    <p className="text-xs text-muted-foreground">Receive updates via text message</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData?.notificationSettings?.smsNotifications}
                    onChange={(e) => handleNotificationChange('smsNotifications')(e?.target?.checked)}
                    disabled={loading}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg space-y-6">
        {/* Welcome Message */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <div>
              <h3 className="font-medium text-green-800">Email Verified Successfully!</h3>
              <p className="text-sm text-green-700">
                Please complete your profile to access your dashboard.
              </p>
            </div>
          </div>
        </div>

        {/* Progress Indicator */}
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-foreground">
              Step {currentStep} of {totalSteps}
            </span>
            <span className="text-sm text-muted-foreground">
              {Math.round((currentStep / totalSteps) * 100)}% Complete
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(currentStep / totalSteps) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Main Profile Form */}
        <div className="bg-card border border-border rounded-lg p-6">
          <form onSubmit={handleSubmit}>
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

            {/* Render Current Step */}
            {renderStep()}

            {/* Navigation Buttons */}
            <div className="flex justify-between mt-8">
              <Button
                type="button"
                variant="outline"
                onClick={handlePrevious}
                disabled={currentStep === 1 || loading}
                className={currentStep === 1 ? 'invisible' : ''}
              >
                Previous
              </Button>

              {currentStep < totalSteps ? (
                <Button
                  type="button"
                  onClick={handleNext}
                  disabled={loading}
                  className="ml-auto"
                >
                  Next
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={loading}
                  loading={loading}
                  className="ml-auto"
                >
                  {loading ? 'Creating Profile...' : 'Complete Setup'}
                </Button>
              )}
            </div>
          </form>
        </div>

        {/* Help Text */}
        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="font-medium text-foreground mb-2">Getting Started</h3>
          <div className="space-y-1 text-sm text-muted-foreground">
            <p>• Complete all required fields in each step</p>
            <p>• Your profile information helps personalize your experience</p>
            <p>• You can update most settings later in your profile</p>
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

export default ProfileCreationPage;