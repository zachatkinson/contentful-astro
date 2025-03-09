import { useEffect, useCallback, useRef } from 'react';
import { Sprite, Container, Texture } from 'pixi.js';
import { gsap } from 'gsap';
import { useKineticSlider } from '../context/KineticSliderContext';
import { calculateSpriteScale } from '../utils/calculateSpriteScale';
import type { EnhancedSprite } from '../types';

/**
 * Hook to create and manage slide sprites with proper memory management
 */
export const useSlides = () => {
    // Use the KineticSlider context instead of receiving props and refs
    const {
        sliderRef,
        pixiRefs: pixi,
        props,
        handleInitialization
    } = useKineticSlider();

    // Reference to track if the parent component is unmounting
    const isUnmountingRef = useRef(false);

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
        };

        // Clean up any existing slides before creating new ones
        cleanup();

        // Load all the textures and create sprites
        const setupSlides = async () => {
            try {
                console.log('Loading slide textures and creating sprites...');

                // Batch load all textures using standard Texture loading
                const textures = await Promise.all(
                    props.images.map(image => Texture.from(image))
                );

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

                        // Calculate scale based on dimensions
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
                handleInitialization('slides');
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
    }, [pixi.app.current, props.images, handleInitialization]);

    /**
     * Transition to a specific slide with optimized animation tracking
     * @param nextIndex - Index of the slide to transition to
     */
    const transitionToSlide = useCallback((nextIndex: number) => {
        if (!pixi.slides.current.length) {
            console.warn("No slides available for transition");
            return;
        }

        if (nextIndex < 0 || nextIndex >= pixi.slides.current.length) {
            console.warn(`Invalid slide index: ${nextIndex}. Valid range: 0-${pixi.slides.current.length - 1}`);
            return;
        }

        const currentIndex = pixi.currentIndex.current;

        // Skip if trying to transition to the same slide
        if (currentIndex === nextIndex) {
            console.log(`Already at slide ${nextIndex}, skipping transition`);
            return;
        }

        console.log(`Transitioning from slide ${currentIndex} to ${nextIndex}`);

        const currentSlide = pixi.slides.current[currentIndex];
        const nextSlide = pixi.slides.current[nextIndex];

        // Handle text containers if available
        const hasTextContainers = pixi.textContainers.current &&
            pixi.textContainers.current.length > 0 &&
            pixi.textContainers.current.length === pixi.slides.current.length;

        const currentTextContainer = hasTextContainers ? pixi.textContainers.current[currentIndex] : null;
        const nextTextContainer = hasTextContainers ? pixi.textContainers.current[nextIndex] : null;

        // Ensure next slide is loaded
        if (!nextSlide || !nextSlide.texture) {
            console.error("Next slide or texture is not available");
            return;
        }

        // Make both slides visible during transition
        currentSlide.visible = true;
        nextSlide.visible = true;

        // IMPORTANT CHANGE: Only apply alpha=0 to the slide, not the text container
        nextSlide.alpha = 0;

        if (nextTextContainer) {
            // IMPORTANT CHANGE: Make sure next text starts fully visible
            nextTextContainer.alpha = 1; // Start with full opacity
            nextTextContainer.visible = true; // Make sure it's visible
        }

        // Calculate scale based on transition intensity
        const scaleMultiplier = 1 + ((props.transitionScaleIntensity || 30) / 100);

        // Create a timeline for the transition
        const tl = gsap.timeline({
            onComplete: () => {
                // Hide previous slide after transition completes
                currentSlide.visible = false;

                // IMPORTANT CHANGE: Don't hide or change alpha of previous text container
                if (currentTextContainer) {
                    currentTextContainer.visible = true; // Keep it visible but not shown
                    currentTextContainer.alpha = 1; // Keep it transparent
                }

                // IMPORTANT CHANGE: Ensure the next text container remains visible and at full alpha
                if (nextTextContainer) {
                    nextTextContainer.visible = true;
                    nextTextContainer.alpha = 1;
                }

                console.log(`Transition to slide ${nextIndex} complete`);
            }
        });

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
            }, 0)
            .to(nextSlide, {
                alpha: 1,
                duration: 1,
                ease: 'power2.out',
            }, 0);

        // IMPORTANT CHANGE: Only animate the slide opacity, not the text container
        if (currentTextContainer && nextTextContainer) {
            tl.to(currentTextContainer, {
                alpha: 0, // Fade out current text
                duration: 1,
                ease: 'power2.out',
            }, 0)
                .to(nextTextContainer, {
                    alpha: 1, // Fade in next text
                    duration: 1,
                    ease: 'power2.out'
                }, 0);
        } else {
            console.warn(`Text containers not available for transition: current=${!!currentTextContainer}, next=${!!nextTextContainer}`);
        }

        // Update current index
        pixi.currentIndex.current = nextIndex;

        return tl;
    }, [pixi.slides.current, pixi.textContainers.current, pixi.currentIndex, props.transitionScaleIntensity]);

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

        // Set up resize handler using standard window event
        window.addEventListener('resize', handleResize);

        // Initial sizing
        handleResize();

        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, [pixi.app.current, pixi.slides.current]);

    return {
        transitionToSlide,
        slidesReady: pixi.slides.current.length > 0
    };
};