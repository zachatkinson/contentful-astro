import { ColorOverlayFilter } from 'pixi-filters';
import { type ColorOverlayFilterConfig, type FilterResult } from './types';

/**
 * Creates a ColorOverlay filter that applies a color overlay to an object
 *
 * The ColorOverlayFilter applies a single color across the entire display object
 * with configurable alpha. It's useful for tinting images, creating color washes,
 * or applying color effects.
 *
 * @param config - Configuration for the ColorOverlay filter
 * @returns FilterResult with the filter instance and control functions
 */
export function createColorOverlayFilter(config: ColorOverlayFilterConfig): FilterResult {
    // Create the filter with options
    const filter = new ColorOverlayFilter({
        color: config.color ?? 0xFF5500, // Use a default orange color
        alpha: config.alpha ?? 1         // Default alpha is 1 (fully opaque)
    });

    // Make sure the color property is set correctly
    if (config.color !== undefined) {
        filter.color = config.color;
    }

    /**
     * Update the filter's intensity based on the configuration
     *
     * @param intensity - New intensity value (0-10 scale)
     */
    const updateIntensity = (intensity: number): void => {
        // Normalize intensity to a 0-10 scale
        const normalizedIntensity = Math.max(0, Math.min(10, intensity));

        // Determine which property to adjust based on config
        if (config.primaryProperty === 'alpha') {
            // Map 0-10 to 0-1 range for alpha
            filter.alpha = normalizedIntensity / 10;
        }
        else if (config.primaryProperty === 'color') {
            // For color intensity, we'll adjust the alpha value
            // but keep the original color
            filter.alpha = normalizedIntensity / 10;

            // Make sure we maintain the original color
            if (config.color !== undefined) {
                filter.color = config.color;
            }
        }
        else {
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
        filter.alpha = 0; // Reset to transparent but keep the color
    };

    return { filter, updateIntensity, reset };
}