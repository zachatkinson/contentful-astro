import { useEffect, useRef, useCallback } from 'react';
import { Container, Sprite, Filter } from 'pixi.js';
import { type FilterConfig } from '../filters/';
import { FilterFactory } from '../filters/FilterFactory';
import { type HookParams } from '../types';
import ResourceManager from '../managers/ResourceManager';
import { type FilterResult } from '../filters/types';

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

/**
 * Hook to manage filters for slides and text containers
 */
export const useFilters = (
    { pixi, props, resourceManager }:
        Omit<HookParams, 'sliderRef'> & { resourceManager?: ResourceManager | null }
) => {
    // Keep track of applied filters for easy updating
    const filterMapRef = useRef<FilterMap>({});
    const filtersInitializedRef = useRef<boolean>(false);
    const filtersActiveRef = useRef<boolean>(false);

    /**
     * Completely suppress filter effects
     * This goes beyond just resetting - it ensures filters have zero visual impact
     */
    const suppressFilterEffects = useCallback(() => {
        Object.keys(filterMapRef.current).forEach(id => {
            const entry = filterMapRef.current[id];

            // Completely disable filters on the target object
            if (entry.target.filters) {
                entry.target.filters = [];
            }

            // Iterate through each filter and apply aggressive suppression
            entry.filters.forEach(filterData => {
                try {
                    const filter = filterData.instance;

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
                            : [];                    }
                } catch (error) {
                    if (isDevelopment) {
                        console.error(`Error suppressing filter for ${id}:`, error);
                    }
                }
            });
        });
    }, []);

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

            // After initializing filters, immediately suppress them
            suppressFilterEffects();

            // Mark as initialized in inactive state
            filtersInitializedRef.current = true;
            filtersActiveRef.current = false;
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
        suppressFilterEffects
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

        objects.forEach((object, index) => {
            const id = `${idPrefix}${index}`;

            // Create filter entries if they don't exist
            if (!filterMapRef.current[id]) {
                filterMapRef.current[id] = {
                    target: object,
                    filters: []
                };
            }

            // Clear existing filters
            filterMapRef.current[id].filters = [];

            // Create the new filters with error handling
            const activeFilters = filterConfigs
                .filter(config => config.enabled)
                .map(config => {
                    try {
                        const result: FilterResult = FilterFactory.createFilter(config);

                        // Register the filter with ResourceManager if available
                        if (resourceManager && result.filter) {
                            resourceManager.trackFilter(result.filter);
                        }

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
            if (activeFilters.length === 0 && isDevelopment) {
                console.warn(`No valid filters created for ${id}`);
            }

            // Store the filter data and assign to the object
            filterMapRef.current[id].filters = activeFilters;

            // Initially set no filters
            object.filters = [];

            // Re-track the object after modifying its filters
            if (resourceManager) {
                resourceManager.trackDisplayObject(object);
            }
        });
    }, [pixi, resourceManager]);

    // Update filter intensities for hover effects
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

        const currentSlideId = `slide-${pixi.currentIndex.current}`;
        const currentTextId = `text-${pixi.currentIndex.current}`;

        // Update slide filters
        const updateSlideFilters = (id: string) => {
            const filterEntry = filterMapRef.current[id];
            if (!filterEntry) return;

            const target = filterEntry.target;

            // Collect base filters
            const baseFilters: Filter[] = [];
            if (pixi.bgDispFilter.current) {
                baseFilters.push(pixi.bgDispFilter.current);
            }
            if (props.cursorImgEffect && pixi.cursorDispFilter.current && id.startsWith('slide-')) {
                baseFilters.push(pixi.cursorDispFilter.current);
            }

            // Get the custom filters
            const customFilters = filterEntry.filters.map(f => f.instance);

            // Set the combined filters on the object
            target.filters = [...baseFilters, ...customFilters];

            // Re-track the object after modifying filters
            if (resourceManager) {
                resourceManager.trackDisplayObject(target);
            }

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
        };

        // Apply filters to current slide and text
        updateSlideFilters(currentSlideId);
        updateSlideFilters(currentTextId);
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