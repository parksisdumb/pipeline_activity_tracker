import React, { useState } from 'react';
import { Plus, Clock, User, Phone, Mail, FileText, Calendar } from 'lucide-react';

const ActivitiesTab = ({ activities = [], loading = false, onLogActivity }) => {
  const [showAddActivity, setShowAddActivity] = useState(false);

  const getActivityIcon = (type) => {
    switch (type?.toLowerCase()) {
      case 'phone call':
        return <Phone className="h-4 w-4" />;
      case 'email':
        return <Mail className="h-4 w-4" />;
      case 'meeting':
        return <Calendar className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getOutcomeColor = (outcome) => {
    const colors = {
      'successful': 'bg-green-100 text-green-800',
      'callback requested': 'bg-yellow-100 text-yellow-800',
      'not interested': 'bg-red-100 text-red-800',
      'interested': 'bg-blue-100 text-blue-800',
      'meeting scheduled': 'bg-purple-100 text-purple-800'
    };
    return colors?.[outcome?.toLowerCase()] || 'bg-gray-100 text-gray-800';
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString)?.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        {[...Array(3)]?.map((_, i) => (
          <div key={i} className="border border-gray-200 rounded-lg p-4">
            <div className="flex space-x-3">
              <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-3/4 mb-1"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Add Activity Button */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">Recent Activities</h3>
        <button
          onClick={() => setShowAddActivity(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <Plus className="h-4 w-4 mr-2" />
          Log Activity
        </button>
      </div>
      {/* Activities List */}
      {activities?.length > 0 ? (
        <div className="space-y-4">
          {activities?.map((activity) => (
            <div key={activity?.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
              <div className="flex space-x-3">
                {/* Activity Icon */}
                <div className="flex-shrink-0">
                  <div className="p-2 bg-blue-50 rounded-full text-blue-600">
                    {getActivityIcon(activity?.activity_type)}
                  </div>
                </div>

                {/* Activity Content */}
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <h4 className="text-sm font-medium text-gray-900">
                        {activity?.activity_type?.replace(/([A-Z])/g, ' $1')?.trim()}
                      </h4>
                      {activity?.outcome && (
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getOutcomeColor(activity?.outcome)}`}>
                          {activity?.outcome?.replace(/_/g, ' ')?.replace(/\b\w/g, l => l?.toUpperCase())}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center text-xs text-gray-500">
                      <Clock className="h-3 w-3 mr-1" />
                      {formatDate(activity?.created_at)}
                    </div>
                  </div>

                  {/* Activity Details */}
                  {activity?.notes && (
                    <div className="mt-2">
                      <p className="text-sm text-gray-700">{activity?.notes}</p>
                    </div>
                  )}

                  {/* User Info */}
                  {activity?.user && (
                    <div className="mt-2 flex items-center text-xs text-gray-500">
                      <User className="h-3 w-3 mr-1" />
                      {activity?.user?.full_name || activity?.user?.email}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Clock className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No activities yet</h3>
          <p className="mt-1 text-sm text-gray-500">
            Start logging activities related to this opportunity.
          </p>
          <div className="mt-6">
            <button
              onClick={() => setShowAddActivity(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Plus className="h-4 w-4 mr-2" />
              Log First Activity
            </button>
          </div>
        </div>
      )}
      {/* Simple Add Activity Modal */}
      {showAddActivity && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-lg shadow-lg rounded-md bg-white">
            <div className="mb-4">
              <h3 className="text-lg font-medium text-gray-900">Log Activity</h3>
              <p className="mt-1 text-sm text-gray-500">
                Record an activity related to this opportunity
              </p>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Activity Type
                </label>
                <select className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white focus:ring-blue-500 focus:border-blue-500">
                  <option value="phone call">Phone Call</option>
                  <option value="email">Email</option>
                  <option value="meeting">Meeting</option>
                  <option value="site visit">Site Visit</option>
                  <option value="proposal sent">Proposal Sent</option>
                  <option value="follow-up">Follow-up</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  placeholder="Enter activity details..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Outcome
                </label>
                <select className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white focus:ring-blue-500 focus:border-blue-500">
                  <option value="">Select outcome</option>
                  <option value="successful">Successful</option>
                  <option value="no answer">No Answer</option>
                  <option value="callback requested">Callback Requested</option>
                  <option value="not interested">Not Interested</option>
                  <option value="interested">Interested</option>
                  <option value="meeting scheduled">Meeting Scheduled</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowAddActivity(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  // TODO: Implement activity logging
                  setShowAddActivity(false);
                }}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Log Activity
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActivitiesTab;