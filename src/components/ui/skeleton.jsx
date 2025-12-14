import React from 'react';
import { cn } from '@/lib/utils';

// Base Skeleton Component
const Skeleton = ({ className, ...props }) => {
    return (
        <div
            className={cn(
                "animate-pulse rounded-md bg-muted",
                className
            )}
            {...props}
        />
    );
};

// Table Skeleton
const TableSkeleton = ({ rows = 5, columns = 6 }) => {
    return (
        <div className="space-y-3">
            {/* Header */}
            <div className="flex gap-4 p-4 bg-muted/50 rounded-t-lg">
                {Array.from({ length: columns }).map((_, i) => (
                    <Skeleton key={i} className="h-4 flex-1" />
                ))}
            </div>
            {/* Rows */}
            {Array.from({ length: rows }).map((_, rowIndex) => (
                <div key={rowIndex} className="flex gap-4 p-4 border-b">
                    {Array.from({ length: columns }).map((_, colIndex) => (
                        <Skeleton
                            key={colIndex}
                            className={cn(
                                "h-4 flex-1",
                                colIndex === 0 && "w-12 flex-none",
                                colIndex === columns - 1 && "w-20 flex-none"
                            )}
                        />
                    ))}
                </div>
            ))}
        </div>
    );
};

// Card Skeleton
const CardSkeleton = ({ hasIcon = true }) => {
    return (
        <div className="rounded-xl border bg-card p-6 space-y-3">
            <div className="flex items-center gap-3">
                {hasIcon && <Skeleton className="h-10 w-10 rounded-full" />}
                <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-6 w-16" />
                </div>
            </div>
        </div>
    );
};

// Dashboard Skeleton (multiple cards)
const DashboardSkeleton = ({ cards = 4 }) => {
    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: cards }).map((_, i) => (
                <CardSkeleton key={i} />
            ))}
        </div>
    );
};

// Chart Skeleton
const ChartSkeleton = ({ height = "300px" }) => {
    return (
        <div className="rounded-xl border bg-card p-6 space-y-4">
            <div className="flex justify-between items-center">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-8 w-24 rounded-md" />
            </div>
            <div style={{ height }} className="flex items-end justify-around gap-2 pt-4">
                {Array.from({ length: 7 }).map((_, i) => (
                    <Skeleton
                        key={i}
                        className="w-full"
                        style={{ height: `${Math.random() * 60 + 40}%` }}
                    />
                ))}
            </div>
        </div>
    );
};

// Form Skeleton
const FormSkeleton = ({ fields = 4 }) => {
    return (
        <div className="space-y-4">
            {Array.from({ length: fields }).map((_, i) => (
                <div key={i} className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-10 w-full rounded-md" />
                </div>
            ))}
            <Skeleton className="h-10 w-32 rounded-md mt-6" />
        </div>
    );
};

// List Skeleton
const ListSkeleton = ({ items = 5, hasAvatar = false }) => {
    return (
        <div className="space-y-3">
            {Array.from({ length: items }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg border">
                    {hasAvatar && <Skeleton className="h-10 w-10 rounded-full" />}
                    <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                    </div>
                    <Skeleton className="h-8 w-8 rounded-md" />
                </div>
            ))}
        </div>
    );
};

// Calendar Skeleton
const CalendarSkeleton = () => {
    return (
        <div className="rounded-xl border bg-card p-6 space-y-4">
            <div className="flex justify-between items-center">
                <Skeleton className="h-6 w-32" />
                <div className="flex gap-2">
                    <Skeleton className="h-8 w-8 rounded-md" />
                    <Skeleton className="h-8 w-8 rounded-md" />
                </div>
            </div>
            <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: 7 }).map((_, i) => (
                    <Skeleton key={i} className="h-6 w-full" />
                ))}
                {Array.from({ length: 35 }).map((_, i) => (
                    <Skeleton key={i} className="aspect-square w-full rounded-md" />
                ))}
            </div>
        </div>
    );
};

export {
    Skeleton,
    TableSkeleton,
    CardSkeleton,
    DashboardSkeleton,
    ChartSkeleton,
    FormSkeleton,
    ListSkeleton,
    CalendarSkeleton
};
