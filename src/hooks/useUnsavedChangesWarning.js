import { useEffect, useCallback, useState } from 'react';
import { useBeforeUnload, useBlocker } from 'react-router-dom';

/**
 * Custom hook to prevent navigation when there are unsaved changes
 * @param {boolean} hasUnsavedChanges - Whether there are unsaved changes
 * @param {string} message - Message to show in the confirmation dialog
 */
export const useUnsavedChangesWarning = (hasUnsavedChanges = false, message = 'You have unsaved changes. Are you sure you want to leave?') => {
    // Block browser refresh/close
    useBeforeUnload(
        useCallback(
            (event) => {
                if (hasUnsavedChanges) {
                    event.preventDefault();
                    event.returnValue = message;
                    return message;
                }
            },
            [hasUnsavedChanges, message]
        )
    );

    // Block React Router navigation
    const blocker = useBlocker(
        useCallback(
            ({ currentLocation, nextLocation }) => {
                return hasUnsavedChanges && currentLocation.pathname !== nextLocation.pathname;
            },
            [hasUnsavedChanges]
        )
    );

    return blocker;
};

/**
 * Custom hook to track form dirty state
 * @param {object} initialValues - Initial form values
 * @param {object} currentValues - Current form values
 */
export const useFormDirtyState = (initialValues, currentValues) => {
    const [isDirty, setIsDirty] = useState(false);

    useEffect(() => {
        const hasChanges = JSON.stringify(initialValues) !== JSON.stringify(currentValues);
        setIsDirty(hasChanges);
    }, [initialValues, currentValues]);

    return isDirty;
};

export default useUnsavedChangesWarning;
