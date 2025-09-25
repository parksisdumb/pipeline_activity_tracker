import React from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import { Building, MapPin, Phone, Mail, Edit, UserPlus, Users, Globe, Calendar, Activity, TrendingUp } from 'lucide-react';

const AccountHeader = ({ account, onEditAccount, onLogActivity, onAssignReps, currentUser }) => {
  const getStageColor = (stage) => {
    const stageColors = {
      'Prospect': 'bg-slate-100 text-slate-700',
      'Contacted': 'bg-blue-100 text-blue-700',
      'Vendor Packet Request': 'bg-purple-100 text-purple-700',
      'Vendor Packet Submitted': 'bg-indigo-100 text-indigo-700',
      'Approved for Work': 'bg-green-100 text-green-700',
      'Actively Engaged': 'bg-emerald-100 text-emerald-700',
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
      'Commercial Office': 'Building',
      'Retail': 'ShoppingBag',
      'Healthcare': 'Heart'
    };
    return typeIcons?.[type] || 'Building';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    return new Date(dateString)?.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const isManager = currentUser?.role === 'manager';
  const canManageAssignments = isManager || currentUser?.role === 'admin';

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6">
        {/* Main Account Info */}
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6 mb-6">
          <div className="flex-1">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
                <Icon 
                  name={getCompanyTypeIcon(account?.company_type)} 
                  size={24} 
                  color="var(--color-primary-foreground)" 
                />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-2xl font-bold text-foreground mb-1 truncate">
                  {account?.name}
                </h1>
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStageColor(account?.stage)}`}>
                    {account?.stage}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {account?.company_type}
                  </span>
                  {account?.is_active === false && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                      Inactive
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Comprehensive Contact Information Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 text-sm">
              {account?.email && (
                <div className="flex items-center gap-2">
                  <Icon name="Mail" size={16} className="text-muted-foreground flex-shrink-0" />
                  <a 
                    href={`mailto:${account?.email}`}
                    className="text-accent hover:text-accent/80 transition-colors truncate"
                  >
                    {account?.email}
                  </a>
                </div>
              )}
              
              {account?.phone && (
                <div className="flex items-center gap-2">
                  <Icon name="Phone" size={16} className="text-muted-foreground flex-shrink-0" />
                  <a 
                    href={`tel:${account?.phone}`}
                    className="text-accent hover:text-accent/80 transition-colors"
                  >
                    {account?.phone}
                  </a>
                </div>
              )}

              {account?.website && (
                <div className="flex items-center gap-2">
                  <Globe size={16} className="text-muted-foreground flex-shrink-0" />
                  <a 
                    href={account?.website?.startsWith('http') ? account?.website : `https://${account?.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent hover:text-accent/80 transition-colors truncate"
                  >
                    {account?.website}
                  </a>
                </div>
              )}

              {(account?.address || account?.city || account?.state) && (
                <div className="flex items-start gap-2 md:col-span-2 xl:col-span-3">
                  <Icon name="MapPin" size={16} className="text-muted-foreground flex-shrink-0 mt-0.5" />
                  <span className="text-muted-foreground">
                    {[account?.address, account?.city, account?.state, account?.zip_code]?.filter(Boolean)?.join(', ')}
                  </span>
                </div>
              )}

              <div className="flex items-center gap-2">
                <Calendar size={16} className="text-muted-foreground flex-shrink-0" />
                <span className="text-muted-foreground">
                  Created: {formatDate(account?.created_at)}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Activity size={16} className="text-muted-foreground flex-shrink-0" />
                <span className="text-muted-foreground">
                  Last Updated: {formatDate(account?.updated_at)}
                </span>
              </div>

              {account?.lastActivity && account?.lastActivity !== account?.updated_at && (
                <div className="flex items-center gap-2">
                  <TrendingUp size={16} className="text-muted-foreground flex-shrink-0" />
                  <span className="text-muted-foreground">
                    Last Activity: {formatDate(account?.lastActivity)}
                  </span>
                </div>
              )}
            </div>

            {/* Account Statistics */}
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <div className="text-lg font-semibold text-gray-900">{account?.propertiesCount || 0}</div>
                <div className="text-xs text-gray-600">Properties</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <div className="text-lg font-semibold text-gray-900">{account?.contactsCount || 0}</div>
                <div className="text-xs text-gray-600">Contacts</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <div className="text-lg font-semibold text-gray-900">{account?.activitiesCount || 0}</div>
                <div className="text-xs text-gray-600">Activities</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <div className="text-lg font-semibold text-gray-900">{account?.opportunitiesCount || 0}</div>
                <div className="text-xs text-gray-600">Opportunities</div>
              </div>
            </div>

            {/* Account Notes */}
            {account?.notes && (
              <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <h4 className="text-sm font-medium text-yellow-800 mb-1">Notes</h4>
                <p className="text-sm text-yellow-700">{account?.notes}</p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-2 lg:w-48">
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
            {canManageAssignments && (
              <Button
                variant="outline"
                onClick={onAssignReps}
                className="w-full"
                iconName="Users"
                iconPosition="left"
              >
                Manage Reps
              </Button>
            )}
          </div>
        </div>

        {/* Enhanced Assigned Representatives Section */}
        {account?.assigned_reps && Array.isArray(account?.assigned_reps) && account?.assigned_reps?.length > 0 && (
          <div className="border-t pt-6">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-5 h-5 text-gray-500" />
              <h3 className="text-lg font-medium text-gray-900">Assigned Representatives</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {account?.assigned_reps?.map((rep) => (
                <div 
                  key={rep?.rep_id}
                  className={`p-4 rounded-lg border ${
                    rep?.is_primary 
                      ? 'border-blue-200 bg-blue-50' :'border-gray-200 bg-gray-50'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-gray-900">{rep?.rep_name}</h4>
                        {rep?.is_primary && (
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                            Primary
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mb-1">{rep?.rep_email}</p>
                      {rep?.rep_phone && (
                        <p className="text-sm text-gray-600 mb-1">{rep?.rep_phone}</p>
                      )}
                      {rep?.rep_role && (
                        <p className="text-xs text-gray-500 capitalize">{rep?.rep_role}</p>
                      )}
                    </div>
                  </div>
                  
                  {rep?.assigned_at && (
                    <div className="text-xs text-gray-500 mb-1">
                      Assigned: {formatDate(rep?.assigned_at)}
                    </div>
                  )}
                  
                  {rep?.assigned_by_name && (
                    <div className="text-xs text-gray-500 mb-1">
                      By: {rep?.assigned_by_name}
                    </div>
                  )}
                  
                  {rep?.assignment_notes && (
                    <div className="text-xs text-gray-600 mt-2 p-2 bg-white rounded border">
                      {rep?.assignment_notes}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Legacy Single Assigned Rep (fallback) */}
        {(!account?.assigned_reps || account?.assigned_reps?.length === 0) && account?.primary_rep_name && (
          <div className="border-t pt-6">
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-5 h-5 text-gray-500" />
              <h3 className="text-lg font-medium text-gray-900">Assigned Representative</h3>
            </div>
            <div className="p-4 rounded-lg border border-gray-200 bg-gray-50">
              <p className="font-medium text-gray-900">{account?.primary_rep_name}</p>
            </div>
          </div>
        )}

        {/* No Assignments State */}
        {(!account?.assigned_reps || account?.assigned_reps?.length === 0) && !account?.primary_rep_name && (
          <div className="border-t pt-6">
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-5 h-5 text-gray-500" />
              <h3 className="text-lg font-medium text-gray-900">Assigned Representatives</h3>
            </div>
            <div className="p-4 rounded-lg border border-gray-200 bg-gray-50 text-center">
              <p className="text-gray-500 mb-3">No representatives assigned to this account</p>
              {canManageAssignments && onAssignReps && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onAssignReps}
                  className="flex items-center gap-2 mx-auto"
                >
                  <UserPlus className="w-4 h-4" />
                  Assign Representatives
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Primary Contact Information */}
        {account?.primaryContact && (
          <div className="border-t pt-6">
            <div className="flex items-center gap-2 mb-3">
              <Icon name="User" className="w-5 h-5 text-gray-500" />
              <h3 className="text-lg font-medium text-gray-900">Primary Contact</h3>
            </div>
            <div className="p-4 rounded-lg border border-gray-200 bg-gray-50">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-gray-900">
                    {account?.primaryContact?.first_name} {account?.primaryContact?.last_name}
                  </h4>
                  {account?.primaryContact?.title && (
                    <p className="text-sm text-gray-600">{account?.primaryContact?.title}</p>
                  )}
                </div>
                <div className="space-y-1">
                  {account?.primaryContact?.email && (
                    <div className="flex items-center gap-2 text-sm">
                      <Icon name="Mail" size={14} className="text-gray-400" />
                      <a 
                        href={`mailto:${account?.primaryContact?.email}`}
                        className="text-accent hover:text-accent/80"
                      >
                        {account?.primaryContact?.email}
                      </a>
                    </div>
                  )}
                  {account?.primaryContact?.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Icon name="Phone" size={14} className="text-gray-400" />
                      <a 
                        href={`tel:${account?.primaryContact?.phone}`}
                        className="text-accent hover:text-accent/80"
                      >
                        {account?.primaryContact?.phone}
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AccountHeader;