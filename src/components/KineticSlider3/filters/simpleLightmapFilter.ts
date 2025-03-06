import { SimpleLightmapFilter } from 'pixi-filters';
import { Assets } from 'pixi.js';
import { type SimpleLightmapFilterConfig, type FilterResult } from './types';

/**
 * Creates a SimpleLightmap filter that applies a lighting effect
 *
 * The SimpleLightmapFilter creates a lighting effect by using a texture as a
 * lightmap source along with an ambient color. This can be used to create
 * dynamic lighting effects on images or other display objects.
 *
 * @param config - Configuration for the SimpleLightmap filter
 * @returns FilterResult with the filter instance and control functions
 */
export function createSimpleLightmapFilter(config: SimpleLightmapFilterConfig): FilterResult {
    // Create options object for the filter
    const options: any = {};

    // Set up initial lightMap
    let lightMapTexture: any = config.lightMap;

    // If lightMap is a string path, load it as a texture
    if (typeof config.lightMap === 'string') {
        // Start with an empty texture as placeholder
        console.log(`Loading lightmap texture from path: ${config.lightMap}`);

        // Load the texture asynchronously
        Assets.load(config.lightMap)
            .then(texture => {
                if (filter) {
                    console.log('Lightmap texture loaded successfully');
                    filter.lightMap = texture;
                }
            })
            .catch(error => {
                console.error(`Failed to load lightmap texture: ${config.lightMap}`, error);
            });
    }

    // Apply configuration values if provided, otherwise use defaults
    if (config.alpha !== undefined) options.alpha = config.alpha;
    if (config.color !== undefined) options.color = config.color;
    if (lightMapTexture) options.lightMap = lightMapTexture;

    // Set the dontFit property (recommended in the docs)
    options.dontFit = true;

    // Create the filter with options
    const filter = new SimpleLightmapFilter(options);

    /**
     * Update the filter's intensity based on the configuration
     *
     * @param intensity - New intensity value (0-10 scale)
     */
    const updateIntensity = (intensity: number): void => {
        // Normalize intensity to a 0-10 scale
        const normalizedIntensity = Math.max(0, Math.min(10, intensity));

        // Determine which property to adjust based on config's primaryProperty
        if (config.primaryProperty) {
            switch (config.primaryProperty) {
                case 'alpha':
                    // Map 0-10 to 0-1 for alpha
                    filter.alpha = normalizedIntensity / 10;
                    break;
                case 'brightness':
                    // Here we simulate a brightness effect by adjusting the alpha
                    // Higher intensity means more of the lightMap shows (brighter effect)
                    filter.alpha = normalizedIntensity / 10;
                    break;
                case 'colorIntensity':
                    // Here we could adjust the color intensity, but SimpleLightmap doesn't
                    // directly support this. Instead, we'll leave the color as is
                    // and use alpha to control overall intensity
                    filter.alpha = normalizedIntensity / 10;
                    break;
                default:
                    // Default to alpha adjustment
                    filter.alpha = normalizedIntensity / 10;
            }
        } else {
            // Default behavior - adjust alpha
            filter.alpha = normalizedIntensity / 10;
        }
    };

    // Set initial intensity
    updateIntensity(config.intensity);

    /**
     * Reset the filter to configured state or default values if not specified
     */
    const reset = (): void => {
        // Reset alpha to config value or default
        filter.alpha = config.alpha !== undefined ? config.alpha : 1;

        // Reset color to config value or default
        filter.color = config.color !== undefined ? config.color : 0x000000;

        // Reset lightMap to config value if it's a texture (not a string path)
        if (config.lightMap && typeof config.lightMap !== 'string') {
            filter.lightMap = config.lightMap;
        }
    };

    return { filter, updateIntensity, reset };
}