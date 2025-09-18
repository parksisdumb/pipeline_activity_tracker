import React from 'react';
import { CheckCircle, AlertCircle, Loader2, Mail, Clock, Shield } from 'lucide-react';

const AuthStatusCard = ({ status, message, email, progress = 0 }) => {
  const getStatusIcon = () => {
    switch (status) {
      case 'loading':
        return <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />;
      case 'success':
        return <CheckCircle className="w-8 h-8 text-green-600" />;
      case 'error':
        return <AlertCircle className="w-8 h-8 text-red-600" />;
      case 'expired':
        return <Clock className="w-8 h-8 text-orange-600" />;
      default:
        return <Shield className="w-8 h-8 text-gray-600" />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'loading':
        return 'bg-blue-100';
      case 'success':
        return 'bg-green-100';
      case 'error':
        return 'bg-red-100';
      case 'expired':
        return 'bg-orange-100';
      default:
        return 'bg-gray-100';
    }
  };

  const getStatusTitle = () => {
    switch (status) {
      case 'loading':
        return 'Authenticating...';
      case 'success':
        return 'Authentication Successful';
      case 'error':
        return 'Authentication Failed';
      case 'expired':
        return 'Link Expired';
      default:
        return 'Authentication Status';
    }
  };

  return (
    <div className="text-center">
      {/* Status Icon */}
      <div className="mb-6">
        <div className={`inline-flex items-center justify-center w-16 h-16 ${getStatusColor()} rounded-full`}>
          {getStatusIcon()}
        </div>
      </div>

      {/* Status Title */}
      <h1 className="text-2xl font-bold text-gray-900 mb-2">
        {getStatusTitle()}
      </h1>

      {/* Status Message */}
      <p className="text-gray-600 mb-4">
        {message}
      </p>

      {/* Email Display */}
      {email && (
        <div className="mb-6 p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-center text-sm text-gray-700">
            <Mail className="w-4 h-4 mr-2" />
            {email}
          </div>
        </div>
      )}

      {/* Progress Bar for Loading */}
      {status === 'loading' && progress > 0 && (
        <div className="mb-6">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <p className="text-sm text-gray-500 mt-2">
            Verifying your authentication... {progress}%
          </p>
        </div>
      )}
    </div>
  );
};

export default AuthStatusCard;