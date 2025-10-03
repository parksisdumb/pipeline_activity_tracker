import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Clock, AlertCircle, Plus, Eye, Trash2, Calendar, Target } from 'lucide-react';
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
  const [taskCounts, setTaskCounts] = useState({
    overdue: 0,
    dueToday: 0,
    upcoming: 0
  });

  // Enhanced task loading with priority sorting
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

      // Sort tasks by: overdue → due today → due in 3 days, then by priority
      const sortedTasks = activeTasks?.sort((a, b) => {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const threeDaysFromNow = new Date(today);
        threeDaysFromNow?.setDate(today?.getDate() + 3);

        const aDue = a?.due_date ? new Date(a.due_date) : null;
        const bDue = b?.due_date ? new Date(b.due_date) : null;

        // Priority weights
        const priorityWeight = { urgent: 4, high: 3, medium: 2, low: 1 };
        const aPriority = priorityWeight?.[a?.priority] || 2;
        const bPriority = priorityWeight?.[b?.priority] || 2;

        // Categorize tasks by due date
        const getDateCategory = (dueDate) => {
          if (!dueDate) return 4; // No due date = lowest priority
          if (dueDate < today) return 1; // Overdue
          if (dueDate?.toDateString() === today?.toDateString()) return 2; // Due today
          if (dueDate <= threeDaysFromNow) return 3; // Upcoming (3 days)
          return 4; // Future
        };

        const aCategory = getDateCategory(aDue);
        const bCategory = getDateCategory(bDue);

        // Sort by category first, then priority
        if (aCategory !== bCategory) {
          return aCategory - bCategory;
        }
        return bPriority - aPriority; // Higher priority first within same category
      });

      // Calculate task counts for badges
      const counts = { overdue: 0, dueToday: 0, upcoming: 0 };
      const today = new Date();
      const todayStr = today?.toDateString();
      const threeDaysFromNow = new Date(today);
      threeDaysFromNow?.setDate(today?.getDate() + 3);

      activeTasks?.forEach(task => {
        if (task?.due_date) {
          const dueDate = new Date(task.due_date);
          if (dueDate < today) {
            counts.overdue++;
          } else if (dueDate?.toDateString() === todayStr) {
            counts.dueToday++;
          } else if (dueDate <= threeDaysFromNow) {
            counts.upcoming++;
          }
        }
      });

      setTaskCounts(counts);
      setTasks(sortedTasks?.slice(0, 5) || []); // Show max 5 tasks for Today view
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

  // Enhanced priority styling
  const getPriorityStyle = (priority) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800 border-red-300 shadow-sm';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-300 shadow-sm';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300 shadow-sm';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-300 shadow-sm';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300 shadow-sm';
    }
  };

  // Enhanced status icon with animations
  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-600 animate-pulse" />;
      case 'in_progress':
        return <Clock className="w-4 h-4 text-blue-600 animate-spin" style={{animationDuration: '3s'}} />;
      case 'overdue':
        return <AlertCircle className="w-4 h-4 text-red-600 animate-bounce" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  // Enhanced due date formatting with badges
  const formatDueDate = (dueDate) => {
    if (!dueDate) return null;
    
    const date = new Date(dueDate);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const diffTime = date - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200 animate-pulse">
          <AlertCircle className="w-3 h-3 mr-1" />
          Overdue
        </span>
      );
    } else if (diffDays === 0) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800 border border-orange-200">
          <Target className="w-3 h-3 mr-1" />
          Due Today
        </span>
      );
    } else if (diffDays === 1) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-200">
          <Calendar className="w-3 h-3 mr-1" />
          Tomorrow
        </span>
      );
    } else if (diffDays <= 3) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
          <Calendar className="w-3 h-3 mr-1" />
          {diffDays} days
        </span>
      );
    } else {
      return (
        <span className="text-xs text-gray-600">
          {date?.toLocaleDateString()}
        </span>
      );
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
      {/* Enhanced Header with Task Count Badges */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Your Tasks</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Prioritized by urgency and importance
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

        {/* Task Count Badges */}
        <div className="flex items-center space-x-4">
          {taskCounts?.overdue > 0 && (
            <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800 border border-red-200">
              <AlertCircle className="w-4 h-4 mr-1" />
              {taskCounts?.overdue} Overdue
            </div>
          )}
          {taskCounts?.dueToday > 0 && (
            <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-orange-100 text-orange-800 border border-orange-200">
              <Target className="w-4 h-4 mr-1" />
              {taskCounts?.dueToday} Due Today
            </div>
          )}
          {taskCounts?.upcoming > 0 && (
            <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 border border-blue-200">
              <Calendar className="w-4 h-4 mr-1" />
              {taskCounts?.upcoming} Upcoming
            </div>
          )}
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

        {/* Enhanced Empty State */}
        {!loading && !error && tasks?.length === 0 && (
          <div className="text-center py-8">
            <CheckCircle className="mx-auto h-12 w-12 text-green-500 mb-4 animate-bounce" />
            <h4 className="text-lg font-medium text-foreground mb-2">
              All caught up! 🎉
            </h4>
            <p className="text-sm text-muted-foreground mb-4">
              You don't have any active tasks right now. Perfect time to plan your next activities!
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

        {/* Enhanced Tasks List */}
        {!loading && !error && tasks?.length > 0 && (
          <div className="space-y-4">
            {tasks?.map(task => {
              const isOverdue = task?.due_date && new Date(task.due_date) < new Date();
              const isDueToday = task?.due_date && new Date(task.due_date)?.toDateString() === new Date()?.toDateString();
              
              return (
                <div
                  key={task?.id}
                  className={`
                    p-4 border rounded-lg transition-all duration-200 hover:shadow-md
                    ${isOverdue ? 'border-red-200 bg-red-50' : isDueToday ? 'border-orange-200 bg-orange-50' : 'border-border bg-background hover:bg-muted/20'}
                  `}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      {/* Task Title, Status & Priority */}
                      <div className="flex items-center space-x-2 mb-2">
                        {getStatusIcon(task?.status)}
                        <h4 className="text-sm font-medium text-foreground truncate">
                          {task?.title || 'Untitled Task'}
                        </h4>
                        <span className={`
                          inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border
                          ${getPriorityStyle(task?.priority)}
                        `}>
                          {(task?.priority || 'medium')?.toUpperCase()}
                        </span>
                      </div>

                      {/* Task Description */}
                      {task?.description && (
                        <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                          {task?.description}
                        </p>
                      )}

                      {/* Due Date & Category */}
                      <div className="flex items-center space-x-3 text-xs">
                        {task?.due_date && (
                          <div className="flex items-center">
                            {formatDueDate(task?.due_date)}
                          </div>
                        )}
                        {task?.category && (
                          <span className="px-2 py-1 bg-muted rounded-full text-muted-foreground">
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
              );
            })}
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