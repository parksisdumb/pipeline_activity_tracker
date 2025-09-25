import React from 'react';
import { Edit3, Trash2, CheckCircle, Play, Clock, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Icon from '../../../components/AppIcon';


export function QuickActions({ task, onEdit, onDelete, onStatusChange }) {
  const navigate = useNavigate();

  const getEntityUrl = (entityType, entityId) => {
    switch (entityType) {
      case 'account':
        return `/account-details/${entityId}`;
      case 'property':
        return `/property-details/${entityId}`;
      case 'contact':
        return `/contact-details/${entityId}`;
      case 'opportunity':
        return `/opportunity-details/${entityId}`;
      default:
        return null;
    }
  };

  const handleViewEntity = () => {
    if (!task?.entity_type) return;
    
    const entityId = task?.account_id || task?.property_id || task?.contact_id || task?.opportunity_id;
    const url = getEntityUrl(task?.entity_type, entityId);
    
    if (url) {
      navigate(url);
    }
  };

  const statusActions = [
    {
      value: 'in_progress',
      label: 'Start Task',
      icon: Play,
      color: 'bg-blue-600 hover:bg-blue-700',
      condition: task?.status === 'pending'
    },
    {
      value: 'completed',
      label: 'Complete',
      icon: CheckCircle,
      color: 'bg-green-600 hover:bg-green-700',
      condition: task?.status !== 'completed'
    },
    {
      value: 'pending',
      label: 'Reset to Pending',
      icon: Clock,
      color: 'bg-gray-600 hover:bg-gray-700',
      condition: task?.status === 'cancelled'
    }
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
      <div className="space-y-3">
        {/* Status Actions */}
        {statusActions?.filter(action => action?.condition)?.map((action) => {
            const Icon = action?.icon;
            return (
              <button
                key={action?.value}
                onClick={() => onStatusChange(action?.value)}
                className={`w-full flex items-center space-x-2 px-4 py-2 text-white rounded-lg transition-colors ${action?.color}`}
              >
                <Icon className="h-4 w-4" />
                <span>{action?.label}</span>
              </button>
            );
          })}

        {/* Edit Task */}
        <button
          onClick={onEdit}
          className="w-full flex items-center space-x-2 px-4 py-2 text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
        >
          <Edit3 className="h-4 w-4" />
          <span>Edit Task</span>
        </button>

        {/* View Related Entity */}
        {task?.entity_type && task?.entity_name && (
          <button
            onClick={handleViewEntity}
            className="w-full flex items-center space-x-2 px-4 py-2 text-purple-700 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors"
          >
            <ExternalLink className="h-4 w-4" />
            <span>View {task?.entity_type?.charAt(0)?.toUpperCase() + task?.entity_type?.slice(1)}</span>
          </button>
        )}

        {/* Delete Task */}
        <button
          onClick={onDelete}
          className="w-full flex items-center space-x-2 px-4 py-2 text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
        >
          <Trash2 className="h-4 w-4" />
          <span>Delete Task</span>
        </button>
      </div>
      {/* Task Info Summary */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Task Summary</h4>
        <div className="space-y-2 text-xs text-gray-600">
          <div className="flex justify-between">
            <span>Priority:</span>
            <span className={`px-2 py-1 rounded text-xs font-medium ${
              task?.priority === 'urgent' ? 'bg-red-100 text-red-800' :
              task?.priority === 'high' ? 'bg-orange-100 text-orange-800' :
              task?.priority === 'medium'? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
            }`}>
              {task?.priority?.charAt(0)?.toUpperCase() + task?.priority?.slice(1)}
            </span>
          </div>
          
          <div className="flex justify-between">
            <span>Status:</span>
            <span className={`px-2 py-1 rounded text-xs font-medium ${
              task?.status === 'completed' ? 'bg-green-100 text-green-800' :
              task?.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
              task?.status === 'pending'? 'bg-gray-100 text-gray-800' : 'bg-red-100 text-red-800'
            }`}>
              {task?.status?.replace('_', ' ')?.charAt(0)?.toUpperCase() + task?.status?.replace('_', ' ')?.slice(1)}
            </span>
          </div>
          
          {task?.due_date && (
            <div className="flex justify-between">
              <span>Due:</span>
              <span className={
                new Date(task.due_date) < new Date() && task?.status !== 'completed'
                  ? 'text-red-600 font-medium' :'text-gray-600'
              }>
                {new Date(task.due_date)?.toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}