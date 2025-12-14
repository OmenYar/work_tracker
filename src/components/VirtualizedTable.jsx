import React, { forwardRef, useCallback, useState } from 'react';
import { TableVirtuoso } from 'react-virtuoso';
import { cn } from '@/lib/utils';

/**
 * Virtualized Table component for handling large datasets efficiently
 * Uses react-virtuoso for windowed rendering
 */
const VirtualizedTable = forwardRef(({
    data = [],
    columns = [],
    rowHeight = 52,
    headerHeight = 48,
    maxHeight = 600,
    onRowClick,
    selectedIds = [],
    onSelectionChange,
    isSelectable = false,
    className,
    emptyMessage = 'No data available',
}, ref) => {
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

    // Handle sorting
    const handleSort = useCallback((key) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
        }));
    }, []);

    // Sort data
    const sortedData = React.useMemo(() => {
        if (!sortConfig.key) return data;

        return [...data].sort((a, b) => {
            const aVal = a[sortConfig.key];
            const bVal = b[sortConfig.key];

            if (aVal === null || aVal === undefined) return 1;
            if (bVal === null || bVal === undefined) return -1;

            if (typeof aVal === 'string') {
                return sortConfig.direction === 'asc'
                    ? aVal.localeCompare(bVal)
                    : bVal.localeCompare(aVal);
            }

            return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
        });
    }, [data, sortConfig]);

    // Handle row selection
    const handleRowSelect = useCallback((id) => {
        if (!isSelectable || !onSelectionChange) return;

        if (selectedIds.includes(id)) {
            onSelectionChange(selectedIds.filter(i => i !== id));
        } else {
            onSelectionChange([...selectedIds, id]);
        }
    }, [selectedIds, isSelectable, onSelectionChange]);

    // Handle select all
    const handleSelectAll = useCallback(() => {
        if (!isSelectable || !onSelectionChange) return;

        if (selectedIds.length === data.length) {
            onSelectionChange([]);
        } else {
            onSelectionChange(data.map(item => item.id));
        }
    }, [data, selectedIds, isSelectable, onSelectionChange]);

    const isAllSelected = data.length > 0 && selectedIds.length === data.length;
    const isSomeSelected = selectedIds.length > 0 && selectedIds.length < data.length;

    // Table components for virtuoso
    const TableComponents = {
        Table: ({ style, ...props }) => (
            <table
                {...props}
                className="w-full text-sm"
                style={{ ...style, tableLayout: 'fixed' }}
            />
        ),
        TableHead: forwardRef(({ style, ...props }, ref) => (
            <thead
                ref={ref}
                {...props}
                className="bg-muted/50 sticky top-0 z-10"
                style={{ ...style }}
            />
        )),
        TableRow: ({ item, ...props }) => {
            const isSelected = selectedIds.includes(item?.id);
            return (
                <tr
                    {...props}
                    onClick={() => {
                        if (isSelectable) handleRowSelect(item?.id);
                        if (onRowClick) onRowClick(item);
                    }}
                    className={cn(
                        "border-b transition-colors cursor-pointer",
                        isSelected ? "bg-primary/10" : "hover:bg-muted/50",
                    )}
                />
            );
        },
        TableBody: forwardRef((props, ref) => (
            <tbody ref={ref} {...props} />
        )),
    };

    // Fixed header content
    const fixedHeaderContent = () => (
        <tr className="border-b">
            {isSelectable && (
                <th className="w-12 py-3 px-4">
                    <input
                        type="checkbox"
                        checked={isAllSelected}
                        ref={(el) => {
                            if (el) el.indeterminate = isSomeSelected;
                        }}
                        onChange={handleSelectAll}
                        className="rounded border-input"
                    />
                </th>
            )}
            {columns.map((column) => (
                <th
                    key={column.key}
                    onClick={() => column.sortable !== false && handleSort(column.key)}
                    className={cn(
                        "text-left py-3 px-4 font-medium text-muted-foreground",
                        column.sortable !== false && "cursor-pointer hover:text-foreground",
                        column.className
                    )}
                    style={{ width: column.width }}
                >
                    <div className="flex items-center gap-1">
                        {column.header}
                        {sortConfig.key === column.key && (
                            <span className="text-xs">
                                {sortConfig.direction === 'asc' ? '↑' : '↓'}
                            </span>
                        )}
                    </div>
                </th>
            ))}
        </tr>
    );

    // Row content renderer
    const rowContent = (index, item) => (
        <>
            {isSelectable && (
                <td className="w-12 py-3 px-4">
                    <input
                        type="checkbox"
                        checked={selectedIds.includes(item.id)}
                        onChange={() => handleRowSelect(item.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="rounded border-input"
                    />
                </td>
            )}
            {columns.map((column) => (
                <td
                    key={column.key}
                    className={cn("py-3 px-4", column.cellClassName)}
                    style={{ width: column.width }}
                >
                    {column.render
                        ? column.render(item[column.key], item, index)
                        : item[column.key] ?? '-'
                    }
                </td>
            ))}
        </>
    );

    if (data.length === 0) {
        return (
            <div className="text-center py-12 text-muted-foreground border rounded-lg">
                <p>{emptyMessage}</p>
            </div>
        );
    }

    return (
        <div
            ref={ref}
            className={cn("border rounded-lg overflow-hidden", className)}
            style={{ height: Math.min(data.length * rowHeight + headerHeight, maxHeight) }}
        >
            <TableVirtuoso
                data={sortedData}
                components={TableComponents}
                fixedHeaderContent={fixedHeaderContent}
                itemContent={rowContent}
                style={{ height: '100%' }}
            />
        </div>
    );
});

VirtualizedTable.displayName = 'VirtualizedTable';

export default VirtualizedTable;
