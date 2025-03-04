import { ColorReplaceFilter } from 'pixi-filters';
import { type ColorReplaceFilterConfig, type FilterResult } from './types';

/**
 * Creates a ColorReplace filter that replaces a specific color with another color
 *
 * The ColorReplaceFilter replaces all instances of one color with another,
 * with a configurable tolerance/sensitivity level.
 *
 * @param config - Configuration for the ColorReplace filter
 * @returns FilterResult with the filter instance and control functions
 */
export function createColorReplaceFilter(config: ColorReplaceFilterConfig): FilterResult {
    // Create options object for the filter
    const options: any = {
        originalColor: config.originalColor ?? 0xff0000, // Default red
        targetColor: config.targetColor ?? 0x000000,     // Default black
        tolerance: config.tolerance ?? 0.4               // Default tolerance
    };

    // Create the filter with options
    const filter = new ColorReplaceFilter(options);

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
                case 'tolerance':
                    // Map 0-10 to a reasonable tolerance range (0-1)
                    // Lower values are more exact (less tolerance), higher values are more inclusive
                    filter.tolerance = normalizedIntensity / 10;
                    break;
                default:
                    // For other properties, we just adjust the tolerance as it's the main parameter
                    // that makes sense to control with intensity
                    filter.tolerance = normalizedIntensity / 10;
            }
        } else {
            // Default behavior - adjust tolerance
            filter.tolerance = normalizedIntensity / 10;
        }
    };

    // Set initial intensity
    updateIntensity(config.intensity);

    /**
     * Reset the filter to default state
     */
    const reset = (): void => {
        // Return to default values
        filter.tolerance = 0.4; // Default tolerance from documentation

        // If original colors were provided in config, restore them
        if (config.originalColor !== undefined) {
            filter.originalColor = config.originalColor;
        }

        if (config.targetColor !== undefined) {
            filter.targetColor = config.targetColor;
        }
    };

    return { filter, updateIntensity, reset };
}