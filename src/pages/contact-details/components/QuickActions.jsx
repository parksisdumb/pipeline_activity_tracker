import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import LinkPropertyModal from '../../../components/ui/LinkPropertyModal';
import SetReminderModal from '../../../components/ui/SetReminderModal';

const QuickActions = ({ contact, onActivityLog, onPhoneCall, onEmail, onContactUpdate }) => {
  const [showLinkPropertyModal, setShowLinkPropertyModal] = useState(false);
  const [showReminderModal, setShowReminderModal] = useState(false);

  const quickActions = [
    {
      label: 'Log Activity',
      icon: 'Plus',
      onClick: () => onActivityLog({ type: 'general', contactId: contact?.id }),
      variant: 'default',
      description: 'Record a new interaction'
    },
    {
      label: 'Call',
      icon: 'Phone',
      onClick: onPhoneCall,
      variant: 'outline',
      disabled: !contact?.phone,
      description: 'Make a phone call'
    },
    {
      label: 'Email',
      icon: 'Mail',
      onClick: onEmail,
      variant: 'outline',
      description: 'Send an email'
    },
    {
      label: 'Schedule Meeting',
      icon: 'Calendar',
      onClick: () => onActivityLog({ type: 'meeting', contactId: contact?.id }),
      variant: 'outline',
      description: 'Set up a meeting'
    }
  ];

  const relationshipActions = [
    {
      label: 'Link Property',
      icon: 'MapPin',
      onClick: () => setShowLinkPropertyModal(true),
      description: 'Associate with a property'
    },
    {
      label: 'Add Note',
      icon: 'FileText',
      onClick: () => onActivityLog({ type: 'note', contactId: contact?.id }),
      description: 'Add a quick note'
    },
    {
      label: 'Set Reminder',
      icon: 'Bell',
      onClick: () => setShowReminderModal(true),
      description: 'Create a follow-up reminder'
    }
  ];

  const handlePropertyLinkSuccess = () => {
    // Notify parent component to refresh contact data
    onContactUpdate?.();
  };

  const handleReminderSuccess = () => {
    // Notify parent component to refresh activities
    onContactUpdate?.();
  };

  return (
    <>
      <div className="bg-card rounded-lg border border-border elevation-1">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h3>
          
          {/* Primary Actions */}
          <div className="space-y-3 mb-6">
            {quickActions?.map((action, index) => (
              <Button
                key={index}
                variant={action?.variant || 'outline'}
                size="sm"
                onClick={action?.onClick}
                disabled={action?.disabled}
                className="w-full justify-start h-auto py-3"
              >
                <Icon name={action?.icon} size={16} className="mr-3" />
                <div className="flex-1 text-left">
                  <div className="font-medium">{action?.label}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {action?.description}
                  </div>
                </div>
              </Button>
            ))}
          </div>

          {/* Secondary Actions */}
          <div className="pt-4 border-t border-border">
            <h4 className="text-sm font-medium text-foreground mb-3">Additional Actions</h4>
            <div className="space-y-2">
              {relationshipActions?.map((action, index) => (
                <button
                  key={index}
                  onClick={action?.onClick}
                  className="flex items-center space-x-3 w-full p-2 text-left rounded-md hover:bg-muted/50 transition-colors"
                >
                  <Icon name={action?.icon} size={16} className="text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{action?.label}</p>
                    <p className="text-xs text-muted-foreground">{action?.description}</p>
                  </div>
                  <Icon name="ChevronRight" size={14} className="text-muted-foreground" />
                </button>
              ))}
            </div>
          </div>

          {/* Current Property Status */}
          {contact?.propertyId && (
            <div className="mt-6 pt-4 border-t border-border">
              <div className="flex items-center space-x-2 mb-2">
                <Icon name="MapPin" size={16} className="text-primary" />
                <h4 className="text-sm font-medium text-foreground">Linked Property</h4>
              </div>
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
                <p className="text-sm font-medium text-foreground">
                  {contact?.property || 'Property Name'}
                </p>
                <p className="text-xs text-muted-foreground">
                  Click "Link Property" to change or view details
                </p>
              </div>
            </div>
          )}

          {/* Communication Preferences */}
          <div className="mt-6 pt-4 border-t border-border">
            <div className="flex items-center space-x-2 mb-2">
              <Icon name="MessageSquare" size={16} className="text-muted-foreground" />
              <h4 className="text-sm font-medium text-foreground">Communication Tips</h4>
            </div>
            
            <div className="space-y-2 text-xs text-muted-foreground">
              {contact?.preferredCommunication && (
                <p>• Prefers {contact?.preferredCommunication?.toLowerCase()} communication</p>
              )}
              {contact?.timeZone && (
                <p>• Located in {contact?.timeZone} timezone</p>
              )}
              {contact?.notes && (
                <p>• Check notes for communication preferences</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <LinkPropertyModal
        isOpen={showLinkPropertyModal}
        onClose={() => setShowLinkPropertyModal(false)}
        contact={contact}
        onSuccess={handlePropertyLinkSuccess}
      />

      <SetReminderModal
        isOpen={showReminderModal}
        onClose={() => setShowReminderModal(false)}
        contact={contact}
        onSuccess={handleReminderSuccess}
      />
    </>
  );
};

export default QuickActions;