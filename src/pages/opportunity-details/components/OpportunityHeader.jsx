import React from 'react';
import { Building2, User, MapPin, Phone, Mail } from 'lucide-react';
import { opportunitiesService } from '../../../services/opportunitiesService';

const OpportunityHeader = ({ opportunity }) => {
  const getStageColor = (stage) => {
    const colors = {
      'identified': 'bg-gray-100 text-gray-800',
      'qualified': 'bg-blue-100 text-blue-800',
      'proposal_sent': 'bg-yellow-100 text-yellow-800',
      'negotiation': 'bg-purple-100 text-purple-800',
      'won': 'bg-green-100 text-green-800',
      'lost': 'bg-red-100 text-red-800'
    };
    return colors?.[stage] || 'bg-gray-100 text-gray-800';
  };

  const getTypeColor = (type) => {
    const colors = {
      'new_construction': 'bg-blue-100 text-blue-800',
      'inspection': 'bg-green-100 text-green-800',
      'repair': 'bg-yellow-100 text-yellow-800',
      'maintenance': 'bg-purple-100 text-purple-800',
      're_roof': 'bg-red-100 text-red-800'
    };
    return colors?.[type] || 'bg-gray-100 text-gray-800';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not set';
    return new Date(dateString)?.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="bg-white shadow rounded-lg mb-6">
      <div className="px-6 py-6">
        {/* Title and Basic Info */}
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between">
          <div className="flex-1">
            <div className="flex items-start space-x-3">
              <div className="p-2 bg-blue-50 rounded-lg flex-shrink-0">
                <Building2 className="h-6 w-6 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  {opportunity?.name}
                </h1>
                <div className="flex flex-wrap items-center gap-3 mb-4">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStageColor(opportunity?.stage)}`}>
                    {opportunity?.stage?.replace(/_/g, ' ')?.replace(/\b\w/g, l => l?.toUpperCase())}
                  </span>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getTypeColor(opportunity?.opportunity_type)}`}>
                    {opportunity?.opportunity_type?.replace(/_/g, ' ')?.replace(/\b\w/g, l => l?.toUpperCase())}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="mt-4 lg:mt-0 lg:ml-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 gap-4 lg:gap-3">
              {/* Bid Value */}
              <div className="text-center lg:text-right">
                <div className="text-sm text-gray-500">Bid Value</div>
                <div className="text-2xl font-bold text-gray-900">
                  {opportunitiesService?.formatBidValue(opportunity?.bid_value, opportunity?.currency)}
                </div>
                {opportunity?.probability && (
                  <div className="text-sm text-gray-500">
                    {opportunity?.probability}% probability
                  </div>
                )}
              </div>

              {/* Expected Close */}
              <div className="text-center lg:text-right">
                <div className="text-sm text-gray-500">Expected Close</div>
                <div className="text-lg font-semibold text-gray-900">
                  {formatDate(opportunity?.expected_close_date)}
                </div>
              </div>

              {/* Weighted Value */}
              {opportunity?.bid_value && opportunity?.probability && (
                <div className="text-center lg:text-right">
                  <div className="text-sm text-gray-500">Weighted Value</div>
                  <div className="text-lg font-semibold text-green-600">
                    {opportunitiesService?.formatBidValue(
                      opportunitiesService?.calculateWeightedValue(opportunity?.bid_value, opportunity?.probability),
                      opportunity?.currency
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Account and Property Info */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Account Information */}
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
                <Building2 className="h-4 w-4 mr-2 text-gray-400" />
                Account Information
              </h3>
              {opportunity?.account ? (
                <div className="space-y-2">
                  <div>
                    <div className="font-medium text-gray-900">{opportunity?.account?.name}</div>
                    <div className="text-sm text-gray-500">{opportunity?.account?.company_type}</div>
                  </div>
                  {opportunity?.account?.email && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Mail className="h-4 w-4 mr-2 text-gray-400" />
                      {opportunity?.account?.email}
                    </div>
                  )}
                  {opportunity?.account?.phone && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Phone className="h-4 w-4 mr-2 text-gray-400" />
                      {opportunity?.account?.phone}
                    </div>
                  )}
                  {opportunity?.account?.address && (
                    <div className="flex items-start text-sm text-gray-600">
                      <MapPin className="h-4 w-4 mr-2 text-gray-400 mt-0.5 flex-shrink-0" />
                      <div>
                        {opportunity?.account?.address}
                        {opportunity?.account?.city && `, ${opportunity?.account?.city}`}
                        {opportunity?.account?.state && `, ${opportunity?.account?.state}`}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-sm text-gray-500">No account associated</div>
              )}
            </div>

            {/* Property Information */}
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
                <Building2 className="h-4 w-4 mr-2 text-gray-400" />
                Property Information
              </h3>
              {opportunity?.property ? (
                <div className="space-y-2">
                  <div>
                    <div className="font-medium text-gray-900">{opportunity?.property?.name}</div>
                    <div className="text-sm text-gray-500">{opportunity?.property?.building_type}</div>
                  </div>
                  {opportunity?.property?.address && (
                    <div className="flex items-start text-sm text-gray-600">
                      <MapPin className="h-4 w-4 mr-2 text-gray-400 mt-0.5 flex-shrink-0" />
                      <div>
                        {opportunity?.property?.address}
                        {opportunity?.property?.city && `, ${opportunity?.property?.city}`}
                        {opportunity?.property?.state && `, ${opportunity?.property?.state}`}
                      </div>
                    </div>
                  )}
                  <div className="text-sm text-gray-600 space-y-1">
                    {opportunity?.property?.square_footage && (
                      <div>Size: {opportunity?.property?.square_footage?.toLocaleString()} sq ft</div>
                    )}
                    {opportunity?.property?.roof_type && (
                      <div>Roof Type: {opportunity?.property?.roof_type}</div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-sm text-gray-500">No property associated</div>
              )}
            </div>
          </div>
        </div>

        {/* Assigned To */}
        {opportunity?.assigned_to && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center">
              <User className="h-4 w-4 mr-2 text-gray-400" />
              <span className="text-sm text-gray-500 mr-2">Assigned to:</span>
              <div>
                <div className="font-medium text-gray-900">{opportunity?.assigned_to?.full_name}</div>
                {opportunity?.assigned_to?.email && (
                  <div className="text-sm text-gray-500">{opportunity?.assigned_to?.email}</div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OpportunityHeader;