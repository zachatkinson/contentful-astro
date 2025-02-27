import { useEffect, useCallback } from 'react';
import { Sprite, Texture, Container, Assets} from 'pixi.js';
import { type EnhancedSprite, type HookParams } from '../types';
import { calculateSpriteScale } from '../utils/calculateSpriteScale';
import gsap from 'gsap';

/**
 * Hook to create and manage slide sprites
 */
export const useSlides = ({ sliderRef, pixi, props }: HookParams) => {
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

        // Get the stage container - either the first child or the stage itself
        const stage = app.stage.children[0] instanceof Container
            ? app.stage.children[0] as Container
            : app.stage;

        // Clear existing slides
        pixi.slides.current.forEach(sprite => {
            if (sprite && sprite.parent) {
                sprite.parent.removeChild(sprite);
            }
        });
        pixi.slides.current = [];

        // Create new slides
        props.images.forEach((image, index) => {
            try {
                console.log(`Loading image: ${image}`);
                const texture = Texture.from(image);

                // Create the sprite
                const sprite = new Sprite(texture) as EnhancedSprite;
                sprite.anchor.set(0.5);
                sprite.x = app.screen.width / 2;
                sprite.y = app.screen.height / 2;

                // Set initial state
                sprite.alpha = index === 0 ? 1 : 0; // Only show the first slide

                // Calculate scale once texture is loaded
                const handleTextureLoaded = () => {
                    // Calculate appropriate scale based on container and image dimensions
                    const scaleResult = calculateSpriteScale(
                        sprite.texture.width,
                        sprite.texture.height,
                        app.screen.width,
                        app.screen.height
                    );

                    // Apply the calculated scale
                    sprite.scale.set(scaleResult.scale);
                    sprite.baseScale = scaleResult.baseScale;

                    console.log(`Slide ${index} scaled: ${scaleResult.scale}`);
                };


// Load texture asynchronously
                Assets.load(image)
                    .then((texture) => {
                        if (!texture) {
                            console.error(`Failed to load texture for ${image}`);
                            return;
                        }

                        // Create the sprite
                        const sprite = new Sprite(texture) as EnhancedSprite;
                        sprite.anchor.set(0.5);
                        sprite.x = app.screen.width / 2;
                        sprite.y = app.screen.height / 2;

                        // Set initial state
                        sprite.alpha = index === 0 ? 1 : 0; // Only show the first slide

                        // Calculate scale
                        const scaleResult = calculateSpriteScale(
                            sprite.texture.width,
                            sprite.texture.height,
                            app.screen.width,
                            app.screen.height
                        );
                        sprite.scale.set(scaleResult.scale);
                        sprite.baseScale = scaleResult.baseScale;

                        // Add to stage and store reference
                        stage.addChild(sprite);
                        pixi.slides.current.push(sprite);

                        console.log(`Created slide ${index} for ${image}`);
                    })
                    .catch((error) => {
                        console.error(`Error loading texture for ${image}:`, error);
                    });

                // Add to stage and store reference
                stage.addChild(sprite);
                pixi.slides.current.push(sprite);

                console.log(`Created slide ${index} for ${image}`);
            } catch (error) {
                console.error(`Error creating slide for ${image}:`, error);
            }
        });

        return () => {
            // Cleanup
            pixi.slides.current.forEach(sprite => {
                if (sprite && sprite.parent) {
                    sprite.parent.removeChild(sprite);
                }
            });
            pixi.slides.current = [];
        };
    }, [pixi.app.current, props.images]);

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
        if (!nextSlide || !nextSlide.texture || !nextSlide.texture.source) {
            console.warn(`Slide ${nextIndex} is not ready for transition`);
            return;
        }

        // Ensure next elements start invisible
        nextSlide.alpha = 0;
        if (nextTextContainer) {
            nextTextContainer.alpha = 0;
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
                    ease: 'power2.out',
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