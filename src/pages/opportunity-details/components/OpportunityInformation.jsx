import React from 'react';
import { FileText, Calendar, DollarSign, Target, User, Clock } from 'lucide-react';
import { opportunitiesService } from '../../../services/opportunitiesService';

const OpportunityInformation = ({ opportunity }) => {
  const formatDate = (dateString) => {
    if (!dateString) return 'Not set';
    return new Date(dateString)?.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'Not set';
    return new Date(dateString)?.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStageProgress = (stage) => {
    return opportunitiesService?.getStageProgress(stage);
  };

  return (
    <div className="space-y-6">
      {/* Description */}
      {opportunity?.description && (
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center">
            <FileText className="h-5 w-5 mr-2 text-gray-400" />
            Description
          </h3>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-gray-700 whitespace-pre-line">{opportunity?.description}</p>
          </div>
        </div>
      )}
      {/* Financial Details */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center">
          <DollarSign className="h-5 w-5 mr-2 text-gray-400" />
          Financial Information
        </h3>
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="text-sm font-medium text-gray-500">Bid Value</div>
              <div className="text-xl font-semibold text-gray-900">
                {opportunitiesService?.formatBidValue(opportunity?.bid_value, opportunity?.currency)}
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-500">Currency</div>
              <div className="text-lg text-gray-900">
                {opportunity?.currency || 'USD'}
              </div>
            </div>
            {opportunity?.probability && (
              <>
                <div>
                  <div className="text-sm font-medium text-gray-500">Win Probability</div>
                  <div className="text-lg text-gray-900 flex items-center">
                    <Target className="h-4 w-4 mr-1 text-gray-400" />
                    {opportunity?.probability}%
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-500">Weighted Value</div>
                  <div className="text-lg font-semibold text-green-600">
                    {opportunitiesService?.formatBidValue(
                      opportunitiesService?.calculateWeightedValue(opportunity?.bid_value, opportunity?.probability),
                      opportunity?.currency
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      {/* Stage Progress */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center">
          <Target className="h-5 w-5 mr-2 text-gray-400" />
          Stage Progress
        </h3>
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Current Stage: {opportunity?.stage?.replace(/_/g, ' ')?.replace(/\b\w/g, l => l?.toUpperCase())}</span>
            <span>{getStageProgress(opportunity?.stage)}% Complete</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${getStageProgress(opportunity?.stage)}%` }}
            ></div>
          </div>
          <div className="mt-2 text-xs text-gray-500">
            Progress is calculated based on typical sales pipeline stages
          </div>
        </div>
      </div>
      {/* Timeline Information */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center">
          <Calendar className="h-5 w-5 mr-2 text-gray-400" />
          Timeline
        </h3>
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm font-medium text-gray-500">Expected Close Date</span>
              <span className="text-sm text-gray-900">
                {formatDate(opportunity?.expected_close_date)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm font-medium text-gray-500">Created</span>
              <span className="text-sm text-gray-900 flex items-center">
                <Clock className="h-4 w-4 mr-1 text-gray-400" />
                {formatDateTime(opportunity?.created_at)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm font-medium text-gray-500">Last Updated</span>
              <span className="text-sm text-gray-900 flex items-center">
                <Clock className="h-4 w-4 mr-1 text-gray-400" />
                {formatDateTime(opportunity?.updated_at)}
              </span>
            </div>
          </div>
        </div>
      </div>
      {/* Team Information */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center">
          <User className="h-5 w-5 mr-2 text-gray-400" />
          Team
        </h3>
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="space-y-3">
            {opportunity?.assigned_to && (
              <div className="flex justify-between">
                <span className="text-sm font-medium text-gray-500">Assigned To</span>
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-900">
                    {opportunity?.assigned_to?.full_name}
                  </div>
                  {opportunity?.assigned_to?.email && (
                    <div className="text-xs text-gray-500">
                      {opportunity?.assigned_to?.email}
                    </div>
                  )}
                </div>
              </div>
            )}
            {opportunity?.created_by && (
              <div className="flex justify-between">
                <span className="text-sm font-medium text-gray-500">Created By</span>
                <div className="text-right">
                  <div className="text-sm text-gray-900">
                    {opportunity?.created_by?.full_name}
                  </div>
                  {opportunity?.created_by?.email && (
                    <div className="text-xs text-gray-500">
                      {opportunity?.created_by?.email}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Notes */}
      {opportunity?.notes && (
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center">
            <FileText className="h-5 w-5 mr-2 text-gray-400" />
            Notes
          </h3>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-gray-700 whitespace-pre-line text-sm">{opportunity?.notes}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default OpportunityInformation;