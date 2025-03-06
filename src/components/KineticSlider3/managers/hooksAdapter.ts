/**
 * HooksAdapter for KineticSlider
 * Connects the existing hooks with the new optimized managers
 */
import { useRef, useEffect } from 'react';
import { Application, Container, Sprite } from 'pixi.js';

// Import managers
import TextureManager from './textureManager';
import AnimationManager from './animationManager';
import FilterManager from './filterManager';
import EventManager from './eventManager';
import PerformanceMonitor, { QualityLevel } from './performanceMonitor';

// Import original hook types
import { PixiRefs, KineticSliderProps, HookParams } from '../types';

// Combined interface for all managers
export interface ManagerRefs {
    textureManager: TextureManager;
    animationManager: AnimationManager;
    filterManager: FilterManager;
    eventManager: EventManager;
    performanceMonitor: PerformanceMonitor | null;
}

// Enhanced hook params that include managers
export interface EnhancedHookParams extends HookParams {
    managers: ManagerRefs;
    qualityLevel: QualityLevel;
}

/**
 * Create a proxy for compatibility with the original hooks
 * This allows us to use the existing hooks with the new managers
 */
export function createHookCompatProxy(
    pixiRefs: PixiRefs,
    managers: ManagerRefs,
    qualityLevel: QualityLevel
): EnhancedHookParams {
    return {
        sliderRef: pixiRefs.app, // This should be the slider DOM element ref, not app
        pixi: pixiRefs,
        props: {} as KineticSliderProps, // Will be populated before passing to hooks
        managers,
        qualityLevel
    };
}

/**
 * Hook to initialize all managers
 * @returns Object containing all initialized managers
 */
export function useManagers(appRef: React.RefObject<Application | null>): ManagerRefs | null {
    // Create refs for each manager
    const managersRef = useRef<ManagerRefs | null>(null);

    // Initialize managers
    useEffect(() => {
        // Only create managers if they don't exist
        if (managersRef.current) return;

        console.log('Initializing KineticSlider managers');

        // Create all managers
        const textureManager = new TextureManager();
        const animationManager = new AnimationManager();
        const filterManager = new FilterManager();
        const eventManager = new EventManager();

        // Initialize performance monitor if app is available
        let performanceMonitor = null;
        if (appRef.current) {
            performanceMonitor = new PerformanceMonitor(appRef.current, {
                initialQuality: QualityLevel.HIGH,
                autoAdjust: true
            });

            // Start monitoring
            performanceMonitor.start();
        }

        // Store all managers in the ref
        managersRef.current = {
            textureManager,
            animationManager,
            filterManager,
            eventManager,
            performanceMonitor
        };

        // Return cleanup function
        return () => {
            console.log('Disposing KineticSlider managers');

            // Dispose all managers in reverse order
            if (managersRef.current) {
                const { performanceMonitor, filterManager, animationManager, eventManager, textureManager } = managersRef.current;

                if (performanceMonitor) performanceMonitor.dispose();
                filterManager.dispose();
                animationManager.dispose();
                eventManager.dispose();
                textureManager.dispose();
            }

            // Clear ref
            managersRef.current = null;
        };
    }, [appRef.current]);

    return managersRef.current;
}

/**
 * Adapter for useDisplacementEffects
 * This wraps the original hook to use the new managers
 */
export function adaptedUseDisplacementEffects(
    originalHook: Function,
    params: EnhancedHookParams
): any {
    const { managers, qualityLevel } = params;

    // Get quality settings
    const qualitySettings = managers.performanceMonitor?.getQualitySettings() || {
        displacementScale: 20,
        filterQuality: 4
    };

    // Adapt the hook params to use animation manager
    const adaptedParams = {
        ...params,
        animationManager: managers.animationManager,
        qualitySettings
    };

    // Call the original hook with adapted params
    const hookResult = originalHook(adaptedParams);

    // Enhance the result with manager-specific functions
    const enhancedResult = {
        ...hookResult,
        // Add any additional functions or overrides here
    };

    return enhancedResult;
}

/**
 * Adapter for useSlides
 * This wraps the original hook to use the new managers
 */
export function adaptedUseSlides(
    originalHook: Function,
    params: EnhancedHookParams
): any {
    const { managers, qualityLevel } = params;

    // Get texture manager and animation manager
    const { textureManager, animationManager } = managers;

    // Adapt the hook params
    const adaptedParams = {
        ...params,
        textureManager,
        animationManager
    };

    // Call the original hook with adapted params
    const hookResult = originalHook(adaptedParams);

    // Enhance the result
    const enhancedResult = {
        ...hookResult,
        // Add optimized functions
        transitionToSlide: (nextIndex: number) => {
            // Replace with optimized version using animationManager
            const result = hookResult.transitionToSlide(nextIndex);

            // Return the original result for compatibility
            return result;
        }
    };

    return enhancedResult;
}

/**
 * Adapter for useFilters
 * This wraps the original hook to use the new filter manager
 */
export function adaptedUseFilters(
    originalHook: Function,
    params: EnhancedHookParams
): any {
    const { managers, qualityLevel } = params;

    // Get filter manager
    const { filterManager } = managers;

    // Adapt the hook params
    const adaptedParams = {
        ...params,
        filterManager
    };

    // Call the original hook with adapted params
    const hookResult = originalHook(adaptedParams);

    // Enhance the result
    const enhancedResult = {
        ...hookResult,
        updateFilterIntensities: (active: boolean, forceUpdate = false) => {
            // Use filter manager instead of direct implementation
            const currentIndex = params.pixi.currentIndex.current;
            const slideId = `slide-${currentIndex}`;
            const textId = `text-${currentIndex}`;

            filterManager.updateIntensities(slideId, active, forceUpdate);
            filterManager.updateIntensities(textId, active, forceUpdate);

            // Also call original for compatibility
            return hookResult.updateFilterIntensities(active, forceUpdate);
        },
        resetAllFilters: () => {
            // Use filter manager
            filterManager.resetAllFilters();

            // Also call original for compatibility
            return hookResult.resetAllFilters();
        }
    };

    return enhancedResult;
}

/**
 * Adapter for event-based hooks
 * This wraps hooks that use event listeners to use the event manager
 */
export function adaptedUseEventHook(
    originalHook: Function,
    params: EnhancedHookParams,
    hookName: string
): any {
    const { managers } = params;
    const { eventManager } = managers;

    // Adapt the hook params
    const adaptedParams = {
        ...params,
        eventManager
    };

    // Call the original hook with adapted params
    const hookResult = originalHook(adaptedParams);

    // For hooks that don't return anything, just return the original result
    return hookResult;
}