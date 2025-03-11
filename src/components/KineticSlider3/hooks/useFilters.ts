import { useEffect, useRef, useCallback } from 'react';
import { Container, Filter } from 'pixi.js';
import { type FilterConfig } from '../filters/';
import { FilterFactory } from '../filters/';
import { type HookParams } from '../types';
import ResourceManager from '../managers/ResourceManager';

// Define a more specific type for the target objects we're applying filters to
type FilterableObject = Container;

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
 * Hook to manage filters for slides and text containers with batch tracking
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
            console.log("Initializing filters with ResourceManager...");

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

            // Explicitly disable all filters after creation
            Object.keys(filterMapRef.current).forEach(id => {
                const entry = filterMapRef.current[id];

                // Reset and disable each filter
                entry.filters.forEach(filter => {
                    try {
                        // Reset filter to default inactive state
                        filter.reset();

                        // Explicitly disable filter
                        if (resourceManager && filter.instance) {
                            resourceManager.disableFilter(filter.instance);
                        }
                    } catch (error) {
                        console.error(`Error initializing filter for ${id}:`, error);
                    }
                });

                // Also disable all filters on the object directly
                if (resourceManager && entry.target.filters) {
                    resourceManager.disableFiltersOnObject(entry.target);
                }
            });

            // Ensure displacement filters are explicitly set to zero scale
            if (pixi.bgDispFilter.current && pixi.bgDispFilter.current.scale) {
                pixi.bgDispFilter.current.scale.x = 0;
                pixi.bgDispFilter.current.scale.y = 0;
            }

            if (pixi.cursorDispFilter.current && pixi.cursorDispFilter.current.scale) {
                pixi.cursorDispFilter.current.scale.x = 0;
                pixi.cursorDispFilter.current.scale.y = 0;
            }

            // Mark as initialized in inactive state
            filtersInitializedRef.current = true;
            filtersActiveRef.current = false;

            console.log("Filters initialized and disabled");
        } catch (error) {
            console.error("Error setting up filters:", error);
        }
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
            console.warn(`No ${idPrefix} objects available to apply filters`);
            return;
        }

        // Prepare batch collections for resource tracking
        const allFiltersToTrack: Filter[] = [];
        const objectsToTrack: Container[] = [];

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
                        let result = FilterFactory.createFilter(config);

                        // Initialize with ResourceManager's disabled method if available
                        if (resourceManager) {
                            resourceManager.disableFilter(result.filter);
                        }

                        // Add filter to batch tracking collection
                        allFiltersToTrack.push(result.filter);

                        // Add initialIntensity to the result
                        return {
                            ...result,
                            initialIntensity: config.intensity
                        };
                    } catch (error) {
                        console.error(`Failed to create ${config.type} filter:`, error);
                        return null;
                    }
                })
                .filter((result): result is NonNullable<typeof result> => result !== null);

            // Check if we have any valid filters
            if (activeFilters.length === 0) {
                console.warn(`No valid filters created for ${id}`);
            }

            // Store the filter data
            filterMapRef.current[id].filters = activeFilters.map(result => ({
                instance: result.filter,
                updateIntensity: result.updateIntensity,
                reset: result.reset,
                initialIntensity: result.initialIntensity
            }));

            // Apply base displacement filter if it exists
            const baseFilters = [];
            if (pixi.bgDispFilter.current) {
                // Ensure displacement filter starts with zero scale
                if (pixi.bgDispFilter.current.scale) {
                    pixi.bgDispFilter.current.scale.x = 0;
                    pixi.bgDispFilter.current.scale.y = 0;
                }
                baseFilters.push(pixi.bgDispFilter.current);
            }

            // Apply cursor displacement filter if enabled
            if (props.cursorImgEffect && pixi.cursorDispFilter.current && idPrefix === 'slide-') {
                // Ensure displacement filter starts with zero scale
                if (pixi.cursorDispFilter.current.scale) {
                    pixi.cursorDispFilter.current.scale.x = 0;
                    pixi.cursorDispFilter.current.scale.y = 0;
                }
                baseFilters.push(pixi.cursorDispFilter.current);
            }

            // Add the custom filters
            const customFilters = activeFilters.map(result => result.filter);

            // Set the combined filters on the object
            object.filters = [...baseFilters, ...customFilters];

            // Add object to batch tracking collection
            objectsToTrack.push(object);
        });

        // Use batch tracking for better performance
        if (resourceManager) {
            if (allFiltersToTrack.length > 0) {
                resourceManager.trackFilterBatch(allFiltersToTrack);
                console.log(`Batch tracked ${allFiltersToTrack.length} filters`);
            }

            if (objectsToTrack.length > 0) {
                resourceManager.trackDisplayObjectBatch(objectsToTrack);
                console.log(`Batch tracked ${objectsToTrack.length} display objects`);
            }

            // Explicitly disable all filters again to be absolutely sure
            objectsToTrack.forEach(object => {
                resourceManager.disableFiltersOnObject(object);
            });
        }
    }, [pixi, props.cursorImgEffect, resourceManager]);

    // Function to reset all filters to inactive state
    const resetAllFilters = useCallback(() => {
        if (!filtersInitializedRef.current) return;

        // First, mark as inactive to prevent race conditions
        filtersActiveRef.current = false;

        console.log("Resetting all filters to inactive state");

        // Prepare batch collections for better performance
        const objectsToUpdate: Container[] = [];

        // Reset all object filters
        Object.keys(filterMapRef.current).forEach(id => {
            const entry = filterMapRef.current[id];

            entry.filters.forEach((filter) => {
                try {
                    filter.reset();

                    // Also explicitly disable using ResourceManager
                    if (resourceManager) {
                        resourceManager.disableFilter(filter.instance);
                    }
                } catch (error) {
                    console.error(`Error resetting filter for ${id}:`, error);
                }
            });

            // Ensure displacement filters have zero scales
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

                    // Add to batch update collection
                    objectsToUpdate.push(entry.target);
                }
            } catch (filterError) {
                console.error(`Error cleaning up filters for ${id}:`, filterError);
            }
        });

        // Use batch tracking for updating objects
        if (resourceManager && objectsToUpdate.length > 0) {
            resourceManager.trackDisplayObjectBatch(objectsToUpdate);

            // Double-ensure all filters are disabled
            objectsToUpdate.forEach(object => {
                resourceManager.disableFiltersOnObject(object);
            });
        }
    }, [pixi.bgDispFilter.current, resourceManager]);

    // Update filter intensities for hover effects
    const updateFilterIntensities = useCallback((active: boolean, forceUpdate = false) => {
        // Skip if filters haven't been initialized yet
        if (!filtersInitializedRef.current) return;

        console.log(`Updating filter intensities - active: ${active}, forceUpdate: ${forceUpdate}`);

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
            console.log(`Activating filters for ${id}`);

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

            // Update filter intensities - THIS IS KEY
            filterEntry.filters.forEach((filter) => {
                try {
                    console.log(`Setting filter intensity to ${filter.initialIntensity} for filter in ${id}`);
                    filter.updateIntensity(filter.initialIntensity);
                } catch (error) {
                    console.error(`Error activating filter for ${id}:`, error);
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