import { useEffect, useRef, useState, type RefObject } from 'react';
import type { KineticSliderProps } from '../types';
import ResourceManager from '../managers/ResourceManager';

/**
 * Custom hook to initialize and manage the PixiJS slider
 */
export const usePixiSlider = (
    sliderRef: RefObject<HTMLDivElement>,
    canvasContainerRef: RefObject<HTMLDivElement>,
    props: KineticSliderProps,
    resourceManager?: ResourceManager | null
) => {
    // Track initialization status
    const [isInitializing, setIsInitializing] = useState(false);
    const [isInitialized, setIsInitialized] = useState(false);
    const [currentSlide, setCurrentSlide] = useState(0);

    // Track module imports
    const modulesRef = useRef<{
        pixi?: any;
        gsap?: any;
        hooks?: any;
    }>({});

    // Initialize the slider
    useEffect(() => {
        // Skip during server-side rendering
        if (typeof window === 'undefined' ||
            !sliderRef.current ||
            !canvasContainerRef.current ||
            isInitializing ||
            isInitialized
        ) {
            return;
        }

        const initializeSlider = async () => {
            setIsInitializing(true);

            try {
                // Import GSAP
                const gsapModule = await import('gsap');
                modulesRef.current.gsap = gsapModule.gsap;

                // Import the PixiJS Plugin for GSAP
                try {
                    const { default: PixiPlugin } = await import('gsap/PixiPlugin');
                    modulesRef.current.gsap.registerPlugin(PixiPlugin);
                } catch (error) {
                    console.warn('Could not load PixiPlugin for GSAP:', error);
                }

                // Import all hooks
                const hooks = await import('./index.ts');
                modulesRef.current.hooks = hooks;

                // Initialize the PixiJS application and setup hooks
                if (sliderRef.current && canvasContainerRef.current) {
                    const { pixiRefs, isInitialized: pixiInitialized } = hooks.usePixiApp(
                        sliderRef,
                        props.images,
                        [props.backgroundDisplacementSpriteLocation || '', props.cursorDisplacementSpriteLocation || ''],
                        resourceManager
                    );

                    if (!pixiInitialized) {
                        throw new Error('Failed to initialize PixiJS application');
                    }

                    // Setup slider components using the hooks
                    setupSliderComponents(pixiRefs, hooks, resourceManager, props);
                    setIsInitialized(true);
                }
            } catch (error) {
                console.error('Error initializing PixiJS slider:', error);
            } finally {
                setIsInitializing(false);
            }
        };

        initializeSlider();

        // No need for manual cleanup - ResourceManager will handle it
        return () => {
            // Reset states on unmount
            setIsInitializing(false);
            setIsInitialized(false);
        };
    }, [
        sliderRef.current,
        canvasContainerRef.current,
        props.images,
        resourceManager
    ]);

    // Set up the slider components using the hooks
    const setupSliderComponents = (
        pixiRefs: any,
        hooks: any,
        resourceManager?: ResourceManager | null,
        sliderProps?: KineticSliderProps
    ) => {
        if (hooks && resourceManager && sliderProps) {
            // Use the refs and perform necessary setup
            // Example of hook usage
            hooks.useSlides({
                pixi: pixiRefs,
                props: sliderProps,
                resourceManager
            });

            hooks.useTextContainers({
                pixi: pixiRefs,
                props: sliderProps,
                resourceManager
            });

            // Additional hooks could be set up similarly
            // e.g., hooks.useDisplacementEffects({...})
        }
    };

    // Handle slide navigation
    const goToNextSlide = () => {
        if (!isInitialized) return;
        setCurrentSlide((prev) => (prev + 1) % props.images.length);
    };

    const goToPrevSlide = () => {
        if (!isInitialized) return;
        setCurrentSlide((prev) => (prev - 1 + props.images.length) % props.images.length);
    };

    // Handle mouse interaction states
    const handleMouseEnter = () => {
        if (!isInitialized) return;
        // Note: Actual displacement effects are handled directly by the
        // useDisplacementEffects hook in the KineticSlider component
    };

    const handleMouseLeave = () => {
        if (!isInitialized) return;
        // Note: Actual displacement effects are handled directly by the
        // useDisplacementEffects hook in the KineticSlider component
    };

    return {
        isInitialized,
        currentSlide,
        goToNextSlide,
        goToPrevSlide,
        handleMouseEnter,
        handleMouseLeave
    };
};

export default usePixiSlider;