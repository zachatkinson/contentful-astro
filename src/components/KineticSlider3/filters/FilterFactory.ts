import { type FilterConfig, type FilterResult } from './types';

// Import individual filter creators
import { createAdjustmentFilter } from "./adjustmentFilter";
import { createAdvancedBloomFilter } from './advancedBloomFilter';
import { createAlphaFilter } from './alphaFilter';
import { createAsciiFilter } from "./asciiFilter";
import { createBevelFilter } from "./bevelFilter";
import { createBloomFilter } from "./bloomFilter";
import { createBulgePinchFilter } from "./bulgePinchFilter";
import { createBackdropBlurFilter } from "./backdropBlurFilter";
import { createBlurFilter } from './blurFilter';
import { createColorGradientFilter } from "./colorGradientFilter";
import { createColorMapFilter } from "./colorMapFilter";
import { createColorMatrixFilter } from './colorMatrixFilter';
import { createColorOverlayFilter } from "./colorOverlayFilter";
import { createColorReplaceFilter } from "./colorReplaceFilter";
import { createConvolutionFilter } from "./convolutionFilter";
import { createCrossHatchFilter } from "./crossHatchFilter";
import { createNoiseFilter } from "./noiseFilter";
import {createCRTFilter} from "./crtFilter.ts";


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
                return createColorMapFilter(config)
            case 'colorMatrix':
                return createColorMatrixFilter(config);
            case 'colorOverlay':
                return createColorOverlayFilter(config)
            case 'colorReplace':
                return createColorReplaceFilter(config)
            case 'convolution':
                return createConvolutionFilter(config)
            case 'crossHatch':
                return createCrossHatchFilter(config);
            case 'crt':
                return createCRTFilter(config)
            case 'noise':
                return createNoiseFilter(config);
            // Additional filters will be added here as they are implemented
            default:
                throw new Error(`Unsupported filter type: ${config}`);
        }
    }
}