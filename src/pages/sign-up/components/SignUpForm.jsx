import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, User, Phone } from 'lucide-react';
import Input from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';
import Select from '../../../components/ui/Select';
import { Checkbox } from '../../../components/ui/Checkbox';
import { authService } from '../../../services/authService';

const SignUpForm = ({ onSubmit, loading }) => {
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    role: 'rep',
    organization: '',
    agreeToTerms: false
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [registering, setRegistering] = useState(false);

  const roleOptions = [
    { value: 'rep', label: 'Sales Representative' },
    { value: 'manager', label: 'Sales Manager' },
    { value: 'admin', label: 'Administrator' }
  ];

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e?.target || {};
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // Clear error when user starts typing
    if (error) setError('');
    if (success) setSuccess('');
  };

  const handleSelectChange = (fieldName) => (value) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value
    }));
    
    // Clear error when user makes a selection
    if (error) setError('');
    if (success) setSuccess('');
  };

  const validateForm = () => {
    if (!formData?.fullName?.trim()) {
      return 'Full name is required';
    }
    
    if (!formData?.email?.trim()) {
      return 'Email address is required';
    }
    
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/?.test(formData?.email)) {
      return 'Please enter a valid email address';
    }
    
    if (!formData?.password) {
      return 'Password is required';
    }
    
    if (formData?.password?.length < 8) {
      return 'Password must be at least 8 characters long';
    }
    
    if (formData?.password !== formData?.confirmPassword) {
      return 'Passwords do not match';
    }
    
    if (!formData?.agreeToTerms) {
      return 'Please agree to the terms and conditions';
    }
    
    return null;
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    setError('');
    setSuccess('');

    // Validate form
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setRegistering(true);

    try {
      // Create the signup data with proper structure for Supabase
      const signUpData = {
        email: formData?.email,
        password: formData?.password,
        options: {
          data: {
            full_name: formData?.fullName,
            phone: formData?.phone || null,
            role: formData?.role,
            organization: formData?.organization || null,
          },
        },
      };

      const result = await authService?.signUp(signUpData);

      if (result?.success) {
        setSuccess(
          result?.message || 
          'Account created successfully! Please check your email to confirm your account before signing in.'
        );
        
        // Call parent's onSubmit
        onSubmit?.(formData);
        
        // Redirect to login after a short delay
        setTimeout(() => {
          navigate('/login', { 
            state: { 
              email: formData?.email,
              message: 'Account created! Please check your email to verify your account, then sign in.' 
            } 
          });
        }, 3000);
      } else {
        setError(result?.error || 'Registration failed. Please try again.');
      }
    } catch (error) {
      setError('An unexpected error occurred. Please try again.');
      console.error('Sign up error:', error);
    } finally {
      setRegistering(false);
    }
  };

  const isLoading = loading || registering;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}
      
      {success && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-md">
          <p className="text-sm text-green-700">{success}</p>
        </div>
      )}

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
            disabled={isLoading}
            required
          />
        </div>
      </div>

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
            placeholder="Enter your email"
            className="pl-10"
            disabled={isLoading}
            autoComplete="email"
            required
          />
        </div>
      </div>

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
            disabled={isLoading}
          />
        </div>
      </div>

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
          disabled={isLoading}
          required
          onSearchChange={() => {}}
          error=""
          onOpenChange={() => {}}
          label="Role"
          description=""
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="organization" className="block text-sm font-medium text-foreground">
          Organization <span className="text-muted-foreground">(Optional)</span>
        </label>
        <Input
          id="organization"
          name="organization"
          type="text"
          value={formData?.organization}
          onChange={handleInputChange}
          placeholder="Enter your organization name"
          disabled={isLoading}
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="password" className="block text-sm font-medium text-foreground">
          Password
        </label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            value={formData?.password}
            onChange={handleInputChange}
            placeholder="Create a password (min 8 characters)"
            className="pl-10 pr-10"
            disabled={isLoading}
            autoComplete="new-password"
            required
          />
          <button
            type="button"
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setShowPassword(!showPassword)}
            disabled={isLoading}
            tabIndex={-1}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="confirmPassword" className="block text-sm font-medium text-foreground">
          Confirm Password
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
            disabled={isLoading}
            autoComplete="new-password"
            required
          />
          <button
            type="button"
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            disabled={isLoading}
            tabIndex={-1}
          >
            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <div className="flex items-start space-x-2">
        <Checkbox
          id="agreeToTerms"
          name="agreeToTerms"
          checked={formData?.agreeToTerms}
          onChange={handleInputChange}
          disabled={isLoading}
          required
        />
        <label htmlFor="agreeToTerms" className="text-sm text-foreground leading-relaxed">
          I agree to the{' '}
          <a href="#" className="text-primary hover:underline">Terms of Service</a>
          {' '}and{' '}
          <a href="#" className="text-primary hover:underline">Privacy Policy</a>
        </label>
      </div>

      <Button 
        type="submit" 
        className="w-full" 
        disabled={isLoading}
        loading={isLoading}
      >
        {isLoading ? 'Creating Account...' : 'Create Account'}
      </Button>

      <div className="text-center mt-4">
        <p className="text-sm text-muted-foreground">
          <strong>MVP Phase Multi-Tenant Setup:</strong><br/>
          New accounts are automatically configured for your organization. 
          Role selection determines access permissions within the CRM system.
        </p>
      </div>
    </form>
  );
};

export default SignUpForm;