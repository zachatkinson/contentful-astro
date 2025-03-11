import { useEffect, useCallback, useState, useRef } from 'react';
import { Sprite, Container, Assets } from 'pixi.js';
import { type EnhancedSprite, type HookParams } from '../types';
import { calculateSpriteScale } from '../utils/calculateSpriteScale';
import { gsap } from 'gsap';
import ResourceManager from '../managers/ResourceManager';

// Development environment check
const isDevelopment = import.meta.env?.MODE === 'development';

// Cancellation flag interface
interface CancellationFlags {
    isCancelled: boolean;
}

// Interface for the hook's return value
interface UseSlidesResult {
    transitionToSlide: (nextIndex: number) => gsap.core.Timeline | null;
    isLoading: boolean;
    loadingProgress: number;
}

/**
 * Hook to create and manage slide sprites with enhanced optimization
 */
export const useSlides = (
    { sliderRef, pixi, props, resourceManager }: HookParams & { resourceManager?: ResourceManager | null }
): UseSlidesResult => {
    // Cancellation flag to prevent race conditions
    const cancellationRef = useRef<CancellationFlags>({ isCancelled: false });

    // Track loading state
    const [isLoading, setIsLoading] = useState(false);
    const [loadingProgress, setLoadingProgress] = useState(0);

    // Ref to store active transitions
    const activeTransitionRef = useRef<gsap.core.Timeline | null>(null);

    // Memoized slide loading function
    const loadSlides = useCallback(async (slidesContainer: Container) => {
        // Reset cancellation flag
        cancellationRef.current.isCancelled = false;

        // Validate essential references
        if (!pixi.app.current || !sliderRef.current) {
            if (isDevelopment) {
                console.warn('Missing essential references for slide loading');
            }
            return;
        }

        try {
            setIsLoading(true);
            setLoadingProgress(0);

            if (isDevelopment) {
                console.log(`Preparing to load ${props.images.length} slide images...`);
            }

            const app = pixi.app.current;
            const sliderWidth = sliderRef.current.clientWidth;
            const sliderHeight = sliderRef.current.clientHeight;

            // Identify images not already in cache
            const imagesToLoad = props.images.filter(image => !Assets.cache.has(image));

            if (isDevelopment && imagesToLoad.length < props.images.length) {
                console.log(`Using ${props.images.length - imagesToLoad.length} cached images`);
            }

            // Batch load images if needed
            if (imagesToLoad.length > 0) {
                // Create asset bundle
                const bundle = imagesToLoad.reduce((acc, image, index) => {
                    acc[`slide-${index}`] = image;
                    return acc;
                }, {} as Record<string, string>);

                Assets.addBundle('slider-images', bundle);

                // Load with progress tracking
                await Assets.loadBundle('slider-images', (progress) => {
                    // Check for cancellation during loading
                    if (cancellationRef.current.isCancelled) return;
                    setLoadingProgress(progress * 100);
                });
            }

            // Check for cancellation after loading
            if (cancellationRef.current.isCancelled) {
                setIsLoading(false);
                return;
            }

            // Create sprites for each image
            props.images.forEach((image, index) => {
                // Check for cancellation before sprite creation
                if (cancellationRef.current.isCancelled) return;

                try {
                    // Get texture from cache
                    const texture = Assets.get(image);

                    // Track texture with ResourceManager
                    if (resourceManager) {
                        resourceManager.trackTexture(image, texture);
                    }

                    // Create sprite
                    const sprite = new Sprite(texture) as EnhancedSprite;
                    sprite.anchor.set(0.5);
                    sprite.x = app.screen.width / 2;
                    sprite.y = app.screen.height / 2;

                    // Initial visibility state
                    sprite.alpha = index === 0 ? 1 : 0;
                    sprite.visible = index === 0;

                    // Calculate sprite scale
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
                            console.warn(`Scale calculation error for slide ${index}:`, scaleError);
                        }

                        // Fallback scaling
                        sprite.scale.set(1);
                        sprite.baseScale = 1;
                    }

                    // Track sprite with ResourceManager
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
                        console.error(`Sprite creation error for ${image}:`, error);
                    }
                }
            });

            // Final state update
            if (!cancellationRef.current.isCancelled) {
                setIsLoading(false);
                setLoadingProgress(100);
            }
        } catch (error) {
            if (isDevelopment) {
                console.error("Comprehensive slide loading error:", error);
            }
            setIsLoading(false);
        }
    }, [pixi, props.images, resourceManager, sliderRef]);

    // Main effect for slide initialization
    useEffect(() => {
        // Skip if essential references are missing
        if (!pixi.app.current || !pixi.app.current.stage || !props.images.length || !sliderRef.current) {
            if (isDevelopment) {
                console.log("Deferring slide initialization due to missing references");
            }
            return;
        }

        // Determine or create slides container
        let slidesContainer: Container;
        try {
            const app = pixi.app.current;

            // Use existing container or create new
            if (app.stage.children.length > 0 && app.stage.children[0] instanceof Container) {
                slidesContainer = app.stage.children[0] as Container;
            } else {
                slidesContainer = new Container();
                slidesContainer.label = 'slidesContainer';
                app.stage.addChild(slidesContainer);

                // Track container with ResourceManager
                if (resourceManager) {
                    resourceManager.trackDisplayObject(slidesContainer);
                }
            }

            // Clear existing slides
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

            // Load slides
            loadSlides(slidesContainer);
        } catch (error) {
            if (isDevelopment) {
                console.error("Slide container setup error:", error);
            }
            setIsLoading(false);
        }

        // Cleanup function
        return () => {
            // Set cancellation flag
            cancellationRef.current.isCancelled = true;
        };
    }, [pixi.app.current, props.images, resourceManager, sliderRef, loadSlides]);

    // Memoized slide transition function
    const transitionToSlide = useCallback((nextIndex: number): gsap.core.Timeline | null => {
        // Validate references and index
        if (!sliderRef.current || !pixi.slides.current.length) {
            if (isDevelopment) {
                console.warn("Invalid references for slide transition");
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

            // Create timeline
            const tl = gsap.timeline();
            activeTransitionRef.current = tl;

            // Track timeline with ResourceManager
            if (resourceManager) {
                resourceManager.trackAnimation(tl);
            }

            const currentIndex = pixi.currentIndex.current;
            const currentSlide = pixi.slides.current[currentIndex];
            const nextSlide = pixi.slides.current[nextIndex];

            // Validate slide availability
            if (!nextSlide || !nextSlide.texture) {
                if (isDevelopment) {
                    console.warn(`Slide ${nextIndex} not ready for transition`);
                }
                return null;
            }

            // Text container handling
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

            // Prepare slides for transition
            currentSlide.visible = true;
            nextSlide.visible = true;
            nextSlide.alpha = 0;

            if (nextTextContainer) {
                nextTextContainer.alpha = 0;
                nextTextContainer.visible = true;
            }

            // Calculate transition scale
            const transitionScaleIntensity = props.transitionScaleIntensity ?? 30;
            const scaleMultiplier = 1 + transitionScaleIntensity / 100;

            // Create nested timelines
            const slideOutTl = gsap.timeline();
            const slideInTl = gsap.timeline();

            // Slide out animation
            slideOutTl.to(currentSlide.scale, {
                x: currentSlide.baseScale! * scaleMultiplier,
                y: currentSlide.baseScale! * scaleMultiplier,
                duration: 1,
                ease: 'power2.out',
                onComplete: () => {
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
                        currentSlide.visible = false;
                        if (resourceManager) {
                            resourceManager.trackDisplayObject(currentSlide);
                        }
                    }
                }, 0);

            // Slide in animation
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
                        if (resourceManager) {
                            resourceManager.trackDisplayObject(nextSlide);
                        }
                    }
                }, 0);

            // Add timelines to main timeline
            tl.add(slideOutTl, 0);
            tl.add(slideInTl, 0);

            // Text container animations
            if (currentTextContainer && nextTextContainer) {
                const textOutTl = gsap.timeline();
                const textInTl = gsap.timeline();

                textOutTl.to(currentTextContainer, {
                    alpha: 0,
                    duration: 1,
                    ease: 'power2.out',
                    onComplete: () => {
                        currentTextContainer.visible = false;
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
                        if (resourceManager) {
                            resourceManager.trackDisplayObject(nextTextContainer);
                        }
                    }
                }, 0);

                tl.add(textOutTl, 0);
                tl.add(textInTl, 0);
            }

            // Update current index
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
                console.error("Slide transition error:", error);
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