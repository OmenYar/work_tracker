import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Check, X, Pencil } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * InlineEditCell - Component for inline editing in tables
 * Supports text, select, and date inputs with save/cancel actions
 */
const InlineEditCell = ({
    value,
    onSave,
    type = 'text', // 'text', 'select', 'date', 'number'
    options = [], // For select type: [{ value: 'x', label: 'X' }]
    placeholder = '',
    className,
    disabled = false,
    maxLength,
    min,
    max,
    formatter, // Function to format display value
    validator, // Function to validate input, returns error message or null
}) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState(value);
    const [error, setError] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const inputRef = useRef(null);
    const containerRef = useRef(null);

    // Reset edit value when original value changes
    useEffect(() => {
        if (!isEditing) {
            setEditValue(value);
        }
    }, [value, isEditing]);

    // Focus input when entering edit mode
    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            if (type === 'text' || type === 'number') {
                inputRef.current.select();
            }
        }
    }, [isEditing, type]);

    // Handle click outside to cancel
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                handleCancel();
            }
        };

        if (isEditing) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isEditing]);

    const handleStartEdit = useCallback(() => {
        if (disabled) return;
        setIsEditing(true);
        setEditValue(value);
        setError(null);
    }, [disabled, value]);

    const handleCancel = useCallback(() => {
        setIsEditing(false);
        setEditValue(value);
        setError(null);
    }, [value]);

    const handleSave = useCallback(async () => {
        // Validate if validator provided
        if (validator) {
            const validationError = validator(editValue);
            if (validationError) {
                setError(validationError);
                return;
            }
        }

        // Don't save if value hasn't changed
        if (editValue === value) {
            setIsEditing(false);
            return;
        }

        setIsSaving(true);
        try {
            await onSave(editValue);
            setIsEditing(false);
            setError(null);
        } catch (err) {
            setError(err.message || 'Failed to save');
        } finally {
            setIsSaving(false);
        }
    }, [editValue, value, onSave, validator]);

    const handleKeyDown = useCallback((e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSave();
        } else if (e.key === 'Escape') {
            handleCancel();
        }
    }, [handleSave, handleCancel]);

    const displayValue = formatter ? formatter(value) : value;

    // View mode
    if (!isEditing) {
        return (
            <div
                ref={containerRef}
                onClick={handleStartEdit}
                className={cn(
                    "group relative flex items-center gap-2 min-h-[32px] px-2 py-1 rounded cursor-pointer",
                    !disabled && "hover:bg-muted/50",
                    disabled && "opacity-60 cursor-not-allowed",
                    className
                )}
            >
                <span className="flex-1 truncate">
                    {displayValue || <span className="text-muted-foreground italic">{placeholder || 'Click to edit'}</span>}
                </span>
                {!disabled && (
                    <Pencil className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                )}
            </div>
        );
    }

    // Edit mode
    return (
        <div ref={containerRef} className="flex items-center gap-1">
            {type === 'select' ? (
                <Select
                    value={editValue || ''}
                    onValueChange={(val) => {
                        setEditValue(val);
                        setError(null);
                    }}
                    disabled={isSaving}
                >
                    <SelectTrigger className="h-8 min-w-[120px]">
                        <SelectValue placeholder={placeholder} />
                    </SelectTrigger>
                    <SelectContent>
                        {options.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            ) : (
                <Input
                    ref={inputRef}
                    type={type}
                    value={editValue || ''}
                    onChange={(e) => {
                        setEditValue(e.target.value);
                        setError(null);
                    }}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    disabled={isSaving}
                    maxLength={maxLength}
                    min={min}
                    max={max}
                    className={cn(
                        "h-8 min-w-[100px]",
                        error && "border-destructive focus-visible:ring-destructive"
                    )}
                />
            )}

            <div className="flex gap-0.5">
                <Button
                    size="icon"
                    variant="ghost"
                    onClick={handleSave}
                    disabled={isSaving}
                    className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-100"
                >
                    <Check className="w-3.5 h-3.5" />
                </Button>
                <Button
                    size="icon"
                    variant="ghost"
                    onClick={handleCancel}
                    disabled={isSaving}
                    className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-100"
                >
                    <X className="w-3.5 h-3.5" />
                </Button>
            </div>

            {error && (
                <p className="absolute -bottom-5 left-0 text-xs text-destructive">
                    {error}
                </p>
            )}
        </div>
    );
};

/**
 * InlineEditRow - Component for managing inline edit state for entire row
 */
export const InlineEditRow = ({
    data,
    fields,
    onSave,
    disabled = false,
}) => {
    const [editedFields, setEditedFields] = useState({});
    const [isSaving, setIsSaving] = useState(false);

    const handleFieldChange = useCallback((fieldKey, value) => {
        setEditedFields(prev => ({
            ...prev,
            [fieldKey]: value,
        }));
    }, []);

    const handleSaveField = useCallback(async (fieldKey, value) => {
        setIsSaving(true);
        try {
            await onSave(data.id, { [fieldKey]: value });
            setEditedFields(prev => {
                const next = { ...prev };
                delete next[fieldKey];
                return next;
            });
        } finally {
            setIsSaving(false);
        }
    }, [data.id, onSave]);

    return (
        <div className="flex gap-4">
            {fields.map((field) => (
                <InlineEditCell
                    key={field.key}
                    value={data[field.key]}
                    onSave={(value) => handleSaveField(field.key, value)}
                    type={field.type}
                    options={field.options}
                    placeholder={field.placeholder}
                    disabled={disabled || isSaving}
                    formatter={field.formatter}
                    validator={field.validator}
                    className={field.className}
                />
            ))}
        </div>
    );
};

/**
 * useInlineEdit - Hook for managing inline edit state
 */
export const useInlineEdit = (initialData, onSaveCallback) => {
    const [editingId, setEditingId] = useState(null);
    const [editingField, setEditingField] = useState(null);
    const [isSaving, setIsSaving] = useState(false);

    const startEdit = useCallback((id, field) => {
        setEditingId(id);
        setEditingField(field);
    }, []);

    const cancelEdit = useCallback(() => {
        setEditingId(null);
        setEditingField(null);
    }, []);

    const saveEdit = useCallback(async (id, field, value) => {
        setIsSaving(true);
        try {
            await onSaveCallback(id, { [field]: value });
            setEditingId(null);
            setEditingField(null);
        } finally {
            setIsSaving(false);
        }
    }, [onSaveCallback]);

    const isEditing = useCallback((id, field) => {
        return editingId === id && editingField === field;
    }, [editingId, editingField]);

    return {
        editingId,
        editingField,
        isSaving,
        startEdit,
        cancelEdit,
        saveEdit,
        isEditing,
    };
};

export default InlineEditCell;
