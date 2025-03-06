import { PixelateFilter } from 'pixi-filters';
import { type PixelateFilterConfig, type FilterResult } from './types';

/**
 * Creates a Pixelate filter that applies a pixelate effect making display objects appear 'blocky'
 *
 * The PixelateFilter reduces the image resolution, making it appear pixelated or "8-bit" style.
 * The size parameter controls the size of the pixels, with larger values creating a more pixelated effect.
 *
 * @param config - Configuration for the Pixelate filter
 * @returns FilterResult with the filter instance and control functions
 */
export function createPixelateFilter(config: PixelateFilterConfig): FilterResult {
    // Create options object for the filter
    let size: number | [number, number] = config.size || 10;

    // If sizeX and sizeY are specified, use them instead
    if (config.sizeX !== undefined || config.sizeY !== undefined) {
        const x = config.sizeX ?? 10;
        const y = config.sizeY ?? 10;
        size = [x, y];
    }

    // Create the filter with the size option
    const filter = new PixelateFilter(size);

    /**
     * Update the filter's intensity based on the configuration
     *
     * @param intensity - New intensity value (0-10 scale)
     */
    const updateIntensity = (intensity: number): void => {
        // Normalize intensity to a 0-10 scale
        const normalizedIntensity = Math.max(0, Math.min(10, intensity));

        // Map intensity (0-10) to pixel size (1-30)
        // At intensity 0, we want minimal pixelation (pixel size of 1)
        // At intensity 10, we want maximum pixelation (pixel size of 30)
        const pixelSize = 1 + (normalizedIntensity * 2.9); // Maps 0-10 to 1-30

        // Determine which property to adjust based on config
        if (config.primaryProperty === 'sizeX') {
            // Only adjust X dimension, keep Y at its configured value
            filter.sizeX = pixelSize;
        }
        else if (config.primaryProperty === 'sizeY') {
            // Only adjust Y dimension, keep X at its configured value
            filter.sizeY = pixelSize;
        }
        else {
            // Default: adjust both dimensions equally
            filter.size = pixelSize;
        }
    };

    // Set initial intensity
    updateIntensity(config.intensity);

    /**
     * Reset the filter to default state
     */
    const reset = (): void => {
        // Reset to default values (pixelation of 1 = minimal effect)
        filter.size = 1;
    };

    return { filter, updateIntensity, reset };
}