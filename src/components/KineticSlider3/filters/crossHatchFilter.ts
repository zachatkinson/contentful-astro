import { CrossHatchFilter } from 'pixi-filters';
import { type CrossHatchFilterConfig, type FilterResult } from './types';

/**
 * Creates a CrossHatch filter that applies a cross-hatch drawing effect
 *
 * The CrossHatchFilter creates a drawing-like effect that resembles
 * crosshatching techniques used in pen and ink illustrations.
 *
 * @param config - Configuration for the CrossHatch filter
 * @returns FilterResult with the filter instance and control functions
 */
export function createCrossHatchFilter(config: CrossHatchFilterConfig): FilterResult {
    // Create the filter - CrossHatchFilter doesn't accept parameters
    const filter = new CrossHatchFilter();

    // Track initialization state
    let isFirstActivation = true;
    let pendingTimeout: number | null = null;

    /**
     * Update the filter's intensity
     * For CrossHatchFilter we simply enable/disable based on intensity
     *
     * @param intensity - New intensity value (0-10 scale)
     */
    const updateIntensity = (intensity: number): void => {
        // Normalize intensity to a 0-10 scale
        const normalizedIntensity = Math.max(0, Math.min(10, intensity));

        // For first activation, use special handling to prevent double application
        if (isFirstActivation) {
            console.log('First activation of CrossHatchFilter');

            // Clear any pending timeout to avoid race conditions
            if (pendingTimeout !== null) {
                clearTimeout(pendingTimeout);
            }

            // First ensure the filter is properly initialized but disabled
            filter.enabled = false;

            // Then set a timeout to enable it after the next render cycle
            pendingTimeout = window.setTimeout(() => {
                filter.enabled = normalizedIntensity > 0;
                pendingTimeout = null;
                console.log('CrossHatchFilter enabled after initialization');
            }, 50);

            isFirstActivation = false;
        } else {
            // Standard intensity update - simply enable/disable based on intensity
            filter.enabled = normalizedIntensity > 0;
        }
    };

    // No initial call to updateIntensity - wait for the first active call

    /**
     * Reset the filter to default state (minimal effect)
     */
    const reset = (): void => {
        // Clear any pending timeout
        if (pendingTimeout !== null) {
            clearTimeout(pendingTimeout);
            pendingTimeout = null;
        }

        // Disable the filter
        filter.enabled = false;

        // Flag for next activation
        isFirstActivation = true;

        console.log('CrossHatchFilter reset to initial state');
    };

    return { filter, updateIntensity, reset };
}