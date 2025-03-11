import { useEffect, useRef, type RefObject } from "react";
import { Application, Sprite, Container } from "pixi.js";
import ResourceManager from '../managers/ResourceManager';

// Development environment check
const isDevelopment = import.meta.env?.MODE === 'development';

interface ResizeHandlerProps {
    sliderRef: RefObject<HTMLDivElement | null>;
    appRef: RefObject<Application | null>;
    slidesRef: RefObject<Sprite[]>;
    textContainersRef: RefObject<Container[]>;
    backgroundDisplacementSpriteRef: RefObject<Sprite | null>;
    cursorDisplacementSpriteRef: RefObject<Sprite | null>;
    resourceManager?: ResourceManager | null;
    debounceTime?: number; // Optional debounce time in ms
}

/**
 * Hook to handle resize events for the slider
 * Ensures proper scaling and positioning of all visual elements when the window resizes
 */
const useResizeHandler = ({
                              sliderRef,
                              appRef,
                              slidesRef,
                              textContainersRef,
                              backgroundDisplacementSpriteRef,
                              cursorDisplacementSpriteRef,
                              resourceManager,
                              debounceTime = 100 // Default debounce of 100ms
                          }: ResizeHandlerProps) => {
    // Store debounce timer
    const resizeTimerRef = useRef<number | null>(null);

    useEffect(() => {
        // Skip during server-side rendering
        if (typeof window === 'undefined') return;

        // Skip if essential refs are missing
        if (!sliderRef.current || !appRef.current) {
            if (isDevelopment) {
                console.warn('useResizeHandler: Missing essential references');
            }
            return;
        }

        /**
         * Calculate sprite scale based on dimensions
         * @param sprite - The sprite to scale
         * @param containerWidth - Container width
         * @param containerHeight - Container height
         * @returns Whether scaling was successful
         */
        const calculateSpriteScale = (sprite: Sprite, containerWidth: number, containerHeight: number): boolean => {
            try {
                if (!sprite.texture) return false;

                const imageWidth = sprite.texture.width;
                const imageHeight = sprite.texture.height;

                // Skip invalid dimensions
                if (!imageWidth || !imageHeight || !containerWidth || !containerHeight) {
                    if (isDevelopment) {
                        console.warn('Invalid dimensions for sprite scaling', {
                            imageWidth, imageHeight, containerWidth, containerHeight
                        });
                    }
                    return false;
                }

                const imageAspect = imageWidth / imageHeight;
                const containerAspect = containerWidth / containerHeight;

                // Determine appropriate scale based on aspect ratios
                const scale = imageAspect > containerAspect
                    ? containerHeight / imageHeight
                    : containerWidth / imageWidth;

                // Apply the calculated scale
                sprite.scale.set(scale);

                // Optionally store the base scale on the sprite
                (sprite as any).baseScale = scale;

                // Center the sprite
                sprite.x = containerWidth / 2;
                sprite.y = containerHeight / 2;

                // Track the updated sprite with ResourceManager
                if (resourceManager) {
                    resourceManager.trackDisplayObject(sprite);
                }

                return true;
            } catch (error) {
                if (isDevelopment) {
                    console.error('Error calculating sprite scale:', error);
                }
                return false;
            }
        };

        /**
         * Center a container within the slider
         * @param container - The container to center
         * @param width - Container width
         * @param height - Container height
         */
        const centerContainer = (container: Container, width: number, height: number): void => {
            try {
                container.x = width / 2;
                container.y = height / 2;

                // Track the updated container with ResourceManager
                if (resourceManager) {
                    resourceManager.trackDisplayObject(container);
                }
            } catch (error) {
                if (isDevelopment) {
                    console.error('Error centering container:', error);
                }
            }
        };

        /**
         * Main resize handler function with debouncing
         */
        const handleResize = () => {
            if (!appRef.current || !sliderRef.current) return;

            try {
                const app = appRef.current;
                const containerWidth = sliderRef.current.clientWidth;
                const containerHeight = sliderRef.current.clientHeight;

                if (isDevelopment) {
                    console.log(`Resizing to: ${containerWidth}x${containerHeight}`);
                }

                // Clear any existing resize timer
                if (resizeTimerRef.current !== null) {
                    clearTimeout(resizeTimerRef.current);
                    resizeTimerRef.current = null;
                }

                // Set a new debounced timer
                const timerFn = () => {
                    try {
                        // 1. Resize the renderer
                        app.renderer.resize(containerWidth, containerHeight);

                        // 2. Update each slide's position and scale
                        slidesRef.current.forEach((sprite) => {
                            calculateSpriteScale(sprite, containerWidth, containerHeight);
                        });

                        // 3. Update each text container's position
                        textContainersRef.current.forEach((container) => {
                            centerContainer(container, containerWidth, containerHeight);
                        });

                        // 4. Update displacement sprites positions
                        if (backgroundDisplacementSpriteRef.current) {
                            centerContainer(
                                backgroundDisplacementSpriteRef.current,
                                containerWidth,
                                containerHeight
                            );
                        }

                        if (cursorDisplacementSpriteRef.current) {
                            centerContainer(
                                cursorDisplacementSpriteRef.current,
                                containerWidth,
                                containerHeight
                            );
                        }

                        if (isDevelopment) {
                            console.log('Resize handler completed successfully');
                        }
                    } catch (error) {
                        if (isDevelopment) {
                            console.error('Error in resize handler execution:', error);
                        }
                    } finally {
                        resizeTimerRef.current = null;
                    }
                };

                // Use the ResourceManager for timeout if available
                if (resourceManager) {
                    resizeTimerRef.current = resourceManager.setTimeout(timerFn, debounceTime);
                } else {
                    resizeTimerRef.current = window.setTimeout(timerFn, debounceTime);
                }
            } catch (error) {
                if (isDevelopment) {
                    console.error('Error handling resize:', error);
                }
            }
        };

        // Add event listener
        window.addEventListener("resize", handleResize);

        // Call handleResize once to set initial values
        handleResize();

        // Cleanup function
        return () => {
            window.removeEventListener("resize", handleResize);

            // Clear any pending resize timer
            if (resizeTimerRef.current !== null) {
                if (resourceManager) {
                    resourceManager.clearTimeout(resizeTimerRef.current);
                } else {
                    clearTimeout(resizeTimerRef.current);
                }
                resizeTimerRef.current = null;
            }
        };
    }, [
        sliderRef,
        appRef,
        slidesRef,
        textContainersRef,
        backgroundDisplacementSpriteRef,
        cursorDisplacementSpriteRef,
        resourceManager,
        debounceTime
    ]);

    // No return value needed as this hook just sets up the resize handler
};

export default useResizeHandler;