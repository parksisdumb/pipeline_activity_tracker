import React, { useState, useEffect } from 'react';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';

import { cn } from '../../../utils/cn';

const ContactCreationStep = ({ leadData, selectedAccount, conversionPath, onComplete, onBack }) => {
  const [contacts, setContacts] = useState([]);
  const [showContactForm, setShowContactForm] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});

  useEffect(() => {
    // Initialize with one default contact if none exist
    if (contacts?.length === 0) {
      addNewContact();
    }
  }, []);

  const contactStages = [
    'Identified',
    'Reached',
    'DM Confirmed',
    'Engaged',
    'Dormant'
  ];

  const defaultRoles = [
    'Property Manager',
    'Building Owner',
    'Facility Manager',
    'Maintenance Supervisor',
    'General Manager',
    'Asset Manager',
    'Regional Manager',
    'Operations Manager',
    'Director of Operations',
    'VP of Operations',
    'Leasing Manager',
    'Construction Manager',
    'Project Manager'
  ];

  const addNewContact = () => {
    const newContact = {
      id: Date.now(),
      first_name: '',
      last_name: '',
      title: '',
      email: '',
      phone: '',
      mobile_phone: '',
      stage: 'Identified',
      is_primary_contact: contacts?.length === 0, // First contact is primary
      role_assignment: 'decision_maker',
      engagement_stage: 'initial_contact',
      notes: ''
    };
    
    setContacts(prev => [...prev, newContact]);
    setShowContactForm(true);
  };

  const updateContact = (contactId, field, value) => {
    setContacts(prev => prev?.map(contact => 
      contact?.id === contactId
        ? { ...contact, [field]: value }
        : contact
    ));

    // Clear validation error
    if (validationErrors?.[`${contactId}_${field}`]) {
      setValidationErrors(prev => ({
        ...prev,
        [`${contactId}_${field}`]: null
      }));
    }
  };

  const removeContact = (contactId) => {
    setContacts(prev => {
      const remaining = prev?.filter(contact => contact?.id !== contactId);
      
      // If we removed the primary contact, make the first remaining contact primary
      if (remaining?.length > 0 && !remaining?.some(c => c?.is_primary_contact)) {
        remaining[0].is_primary_contact = true;
      }
      
      return remaining;
    });
  };

  const setPrimaryContact = (contactId) => {
    setContacts(prev => prev?.map(contact => ({
      ...contact,
      is_primary_contact: contact?.id === contactId
    })));
  };

  const validateForm = () => {
    const errors = {};
    
    contacts?.forEach(contact => {
      if (!contact?.first_name?.trim()) {
        errors[`${contact?.id}_first_name`] = 'First name is required';
      }
      
      if (!contact?.last_name?.trim()) {
        errors[`${contact?.id}_last_name`] = 'Last name is required';
      }
      
      if (contact?.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/?.test(contact?.email)) {
        errors[`${contact?.id}_email`] = 'Please enter a valid email address';
      }
      
      if (contact?.phone && !/^[\+]?[1-9][\d]{0,15}$/?.test(contact?.phone?.replace(/[\s\-\(\)]/g, ''))) {
        errors[`${contact?.id}_phone`] = 'Please enter a valid phone number';
      }
    });

    setValidationErrors(errors);
    return Object.keys(errors)?.length === 0;
  };

  const handleContinue = () => {
    if (!validateForm()) {
      return;
    }

    // Filter out empty contacts and prepare data
    const validContacts = contacts?.filter(contact => 
      contact?.first_name?.trim() && contact?.last_name?.trim()
    );

    onComplete({
      contacts: validContacts
    });
  };

  const handleSkip = () => {
    onComplete({
      contacts: []
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-2">
          Add Decision Makers
        </h3>
        <p className="text-sm text-muted-foreground">
          Add key contacts and decision makers. This information enables targeted outreach and relationship mapping.
        </p>
      </div>
      {/* Account Context */}
      <div className="bg-muted/30 rounded-lg p-4">
        <h4 className="font-medium text-foreground mb-2">
          {conversionPath === 'existing_account' ? 'Linking to Account' : 'Creating Account'}
        </h4>
        <div className="text-sm">
          <p className="font-medium">
            {selectedAccount?.name || leadData?.name}
          </p>
          <p className="text-muted-foreground">
            {selectedAccount?.company_type || leadData?.company_type}
          </p>
          {(selectedAccount?.city || leadData?.city) && (
            <p className="text-muted-foreground">
              {selectedAccount?.city || leadData?.city}, {selectedAccount?.state || leadData?.state}
            </p>
          )}
        </div>
      </div>
      {/* Contacts List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-foreground">Contacts</h4>
          <Button
            variant="outline"
            size="sm"
            onClick={addNewContact}
            iconName="UserPlus"
          >
            Add Contact
          </Button>
        </div>

        {contacts?.length === 0 ? (
          <div className="text-center py-8 border-2 border-dashed border-muted rounded-lg">
            <p className="text-muted-foreground mb-4">No contacts added yet</p>
            <Button onClick={addNewContact} iconName="UserPlus">
              Add First Contact
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {contacts?.map((contact, index) => (
              <div 
                key={contact?.id}
                className={cn(
                  'border rounded-lg p-4 space-y-4',
                  {
                    'border-primary bg-primary/5': contact?.is_primary_contact,
                    'border-border': !contact?.is_primary_contact
                  }
                )}
              >
                {/* Contact Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-muted-foreground">
                      Contact #{index + 1}
                    </span>
                    {contact?.is_primary_contact && (
                      <span className="px-2 py-0.5 text-xs bg-primary text-primary-foreground rounded-full">
                        Primary
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {!contact?.is_primary_contact && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setPrimaryContact(contact?.id)}
                        className="text-xs"
                      >
                        Make Primary
                      </Button>
                    )}
                    {contacts?.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeContact(contact?.id)}
                        iconName="X"
                        className="text-destructive hover:text-destructive"
                      />
                    )}
                  </div>
                </div>

                {/* Contact Form */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="First Name"
                    value={contact?.first_name}
                    onChange={(e) => updateContact(contact?.id, 'first_name', e?.target?.value)}
                    error={validationErrors?.[`${contact?.id}_first_name`]}
                    required
                  />
                  
                  <Input
                    label="Last Name"
                    value={contact?.last_name}
                    onChange={(e) => updateContact(contact?.id, 'last_name', e?.target?.value)}
                    error={validationErrors?.[`${contact?.id}_last_name`]}
                    required
                  />
                  
                  <Input
                    label="Job Title"
                    value={contact?.title}
                    onChange={(e) => updateContact(contact?.id, 'title', e?.target?.value)}
                    placeholder="Property Manager"
                    list={`roles-${contact?.id}`}
                  />
                  
                  <Select
                    label="Contact Stage"
                    value={contact?.stage}
                    onChange={(value) => updateContact(contact?.id, 'stage', value)}
                    onSearchChange={() => {}}
                    onOpenChange={() => {}}
                    name={`stage-${contact?.id}`}
                    id={`stage-${contact?.id}`}
                  >
                    {contactStages?.map(stage => (
                      <option key={stage} value={stage}>{stage}</option>
                    ))}
                  </Select>
                  
                  <Input
                    label="Email"
                    type="email"
                    value={contact?.email}
                    onChange={(e) => updateContact(contact?.id, 'email', e?.target?.value)}
                    error={validationErrors?.[`${contact?.id}_email`]}
                    placeholder="contact@company.com"
                  />
                  
                  <Input
                    label="Phone"
                    value={contact?.phone}
                    onChange={(e) => updateContact(contact?.id, 'phone', e?.target?.value)}
                    error={validationErrors?.[`${contact?.id}_phone`]}
                    placeholder="+1 (555) 123-4567"
                  />
                  
                  <Input
                    label="Mobile Phone"
                    value={contact?.mobile_phone}
                    onChange={(e) => updateContact(contact?.id, 'mobile_phone', e?.target?.value)}
                    placeholder="+1 (555) 987-6543"
                  />
                  
                  <Select
                    label="Role Assignment"
                    value={contact?.role_assignment}
                    onChange={(value) => updateContact(contact?.id, 'role_assignment', value)}
                    onSearchChange={() => {}}
                    onOpenChange={() => {}}
                    name={`role-assignment-${contact?.id}`}
                    id={`role-assignment-${contact?.id}`}
                  >
                    <option value="decision_maker">Decision Maker</option>
                    <option value="influencer">Influencer</option>
                    <option value="end_user">End User</option>
                    <option value="gatekeeper">Gatekeeper</option>
                  </Select>
                </div>

                {/* Contact Notes */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Notes
                  </label>
                  <textarea
                    className="w-full min-h-[60px] px-3 py-2 border border-input rounded-md bg-background text-foreground placeholder:text-muted-foreground resize-none"
                    value={contact?.notes}
                    onChange={(e) => updateContact(contact?.id, 'notes', e?.target?.value)}
                    placeholder="Additional notes about this contact..."
                  />
                </div>

                {/* Hidden datalist for job titles */}
                <datalist id={`roles-${contact?.id}`}>
                  {defaultRoles?.map(role => (
                    <option key={role} value={role} />
                  ))}
                </datalist>
              </div>
            ))}
          </div>
        )}
      </div>
      {/* Bulk Contact Actions */}
      {contacts?.length > 0 && (
        <div className="bg-muted/30 rounded-lg p-4">
          <h4 className="font-medium text-foreground mb-3">Bulk Actions</h4>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setContacts(prev => prev?.map(contact => ({
                  ...contact,
                  stage: 'Identified'
                })));
              }}
            >
              Set All to "Identified"
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setContacts(prev => prev?.map(contact => ({
                  ...contact,
                  role_assignment: 'decision_maker'
                })));
              }}
            >
              Mark All as Decision Makers
            </Button>
          </div>
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
          Skip Contacts
        </Button>
        
        <Button
          onClick={handleContinue}
          className="flex-1"
          iconName="ArrowRight"
        >
          Continue ({contacts?.filter(c => c?.first_name && c?.last_name)?.length} contacts)
        </Button>
      </div>
    </div>
  );
};

export default ContactCreationStep;