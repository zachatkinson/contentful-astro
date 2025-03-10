import { Texture, Filter, Application } from 'pixi.js';
import type { gsap } from 'gsap';

type DisplayObject = any; // Use a more specific type if possible in your project
type EventCallback = EventListenerOrEventListenerObject;
type Timer = ReturnType<typeof setTimeout>;

interface ResourceEntry<T> {
    resource: T;
    refCount: number;
}

/**
 * Centralized Resource Management for WebGL and Browser Resources
 */
class ResourceManager {
    // Refined resource tracking with generic typed maps
    private textures = new Map<string, ResourceEntry<Texture>>();
    private filters = new Set<Filter>();
    private displayObjects = new Set<DisplayObject>();
    private pixiApps = new Set<Application>();
    private animations = new Set<gsap.core.Tween | gsap.core.Timeline>();

    // Optimized event listener tracking
    private listeners = new Map<EventTarget, Map<string, Set<EventCallback>>>();

    // Tracked timers
    private timeouts = new Set<Timer>();
    private intervals = new Set<Timer>();

    private disposed = false;
    private unmounting = false;
    private readonly componentId: string;

    constructor(componentId: string) {
        this.componentId = componentId;
    }

    /**
     * Mark component as unmounting to prevent new resource allocations
     */
    markUnmounting(): void {
        this.unmounting = true;
    }

    /**
     * Check if the resource manager is active and can allocate resources
     */
    isActive(): boolean {
        return !this.unmounting && !this.disposed;
    }

    /**
     * Track a GSAP animation with automatic cleanup
     */
    trackAnimation<T extends gsap.core.Tween | gsap.core.Timeline>(animation: T): T {
        if (!this.isActive()) {
            animation.kill();
            return animation;
        }

        this.animations.add(animation);
        return animation;
    }

    /**
     * Stop and clean up all tracked animations
     */
    private disposeAnimations(): void {
        this.animations.forEach(animation => animation.kill());
        this.animations.clear();
    }

    /**
     * Track a texture with intelligent reference counting
     */
    trackTexture(url: string, texture: Texture): Texture {
        if (!this.isActive()) return texture;

        const entry = this.textures.get(url);
        if (entry) {
            entry.refCount++;
        } else {
            this.textures.set(url, { resource: texture, refCount: 1 });
        }
        return texture;
    }

    /**
     * Release a texture, destroying it when no longer referenced
     */
    releaseTexture(url: string): void {
        const entry = this.textures.get(url);
        if (!entry) return;

        entry.refCount--;

        if (entry.refCount <= 0) {
            try {
                entry.resource.destroy(true);
            } catch (error) {
                // Development-only logging (compatible with browser)
                if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
                    console.warn(`Failed to destroy texture: ${url}`, error);
                }
            }
            this.textures.delete(url);
        }
    }

    /**
     * Track a filter for later cleanup
     */
    trackFilter(filter: Filter): Filter {
        if (!this.isActive()) return filter;

        this.filters.add(filter);
        return filter;
    }

    /**
     * Dispose of a single filter
     */
    private disposeFilter(filter: Filter): void {
        try {
            filter.destroy();
        } catch {
            // Fallback destruction
            if (filter.enabled !== undefined) {
                filter.enabled = false;
            }
        }
        this.filters.delete(filter);
    }

    /**
     * Track a PIXI Application
     */
    trackPixiApp(app: Application): Application {
        if (!this.isActive()) {
            this.disposePixiApp(app);
            return app;
        }

        this.pixiApps.add(app);
        return app;
    }

    /**
     * Dispose of a PIXI Application
     */
    private disposePixiApp(app: Application): void {
        try {
            app.stop();

            // Remove canvas from DOM
            if (app.canvas instanceof HTMLCanvasElement) {
                app.canvas.remove();
            }

            app.destroy(true);
        } catch {}

        this.pixiApps.delete(app);
    }

    /**
     * Track a display object
     */
    trackDisplayObject<T extends DisplayObject>(displayObject: T): T {
        if (!this.isActive()) return displayObject;

        this.displayObjects.add(displayObject);
        return displayObject;
    }

    /**
     * Dispose of a display object
     */
    private disposeDisplayObject(displayObject: DisplayObject): void {
        try {
            // Remove from parent
            displayObject.parent?.removeChild(displayObject);

            // Clear and dispose filters
            if (displayObject.filters) {
                displayObject.filters.forEach((filter: Filter) =>
                    this.disposeFilter(filter)
                );
                displayObject.filters = null;
            }

            displayObject.destroy({ children: true, texture: false });
        } catch {}

        this.displayObjects.delete(displayObject);
    }

    /**
     * Add an event listener with tracking
     */
    addEventListener(
        element: EventTarget,
        eventType: string,
        callback: EventCallback
    ): void {
        if (!this.isActive()) return;

        if (!this.listeners.has(element)) {
            this.listeners.set(element, new Map());
        }

        const elementListeners = this.listeners.get(element)!;
        if (!elementListeners.has(eventType)) {
            elementListeners.set(eventType, new Set());
        }

        const callbacks = elementListeners.get(eventType)!;
        callbacks.add(callback);
        element.addEventListener(eventType, callback);
    }

    /**
     * Remove event listeners
     */
    private removeAllEventListeners(): void {
        this.listeners.forEach((eventMap, element) => {
            eventMap.forEach((callbacks, eventType) => {
                callbacks.forEach(callback =>
                    element.removeEventListener(eventType, callback)
                );
            });
        });
        this.listeners.clear();
    }

    /**
     * Create a setTimeout with tracking
     */
    setTimeout(callback: () => void, delay: number): Timer {
        if (!this.isActive()) return setTimeout(() => {}, 0);

        const timeout = setTimeout(() => {
            this.timeouts.delete(timeout);
            callback();
        }, delay);

        this.timeouts.add(timeout);
        return timeout;
    }

    /**
     * Create a setInterval with tracking
     */
    setInterval(callback: () => void, delay: number): Timer {
        if (!this.isActive()) return setInterval(() => {}, 0);

        const interval = setInterval(callback, delay);
        this.intervals.add(interval);
        return interval;
    }

    /**
     * Clear a tracked timeout
     */
    clearTimeout(id: Timer): void {
        globalThis.clearTimeout(id);
        this.timeouts.delete(id);
    }

    /**
     * Clear a tracked interval
     */
    clearInterval(id: Timer): void {
        globalThis.clearInterval(id);
        this.intervals.delete(id);
    }

    /**
     * Clear all tracked timeouts
     */
    private clearAllTimeouts(): void {
        this.timeouts.forEach(id => globalThis.clearTimeout(id));
        this.timeouts.clear();
    }

    /**
     * Clear all tracked intervals
     */
    private clearAllIntervals(): void {
        this.intervals.forEach(id => globalThis.clearInterval(id));
        this.intervals.clear();
    }

    /**
     * Clear all tracked resources
     */
    dispose(): void {
        if (this.disposed) return;

        this.disposed = true;
        this.markUnmounting();

        // Dispose resources systematically
        this.disposeAnimations();
        this.removeAllEventListeners();

        // Dispose PIXI resources
        this.pixiApps.forEach(app => this.disposePixiApp(app));
        this.pixiApps.clear();

        // Dispose display objects and filters
        this.displayObjects.forEach(obj => this.disposeDisplayObject(obj));
        this.displayObjects.clear();

        this.filters.forEach(filter => this.disposeFilter(filter));
        this.filters.clear();

        // Release textures
        this.textures.forEach((entry, url) => {
            try {
                entry.resource.destroy(true);
            } catch {}
        });
        this.textures.clear();

        // Clear timers
        this.clearAllTimeouts();
        this.clearAllIntervals();
    }

    /**
     * Get current resource statistics (useful for debugging)
     */
    getStats(): Record<string, number> {
        return {
            textures: this.textures.size,
            filters: this.filters.size,
            displayObjects: this.displayObjects.size,
            animations: this.animations.size,
            eventTargets: this.listeners.size,
            timeouts: this.timeouts.size,
            intervals: this.intervals.size,
            pixiApps: this.pixiApps.size
        };
    }
}

export default ResourceManager;