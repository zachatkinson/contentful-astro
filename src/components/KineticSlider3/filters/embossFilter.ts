// src/components/KineticSlider3/filters/embossFilter.ts

import { EmbossFilter } from 'pixi-filters';
import { type EmbossFilterConfig, type FilterResult } from './types';

/**
 * Creates an Emboss filter that applies an emboss/relief effect to an object
 *
 * @param config - Configuration for the Emboss filter
 * @returns FilterResult with the filter instance and control functions
 */
export function createEmbossFilter(config: EmbossFilterConfig): FilterResult {
    // Create the filter with specified strength or default
    const filter = new EmbossFilter(config.strength);

    /**
     * Update the filter's intensity based on the configuration
     *
     * @param intensity - New intensity value (0-10 scale)
     */
    const updateIntensity = (intensity: number): void => {
        // Map the 0-10 intensity scale to appropriate strength values (0-20)
        const normalizedIntensity = Math.max(0, Math.min(10, intensity));
        filter.strength = normalizedIntensity * 2; // 0-10 -> 0-20
    };

    // Set initial intensity
    updateIntensity(config.intensity);

    /**
     * Reset the filter to default state
     */
    const reset = (): void => {
        filter.strength = 5; // Default value according to documentation
    };

    return { filter, updateIntensity, reset };
}