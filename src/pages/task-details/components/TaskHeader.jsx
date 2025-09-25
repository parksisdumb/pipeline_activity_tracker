import React from 'react';
import { ArrowLeft, Edit3, Trash2 } from 'lucide-react';

export function TaskHeader({ task, onBack, onEdit, onDelete }) {
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'pending':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

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

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-4">
          <button
            onClick={onBack}
            className="mt-1 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-2">
              <h1 className="text-2xl font-bold text-gray-900">{task?.title || 'Untitled Task'}</h1>
              
              <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getPriorityColor(task?.priority)}`}>
                {task?.priority?.charAt(0)?.toUpperCase() + task?.priority?.slice(1) || 'Medium'}
              </span>
              
              <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(task?.status)}`}>
                {task?.status?.replace('_', ' ')?.charAt(0)?.toUpperCase() + task?.status?.replace('_', ' ')?.slice(1) || 'Pending'}
              </span>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
              <div>
                <span className="font-medium">Assigned to:</span>
                <br />
                {task?.assigned_to_name || 'Unassigned'}
              </div>
              
              <div>
                <span className="font-medium">Created by:</span>
                <br />
                {task?.created_by_name || 'Unknown'}
              </div>
              
              <div>
                <span className="font-medium">Due date:</span>
                <br />
                {formatDate(task?.due_date)}
              </div>
              
              <div>
                <span className="font-medium">Entity:</span>
                <br />
                {task?.entity_name || 'No entity'}
                {task?.entity_type && (
                  <span className="text-gray-400 ml-1">
                    ({task?.entity_type})
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={onEdit}
            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            <Edit3 className="h-5 w-5" />
          </button>
          
          <button
            onClick={onDelete}
            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <Trash2 className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}