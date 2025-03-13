import { useEffect, useRef, useCallback } from 'react';
import { Sprite, DisplacementFilter, Assets, Texture } from 'pixi.js';
import { gsap } from 'gsap';
import { AtlasManager } from '../managers/AtlasManager';
import { type UseDisplacementEffectsProps, type CursorDisplacementSizingMode } from '../types';

// Development environment check
const isDevelopment = import.meta.env?.MODE === 'development';

// Default filter scales
const DEFAULT_BG_FILTER_SCALE = 20;
const DEFAULT_CURSOR_FILTER_SCALE = 10;

/**
 * Hook to manage displacement effects with consistent behavior
 * regardless of texture source
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
                                           cursorScaleIntensity = 0.65,
                                           cursorDisplacementSizing = 'natural',
                                           cursorDisplacementWidth,
                                           cursorDisplacementHeight,
                                           resourceManager,
                                           atlasManager,
                                           effectsAtlas,
                                           useEffectsAtlas
                                       }: UseDisplacementEffectsProps) => {
    const initializationStateRef = useRef({
        isInitializing: false,
        isInitialized: false
    });

    /**
     * Load a texture regardless of source, with default error handling
     */
    const loadTexture = useCallback(async (imagePath: string): Promise<Texture> => {
        try {
            // First try loading from asset cache or directly
            let texture: Texture;
            if (Assets.cache.has(imagePath)) {
                texture = Assets.cache.get(imagePath);
            } else {
                // Try from atlas if enabled
                if (atlasManager && effectsAtlas && useEffectsAtlas) {
                    const frameName = imagePath.split('/').pop() || '';
                    if (atlasManager.hasFrame(frameName)) {
                        const atlasTexture = atlasManager.getFrameTexture(frameName, effectsAtlas);
                        if (atlasTexture) {
                            if (isDevelopment) {
                                console.log(`Loaded texture from atlas: ${frameName}`);
                            }
                            return atlasTexture;
                        }
                    }
                }

                // Fallback to regular loading
                texture = await Assets.load(imagePath);
            }

            return texture;
        } catch (error) {
            console.error(`Failed to load texture: ${imagePath}`, error);
            throw error;
        }
    }, [atlasManager, effectsAtlas, useEffectsAtlas]);

    /**
     * Set up displacement effects with forced consistent sizing
     */
    const setupDisplacementEffects = useCallback(async () => {
        // Prevent multiple initializations
        if (initializationStateRef.current.isInitializing ||
            initializationStateRef.current.isInitialized) {
            return;
        }

        // Validate app
        if (!appRef.current || !appRef.current.stage) {
            return;
        }

        initializationStateRef.current.isInitializing = true;

        try {
            const app = appRef.current;
            const stage = app.stage;
            const canvasWidth = app.screen.width;
            const canvasHeight = app.screen.height;

            if (isDevelopment) {
                console.log(`Setting up displacement effects for canvas: ${canvasWidth}x${canvasHeight}`);
                console.log(`Atlas enabled: ${useEffectsAtlas ? 'Yes' : 'No'}`);
            }

            // 1. Load background displacement texture
            let bgTexture: Texture;
            try {
                bgTexture = await loadTexture(backgroundDisplacementSpriteLocation);
            } catch (error) {
                console.error('Failed to load background displacement texture', error);
                initializationStateRef.current.isInitializing = false;
                return;
            }

            // 2. Create background displacement sprite - FORCE SPECIFIC SIZE
            const bgSprite = new Sprite(bgTexture);

            // IMPORTANT: Set specific size to ensure consistent behavior
            bgSprite.anchor.set(0.5);
            bgSprite.position.set(canvasWidth / 2, canvasHeight / 2);

            // CRITICAL: Force sprite to cover the full canvas
            const bgScaleX = canvasWidth / bgTexture.width;
            const bgScaleY = canvasHeight / bgTexture.height;
            bgSprite.scale.set(bgScaleX, bgScaleY);

            // Sprite should not be rendered directly
            bgSprite.renderable = false;
            bgSprite.visible = true;
            bgSprite.alpha = 0; // Start invisible

            // 3. Create background displacement filter
            const bgFilter = new DisplacementFilter(bgSprite);
            bgFilter.scale.set(0); // Start with zero effect
            bgFilter.padding = 0;

            // 4. Store references to sprite and filter
            backgroundDisplacementSpriteRef.current = bgSprite;
            bgDispFilterRef.current = bgFilter;

            // 5. Add to stage
            stage.addChild(bgSprite);

            // 6. Track resources
            if (resourceManager) {
                resourceManager.trackDisplayObject(bgSprite);
                resourceManager.trackFilter(bgFilter);
            }

            // Set up cursor displacement if enabled
            if (cursorImgEffect) {
                // 7. Load cursor displacement texture
                let cursorTexture: Texture;
                try {
                    cursorTexture = await loadTexture(cursorDisplacementSpriteLocation);
                } catch (error) {
                    console.error('Failed to load cursor displacement texture', error);
                    // Continue without cursor effect
                    initializationStateRef.current = {
                        isInitializing: false,
                        isInitialized: true
                    };
                    return;
                }

                // 8. Create cursor displacement sprite
                const cursorSprite = new Sprite(cursorTexture);
                cursorSprite.anchor.set(0.5);
                cursorSprite.position.set(canvasWidth / 2, canvasHeight / 2);

                // 9. Set scale based on sizing mode
                let cursorScaleX: number;
                let cursorScaleY: number;

                if (cursorDisplacementSizing === 'fullscreen') {
                    // Fill screen
                    cursorScaleX = canvasWidth / cursorTexture.width;
                    cursorScaleY = canvasHeight / cursorTexture.height;
                } else if (cursorDisplacementSizing === 'custom' &&
                    cursorDisplacementWidth &&
                    cursorDisplacementHeight) {
                    // Custom dimensions
                    cursorScaleX = cursorDisplacementWidth / cursorTexture.width;
                    cursorScaleY = cursorDisplacementHeight / cursorTexture.height;
                } else {
                    // Natural dimensions (just apply intensity)
                    cursorScaleX = 1;
                    cursorScaleY = 1;
                }

                // Apply scale intensity
                cursorSprite.scale.set(
                    cursorScaleX * cursorScaleIntensity,
                    cursorScaleY * cursorScaleIntensity
                );

                // 10. Set sprite properties
                cursorSprite.renderable = false;
                cursorSprite.visible = true;
                cursorSprite.alpha = 0; // Start invisible

                // 11. Create cursor displacement filter
                const cursorFilter = new DisplacementFilter(cursorSprite);
                cursorFilter.scale.set(0); // Start with zero effect
                cursorFilter.padding = 0;

                // 12. Store references
                cursorDisplacementSpriteRef.current = cursorSprite;
                cursorDispFilterRef.current = cursorFilter;

                // 13. Add to stage - IMPORTANT: Add at a higher index than background
                stage.addChild(cursorSprite);

                // 14. Track resources
                if (resourceManager) {
                    resourceManager.trackDisplayObject(cursorSprite);
                    resourceManager.trackFilter(cursorFilter);
                }

                if (isDevelopment) {
                    console.log('Cursor displacement effect set up successfully');
                }
            }

            // Mark as initialized
            initializationStateRef.current = {
                isInitializing: false,
                isInitialized: true
            };

            if (isDevelopment) {
                console.log('Displacement effects initialization complete');
            }
        } catch (error) {
            console.error('Error setting up displacement effects:', error);
            initializationStateRef.current = {
                isInitializing: false,
                isInitialized: false
            };
        }
    }, [
        appRef,
        backgroundDisplacementSpriteLocation,
        cursorDisplacementSpriteLocation,
        cursorImgEffect,
        cursorScaleIntensity,
        cursorDisplacementSizing,
        cursorDisplacementWidth,
        cursorDisplacementHeight,
        backgroundDisplacementSpriteRef,
        cursorDisplacementSpriteRef,
        bgDispFilterRef,
        cursorDispFilterRef,
        loadTexture,
        resourceManager
    ]);

    /**
     * Show displacement effects
     */
    const showDisplacementEffects = useCallback(() => {
        if (!initializationStateRef.current.isInitialized) return [];

        const animations = [];

        // Background effect
        const bgSprite = backgroundDisplacementSpriteRef.current;
        const bgFilter = bgDispFilterRef.current;

        if (bgSprite && bgFilter) {
            // Ensure sprite is properly set up
            bgSprite.visible = true;
            bgSprite.renderable = false; // Important: keep this false

            // Animate sprite alpha
            const bgAlphaAnim = gsap.to(bgSprite, {
                alpha: 1,
                duration: 0.5
            });

            // Animate filter scale
            const bgFilterAnim = gsap.to(bgFilter.scale, {
                x: DEFAULT_BG_FILTER_SCALE,
                y: DEFAULT_BG_FILTER_SCALE,
                duration: 0.5
            });

            animations.push(bgAlphaAnim, bgFilterAnim);
        }

        // Cursor effect if enabled
        if (cursorImgEffect) {
            const cursorSprite = cursorDisplacementSpriteRef.current;
            const cursorFilter = cursorDispFilterRef.current;

            if (cursorSprite && cursorFilter) {
                // Ensure sprite is properly set up
                cursorSprite.visible = true;
                cursorSprite.renderable = false; // Important: keep this false

                // Animate sprite alpha
                const cursorAlphaAnim = gsap.to(cursorSprite, {
                    alpha: 1,
                    duration: 0.5
                });

                // Animate filter scale
                const cursorFilterAnim = gsap.to(cursorFilter.scale, {
                    x: DEFAULT_CURSOR_FILTER_SCALE,
                    y: DEFAULT_CURSOR_FILTER_SCALE,
                    duration: 0.5
                });

                animations.push(cursorAlphaAnim, cursorFilterAnim);
            }
        }

        // Track animations
        if (resourceManager && animations.length) {
            resourceManager.trackAnimationBatch(animations);
        }

        return animations;
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
        if (!initializationStateRef.current.isInitialized) return [];

        const animations = [];

        // Background effect
        const bgSprite = backgroundDisplacementSpriteRef.current;
        const bgFilter = bgDispFilterRef.current;

        if (bgSprite && bgFilter) {
            const bgAlphaAnim = gsap.to(bgSprite, {
                alpha: 0,
                duration: 0.5
            });

            const bgFilterAnim = gsap.to(bgFilter.scale, {
                x: 0,
                y: 0,
                duration: 0.5
            });

            animations.push(bgAlphaAnim, bgFilterAnim);
        }

        // Cursor effect if enabled
        if (cursorImgEffect) {
            const cursorSprite = cursorDisplacementSpriteRef.current;
            const cursorFilter = cursorDispFilterRef.current;

            if (cursorSprite && cursorFilter) {
                const cursorAlphaAnim = gsap.to(cursorSprite, {
                    alpha: 0,
                    duration: 0.5
                });

                const cursorFilterAnim = gsap.to(cursorFilter.scale, {
                    x: 0,
                    y: 0,
                    duration: 0.5
                });

                animations.push(cursorAlphaAnim, cursorFilterAnim);
            }
        }

        // Track animations
        if (resourceManager && animations.length) {
            resourceManager.trackAnimationBatch(animations);
        }

        return animations;
    }, [
        backgroundDisplacementSpriteRef,
        bgDispFilterRef,
        cursorDisplacementSpriteRef,
        cursorDispFilterRef,
        cursorImgEffect,
        resourceManager
    ]);

    /**
     * Initialize when ready
     */
    useEffect(() => {
        if (typeof window === 'undefined') return;

        if (appRef.current?.stage) {
            setupDisplacementEffects();
        }

        return () => {
            initializationStateRef.current = {
                isInitializing: false,
                isInitialized: false
            };
        };
    }, [appRef.current?.stage, setupDisplacementEffects]);

    /**
     * Handle window resize for fullscreen mode
     */
    useEffect(() => {
        if (typeof window === 'undefined') return;
        if (cursorDisplacementSizing !== 'fullscreen' || !cursorImgEffect) return;

        const handleResize = () => {
            const app = appRef.current;
            const cursorSprite = cursorDisplacementSpriteRef.current;

            if (!app || !cursorSprite) return;

            const canvasWidth = app.screen.width;
            const canvasHeight = app.screen.height;

            // Update cursor sprite position to new center
            cursorSprite.position.set(canvasWidth / 2, canvasHeight / 2);

            // Update scale to maintain fullscreen coverage
            if (cursorSprite.texture) {
                const scaleX = canvasWidth / cursorSprite.texture.width;
                const scaleY = canvasHeight / cursorSprite.texture.height;

                cursorSprite.scale.set(
                    scaleX * cursorScaleIntensity,
                    scaleY * cursorScaleIntensity
                );
            }
        };

        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, [
        appRef,
        cursorDisplacementSpriteRef,
        cursorDisplacementSizing,
        cursorImgEffect,
        cursorScaleIntensity
    ]);

    return {
        showDisplacementEffects,
        hideDisplacementEffects,
        DEFAULT_BG_FILTER_SCALE,
        DEFAULT_CURSOR_FILTER_SCALE
    };
};