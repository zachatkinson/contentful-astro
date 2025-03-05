/**
 * KineticSlider3 Filter System
 *
 * This module exports all available filters for the KineticSlider3 component.
 * Each filter is implemented in its own file for better organization and maintainability.
 */

// Export the FilterFactory
export { FilterFactory } from './FilterFactory';

// Export individual filter creators
export { createAdjustmentFilter } from './adjustmentFilter';
export { createAdvancedBloomFilter } from './advancedBloomFilter';
export { createAlphaFilter } from './alphaFilter';
export { createAsciiFilter } from './asciiFilter'
export { createBackdropBlurFilter } from './backdropBlurFilter'
export { createBloomFilter } from './bloomFilter'
export { createBlurFilter } from './blurFilter';
export { createBulgePinchFilter } from './bulgePinchFilter'
export { createColorGradientFilter } from './colorGradientFilter'
export { createColorMapFilter } from './colorMapFilter'
export { createColorMatrixFilter } from './colorMatrixFilter';
export { createColorOverlayFilter } from './colorOverlayFilter'
export { createColorReplaceFilter } from './colorReplaceFilter'
export { createConvolutionFilter } from './convolutionFilter'
export { createCrossHatchFilter } from './crossHatchFilter';
export { createCRTFilter } from './crtFilter'
export { createDotFilter } from './dotFilter'
export { createDropShadowFilter } from './dropShadowFilter'
export { createEmbossFilter } from './embossFilter'
export { createGlitchFilter } from './glitchFilter'
export { createNoiseFilter } from './noiseFilter';


// Export filter types
export * from './types';