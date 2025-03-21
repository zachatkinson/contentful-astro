import { useEffect, useCallback, useState, useRef } from 'react';
import { Sprite, Container, Assets, Texture } from 'pixi.js';
import { type EnhancedSprite, type HookParams } from '../types';
import { calculateSpriteScale } from '../utils/calculateSpriteScale';
import { gsap } from 'gsap';
import ResourceManager from '../managers/ResourceManager';
import { AtlasManager } from '../managers/AtlasManager';
import AnimationCoordinator, { AnimationGroupType } from '../managers/AnimationCoordinator';
import SlidingWindowManager from '../managers/SlidingWindowManager';

// Development environment check
const isDevelopment = import.meta.env?.MODE === 'development';

// Interface for the hook's return value
interface UseSlidesResult {
    transitionToSlide: (nextIndex: number) => gsap.core.Timeline | null;
    nextSlide: (nextIndex: number) => void;
    prevSlide: (prevIndex: number) => void;
    isLoading: boolean;
    loadingProgress: number;
}

/**
 * Hook to create and manage slide sprites with atlas support
 */
export const useSlides = (
    { sliderRef, pixi, props, resourceManager, atlasManager, onSlideChange, slidingWindowManager }: HookParams & {
        resourceManager?: ResourceManager | null,
        atlasManager?: AtlasManager | null
    }
): UseSlidesResult => {
    // Debug logging of props
    console.log("useSlides received useSlidesAtlas:", props.useSlidesAtlas);
    console.log("useSlides received props:", props);

    // Track loading state
    const [isLoading, setIsLoading] = useState(false);
    const [loadingProgress, setLoadingProgress] = useState(0);

    // Ref to store active transitions
    const activeTransitionRef = useRef<gsap.core.Timeline | null>(null);

    // Get the animation coordinator
    const animationCoordinator = AnimationCoordinator.getInstance();

    // Get the slidesBasePath from props, defaulting to '/images/' if not provided
    const slidesBasePath = props.slidesBasePath || '/images/';

    // Normalize path for atlas frame lookup
    const normalizePath = (imagePath: string): string => {
        // For paths that start with a slash, remove it for atlas lookup
        if (imagePath.startsWith('/')) {
            return imagePath.substring(1);
        }
        return imagePath;
    };

    // Helper to check if useSlidesAtlas is enabled (handling different possible values)
    const isUseSlidesAtlasEnabled = (): boolean => {
        // Handle all possible representations of "true"
        if (props.useSlidesAtlas === true) return true;
        if (typeof props.useSlidesAtlas === 'string' && props.useSlidesAtlas === 'true') return true;

        // Handle numeric representations (needs type checking)
        if (typeof props.useSlidesAtlas === 'number' && props.useSlidesAtlas === 1) return true;
        if (typeof props.useSlidesAtlas === 'string' && props.useSlidesAtlas === '1') return true;

        // Default to false for all other cases
        return false;
    };

    // Check if assets are available in atlas
    const areAssetsInAtlas = useCallback((): boolean => {
        // First check if atlasManager and slidesAtlas are available
        if (!atlasManager || !props.slidesAtlas) {
            if (isDevelopment) {
                console.log(`Atlas not available: atlasManager=${!!atlasManager}, slidesAtlas=${!!props.slidesAtlas}`);
            }
            return false;
        }

        // Check if useSlidesAtlas is enabled
        const useSlidesAtlasEnabled = isUseSlidesAtlasEnabled();
        if (isDevelopment) {
            console.log(`Atlas usage setting: useSlidesAtlas=${props.useSlidesAtlas}, enabled=${useSlidesAtlasEnabled}`);
        }

        if (!useSlidesAtlasEnabled) {
            if (isDevelopment) {
                console.log(`Atlas usage is disabled by useSlidesAtlas setting: ${props.useSlidesAtlas}`);
            }
            return false;
        }

        // Check if all images are in the atlas
        const missingFrames: string[] = [];
        const result = props.images.every(imagePath => {
            const normalizedPath = normalizePath(imagePath);

            if (isDevelopment) {
                console.log(`Checking if atlas has frame: "${normalizedPath}"`);
            }

            const atlasId = atlasManager.hasFrame(normalizedPath);

            if (!atlasId && isDevelopment) {
                missingFrames.push(normalizedPath);
            }

            return !!atlasId;
        });

        // In development mode, log which frames are missing if any
        if (isDevelopment && missingFrames.length > 0) {
            console.warn(`[KineticSlider] The following frames are missing from atlas: ${missingFrames.join(', ')}`);
        }

        return result;
    }, [atlasManager, props.images, props.slidesAtlas, props.useSlidesAtlas]);

    // Effect to create slides from atlas or individual images
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

            // Enhanced handling of the useAtlas decision
            const useSlidesAtlasEnabled = isUseSlidesAtlasEnabled();
            const useAtlas = atlasManager && props.slidesAtlas && areAssetsInAtlas() && useSlidesAtlasEnabled;

            if (isDevelopment) {
                if (useAtlas) {
                    console.log(`%c[KineticSlider] Using texture atlas: ${props.slidesAtlas} for ${props.images.length} slides`, 'background: #4CAF50; color: white; padding: 2px 5px; border-radius: 3px;');
                } else {
                    const reason = !atlasManager
                        ? "AtlasManager not available"
                        : !props.slidesAtlas
                            ? "No slidesAtlas property specified"
                            : !useSlidesAtlasEnabled
                                ? `Atlas usage disabled by useSlidesAtlas=${props.useSlidesAtlas}`
                                : "Not all images found in atlas";
                    console.log(`%c[KineticSlider] Using individual images (${reason})`, 'background: #FFA726; color: white; padding: 2px 5px; border-radius: 3px;');
                }
            }

            if (useAtlas) {
                loadSlidesFromAtlas(slidesContainer);
            } else {
                loadSlidesFromIndividualImages(slidesContainer);
            }
        } catch (error) {
            if (isDevelopment) {
                console.error("Error setting up slides container:", error);
            }
            setIsLoading(false);
        }
    }, [pixi.app.current, props.images, resourceManager, sliderRef, atlasManager, props.slidesAtlas, props.useSlidesAtlas]);

    /**
     * Load slides from texture atlas
     */
    const loadSlidesFromAtlas = async (slidesContainer: Container) => {
        if (!pixi.app.current || !sliderRef.current || !atlasManager) return;

        try {
            setIsLoading(true);
            setLoadingProgress(0);

            if (isDevelopment) {
                console.log(`%c[KineticSlider] Loading ${props.images.length} slide images from atlas: ${props.slidesAtlas}`, 'color: #2196F3');
            }

            const app = pixi.app.current;
            const sliderWidth = sliderRef.current.clientWidth;
            const sliderHeight = sliderRef.current.clientHeight;

            // Prepare for loading from atlas
            const totalImages = props.images.length;
            let loadedCount = 0;

            // Create sprites for each image using the atlas
            for (const [index, imagePath] of props.images.entries()) {
                try {
                    // Normalize path for atlas lookup
                    const normalizedPath = normalizePath(imagePath);

                    if (isDevelopment) {
                        console.log(`Looking up atlas frame for normalized path: "${normalizedPath}"`);
                    }

                    // Get texture from atlas
                    const texture = atlasManager.getFrameTexture(normalizedPath, props.slidesAtlas);

                    if (!texture) {
                        throw new Error(`Frame ${normalizedPath} not found in atlas ${props.slidesAtlas}`);
                    }

                    // Track texture with resource manager if available
                    if (resourceManager) {
                        resourceManager.trackTexture(imagePath, texture);
                    }

                    // Create the sprite with the texture from atlas
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

                    // Update progress
                    loadedCount++;
                    const progress = (loadedCount / totalImages) * 100;
                    setLoadingProgress(progress);

                    if (isDevelopment) {
                        console.log(`Created slide ${index} for ${imagePath} from atlas (progress: ${progress.toFixed(1)}%)`);
                    }
                } catch (error) {
                    if (isDevelopment) {
                        console.error(`Error creating slide for ${imagePath} from atlas:`, error);
                    }
                    // Fallback to individual image loading if atlas frame not found
                    const texture = await Assets.load(imagePath);
                    createSlideFromTexture(texture, imagePath, index, slidesContainer, app, sliderWidth, sliderHeight);

                    // Update progress
                    loadedCount++;
                    setLoadingProgress((loadedCount / totalImages) * 100);
                }
            }

            setIsLoading(false);
            setLoadingProgress(100);

            if (isDevelopment) {
                console.log(`Finished loading ${loadedCount} slides from atlas`);
            }
        } catch (error) {
            if (isDevelopment) {
                console.error("Error loading slides from atlas:", error);
            }
            // Fallback to individual image loading
            loadSlidesFromIndividualImages(slidesContainer);
        }
    };

    /**
     * Load slides from individual images (fallback method)
     */
    const loadSlidesFromIndividualImages = async (slidesContainer: Container) => {
        if (!pixi.app.current || !sliderRef.current) return;

        try {
            setIsLoading(true);
            setLoadingProgress(0);

            if (isDevelopment) {
                console.log(`%c[KineticSlider] Loading ${props.images.length} slide images individually (atlas not available or incomplete)`, 'color: #FF9800');
            }

            // Prepare the list of images to load
            const app = pixi.app.current;
            const sliderWidth = sliderRef.current.clientWidth;
            const sliderHeight = sliderRef.current.clientHeight;

            if (isDevelopment) {
                console.log(`Slider dimensions: ${sliderWidth}x${sliderHeight}`);
            }

            // Filter out any assets that are already in the cache
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

                    // Create slide sprite
                    createSlideFromTexture(texture, image, index, slidesContainer, app, sliderWidth, sliderHeight);
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
     * Helper to create a slide sprite from a texture
     */
    const createSlideFromTexture = (
        texture: Texture,
        imagePath: string,
        index: number,
        slidesContainer: Container,
        app: any,
        sliderWidth: number,
        sliderHeight: number
    ) => {
        // Track texture with resource manager if available
        if (resourceManager) {
            resourceManager.trackTexture(imagePath, texture);
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
            console.log(`Created slide ${index} for ${imagePath}`);
        }
    };

    /**
     * Enhanced transition function with better resource management and animation coordination
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

            // Create animations for slide transitions
            const slideOutAnimations: gsap.core.Tween[] = [];
            const slideInAnimations: gsap.core.Tween[] = [];
            const textOutAnimations: gsap.core.Tween[] = [];
            const textInAnimations: gsap.core.Tween[] = [];

            // Create slide out animations
            slideOutAnimations.push(
                gsap.to(currentSlide.scale, {
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
                }),
                gsap.to(currentSlide, {
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
                })
            );

            // Create slide in animations
            slideInAnimations.push(
                gsap.to(nextSlide.scale, {
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
                }),
                gsap.to(nextSlide, {
                    alpha: 1,
                    duration: 1,
                    ease: 'power2.out',
                    onComplete: () => {
                        // Re-track the sprite after animation
                        if (resourceManager) {
                            resourceManager.trackDisplayObject(nextSlide);
                        }
                    }
                })
            );

            // Set initial scale for next slide
            nextSlide.scale.set(
                nextSlide.baseScale! * scaleMultiplier,
                nextSlide.baseScale! * scaleMultiplier
            );

            // Add text container animations if available
            if (currentTextContainer && nextTextContainer) {
                textOutAnimations.push(
                    gsap.to(currentTextContainer, {
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
                    })
                );

                textInAnimations.push(
                    gsap.to(nextTextContainer, {
                        alpha: 1,
                        duration: 1,
                        ease: 'power2.out',
                        onComplete: () => {
                            // Re-track the container after animation
                            if (resourceManager) {
                                resourceManager.trackDisplayObject(nextTextContainer);
                            }
                        }
                    })
                );
            }

            // Use the AnimationCoordinator to create coordinated animation groups
            const slideOutGroup = {
                id: `slide_out_${currentIndex}_${Date.now()}`,
                type: AnimationGroupType.SLIDE_TRANSITION,
                animations: slideOutAnimations
            };

            const slideInGroup = {
                id: `slide_in_${nextIndex}_${Date.now()}`,
                type: AnimationGroupType.SLIDE_TRANSITION,
                animations: slideInAnimations
            };

            // Create a master timeline for the entire transition
            const masterTimeline = gsap.timeline({
                onComplete: () => {
                    // Update current index when transition completes
                    pixi.currentIndex.current = nextIndex;
                    activeTransitionRef.current = null;

                    // Call the onSlideChange callback if provided
                    if (onSlideChange) {
                        onSlideChange(nextIndex);
                    }
                }
            });

            // Add slide animations to the master timeline
            const slideOutTimeline = animationCoordinator.createAnimationGroup(slideOutGroup);
            const slideInTimeline = animationCoordinator.createAnimationGroup(slideInGroup);

            masterTimeline.add(slideOutTimeline, 0);
            masterTimeline.add(slideInTimeline, 0);

            // Add text animations if available
            if (textOutAnimations.length > 0 && textInAnimations.length > 0) {
                const textOutGroup = {
                    id: `text_out_${currentIndex}_${Date.now()}`,
                    type: AnimationGroupType.TEXT_ANIMATION,
                    animations: textOutAnimations
                };

                const textInGroup = {
                    id: `text_in_${nextIndex}_${Date.now()}`,
                    type: AnimationGroupType.TEXT_ANIMATION,
                    animations: textInAnimations
                };

                const textOutTimeline = animationCoordinator.createAnimationGroup(textOutGroup);
                const textInTimeline = animationCoordinator.createAnimationGroup(textInGroup);

                masterTimeline.add(textOutTimeline, 0);
                masterTimeline.add(textInTimeline, 0);
            }

            // Store the master timeline
            activeTransitionRef.current = masterTimeline;

            // Track the master timeline with resourceManager
            if (resourceManager) {
                resourceManager.trackAnimation(masterTimeline);
            }

            return masterTimeline;
        } catch (error) {
            if (isDevelopment) {
                console.error('Error during slide transition:', error);
            }
            return null;
        }
    }, [
        sliderRef,
        pixi.slides,
        pixi.textContainers,
        pixi.currentIndex,
        props.transitionScaleIntensity,
        resourceManager,
        onSlideChange,
        animationCoordinator
    ]);

    // Add nextSlide and prevSlide methods
    const nextSlide = useCallback((nextIndex: number) => {
        const tl = transitionToSlide(nextIndex);
        if (tl && onSlideChange) {
            onSlideChange(nextIndex);
        }
    }, [transitionToSlide, onSlideChange]);

    const prevSlide = useCallback((prevIndex: number) => {
        const tl = transitionToSlide(prevIndex);
        if (tl && onSlideChange) {
            onSlideChange(prevIndex);
        }
    }, [transitionToSlide, onSlideChange]);

    return {
        transitionToSlide,
        nextSlide,
        prevSlide,
        isLoading,
        loadingProgress
    };
};

export default useSlides;