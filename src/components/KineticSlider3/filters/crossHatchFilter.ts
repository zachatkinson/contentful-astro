import { CrossHatchFilter } from 'pixi-filters';
import { type CrossHatchFilterConfig, type FilterResult } from './types';

/**
 * Creates a CrossHatch filter that applies a cross-hatch effect
 *
 * The CrossHatchFilter simulates a traditional drawing technique where shading
 * is created by drawing intersecting sets of parallel lines. This produces an
 * effect similar to pen-and-ink illustrations or sketches.
 *
 * @param config - Configuration for the CrossHatch filter
 * @returns FilterResult with the filter instance and control functions
 */
export function createCrossHatchFilter(config: CrossHatchFilterConfig): FilterResult {
    // Create the filter without options as per documentation
    const filter = new CrossHatchFilter();

    // Track if filter has been activated
    let isActive = false;

    /**
     * Update the filter's intensity
     * Since the documentation doesn't specify configurable properties,
     * we can only control this filter through standard Filter properties like alpha.
     *
     * @param intensity - New intensity value (0-10 scale)
     */
    const updateIntensity = (intensity: number): void => {
        // Normalize intensity to a 0-10 scale
        const normalizedIntensity = Math.max(0, Math.min(10, intensity));

        // If alpha is available on the filter, use it to control intensity
        if ('alpha' in filter) {
            filter.alpha = normalizedIntensity / 10;
        }

        // Mark as active only if intensity > 0
        isActive = normalizedIntensity > 0;
    };

    // Set initial intensity
    updateIntensity(config.intensity);

    /**
     * Reset the filter to initial configuration values or defaults
     */
    const reset = (): void => {
        // Reset alpha to config value if provided, otherwise use default (1)
        if ('alpha' in filter) {
            filter.alpha = config.alpha !== undefined ? config.alpha : 1;
        }

        // Reset enabled property to config value if provided, otherwise use default (true)
        if ('enabled' in filter) {
            (filter as any).enabled = config.enabled !== undefined ? config.enabled : true;
        }

        // If intensity was provided in config, use updateIntensity to reset properly
        if (config.intensity !== undefined) {
            updateIntensity(config.intensity);
            isActive = config.intensity > 0;
        } else {
            // If no intensity was specified, use default (active if alpha > 0)
            isActive = config.alpha !== undefined ? config.alpha > 0 : false;
        }
    };

    return { filter, updateIntensity, reset };
}