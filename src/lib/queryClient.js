/**
 * React Query Configuration
 * 
 * Provides data caching, background refetching, and optimistic updates
 */

import { QueryClient } from '@tanstack/react-query';

// Create Query Client with default options
export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            // Cache data for 5 minutes
            staleTime: 5 * 60 * 1000,
            // Keep unused data in cache for 10 minutes
            gcTime: 10 * 60 * 1000,
            // Retry failed requests 2 times
            retry: 2,
            // Refetch on window focus
            refetchOnWindowFocus: true,
            // Don't refetch on mount if data is fresh
            refetchOnMount: false,
        },
        mutations: {
            // Retry failed mutations once
            retry: 1,
        },
    },
});

// Query keys for consistent cache management
export const queryKeys = {
    workTrackers: ['workTrackers'],
    workTracker: (id) => ['workTracker', id],
    picData: ['picData'],
    pic: (id) => ['pic', id],
    carData: ['carData'],
    car: (id) => ['car', id],
    cctvData: ['cctvData'],
    cctv: (id) => ['cctv', id],
    activityLogs: ['activityLogs'],
    users: ['users'],
    notes: ['notes'],
};

// Invalidate queries helper
export const invalidateQueries = (keys) => {
    if (Array.isArray(keys)) {
        keys.forEach(key => queryClient.invalidateQueries({ queryKey: key }));
    } else {
        queryClient.invalidateQueries({ queryKey: keys });
    }
};

// Prefetch data helper
export const prefetchQuery = async (key, fetchFn) => {
    await queryClient.prefetchQuery({
        queryKey: key,
        queryFn: fetchFn,
    });
};

export default queryClient;
