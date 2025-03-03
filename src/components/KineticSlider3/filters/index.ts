/**
 * KineticSlider3 Filter System
 *
 * This module exports all available filters for the KineticSlider3 component.
 * Each filter is implemented in its own file for better organization and maintainability.
 */

// Export the FilterFactory
export { FilterFactory } from './FilterFactory';

// Export individual filter creators
export { createAlphaFilter } from './alphaFilter';
export { createBlurFilter } from './blurFilter';

// Export filter types
export * from './types';