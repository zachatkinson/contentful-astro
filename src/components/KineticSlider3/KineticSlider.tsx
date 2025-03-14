import React, { useRef, useState, useEffect, useCallback } from 'react';
import styles from './KineticSlider.module.css';
import { type KineticSliderProps } from './types';
import { Application, Sprite, Container, DisplacementFilter } from 'pixi.js';
import ResourceManager from './managers/ResourceManager';
import {AtlasManager} from './managers/AtlasManager';

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
import {UpdateType} from "./managers/UpdateTypes.ts";
import RenderScheduler from "./managers/RenderScheduler.ts";

/**
 * Creates an interactive image slider with various displacement and transition effects
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

                                                          // Cursor displacement sizing options
                                                          cursorDisplacementSizing = 'natural',
                                                          cursorDisplacementWidth,
                                                          cursorDisplacementHeight,

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
                                                          textFilters,

                                                          // Atlas configuration
                                                          slidesAtlas = 'slides-atlas',
                                                          effectsAtlas = 'effects-atlas',

                                                          useEffectsAtlas = false,
                                                          useSlidesAtlas = false



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

    // Create AtlasManager instance
    const atlasManagerRef = useRef<AtlasManager | null>(null);

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

    // Initialize ResourceManager and AtlasManager on mount
    useEffect(() => {
        const componentId = `kinetic-slider-${Math.random().toString(36).substring(2, 9)}`;

        // Initialize ResourceManager
        resourceManagerRef.current = new ResourceManager(componentId);

        // Initialize AtlasManager with resource manager
        atlasManagerRef.current = new AtlasManager({
            debug: true,
            preferAtlas: true,
            cacheFrameTextures: true,
            basePath: '/atlas'
        }, resourceManagerRef.current);

        return () => {
            // Mark as unmounting to prevent new resource allocation
            if (resourceManagerRef.current) {
                console.log("Component unmounting - disposing all resources");
                resourceManagerRef.current.markUnmounting();
                // Dispose all tracked resources
                resourceManagerRef.current.dispose();
                resourceManagerRef.current = null;
            }

            // Clean up atlas manager
            if (atlasManagerRef.current) {
                atlasManagerRef.current.dispose();
                atlasManagerRef.current = null;
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
        cursorDisplacementSizing,
        cursorDisplacementWidth,
        cursorDisplacementHeight,
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
        textFilters,
        slidesAtlas,
        effectsAtlas
    };

    // Enhanced hook params with resource and atlas managers
    const hookParams = {
        sliderRef,
        pixi: pixiRefs,
        props: hookProps,
        resourceManager: resourceManagerRef.current,
        atlasManager: atlasManagerRef.current
    };

    // Use displacement effects
    const { showDisplacementEffects, hideDisplacementEffects } = useDisplacementEffects({
        sliderRef,
        bgDispFilterRef,
        cursorDispFilterRef,
        backgroundDisplacementSpriteRef,
        cursorDisplacementSpriteRef,
        appRef,
        backgroundDisplacementSpriteLocation,
        cursorDisplacementSpriteLocation,
        cursorImgEffect,
        cursorScaleIntensity,
        cursorDisplacementSizing,
        cursorDisplacementWidth,
        cursorDisplacementHeight,
        resourceManager: resourceManagerRef.current,
        atlasManager: atlasManagerRef.current || undefined,
        effectsAtlas,
        useEffectsAtlas
    });

    // Use filters - call this before any references to its returned functions
    const { updateFilterIntensities, resetAllFilters } = useFilters(hookParams);

    // Preload assets including fonts and atlases
    useEffect(() => {
        if (typeof window === 'undefined' || !isClient) return;

        const loadAssets = async () => {
            try {
                console.log("Preloading assets and fonts...");

                // Preload atlases first
                if (atlasManagerRef.current) {
                    // Load the slides atlas
                    if (slidesAtlas) {
                        await atlasManagerRef.current.loadAtlas(
                            slidesAtlas,
                            `/atlas/${slidesAtlas}.json`,
                            `/atlas/${slidesAtlas}.png`
                        );
                    }

                    // Load the effects atlas
                    if (effectsAtlas) {
                        await atlasManagerRef.current.loadAtlas(
                            effectsAtlas,
                            `/atlas/${effectsAtlas}.json`,
                            `/atlas/${effectsAtlas}.png`
                        );
                    }
                }

                // Then preload any remaining assets (as fallback)
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
        textSubTitleFontFamily,
        slidesAtlas,
        effectsAtlas
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
                    resourceManagerRef.current.trackPixiApp(app);
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
        defaultCursorFilterScale: 10,
        resourceManager: resourceManagerRef.current
    });



    /**
     * Handles transition to the next slide
     * Updates state and reapplies effects after transition in a batched manner
     */
    const handleNext = useCallback(() => {
        if (!appRef.current || !isAppReady || slidesRef.current.length === 0) return;

        const nextIndex = (currentSlideIndex + 1) % slidesRef.current.length;
        const componentId = 'slider-' + (sliderRef.current?.id || Math.random().toString(36).substring(2, 9));
        const scheduler = RenderScheduler.getInstance();

        // Schedule slide transition with critical priority
        scheduler.scheduleTypedUpdate(
            componentId,
            UpdateType.SLIDE_TRANSITION,
            () => {
                // First transition the slide
                transitionToSlide(nextIndex);

                // If we're interacting, schedule effect reapplication
                if (isInteracting) {
                    // Use the scheduler instead of setTimeout
                    scheduler.scheduleTypedUpdate(
                        componentId,
                        UpdateType.DISPLACEMENT_EFFECT,
                        () => {
                            // Ensure displacement effects are shown
                            showDisplacementEffects();
                            // Reapply filter effects to the new slide with force update
                            updateFilterIntensities(true, true);
                        },
                        'post-transition'
                    );
                }
            }
        );

        // Update state (this is batched by React)
        setCurrentSlideIndex(nextIndex);

    }, [appRef, isAppReady, slidesRef, currentSlideIndex, transitionToSlide, isInteracting, showDisplacementEffects, updateFilterIntensities, sliderRef]);

    /**
     * Handles transition to the previous slide
     * Updates state and reapplies effects after transition in a batched manner
     */
    const handlePrev = useCallback(() => {
        if (!appRef.current || !isAppReady || slidesRef.current.length === 0) return;

        const prevIndex = (currentSlideIndex - 1 + slidesRef.current.length) % slidesRef.current.length;
        const componentId = 'slider-' + (sliderRef.current?.id || Math.random().toString(36).substring(2, 9));
        const scheduler = RenderScheduler.getInstance();

        // Schedule slide transition with critical priority
        scheduler.scheduleTypedUpdate(
            componentId,
            UpdateType.SLIDE_TRANSITION,
            () => {
                // First transition the slide
                transitionToSlide(prevIndex);

                // If we're interacting, schedule effect reapplication
                if (isInteracting) {
                    // Use the scheduler instead of setTimeout
                    scheduler.scheduleTypedUpdate(
                        componentId,
                        UpdateType.DISPLACEMENT_EFFECT,
                        () => {
                            // Ensure displacement effects are shown
                            showDisplacementEffects();
                            // Reapply filter effects to the new slide with force update
                            updateFilterIntensities(true, true);
                        },
                        'post-transition'
                    );
                }
            }
        );

        // Update state (this is batched by React)
        setCurrentSlideIndex(prevIndex);

    }, [appRef, isAppReady, slidesRef, currentSlideIndex, transitionToSlide, isInteracting, showDisplacementEffects, updateFilterIntensities, sliderRef]);

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

    /**
     * Handles mouse enter events on the slider element
     * Activates displacement effects and filter intensities in a batched manner
     */
    const handleMouseEnter = useCallback(() => {
        if (!isAppReady) return;

        // Create a unique component ID for this slider instance
        const componentId = 'slider-' + (sliderRef.current?.id || Math.random().toString(36).substring(2, 9));

        // Get the render scheduler instance
        const scheduler = RenderScheduler.getInstance();

        // Update cursor active state
        cursorActiveRef.current = true;

        // Schedule displacement effects (higher priority)
        scheduler.scheduleTypedUpdate(
            componentId,
            UpdateType.DISPLACEMENT_EFFECT,
            () => {
                showDisplacementEffects();
            }
        );

        // Schedule filter intensity updates (normal priority)
        scheduler.scheduleTypedUpdate(
            componentId,
            UpdateType.FILTER_UPDATE,
            () => {
                updateFilterIntensities(true, true);
            }
        );

        // Batch React state updates
        setIsInteracting(true);

    }, [isAppReady, showDisplacementEffects, updateFilterIntensities]);

    /**
     * Handles mouse leave events on the slider element
     * Deactivates all displacement effects and resets all filters in a batched manner
     */
    const handleMouseLeave = useCallback(() => {
        if (!isAppReady) return;

        // Create a unique component ID for this slider instance
        const componentId = 'slider-' + (sliderRef.current?.id || Math.random().toString(36).substring(2, 9));

        // Get the render scheduler instance
        const scheduler = RenderScheduler.getInstance();

        // Update cursor active state immediately
        cursorActiveRef.current = false;

        // Schedule critical reset operations first
        scheduler.scheduleTypedUpdate(
            componentId,
            UpdateType.INTERACTION_FEEDBACK, // Critical priority
            () => {
                // Ensure displacement effects are hidden
                hideDisplacementEffects();

                // Force immediate reset of all filters
                if (resetAllFilters) {
                    resetAllFilters();
                }
            }
        );

        // Schedule secondary filter updates with normal priority
        scheduler.scheduleTypedUpdate(
            componentId,
            UpdateType.FILTER_UPDATE,
            () => {
                // Update filter intensities to inactive state
                updateFilterIntensities(false);
            }
        );

        // Batch React state updates
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