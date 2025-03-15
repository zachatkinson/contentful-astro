import { HslAdjustmentFilter } from 'pixi-filters';
import { type HslAdjustmentFilterConfig, type FilterResult } from './types.ts';

/**
 * Creates an HSL Adjustment filter for modifying hue, saturation, and lightness
 *
 * This filter allows for precise color adjustments in the HSL color space, including
 * colorization effects and individual control over hue, saturation, and lightness.
 *
 * @param config - Configuration for the HSL Adjustment filter
 * @returns FilterResult with the filter instance and control functions
 */
export function createHslAdjustmentFilter(config: HslAdjustmentFilterConfig): FilterResult {
    // Create options object for the filter
    const options: any = {};

    // Apply configuration values if provided, otherwise use defaults
    if (config.alpha !== undefined) options.alpha = config.alpha;
    if (config.colorize !== undefined) options.colorize = config.colorize;
    if (config.hue !== undefined) options.hue = config.hue;
    if (config.lightness !== undefined) options.lightness = config.lightness;
    if (config.saturation !== undefined) options.saturation = config.saturation;

    // Create the filter with options
    const filter = new HslAdjustmentFilter(options);

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
                case 'hue':
                    // Map 0-10 to -180 to 180 degrees for hue
                    filter.hue = -180 + (normalizedIntensity * 36);
                    break;
                case 'saturation':
                    // Map 0-10 to -1 to 1 for saturation
                    filter.saturation = -1 + (normalizedIntensity / 5);
                    break;
                case 'lightness':
                    // Map 0-10 to -1 to 1 for lightness
                    filter.lightness = -1 + (normalizedIntensity / 5);
                    break;
                case 'alpha':
                    // Map 0-10 to 0-1 for alpha
                    filter.alpha = normalizedIntensity / 10;
                    break;
                default:
                    // Default to adjusting saturation
                    filter.saturation = -1 + (normalizedIntensity / 5);
            }
        } else {
            // Default behavior - adjust saturation as it's the most visually apparent
            filter.saturation = -1 + (normalizedIntensity / 5);
        }
    };

    // Set initial intensity
    updateIntensity(config.intensity);

    /**
     * Reset the filter to default state
     */
    const reset = (): void => {
        // Reset to configured values or defaults if not specified
        filter.alpha = config.alpha !== undefined ? config.alpha : 1;
        filter.colorize = config.colorize !== undefined ? config.colorize : false;
        filter.hue = config.hue !== undefined ? config.hue : 0;
        filter.lightness = config.lightness !== undefined ? config.lightness : 0;
        filter.saturation = config.saturation !== undefined ? config.saturation : 0;

        // If intensity was provided in config, apply it
        if (config.intensity !== undefined) {
            updateIntensity(config.intensity);
        }
    };

    return { filter, updateIntensity, reset };
}