import { GrayscaleFilter } from 'pixi-filters';
import { type GrayscaleFilterConfig, type FilterResult } from './types.ts';

/**
 * Creates a Grayscale filter that converts the image to grayscale
 *
 * The GrayscaleFilter is a simple filter that removes all color information,
 * resulting in a black and white image. This filter doesn't have any configurable
 * parameters - it's either on or off.
 *
 * @param config - Configuration for the Grayscale filter
 * @returns FilterResult with the filter instance and control functions
 */
export function createGrayscaleFilter(config: GrayscaleFilterConfig): FilterResult {
    // Create the filter - GrayscaleFilter has no constructor parameters
    const filter = new GrayscaleFilter();

    /**
     * Update the filter's intensity
     * Since GrayscaleFilter doesn't have configurable intensity,
     * we'll treat intensity as a binary on/off switch.
     *
     * @param intensity - New intensity value (0-10 scale)
     */
    const updateIntensity = (intensity: number): void => {
        // GrayscaleFilter doesn't have a way to adjust intensity
        // We're treating it as a binary on/off effect
        // If the filter was applied through the FilterFactory, it's already "on"

        // For future compatibility, if the filter ever gets updated to support
        // intensity, we'll keep this function

        // The filter's natural state is full grayscale, so we don't need
        // to do anything here with the intensity parameter
    };

    /**
     * Reset the filter to initial configuration values or defaults
     */
    const reset = (): void => {
        // Check if enabled property exists and was specified in config
        if ('enabled' in filter && config.enabled !== undefined) {
            filter.enabled = config.enabled;
        }

        // Even though GrayscaleFilter doesn't have configurable intensity,
        // if we've stored the initial intensity in the config, we can use
        // updateIntensity to reset to that initial state for consistency
        if (config.intensity !== undefined) {
            updateIntensity(config.intensity);
        }
    };

    return { filter, updateIntensity, reset };
}