import React, { useState } from 'react';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import Icon from '../../../components/AppIcon';

const QuickEntityCreator = ({ 
  entityType, 
  isOpen, 
  onClose, 
  onSave, 
  disabled = false 
}) => {
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    email: '',
    phone: '',
    address: ''
  });

  // Add missing state variables
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Add missing service placeholders (these would normally be imported)
  const accountsService = {
    createAccount: async (data) => ({ success: true, data: { id: Date.now(), name: data.name, company_type: data.type } })
  };
  
  const propertiesService = {
    createProperty: async (data) => ({ success: true, data: { id: Date.now(), name: data.name, building_type: data.type } })
  };
  
  const contactsService = {
    createContact: async (data) => ({ success: true, data: { id: Date.now(), first_name: data.name.split(' ')[0], last_name: data.name.split(' ')[1] || '', title: 'Contact' } })
  };

  const companyTypes = [
    { value: 'property_management', label: 'Property Management' },
    { value: 'general_contractor', label: 'General Contractor' },
    { value: 'developer', label: 'Developer' },
    { value: 'reit_institutional', label: 'REIT/Institutional Investor' },
    { value: 'asset_manager', label: 'Asset Manager' },
    { value: 'building_owner', label: 'Building Owner' },
    { value: 'facility_manager', label: 'Facility Manager' },
    { value: 'roofing_contractor', label: 'Roofing Contractor' },
    { value: 'insurance', label: 'Insurance' },
    { value: 'architecture_engineering', label: 'Architecture/Engineering' },
    { value: 'other', label: 'Other' }
  ];

  const buildingTypes = [
    { value: 'industrial', label: 'Industrial' },
    { value: 'warehouse', label: 'Warehouse' },
    { value: 'manufacturing', label: 'Manufacturing' },
    { value: 'hospitality', label: 'Hospitality' },
    { value: 'multifamily', label: 'Multifamily' },
    { value: 'commercial_office', label: 'Commercial Office' },
    { value: 'retail', label: 'Retail' },
    { value: 'education', label: 'Education' },
    { value: 'healthcare', label: 'Healthcare' },
    { value: 'mixed_use', label: 'Mixed-Use' },
    { value: 'other', label: 'Other' }
  ];

  const handleSave = async () => {
    setIsLoading(true);
    setError(null);
    try {
      let response;
      let newEntity;

      switch (entityType) {
        case 'account':
          response = await accountsService?.createAccount(formData);
          if (response?.success) {
            newEntity = {
              id: response?.data?.id,
              name: response?.data?.name,
              type: response?.data?.company_type
            };
          }
          break;

        case 'property':
          response = await propertiesService?.createProperty(formData);
          if (response?.success) {
            newEntity = {
              id: response?.data?.id,
              name: response?.data?.name,
              type: response?.data?.building_type
            };
          }
          break;

        case 'contact':
          response = await contactsService?.createContact(formData);
          if (response?.success) {
            newEntity = {
              id: response?.data?.id,
              name: `${response?.data?.first_name} ${response?.data?.last_name}`,
              type: response?.data?.title || 'Contact'
            };
          }
          break;

        default:
          throw new Error('Unsupported entity type');
      }

      if (response?.success && newEntity) {
        // Dispatch custom event to notify other components
        window.dispatchEvent(new CustomEvent('entityCreated', { 
          detail: { 
            entityType,
            entity: newEntity
          }
        }));
        
        onSave?.(newEntity);
        onClose?.();
      } else {
        throw new Error(response?.error || 'Failed to create entity');
      }
    } catch (error) {
      console.error(`Error creating ${entityType}:`, error);
      setError(error?.message || `Failed to create ${entityType}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({ name: '', type: '', email: '', phone: '', address: '' });
    onClose();
  };

  if (!isOpen) return null;

  const getEntityIcon = () => {
    switch (entityType) {
      case 'account': return 'Building2';
      case 'property': return 'MapPin';
      case 'contact': return 'User';
      default: return 'Plus';
    }
  };

  const getEntityTitle = () => {
    switch (entityType) {
      case 'account': return 'Create New Account';
      case 'property': return 'Create New Property';
      case 'contact': return 'Create New Contact';
      default: return 'Create New Entity';
    }
  };

  return (
    <div className="fixed inset-0 z-300 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-lg border border-border elevation-3 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center space-x-2">
            <Icon name={getEntityIcon()} size={20} className="text-primary" />
            <h2 className="text-lg font-semibold text-foreground">{getEntityTitle()}</h2>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleCancel}
            disabled={disabled}
          >
            <Icon name="X" size={18} />
          </Button>
        </div>

        <div className="p-4 space-y-4">
          <Input
            label={entityType === 'contact' ? 'Full Name' : 'Name'}
            type="text"
            placeholder={`Enter ${entityType} name`}
            value={formData?.name}
            onChange={(e) => setFormData({ ...formData, name: e?.target?.value })}
            required
            disabled={disabled}
          />

          {entityType === 'account' && (
            <Select
              label="Company Type"
              options={companyTypes}
              value={formData?.type}
              onChange={(value) => setFormData({ ...formData, type: value })}
              placeholder="Select company type"
              required
              disabled={disabled}
            />
          )}

          {entityType === 'property' && (
            <>
              <Select
                label="Building Type"
                options={buildingTypes}
                value={formData?.type}
                onChange={(value) => setFormData({ ...formData, type: value })}
                placeholder="Select building type"
                required
                disabled={disabled}
              />
              <Input
                label="Address"
                type="text"
                placeholder="Enter property address"
                value={formData?.address}
                onChange={(e) => setFormData({ ...formData, address: e?.target?.value })}
                disabled={disabled}
              />
            </>
          )}

          {entityType === 'contact' && (
            <>
              <Input
                label="Email"
                type="email"
                placeholder="Enter email address"
                value={formData?.email}
                onChange={(e) => setFormData({ ...formData, email: e?.target?.value })}
                disabled={disabled}
              />
              <Input
                label="Phone"
                type="tel"
                placeholder="Enter phone number"
                value={formData?.phone}
                onChange={(e) => setFormData({ ...formData, phone: e?.target?.value })}
                disabled={disabled}
              />
            </>
          )}
        </div>

        <div className="flex items-center justify-end space-x-3 p-4 border-t border-border">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={disabled}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={disabled || !formData?.name?.trim()}
            iconName="Check"
            iconPosition="left"
          >
            Create {entityType === 'account' ? 'Account' : entityType === 'property' ? 'Property' : 'Contact'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default QuickEntityCreator;