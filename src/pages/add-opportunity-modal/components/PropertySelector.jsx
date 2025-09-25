import React, { useState, useEffect } from 'react';
import Select from '../../../components/ui/Select';
import { opportunitiesService } from '../../../services/opportunitiesService';

const PropertySelector = ({ selectedPropertyId, onSelectProperty, disabled = false }) => {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadProperties();
  }, []);

  const loadProperties = async () => {
    setLoading(true)
    setError('')
    
    try {
      const { data, error } = await opportunitiesService?.getAvailableProperties()
      
      if (error) {
        setError(error)
        return
      }
      
      setProperties(data || [])
    } catch (err) {
      setError('Failed to load properties')
    } finally {
      setLoading(false)
    }
  }

  const propertyOptions = properties?.map(property => ({
    value: property?.id,
    label: `${property?.name} (${property?.building_type}) - ${property?.address || 'No address'}${property?.city ? `, ${property?.city}` : ''}${property?.state ? `, ${property?.state}` : ''}${property?.account?.name ? ` | Account: ${property?.account?.name}` : ''}`
  })) || []

  if (loading) {
    return (
      <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-md">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
        <span className="text-sm text-gray-600">Loading properties...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-3 bg-red-50 border border-red-200 rounded-md">
        <p className="text-sm text-red-600">{error}</p>
        <button
          type="button"
          onClick={loadProperties}
          className="mt-2 text-sm text-red-700 hover:text-red-900 underline"
        >
          Try Again
        </button>
      </div>
    )
  }

  return (
    <div>
      <Select
        ref={null}
        value={selectedPropertyId || ''}
        onChange={onSelectProperty}
        placeholder="Select a property"
        options={propertyOptions}
        disabled={disabled}
        onSearchChange={() => {}}
        error=""
        id="property-selector"
        onOpenChange={() => {}}
        label="Property"
        name="property"
        description=""
      />
      {disabled && (
        <p className="mt-1 text-xs text-gray-500">
          Property selection disabled - account already selected
        </p>
      )}
    </div>
  )
}

export default PropertySelector;