import { KawaseBlurFilter } from 'pixi-filters';
import { type KawaseBlurFilterConfig, type FilterResult } from './types';

/**
 * Creates a KawaseBlur filter that applies a faster blur algorithm
 *
 * The KawaseBlurFilter is a much faster alternative to Gaussian blur,
 * but with slightly different visual characteristics.
 *
 * @param config - Configuration for the KawaseBlur filter
 * @returns FilterResult with the filter instance and control functions
 */
export function createKawaseBlurFilter(config: KawaseBlurFilterConfig): FilterResult {
    // Create options object for the filter
    const options: any = {};

    // Apply configuration values if provided, otherwise use defaults
    if (config.clamp !== undefined) options.clamp = config.clamp;
    if (config.kernels !== undefined) options.kernels = config.kernels;
    if (config.pixelSize !== undefined) options.pixelSize = config.pixelSize;
    if (config.pixelSizeX !== undefined) options.pixelSizeX = config.pixelSizeX;
    if (config.pixelSizeY !== undefined) options.pixelSizeY = config.pixelSizeY;
    if (config.quality !== undefined) options.quality = config.quality;
    if (config.strength !== undefined) options.strength = config.strength;

    // Create the filter with options
    const filter = new KawaseBlurFilter(options);

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
                    // Map 0-10 to 0-20 for strength (0 = no blur, 20 = very blurry)
                    filter.strength = normalizedIntensity * 2;
                    break;
                case 'quality':
                    // Map 0-10 to 1-10 for quality (higher = better quality but slower)
                    filter.quality = Math.max(1, Math.round(normalizedIntensity));
                    break;
                case 'pixelSize':
                    // Map 0-10 to 1-5 for pixelSize (impacts appearance of the blur)
                    const pixelSize = 1 + (normalizedIntensity / 2.5);
                    filter.pixelSize = { x: pixelSize, y: pixelSize };
                    break;
                default:
                    // Default to adjusting strength
                    filter.strength = normalizedIntensity * 2;
            }
        } else {
            // Default behavior - adjust strength (most intuitive parameter)
            filter.strength = normalizedIntensity * 2;
        }
    };

    // Set initial intensity
    updateIntensity(config.intensity);

    /**
     * Reset the filter to default state
     */
    const reset = (): void => {
        filter.kernels = [0];
        filter.pixelSize = { x: 1, y: 1 };
        filter.quality = 3;
        filter.strength = 4;
    };

    return { filter, updateIntensity, reset };
}