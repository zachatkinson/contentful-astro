/**
 * Update the useDisplacementEffects.ts hook to use Assets properly
 */

// In useDisplacementEffects.ts - update the effect creation:
import { useEffect, useCallback } from 'react';
import { Sprite, DisplacementFilter, Assets } from 'pixi.js';
import { gsap } from 'gsap';
import { type HookParams } from '../types';

/**
 * Default filter scales
 */
const DEFAULT_BG_FILTER_SCALE = 20;
const DEFAULT_CURSOR_FILTER_SCALE = 10;

/**
 * Hook to set up and manage displacement effects
 */
export const useDisplacementEffects = ({ sliderRef, pixi, props }: HookParams) => {
    // Set up displacement sprites and filters
    useEffect(() => {
        if (!pixi.app.current || !pixi.app.current.stage) {
            console.warn("App or stage not available for displacement effects");
            return;
        }

        console.log("Setting up displacement effects...");
        const app = pixi.app.current;

        // Load displacement textures using Assets API
        const setupDisplacementSprites = async () => {
            try {
                // Load background displacement texture
                const bgDisplacementUrl = props.backgroundDisplacementSpriteLocation || '/images/background-displace.jpg';
                let bgTexture;

                try {
                    // Try to get from cache first
                    bgTexture = Assets.get(bgDisplacementUrl);
                } catch (e) {
                    // If not in cache, load it
                    bgTexture = await Assets.load(bgDisplacementUrl);
                }

                // Create background displacement sprite
                const backgroundDisplacementSprite = new Sprite(bgTexture);
                backgroundDisplacementSprite.anchor.set(0.5);
                backgroundDisplacementSprite.x = app.screen.width / 2;
                backgroundDisplacementSprite.y = app.screen.height / 2;
                backgroundDisplacementSprite.scale.set(2);
                backgroundDisplacementSprite.alpha = 0;
                pixi.backgroundDisplacementSprite.current = backgroundDisplacementSprite;

                // Load cursor displacement texture
                const cursorDisplacementUrl = props.cursorDisplacementSpriteLocation || '/images/cursor-displace.png';
                let cursorTexture;

                try {
                    // Try to get from cache first
                    cursorTexture = Assets.get(cursorDisplacementUrl);
                } catch (e) {
                    // If not in cache, load it
                    cursorTexture = await Assets.load(cursorDisplacementUrl);
                }

                // Create cursor displacement sprite
                const cursorDisplacementSprite = new Sprite(cursorTexture);
                cursorDisplacementSprite.anchor.set(0.5);
                cursorDisplacementSprite.x = app.screen.width / 2;
                cursorDisplacementSprite.y = app.screen.height / 2;
                cursorDisplacementSprite.scale.set(props.cursorScaleIntensity || 0.65);
                cursorDisplacementSprite.alpha = 0;
                pixi.cursorDisplacementSprite.current = cursorDisplacementSprite;

                // Create displacement filters
                const backgroundDisplacementFilter = new DisplacementFilter(backgroundDisplacementSprite);
                const cursorDisplacementFilter = new DisplacementFilter(cursorDisplacementSprite);

                pixi.bgDispFilter.current = backgroundDisplacementFilter;
                pixi.cursorDispFilter.current = cursorDisplacementFilter;

                // Initialize filter scales to 0
                backgroundDisplacementFilter.scale.set(0);
                cursorDisplacementFilter.scale.set(0);

                // Add displacement sprites to the stage
                app.stage.addChild(backgroundDisplacementSprite, cursorDisplacementSprite);

                console.log("Displacement sprites and filters created");
            } catch (error) {
                console.error("Error setting up displacement effects:", error);
            }
        };

        setupDisplacementSprites();

        return () => {
            // Cleanup
            if (app.stage) {
                if (pixi.backgroundDisplacementSprite.current && pixi.backgroundDisplacementSprite.current.parent) {
                    pixi.backgroundDisplacementSprite.current.parent.removeChild(pixi.backgroundDisplacementSprite.current);
                }
                if (pixi.cursorDisplacementSprite.current && pixi.cursorDisplacementSprite.current.parent) {
                    pixi.cursorDisplacementSprite.current.parent.removeChild(pixi.cursorDisplacementSprite.current);
                }
            }
        };
    }, [pixi.app.current]);

    // Mouse tracking for cursor effects
    useEffect(() => {
        if (typeof window === 'undefined' || !sliderRef.current) return;

        const node = sliderRef.current;

        const updateCursorEffect = (e: MouseEvent) => {
            if (pixi.backgroundDisplacementSprite.current) {
                gsap.to(pixi.backgroundDisplacementSprite.current, {
                    x: e.clientX,
                    y: e.clientY,
                    duration: props.cursorMomentum || 0.14,
                    ease: 'power2.out',
                });
            }

            if (props.cursorImgEffect && pixi.cursorDisplacementSprite.current) {
                gsap.to(pixi.cursorDisplacementSprite.current, {
                    x: e.clientX,
                    y: e.clientY,
                    duration: props.cursorMomentum || 0.14,
                    ease: 'power2.out',
                });
            }
        };

        node.addEventListener('mousemove', updateCursorEffect);

        return () => {
            node.removeEventListener('mousemove', updateCursorEffect);
        };
    }, [sliderRef.current, props.cursorImgEffect, props.cursorMomentum]);

    /**
     * Show displacement effects
     */
    const showDisplacementEffects = useCallback(() => {
        console.log("Showing displacement effects");

        if (pixi.backgroundDisplacementSprite.current) {
            gsap.to(pixi.backgroundDisplacementSprite.current, {
                alpha: 1,
                duration: 0.5,
                ease: 'power2.out',
            });
        }

        if (props.cursorImgEffect && pixi.cursorDisplacementSprite.current) {
            gsap.to(pixi.cursorDisplacementSprite.current, {
                alpha: 1,
                duration: 0.5,
                ease: 'power2.out',
            });
        }

        if (pixi.bgDispFilter.current) {
            gsap.to(pixi.bgDispFilter.current.scale, {
                x: DEFAULT_BG_FILTER_SCALE,
                y: DEFAULT_BG_FILTER_SCALE,
                duration: 0.5,
                ease: 'power2.out',
            });
        }

        if (props.cursorImgEffect && pixi.cursorDispFilter.current) {
            gsap.to(pixi.cursorDispFilter.current.scale, {
                x: DEFAULT_CURSOR_FILTER_SCALE,
                y: DEFAULT_CURSOR_FILTER_SCALE,
                duration: 0.5,
                ease: 'power2.out',
            });
        }
    }, [pixi, props.cursorImgEffect]);

    /**
     * Hide displacement effects
     */
    const hideDisplacementEffects = useCallback(() => {
        console.log("Hiding displacement effects");

        if (pixi.backgroundDisplacementSprite.current) {
            gsap.to(pixi.backgroundDisplacementSprite.current, {
                alpha: 0,
                duration: 0.5,
                ease: 'power2.out',
            });
        }

        if (props.cursorImgEffect && pixi.cursorDisplacementSprite.current) {
            gsap.to(pixi.cursorDisplacementSprite.current, {
                alpha: 0,
                duration: 0.5,
                ease: 'power2.out',
            });
        }

        if (pixi.bgDispFilter.current) {
            gsap.to(pixi.bgDispFilter.current.scale, {
                x: 0,
                y: 0,
                duration: 0.5,
                ease: 'power2.out',
            });
        }

        if (props.cursorImgEffect && pixi.cursorDispFilter.current) {
            gsap.to(pixi.cursorDispFilter.current.scale, {
                x: 0,
                y: 0,
                duration: 0.5,
                ease: 'power2.out',
            });
        }
    }, [pixi, props.cursorImgEffect]);

    return {
        showDisplacementEffects,
        hideDisplacementEffects,
        DEFAULT_BG_FILTER_SCALE,
        DEFAULT_CURSOR_FILTER_SCALE
    };
};