import React, { useState, useEffect } from 'react';
import { X, Calendar, User, AlertCircle, Target, Building2, Home } from 'lucide-react';
import tasksService from '../../services/tasksService';
import { accountsService } from '../../services/accountsService';
import { propertiesService } from '../../services/propertiesService';
import { contactsService } from '../../services/contactsService';
import opportunitiesService from '../../services/opportunitiesService';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

const CreateTaskModal = ({ isOpen, onClose, onTaskCreated, preSelectedEntity = null }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    category: 'other',
    due_date: '',
    reminder_date: '',
    assigned_to: '',
    entity_type: preSelectedEntity?.type || '',
    entity_id: preSelectedEntity?.id || ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Data for dropdowns
  const [assignees, setAssignees] = useState([]);
  const [entities, setEntities] = useState([]);
  const [loadingEntities, setLoadingEntities] = useState(false);

  // Form validation
  const [validationErrors, setValidationErrors] = useState({});

  useEffect(() => {
    if (isOpen) {
      loadAssignees();
      if (formData?.entity_type) {
        loadEntities(formData?.entity_type);
      }
    }
  }, [isOpen, formData?.entity_type]);

  const loadAssignees = async () => {
    try {
      let data = await tasksService?.getAvailableAssignees();
      // Ensure data is always an array to prevent .map() errors
      setAssignees(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load assignees:', err);
      // Set empty array on error to prevent .map() issues
      setAssignees([]);
    }
  };

  const loadEntities = async (entityType) => {
    if (!entityType) return;
    
    setLoadingEntities(true);
    try {
      let data = [];
      switch (entityType) {
        case 'account':
          data = await accountsService?.getAccounts();
          break;
        case 'property':
          data = await propertiesService?.getProperties();
          break;
        case 'contact':
          data = await contactsService?.getContacts();
          break;
        case 'opportunity':
          data = await opportunitiesService?.getOpportunities();
          break;
        default:
          break;
      }
      // Ensure data is always an array to prevent .map() errors
      setEntities(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(`Failed to load ${entityType}s:`, err);
      // Set empty array on error to prevent .map() issues
      setEntities([]);
    } finally {
      setLoadingEntities(false);
    }
  };

  const validateForm = () => {
    const errors = {};
    
    if (!formData?.title?.trim()) {
      errors.title = 'Task title is required';
    }
    
    if (!formData?.assigned_to) {
      errors.assigned_to = 'Please assign the task to someone';
    }
    
    if (formData?.due_date && formData?.reminder_date) {
      const dueDate = new Date(formData.due_date);
      const reminderDate = new Date(formData.reminder_date);
      if (reminderDate > dueDate) {
        errors.reminder_date = 'Reminder date cannot be after due date';
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors)?.length === 0;
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear validation error when user starts typing
    if (validationErrors?.[field]) {
      setValidationErrors(prev => {
        const updated = { ...prev };
        delete updated?.[field];
        return updated;
      });
    }
    
    // Clear entity_id when entity_type changes
    if (field === 'entity_type' && value !== formData?.entity_type) {
      setFormData(prev => ({ ...prev, entity_id: '' }));
      setEntities([]);
    }
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const taskData = {
        title: formData?.title?.trim(),
        description: formData?.description?.trim() || null,
        priority: formData?.priority,
        category: formData?.category,
        due_date: formData?.due_date || null,
        reminder_date: formData?.reminder_date || null,
        assigned_to: formData?.assigned_to,
        assigned_by: '', // Will be set by the backend from auth.uid()
        [`${formData?.entity_type}_id`]: formData?.entity_id || null
      };

      const newTask = await tasksService?.createTask(taskData);
      
      onTaskCreated?.(newTask);
      onClose();
      resetForm();
    } catch (err) {
      setError(err?.message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      priority: 'medium',
      category: 'other',
      due_date: '',
      reminder_date: '',
      assigned_to: '',
      entity_type: preSelectedEntity?.type || '',
      entity_id: preSelectedEntity?.id || ''
    });
    setValidationErrors({});
    setError('');
  };

  const getEntityDisplayName = (entity, type) => {
    switch (type) {
      case 'account':
        return entity?.name;
      case 'property':
        return entity?.name;
      case 'contact':
        return `${entity?.first_name} ${entity?.last_name}`;
      case 'opportunity':
        return entity?.name;
      default:
        return 'Unknown';
    }
  };

  const getEntityIcon = (type) => {
    switch (type) {
      case 'account':
        return <Building2 className="w-4 h-4" />;
      case 'property':
        return <Home className="w-4 h-4" />;
      case 'contact':
        return <User className="w-4 h-4" />;
      case 'opportunity':
        return <Target className="w-4 h-4" />;
      default:
        return null;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-screen overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Create New Task</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              <div className="flex items-center">
                <AlertCircle className="w-5 h-5 mr-2" />
                {error}
              </div>
            </div>
          )}

          {/* Task Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Task Title *
            </label>
            <Input
              type="text"
              placeholder="Enter task title..."
              value={formData?.title}
              onChange={(e) => handleInputChange('title', e?.target?.value)}
              className={validationErrors?.title ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}
            />
            {validationErrors?.title && (
              <p className="mt-1 text-sm text-red-600">{validationErrors?.title}</p>
            )}
          </div>

          {/* Task Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              rows={3}
              placeholder="Enter task description..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={formData?.description}
              onChange={(e) => handleInputChange('description', e?.target?.value)}
            />
          </div>

          {/* Priority and Category */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Priority
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={formData?.priority}
                onChange={(e) => handleInputChange('priority', e?.target?.value)}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={formData?.category}
                onChange={(e) => handleInputChange('category', e?.target?.value)}
              >
                <option value="other">Other</option>
                <option value="follow_up_call">Follow-up Call</option>
                <option value="site_visit">Site Visit</option>
                <option value="proposal_review">Proposal Review</option>
                <option value="contract_negotiation">Contract Negotiation</option>
                <option value="assessment_scheduling">Assessment Scheduling</option>
                <option value="document_review">Document Review</option>
                <option value="meeting_setup">Meeting Setup</option>
                <option value="property_inspection">Property Inspection</option>
                <option value="client_check_in">Client Check-in</option>
              </select>
            </div>
          </div>

          {/* Due Date and Reminder */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Due Date
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="datetime-local"
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={formData?.due_date}
                  onChange={(e) => handleInputChange('due_date', e?.target?.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reminder Date
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="datetime-local"
                  className={`w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    validationErrors?.reminder_date ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''
                  }`}
                  value={formData?.reminder_date}
                  onChange={(e) => handleInputChange('reminder_date', e?.target?.value)}
                />
              </div>
              {validationErrors?.reminder_date && (
                <p className="mt-1 text-sm text-red-600">{validationErrors?.reminder_date}</p>
              )}
            </div>
          </div>

          {/* Assigned To */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Assign To *
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <select
                className={`w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  validationErrors?.assigned_to ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''
                }`}
                value={formData?.assigned_to}
                onChange={(e) => handleInputChange('assigned_to', e?.target?.value)}
              >
                <option value="">Select assignee...</option>
                {/* Ensure assignees is always an array before mapping */}
                {(Array.isArray(assignees) ? assignees : [])?.map((user) => (
                  <option key={user?.id} value={user?.id}>
                    {user?.full_name} ({user?.role})
                  </option>
                ))}
              </select>
            </div>
            {validationErrors?.assigned_to && (
              <p className="mt-1 text-sm text-red-600">{validationErrors?.assigned_to}</p>
            )}
          </div>

          {/* Entity Association */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Associate with Entity (Optional)
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={formData?.entity_type}
                onChange={(e) => handleInputChange('entity_type', e?.target?.value)}
              >
                <option value="">No association</option>
                <option value="account">Account</option>
                <option value="property">Property</option>
                <option value="contact">Contact</option>
                <option value="opportunity">Opportunity</option>
              </select>
            </div>

            {formData?.entity_type && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select {formData?.entity_type?.charAt(0)?.toUpperCase() + formData?.entity_type?.slice(1)}
                </label>
                <div className="relative">
                  {getEntityIcon(formData?.entity_type)}
                  <select
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={formData?.entity_id}
                    onChange={(e) => handleInputChange('entity_id', e?.target?.value)}
                    disabled={loadingEntities}
                  >
                    <option value="">
                      {loadingEntities ? 'Loading...' : `Select ${formData?.entity_type}...`}
                    </option>
                    {/* Ensure entities is always an array before mapping */}
                    {(Array.isArray(entities) ? entities : [])?.map((entity) => (
                      <option key={entity?.id} value={entity?.id}>
                        {getEntityDisplayName(entity, formData?.entity_type)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-3 pt-6 border-t">
            <Button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Task'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateTaskModal;