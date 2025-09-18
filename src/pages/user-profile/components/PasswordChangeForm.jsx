import React, { useState } from 'react';
import { authService } from '../../../services/authService';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Icon from '../../../components/AppIcon';

const PasswordChangeForm = () => {
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });

  const validatePassword = (password) => {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/?.test(password);
    const hasLowerCase = /[a-z]/?.test(password);
    const hasNumbers = /\d/?.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/?.test(password);

    if (password?.length < minLength) {
      return `Password must be at least ${minLength} characters long`;
    }
    if (!hasUpperCase) {
      return 'Password must contain at least one uppercase letter';
    }
    if (!hasLowerCase) {
      return 'Password must contain at least one lowercase letter';
    }
    if (!hasNumbers) {
      return 'Password must contain at least one number';
    }
    if (!hasSpecialChar) {
      return 'Password must contain at least one special character';
    }
    return null;
  };

  const handleInputChange = (e) => {
    const { name, value } = e?.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError(null);
    setSuccess(false);
  };

  const togglePasswordVisibility = (field) => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev?.[field]
    }));
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    // Client-side validation
    if (formData?.newPassword !== formData?.confirmPassword) {
      setError('New passwords do not match');
      setLoading(false);
      return;
    }

    const passwordError = validatePassword(formData?.newPassword);
    if (passwordError) {
      setError(passwordError);
      setLoading(false);
      return;
    }

    try {
      // Use the auth service to update password
      const result = await authService?.updatePassword(formData?.newPassword);
      
      if (result?.success) {
        setSuccess(true);
        setFormData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
        setTimeout(() => setSuccess(false), 5000);
      } else {
        setError(result?.error || 'Failed to update password');
      }
    } catch (error) {
      if (error?.message?.includes('Failed to fetch') || 
          error?.message?.includes('AuthRetryableFetchError')) {
        setError('Cannot connect to authentication service. Your Supabase project may be paused or inactive.');
      } else {
        setError('Failed to update password. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const getPasswordStrength = (password) => {
    if (!password) return { strength: 0, label: 'No password', color: 'bg-gray-300' };
    
    let score = 0;
    if (password?.length >= 8) score += 1;
    if (password?.length >= 12) score += 1;
    if (/[A-Z]/?.test(password)) score += 1;
    if (/[a-z]/?.test(password)) score += 1;
    if (/\d/?.test(password)) score += 1;
    if (/[!@#$%^&*(),.?":{}|<>]/?.test(password)) score += 1;

    if (score <= 2) return { strength: score, label: 'Weak', color: 'bg-red-500' };
    if (score <= 4) return { strength: score, label: 'Medium', color: 'bg-yellow-500' };
    return { strength: score, label: 'Strong', color: 'bg-green-500' };
  };

  const passwordStrength = getPasswordStrength(formData?.newPassword);

  return (
    <div className="bg-card rounded-lg border border-border p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-foreground mb-2">Change Password</h3>
        <p className="text-sm text-muted-foreground">
          Update your password to keep your account secure. Use a strong password with at least 8 characters.
        </p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Success Message */}
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md">
            <div className="flex items-center">
              <Icon name="CheckCircle" size={16} className="mr-2" />
              Password updated successfully!
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
            <div className="flex items-center">
              <Icon name="AlertCircle" size={16} className="mr-2" />
              {error}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Current Password */}
          <div className="md:col-span-1">
            <label htmlFor="currentPassword" className="block text-sm font-medium text-foreground mb-2">
              Current Password *
            </label>
            <div className="relative">
              <Input
                id="currentPassword"
                name="currentPassword"
                type={showPasswords?.current ? 'text' : 'password'}
                value={formData?.currentPassword}
                onChange={handleInputChange}
                required
                placeholder="Enter your current password"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => togglePasswordVisibility('current')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center hover:text-foreground transition-colors"
              >
                <Icon 
                  name={showPasswords?.current ? 'EyeOff' : 'Eye'} 
                  size={16} 
                  className="text-muted-foreground"
                />
              </button>
            </div>
          </div>

          {/* New Password */}
          <div className="md:col-span-1">
            <label htmlFor="newPassword" className="block text-sm font-medium text-foreground mb-2">
              New Password *
            </label>
            <div className="relative">
              <Input
                id="newPassword"
                name="newPassword"
                type={showPasswords?.new ? 'text' : 'password'}
                value={formData?.newPassword}
                onChange={handleInputChange}
                required
                placeholder="Enter your new password"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => togglePasswordVisibility('new')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center hover:text-foreground transition-colors"
              >
                <Icon 
                  name={showPasswords?.new ? 'EyeOff' : 'Eye'} 
                  size={16} 
                  className="text-muted-foreground"
                />
              </button>
            </div>
            
            {/* Password Strength Indicator */}
            {formData?.newPassword && (
              <div className="mt-3">
                <div className="flex items-center space-x-2 mb-2">
                  <div className="flex-1 bg-muted rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${passwordStrength?.color}`}
                      style={{ width: `${(passwordStrength?.strength / 6) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground font-medium">
                    {passwordStrength?.label}
                  </span>
                </div>
                
                {/* Password Requirements */}
                <div className="grid grid-cols-1 gap-1 text-xs">
                  <div className={`flex items-center ${formData?.newPassword?.length >= 8 ? 'text-green-600' : 'text-muted-foreground'}`}>
                    <Icon name={formData?.newPassword?.length >= 8 ? 'CheckCircle' : 'Circle'} size={12} className="mr-1" />
                    At least 8 characters
                  </div>
                  <div className={`flex items-center ${/[A-Z]/?.test(formData?.newPassword) ? 'text-green-600' : 'text-muted-foreground'}`}>
                    <Icon name={/[A-Z]/?.test(formData?.newPassword) ? 'CheckCircle' : 'Circle'} size={12} className="mr-1" />
                    One uppercase letter
                  </div>
                  <div className={`flex items-center ${/[a-z]/?.test(formData?.newPassword) ? 'text-green-600' : 'text-muted-foreground'}`}>
                    <Icon name={/[a-z]/?.test(formData?.newPassword) ? 'CheckCircle' : 'Circle'} size={12} className="mr-1" />
                    One lowercase letter
                  </div>
                  <div className={`flex items-center ${/\d/?.test(formData?.newPassword) ? 'text-green-600' : 'text-muted-foreground'}`}>
                    <Icon name={/\d/?.test(formData?.newPassword) ? 'CheckCircle' : 'Circle'} size={12} className="mr-1" />
                    One number
                  </div>
                  <div className={`flex items-center ${/[!@#$%^&*(),.?":{}|<>]/?.test(formData?.newPassword) ? 'text-green-600' : 'text-muted-foreground'}`}>
                    <Icon name={/[!@#$%^&*(),.?":{}|<>]/?.test(formData?.newPassword) ? 'CheckCircle' : 'Circle'} size={12} className="mr-1" />
                    One special character
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Confirm New Password */}
          <div className="md:col-span-2">
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-foreground mb-2">
              Confirm New Password *
            </label>
            <div className="relative">
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type={showPasswords?.confirm ? 'text' : 'password'}
                value={formData?.confirmPassword}
                onChange={handleInputChange}
                required
                placeholder="Confirm your new password"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => togglePasswordVisibility('confirm')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center hover:text-foreground transition-colors"
              >
                <Icon 
                  name={showPasswords?.confirm ? 'EyeOff' : 'Eye'} 
                  size={16} 
                  className="text-muted-foreground"
                />
              </button>
            </div>
            
            {/* Password Match Indicator */}
            {formData?.confirmPassword && (
              <div className="mt-2">
                {formData?.newPassword === formData?.confirmPassword ? (
                  <div className="flex items-center text-green-600 text-xs">
                    <Icon name="CheckCircle" size={12} className="mr-1" />
                    Passwords match
                  </div>
                ) : (
                  <div className="flex items-center text-red-600 text-xs">
                    <Icon name="AlertCircle" size={12} className="mr-1" />
                    Passwords do not match
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex gap-4 pt-6 border-t border-border">
          <Button
            type="submit"
            disabled={loading || !formData?.currentPassword || !formData?.newPassword || !formData?.confirmPassword}
          >
            {loading ? (
              <>
                <Icon name="Loader2" size={16} className="animate-spin mr-2" />
                Updating Password...
              </>
            ) : (
              <>
                <Icon name="Key" size={16} className="mr-2" />
                Update Password
              </>
            )}
          </Button>
          
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setFormData({
                currentPassword: '',
                newPassword: '',
                confirmPassword: ''
              });
              setError(null);
              setSuccess(false);
            }}
            disabled={loading}
          >
            <Icon name="RotateCcw" size={16} className="mr-2" />
            Reset Form
          </Button>
        </div>

        {/* Security Tips */}
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
          <div className="flex">
            <Icon name="Shield" size={16} className="text-blue-600 mt-0.5 mr-2 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-medium text-blue-800 mb-1">Password Security Tips</h4>
              <ul className="text-xs text-blue-700 space-y-1">
                <li>• Use a unique password that you don't use elsewhere</li>
                <li>• Consider using a password manager to generate and store strong passwords</li>
                <li>• Don't share your password with anyone</li>
                <li>• Update your password regularly, especially if you suspect it may be compromised</li>
              </ul>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default PasswordChangeForm;