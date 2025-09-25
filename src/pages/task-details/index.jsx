import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { tasksService } from '../../services/tasksService';
import { TaskHeader } from './components/TaskHeader';
import { TaskInformation } from './components/TaskInformation';
import { StatusManagement } from './components/StatusManagement';
import { TaskComments } from './components/TaskComments';
import { TaskEditor } from './components/TaskEditor';
import { QuickActions } from './components/QuickActions';

export default function TaskDetails() {
  const { taskId } = useParams();
  const navigate = useNavigate();
  
  const [task, setTask] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [commentsLoading, setCommentsLoading] = useState(false);

  // Load task data
  const loadTaskData = async () => {
    if (!taskId) return;
    
    try {
      setLoading(true);
      const { data: tasksData, error: tasksError } = await tasksService?.getTasks();
      
      if (tasksError) throw tasksError;
      
      const foundTask = tasksData?.find(t => t?.id === taskId);
      if (!foundTask) {
        setError('Task not found');
        return;
      }
      
      setTask(foundTask);
      await loadComments();
    } catch (err) {
      setError(err?.message || 'Failed to load task');
    } finally {
      setLoading(false);
    }
  };

  // Load task comments
  const loadComments = async () => {
    if (!taskId) return;
    
    try {
      setCommentsLoading(true);
      const { data, error } = await tasksService?.getTaskComments(taskId);
      if (error) throw error;
      setComments(data || []);
    } catch (err) {
      setError(`Failed to load comments: ${err?.message || 'Unknown error'}`);
    } finally {
      setCommentsLoading(false);
    }
  };

  // Handle task update
  const handleTaskUpdate = async (updates) => {
    try {
      const { data, error } = await tasksService?.updateTask(taskId, updates);
      if (error) throw error;
      
      // Reload task data to get updated information
      await loadTaskData();
      setIsEditing(false);
    } catch (err) {
      setError(`Failed to update task: ${err?.message || 'Unknown error'}`);
    }
  };

  // Handle status change
  const handleStatusChange = async (newStatus) => {
    try {
      if (newStatus === 'completed') {
        const { error } = await tasksService?.completeTask(taskId);
        if (error) throw error;
      } else {
        await handleTaskUpdate({ status: newStatus });
      }
      await loadTaskData();
    } catch (err) {
      setError(`Failed to update status: ${err?.message || 'Unknown error'}`);
    }
  };

  // Handle comment add
  const handleAddComment = async (content) => {
    try {
      const { data, error } = await tasksService?.addTaskComment(taskId, content);
      if (error) throw error;
      await loadComments();
    } catch (err) {
      setError(`Failed to add comment: ${err?.message || 'Unknown error'}`);
    }
  };

  // Handle task deletion
  const handleDeleteTask = async () => {
    if (!window.confirm('Are you sure you want to delete this task?')) {
      return;
    }
    
    try {
      const { error } = await tasksService?.deleteTask(taskId);
      if (error) throw error;
      navigate('/tasks');
    } catch (err) {
      setError(`Failed to delete task: ${err?.message || 'Unknown error'}`);
    }
  };

  // Load data on mount
  useEffect(() => {
    loadTaskData();
  }, [taskId]);

  // Set up real-time subscriptions
  useEffect(() => {
    if (!taskId) return;

    const unsubscribeTasks = tasksService?.subscribeToTasks(() => {
      loadTaskData();
    });

    const unsubscribeComments = tasksService?.subscribeToTaskComments(taskId, () => {
      loadComments();
    });

    return () => {
      unsubscribeTasks();
      unsubscribeComments();
    };
  }, [taskId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading task details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-lg font-medium">{error}</div>
          <button 
            onClick={() => navigate('/tasks')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to Tasks
          </button>
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-600 text-lg">Task not found</div>
          <button 
            onClick={() => navigate('/tasks')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to Tasks
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <TaskHeader 
          task={task}
          onBack={() => navigate('/tasks')}
          onEdit={() => setIsEditing(true)}
          onDelete={handleDeleteTask}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Task Information */}
            <TaskInformation task={task} />
            
            {/* Status Management */}
            <StatusManagement 
              task={task}
              onStatusChange={handleStatusChange}
            />
            
            {/* Comments Section */}
            <TaskComments 
              comments={comments}
              onAddComment={handleAddComment}
              loading={commentsLoading}
            />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <QuickActions 
              task={task}
              onEdit={() => setIsEditing(true)}
              onDelete={handleDeleteTask}
              onStatusChange={handleStatusChange}
            />
          </div>
        </div>
      </div>

      {/* Task Editor Modal */}
      {isEditing && (
        <TaskEditor
          task={task}
          onClose={() => setIsEditing(false)}
          onSave={handleTaskUpdate}
        />
      )}
    </div>
  );
}