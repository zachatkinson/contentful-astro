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

// Type to represent update priority
type UpdatePriority = 'high' | 'normal' | 'low';

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
}

/**
 * Hook to manage filters for slides and text containers
 * Fully optimized with:
 * - Batch resource management
 * - Efficient filter management
 * - Comprehensive error handling
 * - Memory leak prevention
 * - Optimized state tracking
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
    const filtersInitializedRef = useRef<boolean>(false);
    const filtersActiveRef = useRef<boolean>(false);
    const debouncedRenderRef = useRef<number | null>(null);

    // Store batch resource collections for efficient management
    const batchCollectionRef = useRef<{
        pendingFilters: Filter[];
        pendingObjects: FilterableObject[];
    }>({
        pendingFilters: [],
        pendingObjects: []
    });

    // New batch update queue and configuration
    const batchQueueRef = useRef<BatchFilterUpdate[]>([]);
    const batchConfigRef = useRef<FilterBatchConfig>({
        bufferMs: 16, // One frame at 60fps
        maxBatchSize: 10
    });
    const batchTimeoutRef = useRef<number | null>(null);

    const scheduleRenderUpdate = useCallback(() => {
        if (debouncedRenderRef.current !== null) {
            window.cancelAnimationFrame(debouncedRenderRef.current);
        }

        debouncedRenderRef.current = window.requestAnimationFrame(() => {
            debouncedRenderRef.current = null;
            RenderScheduler.getInstance().scheduleTypedUpdate(
                'filters',
                UpdateType.FILTER_UPDATE,
                () => {
                    if (isDevelopment) {
                        console.log('Completed filter update render');
                    }
                }
            );
        });
    }, []);

    /**
     * Get the current state of a filter
     */
    const getFilterState = (filter: Filter): BaseFilterConfig => {
        const type = filter.constructor.name.replace('Filter', '').toLowerCase() as FilterType;
        return {
            type,
            enabled: 'enabled' in filter ? (filter as any).enabled : true,
            intensity: 'intensity' in filter ? (filter as any).intensity : 0
        };
    };

    /**
     * Compare two filter states and return only the changed properties
     */
    const compareFilterStates = useCallback((oldState: BaseFilterConfig, newState: Partial<BaseFilterConfig>): FilterDiff => {
        const changedProperties: Partial<BaseFilterConfig> = {};
        let hasChanged = false;

        // Compare each property in newState against oldState
        (Object.keys(newState) as Array<keyof BaseFilterConfig>).forEach(key => {
            const value = newState[key];
            if (value !== undefined && oldState[key] !== value) {
                (changedProperties[key] as any) = value;
                hasChanged = true;
            }
        });

        return { hasChanged, changedProperties };
    }, []);

    /**
     * Process the batch queue and apply updates
     */
    const processBatchQueue = useCallback(() => {
        try {
            const now = Date.now();
            const queue = batchQueueRef.current;
            const { bufferMs, maxBatchSize } = batchConfigRef.current;

            // Filter updates that have waited long enough
            const readyUpdates = queue.filter(update => {
                const waitTime = update.priority === 'high' ? 0 :
                    update.priority === 'normal' ? bufferMs :
                        bufferMs * 2;
                return now - update.timestamp >= waitTime;
            });

            if (readyUpdates.length === 0) return;

            // Sort by priority and then by timestamp
            const sortedUpdates = readyUpdates.sort((a, b) => {
                const priorityOrder = { high: 0, normal: 1, low: 2 };
                const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
                return priorityDiff === 0 ? a.timestamp - b.timestamp : priorityDiff;
            });

            // Process up to maxBatchSize updates
            const batchUpdates = sortedUpdates.slice(0, maxBatchSize);

            // Group updates by filterId to only apply the latest changes
            const latestUpdates = new Map<string, Partial<BaseFilterConfig>>();

            batchUpdates.forEach(update => {
                const existing = latestUpdates.get(update.filterId);
                const mergedChanges: Partial<BaseFilterConfig> = {
                    ...(existing || {}),
                    enabled: update.changes.enabled,
                    intensity: update.changes.intensity,
                    ...(update.changes.type ? { type: update.changes.type as FilterType } : {})
                };
                latestUpdates.set(update.filterId, mergedChanges);
            });

            // Apply the updates
            latestUpdates.forEach((changes, filterId) => {
                const filterEntry = filterMapRef.current[filterId];
                if (!filterEntry) return;

                filterEntry.filters.forEach(filterData => {
                    const currentState = getFilterState(filterData.instance);
                    const diff = compareFilterStates(currentState, changes);
                    if (diff.hasChanged) {
                        if ('intensity' in diff.changedProperties && diff.changedProperties.intensity !== undefined) {
                            filterData.updateIntensity(diff.changedProperties.intensity);
                        }
                        if ('enabled' in diff.changedProperties && 'enabled' in filterData.instance) {
                            (filterData.instance as any).enabled = diff.changedProperties.enabled;
                        }
                    }
                });
            });

            // Remove processed updates from queue
            batchQueueRef.current = queue.filter(update => !batchUpdates.includes(update));

            // Schedule next batch if there are remaining updates
            if (batchQueueRef.current.length > 0) {
                scheduleNextBatch();
            }

            // Schedule a debounced render update instead of immediate
            scheduleRenderUpdate();

        } catch (error) {
            if (isDevelopment) {
                console.error('Error processing batch queue:', error);
            }
        }
    }, [compareFilterStates, scheduleRenderUpdate]);

    /**
     * Schedule the next batch processing
     */
    const scheduleNextBatch = useCallback(() => {
        if (batchTimeoutRef.current !== null) return;

        batchTimeoutRef.current = window.setTimeout(() => {
            batchTimeoutRef.current = null;
            processBatchQueue();
        }, batchConfigRef.current.bufferMs);
    }, [processBatchQueue]);

    /**
     * Queue a filter update with priority
     */
    const queueFilterUpdate = useCallback((
        filterId: string,
        changes: Partial<BaseFilterConfig>,
        priority: UpdatePriority = 'normal'
    ) => {
        const update: BatchFilterUpdate = {
            filterId,
            changes,
            timestamp: Date.now(),
            priority
        };

        batchQueueRef.current.push(update);
        scheduleNextBatch();
    }, [scheduleNextBatch]);

    /**
     * Batch-process any pending resources using ResourceManager
     */
    const processPendingResources = useCallback(() => {
        try {
            if (!resourceManager) return;

            const { pendingFilters, pendingObjects } = batchCollectionRef.current;

            // Process filters in batch if any exist
            if (pendingFilters.length > 0) {
                resourceManager.trackFilterBatch(pendingFilters);
                pendingFilters.length = 0; // Clear the array
            }

            // Process display objects in batch if any exist
            if (pendingObjects.length > 0) {
                resourceManager.trackDisplayObjectBatch(pendingObjects);
                pendingObjects.length = 0; // Clear the array
            }
        } catch (error) {
            if (isDevelopment) {
                console.error('Error processing pending filter resources:', error);
            }
            // Clear pending collections even on error to avoid stuck states
            batchCollectionRef.current.pendingFilters = [];
            batchCollectionRef.current.pendingObjects = [];
        }
    }, [resourceManager]);

    /**
     * Add a filter to the pending batch collection
     */
    const trackFilterForBatch = useCallback((filter: Filter): Filter => {
        try {
            batchCollectionRef.current.pendingFilters.push(filter);
            return filter;
        } catch (error) {
            if (isDevelopment) {
                console.error('Error adding filter to batch collection:', error);
            }
            return filter;
        }
    }, []);

    /**
     * Add a display object to the pending batch collection
     */
    const trackObjectForBatch = useCallback((object: FilterableObject): FilterableObject => {
        try {
            batchCollectionRef.current.pendingObjects.push(object);
            return object;
        } catch (error) {
            if (isDevelopment) {
                console.error('Error adding display object to batch collection:', error);
            }
            return object;
        }
    }, []);

    /**
     * Completely suppress filter effects
     * This goes beyond just resetting - it ensures filters have zero visual impact
     */
    const suppressFilterEffects = useCallback(() => {
        try {
            // Get all filter entries
            const filterEntries = Object.values(filterMapRef.current);

            // Create a batch of animations for all filters
            const animations = filterEntries.flatMap(entry => {
                return entry.filters.map(filterData => {
                    // Create animation to scale filter intensity to 0
                    return gsap.to({}, {
                        value: 0,
                        duration: 0.5,
                        ease: "power2.out",
                        onUpdate: function() {
                            if (filterData.updateIntensity) {
                                filterData.updateIntensity(this.targets()[0].value);
                            }
                        }
                    });
                });
            });

            // Track animations in batch
            if (resourceManager && animations.length > 0) {
                resourceManager.trackAnimationBatch(animations);
            }

            // Mark filters as inactive
            filtersActiveRef.current = false;

            if (isDevelopment) {
                console.log(`Suppressed ${animations.length} filter effects`);
            }
        } catch (error) {
            if (isDevelopment) {
                console.error('Error suppressing filter effects:', error);
            }
        }
    }, [resourceManager]);

    const activateFilterEffects = useCallback(() => {
        try {
            // Get all filter entries
            const filterEntries = Object.values(filterMapRef.current);

            // Create a batch of animations for all filters
            const animations = filterEntries.flatMap(entry => {
                return entry.filters.map(filterData => {
                    // Get the original intensity from the stored initialIntensity
                    const targetIntensity = filterData.initialIntensity;

                    // Create animation to restore filter intensity
                    return gsap.to({}, {
                        value: targetIntensity,
                        duration: 0.5,
                        ease: "power2.out",
                        onUpdate: function() {
                            if (filterData.updateIntensity) {
                                filterData.updateIntensity(this.targets()[0].value);
                            }
                        }
                    });
                });
            });

            // Track animations in batch
            if (resourceManager && animations.length > 0) {
                resourceManager.trackAnimationBatch(animations);
            }

            // Mark filters as active
            filtersActiveRef.current = true;

            if (isDevelopment) {
                console.log(`Activated ${animations.length} filter effects`);
            }
        } catch (error) {
            if (isDevelopment) {
                console.error('Error activating filter effects:', error);
            }
        }
    }, [resourceManager]);

    // Convert general FilterConfig to specific FilterConfig
    const convertToSpecificFilterConfig = (config: import('../types').FilterConfig): import('../filters/types').FilterConfig | null => {
        // Extract the common properties
        const { type, enabled, intensity, ...rest } = config;

        try {
            // Create a base config with all properties
            const baseConfig = {
                type,
                enabled,
                intensity,
                // Spread any additional properties from both the root level and options
                ...(rest || {}),
                ...(config.options || {})
            };

            // Validate the type is a known filter type
            const isValidType = (type: string): type is import('../filters/types').FilterType => {
                return [
                    'rgbSplit',
                    'displacement',
                    'outline',
                    'zoomBlur',
                    'adjustment',
                    'alpha',
                    'blur',
                    // Add other valid filter types here
                ].includes(type);
            };

            if (!isValidType(type)) {
                if (isDevelopment) {
                    console.warn(`Invalid filter type: ${type}. Filter will be skipped.`);
                }
                return null;
            }

            if (isDevelopment) {
                console.log(`Converting filter config for ${type}:`, {
                    original: config,
                    converted: baseConfig,
                    additionalProps: rest,
                    options: config.options
                });
            }

            // Return the config with proper type assertion
            return baseConfig as import('../filters/types').FilterConfig;
        } catch (error) {
            if (isDevelopment) {
                console.warn(`Error validating filter type ${type}:`, error);
            }
            return null;
        }
    };

    // Use provided filter configurations or none
    const imageFilters = props.imageFilters
        ? (Array.isArray(props.imageFilters)
            ? props.imageFilters.map(convertToSpecificFilterConfig).filter((config): config is import('../filters/types').FilterConfig => config !== null)
            : [convertToSpecificFilterConfig(props.imageFilters)].filter((config): config is import('../filters/types').FilterConfig => config !== null))
        : [];

    const textFilters = props.textFilters
        ? (Array.isArray(props.textFilters)
            ? props.textFilters.map(convertToSpecificFilterConfig).filter((config): config is import('../filters/types').FilterConfig => config !== null)
            : [convertToSpecificFilterConfig(props.textFilters)].filter((config): config is import('../filters/types').FilterConfig => config !== null))
        : [];

    if (isDevelopment) {
        console.log('[useFilters] Initializing filters with:', {
            imageFilters,
            textFilters,
            slidesCount: pixi.slides.current?.length,
            textContainersCount: pixi.textContainers.current?.length,
            filterMapSize: Object.keys(filterMapRef.current).length,
            isInitialized: filtersInitializedRef.current,
            isActive: filtersActiveRef.current
        });
    }

    // Apply filters to slides and text containers with initial creation
    useEffect(() => {
        // Skip if app or stage not ready
        if (!pixi.app.current || !pixi.app.current.stage) {
            if (isDevelopment) {
                console.log('[useFilters] Skipping initialization - app or stage not ready');
            }
            return;
        }

        // Wait until slides and text containers are created
        if (!pixi.slides.current.length || !pixi.textContainers.current.length) {
            if (isDevelopment) {
                console.log('[useFilters] Skipping initialization - slides or text containers not ready');
            }
            return;
        }

        // Avoid reinitializing filters if already done
        if (filtersInitializedRef.current) {
            if (isDevelopment) {
                console.log('[useFilters] Skipping initialization - already initialized');
            }
            return;
        }

        try {
            if (isDevelopment) {
                console.log('[useFilters] Starting filter initialization...');
            }

            // Apply filters to slides
            pixi.slides.current.forEach((slide, index) => {
                const id = `slide${index}`;
                if (isDevelopment) {
                    console.log(`[useFilters] Creating filters for slide ${id}...`);
                }
                applyFiltersToObjects([slide], imageFilters, id);
            });

            // Apply filters to text containers
            pixi.textContainers.current.forEach((container, index) => {
                const id = `text${index}`;
                if (isDevelopment) {
                    console.log(`[useFilters] Creating filters for text container ${id}...`);
                }
                applyFiltersToObjects([container], textFilters, id);
            });

            // Process any pending resources
            processPendingResources();

            // Mark initialization as complete
            filtersInitializedRef.current = true;

            if (isDevelopment) {
                console.log('[useFilters] Filter initialization complete:', {
                    filterMapSize: Object.keys(filterMapRef.current).length,
                    imageFilters,
                    textFilters
                });
            }
        } catch (error) {
            if (isDevelopment) {
                console.error('[useFilters] Error during filter initialization:', error);
            }
        }
    }, [
        pixi.app.current,
        pixi.slides.current,
        pixi.textContainers.current,
        imageFilters,
        textFilters,
        processPendingResources
    ]);

    // Apply the configured filters to an array of objects
    const applyFiltersToObjects = useCallback((
        objects: FilterableObject[],
        filterConfigs: FilterConfig[],
        idPrefix: string
    ) => {
        if (!objects.length) {
            if (isDevelopment) {
                console.warn(`No ${idPrefix} objects available to apply filters`);
            }
            return;
        }

        try {
            if (isDevelopment) {
                console.log(`Starting filter application for ${idPrefix} objects...`);
                console.log('Filter configurations:', filterConfigs);
            }

            // Pre-filter active filter configurations
            const activeFilterConfigs = filterConfigs.filter(config => config.enabled);

            // Skip further processing if no active filters exist
            if (activeFilterConfigs.length === 0) {
                if (isDevelopment) {
                    console.log(`No active filters to apply for ${idPrefix}`);
                }
                return;
            }

            // Prepare collections for batch operations
            const createdFilters: Filter[] = [];
            const targetObjects: FilterableObject[] = [];

            objects.forEach((object, index) => {
                const id = `${idPrefix}${index}`;

                if (isDevelopment) {
                    console.log(`Creating filters for object ${id}...`);
                }

                // Create filter entries if they don't exist
                if (!filterMapRef.current[id]) {
                    filterMapRef.current[id] = {
                        target: object,
                        filters: []
                    };
                }

                // Add object to batch tracking collection
                targetObjects.push(object);

                // Clear existing filters
                filterMapRef.current[id].filters = [];

                // Create the new filters with error handling
                const objectActiveFilters = activeFilterConfigs
                    .map(config => {
                        try {
                            if (isDevelopment) {
                                console.log(`Creating ${config.type} filter for ${id} with intensity ${config.intensity}...`);
                            }

                            const result: FilterResult = FilterFactory.createFilter(config);

                            // Add filter to batch collection
                            createdFilters.push(result.filter);

                            // Add initialIntensity to the result
                            return {
                                instance: result.filter,
                                updateIntensity: result.updateIntensity,
                                reset: result.reset,
                                initialIntensity: config.intensity
                            };
                        } catch (error) {
                            if (isDevelopment) {
                                console.error(`Failed to create ${config.type} filter:`, error);
                            }
                            return null;
                        }
                    })
                    .filter((result): result is NonNullable<typeof result> => result !== null);

                // Check if we have any valid filters
                if (objectActiveFilters.length === 0 && isDevelopment) {
                    console.warn(`No valid filters created for ${id}`);
                } else if (isDevelopment) {
                    console.log(`Created ${objectActiveFilters.length} filters for ${id}`);
                }

                // Store the filter data and assign to the object
                filterMapRef.current[id].filters = objectActiveFilters;

                // IMPORTANT: Actually attach the filters to the object
                object.filters = objectActiveFilters.map(filterData => filterData.instance);

                if (isDevelopment) {
                    console.log(`Attached ${objectActiveFilters.length} filters to object ${id}`);
                }
            });

            // Batch track all created filters
            if (resourceManager && createdFilters.length > 0) {
                resourceManager.trackFilterBatch(createdFilters);
                if (isDevelopment) {
                    console.log(`Tracked ${createdFilters.length} filters with ResourceManager`);
                }
            }

            // Batch track all target objects
            if (resourceManager && targetObjects.length > 0) {
                resourceManager.trackDisplayObjectBatch(targetObjects);
                if (isDevelopment) {
                    console.log(`Tracked ${targetObjects.length} objects with ResourceManager`);
                }
            }

            if (isDevelopment) {
                console.log(`Applied ${createdFilters.length} filters to ${targetObjects.length} objects with prefix ${idPrefix}`);
                console.log('Updated filter map:', filterMapRef.current);
            }
        } catch (error) {
            if (isDevelopment) {
                console.error(`Error applying filters to ${idPrefix} objects:`, error);
            }
        }
    }, [resourceManager]);

    /**
     * Update filter intensities based on active state
     * Now uses batched updates for better performance
     */
    const updateFilterIntensities = useCallback((active: boolean, forceUpdate: boolean = false) => {
        try {
            // Skip if filters aren't initialized or if no change in state (unless forced)
            if (!filtersInitializedRef.current || (!forceUpdate && active === filtersActiveRef.current)) {
                return;
            }

            // Update active state
            filtersActiveRef.current = active;

            // Queue updates for all filters
            Object.keys(filterMapRef.current).forEach(filterId => {
                const entry = filterMapRef.current[filterId];
                entry.filters.forEach((filterData, index) => {
                    queueFilterUpdate(filterId + '-' + index, {
                        enabled: active,
                        intensity: active ? filterData.initialIntensity : 0
                    });
                });
            });
        } catch (error) {
            if (isDevelopment) {
                console.error('Error updating filter intensities:', error);
            }
        }
    }, [queueFilterUpdate]);

    // Clean up RAF on unmount
    useEffect(() => {
        return () => {
            if (debouncedRenderRef.current !== null) {
                window.cancelAnimationFrame(debouncedRenderRef.current);
            }
        };
    }, []);

    return {
        updateFilterIntensities,
        resetAllFilters: suppressFilterEffects,
        activateFilterEffects,
        isInitialized: filtersInitializedRef.current,
        isActive: filtersActiveRef.current
    };
};

export default useFilters;