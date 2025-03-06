import { SimplexNoiseFilter } from 'pixi-filters';
import { type SimplexNoiseFilterConfig, type FilterResult } from './types';

/**
 * Creates a SimplexNoise filter that applies a noise pattern to the object
 *
 * The SimplexNoiseFilter multiplies simplex noise with the current texture data,
 * creating various noise effects like static, clouds, or organic textures.
 *
 * @param config - Configuration for the SimplexNoise filter
 * @returns FilterResult with the filter instance and control functions
 */
export function createSimplexNoiseFilter(config: SimplexNoiseFilterConfig): FilterResult {
    // Create options object for the filter
    const options: any = {};

    // Apply configuration values if provided, otherwise use defaults
    if (config.noiseScale !== undefined) options.noiseScale = config.noiseScale;
    if (config.offsetX !== undefined) options.offsetX = config.offsetX;
    if (config.offsetY !== undefined) options.offsetY = config.offsetY;
    if (config.offsetZ !== undefined) options.offsetZ = config.offsetZ;
    if (config.step !== undefined) options.step = config.step;
    if (config.strength !== undefined) options.strength = config.strength;

    // Create the filter with options
    const filter = new SimplexNoiseFilter(options);

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
                case 'noiseScale':
                    // Map 0-10 to 1-20 for noise scale
                    // Lower values = larger noise patterns, higher values = finer noise
                    filter.noiseScale = 1 + (normalizedIntensity * 1.9); // 1-20 range
                    break;
                case 'strength':
                    // Map 0-10 to 0-1 for strength
                    filter.strength = normalizedIntensity / 10;
                    break;
                case 'step':
                    // Map 0-10 to 0-1 for step threshold
                    // Only values > 0 will use the step function
                    filter.step = normalizedIntensity > 0 ? normalizedIntensity / 10 : -1;
                    break;
                case 'offset':
                    // If offset is specified as primary, update all offsets equally
                    const offsetValue = normalizedIntensity * 10; // 0-100 range
                    filter.offsetX = offsetValue;
                    filter.offsetY = offsetValue;
                    filter.offsetZ = offsetValue;
                    break;
                case 'offsetX':
                    // Map 0-10 to 0-100 for offsetX
                    filter.offsetX = normalizedIntensity * 10;
                    break;
                case 'offsetY':
                    // Map 0-10 to 0-100 for offsetY
                    filter.offsetY = normalizedIntensity * 10;
                    break;
                case 'offsetZ':
                    // Map 0-10 to 0-100 for offsetZ
                    filter.offsetZ = normalizedIntensity * 10;
                    break;
                default:
                    // Default to strength adjustment
                    filter.strength = normalizedIntensity / 10;
            }
        } else {
            // Default behavior - adjust strength if no primary property is specified
            filter.strength = normalizedIntensity / 10;
        }
    };

    // Set initial intensity
    updateIntensity(config.intensity);

    /**
     * Reset the filter to default state
     */
    const reset = (): void => {
        filter.noiseScale = 10;
        filter.offsetX = 0;
        filter.offsetY = 0;
        filter.offsetZ = 0;
        filter.step = -1;
        filter.strength = 0;
    };

    return { filter, updateIntensity, reset };
}