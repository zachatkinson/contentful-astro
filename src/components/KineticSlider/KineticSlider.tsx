import React, { useRef, useState } from 'react';
import styles from './KineticSlider.module.css';
import { type KineticSliderProps } from './types';
import {
    usePixiApp,
    useDisplacementEffects,
    useFilters,
    useSlides
} from './hooks';

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
    const cursorActive = useRef<boolean>(false);

    // Initialize Pixi and load assets
    const { pixiRefs, isInitialized } = usePixiApp(
        sliderRef,
        images,
        [backgroundDisplacementSpriteLocation, cursorDisplacementSpriteLocation]
    );

    // Create the params object used by hooks
    const hookParams = {
        sliderRef,
        pixi: pixiRefs,
        props: {
            images,
            texts,
            backgroundDisplacementSpriteLocation,
            cursorDisplacementSpriteLocation,
            cursorImgEffect,
            cursorTextEffect,
            cursorScaleIntensity,
            cursorMomentum,
            imagesRgbEffect,
            imagesRgbIntensity,
            textsRgbEffect,
            textsRgbIntensity,
            textTitleColor,
            textTitleSize,
            mobileTextTitleSize,
            textTitleLetterspacing,
            textSubTitleColor,
            textSubTitleSize,
            mobileTextSubTitleSize,
            textSubTitleLetterspacing,
            textSubTitleOffsetTop,
            mobileTextSubTitleOffsetTop,
            maxContainerShiftFraction,
            swipeScaleIntensity,
            transitionScaleIntensity,
            externalNav,
            navElement,
            navTextsRgbIntensity,
            buttonMode,
            imageFilters,
            textFilters
        }
    };

    // Set up displacement effects
    const {
        showDisplacementEffects,
        hideDisplacementEffects
    } = useDisplacementEffects(hookParams);

    // Set up filter effects
    const { updateFilterIntensities } = useFilters(hookParams);

    // Set up slides and transitions
    const { transitionToSlide } = useSlides(hookParams);

    // Navigation handlers
    const handleNext = () => {
        const nextIndex = (pixiRefs.currentIndex.current + 1) % pixiRefs.slides.current.length;
        transitionToSlide(nextIndex);
    };

    const handlePrev = () => {
        const prevIndex =
            (pixiRefs.currentIndex.current - 1 + pixiRefs.slides.current.length) %
            pixiRefs.slides.current.length;
        transitionToSlide(prevIndex);
    };

    // Mouse enter/leave handlers
    const handleMouseEnter = () => {
        cursorActive.current = true;
        showDisplacementEffects();
        updateFilterIntensities(true);

        // Update nav buttons if using internal navigation
        if (!externalNav && sliderRef.current) {
            const navButtons = sliderRef.current.querySelectorAll('nav button');
            navButtons.forEach((btn) => {
                gsap.killTweensOf(btn);
                gsap.to(btn, {
                    textShadow: `${navTextsRgbIntensity}px 0 0 red, -${navTextsRgbIntensity}px 0 0 blue`,
                    duration: 0.5,
                    ease: 'power2.out',
                });
            });
        }
    };

    const handleMouseLeave = () => {
        cursorActive.current = false;
        setTimeout(() => {
            hideDisplacementEffects();
            updateFilterIntensities(false);

            // Reset nav buttons if using internal navigation
            if (!externalNav && sliderRef.current) {
                const navButtons = sliderRef.current.querySelectorAll('nav button');
                navButtons.forEach((btn) => {
                    gsap.to(btn, {
                        textShadow: 'none',
                        duration: 0.5,
                        ease: 'power2.out',
                    });
                });
            }
        }, 300);
    };

    // Render component
    return (
        <div
            className={styles.kineticSlider}
            ref={sliderRef}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            {!externalNav && (
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