import React from 'react';
import Button from '../../../components/ui/Button';
import Icon from '../../../components/AppIcon';

const PropertyHeader = ({ property, onNavigateToAccount, onEdit, onBack }) => {
  const getStageColor = (stage) => {
    const colors = {
      'Unassessed': 'bg-slate-100 text-slate-700',
      'Assessment Scheduled': 'bg-blue-100 text-blue-700',
      'Assessed': 'bg-green-100 text-green-700',
      'Proposal Sent': 'bg-yellow-100 text-yellow-700',
      'In Negotiation': 'bg-orange-100 text-orange-700',
      'Won': 'bg-emerald-100 text-emerald-700',
      'Lost': 'bg-red-100 text-red-700'
    };
    return colors?.[stage] || 'bg-gray-100 text-gray-700';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never assessed';
    return new Date(dateString)?.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      {/* Back Button */}
      <div className="mb-4">
        <Button
          variant="ghost"
          onClick={onBack}
          iconName="ArrowLeft"
          iconPosition="left"
          className="text-muted-foreground hover:text-foreground"
        >
          Back to Properties
        </Button>
      </div>

      {/* Header Content */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div className="flex-1 min-w-0">
          {/* Property Name and Address */}
          <div className="flex items-start gap-3 mb-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Icon name="Building2" size={24} className="text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl lg:text-3xl font-bold text-foreground truncate">
                {property?.name}
              </h1>
              <p className="text-lg text-muted-foreground mt-1">
                {property?.address}
                {property?.city && `, ${property?.city}`}
                {property?.state && `, ${property?.state}`}
                {property?.zip_code && ` ${property?.zip_code}`}
              </p>
            </div>
          </div>

          {/* Property Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div>
              <p className="text-sm text-muted-foreground">Building Type</p>
              <p className="font-medium text-foreground">{property?.building_type}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Roof Type</p>
              <p className="font-medium text-foreground">{property?.roof_type || 'Not specified'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Square Footage</p>
              <p className="font-medium text-foreground">
                {property?.square_footage ? property?.square_footage?.toLocaleString() + ' sq ft' : 'Not specified'}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Year Built</p>
              <p className="font-medium text-foreground">{property?.year_built || 'Not specified'}</p>
            </div>
          </div>

          {/* Account Link */}
          {property?.account && (
            <div className="mb-4">
              <button
                onClick={onNavigateToAccount}
                className="flex items-center gap-2 text-primary hover:text-primary/80 transition-colors"
              >
                <Icon name="Building" size={16} />
                <span className="font-medium">{property?.account?.name}</span>
                <Icon name="ExternalLink" size={14} />
              </button>
            </div>
          )}

          {/* Stage and Last Assessment */}
          <div className="flex flex-wrap items-center gap-4">
            <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium ${getStageColor(property?.stage)}`}>
              {property?.stage}
            </span>
            <div className="text-sm text-muted-foreground">
              Last assessment: {formatDate(property?.last_assessment)}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={onEdit}
            iconName="Edit"
            iconPosition="left"
          >
            Edit Property
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PropertyHeader;