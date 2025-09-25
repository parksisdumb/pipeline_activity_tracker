import React, { useState, useEffect } from 'react';
import { X, Save, Loader2 } from 'lucide-react';
import { tasksService } from '../../../services/tasksService';

export function TaskEditor({ task, onClose, onSave }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    due_date: '',
    assigned_to: '',
    status: 'pending'
  });
  
  const [entities, setEntities] = useState({
    accounts: [],
    properties: [],
    contacts: [],
    opportunities: []
  });
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Initialize form data
  useEffect(() => {
    if (task) {
      setFormData({
        title: task?.title || '',
        description: task?.description || '',
        priority: task?.priority || 'medium',
        due_date: task?.due_date ? new Date(task.due_date)?.toISOString()?.slice(0, 16) : '',
        assigned_to: task?.assigned_to || '',
        status: task?.status || 'pending'
      });
    }
  }, [task]);

  // Load entities and team members
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [entitiesResult, membersResult] = await Promise.all([
          tasksService?.getEntitiesForAssignment(),
          tasksService?.getTeamMembers()
        ]);

        if (entitiesResult?.error) throw entitiesResult?.error;
        if (membersResult?.error) throw membersResult?.error;

        setEntities(entitiesResult?.data);
        setTeamMembers(membersResult?.data);
      } catch (err) {
        setError(`Failed to load data: ${err?.message || 'Unknown error'}`);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const handleSubmit = async (e) => {
    e?.preventDefault();
    
    if (!formData?.title?.trim()) {
      setError('Title is required');
      return;
    }

    if (!formData?.assigned_to) {
      setError('Please assign the task to someone');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const updates = {
        title: formData?.title?.trim(),
        description: formData?.description?.trim(),
        priority: formData?.priority,
        status: formData?.status,
        assigned_to: formData?.assigned_to,
        due_date: formData?.due_date ? new Date(formData.due_date)?.toISOString() : null
      };

      await onSave(updates);
    } catch (err) {
      setError(`Failed to update task: ${err?.message || 'Unknown error'}`);
      setSaving(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    setError(''); // Clear error when user starts typing
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6">
          <div className="flex items-center space-x-3">
            <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
            <span>Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Edit Task</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title *
            </label>
            <input
              type="text"
              value={formData?.title}
              onChange={(e) => handleInputChange('title', e?.target?.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter task title"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formData?.description}
              onChange={(e) => handleInputChange('description', e?.target?.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              placeholder="Enter task description"
            />
          </div>

          {/* Priority and Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Priority
              </label>
              <select
                value={formData?.priority}
                onChange={(e) => handleInputChange('priority', e?.target?.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={formData?.status}
                onChange={(e) => handleInputChange('status', e?.target?.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          {/* Assigned To */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Assigned To *
            </label>
            <select
              value={formData?.assigned_to}
              onChange={(e) => handleInputChange('assigned_to', e?.target?.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            >
              <option value="">Select team member</option>
              {teamMembers?.map((member) => (
                <option key={member?.id} value={member?.id}>
                  {member?.full_name} ({member?.role})
                </option>
              ))}
            </select>
          </div>

          {/* Due Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Due Date
            </label>
            <input
              type="datetime-local"
              value={formData?.due_date}
              onChange={(e) => handleInputChange('due_date', e?.target?.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Current Entity Assignment Display */}
          {task && (task?.entity_type && task?.entity_name) && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Related Entity (Current)
              </label>
              <div className="p-3 bg-gray-50 border border-gray-300 rounded-lg">
                <span className="text-gray-900">
                  {task?.entity_name} ({task?.entity_type})
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Note: Entity assignment cannot be changed after task creation
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}