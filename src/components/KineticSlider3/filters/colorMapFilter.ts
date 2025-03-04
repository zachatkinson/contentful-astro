import { ColorMapFilter } from 'pixi-filters';
import { type ColorMapFilterConfig, type FilterResult } from './types';
import { Assets, Texture } from 'pixi.js';

/**
 * Creates a ColorMap filter that applies a color-map effect to an object
 *
 * The ColorMapFilter applies a color-map transformation using a provided texture map.
 *
 * @param config - Configuration for the ColorMap filter
 * @returns FilterResult with the filter instance and control functions
 */
export async function createColorMapFilter(config: ColorMapFilterConfig): Promise<FilterResult> {
    // First load the colorMap texture if it's provided as a URL
    let colorMapTexture: any = config.colorMap;

    if (typeof config.colorMap === 'string') {
        try {
            // Try to load the texture using Assets API
            colorMapTexture = await Assets.load(config.colorMap);
        } catch (error) {
            console.error(`Failed to load colorMap texture: ${config.colorMap}`, error);
            throw error;
        }
    }

    // Create options object for the filter
    const options: any = {
        colorMap: colorMapTexture,
        nearest: config.nearest ?? false
    };

    // Set colorSize if provided
    if (config.colorSize !== undefined) {
        options.colorSize = config.colorSize;
    }

    // Create the filter with options
    const filter = new ColorMapFilter(options);

    // Set initial mix value if provided
    if (config.mix !== undefined) {
        filter.mix = config.mix;
    }

    /**
     * Update the filter's intensity based on the configuration
     *
     * @param intensity - New intensity value (0-10 scale)
     */
    const updateIntensity = (intensity: number): void => {
        // Normalize intensity to a 0-10 scale
        const normalizedIntensity = Math.max(0, Math.min(10, intensity));

        // Map intensity to mix (0-10 -> 0-1)
        filter.mix = normalizedIntensity / 10;
    };

    // Set initial intensity
    updateIntensity(config.intensity);

    /**
     * Reset the filter to default state
     */
    const reset = (): void => {
        filter.mix = 0; // No effect
    };

    return { filter, updateIntensity, reset };
}