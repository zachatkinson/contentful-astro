// src/components/KineticSlider3/managers/ResourceManager.ts

import { Texture, Filter } from 'pixi.js';

/**
 * ResourceManager for KineticSlider
 * Centralized tracking and disposal of all WebGL resources
 */
class ResourceManager {
    private textures = new Map<string, { texture: Texture, refCount: number }>();
    private filters = new Set<Filter>();
    private displayObjects = new Set<any>(); // Use any for Container/Sprite/etc.
    private disposed = false;
    private componentId: string;
    private unmounting = false;

    constructor(componentId: string) {
        this.componentId = componentId;
        console.log(`[ResourceManager:${componentId}] Initialized`);
    }

    /**
     * Mark component as unmounting to prevent new resource allocations
     */
    markUnmounting(): void {
        this.unmounting = true;
        console.log(`[ResourceManager:${this.componentId}] Marked as unmounting`);
    }

    /**
     * Track a texture with reference counting
     */
    trackTexture(url: string, texture: Texture): Texture {
        if (this.unmounting || this.disposed) {
            console.warn(`[ResourceManager:${this.componentId}] Attempted to track texture during unmount:`, url);
            return texture;
        }

        const entry = this.textures.get(url);
        if (entry) {
            entry.refCount++;
        } else {
            this.textures.set(url, { texture, refCount: 1 });
        }
        return texture;
    }

    /**
     * Release a texture reference
     */
    releaseTexture(url: string): void {
        const entry = this.textures.get(url);
        if (!entry) return;

        entry.refCount--;

        if (entry.refCount <= 0) {
            // Only destroy if not already destroyed
            if (entry.texture && !entry.texture.destroyed) {
                try {
                    // In PIXI v8, we just destroy the texture
                    entry.texture.destroy();
                } catch (e) {
                    console.warn(`[ResourceManager:${this.componentId}] Error destroying texture:`, e);
                }
            }

            this.textures.delete(url);
        }
    }

    /**
     * Track a filter
     */
    trackFilter(filter: Filter): Filter {
        if (this.unmounting || this.disposed) {
            console.warn(`[ResourceManager:${this.componentId}] Attempted to track filter during unmount`);
            return filter;
        }

        this.filters.add(filter);
        return filter;
    }

    /**
     * Safely dispose a single filter with error handling
     */
    disposeFilter(filter: Filter): void {
        if (!filter) return;

        try {
            // In PIXI v8, filters have a simpler API
            // Just call destroy() which should handle all resources
            filter.destroy();
        } catch (error) {
            console.warn(`[ResourceManager:${this.componentId}] Error disposing filter:`, error);

            // Manual cleanup as a fallback
            try {
                // Most internal properties are private in v8
                // Just set enabled to false
                filter.enabled = false;
            } catch (e) {
                // Last resort - just log and continue
                console.error(`[ResourceManager:${this.componentId}] Final cleanup attempt failed:`, e);
            }
        }

        // Remove from tracker
        this.filters.delete(filter);
    }

    /**
     * Track a display object (Sprite, Container, etc.)
     */
    trackDisplayObject<T>(displayObject: T): T {
        if (this.unmounting || this.disposed) {
            console.warn(`[ResourceManager:${this.componentId}] Attempted to track display object during unmount`);
            return displayObject;
        }

        this.displayObjects.add(displayObject);
        return displayObject;
    }

    /**
     * Clean up a display object
     */
    disposeDisplayObject(displayObject: any): void {
        if (!displayObject) return;

        try {
            // Remove from parent if it has one
            if (displayObject.parent) {
                displayObject.parent.removeChild(displayObject);
            }

            // Clear filters if any
            if (displayObject.filters && displayObject.filters.length) {
                // First remove reference to filters
                const filters = Array.isArray(displayObject.filters) ?
                    displayObject.filters : [displayObject.filters];

                // Remove filters from display object
                displayObject.filters = null;

                // Dispose each filter
                filters.forEach((filter: Filter) => {
                    if (filter) this.disposeFilter(filter);
                });
            }

            // Destroy the display object
            // In PIXI v8, the options are different
            displayObject.destroy({
                children: true,
                texture: false // Don't destroy textures here - we handle those separately
            });
        } catch (error) {
            console.warn(`[ResourceManager:${this.componentId}] Error disposing display object:`, error);
        }

        // Remove from tracker
        this.displayObjects.delete(displayObject);
    }

    /**
     * Dispose all resources
     */
    dispose(): void {
        if (this.disposed) return;

        this.disposed = true;
        this.markUnmounting();

        console.log(`[ResourceManager:${this.componentId}] Disposing all resources: ${this.textures.size} textures, ${this.filters.size} filters, ${this.displayObjects.size} display objects`);

        // First dispose display objects (higher level)
        this.displayObjects.forEach(displayObject => {
            this.disposeDisplayObject(displayObject);
        });
        this.displayObjects.clear();

        // Then dispose filters
        this.filters.forEach(filter => {
            this.disposeFilter(filter);
        });
        this.filters.clear();

        // Finally dispose textures
        this.textures.forEach((entry, url) => {
            try {
                if (entry.texture && !entry.texture.destroyed) {
                    entry.texture.destroy();
                }
            } catch (e) {
                console.warn(`[ResourceManager:${this.componentId}] Error destroying texture ${url}:`, e);
            }
        });
        this.textures.clear();

        console.log(`[ResourceManager:${this.componentId}] All resources disposed`);
    }
}

export default ResourceManager;