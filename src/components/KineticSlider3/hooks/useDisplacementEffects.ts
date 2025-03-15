import { useEffect, useRef, useCallback } from 'react';
import { Sprite, DisplacementFilter, Assets, Texture } from 'pixi.js';
import { gsap } from 'gsap';
import { AtlasManager } from '../managers/AtlasManager.ts';
import { type UseDisplacementEffectsProps, type CursorDisplacementSizingMode } from '../types.ts';

// Development environment check
const isDevelopment = import.meta.env?.MODE === 'development';

// Default filter scales
const DEFAULT_BG_FILTER_SCALE = 20;
const DEFAULT_CURSOR_FILTER_SCALE = 10;

/**
 * Custom hook that manages displacement effects with consistent behavior
 * for both atlas textures and individual images.
 *
 * @param {UseDisplacementEffectsProps} props - Hook properties
 * @returns {Object} Functions to control displacement effects
 * @property {Function} showDisplacementEffects - Animates in displacement effects
 * @property {Function} hideDisplacementEffects - Animates out displacement effects
 * @property {number} DEFAULT_BG_FILTER_SCALE - Default background filter scale
 * @property {number} DEFAULT_CURSOR_FILTER_SCALE - Default cursor filter scale
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
    /**
     * Tracks the initialization state of displacement effects.
     * @type {React.MutableRefObject<{isInitializing: boolean, isInitialized: boolean}>}
     */
    const initializationStateRef = useRef({
        isInitializing: false,
        isInitialized: false
    });

    /**
     * Validates and sanitizes dimensions for displacement textures.
     * Handles negative or unusually large values, returning appropriate fallbacks.
     *
     * @param {number | undefined} width - Requested width or undefined
     * @param {number | undefined} height - Requested height or undefined
     * @param {number} textureWidth - Original texture width as fallback
     * @param {number} textureHeight - Original texture height as fallback
     * @returns {{width: number, height: number, isValid: boolean}} Validated dimensions and validity flag
     */
    const validateDimensions = useCallback((
        width: number | undefined,
        height: number | undefined,
        textureWidth: number,
        textureHeight: number
    ): { width: number, height: number, isValid: boolean } => {
        let result = {
            width: width || textureWidth,
            height: height || textureHeight,
            isValid: true
        };

        // Check for negative or zero values
        if ((width !== undefined && width <= 0) || (height !== undefined && height <= 0)) {
            if (isDevelopment) {
                console.warn(`Invalid dimensions detected: width=${width}, height=${height}. Using texture dimensions instead.`);
            }
            result = { width: textureWidth, height: textureHeight, isValid: false };
        }

        // Check for unusually large values (more than 10x the canvas)
        const app = appRef.current;
        if (app && (
            (width && width > app.screen.width * 10) ||
            (height && height > app.screen.height * 10)
        )) {
            if (isDevelopment) {
                console.warn(`Unusually large dimensions detected: width=${width}, height=${height}. This may cause performance issues.`);
            }
            // Still valid but warned
        }

        return result;
    }, [appRef]);

    /**
     * Loads a texture from either atlas or individual file with consistent handling.
     * Attempts multiple loading strategies with fallbacks.
     *
     * @param {string} imagePath - Path to the image to load
     * @returns {Promise<Texture>} The loaded texture
     * @throws {Error} If texture loading fails
     */
    const loadTexture = useCallback(async (imagePath: string): Promise<Texture> => {
        if (!imagePath || typeof imagePath !== 'string' || imagePath.trim() === '') {
            if (isDevelopment) {
                console.error('Invalid image path provided', { imagePath });
            }
            throw new Error('Invalid image path');
        }

        try {
            let texture: Texture | null = null;
            let loadingMethod = '';

            // Try from cache first
            if (Assets.cache.has(imagePath)) {
                texture = Assets.cache.get(imagePath);
                loadingMethod = 'cache';
            }
            // Then try from atlas if enabled
            else if (atlasManager && effectsAtlas && useEffectsAtlas) {
                const frameName = imagePath.split('/').pop() || '';
                if (atlasManager.hasFrame(frameName)) {
                    const atlasTexture = atlasManager.getFrameTexture(frameName, effectsAtlas);
                    if (atlasTexture) {
                        texture = atlasTexture;
                        loadingMethod = 'atlas';
                    }
                }
            }

            // Fallback to direct loading if not found
            if (!texture) {
                try {
                    texture = await Assets.load(imagePath);
                    loadingMethod = 'direct-load';
                } catch (loadError) {
                    if (isDevelopment) {
                        console.error(`Failed to load texture directly: ${imagePath}`, loadError);
                    }

                    // Try one last fallback with a stripped path
                    const fallbackPath = imagePath.split('/').pop();
                    if (fallbackPath && fallbackPath !== imagePath) {
                        try {
                            texture = await Assets.load(fallbackPath);
                            loadingMethod = 'fallback-path';
                        } catch (fallbackError) {
                            throw loadError;
                        }
                    } else {
                        throw loadError;
                    }
                }
            }

            if (!texture) {
                throw new Error(`Failed to load texture: ${imagePath}`);
            }

            if (isDevelopment) {
                console.log(`Loaded texture from ${loadingMethod}: ${imagePath} (${texture.width}x${texture.height})`);
            }

            return texture;
        } catch (error) {
            // Enhanced error with more context
            const enhancedError = new Error(`Failed to load texture: ${imagePath}. ${error}`);
            if (isDevelopment) {
                console.error('Texture loading failed with detailed error:', enhancedError);
                console.error('Atlas status:', {
                    atlasManagerAvailable: !!atlasManager,
                    effectsAtlasName: effectsAtlas,
                    useEffectsAtlasEnabled: useEffectsAtlas
                });
            }
            throw enhancedError;
        }
    }, [atlasManager, effectsAtlas, useEffectsAtlas]);

    /**
     * Sets up displacement effects with consistent sizing regardless of texture source.
     * This multi-step process loads textures, creates sprites and filters, and configures
     * them based on the chosen sizing mode.
     *
     * @returns {Promise<void>}
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
                console.log(`[KineticSlider] Setting up displacement effects for canvas: ${canvasWidth}x${canvasHeight}`);
                console.log(`[KineticSlider] Atlas enabled: ${useEffectsAtlas ? 'Yes' : 'No'}`);
            }

            // 1. Load background displacement texture
            let bgTexture: Texture;
            try {
                bgTexture = await loadTexture(backgroundDisplacementSpriteLocation);
            } catch (error) {
                if (isDevelopment) {
                    console.error("[KineticSlider] Failed to load background displacement texture:", error);
                }
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

            if (isDevelopment) {
                console.log(`[KineticSlider] Background displacement sprite created with scale: ${bgScaleX.toFixed(2)}x${bgScaleY.toFixed(2)}`);
            }

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
                    if (isDevelopment) {
                        console.error("[KineticSlider] Failed to load cursor displacement texture:", error);
                    }
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

                    if (isDevelopment) {
                        console.log(`[KineticSlider] Using fullscreen mode (${canvasWidth}x${canvasHeight})`);
                    }
                } else if (cursorDisplacementSizing === 'custom') {
                    // Validate custom dimensions
                    const validatedDimensions = validateDimensions(
                        cursorDisplacementWidth,
                        cursorDisplacementHeight,
                        cursorTexture.width,
                        cursorTexture.height
                    );

                    if (!validatedDimensions.isValid && isDevelopment) {
                        console.warn('[KineticSlider] Falling back to natural dimensions due to invalid custom dimensions');
                    }

                    // Handle custom dimensions with aspect ratio preservation
                    if (validatedDimensions.width && !validatedDimensions.height) {
                        // Height is calculated to maintain aspect ratio
                        cursorScaleX = validatedDimensions.width / cursorTexture.width;
                        cursorScaleY = cursorScaleX; // Preserve aspect ratio

                        if (isDevelopment) {
                            console.log(`[KineticSlider] Using custom width (${validatedDimensions.width}px) with preserved aspect ratio`);
                        }
                    } else if (!validatedDimensions.width && validatedDimensions.height) {
                        // Width is calculated to maintain aspect ratio
                        cursorScaleY = validatedDimensions.height / cursorTexture.height;
                        cursorScaleX = cursorScaleY; // Preserve aspect ratio

                        if (isDevelopment) {
                            console.log(`[KineticSlider] Using custom height (${validatedDimensions.height}px) with preserved aspect ratio`);
                        }
                    } else if (validatedDimensions.width && validatedDimensions.height) {
                        // Both dimensions specified
                        cursorScaleX = validatedDimensions.width / cursorTexture.width;
                        cursorScaleY = validatedDimensions.height / cursorTexture.height;

                        if (isDevelopment) {
                            console.log(`[KineticSlider] Using custom dimensions (${validatedDimensions.width}x${validatedDimensions.height})`);
                        }
                    } else {
                        // Fallback to natural size (should not reach here with validation)
                        cursorScaleX = 1;
                        cursorScaleY = 1;

                        if (isDevelopment) {
                            console.log('[KineticSlider] Falling back to natural dimensions');
                        }
                    }
                } else {
                    // Natural dimensions (just apply intensity)
                    cursorScaleX = 1;
                    cursorScaleY = 1;

                    if (isDevelopment) {
                        console.log(`[KineticSlider] Using natural dimensions (${cursorTexture.width}x${cursorTexture.height})`);
                    }
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
                    console.log(`[KineticSlider] Cursor displacement effect set up successfully`);
                    console.log(`[KineticSlider] Cursor displacement sprite scaled to: ${(cursorScaleX * cursorScaleIntensity).toFixed(2)}x${(cursorScaleY * cursorScaleIntensity).toFixed(2)}`);
                }
            }

            // Mark as initialized
            initializationStateRef.current = {
                isInitializing: false,
                isInitialized: true
            };

            if (isDevelopment) {
                console.log('[KineticSlider] Displacement effects initialization complete');
            }
        } catch (error) {
            if (isDevelopment) {
                console.error('[KineticSlider] Error setting up displacement effects:', error);
            }
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
        resourceManager,
        validateDimensions
    ]);

    /**
     * Handles window resize events to keep displacement effects properly sized and positioned.
     * Always updates background sprite, and updates cursor sprite if using fullscreen mode.
     */
    useEffect(() => {
        if (typeof window === 'undefined') return;

        /**
         * Resize handler function to update sprite positions and scales.
         */
        const handleResize = () => {
            const app = appRef.current;
            if (!app) return;

            const canvasWidth = app.screen.width;
            const canvasHeight = app.screen.height;

            // Update background sprite position and scale
            const bgSprite = backgroundDisplacementSpriteRef.current;
            if (bgSprite && bgSprite.texture) {
                // Update position to new center
                bgSprite.position.set(canvasWidth / 2, canvasHeight / 2);

                // Always scale background to fill canvas
                const bgScaleX = canvasWidth / bgSprite.texture.width;
                const bgScaleY = canvasHeight / bgSprite.texture.height;
                bgSprite.scale.set(bgScaleX, bgScaleY);

                if (isDevelopment) {
                    console.log(`[KineticSlider] Resized background displacement to match canvas: ${canvasWidth}x${canvasHeight}`);
                }
            }

            // Update cursor sprite if using fullscreen mode
            if (cursorImgEffect && cursorDisplacementSizing === 'fullscreen') {
                const cursorSprite = cursorDisplacementSpriteRef.current;
                if (cursorSprite && cursorSprite.texture) {
                    // Update position to new center
                    cursorSprite.position.set(canvasWidth / 2, canvasHeight / 2);

                    // Update scale to maintain fullscreen coverage
                    const scaleX = canvasWidth / cursorSprite.texture.width;
                    const scaleY = canvasHeight / cursorSprite.texture.height;

                    cursorSprite.scale.set(
                        scaleX * cursorScaleIntensity,
                        scaleY * cursorScaleIntensity
                    );

                    if (isDevelopment) {
                        console.log(`[KineticSlider] Resized cursor displacement to match canvas: ${canvasWidth}x${canvasHeight}`);
                    }
                }
            }
        };

        // Always listen for resize to update background sprite
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, [
        appRef,
        backgroundDisplacementSpriteRef,
        cursorDisplacementSpriteRef,
        cursorDisplacementSizing,
        cursorImgEffect,
        cursorScaleIntensity
    ]);

    /**
     * Shows displacement effects by animating sprite alpha and filter scale.
     *
     * @returns {gsap.core.Tween[]} Array of GSAP animations
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

            if (isDevelopment) {
                console.log(`[KineticSlider] Showing background displacement effect (scale: ${DEFAULT_BG_FILTER_SCALE})`);
            }
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

                if (isDevelopment) {
                    console.log(`[KineticSlider] Showing cursor displacement effect (scale: ${DEFAULT_CURSOR_FILTER_SCALE})`);
                }
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
     * Hides displacement effects by animating sprite alpha and filter scale to zero.
     *
     * @returns {gsap.core.Tween[]} Array of GSAP animations
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

            if (isDevelopment) {
                console.log('[KineticSlider] Hiding background displacement effect');
            }
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

                if (isDevelopment) {
                    console.log('[KineticSlider] Hiding cursor displacement effect');
                }
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
     * Initializes the displacement effects when the app is ready.
     * Handles errors and provides cleanup.
     */
    useEffect(() => {
        if (typeof window === 'undefined') return;

        // Check if app is ready
        if (appRef.current?.stage) {
            try {
                setupDisplacementEffects().catch(error => {
                    // Handle initialization errors
                    if (isDevelopment) {
                        console.error('[KineticSlider] Failed to set up displacement effects:', error);
                    }
                    // Reset initialization state to allow retry
                    initializationStateRef.current = {
                        isInitializing: false,
                        isInitialized: false
                    };
                });
            } catch (error) {
                if (isDevelopment) {
                    console.error('[KineticSlider] Exception during displacement effects setup:', error);
                }
            }
        }

        // Cleanup on unmount
        return () => {
            initializationStateRef.current = {
                isInitializing: false,
                isInitialized: false
            };
        };
    }, [appRef.current?.stage, setupDisplacementEffects]);

    // Return public methods and constants
    return {
        showDisplacementEffects,
        hideDisplacementEffects,
        DEFAULT_BG_FILTER_SCALE,
        DEFAULT_CURSOR_FILTER_SCALE
    };
};