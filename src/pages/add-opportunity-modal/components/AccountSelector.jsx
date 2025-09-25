import React, { useState, useEffect } from 'react';
import Select from '../../../components/ui/Select';
import { opportunitiesService } from '../../../services/opportunitiesService';

const AccountSelector = ({ selectedAccountId, onSelectAccount, disabled = false }) => {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadAccounts()
  }, [])

  const loadAccounts = async () => {
    setLoading(true)
    setError('')
    
    try {
      const { data, error } = await opportunitiesService?.getAvailableAccounts()
      
      if (error) {
        setError(error)
        return
      }
      
      setAccounts(data || [])
    } catch (err) {
      setError('Failed to load accounts')
    } finally {
      setLoading(false)
    }
  }

  const accountOptions = accounts?.map(account => ({
    value: account?.id,
    label: `${account?.name} - ${account?.company_type}${account?.city ? `, ${account?.city}` : ''}${account?.state ? `, ${account?.state}` : ''}`
  })) || [];

  if (loading) {
    return (
      <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-md">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
        <span className="text-sm text-gray-600">Loading accounts...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-3 bg-red-50 border border-red-200 rounded-md">
        <p className="text-sm text-red-600">{error}</p>
        <button
          type="button"
          onClick={loadAccounts}
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
        id="account-selector"
        name="accountSelector"
        value={selectedAccountId || ''}
        onChange={onSelectAccount}
        onSearchChange={() => {}}
        onOpenChange={() => {}}
        label="Account"
        description=""
        placeholder="Select Account"
        options={accountOptions}
        disabled={disabled}
        error={error}
      />
      {disabled && (
        <p className="mt-1 text-xs text-gray-500">
          Account selection disabled - property already selected
        </p>
      )}
    </div>
  )
}

export default AccountSelector;