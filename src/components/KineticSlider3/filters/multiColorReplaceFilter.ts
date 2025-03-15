import { MultiColorReplaceFilter } from 'pixi-filters';
import { type MultiColorReplaceFilterConfig, type FilterResult } from './types.ts';
import type { ColorSource } from 'pixi.js';

/**
 * Creates a MultiColorReplace filter that replaces multiple colors with specified target colors
 *
 * The MultiColorReplaceFilter replaces multiple colors with different target colors,
 * with a configurable tolerance/sensitivity level.
 *
 * @param config - Configuration for the MultiColorReplace filter
 * @returns FilterResult with the filter instance and control functions
 */
export function createMultiColorReplaceFilter(config: MultiColorReplaceFilterConfig): FilterResult {
    // Create options object for the filter
    const options: any = {
        replacements: config.replacements || [],
        tolerance: config.tolerance ?? 0.05,
        maxColors: config.maxColors
    };

    // Create the filter with options
    const filter = new MultiColorReplaceFilter(options);

    /**
     * Update the filter's intensity based on the configuration
     *
     * @param intensity - New intensity value (0-10 scale)
     */
    const updateIntensity = (intensity: number): void => {
        // Normalize intensity to a 0-10 scale
        const normalizedIntensity = Math.max(0, Math.min(10, intensity));

        // Determine which property to adjust based on config
        if (config.primaryProperty === 'tolerance') {
            // Map 0-10 to a reasonable tolerance range (0-1)
            // Lower values are more exact (less tolerance), higher values are more inclusive
            filter.tolerance = normalizedIntensity / 10;
        }
        else if (config.primaryProperty === 'blendFactor' && config.originalColors && config.targetColors) {
            // For blend factor, we'll interpolate between original and target colors
            // This is a custom feature not directly supported by the filter, but we can simulate it
            const blendFactor = normalizedIntensity / 10; // 0-1 range

            // Create new replacements array by blending between original and target colors
            const newReplacements: Array<[ColorSource, ColorSource]> = [];

            const maxColors = Math.min(
                config.originalColors.length,
                config.targetColors.length
            );

            for (let i = 0; i < maxColors; i++) {
                const originalColor = config.originalColors[i];
                const targetColor = config.targetColors[i];

                // For now we'll just use the target color directly with the blend factor
                // In a more advanced implementation, you could interpolate between colors
                newReplacements.push([originalColor, targetColor]);
            }

            // Update the replacements
            filter.replacements = newReplacements;

            // Call refresh to update the filter
            filter.refresh();
        }
        else {
            // Default behavior - adjust tolerance
            filter.tolerance = normalizedIntensity / 10;
        }
    };

    // Set initial intensity
    updateIntensity(config.intensity);

    /**
     * Reset the filter to configured state or default values if not specified
     */
    const reset = (): void => {
        // Set replacements back to the original configuration
        if (config.replacements) {
            filter.replacements = [...config.replacements];
        } else {
            filter.replacements = [];
        }

        // Reset tolerance to configured value or default
        filter.tolerance = config.tolerance ?? 0.05;

        // Call refresh to update the filter
        filter.refresh();
    };

    return { filter, updateIntensity, reset };
}