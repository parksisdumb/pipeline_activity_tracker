import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import Button from './Button';
import Select from './Select';
import Icon from '../AppIcon';
import { contactsService } from '../../services/contactsService';

const LinkPropertyModal = ({ isOpen, onClose, contact, onSuccess }) => {
  const [availableProperties, setAvailableProperties] = useState([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [loadingProperties, setLoadingProperties] = useState(false);

  useEffect(() => {
    if (isOpen && contact?.id) {
      loadAvailableProperties();
      // Reset selection when modal opens
      setSelectedPropertyId('');
      setError(null);
    }
  }, [isOpen, contact?.id]);

  const loadAvailableProperties = async () => {
    setLoadingProperties(true);
    setError(null);

    try {
      console.log('Loading properties for contact:', contact?.id);
      const result = await contactsService?.getAvailableProperties(contact?.id);
      console.log('Properties result:', result);
      
      if (result?.success) {
        setAvailableProperties(result?.data || []);
        console.log('Available properties:', result?.data);
      } else {
        const errorMsg = result?.error || 'Failed to load properties';
        setError(errorMsg);
        console.error('Failed to load properties:', errorMsg);
      }
    } catch (err) {
      console.error('Error loading properties:', err);
      setError('Failed to load available properties');
    } finally {
      setLoadingProperties(false);
    }
  };

  const handleLinkProperty = async () => {
    if (!selectedPropertyId) {
      setError('Please select a property');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('Linking property:', selectedPropertyId, 'to contact:', contact?.id);
      const result = await contactsService?.linkToProperty(contact?.id, selectedPropertyId);
      console.log('Link result:', result);
      
      if (result?.success) {
        onSuccess?.();
        onClose();
        setSelectedPropertyId('');
      } else {
        const errorMsg = result?.error || 'Failed to link property';
        setError(errorMsg);
        console.error('Failed to link property:', errorMsg);
      }
    } catch (err) {
      console.error('Error linking property:', err);
      setError('Failed to link property');
    } finally {
      setLoading(false);
    }
  };

  const handleUnlinkProperty = async () => {
    setLoading(true);
    setError(null);

    try {
      console.log('Unlinking property from contact:', contact?.id);
      const result = await contactsService?.unlinkFromProperty(contact?.id);
      console.log('Unlink result:', result);
      
      if (result?.success) {
        onSuccess?.();
        onClose();
      } else {
        const errorMsg = result?.error || 'Failed to unlink property';
        setError(errorMsg);
        console.error('Failed to unlink property:', errorMsg);
      }
    } catch (err) {
      console.error('Error unlinking property:', err);
      setError('Failed to unlink property');
    } finally {
      setLoading(false);
    }
  };

  // Debug information
  const debugInfo = {
    contactId: contact?.id,
    contactAccount: contact?.account_id,
    propertyId: contact?.property_id,
    availablePropertiesCount: availableProperties?.length || 0,
    selectedPropertyId
  };

  console.log('LinkPropertyModal Debug:', debugInfo);

  const propertyOptions = availableProperties?.map(property => ({
    value: property?.id,
    label: `${property?.name || 'Unnamed Property'} - ${property?.address || 'No Address'}`,
    description: `${property?.building_type || 'Unknown Type'} • ${property?.stage || 'Unknown Stage'}`
  })) || [];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Link Property">
      <div className="space-y-6">
        {/* Debug Information - Remove in production */}
        {process.env?.NODE_ENV === 'development' && (
          <div className="bg-gray-100 p-3 rounded text-xs text-gray-600">
            <strong>Debug Info:</strong>
            <br />Contact ID: {debugInfo?.contactId}
            <br />Account ID: {debugInfo?.contactAccount}
            <br />Current Property ID: {debugInfo?.propertyId}
            <br />Available Properties: {debugInfo?.availablePropertiesCount}
          </div>
        )}

        {/* Current Property Status */}
        <div className="bg-muted/50 rounded-lg p-4">
          <div className="flex items-center space-x-3 mb-2">
            <Icon name="MapPin" size={16} className="text-muted-foreground" />
            <h3 className="font-medium text-foreground">Current Property</h3>
          </div>
          {contact?.property_id ? (
            <div className="space-y-2">
              <p className="text-sm text-foreground">
                {contact?.property_name || 'Property Linked'} 
                {contact?.property_address && ` - ${contact?.property_address}`}
              </p>
              <Button
                variant="outline" 
                size="sm"
                onClick={handleUnlinkProperty}
                disabled={loading}
                className="text-destructive border-destructive hover:bg-destructive/10"
              >
                <Icon name="Unlink" size={14} className="mr-2" />
                Unlink Property
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No property currently linked</p>
          )}
        </div>

        {/* Property Selection */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Select Property to Link
            </label>
            <Select
              value={selectedPropertyId}
              onChange={setSelectedPropertyId}
              placeholder={
                loadingProperties 
                  ? "Loading properties..." 
                  : availableProperties?.length === 0 
                    ? "No properties available" :"Choose a property"
              }
              disabled={loadingProperties || loading || availableProperties?.length === 0}
            >
              <option value="">-- Select a Property --</option>
              {propertyOptions?.map((option) => (
                <option key={option?.value} value={option?.value}>
                  {option?.label}
                </option>
              ))}
            </Select>
            
            {/* Help text */}
            <div className="mt-2 text-xs text-muted-foreground">
              {loadingProperties && (
                <p>Loading properties from the same account...</p>
              )}
              {!loadingProperties && availableProperties?.length === 0 && !error && (
                <p>No available properties found in this contact's account.</p>
              )}
              {!loadingProperties && availableProperties?.length > 0 && (
                <p>Showing {availableProperties?.length} available properties from the same account.</p>
              )}
            </div>
          </div>

          {/* Selected Property Info */}
          {selectedPropertyId && (
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
              <div className="flex items-start space-x-3">
                <Icon name="Building" size={16} className="text-primary mt-0.5" />
                <div className="flex-1">
                  {(() => {
                    const selectedProperty = availableProperties?.find(p => p?.id === selectedPropertyId);
                    return selectedProperty ? (
                      <div>
                        <p className="text-sm font-medium text-foreground">{selectedProperty?.name}</p>
                        <p className="text-xs text-muted-foreground">{selectedProperty?.address}</p>
                        <p className="text-xs text-muted-foreground">
                          {selectedProperty?.building_type} • Stage: {selectedProperty?.stage}
                        </p>
                      </div>
                    ) : null;
                  })()}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
            <div className="flex items-center space-x-2">
              <Icon name="AlertCircle" size={16} className="text-destructive" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-border">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleLinkProperty}
            disabled={!selectedPropertyId || loading || loadingProperties}
            className="min-w-[120px]"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                Linking...
              </>
            ) : (
              <>
                <Icon name="Link" size={16} className="mr-2" />
                Link Property
              </>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default LinkPropertyModal;