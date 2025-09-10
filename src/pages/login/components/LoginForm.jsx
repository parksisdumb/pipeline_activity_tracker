import React, { useState } from 'react';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import { useAuth } from '../../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const LoginForm = () => {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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

    // Basic validation
    if (!formData?.email || !formData?.password) {
      setError('Please fill in all fields');
      setLoading(false);
      return;
    }

    try {
      const result = await signIn(formData?.email, formData?.password);

      // Check if login was successful (no error means success)
      if (!result?.error) {
        // Redirect to dashboard or previous page
        navigate('/manager-dashboard');
      } else {
        // Handle the error - ensure it's a string, not an Error object
        const errorMessage = result?.error?.message || 'Failed to sign in';
        setError(errorMessage);
      }
    } catch (error) {
      // Handle any unexpected errors
      const errorMessage = error?.message || 'An unexpected error occurred';
      setError(errorMessage);
    }

    setLoading(false);
  };

  // Demo credential handler
  const handleDemoLogin = (email, password) => {
    setFormData({ email, password });
    setError('');
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
            onClick={() => {
              // Handle forgot password
              setError('Password reset functionality coming soon');
            }}
          >
            Forgot password?
          </button>
        </div>

        <Button
          type="submit"
          className="w-full"
          disabled={loading}
        >
          {loading ? 'Signing In...' : 'Sign In'}
        </Button>
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