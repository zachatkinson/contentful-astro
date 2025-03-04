import {type ColorSource, Filter, type PointData, type Texture} from 'pixi.js';
export type TextPair = [string, string]; // [title, subtitle]


/**
 * List of supported filter types
 */
export type FilterType =
// Built-in PixiJS filters
    | 'adjustment'
    | 'advancedBloom'
    | 'alpha'
    | 'ascii'
    | 'backdropBlur'
    | 'bevel'
    | 'bloom'
    | 'blur'
    | 'bulgePinch'
    | 'colorGradient'
    | 'colorMap'
    | 'colorMatrix'
    | 'colorOverlay'
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
 * This is the section we'll be adding to the types.ts file
 *
 * Configuration for AdjustmentFilter
 *
 * AdjustmentFilter provides direct control over gamma, contrast, saturation, brightness,
 * alpha and color-channel shifts without using a matrix. This makes it faster and simpler
 * than ColorMatrixFilter for common image adjustments.
 */
export interface AdjustmentFilterConfig extends BaseFilterConfig {
    type: 'adjustment';
    gamma?: number;         // Amount of luminance (0-2 range, 1 is neutral)
    contrast?: number;      // Amount of contrast (0-2 range, 1 is neutral)
    saturation?: number;    // Amount of color saturation (0-2 range, 1 is neutral)
    brightness?: number;    // Overall brightness (0-2 range, 1 is neutral)
    red?: number;           // Multiplier for red channel (0-2 range, 1 is neutral)
    green?: number;         // Multiplier for green channel (0-2 range, 1 is neutral)
    blue?: number;          // Multiplier for blue channel (0-2 range, 1 is neutral)
    alpha?: number;         // Overall alpha channel (0-1 range, 1 is fully opaque)
    primaryProperty?: 'gamma' | 'contrast' | 'saturation' | 'brightness' | 'red' | 'green' | 'blue' | 'alpha';
}

/**
 * Configuration for AdvancedBloomFilter
 *
 * The AdvancedBloomFilter applies a Bloom Effect to an object with advanced controls
 * for adjusting the look of the bloom. Note: this filter is more GPU-intensive than
 * the standard BloomFilter.
 */
export interface AdvancedBloomFilterConfig extends BaseFilterConfig {
    type: 'advancedBloom';
    bloomScale?: number;      // To adjust the strength of the bloom (default: 1.0)
    blur?: number;            // The strength of the Blur properties (default: 2)
    brightness?: number;      // The brightness of the bloom effect (default: 1.0)
    kernels?: number[];
    pixelSize?: PointData;     // The quality of the Blur Filter (default: 4)
    pixelSizeX?: number;      // The horizontal pixel size of the Kawase Blur filter (default: 1)
    pixelSizeY?: number;      // The vertical pixel size of the Kawase Blur filter (default: 1)
    primaryProperty?: 'bloomScale' | 'brightness' | 'blur' | 'threshold'; // Property controlled by intensity
    quality?: number;
    threshold?: number;       // Defines how bright a color needs to be extracted (0-1, default: 0.5)
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
 * Configuration for AsciiFilter
 *
 * The AsciiFilter renders the image as ASCII characters.
 */
export interface AsciiFilterConfig extends BaseFilterConfig {
    type: 'ascii';
    color?: ColorSource;   // The resulting color of the ascii characters (RGB array or hex)
    replaceColor?: boolean | undefined;      // Whether to replace source colors with the provided color
    size?: number;               // The pixel size used by the filter (default: 8)
    primaryProperty?: 'size';    // Property controlled by intensity
}

/**
 * Configuration for BackdropBlurFilter
 *
 * BackdropBlurFilter applies a Gaussian blur to everything behind an object,
 * and then draws the object on top of it. This creates a depth-of-field effect.
 */
export interface BackdropBlurFilterConfig extends BaseFilterConfig {
    type: 'backdropBlur';
    strength?: number;     // Blur strength (0-100)
    quality?: number;      // Quality of the blur (number of passes)
    kernelSize?: number;   // Size of blur kernel (5, 7, 9, 11, 13, 15)
    resolution?: number;   // Resolution of the blur filter
    repeatEdgePixels?: boolean; // Whether to clamp the edge of the target
}

/**
 * Configuration for BevelFilter
 *
 * BevelFilter gives objects a 3D-like appearance by creating a bevel effect
 * with configurable light and shadow colors, thickness, and rotation.
 */
export interface BevelFilterConfig extends BaseFilterConfig {
    type: 'bevel';
    rotation?: number;         // The angle of the light in degrees (default: 45)
    thickness?: number;        // The thickness of the bevel (default: 2)
    lightColor?: ColorSource;  // The color value of the left & top bevel (default: 0xffffff)
    lightAlpha?: number;       // The alpha value of the left & top bevel (default: 0.7)
    shadowColor?: ColorSource; // The color value of the right & bottom bevel (default: 0x000000)
    shadowAlpha?: number;      // The alpha value of the right & bottom bevel (default: 0.7)
    primaryProperty?: 'thickness' | 'lightAlpha' | 'shadowAlpha' | 'rotation'; // Property controlled by intensity
}

/**
 * Configuration for BloomFilter
 *
 * The BloomFilter applies a Gaussian blur to create a bloom/glow effect.
 * It's a simpler alternative to AdvancedBloomFilter with fewer options but better performance.
 */
export interface BloomFilterConfig extends BaseFilterConfig {
    type: 'bloom';
    strength?: PointData;     // Sets the strength of both X and Y blur simultaneously
    strengthX?: number;    // Sets the strength of the blur on the X axis
    strengthY?: number;    // Sets the strength of the blur on the Y axis
    primaryProperty?: 'strength' | 'strengthX' | 'strengthY'; // Property controlled by intensity
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
 * Configuration for BulgePinchFilter
 *
 * The BulgePinchFilter creates a bulge or pinch effect in a circular area of the image.
 * It can be used to create magnifying glass effects (with positive strength)
 * or pinch effects (with negative strength).
 */
export interface BulgePinchFilterConfig extends BaseFilterConfig {
    type: 'bulgePinch';
    center?: PointData;       // Center point of the effect {x,y} in normalized coords (0-1)
    centerX?: number;         // X coordinate of center (0-1)
    centerY?: number;         // Y coordinate of center (0-1)
    radius?: number;          // Radius of the effect circle (default: 100)
    strength?: number;        // Strength of the effect (-1 to 1, negative = pinch, positive = bulge)
    allowPinch?: boolean;     // If true, allows negative strength (pinch effect)
    primaryProperty?: 'strength' | 'radius' | 'centerX' | 'centerY'; // Property controlled by intensity
}

/**
 * Configuration for ColorGradientFilter
 *
 * The ColorGradientFilter renders a colored gradient overlay that can either
 * replace the existing colors or be multiplied with them.
 */
export interface ColorGradientFilterConfig extends BaseFilterConfig {
    type: 'colorGradient';
    colors?: number[]; // Array of colors in the gradient (hex format)
    stops?: number[];  // Array of stop positions (0-1) for each color
    angle?: number;    // Angle of the gradient in degrees (default: 90)
    alpha?: number;    // Alpha of the gradient (default: 1)
    maxColors?: number; // Maximum number of colors to render (0 = no limit)
    replace?: boolean;  // If true, replaces existing colors instead of multiplying
    primaryProperty?: 'alpha' | 'angle'; // Property controlled by intensity
}

/**
 * Configuration for ColorMapFilter
 *
 * The ColorMapFilter applies a color-map effect to an object using a provided
 * texture map.
 */
export interface ColorMapFilterConfig extends BaseFilterConfig {
    type: 'colorMap';
    colorMap:  Texture | string ; // Path to texture or actual texture object
    colorSize?: number;       // The size of one color slice
    mix?: number;             // The mix ratio (0-1)
    nearest?: boolean;        // Whether to use NEAREST for colorMap texture
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
 * Configuration for ColorOverlayFilter
 *
 * The ColorOverlayFilter applies a color overlay to an object.
 * It's useful for tinting images, creating color washes, or applying color effects.
 */
export interface ColorOverlayFilterConfig extends BaseFilterConfig {
    type: 'colorOverlay';
    color?: number;       // The color of the overlay (hex format, default: 0x000000)
    alpha?: number;       // The alpha (opacity) of the overlay (0-1, default: 1)
    primaryProperty?: 'alpha' | 'color';  // Property controlled by intensity
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
    | AdjustmentFilterConfig
    | AdvancedBloomFilterConfig
    | AlphaFilterConfig
    | AsciiFilterConfig
    | BackdropBlurFilterConfig
    | BevelFilterConfig
    | BloomFilterConfig
    | BlurFilterConfig
    | BulgePinchFilterConfig
    | ColorGradientFilterConfig
    | ColorMapFilterConfig
    | ColorMatrixFilterConfig
    | ColorOverlayFilterConfig
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