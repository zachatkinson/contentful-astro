import React, { useRef, useState, useEffect } from 'react';
import styles from './KineticSlider.module.css';
import { type KineticSliderProps } from './types';
import { Application, Sprite, Container, DisplacementFilter } from 'pixi.js';

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
const KineticSlider: React.FC<KineticSliderProps> = ({
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

                // Add canvas to DOM
                if (sliderRef.current) {
                    sliderRef.current.appendChild(app.canvas);
                }

                // Store reference
                appRef.current = app;

                // Create main container
                const stage = new Container();
                app.stage.addChild(stage);

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
                appRef.current.destroy(true);
                appRef.current = null;
                setIsAppReady(false);
            }
        };
    }, [sliderRef.current, assetsLoaded]);

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

    // Apply hooks only when appRef is available and ready
    useEffect(() => {
        // Skip if app is not initialized
        if (!appRef.current || !isAppReady) return;

        // Update current index ref when state changes
        currentIndexRef.current = currentSlideIndex;
    }, [appRef.current, currentSlideIndex, isAppReady]);

    // Use displacement effects
    const { showDisplacementEffects, hideDisplacementEffects } = useDisplacementEffects({
        sliderRef,
        pixi: pixiRefs,
        props: hookProps
    });

    // Use filters
    const { updateFilterIntensities } = useFilters({
        sliderRef,
        pixi: pixiRefs,
        props: hookProps
    });

    // Use slides and get transition function
    const { transitionToSlide } = useSlides({
        sliderRef,
        pixi: pixiRefs,
        props: hookProps
    });

    // Use text containers
    useTextContainers({
        sliderRef,
        appRef,
        slidesRef,
        textContainersRef,
        currentIndex: currentIndexRef,
        buttonMode,
        textsRgbEffect: false, // Removed legacy prop, we'll rely on textFilters
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
        textSubTitleFontFamily
    });

    // Use mouse tracking
    useMouseTracking({
        sliderRef,
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

    // Navigation functions
    const handleNext = () => {
        if (!appRef.current || !isAppReady || slidesRef.current.length === 0) return;
        const nextIndex = (currentSlideIndex + 1) % slidesRef.current.length;
        transitionToSlide(nextIndex);
        setCurrentSlideIndex(nextIndex);
    };

    const handlePrev = () => {
        if (!appRef.current || !isAppReady || slidesRef.current.length === 0) return;
        const prevIndex = (currentSlideIndex - 1 + slidesRef.current.length) % slidesRef.current.length;
        transitionToSlide(prevIndex);
        setCurrentSlideIndex(prevIndex);
    };

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

    // Mouse enter handler
    const handleMouseEnter = () => {
        if (!isAppReady) return;
        cursorActiveRef.current = true;
        showDisplacementEffects();
        updateFilterIntensities(true);
        setIsInteracting(true);
    };

    // Mouse leave handler
    const handleMouseLeave = () => {
        if (!isAppReady) return;
        cursorActiveRef.current = false;
        hideDisplacementEffects();
        updateFilterIntensities(false);
        setIsInteracting(false);
    };

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

export default KineticSlider;