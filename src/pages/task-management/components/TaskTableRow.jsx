import React, { useState } from 'react';
import { CheckCircle, Clock, AlertTriangle, Building2, Home, User, Target, MoreHorizontal } from 'lucide-react';

const TaskTableRow = ({ task, onStatusUpdate, onTaskClick }) => {
  const [showActions, setShowActions] = useState(false);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'in_progress':
        return <Clock className="w-5 h-5 text-blue-500" />;
      case 'overdue':
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-500" />;
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'high':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'medium':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getEntityIcon = (task) => {
    if (task?.account_name) return <Building2 className="w-4 h-4" />;
    if (task?.property_name) return <Home className="w-4 h-4" />;
    if (task?.contact_name) return <User className="w-4 h-4" />;
    if (task?.opportunity_name) return <Target className="w-4 h-4" />;
    return null;
  };

  const getEntityName = (task) => {
    return task?.account_name || task?.property_name || task?.contact_name || task?.opportunity_name || 'No entity';
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'No due date';
    const date = new Date(dateStr);
    return date?.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isOverdue = (dueDateStr, status) => {
    if (!dueDateStr || status === 'completed') return false;
    return new Date(dueDateStr) < new Date();
  };

  const formatCategory = (category) => {
    return category?.replace(/_/g, ' ')?.replace(/\b\w/g, l => l?.toUpperCase()) || 'Other';
  };

  return (
    <tr className="hover:bg-gray-50 cursor-pointer" onClick={() => onTaskClick?.(task)}>
      <td className="px-6 py-4">
        <div>
          <div className="text-sm font-medium text-gray-900">
            {task?.title}
          </div>
          {task?.description && (
            <div className="text-sm text-gray-500 mt-1 line-clamp-2">
              {task?.description}
            </div>
          )}
          <div className="text-xs text-gray-400 mt-1">
            {formatCategory(task?.category)}
          </div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          {getStatusIcon(task?.status)}
          <span className="ml-2 text-sm text-gray-900 capitalize">
            {task?.status?.replace('_', ' ')}
          </span>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getPriorityColor(task?.priority)}`}>
          {task?.priority}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm text-gray-900">{task?.assigned_to_name || 'Unassigned'}</div>
        {task?.assigned_by_name && (
          <div className="text-xs text-gray-500">by {task?.assigned_by_name}</div>
        )}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center text-sm text-gray-900">
          {getEntityIcon(task)}
          <span className="ml-2">{getEntityName(task)}</span>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className={`text-sm ${isOverdue(task?.due_date, task?.status) ? 'text-red-600 font-medium' : 'text-gray-900'}`}>
          {formatDate(task?.due_date)}
        </div>
        {isOverdue(task?.due_date, task?.status) && (
          <div className="text-xs text-red-500 font-medium">Overdue</div>
        )}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
        <div className="flex items-center space-x-2">
          {task?.status === 'pending' && (
            <button
              onClick={(e) => {
                e?.stopPropagation();
                onStatusUpdate(task?.id, 'in_progress');
              }}
              className="text-blue-600 hover:text-blue-900 px-2 py-1 rounded hover:bg-blue-50"
            >
              Start
            </button>
          )}
          {task?.status === 'in_progress' && (
            <button
              onClick={(e) => {
                e?.stopPropagation();
                onStatusUpdate(task?.id, 'completed');
              }}
              className="text-green-600 hover:text-green-900 px-2 py-1 rounded hover:bg-green-50"
            >
              Complete
            </button>
          )}
          {task?.status !== 'completed' && (
            <button
              onClick={(e) => {
                e?.stopPropagation();
                onStatusUpdate(task?.id, 'completed');
              }}
              className="text-green-600 hover:text-green-900 px-2 py-1 rounded hover:bg-green-50"
              title="Mark as completed"
            >
              ✓
            </button>
          )}
          
          {/* More actions dropdown trigger */}
          <div className="relative">
            <button
              onClick={(e) => {
                e?.stopPropagation();
                setShowActions(!showActions);
              }}
              className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-50"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
            
            {showActions && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border">
                <div className="py-1">
                  <button className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                    Edit Task
                  </button>
                  <button className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                    Add Comment
                  </button>
                  <button className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100">
                    Delete Task
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </td>
    </tr>
  );
};

export default TaskTableRow;