import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';

const ProfileEditor = ({ contact, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    firstName: contact?.firstName || '',
    lastName: contact?.lastName || '',
    email: contact?.email || '',
    phone: contact?.phone || '',
    mobilePhone: contact?.mobilePhone || '',
    role: contact?.role || '',
    title: contact?.title || '',
    department: contact?.department || '',
    address: contact?.address || '',
    linkedInUrl: contact?.linkedInUrl || '',
    companyWebsite: contact?.companyWebsite || '',
    notes: contact?.notes || '',
    reportsTo: contact?.reportsTo || '',
    decisionMakingAuthority: contact?.decisionMakingAuthority || 'Low',
    preferredCommunication: contact?.preferredCommunication || 'Email',
    timeZone: contact?.timeZone || 'EST',
    isPrimaryContact: contact?.isPrimaryContact || false
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors?.[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData?.firstName?.trim()) {
      newErrors.firstName = 'First name is required';
    }
    
    if (!formData?.lastName?.trim()) {
      newErrors.lastName = 'Last name is required';
    }
    
    if (!formData?.email?.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/?.test(formData?.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    if (!formData?.role?.trim()) {
      newErrors.role = 'Role is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors)?.length === 0;
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const updatedData = {
        ...formData,
        name: `${formData?.firstName} ${formData?.lastName}`?.trim(),
        updatedAt: new Date()?.toISOString()
      };
      
      await onSave(updatedData);
    } catch (error) {
      console.error('Failed to save profile:', error);
      // You could add error handling/toast notification here
    } finally {
      setIsSubmitting(false);
    }
  };

  const authorityLevels = ['Low', 'Medium', 'High'];
  const communicationPreferences = ['Email', 'Phone', 'Text', 'LinkedIn'];
  const timeZones = ['EST', 'CST', 'MST', 'PST'];

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-card rounded-lg border border-border max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="sticky top-0 bg-card border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-foreground">Edit Contact Profile</h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={onCancel}
            >
              <Icon name="X" size={20} />
            </Button>
          </div>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Information */}
          <div>
            <h3 className="text-lg font-medium text-foreground mb-4">Basic Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Input
                  label="First Name *"
                  value={formData?.firstName}
                  onChange={(e) => handleInputChange('firstName', e?.target?.value)}
                  error={errors?.firstName}
                  placeholder="Enter first name"
                />
              </div>
              
              <div>
                <Input
                  label="Last Name *"
                  value={formData?.lastName}
                  onChange={(e) => handleInputChange('lastName', e?.target?.value)}
                  error={errors?.lastName}
                  placeholder="Enter last name"
                />
              </div>
              
              <div className="sm:col-span-2">
                <Input
                  label="Email Address *"
                  type="email"
                  value={formData?.email}
                  onChange={(e) => handleInputChange('email', e?.target?.value)}
                  error={errors?.email}
                  placeholder="Enter email address"
                />
              </div>
              
              <div>
                <Input
                  label="Phone Number"
                  type="tel"
                  value={formData?.phone}
                  onChange={(e) => handleInputChange('phone', e?.target?.value)}
                  placeholder="(555) 123-4567"
                />
              </div>
              
              <div>
                <Input
                  label="Mobile Phone"
                  type="tel"
                  value={formData?.mobilePhone}
                  onChange={(e) => handleInputChange('mobilePhone', e?.target?.value)}
                  placeholder="(555) 123-4567"
                />
              </div>
            </div>
          </div>

          {/* Professional Information */}
          <div>
            <h3 className="text-lg font-medium text-foreground mb-4">Professional Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Input
                  label="Role *"
                  value={formData?.role}
                  onChange={(e) => handleInputChange('role', e?.target?.value)}
                  error={errors?.role}
                  placeholder="e.g., Property Manager"
                />
              </div>
              
              <div>
                <Input
                  label="Job Title"
                  value={formData?.title}
                  onChange={(e) => handleInputChange('title', e?.target?.value)}
                  placeholder="e.g., Senior Property Manager"
                />
              </div>
              
              <div>
                <Input
                  label="Department"
                  value={formData?.department}
                  onChange={(e) => handleInputChange('department', e?.target?.value)}
                  placeholder="e.g., Operations"
                />
              </div>
              
              <div>
                <Input
                  label="Reports To"
                  value={formData?.reportsTo}
                  onChange={(e) => handleInputChange('reportsTo', e?.target?.value)}
                  placeholder="e.g., John Smith - VP Operations"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Decision Making Authority</label>
                <select
                  value={formData?.decisionMakingAuthority}
                  onChange={(e) => handleInputChange('decisionMakingAuthority', e?.target?.value)}
                  className="w-full px-3 py-2 border border-border rounded-md bg-card text-foreground"
                >
                  {authorityLevels?.map(level => (
                    <option key={level} value={level}>{level}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Preferred Communication</label>
                <select
                  value={formData?.preferredCommunication}
                  onChange={(e) => handleInputChange('preferredCommunication', e?.target?.value)}
                  className="w-full px-3 py-2 border border-border rounded-md bg-card text-foreground"
                >
                  {communicationPreferences?.map(pref => (
                    <option key={pref} value={pref}>{pref}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Contact Details */}
          <div>
            <h3 className="text-lg font-medium text-foreground mb-4">Additional Details</h3>
            <div className="space-y-4">
              <div>
                <Input
                  label="Address"
                  value={formData?.address}
                  onChange={(e) => handleInputChange('address', e?.target?.value)}
                  placeholder="Street address, city, state, zip"
                />
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Input
                    label="LinkedIn URL"
                    value={formData?.linkedInUrl}
                    onChange={(e) => handleInputChange('linkedInUrl', e?.target?.value)}
                    placeholder="https://linkedin.com/in/username"
                  />
                </div>
                
                <div>
                  <Input
                    label="Company Website"
                    value={formData?.companyWebsite}
                    onChange={(e) => handleInputChange('companyWebsite', e?.target?.value)}
                    placeholder="https://company.com"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Time Zone</label>
                <select
                  value={formData?.timeZone}
                  onChange={(e) => handleInputChange('timeZone', e?.target?.value)}
                  className="w-full px-3 py-2 border border-border rounded-md bg-card text-foreground"
                >
                  {timeZones?.map(tz => (
                    <option key={tz} value={tz}>{tz}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Notes</label>
                <textarea
                  value={formData?.notes}
                  onChange={(e) => handleInputChange('notes', e?.target?.value)}
                  placeholder="Add any relevant notes about this contact..."
                  rows={4}
                  className="w-full px-3 py-2 border border-border rounded-md bg-card text-foreground resize-none"
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isPrimary"
                  checked={formData?.isPrimaryContact}
                  onChange={(e) => handleInputChange('isPrimaryContact', e?.target?.checked)}
                  className="rounded border-border"
                />
                <label htmlFor="isPrimary" className="text-sm text-foreground">
                  Primary contact for this account
                </label>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end space-x-3 pt-6 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <Icon name="Save" size={16} className="mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfileEditor;