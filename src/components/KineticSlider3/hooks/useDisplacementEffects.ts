import { useEffect, useRef, useCallback, type RefObject } from 'react';
import { Sprite, DisplacementFilter, Assets, Application } from 'pixi.js';
import { gsap } from 'gsap';
import ResourceManager from '../managers/ResourceManager';

// Development environment check
const isDevelopment = import.meta.env?.MODE === 'development';

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

// Default filter scales for active state
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

            // === Load textures in batch ===
            const bgDisplacementUrl = backgroundDisplacementSpriteLocation || '/images/background-displace.jpg';
            const cursorDisplacementUrl = cursorDisplacementSpriteLocation || '/images/cursor-displace.png';

            // Determine which textures to load
            const texturesToLoad = [bgDisplacementUrl];
            if (cursorImgEffect) {
                texturesToLoad.push(cursorDisplacementUrl);
            }

            // Load all textures in parallel
            const textureResults = await Promise.all(
                texturesToLoad.map(url => Assets.load(url))
            );

            // Create texture map for batch tracking
            const textureMap = new Map<string, any>();
            textureMap.set(bgDisplacementUrl, textureResults[0]);
            if (cursorImgEffect) {
                textureMap.set(cursorDisplacementUrl, textureResults[1]);
            }

            // Batch track textures
            if (resourceManager) {
                resourceManager.trackTextureBatch(textureMap);
            }

            // === Create sprites ===
            const backgroundDisplacementSprite = new Sprite(textureMap.get(bgDisplacementUrl));
            backgroundDisplacementSprite.anchor.set(0.5);
            backgroundDisplacementSprite.x = app.screen.width / 2;
            backgroundDisplacementSprite.y = app.screen.height / 2;
            backgroundDisplacementSprite.scale.set(2);
            backgroundDisplacementSprite.alpha = 0; // Start invisible

            // Store background displacement sprite
            backgroundDisplacementSpriteRef.current = backgroundDisplacementSprite;

            // Sprite collection for batch tracking
            const spritesToTrack = [backgroundDisplacementSprite];

            // Create cursor displacement sprite if enabled
            let cursorDisplacementSprite = null;
            if (cursorImgEffect) {
                cursorDisplacementSprite = new Sprite(textureMap.get(cursorDisplacementUrl));
                cursorDisplacementSprite.anchor.set(0.5);
                cursorDisplacementSprite.x = app.screen.width / 2;
                cursorDisplacementSprite.y = app.screen.height / 2;
                cursorDisplacementSprite.scale.set(cursorScaleIntensity || 0.65);
                cursorDisplacementSprite.alpha = 0; // Start invisible

                cursorDisplacementSpriteRef.current = cursorDisplacementSprite;
                spritesToTrack.push(cursorDisplacementSprite);
            }

            // Batch track sprites
            if (resourceManager) {
                resourceManager.trackDisplayObjectBatch(spritesToTrack);
            }

            // === Create filters ===
            const backgroundDisplacementFilter = new DisplacementFilter(backgroundDisplacementSprite);
            const cursorDisplacementFilter = cursorImgEffect && cursorDisplacementSprite
                ? new DisplacementFilter(cursorDisplacementSprite)
                : null;

            // CRITICAL: Initialize filter scales to 0 to prevent filters showing on page load
            backgroundDisplacementFilter.scale.x = 0;
            backgroundDisplacementFilter.scale.y = 0;

            if (cursorDisplacementFilter) {
                cursorDisplacementFilter.scale.x = 0;
                cursorDisplacementFilter.scale.y = 0;
            }

            // Store filter references
            bgDispFilterRef.current = backgroundDisplacementFilter;
            cursorDispFilterRef.current = cursorDisplacementFilter;

            // Batch track filters
            if (resourceManager) {
                const filtersToTrack = [backgroundDisplacementFilter];
                if (cursorDisplacementFilter) {
                    filtersToTrack.push(cursorDisplacementFilter);
                }

                // Explicitly initialize filters in disabled state
                resourceManager.initializeFilterBatchDisabled(filtersToTrack);
                resourceManager.trackFilterBatch(filtersToTrack);
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

            if (isDevelopment) {
                console.log('Displacement effects initialized with filters DISABLED');
            }

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

    // Displacement effect activation - OPTIMIZED FOR BATCH ANIMATION TRACKING
    const showDisplacementEffects = useCallback(() => {
        if (!initializationStateRef.current.isInitialized) return [];

        const backgroundSprite = backgroundDisplacementSpriteRef.current;
        const cursorSprite = cursorDisplacementSpriteRef.current;
        const bgFilter = bgDispFilterRef.current;
        const cursorFilter = cursorDispFilterRef.current;

        const animations: gsap.core.Tween[] = [];

        if (backgroundSprite && bgFilter) {
            console.log("Activating background displacement filter");

            const bgAlphaTween = gsap.to(backgroundSprite, { alpha: 1, duration: 0.5 });
            const bgFilterTween = gsap.to(bgFilter.scale, {
                x: DEFAULT_BG_FILTER_SCALE,
                y: DEFAULT_BG_FILTER_SCALE,
                duration: 0.5,
                ease: "power2.out"
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
            console.log("Activating cursor displacement filter");

            const cursorAlphaTween = gsap.to(cursorSprite, { alpha: 1, duration: 0.5 });
            const cursorFilterTween = gsap.to(cursorFilter.scale, {
                x: DEFAULT_CURSOR_FILTER_SCALE,
                y: DEFAULT_CURSOR_FILTER_SCALE,
                duration: 0.5,
                ease: "power2.out"
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
    }, [
        cursorImgEffect,
        resourceManager,
        backgroundDisplacementSpriteRef,
        cursorDisplacementSpriteRef,
        bgDispFilterRef,
        cursorDispFilterRef
    ]);

    // Displacement effect deactivation - OPTIMIZED FOR BATCH ANIMATION TRACKING
    const hideDisplacementEffects = useCallback(() => {
        if (!initializationStateRef.current.isInitialized) return [];

        const backgroundSprite = backgroundDisplacementSpriteRef.current;
        const cursorSprite = cursorDisplacementSpriteRef.current;
        const bgFilter = bgDispFilterRef.current;
        const cursorFilter = cursorDispFilterRef.current;

        // Pre-allocate animation array for batch tracking
        const animations: gsap.core.Tween[] = [];

        if (backgroundSprite && bgFilter) {
            // Create and collect animations
            animations.push(
                gsap.to(backgroundSprite, { alpha: 0, duration: 0.5 }),
                gsap.to(bgFilter.scale, {
                    x: 0,
                    y: 0,
                    duration: 0.5,
                    onComplete: () => {
                        // Ensure filter is fully disabled when animation completes
                        if (resourceManager && bgFilter) {
                            resourceManager.disableFilter(bgFilter);
                        }
                    }
                })
            );
        }

        if (cursorImgEffect && cursorSprite && cursorFilter) {
            // Create and collect animations
            animations.push(
                gsap.to(cursorSprite, { alpha: 0, duration: 0.5 }),
                gsap.to(cursorFilter.scale, {
                    x: 0,
                    y: 0,
                    duration: 0.5,
                    onComplete: () => {
                        // Ensure filter is fully disabled when animation completes
                        if (resourceManager && cursorFilter) {
                            resourceManager.disableFilter(cursorFilter);
                        }
                    }
                })
            );
        }

        // Batch track animations if any were created
        if (resourceManager && animations.length > 0) {
            resourceManager.trackAnimationBatch(animations);
        }

        if (isDevelopment) {
            console.log('Hiding displacement effects with', animations.length, 'animations');
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

    // Immediately disable all filters - used for direct filter control
    const forceDisableAllFilters = useCallback(() => {
        const bgFilter = bgDispFilterRef.current;
        const cursorFilter = cursorDispFilterRef.current;

        if (bgFilter && bgFilter.scale) {
            bgFilter.scale.x = 0;
            bgFilter.scale.y = 0;

            if (resourceManager) {
                resourceManager.disableFilter(bgFilter);
            }
        }

        if (cursorFilter && cursorFilter.scale) {
            cursorFilter.scale.x = 0;
            cursorFilter.scale.y = 0;

            if (resourceManager) {
                resourceManager.disableFilter(cursorFilter);
            }
        }

        if (isDevelopment) {
            console.log('Forced immediate disable of all displacement filters');
        }
    }, [bgDispFilterRef, cursorDispFilterRef, resourceManager]);

    // Effect to trigger initialization when app is ready
    useEffect(() => {
        // Ensure we're in a browser environment
        if (typeof window === 'undefined') return;

        // Only attempt setup if the app and stage are ready
        if (appRef.current?.stage) {
            setupDisplacementEffects().then(() => {
                // Double-ensure filters are disabled after initialization
                forceDisableAllFilters();
            });
        }

        // No cleanup needed as ResourceManager will handle resource disposal
        return () => {
            // Reset initialization state
            initializationStateRef.current = {
                isInitializing: false,
                isInitialized: false
            };
        };
    }, [appRef.current?.stage, setupDisplacementEffects, forceDisableAllFilters]);

    // Additional effect specifically for ensuring filters are disabled on initial render
    useEffect(() => {
        if (typeof window === 'undefined') return;

        // Immediate call to force disable filters
        forceDisableAllFilters();

        // Also set a short timeout to make sure filters are disabled even after
        // other initialization logic might have run
        const timeoutId = setTimeout(() => {
            forceDisableAllFilters();
        }, 50);

        return () => clearTimeout(timeoutId);
    }, [forceDisableAllFilters]);

    return {
        showDisplacementEffects,
        hideDisplacementEffects,
        forceDisableAllFilters,
        DEFAULT_BG_FILTER_SCALE,
        DEFAULT_CURSOR_FILTER_SCALE
    };
};