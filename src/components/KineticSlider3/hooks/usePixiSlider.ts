import { useEffect, useRef, useState, useCallback, type RefObject } from 'react';
import type { KineticSliderProps } from '../types';
import ResourceManager from '../managers/ResourceManager';

// Development environment check
const isDevelopment = import.meta.env?.MODE === 'development';

// Cancellation flag type
interface CancellationFlags {
    isCancelled: boolean;
}

/**
 * Custom hook to initialize and manage the PixiJS slider
 */
export const usePixiSlider = (
    sliderRef: RefObject<HTMLDivElement>,
    canvasContainerRef: RefObject<HTMLDivElement>,
    props: KineticSliderProps,
    resourceManager?: ResourceManager | null
) => {
    // Cancellation flag to prevent race conditions
    const cancellationRef = useRef<CancellationFlags>({ isCancelled: false });

    // Track initialization status with a single state
    const [sliderState, setSliderState] = useState({
        isInitializing: false,
        isInitialized: false,
        currentSlide: 0
    });

    // Track module imports with a ref to avoid re-renders
    const modulesRef = useRef<{
        gsap?: any;
        hooks?: any;
    }>({});

    // Memoized initialization function with improved error handling
    const initializeSlider = useCallback(async () => {
        // Reset cancellation flag
        cancellationRef.current.isCancelled = false;

        // Skip during server-side rendering or if already initializing/initialized
        if (
            typeof window === 'undefined' ||
            !sliderRef.current ||
            !canvasContainerRef.current ||
            sliderState.isInitializing ||
            sliderState.isInitialized
        ) {
            return false;
        }

        try {
            // Update state to show initializing
            setSliderState(prev => ({ ...prev, isInitializing: true }));

            if (isDevelopment) {
                console.log('Initializing PixiJS slider');
            }

            // Import GSAP only once with error handling
            if (!modulesRef.current.gsap) {
                const gsapModule = await import('gsap');
                modulesRef.current.gsap = gsapModule.gsap;

                try {
                    const { default: PixiPlugin } = await import('gsap/PixiPlugin');
                    modulesRef.current.gsap.registerPlugin(PixiPlugin);
                } catch (pluginError) {
                    console.warn('Could not load PixiPlugin for GSAP:', pluginError);
                }
            }

            // Check for cancellation after async operation
            if (cancellationRef.current.isCancelled) return false;

            // Import hooks only once
            if (!modulesRef.current.hooks) {
                const hooks = await import('./index.ts');
                modulesRef.current.hooks = hooks;
            }

            // Check for cancellation after async operation
            if (cancellationRef.current.isCancelled) return false;

            // Validate component is still mounted
            if (!sliderRef.current || !canvasContainerRef.current) {
                throw new Error('Component unmounted during initialization');
            }

            // Initialize the PixiJS application
            const hooks = modulesRef.current.hooks;
            const { pixiRefs, isInitialized: pixiInitialized } = await hooks.usePixiApp(
                sliderRef,
                props.images,
                [
                    props.backgroundDisplacementSpriteLocation || '',
                    props.cursorDisplacementSpriteLocation || ''
                ],
                resourceManager
            );

            // Check for cancellation after async operation
            if (cancellationRef.current.isCancelled) return false;

            // Validate Pixi initialization
            if (!pixiInitialized) {
                throw new Error('Failed to initialize PixiJS application');
            }

            // Setup slider components
            await setupSliderComponents(pixiRefs, hooks, resourceManager, props);

            // Check for cancellation after component setup
            if (cancellationRef.current.isCancelled) return false;

            // Update state to show successful initialization
            setSliderState(prev => ({
                ...prev,
                isInitializing: false,
                isInitialized: true
            }));

            if (isDevelopment) {
                console.log('PixiJS slider initialized successfully');
            }

            return true;
        } catch (error) {
            // Log error and reset state
            if (isDevelopment) {
                console.error('Error initializing PixiJS slider:', error);
            }

            setSliderState(prev => ({
                ...prev,
                isInitializing: false,
                isInitialized: false
            }));

            return false;
        }
    }, [
        sliderRef,
        canvasContainerRef,
        props.images,
        props.backgroundDisplacementSpriteLocation,
        props.cursorDisplacementSpriteLocation,
        resourceManager
    ]);

    // Memoized setup function with async support and comprehensive error handling
    const setupSliderComponents = useCallback(async (
        pixiRefs: any,
        hooks: any,
        resourceManager?: ResourceManager | null,
        sliderProps?: KineticSliderProps
    ) => {
        if (!hooks || !sliderProps) return;

        try {
            // Create a hook params object to share with all hooks
            const hookParams = {
                sliderRef,
                pixi: pixiRefs,
                props: sliderProps,
                resourceManager
            };

            // Setup slides with error handling
            try {
                await hooks.useSlides(hookParams);
            } catch (slidesError) {
                if (isDevelopment) {
                    console.error('Error setting up slides:', slidesError);
                }
            }

            // Setup text containers with error handling
            try {
                await hooks.useTextContainers(hookParams);
            } catch (textError) {
                if (isDevelopment) {
                    console.error('Error setting up text containers:', textError);
                }
            }

            // Additional hooks can be set up here with similar error handling
        } catch (error) {
            if (isDevelopment) {
                console.error('Error in setupSliderComponents:', error);
            }
        }
    }, [sliderRef]);

    // Initialize the slider
    useEffect(() => {
        // Attempt initialization
        initializeSlider();

        // Cleanup function
        return () => {
            // Set cancellation flag
            cancellationRef.current.isCancelled = true;

            // Reset state on unmount
            setSliderState({
                isInitializing: false,
                isInitialized: false,
                currentSlide: 0
            });
        };
    }, [initializeSlider]);

    // Memoized navigation functions
    const goToNextSlide = useCallback(() => {
        if (!sliderState.isInitialized) return;

        setSliderState(prev => ({
            ...prev,
            currentSlide: (prev.currentSlide + 1) % props.images.length
        }));
    }, [props.images.length]);

    const goToPrevSlide = useCallback(() => {
        if (!sliderState.isInitialized) return;

        setSliderState(prev => ({
            ...prev,
            currentSlide: (prev.currentSlide - 1 + props.images.length) % props.images.length
        }));
    }, [props.images.length]);

    // Minimal interaction handlers
    const handleMouseEnter = useCallback(() => {
        // No-op as actual effects are handled by specific hooks
    }, []);

    const handleMouseLeave = useCallback(() => {
        // No-op as actual effects are handled by specific hooks
    }, []);

    return {
        isInitialized: sliderState.isInitialized,
        isInitializing: sliderState.isInitializing,
        currentSlide: sliderState.currentSlide,
        goToNextSlide,
        goToPrevSlide,
        handleMouseEnter,
        handleMouseLeave
    };
};

export default usePixiSlider;