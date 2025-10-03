import React from 'react';
import Icon from '../AppIcon';

const ExpirationStatusBadge = ({ status, expiryDate }) => {
  // Calculate days until expiry
  const getDaysUntilExpiry = () => {
    if (!expiryDate) return null;
    const today = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Determine badge style and content based on status
  const getBadgeConfig = () => {
    const daysUntilExpiry = getDaysUntilExpiry();

    switch (status) {
      case 'valid':
        return {
          className: 'bg-green-100 text-green-800 border-green-200',
          icon: 'CheckCircle',
          label: 'Valid',
          iconColor: 'text-green-600'
        };

      case 'expiring':
        const daysText = daysUntilExpiry !== null 
          ? `${daysUntilExpiry} day${daysUntilExpiry !== 1 ? 's' : ''}` 
          : '';
        return {
          className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
          icon: 'Clock',
          label: `Expires ${daysText ? `in ${daysText}` : 'soon'}`,
          iconColor: 'text-yellow-600'
        };

      case 'expired':
        const expiredDaysText = daysUntilExpiry !== null && daysUntilExpiry < 0
          ? `${Math.abs(daysUntilExpiry)} day${Math.abs(daysUntilExpiry) !== 1 ? 's' : ''} ago`
          : '';
        return {
          className: 'bg-red-100 text-red-800 border-red-200',
          icon: 'XCircle',
          label: `Expired ${expiredDaysText || ''}`,
          iconColor: 'text-red-600'
        };

      case 'missing':
        return {
          className: 'bg-purple-100 text-purple-800 border-purple-200',
          icon: 'AlertCircle',
          label: 'Missing',
          iconColor: 'text-purple-600'
        };

      default:
        return {
          className: 'bg-gray-100 text-gray-800 border-gray-200',
          icon: 'FileText',
          label: 'Unknown',
          iconColor: 'text-gray-600'
        };
    }
  };

  const config = getBadgeConfig();

  return (
    <span 
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${config?.className}`}
      title={expiryDate ? `Expires: ${new Date(expiryDate)?.toLocaleDateString()}` : 'No expiry date set'}
    >
      <Icon 
        name={config?.icon} 
        size={12} 
        className={config?.iconColor}
      />
      {config?.label}
    </span>
  );
};

export default ExpirationStatusBadge;