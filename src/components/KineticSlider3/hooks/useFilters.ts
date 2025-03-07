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
            initialIntensity: number;
            dispose?: () => void; // Added disposal function
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
    const disposeHandlersRef = useRef<Array<() => void>>([]);

    // Function to safely dispose a filter instance
    const disposeFilter = useCallback((filterInstance: any) => {
        if (!filterInstance) return;

        try {
            // Try standard destroy method
            if (typeof filterInstance.destroy === 'function') {
                filterInstance.destroy();
                return;
            }

            // Try dispose method for custom filters
            if (typeof filterInstance.dispose === 'function') {
                filterInstance.dispose();
                return;
            }

            // For filters with resources, try to clean them up
            if (filterInstance.resources) {
                Object.values(filterInstance.resources).forEach((resource: any) => {
                    if (resource && typeof resource.destroy === 'function') {
                        resource.destroy();
                    }
                });
            }
        } catch (error) {
            console.error('Error disposing filter:', error);
        }
    }, []);

    // Function to dispose all filters and clean up resources
    const disposeAllFilters = useCallback(() => {
        // Run all registered dispose handlers
        disposeHandlersRef.current.forEach(handler => {
            try {
                handler();
            } catch (error) {
                console.error('Error in filter dispose handler:', error);
            }
        });
        disposeHandlersRef.current = [];

        // Clean up filter instances in the map
        Object.keys(filterMapRef.current).forEach(key => {
            const entry = filterMapRef.current[key];

            // Remove filters from target first
            if (entry.target) {
                entry.target.filters = [];
            }

            // Dispose each filter
            entry.filters.forEach(filter => {
                try {
                    // Call custom dispose if available
                    if (filter.dispose) {
                        filter.dispose();
                    }

                    // Dispose the filter instance
                    disposeFilter(filter.instance);
                } catch (error) {
                    console.error(`Error disposing filter:`, error);
                }
            });
        });

        // Clear the filter map
        filterMapRef.current = {};
    }, [disposeFilter]);

    // Apply the configured filters to an array of objects
    const applyFiltersToObjects = useCallback((
        objects: FilterableObject[],
        filterConfigs: FilterConfig[],
        idPrefix: string
    ) => {
        if (!objects.length) {
            console.log(`No objects provided for ${idPrefix} filters`);
            return;
        }

        console.log(`Applying filters to ${objects.length} ${idPrefix} objects`);
        console.log(`Filter configs:`, filterConfigs);

        objects.forEach((object, index) => {
            const id = `${idPrefix}${index}`;
            console.log(`Processing filters for ${id}`);

            // Create filter entries if they don't exist
            if (!filterMapRef.current[id]) {
                filterMapRef.current[id] = {
                    target: object,
                    filters: []
                };
            }

            // Clear existing filters
            filterMapRef.current[id].filters.forEach(filter => {
                try {
                    // Call custom dispose if available
                    if (filter.dispose) {
                        filter.dispose();
                    }

                    // Dispose the filter instance
                    disposeFilter(filter.instance);
                } catch (error) {
                    console.error(`Error disposing filter:`, error);
                }
            });
            filterMapRef.current[id].filters = [];

            // Create the new filters with error handling
            const activeFilters = filterConfigs
                .filter(config => config.enabled)
                .map(config => {
                    try {
                        console.log(`Creating ${config.type} filter with intensity ${config.intensity}`);
                        const result = FilterFactory.createFilter(config);

                        // Create a dispose function for this filter
                        const dispose = () => {
                            // Reset filter state first (important for some filter types)
                            result.reset();
                            // Then dispose the filter instance
                            disposeFilter(result.filter);
                        };

                        // Register the dispose handler
                        disposeHandlersRef.current.push(dispose);

                        // Return enhanced result with initialIntensity and dispose
                        return {
                            ...result,
                            initialIntensity: config.intensity,
                            dispose
                        };
                    } catch (error) {
                        console.error(`Failed to create ${config.type} filter:`, error);
                        return null;
                    }
                })
                .filter((result): result is NonNullable<typeof result> => result !== null);

            // Store the filter data and assign to the object
            filterMapRef.current[id].filters = activeFilters.map(result => ({
                instance: result.filter,
                updateIntensity: result.updateIntensity,
                reset: result.reset,
                initialIntensity: result.initialIntensity,
                dispose: result.dispose
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

            // Print filter count for debugging
            console.log(`Setting ${baseFilters.length + customFilters.length} filters on ${id}:`,
                `${baseFilters.length} base filters, ${customFilters.length} custom filters`);

            // Set the combined filters on the object
            object.filters = [...baseFilters, ...customFilters];
        });
    }, [pixi, props.cursorImgEffect, disposeFilter]);

    // Initialize filters
    useEffect(() => {
        // Skip if app or stage not ready
        if (!pixi.app.current || !pixi.app.current.stage) {
            console.log("App or stage not ready for filters");
            return;
        }

        // Wait until slides and text containers are created
        if (!pixi.slides.current.length || !pixi.textContainers.current.length) {
            console.log("Slides or text containers not ready for filters");
            return;
        }

        // Avoid reinitializing filters if already done
        if (filtersInitializedRef.current) {
            console.log("Filters already initialized");
            return;
        }

        console.log("Initializing filters...");

        try {
            // Use provided filter configurations or defaults
            const imageFiltersConfig = props.imageFilters
                ? (Array.isArray(props.imageFilters) ? props.imageFilters : [props.imageFilters])
                : [{ type: 'rgbSplit', enabled: true, intensity: 5 }]; // Default RGB split filter

            const textFiltersConfig = props.textFilters
                ? (Array.isArray(props.textFilters) ? props.textFilters : [props.textFilters])
                : [{ type: 'outline', enabled: true, intensity: 5 }]; // Default outline filter

            console.log("Image filters config:", imageFiltersConfig);
            console.log("Text filters config:", textFiltersConfig);

            // Apply filters to slides and text containers with initial creation
            applyFiltersToObjects(pixi.slides.current, imageFiltersConfig as FilterConfig[], 'slide-');
            applyFiltersToObjects(pixi.textContainers.current, textFiltersConfig as FilterConfig[], 'text-');

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

            console.log("Filters initialized successfully");
        } catch (error) {
            console.error("Error setting up filters:", error);
        }

        return () => {
            // Clean up all filters
            disposeAllFilters();

            // Reset state
            filterMapRef.current = {};
            filtersInitializedRef.current = false;
            filtersActiveRef.current = false;
        };
    }, [
        pixi.app.current,
        pixi.slides.current,
        pixi.textContainers.current,
        props.imageFilters,
        props.textFilters,
        disposeFilter,
        applyFiltersToObjects,
        disposeAllFilters
    ]);

    // Function to reset all filters to inactive state
    const resetAllFilters = useCallback(() => {
        console.log("Resetting all filters");

        if (!filtersInitializedRef.current) {
            console.log("Filters not initialized yet, skipping reset");
            return;
        }

        // First, mark as inactive to prevent race conditions
        filtersActiveRef.current = false;

        // Reset all object filters
        Object.keys(filterMapRef.current).forEach(id => {
            const entry = filterMapRef.current[id];

            entry.filters.forEach((filter) => {
                try {
                    filter.reset();
                } catch (error) {
                    console.error(`Error resetting filter for ${id}:`, error);
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

        // If current state matches requested state and not forced, don't do anything
        if (filtersActiveRef.current === active && !forceUpdate) {
            return;
        }

        console.log(`Updating filter intensities: active=${active}, forceUpdate=${forceUpdate}`);

        // Update filter active state
        filtersActiveRef.current = active;

        // If deactivating, reset all filters
        if (!active) {
            resetAllFilters();
            return;
        }

        const currentSlideId = `slide-${pixi.currentIndex.current}`;
        const currentTextId = `text-${pixi.currentIndex.current}`;

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

                console.log(`Applied ${baseFilters.length + customFilters.length} filters to slide`);
            } catch (error) {
                console.error(`Error reapplying filter array to ${currentSlideId}:`, error);
            }
        } else {
            console.warn(`No filter data found for ${currentSlideId}`);
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

                console.log(`Applied ${baseFilters.length + customFilters.length} filters to text`);
            } catch (error) {
                console.error(`Error reapplying filter array to ${currentTextId}:`, error);
            }
        } else {
            console.warn(`No filter data found for ${currentTextId}`);
        }

        // Now activate the filter intensities
        // Update slide filters
        if (filterMapRef.current[currentSlideId]) {
            filterMapRef.current[currentSlideId].filters.forEach((filter) => {
                try {
                    // Use the filter's own update intensity function with the stored initial intensity
                    filter.updateIntensity(filter.initialIntensity);
                    console.log(`Activated slide filter with intensity ${filter.initialIntensity}`);
                } catch (error) {
                    console.error(`Error activating slide filter:`, error);
                }
            });
        }

        // Update text filters
        if (filterMapRef.current[currentTextId]) {
            filterMapRef.current[currentTextId].filters.forEach((filter) => {
                try {
                    // Use the filter's own update intensity function with the stored initial intensity
                    filter.updateIntensity(filter.initialIntensity);
                    console.log(`Activated text filter with intensity ${filter.initialIntensity}`);
                } catch (error) {
                    console.error(`Error activating text filter:`, error);
                }
            });
        }
    }, [pixi.currentIndex, pixi.bgDispFilter, pixi.cursorDispFilter, props.cursorImgEffect, resetAllFilters]);

    return {
        updateFilterIntensities,
        resetAllFilters,
        disposeAllFilters,
        isInitialized: filtersInitializedRef.current,
        isActive: filtersActiveRef.current
    };
};