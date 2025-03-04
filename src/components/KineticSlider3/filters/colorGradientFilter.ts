import { ColorGradientFilter } from 'pixi-filters';
import { type ColorGradientFilterConfig, type FilterResult } from './types';

/**
 * Creates a ColorGradient filter that applies a color gradient to an object
 *
 * The ColorGradientFilter renders a colored gradient overlay that can either replace
 * the existing colors or be multiplied with them. You can provide an array of colors
 * and optional stops to control the gradient appearance.
 *
 * @param config - Configuration for the ColorGradient filter
 * @returns FilterResult with the filter instance and control functions
 */
export function createColorGradientFilter(config: ColorGradientFilterConfig): FilterResult {
    // Create options object for the filter
    const options: any = {
        angle: config.angle ?? 90,
        alpha: config.alpha ?? 1,
        maxColors: config.maxColors ?? 0, // 0 = no limit
        replace: config.replace ?? false,
        type: config.type ?? ColorGradientFilter.LINEAR
    };

    // If gradient colors are provided, add them to options
    if (config.colors && Array.isArray(config.colors)) {
        options.colors = config.colors;
    } else {
        // Default to a simple two-color gradient if none provided
        options.colors = [0x000000, 0xFFFFFF];
    }

    // If stops are provided, add them to options
    if (config.stops && Array.isArray(config.stops)) {
        options.stops = config.stops;
    }

    // Create the filter with options
    const filter = new ColorGradientFilter(options);

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
                case 'alpha':
                    // Map 0-10 to 0-1 range for alpha
                    filter.alpha = normalizedIntensity / 10;
                    break;
                case 'angle':
                    // Map 0-10 to 0-360 degrees for angle
                    filter.angle = normalizedIntensity * 36; // 0-360 range
                    break;
                default:
                    // Default behavior - adjust alpha
                    filter.alpha = normalizedIntensity / 10;
            }
        } else {
            // Default behavior - adjust alpha
            filter.alpha = normalizedIntensity / 10;
        }
    };

    // Set initial intensity
    updateIntensity(config.intensity);

    /**
     * Reset the filter to default state
     */
    const reset = (): void => {
        filter.alpha = 0; // Make the gradient invisible
    };

    return { filter, updateIntensity, reset };
}