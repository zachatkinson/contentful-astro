import { Filter } from 'pixi.js';

export type TextPair = [string, string]; // [title, subtitle]

/**
 * List of supported filter types
 */
export type FilterType =
// Built-in PixiJS filters
    | 'alpha'
    | 'blur'
    | 'colorMatrix'
    | 'colorBurnBlend'
    | 'noise'
// Additional filter types will be added here as they are implemented
    ;

/**
 * Base interface for all filter configurations
 */
export interface BaseFilterConfig {
    type: FilterType;
    enabled: boolean;
    intensity: number;
}

/**
 * Configuration for AlphaFilter
 *
 * AlphaFilter applies transparency to the entire display object.
 * It's recommended over Container's alpha property to avoid visual layering issues.
 * The intensity property (0-10) is mapped to the alpha value (0-1).
 */
export interface AlphaFilterConfig extends BaseFilterConfig {
    type: 'alpha';
}

/**
 * Configuration for BlurFilter
 *
 * BlurFilter applies a Gaussian blur to an object.
 * The strength of the blur can be set for x-axis and y-axis separately.
 */
export interface BlurFilterConfig extends BaseFilterConfig {
    type: 'blur';
    strength?: number;     // Overall blur strength (0 - 10)
    quality?: number;      // Quality of the blur (number of passes)
    kernelSize?: number;   // Size of blur kernel (5, 7, 9, 11, 13, 15)
    resolution?: number;   // Resolution of the blur filter
    strengthX?: number;    // Strength of horizontal blur
    strengthY?: number;    // Strength of vertical blur
    repeatEdgePixels?: boolean; // Whether to clamp the edge of the target
}

/**
 * Configuration for ColorMatrixFilter
 *
 * ColorMatrixFilter applies a 5x4 matrix transformation on RGBA color values.
 * It can be used for various effects like brightness, contrast, saturation, etc.
 *
 * Available presets:
 * - brightness: Adjusts brightness (0-1, where 0 is black)
 * - contrast: Adjusts contrast between dark and bright areas
 * - saturation/saturate: Increases color separation
 * - desaturate: Removes color (grayscale)
 * - negative: Inverts colors
 * - sepia: Applies sepia tone effect
 * - grayscale/greyscale: Converts to grayscale with control
 * - blackandwhite: Converts to black and white
 * - hue: Rotates colors around the color wheel
 * - night: Applies a night vision effect
 * - polaroid: Applies a Polaroid photo effect
 * - technicolor: Classic film color process from 1916
 * - toBGR: Swaps red and blue channels
 * - vintage: Nostalgic vintage photo effect
 * - kodachrome: Classic Kodak film effect from 1935
 * - browni: Warm brownish filter
 * - lsd: Psychedelic color effect
 * - predator: Thermal vision effect
 * - tint: Applies a color tint (default red-yellow tint based on intensity)
 * - colortone: Applies a dual-tone effect with warm highlights and cool shadows
 */
export interface ColorMatrixFilterConfig extends BaseFilterConfig {
    type: 'colorMatrix';
    alpha?: number;          // Opacity value for mixing original and resultant colors (0-1)
    preset?: string;         // Name of a preset effect to apply (see documentation above)
    presetIntensity?: number; // Intensity of the preset effect (typically 0-1 or 0-2)
    matrix?: number[];       // Custom color matrix (20 values) if not using a preset
    // Below properties are only used for specific presets that need additional configuration
    tintColor?: string;      // Custom color for tint preset (hex format e.g. '#FF0000')
    lightColor?: string;     // Custom light color for colorTone preset (hex format)
    darkColor?: string;      // Custom dark color for colorTone preset (hex format)
}
/**
 * Configuration for NoiseFilter
 *
 * NoiseFilter applies random noise to an image.
 * It can be used to create film grain, static, or other textured effects.
 */
export interface NoiseFilterConfig extends BaseFilterConfig {
    type: 'noise';
    noiseLevel?: number;      // Amount of noise to apply (0-1)
    seed?: number;            // Seed for random number generation
    generateNewSeedOnUpdate?: boolean; // Whether to generate a new seed when intensity changes
}



/**
 * Union type of all filter configurations
 */
export type FilterConfig =
    | AlphaFilterConfig
    | BlurFilterConfig
    | ColorMatrixFilterConfig
    | NoiseFilterConfig
;

/**
 * Result object returned by filter creation functions
 */
export interface FilterResult {
    /** The actual PixiJS filter instance */
    filter: Filter;

    /** Function to update the filter's intensity */
    updateIntensity: (intensity: number) => void;

    /** Function to reset the filter to its default state */
    reset: () => void;
}