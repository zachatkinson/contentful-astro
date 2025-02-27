import React, { useRef, useState, useEffect } from 'react';
import styles from './KineticSlider.module.css';
import { type KineticSliderProps } from './types';

// Safely check if we're in a browser environment
const isBrowser = typeof window !== 'undefined';

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

                                                         // Filter settings
                                                         imagesRgbEffect = true,
                                                         imagesRgbIntensity = 15,
                                                         textsRgbEffect = true,
                                                         textsRgbIntensity = 5,

                                                         // Text styling
                                                         textTitleColor = 'white',
                                                         textTitleSize = 64,
                                                         mobileTextTitleSize = 40,
                                                         textTitleLetterspacing = 2,
                                                         textSubTitleColor = 'white',
                                                         textSubTitleSize = 24,
                                                         mobileTextSubTitleSize = 18,
                                                         textSubTitleLetterspacing = 1,
                                                         textSubTitleOffsetTop = 10,
                                                         mobileTextSubTitleOffsetTop = 5,

                                                         // Animation settings
                                                         maxContainerShiftFraction = 0.05,
                                                         swipeScaleIntensity = 2,
                                                         transitionScaleIntensity = 30,

                                                         // Navigation settings
                                                         externalNav = false,
                                                         navElement = { prev: '.main-nav.prev', next: '.main-nav.next' },
                                                         navTextsRgbIntensity = 3,
                                                         buttonMode = false,

                                                         // New filter configurations
                                                         imageFilters,
                                                         textFilters
                                                     }) => {
    // Core references
    const sliderRef = useRef<HTMLDivElement>(null);
    const canvasContainerRef = useRef<HTMLDivElement>(null);
    const [isClient, setIsClient] = useState(false);
    const [currentSlide, setCurrentSlide] = useState(0);
    const [isInteracting, setIsInteracting] = useState(false);

    // Initialize on client-side only
    useEffect(() => {
        // Mark that we're now on the client
        setIsClient(true);

        let gsap: any;
        let pixiApp: any;
        let pixiHooks: any;

        // Dynamically import the libraries only on the client side
        const loadLibraries = async () => {
            if (!isBrowser) return;

            // Import GSAP
            const gsapModule = await import('gsap');
            gsap = gsapModule.gsap;

            // Import necessary hooks
            const {
                usePixiApp,
                useDisplacementEffects,
                useFilters,
                useSlides,
                useTextContainers,
                useMouseTracking,
                useIdleTimer,
                useNavigation,
                useExternalNav,
                useTouchSwipe,
                useMouseDrag,
                useTextTilt,
                useResizeHandler
            } = await import('./hooks');

            pixiHooks = {
                usePixiApp,
                useDisplacementEffects,
                useFilters,
                useSlides,
                useTextContainers,
                useMouseTracking,
                useIdleTimer,
                useNavigation,
                useExternalNav,
                useTouchSwipe,
                useMouseDrag,
                useTextTilt,
                useResizeHandler
            };

            // Now that we have the libraries, initialize the slider
            initializeSlider();
        };

        // Initialize the slider functionality
        const initializeSlider = () => {
            if (!sliderRef.current || !gsap || !pixiHooks) return;

            // Initialize Pixi and setup the slider
            // This would contain the logic previously in your hooks

            // Here we'd use the hooks that we've imported dynamically
            // This is a placeholder - in a full implementation, you'd adapt your
            // hook system to work with this dynamic import approach
        };

        loadLibraries();

        // Cleanup function
        return () => {
            // Cleanup here
        };
    }, []);

    // Basic navigation functions
    const handleNext = () => {
        if (!isClient) return;
        setCurrentSlide((prev) => (prev + 1) % images.length);
        // In a full implementation, we would call the transition function from the hook
    };

    const handlePrev = () => {
        if (!isClient) return;
        setCurrentSlide((prev) =>
            (prev - 1 + images.length) % images.length
        );
        // In a full implementation, we would call the transition function from the hook
    };

    // Mouse enter/leave handlers
    const handleMouseEnter = () => {
        if (!isClient) return;
        setIsInteracting(true);
        // In a full implementation, we would call the showDisplacementEffects
    };

    const handleMouseLeave = () => {
        if (!isClient) return;
        setIsInteracting(false);
        // In a full implementation, we would call the hideDisplacementEffects
    };

    // Render component
    return (
        <div
            className={styles.kineticSlider}
            ref={sliderRef}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            {/* This div will contain the canvas element once Pixi initializes */}
            <div ref={canvasContainerRef} className="kinetic-canvas-container"></div>

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