import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Clock, AlertTriangle, Plus, Filter, Search, User, Building2, Home, Target } from 'lucide-react';
import tasksService from '../../services/tasksService';
import Header from '../../components/ui/Header';
import Button from '../../components/ui/Button';
import CreateTaskModal from '../create-task-modal';

const TaskManagement = () => {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [filteredTasks, setFilteredTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [metrics, setMetrics] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  
  // Filter states
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    assignee: '',
    entityType: '',
    search: ''
  });

  useEffect(() => {
    loadTasks();
    loadMetrics();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [tasks, filters]);

  const loadTasks = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await tasksService?.getTasksWithDetails();
      setTasks(data || []);
    } catch (err) {
      setError(`Failed to load tasks: ${err?.message}`);
    } finally {
      setLoading(false);
    }
  };

  const loadMetrics = async () => {
    try {
      const metricsData = await tasksService?.getTaskMetrics();
      setMetrics(metricsData);
    } catch (err) {
      console.error('Failed to load task metrics:', err);
    }
  };

  const applyFilters = () => {
    let filtered = [...tasks];

    // Status filter
    if (filters?.status) {
      filtered = filtered?.filter(task => task?.status === filters?.status);
    }

    // Priority filter
    if (filters?.priority) {
      filtered = filtered?.filter(task => task?.priority === filters?.priority);
    }

    // Search filter
    if (filters?.search) {
      const searchTerm = filters?.search?.toLowerCase();
      filtered = filtered?.filter(task => 
        task?.title?.toLowerCase()?.includes(searchTerm) ||
        task?.description?.toLowerCase()?.includes(searchTerm) ||
        task?.assigned_to_name?.toLowerCase()?.includes(searchTerm) ||
        task?.account_name?.toLowerCase()?.includes(searchTerm) ||
        task?.property_name?.toLowerCase()?.includes(searchTerm) ||
        task?.contact_name?.toLowerCase()?.includes(searchTerm) ||
        task?.opportunity_name?.toLowerCase()?.includes(searchTerm)
      );
    }

    setFilteredTasks(filtered);
  };

  const handleStatusUpdate = async (taskId, newStatus) => {
    try {
      await tasksService?.updateTaskStatus(taskId, newStatus);
      await loadTasks();
      await loadMetrics();
    } catch (err) {
      setError(`Failed to update task: ${err?.message}`);
    }
  };

  const handleTaskCreated = async (newTask) => {
    // Refresh the tasks list after creating a new task
    await loadTasks();
    await loadMetrics();
    setShowCreateModal(false);
  };

  const handleTaskClick = (taskId) => {
    navigate(`/task-details/${taskId}`);
  };

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
      year: 'numeric'
    });
  };

  const isOverdue = (dueDateStr) => {
    if (!dueDateStr) return false;
    return new Date(dueDateStr) < new Date() && dueDateStr !== 'completed';
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header onMenuToggle={() => setMenuOpen(!menuOpen)} />
      {/* Main Content with responsive layout accounting for sidebar */}
      <div className="flex-1 lg:ml-60 pt-16">
        <div className="h-full flex flex-col p-4 sm:p-6 max-w-full">
          {/* Header Section - Responsive */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-6">
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 truncate">Task Management</h1>
              <p className="mt-2 text-sm sm:text-base text-gray-600">
                Manage and track tasks assigned across accounts, properties, contacts, and opportunities
              </p>
            </div>
            <div className="flex-shrink-0">
              <Button
                onClick={() => setShowCreateModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto"
              >
                <Plus className="w-5 h-5 mr-2" />
                Create Task
              </Button>
            </div>
          </div>

          {/* Metrics Cards - Fully responsive grid */}
          {metrics && (
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-6 mb-6">
              <div className="bg-white rounded-lg shadow p-3 sm:p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg flex-shrink-0">
                    <CheckCircle className="w-4 h-4 sm:w-6 sm:h-6 text-blue-600" />
                  </div>
                  <div className="ml-2 sm:ml-4 min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Total Tasks</p>
                    <p className="text-lg sm:text-2xl font-bold text-gray-900">{metrics?.total_tasks}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow p-3 sm:p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-yellow-100 rounded-lg flex-shrink-0">
                    <Clock className="w-4 h-4 sm:w-6 sm:h-6 text-yellow-600" />
                  </div>
                  <div className="ml-2 sm:ml-4 min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Pending</p>
                    <p className="text-lg sm:text-2xl font-bold text-gray-900">{metrics?.pending_tasks}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow p-3 sm:p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg flex-shrink-0">
                    <Clock className="w-4 h-4 sm:w-6 sm:h-6 text-blue-600" />
                  </div>
                  <div className="ml-2 sm:ml-4 min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">In Progress</p>
                    <p className="text-lg sm:text-2xl font-bold text-gray-900">{metrics?.in_progress_tasks}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow p-3 sm:p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg flex-shrink-0">
                    <CheckCircle className="w-4 h-4 sm:w-6 sm:h-6 text-green-600" />
                  </div>
                  <div className="ml-2 sm:ml-4 min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Completed</p>
                    <p className="text-lg sm:text-2xl font-bold text-gray-900">{metrics?.completed_tasks}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow p-3 sm:p-6 col-span-2 lg:col-span-1">
                <div className="flex items-center">
                  <div className="p-2 bg-red-100 rounded-lg flex-shrink-0">
                    <AlertTriangle className="w-4 h-4 sm:w-6 sm:h-6 text-red-600" />
                  </div>
                  <div className="ml-2 sm:ml-4 min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Overdue</p>
                    <p className="text-lg sm:text-2xl font-bold text-gray-900">{metrics?.overdue_tasks}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Filter Toolbar - Responsive layout */}
          <div className="bg-white rounded-lg shadow mb-6 p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              {/* Search - Full width on mobile */}
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search tasks..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    value={filters?.search}
                    onChange={(e) => setFilters(prev => ({ ...prev, search: e?.target?.value }))}
                  />
                </div>
              </div>

              {/* Filters - Stack on mobile */}
              <div className="flex flex-col sm:flex-row gap-3">
                <select
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm min-w-0"
                  value={filters?.status}
                  onChange={(e) => setFilters(prev => ({ ...prev, status: e?.target?.value }))}
                >
                  <option value="">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="overdue">Overdue</option>
                </select>

                <select
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm min-w-0"
                  value={filters?.priority}
                  onChange={(e) => setFilters(prev => ({ ...prev, priority: e?.target?.value }))}
                >
                  <option value="">All Priority</option>
                  <option value="urgent">Urgent</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 text-sm">
              {error}
            </div>
          )}

          {/* Tasks Table/Cards - Responsive design */}
          <div className="bg-white rounded-lg shadow overflow-hidden flex-1">
            {loading ? (
              <div className="p-8 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="mt-2 text-gray-600">Loading tasks...</p>
              </div>
            ) : filteredTasks?.length > 0 ? (
              <>
                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Task
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Priority
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Assigned To
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Entity
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Due Date
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredTasks?.map((task) => (
                        <tr 
                          key={task?.id} 
                          className="hover:bg-gray-50 cursor-pointer"
                          onClick={() => handleTaskClick(task?.id)}
                        >
                          <td className="px-4 py-4">
                            <div>
                              <div className="text-sm font-medium text-gray-900 line-clamp-2">
                                {task?.title}
                              </div>
                              {task?.description && (
                                <div className="text-sm text-gray-500 mt-1 line-clamp-2">
                                  {task?.description}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              {getStatusIcon(task?.status)}
                              <span className="ml-2 text-sm text-gray-900 capitalize">
                                {task?.status?.replace('_', ' ')}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getPriorityColor(task?.priority)}`}>
                              {task?.priority}
                            </span>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                            {task?.assigned_to_name || 'Unassigned'}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="flex items-center text-sm text-gray-900">
                              {getEntityIcon(task)}
                              <span className="ml-2 truncate">{getEntityName(task)}</span>
                            </div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className={`text-sm ${isOverdue(task?.due_date) ? 'text-red-600 font-medium' : 'text-gray-900'}`}>
                              {formatDate(task?.due_date)}
                            </div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex space-x-2" onClick={(e) => e?.stopPropagation()}>
                              {task?.status === 'pending' && (
                                <button
                                  onClick={() => handleStatusUpdate(task?.id, 'in_progress')}
                                  className="text-blue-600 hover:text-blue-900"
                                >
                                  Start
                                </button>
                              )}
                              {task?.status === 'in_progress' && (
                                <button
                                  onClick={() => handleStatusUpdate(task?.id, 'completed')}
                                  className="text-green-600 hover:text-green-900"
                                >
                                  Complete
                                </button>
                              )}
                              {task?.status !== 'completed' && (
                                <button
                                  onClick={() => handleStatusUpdate(task?.id, 'completed')}
                                  className="text-green-600 hover:text-green-900"
                                >
                                  Mark Done
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden p-4 space-y-4">
                  {filteredTasks?.map((task) => (
                    <div 
                      key={task?.id} 
                      className="border border-gray-200 rounded-lg p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => handleTaskClick(task?.id)}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-medium text-gray-900 truncate">{task?.title}</h3>
                          <div className="flex items-center mt-1 space-x-2">
                            {getStatusIcon(task?.status)}
                            <span className="text-sm text-gray-600 capitalize">
                              {task?.status?.replace('_', ' ')}
                            </span>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getPriorityColor(task?.priority)}`}>
                              {task?.priority}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {task?.description && (
                        <p className="text-sm text-gray-600 mb-3 line-clamp-2">{task?.description}</p>
                      )}
                      
                      <div className="flex justify-between items-center text-sm text-gray-500 mb-3">
                        <div className="flex items-center">
                          {getEntityIcon(task)}
                          <span className="ml-1 truncate">{getEntityName(task)}</span>
                        </div>
                        <div className={`${isOverdue(task?.due_date) ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                          {formatDate(task?.due_date)}
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">
                          {task?.assigned_to_name || 'Unassigned'}
                        </span>
                        <div className="flex space-x-2" onClick={(e) => e?.stopPropagation()}>
                          {task?.status === 'pending' && (
                            <button
                              onClick={() => handleStatusUpdate(task?.id, 'in_progress')}
                              className="text-blue-600 hover:text-blue-900 text-sm"
                            >
                              Start
                            </button>
                          )}
                          {task?.status === 'in_progress' && (
                            <button
                              onClick={() => handleStatusUpdate(task?.id, 'completed')}
                              className="text-green-600 hover:text-green-900 text-sm"
                            >
                              Complete
                            </button>
                          )}
                          {task?.status !== 'completed' && (
                            <button
                              onClick={() => handleStatusUpdate(task?.id, 'completed')}
                              className="text-green-600 hover:text-green-900 text-sm"
                            >
                              Mark Done
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="p-8 text-center">
                <CheckCircle className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No tasks found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Get started by creating your first task.
                </p>
                <div className="mt-6">
                  <Button
                    onClick={() => setShowCreateModal(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Plus className="w-5 h-5 mr-2" />
                    Create Task
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Create Task Modal */}
      <CreateTaskModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onTaskCreated={handleTaskCreated}
      />
    </div>
  );
};

export default TaskManagement;