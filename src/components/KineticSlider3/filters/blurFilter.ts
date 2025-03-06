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
     * Reset the filter to initial configuration values or defaults
     */
    const reset = (): void => {
        // Reset strength to config value if provided, otherwise use default
        const defaultStrength = config.intensity !== undefined ? config.intensity * 10 : 8;
        filter.strength = defaultStrength;

        // Reset X and Y strengths if they were specifically configured
        if (config.strengthX !== undefined) {
            filter.strengthX = config.strengthX * 10;
        }

        if (config.strengthY !== undefined) {
            filter.strengthY = config.strengthY * 10;
        }

        // Reset quality if it was configured
        if (config.quality !== undefined) {
            filter.quality = config.quality;
        }

        // Reset kernelSize if it was configured
        // Use type assertion or safely check if property exists
        if (config.kernelSize !== undefined && 'kernelSize' in filter) {
            (filter as any).kernelSize = config.kernelSize;
        }

        // Reset repeatEdgePixels if it was configured
        if (config.repeatEdgePixels !== undefined) {
            filter.repeatEdgePixels = config.repeatEdgePixels;
        }

        // If intensity was explicitly provided in config, use updateIntensity
        if (config.intensity !== undefined) {
            updateIntensity(config.intensity);
        }
    };

    return { filter, updateIntensity, reset };
}