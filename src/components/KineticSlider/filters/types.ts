import {Filter as PixiFilter, type PointData} from 'pixi.js';

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

// RGB Split filter configuration
export interface RGBSplitFilterConfig extends BaseFilterConfig {
    type: 'rgb-split';
    redOffset?: { x: number; y: number };
    greenOffset?: { x: number; y: number };
    blueOffset?: { x: number; y: number };
}

// Adjustment filter configuration
export interface AdjustmentFilterConfig extends BaseFilterConfig {
    type: 'adjustment';
    gamma?: number;
    saturation?: number;
    contrast?: number;
    brightness?: number;
    red?: number;
    green?: number;
    blue?: number;
    alpha?: number;
}

// Advanced Bloom filter configuration
export interface AdvancedBloomFilterConfig extends BaseFilterConfig {
    type: 'advanced-bloom';
    threshold?: number;
    bloomScale?: number;
    brightness?: number;
    blur?: number;
    quality?: number;
}

// ASCII filter configuration
export interface AsciiFilterConfig extends BaseFilterConfig {
    type: 'ascii';
    size?: number;
    color?: number | string; // ColorSource: hexadecimal (0xFFFFFF) or CSS color string
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
    rotation?: number;
    thickness?: number;
    lightColor?: string | number;
    shadowColor?: string | number;
    lightAlpha?: number;
    shadowAlpha?: number;
}

// Bloom filter configuration
export interface BloomFilterConfig extends BaseFilterConfig {
    type: 'bloom';
    quality?: number;       // Controls the quality of the effect
    strength?: number;      // Alternative to intensity for direct strength setting
    strengthX?: number;     // For directional control on X axis
    strengthY?: number;     // For directional control on Y axis
}

// Bulge Pinch filter configuration
export interface BulgePinchFilterConfig extends BaseFilterConfig {
    type: 'bulge-pinch';
    radius?: number;
    strength?: number;
    center?: [number, number];
}

// Color Gradient filter configuration
export interface ColorGradientFilterConfig extends BaseFilterConfig {
    type: 'color-gradient';
    gradient?: Array<string | number>;
    alpha?: number;
}

// Color Map filter configuration
export interface ColorMapFilterConfig extends BaseFilterConfig {
    type: 'color-map';
    colorMap?: string;
    nearest?: boolean;
}

// Color Overlay filter configuration
export interface ColorOverlayFilterConfig extends BaseFilterConfig {
    type: 'color-overlay';
    color?: string | number;
    alpha?: number;
}

// Color Replace filter configuration
export interface ColorReplaceFilterConfig extends BaseFilterConfig {
    type: 'color-replace';
    originalColor?: string | number;
    newColor?: string | number;
    epsilon?: number;
}

// Convolution filter configuration
export interface ConvolutionFilterConfig extends BaseFilterConfig {
    type: 'convolution';
    matrix?: number[];
    width?: number;
    height?: number;
}

// Cross Hatch filter configuration
export interface CrossHatchFilterConfig extends BaseFilterConfig {
    type: 'cross-hatch';
}

// CRT filter configuration
export interface CRTFilterConfig extends BaseFilterConfig {
    type: 'crt';
    curvature?: number;
    lineWidth?: number;
    lineContrast?: number;
    noise?: number;
    noiseSize?: number;
    seed?: number;
    vignetting?: number;
    vignettingAlpha?: number;
    vignettingBlur?: number;
    time?: number;
}

// Dot filter configuration
export interface DotFilterConfig extends BaseFilterConfig {
    type: 'dot';
    scale?: number;
    angle?: number;
}

// Drop Shadow filter configuration
export interface DropShadowFilterConfig extends BaseFilterConfig {
    type: 'drop-shadow';
    alpha?: number;
    distance?: number;
    blur?: number;
    color?: number;
    quality?: number;
    pixelSize?: number;
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
    slices?: number;
    offset?: number;
    direction?: number;
    fillMode?: number;
    seed?: number;
    average?: boolean;
    minSize?: number;
    sampleSize?: number;
}

// Glow filter configuration
export interface GlowFilterConfig extends BaseFilterConfig {
    type: 'glow';
    distance?: number;
    outerStrength?: number;
    innerStrength?: number;
    color?: string | number;
    quality?: number;
}

// Godray filter configuration
export interface GodrayFilterConfig extends BaseFilterConfig {
    type: 'godray';
    angle?: number;
    gain?: number;
    lacunarity?: number;
    time?: number;
    parallel?: boolean;
    center?: [number, number];
}

// Grayscale filter configuration
export interface GrayscaleFilterConfig extends BaseFilterConfig {
    type: 'grayscale';
    amount?: number;
}

// HSL Adjustment filter configuration
export interface HslAdjustmentFilterConfig extends BaseFilterConfig {
    type: 'hsl-adjustment';
    hue?: number;
    saturation?: number;
    lightness?: number;
}

// Kawase Blur filter configuration
export interface KawaseBlurFilterConfig extends BaseFilterConfig {
    type: 'kawase-blur';
    blur?: number;
    quality?: number;
    clamp?: boolean;
}

// Motion Blur filter configuration
export interface MotionBlurFilterConfig extends BaseFilterConfig {
    type: 'motion-blur';
    velocity?: [number, number];
    kernelSize?: number;
    offset?: number;
}

// Multi Color Replace filter configuration
export interface MultiColorReplaceFilterConfig extends BaseFilterConfig {
    type: 'multi-color-replace';
    replacements?: Array<{
        originalColor: string | number;
        newColor: string | number;
        epsilon: number;
    }>;
}

// Old Film filter configuration
export interface OldFilmFilterConfig extends BaseFilterConfig {
    type: 'old-film';
    sepia?: number;
    noise?: number;
    noiseSize?: number;
    scratch?: number;
    scratchDensity?: number;
    scratchWidth?: number;
    vignetting?: number;
    vignettingAlpha?: number;
    vignettingBlur?: number;
}

// Outline filter configuration
export interface OutlineFilterConfig extends BaseFilterConfig {
    type: 'outline';
    thickness?: number;
    color?: string | number;
    quality?: number;
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
    center?: [number, number];
    radius?: number;
}

// Reflection filter configuration
export interface ReflectionFilterConfig extends BaseFilterConfig {
    type: 'reflection';
    mirror?: boolean;
    boundary?: number;
    amplitude?: number[];
    waveLength?: number[];
    alpha?: number[];
    time?: number;
}

// Shockwave filter configuration
export interface ShockwaveFilterConfig extends BaseFilterConfig {
    type: 'shockwave';
    center?: [number, number];
    amplitude?: number;
    wavelength?: number;
    speed?: number;
    radius?: number;
    brightness?: number;
    time?: number;
}

// Simple Lightmap filter configuration
export interface SimpleLightmapFilterConfig extends BaseFilterConfig {
    type: 'simple-lightmap';
    lightMap?: string;
    scale?: number;
    alpha?: number;
    color?: string | number; // Add color property
}

// Simplex Noise filter configuration
export interface SimplexNoiseFilterConfig extends BaseFilterConfig {
    type: 'simplex-noise';
    seed?: number;
    scale?: number;
    time?: number;
}

// Tilt Shift filter configuration
export interface TiltShiftFilterConfig extends BaseFilterConfig {
    type: 'tilt-shift';
    blur?: number;
    gradientBlur?: number;
    start?: [number, number];
    end?: [number, number];
}

// Twist filter configuration
export interface TwistFilterConfig extends BaseFilterConfig {
    type: 'twist';
    angle?: number;
    offset?: PointData;
    offsetX?: number;
    offsetY?: number;
    padding?: number;
    radius?: number;
}

// Zoom Blur filter configuration
export interface ZoomBlurFilterConfig extends BaseFilterConfig {
    type: 'zoom-blur';
    strength?: number;
    center?: [number, number];
    innerRadius?: number;
    radius?: number;
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
    strength?: number;
    quality?: number;
    resolution?: number;
    kernelSize?: number;
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
    | RGBSplitFilterConfig
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