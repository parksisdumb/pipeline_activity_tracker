import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { ArrowLeft, Mail, Send, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

const PasswordResetRequest = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { sendPasswordReset } = useAuth();
  
  const [formData, setFormData] = useState({
    email: location?.state?.email || ''
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = (e) => {
    const { name, value } = e?.target || {};
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (error) setError('');
  };

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex?.test(email);
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    setError('');
    
    // Validation
    if (!formData?.email?.trim()) {
      setError('Please enter your email address');
      return;
    }
    
    if (!validateEmail(formData?.email)) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    
    try {
      const result = await sendPasswordReset(formData?.email);
      
      if (result?.success) {
        setSuccess(true);
      } else {
        setError(result?.error || 'Failed to send password reset email');
      }
    } catch (error) {
      console.error('Password reset request error:', error);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = () => {
    navigate('/login');
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-xl shadow-lg p-8 text-center">
            {/* Success Icon */}
            <div className="mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            </div>

            {/* Enhanced Success Message */}
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Check Your Email
              </h1>
              <p className="text-gray-600 mb-4">
                We've sent password reset instructions to:
              </p>
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-center text-sm font-medium text-gray-700">
                  <Mail className="w-4 h-4 mr-2" />
                  {formData?.email}
                </div>
              </div>
            </div>

            {/* Enhanced Instructions */}
            <div className="mb-6 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-700 mb-2">
                <strong>Next steps:</strong>
              </p>
              <ol className="text-sm text-blue-700 text-left space-y-1">
                <li>1. Check your email inbox and spam folder</li>
                <li>2. Click the password reset link in the email</li>
                <li>3. Create a new secure password</li>
                <li>4. Complete your profile if needed</li>
                <li>5. Sign in with your new credentials</li>
              </ol>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <Button 
                onClick={handleBackToLogin}
                variant="outline"
                className="w-full"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Login
              </Button>
              
              <button
                onClick={() => setSuccess(false)}
                className="w-full text-sm text-blue-600 hover:text-blue-700 underline"
              >
                Try different email address
              </button>
            </div>

            {/* Enhanced Help Text */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <p className="text-xs text-gray-500 text-center">
                Having trouble? The email might take a few minutes to arrive. 
                Check your spam folder or contact support if you don't receive it.
              </p>
            </div>
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
              <Mail className="w-6 h-6 text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Reset Your Password
            </h1>
            <p className="text-gray-600">
              Enter your email address and we'll send you instructions to reset your password.
            </p>
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
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
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
                  autoComplete="email"
                  autoFocus
                />
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full"
              disabled={loading}
              loading={loading}
            >
              {loading ? (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Sending Instructions...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Send Reset Instructions
                </>
              )}
            </Button>
          </form>

          {/* Back to Login */}
          <div className="mt-6 text-center">
            <Link
              to="/login"
              className="inline-flex items-center text-sm text-blue-600 hover:text-blue-700 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to Login
            </Link>
          </div>

          {/* Alternative Actions */}
          <div className="mt-8 pt-6 border-t border-gray-200 text-center">
            <p className="text-xs text-gray-500 mb-3">
              Don't have an account?
            </p>
            <Link
              to="/sign-up"
              className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
            >
              Create new account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PasswordResetRequest;