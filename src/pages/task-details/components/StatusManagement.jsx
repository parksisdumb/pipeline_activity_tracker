import React, { useState } from 'react';
import { CheckCircle, Clock, Play, XCircle } from 'lucide-react';
import Icon from '../../../components/AppIcon';


export function StatusManagement({ task, onStatusChange }) {
  const [isUpdating, setIsUpdating] = useState(false);

  const statusOptions = [
    {
      value: 'pending',
      label: 'Pending',
      icon: Clock,
      color: 'text-gray-600 bg-gray-100 hover:bg-gray-200 border-gray-300'
    },
    {
      value: 'in_progress',
      label: 'In Progress',
      icon: Play,
      color: 'text-blue-600 bg-blue-100 hover:bg-blue-200 border-blue-300'
    },
    {
      value: 'completed',
      label: 'Completed',
      icon: CheckCircle,
      color: 'text-green-600 bg-green-100 hover:bg-green-200 border-green-300'
    },
    {
      value: 'cancelled',
      label: 'Cancelled',
      icon: XCircle,
      color: 'text-red-600 bg-red-100 hover:bg-red-200 border-red-300'
    }
  ];

  const handleStatusUpdate = async (newStatus) => {
    if (newStatus === task?.status) return;
    
    setIsUpdating(true);
    try {
      await onStatusChange(newStatus);
    } finally {
      setIsUpdating(false);
    }
  };

  const currentStatus = statusOptions?.find(option => option?.value === task?.status);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Status Management</h2>
      <div className="space-y-4">
        {/* Current Status Display */}
        <div>
          <label className="text-sm font-medium text-gray-700">Current Status</label>
          <div className="mt-1 p-3 bg-gray-50 rounded-lg border">
            <div className="flex items-center space-x-2">
              {currentStatus?.icon && (
                <currentStatus.icon className="h-5 w-5 text-gray-600" />
              )}
              <span className="text-gray-900 font-medium">
                {currentStatus?.label || 'Unknown Status'}
              </span>
            </div>
          </div>
        </div>

        {/* Status Update Buttons */}
        <div>
          <label className="text-sm font-medium text-gray-700 mb-2 block">
            Update Status
          </label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {statusOptions?.map((status) => {
              const Icon = status?.icon;
              const isCurrentStatus = status?.value === task?.status;
              
              return (
                <button
                  key={status?.value}
                  onClick={() => handleStatusUpdate(status?.value)}
                  disabled={isUpdating || isCurrentStatus}
                  className={`
                    flex flex-col items-center p-3 rounded-lg border transition-colors
                    ${isCurrentStatus 
                      ? 'bg-gray-100 border-gray-300 cursor-not-allowed opacity-50'
                      : status?.color
                    }
                    ${isUpdating ? 'opacity-50 cursor-not-allowed' : ''}
                  `}
                >
                  <Icon className="h-5 w-5 mb-1" />
                  <span className="text-xs font-medium">{status?.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Progress Notes */}
        {task?.status === 'completed' && task?.completed_at && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-start space-x-2">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-green-800">Task Completed</p>
                <p className="text-xs text-green-600">
                  Completed on {new Date(task.completed_at)?.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Due Date Warning */}
        {task?.due_date && task?.status !== 'completed' && (
          <div className={`p-3 rounded-lg border ${
            new Date(task.due_date) < new Date()
              ? 'bg-red-50 border-red-200'
              : new Date(task.due_date) < new Date(Date.now() + 24 * 60 * 60 * 1000)
              ? 'bg-yellow-50 border-yellow-200' :'bg-blue-50 border-blue-200'
          }`}>
            <div className="flex items-start space-x-2">
              <Clock className={`h-5 w-5 mt-0.5 ${
                new Date(task.due_date) < new Date()
                  ? 'text-red-600'
                  : new Date(task.due_date) < new Date(Date.now() + 24 * 60 * 60 * 1000)
                  ? 'text-yellow-600' :'text-blue-600'
              }`} />
              <div>
                <p className={`text-sm font-medium ${
                  new Date(task.due_date) < new Date()
                    ? 'text-red-800'
                    : new Date(task.due_date) < new Date(Date.now() + 24 * 60 * 60 * 1000)
                    ? 'text-yellow-800' :'text-blue-800'
                }`}>
                  {new Date(task.due_date) < new Date()
                    ? 'Task Overdue'
                    : new Date(task.due_date) < new Date(Date.now() + 24 * 60 * 60 * 1000)
                    ? 'Due Soon' :'Due Date Set'
                  }
                </p>
                <p className={`text-xs ${
                  new Date(task.due_date) < new Date()
                    ? 'text-red-600'
                    : new Date(task.due_date) < new Date(Date.now() + 24 * 60 * 60 * 1000)
                    ? 'text-yellow-600' :'text-blue-600'
                }`}>
                  Due: {new Date(task.due_date)?.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}