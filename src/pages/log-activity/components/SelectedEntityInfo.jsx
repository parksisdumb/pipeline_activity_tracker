import React from 'react';
import Icon from '../../../components/AppIcon';

const SelectedEntityInfo = ({ entityType, entityData }) => {
  if (!entityData) return null;

  const getEntityIcon = () => {
    switch (entityType) {
      case 'account': return 'Building2';
      case 'property': return 'MapPin';
      case 'contact': return 'User';
      default: return 'Info';
    }
  };

  const getEntityColor = () => {
    switch (entityType) {
      case 'account': return 'text-blue-600';
      case 'property': return 'text-green-600';
      case 'contact': return 'text-purple-600';
      default: return 'text-gray-600';
    }
  };

  const getBgColor = () => {
    switch (entityType) {
      case 'account': return 'bg-blue-50 border-blue-200';
      case 'property': return 'bg-green-50 border-green-200';
      case 'contact': return 'bg-purple-50 border-purple-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className={`p-3 rounded-lg border ${getBgColor()}`}>
      <div className="flex items-start space-x-3">
        <Icon 
          name={getEntityIcon()} 
          size={18} 
          className={`mt-0.5 ${getEntityColor()}`} 
        />
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-foreground truncate">
            {entityData?.label}
          </h4>
          {entityData?.description && (
            <p className="text-xs text-muted-foreground mt-1">
              {entityData?.description}
            </p>
          )}
          
          {/* Additional context based on entity type */}
          {entityType === 'account' && entityData?.properties_count && (
            <div className="flex items-center space-x-4 mt-2 text-xs text-muted-foreground">
              <span className="flex items-center space-x-1">
                <Icon name="MapPin" size={12} />
                <span>{entityData?.properties_count} properties</span>
              </span>
              {entityData?.contacts_count && (
                <span className="flex items-center space-x-1">
                  <Icon name="Users" size={12} />
                  <span>{entityData?.contacts_count} contacts</span>
                </span>
              )}
            </div>
          )}
          
          {entityType === 'property' && entityData?.address && (
            <div className="flex items-center space-x-1 mt-2 text-xs text-muted-foreground">
              <Icon name="MapPin" size={12} />
              <span className="truncate">{entityData?.address}</span>
            </div>
          )}
          
          {entityType === 'contact' && (entityData?.email || entityData?.phone) && (
            <div className="flex items-center space-x-4 mt-2 text-xs text-muted-foreground">
              {entityData?.email && (
                <span className="flex items-center space-x-1">
                  <Icon name="Mail" size={12} />
                  <span className="truncate">{entityData?.email}</span>
                </span>
              )}
              {entityData?.phone && (
                <span className="flex items-center space-x-1">
                  <Icon name="Phone" size={12} />
                  <span>{entityData?.phone}</span>
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SelectedEntityInfo;