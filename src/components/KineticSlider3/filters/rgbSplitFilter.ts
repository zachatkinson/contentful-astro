import { RGBSplitFilter } from 'pixi-filters';
import { type RGBSplitFilterConfig, type FilterResult } from './types.ts';

/**
 * Creates an RGBSplit filter that separates the RGB channels of an object
 *
 * The RGBSplitFilter offsets the red, green, and blue channels separately,
 * creating a chromatic aberration effect commonly used for glitch or retro effects.
 *
 * @param config - Configuration for the RGBSplit filter
 * @returns FilterResult with the filter instance and control functions
 */
export function createRGBSplitFilter(config: RGBSplitFilterConfig): FilterResult {
    // Create options object for the filter
    const options: any = {};

    // Apply configuration values if provided, otherwise use defaults
    if (config.red) options.red = config.red;
    if (config.green) options.green = config.green;
    if (config.blue) options.blue = config.blue;

    // Alternative way to set specific coordinates
    if (config.redX !== undefined) options.redX = config.redX;
    if (config.redY !== undefined) options.redY = config.redY;
    if (config.greenX !== undefined) options.greenX = config.greenX;
    if (config.greenY !== undefined) options.greenY = config.greenY;
    if (config.blueX !== undefined) options.blueX = config.blueX;
    if (config.blueY !== undefined) options.blueY = config.blueY;

    // Create the filter with options
    const filter = new RGBSplitFilter(options);

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
                case 'red':
                    // Map 0-10 to appropriate x/y offsets for red channel
                    if (config.redDirection === 'horizontal' || !config.redDirection) {
                        filter.red = { x: -normalizedIntensity, y: 0 };
                    } else if (config.redDirection === 'vertical') {
                        filter.red = { x: 0, y: -normalizedIntensity };
                    } else if (config.redDirection === 'diagonal') {
                        filter.red = { x: -normalizedIntensity, y: -normalizedIntensity };
                    }
                    break;
                case 'green':
                    // Map 0-10 to appropriate x/y offsets for green channel
                    if (config.greenDirection === 'horizontal') {
                        filter.green = { x: normalizedIntensity, y: 0 };
                    } else if (config.greenDirection === 'vertical' || !config.greenDirection) {
                        filter.green = { x: 0, y: normalizedIntensity };
                    } else if (config.greenDirection === 'diagonal') {
                        filter.green = { x: normalizedIntensity, y: normalizedIntensity };
                    }
                    break;
                case 'blue':
                    // Map 0-10 to appropriate x/y offsets for blue channel
                    if (config.blueDirection === 'horizontal') {
                        filter.blue = { x: normalizedIntensity, y: 0 };
                    } else if (config.blueDirection === 'vertical') {
                        filter.blue = { x: 0, y: normalizedIntensity };
                    } else if (config.blueDirection === 'diagonal' || !config.blueDirection) {
                        filter.blue = { x: normalizedIntensity, y: -normalizedIntensity };
                    }
                    break;
                default:
                    // Default behavior - adjust all channels in classic configuration
                    applyBalancedSplit(normalizedIntensity);
            }
        } else {
            // Default behavior - adjust all channels in classic configuration
            applyBalancedSplit(normalizedIntensity);
        }
    };

    /**
     * Apply a balanced RGB split with classic positioning
     * (red to left, green up, blue diagonally)
     *
     * @param intensity - Intensity value (0-10)
     */
    const applyBalancedSplit = (intensity: number): void => {
        // Scale intensity for visual effect (0-10 to appropriate pixel ranges)
        const scaledIntensity = intensity * 1.5;

        // Classic RGB split configuration:
        // Red channel to the left
        filter.red = { x: -scaledIntensity, y: 0 };

        // Green channel upward
        filter.green = { x: 0, y: scaledIntensity };

        // Blue channel down-right
        filter.blue = { x: scaledIntensity, y: 0 };
    };

    // Set initial intensity
    updateIntensity(config.intensity);

    /**
     * Reset the filter to configured state or default values if not specified
     */
    const reset = (): void => {
        // Reset red channel to config values or default
        if (config.red) {
            filter.red = config.red;
        } else if (config.redX !== undefined || config.redY !== undefined) {
            filter.red = {
                x: config.redX !== undefined ? config.redX : -10, // Default redX is -10
                y: config.redY !== undefined ? config.redY : 0     // Default redY is 0
            };
        } else {
            filter.red = { x: -10, y: 0 }; // Default from RGBSplitFilter docs
        }

        // Reset green channel to config values or default
        if (config.green) {
            filter.green = config.green;
        } else if (config.greenX !== undefined || config.greenY !== undefined) {
            filter.green = {
                x: config.greenX !== undefined ? config.greenX : 0,  // Default greenX is 0
                y: config.greenY !== undefined ? config.greenY : 10   // Default greenY is 10
            };
        } else {
            filter.green = { x: 0, y: 10 }; // Default from RGBSplitFilter docs
        }

        // Reset blue channel to config values or default
        if (config.blue) {
            filter.blue = config.blue;
        } else if (config.blueX !== undefined || config.blueY !== undefined) {
            filter.blue = {
                x: config.blueX !== undefined ? config.blueX : 0, // Default blueX is 0
                y: config.blueY !== undefined ? config.blueY : 0  // Default blueY is 0
            };
        } else {
            filter.blue = { x: 0, y: 0 }; // Default from RGBSplitFilter docs
        }
    };

    return { filter, updateIntensity, reset };
}