import { type FilterConfig, type FilterResult } from './types.ts';

// Import individual filter creators
import { createAdjustmentFilter } from "./adjustmentFilter.ts";
import { createAdvancedBloomFilter } from './advancedBloomFilter.ts';
import { createAlphaFilter } from './alphaFilter.ts';
import { createAsciiFilter } from "./asciiFilter.ts";
import { createBevelFilter } from "./bevelFilter.ts";
import { createBloomFilter } from "./bloomFilter.ts";
import { createBulgePinchFilter } from "./bulgePinchFilter.ts";
import { createBackdropBlurFilter } from "./backdropBlurFilter.ts";
import { createBlurFilter } from './blurFilter.ts';
import { createColorGradientFilter } from "./colorGradientFilter.ts";
import { createColorMapFilter } from "./colorMapFilter.ts";
import { createColorMatrixFilter } from './colorMatrixFilter.ts';
import { createColorOverlayFilter } from "./colorOverlayFilter.ts";
import { createColorReplaceFilter } from "./colorReplaceFilter.ts";
import { createConvolutionFilter } from "./convolutionFilter.ts";
import { createCrossHatchFilter } from "./crossHatchFilter.ts";
import { createCRTFilter } from "./crtFilter.ts";
import { createDotFilter } from "./dotFilter.ts";
import { createDropShadowFilter } from "./dropShadowFilter.ts";
import { createEmbossFilter } from "./embossFilter.ts";
import { createGlitchFilter } from "./glitchFilter.ts";
import { createGlowFilter } from "./glowFilter.ts";
import { createGodrayFilter } from "./godrayFilter.ts";
import { createGrayscaleFilter } from "./grayscaleFilter.ts";
import { createHslAdjustmentFilter } from "./hslAdjustmentFilter.ts";
import { createKawaseBlurFilter } from "./kawaseBlurFilter.ts";
import { createMotionBlurFilter } from "./motionBlurFilter.ts";
import { createMultiColorReplaceFilter } from "./multiColorReplaceFilter.ts";
import { createNoiseFilter } from "./noiseFilter.ts";
import { createOldFilmFilter } from "./oldFilmFilter.ts";
import { createOutlineFilter } from "./outlineFilter.ts";
import { createPixelateFilter } from "./pixelateFilter.ts";
import { createRadialBlurFilter } from "./radialBlurFilter.ts";
import { createReflectionFilter } from "./reflectionFilter.ts";
import { createRGBSplitFilter } from "./rgbSplitFilter.ts";
import { createShockwaveFilter } from "./shockwaveFilter.ts";
import { createSimpleLightmapFilter } from "./simpleLightmapFilter.ts";
import { createSimplexNoiseFilter } from "./simplexNoiseFilter.ts";
import { createTiltShiftFilter } from "./tiltShiftFilter.ts";
import { createTwistFilter } from "./twistFilter.ts";
import { createZoomBlurFilter } from "./zoomBlurFilter.ts";

/**
 * Factory for creating and managing different types of PixiJS filters
 *
 * This factory creates filters based on the provided configuration.
 * Each filter is implemented in its own module for better organization and maintainability.
 */
export class FilterFactory {
    /**
     * Create a filter based on the provided configuration
     *
     * @param config - Configuration for the filter
     * @returns Object containing the filter instance and control functions
     */
    static createFilter(config: FilterConfig): FilterResult {
        if (!config.enabled) {
            throw new Error('Cannot create a disabled filter');
        }

        // Map filter type to creator function
        switch (config.type) {
            // Built-in PixiJS Filters
            case 'adjustment':
                return createAdjustmentFilter(config);
            case 'advancedBloom':
                return createAdvancedBloomFilter(config);
            case 'alpha':
                return createAlphaFilter(config);
            case 'ascii':
                return createAsciiFilter(config);
            case 'backdropBlur':
                return createBackdropBlurFilter(config);
            case 'bevel':
                return createBevelFilter(config);
            case 'bloom':
                return createBloomFilter(config);
            case 'blur':
                return createBlurFilter(config);
            case 'bulgePinch':
                return createBulgePinchFilter(config);
            case 'colorGradient':
                return createColorGradientFilter(config);
            case 'colorMap':
                return createColorMapFilter(config);
            case 'colorMatrix':
                return createColorMatrixFilter(config);
            case 'colorOverlay':
                return createColorOverlayFilter(config);
            case 'colorReplace':
                return createColorReplaceFilter(config);
            case 'convolution':
                return createConvolutionFilter(config);
            case 'crossHatch':
                return createCrossHatchFilter(config);
            case 'crt':
                return createCRTFilter(config);
            case 'dot':
                return createDotFilter(config);
            case 'dropShadow':
                return createDropShadowFilter(config);
            case 'emboss':
                return createEmbossFilter(config);
            case 'glitch':
                return createGlitchFilter(config);
            case 'glow':
                return createGlowFilter(config);
            case 'godray':
                return createGodrayFilter(config);
            case 'grayscale':
                return createGrayscaleFilter(config);
            case 'hsl':
                return createHslAdjustmentFilter(config);
            case 'kawaseBlur':
                return createKawaseBlurFilter(config);
            case 'motionBlur':
                return createMotionBlurFilter(config);
            case 'multiColorReplace':
                return createMultiColorReplaceFilter(config);
            case 'noise':
                return createNoiseFilter(config);
            case 'oldFilm':
                return createOldFilmFilter(config);
            case 'outline':
                return createOutlineFilter(config);
            case 'pixelate':
                return createPixelateFilter(config);
            case 'radialBlur':
                return createRadialBlurFilter(config);
            case 'reflection':
                return createReflectionFilter(config);
            case "rgbSplit":
                return createRGBSplitFilter(config);
            case 'shockwave':
                return createShockwaveFilter(config);
            case 'simpleLightmap':
                return createSimpleLightmapFilter(config);
            case 'simplexNoise':
                return createSimplexNoiseFilter(config);
            case 'tiltShift':
                return createTiltShiftFilter(config);
            case 'twist':
                return createTwistFilter(config);
            case "zoomBlur":
                return createZoomBlurFilter(config);
            // Additional filters will be added here as they are implemented
            default:
                throw new Error(`Unsupported filter type: ${config}`);
        }
    }
}