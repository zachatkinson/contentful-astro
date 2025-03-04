// src/components/KineticSlider3/filters/asciiFilter.ts

import { AsciiFilter } from 'pixi-filters';
import { type AsciiFilterConfig, type FilterResult } from './types';

/**
 * Creates an AsciiFilter that renders the image as ASCII characters
 *
 * The AsciiFilter applies an ASCII art effect to the rendered object.
 *
 * @param config - Configuration for the ASCII filter
 * @returns FilterResult with the filter instance and control functions
 */
export function createAsciiFilter(config: AsciiFilterConfig): FilterResult {
    // Create the filter first with minimal options to ensure proper initialization
    const filter = new AsciiFilter();

    // Then explicitly set each property to ensure they're applied correctly

    // Set size if specified or use default (8)
    filter.size = config.size !== undefined ? config.size : 8;

    // Set color if specified or use default (white)
    if (config.color !== undefined) {
        filter.color = config.color;
    }

    // Set replaceColor if specified or use default (false)
    if (config.replaceColor !== undefined) {
        filter.replaceColor = config.replaceColor;
    }

    // Log current filter state for debugging
    console.log('AsciiFilter created with:', {
        size: filter.size,
        color: filter.color,
        replaceColor: filter.replaceColor
    });

    /**
     * Update the filter's intensity based on the configuration
     *
     * @param intensity - New intensity value (0-10 scale)
     */
    const updateIntensity = (intensity: number): void => {
        // Normalize intensity to a 0-10 scale
        const normalizedIntensity = Math.max(0, Math.min(10, intensity));

        // Default behavior: adjust the size property
        // Lower intensity = larger size (more pixelated/chunky)
        // Higher intensity = smaller size (more detailed ASCII)

        // Map 0-10 scale to a reasonable pixel size range (20-2)
        // Size of 20 = very chunky ASCII (low intensity)
        // Size of 2 = very detailed ASCII (high intensity)
        const size = Math.max(2, Math.round(20 - (normalizedIntensity * 1.8)));

        // Update the filter's size
        filter.size = size;

        console.log(`AsciiFilter intensity updated: ${intensity} → size: ${size}`);
    };

    // Set initial intensity
    updateIntensity(config.intensity);

    /**
     * Reset the filter to default state
     */
    const reset = (): void => {
        filter.size = 8; // Default size from documentation
        filter.color = 0xffffff; // Default color (white)
        filter.replaceColor = false; // Default value

        console.log('AsciiFilter reset to defaults');
    };

    // Ensure color and replaceColor are applied (forcing them again in case initial setting failed)
    if (config.color !== undefined) {
        // Force delay to ensure filter is properly initialized
        setTimeout(() => {
            filter.color = config.color;
            console.log('Forced color update:', filter.color);
        }, 0);
    }

    if (config.replaceColor !== undefined) {
        // Force delay to ensure filter is properly initialized
        setTimeout(() => {
            filter.replaceColor = config.replaceColor;
            console.log('Forced replaceColor update:', filter.replaceColor);
        }, 0);
    }

    return { filter, updateIntensity, reset };
}