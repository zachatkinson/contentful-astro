import { BackdropBlurFilter } from 'pixi-filters';
import { type BackdropBlurFilterConfig, type FilterResult } from './types';

/**
 * Creates a BackdropBlur filter that applies a Gaussian blur to everything behind an object,
 * and then draws the object on top of it.
 *
 * This filter is useful for creating depth effects where objects appear to have a blurred background
 * behind them, similar to a depth-of-field effect.
 *
 * @param config - Configuration for the BackdropBlur filter
 * @returns FilterResult with the filter instance and control functions
 */
export function createBackdropBlurFilter(config: BackdropBlurFilterConfig): FilterResult {
    // Create the filter with options
    const filter = new BackdropBlurFilter({
        strength: config.intensity ? config.intensity * 10 : 8,
        quality: config.quality ?? 4,
        kernelSize: config.kernelSize ?? 5,
        resolution: config.resolution ?? 1
    });

    // Set any additional properties if provided
    if (config.repeatEdgePixels !== undefined) {
        filter.repeatEdgePixels = config.repeatEdgePixels;
    }

    /**
     * Update the filter's blur intensity
     *
     * @param intensity - New intensity value (maps to blur strength)
     */
    const updateIntensity = (intensity: number): void => {
        // Map intensity to strength (0-10 scale to appropriate blur strength)
        // Blur strength can range from 0-100, so we multiply intensity by 10
        filter.strength = intensity * 10;
    };

    // Set initial intensity
    updateIntensity(config.intensity);

    /**
     * Reset the filter to default state (no blur)
     */
    const reset = (): void => {
        filter.strength = 0;
    };

    return { filter, updateIntensity, reset };
}