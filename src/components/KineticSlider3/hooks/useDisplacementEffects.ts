import { useEffect, useCallback, useRef } from 'react';
import { Sprite, DisplacementFilter, Assets } from 'pixi.js';
import { gsap } from 'gsap';
import ResourceManager from '../managers/ResourceManager';

interface UseDisplacementEffectsProps {
    sliderRef: React.RefObject<HTMLDivElement | null>;
    bgDispFilterRef: React.RefObject<DisplacementFilter | null>;
    cursorDispFilterRef: React.RefObject<DisplacementFilter | null>;
    backgroundDisplacementSpriteRef: React.RefObject<Sprite | null>;
    cursorDisplacementSpriteRef: React.RefObject<Sprite | null>;
    appRef: React.RefObject<any>;
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
    // Early return for server-side rendering
    if (typeof window === 'undefined') {
        return {
            showDisplacementEffects: () => {},
            hideDisplacementEffects: () => {},
            DEFAULT_BG_FILTER_SCALE,
            DEFAULT_CURSOR_FILTER_SCALE
        };
    }

    // Track initialization state
    const isInitialized = useRef(false);

    // Set up displacement sprites and filters
    useEffect(() => {
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

                cursorDisplacementSpriteRef.current = cursorDisplacementSprite;

                // Create displacement filters
                const backgroundDisplacementFilter = new DisplacementFilter(backgroundDisplacementSprite);
                const cursorDisplacementFilter = new DisplacementFilter(cursorDisplacementSprite);

                // Track the filters with resource manager if available
                if (resourceManager) {
                    resourceManager.trackFilter(backgroundDisplacementFilter);
                    resourceManager.trackFilter(cursorDisplacementFilter);
                }

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

        // No need for manual cleanup - ResourceManager will handle disposal
    }, [
        appRef, // Using ref object, not .current
        backgroundDisplacementSpriteLocation,
        cursorDisplacementSpriteLocation,
        cursorScaleIntensity,
        resourceManager
    ]);

    /**
     * Show displacement effects
     */
    const showDisplacementEffects = useCallback(() => {
        // Skip if not initialized
        if (!backgroundDisplacementSpriteRef?.current || !bgDispFilterRef?.current) {
            console.log("Cannot show displacement effects - not initialized yet");
            return;
        }

        console.log("Showing displacement effects");

        gsap.to(backgroundDisplacementSpriteRef.current, {
            alpha: 1,
            duration: 0.5,
            ease: 'power2.out',
        });

        if (cursorImgEffect && cursorDisplacementSpriteRef?.current) {
            gsap.to(cursorDisplacementSpriteRef.current, {
                alpha: 1,
                duration: 0.5,
                ease: 'power2.out',
            });
        }

        gsap.to(bgDispFilterRef.current.scale, {
            x: DEFAULT_BG_FILTER_SCALE,
            y: DEFAULT_BG_FILTER_SCALE,
            duration: 0.5,
            ease: 'power2.out',
        });

        if (cursorImgEffect && cursorDispFilterRef?.current) {
            gsap.to(cursorDispFilterRef.current.scale, {
                x: DEFAULT_CURSOR_FILTER_SCALE,
                y: DEFAULT_CURSOR_FILTER_SCALE,
                duration: 0.5,
                ease: 'power2.out',
            });
        }
    }, [
        backgroundDisplacementSpriteRef, // Using ref object, not .current
        bgDispFilterRef,
        cursorDisplacementSpriteRef,
        cursorDispFilterRef,
        cursorImgEffect
    ]);

    /**
     * Hide displacement effects
     */
    const hideDisplacementEffects = useCallback(() => {
        // Skip if not initialized
        if (!backgroundDisplacementSpriteRef?.current || !bgDispFilterRef?.current) {
            return;
        }

        console.log("Hiding displacement effects");

        gsap.to(backgroundDisplacementSpriteRef.current, {
            alpha: 0,
            duration: 0.5,
            ease: 'power2.out',
        });

        if (cursorImgEffect && cursorDisplacementSpriteRef?.current) {
            gsap.to(cursorDisplacementSpriteRef.current, {
                alpha: 0,
                duration: 0.5,
                ease: 'power2.out',
            });
        }

        gsap.to(bgDispFilterRef.current.scale, {
            x: 0,
            y: 0,
            duration: 0.5,
            ease: 'power2.out',
        });

        if (cursorImgEffect && cursorDispFilterRef?.current) {
            gsap.to(cursorDispFilterRef.current.scale, {
                x: 0,
                y: 0,
                duration: 0.5,
                ease: 'power2.out',
            });
        }
    }, [
        backgroundDisplacementSpriteRef, // Using ref object, not .current
        bgDispFilterRef,
        cursorDisplacementSpriteRef,
        cursorDispFilterRef,
        cursorImgEffect
    ]);

    return {
        showDisplacementEffects,
        hideDisplacementEffects,
        DEFAULT_BG_FILTER_SCALE,
        DEFAULT_CURSOR_FILTER_SCALE
    };
};