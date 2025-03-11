import { useEffect, useRef, useCallback, type RefObject } from 'react';
import { Application, Container, Text, TextStyle, Sprite } from 'pixi.js';
import { gsap } from 'gsap';
import { type TextPair } from '../types';
import { parseFontStack } from '../utils/fontUtils';
import ResourceManager from '../managers/ResourceManager';

// Development environment check
const isDevelopment = import.meta.env?.MODE === 'development';

// Default font fallbacks
const DEFAULT_TITLE_FONT = 'Georgia, Times, "Times New Roman", serif';
const DEFAULT_SUBTITLE_FONT = 'Helvetica, Arial, sans-serif';

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

    try {
        // Parse the font stack to get the first (primary) font
        const fonts = parseFontStack(fontStack);
        if (!fonts.length) return defaultStack;

        // Return the full original font stack to maintain fallbacks
        return fontStack;
    } catch (error) {
        if (isDevelopment) {
            console.warn('Error parsing font stack:', error);
        }
        return defaultStack;
    }
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
    // Resize timer for debouncing
    const resizeTimerRef = useRef<number | null>(null);

    // Store processed fonts
    const fontsRef = useRef({
        titleFontFamily: DEFAULT_TITLE_FONT,
        subtitleFontFamily: DEFAULT_SUBTITLE_FONT
    });

    // Memoized function to create a text element
    const createText = useCallback((
        content: string,
        style: TextStyle,
        anchorX = 0.5,
        anchorY = 0,
        x = 0,
        y = 0
    ): Text => {
        const text = new Text({ text: content, style });
        text.anchor.set(anchorX, anchorY);
        text.position.set(x, y);

        // Track with ResourceManager if available
        if (resourceManager) {
            resourceManager.trackDisplayObject(text);
        }

        return text;
    }, [resourceManager]);

    // Compute responsive text sizes
    const computeResponsiveTextSizes = useCallback(() => {
        const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

        return {
            titleSize: isMobile ? mobileTextTitleSize : textTitleSize,
            subtitleSize: isMobile ? mobileTextSubTitleSize : textSubTitleSize,
            subtitleOffset: isMobile ? mobileTextSubTitleOffsetTop : textSubTitleOffsetTop
        };
    }, [
        textTitleSize,
        mobileTextTitleSize,
        textSubTitleSize,
        mobileTextSubTitleSize,
        textSubTitleOffsetTop,
        mobileTextSubTitleOffsetTop
    ]);

    // Process fonts once on initialization
    useEffect(() => {
        // Process and prepare font families
        const titleFontFamily = prepareFontFamily(textTitleFontFamily, DEFAULT_TITLE_FONT);
        const subtitleFontFamily = prepareFontFamily(textSubTitleFontFamily, DEFAULT_SUBTITLE_FONT);

        // Store processed fonts
        fontsRef.current = { titleFontFamily, subtitleFontFamily };

        if (isDevelopment) {
            console.log('Processed text container fonts:', { titleFontFamily, subtitleFontFamily });
        }
    }, [textTitleFontFamily, textSubTitleFontFamily]);

    // Create text containers
    useEffect(() => {
        // Skip during server-side rendering
        if (typeof window === 'undefined') return;

        // Validate required refs and data
        if (!appRef.current || !slidesRef.current.length || !texts.length) {
            if (isDevelopment) {
                console.log('useTextContainers: Missing required refs or data, deferring initialization');
            }
            return;
        }

        try {
            const app = appRef.current;
            const stage = app.stage.children[0] as Container || app.stage;

            // Clear existing text containers with proper cleanup
            textContainersRef.current.forEach(container => {
                try {
                    if (container.parent) {
                        container.parent.removeChild(container);
                    }

                    // Manually clean up event listeners if button mode was enabled
                    if (buttonMode) {
                        container.removeAllListeners();
                    }
                } catch (error) {
                    if (isDevelopment) {
                        console.warn('Error removing text container:', error);
                    }
                }
            });
            textContainersRef.current = [];

            // Get responsive text sizes
            const { titleSize, subtitleSize, subtitleOffset } = computeResponsiveTextSizes();

            // Use processed fonts from ref
            const { titleFontFamily, subtitleFontFamily } = fontsRef.current;

            // Create text containers for each text pair
            texts.forEach((textPair, index) => {
                try {
                    const [title, subtitle] = textPair;
                    const textContainer = new Container();
                    textContainer.x = app.screen.width / 2;
                    textContainer.y = app.screen.height / 2;

                    // Track the container with ResourceManager
                    if (resourceManager) {
                        resourceManager.trackDisplayObject(textContainer);
                    }

                    // Create title text style
                    const titleStyle = new TextStyle({
                        fill: textTitleColor,
                        fontSize: titleSize,
                        letterSpacing: textTitleLetterspacing,
                        fontWeight: 'bold',
                        align: 'center',
                        fontFamily: titleFontFamily
                    });

                    // Create title text
                    const titleText = createText(title, titleStyle);

                    // Create subtitle text style
                    const subtitleStyle = new TextStyle({
                        fill: textSubTitleColor,
                        fontSize: subtitleSize,
                        letterSpacing: textSubTitleLetterspacing,
                        align: 'center',
                        fontFamily: subtitleFontFamily
                    });

                    // Create subtitle text with position calculated from title
                    const subText = createText(
                        subtitle,
                        subtitleStyle,
                        0.5,
                        0,
                        0,
                        titleText.height + subtitleOffset
                    );

                    // Add texts to container
                    textContainer.addChild(titleText, subText);

                    // Center the container vertically
                    textContainer.pivot.y = textContainer.height / 2;

                    // Set initial state - only show the first container
                    textContainer.alpha = index === 0 ? 1 : 0;
                    textContainer.visible = index === 0;

                    // Enable button mode if specified
                    if (buttonMode) {
                        setupInteractivity(textContainer, titleText);
                    }

                    // Add to stage and store reference
                    stage.addChild(textContainer);
                    textContainersRef.current.push(textContainer);
                } catch (error) {
                    if (isDevelopment) {
                        console.error(`Error creating text container for index ${index}:`, error);
                    }
                }
            });
        } catch (error) {
            if (isDevelopment) {
                console.error('Error creating text containers:', error);
            }
        }
    }, [
        appRef.current,
        texts,
        textTitleColor,
        textTitleLetterspacing,
        textSubTitleColor,
        textSubTitleLetterspacing,
        buttonMode,
        createText,
        computeResponsiveTextSizes,
        resourceManager
    ]);

    // Setup interactivity for text containers
    const setupInteractivity = useCallback((textContainer: Container, titleText: Text) => {
        try {
            textContainer.eventMode = 'static'; // Modern PIXI.js interaction system
            textContainer.cursor = 'pointer';

            // Hover animations
            textContainer.on('pointerover', () => {
                const hoverTween = gsap.to(titleText.scale, {
                    x: 1.1,
                    y: 1.1,
                    duration: 0.2
                });

                // Track the animation
                if (resourceManager) {
                    resourceManager.trackAnimation(hoverTween);
                }
            });

            textContainer.on('pointerout', () => {
                const hoverOutTween = gsap.to(titleText.scale, {
                    x: 1,
                    y: 1,
                    duration: 0.2
                });

                // Track the animation
                if (resourceManager) {
                    resourceManager.trackAnimation(hoverOutTween);
                }
            });

            textContainer.on('pointerdown', () => {
                // Move to next slide if clicked
                const nextIndex = (currentIndex.current + 1) % slidesRef.current.length;

                // Dispatch a custom event that can be caught by other components
                window.dispatchEvent(
                    new CustomEvent('slideChange', { detail: { nextIndex } })
                );
            });
        } catch (error) {
            if (isDevelopment) {
                console.error('Error setting up text container interactivity:', error);
            }
        }
    }, [currentIndex, slidesRef, resourceManager]);

    // Handle window resize for text containers with debouncing
    useEffect(() => {
        // Skip during server-side rendering
        if (typeof window === 'undefined') return;

        if (!appRef.current || !sliderRef.current) return;

        const handleResize = () => {
            // Clear existing timeout
            if (resizeTimerRef.current !== null) {
                if (resourceManager) {
                    resourceManager.clearTimeout(resizeTimerRef.current);
                } else {
                    window.clearTimeout(resizeTimerRef.current);
                }
                resizeTimerRef.current = null;
            }

            // Create debounced resize handler
            const debouncedResize = () => {
                try {
                    if (!appRef.current || !textContainersRef.current.length) return;

                    const containerWidth = sliderRef.current?.clientWidth || 0;
                    const containerHeight = sliderRef.current?.clientHeight || 0;

                    if (isDevelopment) {
                        console.log(`Resizing text containers to ${containerWidth}x${containerHeight}`);
                    }

                    // Get responsive text sizes
                    const { titleSize, subtitleSize, subtitleOffset } = computeResponsiveTextSizes();

                    // Use processed fonts from ref
                    const { titleFontFamily, subtitleFontFamily } = fontsRef.current;

                    // Update each text container's position and text styles
                    textContainersRef.current.forEach(container => {
                        container.x = containerWidth / 2;
                        container.y = containerHeight / 2;

                        // Update title text
                        if (container.children[0] && container.children[0] instanceof Text) {
                            const titleText = container.children[0] as Text;

                            // Create a new style object to avoid shared reference issues
                            titleText.style = new TextStyle({
                                ...titleText.style,
                                fontSize: titleSize,
                                fontFamily: titleFontFamily
                            });

                            // Re-track the text object after style updates
                            if (resourceManager) {
                                resourceManager.trackDisplayObject(titleText);
                            }
                        }

                        // Update subtitle text
                        if (container.children[1] && container.children[1] instanceof Text) {
                            const subText = container.children[1] as Text;

                            // Create a new style object to avoid shared reference issues
                            subText.style = new TextStyle({
                                ...subText.style,
                                fontSize: subtitleSize,
                                fontFamily: subtitleFontFamily
                            });

                            // Update position after title is updated
                            if (container.children[0] instanceof Text) {
                                const titleText = container.children[0] as Text;
                                subText.y = titleText.height + subtitleOffset;
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
                } catch (error) {
                    if (isDevelopment) {
                        console.error('Error during text container resize:', error);
                    }
                } finally {
                    resizeTimerRef.current = null;
                }
            };

            // Set timeout using ResourceManager if available
            if (resourceManager) {
                resizeTimerRef.current = resourceManager.setTimeout(debouncedResize, 100);
            } else {
                resizeTimerRef.current = window.setTimeout(debouncedResize, 100);
            }
        };

        window.addEventListener('resize', handleResize);

        // Initial sizing
        handleResize();

        return () => {
            window.removeEventListener('resize', handleResize);

            // Clear any pending timeout
            if (resizeTimerRef.current !== null) {
                if (resourceManager) {
                    resourceManager.clearTimeout(resizeTimerRef.current);
                } else {
                    window.clearTimeout(resizeTimerRef.current);
                }
                resizeTimerRef.current = null;
            }
        };
    }, [
        sliderRef,
        appRef,
        textContainersRef,
        computeResponsiveTextSizes,
        resourceManager
    ]);

    return {
        textContainers: textContainersRef.current
    };
};

export default useTextContainers;