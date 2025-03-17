import { useEffect, useRef, useCallback } from 'react';
import { Container, Sprite, Filter } from 'pixi.js';
import { type FilterConfig, type FilterType, type BaseFilterConfig } from '../filters/types';
import { FilterFactory } from '../filters/';
import {
    type HookParams,
    type FilterBatchConfig,
    type FilterDiff
} from '../types';
import ResourceManager from '../managers/ResourceManager';
import { type FilterResult } from '../filters/';
import RenderScheduler from '../managers/RenderScheduler';
import { UpdateType } from '../managers/UpdateTypes';
import gsap from 'gsap';

// Development environment check
const isDevelopment = import.meta.env.DEV;

// Define the custom event name for filter coordination
const FILTER_COORDINATION_EVENT = 'kinetic-slider:filter-update';

// Interface for filter update event detail
interface FilterUpdateEventDetail {
    type: string;
    intensity: number;
    timestamp?: number;
    source?: string;
    priority?: UpdatePriority;
}

// Define a more specific type for the target objects we're applying filters to
type FilterableObject = Sprite | Container;

// Type to represent a map of objects to their applied filters and control functions
interface FilterMap {
    [id: string]: {
        target: FilterableObject;
        filters: {
            instance: Filter;
            updateIntensity: (intensity: number) => void;
            reset: () => void;
            initialIntensity: number;
        }[];
    };
}

// Type for storing original filter configurations
interface OriginalFilterConfigs {
    image: FilterConfig[];
    text: FilterConfig[];
}

// Type to represent update priority
type UpdatePriority = 'high' | 'normal' | 'low' | 'critical';

// Enhanced filter update type for batch processing
interface BatchFilterUpdate {
    filterId: string;
    changes: Partial<BaseFilterConfig>;
    timestamp: number;
    priority: UpdatePriority;
}

// Interface for the hook's return value
interface UseFiltersResult {
    updateFilterIntensities: (active: boolean, forceUpdate?: boolean) => void;
    resetAllFilters: () => void;
    activateFilterEffects: () => void;
    isInitialized: boolean;
    isActive: boolean;
    setFiltersActive: (active: boolean) => void;
}

/**
 * Hook to manage filters for slides and text containers
 * Fully optimized with:
 * - Batch resource management
 * - Efficient filter management
 * - Comprehensive error handling
 * - Memory leak prevention
 * - Optimized state tracking
 * - Adaptive buffer mechanism
 * - Smart diff implementation
 * - Priority-based processing
 */
export const useFilters = (
    { pixi, props, resourceManager }:
        Omit<HookParams, 'sliderRef'> & { resourceManager?: ResourceManager | null }
): UseFiltersResult => {
    if (isDevelopment) {
        console.log('[useFilters] Hook called with:', {
            hasApp: !!pixi.app.current,
            hasStage: !!(pixi.app.current?.stage),
            slidesCount: pixi.slides.current?.length,
            textContainersCount: pixi.textContainers.current?.length,
            hasResourceManager: !!resourceManager,
            imageFilters: props.imageFilters,
            textFilters: props.textFilters
        });
    }

    // Keep track of applied filters for easy updating
    const filterMapRef = useRef<FilterMap>({});
    // Store original filter configurations separately
    const originalConfigsRef = useRef<OriginalFilterConfigs>({ image: [], text: [] });
    const filtersInitializedRef = useRef<boolean>(false);
    const filtersActiveRef = useRef<boolean>(false);
    const debouncedRenderRef = useRef<number | null>(null);
    const isMountedRef = useRef<boolean>(true);

    // Store batch resource collections for efficient management
    const batchCollectionRef = useRef<{
        pendingFilters: Filter[];
        pendingObjects: FilterableObject[];
    }>({
        pendingFilters: [],
        pendingObjects: []
    });

    // Batch update queue and configuration
    const batchQueueRef = useRef<BatchFilterUpdate[]>([]);
    const batchConfigRef = useRef<FilterBatchConfig>({
        bufferMs: 16, // One frame at 60fps - will be adjusted dynamically
        maxBatchSize: 10 // Will be adjusted dynamically
    });
    const batchTimeoutRef = useRef<number | null>(null);

    // Performance metrics tracking
    const performanceMetricsRef = useRef<{
        lastProcessTime: number;
        averageProcessTime: number;
        updateCount: number;
        bufferAdjustmentCounter: number;
        totalProcessTime: number;
    }>({
        lastProcessTime: 0,
        averageProcessTime: 0,
        updateCount: 0,
        bufferAdjustmentCounter: 0,
        totalProcessTime: 0
    });

    // Add a cache for filter states to avoid redundant calculations
    const filterStateCache = useRef<Map<string, any>>(new Map());

    // Create a ref to hold the processBatchQueue function
    const processBatchQueueRef = useRef<() => void>(() => {});

    // Create a ref to hold the scheduleNextBatch function
    const scheduleNextBatchRef = useRef<() => void>(() => {});

    /**
     * Helper function to get numeric value for priority comparison
     */
    const getPriorityValue = useCallback((priority: UpdatePriority): number => {
        switch (priority) {
            case 'high': return 2;
            case 'normal': return 1;
            case 'low': return 0;
            case 'critical': return -1;
            default: return 1;
        }
    }, []);

    /**
     * Get the current state of a filter with caching
     */
    const getFilterState = useCallback((filter: any): Partial<BaseFilterConfig> => {
        try {
            // Generate a unique key for the filter
            // Use a more reliable way to generate a unique ID
            const filterId = filter.id || filter._id || filter.uuid ||
                (typeof filter.toString === 'function' ? filter.toString() : '') + Date.now();

            // Check if we have a cached state that's still valid
            const cachedState = filterStateCache.current.get(filterId);
            if (cachedState && cachedState._timestamp && Date.now() - cachedState._timestamp < 100) {
                return cachedState;
            }

            // Extract the current state
            const state: Partial<BaseFilterConfig> = {
                type: filter.constructor.name.replace('Filter', '').toLowerCase() as FilterType,
                enabled: 'enabled' in filter ? filter.enabled : true,
                intensity: 'intensity' in filter ? filter.intensity : 1,
            };

            // Add timestamp for cache invalidation
            (state as any)._timestamp = Date.now();

            // Cache the state
            filterStateCache.current.set(filterId, state);

            return state;
        } catch (error) {
            if (isDevelopment) {
                console.error('Error getting filter state:', error);
            }
            return { enabled: true, intensity: 1 };
        }
    }, []);

    /**
     * Compare two filter states and return the differences
     * Optimized version with early returns and property-specific comparisons
     */
    const compareFilterStates = useCallback((
        currentState: Partial<BaseFilterConfig>,
        newState: Partial<BaseFilterConfig>
    ): { hasChanged: boolean; changedProperties: Partial<BaseFilterConfig> } => {
        const changedProperties: Partial<BaseFilterConfig> = {};
        let hasChanged = false;

        // Fast path: if both objects are the same reference, no changes
        if (currentState === newState) {
            return { hasChanged: false, changedProperties: {} };
        }

        // Check each property that might be updated
        // Only compare properties that exist in newState
        if ('enabled' in newState) {
            // Always apply enabled state changes, especially when disabling
            if (newState.enabled !== currentState.enabled) {
                changedProperties.enabled = newState.enabled;
                hasChanged = true;
            }
        }

        if ('intensity' in newState && newState.intensity !== currentState.intensity) {
            // For intensity, we use a small epsilon to avoid floating point issues
            const epsilon = 0.001;
            if (Math.abs((newState.intensity || 0) - (currentState.intensity || 0)) > epsilon) {
                changedProperties.intensity = newState.intensity;
                hasChanged = true;
            }
        }

        if ('type' in newState && newState.type !== currentState.type) {
            changedProperties.type = newState.type;
            hasChanged = true;
        }

        return { hasChanged, changedProperties };
    }, []);

    /**
     * Schedule a render update with debouncing
     */
    const scheduleRenderUpdate = useCallback(() => {
        if (debouncedRenderRef.current !== null) {
            window.clearTimeout(debouncedRenderRef.current);
        }

        debouncedRenderRef.current = window.setTimeout(() => {
            debouncedRenderRef.current = null;
            if (!isMountedRef.current) return;

            // Use the render scheduler to request a render
            RenderScheduler.getInstance().scheduleTypedUpdate(
                'filters',
                UpdateType.FILTER_UPDATE,
                () => {
                    if (isDevelopment) {
                        console.log('Completed filter update render');
                    }
                }
            );
        }, 16); // One frame at 60fps
    }, []);

    /**
     * Dynamically adjust buffer settings based on performance metrics
     */
    const adjustBufferSettings = useCallback(() => {
        try {
            const metrics = performanceMetricsRef.current;
            const config = batchConfigRef.current;
            const queueLength = batchQueueRef.current.length;

            // Only adjust after collecting enough data points (every 10 batches)
            metrics.bufferAdjustmentCounter++;
            if (metrics.bufferAdjustmentCounter < 10) return;

            // Reset counter
            metrics.bufferAdjustmentCounter = 0;

            // Calculate optimal buffer time based on average processing time
            // Add 20% overhead to ensure we don't schedule too aggressively
            const optimalBufferTime = Math.max(16, Math.ceil(metrics.averageProcessTime * 1.2));

            // Calculate optimal batch size based on queue length and processing time
            let optimalBatchSize = config.maxBatchSize;

            // If processing is fast, increase batch size
            if (metrics.averageProcessTime < 8 && queueLength > config.maxBatchSize) {
                optimalBatchSize = Math.min(30, config.maxBatchSize + 2);
            }
            // If processing is slow, decrease batch size
            else if (metrics.averageProcessTime > 16 && config.maxBatchSize > 5) {
                optimalBatchSize = Math.max(5, config.maxBatchSize - 2);
            }

            // Apply new settings if they're different
            if (optimalBufferTime !== config.bufferMs || optimalBatchSize !== config.maxBatchSize) {
                if (isDevelopment) {
                    console.log(`Adjusting filter batch settings:`, {
                        oldBufferMs: config.bufferMs,
                        newBufferMs: optimalBufferTime,
                        oldBatchSize: config.maxBatchSize,
                        newBatchSize: optimalBatchSize,
                        averageProcessTime: metrics.averageProcessTime,
                        queueLength
                    });
                }

                batchConfigRef.current = {
                    bufferMs: optimalBufferTime,
                    maxBatchSize: optimalBatchSize
                };
            }

            // Reset metrics for next cycle
            metrics.averageProcessTime = 0;
            metrics.updateCount = 0;
        } catch (error) {
            if (isDevelopment) {
                console.error('Error adjusting buffer settings:', error);
            }
        }
    }, []);

    /**
     * Schedule the next batch processing
     */
    const scheduleNextBatch = useCallback(() => {
        if (batchTimeoutRef.current !== null) {
            window.clearTimeout(batchTimeoutRef.current);
        }

        batchTimeoutRef.current = window.setTimeout(() => {
            batchTimeoutRef.current = null;
            if (!isMountedRef.current) return;
            // Use the ref to call the latest version of processBatchQueue
            processBatchQueueRef.current();
        }, batchConfigRef.current.bufferMs);
    }, []);

    // Update the ref with the latest version of scheduleNextBatch
    useEffect(() => {
        scheduleNextBatchRef.current = scheduleNextBatch;
    }, [scheduleNextBatch]);

    /**
     * Process the batch queue and apply updates
     */
    const processBatchQueue = useCallback(() => {
        try {
            const startTime = performance.now();
            const now = Date.now();
            const queue = batchQueueRef.current;
            const { bufferMs, maxBatchSize } = batchConfigRef.current;

            if (isDevelopment) {
                console.log(`[useFilters] Processing batch queue - ${queue.length} updates pending`);
            }

            // Process critical updates immediately
            const criticalUpdates = queue.filter(update => update.priority === 'critical');
            const standardUpdates = queue.filter(update => update.priority !== 'critical');

            // Replace the queue with only non-critical updates
            batchQueueRef.current = standardUpdates;

            if (criticalUpdates.length > 0 && isDevelopment) {
                console.log(`[useFilters] Found ${criticalUpdates.length} critical updates to process immediately`);
            }

            // Filter standard updates that have waited long enough
            const readyUpdates = standardUpdates.filter(update => {
                // Dynamic wait time based on priority and queue length
                const baseWaitTime = update.priority === 'high' ? 0 :
                    update.priority === 'normal' ? bufferMs :
                        bufferMs * 2;

                // Reduce wait time if queue is small, increase if queue is large
                const queueFactor = Math.min(1.5, Math.max(0.5, standardUpdates.length / 20));
                const adjustedWaitTime = baseWaitTime * queueFactor;

                return now - update.timestamp >= adjustedWaitTime;
            });

            // Combine critical updates with ready standard updates
            const allUpdatesToProcess = [...criticalUpdates, ...readyUpdates];

            if (allUpdatesToProcess.length === 0) {
                if (isDevelopment) {
                    console.log(`[useFilters] No updates ready to process yet`);
                }
                return;
            }

            if (isDevelopment) {
                console.log(`[useFilters] Processing ${allUpdatesToProcess.length} updates (${criticalUpdates.length} critical, ${readyUpdates.length} standard)`);
            }

            // Define priority order for sorting
            const priorityOrder = { critical: -1, high: 0, normal: 1, low: 2 };

            // Sort by priority and then by timestamp
            const sortedUpdates = allUpdatesToProcess.sort((a, b) => {
                const priorityDiff = priorityOrder[a.priority as keyof typeof priorityOrder] - priorityOrder[b.priority as keyof typeof priorityOrder];
                return priorityDiff === 0 ? a.timestamp - b.timestamp : priorityDiff;
            });

            // Process up to maxBatchSize updates
            const batchUpdates = sortedUpdates.slice(0, maxBatchSize);

            // Group updates by filterId to only apply the latest changes
            const latestUpdates = new Map<string, { changes: Partial<BaseFilterConfig>, priority: UpdatePriority }>();

            batchUpdates.forEach(update => {
                const existing = latestUpdates.get(update.filterId);

                // If this is a critical update or higher priority than existing, replace it
                // If it's the same priority, merge the changes
                if (!existing || update.priority === 'critical' ||
                    (priorityOrder[update.priority as keyof typeof priorityOrder] <
                        priorityOrder[existing.priority as keyof typeof priorityOrder])) {
                    latestUpdates.set(update.filterId, {
                        changes: update.changes,
                        priority: update.priority
                    });
                } else {
                    // Merge changes but keep the higher priority
                    latestUpdates.set(update.filterId, {
                        changes: { ...existing.changes, ...update.changes },
                        priority: existing.priority
                    });
                }
            });

            if (isDevelopment) {
                console.log(`[useFilters] Applying updates to ${latestUpdates.size} filters`);
            }

            // Apply the updates
            latestUpdates.forEach(({ changes, priority }, filterId) => {
                // Extract the filter ID without the index suffix
                const baseFilterId = filterId.split('-').slice(0, -1).join('-');
                const filterEntry = filterMapRef.current[baseFilterId];

                if (!filterEntry) {
                    if (isDevelopment) {
                        console.log(`[useFilters] Filter ${baseFilterId} not found in filterMapRef`);
                    }
                    return;
                }

                // Add type assertion to fix TypeScript error
                const typedEntry = filterEntry as FilterMap[string];
                const filterIndex = parseInt(filterId.split('-').pop() || '0');

                // Get the specific filter data
                const filterData = typedEntry.filters[filterIndex];

                if (!filterData) {
                    if (isDevelopment) {
                        console.log(`[useFilters] Filter data not found for ${filterId}`);
                    }
                    return;
                }

                // Check if this update is disabling the filter
                const isDisablingFilter = 'enabled' in changes && changes.enabled === false;

                // For critical updates or disabling filters, apply changes immediately
                if (priority === 'critical' || isDisablingFilter) {
                    if (isDevelopment) {
                        console.log(`[useFilters] Applying ${priority} update to filter ${filterId}${isDisablingFilter ? ' (disabling)' : ''}`);
                    }

                    // Apply intensity changes
                    if ('intensity' in changes && typeof changes.intensity === 'number') {
                        filterData.updateIntensity(changes.intensity);

                        if (isDevelopment) {
                            console.log(`[useFilters] Set filter ${filterId} intensity to ${changes.intensity}`);
                        }
                    }

                    // Apply enabled state changes - ALWAYS apply these for critical updates
                    if ('enabled' in changes) {
                        if ('enabled' in filterData.instance) {
                            (filterData.instance as any).enabled = changes.enabled;

                            if (isDevelopment) {
                                console.log(`[useFilters] Set filter ${filterId} enabled state to ${changes.enabled}`);
                            }
                        }
                    }
                } else {
                    // For non-critical updates, compare states before applying
                    const currentState = getFilterState(filterData.instance);
                    const diff = compareFilterStates(currentState, changes);

                    if (diff.hasChanged) {
                        if (isDevelopment) {
                            console.log(`[useFilters] Applying changes to filter ${filterId}:`, diff.changedProperties);
                        }

                        // Apply intensity changes
                        if ('intensity' in diff.changedProperties && diff.changedProperties.intensity !== undefined) {
                            filterData.updateIntensity(diff.changedProperties.intensity);

                            if (isDevelopment) {
                                console.log(`[useFilters] Updated filter ${filterId} intensity to ${diff.changedProperties.intensity}`);
                            }
                        }

                        // Apply enabled state changes
                        if ('enabled' in diff.changedProperties && 'enabled' in filterData.instance) {
                            (filterData.instance as any).enabled = diff.changedProperties.enabled;

                            if (isDevelopment) {
                                console.log(`[useFilters] Updated filter ${filterId} enabled state to ${diff.changedProperties.enabled}`);
                            }
                        }
                    } else if (isDevelopment) {
                        console.log(`[useFilters] No changes needed for filter ${filterId}`);
                    }
                }
            });

            // For critical updates, force an immediate render update
            if (criticalUpdates.length > 0) {
                if (isDevelopment) {
                    console.log(`[useFilters] Forcing immediate render update for critical changes`);
                }

                // Clear any pending debounced render
                if (debouncedRenderRef.current !== null) {
                    window.clearTimeout(debouncedRenderRef.current);
                    debouncedRenderRef.current = null;
                }

                // Request immediate render
                RenderScheduler.getInstance().scheduleTypedUpdate(
                    'filters',
                    UpdateType.FILTER_UPDATE,
                    () => {
                        if (isDevelopment) {
                            console.log('[useFilters] Completed critical filter update render');
                        }
                    },
                    'critical'
                );
            } else {
                // Schedule a debounced render update for non-critical changes
                scheduleRenderUpdate();
            }

            // Remove processed updates from queue (only needed for standard updates since we already removed critical ones)
            batchQueueRef.current = standardUpdates.filter(update => !readyUpdates.includes(update));

            // Schedule next batch if there are remaining updates
            if (batchQueueRef.current.length > 0) {
                if (isDevelopment) {
                    console.log(`[useFilters] Scheduling next batch - ${batchQueueRef.current.length} updates remaining`);
                }
                scheduleNextBatchRef.current();
            }

            // Update performance metrics
            const endTime = performance.now();
            const processTime = endTime - startTime;

            // Update running average of process time
            const metrics = performanceMetricsRef.current;
            metrics.updateCount++;
            metrics.totalProcessTime += processTime;
            metrics.averageProcessTime = metrics.totalProcessTime / metrics.updateCount;

            // Adjust buffer settings based on performance
            adjustBufferSettings();

            if (isDevelopment) {
                console.log(`[useFilters] Batch processing completed in ${processTime.toFixed(2)}ms`);
            }
        } catch (error) {
            if (isDevelopment) {
                console.error('Error processing batch queue:', error);
            }
        }
    }, [compareFilterStates, getFilterState, scheduleRenderUpdate, adjustBufferSettings, scheduleNextBatchRef]);

    // Update the ref with the latest version of processBatchQueue
    useEffect(() => {
        processBatchQueueRef.current = processBatchQueue;
    }, [processBatchQueue]);

    /**
     * Queue a filter update with priority
     */
    const queueFilterUpdate = useCallback((
        filterId: string,
        changes: Partial<BaseFilterConfig>,
        priority: UpdatePriority = 'normal'
    ) => {
        try {
            const queue = batchQueueRef.current;
            const now = Date.now();

            // Check if there's already an update for this filter in the queue
            const existingIndex = queue.findIndex(update => update.filterId === filterId);

            // Smart prioritization: Upgrade priority based on update frequency
            // If we're updating the same filter frequently, it might be more important
            let smartPriority = priority;
            const recentUpdates = queue.filter(update =>
                update.filterId === filterId && now - update.timestamp < 500
            ).length;

            // If this filter has been updated multiple times recently, increase priority
            if (recentUpdates >= 3 && priority === 'normal') {
                smartPriority = 'high';
            } else if (recentUpdates >= 5 && priority === 'low') {
                smartPriority = 'normal';
            }

            if (existingIndex !== -1) {
                // Merge with existing update
                const existingUpdate = queue[existingIndex];

                // Keep the highest priority
                const newPriority = getPriorityValue(smartPriority) > getPriorityValue(existingUpdate.priority)
                    ? smartPriority
                    : existingUpdate.priority;

                // Merge changes
                const mergedChanges = {
                    ...existingUpdate.changes,
                    ...changes
                };

                // Replace the existing update
                queue[existingIndex] = {
                    filterId,
                    changes: mergedChanges,
                    priority: newPriority,
                    timestamp: now
                };
            } else {
                // Add new update
                queue.push({
                    filterId,
                    changes,
                    priority: smartPriority,
                    timestamp: now
                });
            }

            // Schedule processing if not already scheduled
            if (batchTimeoutRef.current === null) {
                scheduleNextBatchRef.current();
            }
        } catch (error) {
            if (isDevelopment) {
                console.error('Error adding to batch queue:', error);
            }
        }
    }, [getPriorityValue]);

    /**
     * Convert filter configurations to the format expected by the filter factory
     */
    const convertFilterConfigs = useCallback((configs: import('../types').FilterConfig[]): FilterConfig[] => {
        return configs.map(config => {
            // Create a new object with the required properties
            const { type, enabled = true, intensity = 1, ...rest } = config;

            if (isDevelopment) {
                console.log(`[useFilters] Converting filter config: type=${type}, enabled=${enabled}, intensity=${intensity}`);
            }

            // Convert from the types.ts FilterConfig to filters/types.ts FilterConfig
            return {
                type: type as FilterType, // Type assertion to FilterType
                enabled: enabled !== false, // Preserve enabled state
                intensity: intensity || 1,
                ...rest // Preserve any additional properties
            } as FilterConfig; // Type assertion to ensure compatibility
        });
    }, []);

    /**
     * Apply filters to an array of objects
     */
    const applyFiltersToObjects = useCallback((
        objects: FilterableObject[],
        filterConfigs: FilterConfig[],
        idPrefix: string
    ) => {
        try {
            if (!objects.length || !filterConfigs.length) {
                if (isDevelopment) {
                    console.log(`[useFilters] Skipping filter application - no objects (${objects.length}) or configs (${filterConfigs.length})`);
                }
                return;
            }

            // Don't filter out disabled filters - we need to create them even if they're disabled
            // They will be enabled later when needed
            const activeConfigs = filterConfigs;

            if (!activeConfigs.length) {
                if (isDevelopment) {
                    console.log(`[useFilters] No filter configs for ${idPrefix}`);
                }
                return;
            }

            if (isDevelopment) {
                console.log(`[useFilters] Applying ${activeConfigs.length} filters to ${objects.length} objects with prefix ${idPrefix}`);
                console.log(`[useFilters] Filter configs:`, activeConfigs.map(c => ({ type: c.type, intensity: c.intensity, enabled: c.enabled })));
            }

            // Batch operations for filter creation
            const batchCollection = batchCollectionRef.current;

            // Create and apply filters
            objects.forEach((object, objectIndex) => {
                const filterId = `${idPrefix}-${objectIndex}`;

                // Skip if filters are already applied to this object
                if (filterMapRef.current[filterId]) {
                    if (isDevelopment) {
                        console.log(`[useFilters] Filters already applied to ${filterId}, skipping`);
                    }
                    return;
                }

                // Verify the object is valid
                if (!object || !object.visible) {
                    if (isDevelopment) {
                        console.log(`[useFilters] Object ${filterId} is not valid or not visible, skipping`);
                    }
                    return;
                }

                // Create filters for this object
                const filterResults: {
                    instance: Filter;
                    updateIntensity: (intensity: number) => void;
                    reset: () => void;
                    initialIntensity: number;
                    originalType: string;  // Add originalType to store the filter type
                }[] = [];

                activeConfigs.forEach(config => {
                    try {
                        if (isDevelopment) {
                            console.log(`[useFilters] Creating filter ${config.type} for ${filterId} with intensity ${config.intensity || 1}, enabled=${config.enabled !== false}`);
                        }

                        const result = FilterFactory.createFilter(config);
                        if (result) {
                            // Store the initial intensity from the config
                            const initialIntensity = config.intensity || 1;

                            // Ensure the filter is initially disabled with zero intensity
                            if ('enabled' in result.filter) {
                                (result.filter as any).enabled = false;
                            }

                            // Set initial intensity to 0 (will be activated later)
                            result.updateIntensity(0);

                            filterResults.push({
                                instance: result.filter,
                                updateIntensity: result.updateIntensity,
                                reset: result.reset,
                                initialIntensity: initialIntensity,
                                originalType: config.type  // Store the original filter type
                            });

                            // Add to batch collection for resource management
                            batchCollection.pendingFilters.push(result.filter);
                            batchCollection.pendingObjects.push(object);

                            if (isDevelopment) {
                                console.log(`[useFilters] Successfully created ${config.type} filter for ${filterId} with initial intensity=${initialIntensity} (currently set to 0)`);
                            }
                        } else {
                            if (isDevelopment) {
                                console.warn(`[useFilters] Failed to create ${config.type} filter for ${filterId} - null result`);
                            }
                        }
                    } catch (error) {
                        if (isDevelopment) {
                            console.error(`Error creating filter ${config.type} for ${filterId}:`, error);
                        }
                    }
                });

                // Store the filters for easy access later
                if (filterResults.length > 0) {
                    filterMapRef.current[filterId] = {
                        target: object,
                        filters: filterResults
                    };

                    // Apply filters to the object
                    try {
                        const existingFilters = Array.isArray(object.filters) ? object.filters : (object.filters ? [object.filters] : []);
                        const newFilters = filterResults.map(result => result.instance);

                        // Make sure the object is still valid before applying filters
                        if (object && object.visible) {
                            object.filters = [...existingFilters, ...newFilters];

                            if (isDevelopment) {
                                console.log(`[useFilters] Applied ${filterResults.length} filters to ${filterId}`);
                            }
                        } else {
                            if (isDevelopment) {
                                console.warn(`[useFilters] Object ${filterId} is no longer valid or visible, skipping filter application`);
                            }
                        }
                    } catch (error) {
                        if (isDevelopment) {
                            console.error(`[useFilters] Error applying filters to ${filterId}:`, error);
                        }
                    }
                } else {
                    if (isDevelopment) {
                        console.warn(`[useFilters] No filters were created for ${filterId}`);
                    }
                }
            });

            // Register resources with the resource manager if available
            if (resourceManager && batchCollection.pendingFilters.length > 0) {
                // Use trackFilterBatch and trackDisplayObjectBatch instead of registerResources
                resourceManager.trackFilterBatch(batchCollection.pendingFilters);
                resourceManager.trackDisplayObjectBatch(batchCollection.pendingObjects);

                if (isDevelopment) {
                    console.log(`[useFilters] Tracked ${batchCollection.pendingFilters.length} filters and ${batchCollection.pendingObjects.length} objects with resource manager`);
                }

                // Clear the batch collection
                batchCollection.pendingFilters = [];
                batchCollection.pendingObjects = [];
            }
        } catch (error) {
            if (isDevelopment) {
                console.error('Error applying filters to objects:', error);
            }
        }
    }, [resourceManager]);

    /**
     * Initialize filters based on props
     */
    const initializeFilters = useCallback(() => {
        try {
            if (filtersInitializedRef.current) return;
            if (!pixi.app.current || !pixi.slides.current) return;

            if (isDevelopment) {
                console.log('[useFilters] Initializing filters', {
                    hasApp: !!pixi.app.current,
                    hasSlides: !!pixi.slides.current && pixi.slides.current.length > 0,
                    hasTextContainers: !!pixi.textContainers.current && pixi.textContainers.current.length > 0,
                    imageFilters: props.imageFilters ?
                        (Array.isArray(props.imageFilters) ? props.imageFilters.length : 1) : 0,
                    textFilters: props.textFilters ?
                        (Array.isArray(props.textFilters) ? props.textFilters.length : 1) : 0
                });
            }

            // Convert filter configurations
            const imageFilterConfigs = convertFilterConfigs(Array.isArray(props.imageFilters) ? props.imageFilters : props.imageFilters ? [props.imageFilters] : []);
            const textFilterConfigs = convertFilterConfigs(Array.isArray(props.textFilters) ? props.textFilters : props.textFilters ? [props.textFilters] : []);

            // Store the original filter configs for later use when activating
            originalConfigsRef.current = {
                image: imageFilterConfigs,
                text: textFilterConfigs
            };

            // Modify filter configs to ensure they start disabled with zero intensity
            const modifyConfigsForInitialization = (configs: FilterConfig[]): FilterConfig[] => {
                if (isDevelopment) {
                    console.log(`[useFilters] Modifying ${configs.length} filter configs for initialization`);
                }

                return configs.map(config => {
                    const result = {
                        ...config,           // Preserve all original properties
                        enabled: false,      // Start with filters disabled
                        intensity: 0         // Start with zero intensity
                    };

                    if (isDevelopment) {
                        console.log(`[useFilters] Modified filter config: type=${config.type}, enabled=false, intensity=0`);
                    }

                    return result;
                });
            };

            // Apply the modifications
            const initialImageFilterConfigs = modifyConfigsForInitialization(imageFilterConfigs);
            const initialTextFilterConfigs = modifyConfigsForInitialization(textFilterConfigs);

            if (isDevelopment) {
                console.log('[useFilters] Converted filter configs:', {
                    imageFilterConfigs: initialImageFilterConfigs.length,
                    textFilterConfigs: initialTextFilterConfigs.length,
                    allDisabled: true
                });
            }

            // Apply filters to slides
            if (initialImageFilterConfigs.length > 0 && pixi.slides.current.length > 0) {
                if (isDevelopment) {
                    console.log(`[useFilters] Applying ${initialImageFilterConfigs.length} image filters to ${pixi.slides.current.length} slides (initially disabled)`);
                }

                pixi.slides.current.forEach((slide, index) => {
                    // Make sure the slide is valid before applying filters
                    if (slide && slide.visible) {
                        const slideName = `slide-${index}`;
                        applyFiltersToObjects([slide], initialImageFilterConfigs, slideName);
                    } else if (isDevelopment) {
                        console.log(`[useFilters] Skipping slide ${index} - not valid or not visible`);
                    }
                });
            }

            // Apply filters to text containers - wait for text containers if they're not ready yet
            if (initialTextFilterConfigs.length > 0) {
                if (!pixi.textContainers.current || pixi.textContainers.current.length === 0) {
                    if (isDevelopment) {
                        console.log('[useFilters] Text containers not ready yet, will apply filters when they become available');
                    }

                    // Mark as initialized anyway so we don't try to initialize again
                    filtersInitializedRef.current = true;

                    // Set up a MutationObserver to watch for text container changes
                    const checkTextContainers = () => {
                        if (pixi.textContainers.current && pixi.textContainers.current.length > 0) {
                            if (isDevelopment) {
                                console.log(`[useFilters] Text containers now available (${pixi.textContainers.current.length}), applying filters (initially disabled)`);
                            }

                            pixi.textContainers.current.forEach((container, index) => {
                                // Make sure the container is valid before applying filters
                                if (container && container.visible) {
                                    const containerName = `text-container-${index}`;
                                    applyFiltersToObjects([container], initialTextFilterConfigs, containerName);
                                } else if (isDevelopment) {
                                    console.log(`[useFilters] Skipping text container ${index} - not valid or not visible`);
                                }
                            });
                        } else {
                            // Check again in a short while
                            setTimeout(checkTextContainers, 100);
                        }
                    };

                    // Start checking for text containers
                    setTimeout(checkTextContainers, 100);
                } else {
                    if (isDevelopment) {
                        console.log(`[useFilters] Applying ${initialTextFilterConfigs.length} text filters to ${pixi.textContainers.current.length} text containers (initially disabled)`);
                    }

                    pixi.textContainers.current.forEach((container, index) => {
                        // Make sure the container is valid before applying filters
                        if (container && container.visible) {
                            const containerName = `text-container-${index}`;
                            applyFiltersToObjects([container], initialTextFilterConfigs, containerName);
                        } else if (isDevelopment) {
                            console.log(`[useFilters] Skipping text container ${index} - not valid or not visible`);
                        }
                    });
                }
            }

            // Mark as initialized
            filtersInitializedRef.current = true;
            // Ensure active state is false
            filtersActiveRef.current = false;

            if (isDevelopment) {
                console.log('[useFilters] Filters initialized successfully (initially disabled)', {
                    filterMapEntries: Object.keys(filterMapRef.current).length
                });
            }
        } catch (error) {
            if (isDevelopment) {
                console.error('Error initializing filters:', error);
            }
        }
    }, [pixi.app, pixi.slides, pixi.textContainers, props.imageFilters, props.textFilters, convertFilterConfigs, applyFiltersToObjects]);

    // Add a new useEffect to initialize filters as soon as possible
    useEffect(() => {
        // Check if we have the necessary components to initialize filters
        const hasApp = !!pixi.app.current;
        const hasSlides = !!pixi.slides.current && pixi.slides.current.length > 0;

        if (hasApp && hasSlides && !filtersInitializedRef.current) {
            if (isDevelopment) {
                console.log('[useFilters] App and slides are ready, initializing filters immediately');
            }

            // Initialize filters immediately
            initializeFilters();

            // But don't activate them automatically - they should only activate on mouse enter
            if (isDevelopment && filtersInitializedRef.current) {
                console.log('[useFilters] Filters initialized, but not activated - waiting for mouse enter');
            }
        }
    }, [pixi.app.current, pixi.slides.current, initializeFilters]);

    /**
     * Updates filter intensities based on active state
     * @param activate Whether to activate or deactivate filters
     * @param forceAll Whether to force update all filters regardless of slide index
     */
    const updateFilterIntensities = useCallback((activate: boolean, forceAll: boolean = false) => {
        try {
            if (!filtersInitializedRef.current) {
                console.log('[useFilters] Filters not initialized, skipping intensity update');
                return;
            }

            // Skip if already in the desired state and not forcing update
            if (filtersActiveRef.current === activate && !forceAll) {
                console.log(`[useFilters] Filters already ${activate ? 'active' : 'inactive'}, skipping update`);
                return;
            }

            // Update active state
            filtersActiveRef.current = activate;

            // Get the current slide index
            const currentIndex = pixi.currentIndex.current;
            console.log(`[useFilters] Updating filter intensities - active: ${activate}, force: ${forceAll}, currentIndex: ${currentIndex}`);

            // Queue updates for all filters
            Object.entries(filterMapRef.current).forEach(([filterId, entry]) => {
                const typedEntry = entry as FilterMap[string];

                // Use a more flexible approach to match filter IDs
                const isSlideFilter = filterId.startsWith('slide-');
                const isTextFilter = filterId.startsWith('text-container-');

                // Extract the index from the filter ID
                let filterIndex = -1;
                if (isSlideFilter) {
                    const match = filterId.match(/slide-(\d+)/);
                    if (match) filterIndex = parseInt(match[1], 10);
                } else if (isTextFilter) {
                    const match = filterId.match(/text-container-(\d+)/);
                    if (match) filterIndex = parseInt(match[1], 10);
                }

                // When deactivating (active=false), disable ALL filters regardless of slide index
                // When activating (active=true), only enable filters for the current slide
                // If forceAll is true, activate all filters regardless of slide index
                const shouldActivate = activate && (
                    forceAll || // Force all filters if requested
                    // For slide/text filters, check if the index matches the current slide
                    ((isSlideFilter || isTextFilter) && filterIndex === currentIndex) ||
                    // For other filters, always activate
                    (!isSlideFilter && !isTextFilter)
                );

                console.log(`[useFilters] Processing filter ${filterId} - isSlideFilter: ${isSlideFilter}, isTextFilter: ${isTextFilter}, filterIndex: ${filterIndex}, shouldActivate: ${shouldActivate}`);

                typedEntry.filters.forEach((filterData, index) => {
                    // Get the original intensity for this filter
                    const originalIntensity = filterData.initialIntensity || 1;

                    // Calculate the target intensity based on active state
                    const targetIntensity = shouldActivate ? originalIntensity : 0;

                    // Queue the update with appropriate priority
                    // Use critical priority for activation when forceAll is true
                    // Use critical priority for deactivation always
                    const priority = forceAll || !activate ? 'critical' : 'high';

                    queueFilterUpdate(filterId + '-' + index, {
                        enabled: shouldActivate,
                        intensity: targetIntensity,
                        type: filterData.instance.constructor.name.replace('Filter', '').toLowerCase() as FilterType
                    }, priority);

                    console.log(`[useFilters] Queued update for filter ${filterId}-${index}: enabled=${shouldActivate}, intensity=${targetIntensity}, priority=${priority}`);
                });
            });

            // Process the queue immediately if forcing update
            if (forceAll) {
                processBatchQueue();
            } else {
                // Schedule processing for the next frame
                setTimeout(() => {
                    processBatchQueue();
                }, 0);
            }
        } catch (error) {
            console.error('Error updating filter intensities:', error);
        }
    }, [pixi.currentIndex, queueFilterUpdate, processBatchQueue]);

    /**
     * Reset all filters to their initial state
     */
    const resetAllFilters = useCallback(() => {
        try {
            if (!filtersInitializedRef.current) return;

            // Reset all filters
            Object.values(filterMapRef.current).forEach(entry => {
                // Add type assertion to fix TypeScript error
                const typedEntry = entry as FilterMap[string];
                typedEntry.filters.forEach(filterData => {
                    filterData.reset();
                });
            });

            // Update active state
            filtersActiveRef.current = false;

            if (isDevelopment) {
                console.log('All filters reset');
            }
        } catch (error) {
            if (isDevelopment) {
                console.error('Error resetting filters:', error);
            }
        }
    }, []);

    /**
     * Activate filter effects
     */
    const activateFilterEffects = useCallback(() => {
        try {
            if (!filtersInitializedRef.current) {
                if (isDevelopment) {
                    console.log('[useFilters] Filters not initialized, initializing now before activation');
                }

                // Try to initialize filters if not already done
                if (pixi.app.current && pixi.slides.current && pixi.slides.current.length > 0) {
                    if (isDevelopment) {
                        console.log('[useFilters] Attempting to initialize filters before activation');
                    }
                    initializeFilters();

                    // If initialization failed, return
                    if (!filtersInitializedRef.current) {
                        if (isDevelopment) {
                            console.log('[useFilters] Filter initialization failed, cannot activate');
                        }
                        return;
                    }
                } else {
                    if (isDevelopment) {
                        console.log('[useFilters] Cannot initialize filters - missing required components');
                    }
                    return;
                }
            }

            // Skip if already active
            if (filtersActiveRef.current) {
                if (isDevelopment) {
                    console.log('[useFilters] Filter effects already active, skipping activation');
                }
                return;
            }

            if (isDevelopment) {
                console.log('[useFilters] Activating filter effects with critical priority');
                console.log('[useFilters] Current filter map entries:', Object.keys(filterMapRef.current));
            }

            // Directly set active state to true to ensure subsequent operations work correctly
            filtersActiveRef.current = true;

            // Get original configurations if available
            const originalConfigs = originalConfigsRef.current;

            // Get the current slide index
            const currentIndex = pixi.currentIndex.current;

            if (isDevelopment) {
                console.log('[useFilters] Original configs available:', {
                    hasImageConfigs: originalConfigs.image.length > 0,
                    hasTextConfigs: originalConfigs.text.length > 0,
                    imageConfigsCount: originalConfigs.image.length,
                    textConfigsCount: originalConfigs.text.length,
                    currentSlideIndex: currentIndex
                });
            }

            // Check if we have any filters in the map
            if (Object.keys(filterMapRef.current).length === 0) {
                if (isDevelopment) {
                    console.log('[useFilters] No filters in map, attempting to create them now');
                }

                // Apply filters to slides if we have image configs
                if (originalConfigs.image.length > 0 && pixi.slides.current && pixi.slides.current.length > 0) {
                    if (isDevelopment) {
                        console.log(`[useFilters] Creating ${originalConfigs.image.length} image filters for ${pixi.slides.current.length} slides`);
                    }

                    pixi.slides.current.forEach((slide, index) => {
                        const slideName = `slide-${index}`;
                        applyFiltersToObjects([slide], originalConfigs.image, slideName);
                    });
                }

                // Apply filters to text containers if we have text configs
                if (originalConfigs.text.length > 0 && pixi.textContainers.current && pixi.textContainers.current.length > 0) {
                    if (isDevelopment) {
                        console.log(`[useFilters] Creating ${originalConfigs.text.length} text filters for ${pixi.textContainers.current.length} text containers`);
                    }

                    pixi.textContainers.current.forEach((container, index) => {
                        const containerName = `text-container-${index}`;
                        applyFiltersToObjects([container], originalConfigs.text, containerName);
                    });
                }
            }

            // Apply immediate changes to all filters
            let activatedFilterCount = 0;

            if (isDevelopment) {
                console.log('[useFilters] Starting direct filter activation process');
                console.log('[useFilters] Filter map entries:', Object.keys(filterMapRef.current));
                console.log(`[useFilters] Current slide index: ${currentIndex}`);
            }

            // First, ensure all slides have filters applied
            if (pixi.slides.current && pixi.slides.current.length > 0) {
                // Check if we need to create filters for any slides
                pixi.slides.current.forEach((slide, index) => {
                    const slideName = `slide-${index}`;

                    // Check if this slide already has filters
                    if (!filterMapRef.current[slideName] && slide && slide.visible) {
                        if (isDevelopment) {
                            console.log(`[useFilters] Slide ${index} doesn't have filters yet, creating them now`);
                        }

                        // Apply filters to this slide
                        applyFiltersToObjects([slide], originalConfigs.image, slideName);
                    }
                });

                // Check if we need to create filters for any text containers
                if (pixi.textContainers.current && pixi.textContainers.current.length > 0) {
                    pixi.textContainers.current.forEach((container, index) => {
                        const containerName = `text-container-${index}`;

                        // Check if this text container already has filters
                        if (!filterMapRef.current[containerName] && container && container.visible) {
                            if (isDevelopment) {
                                console.log(`[useFilters] Text container ${index} doesn't have filters yet, creating them now`);
                            }

                            // Apply filters to this text container
                            applyFiltersToObjects([container], originalConfigs.text, containerName);
                        }
                    });
                }
            }

            Object.entries(filterMapRef.current).forEach(([filterId, entry]) => {
                const typedEntry = entry as FilterMap[string];

                // Check if this filter belongs to the current slide or text container
                // Use a more flexible approach to match filter IDs
                const isSlideFilter = filterId.startsWith('slide-');
                const isTextFilter = filterId.startsWith('text-container-');

                // Extract the index from the filter ID
                let filterIndex = -1;
                if (isSlideFilter) {
                    const match = filterId.match(/slide-(\d+)/);
                    if (match) filterIndex = parseInt(match[1], 10);
                } else if (isTextFilter) {
                    const match = filterId.match(/text-container-(\d+)/);
                    if (match) filterIndex = parseInt(match[1], 10);
                }

                // Determine if this filter should be activated
                const shouldActivate = (
                    // For slide/text filters, check if the index matches the current slide
                    ((isSlideFilter || isTextFilter) && filterIndex === currentIndex) ||
                    // For other filters, always activate
                    (!isSlideFilter && !isTextFilter)
                );

                if (isDevelopment) {
                    console.log(`[useFilters] Processing filter entry ${filterId} with ${typedEntry.filters.length} filters - isSlideFilter: ${isSlideFilter}, isTextFilter: ${isTextFilter}, filterIndex: ${filterIndex}, shouldActivate: ${shouldActivate}`);
                }

                typedEntry.filters.forEach((filterData, index) => {
                    // Find the original intensity for this filter if possible
                    let originalIntensity = filterData.initialIntensity;

                    if (isDevelopment) {
                        console.log(`[useFilters] Processing filter ${filterId}-${index}, initial intensity: ${originalIntensity}, shouldActivate: ${shouldActivate}`);
                    }

                    // If we have original configs, try to find the matching one
                    if (originalConfigs) {
                        // Determine if this is an image or text filter based on the ID
                        const isImageFilter = filterId.startsWith('slide-');
                        const configs = isImageFilter ? originalConfigs.image : originalConfigs.text;

                        if (isDevelopment) {
                            console.log(`[useFilters] Looking for matching config for ${filterId}-${index}, is image filter: ${isImageFilter}, available configs: ${configs.length}`);
                        }

                        // First try to use the originalType if available
                        if ('originalType' in filterData) {
                            const originalType = (filterData as any).originalType;
                            if (originalType) {
                                if (isDevelopment) {
                                    console.log(`[useFilters] Using stored original type '${originalType}' for ${filterId}-${index}`);
                                }

                                // Try to find a matching config by original type
                                const matchingConfig = configs.find((c: FilterConfig) =>
                                    c.type.toLowerCase() === originalType.toLowerCase()
                                );

                                if (matchingConfig) {
                                    originalIntensity = matchingConfig.intensity || 1;
                                    if (isDevelopment) {
                                        console.log(`[useFilters] Found matching config for ${filterId}-${index} using original type '${originalType}': intensity=${originalIntensity}`);
                                    }
                                }
                            }
                        }

                        // Fallback to constructor name if originalType didn't work
                        const constructorName = filterData.instance.constructor.name;
                        // Remove 'Filter' suffix if present
                        const filterTypeFromConstructor = constructorName.replace(/Filter$/, '').toLowerCase();

                        if (isDevelopment) {
                            console.log(`[useFilters] Extracted filter type '${filterTypeFromConstructor}' from constructor name '${constructorName}'`);
                        }

                        // Try to find a matching config by type
                        let matchingConfig = configs.find((c: FilterConfig) =>
                            c.type.toLowerCase() === filterTypeFromConstructor
                        );

                        // If no match by constructor name, try to match by other properties
                        if (!matchingConfig && configs.length === 1) {
                            // If there's only one config, use that
                            matchingConfig = configs[0];
                            if (isDevelopment) {
                                console.log(`[useFilters] No exact type match, but only one config exists. Using it for ${filterId}-${index}`);
                            }
                        }

                        if (matchingConfig) {
                            originalIntensity = matchingConfig.intensity || 1;
                            if (isDevelopment) {
                                console.log(`[useFilters] Found matching config for ${filterId}-${index} (${filterTypeFromConstructor}): intensity=${originalIntensity}`);
                            }
                        } else {
                            if (isDevelopment) {
                                console.log(`[useFilters] No matching config found for ${filterId}-${index} (${filterTypeFromConstructor}), using default intensity=${originalIntensity}`);
                                console.log(`[useFilters] Available configs:`, configs.map((c: FilterConfig) => ({ type: c.type, intensity: c.intensity })));
                            }
                        }
                    }

                    // Ensure intensity is a positive number
                    if (typeof originalIntensity !== 'number' || originalIntensity <= 0) {
                        originalIntensity = 1; // Default to 1 if not valid
                        if (isDevelopment) {
                            console.log(`[useFilters] Invalid intensity for ${filterId}-${index}, using default=1`);
                        }
                    }

                    // Set the filter's enabled state based on whether it should be active
                    if ('enabled' in filterData.instance) {
                        (filterData.instance as any).enabled = shouldActivate;
                        if (isDevelopment) {
                            console.log(`[useFilters] ${shouldActivate ? 'Enabled' : 'Disabled'} filter ${filterId}-${index}`);
                        }
                    }

                    // Apply the intensity based on whether it should be active
                    const intensity = shouldActivate ? originalIntensity : 0;
                    try {
                        filterData.updateIntensity(intensity);
                        if (isDevelopment) {
                            console.log(`[useFilters] Directly applied intensity ${intensity} to filter ${filterId}-${index}`);
                        }
                        if (shouldActivate) {
                            activatedFilterCount++;
                        }
                    } catch (error) {
                        if (isDevelopment) {
                            console.error(`[useFilters] Error applying intensity to filter ${filterId}-${index}:`, error);
                        }
                    }

                    // Queue a critical priority update for this filter
                    queueFilterUpdate(filterId + '-' + index, {
                        enabled: shouldActivate,
                        intensity: intensity
                    }, 'critical');

                    if (isDevelopment) {
                        console.log(`[useFilters] Queued critical update for filter ${filterId}-${index}: enabled=${shouldActivate}, intensity=${intensity}`);
                    }
                });
            });

            if (isDevelopment) {
                console.log(`[useFilters] Activated ${activatedFilterCount} filters in total`);
            }

            // Schedule an immediate render update
            RenderScheduler.getInstance().scheduleTypedUpdate(
                'filters',
                UpdateType.FILTER_UPDATE,
                () => {
                    if (isDevelopment) {
                        console.log('[useFilters] Completed filter activation render');
                    }
                },
                'critical' // Use critical priority for immediate activation
            );

            if (isDevelopment) {
                console.log('[useFilters] Filter effects activated');
            }
        } catch (error) {
            if (isDevelopment) {
                console.error('Error activating filter effects:', error);
            }
        }
    }, [updateFilterIntensities, queueFilterUpdate, initializeFilters, pixi.app, pixi.slides, pixi.textContainers, pixi.currentIndex, applyFiltersToObjects]);

    // Handle filter coordination events from other components
    const handleFilterCoordinationEvent = useCallback((event: Event) => {
        try {
            if (!isMountedRef.current) {
                if (isDevelopment) {
                    console.log('[useFilters] Ignoring filter coordination event - component unmounted');
                }
                return;
            }

            if (!filtersInitializedRef.current) {
                if (isDevelopment) {
                    console.log('[useFilters] Ignoring filter coordination event - filters not initialized');
                }
                return;
            }

            const customEvent = event as CustomEvent<FilterUpdateEventDetail>;
            const { type: filterId, intensity, source, priority = 'high' } = customEvent.detail;

            if (isDevelopment) {
                console.log(`[useFilters] Received filter coordination event from ${source} for ${filterId} with intensity ${intensity} (priority: ${priority})`);
            }

            // Ensure filters are active when receiving coordination events
            if (!filtersActiveRef.current) {
                if (isDevelopment) {
                    console.log('[useFilters] Activating filters due to coordination event');
                }
                filtersActiveRef.current = true;

                // Activate all filters immediately
                Object.entries(filterMapRef.current).forEach(([id, entry]) => {
                    const typedEntry = entry as FilterMap[string];
                    typedEntry.filters.forEach(filterData => {
                        if ('enabled' in filterData.instance) {
                            (filterData.instance as any).enabled = true;
                        }
                    });
                });
            }

            // Find the specific filter being updated
            const filterParts = filterId.split('-');
            const baseFilterId = filterParts[0];
            const filterEntry = filterMapRef.current[baseFilterId];

            if (filterEntry) {
                const typedEntry = filterEntry as FilterMap[string];

                // Apply the update directly for immediate effect if it's critical
                if (priority === 'critical') {
                    typedEntry.filters.forEach(filterData => {
                        filterData.updateIntensity(intensity);
                        if (isDevelopment) {
                            console.log(`[useFilters] Directly updated filter ${filterId} intensity to ${intensity} (critical priority)`);
                        }
                    });

                    // Schedule an immediate render update
                    RenderScheduler.getInstance().scheduleTypedUpdate(
                        'filters',
                        UpdateType.FILTER_UPDATE,
                        () => {
                            if (isDevelopment) {
                                console.log(`[useFilters] Completed critical filter update render for ${filterId}`);
                            }
                        },
                        'critical'
                    );
                }

                // Also queue the update through the batch system for proper state tracking
                queueFilterUpdate(baseFilterId, {
                    intensity,
                    enabled: true
                }, priority);
            } else {
                if (isDevelopment) {
                    console.log(`[useFilters] Filter ${baseFilterId} not found for coordination event`);
                }
            }
        } catch (error) {
            if (isDevelopment) {
                console.error('Error handling filter coordination event:', error);
            }
        }
    }, [queueFilterUpdate]);

    // Set up event listeners for filter coordination
    useEffect(() => {
        window.addEventListener(FILTER_COORDINATION_EVENT, handleFilterCoordinationEvent);

        return () => {
            window.removeEventListener(FILTER_COORDINATION_EVENT, handleFilterCoordinationEvent);
        };
    }, [handleFilterCoordinationEvent]);

    // Initialize filters when ready
    useEffect(() => {
        initializeFilters();

        return () => {
            // Mark as unmounted
            isMountedRef.current = false;

            // Clean up any pending batch processing
            if (batchTimeoutRef.current !== null) {
                window.clearTimeout(batchTimeoutRef.current);
                batchTimeoutRef.current = null;
            }

            // Clean up any pending render updates
            if (debouncedRenderRef.current !== null) {
                window.clearTimeout(debouncedRenderRef.current);
                debouncedRenderRef.current = null;
            }

            // Clear the filter state cache
            filterStateCache.current.clear();
        };
    }, [initializeFilters]);

    return {
        updateFilterIntensities,
        resetAllFilters,
        activateFilterEffects,
        isInitialized: filtersInitializedRef.current,
        isActive: filtersActiveRef.current,
        setFiltersActive: (active: boolean) => {
            filtersActiveRef.current = active;
        }
    };
};