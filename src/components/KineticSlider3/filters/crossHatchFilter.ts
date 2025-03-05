import { CrossHatchFilter } from 'pixi-filters';
import { type CrossHatchFilterConfig, type FilterResult } from './types';

/**
 * Creates a CrossHatch filter that applies a cross-hatch drawing effect
 *
 * The CrossHatchFilter creates a drawing-like effect that resembles
 * crosshatching techniques used in pen and ink illustrations.
 *
 * @param config - Configuration for the CrossHatch filter
 * @returns FilterResult with the filter instance and control functions
 */
export function createCrossHatchFilter(config: CrossHatchFilterConfig): FilterResult {
    // Create the filter
    const filter = new CrossHatchFilter();

    // Start with the filter disabled
    filter.enabled = false;

    /**
     * Update the filter's intensity based on the configuration
     *
     * @param intensity - New intensity value (0-10 scale)
     */
    const updateIntensity = (intensity: number): void => {
        // Simply enable or disable based on intensity
        filter.enabled = intensity > 0;
    };

    /**
     * Reset the filter to default state
     */
    const reset = (): void => {
        filter.enabled = false;
    };

    return { filter, updateIntensity, reset };
}