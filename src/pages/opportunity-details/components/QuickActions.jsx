import React from 'react';
import { Phone, Mail, Calendar, ArrowRight } from 'lucide-react';
import { opportunitiesService } from '../../../services/opportunitiesService';

const QuickActions = ({ opportunity, onLogActivity, onStageUpdate }) => {
  const nextStage = getNextStage(opportunity?.stage);
  
  function getNextStage(currentStage) {
    const stageOrder = ['identified', 'qualified', 'proposal_sent', 'negotiation', 'won'];
    const currentIndex = stageOrder?.indexOf(currentStage);
    
    if (currentIndex === -1 || currentIndex === stageOrder?.length - 1) {
      return null;
    }
    
    return {
      value: stageOrder?.[currentIndex + 1],
      label: stageOrder?.[currentIndex + 1]?.replace(/_/g, ' ')?.replace(/\b\w/g, l => l?.toUpperCase())
    };
  }

  const handleQuickStageUpdate = () => {
    if (nextStage) {
      onStageUpdate?.(nextStage?.value, `Quick advance to ${nextStage?.label}`);
    }
  };

  const handleQuickActivity = (activityType) => {
    onLogActivity?.({
      activity_type: activityType,
      notes: `Quick ${activityType} logged for opportunity: ${opportunity?.name}`
    });
  };

  return (
    <div className="space-y-6">
      {/* Quick Stage Update */}
      {nextStage && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-900 mb-3">Quick Actions</h3>
          <button
            onClick={handleQuickStageUpdate}
            className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          >
            <ArrowRight className="h-4 w-4 mr-2" />
            Advance to {nextStage?.label}
          </button>
        </div>
      )}
      {/* Communication Actions */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-gray-900 mb-3">Communication</h3>
        <div className="space-y-2">
          <button
            onClick={() => handleQuickActivity('phone call')}
            className="w-full inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Phone className="h-4 w-4 mr-2 text-gray-400" />
            Log Phone Call
          </button>
          <button
            onClick={() => handleQuickActivity('email')}
            className="w-full inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Mail className="h-4 w-4 mr-2 text-gray-400" />
            Log Email
          </button>
          <button
            onClick={() => handleQuickActivity('meeting')}
            className="w-full inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Calendar className="h-4 w-4 mr-2 text-gray-400" />
            Log Meeting
          </button>
        </div>
      </div>
      {/* Opportunity Summary Card */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-gray-900 mb-3">Summary</h3>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Bid Value:</span>
            <span className="font-medium text-gray-900">
              {opportunitiesService?.formatBidValue(opportunity?.bid_value, opportunity?.currency)}
            </span>
          </div>
          
          {opportunity?.probability && (
            <div className="flex justify-between">
              <span className="text-gray-500">Probability:</span>
              <span className="font-medium text-gray-900">{opportunity?.probability}%</span>
            </div>
          )}
          
          {opportunity?.bid_value && opportunity?.probability && (
            <div className="flex justify-between">
              <span className="text-gray-500">Weighted Value:</span>
              <span className="font-medium text-green-600">
                {opportunitiesService?.formatBidValue(
                  opportunitiesService?.calculateWeightedValue(opportunity?.bid_value, opportunity?.probability),
                  opportunity?.currency
                )}
              </span>
            </div>
          )}

          {opportunity?.expected_close_date && (
            <div className="flex justify-between">
              <span className="text-gray-500">Expected Close:</span>
              <span className="font-medium text-gray-900">
                {new Date(opportunity?.expected_close_date)?.toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </span>
            </div>
          )}

          <div className="flex justify-between">
            <span className="text-gray-500">Stage Progress:</span>
            <span className="font-medium text-gray-900">
              {opportunitiesService?.getStageProgress(opportunity?.stage)}%
            </span>
          </div>
        </div>
      </div>
      {/* Contact Information */}
      {(opportunity?.account?.email || opportunity?.account?.phone) && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-900 mb-3">Contact Info</h3>
          <div className="space-y-2">
            {opportunity?.account?.email && (
              <div className="flex items-center text-sm text-gray-600">
                <Mail className="h-4 w-4 mr-2 text-gray-400" />
                <a
                  href={`mailto:${opportunity?.account?.email}`}
                  className="text-blue-600 hover:text-blue-800"
                >
                  {opportunity?.account?.email}
                </a>
              </div>
            )}
            {opportunity?.account?.phone && (
              <div className="flex items-center text-sm text-gray-600">
                <Phone className="h-4 w-4 mr-2 text-gray-400" />
                <a
                  href={`tel:${opportunity?.account?.phone}`}
                  className="text-blue-600 hover:text-blue-800"
                >
                  {opportunity?.account?.phone}
                </a>
              </div>
            )}
          </div>
        </div>
      )}
      {/* Related Links */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-gray-900 mb-3">Related</h3>
        <div className="space-y-2">
          {opportunity?.account && (
            <a
              href={`/account-details/${opportunity?.account?.id}`}
              className="block text-sm text-blue-600 hover:text-blue-800"
            >
              View Account Details →
            </a>
          )}
          {opportunity?.property && (
            <a
              href={`/property-details/${opportunity?.property?.id}`}
              className="block text-sm text-blue-600 hover:text-blue-800"
            >
              View Property Details →
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuickActions;