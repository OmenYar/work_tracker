import React from 'react';
import { AlertTriangle } from 'lucide-react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';

/**
 * UnsavedChangesDialog - Dialog component to warn users about unsaved changes
 * Use with useBlocker from react-router-dom
 */
const UnsavedChangesDialog = ({
    isOpen,
    onConfirm,
    onCancel,
    title = "Unsaved Changes",
    description = "You have unsaved changes. Are you sure you want to leave? Your changes will be lost.",
    confirmText = "Leave Page",
    cancelText = "Stay"
}) => {
    return (
        <AlertDialog open={isOpen} onOpenChange={(open) => !open && onCancel?.()}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-yellow-500" />
                        {title}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                        {description}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={onCancel}>
                        {cancelText}
                    </AlertDialogCancel>
                    <AlertDialogAction
                        onClick={onConfirm}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                        {confirmText}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
};

/**
 * Hook wrapper for UnsavedChangesDialog with React Router blocker
 */
export const useUnsavedChangesDialog = (blocker) => {
    const isBlocked = blocker?.state === 'blocked';

    const handleConfirm = () => {
        if (blocker?.proceed) {
            blocker.proceed();
        }
    };

    const handleCancel = () => {
        if (blocker?.reset) {
            blocker.reset();
        }
    };

    return {
        isBlocked,
        handleConfirm,
        handleCancel,
        DialogComponent: () => (
            <UnsavedChangesDialog
                isOpen={isBlocked}
                onConfirm={handleConfirm}
                onCancel={handleCancel}
            />
        ),
    };
};

export default UnsavedChangesDialog;
