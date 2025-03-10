// src/components/KineticSlider3/managers/ResourceManager.ts

import { Texture, Filter, Application } from 'pixi.js';
import type { gsap } from 'gsap';

/**
 * ResourceManager for KineticSlider
 * Centralized tracking and disposal of all WebGL resources, animations, events, and timers
 */
class ResourceManager {
    private textures = new Map<string, { texture: Texture, refCount: number }>();
    private filters = new Set<Filter>();
    private displayObjects = new Set<any>(); // Use any for Container/Sprite/etc.
    private pixiApps = new Set<Application>();
    private animations = new Set<gsap.core.Tween | gsap.core.Timeline>();
    // Fixed: Use proper types for event listeners
    private listeners = new Map<EventTarget, Map<string, Set<EventListenerOrEventListenerObject>>>();
    private timeouts = new Set<number>();
    private intervals = new Set<number>();
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
     * Check if the resource manager is in unmounting or disposed state
     */
    isActive(): boolean {
        return !this.unmounting && !this.disposed;
    }

    /**
     * Track a GSAP animation for proper cleanup
     */
    trackAnimation(animation: gsap.core.Tween | gsap.core.Timeline): gsap.core.Tween | gsap.core.Timeline {
        if (!this.isActive()) {
            animation.kill();
            return animation;
        }

        this.animations.add(animation);
        return animation;
    }

    /**
     * Stop and clean up all tracked GSAP animations
     */
    disposeAnimations(): void {
        if (this.animations.size > 0) {
            console.log(`[ResourceManager:${this.componentId}] Disposing ${this.animations.size} animations`);
        }

        this.animations.forEach(animation => {
            animation.kill();
        });
        this.animations.clear();
    }

    /**
     * Track a texture with reference counting
     */
    trackTexture(url: string, texture: Texture): Texture {
        if (!this.isActive()) {
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
     * Track a filter for later cleanup
     */
    trackFilter(filter: Filter): Filter {
        if (!this.isActive()) {
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
     * Track a PIXI.Application instance for proper cleanup
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
     * Properly dispose a PIXI.Application instance
     */
    disposePixiApp(app: Application): void {
        if (!app) return;

        try {
            // Stop the render loop
            app.stop();

            // Remove the canvas from DOM if it exists
            if (app.canvas instanceof HTMLCanvasElement) {
                const parent = app.canvas.parentNode;
                if (parent) {
                    parent.removeChild(app.canvas);
                }
            }

            // Destroy the application
            // Fixed: Use correct destroy options for PIXI v8
            app.destroy(true, {
                children: true,
                texture: false // Don't destroy textures here - we handle those separately
            });
        } catch (error) {
            console.warn(`[ResourceManager:${this.componentId}] Error disposing PIXI application:`, error);
        }

        this.pixiApps.delete(app);
    }

    /**
     * Track a display object (Sprite, Container, etc.)
     */
    trackDisplayObject<T>(displayObject: T): T {
        if (!this.isActive()) {
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
            // Use correct options for PIXI v8
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
     * Track an event listener for proper cleanup
     * Generic version that preserves event types
     */
    addEventListener<K extends keyof HTMLElementEventMap>(
        element: HTMLElement,
        eventType: K,
        callback: (this: HTMLElement, ev: HTMLElementEventMap[K]) => any,
        options?: boolean | AddEventListenerOptions
    ): void;
    addEventListener<K extends keyof DocumentEventMap>(
        element: Document,
        eventType: K,
        callback: (this: Document, ev: DocumentEventMap[K]) => any,
        options?: boolean | AddEventListenerOptions
    ): void;
    addEventListener<K extends keyof WindowEventMap>(
        element: Window,
        eventType: K,
        callback: (this: Window, ev: WindowEventMap[K]) => any,
        options?: boolean | AddEventListenerOptions
    ): void;
    addEventListener<K extends keyof ElementEventMap>(
        element: Element,
        eventType: K,
        callback: (this: Element, ev: ElementEventMap[K]) => any,
        options?: boolean | AddEventListenerOptions
    ): void;
    /**
     * Track an event listener for proper cleanup
     * Generic EventTarget version for custom events
     */
    addEventListener(
        element: EventTarget,
        eventType: string,
        callback: EventListenerOrEventListenerObject,
        options?: boolean | AddEventListenerOptions
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

        element.addEventListener(eventType, callback, options);
    }

    /**
     * Remove a specific tracked event listener
     * Generic version that preserves event types
     */
    removeEventListener<K extends keyof HTMLElementEventMap>(
        element: HTMLElement,
        eventType: K,
        callback: (this: HTMLElement, ev: HTMLElementEventMap[K]) => any,
        options?: boolean | EventListenerOptions
    ): void;
    removeEventListener<K extends keyof DocumentEventMap>(
        element: Document,
        eventType: K,
        callback: (this: Document, ev: DocumentEventMap[K]) => any,
        options?: boolean | EventListenerOptions
    ): void;
    removeEventListener<K extends keyof WindowEventMap>(
        element: Window,
        eventType: K,
        callback: (this: Window, ev: WindowEventMap[K]) => any,
        options?: boolean | EventListenerOptions
    ): void;
    removeEventListener<K extends keyof ElementEventMap>(
        element: Element,
        eventType: K,
        callback: (this: Element, ev: ElementEventMap[K]) => any,
        options?: boolean | EventListenerOptions
    ): void;
    removeEventListener(
        element: EventTarget,
        eventType: string,
        callback: EventListenerOrEventListenerObject,
        options?: boolean | EventListenerOptions
    ): void {
        if (!this.listeners.has(element)) return;

        const elementListeners = this.listeners.get(element)!;
        if (!elementListeners.has(eventType)) return;

        const callbacks = elementListeners.get(eventType)!;
        if (!callbacks.has(callback)) return;

        element.removeEventListener(eventType, callback, options);
        callbacks.delete(callback);

        // Clean up empty sets and maps
        if (callbacks.size === 0) {
            elementListeners.delete(eventType);
        }

        if (elementListeners.size === 0) {
            this.listeners.delete(element);
        }
    }

    /**
     * Remove all tracked event listeners
     */
    removeAllEventListeners(): void {
        this.listeners.forEach((eventMap, element) => {
            eventMap.forEach((callbacks, eventType) => {
                callbacks.forEach(callback => {
                    element.removeEventListener(eventType, callback);
                });
            });
        });
        this.listeners.clear();
    }

    /**
     * Create a timeout with automatic tracking
     */
    setTimeout(callback: () => void, delay: number): number {
        if (!this.isActive()) return 0;

        const id = window.setTimeout(() => {
            this.timeouts.delete(id);
            callback();
        }, delay);

        this.timeouts.add(id);
        return id;
    }

    /**
     * Clear a tracked timeout
     */
    clearTimeout(id: number): void {
        window.clearTimeout(id);
        this.timeouts.delete(id);
    }

    /**
     * Clear all tracked timeouts
     */
    clearAllTimeouts(): void {
        this.timeouts.forEach(id => {
            window.clearTimeout(id);
        });
        this.timeouts.clear();
    }

    /**
     * Create an interval with automatic tracking
     */
    setInterval(callback: () => void, delay: number): number {
        if (!this.isActive()) return 0;

        const id = window.setInterval(() => {
            callback();
        }, delay);

        this.intervals.add(id);
        return id;
    }

    /**
     * Clear a tracked interval
     */
    clearInterval(id: number): void {
        window.clearInterval(id);
        this.intervals.delete(id);
    }

    /**
     * Clear all tracked intervals
     */
    clearAllIntervals(): void {
        this.intervals.forEach(id => {
            window.clearInterval(id);
        });
        this.intervals.clear();
    }

    /**
     * Dispose all resources
     */
    dispose(): void {
        if (this.disposed) return;

        this.disposed = true;
        this.markUnmounting();

        console.log(`[ResourceManager:${this.componentId}] Disposing all resources:`);
        console.log(`- Timeouts: ${this.timeouts.size}`);
        console.log(`- Intervals: ${this.intervals.size}`);
        console.log(`- Animations: ${this.animations.size}`);
        console.log(`- Event listeners: ${this.listeners.size} elements`);
        console.log(`- PIXI Apps: ${this.pixiApps.size}`);
        console.log(`- Display objects: ${this.displayObjects.size}`);
        console.log(`- Filters: ${this.filters.size}`);
        console.log(`- Textures: ${this.textures.size}`);

        // Clear all timeouts and intervals first
        this.clearAllTimeouts();
        this.clearAllIntervals();

        // Kill all GSAP animations
        this.disposeAnimations();

        // Remove all event listeners
        this.removeAllEventListeners();

        // Dispose PIXI applications
        this.pixiApps.forEach(app => {
            this.disposePixiApp(app);
        });
        this.pixiApps.clear();

        // Dispose display objects
        this.displayObjects.forEach(displayObject => {
            this.disposeDisplayObject(displayObject);
        });
        this.displayObjects.clear();

        // Dispose filters
        this.filters.forEach(filter => {
            this.disposeFilter(filter);
        });
        this.filters.clear();

        // Dispose textures
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

    /**
     * Get current resource statistics for debugging
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