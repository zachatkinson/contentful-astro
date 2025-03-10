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
        if (typeof window === 'undefined' || !sliderRef.current || !canvasContainerRef.current || isInitializing || isInitialized) {
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
                        resourceManager // Pass resourceManager to usePixiApp
                    );

                    if (!pixiInitialized) {
                        throw new Error('Failed to initialize PixiJS application');
                    }

                    // Setup slider components using the hooks
                    // Pass resourceManager to all hooks that need it
                    setupSliderComponents(pixiRefs, hooks, resourceManager);
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
    }, [sliderRef.current, canvasContainerRef.current, props.images, resourceManager]);

    // Set up the slider components using the hooks
    const setupSliderComponents = (pixiRefs: any, hooks: any, resourceManager?: ResourceManager | null) => {
        // Implement the slider setup using hooks
        // This is a simplified version - you would need to adapt this to your actual hooks
    };

    // Handle slide navigation
    const goToNextSlide = () => {
        if (!isInitialized) return;
        setCurrentSlide((prev) => (prev + 1) % props.images.length);
        // Call the appropriate hook method to transition slides
    };

    const goToPrevSlide = () => {
        if (!isInitialized) return;
        setCurrentSlide((prev) => (prev - 1 + props.images.length) % props.images.length);
        // Call the appropriate hook method to transition slides
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