import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext({})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [userProfile, setUserProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [profileLoading, setProfileLoading] = useState(false)

  // Enhanced super admin detection method
  const isSuperAdmin = (user, profile) => {
    if (!user) return false;
    
    // Check user metadata first
    const metaRole = user?.user_metadata?.role || user?.app_metadata?.role;
    if (metaRole === 'super_admin' || metaRole === 'master_admin') {
      return true;
    }
    
    // Check profile role
    if (profile?.role === 'super_admin') {
      return true;
    }
    
    return false;
  };

  // Isolated async operations - never called from auth callbacks
  const profileOperations = {
    async load(userId) {
      // Enhanced validation to prevent UUID errors
      if (!userId) {
        console.warn('Profile load called with empty userId');
        return;
      }
      
      // Validate UUID format to prevent database errors
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex?.test(userId)) {
        console.error('Invalid userId format for profile load:', userId);
        return;
      }

      setProfileLoading(true);
      try {
        const { data, error } = await supabase?.from('user_profiles')?.select('*')?.eq('id', userId)?.single();
        if (!error) {
          setUserProfile(data);
          
          // Enhanced role detection: If profile shows super_admin but auth doesn't have it, update auth metadata
          if (data?.role === 'super_admin') {
            const { data: currentUser } = await supabase?.auth?.getUser();
            const currentMetaRole = currentUser?.user?.user_metadata?.role || currentUser?.user?.app_metadata?.role;
            
            if (currentMetaRole !== 'super_admin') {
              console.log('Detected super_admin profile, updating auth metadata...');
              // Update user metadata to sync with profile
              const { error: updateError } = await supabase?.auth?.updateUser({
                data: { 
                  ...currentUser?.user?.user_metadata,
                  role: 'super_admin' 
                }
              });
              
              if (updateError) {
                console.warn('Failed to update user metadata for super_admin:', updateError);
              } else {
                console.log('Successfully synced super_admin role to auth metadata');
              }
            }
          }
        } else {
          console.warn('Profile load error:', error);
        }
      } catch (error) {
        console.error('Profile load error:', error);
      } finally {
        setProfileLoading(false);
      }
    },

    clear() {
      setUserProfile(null)
      setProfileLoading(false)
    }
  }

  // Auth state handlers - PROTECTED from async modification
  const authStateHandlers = {
    // This handler MUST remain synchronous - Supabase requirement
    onChange: (event, session) => {
      setUser(session?.user ?? null)
      setLoading(false)
      
      if (session?.user) {
        profileOperations?.load(session?.user?.id) // Fire-and-forget
      } else {
        profileOperations?.clear()
      }
    }
  }

  useEffect(() => {
    // Initial session check
    supabase?.auth?.getSession()?.then(({ data: { session } }) => {
      authStateHandlers?.onChange(null, session)
    })

    // CRITICAL: This must remain synchronous
    const { data: { subscription } } = supabase?.auth?.onAuthStateChange(
      authStateHandlers?.onChange
    )

    return () => subscription?.unsubscribe()
  }, [])

  // Enhanced signUp method with better error handling and profile creation
  const signUp = async (email, password, metadata = {}) => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase?.auth?.signUp({
        email,
        password,
        options: {
          data: {
            full_name: metadata?.fullName || '',
            role: metadata?.role || 'rep',
            ...metadata
          },
          emailRedirectTo: `${window?.location?.origin}/magic-link-authentication`
        }
      });

      if (error) {
        return { 
          success: false, 
          error: error?.message,
          user: null,
          session: null,
          needsConfirmation: false
        };
      }

      // If user was created but needs email confirmation
      if (data?.user && !data?.session) {
        return {
          success: true,
          user: data?.user,
          session: null,
          needsConfirmation: true,
          message: 'Account created! Please check your email to confirm your account before proceeding.'
        };
      }

      // If user was created and is immediately signed in (rare case)
      if (data?.user && data?.session) {
        return {
          success: true,
          user: data?.user,
          session: data?.session,
          needsConfirmation: false,
          message: 'Account created successfully! You are now signed in.'
        };
      }

      return {
        success: false,
        error: 'Unexpected response from signup process',
        user: null,
        session: null,
        needsConfirmation: false
      };

    } catch (error) {
      if (error?.message?.includes('Failed to fetch') || 
          error?.message?.includes('AuthRetryableFetchError')) {
        return {
          success: false,
          error: 'Cannot connect to authentication service. Your Supabase project may be paused or inactive.',
          user: null,
          session: null,
          needsConfirmation: false
        };
      }

      return {
        success: false,
        error: error?.message || 'An unexpected error occurred during signup',
        user: null,
        session: null,
        needsConfirmation: false
      };
    } finally {
      setLoading(false);
    }
  };

  // Enhanced signIn method with password setup detection
  const signIn = async (email, password) => {
    try {
      const { data, error } = await supabase?.auth?.signInWithPassword({ 
        email, 
        password 
      });
      
      if (error) {
        return { error };
      }

      // Get user authentication status
      const { data: authStatus, error: statusError } = await supabase?.rpc(
        'get_user_auth_status',
        { user_email: email }
      );

      if (statusError) {
        console.warn('Could not get auth status:', statusError);
      }

      // Get user profile to check password and profile status
      const { data: profile, error: profileError } = await supabase
        ?.from('user_profiles')
        ?.select('*')
        ?.eq('id', data?.user?.id)
        ?.single();

      return { 
        data, 
        error: null,
        needsPasswordSetup: profile ? !profile?.password_set : false,
        profileIncomplete: profile ? !profile?.profile_completed : false
      };
    } catch (error) {
      return { error: { message: 'Network error. Please try again.' } };
    }
  };

  // Enhanced password reset method
  const sendPasswordReset = async (email) => {
    try {
      const currentOrigin = window.location?.origin;
      
      const { error } = await supabase?.auth?.resetPasswordForEmail(email, {
        redirectTo: `${currentOrigin}/magic-link-authentication`
      });
      
      if (error) {
        return { 
          success: false, 
          error: error?.message || 'Password reset failed'
        };
      }
      
      return { 
        success: true, 
        message: 'Password reset email sent. Please check your inbox and follow the instructions.' 
      };
    } catch (error) {
      console.error('Reset password error:', error);
      return { 
        success: false, 
        error: 'An unexpected error occurred during password reset'
      };
    }
  };

  // Enhanced sendMagicLink method
  const sendMagicLink = async (email) => {
    try {
      const currentOrigin = window?.location?.origin;
      
      // First check if user exists and what their status is
      const { data: resendCheck, error: resendCheckError } = await supabase?.rpc(
        'resend_confirmation_workflow',
        { user_email: email }
      );

      if (resendCheckError) {
        console.warn('Could not check resend status:', resendCheckError);
      } else if (resendCheck?.[0]) {
        const checkResult = resendCheck?.[0];
        if (!checkResult?.success) {
          return {
            success: false,
            error: checkResult?.message || 'Cannot send magic link to this email'
          };
        }
      }

      const { error } = await supabase?.auth?.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${currentOrigin}/magic-link-authentication`
        }
      });
      
      if (error) {
        return { 
          success: false, 
          error: error?.message || 'Magic link sending failed'
        };
      }
      
      return { 
        success: true, 
        message: 'Magic link sent! Please check your email and click the link to sign in.' 
      };
    } catch (error) {
      if (error?.message?.includes('Failed to fetch') || 
          error?.message?.includes('AuthRetryableFetchError')) {
        return {
          success: false,
          error: 'Cannot connect to authentication service. Your Supabase project may be paused or inactive.'
        };
      }

      return { 
        success: false, 
        error: 'An unexpected error occurred while sending magic link'
      };
    }
  };

  // Enhanced completeProfileSetup method with the new function
  const completeProfileSetup = async (profileData) => {
    if (!user?.id) {
      return { error: { message: 'No user logged in' } };
    }
    
    try {
      const { data, error } = await supabase?.rpc('complete_user_setup_enhanced', {
        user_email: user?.email,
        profile_data: {
          fullName: profileData?.fullName,
          role: profileData?.role || 'rep',
          organization: profileData?.organization || null
        },
        mark_password_set: true  // Mark password as set when completing profile
      });

      if (error) {
        return { error: { message: error?.message } };
      }

      const result = data?.[0];
      if (result?.success) {
        // Reload profile after successful setup
        await profileOperations?.load(user?.id);
        return { 
          success: true, 
          message: result?.message,
          redirectTo: result?.redirect_to
        };
      } else {
        return { error: { message: result?.message } };
      }
    } catch (error) {
      console.error('Profile setup error:', error);
      return { error: { message: 'Network error. Please try again.' } };
    }
  };

  // Admin function to force password reset
  const adminForcePasswordReset = async (userEmail) => {
    if (!user?.id) {
      return { error: { message: 'No user logged in' } };
    }
    
    try {
      const { data, error } = await supabase?.rpc('admin_force_password_reset', {
        target_email: userEmail,
        admin_user_id: user?.id
      });

      if (error) {
        return { error: { message: error?.message } };
      }

      const result = data?.[0];
      if (result?.success) {
        return { success: true, message: result?.message };
      } else {
        return { error: { message: result?.message } };
      }
    } catch (error) {
      console.error('Admin password reset error:', error);
      return { error: { message: 'Network error. Please try again.' } };
    }
  };

  // Check if user needs password setup
  const checkPasswordSetupNeeded = async (userId = null) => {
    const targetUserId = userId || user?.id;
    if (!targetUserId) return false;
    
    try {
      const { data, error } = await supabase?.rpc('user_needs_password_setup', {
        user_uuid: targetUserId
      });
      
      return !error && data === true;
    } catch (error) {
      console.error('Password setup check error:', error);
      return false;
    }
  };

  const signOut = async () => {
    try {
      // Enhanced session handling: Check if session exists before any operation
      let session = null;
      let sessionCheckError = null;
      
      try {
        const sessionResponse = await supabase?.auth?.getSession();
        session = sessionResponse?.data?.session;
        sessionCheckError = sessionResponse?.error;
      } catch (sessionError) {
        console.warn('Session check failed during signOut:', sessionError);
        sessionCheckError = sessionError;
      }
      
      if (sessionCheckError) {
        console.warn('Session check error during signOut:', sessionCheckError);
        // Clear local state even if session check fails
        setUser(null);
        profileOperations?.clear();
        return { error: null }; // Treat as successful signout
      }
      
      if (!session) {
        // No active session to sign out from - clear local state and return success
        console.log('No active session found during signOut, clearing local state');
        setUser(null);
        profileOperations?.clear();
        return { error: null };
      }
      
      // Enhanced signOut with additional error catching
      let signOutError = null;
      try {
        const result = await supabase?.auth?.signOut();
        signOutError = result?.error;
      } catch (authError) {
        // Catch any authentication-level errors during signOut
        console.warn('Auth signOut operation error:', authError);
        
        // Handle specific Auth session missing errors at this level
        if (authError?.message?.includes('Auth session missing') || 
            authError?.name === 'AuthSessionMissingError' ||
            authError?.code === 'session_not_found') {
          // Clear local state and treat as successful signout
          setUser(null);
          profileOperations?.clear();
          return { error: null };
        }
        
        // For other auth errors, set them to be handled below
        signOutError = authError;
      }
      
      if (!signOutError) {
        // Successful signOut
        setUser(null);
        profileOperations?.clear();
        return { error: null };
      }
      
      // Handle signOut errors
      if (signOutError?.message?.includes('Auth session missing') || 
          signOutError?.name === 'AuthSessionMissingError' ||
          signOutError?.code === 'session_not_found') {
        // Clear local state and treat as successful signout
        setUser(null);
        profileOperations?.clear();
        return { error: null };
      }
      
      // Return other errors for handling
      return { error: signOutError };
      
    } catch (error) {
      console.warn('SignOut outer catch - error handled gracefully:', error);
      
      // Enhanced error type detection
      const isAuthSessionError = (
        error?.message?.includes('Auth session missing') || 
        error?.name === 'AuthSessionMissingError' ||
        error?.code === 'session_not_found' ||
        error?.message?.includes('session_not_found') ||
        error?.toString()?.includes('Auth session missing')
      );
      
      if (isAuthSessionError) {
        // Clear local state and treat as successful signout
        console.log('Auth session missing error handled gracefully - clearing local state');
        setUser(null);
        profileOperations?.clear();
        return { error: null };
      }
      
      // Handle network errors
      if (error?.message?.includes('Failed to fetch') || 
          error?.message?.includes('Network') ||
          error?.name === 'NetworkError') {
        return { error: { message: 'Network error during sign out. Please try again.' } };
      }
      
      // For any other unexpected errors
      console.error('Unexpected signOut error:', error);
      return { error: { message: 'Sign out completed with warnings. You have been logged out.' } };
    }
  }

  const updateProfile = async (updates) => {
    if (!user?.id) {
      console.warn('updateProfile called without valid user ID');
      return { error: { message: 'No user logged in' } };
    }
    
    // Validate UUID format to prevent database errors
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex?.test(user?.id)) {
      console.error('Invalid user ID format for profile update:', user?.id);
      return { error: { message: 'Invalid user session. Please log in again.' } };
    }
    
    try {
      const { data, error } = await supabase?.from('user_profiles')?.update(updates)?.eq('id', user?.id)?.select()?.single();
      if (!error) setUserProfile(data);
      return { data, error };
    } catch (error) {
      console.error('Profile update error:', error);
      return { error: { message: 'Network error. Please try again.' } };
    }
  }

  // Enhanced updatePassword method with database tracking
  const updatePassword = async (newPassword) => {
    try {
      const { error } = await supabase?.auth?.updateUser({
        password: newPassword
      });
      
      if (error) {
        return { 
          success: false, 
          error: error?.message || 'Password update failed'
        };
      }

      // Mark password as set in user profile
      if (user?.id) {
        const { error: profileError } = await supabase?.rpc(
          'complete_password_setup',
          { 
            user_uuid: user?.id,
            mark_password_complete: true
          }
        );

        if (profileError) {
          console.warn('Could not update password status in profile:', profileError);
        }
      }
      
      return { 
        success: true, 
        message: 'Password updated successfully!' 
      };
    } catch (error) {
      if (error?.message?.includes('Failed to fetch') || 
          error?.message?.includes('AuthRetryableFetchError')) {
        return {
          success: false,
          error: 'Cannot connect to authentication service. Your Supabase project may be paused or inactive.'
        };
      } else {
        return { 
          success: false, 
          error: 'An unexpected error occurred while updating password'
        };
      }
    }
  }

  const value = {
    user,
    userProfile,
    loading,
    profileLoading,
    signUp,
    signIn,
    signOut,
    updateProfile,
    updatePassword,
    sendPasswordReset,
    sendMagicLink,
    completeProfileSetup,
    adminForcePasswordReset,
    checkPasswordSetupNeeded,
    isAuthenticated: !!user,
    isSuperAdmin: isSuperAdmin(user, userProfile),
    needsPasswordSetup: userProfile ? !userProfile?.password_set : false,
    profileIncomplete: userProfile ? !userProfile?.profile_completed : false
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}