import { useEffect, useCallback, useRef } from 'react';
import { Sprite, Container, Texture } from 'pixi.js';
import { type EnhancedSprite, type EnhancedHookParams, type HookParams } from '../types';
import { calculateSpriteScale } from '../utils/calculateSpriteScale';
import { gsap } from 'gsap';

/**
 * Hook to create and manage slide sprites with proper memory management
 * This version accepts either EnhancedHookParams or regular HookParams
 */
export const useSlides = (params: HookParams | EnhancedHookParams) => {
    // Extract the common parts that exist in both types
    const { sliderRef, pixi, props, onInitialized } = params;

    // Reference to track if the parent component is unmounting
    const isUnmountingRef = useRef(false);

    // Check if we have enhanced params with managers
    const hasManagers = 'managers' in params;
    const managers = hasManagers ? params.managers : undefined;
    const qualityLevel = hasManagers ? params.qualityLevel : 'high';

    // Use texture and animation managers from the provided managers if available
    const textureManager = managers?.textureManager;
    const animationManager = managers?.animationManager;

    /**
     * Create slides for each image with optimized texture management
     */
    useEffect(() => {
        if (!pixi.app.current || !pixi.app.current.stage) {
            return;
        }

        // Check if we have images to display
        if (!props.images.length) {
            return;
        }

        const app = pixi.app.current;

        // Get the stage container - either the first child or the stage itself
        const stage = app.stage.children[0] instanceof Container
            ? app.stage.children[0] as Container
            : app.stage;

        // Cleanup function for this effect
        const cleanup = () => {
            console.log('Cleaning up slides...');

            // Kill all animations for slides if animation manager is available
            if (animationManager) {
                animationManager.killModuleAnimations('slides');
            }

            // Track textures that need to be released
            const textureUrls = new Set<string>();

            // Cleanup sprites
            pixi.slides.current.forEach(sprite => {
                if (sprite) {
                    // Store the texture URL for later release
                    if (sprite.texture && 'textureCacheIds' in sprite.texture) {
                        const ids = sprite.texture.textureCacheIds;
                        if (ids && Array.isArray(ids) && ids.length > 0) {
                            ids.forEach(id => textureUrls.add(id));
                        }
                    }

                    // Remove from parent
                    if (sprite.parent) {
                        sprite.parent.removeChild(sprite);
                    }

                    // Destroy the sprite without destroying the texture
                    sprite.destroy();
                }
            });

            // Clear the slides array
            pixi.slides.current = [];

            // Now safely release textures using the texture manager if available
            if (textureManager) {
                textureUrls.forEach(url => {
                    textureManager.releaseTexture(url, isUnmountingRef.current);
                });
            }
        };

        // Clean up any existing slides before creating new ones
        cleanup();

        // Load all the textures and create sprites
        const setupSlides = async () => {
            try {
                console.log('Loading slide textures and creating sprites...');



                // Batch load all textures using the texture manager if available
                let textures: Texture[] = [];

                if (textureManager) {
                    textures = await Promise.all(
                        props.images.map(image => textureManager.loadTexture(image))
                    );
                } else {
                    // Fallback to basic Texture loading if texture manager is not available
                    textures = await Promise.all(
                        props.images.map(image => Texture.from(image))
                    );
                }

                // Create sprites using the loaded textures
                textures.forEach((texture, index) => {
                    try {
                        // Create the sprite
                        const sprite = new Sprite(texture) as EnhancedSprite;
                        sprite.anchor.set(0.5);
                        sprite.x = app.screen.width / 2;
                        sprite.y = app.screen.height / 2;

                        // Set initial state - only show the first slide
                        sprite.alpha = index === 0 ? 1 : 0;
                        sprite.visible = index === 0;

                        // Calculate scale based on current quality level
                        const scaleResult = calculateSpriteScale(
                            texture.width,
                            texture.height,
                            app.screen.width,
                            app.screen.height
                        );

                        // Apply the calculated scale
                        if (typeof scaleResult === 'number') {
                            sprite.scale.set(scaleResult);
                            sprite.baseScale = scaleResult;
                        } else {
                            sprite.scale.set(scaleResult.scale);
                            sprite.baseScale = scaleResult.baseScale;
                        }

                        // Add to stage and store reference
                        stage.addChild(sprite);
                        pixi.slides.current.push(sprite);
                    } catch (error) {
                        console.error(`Error creating slide for ${props.images[index]}:`, error);
                    }
                });

                console.log(`Created ${pixi.slides.current.length} slides`);

                // Signal to parent component that slides are initialized
                if (typeof onInitialized === 'function') {
                    onInitialized('slides');
                }
            } catch (error) {
                console.error("Error loading slide images:", error);
            }
        };

        // Setup the slides
        setupSlides();

        // Return cleanup function
        return () => {
            // Set unmounting flag for proper texture cleanup
            isUnmountingRef.current = true;
            cleanup();
        };
    }, [pixi.app.current, props.images, textureManager, animationManager, qualityLevel, onInitialized]);

    /**
     * Transition to a specific slide with optimized animation tracking
     * @param nextIndex - Index of the slide to transition to
     */
    const transitionToSlide = useCallback((nextIndex: number) => {
        if (!pixi.slides.current.length) {
            return;
        }

        if (nextIndex < 0 || nextIndex >= pixi.slides.current.length) {
            return;
        }

        const currentIndex = pixi.currentIndex.current;
        const currentSlide = pixi.slides.current[currentIndex];
        const nextSlide = pixi.slides.current[nextIndex];

        // Handle text containers if available
        const currentTextContainer = pixi.textContainers.current[currentIndex];
        const nextTextContainer = pixi.textContainers.current[nextIndex];

        // Ensure next slide is loaded
        if (!nextSlide || !nextSlide.texture) {
            return;
        }

        // Make both slides visible during transition
        currentSlide.visible = true;
        nextSlide.visible = true;

        // Ensure next elements start invisible (alpha = 0)
        nextSlide.alpha = 0;
        if (nextTextContainer) {
            nextTextContainer.alpha = 0;
            nextTextContainer.visible = true; // Make next text visible before transition
        }

        // Calculate scale based on transition intensity and current quality level
        const qualityMultiplier = qualityLevel === 'low' ? 0.7 :
            qualityLevel === 'medium' ? 0.85 : 1.0;
        const scaleMultiplier = 1 + ((props.transitionScaleIntensity || 30) / 100) * qualityMultiplier;

        // Create a timeline for the transition using GSAP directly or animation manager if available
        let tl: gsap.core.Timeline;

        if (animationManager) {
            tl = animationManager.timeline({
                onComplete: () => {
                    // Hide previous slide after transition completes
                    currentSlide.visible = false;

                    // Hide previous text after transition completes
                    if (currentTextContainer) {
                        currentTextContainer.visible = false;
                    }
                }
            }, 'slides');
        } else {
            // Use regular GSAP timeline if animation manager is not available
            tl = gsap.timeline({
                onComplete: () => {
                    // Hide previous slide after transition completes
                    currentSlide.visible = false;

                    // Hide previous text after transition completes
                    if (currentTextContainer) {
                        currentTextContainer.visible = false;
                    }
                }
            });
        }

        // Animate the transition with managed animations
        tl.to(currentSlide.scale, {
            x: currentSlide.baseScale! * scaleMultiplier,
            y: currentSlide.baseScale! * scaleMultiplier,
            duration: 1,
            ease: 'power2.out',
        }, 0)
            .set(nextSlide.scale, {
                x: nextSlide.baseScale! * scaleMultiplier,
                y: nextSlide.baseScale! * scaleMultiplier,
            }, 0)
            .to(nextSlide.scale, {
                x: nextSlide.baseScale!,
                y: nextSlide.baseScale!,
                duration: 1,
                ease: 'power2.out',
            }, 0)
            .to(currentSlide, {
                alpha: 0,
                duration: 1,
                ease: 'power2.out',
            }, 0)
            .to(nextSlide, {
                alpha: 1,
                duration: 1,
                ease: 'power2.out',
            }, 0);

        // Also animate text containers if available
        if (currentTextContainer && nextTextContainer) {
            tl.to(currentTextContainer, {
                alpha: 0,
                duration: 1,
                ease: 'power2.out',
            }, 0)
                .to(nextTextContainer, {
                    alpha: 1,
                    duration: 1,
                    ease: 'power2.out'
                }, 0);
        }

        // Update current index
        pixi.currentIndex.current = nextIndex;

        return tl;
    }, [pixi.slides.current, pixi.textContainers.current, pixi.currentIndex,
        props.transitionScaleIntensity, animationManager, qualityLevel]);

    /**
     * Update slides based on window resize
     */
    useEffect(() => {
        if (!pixi.app.current || !pixi.slides.current.length) return;

        const app = pixi.app.current;

        const handleResize = () => {
            pixi.slides.current.forEach((sprite) => {
                if (!sprite.texture) return;

                // Recalculate scale based on new dimensions
                const texture = sprite.texture;
                const containerWidth = app.screen.width;
                const containerHeight = app.screen.height;

                const scaleResult = calculateSpriteScale(
                    texture.width,
                    texture.height,
                    containerWidth,
                    containerHeight
                );

                // Apply the new scale
                if (typeof scaleResult === 'number') {
                    sprite.scale.set(scaleResult);
                    sprite.baseScale = scaleResult;
                } else {
                    sprite.scale.set(scaleResult.scale);
                    sprite.baseScale = scaleResult.baseScale;
                }

                // Center the sprite
                sprite.x = containerWidth / 2;
                sprite.y = containerHeight / 2;
            });
        };

        // Set up resize handler using event manager if available or window event directly
        let cleanup: (() => void) | undefined;

        if (managers?.eventManager) {
            cleanup = managers.eventManager.on(window, 'resize', handleResize);
        } else {
            // Fallback to standard event listener
            window.addEventListener('resize', handleResize);
            cleanup = () => window.removeEventListener('resize', handleResize);
        }

        // Initial sizing
        handleResize();

        return cleanup;
    }, [pixi.app.current, pixi.slides.current, managers?.eventManager]);

    return {
        transitionToSlide,
        slidesReady: pixi.slides.current.length > 0
    };
};

export default useSlides;