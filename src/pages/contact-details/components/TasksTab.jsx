import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import { tasksService } from '../../../services/tasksService';

const TasksTab = ({ contactId, contact, onCreateTask }) => {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (contactId) {
      loadTasks();
    }
  }, [contactId]);

  const loadTasks = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await tasksService?.getTasksByContactId(contactId);
      
      if (result?.error) {
        throw new Error(result?.error?.message || 'Failed to load tasks');
      }

      setTasks(result?.data || []);
    } catch (err) {
      console.error('Error loading tasks:', err);
      setError(err?.message || 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const handleTaskClick = (taskId) => {
    navigate(`/task-details/${taskId}`);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'in_progress':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'overdue':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent':
        return 'text-red-600';
      case 'high':
        return 'text-orange-600';
      case 'medium':
        return 'text-blue-600';
      case 'low':
        return 'text-gray-600';
      default:
        return 'text-gray-600';
    }
  };

  const formatDate = (date) => {
    if (!date) return 'No due date';
    return new Date(date)?.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return 'CheckCircle';
      case 'in_progress':
        return 'Clock';
      case 'overdue':
        return 'AlertTriangle';
      default:
        return 'Circle';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
        <span className="ml-2 text-muted-foreground">Loading tasks...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-3">
          <Icon name="AlertTriangle" size={20} className="text-destructive" />
        </div>
        <p className="text-destructive font-medium mb-2">Failed to Load Tasks</p>
        <p className="text-muted-foreground text-sm mb-4">{error}</p>
        <Button
          variant="outline"
          size="sm"
          onClick={loadTasks}
        >
          <Icon name="RefreshCw" size={16} className="mr-2" />
          Try Again
        </Button>
      </div>
    );
  }

  if (tasks?.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-4">
          <Icon name="CheckSquare" size={24} className="text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium text-foreground mb-2">No Tasks Yet</h3>
        <p className="text-muted-foreground mb-6 max-w-md mx-auto">
          Create tasks to track follow-ups, meetings, and action items related to {contact?.name || 'this contact'}.
        </p>
        <Button onClick={onCreateTask} className="inline-flex items-center">
          <Icon name="Plus" size={16} className="mr-2" />
          Create First Task
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Create Task Button */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-foreground">
            Tasks ({tasks?.length})
          </h3>
          <p className="text-sm text-muted-foreground">
            Tasks related to {contact?.name || 'this contact'}
          </p>
        </div>
        <Button onClick={onCreateTask} size="sm">
          <Icon name="Plus" size={16} className="mr-2" />
          Create Task
        </Button>
      </div>
      {/* Tasks List */}
      <div className="space-y-3">
        {tasks?.map((task) => (
          <div
            key={task?.id}
            onClick={() => handleTaskClick(task?.id)}
            className="p-4 bg-card border border-border rounded-lg hover:border-primary/50 cursor-pointer transition-all duration-200 hover:shadow-sm"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-start space-x-3 flex-1">
                <div className={`p-1 rounded-full ${task?.status === 'completed' ? 'bg-green-100' : 'bg-gray-100'}`}>
                  <Icon 
                    name={getStatusIcon(task?.status)} 
                    size={16} 
                    className={task?.status === 'completed' ? 'text-green-600' : 'text-gray-600'} 
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-foreground mb-1 truncate">
                    {task?.title}
                  </h4>
                  {task?.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                      {task?.description}
                    </p>
                  )}
                  <div className="flex items-center space-x-4 text-xs">
                    <span className={`px-2 py-1 rounded-full border ${getStatusColor(task?.status)}`}>
                      {task?.status?.replace('_', ' ')?.toUpperCase()}
                    </span>
                    <span className={`font-medium ${getPriorityColor(task?.priority)}`}>
                      {task?.priority?.toUpperCase()} PRIORITY
                    </span>
                    {task?.assigned_user && (
                      <span className="text-muted-foreground">
                        Assigned to {task?.assigned_user?.full_name}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="text-right ml-4 flex-shrink-0">
                {task?.due_date && (
                  <div className={`text-xs ${new Date(task?.due_date) < new Date() && task?.status !== 'completed' ? 'text-red-600 font-medium' : 'text-muted-foreground'}`}>
                    <Icon name="Calendar" size={12} className="inline mr-1" />
                    {formatDate(task?.due_date)}
                  </div>
                )}
              </div>
            </div>

            {/* Task metadata */}
            <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/50">
              <div className="flex items-center space-x-3">
                {task?.category && (
                  <span className="capitalize">
                    {task?.category?.replace('_', ' ')}
                  </span>
                )}
                <span>
                  Created {new Date(task?.created_at)?.toLocaleDateString()}
                </span>
              </div>
              <Icon name="ChevronRight" size={16} className="text-muted-foreground/50" />
            </div>
          </div>
        ))}
      </div>
      {/* Load more / pagination could go here in the future */}
      {tasks?.length > 0 && (
        <div className="text-center pt-4">
          <p className="text-sm text-muted-foreground">
            Showing {tasks?.length} {tasks?.length === 1 ? 'task' : 'tasks'}
          </p>
        </div>
      )}
    </div>
  );
};

export default TasksTab;