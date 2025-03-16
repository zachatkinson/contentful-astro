import { useEffect, useRef, useCallback, type RefObject } from 'react';
import { Sprite, DisplacementFilter } from 'pixi.js';
import { gsap } from 'gsap';
import ResourceManager from '../managers/ResourceManager';
import RenderScheduler from '../managers/RenderScheduler';
import { UpdateType } from '../managers/UpdateTypes';

// Development environment check
const isDevelopment = import.meta.env?.MODE === 'development';

interface UseMouseTrackingProps {
    sliderRef: RefObject<HTMLDivElement | null>;
    backgroundDisplacementSpriteRef: RefObject<Sprite | null>;
    cursorDisplacementSpriteRef: RefObject<Sprite | null>;
    backgroundDisplacementFilterRef?: RefObject<DisplacementFilter | null>;
    cursorDisplacementFilterRef?: RefObject<DisplacementFilter | null>;
    cursorImgEffect: boolean;
    cursorMomentum: number;
    resourceManager?: ResourceManager | null;
}

/**
 * Hook to handle mouse movement tracking for displacement sprites
 * Refactored to use RenderScheduler for batched updates
 */
const useMouseTracking = ({
                              sliderRef,
                              backgroundDisplacementSpriteRef,
                              cursorDisplacementSpriteRef,
                              backgroundDisplacementFilterRef,
                              cursorDisplacementFilterRef,
                              cursorImgEffect,
                              cursorMomentum,
                              resourceManager
                          }: UseMouseTrackingProps) => {
    // Track active animations for batch processing
    const activeAnimationsRef = useRef<gsap.core.Tween[]>([]);

    // Track component mount state
    const isMountedRef = useRef(true);

    // Track throttling state
    const throttleStateRef = useRef({
        lastThrottleTime: 0,
        throttleDelay: 16 // ~60fps
    });

    // Track last mouse position for use by scheduled updates
    const lastMousePositionRef = useRef({
        x: 0,
        y: 0,
        containerRect: null as DOMRect | null
    });

    // Get the scheduler instance
    const scheduler = RenderScheduler.getInstance();

    // Process batch animations through ResourceManager
    const processBatchAnimations = useCallback(() => {
        try {
            const animations = activeAnimationsRef.current;

            // Skip if no ResourceManager or no animations
            if (!resourceManager || animations.length === 0) return;

            // Track animations in batch
            resourceManager.trackAnimationBatch(animations);

            // Clear array by setting length to 0 (more efficient than creating new array)
            animations.length = 0;

            if (isDevelopment) {
                console.log('Processed batch animations for mouse tracking');
            }
        } catch (error) {
            if (isDevelopment) {
                console.error('Error processing batch animations:', error);
            }
            // Clear array even on error to avoid stuck state
            activeAnimationsRef.current = [];
        }
    }, [resourceManager]);

    // Clean up active animations
    const cleanupAnimations = useCallback(() => {
        try {
            const animations = activeAnimationsRef.current;

            // Kill all animations
            animations.forEach(tween => {
                if (tween && tween.isActive()) {
                    tween.kill();
                }
            });

            // Clear array
            animations.length = 0;
        } catch (error) {
            if (isDevelopment) {
                console.error('Error cleaning up animations:', error);
            }
            // Reset array even on error
            activeAnimationsRef.current = [];
        }
    }, []);

    // Calculate displacement intensity based on mouse position
    const calculateDisplacementIntensity = useCallback((
        mouseX: number,
        mouseY: number,
        rect: DOMRect
    ): number => {
        try {
            // Calculate center point and distance
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            const distanceFromCenter = Math.sqrt(
                Math.pow(mouseX - centerX, 2) +
                Math.pow(mouseY - centerY, 2)
            );

            // Calculate maximum possible distance
            const maxDistance = Math.sqrt(
                Math.pow(rect.width / 2, 2) +
                Math.pow(rect.height / 2, 2)
            );

            // Normalize intensity (0-1 range)
            return Math.min(1, distanceFromCenter / (maxDistance * 0.7));
        } catch (error) {
            if (isDevelopment) {
                console.error('Error calculating displacement intensity:', error);
            }
            // Return safe default value on error
            return 0.5;
        }
    }, []);

    /**
     * Animation function that gets scheduled by the RenderScheduler
     * Creates and applies animations for mouse tracking displacement
     */
    const animateDisplacementScheduled = useCallback(() => {
        try {
            if (!isMountedRef.current) return;

            // Get stored mouse position
            const { x: mouseX, y: mouseY, containerRect } = lastMousePositionRef.current;

            if (!containerRect) return;

            // Calculate intensity
            const displacementIntensity = calculateDisplacementIntensity(mouseX, mouseY, containerRect);

            // Get current refs
            const backgroundSprite = backgroundDisplacementSpriteRef.current;
            const cursorSprite = cursorDisplacementSpriteRef.current;
            const bgFilter = backgroundDisplacementFilterRef?.current;
            const cursorFilter = cursorDisplacementFilterRef?.current;

            // Clear existing animations
            cleanupAnimations();

            // Collect new animations
            const newAnimations: gsap.core.Tween[] = [];

            // Animate background displacement sprite
            if (backgroundSprite) {
                const bgSpriteTween = gsap.to(backgroundSprite, {
                    x: mouseX,
                    y: mouseY,
                    duration: cursorMomentum,
                    ease: 'power2.out'
                });

                newAnimations.push(bgSpriteTween);

                // Animate background filter scale if available
                if (bgFilter) {
                    const intensity = displacementIntensity * 30;
                    const bgFilterTween = gsap.to(bgFilter.scale, {
                        x: intensity,
                        y: intensity,
                        duration: cursorMomentum,
                        ease: 'power2.out'
                    });

                    newAnimations.push(bgFilterTween);
                }
            }

            // Animate cursor displacement sprite if effect is enabled
            if (cursorImgEffect && cursorSprite) {
                const cursorSpriteTween = gsap.to(cursorSprite, {
                    x: mouseX,
                    y: mouseY,
                    duration: cursorMomentum,
                    ease: 'power2.out'
                });

                newAnimations.push(cursorSpriteTween);

                // Animate cursor filter scale if available
                if (cursorFilter) {
                    const intensity = displacementIntensity * 15;
                    const cursorFilterTween = gsap.to(cursorFilter.scale, {
                        x: intensity,
                        y: intensity,
                        duration: cursorMomentum,
                        ease: 'power2.out'
                    });

                    newAnimations.push(cursorFilterTween);
                }
            }

            // Add new animations to active animations ref
            activeAnimationsRef.current.push(...newAnimations);

            // Process animations in batch
            processBatchAnimations();
        } catch (error) {
            if (isDevelopment) {
                console.error('Error animating displacement:', error);
            }
        }
    }, [
        backgroundDisplacementSpriteRef,
        cursorDisplacementSpriteRef,
        backgroundDisplacementFilterRef,
        cursorDisplacementFilterRef,
        cursorImgEffect,
        cursorMomentum,
        cleanupAnimations,
        processBatchAnimations,
        calculateDisplacementIntensity
    ]);

    // The optimized mouse move handler with throttling & scheduling
    const handleMouseMove = useCallback((event: Event) => {
        try {
            if (!isMountedRef.current) return;

            const e = event as MouseEvent;

            // Apply throttling for optimal performance
            const { lastThrottleTime, throttleDelay } = throttleStateRef.current;
            const now = Date.now();

            if (now - lastThrottleTime < throttleDelay) return;
            throttleStateRef.current.lastThrottleTime = now;

            // Only proceed if we have a slider reference
            if (!sliderRef.current) return;

            // Calculate mouse position relative to the slider
            const rect = sliderRef.current.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            // Store the mouse position and container rect for the scheduled update
            lastMousePositionRef.current = {
                x: mouseX,
                y: mouseY,
                containerRect: rect
            };

            // Schedule the update with proper priority
            scheduler.scheduleTypedUpdate(
                'mouseTracking',
                UpdateType.MOUSE_RESPONSE,
                animateDisplacementScheduled
            );
        } catch (error) {
            if (isDevelopment) {
                console.error('Error in mouse move handler:', error);
            }
        }
    }, [
        sliderRef,
        animateDisplacementScheduled,
        scheduler
    ]);

    // Set up mouse tracking
    useEffect(() => {
        // Skip during server-side rendering
        if (typeof window === 'undefined') return;

        // Skip if slider reference is not available
        if (!sliderRef.current) return;

        // Reset mounted state
        isMountedRef.current = true;

        try {
            const node = sliderRef.current;

            // Register event listeners
            if (resourceManager) {
                // Batch registration with ResourceManager
                const listeners = new Map<string, EventCallback[]>();
                listeners.set('mousemove', [handleMouseMove]);
                resourceManager.addEventListenerBatch(node, listeners);
            } else {
                // Direct registration
                node.addEventListener('mousemove', handleMouseMove, { passive: true });
            }

            // Cleanup on unmount
            return () => {
                // Update mounted state immediately
                isMountedRef.current = false;

                try {
                    // Clean up animations
                    cleanupAnimations();

                    // Cancel any scheduled updates
                    scheduler.cancelTypedUpdate('mouseTracking', UpdateType.MOUSE_RESPONSE);

                    // ResourceManager handles its own cleanup
                    if (!resourceManager) {
                        node.removeEventListener('mousemove', handleMouseMove);
                    }
                } catch (cleanupError) {
                    if (isDevelopment) {
                        console.error('Error during mouse tracking cleanup:', cleanupError);
                    }
                }
            };
        } catch (error) {
            if (isDevelopment) {
                console.error('Error setting up mouse tracking:', error);
            }
            // Return empty cleanup function
            return () => {};
        }
    }, [
        sliderRef,
        handleMouseMove,
        cleanupAnimations,
        resourceManager,
        scheduler
    ]);
};

// Type definition for event callback - to match ResourceManager's expected type
type EventCallback = EventListenerOrEventListenerObject;

export default useMouseTracking;