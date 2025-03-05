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
    // Create a fake filter placeholder that will never be shown
    // We'll completely replace it with a real filter on first activation
    const dummyFilter = new CrossHatchFilter();
    dummyFilter.enabled = false;

    // Reference to the actual filter that will be created on first use
    let actualFilter: CrossHatchFilter | null = null;
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
        const shouldBeEnabled = normalizedIntensity > 0;

        // If this is the first time we're activating the filter with a positive intensity
        if (!actualFilter && shouldBeEnabled) {
            console.log('First activation of CrossHatchFilter - creating new instance');

            // Clear any pending timeouts
            if (pendingTimeout !== null) {
                clearTimeout(pendingTimeout);
                pendingTimeout = null;
            }

            // Create the real filter with disabled state
            actualFilter = new CrossHatchFilter();
            actualFilter.enabled = false;

            // Replace dummyFilter reference in the return value
            // This is a trick that updates the exported filter reference
            Object.defineProperty(filterResult, 'filter', {
                get: function() {
                    return actualFilter || dummyFilter;
                }
            });

            // Set a timeout to enable the filter after the initial disabled state is processed
            pendingTimeout = window.setTimeout(() => {
                if (actualFilter) {
                    actualFilter.enabled = shouldBeEnabled;
                    console.log('CrossHatchFilter real instance enabled after delay');
                }
                pendingTimeout = null;
            }, 100);
        }
        // If we already have an actual filter, just update its state
        else if (actualFilter) {
            actualFilter.enabled = shouldBeEnabled;
            console.log('CrossHatchFilter standard update - enabled:', shouldBeEnabled);
        }
    };

    /**
     * Reset the filter to default state
     */
    const reset = (): void => {
        // Clear any pending timeouts
        if (pendingTimeout !== null) {
            clearTimeout(pendingTimeout);
            pendingTimeout = null;
        }

        // Disable the actual filter if it exists
        if (actualFilter) {
            actualFilter.enabled = false;
        }

        // Reset the actual filter to null, forcing re-creation on next use
        actualFilter = null;

        console.log('CrossHatchFilter reset to initial state');
    };

    // Create the result object with a getter for the filter
    const filterResult = {
        get filter() { return actualFilter || dummyFilter; },
        updateIntensity,
        reset
    };

    return filterResult as FilterResult;
}