import React, { useState } from 'react';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import { useAuth } from '../../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../../services/authService';

const LoginForm = () => {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [magicLinkSending, setMagicLinkSending] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e?.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const result = await signIn(formData?.email, formData?.password);

      if (result?.error) {
        setError(result?.error?.message || 'Login failed');
        return;
      }

      if (result?.data?.user) {
        // Check if user needs password setup or profile completion
        if (result?.needsPasswordSetup || result?.profileIncomplete) {
          navigate('/password-setup', {
            state: {
              needsPasswordSetup: result?.needsPasswordSetup,
              profileIncomplete: result?.profileIncomplete,
              email: result?.data?.user?.email,
              message: result?.needsPasswordSetup 
                ? 'Please set up your password to complete your account.'
                : 'Please complete your profile setup.'
            }
          });
          return;
        }

        // User is fully set up - redirect to appropriate dashboard
        const userRole = result?.data?.profile?.role || 'rep';
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
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    if (formData?.email) {
      navigate('/password-reset-request', { 
        state: { email: formData?.email }
      });
    } else {
      navigate('/password-reset-request');
    }
  };

  const handleSendMagicLink = async () => {
    if (!formData?.email) {
      setError('Please enter your email address first');
      return;
    }

    setMagicLinkSending(true);
    setError('');

    try {
      const result = await authService?.sendMagicLink(formData?.email);
      
      if (result?.success) {
        setError(''); // Clear any previous errors
        // Show success message
        alert('Magic link sent! Please check your email and click the link to sign in.');
      } else {
        setError(result?.error || 'Failed to send magic link');
      }
    } catch (error) {
      setError('An unexpected error occurred while sending magic link');
    } finally {
      setMagicLinkSending(false);
    }
  };

  // Demo credential handler
  const handleDemoLogin = (email, password) => {
    setFormData({ email, password });
    setError('');
  };

  // Add magic link login option
  const handleMagicLinkLogin = async () => {
    if (!formData?.email) {
      setError('Please enter your email address to receive a magic link.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await authService?.sendMagicLink(formData?.email);
      
      if (result?.success) {
        setSuccess('Magic link sent! Please check your email and click the link to sign in.');
      } else {
        setError(result?.error || 'Failed to send magic link');
      }
    } catch (error) {
      setError('Failed to send magic link. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
            {error}
            <button 
              type="button"
              onClick={() => setError('')}
              className="ml-2 text-red-500 hover:text-red-700"
            >
              ×
            </button>
          </div>
        )}
        
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md text-sm">
            {success}
            <button 
              type="button"
              onClick={() => setSuccess('')}
              className="ml-2 text-green-500 hover:text-green-700"
            >
              ×
            </button>
          </div>
        )}
        
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email Address
          </label>
          <Input
            id="email"
            name="email"
            type="email"
            value={formData?.email}
            onChange={handleChange}
            placeholder="Enter your email"
            required
            disabled={loading}
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            Password
          </label>
          <Input
            id="password"
            name="password"
            type="password"
            value={formData?.password}
            onChange={handleChange}
            placeholder="Enter your password"
            required
            disabled={loading}
          />
        </div>

        <div className="flex items-center justify-between">
          <label className="flex items-center">
            <input
              type="checkbox"
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="ml-2 text-sm text-gray-600">Remember me</span>
          </label>
          
          <button
            type="button"
            className="text-sm text-blue-600 hover:text-blue-500"
            onClick={handleForgotPassword}
          >
            Forgot password?
          </button>
        </div>

        <div className="flex flex-col space-y-3">
          <Button
            type="submit"
            className="w-full"
            disabled={loading}
            loading={loading}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </Button>

          {/* Magic Link Option */}
          <button
            type="button"
            onClick={handleMagicLinkLogin}
            disabled={loading}
            className="w-full px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Sending...' : 'Send Magic Link Instead'}
          </button>
        </div>
      </form>
      
      {/* Demo Credentials Section */}
      <div className="border-t pt-6">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Demo Accounts</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => handleDemoLogin('admin@roofcrm.com', 'password123')}
            className="text-left p-3 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors"
            disabled={loading}
          >
            <div className="font-medium text-sm">Admin User</div>
            <div className="text-xs text-gray-600">Full access</div>
          </button>
          
          <button
            type="button"
            onClick={() => handleDemoLogin('manager@roofcrm.com', 'password123')}
            className="text-left p-3 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors"
            disabled={loading}
          >
            <div className="font-medium text-sm">Sales Manager</div>
            <div className="text-xs text-gray-600">Team oversight</div>
          </button>
          
          <button
            type="button"
            onClick={() => handleDemoLogin('john.smith@roofcrm.com', 'password123')}
            className="text-left p-3 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors"
            disabled={loading}
          >
            <div className="font-medium text-sm">Sales Rep</div>
            <div className="text-xs text-gray-600">Individual access</div>
          </button>
        </div>
        
        <p className="text-xs text-gray-500 mt-3">
          Click any demo account to auto-fill the login form with test credentials.
        </p>
      </div>
      
      {/* Sign Up Link */}
      <div className="text-center">
        <p className="text-sm text-gray-600">
          Don't have an account?{' '}
          <button
            type="button"
            className="font-medium text-blue-600 hover:text-blue-500"
            onClick={() => navigate('/sign-up')}
          >
            Sign up here
          </button>
        </p>
      </div>
    </div>
  );
};

export default LoginForm;