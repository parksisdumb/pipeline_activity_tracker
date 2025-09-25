import React from "react";
import { Check, Minus } from "lucide-react";
import { cn } from "../../utils/cn";

const Checkbox = React.forwardRef(({
    className,
    id,
    checked,
    indeterminate = false,
    disabled = false,
    required = false,
    label,
    description,
    error,
    size = "default",
    onChange,
    ...props
}, ref) => {
    // Generate unique ID if not provided
    const checkboxId = id || `checkbox-${Math.random()?.toString(36)?.substr(2, 9)}`;

    // Size variants
    const sizeClasses = {
        sm: "h-4 w-4",
        default: "h-4 w-4",
        lg: "h-5 w-5"
    };

    // Handle checkbox change
    const handleChange = (e) => {
        if (onChange) {
            onChange(e);
        }
    };

    // Handle label click to ensure checkbox is toggled
    const handleLabelClick = (e) => {
        if (disabled) return;
        
        // Create synthetic event to maintain consistency
        const syntheticEvent = {
            target: {
                checked: !checked,
                value: !checked
            },
            preventDefault: () => e?.preventDefault(),
            stopPropagation: () => e?.stopPropagation()
        };
        
        if (onChange) {
            onChange(syntheticEvent);
        }
    };

    return (
        <div className={cn("flex items-start space-x-2", className)}>
            <div className="relative">
                <input
                    type="checkbox"
                    ref={ref}
                    id={checkboxId}
                    checked={checked}
                    disabled={disabled}
                    required={required}
                    onChange={handleChange}
                    className="sr-only"
                    {...props}
                />

                <div
                    role="checkbox"
                    aria-checked={indeterminate ? "mixed" : checked}
                    aria-labelledby={label ? `${checkboxId}-label` : undefined}
                    tabIndex={disabled ? -1 : 0}
                    onClick={handleLabelClick}
                    onKeyDown={(e) => {
                        if (e?.key === ' ' || e?.key === 'Enter') {
                            e?.preventDefault();
                            handleLabelClick(e);
                        }
                    }}
                    className={cn(
                        "shrink-0 rounded-sm border border-black ring-offset-background transition-colors duration-200",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                        "cursor-pointer flex items-center justify-center",
                        "hover:border-primary hover:bg-primary/5",
                        sizeClasses?.[size],
                        checked && "bg-primary border-primary text-primary-foreground hover:bg-primary/90",
                        indeterminate && "bg-primary border-primary text-primary-foreground hover:bg-primary/90",
                        error && "border-destructive hover:border-destructive",
                        disabled && "cursor-not-allowed opacity-50 hover:border-input hover:bg-transparent"
                    )}
                >
                    {checked && !indeterminate && (
                        <Check className="h-3 w-3 text-current" />
                    )}
                    {indeterminate && (
                        <Minus className="h-3 w-3 text-current" />
                    )}
                </div>
            </div>
            {(label || description || error) && (
                <div className="flex-1 space-y-1">
                    {label && (
                        <label
                            id={`${checkboxId}-label`}
                            htmlFor={checkboxId}
                            onClick={(e) => {
                                e?.preventDefault();
                                handleLabelClick(e);
                            }}
                            className={cn(
                                "text-sm font-medium leading-none cursor-pointer",
                                "hover:text-primary transition-colors",
                                error ? "text-destructive" : "text-foreground",
                                disabled && "cursor-not-allowed opacity-70"
                            )}
                        >
                            {label}
                            {required && <span className="text-destructive ml-1">*</span>}
                        </label>
                    )}

                    {description && !error && (
                        <p className="text-sm text-muted-foreground">
                            {description}
                        </p>
                    )}

                    {error && (
                        <p className="text-sm text-destructive">
                            {error}
                        </p>
                    )}
                </div>
            )}
        </div>
    );
});

Checkbox.displayName = "Checkbox";

// Checkbox Group component
const CheckboxGroup = React.forwardRef(({
    className,
    children,
    label,
    description,
    error,
    required = false,
    disabled = false,
    ...props
}, ref) => {
    return (
        <fieldset
            ref={ref}
            disabled={disabled}
            className={cn("space-y-3", className)}
            {...props}
        >
            {label && (
                <legend className={cn(
                    "text-sm font-medium",
                    error ? "text-destructive" : "text-foreground"
                )}>
                    {label}
                    {required && <span className="text-destructive ml-1">*</span>}
                </legend>
            )}

            {description && !error && (
                <p className="text-sm text-muted-foreground">
                    {description}
                </p>
            )}

            <div className="space-y-2">
                {children}
            </div>

            {error && (
                <p className="text-sm text-destructive">
                    {error}
                </p>
            )}
        </fieldset>
    );
});

CheckboxGroup.displayName = "CheckboxGroup";

export { Checkbox, CheckboxGroup };