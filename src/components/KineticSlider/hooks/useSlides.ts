import { useEffect, useCallback } from 'react';
import { Sprite, Texture, Container } from 'pixi.js';
import { type EnhancedSprite, type HookParams } from '../types';
import { calculateSpriteScale } from '../utils/calculateSpriteScale';
import gsap from 'gsap';

/**
 * Hook to create and manage slide sprites
 */
export const useSlides = ({ sliderRef, pixi, props }: HookParams) => {
    // Create slides for each image
    useEffect(() => {
        if (!pixi.app.current || !pixi.app.current.stage || !props.images.length) {
            console.warn("App, stage, or images not available for slides");
            return;
        }

        console.log("Creating slides for", props.images.length, "images");
        const app = pixi.app.current;
        const stage = app.stage.children[0] as Container || app.stage;

        // Clear existing slides
        pixi.slides.current.forEach(sprite => {
            if (sprite.parent) {
                sprite.parent.removeChild(sprite);
            }
        });
        pixi.slides.current = [];

        // Create new slides
        props.images.forEach((image) => {
            try {
                const sprite = new Sprite(Texture.from(image)) as EnhancedSprite;
                sprite.anchor.set(0.5);
                sprite.x = app.screen.width / 2;
                sprite.y = app.screen.height / 2;

                // Calculate appropriate scale based on container and image dimensions
                const scale = calculateSpriteScale(
                    sprite.texture.width,
                    sprite.texture.height,
                    app.screen.width,
                    app.screen.height
                );

                // Apply the calculated scale
                sprite.scale.set(scale.scale);
                sprite.baseScale = scale.baseScale;
                sprite.alpha = 0;

                // Add to stage and store reference
                stage.addChild(sprite);
                pixi.slides.current.push(sprite);

                console.log(`Created slide for ${image}`);
            } catch (error) {
                console.error(`Error creating slide for ${image}:`, error);
            }
        });

        // Show the first slide
        if (pixi.slides.current.length > 0) {
            pixi.slides.current[0].alpha = 1;
            console.log("First slide visible");
        }

        return () => {
            // Cleanup
            pixi.slides.current.forEach(sprite => {
                if (sprite.parent) {
                    sprite.parent.removeChild(sprite);
                }
            });
            pixi.slides.current = [];
        };
    }, [pixi.app.current, props.images]);

    // Handle window resize for slides
    useEffect(() => {
        if (!pixi.app.current || !sliderRef.current) return;

        const handleResize = () => {
            const app = pixi.app.current;
            if (!app) return;

            const containerWidth = sliderRef.current?.clientWidth || 0;
            const containerHeight = sliderRef.current?.clientHeight || 0;

            // Resize each slide sprite
            pixi.slides.current.forEach((sprite) => {
                if (!sprite.texture) return;

                // Recalculate scale based on new dimensions
                const newScale = calculateSpriteScale(
                    sprite.texture.width,
                    sprite.texture.height,
                    containerWidth,
                    containerHeight
                );

                sprite.scale.set(newScale.scale);
                sprite.baseScale = newScale.baseScale;
                sprite.x = containerWidth / 2;
                sprite.y = containerHeight / 2;
            });
        };

        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, [sliderRef.current, pixi.app.current, pixi.slides.current]);

    /**
     * Transition to a specific slide
     * @param nextIndex - Index of the slide to transition to
     */
    const transitionToSlide = useCallback((nextIndex: number) => {
        if (nextIndex < 0 || nextIndex >= pixi.slides.current.length) {
            console.warn(`Invalid slide index: ${nextIndex}`);
            return;
        }

        console.log(`Transitioning to slide ${nextIndex}`);

        const tl = gsap.timeline();
        const currentIndex = pixi.currentIndex.current;
        const currentSlide = pixi.slides.current[currentIndex];
        const currentTextContainer = pixi.textContainers.current[currentIndex];
        const nextSlide = pixi.slides.current[nextIndex];
        const nextTextContainer = pixi.textContainers.current[nextIndex];

        // Ensure next elements start invisible
        nextSlide.alpha = 0;
        nextTextContainer.alpha = 0;

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
            .to([currentSlide, currentTextContainer], {
                alpha: 0,
                duration: 1,
                ease: 'power2.out',
            }, 0)
            .to([nextSlide, nextTextContainer], {
                alpha: 1,
                duration: 1,
                ease: 'power2.out',
            }, 0);

        // Update current index
        pixi.currentIndex.current = nextIndex;

        console.log(`Current slide is now ${nextIndex}`);

        return tl;
    }, [pixi.slides.current, pixi.textContainers.current, pixi.currentIndex, props.transitionScaleIntensity]);

    return {
        transitionToSlide
    };
};