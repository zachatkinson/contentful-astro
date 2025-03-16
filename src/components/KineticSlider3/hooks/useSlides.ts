import { useEffect, useCallback, useState, useRef } from 'react';
import { Sprite, Container, Assets, Texture } from 'pixi.js';
import { type EnhancedSprite, type HookParams } from '../types';
import { calculateSpriteScale } from '../utils/calculateSpriteScale';
import { gsap } from 'gsap';
import ResourceManager from '../managers/ResourceManager';
import { AtlasManager } from '../managers/AtlasManager';

// Development environment check
const isDevelopment = import.meta.env?.MODE === 'development';

// Interface for the hook's return value
interface UseSlidesResult {
    transitionToSlide: (nextIndex: number) => gsap.core.Timeline | null;
    isLoading: boolean;
    loadingProgress: number;
}

/**
 * Hook to create and manage slide sprites with atlas support
 */
export const useSlides = (
    { sliderRef, pixi, props, resourceManager, atlasManager }: HookParams & {
        resourceManager?: ResourceManager | null,
        atlasManager?: AtlasManager | null
    }
): UseSlidesResult => {
    // Track loading state
    const [isLoading, setIsLoading] = useState(false);
    const [loadingProgress, setLoadingProgress] = useState(0);

    // Ref to store active transitions
    const activeTransitionRef = useRef<gsap.core.Timeline | null>(null);

    // Get the slidesBasePath from props, defaulting to '/images/' if not provided
    const slidesBasePath = props.slidesBasePath || '/images/';

    // Efficiently extract filename from path for atlas frame lookup
    const getFrameName = (imagePath: string): string => {
        // Check if the path is already a relative path (doesn't start with '/')
        if (!imagePath.startsWith('/') && !imagePath.includes('://')) {
            // Prepend the slidesBasePath to create a full path
            const fullPath = `${slidesBasePath}${imagePath}`;
            if (isDevelopment) {
                console.log(`Converting relative path "${imagePath}" to full path "${fullPath}"`);
            }
            return fullPath;
        }

        // If it's already a full path, return it as is
        return imagePath;
    };

    // Check if assets are available in atlas
    const areAssetsInAtlas = useCallback((): boolean => {
        if (!atlasManager || !props.slidesAtlas) {
            return false;
        }

        // Check if all images are in the atlas
        const missingFrames: string[] = [];
        const result = props.images.every(imagePath => {
            const frameName = getFrameName(imagePath);
            const atlasId = atlasManager.hasFrame(frameName);

            if (!atlasId && isDevelopment) {
                missingFrames.push(frameName);
            }

            return !!atlasId;
        });

        // In development mode, log which frames are missing if any
        if (isDevelopment && missingFrames.length > 0) {
            console.warn(`[KineticSlider] The following frames are missing from atlas: ${missingFrames.join(', ')}`);
        }

        return result;
    }, [atlasManager, props.images, props.slidesAtlas, slidesBasePath]);

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

            // Choose the loading method based on atlas availability and user preference
            const useAtlas = atlasManager && props.slidesAtlas && areAssetsInAtlas() && props.useSlidesAtlas;

            if (isDevelopment) {
                if (useAtlas) {
                    console.log(`%c[KineticSlider] Using texture atlas: ${props.slidesAtlas} for ${props.images.length} slides`, 'background: #4CAF50; color: white; padding: 2px 5px; border-radius: 3px;');
                } else {
                    const reason = !atlasManager
                        ? "AtlasManager not available"
                        : !props.slidesAtlas
                            ? "No slidesAtlas property specified"
                            : !props.useSlidesAtlas
                                ? "Atlas usage disabled by useSlidesAtlas=false"
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
    }, [pixi.app.current, props.images, resourceManager, sliderRef, atlasManager, props.slidesAtlas, slidesBasePath]);

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
                    // Get frame name with proper path handling
                    const frameName = getFrameName(imagePath);

                    // Get texture from atlas
                    const texture = atlasManager.getFrameTexture(frameName, props.slidesAtlas);

                    if (!texture) {
                        throw new Error(`Frame ${frameName} not found in atlas ${props.slidesAtlas}`);
                    }

                    // Track texture with resource manager if available
                    if (resourceManager) {
                        resourceManager.trackTexture(frameName, texture);
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
                    // Construct the full path if it's a relative path
                    const fullImagePath = !imagePath.startsWith('/') && !imagePath.includes('://')
                        ? `${slidesBasePath}${imagePath}`
                        : imagePath;

                    const texture = await Assets.load(fullImagePath);
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

            // Transform any relative paths to full paths with slidesBasePath
            const imagesToLoad = props.images.map(imagePath => {
                if (!imagePath.startsWith('/') && !imagePath.includes('://')) {
                    return `${slidesBasePath}${imagePath}`;
                }
                return imagePath;
            }).filter(image => !Assets.cache.has(image));

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
                    // Convert relative paths to full paths
                    const fullImagePath = !image.startsWith('/') && !image.includes('://')
                        ? `${slidesBasePath}${image}`
                        : image;

                    // Get texture from cache
                    const texture = Assets.get(fullImagePath);

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