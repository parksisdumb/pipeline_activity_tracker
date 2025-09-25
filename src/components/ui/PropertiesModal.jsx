import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import Button from './Button';
import Icon from '../AppIcon';
import { contactsService } from '../../services/contactsService';

const PropertiesModal = ({ isOpen, onClose, contact, onNavigateToProperty }) => {
  const [linkedProperties, setLinkedProperties] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && contact?.id) {
      loadLinkedProperties();
    }
  }, [isOpen, contact?.id]);

  const loadLinkedProperties = async () => {
    setLoading(true);
    setError(null);

    try {
      console.log('Loading linked properties for contact:', contact?.id);
      const result = await contactsService?.getLinkedProperties(contact?.id);
      console.log('Linked properties result:', result);
      
      if (result?.success) {
        setLinkedProperties(result?.data || []);
        console.log('Linked properties:', result?.data);
      } else {
        const errorMsg = result?.error || 'Failed to load linked properties';
        setError(errorMsg);
        console.error('Failed to load linked properties:', errorMsg);
      }
    } catch (err) {
      console.error('Error loading linked properties:', err);
      setError('Failed to load linked properties');
    } finally {
      setLoading(false);
    }
  };

  const handlePropertyClick = (propertyId) => {
    if (propertyId) {
      onNavigateToProperty?.(propertyId);
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Linked Properties">
      <div className="space-y-6">
        {/* Header Info */}
        <div className="flex items-center space-x-3">
          <Icon name="Building2" size={20} className="text-primary" />
          <div>
            <h3 className="font-semibold text-foreground">Properties for {contact?.name}</h3>
            <p className="text-sm text-muted-foreground">
              {loading ? 'Loading...' : `${linkedProperties?.length || 0} linked properties found`}
            </p>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
              <p className="text-sm text-muted-foreground">Loading linked properties...</p>
            </div>
          </div>
        ) : error ? (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <Icon name="AlertCircle" size={16} className="text-destructive" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          </div>
        ) : linkedProperties?.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Icon name="Building2" size={24} className="text-muted-foreground" />
            </div>
            <h4 className="font-medium text-foreground mb-2">No Properties Linked</h4>
            <p className="text-sm text-muted-foreground mb-4">
              This contact is not currently linked to any properties.
            </p>
            <p className="text-xs text-muted-foreground">
              Use the "Link Property" action to associate this contact with properties.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {linkedProperties?.map((property, index) => (
              <div
                key={property?.id || index}
                className="bg-card border border-border rounded-lg p-4 hover:bg-muted/50 transition-colors cursor-pointer"
                onClick={() => handlePropertyClick(property?.id)}
              >
                <div className="flex items-start space-x-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Icon name="Building" size={16} className="text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-foreground truncate">
                          {property?.name || 'Unnamed Property'}
                        </h4>
                        <p className="text-sm text-muted-foreground truncate">
                          {property?.address || 'No address provided'}
                        </p>
                      </div>
                      <Icon name="ExternalLink" size={16} className="text-muted-foreground ml-2 flex-shrink-0" />
                    </div>
                    
                    <div className="flex items-center space-x-4 mt-2">
                      <div className="flex items-center space-x-1">
                        <Icon name="Tag" size={12} className="text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          {property?.building_type || 'Unknown Type'}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Icon name="Activity" size={12} className="text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          {property?.stage || 'Unknown Stage'}
                        </span>
                      </div>
                    </div>
                    
                    {property?.description && (
                      <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                        {property?.description}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-border">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          {linkedProperties?.length > 0 && (
            <Button onClick={() => window.open('/properties-list', '_blank')}>
              <Icon name="Building2" size={16} className="mr-2" />
              View All Properties
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default PropertiesModal;