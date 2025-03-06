import {type ColorSource, Filter, type PointData, type Texture} from 'pixi.js';
import type {ConvolutionMatrix} from "pixi-filters";
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
    | 'colorReplace'
    | 'convolution'
    | 'crossHatch'
    | 'crt'
    | 'dot'
    | 'dropShadow'
    | 'emboss'
    | 'glitch'
    | 'glow'
    | 'godray'
    | 'grayscale'
    | 'hsl'
    | 'kawaseBlur'
    | 'motionBlur'
    | 'multiColorReplace'
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
 * Configuration for ColorReplaceFilter
 *
 * ColorReplaceFilter replaces all instances of a specified color with another color.
 * It offers control over the tolerance of the color matching.
 */
export interface ColorReplaceFilterConfig extends BaseFilterConfig {
    type: 'colorReplace';
    originalColor?: ColorSource;  // The color to be replaced (RGB array or hex)
    targetColor?: ColorSource;    // The color to replace with (RGB array or hex)
    tolerance?: number;           // Sensitivity of the color matching (0-1, default: 0.4)
    primaryProperty?: 'tolerance'; // Property controlled by intensity
}

/**
 * Configuration for ConvolutionFilter
 *
 * ConvolutionFilter applies a matrix convolution effect to an image.
 * It can create effects like blurring, edge detection, sharpening,
 * embossing, and beveling by using different matrices.
 */
export interface ConvolutionFilterConfig extends BaseFilterConfig {
    type: 'convolution';
    matrix?: ConvolutionMatrix;   // 3x3 matrix as array of 9 values
    width?: number;               // Width of the object (default: 200)
    height?: number;              // Height of the object (default: 200)
    preset?: 'normal' | 'gaussianBlur' | 'boxBlur' | 'sharpen' | 'edgeDetection' | 'emboss' | 'topSobel' | 'rightSobel' | string;  // Name of a preset effect to use
    primaryProperty?: 'matrix';   // Property controlled by intensity
}

/**
 * Configuration for CrossHatchFilter
 *
 * The CrossHatchFilter applies a cross-hatch effect to an object,
 * creating a pattern of crossed lines similar to pen-and-ink drawing techniques.
 *
 * Based on the available documentation, this filter does not have configurable properties
 * beyond the standard intensity control.
 */
export interface CrossHatchFilterConfig extends BaseFilterConfig {
    type: 'crossHatch';
    alpha: number;
}

/**
 * Configuration for CRTFilter
 *
 * The CRTFilter simulates an old CRT (Cathode Ray Tube) display with effects like
 * scan lines, screen curvature, vignetting, and noise.
 */
export interface CRTFilterConfig extends BaseFilterConfig {
    type: 'crt';
    curvature?: number;       // Bend of interlaced lines, higher value means more bend (default: 1)
    lineContrast?: number;    // Contrast of interlaced lines (default: 0.25)
    lineWidth?: number;       // Width of interlaced lines (default: 1)
    noise?: number;           // Opacity/intensity of the noise effect between 0 and 1 (default: 0.3)
    noiseSize?: number;       // The size of the noise particles (default: 0)
    seed?: number;            // A seed value to apply to the random noise generation (default: 0)
    time?: number;            // Opacity/intensity of the noise effect between 0 and 1 (default: 0.3)
    verticalLine?: boolean;   // The orientation of the line (true for vertical, false for horizontal) (default: false)
    vignetting?: number;      // The radius of the vignette effect (default: 0.3)
    vignettingAlpha?: number; // Amount of opacity of vignette (default: 1)
    vignettingBlur?: number;  // Blur intensity of the vignette (default: 0.3)
    primaryProperty?: 'curvature' | 'lineContrast' | 'lineWidth' | 'noise' | 'vignetting' | 'vignettingAlpha';
}

/**
 * Configuration for DotFilter
 *
 * The DotFilter applies a dotscreen effect making display objects appear to be made out of
 * black and white halftone dots like an old printer.
 */
export interface DotFilterConfig extends BaseFilterConfig {
    type: 'dot';
    angle?: number;        // The radius of the effect (default: 5)
    grayscale?: boolean;   // Whether to render in grayscale (default: true)
    scale?: number;        // The scale of the effect (default: 1)
    primaryProperty?: 'angle' | 'scale'; // Property controlled by intensity
}

/**
 * Configuration for DropShadowFilter
 *
 * The DropShadowFilter applies a drop shadow effect to display objects.
 */
export interface DropShadowFilterConfig extends BaseFilterConfig {
    type: 'dropShadow';
    alpha?: number;         // Alpha of the shadow (default: 1)
    blur?: number;          // Blur strength of the shadow (default: 2)
    color?: ColorSource;    // Shadow color (default: 0x000000)
    offset?: PointData;     // Shadow offset [x,y] (default: [4,4])
    offsetX?: number;       // X offset of shadow (default: 4)
    offsetY?: number;       // Y offset of shadow (default: 4)
    pixelSize?: PointData;  // Pixel size for Kawase blur (default: [1,1])
    pixelSizeX?: number;    // X pixel size (default: 1)
    pixelSizeY?: number;    // Y pixel size (default: 1)
    quality?: number;       // Blur quality (default: 4)
    shadowOnly?: boolean;   // Only show shadow, not the object (default: false)
    primaryProperty?: 'alpha' | 'blur' | 'offsetX' | 'offsetY'; // Property controlled by intensity
}

/**
 * Configuration for EmbossFilter
 *
 * The EmbossFilter applies an emboss effect to objects, creating a relief-like appearance.
 */
export interface EmbossFilterConfig extends BaseFilterConfig {
    type: 'emboss';
    strength?: number;      // Strength of the emboss effect (default: 5)
}

/**
 * Configuration for GlitchFilter
 *
 * The GlitchFilter applies a glitch effect to an object, creating visual distortions
 * similar to digital artifacts and RGB channel splitting.
 */
export interface GlitchFilterConfig extends BaseFilterConfig {
    type: 'glitch';
    average?: boolean;       // If true, divides bands equally; false makes it more random
    direction?: number;      // Angle in degrees of the offset slices
    red?: PointData;         // Red channel offset {x, y} coordinates
    green?: PointData;       // Green channel offset {x, y} coordinates
    blue?: PointData;        // Blue channel offset {x, y} coordinates
    slices?: number;         // Number of slices/bands
    offset?: number;         // Maximum offset amount of slices
    minSize?: number;        // Minimum size of slices as portion of sampleSize
    sampleSize?: number;     // Height of the displacement map canvas
    seed?: number;           // Seed value for randomizing the effect
    fillMode?: number;       // Fill mode for displaced areas (0=transparent)
    animated?: boolean;      // Whether the effect should automatically animate
    refreshFrequency?: number; // How often to apply a new random offset (for animation)
    primaryProperty?: 'slices' | 'offset' | 'direction' | 'red' | 'blue'; // Property controlled by intensity
}

/**
 * Configuration for GlowFilter
 *
 * The GlowFilter applies a glow effect to an object with configurable inner and outer
 * glow strengths, color, quality, and knockout options.
 */
export interface GlowFilterConfig extends BaseFilterConfig {
    type: 'glow';
    distance?: number;       // The distance of the glow
    innerStrength?: number;  // The strength of the glow inward from the edge of the sprite
    knockout?: boolean;      // Only draw the glow, not the texture itself
    outerStrength?: number;  // The strength of the glow outward from the edge of the sprite
    quality?: number;        // A number between 0 and 1 that describes the quality of the glow
    color?: ColorSource;     // The color of the glow (default: 0xFFFFFF)
    alpha?: number;          // The alpha of the glow (default: 1)
    primaryProperty?: 'innerStrength' | 'outerStrength' | 'distance' | 'quality' | 'alpha'; // Property controlled by intensity
}

/**
 * Configuration for GodrayFilter
 *
 * The GodrayFilter creates crepuscular rays (light shafts) extending from a bright source.
 * These rays can be animated and customized for intensity, direction, and density.
 */
export interface GodrayFilterConfig extends BaseFilterConfig {
    type: 'godray';
    alpha?: number;          // The alpha (opacity) of the rays (0-1, default: 1)
    angle?: number;          // The angle/light-source of the rays in degrees (default: 30)
    center?: PointData;      // Focal point for non-parallel rays (default: {x:0, y:0})
    centerX?: number;        // Focal point X for non-parallel rays (default: 0)
    centerY?: number;        // Focal point Y for non-parallel rays (default: 0)
    gain?: number;           // General intensity of the effect (0-1, default: 0.5)
    lacunarity?: number;     // The density of the fractal noise (default: 2.5)
    parallel?: boolean;      // If true, rays are parallel; if false, rays emanate from center (default: true)
    time?: number;           // The current time position for animation (default: 0)
    primaryProperty?: 'gain' | 'alpha' | 'lacunarity' | 'angle'; // Property controlled by intensity
    animate?: boolean;       // Whether to animate the rays over time
    animationSpeed?: number; // Speed of animation (time increment per second)
}

/**
 * Configuration for GrayscaleFilter
 *
 * The GrayscaleFilter converts an image to grayscale (black and white).
 * This is a simple filter with no specific configuration parameters.
 * The intensity parameter controls the strength of the grayscale effect.
 */
export interface GrayscaleFilterConfig extends BaseFilterConfig {
    type: 'grayscale';
}

/**
 * Configuration for HslAdjustmentFilter
 *
 * The HslAdjustmentFilter provides precise control over hue, saturation, and lightness.
 * It can be used for color correction, creative effects, or colorization.
 */
export interface HslAdjustmentFilterConfig extends BaseFilterConfig {
    type: 'hsl';
    alpha?: number;          // The amount of alpha (0 to 1, default: 1)
    colorize?: boolean;      // Whether to colorize the image (default: false)
    hue?: number;            // The amount of hue in degrees (-180 to 180, default: 0)
    lightness?: number;      // The amount of lightness (-1 to 1, default: 0)
    saturation?: number;     // The amount of saturation (-1 to 1, default: 0)
    primaryProperty?: 'hue' | 'saturation' | 'lightness' | 'alpha'; // Property controlled by intensity
}

/**
 * Configuration for KawaseBlurFilter
 *
 * The KawaseBlurFilter is a much faster blur than Gaussian blur, but with slightly
 * different visual characteristics. It's ideal for performance-critical applications.
 * See: https://software.intel.com/en-us/blogs/2014/07/15/an-investigation-of-fast-real-time-gpu-based-image-blur-algorithms
 */
export interface KawaseBlurFilterConfig extends BaseFilterConfig {
    type: 'kawaseBlur';
    clamp?: boolean;             // Whether the filter is clamped (default: false)
    kernels?: number[];          // The kernel size array for advanced usage (default: [0])
    pixelSize?: PointData;       // Size of pixels, larger means blurrier (default: {x:1, y:1})
    pixelSizeX?: number;         // Size of pixels on x-axis (default: 1)
    pixelSizeY?: number;         // Size of pixels on y-axis (default: 1)
    quality?: number;            // Quality of the filter, integer > 1 (default: 3)
    strength?: number;           // Amount of blur, value > 0 (default: 4)
    primaryProperty?: 'strength' | 'quality' | 'pixelSize'; // Property controlled by intensity
}

/**
 * Configuration for MotionBlurFilter
 *
 * The MotionBlurFilter applies a directional blur effect that simulates movement.
 * It can be configured to blur in any direction with varying intensities.
 */
export interface MotionBlurFilterConfig extends BaseFilterConfig {
    type: 'motionBlur';
    kernelSize?: number;      // Size of the blur kernel (must be odd number >= 5)
    offset?: number;          // Offset of the blur filter
    velocity?: PointData;     // Velocity of the motion for blur effect as {x,y}
    velocityX?: number;       // Velocity on X axis
    velocityY?: number;       // Velocity on Y axis
    direction?: number;       // Direction in degrees (0-360) - helper property
    primaryProperty?: 'velocity' | 'velocityX' | 'velocityY' | 'kernelSize' | 'offset'; // Property controlled by intensity
}

/**
 * Configuration for MultiColorReplaceFilter
 *
 * The MultiColorReplaceFilter replaces multiple colors with different target colors.
 * Similar to ColorReplaceFilter, but supports multiple replacements at once.
 */
export interface MultiColorReplaceFilterConfig extends BaseFilterConfig {
    type: 'multiColorReplace';
    replacements?: Array<[ColorSource, ColorSource]>;  // Array of [originalColor, targetColor] pairs
    tolerance?: number;       // Tolerance of the color comparison (0-1, default: 0.05)
    maxColors?: number;       // Maximum number of color replacements (set at construction)

    // Extended options for more advanced features
    primaryProperty?: 'tolerance' | 'blendFactor';  // Property controlled by intensity

    // If using blendFactor as primaryProperty, these arrays can be used to define
    // a range of color transformations that are blended based on intensity
    originalColors?: ColorSource[];   // Original colors for blending
    targetColors?: ColorSource[];     // Target colors for blending
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
    | ColorReplaceFilterConfig
    | ConvolutionFilterConfig
    | CrossHatchFilterConfig
    | CRTFilterConfig
    | DotFilterConfig
    | DropShadowFilterConfig
    | EmbossFilterConfig
    | GlitchFilterConfig
    | GlowFilterConfig
    | GodrayFilterConfig
    | GrayscaleFilterConfig
    | HslAdjustmentFilterConfig
    | KawaseBlurFilterConfig
    | MotionBlurFilterConfig
    | MultiColorReplaceFilterConfig
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