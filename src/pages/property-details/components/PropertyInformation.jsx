import React from 'react';
import Icon from '../../../components/AppIcon';

const PropertyInformation = ({ property }) => {
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString)?.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <h3 className="text-lg font-semibold text-foreground mb-4">Property Information</h3>
      
      <div className="space-y-4">
        {/* Basic Information */}
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-2">Basic Details</h4>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Building Type:</span>
              <span className="text-sm font-medium text-foreground">{property?.building_type}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Roof Type:</span>
              <span className="text-sm font-medium text-foreground">{property?.roof_type || 'Not specified'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Square Footage:</span>
              <span className="text-sm font-medium text-foreground">
                {property?.square_footage ? property?.square_footage?.toLocaleString() + ' sq ft' : 'Not specified'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Year Built:</span>
              <span className="text-sm font-medium text-foreground">{property?.year_built || 'Not specified'}</span>
            </div>
          </div>
        </div>

        {/* Location */}
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-2">Location</h4>
          <div className="flex items-start gap-2">
            <Icon name="MapPin" size={16} className="text-muted-foreground mt-0.5" />
            <div className="text-sm text-foreground">
              <div>{property?.address}</div>
              {(property?.city || property?.state || property?.zip_code) && (
                <div className="text-muted-foreground">
                  {property?.city && property?.city}
                  {property?.state && `, ${property?.state}`}
                  {property?.zip_code && ` ${property?.zip_code}`}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Account Information */}
        {property?.account && (
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-2">Account</h4>
            <div className="flex items-center gap-2">
              <Icon name="Building" size={16} className="text-muted-foreground" />
              <div>
                <div className="text-sm font-medium text-foreground">{property?.account?.name}</div>
                <div className="text-xs text-muted-foreground">{property?.account?.company_type}</div>
              </div>
            </div>
          </div>
        )}

        {/* Timestamps */}
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-2">Record Details</h4>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Created:</span>
              <span className="text-sm text-foreground">{formatDate(property?.created_at)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Updated:</span>
              <span className="text-sm text-foreground">{formatDate(property?.updated_at)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Last Assessment:</span>
              <span className="text-sm text-foreground">{formatDate(property?.last_assessment)}</span>
            </div>
          </div>
        </div>

        {/* Notes */}
        {property?.notes && (
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-2">Notes</h4>
            <p className="text-sm text-foreground bg-muted/30 p-3 rounded-md">{property?.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PropertyInformation;