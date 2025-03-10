import { useEffect, useRef, useCallback, type RefObject } from 'react';
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
                                           resourceManager
                                       }: UseDisplacementEffectsProps) => {
    // Track mounted state to prevent updates after unmounting
    const isMountedRef = useRef(true);

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

            // Track filters
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
        } catch (error) {
            // Reset initialization state on failure
            initializationStateRef.current = {
                isInitializing: false,
                isInitialized: false
            };
        }
    }, [
        backgroundDisplacementSpriteLocation,
        cursorDisplacementSpriteLocation,
        cursorImgEffect,
        cursorScaleIntensity,
        resourceManager
    ]);

    // Effect to trigger initialization when app is ready
    useEffect(() => {
        // Ensure we're in a browser environment
        if (typeof window === 'undefined') return;

        // Only attempt setup if the app and stage are ready
        if (appRef.current?.stage) {
            setupDisplacementEffects();
        }

        // Cleanup function
        return () => {
            isMountedRef.current = false;
            // Reset initialization state
            initializationStateRef.current = {
                isInitializing: false,
                isInitialized: false
            };
        };
    }, [appRef.current?.stage, setupDisplacementEffects]);

    // Displacement effect methods
    const showDisplacementEffects = useCallback(() => {
        if (!initializationStateRef.current.isInitialized) return;

        const backgroundSprite = backgroundDisplacementSpriteRef.current;
        const cursorSprite = cursorDisplacementSpriteRef.current;
        const bgFilter = bgDispFilterRef.current;
        const cursorFilter = cursorDispFilterRef.current;

        if (backgroundSprite && bgFilter) {
            gsap.to(backgroundSprite, { alpha: 1, duration: 0.5 });
            gsap.to(bgFilter.scale, {
                x: DEFAULT_BG_FILTER_SCALE,
                y: DEFAULT_BG_FILTER_SCALE,
                duration: 0.5
            });
        }

        if (cursorImgEffect && cursorSprite && cursorFilter) {
            gsap.to(cursorSprite, { alpha: 1, duration: 0.5 });
            gsap.to(cursorFilter.scale, {
                x: DEFAULT_CURSOR_FILTER_SCALE,
                y: DEFAULT_CURSOR_FILTER_SCALE,
                duration: 0.5
            });
        }
    }, [cursorImgEffect]);

    const hideDisplacementEffects = useCallback(() => {
        if (!initializationStateRef.current.isInitialized) return;

        const backgroundSprite = backgroundDisplacementSpriteRef.current;
        const cursorSprite = cursorDisplacementSpriteRef.current;
        const bgFilter = bgDispFilterRef.current;
        const cursorFilter = cursorDispFilterRef.current;

        if (backgroundSprite && bgFilter) {
            gsap.to(backgroundSprite, { alpha: 0, duration: 0.5 });
            gsap.to(bgFilter.scale, { x: 0, y: 0, duration: 0.5 });
        }

        if (cursorImgEffect && cursorSprite && cursorFilter) {
            gsap.to(cursorSprite, { alpha: 0, duration: 0.5 });
            gsap.to(cursorFilter.scale, { x: 0, y: 0, duration: 0.5 });
        }
    }, [cursorImgEffect]);

    return {
        showDisplacementEffects,
        hideDisplacementEffects,
        DEFAULT_BG_FILTER_SCALE,
        DEFAULT_CURSOR_FILTER_SCALE
    };
};