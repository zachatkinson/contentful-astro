import { AlphaFilter } from 'pixi.js';
import { type AlphaFilterConfig, type FilterResult } from './types';

/**
 * Creates an Alpha filter that applies transparency to the entire display object
 *
 * This is recommended over Container's alpha property to avoid visual layering issues
 * with individual elements. AlphaFilter applies alpha evenly across the entire
 * display object and any opaque elements it contains.
 *
 * @param config - Configuration for the Alpha filter
 * @returns FilterResult with the filter instance and control functions
 */
export function createAlphaFilter(config: AlphaFilterConfig): FilterResult {
    // Create the filter (PixiJS AlphaFilter doesn't accept options in constructor)
    const filter = new AlphaFilter();

    /**
     * Update the filter's alpha intensity
     *
     * @param intensity - New intensity value (maps to alpha value)
     */
    const updateIntensity = (intensity: number): void => {
        // Map intensity to alpha (0-10 scale to 0-1 scale)
        filter.alpha = Math.max(0, Math.min(1, intensity / 10));
    };

    // Set initial intensity
    updateIntensity(config.intensity);

    /**
     * Reset the filter to default state (fully opaque)
     */
    const reset = (): void => {
        filter.alpha = 1;
    };

    return { filter, updateIntensity, reset };
}