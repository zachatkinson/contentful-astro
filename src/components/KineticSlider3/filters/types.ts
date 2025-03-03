import { Filter } from 'pixi.js';


export type TextPair = [string, string]; // [title, subtitle]

/**
 * List of supported filter types
 */
export type FilterType =
// Built-in PixiJS filters
    | 'alpha'
    | 'blur'
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
 * Union type of all filter configurations
 */
export type FilterConfig =
    | AlphaFilterConfig
    | BlurFilterConfig;

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