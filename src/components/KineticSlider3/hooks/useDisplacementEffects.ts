import { useEffect, useCallback, useRef, type RefObject } from 'react';
import { Sprite, DisplacementFilter, Assets, Application } from 'pixi.js';
import { gsap } from 'gsap';
import ResourceManager from '../managers/ResourceManager';

interface UseDisplacementEffectsProps {
    sliderRef: RefObject<HTMLDivElement | null>;
    bgDispFilterRef: RefObject<DisplacementFilter | null>;
    cursorDispFilterRef: RefObject<DisplacementFilter | null>;
    backgroundDisplacementSpriteRef: RefObject<Sprite | null>;
    cursorDisplacementSpriteRef: RefObject<Sprite | null>;
    appRef: RefObject<Application | null>;
    backgroundDisplacementSpriteLocation: string;
    cursorDisplacementSpriteLocation: string;
    cursorImgEffect: boolean;
    cursorScaleIntensity: number;
    resourceManager?: ResourceManager | null;
}

/**
 * Default filter scales
 */
const DEFAULT_BG_FILTER_SCALE = 20;
const DEFAULT_CURSOR_FILTER_SCALE = 10;

/**
 * Hook to set up and manage displacement effects
 */
export const useDisplacementEffects = ({
                                           sliderRef,
                                           bgDispFilterRef,
                                           cursorDispFilterRef,
                                           backgroundDisplacementSpriteRef,
                                           cursorDisplacementSpriteRef,
                                           appRef,
                                           backgroundDisplacementSpriteLocation,
                                           cursorDisplacementSpriteLocation,
                                           cursorImgEffect,
                                           cursorScaleIntensity,
                                           resourceManager
                                       }: UseDisplacementEffectsProps) => {
    // Track mounted state to prevent updates after unmounting
    const isMountedRef = useRef(true);

    // Track initialization state
    const isInitialized = useRef(false);

    // Early return for server-side rendering
    if (typeof window === 'undefined') {
        return {
            showDisplacementEffects: () => {},
            hideDisplacementEffects: () => {},
            DEFAULT_BG_FILTER_SCALE,
            DEFAULT_CURSOR_FILTER_SCALE
        };
    }

    // Set up displacement sprites and filters
    useEffect(() => {
        // Reset mount state on each mount
        isMountedRef.current = true;

        // Guard clauses for initialization state
        if (isInitialized.current) {
            return;
        }

        // Guard clause for appRef itself
        if (!appRef) {
            console.log("App ref is not provided, skipping displacement effects setup");
            return;
        }

        // Guard clause for appRef.current
        if (!appRef.current) {
            console.log("App instance not yet available, waiting for initialization");
            return;
        }

        // Guard clause for stage
        if (!appRef.current.stage) {
            console.log("Stage not available for displacement effects, waiting for initialization");
            return;
        }

        // Guard clause for screen dimensions
        if (!appRef.current.screen || !appRef.current.screen.width || !appRef.current.screen.height) {
            console.log("Screen dimensions not available, waiting for initialization");
            return;
        }

        console.log("Setting up displacement effects...");
        const app = appRef.current;

        // Load displacement textures using Assets API
        const setupDisplacementSprites = async () => {
            try {
                // Load background displacement texture
                const bgDisplacementUrl = backgroundDisplacementSpriteLocation || '/images/background-displace.jpg';
                let bgTexture;

                try {
                    // Try to get from cache first
                    bgTexture = Assets.get(bgDisplacementUrl);
                } catch (e) {
                    // If not in cache, load it
                    bgTexture = await Assets.load(bgDisplacementUrl);
                }

                // Check if component is still mounted
                if (!isMountedRef.current) return;

                // Track the texture with resource manager if available
                if (resourceManager) {
                    resourceManager.trackTexture(bgDisplacementUrl, bgTexture);
                }

                // Create background displacement sprite
                const backgroundDisplacementSprite = new Sprite(bgTexture);
                backgroundDisplacementSprite.anchor.set(0.5);

                // Safe access to screen dimensions
                const screenWidth = app.screen?.width || 800;
                const screenHeight = app.screen?.height || 600;

                backgroundDisplacementSprite.x = screenWidth / 2;
                backgroundDisplacementSprite.y = screenHeight / 2;
                backgroundDisplacementSprite.scale.set(2);
                backgroundDisplacementSprite.alpha = 0;

                // Track the sprite with resource manager if available
                if (resourceManager) {
                    resourceManager.trackDisplayObject(backgroundDisplacementSprite);
                }

                // Check if still mounted before updating refs
                if (!isMountedRef.current) return;

                backgroundDisplacementSpriteRef.current = backgroundDisplacementSprite;

                // Load cursor displacement texture
                const cursorDisplacementUrl = cursorDisplacementSpriteLocation || '/images/cursor-displace.png';
                let cursorTexture;

                try {
                    // Try to get from cache first
                    cursorTexture = Assets.get(cursorDisplacementUrl);
                } catch (e) {
                    // If not in cache, load it
                    cursorTexture = await Assets.load(cursorDisplacementUrl);
                }

                // Check if component is still mounted
                if (!isMountedRef.current) return;

                // Track the texture with resource manager if available
                if (resourceManager) {
                    resourceManager.trackTexture(cursorDisplacementUrl, cursorTexture);
                }

                // Create cursor displacement sprite
                const cursorDisplacementSprite = new Sprite(cursorTexture);
                cursorDisplacementSprite.anchor.set(0.5);
                cursorDisplacementSprite.x = screenWidth / 2;
                cursorDisplacementSprite.y = screenHeight / 2;
                cursorDisplacementSprite.scale.set(cursorScaleIntensity || 0.65);
                cursorDisplacementSprite.alpha = 0;

                // Track the sprite with resource manager if available
                if (resourceManager) {
                    resourceManager.trackDisplayObject(cursorDisplacementSprite);
                }

                // Check if still mounted before updating refs
                if (!isMountedRef.current) return;

                cursorDisplacementSpriteRef.current = cursorDisplacementSprite;

                // Create displacement filters
                const backgroundDisplacementFilter = new DisplacementFilter(backgroundDisplacementSprite);
                const cursorDisplacementFilter = new DisplacementFilter(cursorDisplacementSprite);

                // Track the filters with resource manager if available
                if (resourceManager) {
                    resourceManager.trackFilter(backgroundDisplacementFilter);
                    resourceManager.trackFilter(cursorDisplacementFilter);
                }

                // Check if still mounted before updating refs
                if (!isMountedRef.current) return;

                bgDispFilterRef.current = backgroundDisplacementFilter;
                cursorDispFilterRef.current = cursorDisplacementFilter;

                // Initialize filter scales to 0
                backgroundDisplacementFilter.scale.set(0);
                cursorDisplacementFilter.scale.set(0);

                // Add displacement sprites to the stage - additional guard clause
                if (app.stage) {
                    app.stage.addChild(backgroundDisplacementSprite, cursorDisplacementSprite);
                } else {
                    console.warn("Cannot add displacement sprites: stage is not available");
                }

                // Mark as initialized to prevent duplicate setup
                isInitialized.current = true;

                console.log("Displacement sprites and filters created successfully");
            } catch (error) {
                console.error("Error setting up displacement effects:", error);
            }
        };

        setupDisplacementSprites();

        // Clean up on unmount
        return () => {
            // Mark as unmounted
            isMountedRef.current = false;

            // Note: ResourceManager will handle disposal of all filters and sprites
            // No explicit cleanup needed here as it's handled centrally
        };
    }, [
        appRef,
        backgroundDisplacementSpriteLocation,
        cursorDisplacementSpriteLocation,
        cursorScaleIntensity,
        resourceManager
    ]);

    /**
     * Show displacement effects
     */
    const showDisplacementEffects = useCallback(() => {
        // Skip if not initialized or component unmounted
        if (!backgroundDisplacementSpriteRef?.current || !bgDispFilterRef?.current || !isMountedRef.current) {
            console.log("Cannot show displacement effects - not initialized yet or component unmounted");
            return;
        }

        console.log("Showing displacement effects");

        // Create and track the animation for the background sprite
        if (backgroundDisplacementSpriteRef.current) {
            const bgSpriteTween = gsap.to(backgroundDisplacementSpriteRef.current, {
                alpha: 1,
                duration: 0.5,
                ease: 'power2.out',
                onComplete: () => {
                    // Re-track the sprite after animation if still mounted
                    if (resourceManager && backgroundDisplacementSpriteRef.current && isMountedRef.current) {
                        resourceManager.trackDisplayObject(backgroundDisplacementSpriteRef.current);
                    }
                }
            });

            // Track the animation
            if (resourceManager) {
                resourceManager.trackAnimation(bgSpriteTween);
            }
        }

        // Create and track the animation for the cursor sprite
        if (cursorImgEffect && cursorDisplacementSpriteRef?.current) {
            const cursorSpriteTween = gsap.to(cursorDisplacementSpriteRef.current, {
                alpha: 1,
                duration: 0.5,
                ease: 'power2.out',
                onComplete: () => {
                    // Re-track the sprite after animation if still mounted
                    if (resourceManager && cursorDisplacementSpriteRef.current && isMountedRef.current) {
                        resourceManager.trackDisplayObject(cursorDisplacementSpriteRef.current);
                    }
                }
            });

            // Track the animation
            if (resourceManager) {
                resourceManager.trackAnimation(cursorSpriteTween);
            }
        }

        // Create and track the animation for the background filter scale
        if (bgDispFilterRef.current) {
            const bgFilterTween = gsap.to(bgDispFilterRef.current.scale, {
                x: DEFAULT_BG_FILTER_SCALE,
                y: DEFAULT_BG_FILTER_SCALE,
                duration: 0.5,
                ease: 'power2.out',
                onComplete: () => {
                    // Re-track the filter after animation if still mounted
                    if (resourceManager && bgDispFilterRef.current && isMountedRef.current) {
                        resourceManager.trackFilter(bgDispFilterRef.current);
                    }
                }
            });

            // Track the animation
            if (resourceManager) {
                resourceManager.trackAnimation(bgFilterTween);
            }
        }

        // Create and track the animation for the cursor filter scale
        if (cursorImgEffect && cursorDispFilterRef?.current) {
            const cursorFilterTween = gsap.to(cursorDispFilterRef.current.scale, {
                x: DEFAULT_CURSOR_FILTER_SCALE,
                y: DEFAULT_CURSOR_FILTER_SCALE,
                duration: 0.5,
                ease: 'power2.out',
                onComplete: () => {
                    // Re-track the filter after animation if still mounted
                    if (resourceManager && cursorDispFilterRef.current && isMountedRef.current) {
                        resourceManager.trackFilter(cursorDispFilterRef.current);
                    }
                }
            });

            // Track the animation
            if (resourceManager) {
                resourceManager.trackAnimation(cursorFilterTween);
            }
        }
    }, [
        backgroundDisplacementSpriteRef,
        bgDispFilterRef,
        cursorDisplacementSpriteRef,
        cursorDispFilterRef,
        cursorImgEffect,
        resourceManager
    ]);

    /**
     * Hide displacement effects
     */
    const hideDisplacementEffects = useCallback(() => {
        // Skip if not initialized or component unmounted
        if (!backgroundDisplacementSpriteRef?.current || !bgDispFilterRef?.current || !isMountedRef.current) {
            return;
        }

        console.log("Hiding displacement effects");

        // Create and track the animation for the background sprite
        if (backgroundDisplacementSpriteRef.current) {
            const bgSpriteTween = gsap.to(backgroundDisplacementSpriteRef.current, {
                alpha: 0,
                duration: 0.5,
                ease: 'power2.out',
                onComplete: () => {
                    // Re-track the sprite after animation if still mounted
                    if (resourceManager && backgroundDisplacementSpriteRef.current && isMountedRef.current) {
                        resourceManager.trackDisplayObject(backgroundDisplacementSpriteRef.current);
                    }
                }
            });

            // Track the animation
            if (resourceManager) {
                resourceManager.trackAnimation(bgSpriteTween);
            }
        }

        // Create and track the animation for the cursor sprite
        if (cursorImgEffect && cursorDisplacementSpriteRef?.current) {
            const cursorSpriteTween = gsap.to(cursorDisplacementSpriteRef.current, {
                alpha: 0,
                duration: 0.5,
                ease: 'power2.out',
                onComplete: () => {
                    // Re-track the sprite after animation if still mounted
                    if (resourceManager && cursorDisplacementSpriteRef.current && isMountedRef.current) {
                        resourceManager.trackDisplayObject(cursorDisplacementSpriteRef.current);
                    }
                }
            });

            // Track the animation
            if (resourceManager) {
                resourceManager.trackAnimation(cursorSpriteTween);
            }
        }

        // Create and track the animation for the background filter scale
        if (bgDispFilterRef.current) {
            const bgFilterTween = gsap.to(bgDispFilterRef.current.scale, {
                x: 0,
                y: 0,
                duration: 0.5,
                ease: 'power2.out',
                onComplete: () => {
                    // Re-track the filter after animation if still mounted
                    if (resourceManager && bgDispFilterRef.current && isMountedRef.current) {
                        resourceManager.trackFilter(bgDispFilterRef.current);
                    }
                }
            });

            // Track the animation
            if (resourceManager) {
                resourceManager.trackAnimation(bgFilterTween);
            }
        }

        // Create and track the animation for the cursor filter scale
        if (cursorImgEffect && cursorDispFilterRef?.current) {
            const cursorFilterTween = gsap.to(cursorDispFilterRef.current.scale, {
                x: 0,
                y: 0,
                duration: 0.5,
                ease: 'power2.out',
                onComplete: () => {
                    // Re-track the filter after animation if still mounted
                    if (resourceManager && cursorDispFilterRef.current && isMountedRef.current) {
                        resourceManager.trackFilter(cursorDispFilterRef.current);
                    }
                }
            });

            // Track the animation
            if (resourceManager) {
                resourceManager.trackAnimation(cursorFilterTween);
            }
        }
    }, [
        backgroundDisplacementSpriteRef,
        bgDispFilterRef,
        cursorDisplacementSpriteRef,
        cursorDispFilterRef,
        cursorImgEffect,
        resourceManager
    ]);

    return {
        showDisplacementEffects,
        hideDisplacementEffects,
        DEFAULT_BG_FILTER_SCALE,
        DEFAULT_CURSOR_FILTER_SCALE
    };
};