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
export function createColorMapFilter(config: ColorMapFilterConfig): FilterResult {
    // Create initial texture (placeholder or actual)
    let colorMapTexture: any = config.colorMap;

    if (typeof config.colorMap === 'string') {
        // For string paths, start with a placeholder
        colorMapTexture = Texture.EMPTY; // Use empty texture as placeholder

        // Load the actual texture asynchronously
        Assets.load(config.colorMap)
            .then(texture => {
                if (filter) {
                    filter.colorMap = texture;
                }
            })
            .catch(error => {
                console.error(`Failed to load colorMap texture: ${config.colorMap}`, error);
            });
    }

    // Create the filter - use the appropriate constructor based on documentation
    let filter: ColorMapFilter;

    if (config.nearest !== undefined || config.mix !== undefined) {
        // Use overload 2 with individual parameters
        filter = new ColorMapFilter(
            colorMapTexture,
            config.nearest,
            config.mix
        );
    } else {
        // Use overload 1 with options object, but only include properties
        // that are part of ColorMapFilterOptions
        filter = new ColorMapFilter({
            colorMap: colorMapTexture,
            nearest: config.nearest
            // Note: we're not including colorSize here as it's not in the options type
        });
    }

    // If colorSize is specifically provided, try to set it directly on the filter
    // after creation (if the property exists)
    if (config.colorSize !== undefined && 'colorSize' in filter) {
        (filter as any).colorSize = config.colorSize;
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
     * Reset the filter to initial configuration values or defaults
     */
    const reset = (): void => {
        // Reset mix to config value if explicitly provided
        if (config.mix !== undefined) {
            filter.mix = config.mix;
        } else if (config.intensity === undefined) {
            // Only set to 0 if neither mix nor intensity were provided
            filter.mix = 0;
        }

        // Reset nearest if it was configured and property exists
        if (config.nearest !== undefined && 'nearest' in filter) {
            filter.nearest = config.nearest;
        }

        // Reset colorSize if it was configured and property exists
        if (config.colorSize !== undefined && 'colorSize' in filter) {
            (filter as any).colorSize = config.colorSize;
        }

        // If intensity was provided in config, use updateIntensity to reset properly
        if (config.intensity !== undefined) {
            updateIntensity(config.intensity);
        }
    };

    return { filter, updateIntensity, reset };
}