import { supabase } from '../lib/supabase';

export const authService = {
  // Sign in with email and password
  async signIn(email, password) {
    try {
      const { data, error } = await supabase?.auth?.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        return { 
          success: false, 
          error: error?.message || 'Login failed'
        };
      }

      // Get user profile data
      if (data?.user) {
        const { data: profile, error: profileError } = await supabase
          ?.from('user_profiles')
          ?.select('*')
          ?.eq('id', data?.user?.id)
          ?.single();

        if (profileError && profileError?.code !== 'PGRST116') {
          console.error('Profile fetch error:', profileError);
        }

        return {
          success: true,
          data: {
            user: data?.user,
            profile: profile || null
          }
        };
      }

      return { success: false, error: 'Invalid login response' };
    } catch (error) {
      console.error('Sign in error:', error);
      return { 
        success: false, 
        error: 'An unexpected error occurred during sign in'
      };
    }
  },

  // Sign up with email and password
  async signUp(signUpData) {
    try {
      const { data, error } = await supabase?.auth?.signUp(signUpData);

      if (error) {
        console.error('Supabase auth error:', error);
        return { 
          success: false, 
          error: error?.message || 'Registration failed'
        };
      }

      if (data?.user && !data?.user?.email_confirmed_at) {
        return {
          success: true,
          data: data?.user,
          message: 'Account created successfully! Please check your email to verify your account before signing in.',
          requiresVerification: true
        };
      }

      return {
        success: true,
        data: data?.user,
        message: 'Account created and verified successfully!'
      };
    } catch (error) {
      console.error('Auth service error:', error);
      return { 
        success: false, 
        error: 'An unexpected error occurred during registration'
      };
    }
  },

  // Sign out
  async signOut() {
    try {
      const { error } = await supabase?.auth?.signOut();
      
      if (error) {
        return { 
          success: false, 
          error: error?.message || 'Sign out failed'
        };
      }
      
      return { success: true };
    } catch (error) {
      console.error('Sign out error:', error);
      return { 
        success: false, 
        error: 'An unexpected error occurred during sign out'
      };
    }
  },

  // Get current session
  async getCurrentSession() {
    try {
      const { data: { session }, error } = await supabase?.auth?.getSession();
      
      if (error) {
        return { success: false, error: error?.message };
      }
      
      return { success: true, session };
    } catch (error) {
      return { success: false, error: 'Network error. Please try again.' };
    }
  },

  // Get current user profile
  async getUserProfile(userId) {
    if (!userId) return { success: false, error: 'No user ID provided' };
    
    try {
      const { data, error } = await supabase?.from('user_profiles')?.select('*')?.eq('id', userId)?.single();
      
      if (error) {
        if (error?.code === 'PGRST116') {
          return { success: false, error: 'User profile not found' };
        }
        return { success: false, error: error?.message };
      }
      
      return { success: true, profile: data };
    } catch (error) {
      return { success: false, error: 'Failed to load user profile' };
    }
  },

  // Update user profile
  async updateUserProfile(userId, updates) {
    if (!userId) return { success: false, error: 'No user ID provided' };
    
    try {
      const { data, error } = await supabase?.from('user_profiles')?.update(updates)?.eq('id', userId)?.select()?.single();
      
      if (error) {
        return { success: false, error: error?.message };
      }
      
      return { success: true, profile: data };
    } catch (error) {
      return { success: false, error: 'Failed to update profile' };
    }
  },

  // Reset password
  async resetPassword(email) {
    try {
      const { error } = await supabase?.auth?.resetPasswordForEmail(email);
      
      if (error) {
        return { 
          success: false, 
          error: error?.message || 'Password reset failed'
        };
      }
      
      return { 
        success: true, 
        message: 'Password reset email sent. Please check your inbox.' 
      };
    } catch (error) {
      console.error('Reset password error:', error);
      return { 
        success: false, 
        error: 'An unexpected error occurred during password reset'
      };
    }
  },

  // Get current user
  async getCurrentUser() {
    try {
      const { data: { user }, error } = await supabase?.auth?.getUser();
      
      if (error) {
        return { success: false, error: error?.message };
      }

      if (user) {
        // Get user profile
        const { data: profile, error: profileError } = await supabase
          ?.from('user_profiles')
          ?.select('*')
          ?.eq('id', user?.id)
          ?.single();

        if (profileError && profileError?.code !== 'PGRST116') {
          console.error('Profile fetch error:', profileError);
        }

        return {
          success: true,
          data: {
            user,
            profile: profile || null
          }
        };
      }

      return { success: false, error: 'No user found' };
    } catch (error) {
      console.error('Get current user error:', error);
      return { success: false, error: 'Failed to get current user' };
    }
  },

  // Check if user is authenticated
  async isAuthenticated() {
    try {
      const { data: { user } } = await supabase?.auth?.getUser();
      return !!user;
    } catch (error) {
      console.error('Authentication check error:', error);
      return false;
    }
  },

  // Multi-tenant: Create organization account (for MVP admin use)
  async createOrganizationAccount(organizationData, adminUserData) {
    try {
      // First create the admin user
      const signUpResult = await this.signUp({
        email: adminUserData?.email,
        password: adminUserData?.password,
        options: {
          data: {
            full_name: adminUserData?.fullName,
            role: 'admin',
            organization: organizationData?.name,
          },
        },
      });

      if (!signUpResult?.success) {
        return signUpResult;
      }

      return {
        success: true,
        data: {
          organization: organizationData,
          adminUser: signUpResult?.data
        },
        message: 'Organization account created successfully!'
      };
    } catch (error) {
      console.error('Create organization error:', error);
      return {
        success: false,
        error: 'Failed to create organization account'
      };
    }
  }
};