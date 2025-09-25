import React from 'react';
import { Calendar, Clock, User, Building2 } from 'lucide-react';

export function TaskInformation({ task }) {
  const formatDate = (dateString) => {
    if (!dateString) return 'Not set';
    return new Date(dateString)?.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getEntityIcon = (entityType) => {
    switch (entityType) {
      case 'account':
        return <Building2 className="h-4 w-4" />;
      case 'property':
        return <Building2 className="h-4 w-4" />;
      case 'contact':
        return <User className="h-4 w-4" />;
      case 'opportunity':
        return <Calendar className="h-4 w-4" />;
      default:
        return <Building2 className="h-4 w-4" />;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Task Information</h2>
      <div className="space-y-4">
        {/* Description */}
        <div>
          <label className="text-sm font-medium text-gray-700">Description</label>
          <div className="mt-1 p-3 bg-gray-50 rounded-lg border">
            <p className="text-gray-900 whitespace-pre-wrap">
              {task?.description || 'No description provided'}
            </p>
          </div>
        </div>

        {/* Entity Context */}
        {task?.entity_type && task?.entity_name && (
          <div>
            <label className="text-sm font-medium text-gray-700">Related Entity</label>
            <div className="mt-1 p-3 bg-gray-50 rounded-lg border">
              <div className="flex items-center space-x-2">
                {getEntityIcon(task?.entity_type)}
                <span className="text-gray-900 font-medium">{task?.entity_name}</span>
                <span className="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded">
                  {task?.entity_type?.charAt(0)?.toUpperCase() + task?.entity_type?.slice(1)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Timeline Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700 flex items-center space-x-1">
              <Calendar className="h-4 w-4" />
              <span>Created</span>
            </label>
            <div className="mt-1 p-3 bg-gray-50 rounded-lg border">
              <p className="text-gray-900">{formatDate(task?.created_at)}</p>
            </div>
          </div>
          
          <div>
            <label className="text-sm font-medium text-gray-700 flex items-center space-x-1">
              <Clock className="h-4 w-4" />
              <span>Last Updated</span>
            </label>
            <div className="mt-1 p-3 bg-gray-50 rounded-lg border">
              <p className="text-gray-900">{formatDate(task?.updated_at)}</p>
            </div>
          </div>
        </div>

        {/* Completion Time */}
        {task?.completed_at && (
          <div>
            <label className="text-sm font-medium text-gray-700 flex items-center space-x-1">
              <Clock className="h-4 w-4 text-green-600" />
              <span>Completed</span>
            </label>
            <div className="mt-1 p-3 bg-green-50 rounded-lg border border-green-200">
              <p className="text-green-900">{formatDate(task?.completed_at)}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}