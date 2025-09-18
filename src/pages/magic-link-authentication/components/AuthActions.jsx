import React from 'react';
import { ArrowRight, RefreshCw, Home, Loader2 } from 'lucide-react';

const AuthActions = ({ 
  status, 
  onContinue, 
  onResendLink, 
  onReturnHome,
  isResending = false,
  userEmail = '',
  needsPasswordSetup = false 
}) => {
  if (status === 'loading') {
    return (
      <div className="space-y-3">
        <div className="p-3 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-700">
            Please wait while we process your authentication...
          </p>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="space-y-3">
        {needsPasswordSetup && (
          <div className="p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-700">
              You'll be redirected to set up your password...
            </p>
          </div>
        )}
        
        {!needsPasswordSetup && (
          <div className="p-3 bg-green-50 rounded-lg">
            <p className="text-sm text-green-700">
              Redirecting to your dashboard...
            </p>
          </div>
        )}
        
        <button
          onClick={onContinue}
          className="inline-flex items-center justify-center w-full px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
        >
          {needsPasswordSetup ? 'Continue to Password Setup' : 'Continue to Dashboard'}
          <ArrowRight className="w-4 h-4 ml-2" />
        </button>
      </div>
    );
  }

  if (status === 'error' || status === 'expired') {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          {userEmail && (
            <button
              onClick={onResendLink}
              disabled={isResending}
              className="inline-flex items-center justify-center w-full px-4 py-2 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isResending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending New Link...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Send New Magic Link
                </>
              )}
            </button>
          )}
          
          <button
            onClick={onReturnHome}
            className="inline-flex items-center justify-center w-full px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <Home className="w-4 h-4 mr-2" />
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  // Default state
  return (
    <div className="space-y-3">
      <button
        onClick={onReturnHome}
        className="inline-flex items-center justify-center w-full px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
      >
        <Home className="w-4 h-4 mr-2" />
        Return to Login
      </button>
    </div>
  );
};

export default AuthActions;