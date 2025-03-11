import { useEffect, useRef, useCallback, type RefObject } from 'react';
import { Application, Container, Text, TextStyle, Sprite } from 'pixi.js';
import { gsap } from 'gsap';
import { type TextPair } from '../types';
import ResourceManager from '../managers/ResourceManager';

// Development environment check
const isDevelopment = import.meta.env?.MODE === 'development';

// Default font fallbacks
const DEFAULT_TITLE_FONT = 'Georgia, Times, "Times New Roman", serif';
const DEFAULT_SUBTITLE_FONT = 'Helvetica, Arial, sans-serif';

// Type for event callback to match ResourceManager's expected type
type EventCallback = EventListenerOrEventListenerObject;

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
 * Hook to create and manage text containers for slide titles and subtitles
 * Fully optimized with:
 * - Batch resource management
 * - Efficient resource tracking
 * - Comprehensive error handling
 * - Optimized for performance
 * - SSR compatibility
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

    // Track component mount state
    const isMountedRef = useRef<boolean>(true);

    // Track active animations for cleanup
    const activeAnimationsRef = useRef<gsap.core.Tween[]>([]);

    // Cancel flag for async operations
    const cancellationRef = useRef<{ isCancelled: boolean }>({ isCancelled: false });

    /**
     * Clean up active animations
     */
    const cleanupActiveAnimations = useCallback(() => {
        try {
            const animations = activeAnimationsRef.current;
            animations.forEach(animation => {
                if (animation && animation.isActive()) {
                    animation.kill();
                }
            });
            activeAnimationsRef.current = [];
        } catch (error) {
            if (isDevelopment) {
                console.error('Error cleaning up text container animations:', error);
            }
        }
    }, []);

    /**
     * Helper function to prepare font family string for PIXI.js
     * PIXI.js needs custom fonts to be properly available in the DOM
     *
     * @param fontStack - Font family string from props
     * @param defaultStack - Default font stack to use if none provided
     * @returns Processed font family string
     */
    const prepareFontFamily = useCallback((fontStack?: string, defaultStack = DEFAULT_TITLE_FONT): string => {
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
    }, []);

    /**
     * Parse a font stack string into individual font names
     *
     * @param fontStack - Font family string
     * @returns Array of font names
     */
    const parseFontStack = useCallback((fontStack: string): string[] => {
        if (!fontStack) return [];

        try {
            // Split by commas and clean up each font name
            return fontStack
                .split(',')
                .map(font => {
                    // Remove quotes and trim whitespace
                    return font
                        .replace(/^["'\s]+|["'\s]+$/g, '') // Remove quotes and spaces at the start/end
                        .trim();
                })
                .filter(Boolean); // Remove any empty entries
        } catch (error) {
            if (isDevelopment) {
                console.warn('Error parsing font stack:', error);
            }
            return [];
        }
    }, []);

    /**
     * Memoized function to create a text element with optimized tracking
     */
    const createText = useCallback((
        content: string,
        style: TextStyle,
        anchorX = 0.5,
        anchorY = 0,
        x = 0,
        y = 0
    ): Text => {
        try {
            // Create text with content and style
            const text = new Text({ text: content, style });

            // Set positioning
            text.anchor.set(anchorX, anchorY);
            text.position.set(x, y);

            // Track with ResourceManager if available
            if (resourceManager) {
                resourceManager.trackDisplayObject(text);
            }

            return text;
        } catch (error) {
            if (isDevelopment) {
                console.error('Error creating text element:', error);
            }

            // Create a fallback text element in case of error
            const fallbackText = new Text({ text: content || 'Text Error', style: new TextStyle() });
            fallbackText.anchor.set(anchorX, anchorY);
            fallbackText.position.set(x, y);

            return fallbackText;
        }
    }, [resourceManager]);

    /**
     * Compute responsive text sizes based on screen width
     */
    const computeResponsiveTextSizes = useCallback(() => {
        try {
            const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

            return {
                titleSize: isMobile ? mobileTextTitleSize : textTitleSize,
                subtitleSize: isMobile ? mobileTextSubTitleSize : textSubTitleSize,
                subtitleOffset: isMobile ? mobileTextSubTitleOffsetTop : textSubTitleOffsetTop
            };
        } catch (error) {
            if (isDevelopment) {
                console.error('Error computing responsive text sizes:', error);
            }

            // Return default values in case of error
            return {
                titleSize: textTitleSize,
                subtitleSize: textSubTitleSize,
                subtitleOffset: textSubTitleOffsetTop
            };
        }
    }, [
        textTitleSize,
        mobileTextTitleSize,
        textSubTitleSize,
        mobileTextSubTitleSize,
        textSubTitleOffsetTop,
        mobileTextSubTitleOffsetTop
    ]);

    /**
     * Set up interactivity for text containers with gsap animations
     * Properly tracks all resources and handles errors
     */
    const setupInteractivity = useCallback((
        textContainer: Container,
        titleText: Text
    ) => {
        try {
            // Only set up if button mode is enabled
            if (!buttonMode) return;

            // Set interactivity properties
            textContainer.eventMode = 'static'; // Modern PIXI.js interaction system
            textContainer.cursor = 'pointer';

            // Event handlers with appropriate error handling
            const handlePointerOver = () => {
                try {
                    // Kill any active animation first
                    activeAnimationsRef.current.forEach(tween => {
                        if (tween && tween.isActive()) {
                            tween.kill();
                        }
                    });

                    // Create hover animation
                    const hoverTween = gsap.to(titleText.scale, {
                        x: 1.1,
                        y: 1.1,
                        duration: 0.2
                    });

                    // Store animation reference
                    activeAnimationsRef.current.push(hoverTween);

                    // Track with ResourceManager
                    if (resourceManager) {
                        resourceManager.trackAnimation(hoverTween);
                    }
                } catch (error) {
                    if (isDevelopment) {
                        console.error('Error in pointer over handler:', error);
                    }
                }
            };

            const handlePointerOut = () => {
                try {
                    // Kill any active animation first
                    activeAnimationsRef.current.forEach(tween => {
                        if (tween && tween.isActive()) {
                            tween.kill();
                        }
                    });

                    // Create hover out animation
                    const hoverOutTween = gsap.to(titleText.scale, {
                        x: 1,
                        y: 1,
                        duration: 0.2
                    });

                    // Store animation reference
                    activeAnimationsRef.current.push(hoverOutTween);

                    // Track with ResourceManager
                    if (resourceManager) {
                        resourceManager.trackAnimation(hoverOutTween);
                    }
                } catch (error) {
                    if (isDevelopment) {
                        console.error('Error in pointer out handler:', error);
                    }
                }
            };

            const handlePointerDown = () => {
                try {
                    // Skip if component is unmounting
                    if (!isMountedRef.current) return;

                    // Move to next slide if clicked
                    const nextIndex = (currentIndex.current + 1) % slidesRef.current.length;

                    // Dispatch custom event for navigation
                    window.dispatchEvent(
                        new CustomEvent('slideChange', { detail: { nextIndex } })
                    );
                } catch (error) {
                    if (isDevelopment) {
                        console.error('Error in pointer down handler:', error);
                    }
                }
            };

            // Register event listeners
            if (resourceManager) {
                // Batch registration with ResourceManager
                const listeners = new Map<string, EventCallback[]>();
                listeners.set('pointerover', [handlePointerOver]);
                listeners.set('pointerout', [handlePointerOut]);
                listeners.set('pointerdown', [handlePointerDown]);

                // Register all listeners in one batch operation
                resourceManager.addEventListenerBatch(textContainer, listeners);
            } else {
                // Regular event registration
                textContainer.on('pointerover', handlePointerOver);
                textContainer.on('pointerout', handlePointerOut);
                textContainer.on('pointerdown', handlePointerDown);
            }
        } catch (error) {
            if (isDevelopment) {
                console.error('Error setting up text container interactivity:', error);
            }
        }
    }, [currentIndex, slidesRef, resourceManager, buttonMode]);

    /**
     * Create and update text containers
     */
    const createOrUpdateTextContainers = useCallback(() => {
        // Skip during server-side rendering
        if (typeof window === 'undefined') return;

        // Skip if component is unmounting
        if (cancellationRef.current.isCancelled || !isMountedRef.current) return;

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
                    // Cleanup animations related to this container
                    cleanupActiveAnimations();

                    // Remove from parent with check
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

            // Collect objects for batch processing
            const containersToAdd: Container[] = [];
            const containerReferences: Container[] = [];

            // Create text containers for each text pair
            texts.forEach((textPair, index) => {
                try {
                    // Skip if cancelled
                    if (cancellationRef.current.isCancelled) return;

                    const [title, subtitle] = textPair;
                    const textContainer = new Container();
                    textContainer.x = app.screen.width / 2;
                    textContainer.y = app.screen.height / 2;

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

                    // Add to collection for batch processing
                    containersToAdd.push(textContainer);
                    containerReferences.push(textContainer);
                } catch (error) {
                    if (isDevelopment) {
                        console.error(`Error creating text container for index ${index}:`, error);
                    }
                }
            });

            // If we have containers to add and we're not cancelled
            if (containersToAdd.length > 0 && !cancellationRef.current.isCancelled) {
                // Batch add containers to stage
                containersToAdd.forEach(container => {
                    stage.addChild(container);
                });

                // Batch track with ResourceManager if available
                if (resourceManager) {
                    resourceManager.trackDisplayObjectBatch(containersToAdd);
                }

                // Store references
                textContainersRef.current = containerReferences;

                if (isDevelopment) {
                    console.log(`Created ${containersToAdd.length} text containers`);
                }
            }
        } catch (error) {
            if (isDevelopment) {
                console.error('Error creating text containers:', error);
            }
        }
    }, [
        appRef,
        slidesRef,
        texts,
        textTitleColor,
        textTitleLetterspacing,
        textSubTitleColor,
        textSubTitleLetterspacing,
        buttonMode,
        createText,
        setupInteractivity,
        computeResponsiveTextSizes,
        resourceManager,
        cleanupActiveAnimations
    ]);

    // Process fonts once on initialization
    useEffect(() => {
        // Reset cancellation flag
        cancellationRef.current.isCancelled = false;

        try {
            // Process and prepare font families
            const titleFontFamily = prepareFontFamily(textTitleFontFamily, DEFAULT_TITLE_FONT);
            const subtitleFontFamily = prepareFontFamily(textSubTitleFontFamily, DEFAULT_SUBTITLE_FONT);

            // Store processed fonts
            fontsRef.current = { titleFontFamily, subtitleFontFamily };

            if (isDevelopment) {
                console.log('Processed text container fonts:', { titleFontFamily, subtitleFontFamily });
            }
        } catch (error) {
            if (isDevelopment) {
                console.error('Error processing fonts:', error);
            }
        }

        // Clear cancellation flag on unmount
        return () => {
            cancellationRef.current.isCancelled = true;
        };
    }, [textTitleFontFamily, textSubTitleFontFamily, prepareFontFamily]);

    // Create text containers
    useEffect(() => {
        // Skip during server-side rendering
        if (typeof window === 'undefined') return;

        // Reset mount state
        isMountedRef.current = true;

        // Create text containers
        createOrUpdateTextContainers();

        // Cleanup on unmount
        return () => {
            // Update mounted state immediately
            isMountedRef.current = false;

            // Set cancellation flag
            cancellationRef.current.isCancelled = true;

            // Clean up animations
            cleanupActiveAnimations();
        };
    }, [
        appRef,
        slidesRef,
        texts,
        textTitleColor,
        textTitleLetterspacing,
        textSubTitleColor,
        textSubTitleLetterspacing,
        buttonMode,
        createOrUpdateTextContainers,
        cleanupActiveAnimations
    ]);

    /**
     * Update text containers on screen resize
     * Handles all positioning and style updates
     */
    const updateTextContainersForSize = useCallback(() => {
        try {
            if (!appRef.current || !textContainersRef.current.length || !sliderRef.current) return;

            const containerWidth = sliderRef.current.clientWidth || 0;
            const containerHeight = sliderRef.current.clientHeight || 0;

            if (isDevelopment) {
                console.log(`Resizing text containers to ${containerWidth}x${containerHeight}`);
            }

            // Get responsive text sizes
            const { titleSize, subtitleSize, subtitleOffset } = computeResponsiveTextSizes();

            // Use processed fonts from ref
            const { titleFontFamily, subtitleFontFamily } = fontsRef.current;

            // Prepare collections for batch processing
            const objectsToTrack: Container[] = [];

            // Update each text container's position and text styles
            textContainersRef.current.forEach(container => {
                // Skip if container is invalid
                if (!container || container.destroyed) return;

                // Update container position
                container.x = containerWidth / 2;
                container.y = containerHeight / 2;

                // Add container to tracking batch
                objectsToTrack.push(container);

                // Update title text
                if (container.children[0] && container.children[0] instanceof Text) {
                    const titleText = container.children[0] as Text;

                    // Create a new style object to avoid shared reference issues
                    titleText.style = new TextStyle({
                        ...titleText.style,
                        fontSize: titleSize,
                        fontFamily: titleFontFamily
                    });

                    // Add text to tracking batch
                    objectsToTrack.push(titleText);
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

                    // Add text to tracking batch
                    objectsToTrack.push(subText);
                }

                // Re-center pivot after text updates
                container.pivot.y = container.height / 2;
            });

            // Batch track all updated objects
            if (resourceManager && objectsToTrack.length > 0) {
                resourceManager.trackDisplayObjectBatch(objectsToTrack);
            }
        } catch (error) {
            if (isDevelopment) {
                console.error('Error updating text containers for resize:', error);
            }
        }
    }, [
        appRef,
        sliderRef,
        textContainersRef,
        computeResponsiveTextSizes,
        resourceManager
    ]);

    // Handle window resize for text containers with debouncing
    useEffect(() => {
        // Skip during server-side rendering
        if (typeof window === 'undefined') return;

        // Skip if essential refs are missing
        if (!appRef.current || !sliderRef.current) return;

        /**
         * Handle resize events with debouncing
         */
        const handleResize = () => {
            try {
                // Clear existing timeout
                if (resizeTimerRef.current !== null) {
                    if (resourceManager) {
                        resourceManager.clearTimeout(resizeTimerRef.current);
                    } else {
                        window.clearTimeout(resizeTimerRef.current);
                    }
                    resizeTimerRef.current = null;
                }

                // Create new timeout for debouncing
                const timeoutFn = () => {
                    if (isMountedRef.current && !cancellationRef.current.isCancelled) {
                        updateTextContainersForSize();
                    }
                    resizeTimerRef.current = null;
                };

                // Set timeout using ResourceManager if available
                if (resourceManager) {
                    resizeTimerRef.current = resourceManager.setTimeout(timeoutFn, 100);
                } else {
                    resizeTimerRef.current = window.setTimeout(timeoutFn, 100);
                }
            } catch (error) {
                if (isDevelopment) {
                    console.error('Error in resize handler:', error);
                }
            }
        };

        // Register event listener
        if (resourceManager) {
            const listeners = new Map<string, EventCallback[]>();
            listeners.set('resize', [handleResize]);
            resourceManager.addEventListenerBatch(window, listeners);
        } else {
            window.addEventListener('resize', handleResize);
        }

        // Initial sizing
        handleResize();

        // Cleanup on unmount
        return () => {
            // Remove event listener if ResourceManager not used
            if (!resourceManager) {
                window.removeEventListener('resize', handleResize);
            }

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
        updateTextContainersForSize,
        resourceManager
    ]);

    return {
        textContainers: textContainersRef.current,
        updateTextContainers: updateTextContainersForSize
    };
};

export default useTextContainers;