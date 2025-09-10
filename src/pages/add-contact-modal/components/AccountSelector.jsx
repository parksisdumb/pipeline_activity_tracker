import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Input from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';

const AccountSelector = ({ 
  selectedAccount, 
  accounts, 
  searchTerm, 
  onSearchChange, 
  onAccountSelect, 
  onAddNewAccount,
  loading,
  disabled 
}) => {
  const [showDropdown, setShowDropdown] = useState(false);

  const handleSearchInputChange = (e) => {
    const value = e?.target?.value;
    onSearchChange(value);
    setShowDropdown(value?.length > 0 && !selectedAccount);
  };

  const handleAccountClick = (account) => {
    onAccountSelect(account?.id);
    setShowDropdown(false);
  };

  const handleInputFocus = () => {
    if (!selectedAccount && searchTerm?.length > 0) {
      setShowDropdown(true);
    }
  };

  const handleInputBlur = () => {
    // Delay hiding dropdown to allow clicks on dropdown items
    setTimeout(() => setShowDropdown(false), 150);
  };

  const displayValue = selectedAccount 
    ? `${selectedAccount?.name} (${selectedAccount?.company_type})`
    : searchTerm;

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-foreground">
        Account <span className="text-destructive">*</span>
      </label>
      
      <div className="relative">
        <Input
          value={displayValue}
          onChange={handleSearchInputChange}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          placeholder={loading ? "Loading accounts..." : "Search accounts..."}
          disabled={disabled || loading}
          className={selectedAccount ? 'bg-muted' : ''}
        />

        {/* Clear selection button */}
        {selectedAccount && (
          <button
            type="button"
            onClick={() => {
              onAccountSelect('');
              onSearchChange('');
            }}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 hover:bg-muted rounded"
            disabled={disabled}
          >
            <Icon name="X" size={14} className="text-muted-foreground" />
          </button>
        )}

        {/* Dropdown */}
        {showDropdown && accounts?.length > 0 && (
          <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-md shadow-lg max-h-60 overflow-y-auto">
            {accounts?.slice(0, 10)?.map((account) => (
              <button
                key={account?.id}
                type="button"
                onClick={() => handleAccountClick(account)}
                className="w-full text-left p-3 hover:bg-muted/50 transition-colors border-b border-border last:border-b-0 focus:outline-none focus:bg-muted/50"
              >
                <div className="font-medium text-foreground">{account?.name}</div>
                <div className="text-sm text-muted-foreground">
                  {account?.company_type}
                  {account?.city && account?.state && (
                    <span> • {account?.city}, {account?.state}</span>
                  )}
                </div>
              </button>
            ))}
            
            {/* Show message if more results exist */}
            {accounts?.length > 10 && (
              <div className="p-2 text-xs text-muted-foreground text-center border-t border-border">
                Showing first 10 results. Continue typing to narrow search.
              </div>
            )}
          </div>
        )}

        {/* No results message */}
        {showDropdown && accounts?.length === 0 && searchTerm?.length > 0 && (
          <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-md shadow-lg">
            <div className="p-3 text-sm text-muted-foreground text-center">
              No accounts found matching "{searchTerm}"
            </div>
          </div>
        )}
      </div>

      {/* Add New Account Button */}
      <Button
        type="button"
        variant="outline"
        onClick={onAddNewAccount}
        className="w-full"
        iconName="Plus"
        iconPosition="left"
        disabled={disabled}
      >
        Add New Account
      </Button>
    </div>
  );
};

export default AccountSelector;