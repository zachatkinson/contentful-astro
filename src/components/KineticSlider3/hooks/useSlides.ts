import { useEffect, useCallback, useState, useRef } from 'react';
import { Sprite, Container, Assets, Texture } from 'pixi.js';
import { type EnhancedSprite, type HookParams } from '../types';
import { calculateSpriteScale } from '../utils/calculateSpriteScale';
import { gsap } from 'gsap';
import ResourceManager from '../managers/ResourceManager';

// Development environment check
const isDevelopment = import.meta.env?.MODE === 'development';

// Maximum number of retries for asset loading
const MAX_ASSET_LOAD_RETRIES = 3;

// Interface for the hook's return value
interface UseSlidesResult {
    transitionToSlide: (nextIndex: number) => gsap.core.Timeline | null;
    isLoading: boolean;
    loadingProgress: number;
    currentSlideIndex: number;
}

// Slide state management
interface SlideState {
    isLoading: boolean;
    loadingProgress: number;
    activeSlideIndex: number;
    textures: Map<string, Texture>;
    initialized: boolean;
}

// Cancellation state interface
interface CancellationState {
    isCancelled: boolean;
    reason: string | null;
}

// Animation state tracking
interface AnimationState {
    activeTransition: gsap.core.Timeline | null;
    pendingAnimations: gsap.core.Tween[];
    isAnimating: boolean;
}

/**
 * Hook to create and manage slide sprites with comprehensive optimizations
 */
export const useSlides = (
    { sliderRef, pixi, props, resourceManager }: HookParams & { resourceManager?: ResourceManager | null }
): UseSlidesResult => {
    // Track loading and slide state with refs to minimize re-renders
    const slideStateRef = useRef<SlideState>({
        isLoading: false,
        loadingProgress: 0,
        activeSlideIndex: 0,
        textures: new Map(),
        initialized: false
    });

    // Exposed state for component rendering
    const [isLoading, setIsLoading] = useState(false);
    const [loadingProgress, setLoadingProgress] = useState(0);
    const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

    // Animation state ref
    const animationStateRef = useRef<AnimationState>({
        activeTransition: null,
        pendingAnimations: [],
        isAnimating: false
    });

    // Cancellation ref for managing async operations
    const cancellationRef = useRef<CancellationState>({
        isCancelled: false,
        reason: null
    });

    /**
     * Set the cancellation state with a reason
     */
    const setCancelled = useCallback((reason: string): void => {
        cancellationRef.current.isCancelled = true;
        cancellationRef.current.reason = reason;

        if (isDevelopment) {
            console.log(`Slides operation cancelled: ${reason}`);
        }
    }, []);

    /**
     * Update loading state with progress and sync with state hooks
     */
    const updateLoadingState = useCallback((isLoading: boolean, progress: number): void => {
        // Update ref first
        slideStateRef.current.isLoading = isLoading;
        slideStateRef.current.loadingProgress = progress;

        // Then update state hooks for component render
        setIsLoading(isLoading);
        setLoadingProgress(progress);

        if (isDevelopment && progress > 0) {
            console.log(`Slides loading progress: ${progress.toFixed(1)}%`);
        }
    }, []);

    /**
     * Process pending animations in batch
     */
    const processPendingAnimations = useCallback(() => {
        try {
            // Skip if no ResourceManager or no pending animations
            if (!resourceManager || animationStateRef.current.pendingAnimations.length === 0) {
                return;
            }

            const { pendingAnimations } = animationStateRef.current;

            if (isDevelopment) {
                console.log(`Processing batch of ${pendingAnimations.length} slide animations`);
            }

            // Track animations in batch
            resourceManager.trackAnimationBatch(pendingAnimations);

            // Clear pending animations
            pendingAnimations.length = 0;
        } catch (error) {
            if (isDevelopment) {
                console.error('Error processing pending animations:', error);
            }

            // Clear animations array on error to prevent memory leaks
            animationStateRef.current.pendingAnimations = [];
        }
    }, [resourceManager]);

    /**
     * Add an animation to the pending batch
     */
    const trackAnimationForBatch = useCallback((animation: gsap.core.Tween): gsap.core.Tween => {
        try {
            // Skip if cancelled
            if (cancellationRef.current.isCancelled) {
                animation.kill();
                return animation;
            }

            // Add to pending batch
            animationStateRef.current.pendingAnimations.push(animation);
            return animation;
        } catch (error) {
            if (isDevelopment) {
                console.error('Error tracking animation for batch:', error);
            }
            return animation;
        }
    }, []);

    /**
     * Clean up any active animations
     */
    const cleanupActiveAnimations = useCallback(() => {
        try {
            // Kill active transition if it exists
            if (animationStateRef.current.activeTransition) {
                animationStateRef.current.activeTransition.kill();
                animationStateRef.current.activeTransition = null;
            }

            // Kill all pending animations
            animationStateRef.current.pendingAnimations.forEach(tween => {
                if (tween && tween.isActive()) {
                    tween.kill();
                }
            });

            // Clear pending animations
            animationStateRef.current.pendingAnimations = [];

            // Update animation state
            animationStateRef.current.isAnimating = false;

            if (isDevelopment) {
                console.log('Cleaned up all active slide animations');
            }
        } catch (error) {
            if (isDevelopment) {
                console.error('Error cleaning up animations:', error);
            }

            // Reset animation state on error
            animationStateRef.current = {
                activeTransition: null,
                pendingAnimations: [],
                isAnimating: false
            };
        }
    }, []);

    /**
     * Batch loading of textures with optimized retry logic
     */
    const batchLoadTextures = useCallback(async (): Promise<boolean> => {
        // Skip if cancelled or no images to load
        if (cancellationRef.current.isCancelled || !props.images.length) {
            return false;
        }

        try {
            // Start loading
            updateLoadingState(true, 0);

            const startTime = performance.now();

            // Filter out already loaded textures
            const { textures } = slideStateRef.current;
            const imagesToLoad = props.images.filter(url => !textures.has(url) && !Assets.cache.has(url));

            // If all textures are already loaded, we can skip
            if (imagesToLoad.length === 0) {
                if (isDevelopment) {
                    console.log('All slide textures already loaded');
                }

                // Make sure the cache is populated from Assets cache
                props.images.forEach(url => {
                    if (Assets.cache.has(url) && !textures.has(url)) {
                        textures.set(url, Assets.get(url));
                    }
                });

                updateLoadingState(false, 100);
                return true;
            }

            if (isDevelopment) {
                console.log(`Loading ${imagesToLoad.length} slide textures...`);
            }

            // Create a bundle for batch loading
            const assetBundle: Record<string, string> = {};
            imagesToLoad.forEach((url, index) => {
                assetBundle[`slide-${index}`] = url;
            });

            // Add bundle to Assets
            Assets.addBundle('slides-batch', assetBundle);

            // Attempt loading with retries
            for (let attempt = 1; attempt <= MAX_ASSET_LOAD_RETRIES; attempt++) {
                try {
                    // Check for cancellation
                    if (cancellationRef.current.isCancelled) {
                        updateLoadingState(false, 0);
                        return false;
                    }

                    // Load with progress tracking
                    const loadedAssets = await Assets.loadBundle('slides-batch', (progress) => {
                        // Calculate overall progress including already cached textures
                        const overallProgress =
                            ((props.images.length - imagesToLoad.length) +
                                (imagesToLoad.length * progress)) / props.images.length * 100;

                        updateLoadingState(true, overallProgress);
                    });

                    // Process loaded assets and update textures map
                    Object.entries(loadedAssets).forEach(([key, texture]) => {
                        const originalUrl = assetBundle[key];
                        if (originalUrl) {
                            textures.set(originalUrl, texture as Texture);

                            // Track with ResourceManager if available
                            if (resourceManager) {
                                resourceManager.trackTexture(originalUrl, texture as Texture);
                            }
                        }
                    });

                    // Successfully loaded all textures
                    break;

                } catch (error) {
                    if (attempt === MAX_ASSET_LOAD_RETRIES) {
                        throw new Error(`Failed to load slide textures after ${MAX_ASSET_LOAD_RETRIES} attempts: ${error}`);
                    }

                    if (isDevelopment) {
                        console.warn(`Attempt ${attempt} to load slide textures failed, retrying...`);
                    }

                    // Add exponential backoff with jitter
                    const delay = Math.pow(2, attempt) * 100 * (0.9 + Math.random() * 0.2);
                    await new Promise(resolve => setTimeout(resolve, delay));

                    // Check for cancellation after delay
                    if (cancellationRef.current.isCancelled) {
                        updateLoadingState(false, 0);
                        return false;
                    }
                }
            }

            // Complete loading
            updateLoadingState(false, 100);

            const elapsed = performance.now() - startTime;
            if (isDevelopment) {
                console.log(`Loaded ${imagesToLoad.length} slide textures in ${elapsed.toFixed(2)}ms`);
            }

            return true;
        } catch (error) {
            if (isDevelopment) {
                console.error('Error loading slide textures:', error);
            }

            updateLoadingState(false, 0);
            return false;
        }
    }, [props.images, resourceManager, updateLoadingState]);

    /**
     * Create slide sprites with proper scaling and positioning
     */
    const createSlideSprites = useCallback((): boolean => {
        // Skip if cancelled or no app/stage
        if (
            cancellationRef.current.isCancelled ||
            !pixi.app.current ||
            !pixi.app.current.stage ||
            !sliderRef.current
        ) {
            return false;
        }

        try {
            const app = pixi.app.current;
            const { textures } = slideStateRef.current;

            // Find or create slides container
            let slidesContainer: Container;

            if (app.stage.children.length > 0 && app.stage.children[0] instanceof Container) {
                slidesContainer = app.stage.children[0] as Container;
            } else {
                slidesContainer = new Container();
                slidesContainer.label = 'slidesContainer';
                app.stage.addChild(slidesContainer);

                // Track with ResourceManager
                if (resourceManager) {
                    resourceManager.trackDisplayObject(slidesContainer);
                }
            }

            // Get slider dimensions
            const sliderWidth = sliderRef.current.clientWidth;
            const sliderHeight = sliderRef.current.clientHeight;

            if (isDevelopment) {
                console.log(`Creating slides with dimensions: ${sliderWidth}x${sliderHeight}`);
            }

            // First clean up existing slides with proper resource cleanup
            if (pixi.slides.current.length > 0) {
                // Track sprites to be removed for batch processing
                const spritesToRemove: Sprite[] = [];

                pixi.slides.current.forEach(sprite => {
                    if (sprite && sprite.parent) {
                        sprite.parent.removeChild(sprite);
                        spritesToRemove.push(sprite);
                    }
                });

                // Let ResourceManager handle cleanup
                if (resourceManager && spritesToRemove.length > 0) {
                    // Just remove from display list, ResourceManager will handle disposal
                    // during unmount or when it detects they're no longer needed
                } else if (spritesToRemove.length > 0) {
                    // Only manually destroy if no ResourceManager
                    spritesToRemove.forEach(sprite => {
                        try {
                            if (sprite.parent) {
                                sprite.parent.removeChild(sprite);
                            }

                            // Use compatible destroy options
                            sprite.destroy({
                                children: true,
                                texture: false // Don't destroy textures, they're shared
                            });
                        } catch (error) {
                            if (isDevelopment) {
                                console.warn('Error destroying sprite:', error);
                            }
                        }
                    });
                }

                // Clear the array
                pixi.slides.current = [];
            }

            // Create sprites for each image with batch tracking
            const newSprites: EnhancedSprite[] = [];
            const displayObjects: Container[] = [];

            props.images.forEach((image, index) => {
                try {
                    // Get texture from cache
                    let texture = textures.get(image);

                    // If not in our cache, try Assets cache
                    if (!texture && Assets.cache.has(image)) {
                        texture = Assets.get(image);

                        // Store in our cache for future use
                        textures.set(image, texture);
                    }

                    if (!texture) {
                        if (isDevelopment) {
                            console.warn(`Texture not found for slide ${index}: ${image}`);
                        }
                        return;
                    }

                    // Create the sprite with proper typing
                    const sprite = new Sprite(texture) as EnhancedSprite;
                    sprite.label = `slide-${index}`;
                    sprite.anchor.set(0.5);
                    sprite.x = app.screen.width / 2;
                    sprite.y = app.screen.height / 2;

                    // Set initial state - only show the first slide
                    sprite.alpha = index === 0 ? 1 : 0;
                    sprite.visible = index === 0;

                    // Calculate and apply scale
                    try {
                        const scale = calculateSpriteScale(
                            texture.width,
                            texture.height,
                            sliderWidth,
                            sliderHeight
                        );

                        sprite.scale.set(scale);
                        sprite.baseScale = scale;
                    } catch (scaleError) {
                        if (isDevelopment) {
                            console.warn(`Error calculating scale for slide ${index}:`, scaleError);
                        }

                        // Fallback scaling
                        sprite.scale.set(1);
                        sprite.baseScale = 1;
                    }

                    // Track for batch processing
                    newSprites.push(sprite);
                    displayObjects.push(sprite);

                    // Add to container
                    slidesContainer.addChild(sprite);
                } catch (error) {
                    if (isDevelopment) {
                        console.error(`Error creating slide ${index}:`, error);
                    }
                }
            });

            // Store sprites in the ref
            pixi.slides.current = newSprites;

            // Batch track with ResourceManager if available
            if (resourceManager && displayObjects.length > 0) {
                resourceManager.trackDisplayObjectBatch(displayObjects);
            }

            if (isDevelopment) {
                console.log(`Created ${newSprites.length} slide sprites`);
            }

            return true;
        } catch (error) {
            if (isDevelopment) {
                console.error('Error creating slide sprites:', error);
            }
            return false;
        }
    }, [pixi.app, pixi.slides, props.images, resourceManager, sliderRef]);

    /**
     * Enhanced transition function with better resource management
     */
    const transitionToSlide = useCallback((nextIndex: number): gsap.core.Timeline | null => {
        // Validate input and context
        if (!sliderRef.current) {
            if (isDevelopment) {
                console.warn("Slider reference not available for transition");
            }
            return null;
        }

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
            // Clean up any active transition
            cleanupActiveAnimations();

            if (isDevelopment) {
                console.log(`Transitioning to slide ${nextIndex}`);
            }

            // Start performance timer
            const startTime = performance.now();

            // Create new timeline
            const tl = gsap.timeline();
            animationStateRef.current.activeTransition = tl;

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

            // Add to batch tracking
            trackAnimationForBatch(slideOutTl.getChildren()[0] as gsap.core.Tween);
            trackAnimationForBatch(slideOutTl.getChildren()[1] as gsap.core.Tween);

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

            // Add to batch tracking
            trackAnimationForBatch(slideInTl.getChildren()[1] as gsap.core.Tween);
            trackAnimationForBatch(slideInTl.getChildren()[2] as gsap.core.Tween);

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

                // Add to batch tracking
                trackAnimationForBatch(textOutTl.getChildren()[0] as gsap.core.Tween);
                trackAnimationForBatch(textInTl.getChildren()[0] as gsap.core.Tween);

                tl.add(textOutTl, 0);
                tl.add(textInTl, 0);
            }

            // Add a callback to update state when transition completes
            tl.call(() => {
                // Update current index and reset animation state
                pixi.currentIndex.current = nextIndex;
                slideStateRef.current.activeSlideIndex = nextIndex;
                setCurrentSlideIndex(nextIndex);

                // Clear transition reference
                animationStateRef.current.activeTransition = null;
                animationStateRef.current.isAnimating = false;

                const elapsed = performance.now() - startTime;
                if (isDevelopment) {
                    console.log(`Slide transition to ${nextIndex} completed in ${elapsed.toFixed(2)}ms`);
                }

                // Process any pending animations
                processPendingAnimations();
            });

            // Process pending animations immediately
            processPendingAnimations();

            return tl;
        } catch (error) {
            if (isDevelopment) {
                console.error("Error during slide transition:", error);
            }

            // Reset animation state on error
            animationStateRef.current.activeTransition = null;
            animationStateRef.current.isAnimating = false;

            return null;
        }
    }, [
        pixi.slides,
        pixi.textContainers,
        pixi.currentIndex,
        props.transitionScaleIntensity,
        resourceManager,
        sliderRef,
        cleanupActiveAnimations,
        trackAnimationForBatch,
        processPendingAnimations
    ]);

    // Initialize slides
    useEffect(() => {
        // Skip during server-side rendering
        if (typeof window === 'undefined') return;

        // Reset cancellation state
        cancellationRef.current.isCancelled = false;
        cancellationRef.current.reason = null;

        // Skip if app is not initialized
        if (!pixi.app.current || !pixi.app.current.stage) {
            if (isDevelopment) {
                console.log("App or stage not available for slides, deferring initialization");
            }
            return;
        }

        // Skip if we have no images
        if (!props.images.length) {
            if (isDevelopment) {
                console.warn("No images provided for slides");
            }
            return;
        }

        // Skip if slider ref is not available
        if (!sliderRef.current) {
            if (isDevelopment) {
                console.warn("Slider reference not available, deferring slide creation");
            }
            return;
        }

        // Initialize slides with error handling
        const initializeSlides = async () => {
            try {
                // Load textures first
                const texturesLoaded = await batchLoadTextures();

                // Check for cancellation after texture loading
                if (cancellationRef.current.isCancelled) {
                    return;
                }

                // Create sprites if textures loaded
                if (texturesLoaded) {
                    createSlideSprites();
                }

                // Mark as initialized
                slideStateRef.current.initialized = true;

                if (isDevelopment) {
                    console.log('Slides initialization complete');
                }
            } catch (error) {
                if (isDevelopment) {
                    console.error('Error initializing slides:', error);
                }
            }
        };

        // Start initialization
        initializeSlides();

        // Cleanup on unmount
        return () => {
            setCancelled('Component unmounting');
            cleanupActiveAnimations();
        };
    }, [
        pixi.app.current,
        props.images,
        sliderRef.current,
        batchLoadTextures,
        createSlideSprites,
        cleanupActiveAnimations,
        setCancelled
    ]);

    // Update current slide index when pixi.currentIndex changes
    useEffect(() => {
        setCurrentSlideIndex(pixi.currentIndex.current);
        slideStateRef.current.activeSlideIndex = pixi.currentIndex.current;
    }, [pixi.currentIndex.current]);

    return {
        transitionToSlide,
        isLoading,
        loadingProgress,
        currentSlideIndex
    };
};