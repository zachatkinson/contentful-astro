import { useEffect, useRef, useCallback } from 'react';
import { Container, Sprite } from 'pixi.js';
import { type FilterConfig } from '../filters/';
import { FilterFactory } from '../filters/';
import { type HookParams } from '../types';

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
            initialIntensity: number; // Add initialIntensity property
        }[];
    };
}


/**
 * Hook to manage filters for slides and text containers
 */
export const useFilters = (
    { sliderRef, pixi, props }: HookParams
) => {
    // Keep track of applied filters for easy updating
    const filterMapRef = useRef<FilterMap>({});
    const filtersInitializedRef = useRef<boolean>(false);
    const filtersActiveRef = useRef<boolean>(false);

    // Initialize filters
    useEffect(() => {
        // Skip if app or stage not ready
        if (!pixi.app.current || !pixi.app.current.stage) {
            console.log("App or stage not available for filters, deferring initialization");
            return;
        }

        // Wait until slides and text containers are created
        if (!pixi.slides.current.length || !pixi.textContainers.current.length) {
            console.log("Waiting for slides and text containers to be available for filters");
            return;
        }

        // Avoid reinitializing filters if already done
        if (filtersInitializedRef.current) {
            console.log("Filters already initialized, skipping");
            return;
        }

        console.log("Setting up filters...");

        try {
            // Use provided filter configurations or defaults
            const imageFilters = props.imageFilters
                ? (Array.isArray(props.imageFilters) ? props.imageFilters : [props.imageFilters])
                : [{ type: 'rgb-split', enabled: true, intensity: 15 }]; // Default RGB split filter

            const textFilters = props.textFilters
                ? (Array.isArray(props.textFilters) ? props.textFilters : [props.textFilters])
                : [{ type: 'rgb-split', enabled: true, intensity: 5 }]; // Default RGB split filter

            console.log(`Applying ${imageFilters.length} image filters and ${textFilters.length} text filters`);

            // Apply filters to slides and text containers with initial creation
            // This will add the filter instances but not activate them yet
            applyFiltersToObjects(pixi.slides.current, imageFilters as FilterConfig[], 'slide-');
            applyFiltersToObjects(pixi.textContainers.current, textFilters as FilterConfig[], 'text-');

            // Ensure all filters are in an inactive state initially
            Object.keys(filterMapRef.current).forEach(id => {
                const entry = filterMapRef.current[id];
                entry.filters.forEach(filter => {
                    try {
                        // Reset each filter to ensure it starts in inactive state
                        filter.reset();
                    } catch (error) {
                        console.error(`Error initializing filter for ${id}:`, error);
                    }
                });
            });

            // Mark as initialized in inactive state
            filtersInitializedRef.current = true;
            filtersActiveRef.current = false;

            console.log("Filters initialized successfully (inactive state)");
        } catch (error) {
            console.error("Error setting up filters:", error);
        }

        return () => {
            // Clean up all filters
            Object.keys(filterMapRef.current).forEach(key => {
                const entry = filterMapRef.current[key];
                if (entry.target) {
                    entry.target.filters = []; // Set to empty array instead of null
                }
            });
            filterMapRef.current = {};
            filtersInitializedRef.current = false;
            filtersActiveRef.current = false;
            console.log("Filters cleaned up");
        };
    }, [
        pixi.app.current,
        pixi.slides.current,
        pixi.textContainers.current,
        props.imageFilters,
        props.textFilters
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

        objects.forEach((object, index) => {
            const id = `${idPrefix}${index}`;
            console.log(`Applying filters to ${id}`);

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
                        console.log(`Creating ${config.type} filter for ${id}`);
                        const result = FilterFactory.createFilter(config);
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

            // Store the filter data and assign to the object
            filterMapRef.current[id].filters = activeFilters.map(result => ({
                instance: result.filter,
                updateIntensity: result.updateIntensity,
                reset: result.reset,
                initialIntensity: result.initialIntensity // Store the initial intensity
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

            console.log(`Applied ${customFilters.length} custom filters to ${id} (initial state: inactive)`);
        });
    }, [pixi, props.cursorImgEffect]);

    // Function to reset all filters to inactive state
    const resetAllFilters = useCallback(() => {
        if (!filtersInitializedRef.current) {
            console.log("Filters not initialized yet, skipping reset");
            return;
        }

        console.log("Resetting ALL filters to inactive state - hard reset");

        // First, mark as inactive to prevent race conditions
        filtersActiveRef.current = false;

        // Reset all object filters with extra logging
        Object.keys(filterMapRef.current).forEach(id => {
            const entry = filterMapRef.current[id];
            console.log(`Resetting filters for ${id}`);

            entry.filters.forEach((filter, index) => {
                try {
                    console.log(`Resetting filter ${index} for ${id}`);
                    filter.reset();
                } catch (error) {
                    console.error(`Error resetting filter ${index} for ${id}:`, error);
                }
            });

            // Also ensure these are the only filters applied (remove any transition filters)
            try {
                const baseFilters = [];

                // Add base displacement filters if they exist, but with zero scales
                if (pixi.bgDispFilter.current) {
                    // Make sure scale is set to zero
                    if (pixi.bgDispFilter.current.scale) {
                        pixi.bgDispFilter.current.scale.x = 0;
                        pixi.bgDispFilter.current.scale.y = 0;
                    }
                    baseFilters.push(pixi.bgDispFilter.current);
                }

                // Only keep the base displacement filters but with zero scale
                // so they exist but have no visual effect
                if (entry.target.filters) {
                    entry.target.filters = [...baseFilters];
                }
            } catch (filterError) {
                console.error(`Error cleaning up filters for ${id}:`, filterError);
            }
        });
    }, [pixi.bgDispFilter]);

    // Update filter intensities for hover effects
    const updateFilterIntensities = useCallback((active: boolean, forceUpdate = false) => {
        // Skip if filters haven't been initialized yet
        if (!filtersInitializedRef.current) {
            console.log("Filters not initialized yet, skipping intensity update");
            return;
        }

        console.log(`${active ? 'Activating' : 'Deactivating'} filter intensities${forceUpdate ? ' (FORCED)' : ''}`);

        // If current state matches requested state and not forced, don't do anything to avoid flickering
        if (filtersActiveRef.current === active && !forceUpdate) {
            console.log(`Filters already in ${active ? 'active' : 'inactive'} state, skipping update`);
            return;
        }

        // Update filter active state
        filtersActiveRef.current = active;

        // If deactivating, reset all filters
        if (!active) {
            resetAllFilters();
            return;
        }

        const currentSlideId = `slide-${pixi.currentIndex.current}`;
        const currentTextId = `text-${pixi.currentIndex.current}`;

        console.log(`Activating filters for slide ${currentSlideId} and text ${currentTextId}`);

        // First, make sure we have the right filter arrays applied to the objects
        // This ensures proper filter application after a slide change
        if (filterMapRef.current[currentSlideId]) {
            try {
                const slideFilters = filterMapRef.current[currentSlideId];
                const target = slideFilters.target;

                // Collect base filters
                const baseFilters = [];
                if (pixi.bgDispFilter.current) {
                    baseFilters.push(pixi.bgDispFilter.current);
                }
                if (props.cursorImgEffect && pixi.cursorDispFilter.current) {
                    baseFilters.push(pixi.cursorDispFilter.current);
                }

                // Get the custom filters
                const customFilters = slideFilters.filters.map(f => f.instance);

                // Set the combined filters on the object
                target.filters = [...baseFilters, ...customFilters];

                console.log(`Reapplied filter array to slide ${currentSlideId} with ${customFilters.length} custom filters`);
            } catch (error) {
                console.error(`Error reapplying filter array to ${currentSlideId}:`, error);
            }
        }

        // Similarly for text filters
        if (filterMapRef.current[currentTextId]) {
            try {
                const textFilters = filterMapRef.current[currentTextId];
                const target = textFilters.target;

                // Collect base filters
                const baseFilters = [];
                if (pixi.bgDispFilter.current) {
                    baseFilters.push(pixi.bgDispFilter.current);
                }

                // Get the custom filters
                const customFilters = textFilters.filters.map(f => f.instance);

                // Set the combined filters on the object
                target.filters = [...baseFilters, ...customFilters];

                console.log(`Reapplied filter array to text ${currentTextId} with ${customFilters.length} custom filters`);
            } catch (error) {
                console.error(`Error reapplying filter array to ${currentTextId}:`, error);
            }
        }

        // Now activate the filter intensities
        // Update slide filters
        if (filterMapRef.current[currentSlideId]) {
            filterMapRef.current[currentSlideId].filters.forEach((filter, index) => {
                try {
                    // Use the filter's own update intensity function with the stored initial intensity
                    console.log(`Activating slide filter ${index} for ${currentSlideId} with intensity ${filter.initialIntensity}`);
                    filter.updateIntensity(filter.initialIntensity); // Use initial intensity instead of hardcoded 15
                } catch (error) {
                    console.error(`Error activating slide filter ${index}:`, error);
                }
            });
        } else {
            console.warn(`No filters found for ${currentSlideId}`);
        }

        // Update text filters
        if (filterMapRef.current[currentTextId]) {
            filterMapRef.current[currentTextId].filters.forEach((filter, index) => {
                try {
                    // Use the filter's own update intensity function with the stored initial intensity
                    console.log(`Activating text filter ${index} for ${currentTextId} with intensity ${filter.initialIntensity}`);
                    filter.updateIntensity(filter.initialIntensity); // Use initial intensity instead of hardcoded 5
                } catch (error) {
                    console.error(`Error activating text filter ${index}:`, error);
                }
            });
        } else {
            console.warn(`No filters found for ${currentTextId}`);
        }
    }, [pixi.currentIndex, pixi.bgDispFilter, pixi.cursorDispFilter, props.cursorImgEffect, resetAllFilters]);

    return {
        updateFilterIntensities,
        resetAllFilters,
        isInitialized: filtersInitializedRef.current,
        isActive: filtersActiveRef.current
    };
};