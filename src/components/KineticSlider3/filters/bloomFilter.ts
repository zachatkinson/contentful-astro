import { BloomFilter } from 'pixi-filters';
import { type BloomFilterConfig, type FilterResult } from './types';

/**
 * This file should be placed at:
 * src/components/KineticSlider3/filters/bloomFilter.ts
 */

/**
 * Creates a Bloom filter that applies a Gaussian blur to create a bloom effect
 *
 * The BloomFilter applies a Gaussian blur to an object, creating a glow effect.
 * The strength of the blur can be set for x- and y-axis separately.
 *
 * @param config - Configuration for the Bloom filter
 * @returns FilterResult with the filter instance and control functions
 */
export function createBloomFilter(config: BloomFilterConfig): FilterResult {
    // Create options object based on the configuration
    const options: any = {};

    // Set the strength if provided (for both X and Y)
    if (config.strength !== undefined) {
        options.strength = config.strength;
    }

    // Set individual X and Y strengths if provided
    if (config.strengthX !== undefined) {
        options.strengthX = config.strengthX;
    }

    if (config.strengthY !== undefined) {
        options.strengthY = config.strengthY;
    }

    // Create the filter with options
    const filter = new BloomFilter(options);

    /**
     * Update the filter's intensity based on the configuration
     *
     * @param intensity - New intensity value (0-10 scale)
     */
    const updateIntensity = (intensity: number): void => {
        // Normalize intensity to a 0-10 scale
        const normalizedIntensity = Math.max(0, Math.min(10, intensity));

        // Determine how to apply the intensity based on config
        if (config.primaryProperty) {
            switch (config.primaryProperty) {
                case 'strength':
                    // Apply to overall strength (both X and Y)
                    filter.strength = {x: normalizedIntensity * 2, y: normalizedIntensity * 2} ; // 0-10 → 0-20
                    break;
                case 'strengthX':
                    // Apply to X strength only
                    filter.strengthX = normalizedIntensity * 2; // 0-10 → 0-20
                    break;
                case 'strengthY':
                    // Apply to Y strength only
                    filter.strengthY = normalizedIntensity * 2; // 0-10 → 0-20
                    break;
                default:
                    // Default to overall strength
                    filter.strength = normalizedIntensity * 2; // 0-10 → 0-20
            }
        } else {
            // Default behavior - apply to overall strength
            filter.strength = normalizedIntensity * 2; // 0-10 → 0-20
        }
    };

    // Set initial intensity
    updateIntensity(config.intensity);

    /**
     * Reset the filter to default state (minimal bloom)
     */
    const reset = (): void => {
        // Reset to default values according to the documentation
        filter.strength = 2; // Default value is 2
    };

    return { filter, updateIntensity, reset };
}