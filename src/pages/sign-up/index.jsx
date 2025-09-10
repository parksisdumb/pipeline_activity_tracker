import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SignUpForm from './components/SignUpForm';
import SignUpHeader from './components/SignUpHeader';
import SignUpBenefits from './components/SignUpBenefits';

const SignUpPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Check if user is already authenticated
    const isAuthenticated = localStorage.getItem('isAuthenticated');
    if (isAuthenticated === 'true') {
      navigate('/today');
    }
  }, [navigate]);

  const handleSignUp = async (signUpData) => {
    setLoading(true);
    
    try {
      // The SignUpForm component will handle the actual signup logic
      // and redirect appropriately on success
      console.log('Sign up initiated:', signUpData);
    } catch (error) {
      console.error('Sign up error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Header Section */}
        <SignUpHeader />

        {/* Sign Up Form */}
        <div className="bg-card border border-border rounded-lg p-6 elevation-1">
          <SignUpForm 
            onSubmit={handleSignUp}
            loading={loading}
          />
        </div>

        {/* Benefits Section */}
        <SignUpBenefits />

        {/* Login Link */}
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            Already have an account?{' '}
            <button
              type="button"
              className="font-medium text-primary hover:underline focus:outline-none focus:underline"
              onClick={() => navigate('/login')}
            >
              Sign in here
            </button>
          </p>
        </div>
      </div>

      {/* Background Pattern */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -right-32 w-80 h-80 bg-primary/5 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-32 w-80 h-80 bg-accent/5 rounded-full blur-3xl"></div>
      </div>
    </div>
  );
};

export default SignUpPage;