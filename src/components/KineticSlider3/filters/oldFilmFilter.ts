import { OldFilmFilter } from 'pixi-filters';
import { type OldFilmFilterConfig, type FilterResult } from './types';

/**
 * Creates an OldFilm filter that applies a vintage film effect
 *
 * The OldFilmFilter adds noise, scratches, sepia tone, and vignetting effects
 * to simulate the look of old film footage.
 *
 * @param config - Configuration for the OldFilm filter
 * @returns FilterResult with the filter instance and control functions
 */
export function createOldFilmFilter(config: OldFilmFilterConfig): FilterResult {
    // Create options object for the filter
    const options: any = {};

    // Apply configuration values if provided, otherwise use defaults
    if (config.noise !== undefined) options.noise = config.noise;
    if (config.noiseSize !== undefined) options.noiseSize = config.noiseSize;
    if (config.scratch !== undefined) options.scratch = config.scratch;
    if (config.scratchDensity !== undefined) options.scratchDensity = config.scratchDensity;
    if (config.scratchWidth !== undefined) options.scratchWidth = config.scratchWidth;
    if (config.seed !== undefined) options.seed = config.seed;
    if (config.sepia !== undefined) options.sepia = config.sepia;
    if (config.vignetting !== undefined) options.vignetting = config.vignetting;
    if (config.vignettingAlpha !== undefined) options.vignettingAlpha = config.vignettingAlpha;
    if (config.vignettingBlur !== undefined) options.vignettingBlur = config.vignettingBlur;

    // Create the filter with options
    const filter = new OldFilmFilter(options);

    /**
     * Update the filter's intensity based on the configuration
     *
     * @param intensity - New intensity value (0-10 scale)
     */
    const updateIntensity = (intensity: number): void => {
        // Normalize intensity to a 0-10 scale
        const normalizedIntensity = Math.max(0, Math.min(10, intensity));

        // Determine which property to adjust based on config
        if (config.primaryProperty) {
            switch (config.primaryProperty) {
                case 'noise':
                    // Map 0-10 to 0-1 for noise
                    filter.noise = normalizedIntensity / 10;
                    break;
                case 'scratch':
                    // Map 0-10 to 0-1 for scratch
                    filter.scratch = normalizedIntensity / 10;
                    break;
                case 'sepia':
                    // Map 0-10 to 0-1 for sepia
                    filter.sepia = normalizedIntensity / 10;
                    break;
                case 'vignetting':
                    // Map 0-10 to 0-1 for vignetting
                    filter.vignetting = normalizedIntensity / 10;
                    break;
                case 'scratchDensity':
                    // Map 0-10 to 0-1 for scratchDensity
                    filter.scratchDensity = normalizedIntensity / 10;
                    break;
                default:
                    // Default to a comprehensive effect adjustment
                    // Adjust multiple properties for a balanced increase in the vintage effect
                    filter.noise = Math.min(1, 0.2 + (normalizedIntensity / 20)); // 0.2-0.7 range
                    filter.scratch = Math.min(1, 0.3 + (normalizedIntensity / 15)); // 0.3-0.97 range
                    filter.sepia = Math.min(1, 0.2 + (normalizedIntensity / 20)); // 0.2-0.7 range
                    filter.vignetting = Math.min(1, 0.3 + (normalizedIntensity / 30)); // 0.3-0.63 range
            }
        } else {
            // Default behavior - adjust multiple properties for a balanced effect
            filter.noise = Math.min(1, 0.2 + (normalizedIntensity / 20)); // 0.2-0.7 range
            filter.scratch = Math.min(1, 0.3 + (normalizedIntensity / 15)); // 0.3-0.97 range
            filter.sepia = Math.min(1, 0.2 + (normalizedIntensity / 20)); // 0.2-0.7 range
            filter.vignetting = Math.min(1, 0.3 + (normalizedIntensity / 30)); // 0.3-0.63 range
        }

        // Randomize seed slightly for dynamic scratches if above minimum intensity
        if (normalizedIntensity > 3) {
            filter.seed = Math.random() * 1000;
        }
    };

    // Set initial intensity
    updateIntensity(config.intensity);

    /**
     * Reset the filter to default state
     */
    const reset = (): void => {
        filter.noise = 0.3;
        filter.noiseSize = 1;
        filter.scratch = 0.5;
        filter.scratchDensity = 0.3;
        filter.scratchWidth = 1;
        filter.seed = 0;
        filter.sepia = 0.3;
        filter.vignetting = 0.3;
        filter.vignettingAlpha = 1;
        filter.vignettingBlur = 1;
    };

    return { filter, updateIntensity, reset };
}