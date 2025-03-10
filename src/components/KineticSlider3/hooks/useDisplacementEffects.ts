import { useEffect, useRef, useCallback, type RefObject } from 'react';
import { Sprite, DisplacementFilter, Assets, Application } from 'pixi.js';
import { gsap } from 'gsap';
import ResourceManager from '../managers/ResourceManager';

interface UseDisplacementEffectsProps {
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
            return;
        }

        // Validate app and stage
        if (!appRef.current || !appRef.current.stage) {
            return;
        }

        // Mark as initializing
        initializationStateRef.current.isInitializing = true;

        try {
            const app = appRef.current;

            // Load background displacement texture
            const bgDisplacementUrl = backgroundDisplacementSpriteLocation || '/images/background-displace.jpg';
            const bgTexture = await Assets.load(bgDisplacementUrl);

            // Create background displacement sprite
            const backgroundDisplacementSprite = new Sprite(bgTexture);
            backgroundDisplacementSprite.anchor.set(0.5);
            backgroundDisplacementSprite.x = app.screen.width / 2;
            backgroundDisplacementSprite.y = app.screen.height / 2;
            backgroundDisplacementSprite.scale.set(2);
            backgroundDisplacementSprite.alpha = 0;

            // Track with resource manager
            resourceManager?.trackDisplayObject(backgroundDisplacementSprite);
            resourceManager?.trackTexture(bgDisplacementUrl, bgTexture);

            // Store background displacement sprite
            backgroundDisplacementSpriteRef.current = backgroundDisplacementSprite;

            // Cursor displacement (conditional)
            let cursorDisplacementSprite = null;
            if (cursorImgEffect) {
                const cursorDisplacementUrl = cursorDisplacementSpriteLocation || '/images/cursor-displace.png';
                const cursorTexture = await Assets.load(cursorDisplacementUrl);

                cursorDisplacementSprite = new Sprite(cursorTexture);
                cursorDisplacementSprite.anchor.set(0.5);
                cursorDisplacementSprite.x = app.screen.width / 2;
                cursorDisplacementSprite.y = app.screen.height / 2;
                cursorDisplacementSprite.scale.set(cursorScaleIntensity || 0.65);
                cursorDisplacementSprite.alpha = 0;

                // Track with resource manager
                resourceManager?.trackDisplayObject(cursorDisplacementSprite);
                resourceManager?.trackTexture(cursorDisplacementUrl, cursorTexture);

                cursorDisplacementSpriteRef.current = cursorDisplacementSprite;
            }

            // Create displacement filters
            const backgroundDisplacementFilter = new DisplacementFilter(backgroundDisplacementSprite);
            const cursorDisplacementFilter = cursorImgEffect && cursorDisplacementSprite
                ? new DisplacementFilter(cursorDisplacementSprite)
                : null;

            // Track filters with resource manager
            resourceManager?.trackFilter(backgroundDisplacementFilter);
            if (cursorDisplacementFilter) {
                resourceManager?.trackFilter(cursorDisplacementFilter);
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

            // Log error in development
            if (import.meta.env.NODE_ENV === 'development') {
                console.error('Failed to setup displacement effects:', error);
            }

            return null;
        }
    }, [
        backgroundDisplacementSpriteLocation,
        cursorDisplacementSpriteLocation,
        cursorImgEffect,
        cursorScaleIntensity,
        resourceManager
    ]);

    // Displacement effect methods
    const showDisplacementEffects = useCallback(() => {
        if (!initializationStateRef.current.isInitialized) return [];

        const backgroundSprite = backgroundDisplacementSpriteRef.current;
        const cursorSprite = cursorDisplacementSpriteRef.current;
        const bgFilter = bgDispFilterRef.current;
        const cursorFilter = cursorDispFilterRef.current;

        const animations: gsap.core.Tween[] = [];

        if (backgroundSprite && bgFilter) {
            const bgAlphaTween = gsap.to(backgroundSprite, { alpha: 1, duration: 0.5 });
            const bgFilterTween = gsap.to(bgFilter.scale, {
                x: DEFAULT_BG_FILTER_SCALE,
                y: DEFAULT_BG_FILTER_SCALE,
                duration: 0.5
            });

            // Safely track animations
            if (resourceManager) {
                const trackedBgAlphaTween = resourceManager.trackAnimation(bgAlphaTween);
                const trackedBgFilterTween = resourceManager.trackAnimation(bgFilterTween);

                if (trackedBgAlphaTween) animations.push(trackedBgAlphaTween);
                if (trackedBgFilterTween) animations.push(trackedBgFilterTween);
            } else {
                animations.push(bgAlphaTween, bgFilterTween);
            }
        }

        if (cursorImgEffect && cursorSprite && cursorFilter) {
            const cursorAlphaTween = gsap.to(cursorSprite, { alpha: 1, duration: 0.5 });
            const cursorFilterTween = gsap.to(cursorFilter.scale, {
                x: DEFAULT_CURSOR_FILTER_SCALE,
                y: DEFAULT_CURSOR_FILTER_SCALE,
                duration: 0.5
            });

            // Safely track animations
            if (resourceManager) {
                const trackedCursorAlphaTween = resourceManager.trackAnimation(cursorAlphaTween);
                const trackedCursorFilterTween = resourceManager.trackAnimation(cursorFilterTween);

                if (trackedCursorAlphaTween) animations.push(trackedCursorAlphaTween);
                if (trackedCursorFilterTween) animations.push(trackedCursorFilterTween);
            } else {
                animations.push(cursorAlphaTween, cursorFilterTween);
            }
        }

        return animations;
    }, [cursorImgEffect, resourceManager]);

    const hideDisplacementEffects = useCallback(() => {
        if (!initializationStateRef.current.isInitialized) return [];

        const backgroundSprite = backgroundDisplacementSpriteRef.current;
        const cursorSprite = cursorDisplacementSpriteRef.current;
        const bgFilter = bgDispFilterRef.current;
        const cursorFilter = cursorDispFilterRef.current;

        const animations: gsap.core.Tween[] = [];

        if (backgroundSprite && bgFilter) {
            const bgAlphaTween = gsap.to(backgroundSprite, { alpha: 0, duration: 0.5 });
            const bgFilterTween = gsap.to(bgFilter.scale, { x: 0, y: 0, duration: 0.5 });

            // Safely track animations
            if (resourceManager) {
                const trackedBgAlphaTween = resourceManager.trackAnimation(bgAlphaTween);
                const trackedBgFilterTween = resourceManager.trackAnimation(bgFilterTween);

                if (trackedBgAlphaTween) animations.push(trackedBgAlphaTween);
                if (trackedBgFilterTween) animations.push(trackedBgFilterTween);
            } else {
                animations.push(bgAlphaTween, bgFilterTween);
            }
        }

        if (cursorImgEffect && cursorSprite && cursorFilter) {
            const cursorAlphaTween = gsap.to(cursorSprite, { alpha: 0, duration: 0.5 });
            const cursorFilterTween = gsap.to(cursorFilter.scale, { x: 0, y: 0, duration: 0.5 });

            // Safely track animations
            if (resourceManager) {
                const trackedCursorAlphaTween = resourceManager.trackAnimation(cursorAlphaTween);
                const trackedCursorFilterTween = resourceManager.trackAnimation(cursorFilterTween);

                if (trackedCursorAlphaTween) animations.push(trackedCursorAlphaTween);
                if (trackedCursorFilterTween) animations.push(trackedCursorFilterTween);
            } else {
                animations.push(cursorAlphaTween, cursorFilterTween);
            }
        }

        return animations;
    }, [cursorImgEffect, resourceManager]);

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