import { useEffect, useCallback, useRef } from 'react';
import { Sprite, Container, Assets } from 'pixi.js';
import { type EnhancedSprite, type HookParams } from '../types';
import { calculateSpriteScale } from '../utils/calculateSpriteScale';
import gsap from 'gsap';

/**
 * Hook to create and manage slide sprites
 */
export const useSlides = ({ sliderRef, pixi, props }: HookParams) => {
    // Keep track of all animations for proper cleanup
    const slideAnimationsRef = useRef<gsap.core.Timeline[]>([]);

    // Clear all active animations
    const clearAnimations = useCallback(() => {
        slideAnimationsRef.current.forEach(timeline => {
            if (timeline) {
                timeline.kill();
            }
        });
        slideAnimationsRef.current = [];
    }, []);

    // Create slides for each image
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

        // Track loaded textures for cleanup
        const loadedTextures = new Set();

        // Clear existing slides and animations
        clearAnimations();
        pixi.slides.current.forEach(sprite => {
            if (sprite && sprite.parent) {
                sprite.parent.removeChild(sprite);
                // Properly destroy the sprite
                sprite.destroy({
                    children: true,
                    texture: false // Don't destroy textures yet as they might be cached/shared
                });
            }
        });
        pixi.slides.current = [];

        // Preload all images using Assets manager
        const loadSlides = async () => {
            try {
                // First, check if images are already in cache
                const imagesToLoad = props.images.filter(image => !Assets.cache.has(image));

                // Load any images not in cache
                if (imagesToLoad.length > 0) {
                    await Assets.load(imagesToLoad);
                }

                // Clear any previous animations
                clearAnimations();

                // Create slides for each image
                props.images.forEach((image, index) => {
                    try {
                        // Get texture from cache
                        const texture = Assets.get(image);
                        // Track for cleanup
                        loadedTextures.add(texture);

                        // Create the sprite
                        const sprite = new Sprite(texture) as EnhancedSprite;
                        sprite.anchor.set(0.5);
                        sprite.x = app.screen.width / 2;
                        sprite.y = app.screen.height / 2;

                        // Set initial state - only show the first slide
                        sprite.alpha = index === 0 ? 1 : 0;
                        sprite.visible = index === 0;

                        // Calculate scale
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
                        console.error(`Error creating slide for ${image}:`, error);
                    }
                });
            } catch (error) {
                console.error("Error loading slide images:", error);
            }
        };

        loadSlides();

        return () => {
            // Properly clean up animations
            clearAnimations();

            // Properly clean up sprites
            pixi.slides.current.forEach(sprite => {
                if (sprite) {
                    if (sprite.parent) {
                        sprite.parent.removeChild(sprite);
                    }

                    // Destroy the sprite properly
                    sprite.destroy({
                        children: true,
                        texture: false // Don't destroy textures as they might be in cache
                    });
                }
            });
            pixi.slides.current = [];

            // Optionally clean textures if not needed elsewhere
            // Be careful with this as it might affect other components using the same textures
            /*
            loadedTextures.forEach(texture => {
                if (texture && !texture.destroyed) {
                    texture.destroy(true);
                }
            });
            */
        };
    }, [pixi.app.current, props.images, clearAnimations]);

    /**
     * Transition to a specific slide
     * @param nextIndex - Index of the slide to transition to
     */
    const transitionToSlide = useCallback((nextIndex: number) => {
        if (!pixi.slides.current.length) {
            return;
        }

        if (nextIndex < 0 || nextIndex >= pixi.slides.current.length) {
            return;
        }

        // Clear any active animations before starting new ones
        clearAnimations();

        const tl = gsap.timeline();
        slideAnimationsRef.current.push(tl); // Track for cleanup

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

        // Calculate scale based on transition intensity
        const scaleMultiplier = 1 + (props.transitionScaleIntensity || 30) / 100;

        // Animate the transition
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
                onComplete: () => {
                    // Hide previous slide after transition completes
                    currentSlide.visible = false;
                    // Ensure proper garbage collection opportunity
                    gsap.killTweensOf(currentSlide);
                    gsap.killTweensOf(currentSlide.scale);
                }
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
                onComplete: () => {
                    // Hide previous text after transition completes
                    currentTextContainer.visible = false;
                    // Ensure proper garbage collection opportunity
                    gsap.killTweensOf(currentTextContainer);
                }
            }, 0)
                .to(nextTextContainer, {
                    alpha: 1,
                    duration: 1,
                    ease: 'power2.out'
                }, 0);
        }

        // Update current index
        pixi.currentIndex.current = nextIndex;

        // Set up cleanup for this timeline when it completes
        tl.eventCallback('onComplete', () => {
            // Remove this timeline from our tracking array
            const index = slideAnimationsRef.current.indexOf(tl);
            if (index !== -1) {
                slideAnimationsRef.current.splice(index, 1);
            }
        });

        return tl;
    }, [pixi.slides.current, pixi.textContainers.current, pixi.currentIndex, props.transitionScaleIntensity, clearAnimations]);

    return {
        transitionToSlide,
        clearAnimations // Export so other hooks can access it if needed
    };
};