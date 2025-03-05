import { CRTFilter } from 'pixi-filters';
import { type CRTFilterConfig, type FilterResult } from './types';

/**
 * Creates a CRT filter that applies a CRT (Cathode Ray Tube) effect to an object
 *
 * The CRTFilter simulates an old CRT display with features like scan lines,
 * screen curvature, vignetting, and noise.
 *
 * @param config - Configuration for the CRT filter
 * @returns FilterResult with the filter instance and control functions
 */
export function createCRTFilter(config: CRTFilterConfig): FilterResult {
    // Create options object for the filter
    const options: any = {};

    // Apply configuration values if provided, otherwise use defaults
    if (config.curvature !== undefined) options.curvature = config.curvature;
    if (config.lineContrast !== undefined) options.lineContrast = config.lineContrast;
    if (config.lineWidth !== undefined) options.lineWidth = config.lineWidth;
    if (config.noise !== undefined) options.noise = config.noise;
    if (config.noiseSize !== undefined) options.noiseSize = config.noiseSize;
    if (config.seed !== undefined) options.seed = config.seed;
    if (config.time !== undefined) options.time = config.time;
    if (config.verticalLine !== undefined) options.verticalLine = config.verticalLine;
    if (config.vignetting !== undefined) options.vignetting = config.vignetting;
    if (config.vignettingAlpha !== undefined) options.vignettingAlpha = config.vignettingAlpha;
    if (config.vignettingBlur !== undefined) options.vignettingBlur = config.vignettingBlur;

    // Create the filter with options
    const filter = new CRTFilter(options);

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
                case 'curvature':
                    // Map 0-10 to 0-10 for curvature (0 is flat, higher values increase curve)
                    filter.curvature = normalizedIntensity;
                    break;
                case 'lineContrast':
                    // Map 0-10 to 0-1 for line contrast
                    filter.lineContrast = normalizedIntensity / 10;
                    break;
                case 'lineWidth':
                    // Map 0-10 to 0.5-5 for line width
                    filter.lineWidth = 0.5 + (normalizedIntensity / 2);
                    break;
                case 'vignetting':
                    // Map 0-10 to 0-1 for vignetting (0.5 is a good midpoint)
                    filter.vignetting = normalizedIntensity / 10;
                    break;
                case 'vignettingAlpha':
                    // Map 0-10 to 0-1 for vignetting alpha
                    filter.vignettingAlpha = normalizedIntensity / 10;
                    break;
                default:
                    // Default to adjusting noise if primary property is not recognized
                    filter.noise = normalizedIntensity / 10;
            }
        } else {
            // Default behavior - adjust noise level
            filter.noise = normalizedIntensity / 10;

            // Optionally adjust other parameters based on intensity for a more comprehensive effect
            if (normalizedIntensity > 5) {
                // Increase curvature, line width, and vignetting as intensity increases beyond midpoint
                filter.curvature = (normalizedIntensity - 5) / 2; // 0-2.5 range
                filter.vignetting = 0.3 + ((normalizedIntensity - 5) / 20); // 0.3-0.55 range
            }
        }
    };

    // Set initial intensity
    updateIntensity(config.intensity);

    /**
     * Reset the filter to default state
     */
    const reset = (): void => {
        filter.curvature = 1;
        filter.lineContrast = 0.25;
        filter.lineWidth = 1;
        filter.noise = 0.3;
        filter.noiseSize = 0;
        filter.seed = 0;
        filter.time = 0.3;
        filter.verticalLine = false;
        filter.vignetting = 0.3;
        filter.vignettingAlpha = 1;
        filter.vignettingBlur = 0.3;
    };

    return { filter, updateIntensity, reset };
}