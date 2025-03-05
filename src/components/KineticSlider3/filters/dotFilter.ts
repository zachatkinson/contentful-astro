import { DotFilter } from 'pixi-filters';
import { type DotFilterConfig, type FilterResult } from './types';

/**
 * Creates a Dot filter that applies a dotscreen effect to an object
 *
 * This filter makes display objects appear to be made out of black and white
 * halftone dots like an old printer or newspaper.
 *
 * @param config - Configuration for the Dot filter
 * @returns FilterResult with the filter instance and control functions
 */
export function createDotFilter(config: DotFilterConfig): FilterResult {
    // Create options object for the filter
    const options: any = {};

    // Apply configuration values if provided, otherwise use defaults
    if (config.angle !== undefined) options.angle = config.angle;
    if (config.scale !== undefined) options.scale = config.scale;
    if (config.grayscale !== undefined) options.grayscale = config.grayscale;

    // Create the filter with options
    const filter = new DotFilter(options);

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
                case 'angle':
                    // Map 0-10 to 0-10 for angle (represents the radius of the effect)
                    filter.angle = normalizedIntensity;
                    break;
                case 'scale':
                    // Map 0-10 to 0.5-5 for scale (1 is normal, higher values increase dot size)
                    filter.scale = 0.5 + (normalizedIntensity / 2);
                    break;
                default:
                    // Default to adjusting angle if primary property is not recognized
                    filter.angle = normalizedIntensity;
            }
        } else {
            // Default behavior - adjust angle (radius of the effect)
            filter.angle = normalizedIntensity;

            // For more dramatic effect at higher intensities, also adjust scale
            if (normalizedIntensity > 5) {
                filter.scale = 1 + ((normalizedIntensity - 5) / 5); // 1-2 range as intensity goes from 5-10
            } else {
                filter.scale = 1; // Default scale
            }
        }
    };

    // Set initial intensity
    updateIntensity(config.intensity);

    /**
     * Reset the filter to default state
     */
    const reset = (): void => {
        filter.angle = 5;
        filter.scale = 1;
        filter.grayscale = true;
    };

    return { filter, updateIntensity, reset };
}