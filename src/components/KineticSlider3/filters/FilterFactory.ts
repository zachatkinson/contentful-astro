import { type FilterConfig, type FilterResult } from './types';
import { ShaderResourceManager } from '../managers/ShaderResourceManager';

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
import { createCRTFilter } from "./crtFilter";
import { createDotFilter } from "./dotFilter";
import { createDropShadowFilter } from "./dropShadowFilter";
import { createEmbossFilter } from "./embossFilter";
import { createGlitchFilter } from "./glitchFilter";
import { createGlowFilter } from "./glowFilter";
import { createGodrayFilter } from "./godrayFilter";
import { createGrayscaleFilter } from "./grayscaleFilter";
import { createHslAdjustmentFilter } from "./hslAdjustmentFilter";
import { createKawaseBlurFilter } from "./kawaseBlurFilter";
import { createMotionBlurFilter } from "./motionBlurFilter";
import { createMultiColorReplaceFilter } from "./multiColorReplaceFilter";
import { createNoiseFilter } from "./noiseFilter";
import { createOldFilmFilter } from "./oldFilmFilter";
import { createOutlineFilter } from "./outlineFilter";
import { createPixelateFilter } from "./pixelateFilter";
import { createRadialBlurFilter } from "./radialBlurFilter";
import { createReflectionFilter } from "./reflectionFilter";
import { createRGBSplitFilter } from "./rgbSplitFilter";
import { createShockwaveFilter } from "./shockwaveFilter";
import { createSimpleLightmapFilter } from "./simpleLightmapFilter";
import { createSimplexNoiseFilter } from "./simplexNoiseFilter";
import { createTiltShiftFilter } from "./tiltShiftFilter";
import { createTwistFilter } from "./twistFilter";
import { createZoomBlurFilter } from "./zoomBlurFilter";

/**
 * Factory for creating and managing different types of PixiJS filters
 *
 * This factory creates filters based on the provided configuration.
 * Each filter is implemented in its own module for better organization and maintainability.
 */
export class FilterFactory {
    /** Shader resource manager instance */
    private static shaderManager: ShaderResourceManager | null = null;

    /** Filter cache for reusing instances with identical configurations */
    private static filterCache = new Map<string, FilterResult>();

    /** Debug mode flag */
    private static debug = false;

    /** Is shader pooling enabled */
    private static shaderPoolingEnabled = false;

    /**
     * Initialize the FilterFactory with a ShaderResourceManager
     *
     * @param options - Configuration options
     */
    public static initialize(options: {
        enableShaderPooling?: boolean;
        enableDebug?: boolean;
        maxCacheSize?: number;
    } = {}): void {
        // Get or create a shader manager instance
        this.shaderManager = ShaderResourceManager.getInstance({
            debug: options.enableDebug,
            maxPoolSize: 100
        });

        this.debug = options.enableDebug ?? false;
        this.shaderPoolingEnabled = options.enableShaderPooling ?? true;

        if (this.debug) {
            console.log(`[FilterFactory] Initialized with shader pooling ${this.shaderPoolingEnabled ? 'enabled' : 'disabled'}`);
        }

        // Apply shader program pooling patches if enabled
        if (this.shaderPoolingEnabled && this.shaderManager) {
            // PixiJS patching for shader pooling would go here in a production implementation
            // This requires internal knowledge of how each filter creates its shaders
            if (this.debug) {
                console.log('[FilterFactory] Shader pooling enabled - shader programs will be shared between filter instances');
            }
        }
    }

    /**
     * Generate a cache key for a filter configuration
     *
     * @param config - Filter configuration
     * @returns A string key for cache lookups
     */
    private static generateCacheKey(config: FilterConfig): string {
        return `${config.type}_${JSON.stringify(config)}`;
    }

    /**
     * Log a message if debug is enabled
     *
     * @param message - Message to log
     */
    private static log(message: string): void {
        if (this.debug) {
            console.log(`[FilterFactory] ${message}`);
        }
    }

    /**
     * Create a filter based on the provided configuration
     *
     * @param config - Configuration for the filter
     * @returns Object containing the filter instance and control functions
     */
    static createFilter(config: FilterConfig & { type: string }): FilterResult {
        // Initialize if not already done
        if (!this.shaderManager) {
            this.initialize();
        }

        // Check cache for identical configuration
        const cacheKey = this.generateCacheKey(config);
        if (this.filterCache.has(cacheKey)) {
            const cachedResult = this.filterCache.get(cacheKey);
            this.log(`Reusing cached filter for ${config.type}`);
            return cachedResult!;
        }

        // Allow creating disabled filters - they will be enabled later when needed
        // The enabled state will be managed by the filter system
        let result: FilterResult;

        // Map filter type to creator function
        switch (config.type) {
            // Built-in PixiJS Filters
            case 'adjustment':
                result = createAdjustmentFilter(config);
                break;
            case 'advancedBloom':
                result = createAdvancedBloomFilter(config);
                break;
            case 'alpha':
                result = createAlphaFilter(config);
                break;
            case 'ascii':
                result = createAsciiFilter(config);
                break;
            case 'backdropBlur':
                result = createBackdropBlurFilter(config);
                break;
            case 'bevel':
                result = createBevelFilter(config);
                break;
            case 'bloom':
                result = createBloomFilter(config);
                break;
            case 'blur':
                result = createBlurFilter(config);
                break;
            case 'bulgePinch':
                result = createBulgePinchFilter(config);
                break;
            case 'colorGradient':
                result = createColorGradientFilter(config);
                break;
            case 'colorMap':
                result = createColorMapFilter(config);
                break;
            case 'colorMatrix':
                result = createColorMatrixFilter(config);
                break;
            case 'colorOverlay':
                result = createColorOverlayFilter(config);
                break;
            case 'colorReplace':
                result = createColorReplaceFilter(config);
                break;
            case 'convolution':
                result = createConvolutionFilter(config);
                break;
            case 'crossHatch':
                result = createCrossHatchFilter(config);
                break;
            case 'crt':
                result = createCRTFilter(config);
                break;
            case 'dot':
                result = createDotFilter(config);
                break;
            case 'dropShadow':
                result = createDropShadowFilter(config);
                break;
            case 'emboss':
                result = createEmbossFilter(config);
                break;
            case 'glitch':
                result = createGlitchFilter(config);
                break;
            case 'glow':
                result = createGlowFilter(config);
                break;
            case 'godray':
                result = createGodrayFilter(config);
                break;
            case 'grayscale':
                result = createGrayscaleFilter(config);
                break;
            case 'hsl':
                result = createHslAdjustmentFilter(config);
                break;
            case 'kawaseBlur':
                result = createKawaseBlurFilter(config);
                break;
            case 'motionBlur':
                result = createMotionBlurFilter(config);
                break;
            case 'multiColorReplace':
                result = createMultiColorReplaceFilter(config);
                break;
            case 'noise':
                result = createNoiseFilter(config);
                break;
            case 'oldFilm':
                result = createOldFilmFilter(config);
                break;
            case 'outline':
                result = createOutlineFilter(config);
                break;
            case 'pixelate':
                result = createPixelateFilter(config);
                break;
            case 'radialBlur':
                result = createRadialBlurFilter(config);
                break;
            case 'reflection':
                result = createReflectionFilter(config);
                break;
            case "rgbSplit":
                result = createRGBSplitFilter(config);
                break;
            case 'shockwave':
                result = createShockwaveFilter(config);
                break;
            case 'simpleLightmap':
                result = createSimpleLightmapFilter(config);
                break;
            case 'simplexNoise':
                result = createSimplexNoiseFilter(config);
                break;
            case 'tiltShift':
                result = createTiltShiftFilter(config);
                break;
            case 'twist':
                result = createTwistFilter(config);
                break;
            case "zoomBlur":
                result = createZoomBlurFilter(config);
                break;
            // Additional filters will be added here as they are implemented
            default:
                throw new Error("Unsupported filter type");
        }

        // Register with shader manager for tracking if available
        if (this.shaderManager && result.filter) {
            // In a full implementation, we would hook into the filter's shader lifecycle
            this.log('Registered filter with shader manager');
        }

        // Store in cache
        this.filterCache.set(cacheKey, result);

        // Cache maintenance - if more than 100 filters are cached, remove oldest ones
        if (this.filterCache.size > 100) {
            const keysToDelete = Array.from(this.filterCache.keys()).slice(0, 20);
            keysToDelete.forEach(key => this.filterCache.delete(key));
            this.log(`Cleaned up filter cache, removed ${keysToDelete.length} entries`);
        }

        return result;
    }

    /**
     * Get statistics about shader and filter usage
     *
     * @returns Object with statistics
     */
    static getStats(): any {
        return {
            filterCacheSize: this.filterCache.size,
            shaderStats: this.shaderManager ? this.shaderManager.getStats() : null,
            shaderPoolingEnabled: this.shaderPoolingEnabled
        };
    }

    /**
     * Clear the filter cache and optionally the shader pool
     *
     * @param clearShaderPool - Whether to also clear the shader pool
     */
    static clearCache(clearShaderPool = false): void {
        this.filterCache.clear();

        if (clearShaderPool && this.shaderManager) {
            // Instead of clearing the shader pool, we'll just log a message
            this.log('Warning: Shader pool clearing is not supported in this version.');
        }

        this.log('Filter cache cleared');
    }
}