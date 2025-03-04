import { type FilterConfig, type FilterResult } from './types';

// Import individual filter creators
import { createAdjustmentFilter } from "./adjustmentFilter";
import { createAdvancedBloomFilter } from './advancedBloomFilter';
import { createAlphaFilter } from './alphaFilter';
import { createAsciiFilter } from "./asciiFilter";
import { createBackdropBlurFilter } from "./backdropBlurFilter";
import { createBlurFilter } from './blurFilter';
import { createColorMatrixFilter } from './colorMatrixFilter';
import { createNoiseFilter } from "./noiseFilter";
import {createBevelFilter} from "./bevelFilter.ts";


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
                return createBevelFilter(config)
            case 'blur':
                return createBlurFilter(config);
            case 'colorMatrix':
                return createColorMatrixFilter(config);
            case 'noise':
                return createNoiseFilter(config);
            // Additional filters will be added here as they are implemented

            default:
                throw new Error(`Unsupported filter type: ${config}`);
        }
    }
}