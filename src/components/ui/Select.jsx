// components/ui/Select.jsx - Shadcn style Select
import React, { useState, useRef } from "react";
import { ChevronDown, Search, X } from "lucide-react";
import { cn } from "../../utils/cn";
import Button from "./Button";
import Input from "./Input";

const Select = ({
  options = [],
  value,
  onChange,
  onSearchChange,
  placeholder = "Select an option",
  error,
  disabled = false,
  required = false,
  searchable = false,
  clearable = false,
  loading = false,
  emptyMessage = "No options found",
  className = "",
  id,
  multiple = false,
  onOpenChange,
  label,
  ref,
  name,
  description,
  ...props
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const selectRef = useRef(null);

  // Generate unique ID if not provided
  const selectId = id || `select-${Math.random()?.toString(36)?.substr(2, 9)}`;

  // Filter options based on search
  const filteredOptions = searchable && searchTerm
      ? options?.filter(option =>
        option?.label?.toLowerCase()?.includes(searchTerm?.toLowerCase()) ||
        (option?.value && option?.value?.toString()?.toLowerCase()?.includes(searchTerm?.toLowerCase()))
      )
      : options;

  // Get selected option(s) for display
  const getSelectedDisplay = () => {
    if (!value) return placeholder;

    if (multiple) {
      const selectedOptions = options?.filter(opt => value?.includes(opt?.value));
      if (selectedOptions?.length === 0) return placeholder;
      if (selectedOptions?.length === 1) return selectedOptions?.[0]?.label;
      return `${selectedOptions?.length} items selected`;
    }

    const selectedOption = options?.find(opt => opt?.value === value);
    return selectedOption ? selectedOption?.label : placeholder;
  };

  const handleToggle = () => {
    if (!disabled) {
      const newIsOpen = !isOpen;
      setIsOpen(newIsOpen);
      onOpenChange?.(newIsOpen);
      if (!newIsOpen) {
        setSearchTerm("");
      }
    }
  };

  const handleOptionSelect = (option) => {
    if (multiple) {
      const newValue = value || [];
      const updatedValue = newValue?.includes(option?.value)
          ? newValue?.filter(v => v !== option?.value)
          : [...newValue, option?.value];
      onChange?.(updatedValue);
    } else {
      onChange?.(option?.value);
      setIsOpen(false);
      onOpenChange?.(false);
    }
  };

  const handleClear = (e) => {
    e?.stopPropagation();
    onChange?.(multiple ? [] : '');
  };

  const handleSearchChange = (e) => {
    const newSearchTerm = e?.target?.value || '';
    setSearchTerm(newSearchTerm);
    onSearchChange?.(newSearchTerm);
  };

  const isSelected = (optionValue) => {
    if (multiple) {
      return value?.includes(optionValue) || false;
    }
    return value === optionValue;
  };

  const hasValue = multiple ? value?.length > 0 : value !== undefined && value !== '';

  return (
    <div className={`relative ${className}`} ref={selectRef}>
      {label && (
        <label
          htmlFor={selectId}
          className={cn(
            "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 mb-2 block",
            error ? "text-destructive" : "text-foreground"
          )}
        >
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        <button
          ref={ref}
          id={selectId}
          type="button"
          className={cn(
            "flex h-10 w-full items-center justify-between rounded-md border border-input bg-white text-black px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            error && "border-destructive focus:ring-destructive",
            !hasValue && "text-muted-foreground"
          )}
          onClick={handleToggle}
          disabled={disabled}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          {...props}
        >
          <span className="truncate">{getSelectedDisplay()}</span>

          <div className="flex items-center gap-1">
            {loading && (
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            )}

            {clearable && hasValue && !loading && (
              <Button
                variant="ghost"
                size="icon"
                className="h-4 w-4"
                onClick={handleClear}
              >
                <X className="h-3 w-3" />
              </Button>
            )}

            <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
          </div>
        </button>

        {/* Hidden native select for form submission */}
        <select
          name={name}
          value={value || ''}
          onChange={() => { }} // Controlled by our custom logic
          className="sr-only"
          tabIndex={-1}
          multiple={multiple}
          required={required}
        >
          <option value="">Select...</option>
          {options?.map(option => (
            <option key={option?.value} value={option?.value}>
              {option?.label}
            </option>
          ))}
        </select>

        {/* Dropdown */}
        {isOpen && (
          <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-60 overflow-auto">
            {searchable && (
              <div className="p-2 border-b border-border">
                <Input
                  type="text"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={handleSearchChange}
                  className="h-8"
                  autoFocus
                />
              </div>
            )}
            
            <div className="py-1">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                  <span className="ml-2 text-sm text-muted-foreground">Loading...</span>
                </div>
              ) : filteredOptions?.length > 0 ? (
                filteredOptions?.map((option) => (
                  <button
                    key={option?.value}
                    type="button"
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-accent focus:bg-accent focus:outline-none ${
                      value === option?.value ? 'bg-accent text-accent-foreground' : 'text-foreground'
                    }`}
                    onClick={() => handleOptionSelect(option)}
                  >
                    <div className="flex flex-col">
                      <span className="font-medium">{option?.label}</span>
                      {option?.description && (
                        <span className="text-xs text-muted-foreground mt-1">
                          {option?.description}
                        </span>
                      )}
                    </div>
                  </button>
                ))
              ) : (
                <div className="px-3 py-8 text-center text-sm text-muted-foreground">
                  {emptyMessage}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      {description && !error && (
        <p className="text-sm text-muted-foreground mt-1">
          {description}
        </p>
      )}
      {error && (
        <p className="text-sm text-destructive mt-1">
          {error}
        </p>
      )}
    </div>
  );
};

Select.displayName = "Select";

export default Select;