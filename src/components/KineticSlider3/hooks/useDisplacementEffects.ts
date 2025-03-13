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
 * Calculate dimensions based on the chosen sizing mode
 */
const calculateDisplacementDimensions = (
    texture: Texture | null,
    sizingMode: CursorDisplacementSizingMode,
    customWidth?: number,
    customHeight?: number
): { width: number; height: number } => {
    // Default dimensions (fallback)
    const defaultDimensions = { width: 512, height: 512 };

    // If texture is null, return default dimensions
    if (!texture) {
        if (isDevelopment) {
            console.warn('Displacement texture not available for dimension calculation, using defaults');
        }
        return defaultDimensions;
    }

    switch (sizingMode) {
        case 'natural':
            // Use the natural dimensions of the texture
            return {
                width: texture.width,
                height: texture.height
            };

        case 'fullscreen':
            // Use the window dimensions
            return {
                width: window.innerWidth,
                height: window.innerHeight
            };

        case 'custom':
            // Use the provided custom dimensions, or fallback to natural dimensions
            return {
                width: customWidth ?? texture.width,
                height: customHeight ?? texture.height
            };

        default:
            // Fallback to natural dimensions for any unhandled cases
            return {
                width: texture.width,
                height: texture.height
            };
    }
};

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
                                           cursorDisplacementSizing = 'natural',
                                           cursorDisplacementWidth,
                                           cursorDisplacementHeight,
                                           resourceManager,
                                           atlasManager,
                                           effectsAtlas,
                                           useEffectsAtlas
                                       }: UseDisplacementEffectsProps) => {
    // Track initialization state with more granular control
    const initializationStateRef = useRef({
        isInitializing: false,
        isInitialized: false
    });

    // Store the original textures for dimension calculations
    const textureRef = useRef<{
        background: Texture | null;
        cursor: Texture | null;
    }>({
        background: null,
        cursor: null
    });

    // Efficiently extract filename from path for atlas frame lookup
    const getFrameName = (imagePath: string): string => {
        return imagePath.split('/').pop() || imagePath;
    };

    // Check if a texture is available in the atlas
    const isTextureInAtlas = useCallback((imagePath: string): boolean => {
        if (!atlasManager || !effectsAtlas || !imagePath || !useEffectsAtlas) {
            return false;
        }

        const frameName = getFrameName(imagePath);
        return !!atlasManager.hasFrame(frameName);
    }, [atlasManager, effectsAtlas, useEffectsAtlas]);

    // Load a texture from atlas or as individual image
    const loadTextureFromAtlasOrIndividual = useCallback(async (
        imagePath: string
    ): Promise<{ texture: Texture, source: string, fromAtlas: boolean } | null> => {
        if (!imagePath) {
            return null;
        }

        try {
            // First try to get from atlas if atlas usage is enabled
            if (atlasManager && effectsAtlas && useEffectsAtlas) {
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
    }, [atlasManager, effectsAtlas, useEffectsAtlas]);

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
            const useAtlas = atlasManager && effectsAtlas && useEffectsAtlas && (bgInAtlas || cursorInAtlas);

            if (isDevelopment) {
                if (useAtlas) {
                    if (bgInAtlas && (!cursorImgEffect || cursorInAtlas)) {
                        console.log(`%c[KineticSlider] Using texture atlas: ${effectsAtlas} for displacement effects`,
                            'background: #4CAF50; color: white; padding: 2px 5px; border-radius: 3px;');
                    } else {
                        console.log(`%c[KineticSlider] Using mixed sources for displacement effects (partially from atlas)`,
                            'background: #FFA726; color: white; padding: 2px 5px; border-radius: 3px;');
                    }
                } else {
                    const reason = !atlasManager
                        ? "AtlasManager not available"
                        : !effectsAtlas
                            ? "No effectsAtlas property specified"
                            : !useEffectsAtlas
                                ? "Atlas usage disabled by useEffectsAtlas=false"
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

            // Store the background texture for future reference
            textureRef.current.background = bgResult.texture;

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

                        // Log the natural dimensions of the texture
                        console.log(`Cursor displacement texture dimensions: ${cursorResult.texture.width}x${cursorResult.texture.height}`);
                    }

                    // Store the cursor texture for future reference
                    textureRef.current.cursor = cursorResult.texture;

                    // Calculate dimensions based on the sizing mode
                    const dimensions = calculateDisplacementDimensions(
                        cursorResult.texture,
                        cursorDisplacementSizing,
                        cursorDisplacementWidth,
                        cursorDisplacementHeight
                    );

                    if (isDevelopment) {
                        console.log(`Applying cursor displacement dimensions: ${dimensions.width}x${dimensions.height} (mode: ${cursorDisplacementSizing})`);
                    }

                    // Create cursor displacement sprite
                    cursorDisplacementSprite = new Sprite(cursorResult.texture);

                    // Apply dimensions based on the sizing mode
                    const scaleX = dimensions.width / cursorResult.texture.width;
                    const scaleY = dimensions.height / cursorResult.texture.height;

                    Object.assign(cursorDisplacementSprite, {
                        anchor: { x: 0.5, y: 0.5 },
                        position: { x: centerX, y: centerY },
                        scale: {
                            x: scaleX * (cursorScaleIntensity || 0.65),
                            y: scaleY * (cursorScaleIntensity || 0.65)
                        },
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
        cursorDisplacementSizing,
        cursorDisplacementWidth,
        cursorDisplacementHeight,
        resourceManager,
        atlasManager,
        effectsAtlas,
        useEffectsAtlas,
        bgDispFilterRef,
        backgroundDisplacementSpriteRef,
        cursorDisplacementSpriteRef,
        cursorDispFilterRef,
        appRef,
        isTextureInAtlas,
        loadTextureFromAtlasOrIndividual
    ]);

    // Handle window resize for fullscreen mode
    useEffect(() => {
        // Only add resize listener if we're using fullscreen mode
        if (cursorDisplacementSizing !== 'fullscreen' || !cursorImgEffect) {
            return;
        }

        const handleResize = () => {
            const cursorSprite = cursorDisplacementSpriteRef.current;
            if (!cursorSprite || !textureRef.current.cursor) return;

            // Recalculate dimensions
            const dimensions = calculateDisplacementDimensions(
                textureRef.current.cursor,
                'fullscreen'
            );

            // Apply new dimensions
            const scaleX = dimensions.width / textureRef.current.cursor.width;
            const scaleY = dimensions.height / textureRef.current.cursor.height;

            cursorSprite.scale.set(
                scaleX * (cursorScaleIntensity || 0.65),
                scaleY * (cursorScaleIntensity || 0.65)
            );

            if (isDevelopment) {
                console.log(`Resized cursor displacement to: ${dimensions.width}x${dimensions.height}`);
            }
        };

        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, [cursorDisplacementSizing, cursorImgEffect, cursorScaleIntensity]);

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