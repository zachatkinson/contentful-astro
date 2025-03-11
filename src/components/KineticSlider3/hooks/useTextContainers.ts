import { useEffect, type RefObject } from 'react';
import { Application, Container, Text, TextStyle, Sprite } from 'pixi.js';
import { gsap } from 'gsap';
import { type TextPair } from '../types';
import { parseFontStack } from '../utils/fontUtils';
import ResourceManager from '../managers/ResourceManager';

interface UseTextContainersProps {
    sliderRef: RefObject<HTMLDivElement | null>;
    appRef: RefObject<Application | null>;
    slidesRef: RefObject<Sprite[]>;
    textContainersRef: RefObject<Container[]>;
    currentIndex: RefObject<number>;
    buttonMode: boolean;
    texts: TextPair[];
    textTitleColor: string;
    textTitleSize: number;
    mobileTextTitleSize: number;
    textTitleLetterspacing: number;
    textTitleFontFamily?: string;
    textSubTitleColor: string;
    textSubTitleSize: number;
    mobileTextSubTitleSize: number;
    textSubTitleLetterspacing: number;
    textSubTitleOffsetTop: number;
    mobileTextSubTitleOffsetTop: number;
    textSubTitleFontFamily?: string;
    resourceManager?: ResourceManager | null;
}

// Default font fallbacks
const DEFAULT_TITLE_FONT = 'Georgia, Times, "Times New Roman", serif';
const DEFAULT_SUBTITLE_FONT = 'Helvetica, Arial, sans-serif';

/**
 * Helper function to prepare font family string for PIXI.js
 * PIXI.js needs custom fonts to be properly available in the DOM
 *
 * @param fontStack - Font family string from props
 * @param defaultStack - Default font stack to use if none provided
 * @returns Processed font family string
 */
function prepareFontFamily(fontStack?: string, defaultStack = DEFAULT_TITLE_FONT): string {
    if (!fontStack) return defaultStack;

    // Parse the font stack to get the first (primary) font
    const fonts = parseFontStack(fontStack);
    if (!fonts.length) return defaultStack;

    // Return the full original font stack to maintain fallbacks
    return fontStack;
}

/**
 * Hook to create and manage text containers for slide titles and subtitles
 */
const useTextContainers = ({
                               sliderRef,
                               appRef,
                               slidesRef,
                               textContainersRef,
                               currentIndex,
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
                               resourceManager
                           }: UseTextContainersProps) => {
    // Create text containers
    useEffect(() => {
        // Skip during server-side rendering
        if (typeof window === 'undefined') return;

        if (!appRef.current || !slidesRef.current.length || !texts.length) return;

        const app = appRef.current;
        const stage = app.stage.children[0];

        // Clear existing text containers
        textContainersRef.current.forEach(container => {
            if (container.parent) {
                container.parent.removeChild(container);
            }
        });
        textContainersRef.current = [];

        // Compute responsive text sizes
        const isMobile = window.innerWidth < 768;
        const computedTitleSize = isMobile ? mobileTextTitleSize : textTitleSize;
        const computedSubTitleSize = isMobile ? mobileTextSubTitleSize : textSubTitleSize;
        const computedSubTitleOffset = isMobile ? mobileTextSubTitleOffsetTop : textSubTitleOffsetTop;

        // Process and prepare font families
        const titleFontFamily = prepareFontFamily(textTitleFontFamily, DEFAULT_TITLE_FONT);
        const subtitleFontFamily = prepareFontFamily(textSubTitleFontFamily, DEFAULT_SUBTITLE_FONT);

        console.log('Creating text containers with fonts:', { titleFontFamily, subtitleFontFamily });

        // Create new text containers for each text pair
        texts.forEach((textPair, index) => {
            const [title, subtitle] = textPair;
            const textContainer = new Container();
            textContainer.x = app.screen.width / 2;
            textContainer.y = app.screen.height / 2;

            // Track the container with ResourceManager if available
            if (resourceManager) {
                resourceManager.trackDisplayObject(textContainer);
            }

            // Create title text
            const titleStyle = new TextStyle({
                fill: textTitleColor,
                fontSize: computedTitleSize,
                letterSpacing: textTitleLetterspacing,
                fontWeight: 'bold',
                align: 'center',
                fontFamily: titleFontFamily
            });
            const titleText = new Text({ text: title, style: titleStyle });
            titleText.anchor.set(0.5, 0);
            titleText.y = 0;

            // Track the text object with ResourceManager if available
            if (resourceManager) {
                resourceManager.trackDisplayObject(titleText);
            }

            // Create subtitle text
            const subtitleStyle = new TextStyle({
                fill: textSubTitleColor,
                fontSize: computedSubTitleSize,
                letterSpacing: textSubTitleLetterspacing,
                align: 'center',
                fontFamily: subtitleFontFamily
            });
            const subText = new Text({text: subtitle, style: subtitleStyle});
            subText.anchor.set(0.5, 0);
            subText.y = titleText.height + computedSubTitleOffset;

            // Track the text object with ResourceManager if available
            if (resourceManager) {
                resourceManager.trackDisplayObject(subText);
            }

            textContainer.addChild(titleText, subText);
            textContainer.pivot.y = textContainer.height / 2;

            // Set initial state - only show the first container
            textContainer.alpha = index === 0 ? 1 : 0;

            // IMPORTANT: Set visibility property for all but the first text container
            textContainer.visible = index === 0;

            // Enable button mode if specified
            if (buttonMode) {
                textContainer.eventMode = 'static'; // Modern PIXI.js interaction system
                textContainer.cursor = 'pointer';

                textContainer.on('pointerover', () => {
                    gsap.to(titleText.scale, { x: 1.1, y: 1.1, duration: 0.2 });
                });

                textContainer.on('pointerout', () => {
                    gsap.to(titleText.scale, { x: 1, y: 1, duration: 0.2 });
                });

                textContainer.on('pointerdown', () => {
                    // Move to next slide if clicked
                    const nextIndex = (currentIndex.current + 1) % slidesRef.current.length;
                    // Dispatch a custom event that can be caught by other components
                    window.dispatchEvent(new CustomEvent('slideChange', { detail: { nextIndex } }));
                });
            }

            // Add to stage and store reference
            stage.addChild(textContainer);
            textContainersRef.current.push(textContainer);
        });

        // No manual cleanup necessary as ResourceManager will handle it
        // during component unmount
    }, [
        appRef.current,
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
        buttonMode,
        resourceManager
    ]);

    // Handle window resize for text containers
    useEffect(() => {
        // Skip during server-side rendering
        if (typeof window === 'undefined') return;

        if (!appRef.current || !sliderRef.current) return;

        const handleResize = () => {
            if (!appRef.current || !textContainersRef.current.length) return;

            const containerWidth = sliderRef.current?.clientWidth || 0;
            const containerHeight = sliderRef.current?.clientHeight || 0;
            const isMobile = window.innerWidth < 768;

            // Compute updated text sizes
            const computedTitleSize = isMobile ? mobileTextTitleSize : textTitleSize;
            const computedSubTitleSize = isMobile ? mobileTextSubTitleSize : textSubTitleSize;
            const computedSubTitleOffset = isMobile ? mobileTextSubTitleOffsetTop : textSubTitleOffsetTop;

            // Process and prepare font families
            const titleFontFamily = prepareFontFamily(textTitleFontFamily, DEFAULT_TITLE_FONT);
            const subtitleFontFamily = prepareFontFamily(textSubTitleFontFamily, DEFAULT_SUBTITLE_FONT);

            // Update each text container's position and text styles
            textContainersRef.current.forEach(container => {
                container.x = containerWidth / 2;
                container.y = containerHeight / 2;

                // Update title text
                if (container.children[0] && container.children[0] instanceof Text) {
                    const titleText = container.children[0] as Text;
                    titleText.style.fontSize = computedTitleSize;
                    titleText.style.fontFamily = titleFontFamily;

                    // Force text to update
                    titleText.text = titleText.text; // This triggers an internal update

                    // Re-track the text object after style updates
                    if (resourceManager) {
                        resourceManager.trackDisplayObject(titleText);
                    }
                }

                // Update subtitle text
                if (container.children[1] && container.children[1] instanceof Text) {
                    const subText = container.children[1] as Text;
                    subText.style.fontSize = computedSubTitleSize;
                    subText.style.fontFamily = subtitleFontFamily;

                    // Force text to update
                    subText.text = subText.text; // This triggers an internal update

                    // Update position after title is updated
                    if (container.children[0] instanceof Text) {
                        const titleText = container.children[0] as Text;
                        subText.y = titleText.height + computedSubTitleOffset;
                    }

                    // Re-track the text object after style and position updates
                    if (resourceManager) {
                        resourceManager.trackDisplayObject(subText);
                    }
                }

                // Re-center pivot after text updates
                container.pivot.y = container.height / 2;

                // Re-track the container after position and pivot updates
                if (resourceManager) {
                    resourceManager.trackDisplayObject(container);
                }
            });
        };

        window.addEventListener('resize', handleResize);

        // Initial sizing
        handleResize();

        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, [
        sliderRef.current,
        appRef.current,
        textTitleSize,
        mobileTextTitleSize,
        textSubTitleSize,
        mobileTextSubTitleSize,
        textSubTitleOffsetTop,
        mobileTextSubTitleOffsetTop,
        textTitleFontFamily,
        textSubTitleFontFamily,
        resourceManager
    ]);

    return {
        textContainers: textContainersRef.current
    };
};

export default useTextContainers;