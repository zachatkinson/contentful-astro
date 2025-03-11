import { useEffect, useRef, useCallback } from 'react';
import { Container, Sprite } from 'pixi.js';
import { type FilterConfig } from '../filters/';
import { FilterFactory } from '../filters/';
import { type HookParams } from '../types';
import ResourceManager from '../managers/ResourceManager';

// Development environment check
const isDevelopment = import.meta.env?.MODE === 'development';

// Define a more specific type for the target objects we're applying filters to
type FilterableObject = Sprite | Container;

// Type to represent a map of objects to their applied filters and control functions
interface FilterMap {
    [id: string]: {
        target: FilterableObject;
        filters: {
            instance: any;
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

            // Ensure all filters are in an inactive state initially
            Object.keys(filterMapRef.current).forEach(id => {
                const entry = filterMapRef.current[id];
                entry.filters.forEach(filter => {
                    try {
                        filter.reset();
                    } catch (error) {
                        if (isDevelopment) {
                            console.error(`Error initializing filter for ${id}:`, error);
                        }
                    }
                });
            });

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
        resourceManager
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
                        const result = FilterFactory.createFilter(config);

                        // Register the filter with ResourceManager if available
                        if (resourceManager && result.filter) {
                            resourceManager.trackFilter(result.filter);
                        }

                        // Add initialIntensity to the result
                        return {
                            ...result,
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
            filterMapRef.current[id].filters = activeFilters.map(result => ({
                instance: result.filter,
                updateIntensity: result.updateIntensity,
                reset: result.reset,
                initialIntensity: result.initialIntensity
            }));

            // Apply base displacement filter if it exists
            const baseFilters = [];
            if (pixi.bgDispFilter.current) {
                baseFilters.push(pixi.bgDispFilter.current);
            }

            // Apply cursor displacement filter if enabled
            if (props.cursorImgEffect && pixi.cursorDispFilter.current && idPrefix === 'slide-') {
                baseFilters.push(pixi.cursorDispFilter.current);
            }

            // Add the custom filters
            const customFilters = activeFilters.map(result => result.filter);

            // Set the combined filters on the object
            object.filters = [...baseFilters, ...customFilters];

            // Re-track the object after modifying its filters
            if (resourceManager) {
                resourceManager.trackDisplayObject(object);
            }
        });
    }, [pixi, props.cursorImgEffect, resourceManager]);

    // Function to reset all filters to inactive state
    const resetAllFilters = useCallback(() => {
        if (!filtersInitializedRef.current) return;

        // First, mark as inactive to prevent race conditions
        filtersActiveRef.current = false;

        // Reset all object filters
        Object.keys(filterMapRef.current).forEach(id => {
            const entry = filterMapRef.current[id];

            entry.filters.forEach((filter) => {
                try {
                    filter.reset();
                } catch (error) {
                    if (isDevelopment) {
                        console.error(`Error resetting filter for ${id}:`, error);
                    }
                }
            });

            // Ensure only base filters are applied
            try {
                const baseFilters = [];

                // Add base displacement filters with zero scales
                if (pixi.bgDispFilter.current) {
                    const bgFilter = pixi.bgDispFilter.current;
                    if (bgFilter.scale) {
                        bgFilter.scale.x = 0;
                        bgFilter.scale.y = 0;
                    }
                    baseFilters.push(bgFilter);
                }

                // Only keep the base displacement filters
                if (entry.target.filters) {
                    entry.target.filters = [...baseFilters];

                    // Re-track the object after modifying filters
                    if (resourceManager) {
                        resourceManager.trackDisplayObject(entry.target);
                    }
                }
            } catch (filterError) {
                if (isDevelopment) {
                    console.error(`Error cleaning up filters for ${id}:`, filterError);
                }
            }
        });
    }, [pixi.bgDispFilter.current, resourceManager]);

    // Update filter intensities for hover effects
    const updateFilterIntensities = useCallback((active: boolean, forceUpdate = false) => {
        // Skip if filters haven't been initialized yet
        if (!filtersInitializedRef.current) return;

        // If current state matches requested state and not forced, don't do anything
        if (filtersActiveRef.current === active && !forceUpdate) return;

        // Update filter active state
        filtersActiveRef.current = active;

        // If deactivating, reset all filters
        if (!active) {
            resetAllFilters();
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
            const baseFilters = [];
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
            filterEntry.filters.forEach((filter) => {
                try {
                    filter.updateIntensity(filter.initialIntensity);
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
        resetAllFilters,
        resourceManager
    ]);

    return {
        updateFilterIntensities,
        resetAllFilters,
        isInitialized: filtersInitializedRef.current,
        isActive: filtersActiveRef.current
    };
};