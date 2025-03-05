import { CrossHatchFilter } from 'pixi-filters';
import { type CrossHatchFilterConfig, type FilterResult } from './types';

/**
 * Creates a CrossHatch filter that applies a cross-hatch effect
 *
 * The CrossHatchFilter simulates a traditional drawing technique where shading
 * is created by drawing intersecting sets of parallel lines. This produces an
 * effect similar to pen-and-ink illustrations or sketches.
 *
 * @param config - Configuration for the CrossHatch filter
 * @returns FilterResult with the filter instance and control functions
 */
export function createCrossHatchFilter(config: CrossHatchFilterConfig): FilterResult {
    // Create the filter without options as per documentation
    const filter = new CrossHatchFilter();

    // Track if filter has been activated
    let isActive = false;

    /**
     * Update the filter's intensity
     * Since the documentation doesn't specify configurable properties,
     * we can only control this filter through standard Filter properties like alpha.
     *
     * @param intensity - New intensity value (0-10 scale)
     */
    const updateIntensity = (intensity: number): void => {
        // Normalize intensity to a 0-10 scale
        const normalizedIntensity = Math.max(0, Math.min(10, intensity));

        // If alpha is available on the filter, use it to control intensity
        if ('alpha' in filter) {
            filter.alpha = normalizedIntensity / 10;
        }

        // Mark as active only if intensity > 0
        isActive = normalizedIntensity > 0;
    };

    // Set initial intensity
    updateIntensity(config.intensity);

    /**
     * Reset the filter to default state
     */
    const reset = (): void => {
        // Reset alpha if available
        if ('alpha' in filter) {
            filter.alpha = 0; // Set to 0 instead of 1 to completely disable the effect
        }

        // For CrossHatch, we need to ensure it's properly inactive
        // Force an additional property reset if available
        if ('enabled' in filter) {
            (filter as any).enabled = false;
        }

        // Mark as inactive
        isActive = false;
    };

    return { filter, updateIntensity, reset };
}