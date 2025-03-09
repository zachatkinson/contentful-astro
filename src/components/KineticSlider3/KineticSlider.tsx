import React, { useRef, useState, useEffect, useCallback } from 'react';
import styles from './KineticSlider.module.css';
import { type KineticSliderProps } from './types';
import { Application, Sprite, Container, DisplacementFilter } from 'pixi.js';
import ResourceManager from './managers/ResourceManager';

// Import hooks directly
import { useDisplacementEffects } from './hooks';
import { useFilters } from './hooks';
import { useSlides } from './hooks';
import { useTextContainers } from './hooks/';
import { useMouseTracking } from './hooks/';
import { useIdleTimer } from './hooks/';
import { useNavigation } from './hooks/';
import { useExternalNav } from './hooks/';
import { useTouchSwipe } from './hooks/';
import { useMouseDrag } from './hooks/';
import { useTextTilt } from './hooks/';
import { useResizeHandler } from './hooks/';
import { loadKineticSliderDependencies } from './ImportHelpers';
import { preloadKineticSliderAssets } from './utils/assetPreload';

/**
 * KineticSlider component - Creates an interactive image slider with various effects
 */
const KineticSlider3: React.FC<KineticSliderProps> = ({
                                                          // Content sources
                                                          images = [],
                                                          texts = [],

                                                          // Displacement settings
                                                          backgroundDisplacementSpriteLocation = '/images/background-displace.jpg',
                                                          cursorDisplacementSpriteLocation = '/images/cursor-displace.png',
                                                          cursorImgEffect = true,
                                                          cursorTextEffect = true,
                                                          cursorScaleIntensity = 0.65,
                                                          cursorMomentum = 0.14,

                                                          // Text styling
                                                          textTitleColor = 'white',
                                                          textTitleSize = 64,
                                                          mobileTextTitleSize = 40,
                                                          textTitleLetterspacing = 2,
                                                          textTitleFontFamily,
                                                          textSubTitleColor = 'white',
                                                          textSubTitleSize = 24,
                                                          mobileTextSubTitleSize = 18,
                                                          textSubTitleLetterspacing = 1,
                                                          textSubTitleOffsetTop = 10,
                                                          mobileTextSubTitleOffsetTop = 5,
                                                          textSubTitleFontFamily,

                                                          // Animation settings
                                                          maxContainerShiftFraction = 0.05,
                                                          swipeScaleIntensity = 2,
                                                          transitionScaleIntensity = 30,

                                                          // Navigation settings
                                                          externalNav = false,
                                                          navElement = { prev: '.main-nav.prev', next: '.main-nav.next' },
                                                          buttonMode = false,

                                                          // Filter configurations
                                                          imageFilters,
                                                          textFilters
                                                      }) => {
    // Core references
    const sliderRef = useRef<HTMLDivElement>(null);
    const [isClient, setIsClient] = useState(false);
    const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
    const [isInteracting, setIsInteracting] = useState(false);
    const [isAppReady, setIsAppReady] = useState(false);
    const [assetsLoaded, setAssetsLoaded] = useState(false);
    const cursorActiveRef = useRef<boolean>(false);

    // Create ResourceManager instance with unique ID
    const resourceManagerRef = useRef<ResourceManager | null>(null);

    // Set up Pixi app
    const appRef = useRef<Application | null>(null);
    const slidesRef = useRef<Sprite[]>([]);
    const textContainersRef = useRef<Container[]>([]);
    const backgroundDisplacementSpriteRef = useRef<Sprite | null>(null);
    const cursorDisplacementSpriteRef = useRef<Sprite | null>(null);
    const bgDispFilterRef = useRef<DisplacementFilter | null>(null);
    const cursorDispFilterRef = useRef<DisplacementFilter | null>(null);
    const currentIndexRef = useRef<number>(0);

    // Client-side initialization
    useEffect(() => {
        setIsClient(true);
    }, []);

    // Initialize ResourceManager on mount
    useEffect(() => {
        const componentId = `kinetic-slider-${Math.random().toString(36).substring(2, 9)}`;
        resourceManagerRef.current = new ResourceManager(componentId);

        return () => {
            // Mark as unmounting to prevent new resource allocation
            if (resourceManagerRef.current) {
                console.log("Component unmounting - disposing all resources");
                resourceManagerRef.current.markUnmounting();
                // Dispose all tracked resources
                resourceManagerRef.current.dispose();
                resourceManagerRef.current = null;
            }
        };
    }, []);

    // Create a pixi refs object for hooks
    const pixiRefs = {
        app: appRef,
        slides: slidesRef,
        textContainers: textContainersRef,
        backgroundDisplacementSprite: backgroundDisplacementSpriteRef,
        cursorDisplacementSprite: cursorDisplacementSpriteRef,
        bgDispFilter: bgDispFilterRef,
        cursorDispFilter: cursorDispFilterRef,
        currentIndex: currentIndexRef
    };

    // Props object for hooks
    const hookProps = {
        images,
        texts,
        backgroundDisplacementSpriteLocation,
        cursorDisplacementSpriteLocation,
        cursorImgEffect,
        cursorTextEffect,
        cursorScaleIntensity,
        cursorMomentum,
        textTitleColor,
        textTitleSize,
        mobileTextTitleSize,
        textTitleLetterspacing,
        textTitleFontFamily,
        textSubTitleColor,
        textSubTitleSize,
        mobileTextSubTitleSize,
        textSubTitleLetterspacing,
        textSubTitleOffsetTop,
        mobileTextSubTitleOffsetTop,
        textSubTitleFontFamily,
        maxContainerShiftFraction,
        swipeScaleIntensity,
        transitionScaleIntensity,
        imageFilters,
        textFilters
    };

    // Enhanced hook params with resource manager
    const hookParams = {
        sliderRef,
        pixi: pixiRefs,
        props: hookProps,
        resourceManager: resourceManagerRef.current
    };

    // Use displacement effects
    const { showDisplacementEffects, hideDisplacementEffects } = useDisplacementEffects(hookParams);

    // Use filters - call this before any references to its returned functions
    const { updateFilterIntensities, resetAllFilters } = useFilters(hookParams);

    // Preload assets including fonts
    useEffect(() => {
        if (typeof window === 'undefined' || !isClient) return;

        const loadAssets = async () => {
            try {
                console.log("Preloading assets and fonts...");
                await preloadKineticSliderAssets(
                    images,
                    backgroundDisplacementSpriteLocation,
                    cursorDisplacementSpriteLocation,
                    textTitleFontFamily,
                    textSubTitleFontFamily
                );
                setAssetsLoaded(true);
                console.log("Assets and fonts preloaded successfully");
            } catch (error) {
                console.error("Failed to preload assets:", error);
                // Continue anyway so the component doesn't totally fail
                setAssetsLoaded(true);
            }
        };

        loadAssets();
    }, [
        isClient,
        images,
        backgroundDisplacementSpriteLocation,
        cursorDisplacementSpriteLocation,
        textTitleFontFamily,
        textSubTitleFontFamily
    ]);

    // Initialize Pixi.js application
    useEffect(() => {
        if (typeof window === 'undefined' || !sliderRef.current || appRef.current || !assetsLoaded) return;

        const initPixi = async () => {
            try {
                console.log("Loading PixiJS dependencies...");
                // Load all dependencies first
                const { gsap, pixi, pixiPlugin } = await loadKineticSliderDependencies();

                // Only register plugins in browser
                if (typeof window !== 'undefined' && pixiPlugin) {
                    // Register GSAP plugins
                    gsap.registerPlugin(pixiPlugin);

                    // Check if we have the actual plugin (not the mock)
                    if (pixiPlugin.registerPIXI) {
                        pixiPlugin.registerPIXI(pixi);
                    }
                }

                console.log("Creating Pixi.js application...");

                // Create Pixi application
                const app = new Application();
                await app.init({
                    width: sliderRef.current?.clientWidth || 800,
                    height: sliderRef.current?.clientHeight || 600,
                    backgroundAlpha: 0,
                    resizeTo: sliderRef.current || undefined,
                });

                // Track the application with the resource manager
                if (resourceManagerRef.current) {
                    resourceManagerRef.current.trackDisplayObject(app);
                }

                // Add canvas to DOM
                if (sliderRef.current) {
                    sliderRef.current.appendChild(app.canvas);
                }

                // Store reference
                appRef.current = app;

                // Create main container
                const stage = new Container();
                app.stage.addChild(stage);

                // Track the stage with the resource manager
                if (resourceManagerRef.current) {
                    resourceManagerRef.current.trackDisplayObject(stage);
                }

                // Set app as ready
                setIsAppReady(true);

                console.log("Pixi.js application initialized");
            } catch (error) {
                console.error("Failed to initialize Pixi.js application:", error);
            }
        };

        initPixi();

        // Cleanup on unmount
        return () => {
            if (appRef.current) {
                if (sliderRef.current) {
                    const canvas = sliderRef.current.querySelector('canvas');
                    if (canvas) {
                        sliderRef.current.removeChild(canvas);
                    }
                }

                // Note: We don't need to manually destroy the app here
                // as the ResourceManager will handle it during disposal
                appRef.current = null;
                setIsAppReady(false);
            }
        };
    }, [sliderRef.current, assetsLoaded]);

    // Use slides and get transition function
    const { transitionToSlide } = useSlides(hookParams);

    // Use text containers
    // Use text containers
    useTextContainers({
        sliderRef,
        appRef,
        slidesRef,
        textContainersRef,
        currentIndex: currentIndexRef,
        buttonMode,
        texts,
        textTitleColor,
        textTitleSize,
        mobileTextTitleSize,
        textTitleLetterspacing,
        textTitleFontFamily,
        textSubTitleColor,
        textSubTitleSize,
        mobileTextSubTitleSize,
        textSubTitleLetterspacing,
        textSubTitleOffsetTop,
        mobileTextSubTitleOffsetTop,
        textSubTitleFontFamily,
        resourceManager: resourceManagerRef.current
    });

    // Use mouse tracking
    useMouseTracking({
        ...hookParams,
        backgroundDisplacementSpriteRef,
        cursorDisplacementSpriteRef,
        cursorImgEffect,
        cursorMomentum
    });

    // Use idle timer
    useIdleTimer({
        sliderRef,
        cursorActive: cursorActiveRef,
        bgDispFilterRef,
        cursorDispFilterRef,
        cursorImgEffect,
        defaultBgFilterScale: 20,
        defaultCursorFilterScale: 10
    });

    // Navigation functions with effect reapplication
    const handleNext = useCallback(() => {
        if (!appRef.current || !isAppReady || slidesRef.current.length === 0) return;
        const nextIndex = (currentSlideIndex + 1) % slidesRef.current.length;

        // First transition the slide
        transitionToSlide(nextIndex);
        setCurrentSlideIndex(nextIndex);

        // If the cursor is currently over the slider (we're interacting),
        // reapply effects after a short delay to allow for transition
        if (isInteracting) {
            setTimeout(() => {
                console.log("Reapplying effects after slide change (next)");
                // Ensure displacement effects are shown
                showDisplacementEffects();
                // Reapply filter effects to the new slide with force update
                updateFilterIntensities(true, true);
            }, 100); // Short delay to allow transition to start
        }
    }, [appRef, isAppReady, slidesRef, currentSlideIndex, transitionToSlide, isInteracting, showDisplacementEffects, updateFilterIntensities]);

    const handlePrev = useCallback(() => {
        if (!appRef.current || !isAppReady || slidesRef.current.length === 0) return;
        const prevIndex = (currentSlideIndex - 1 + slidesRef.current.length) % slidesRef.current.length;

        // First transition the slide
        transitionToSlide(prevIndex);
        setCurrentSlideIndex(prevIndex);

        // If the cursor is currently over the slider (we're interacting),
        // reapply effects after a short delay to allow for transition
        if (isInteracting) {
            setTimeout(() => {
                console.log("Reapplying effects after slide change (prev)");
                // Ensure displacement effects are shown
                showDisplacementEffects();
                // Reapply filter effects to the new slide with force update
                updateFilterIntensities(true, true);
            }, 100); // Short delay to allow transition to start
        }
    }, [appRef, isAppReady, slidesRef, currentSlideIndex, transitionToSlide, isInteracting, showDisplacementEffects, updateFilterIntensities]);

    // Apply hooks only when appRef is available and ready - NOW updateFilterIntensities is defined before being referenced
    useEffect(() => {
        // Skip if app is not initialized
        if (!appRef.current || !isAppReady) return;

        // Update current index ref when state changes
        currentIndexRef.current = currentSlideIndex;

        // Note: We no longer need to handle filter updates here as they are now handled directly
        // in the navigation functions (handleNext/handlePrev)
    }, [appRef.current, currentSlideIndex, isAppReady]);

    // Use navigation
    useNavigation({
        onNext: handleNext,
        onPrev: handlePrev,
        enableKeyboardNav: true
    });

    // Use external navigation if enabled
    useExternalNav({
        externalNav,
        navElement,
        handleNext,
        handlePrev
    });

    // Use touch swipe
    useTouchSwipe({
        sliderRef,
        onSwipeLeft: handleNext,
        onSwipeRight: handlePrev
    });

    // Use mouse drag
    useMouseDrag({
        sliderRef,
        slidesRef,
        currentIndex: currentIndexRef,
        swipeScaleIntensity,
        swipeDistance: typeof window !== 'undefined' ? window.innerWidth * 0.2 : 200,
        onSwipeLeft: handleNext,
        onSwipeRight: handlePrev
    });

    // Use text tilt
    useTextTilt({
        sliderRef,
        textContainersRef,
        currentIndex: currentIndexRef,
        cursorTextEffect,
        maxContainerShiftFraction,
        bgDispFilterRef,
        cursorDispFilterRef,
        cursorImgEffect
    });

    // Use resize handler
    useResizeHandler({
        sliderRef,
        appRef,
        slidesRef,
        textContainersRef,
        backgroundDisplacementSpriteRef,
        cursorDisplacementSpriteRef
    });

    // Memoize handlers to prevent unnecessary re-renders
    const handleMouseEnter = useCallback(() => {
        if (!isAppReady) return;
        console.log("Mouse entered the slider - activating all effects");

        // Update cursor active state
        cursorActiveRef.current = true;

        // Show displacement effects first
        showDisplacementEffects();

        // Force update all filter intensities for the active slide with a slight delay
        // to ensure proper initialization and avoid filter stacking issues
        setTimeout(() => {
            console.log("Applying filters after slight delay to ensure proper initialization");
            updateFilterIntensities(true, true); // Force update to ensure proper application
        }, 50); // Short timeout to ensure displacement is applied first

        setIsInteracting(true);
    }, [isAppReady, showDisplacementEffects, updateFilterIntensities]);


    // Mouse leave handler - FIXED to ensure all effects are removed
    const handleMouseLeave = useCallback(() => {
        if (!isAppReady) return;
        console.log("Mouse left the slider - deactivating ALL effects");
        cursorActiveRef.current = false;

        // Ensure displacement effects are hidden
        hideDisplacementEffects();

        // Force immediate reset of all filters
        if (resetAllFilters) {
            resetAllFilters();
        }

        // Also ensure any transition or navigation effects are reset
        setTimeout(() => {
            // Double-check reset after a short delay to catch any lingering effects
            if (resetAllFilters) {
                resetAllFilters();
            }
            // Reset the filter intensities state
            updateFilterIntensities(false);
        }, 10);

        setIsInteracting(false);
    }, [isAppReady, hideDisplacementEffects, resetAllFilters, updateFilterIntensities]);

    // Render component
    return (
        <div
            className={styles.kineticSlider}
            ref={sliderRef}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            {/* Placeholder while loading */}
            {(!isAppReady || !assetsLoaded) && (
                <div className={styles.placeholder}>
                    <div className={styles.loadingIndicator}>
                        <div className={styles.spinner}></div>
                        <div>Loading slider...</div>
                    </div>
                </div>
            )}

            {/* Navigation buttons - only render on client and if external nav is not enabled */}
            {!externalNav && isClient && (
                <nav>
                    <button onClick={handlePrev} className={styles.prev}>
                        Prev
                    </button>
                    <button onClick={handleNext} className={styles.next}>
                        Next
                    </button>
                </nav>
            )}
        </div>
    );
};

export default KineticSlider3;