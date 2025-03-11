import { useEffect, useRef, useState, type RefObject } from 'react';
import type { KineticSliderProps } from '../types';
import ResourceManager from '../managers/ResourceManager';

// Development environment check
const isDevelopment = import.meta.env?.MODE === 'development';

/**
 * Custom hook to initialize and manage the PixiJS slider
 */
export const usePixiSlider = (
    sliderRef: RefObject<HTMLDivElement>,
    canvasContainerRef: RefObject<HTMLDivElement>,
    props: KineticSliderProps,
    resourceManager?: ResourceManager | null
) => {
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

    // Initialize the slider
    useEffect(() => {
        // Skip during server-side rendering or if already initializing/initialized
        if (typeof window === 'undefined' ||
            !sliderRef.current ||
            !canvasContainerRef.current ||
            sliderState.isInitializing ||
            sliderState.isInitialized
        ) {
            return;
        }

        const initializeSlider = async () => {
            try {
                setSliderState(prev => ({ ...prev, isInitializing: true }));

                if (isDevelopment) {
                    console.log('Initializing PixiJS slider');
                }

                // Import GSAP only once
                if (!modulesRef.current.gsap) {
                    const gsapModule = await import('gsap');
                    modulesRef.current.gsap = gsapModule.gsap;

                    // Import PixiPlugin only in browser context
                    try {
                        const { default: PixiPlugin } = await import('gsap/PixiPlugin');
                        modulesRef.current.gsap.registerPlugin(PixiPlugin);
                    } catch (pluginError) {
                        if (isDevelopment) {
                            console.warn('Could not load PixiPlugin for GSAP:', pluginError);
                        }
                    }
                }

                // Import hooks only once
                if (!modulesRef.current.hooks) {
                    const hooks = await import('./index.ts');
                    modulesRef.current.hooks = hooks;
                }

                // Only proceed if the component is still mounted
                if (!sliderRef.current || !canvasContainerRef.current) {
                    throw new Error('Component unmounted during initialization');
                }

                // Initialize the PixiJS application with the cached hooks
                const hooks = modulesRef.current.hooks;
                const { pixiRefs, isInitialized: pixiInitialized } = hooks.usePixiApp(
                    sliderRef,
                    props.images,
                    [
                        props.backgroundDisplacementSpriteLocation || '',
                        props.cursorDisplacementSpriteLocation || ''
                    ],
                    resourceManager
                );

                if (!pixiInitialized) {
                    throw new Error('Failed to initialize PixiJS application');
                }

                // Setup slider components using the hooks with proper error handling
                setupSliderComponents(pixiRefs, hooks, resourceManager, props);

                setSliderState(prev => ({
                    ...prev,
                    isInitializing: false,
                    isInitialized: true
                }));

                if (isDevelopment) {
                    console.log('PixiJS slider initialized successfully');
                }
            } catch (error) {
                if (isDevelopment) {
                    console.error('Error initializing PixiJS slider:', error);
                }

                setSliderState(prev => ({
                    ...prev,
                    isInitializing: false,
                    isInitialized: false
                }));
            }
        };

        initializeSlider();

        // Cleanup function will be handled by ResourceManager
        return () => {
            // Reset state on unmount
            setSliderState({
                isInitializing: false,
                isInitialized: false,
                currentSlide: 0
            });
        };
    }, [
        sliderRef.current,
        canvasContainerRef.current,
        props.images,
        props.backgroundDisplacementSpriteLocation,
        props.cursorDisplacementSpriteLocation,
        resourceManager
    ]);

    // Setup slider components with better error handling
    const setupSliderComponents = (
        pixiRefs: any,
        hooks: any,
        resourceManager?: ResourceManager | null,
        sliderProps?: KineticSliderProps
    ) => {
        if (!hooks || !sliderProps) return;

        try {
            // Create a hook params object to share with all hooks
            const hookParams = {
                pixi: pixiRefs,
                props: sliderProps,
                resourceManager
            };

            // Setup slides with error handling
            try {
                hooks.useSlides({
                    sliderRef,
                    ...hookParams
                });
            } catch (slidesError) {
                if (isDevelopment) {
                    console.error('Error setting up slides:', slidesError);
                }
            }

            // Setup text containers with error handling
            try {
                hooks.useTextContainers({
                    sliderRef,
                    ...hookParams
                });
            } catch (textError) {
                if (isDevelopment) {
                    console.error('Error setting up text containers:', textError);
                }
            }

            // Additional hooks could be set up here with similar error handling
        } catch (error) {
            if (isDevelopment) {
                console.error('Error in setupSliderComponents:', error);
            }
        }
    };

    // Memoized navigation functions
    const goToNextSlide = () => {
        if (!sliderState.isInitialized) return;

        setSliderState(prev => ({
            ...prev,
            currentSlide: (prev.currentSlide + 1) % props.images.length
        }));
    };

    const goToPrevSlide = () => {
        if (!sliderState.isInitialized) return;

        setSliderState(prev => ({
            ...prev,
            currentSlide: (prev.currentSlide - 1 + props.images.length) % props.images.length
        }));
    };

    // Minimal interaction handlers - actual effects are handled by other hooks
    const handleMouseEnter = () => {
        // No-op as actual effects are handled by specific hooks
    };

    const handleMouseLeave = () => {
        // No-op as actual effects are handled by specific hooks
    };

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