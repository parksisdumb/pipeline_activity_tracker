import React from 'react';
import Button from '../../../components/ui/Button';

const ContactsHeader = ({ totalCount, selectedCount, onBulkAction, onAddContact }) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground mb-2">Contacts</h1>
        <p className="text-muted-foreground">
          Manage your contact relationships and engagement stages
        </p>
        {selectedCount > 0 && (
          <p className="text-sm text-accent mt-1">
            {selectedCount} contact{selectedCount !== 1 ? 's' : ''} selected
          </p>
        )}
      </div>

      <div className="flex items-center gap-3">
        {selectedCount > 0 && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onBulkAction('email')}
              iconName="Mail"
              iconPosition="left"
            >
              Email Selected
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onBulkAction('export')}
              iconName="Download"
              iconPosition="left"
            >
              Export Selected
            </Button>
          </div>
        )}
        
        <Button
          onClick={onAddContact}
          iconName="Plus"
          iconPosition="left"
          className="whitespace-nowrap"
        >
          Add Contact
        </Button>
      </div>
    </div>
  );
};

export default ContactsHeader;