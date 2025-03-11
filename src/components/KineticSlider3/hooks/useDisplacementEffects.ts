import { useEffect, useRef, useCallback, type RefObject } from 'react';
import { Sprite, DisplacementFilter, Assets, Application } from 'pixi.js';
import { gsap } from 'gsap';
import ResourceManager from '../managers/ResourceManager';

// Development environment check
const isDevelopment = import.meta.env?.MODE === 'development';

interface UseDisplacementEffectsProps {
    sliderRef: RefObject<HTMLDivElement | null>; // Add this line
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

// Default filter scales
const DEFAULT_BG_FILTER_SCALE = 20;
const DEFAULT_CURSOR_FILTER_SCALE = 10;

export const useDisplacementEffects = ({
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
    // Track initialization state with more granular control
    const initializationStateRef = useRef({
        isInitializing: false,
        isInitialized: false
    });

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

            // Batch load assets using Assets API - with parallel loading
            const bgDisplacementUrl = backgroundDisplacementSpriteLocation || '/images/background-displace.jpg';
            const cursorDisplacementUrl = cursorImgEffect
                ? cursorDisplacementSpriteLocation || '/images/cursor-displace.png'
                : null;

            // Define assets to load
            const assetsToLoad = [
                { id: 'bgDisplacement', url: bgDisplacementUrl }
            ];

            if (cursorDisplacementUrl) {
                assetsToLoad.push({ id: 'cursorDisplacement', url: cursorDisplacementUrl });
            }

            // Load all textures in parallel with Promise.all
            const loadingPromises = assetsToLoad.map(asset =>
                Assets.load(asset.url).then(texture => ({ id: asset.id, url: asset.url, texture }))
            );

            const loadedAssets = await Promise.all(loadingPromises);

            // Organize textures by both ID and URL for flexible access
            const textures = new Map();
            const texturesById = new Map();

            loadedAssets.forEach(asset => {
                textures.set(asset.url, asset.texture);
                texturesById.set(asset.id, asset.texture);
            });

            // Track all textures in a batch if ResourceManager available
            if (resourceManager) {
                resourceManager.trackTextureBatch(textures);
            }



            // Create all displacement sprites in a consistent way
            const displayObjects = [];
            const centerX = app.screen.width / 2;
            const centerY = app.screen.height / 2;

            // Create background displacement sprite
            const backgroundDisplacementSprite = new Sprite(texturesById.get('bgDisplacement'));
            Object.assign(backgroundDisplacementSprite, {
                anchor: { x: 0.5, y: 0.5 },
                position: { x: centerX, y: centerY },
                scale: { x: 2, y: 2 },
                alpha: 0
            });
            displayObjects.push(backgroundDisplacementSprite);
            backgroundDisplacementSpriteRef.current = backgroundDisplacementSprite;

            // Create cursor displacement sprite if enabled
            let cursorDisplacementSprite = null;
            if (cursorImgEffect && texturesById.has('cursorDisplacement')) {
                cursorDisplacementSprite = new Sprite(texturesById.get('cursorDisplacement'));
                Object.assign(cursorDisplacementSprite, {
                    anchor: { x: 0.5, y: 0.5 },
                    position: { x: centerX, y: centerY },
                    scale: { x: cursorScaleIntensity || 0.65, y: cursorScaleIntensity || 0.65 },
                    alpha: 0
                });
                displayObjects.push(cursorDisplacementSprite);
                cursorDisplacementSpriteRef.current = cursorDisplacementSprite;
            }

            // Track all display objects in a batch
            if (resourceManager && displayObjects.length > 0) {
                resourceManager.trackDisplayObjectBatch(displayObjects);
            }

            // Create displacement filters
            const filters = [];
            const backgroundDisplacementFilter = new DisplacementFilter(backgroundDisplacementSprite);
            filters.push(backgroundDisplacementFilter);

            let cursorDisplacementFilter = null;
            if (cursorImgEffect && cursorDisplacementSprite) {
                cursorDisplacementFilter = new DisplacementFilter(cursorDisplacementSprite);
                filters.push(cursorDisplacementFilter);
            }

            // Track filters in batch
            if (resourceManager && filters.length > 0) {
                resourceManager.trackFilterBatch(filters);
            }

            // Store filter references
            bgDispFilterRef.current = backgroundDisplacementFilter;
            cursorDispFilterRef.current = cursorDisplacementFilter;

            // Initialize filter scales to 0
            backgroundDisplacementFilter.scale.set(0);
            if (cursorDisplacementFilter) {
                cursorDisplacementFilter.scale.set(0);
            }

            // Add sprites to stage
            app.stage.addChild(backgroundDisplacementSprite);
            if (cursorImgEffect && cursorDisplacementSprite) {
                app.stage.addChild(cursorDisplacementSprite);
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
        bgDispFilterRef,
        backgroundDisplacementSpriteRef,
        cursorDisplacementSpriteRef
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