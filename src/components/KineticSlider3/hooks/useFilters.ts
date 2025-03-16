import { useEffect, useRef, useCallback } from 'react';
import { Container, Sprite, Filter } from 'pixi.js';
import { type FilterConfig } from '../filters/';
import { FilterFactory } from '../filters/';
import { type HookParams } from '../types';
import ResourceManager from '../managers/ResourceManager';
import { type FilterResult } from '../filters/';
import RenderScheduler from '../managers/RenderScheduler';
import { UpdateType } from '../managers/UpdateTypes';

// Development environment check
const isDevelopment = import.meta.env?.MODE === 'development';

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

// Interface for the hook's return value
interface UseFiltersResult {
    updateFilterIntensities: (active: boolean, forceUpdate?: boolean) => void;
    resetAllFilters: () => void;
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
    // Keep track of applied filters for easy updating
    const filterMapRef = useRef<FilterMap>({});
    const filtersInitializedRef = useRef<boolean>(false);
    const filtersActiveRef = useRef<boolean>(false);

    // Store batch resource collections for efficient management
    const batchCollectionRef = useRef<{
        pendingFilters: Filter[];
        pendingObjects: FilterableObject[];
    }>({
        pendingFilters: [],
        pendingObjects: []
    });

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
            Object.keys(filterMapRef.current).forEach(id => {
                const entry = filterMapRef.current[id];

                // Completely disable filters on the target object
                if (entry.target.filters) {
                    entry.target.filters = [];
                }

                // Batch collection for re-tracking objects after filter removal
                if (resourceManager) {
                    trackObjectForBatch(entry.target);
                }

                // Collect filters for batch processing their reset operations
                const filtersToReset: Filter[] = [];

                // Iterate through each filter and apply aggressive suppression
                entry.filters.forEach(filterData => {
                    try {
                        const filter = filterData.instance;
                        filtersToReset.push(filter);

                        // Aggressive suppression techniques
                        if ('enabled' in filter) {
                            (filter as any).enabled = false;
                        }

                        // Attempt to zero out various potential effect properties
                        if ('alpha' in filter) {
                            (filter as any).alpha = 0;
                        }

                        if ('strength' in filter) {
                            (filter as any).strength = 0;
                        }

                        if ('scale' in filter) {
                            const scale = (filter as any).scale;
                            if (scale && typeof scale.x === 'number') {
                                scale.x = 0;
                                scale.y = 0;
                            }
                        }

                        // Call reset method if available
                        if (typeof filterData.reset === 'function') {
                            filterData.reset();
                        }

                        // Additional safety: remove filter from active filters
                        if (entry.target.filters) {
                            entry.target.filters = entry.target.filters
                                ? (entry.target.filters as Filter[]).filter((f: Filter) => f !== filter)
                                : [];
                        }
                    } catch (error) {
                        if (isDevelopment) {
                            console.error(`Error suppressing filter for ${id}:`, error);
                        }
                    }
                });

                // Batch track the reset filters
                if (resourceManager && filtersToReset.length > 0) {
                    filtersToReset.forEach(filter => trackFilterForBatch(filter));
                }
            });

            // Process all pending resources in batch
            processPendingResources();
        } catch (error) {
            if (isDevelopment) {
                console.error('Error suppressing filter effects:', error);
            }
        } finally {
            // Mark filters as inactive even if an error occurred
            filtersActiveRef.current = false;
        }
    }, [resourceManager, processPendingResources, trackFilterForBatch, trackObjectForBatch]);

    // Initialize filters
    useEffect(() => {
        // Skip if app or stage not ready
        if (!pixi.app.current || !pixi.app.current.stage) return;

        // Wait until slides and text containers are created
        if (!pixi.slides.current.length || !pixi.textContainers.current.length) return;

        // Avoid reinitializing filters if already done
        if (filtersInitializedRef.current) return;

        try {
            // Use provided filter configurations or defaults
            const imageFilters = props.imageFilters
                ? (Array.isArray(props.imageFilters) ? props.imageFilters : [props.imageFilters])
                : [{ type: 'rgb-split', enabled: true, intensity: 15 }];

            const textFilters = props.textFilters
                ? (Array.isArray(props.textFilters) ? props.textFilters : [props.textFilters])
                : [{ type: 'rgb-split', enabled: true, intensity: 5 }];

            // Apply filters to slides and text containers with initial creation
            applyFiltersToObjects(pixi.slides.current, imageFilters as FilterConfig[], 'slide-');
            applyFiltersToObjects(pixi.textContainers.current, textFilters as FilterConfig[], 'text-');

            // Process any pending resources in batch
            processPendingResources();

            // After initializing filters, immediately suppress them
            suppressFilterEffects();

            // Mark as initialized in inactive state
            filtersInitializedRef.current = true;
            filtersActiveRef.current = false;

            if (isDevelopment) {
                console.log('Filters initialized successfully');
            }
        } catch (error) {
            if (isDevelopment) {
                console.error("Error setting up filters:", error);
            }
        }

        // No need for cleanup as ResourceManager will handle resource disposal
    }, [
        pixi.app.current,
        pixi.slides.current,
        pixi.textContainers.current,
        props.imageFilters,
        props.textFilters,
        resourceManager,
        suppressFilterEffects,
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
                }

                // Store the filter data and assign to the object
                filterMapRef.current[id].filters = objectActiveFilters;

                // Initially set no filters
                object.filters = [];
            });

            // Batch track all created filters
            if (resourceManager && createdFilters.length > 0) {
                resourceManager.trackFilterBatch(createdFilters);
            }

            // Batch track all target objects
            if (resourceManager && targetObjects.length > 0) {
                resourceManager.trackDisplayObjectBatch(targetObjects);
            }

            if (isDevelopment) {
                console.log(`Applied ${createdFilters.length} filters to ${targetObjects.length} objects with prefix ${idPrefix}`);
            }
        } catch (error) {
            if (isDevelopment) {
                console.error(`Error applying filters to ${idPrefix} objects:`, error);
            }
        }
    }, [resourceManager]);

    /**
     * Enhanced update filter intensities function with scheduler support
     * This can be called directly or scheduled through the RenderScheduler
     */
    const updateFilterIntensities = useCallback((active: boolean, forceUpdate = false) => {
        // Skip if filters haven't been initialized yet
        if (!filtersInitializedRef.current) return;

        // If current state matches requested state and not forced, don't do anything
        if (filtersActiveRef.current === active && !forceUpdate) return;

        // Update filter active state
        filtersActiveRef.current = active;

        // If deactivating, completely suppress filters
        if (!active) {
            suppressFilterEffects();
            return;
        }

        try {
            const currentSlideId = `slide-${pixi.currentIndex.current}`;
            const currentTextId = `text-${pixi.currentIndex.current}`;

            // Prepare collections for batch processing
            const objectsToUpdate: FilterableObject[] = [];
            const filtersToUpdate: Filter[] = [];

            // Update slide and text filters in a single pass
            [currentSlideId, currentTextId].forEach(id => {
                const filterEntry = filterMapRef.current[id];
                if (!filterEntry) return;

                const target = filterEntry.target;
                objectsToUpdate.push(target);

                // Collect base filters
                const baseFilters: Filter[] = [];
                if (pixi.bgDispFilter.current) {
                    baseFilters.push(pixi.bgDispFilter.current);
                    filtersToUpdate.push(pixi.bgDispFilter.current);
                }
                if (props.cursorImgEffect && pixi.cursorDispFilter.current && id.startsWith('slide-')) {
                    baseFilters.push(pixi.cursorDispFilter.current);
                    filtersToUpdate.push(pixi.cursorDispFilter.current);
                }

                // Get the custom filters
                const customFilters = filterEntry.filters.map(f => {
                    filtersToUpdate.push(f.instance);
                    return f.instance;
                });

                // Set the combined filters on the object
                target.filters = [...baseFilters, ...customFilters];

                // Update filter intensities
                filterEntry.filters.forEach((filterData) => {
                    try {
                        filterData.updateIntensity(filterData.initialIntensity);
                    } catch (error) {
                        if (isDevelopment) {
                            console.error(`Error activating filter for ${id}:`, error);
                        }
                    }
                });
            });

            // Batch track all updated objects
            if (resourceManager && objectsToUpdate.length > 0) {
                resourceManager.trackDisplayObjectBatch(objectsToUpdate);
            }

            // Batch track all updated filters
            if (resourceManager && filtersToUpdate.length > 0) {
                resourceManager.trackFilterBatch(filtersToUpdate);
            }

            if (isDevelopment) {
                console.log(`Updated filter intensities for ${objectsToUpdate.length} objects with ${filtersToUpdate.length} filters`);
            }
        } catch (error) {
            if (isDevelopment) {
                console.error("Error updating filter intensities:", error);
            }
            // On error, try to suppress all filters for safety
            suppressFilterEffects();
        }
    }, [
        pixi.currentIndex.current,
        pixi.bgDispFilter.current,
        pixi.cursorDispFilter.current,
        props.cursorImgEffect,
        suppressFilterEffects,
        resourceManager
    ]);

    return {
        updateFilterIntensities,
        resetAllFilters: suppressFilterEffects,
        isInitialized: filtersInitializedRef.current,
        isActive: filtersActiveRef.current
    };
};