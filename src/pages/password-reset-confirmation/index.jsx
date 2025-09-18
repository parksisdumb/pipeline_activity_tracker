import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, Lock, CheckCircle, AlertCircle, Shield } from 'lucide-react';

import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { supabase } from '../../services/authService';

const PasswordResetConfirmation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: ''
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [tokenValid, setTokenValid] = useState(true);

  // Extract token and email from URL or state
  const accessToken = searchParams?.get('access_token');
  const refreshToken = searchParams?.get('refresh_token');
  const type = searchParams?.get('type');
  const email = searchParams?.get('email') || location?.state?.email || '';

  useEffect(() => {
    // Verify we have the necessary tokens and this is a recovery request
    if (!accessToken || !refreshToken || type !== 'recovery') {
      setTokenValid(false);
      setError('Invalid or missing reset token. Please request a new password reset.');
    }
  }, [accessToken, refreshToken, type]);

  const handleInputChange = (e) => {
    const { name, value } = e?.target || {};
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (error) setError('');
  };

  const validatePassword = (password) => {
    if (password?.length < 8) {
      return 'Password must be at least 8 characters long';
    }
    if (!/(?=.*[a-z])/?.test(password)) {
      return 'Password must contain at least one lowercase letter';
    }
    if (!/(?=.*[A-Z])/?.test(password)) {
      return 'Password must contain at least one uppercase letter';
    }
    if (!/(?=.*\d)/?.test(password)) {
      return 'Password must contain at least one number';
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    setError('');
    
    // Validation
    if (!formData?.password) {
      setError('Please enter a new password');
      return;
    }
    
    const passwordValidation = validatePassword(formData?.password);
    if (passwordValidation) {
      setError(passwordValidation);
      return;
    }
    
    if (formData?.password !== formData?.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    
    try {
      // First, verify the session is established
      const { data: { user }, error: userError } = await supabase?.auth?.getUser();
      
      if (userError || !user) {
        throw new Error('Authentication session not found. Please try the reset link again.');
      }
      
      // Update password using Supabase auth
      const { error: updateError } = await supabase?.auth?.updateUser({
        password: formData?.password
      });
      
      if (updateError) {
        throw new Error(updateError?.message || 'Failed to update password');
      }

      setSuccess(true);
      
      // Redirect to login after success
      setTimeout(() => {
        navigate('/login', {
          state: {
            message: 'Password updated successfully! Please log in with your new password.',
            email: email
          }
        });
      }, 3000);
      
    } catch (error) {
      console.error('Password reset error:', error);
      setError(error?.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestNewReset = () => {
    navigate('/password-reset-request');
  };

  if (!tokenValid) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-xl shadow-lg p-8 text-center">
            <div className="mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
            </div>
            
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Invalid Reset Link
            </h1>
            <p className="text-gray-600 mb-6">
              This password reset link is invalid or has expired. Please request a new one.
            </p>
            
            <Button onClick={handleRequestNewReset} className="w-full">
              Request New Reset Link
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-xl shadow-lg p-8 text-center">
            <div className="mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            </div>
            
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Password Updated!
            </h1>
            <p className="text-gray-600 mb-6">
              Your password has been successfully updated. You can now sign in with your new password.
            </p>
            
            <div className="mb-6 p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-green-700">
                Redirecting to login page...
              </p>
            </div>
            
            <Button 
              onClick={() => navigate('/login')}
              className="w-full"
            >
              Continue to Login
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-xl shadow-lg p-8">
          {/* Header */}
          <div className="mb-6 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mb-4">
              <Shield className="w-6 h-6 text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Set New Password
            </h1>
            <p className="text-gray-600">
              Create a strong password for your account.
            </p>
            {email && (
              <div className="mt-3 p-2 bg-gray-50 rounded text-sm text-gray-600">
                Resetting password for: {email}
              </div>
            )}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-red-700">
                  {error}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={formData?.password}
                  onChange={handleInputChange}
                  placeholder="Enter your new password"
                  className="pl-10 pr-10"
                  disabled={loading}
                  required
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                Confirm New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={formData?.confirmPassword}
                  onChange={handleInputChange}
                  placeholder="Confirm your new password"
                  className="pl-10 pr-10"
                  disabled={loading}
                  required
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Password Requirements */}
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium text-gray-700 mb-2">Password requirements:</p>
              <ul className="text-xs text-gray-600 space-y-1">
                <li className={`flex items-center ${formData?.password?.length >= 8 ? 'text-green-600' : ''}`}>
                  <span className="w-1 h-1 bg-current rounded-full mr-2"></span>
                  At least 8 characters
                </li>
                <li className={`flex items-center ${/(?=.*[a-z])/?.test(formData?.password) ? 'text-green-600' : ''}`}>
                  <span className="w-1 h-1 bg-current rounded-full mr-2"></span>
                  One lowercase letter
                </li>
                <li className={`flex items-center ${/(?=.*[A-Z])/?.test(formData?.password) ? 'text-green-600' : ''}`}>
                  <span className="w-1 h-1 bg-current rounded-full mr-2"></span>
                  One uppercase letter
                </li>
                <li className={`flex items-center ${/(?=.*\d)/?.test(formData?.password) ? 'text-green-600' : ''}`}>
                  <span className="w-1 h-1 bg-current rounded-full mr-2"></span>
                  One number
                </li>
              </ul>
            </div>

            <Button 
              type="submit" 
              className="w-full"
              disabled={loading}
              loading={loading}
            >
              {loading ? 'Updating Password...' : 'Update Password'}
            </Button>
          </form>

          {/* Back Link */}
          <div className="mt-6 text-center">
            <button
              onClick={() => navigate('/login')}
              className="text-sm text-blue-600 hover:text-blue-700 transition-colors"
            >
              Back to Login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PasswordResetConfirmation;