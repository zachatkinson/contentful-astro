import { useEffect, useRef } from 'react';
import { Container, Sprite } from 'pixi.js';
import { RGBSplitFilter } from 'pixi-filters';
import { gsap } from 'gsap';
import { type FilterConfig } from '../filters/types';
import { FilterFactory } from '../filters/FilterFactory';
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

    // Handle legacy RGB filter props for backward compatibility
    useEffect(() => {
        if (!pixi.slides.current.length || !pixi.textContainers.current.length) return;

        // Convert legacy props to filter configs
        const createLegacyImageFilters = (): FilterConfig[] => {
            const filters: FilterConfig[] = [];

            if (props.imagesRgbEffect) {
                filters.push({
                    type: 'rgb-split',
                    enabled: true,
                    intensity: props.imagesRgbIntensity || 15
                });
            }

            return filters;
        };

        const createLegacyTextFilters = (): FilterConfig[] => {
            const filters: FilterConfig[] = [];

            if (props.textsRgbEffect) {
                filters.push({
                    type: 'rgb-split',
                    enabled: true,
                    intensity: props.textsRgbIntensity || 5
                });
            }

            return filters;
        };

        // Determine which filter configurations to use
        const imageFilters = props.imageFilters
            ? (Array.isArray(props.imageFilters) ? props.imageFilters : [props.imageFilters])
            : createLegacyImageFilters();

        const textFilters = props.textFilters
            ? (Array.isArray(props.textFilters) ? props.textFilters : [props.textFilters])
            : createLegacyTextFilters();

        // Apply filters to slides and text containers
        applyFiltersToObjects(pixi.slides.current, imageFilters as FilterConfig[], 'slide-');
        applyFiltersToObjects(pixi.textContainers.current, textFilters as FilterConfig[], 'text-');

        return () => {
            // Clean up all filters
            Object.keys(filterMapRef.current).forEach(key => {
                const entry = filterMapRef.current[key];
                entry.target.filters = []; // Set to empty array instead of null
            });
            filterMapRef.current = {};
        };
    }, [
        pixi.slides.current,
        pixi.textContainers.current,
        props.imagesRgbEffect,
        props.imagesRgbIntensity,
        props.textsRgbEffect,
        props.textsRgbIntensity,
        props.imageFilters,
        props.textFilters
    ]);

    // Apply the configured filters to an array of objects
    const applyFiltersToObjects = (
        objects: FilterableObject[],
        filterConfigs: FilterConfig[],
        idPrefix: string
    ) => {
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

            // Create the new filters
            const activeFilters = filterConfigs
                .filter(config => config.enabled)
                .map(config => {
                    try {
                        return FilterFactory.createFilter(config);
                    } catch (error) {
                        console.error(`Failed to create filter:`, error);
                        return null;
                    }
                })
                .filter((result): result is NonNullable<typeof result> => result !== null);

            // Store the filter data and assign to the object
            filterMapRef.current[id].filters = activeFilters.map(result => ({
                instance: result.filter,
                updateIntensity: result.updateIntensity,
                reset: result.reset
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
        });
    };

    // Update filter intensities for hover effects
    const updateFilterIntensities = (active: boolean) => {
        const currentSlideId = `slide-${pixi.currentIndex.current}`;
        const currentTextId = `text-${pixi.currentIndex.current}`;

        if (filterMapRef.current[currentSlideId]) {
            filterMapRef.current[currentSlideId].filters.forEach(filter => {
                if (active) {
                    if (filter.instance instanceof RGBSplitFilter) {
                        // For legacy support, directly modify RGB filter
                        gsap.killTweensOf(filter.instance.red);
                        gsap.killTweensOf(filter.instance.blue);
                        gsap.set(filter.instance.red, { x: props.imagesRgbIntensity || 15 });
                        gsap.set(filter.instance.blue, { x: -(props.imagesRgbIntensity || 15) });
                    } else {
                        // For other filters use the update function
                        filter.updateIntensity(props.imagesRgbIntensity || 15);
                    }
                } else {
                    if (filter.instance instanceof RGBSplitFilter) {
                        // Legacy RGB support
                        gsap.to(filter.instance.red, { x: 0, duration: 0.5, ease: "power2.out" });
                        gsap.to(filter.instance.blue, { x: 0, duration: 0.5, ease: "power2.out" });
                    } else {
                        filter.reset();
                    }
                }
            });
        }

        if (filterMapRef.current[currentTextId]) {
            filterMapRef.current[currentTextId].filters.forEach(filter => {
                if (active) {
                    if (filter.instance instanceof RGBSplitFilter) {
                        // Legacy RGB text support
                        gsap.killTweensOf(filter.instance.red);
                        gsap.killTweensOf(filter.instance.blue);
                        gsap.set(filter.instance.red, { x: props.textsRgbIntensity || 5 });
                        gsap.set(filter.instance.blue, { x: -(props.textsRgbIntensity || 5) });
                    } else {
                        filter.updateIntensity(props.textsRgbIntensity || 5);
                    }
                } else {
                    if (filter.instance instanceof RGBSplitFilter) {
                        gsap.to(filter.instance.red, { x: 0, duration: 0.5, ease: "power2.out" });
                        gsap.to(filter.instance.blue, { x: 0, duration: 0.5, ease: "power2.out" });
                    } else {
                        filter.reset();
                    }
                }
            });
        }
    };

    return {
        updateFilterIntensities
    };
};