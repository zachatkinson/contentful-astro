import { useEffect, useRef, useCallback } from 'react';
import { Sprite, DisplacementFilter, Assets, Texture } from 'pixi.js';
import { gsap } from 'gsap';
import { AtlasManager } from '../managers/AtlasManager';
import { type UseDisplacementEffectsProps } from '../types';

// Development environment check
const isDevelopment = import.meta.env?.MODE === 'development';

// Default filter scales
const DEFAULT_BG_FILTER_SCALE = 20;
const DEFAULT_CURSOR_FILTER_SCALE = 10;

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
                                           resourceManager,
                                           atlasManager,
                                           effectsAtlas
                                       }: UseDisplacementEffectsProps & {
    atlasManager?: AtlasManager | null,
    effectsAtlas?: string
}) => {
    // Track initialization state with more granular control
    const initializationStateRef = useRef({
        isInitializing: false,
        isInitialized: false
    });

    // Efficiently extract filename from path for atlas frame lookup
    const getFrameName = (imagePath: string): string => {
        return imagePath.split('/').pop() || imagePath;
    };

    // Check if a texture is available in the atlas
    const isTextureInAtlas = useCallback((imagePath: string): boolean => {
        if (!atlasManager || !effectsAtlas || !imagePath) {
            return false;
        }

        const frameName = getFrameName(imagePath);
        return !!atlasManager.hasFrame(frameName);
    }, [atlasManager, effectsAtlas]);

    // Load a texture from atlas or as individual image
    const loadTextureFromAtlasOrIndividual = useCallback(async (
        imagePath: string
    ): Promise<{ texture: Texture, source: string, fromAtlas: boolean } | null> => {
        if (!imagePath) {
            return null;
        }

        try {
            // First try to get from atlas
            if (atlasManager && effectsAtlas) {
                const frameName = getFrameName(imagePath);

                // Check if in atlas
                if (atlasManager.hasFrame(frameName)) {
                    const texture = atlasManager.getFrameTexture(frameName, effectsAtlas);

                    if (texture) {
                        return {
                            texture,
                            source: frameName,
                            fromAtlas: true
                        };
                    }
                }
            }

            // Fallback to individual loading
            let texture: Texture;

            // Check if already in cache
            if (Assets.cache.has(imagePath)) {
                texture = Assets.cache.get(imagePath);
            } else {
                // Load the texture
                texture = await Assets.load(imagePath);
            }

            return {
                texture,
                source: imagePath,
                fromAtlas: false
            };
        } catch (error) {
            if (isDevelopment) {
                console.error(`Failed to load texture: ${imagePath}`, error);
            }
            return null;
        }
    }, [atlasManager, effectsAtlas]);

    // Centralized displacement setup method
    const setupDisplacementEffects = useCallback(async () => {
        // Prevent multiple simultaneous initializations
        if (initializationStateRef.current.isInitializing ||
            initializationStateRef.current.isInitialized) {
            return null;
        }

        // Validate app and stage
        if (!appRef.current || !appRef.current.stage) {
            return null;
        }

        // Mark as initializing
        initializationStateRef.current.isInitializing = true;

        try {
            const app = appRef.current;

            // Check and log atlas usage for displacement textures
            const bgInAtlas = isTextureInAtlas(backgroundDisplacementSpriteLocation);
            const cursorInAtlas = cursorImgEffect && isTextureInAtlas(cursorDisplacementSpriteLocation);

            if (isDevelopment) {
                if (bgInAtlas && (!cursorImgEffect || cursorInAtlas)) {
                    console.log(`%c[KineticSlider] Using texture atlas: ${effectsAtlas} for displacement effects`,
                        'background: #4CAF50; color: white; padding: 2px 5px; border-radius: 3px;');
                } else if (bgInAtlas || cursorInAtlas) {
                    console.log(`%c[KineticSlider] Using mixed sources for displacement effects (partially from atlas)`,
                        'background: #FFA726; color: white; padding: 2px 5px; border-radius: 3px;');
                } else {
                    const reason = !atlasManager
                        ? "AtlasManager not available"
                        : !effectsAtlas
                            ? "No effectsAtlas property specified"
                            : "Displacement textures not found in atlas";
                    console.log(`%c[KineticSlider] Using individual images for displacement effects (${reason})`,
                        'background: #FFA726; color: white; padding: 2px 5px; border-radius: 3px;');
                }
            }

            // Load background displacement texture
            const bgResult = await loadTextureFromAtlasOrIndividual(backgroundDisplacementSpriteLocation);

            if (!bgResult) {
                throw new Error("Failed to load background displacement texture");
            }

            if (isDevelopment) {
                console.log(`%c[KineticSlider] Loaded background displacement from ${bgResult.fromAtlas ? 'atlas' : 'file'}: ${bgResult.source}`,
                    `color: ${bgResult.fromAtlas ? '#2196F3' : '#FF9800'}`);
            }

            // Create background displacement sprite
            const centerX = app.screen.width / 2;
            const centerY = app.screen.height / 2;

            const backgroundDisplacementSprite = new Sprite(bgResult.texture);
            Object.assign(backgroundDisplacementSprite, {
                anchor: { x: 0.5, y: 0.5 },
                position: { x: centerX, y: centerY },
                scale: { x: 2, y: 2 },
                alpha: 0
            });

            // Create background displacement filter
            const backgroundDisplacementFilter = new DisplacementFilter(backgroundDisplacementSprite);
            backgroundDisplacementFilter.scale.set(0);

            // Track with ResourceManager
            if (resourceManager) {
                resourceManager.trackDisplayObject(backgroundDisplacementSprite);
                resourceManager.trackFilter(backgroundDisplacementFilter);
            }

            // Store references
            backgroundDisplacementSpriteRef.current = backgroundDisplacementSprite;
            bgDispFilterRef.current = backgroundDisplacementFilter;

            // Add background sprite to stage
            app.stage.addChild(backgroundDisplacementSprite);

            // Create cursor displacement sprite if enabled
            let cursorDisplacementSprite = null;
            let cursorDisplacementFilter = null;

            if (cursorImgEffect) {
                // Load cursor displacement texture
                const cursorResult = await loadTextureFromAtlasOrIndividual(cursorDisplacementSpriteLocation);

                if (cursorResult) {
                    if (isDevelopment) {
                        console.log(`%c[KineticSlider] Loaded cursor displacement from ${cursorResult.fromAtlas ? 'atlas' : 'file'}: ${cursorResult.source}`,
                            `color: ${cursorResult.fromAtlas ? '#2196F3' : '#FF9800'}`);
                    }

                    // Create cursor displacement sprite
                    cursorDisplacementSprite = new Sprite(cursorResult.texture);
                    Object.assign(cursorDisplacementSprite, {
                        anchor: { x: 0.5, y: 0.5 },
                        position: { x: centerX, y: centerY },
                        scale: { x: cursorScaleIntensity || 0.65, y: cursorScaleIntensity || 0.65 },
                        alpha: 0
                    });

                    // Create cursor displacement filter
                    cursorDisplacementFilter = new DisplacementFilter(cursorDisplacementSprite);
                    cursorDisplacementFilter.scale.set(0);

                    // Track with ResourceManager
                    if (resourceManager) {
                        resourceManager.trackDisplayObject(cursorDisplacementSprite);
                        resourceManager.trackFilter(cursorDisplacementFilter);
                    }

                    // Store references
                    cursorDisplacementSpriteRef.current = cursorDisplacementSprite;
                    cursorDispFilterRef.current = cursorDisplacementFilter;

                    // Add cursor sprite to stage
                    app.stage.addChild(cursorDisplacementSprite);
                } else if (isDevelopment) {
                    console.warn('[KineticSlider] Failed to load cursor displacement texture, cursor effect disabled');
                }
            }

            // Mark as fully initialized
            initializationStateRef.current = {
                isInitializing: false,
                isInitialized: true
            };

            return {
                backgroundDisplacementSprite,
                cursorDisplacementSprite,
                backgroundDisplacementFilter,
                cursorDisplacementFilter
            };
        } catch (error) {
            // Reset initialization state on failure
            initializationStateRef.current = {
                isInitializing: false,
                isInitialized: false
            };

            // Log error in development with more context
            if (isDevelopment) {
                console.error('Failed to setup displacement effects:', {
                    error,
                    backgroundDisplacementSpriteLocation,
                    cursorDisplacementSpriteLocation,
                    cursorImgEffect
                });
            }

            return null;
        }
    }, [
        backgroundDisplacementSpriteLocation,
        cursorDisplacementSpriteLocation,
        cursorImgEffect,
        cursorScaleIntensity,
        resourceManager,
        atlasManager,
        effectsAtlas,
        bgDispFilterRef,
        backgroundDisplacementSpriteRef,
        cursorDisplacementSpriteRef,
        cursorDispFilterRef,
        appRef,
        isTextureInAtlas,
        loadTextureFromAtlasOrIndividual
    ]);

    // Displacement effect methods
    const showDisplacementEffects = useCallback(() => {
        if (!initializationStateRef.current.isInitialized) return [];

        const backgroundSprite = backgroundDisplacementSpriteRef.current;
        const cursorSprite = cursorDisplacementSpriteRef.current;
        const bgFilter = bgDispFilterRef.current;
        const cursorFilter = cursorDispFilterRef.current;

        // Define all animation targets and properties in a consistent structure
        const animationTargets = [];

        if (backgroundSprite && bgFilter) {
            animationTargets.push(
                { target: backgroundSprite, props: { alpha: 1, duration: 0.5 } },
                { target: bgFilter.scale, props: { x: DEFAULT_BG_FILTER_SCALE, y: DEFAULT_BG_FILTER_SCALE, duration: 0.5 } }
            );
        }

        if (cursorImgEffect && cursorSprite && cursorFilter) {
            animationTargets.push(
                { target: cursorSprite, props: { alpha: 1, duration: 0.5 } },
                { target: cursorFilter.scale, props: { x: DEFAULT_CURSOR_FILTER_SCALE, y: DEFAULT_CURSOR_FILTER_SCALE, duration: 0.5 } }
            );
        }

        // Create all animations at once
        const animations = animationTargets.map(item => gsap.to(item.target, item.props));

        // Track all animations in a batch if available
        if (resourceManager && animations.length > 0) {
            resourceManager.trackAnimationBatch(animations);
        }

        return animations;
    }, [
        cursorImgEffect,
        resourceManager,
        backgroundDisplacementSpriteRef,
        cursorDisplacementSpriteRef,
        bgDispFilterRef,
        cursorDispFilterRef
    ]);

    const hideDisplacementEffects = useCallback(() => {
        if (!initializationStateRef.current.isInitialized) return [];

        const backgroundSprite = backgroundDisplacementSpriteRef.current;
        const cursorSprite = cursorDisplacementSpriteRef.current;
        const bgFilter = bgDispFilterRef.current;
        const cursorFilter = cursorDispFilterRef.current;

        // Define all animation targets and properties in a consistent structure
        const animationTargets = [];

        if (backgroundSprite && bgFilter) {
            animationTargets.push(
                { target: backgroundSprite, props: { alpha: 0, duration: 0.5 } },
                { target: bgFilter.scale, props: { x: 0, y: 0, duration: 0.5 } }
            );
        }

        if (cursorImgEffect && cursorSprite && cursorFilter) {
            animationTargets.push(
                { target: cursorSprite, props: { alpha: 0, duration: 0.5 } },
                { target: cursorFilter.scale, props: { x: 0, y: 0, duration: 0.5 } }
            );
        }

        // Create all animations at once
        const animations = animationTargets.map(item => gsap.to(item.target, item.props));

        // Track all animations in a batch if available
        if (resourceManager && animations.length > 0) {
            resourceManager.trackAnimationBatch(animations);
        }

        return animations;
    }, [
        cursorImgEffect,
        resourceManager,
        backgroundDisplacementSpriteRef,
        cursorDisplacementSpriteRef,
        bgDispFilterRef,
        cursorDispFilterRef
    ]);

    // Effect to trigger initialization when app is ready
    useEffect(() => {
        // Ensure we're in a browser environment
        if (typeof window === 'undefined') return;

        // Only attempt setup if the app and stage are ready
        if (appRef.current?.stage) {
            setupDisplacementEffects();
        }

        // No cleanup needed as ResourceManager will handle resource disposal
        return () => {
            // Reset initialization state
            initializationStateRef.current = {
                isInitializing: false,
                isInitialized: false
            };
        };
    }, [appRef.current?.stage, setupDisplacementEffects]);

    return {
        showDisplacementEffects,
        hideDisplacementEffects,
        DEFAULT_BG_FILTER_SCALE,
        DEFAULT_CURSOR_FILTER_SCALE
    };
};