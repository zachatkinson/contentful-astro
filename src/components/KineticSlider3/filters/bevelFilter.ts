import { BevelFilter } from 'pixi-filters';
import { type BevelFilterConfig, type FilterResult } from './types.ts';

/**
 * Creates a Bevel filter that applies a bevel effect to an object
 *
 * The BevelFilter gives objects a 3D-like appearance by creating a bevel effect
 * with configurable light and shadow colors, thickness, and rotation.
 *
 * @param config - Configuration for the Bevel filter
 * @returns FilterResult with the filter instance and control functions
 */
export function createBevelFilter(config: BevelFilterConfig): FilterResult {
    // Create options object for the filter
    const options: any = {
        rotation: config.rotation ?? 45,
        thickness: config.thickness ?? 2,
        lightColor: config.lightColor ?? 0xffffff,
        lightAlpha: config.lightAlpha ?? 0.7,
        shadowColor: config.shadowColor ?? 0x000000,
        shadowAlpha: config.shadowAlpha ?? 0.7
    };

    // Create the filter with options
    const filter = new BevelFilter(options);

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
                case 'thickness':
                    // Map 0-10 to thickness range (0-20 pixels)
                    filter.thickness = normalizedIntensity * 2;
                    break;
                case 'lightAlpha':
                    // Map 0-10 to alpha range (0-1)
                    filter.lightAlpha = normalizedIntensity / 10;
                    break;
                case 'shadowAlpha':
                    // Map 0-10 to alpha range (0-1)
                    filter.shadowAlpha = normalizedIntensity / 10;
                    break;
                case 'rotation':
                    // Map 0-10 to rotation range (0-360 degrees)
                    filter.rotation = normalizedIntensity * 36;
                    break;
                default:
                    // Default behavior - adjust thickness
                    filter.thickness = normalizedIntensity * 2;
            }
        } else {
            // Default behavior - adjust thickness
            filter.thickness = normalizedIntensity * 2;
        }
    };

    // Set initial intensity
    updateIntensity(config.intensity);

    /**
     * Reset the filter to initial configuration values or defaults
     */
    const reset = (): void => {
        // Reset each property to config value if provided, otherwise use default

        // Rotation
        filter.rotation = config.rotation !== undefined ? config.rotation : 45;

        // Thickness
        filter.thickness = config.thickness !== undefined ? config.thickness : 2;

        // Light properties
        filter.lightColor = config.lightColor !== undefined ? config.lightColor : 0xffffff;
        filter.lightAlpha = config.lightAlpha !== undefined ? config.lightAlpha : 0.7;

        // Shadow properties
        filter.shadowColor = config.shadowColor !== undefined ? config.shadowColor : 0x000000;
        filter.shadowAlpha = config.shadowAlpha !== undefined ? config.shadowAlpha : 0.7;

        // If intensity was provided in config, use updateIntensity to reset properly
        if (config.intensity !== undefined) {
            updateIntensity(config.intensity);
        }
    };

    return { filter, updateIntensity, reset };
}