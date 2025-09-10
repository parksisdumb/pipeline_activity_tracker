import React, { useState, useEffect, useCallback } from 'react';
import Select from '../../../components/ui/Select';
import Button from '../../../components/ui/Button';
import Icon from '../../../components/AppIcon';
import { accountsService } from '../../../services/accountsService';
import { contactsService } from '../../../services/contactsService';
import { propertiesService } from '../../../services/propertiesService';

const EntitySearchSelector = ({ 
  entityType, 
  value, 
  onChange, 
  error, 
  disabled = false,
  onCreateNew 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredOptions, setFilteredOptions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [allOptions, setAllOptions] = useState([]);

  // Fetch data from services based on entity type
  const fetchEntityData = useCallback(async () => {
    setIsLoading(true);
    try {
      let response;
      let formattedOptions = [];

      switch (entityType) {
        case 'account':
          response = await accountsService?.getAccounts({ showInactive: false });
          if (response?.success) {
            formattedOptions = response?.data?.map(account => ({
              value: account?.id,
              label: account?.name,
              description: account?.company_type || 'Account',
              properties_count: account?.propertiesCount || 0,
              contacts_count: account?.contacts?.length || 0
            }));
          }
          break;

        case 'property':
          response = await propertiesService?.getProperties();
          if (response?.success) {
            formattedOptions = response?.data?.map(property => ({
              value: property?.id,
              label: property?.name,
              description: `${property?.building_type || 'Property'} • ${property?.square_footage ? `${property?.square_footage?.toLocaleString()} sq ft` : 'Size N/A'}`,
              address: property?.address
            }));
          }
          break;

        case 'contact':
          response = await contactsService?.getContacts();
          if (response?.success) {
            formattedOptions = response?.data?.map(contact => ({
              value: contact?.id,
              label: `${contact?.first_name} ${contact?.last_name}`,
              description: `${contact?.title || 'Contact'} • ${contact?.account?.name || 'No Account'}`,
              email: contact?.email,
              phone: contact?.phone
            }));
          }
          break;

        default:
          break;
      }

      if (response?.success) {
        setAllOptions(formattedOptions);
        setFilteredOptions(formattedOptions);
      } else {
        console.error(`Failed to load ${entityType}s:`, response?.error);
        // Fallback to empty array on error
        setAllOptions([]);
        setFilteredOptions([]);
      }
    } catch (error) {
      console.error(`Error fetching ${entityType} data:`, error);
      setAllOptions([]);
      setFilteredOptions([]);
    } finally {
      setIsLoading(false);
    }
  }, [entityType]);

  // Initial data fetch
  useEffect(() => {
    fetchEntityData();
  }, [fetchEntityData]);

  // Filter options based on search term
  useEffect(() => {
    if (searchTerm) {
      const filtered = allOptions?.filter(option => 
        option?.label?.toLowerCase()?.includes(searchTerm?.toLowerCase()) ||
        option?.description?.toLowerCase()?.includes(searchTerm?.toLowerCase()) ||
        option?.email?.toLowerCase()?.includes(searchTerm?.toLowerCase()) ||
        option?.address?.toLowerCase()?.includes(searchTerm?.toLowerCase())
      );
      setFilteredOptions(filtered);
    } else {
      setFilteredOptions(allOptions);
    }
  }, [searchTerm, allOptions]);

  // Refresh data when new entities might be created
  const handleRefreshData = useCallback(() => {
    fetchEntityData();
  }, [fetchEntityData]);

  // Expose refresh function to parent components
  useEffect(() => {
    // Listen for custom events that indicate new entities were created
    const handleEntityCreated = (event) => {
      if (event?.detail?.entityType === entityType) {
        handleRefreshData();
      }
    };

    window.addEventListener('entityCreated', handleEntityCreated);
    
    return () => {
      window.removeEventListener('entityCreated', handleEntityCreated);
    };
  }, [entityType, handleRefreshData]);

  const getEntityIcon = () => {
    switch (entityType) {
      case 'account': return 'Building2';
      case 'property': return 'MapPin';
      case 'contact': return 'User';
      default: return 'Search';
    }
  };

  const getEntityLabel = () => {
    switch (entityType) {
      case 'account': return 'Account';
      case 'property': return 'Property';
      case 'contact': return 'Contact';
      default: return 'Entity';
    }
  };

  const handleSearchChange = (newSearchTerm) => {
    setSearchTerm(newSearchTerm);
  };

  const handleCreateNewWithRefresh = async () => {
    if (onCreateNew) {
      await onCreateNew();
      // Refresh data after creation
      setTimeout(() => {
        handleRefreshData();
      }, 500);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Icon name={getEntityIcon()} size={18} className="text-primary" />
          <h3 className="text-sm font-medium text-foreground">{getEntityLabel()}</h3>
          {isLoading && (
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefreshData}
            iconName="RefreshCw"
            iconPosition="left"
            className="text-xs"
            disabled={isLoading}
          >
            Refresh
          </Button>
          {onCreateNew && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCreateNewWithRefresh}
              iconName="Plus"
              iconPosition="left"
              className="text-xs"
            >
              Create New
            </Button>
          )}
        </div>
      </div>
      <Select
        options={filteredOptions}
        value={value}
        onChange={onChange}
        onSearchChange={handleSearchChange}
        placeholder={`Search ${getEntityLabel()?.toLowerCase()}...`}
        error={error}
        disabled={disabled || isLoading}
        required
        searchable
        clearable
        loading={isLoading}
        emptyMessage={
          isLoading 
            ? `Loading ${getEntityLabel()?.toLowerCase()}s...`
            : `No ${getEntityLabel()?.toLowerCase()}s found`
        }
      />
    </div>
  );
};

export default EntitySearchSelector;