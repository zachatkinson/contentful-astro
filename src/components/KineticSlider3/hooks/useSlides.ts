import { useEffect, useCallback } from 'react';
import { Sprite, Container, Assets } from 'pixi.js';
import { type EnhancedSprite, type HookParams } from '../types';
import { calculateSpriteScale } from '../utils/calculateSpriteScale';
import { gsap } from 'gsap';
import ResourceManager from '../managers/ResourceManager';

/**
 * Hook to create and manage slide sprites
 */
export const useSlides = ({ sliderRef, pixi, props, resourceManager }: HookParams & { resourceManager?: ResourceManager | null }) => {
    // Create slides for each image
    useEffect(() => {
        if (!pixi.app.current || !pixi.app.current.stage) {
            console.log("App or stage not available for slides, deferring initialization");
            return;
        }

        // Check if we have images to display
        if (!props.images.length) {
            console.warn("No images provided for slides");
            return;
        }

        console.log("Creating slides for", props.images.length, "images");
        const app = pixi.app.current;

        // Create a dedicated container for slides if it doesn't exist
        let slidesContainer: Container;
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

        // Clear existing slides
        pixi.slides.current.forEach(sprite => {
            if (sprite && sprite.parent) {
                sprite.parent.removeChild(sprite);
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
                    console.log(`Loading ${imagesToLoad.length} uncached images...`);
                    await Assets.load(imagesToLoad);
                }

                // Create slides for each image
                props.images.forEach((image, index) => {
                    try {
                        console.log(`Creating slide from image: ${image}`);

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

                        // Track the sprite with resource manager if available
                        if (resourceManager) {
                            resourceManager.trackDisplayObject(sprite);
                        }

                        // Set initial state - only show the first slide
                        sprite.alpha = index === 0 ? 1 : 0;
                        sprite.visible = index === 0;

                        // Calculate and apply scale
                        const { scale, baseScale } = calculateSpriteScale(
                            texture.width,
                            texture.height,
                            app.screen.width,
                            app.screen.height
                        );

                        sprite.scale.set(scale);
                        sprite.baseScale = baseScale;

                        // Add to container and store reference
                        slidesContainer.addChild(sprite);
                        pixi.slides.current.push(sprite);

                        console.log(`Created slide ${index} for ${image}`);
                    } catch (error) {
                        console.error(`Error creating slide for ${image}:`, error);
                    }
                });
            } catch (error) {
                console.error("Error loading slide images:", error);
            }
        };

        loadSlides();

        // No need for manual cleanup - ResourceManager will handle it
    }, [pixi.app.current, props.images, resourceManager]);

    /**
     * Transition to a specific slide
     * @param nextIndex - Index of the slide to transition to
     */
    const transitionToSlide = useCallback((nextIndex: number) => {
        if (!pixi.slides.current.length) {
            console.warn("No slides available for transition");
            return;
        }

        if (nextIndex < 0 || nextIndex >= pixi.slides.current.length) {
            console.warn(`Invalid slide index: ${nextIndex}`);
            return;
        }

        console.log(`Transitioning to slide ${nextIndex}`);

        const tl = gsap.timeline();
        const currentIndex = pixi.currentIndex.current;
        const currentSlide = pixi.slides.current[currentIndex];
        const nextSlide = pixi.slides.current[nextIndex];

        // Handle text containers if available
        const currentTextContainer = pixi.textContainers.current[currentIndex];
        const nextTextContainer = pixi.textContainers.current[nextIndex];

        // Ensure next slide is loaded
        if (!nextSlide || !nextSlide.texture) {
            console.warn(`Slide ${nextIndex} is not ready for transition`);
            return;
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
                    // IMPORTANT: Hide previous slide after transition completes
                    currentSlide.visible = false;
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
                    // IMPORTANT: Hide previous text after transition completes
                    currentTextContainer.visible = false;
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

        console.log(`Current slide is now ${nextIndex}`);

        return tl;
    }, [pixi.slides.current, pixi.textContainers.current, pixi.currentIndex, props.transitionScaleIntensity]);

    return {
        transitionToSlide
    };
};