import { BulgePinchFilter } from 'pixi-filters';
import { type BulgePinchFilterConfig, type FilterResult } from './types';

/**
 * Creates a BulgePinch filter that applies a bulge or pinch effect in a circle
 *
 * The BulgePinchFilter creates either a bulge (magnifying glass) effect or
 * a pinch effect within a circular area of the image.
 *
 * @param config - Configuration for the BulgePinch filter
 * @returns FilterResult with the filter instance and control functions
 */
export function createBulgePinchFilter(config: BulgePinchFilterConfig): FilterResult {
    // Create options object for the filter
    const options: any = {
        radius: config.radius ?? 100,
        strength: config.strength ?? 1,
    };

    // Handle center coordinates
    if (config.center) {
        options.center = config.center;
    } else {
        options.center = { x: 0.5, y: 0.5 }; // Default center (middle of the screen)
    }

    // Create the filter with options
    const filter = new BulgePinchFilter(options);

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
                case 'strength':
                    // Map 0-10 to -1 to 1 range if specified to include pinch effect
                    if (config.allowPinch) {
                        // Map 0-10 to -1 to 1 (0-5 is pinch, 5-10 is bulge)
                        filter.strength = (normalizedIntensity - 5) / 5;
                    } else {
                        // Map 0-10 to 0-1 (only bulge effect)
                        filter.strength = normalizedIntensity / 10;
                    }
                    break;
                case 'radius':
                    // Map 0-10 to 10-200 radius range
                    filter.radius = 10 + (normalizedIntensity * 19); // 10-200 range
                    break;
                case 'centerX':
                    // Map 0-10 to 0-1 for x position
                    filter.center.x = normalizedIntensity / 10;
                    break;
                case 'centerY':
                    // Map 0-10 to 0-1 for y position
                    filter.center.y = normalizedIntensity / 10;
                    break;
                default:
                    // Default to strength adjustment
                    if (config.allowPinch) {
                        filter.strength = (normalizedIntensity - 5) / 5;
                    } else {
                        filter.strength = normalizedIntensity / 10;
                    }
            }
        } else {
            // Default behavior - adjust strength
            if (config.allowPinch) {
                filter.strength = (normalizedIntensity - 5) / 5;
            } else {
                filter.strength = normalizedIntensity / 10;
            }
        }
    };

    // Set initial intensity
    updateIntensity(config.intensity);

    /**
     * Reset the filter to default state
     */
    const reset = (): void => {
        filter.center = { x: 0.5, y: 0.5 };
        filter.radius = 100;
        filter.strength = 0; // No effect
    };

    return { filter, updateIntensity, reset };
}