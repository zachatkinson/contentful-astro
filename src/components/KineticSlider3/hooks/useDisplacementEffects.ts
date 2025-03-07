import { useEffect, useCallback, useRef } from 'react';
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
    // Track initialization state
    const isInitialized = useRef(false);

    // Track active GSAP animations for proper cleanup
    const activeAnimations = useRef<gsap.core.Tween[]>([]);

    // Helper function to kill active animations
    const killActiveAnimations = useCallback(() => {
        activeAnimations.current.forEach(tween => {
            if (tween) {
                tween.kill();
            }
        });
        activeAnimations.current = [];
    }, []);

    // Set up displacement sprites and filters
    useEffect(() => {
        // Skip if already initialized
        if (isInitialized.current) {
            return;
        }

        // Skip if app is not initialized
        if (!pixi.app.current) {
            console.log("App not available for displacement effects, waiting for initialization");
            return;
        }

        // Skip if stage is not available
        if (!pixi.app.current.stage) {
            console.log("Stage not available for displacement effects, waiting for initialization");
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
                    if (!bgTexture) {
                        // If not in cache, load it
                        bgTexture = await Assets.load(bgDisplacementUrl);
                    }
                } catch (e) {
                    console.warn("Error loading from cache, attempting direct load", e);
                    // If error with cache, load it directly
                    bgTexture = await Assets.load(bgDisplacementUrl);
                }

                // Create background displacement sprite
                const backgroundDisplacementSprite = new Sprite(bgTexture);
                backgroundDisplacementSprite.anchor.set(0.5);
                backgroundDisplacementSprite.x = app.screen.width / 2;
                backgroundDisplacementSprite.y = app.screen.height / 2;
                backgroundDisplacementSprite.scale.set(2);
                backgroundDisplacementSprite.alpha = 0; // Start transparent
                pixi.backgroundDisplacementSprite.current = backgroundDisplacementSprite;

                console.log("Background displacement sprite created");

                // Load cursor displacement texture
                const cursorDisplacementUrl = props.cursorDisplacementSpriteLocation || '/images/cursor-displace.png';
                let cursorTexture;

                try {
                    // Try to get from cache first
                    cursorTexture = Assets.get(cursorDisplacementUrl);
                    if (!cursorTexture) {
                        // If not in cache, load it
                        cursorTexture = await Assets.load(cursorDisplacementUrl);
                    }
                } catch (e) {
                    console.warn("Error loading from cache, attempting direct load", e);
                    // If error with cache, load it directly
                    cursorTexture = await Assets.load(cursorDisplacementUrl);
                }

                // Create cursor displacement sprite
                const cursorDisplacementSprite = new Sprite(cursorTexture);
                cursorDisplacementSprite.anchor.set(0.5);
                cursorDisplacementSprite.x = app.screen.width / 2;
                cursorDisplacementSprite.y = app.screen.height / 2;
                cursorDisplacementSprite.scale.set(props.cursorScaleIntensity || 0.65);
                cursorDisplacementSprite.alpha = 0; // Start transparent
                pixi.cursorDisplacementSprite.current = cursorDisplacementSprite;

                console.log("Cursor displacement sprite created");

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

                // Mark as initialized to prevent duplicate setup
                isInitialized.current = true;

                console.log("Displacement sprites and filters created successfully");
            } catch (error) {
                console.error("Error setting up displacement effects:", error);
            }
        };

        setupDisplacementSprites();

        return () => {
            // Kill any active animations
            killActiveAnimations();

            // Cleanup sprites
            if (app && app.stage) {
                if (pixi.backgroundDisplacementSprite.current && pixi.backgroundDisplacementSprite.current.parent) {
                    pixi.backgroundDisplacementSprite.current.parent.removeChild(pixi.backgroundDisplacementSprite.current);
                }
                if (pixi.cursorDisplacementSprite.current && pixi.cursorDisplacementSprite.current.parent) {
                    pixi.cursorDisplacementSprite.current.parent.removeChild(pixi.cursorDisplacementSprite.current);
                }
            }
            isInitialized.current = false;
        };
    }, [pixi.app.current, props.backgroundDisplacementSpriteLocation, props.cursorDisplacementSpriteLocation, props.cursorScaleIntensity, killActiveAnimations]);

    // Mouse tracking for cursor effects
    useEffect(() => {
        if (typeof window === 'undefined' || !sliderRef.current) return;

        // Skip if displacement sprites are not set up
        if (!pixi.backgroundDisplacementSprite.current) return;

        const node = sliderRef.current;

        const updateCursorEffect = (e: MouseEvent) => {
            if (pixi.backgroundDisplacementSprite.current) {
                // Track the animation
                const bgTween = gsap.to(pixi.backgroundDisplacementSprite.current, {
                    x: e.clientX,
                    y: e.clientY,
                    duration: props.cursorMomentum || 0.14,
                    ease: 'power2.out',
                });
                activeAnimations.current.push(bgTween);
            }

            if (props.cursorImgEffect && pixi.cursorDisplacementSprite.current) {
                // Track the animation
                const cursorTween = gsap.to(pixi.cursorDisplacementSprite.current, {
                    x: e.clientX,
                    y: e.clientY,
                    duration: props.cursorMomentum || 0.14,
                    ease: 'power2.out',
                });
                activeAnimations.current.push(cursorTween);
            }

            // Clean up older animations to avoid accumulation
            // Only keep recent animations (last 5 should be sufficient for this effect)
            if (activeAnimations.current.length > 5) {
                const oldTweens = activeAnimations.current.slice(0, activeAnimations.current.length - 5);
                oldTweens.forEach(tween => {
                    tween.kill();
                });
                activeAnimations.current = activeAnimations.current.slice(-5);
            }
        };

        node.addEventListener('mousemove', updateCursorEffect);

        return () => {
            node.removeEventListener('mousemove', updateCursorEffect);
            // Kill any remaining animations
            killActiveAnimations();
        };
    }, [sliderRef.current, pixi.backgroundDisplacementSprite.current, pixi.cursorDisplacementSprite.current, props.cursorImgEffect, props.cursorMomentum, killActiveAnimations]);

    /**
     * Show displacement effects
     */
    const showDisplacementEffects = useCallback(() => {
        // Skip if not initialized
        if (!pixi.backgroundDisplacementSprite.current || !pixi.bgDispFilter.current) {
            console.log("Cannot show displacement effects - not initialized yet");
            return;
        }

        console.log("Showing displacement effects");

        // Kill any existing animations to prevent interference
        killActiveAnimations();

        // Track new animations
        const bgSpriteTween = gsap.to(pixi.backgroundDisplacementSprite.current, {
            alpha: 1,
            duration: 0.5,
            ease: 'power2.out',
        });
        activeAnimations.current.push(bgSpriteTween);

        if (props.cursorImgEffect && pixi.cursorDisplacementSprite.current) {
            const cursorSpriteTween = gsap.to(pixi.cursorDisplacementSprite.current, {
                alpha: 1,
                duration: 0.5,
                ease: 'power2.out',
            });
            activeAnimations.current.push(cursorSpriteTween);
        }

        const bgFilterTween = gsap.to(pixi.bgDispFilter.current.scale, {
            x: DEFAULT_BG_FILTER_SCALE,
            y: DEFAULT_BG_FILTER_SCALE,
            duration: 0.5,
            ease: 'power2.out',
        });
        activeAnimations.current.push(bgFilterTween);

        if (props.cursorImgEffect && pixi.cursorDispFilter.current) {
            const cursorFilterTween = gsap.to(pixi.cursorDispFilter.current.scale, {
                x: DEFAULT_CURSOR_FILTER_SCALE,
                y: DEFAULT_CURSOR_FILTER_SCALE,
                duration: 0.5,
                ease: 'power2.out',
            });
            activeAnimations.current.push(cursorFilterTween);
        }
    }, [pixi, props.cursorImgEffect, killActiveAnimations]);

    /**
     * Hide displacement effects
     */
    const hideDisplacementEffects = useCallback(() => {
        // Skip if not initialized
        if (!pixi.backgroundDisplacementSprite.current || !pixi.bgDispFilter.current) {
            return;
        }

        console.log("Hiding displacement effects");

        // Kill any existing animations to prevent interference
        killActiveAnimations();

        // Track new animations
        const bgSpriteTween = gsap.to(pixi.backgroundDisplacementSprite.current, {
            alpha: 0,
            duration: 0.5,
            ease: 'power2.out',
        });
        activeAnimations.current.push(bgSpriteTween);

        if (props.cursorImgEffect && pixi.cursorDisplacementSprite.current) {
            const cursorSpriteTween = gsap.to(pixi.cursorDisplacementSprite.current, {
                alpha: 0,
                duration: 0.5,
                ease: 'power2.out',
            });
            activeAnimations.current.push(cursorSpriteTween);
        }

        const bgFilterTween = gsap.to(pixi.bgDispFilter.current.scale, {
            x: 0,
            y: 0,
            duration: 0.5,
            ease: 'power2.out',
        });
        activeAnimations.current.push(bgFilterTween);

        if (props.cursorImgEffect && pixi.cursorDispFilter.current) {
            const cursorFilterTween = gsap.to(pixi.cursorDispFilter.current.scale, {
                x: 0,
                y: 0,
                duration: 0.5,
                ease: 'power2.out',
            });
            activeAnimations.current.push(cursorFilterTween);
        }
    }, [pixi, props.cursorImgEffect, killActiveAnimations]);

    return {
        showDisplacementEffects,
        hideDisplacementEffects,
        DEFAULT_BG_FILTER_SCALE,
        DEFAULT_CURSOR_FILTER_SCALE,
        killActiveAnimations, // Expose the cleanup function for external use
    };
};