import { useEffect, useState } from 'react';
import { useKineticSlider } from '../context/KineticSliderContext';

// Import all hooks - these now use context internally
import { usePixiApp } from './usePixiApp';
import { useDisplacementEffects } from './useDisplacementEffects';
import { useFilters } from './useFilters';
import { useSlides } from './useSlides';
import  useTextContainers  from './useTextContainers';
import useMouseTracking  from './useMouseTracking';
import  useIdleTimer  from './useIdleTimer';
import  useNavigation  from './useNavigation';
import  useExternalNav  from './useExternalNav';
import  useTouchSwipe  from './useTouchSwipe';
import  useMouseDrag  from './useMouseDrag';
import  useTextTilt  from './useTextTilt';
import  useResizeHandler  from './useResizeHandler';

/**
 * Main hook for KineticSlider - orchestrates all other hooks and provides a simplified API
 * Now uses the KineticSlider context for state management
 */
export const usePixiSlider = () => {
    // Get context values
    const {
        states,
        setters,
        actions,
        props
    } = useKineticSlider();

    // Track local initialization state
    const [hooksInitialized, setHooksInitialized] = useState(false);

    // Initialize all hooks - they now use context internally
    usePixiApp(); // Initialize PixiJS application first

    // Only initialize other hooks once the app is ready
    useEffect(() => {
        if (!states.isAppReady) return;

        // If already initialized, don't initialize again
        if (hooksInitialized) return;

        console.log('PixiJS application ready, initializing other hooks...');

        // Set hooks as initialized to prevent re-initialization
        setHooksInitialized(true);

        // Other hooks will be automatically initialized when imported
        // They don't need parameters anymore as they use context
    }, [states.isAppReady, hooksInitialized]);

    // Initialize feature hooks once basic initialization is complete
    useDisplacementEffects();
    useFilters();
    useSlides();
    useTextContainers();

    // Initialize interaction hooks
    useMouseTracking();
    useIdleTimer();
    useNavigation();
    useExternalNav();
    useTouchSwipe();
    useMouseDrag();
    useTextTilt();
    useResizeHandler();

    // Handle mouse interaction states
    const handleMouseEnter = () => {
        if (!states.isFullyInitialized) return;
        setters.setIsInteracting(true);
        actions.showEffects();
    };

    const handleMouseLeave = () => {
        if (!states.isFullyInitialized) return;
        setters.setIsInteracting(false);
        actions.hideEffects();
    };

    return {
        // Initialization states
        isInitialized: states.isFullyInitialized,
        isAppReady: states.isAppReady,

        // Current slide
        currentSlide: states.currentIndex,

        // Navigation methods
        goToNextSlide: actions.goNext,
        goToPrevSlide: actions.goPrev,

        // Mouse handlers
        handleMouseEnter,
        handleMouseLeave
    };
};

export default usePixiSlider;