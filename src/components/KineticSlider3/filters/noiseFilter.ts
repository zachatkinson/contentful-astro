import { NoiseFilter } from 'pixi.js';
import { type NoiseFilterConfig, type FilterResult } from './types';

/**
 * Creates a Noise filter that applies random noise to an image
 *
 * The noise effect can be used to create film grain, static, or other textured effects.
 * Based on: https://github.com/evanw/glfx.js/blob/master/src/filters/adjust/noise.js
 *
 * @param config - Configuration for the Noise filter
 * @returns FilterResult with the filter instance and control functions
 */
export function createNoiseFilter(config: NoiseFilterConfig): FilterResult {
    // Create options object for the filter
    const options: any = {
        noise: config.noiseLevel || 0.5, // Default noise level is 0.5
        seed: config.seed || Math.random() // Default seed is a random value
    };

    // Create the filter with options
    const filter = new NoiseFilter(options);

    /**
     * Update the filter's intensity based on the configuration
     *
     * @param intensity - New intensity value (0-10 scale)
     */
    const updateIntensity = (intensity: number): void => {
        // Map the 0-10 intensity scale to 0-1 for the noise property
        const normalizedIntensity = Math.max(0, Math.min(10, intensity)) / 10;
        filter.noise = normalizedIntensity;

        // Generate a new seed value for the noise if requested
        if (config.generateNewSeedOnUpdate) {
            filter.seed = Math.random();
        }
    };

    // Set initial intensity
    updateIntensity(config.intensity);

    /**
     * Reset the filter to initial configuration values or defaults
     */
    const reset = (): void => {
        // If noiseLevel was provided in config, reset to that value
        if (config.noiseLevel !== undefined) {
            filter.noise = config.noiseLevel;
        } else {
            // Otherwise reset to 0 (no noise)
            filter.noise = 0;
        }

        // If a specific seed was provided in config, reset to that value
        if (config.seed !== undefined) {
            filter.seed = config.seed;
        } else {
            // If generateNewSeedOnReset flag is true, generate a new random seed
            filter.seed = Math.random();
        }

        // If intensity was provided in config, use updateIntensity to reset properly
        if (config.intensity !== undefined) {
            updateIntensity(config.intensity);
        }
    };

    return { filter, updateIntensity, reset };
}