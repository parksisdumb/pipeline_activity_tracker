import React from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const AccountHeader = ({ account, onEditAccount, onLogActivity }) => {
  const getStageColor = (stage) => {
    const stageColors = {
      'Prospect': 'bg-slate-100 text-slate-700',
      'Contacted': 'bg-blue-100 text-blue-700',
      'Qualified': 'bg-green-100 text-green-700',
      'Assessment Scheduled': 'bg-yellow-100 text-yellow-700',
      'Proposal Sent': 'bg-orange-100 text-orange-700',
      'Won': 'bg-emerald-100 text-emerald-700',
      'Lost': 'bg-red-100 text-red-700'
    };
    return stageColors?.[stage] || 'bg-slate-100 text-slate-700';
  };

  const getCompanyTypeIcon = (type) => {
    const typeIcons = {
      'Property Management': 'Building2',
      'General Contractor': 'HardHat',
      'Developer': 'Hammer',
      'REIT/Institutional Investor': 'TrendingUp',
      'Asset Manager': 'Briefcase',
      'Building Owner': 'Home',
      'Facility Manager': 'Settings',
      'Roofing Contractor': 'Wrench',
      'Insurance': 'Shield',
      'Architecture/Engineering': 'Ruler',
      'Other': 'Building'
    };
    return typeIcons?.[type] || 'Building';
  };

  return (
    <div className="bg-card border-b border-border p-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        {/* Account Info */}
        <div className="flex-1">
          <div className="flex items-start gap-3 mb-3">
            <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
              <Icon 
                name={getCompanyTypeIcon(account?.companyType)} 
                size={24} 
                color="var(--color-primary-foreground)" 
              />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-bold text-foreground mb-1 truncate">
                {account?.name}
              </h1>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStageColor(account?.stage)}`}>
                  {account?.stage}
                </span>
                <span className="text-sm text-muted-foreground">
                  {account?.companyType}
                </span>
              </div>
            </div>
          </div>

          {/* Contact Info */}
          {account?.primaryContact && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Icon name="User" size={16} className="text-muted-foreground" />
                <span className="text-foreground font-medium">{account?.primaryContact?.name}</span>
                <span className="text-muted-foreground">({account?.primaryContact?.role})</span>
              </div>
              {account?.primaryContact?.phone && (
                <div className="flex items-center gap-2">
                  <Icon name="Phone" size={16} className="text-muted-foreground" />
                  <a 
                    href={`tel:${account?.primaryContact?.phone}`}
                    className="text-accent hover:text-accent/80 transition-colors"
                  >
                    {account?.primaryContact?.phone}
                  </a>
                </div>
              )}
              {account?.primaryContact?.email && (
                <div className="flex items-center gap-2">
                  <Icon name="Mail" size={16} className="text-muted-foreground" />
                  <a 
                    href={`mailto:${account?.primaryContact?.email}`}
                    className="text-accent hover:text-accent/80 transition-colors truncate"
                  >
                    {account?.primaryContact?.email}
                  </a>
                </div>
              )}
              {account?.address && (
                <div className="flex items-center gap-2">
                  <Icon name="MapPin" size={16} className="text-muted-foreground" />
                  <span className="text-muted-foreground truncate">{account?.address}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-2 lg:flex-col lg:w-48">
          <Button 
            onClick={onLogActivity}
            className="w-full"
            iconName="Plus"
            iconPosition="left"
          >
            Log Activity
          </Button>
          <Button 
            variant="outline"
            onClick={onEditAccount}
            className="w-full"
            iconName="Edit"
            iconPosition="left"
          >
            Edit Account
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AccountHeader;