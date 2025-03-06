/**
 * FilterManager for KineticSlider
 * Manages the lifecycle of filters to prevent memory leaks
 * Updated for PixiJS V8
 */
import { Filter, Container } from 'pixi.js';
import { FilterFactory } from '../filters/';
import { type FilterConfig, type FilterResult } from '../filters/';
import { type ManagedFilter } from "../types.ts";


class FilterManager {
    // Track all created filters by ID
    private filters = new Map<string, ManagedFilter[]>();
    private disposed = false;

    /**
     * Apply filters to a Container object
     * @param targetId Unique ID for the target (e.g., 'slide-0', 'text-1')
     * @param target Container to apply filters to
     * @param configs Filter configurations
     * @param baseFilters Optional base filters to apply first (e.g., displacement filters)
     */
    applyFilters(
        targetId: string,
        target: Container,
        configs: FilterConfig[],
        baseFilters: Filter[] = []
    ): void {
        if (this.disposed) {
            throw new Error('FilterManager has been disposed');
        }

        // Clean up any existing filters for this target
        this.removeFilters(targetId);

        // Create a new array to hold filters for this target
        const targetFilters: ManagedFilter[] = [];

        // Create and apply each filter
        const filterInstances: Filter[] = [...baseFilters];

        // Create filters from configs
        configs.forEach(config => {
            if (!config.enabled) return;

            try {
                // Create the filter using the factory
                const result = FilterFactory.createFilter(config);

                // Store the filter with its target and config
                targetFilters.push({
                    target,
                    result,
                    config
                });

                // Add to the filter instances array - result.filter is the actual PixiJS Filter instance
                filterInstances.push(result.filter);
            } catch (error) {
                console.error(`Failed to create filter ${config.type}:`, error);
            }
        });

        // Apply all filters to the target
        target.filters = filterInstances;

        // Store in our tracking map
        this.filters.set(targetId, targetFilters);
    }

    /**
     * Remove and clean up filters for a specific target
     * @param targetId ID of the target to clean up
     */
    removeFilters(targetId: string): void {
        if (!this.filters.has(targetId)) return;

        const targetFilters = this.filters.get(targetId)!;

        // Clean up each filter
        targetFilters.forEach(({ target, result }) => {
            // Reset the filter first
            result.reset();

            // Call the dispose function if it exists
            if ('dispose' in result && typeof result.dispose === 'function') {
                result.dispose();
            }

            // Remove filter from target
            if (target.filters) {
                target.filters = target.filters.filter((f: Filter) => f !== result.filter);
            }
        });

        // Remove from our tracking
        this.filters.delete(targetId);
    }

    /**
     * Update filter intensities for a target
     * @param targetId ID of the target
     * @param active Whether filters should be active
     * @param forceUpdate Force update even if active state hasn't changed
     */
    updateIntensities(targetId: string, active: boolean, forceUpdate = false): void {
        if (!this.filters.has(targetId)) return;

        const targetFilters = this.filters.get(targetId)!;

        targetFilters.forEach(({ result, config }) => {
            if (active) {
                // Activate the filter with configured intensity
                result.updateIntensity(config.intensity);
            } else {
                // Reset the filter to inactive state
                result.reset();
            }
        });
    }

    /**
     * Check if a target has active filters
     * @param targetId ID of the target
     * @returns Boolean indicating if target has filters
     */
    hasFilters(targetId: string): boolean {
        return this.filters.has(targetId) && this.filters.get(targetId)!.length > 0;
    }

    /**
     * Get filter count for a target
     * @param targetId ID of the target
     * @returns Number of filters applied to the target
     */
    getFilterCount(targetId: string): number {
        return this.filters.has(targetId) ? this.filters.get(targetId)!.length : 0;
    }

    /**
     * Reset all filters to inactive state
     */
    resetAllFilters(): void {
        this.filters.forEach(targetFilters => {
            targetFilters.forEach(({ result }) => {
                result.reset();
            });
        });
    }

    /**
     * Clean up all filters and remove from targets
     */
    dispose(): void {
        if (this.disposed) return;

        // Clean up each target's filters
        this.filters.forEach((targetFilters, targetId) => {
            this.removeFilters(targetId);
        });

        // Clear the tracking map
        this.filters.clear();
        this.disposed = true;
    }
}

export default FilterManager;