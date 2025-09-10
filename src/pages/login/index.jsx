import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import LoginForm from './components/LoginForm';
import LoginHeader from './components/LoginHeader';
import TrustSignals from './components/TrustSignals';
import DemoCredentials from './components/DemoCredentials';

const LoginPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  useEffect(() => {
    // Check if user is already authenticated
    const isAuthenticated = localStorage.getItem('isAuthenticated');
    if (isAuthenticated === 'true') {
      navigate('/today');
    }
  }, [navigate]);

  const handleLogin = async (loginData, userRole) => {
    setLoading(true);
    
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Store authentication data
      localStorage.setItem('userRole', userRole);
      localStorage.setItem('userEmail', loginData?.email);
      localStorage.setItem('isAuthenticated', 'true');
      localStorage.setItem('loginTimestamp', new Date()?.toISOString());
      
      // Navigate to dashboard
      navigate('/today');
    } catch (error) {
      console.error('Login error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDemoCredentialSelect = (email, password) => {
    setFormData({ email, password });
    
    // Auto-fill the form by dispatching events
    setTimeout(() => {
      const emailInput = document.querySelector('input[name="email"]');
      const passwordInput = document.querySelector('input[name="password"]');
      
      if (emailInput && passwordInput) {
        // Create and dispatch input events
        const emailEvent = new Event('input', { bubbles: true });
        const passwordEvent = new Event('input', { bubbles: true });
        
        emailInput.value = email;
        passwordInput.value = password;
        
        emailInput?.dispatchEvent(emailEvent);
        passwordInput?.dispatchEvent(passwordEvent);
      }
    }, 100);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Header Section */}
        <LoginHeader />

        {/* Login Form */}
        <div className="bg-card border border-border rounded-lg p-6 elevation-1">
          <LoginForm 
            onSubmit={handleLogin}
            loading={loading}
          />
        </div>

        {/* Demo Credentials */}
        <DemoCredentials 
          onCredentialSelect={handleDemoCredentialSelect}
        />

        {/* Trust Signals */}
        <TrustSignals />
      </div>

      {/* Background Pattern */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -right-32 w-80 h-80 bg-primary/5 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-32 w-80 h-80 bg-accent/5 rounded-full blur-3xl"></div>
      </div>
    </div>
  );
};

export default LoginPage;