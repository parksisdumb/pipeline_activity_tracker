import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Clock, AlertCircle, Plus, Eye, Trash2 } from 'lucide-react';
import { tasksService } from '../../../services/tasksService';
import { useAuth } from '../../../contexts/AuthContext';
import Button from '../../../components/ui/Button';

const YourTasks = ({ className = '', onCreateTask }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);
  const [error, setError] = useState(null);

  // Load tasks for current user
  const loadTasks = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      setError(null);
      const data = await tasksService?.getTasksWithDetails(user?.id, null, null);
      // Filter to show only pending and in_progress tasks for Today view
      const activeTasks = (data || [])?.filter(task => 
        task?.status === 'pending' || task?.status === 'in_progress'
      );
      setTasks(activeTasks?.slice(0, 5) || []); // Show max 5 tasks for Today view
    } catch (err) {
      console.error('Failed to load tasks:', err);
      setError('Unable to load your tasks. Please check your connection.');
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  // Update task status
  const handleUpdateStatus = async (taskId, newStatus) => {
    try {
      setUpdating(taskId);
      setError(null);
      await tasksService?.updateTaskStatus(taskId, newStatus);
      // Reload tasks to reflect changes
      await loadTasks();
    } catch (err) {
      console.error('Failed to update task status:', err);
      setError('Failed to update task. Please try again.');
    } finally {
      setUpdating(null);
    }
  };

  // Delete task
  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;

    try {
      setUpdating(taskId);
      setError(null);
      const { error: deleteError } = await tasksService?.deleteTask(taskId);
      if (deleteError) throw deleteError;
      // Reload tasks to reflect changes
      await loadTasks();
    } catch (err) {
      console.error('Failed to delete task:', err);
      setError('Failed to delete task. Please try again.');
    } finally {
      setUpdating(null);
    }
  };

  // Handle create task button click
  const handleCreateTaskClick = () => {
    if (onCreateTask) {
      onCreateTask();
    } else {
      // Fallback to navigation if onCreateTask prop is not provided
      navigate('/task-management');
    }
  };

  // Get priority badge styling
  const getPriorityStyle = (priority) => {
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

  // Get status icon
  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'in_progress':
        return <Clock className="w-4 h-4 text-blue-600" />;
      case 'overdue':
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  // Format due date
  const formatDueDate = (dueDate) => {
    if (!dueDate) return null;
    
    const date = new Date(dueDate);
    const now = new Date();
    const diffTime = date - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return <span className="text-red-600 font-medium">Overdue</span>;
    } else if (diffDays === 0) {
      return <span className="text-orange-600 font-medium">Due today</span>;
    } else if (diffDays === 1) {
      return <span className="text-yellow-600">Due tomorrow</span>;
    } else if (diffDays <= 7) {
      return <span className="text-blue-600">Due in {diffDays} days</span>;
    } else {
      return <span className="text-gray-600">Due {date?.toLocaleDateString()}</span>;
    }
  };

  useEffect(() => {
    loadTasks();
  }, [user?.id]);

  // Set up real-time subscription for task changes
  useEffect(() => {
    if (!user?.id) return;

    const unsubscribe = tasksService?.subscribeToTasks(() => {
      loadTasks(); // Reload tasks when changes occur
    });

    return unsubscribe;
  }, [user?.id]);

  return (
    <div className={`bg-card rounded-lg border border-border ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Your Tasks</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Active tasks assigned to you
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCreateTaskClick}
              className="flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Add Task</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/task-management')}
              className="flex items-center space-x-2"
            >
              <Eye className="w-4 h-4" />
              <span>View All</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
            <p className="text-sm text-destructive">{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={loadTasks}
              className="mt-2"
            >
              Try Again
            </Button>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="space-y-4">
            {[1, 2, 3]?.map(i => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && tasks?.length === 0 && (
          <div className="text-center py-8">
            <CheckCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h4 className="text-lg font-medium text-foreground mb-2">
              All caught up! 🎉
            </h4>
            <p className="text-sm text-muted-foreground mb-4">
              You don't have any active tasks right now.
            </p>
            <Button
              onClick={handleCreateTaskClick}
              className="flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Create Your First Task</span>
            </Button>
          </div>
        )}

        {/* Tasks List */}
        {!loading && !error && tasks?.length > 0 && (
          <div className="space-y-4">
            {tasks?.map(task => (
              <div
                key={task?.id}
                className="p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    {/* Task Title & Status */}
                    <div className="flex items-center space-x-2 mb-2">
                      {getStatusIcon(task?.status)}
                      <h4 className="text-sm font-medium text-foreground truncate">
                        {task?.title || 'Untitled Task'}
                      </h4>
                      <span className={`
                        inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border
                        ${getPriorityStyle(task?.priority)}
                      `}>
                        {task?.priority || 'medium'}
                      </span>
                    </div>

                    {/* Task Description */}
                    {task?.description && (
                      <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                        {task?.description}
                      </p>
                    )}

                    {/* Due Date & Category */}
                    <div className="flex items-center space-x-4 text-xs">
                      {task?.due_date && (
                        <div className="flex items-center space-x-1">
                          <Clock className="w-3 h-3" />
                          {formatDueDate(task?.due_date)}
                        </div>
                      )}
                      {task?.category && (
                        <span className="text-muted-foreground">
                          {task?.category?.replace(/_/g, ' ')}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-1 ml-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/task-details/${task?.id}`)}
                      className="p-1 h-auto"
                      title="View Details"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    
                    {task?.status === 'pending' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleUpdateStatus(task?.id, 'in_progress')}
                        disabled={updating === task?.id}
                        className="p-1 h-auto text-blue-600 hover:text-blue-700"
                        title="Start Task"
                      >
                        <Clock className="w-4 h-4" />
                      </Button>
                    )}
                    
                    {task?.status === 'in_progress' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleUpdateStatus(task?.id, 'completed')}
                        disabled={updating === task?.id}
                        className="p-1 h-auto text-green-600 hover:text-green-700"
                        title="Complete Task"
                      >
                        <CheckCircle className="w-4 h-4" />
                      </Button>
                    )}
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteTask(task?.id)}
                      disabled={updating === task?.id}
                      className="p-1 h-auto text-red-600 hover:text-red-700"
                      title="Delete Task"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* View All Link */}
        {!loading && !error && tasks?.length > 0 && (
          <div className="mt-6 text-center">
            <Button
              variant="outline"
              onClick={() => navigate('/task-management')}
              className="w-full"
            >
              View All Tasks
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default YourTasks;