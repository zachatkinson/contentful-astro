import {BlurFilterPass, type ColorSource, Filter as PixiFilter, type PointData, type Texture} from 'pixi.js';

// Complete list of filter types
export type FilterType =
// pixi-filters
    | 'adjustment'
    | 'advanced-bloom'
    | 'ascii'
    | 'backdrop-blur'
    | 'bevel'
    | 'bloom'
    | 'bulge-pinch'
    | 'color-gradient'
    | 'color-map'
    | 'color-overlay'
    | 'color-replace'
    | 'convolution'
    | 'cross-hatch'
    | 'crt'
    | 'dot'
    | 'drop-shadow'
    | 'emboss'
    | 'glitch'
    | 'glow'
    | 'godray'
    | 'grayscale'
    | 'hsl-adjustment'
    | 'kawase-blur'
    | 'motion-blur'
    | 'multi-color-replace'
    | 'old-film'
    | 'outline'
    | 'pixelate'
    | 'radial-blur'
    | 'reflection'
    | 'rgb-split'
    | 'shockwave'
    | 'simple-lightmap'
    | 'simplex-noise'
    | 'tilt-shift'
    | 'twist'
    | 'zoom-blur'
    // built-in filters
    | 'alpha'
    | 'blur'
    | 'color-matrix'
    | 'displacement'
    | 'noise'
    // special
    | 'custom';

// Color matrix presets
export type ColorMatrixPreset =
    | 'contrast'
    | 'desaturate'
    | 'kodachrome'
    | 'lsd'
    | 'negative'
    | 'polaroid'
    | 'predator'
    | 'saturate'
    | 'sepia';

// Base interface for all filter configurations
export interface BaseFilterConfig {
    type: FilterType;
    enabled: boolean;
    intensity: number;
}

// --- PIXI FILTERS ---


// Adjustment filter configuration
export interface AdjustmentFilterConfig extends BaseFilterConfig {
    type: 'adjustment';
    alpha?: number;
    blue?: number;
    brightness?: number;
    contrast?: number;
    gamma?: number;
    green?: number;
    red?: number;
    saturation?: number;
}

// Advanced Bloom filter configuration
export interface AdvancedBloomFilterConfig extends BaseFilterConfig {
    type: 'advanced-bloom';
    bloomScale?: number;
    blur?: number;
    brightness?: number;
    kernels?: number[];
    pixelSize?: PointData;
    quality?: number;
    threshold?: number;
}

// ASCII filter configuration
export interface AsciiFilterConfig extends BaseFilterConfig {
    type: 'ascii';
    color?: ColorSource;
    replaceColor?: boolean;
    size?: number;

}

// Backdrop Blur filter configuration
export interface BackdropBlurFilterConfig extends BaseFilterConfig {
    type: 'backdrop-blur';
    blur?: number;
    quality?: number;
}

// Bevel filter configuration
export interface BevelFilterConfig extends BaseFilterConfig {
    type: 'bevel';
    lightAlpha?: number;
    lightColor?: ColorSource;
    rotation?: number;
    shadowAlpha?: number;
    shadowColor?: ColorSource;
    thickness?: number;
}

// Bloom filter configuration
export interface BloomFilterConfig extends BaseFilterConfig {
    type: 'bloom';
    quality?: number;       // Controls the quality of the effect
    strength?: PointData;      // Alternative to intensity for direct strength setting

}
// Bulge Pinch filter configuration
export interface BulgePinchFilterConfig extends BaseFilterConfig {
    type: 'bulge-pinch';
    center?: PointData;
    radius?: number;
    strength?: number;
}

// Color Gradient filter configuration
export interface ColorGradientFilterConfig extends BaseFilterConfig {
    type: 'color-gradient';
    alpha?: number;
    angle?: number;
    filterType?: number;
    maxColors?: number;
    replace?: boolean;
    gradient?: Array<string | number>;

}

// Color Map filter configuration
export interface ColorMapFilterConfig extends BaseFilterConfig {
    type: 'color-map';
    colorMap?: Texture;
    mix?: number;
    nearest?: boolean;
}

// Color Overlay filter configuration
export interface ColorOverlayFilterConfig extends BaseFilterConfig {
    type: 'color-overlay';
    alpha?: number;
    color?: string | number;

}

// Color Replace filter configuration
export interface ColorReplaceFilterConfig extends BaseFilterConfig {
    type: 'color-replace';
    originalColor?: ColorSource;
    targetColor?: ColorSource;
    tolerance?: number;
}

// Convolution filter configuration
export interface ConvolutionFilterConfig extends BaseFilterConfig {
    type: 'convolution';
    height?: number;
    matrix?: number[];
    width?: number;
}

// Cross Hatch filter configuration
export interface CrossHatchFilterConfig extends BaseFilterConfig {
    type: 'cross-hatch';
}

// CRT filter configuration
export interface CRTFilterConfig extends BaseFilterConfig {
    type: 'crt';
    curvature?: number;
    lineContrast?: number;
    lineWidth?: number;
    noise?: number;
    noiseSize?: number;
    seed?: number;
    time?: number;
    vignetting?: number;
    vignettingAlpha?: number;
    vignettingBlur?: number;

}

// Dot filter configuration
export interface DotFilterConfig extends BaseFilterConfig {
    type: 'dot';
    angle?: number;
    grayscale?: boolean;
    scale?: number;

}

// Drop Shadow filter configuration
export interface DropShadowFilterConfig extends BaseFilterConfig {
    type: 'drop-shadow';
    alpha?: number;
    blur?: number;
    color?: ColorSource;
    kernels?: number[];
    offset?: PointData;
    pixelSize?: PointData;
    quality?: number;
    shadowOnly?: boolean;

    //not sure if i still need these
    distance?: number;
    rotation?: number;
}

// Emboss filter configuration
export interface EmbossFilterConfig extends BaseFilterConfig {
    type: 'emboss';
    strength?: number;
}

// Glitch filter configuration
export interface GlitchFilterConfig extends BaseFilterConfig {
    type: 'glitch';
    average?: boolean;
    blue?: PointData;
    direction?: number;
    fillMode?: string;
    green?: PointData;
    minSize?: number;
    offset?: number;
    offsets?: number[];
    red?: PointData;
    sampleSize?: number;
    seed?: number;
    sizes: number[];
    slices?: number;
}

// Glow filter configuration
export interface GlowFilterConfig extends BaseFilterConfig {
    type: 'glow';
    alpha?: number;
    color?: ColorSource;
    distance?: number;
    innerStrength?: number;
    knockout?: boolean;
    outerStrength?: number;
    quality?: number;
}

// Godray filter configuration
export interface GodrayFilterConfig extends BaseFilterConfig {
    type: 'godray';
    alpha?: number;
    angle?: number;
    center?: PointData;
    gain?: number;
    lacunarity?: number;
    parallel?: boolean;
    time?: number;
}

// Grayscale filter configuration
export interface GrayscaleFilterConfig extends BaseFilterConfig {
    type: 'grayscale';

    //is this value needed?
    amount?: number;
}

// HSL Adjustment filter configuration
export interface HslAdjustmentFilterConfig extends BaseFilterConfig {
    type: 'hsl-adjustment';
    alpha?: number;
    colorize?: boolean;
    hue?: number;
    lightness?: number;
    saturation?: number;
}

// Kawase Blur filter configuration
export interface KawaseBlurFilterConfig extends BaseFilterConfig {
    type: 'kawase-blur';
    clamp?: boolean;
    kernels?: number[];
    pixelSize: PointData;
    quality?: number;
    strength?: number;

    //not sure if needed still
    blur?: number;
}

// Motion Blur filter configuration
export interface MotionBlurFilterConfig extends BaseFilterConfig {
    type: 'motion-blur';
    kernelSize?: number;
    offset?: number;
    velocity?: PointData;
}

// Multi Color Replace filter configuration
export interface MultiColorReplaceFilterConfig extends BaseFilterConfig {
    type: 'multi-color-replace';
    replacements?: Array<{
        originalColor: ColorSource;
        newColor: ColorSource;
    }>;
    tolerance?: number;
}

// Old Film filter configuration
export interface OldFilmFilterConfig extends BaseFilterConfig {
    type: 'old-film';
    noise?: number;
    noiseSize?: number;
    scratch?: number;
    scratchDensity?: number;
    scratchWidth?: number;
    sepia?: number;
    vignetting?: number;
    vignettingAlpha?: number;
    vignettingBlur?: number;
}

// Outline filter configuration
export interface OutlineFilterConfig extends BaseFilterConfig {
    type: 'outline';
    alpha?: number;
    color?: ColorSource;
    knockout?: boolean;
    quality?: number;
    thickness?: number;
}

// Pixelate filter configuration
export interface PixelateFilterConfig extends BaseFilterConfig {
    type: 'pixelate';
    size?: number | [number, number];
}

// Radial Blur filter configuration
export interface RadialBlurFilterConfig extends BaseFilterConfig {
    type: 'radial-blur';
    angle?: number;
    center?: PointData;
    kernelSize?: number;
    radius?: number;
}

// Reflection filter configuration
export interface ReflectionFilterConfig extends BaseFilterConfig {
    type: 'reflection';
    alpha?: number[];
    amplitude?: number[];
    boundary?: number;
    mirror?: boolean;
    time?: number;
    waveLength?: number[];
}

// RGB Split filter configuration
export interface RGBSplitFilterConfig extends BaseFilterConfig {
    type: 'rgb-split';
    blue?: PointData;
    green?: PointData;
    red?: PointData;
}

// Shockwave filter configuration
export interface ShockwaveFilterConfig extends BaseFilterConfig {
    type: 'shockwave';
    amplitude?: number;
    brightness?: number;
    center?: PointData;
    radius?: number;
    speed?: number;
    time?: number;
    wavelength?: number;
}

// Simple Lightmap filter configuration
export interface SimpleLightmapFilterConfig extends BaseFilterConfig {
    type: 'simple-lightmap';
    alpha?: number;
    color?: ColorSource; // Add color property
    lightMap?: Texture;

    //do i still need this?
    scale?: number;


}

// Simplex Noise filter configuration
export interface SimplexNoiseFilterConfig extends BaseFilterConfig {
    type: 'simplex-noise';
    noiseScale?: number;
    offsetX?: number;
    offsetY?: number;
    offsetZ?: number;
    step?: number;
    strength?: number;

    //do i still need these?
    seed?: number;
    time?: number;
}

// Tilt Shift filter configuration
export interface TiltShiftFilterConfig extends BaseFilterConfig {
    type: 'tilt-shift';
    blur?: number;
    end?: PointData;
    gradientBlur?: number;
    start?: PointData;

}

// Twist filter configuration
export interface TwistFilterConfig extends BaseFilterConfig {
    type: 'twist';
    angle?: number;
    offset?: PointData;
    radius?: number;

    //do i still need this?
    padding?: number;
}

// Zoom Blur filter configuration
export interface ZoomBlurFilterConfig extends BaseFilterConfig {
    type: 'zoom-blur';
    center?: PointData;
    innerRadius?: number;
    radius?: number;
    strength?: number;
}

// --- BUILT-IN FILTERS ---

// Alpha filter configuration
export interface AlphaFilterConfig extends BaseFilterConfig {
    type: 'alpha';
    alpha?: number;
}

// Blur filter configuration
export interface BlurFilterConfig extends BaseFilterConfig {
    type: 'blur';
    blurXFilter?: BlurFilterPass;
    blurYFilter?: BlurFilterPass;
    kernelSize?: number;
    quality?: number;
    repeatEdgePixels?: boolean
    resolution?: number;
    strength?: number;
}

// Color Matrix filter configuration
export interface ColorMatrixFilterConfig extends BaseFilterConfig {
    type: 'color-matrix';
    preset?: ColorMatrixPreset;
    matrix?: number[];
    amount?: number; // For presets that take an intensity value
    multiply?: boolean; //if true, current matrix and matrix are multiplied. If false, just set the current matrix with @param matrix
}

// Displacement filter configuration (additional to the core displacement)
export interface DisplacementFilterConfig extends BaseFilterConfig {
    type: 'displacement';
    scale?: { x: number; y: number };
    displacementSprite?: string; // Path to the displacement map texture
}

// Noise filter configuration
export interface NoiseFilterConfig extends BaseFilterConfig {
    type: 'noise';
    noise?: number;
    seed?: number;
}

// Custom filter configuration
export interface CustomFilterConfig extends BaseFilterConfig {
    type: 'custom';
    filter: PixiFilter;
    updateIntensity: (filter: PixiFilter, intensity: number) => void;
}

// Union type of all filter configurations
export type FilterConfig =
// pixi-filters
    | AdjustmentFilterConfig
    | AdvancedBloomFilterConfig
    | AsciiFilterConfig
    | BackdropBlurFilterConfig
    | BevelFilterConfig
    | BloomFilterConfig
    | BulgePinchFilterConfig
    | ColorGradientFilterConfig
    | ColorMapFilterConfig
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
    | OldFilmFilterConfig
    | OutlineFilterConfig
    | PixelateFilterConfig
    | RadialBlurFilterConfig
    | ReflectionFilterConfig
    | RGBSplitFilterConfig
    | ShockwaveFilterConfig
    | SimpleLightmapFilterConfig
    | SimplexNoiseFilterConfig
    | TiltShiftFilterConfig
    | TwistFilterConfig
    | ZoomBlurFilterConfig
    // built-in filters
    | AlphaFilterConfig
    | BlurFilterConfig
    | ColorMatrixFilterConfig
    | DisplacementFilterConfig
    | NoiseFilterConfig
    // custom
    | CustomFilterConfig;

// Helper interface for filter factory results
export interface FilterResult {
    filter: PixiFilter;
    updateIntensity: (intensity: number) => void;
    reset: () => void;
}