import { useEffect, useCallback, useState, useRef } from 'react';
import { Sprite, Container, Assets } from 'pixi.js';
import { type EnhancedSprite, type HookParams } from '../types';
import { calculateSpriteScale } from '../utils/calculateSpriteScale';
import { gsap } from 'gsap';
import ResourceManager from '../managers/ResourceManager';

// Development environment check
const isDevelopment = import.meta.env?.MODE === 'development';

// Interface for the hook's return value
interface UseSlidesResult {
    transitionToSlide: (nextIndex: number) => gsap.core.Timeline | null;
    isLoading: boolean;
    loadingProgress: number;
}

/**
 * Hook to create and manage slide sprites
 */
export const useSlides = (
    { sliderRef, pixi, props, resourceManager }: HookParams & { resourceManager?: ResourceManager | null }
): UseSlidesResult => {
    // Track loading state
    const [isLoading, setIsLoading] = useState(false);
    const [loadingProgress, setLoadingProgress] = useState(0);

    // Ref to store active transitions
    const activeTransitionRef = useRef<gsap.core.Timeline | null>(null);

    // Batch loading of assets for better performance
    useEffect(() => {
        if (!pixi.app.current || !pixi.app.current.stage) {
            if (isDevelopment) {
                console.log("App or stage not available for slides, deferring initialization");
            }
            return;
        }

        // Check if we have images to display
        if (!props.images.length) {
            if (isDevelopment) {
                console.warn("No images provided for slides");
            }
            return;
        }

        // Check if slider ref is available for dimensions
        if (!sliderRef.current) {
            if (isDevelopment) {
                console.warn("Slider reference not available, deferring slide creation");
            }
            return;
        }

        // Create a dedicated container for slides if it doesn't exist
        let slidesContainer: Container;
        try {
            const app = pixi.app.current;

            if (app.stage.children.length > 0 && app.stage.children[0] instanceof Container) {
                slidesContainer = app.stage.children[0] as Container;
            } else {
                slidesContainer = new Container();
                slidesContainer.label = 'slidesContainer';
                app.stage.addChild(slidesContainer);

                // Track container with resource manager if available
                if (resourceManager) {
                    resourceManager.trackDisplayObject(slidesContainer);
                }
            }

            // Clear existing slides with proper cleanup
            pixi.slides.current.forEach(sprite => {
                if (sprite && sprite.parent) {
                    try {
                        sprite.parent.removeChild(sprite);
                    } catch (error) {
                        if (isDevelopment) {
                            console.warn('Error removing sprite from parent:', error);
                        }
                    }
                }
            });
            pixi.slides.current = [];

            // Load slides with improved asset management
            loadSlides(slidesContainer);
        } catch (error) {
            if (isDevelopment) {
                console.error("Error setting up slides container:", error);
            }
            setIsLoading(false);
        }
    }, [pixi.app.current, props.images, resourceManager, sliderRef]);

    /**
     * Optimized batch loading of slide images
     */
    const loadSlides = async (slidesContainer: Container) => {
        if (!pixi.app.current || !sliderRef.current) return;

        try {
            setIsLoading(true);
            setLoadingProgress(0);

            if (isDevelopment) {
                console.log(`Loading ${props.images.length} slide images...`);
            }

            // Prepare the list of images to load
            const app = pixi.app.current;
            const sliderWidth = sliderRef.current.clientWidth;
            const sliderHeight = sliderRef.current.clientHeight;

            if (isDevelopment) {
                console.log(`Slider dimensions: ${sliderWidth}x${sliderHeight}`);
            }

            const imagesToLoad = props.images.filter(image => !Assets.cache.has(image));

            if (isDevelopment && imagesToLoad.length < props.images.length) {
                console.log(`Using ${props.images.length - imagesToLoad.length} cached images`);
            }

            // Add assets to a bundle for batch loading and progress tracking
            if (imagesToLoad.length > 0) {
                // Create an assets bundle
                Assets.addBundle('slider-images', imagesToLoad.reduce((acc, image, index) => {
                    acc[`slide-${index}`] = image;
                    return acc;
                }, {} as Record<string, string>));

                // Load the bundle with progress tracking
                await Assets.loadBundle('slider-images', (progress) => {
                    setLoadingProgress(progress * 100);
                });
            }

            // Create sprites for each image
            props.images.forEach((image, index) => {
                try {
                    // Get texture from cache
                    const texture = Assets.get(image);

                    // Track texture with resource manager if available
                    if (resourceManager) {
                        resourceManager.trackTexture(image, texture);
                    }

                    // Create the sprite
                    const sprite = new Sprite(texture) as EnhancedSprite;
                    sprite.anchor.set(0.5);
                    sprite.x = app.screen.width / 2;
                    sprite.y = app.screen.height / 2;

                    // Set initial state - only show the first slide
                    sprite.alpha = index === 0 ? 1 : 0;
                    sprite.visible = index === 0;

                    // Calculate and apply scale
                    try {
                        const { scale, baseScale } = calculateSpriteScale(
                            texture.width,
                            texture.height,
                            sliderWidth,
                            sliderHeight
                        );

                        sprite.scale.set(scale);
                        sprite.baseScale = baseScale;
                    } catch (scaleError) {
                        if (isDevelopment) {
                            console.warn(`Error calculating scale for slide ${index}:`, scaleError);
                        }

                        // Fallback scaling
                        sprite.scale.set(1);
                        sprite.baseScale = 1;
                    }

                    // Track the sprite with resource manager if available
                    if (resourceManager) {
                        resourceManager.trackDisplayObject(sprite);
                    }

                    // Add to container and store reference
                    slidesContainer.addChild(sprite);
                    pixi.slides.current.push(sprite);

                    if (isDevelopment) {
                        console.log(`Created slide ${index} for ${image}`);
                    }
                } catch (error) {
                    if (isDevelopment) {
                        console.error(`Error creating slide for ${image}:`, error);
                    }
                }
            });

            setIsLoading(false);
            setLoadingProgress(100);
        } catch (error) {
            if (isDevelopment) {
                console.error("Error loading slide images:", error);
            }
            setIsLoading(false);
        }
    };

    /**
     * Enhanced transition function with better resource management
     */
    const transitionToSlide = useCallback((nextIndex: number): gsap.core.Timeline | null => {
        // Check if slider reference is available
        if (!sliderRef.current) {
            if (isDevelopment) {
                console.warn("Slider reference not available for transition");
            }
            return null;
        }

        // Validate inputs
        if (!pixi.slides.current.length) {
            if (isDevelopment) {
                console.warn("No slides available for transition");
            }
            return null;
        }

        if (nextIndex < 0 || nextIndex >= pixi.slides.current.length) {
            if (isDevelopment) {
                console.warn(`Invalid slide index: ${nextIndex}`);
            }
            return null;
        }

        try {
            // Cancel any active transition
            if (activeTransitionRef.current) {
                activeTransitionRef.current.kill();
                activeTransitionRef.current = null;
            }

            if (isDevelopment) {
                console.log(`Transitioning to slide ${nextIndex}`);
            }

            // Create new timeline
            const tl = gsap.timeline();
            activeTransitionRef.current = tl;

            // Track the timeline with resourceManager
            if (resourceManager) {
                resourceManager.trackAnimation(tl);
            }

            const currentIndex = pixi.currentIndex.current;
            const currentSlide = pixi.slides.current[currentIndex];
            const nextSlide = pixi.slides.current[nextIndex];

            // Handle text containers if available
            const textContainersAvailable =
                pixi.textContainers.current &&
                pixi.textContainers.current.length > currentIndex &&
                pixi.textContainers.current.length > nextIndex;

            const currentTextContainer = textContainersAvailable
                ? pixi.textContainers.current[currentIndex]
                : null;

            const nextTextContainer = textContainersAvailable
                ? pixi.textContainers.current[nextIndex]
                : null;

            // Ensure next slide is loaded
            if (!nextSlide || !nextSlide.texture) {
                if (isDevelopment) {
                    console.warn(`Slide ${nextIndex} is not ready for transition`);
                }
                return null;
            }

            // IMPORTANT: Make both slides visible during transition
            currentSlide.visible = true;
            nextSlide.visible = true;

            // Ensure next elements start invisible (alpha = 0)
            nextSlide.alpha = 0;
            if (nextTextContainer) {
                nextTextContainer.alpha = 0;
                nextTextContainer.visible = true; // Make next text visible before transition
            }

            // Calculate scale based on transition intensity
            const transitionScaleIntensity = props.transitionScaleIntensity ?? 30;
            const scaleMultiplier = 1 + transitionScaleIntensity / 100;

            // Create nested timelines for better organization and control
            const slideOutTl = gsap.timeline();
            const slideInTl = gsap.timeline();

            // Setup slide out animation with completion callbacks
            slideOutTl.to(currentSlide.scale, {
                x: currentSlide.baseScale! * scaleMultiplier,
                y: currentSlide.baseScale! * scaleMultiplier,
                duration: 1,
                ease: 'power2.out',
                onComplete: () => {
                    // Re-track the sprite after animation
                    if (resourceManager) {
                        resourceManager.trackDisplayObject(currentSlide);
                    }
                }
            }, 0)
                .to(currentSlide, {
                    alpha: 0,
                    duration: 1,
                    ease: 'power2.out',
                    onComplete: () => {
                        // IMPORTANT: Hide previous slide after transition completes to save GPU
                        currentSlide.visible = false;

                        // Re-track the sprite after visibility change
                        if (resourceManager) {
                            resourceManager.trackDisplayObject(currentSlide);
                        }
                    }
                }, 0);

            // Setup slide in animation with completion callbacks
            slideInTl.set(nextSlide.scale, {
                x: nextSlide.baseScale! * scaleMultiplier,
                y: nextSlide.baseScale! * scaleMultiplier,
            }, 0)
                .to(nextSlide.scale, {
                    x: nextSlide.baseScale!,
                    y: nextSlide.baseScale!,
                    duration: 1,
                    ease: 'power2.out',
                    onComplete: () => {
                        // Re-track the sprite after animation
                        if (resourceManager) {
                            resourceManager.trackDisplayObject(nextSlide);
                        }
                    }
                }, 0)
                .to(nextSlide, {
                    alpha: 1,
                    duration: 1,
                    ease: 'power2.out',
                    onComplete: () => {
                        // Re-track the sprite after animation
                        if (resourceManager) {
                            resourceManager.trackDisplayObject(nextSlide);
                        }
                    }
                }, 0);

            // Add timelines to main timeline
            tl.add(slideOutTl, 0);
            tl.add(slideInTl, 0);

            // Add text container animations if available
            if (currentTextContainer && nextTextContainer) {
                const textOutTl = gsap.timeline();
                const textInTl = gsap.timeline();

                textOutTl.to(currentTextContainer, {
                    alpha: 0,
                    duration: 1,
                    ease: 'power2.out',
                    onComplete: () => {
                        // Hide previous text after transition
                        currentTextContainer.visible = false;

                        // Re-track the container after visibility change
                        if (resourceManager) {
                            resourceManager.trackDisplayObject(currentTextContainer);
                        }
                    }
                }, 0);

                textInTl.to(nextTextContainer, {
                    alpha: 1,
                    duration: 1,
                    ease: 'power2.out',
                    onComplete: () => {
                        // Re-track the container after animation
                        if (resourceManager) {
                            resourceManager.trackDisplayObject(nextTextContainer);
                        }
                    }
                }, 0);

                tl.add(textOutTl, 0);
                tl.add(textInTl, 0);
            }

            // Add a callback to update current index when transition completes
            tl.call(() => {
                pixi.currentIndex.current = nextIndex;
                activeTransitionRef.current = null;

                if (isDevelopment) {
                    console.log(`Slide transition to ${nextIndex} completed`);
                }
            });

            return tl;
        } catch (error) {
            if (isDevelopment) {
                console.error("Error during slide transition:", error);
            }
            return null;
        }
    }, [pixi.slides.current, pixi.textContainers.current, pixi.currentIndex, props.transitionScaleIntensity, resourceManager, sliderRef]);

    return {
        transitionToSlide,
        isLoading,
        loadingProgress
    };
};