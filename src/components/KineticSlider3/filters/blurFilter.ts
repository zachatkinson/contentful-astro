import { BlurFilter } from 'pixi.js';
import { type BlurFilterConfig, type FilterResult } from './types';

/**
 * Creates a Blur filter that applies a Gaussian blur to an object
 *
 * The strength of the blur can be set for the x-axis and y-axis separately.
 *
 * @param config - Configuration for the Blur filter
 * @returns FilterResult with the filter instance and control functions
 */
export function createBlurFilter(config: BlurFilterConfig): FilterResult {
    // Create the filter with options
    const filter = new BlurFilter({
        strength: config.intensity ? config.intensity * 10 : 8,
        strengthX: config.strengthX ? config.strengthX * 10 : undefined,
        strengthY: config.strengthY ? config.strengthY * 10 : undefined,
        quality: config.quality ?? 4,
        kernelSize: config.kernelSize ?? 5,
        resolution: config.resolution ?? 1
    });

    // Set any additional properties if provided
    if (config.strengthX !== undefined) {
        filter.strengthX = config.strengthX;
    }

    if (config.strengthY !== undefined) {
        filter.strengthY = config.strengthY;
    }

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
        // Blur strength can range from 0-100, so we multiply intensity by 10.
        filter.strength = intensity * 10;
        filter.strengthX = config.strengthX ? config.strengthX * 10 : filter.strength;
        filter.strengthY = config.strengthY ? config.strengthY * 10 : filter.strength;
    };

    // Set initial intensity
    updateIntensity(config.intensity);

    /**
     * Reset the filter to default state (no blur)
     */
    const reset = (): void => {
        filter.strength = 0;
        if(config.strengthX !== undefined){
            filter.strengthX = 0;
        }
        if(config.strengthY !== undefined){
            filter.strengthY = 0;
        }
    };

    return { filter, updateIntensity, reset };
}