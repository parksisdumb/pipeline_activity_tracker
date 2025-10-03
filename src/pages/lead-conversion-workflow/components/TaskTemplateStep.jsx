import React, { useState, useEffect } from 'react';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import { Checkbox } from '../../../components/ui/Checkbox';
import { cn } from '../../../utils/cn';

const TaskTemplateStep = ({ leadData, onComplete, onBack }) => {
  const [taskTemplates, setTaskTemplates] = useState([]);
  const [customTasks, setCustomTasks] = useState([]);

  useEffect(() => {
    // Initialize with recommended task templates
    setTaskTemplates([
      {
        id: 'initial_contact',
        title: 'Initial Contact Follow-up',
        description: `Follow up on lead conversion for ${leadData?.name}. Introduce services and schedule discovery call.`,
        category: 'follow_up_call',
        priority: 'high',
        daysFromNow: 1,
        selected: true,
        isTemplate: true
      },
      {
        id: 'discovery_call',
        title: 'Discovery Call',
        description: `Conduct discovery call with ${leadData?.name} to understand their needs and pain points.`,
        category: 'meeting_setup',
        priority: 'high',
        daysFromNow: 3,
        selected: true,
        isTemplate: true
      },
      {
        id: 'property_assessment',
        title: 'Schedule Property Assessment',
        description: `Schedule on-site property assessment for ${leadData?.name}.`,
        category: 'site_visit',
        priority: 'medium',
        daysFromNow: 7,
        selected: false,
        isTemplate: true
      },
      {
        id: 'proposal_prep',
        title: 'Prepare Proposal',
        description: `Prepare initial proposal based on discovery call findings for ${leadData?.name}.`,
        category: 'proposal_review',
        priority: 'medium',
        daysFromNow: 10,
        selected: false,
        isTemplate: true
      },
      {
        id: 'follow_up_2',
        title: '2-Week Follow-up',
        description: `Follow up on proposal status and next steps with ${leadData?.name}.`,
        category: 'follow_up_call',
        priority: 'medium',
        daysFromNow: 14,
        selected: false,
        isTemplate: true
      }
    ]);
  }, [leadData]);

  const taskCategories = [
    { value: 'follow_up_call', label: 'Follow-up Call' },
    { value: 'site_visit', label: 'Site Visit' },
    { value: 'proposal_review', label: 'Proposal Review' },
    { value: 'contract_negotiation', label: 'Contract Negotiation' },
    { value: 'assessment_scheduling', label: 'Assessment Scheduling' },
    { value: 'document_review', label: 'Document Review' },
    { value: 'meeting_setup', label: 'Meeting Setup' },
    { value: 'property_inspection', label: 'Property Inspection' },
    { value: 'client_check_in', label: 'Client Check-in' },
    { value: 'other', label: 'Other' }
  ];

  const taskPriorities = [
    { value: 'low', label: 'Low', color: 'text-blue-600' },
    { value: 'medium', label: 'Medium', color: 'text-yellow-600' },
    { value: 'high', label: 'High', color: 'text-orange-600' },
    { value: 'urgent', label: 'Urgent', color: 'text-red-600' }
  ];

  const toggleTemplate = (templateId) => {
    setTaskTemplates(prev => prev?.map(template => 
      template?.id === templateId
        ? { ...template, selected: !template?.selected }
        : template
    ));
  };

  const updateTemplate = (templateId, field, value) => {
    setTaskTemplates(prev => prev?.map(template => 
      template?.id === templateId
        ? { ...template, [field]: value }
        : template
    ));
  };

  const addCustomTask = () => {
    const newTask = {
      id: `custom_${Date.now()}`,
      title: '',
      description: '',
      category: 'other',
      priority: 'medium',
      daysFromNow: 7,
      selected: true,
      isTemplate: false
    };
    
    setCustomTasks(prev => [...prev, newTask]);
  };

  const updateCustomTask = (taskId, field, value) => {
    setCustomTasks(prev => prev?.map(task => 
      task?.id === taskId
        ? { ...task, [field]: value }
        : task
    ));
  };

  const removeCustomTask = (taskId) => {
    setCustomTasks(prev => prev?.filter(task => task?.id !== taskId));
  };

  const calculateDueDate = (daysFromNow) => {
    const date = new Date();
    date?.setDate(date?.getDate() + daysFromNow);
    return date?.toISOString();
  };

  const handleContinue = () => {
    // Combine selected templates and custom tasks
    const selectedTemplates = taskTemplates?.filter(t => t?.selected);
    const validCustomTasks = customTasks?.filter(t => t?.title?.trim() && t?.selected);
    
    const allTasks = [...selectedTemplates, ...validCustomTasks]?.map(task => ({
      ...task,
      due_date: calculateDueDate(task?.daysFromNow || 7)
    }));

    onComplete({
      templates: allTasks
    });
  };

  const handleSkip = () => {
    onComplete({
      templates: []
    });
  };

  const getSelectedCount = () => {
    const selectedTemplateCount = taskTemplates?.filter(t => t?.selected)?.length;
    const selectedCustomCount = customTasks?.filter(t => t?.selected && t?.title?.trim())?.length;
    return selectedTemplateCount + selectedCustomCount;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-2">
          Follow-up Task Templates
        </h3>
        <p className="text-sm text-muted-foreground">
          Select and customize follow-up tasks to ensure consistent engagement. Tasks will be created with specific due dates and assigned to you.
        </p>
      </div>
      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2 p-4 bg-muted/30 rounded-lg">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setTaskTemplates(prev => prev?.map(t => ({ ...t, selected: true })));
          }}
        >
          Select All Templates
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setTaskTemplates(prev => prev?.map(t => ({ ...t, selected: false })));
            setCustomTasks(prev => prev?.map(t => ({ ...t, selected: false })));
          }}
        >
          Clear All
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setTaskTemplates(prev => prev?.map(t => 
              t?.priority === 'high' ? { ...t, selected: true } : t
            ));
          }}
        >
          High Priority Only
        </Button>
      </div>
      {/* Task Templates */}
      <div className="space-y-3">
        <h4 className="font-medium text-foreground">Recommended Templates</h4>
        
        {taskTemplates?.map((template) => (
          <div
            key={template?.id}
            className={cn(
              'border rounded-lg p-4 transition-all',
              {
                'border-primary bg-primary/5': template?.selected,
                'border-border': !template?.selected
              }
            )}
          >
            <div className="flex items-start gap-3">
              <Checkbox
                checked={template?.selected}
                onChange={() => toggleTemplate(template?.id)}
                className="mt-1"
              />
              
              <div className="flex-1 space-y-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h5 className="font-medium text-foreground">{template?.title}</h5>
                    <span className={cn(
                      'px-2 py-0.5 text-xs rounded-full',
                      taskPriorities?.find(p => p?.value === template?.priority)?.color,
                      'bg-current/10'
                    )}>
                      {taskPriorities?.find(p => p?.value === template?.priority)?.label}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{template?.description}</p>
                </div>

                {template?.selected && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3 border-t">
                    <Select
                      label="Category"
                      value={template?.category}
                      onChange={(value) => updateTemplate(template?.id, 'category', value)}
                      size="sm"
                      onSearchChange={() => {}}
                      error=""
                      onOpenChange={() => {}}
                      ref={null}
                      name={`template-category-${template?.id}`}
                      description=""
                      id={`template-category-${template?.id}`}
                    >
                      {taskCategories?.map(cat => (
                        <option key={cat?.value} value={cat?.value}>{cat?.label}</option>
                      ))}
                    </Select>
                    
                    <Select
                      label="Priority"
                      value={template?.priority}
                      onChange={(value) => updateTemplate(template?.id, 'priority', value)}
                      size="sm"
                      onSearchChange={() => {}}
                      error=""
                      onOpenChange={() => {}}
                      ref={null}
                      name={`template-priority-${template?.id}`}
                      description=""
                      id={`template-priority-${template?.id}`}
                    >
                      {taskPriorities?.map(priority => (
                        <option key={priority?.value} value={priority?.value}>{priority?.label}</option>
                      ))}
                    </Select>
                    
                    <Input
                      label="Due in (days)"
                      type="number"
                      value={template?.daysFromNow}
                      onChange={(e) => updateTemplate(template?.id, 'daysFromNow', parseInt(e?.target?.value) || 1)}
                      min="1"
                      max="365"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      {/* Custom Tasks */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-foreground">Custom Tasks</h4>
          <Button
            variant="outline"
            size="sm"
            onClick={addCustomTask}
            iconName="Plus"
          >
            Add Custom Task
          </Button>
        </div>

        {customTasks?.length === 0 ? (
          <div className="text-center py-6 border-2 border-dashed border-muted rounded-lg">
            <p className="text-muted-foreground text-sm">No custom tasks added yet</p>
          </div>
        ) : (
          customTasks?.map((task) => (
            <div
              key={task?.id}
              className={cn(
                'border rounded-lg p-4 transition-all',
                {
                  'border-primary bg-primary/5': task?.selected,
                  'border-border': !task?.selected
                }
              )}
            >
              <div className="flex items-start gap-3">
                <Checkbox
                  checked={task?.selected}
                  onChange={(checked) => updateCustomTask(task?.id, 'selected', checked)}
                  className="mt-1"
                />
                
                <div className="flex-1 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Input
                      label="Task Title"
                      value={task?.title}
                      onChange={(e) => updateCustomTask(task?.id, 'title', e?.target?.value)}
                      placeholder="Enter task title"
                      required
                    />
                    
                    <div className="flex items-end gap-2">
                      <div className="flex-1">
                        <Input
                          label="Due in (days)"
                          type="number"
                          value={task?.daysFromNow}
                          onChange={(e) => updateCustomTask(task?.id, 'daysFromNow', parseInt(e?.target?.value) || 1)}
                          min="1"
                          max="365"
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeCustomTask(task?.id)}
                        iconName="X"
                        className="text-destructive hover:text-destructive"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Select
                      label="Category"
                      value={task?.category}
                      onChange={(value) => updateCustomTask(task?.id, 'category', value)}
                      onSearchChange={() => {}}
                      error=""
                      onOpenChange={() => {}}
                      ref={null}
                      name={`custom-category-${task?.id}`}
                      description=""
                      id={`custom-category-${task?.id}`}
                    >
                      {taskCategories?.map(cat => (
                        <option key={cat?.value} value={cat?.value}>{cat?.label}</option>
                      ))}
                    </Select>
                    
                    <Select
                      label="Priority"
                      value={task?.priority}
                      onChange={(value) => updateCustomTask(task?.id, 'priority', value)}
                      onSearchChange={() => {}}
                      error=""
                      onOpenChange={() => {}}
                      ref={null}
                      name={`custom-priority-${task?.id}`}
                      description=""
                      id={`custom-priority-${task?.id}`}
                    >
                      {taskPriorities?.map(priority => (
                        <option key={priority?.value} value={priority?.value}>{priority?.label}</option>
                      ))}
                    </Select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Description
                    </label>
                    <textarea
                      className="w-full min-h-[60px] px-3 py-2 border border-input rounded-md bg-background text-foreground placeholder:text-muted-foreground resize-none"
                      value={task?.description}
                      onChange={(e) => updateCustomTask(task?.id, 'description', e?.target?.value)}
                      placeholder="Describe what needs to be done..."
                    />
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      {/* Summary */}
      {getSelectedCount() > 0 && (
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
          <h4 className="font-medium text-foreground mb-2">
            Task Summary
          </h4>
          <p className="text-sm text-muted-foreground">
            {getSelectedCount()} task{getSelectedCount() !== 1 ? 's' : ''} will be created and assigned to you. 
            Tasks will be distributed over the next {Math.max(...[...taskTemplates, ...customTasks]?.filter(t => t?.selected)?.map(t => t?.daysFromNow || 7))} days 
            to ensure consistent follow-up without overwhelming your schedule.
          </p>
        </div>
      )}
      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t">
        <Button
          variant="outline"
          onClick={onBack}
          iconName="ArrowLeft"
          className="sm:w-auto"
        >
          Back
        </Button>
        
        <Button
          variant="outline"
          onClick={handleSkip}
          className="sm:w-auto"
        >
          Skip Tasks
        </Button>
        
        <Button
          onClick={handleContinue}
          className="flex-1"
          iconName="ArrowRight"
        >
          Create Conversion ({getSelectedCount()} tasks)
        </Button>
      </div>
    </div>
  );
};

export default TaskTemplateStep;