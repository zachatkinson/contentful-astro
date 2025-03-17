import { useEffect, useRef, useCallback, type RefObject } from 'react';
import { Sprite, DisplacementFilter } from 'pixi.js';
import { gsap } from 'gsap';
import ResourceManager from '../managers/ResourceManager';
import RenderScheduler from '../managers/RenderScheduler';
import { UpdateType } from '../managers/UpdateTypes';

// Development environment check
const isDevelopment = import.meta.env?.MODE === 'development';

// Define a custom event for filter coordination
const FILTER_COORDINATION_EVENT = 'kinetic-slider:filter-update';

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

// Interface for filter update event detail
interface FilterUpdateEventDetail {
    filterId: string;
    intensity: number;
    timestamp: number;
    source: 'mouse-tracking';
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

    // Track debouncing state for non-critical updates
    const debounceStateRef = useRef({
        debounceTimerId: 0,
        debounceDelay: 100, // 100ms debounce for non-critical updates
        lastDebounceTime: 0,
        pendingUpdate: false
    });

    // Track last mouse position for use by scheduled updates
    const lastMousePositionRef = useRef({
        x: 0,
        y: 0,
        containerRect: null as DOMRect | null,
        intensity: 0, // Store calculated intensity for reuse
        timestamp: 0  // When this position was recorded
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
     * Dispatch a custom event to coordinate with the filter system
     * This allows for better integration with the filter batching system
     * @param filterId The ID of the filter to update
     * @param intensity The intensity value to set
     * @param priority Optional priority level for the update (defaults to 'high')
     */
    const dispatchFilterUpdate = useCallback((filterId: string, intensity: number, priority: 'normal' | 'high' | 'critical' = 'high') => {
        try {
            if (typeof window === 'undefined') return;

            const detail = {
                type: filterId,
                intensity,
                timestamp: Date.now(),
                source: 'mouse-tracking',
                priority
            };

            const event = new CustomEvent(FILTER_COORDINATION_EVENT, { detail });
            window.dispatchEvent(event);

            if (isDevelopment) {
                console.log(`Dispatched filter update for ${filterId} with intensity ${intensity} (priority: ${priority})`);
            }
        } catch (error) {
            if (isDevelopment) {
                console.error('Error dispatching filter update:', error);
            }
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
            const { x: mouseX, y: mouseY, containerRect, intensity: storedIntensity } = lastMousePositionRef.current;

            if (!containerRect) return;

            // Use stored intensity if available, otherwise calculate it
            const displacementIntensity = storedIntensity || calculateDisplacementIntensity(mouseX, mouseY, containerRect);

            // Get current refs
            const backgroundSprite = backgroundDisplacementSpriteRef.current;
            const cursorSprite = cursorDisplacementSpriteRef.current;
            const bgFilter = backgroundDisplacementFilterRef?.current;
            const cursorFilter = cursorDisplacementFilterRef?.current;

            if (isDevelopment) {
                console.log('Animating displacement with intensity:', displacementIntensity, {
                    hasBgSprite: !!backgroundSprite,
                    hasCursorSprite: !!cursorSprite,
                    hasBgFilter: !!bgFilter,
                    hasCursorFilter: !!cursorFilter,
                    bgFilterScale: bgFilter ? { x: bgFilter.scale.x, y: bgFilter.scale.y } : 'no filter',
                    cursorFilterScale: cursorFilter ? { x: cursorFilter.scale.x, y: cursorFilter.scale.y } : 'no filter'
                });
            }

            // Clear existing animations
            cleanupAnimations();

            // Collect new animations
            const newAnimations: gsap.core.Tween[] = [];

            // Animate background displacement sprite
            if (backgroundSprite) {
                // Apply immediate position update for instant visibility
                backgroundSprite.x = mouseX;
                backgroundSprite.y = mouseY;

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

                    // Ensure the filter is visible by applying immediate scale
                    if (bgFilter.scale.x === 0 || bgFilter.scale.y === 0 || bgFilter.scale.x < intensity) {
                        if (isDevelopment) {
                            console.log(`Background filter was inactive or too small (${bgFilter.scale.x}, ${bgFilter.scale.y}), setting to ${intensity}`);
                        }
                        bgFilter.scale.x = intensity;
                        bgFilter.scale.y = intensity;
                    }

                    // Dispatch filter update event for coordination with filter system
                    dispatchFilterUpdate('background-displacement', intensity, 'critical');

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
                // Apply immediate position update for instant visibility
                cursorSprite.x = mouseX;
                cursorSprite.y = mouseY;

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

                    // Ensure the filter is visible by applying immediate scale
                    if (cursorFilter.scale.x === 0 || cursorFilter.scale.y === 0 || cursorFilter.scale.x < intensity) {
                        if (isDevelopment) {
                            console.log(`Cursor filter was inactive or too small (${cursorFilter.scale.x}, ${cursorFilter.scale.y}), setting to ${intensity}`);
                        }
                        cursorFilter.scale.x = intensity;
                        cursorFilter.scale.y = intensity;
                    }

                    // Dispatch filter update event for coordination with filter system
                    dispatchFilterUpdate('cursor-displacement', intensity, 'critical');

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

            // Schedule an immediate render update to ensure changes are visible
            scheduler.scheduleTypedUpdate(
                'mouseTracking',
                UpdateType.DISPLACEMENT_EFFECT,
                () => {
                    if (isDevelopment) {
                        console.log('Immediate render update for displacement effect');
                    }
                },
                'high'
            );

            // Reset pending update flag after processing
            debounceStateRef.current.pendingUpdate = false;
        } catch (error) {
            if (isDevelopment) {
                console.error('Error animating displacement:', error);
            }
            // Reset pending update flag even on error
            debounceStateRef.current.pendingUpdate = false;
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
        calculateDisplacementIntensity,
        dispatchFilterUpdate,
        scheduler
    ]);

    /**
     * Debounced version of displacement animation for non-critical updates
     * This is used when mouse movements are rapid but don't need immediate visual feedback
     */
    const debouncedDisplacementUpdate = useCallback(() => {
        try {
            if (!isMountedRef.current) return;

            // Clear any existing debounce timer
            if (debounceStateRef.current.debounceTimerId) {
                window.clearTimeout(debounceStateRef.current.debounceTimerId);
            }

            // Set a new debounce timer
            debounceStateRef.current.debounceTimerId = window.setTimeout(() => {
                // Only schedule if we have a pending update
                if (debounceStateRef.current.pendingUpdate) {
                    scheduler.scheduleTypedUpdate(
                        'mouseTracking',
                        UpdateType.FILTER_UPDATE, // Lower priority than direct mouse response
                        animateDisplacementScheduled,
                        'debounced'
                    );
                }
            }, debounceStateRef.current.debounceDelay);
        } catch (error) {
            if (isDevelopment) {
                console.error('Error in debounced update:', error);
            }
        }
    }, [animateDisplacementScheduled, scheduler]);

    // The optimized mouse move handler with throttling & scheduling
    const handleMouseMove = useCallback((event: Event) => {
        try {
            if (!isMountedRef.current) return;

            const e = event as MouseEvent;

            // Only proceed if we have a slider reference
            if (!sliderRef.current) return;

            // Calculate mouse position relative to the slider
            const rect = sliderRef.current.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            // Calculate intensity once and store it
            const intensity = calculateDisplacementIntensity(mouseX, mouseY, rect);
            const now = Date.now();

            // Check if filters are inactive and need immediate activation
            const bgFilter = backgroundDisplacementFilterRef?.current;
            const cursorFilter = cursorDisplacementFilterRef?.current;

            const bgFilterInactive = bgFilter && (bgFilter.scale.x === 0 || bgFilter.scale.y === 0);
            const cursorFilterInactive = cursorImgEffect && cursorFilter &&
                (cursorFilter.scale.x === 0 || cursorFilter.scale.y === 0);

            if (bgFilterInactive || cursorFilterInactive) {
                if (isDevelopment) {
                    console.log('[useMouseTracking] Detected inactive filters, applying immediate values', {
                        bgFilterInactive,
                        cursorFilterInactive,
                        bgScale: bgFilter ? [bgFilter.scale.x, bgFilter.scale.y] : 'no filter',
                        cursorScale: cursorFilter ? [cursorFilter.scale.x, cursorFilter.scale.y] : 'no filter'
                    });
                }

                // Apply immediate values to ensure visibility
                if (bgFilterInactive && bgFilter) {
                    const bgIntensity = intensity * 30;
                    bgFilter.scale.x = bgIntensity;
                    bgFilter.scale.y = bgIntensity;

                    // Dispatch critical filter update
                    dispatchFilterUpdate('background-displacement', bgIntensity, 'critical');
                }

                if (cursorFilterInactive && cursorFilter) {
                    const cursorIntensity = intensity * 15;
                    cursorFilter.scale.x = cursorIntensity;
                    cursorFilter.scale.y = cursorIntensity;

                    // Dispatch critical filter update
                    dispatchFilterUpdate('cursor-displacement', cursorIntensity, 'critical');
                }

                // Force an immediate update with critical priority
                scheduler.scheduleTypedUpdate(
                    'mouseTracking',
                    UpdateType.MOUSE_RESPONSE,
                    animateDisplacementScheduled,
                    'critical'
                );

                // Also update sprites immediately
                const bgSprite = backgroundDisplacementSpriteRef.current;
                const cursorSprite = cursorDisplacementSpriteRef.current;

                if (bgSprite) {
                    bgSprite.x = mouseX;
                    bgSprite.y = mouseY;
                }

                if (cursorImgEffect && cursorSprite) {
                    cursorSprite.x = mouseX;
                    cursorSprite.y = mouseY;
                }
            }

            // Store the mouse position and container rect for the scheduled update
            lastMousePositionRef.current = {
                x: mouseX,
                y: mouseY,
                containerRect: rect,
                intensity: intensity,
                timestamp: now
            };

            // Apply throttling for optimal performance
            const { lastThrottleTime, throttleDelay } = throttleStateRef.current;

            // Mark that we have a pending update
            debounceStateRef.current.pendingUpdate = true;

            // For rapid movements, use debouncing instead of immediate updates
            const timeSinceLastDebounce = now - debounceStateRef.current.lastDebounceTime;
            const isRapidMovement = timeSinceLastDebounce < 50; // 50ms threshold for rapid movement

            if (now - lastThrottleTime < throttleDelay) {
                // If we're throttling, queue a debounced update instead
                debouncedDisplacementUpdate();
                return;
            }

            // Update throttle timestamp
            throttleStateRef.current.lastThrottleTime = now;

            if (isRapidMovement) {
                // For rapid movements, use debouncing to avoid too many updates
                debouncedDisplacementUpdate();
            } else {
                // For normal movements, schedule immediate update with high priority
                scheduler.scheduleTypedUpdate(
                    'mouseTracking',
                    UpdateType.MOUSE_RESPONSE,
                    animateDisplacementScheduled,
                    'high'
                );

                // Update last debounce time
                debounceStateRef.current.lastDebounceTime = now;
            }
        } catch (error) {
            if (isDevelopment) {
                console.error('Error in mouse move handler:', error);
            }
        }
    }, [
        sliderRef,
        backgroundDisplacementFilterRef,
        cursorDisplacementFilterRef,
        backgroundDisplacementSpriteRef,
        cursorDisplacementSpriteRef,
        cursorImgEffect,
        animateDisplacementScheduled,
        debouncedDisplacementUpdate,
        calculateDisplacementIntensity,
        dispatchFilterUpdate,
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

                    // Clear any debounce timer
                    if (debounceStateRef.current.debounceTimerId) {
                        window.clearTimeout(debounceStateRef.current.debounceTimerId);
                        debounceStateRef.current.debounceTimerId = 0;
                    }

                    // Cancel any scheduled updates
                    scheduler.cancelTypedUpdate('mouseTracking', UpdateType.MOUSE_RESPONSE);
                    scheduler.cancelTypedUpdate('mouseTracking', UpdateType.FILTER_UPDATE, 'debounced');

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