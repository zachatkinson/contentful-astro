import { useEffect, useRef, useCallback, type RefObject } from 'react';
import { DisplacementFilter } from 'pixi.js';
import { gsap } from 'gsap';
import ResourceManager from '../managers/ResourceManager';
import RenderScheduler from '../managers/RenderScheduler';
import { UpdateType } from '../managers/UpdateTypes';

// Development environment check
const isDevelopment = import.meta.env?.MODE === 'development';

// Type definitions for function parameters
interface UseIdleTimerProps {
    sliderRef: RefObject<HTMLDivElement | null>;
    cursorActive: RefObject<boolean>;
    bgDispFilterRef: RefObject<DisplacementFilter | null>;
    cursorDispFilterRef: RefObject<DisplacementFilter | null>;
    cursorImgEffect: boolean;
    defaultBgFilterScale: number;
    defaultCursorFilterScale: number;
    idleTimeout?: number;
    resourceManager?: ResourceManager | null;
}

// Interface for animation state tracking
interface AnimationState {
    isAnimating: boolean;
    activeAnimations: gsap.core.Tween[];
    pendingBatchAnimations: gsap.core.Tween[];
}

/**
 * Hook to manage idle timer for resetting displacement effects
 * Fully optimized with:
 * - Batch resource management
 * - Efficient timer handling
 * - Comprehensive error handling
 * - Memory leak prevention
 * - Optimized animation management
 * - Cancellation mechanisms
 */
const useIdleTimer = ({
                          sliderRef,
                          cursorActive,
                          bgDispFilterRef,
                          cursorDispFilterRef,
                          cursorImgEffect,
                          defaultBgFilterScale,
                          defaultCursorFilterScale,
                          idleTimeout = 300,
                          resourceManager
                      }: UseIdleTimerProps) => {
    // Store idle timer reference
    const idleTimerRef = useRef<number | null>(null);

    // Store animation state with a ref to avoid re-renders
    const animationStateRef = useRef<AnimationState>({
        isAnimating: false,
        activeAnimations: [],
        pendingBatchAnimations: []
    });

    // Flag to prevent operations during unmounting
    const isUnmountingRef = useRef(false);

    // Last animation operation timestamp for performance tracking
    const lastAnimationOpRef = useRef<number>(0);

    /**
     * Process pending animations in batch for better performance
     */
    const processPendingAnimations = useCallback(() => {
        try {
            // Skip if unmounting or no resource manager
            if (isUnmountingRef.current || !resourceManager) return;

            const { pendingBatchAnimations } = animationStateRef.current;

            // Process animations in batch if any exist
            if (pendingBatchAnimations.length > 0) {
                if (isDevelopment) {
                    console.log(`Processing batch of ${pendingBatchAnimations.length} animations`);
                }

                resourceManager.trackAnimationBatch(pendingBatchAnimations);

                // Clear the array after tracking (more efficient than creating a new array)
                pendingBatchAnimations.length = 0;

                // Record performance metrics
                const now = performance.now();
                const opTime = now - lastAnimationOpRef.current;
                if (isDevelopment && lastAnimationOpRef.current > 0) {
                    console.debug(`Animation batch processing took ${opTime.toFixed(2)}ms`);
                }
                lastAnimationOpRef.current = now;
            }
        } catch (error) {
            if (isDevelopment) {
                console.error('Error processing pending animations:', error);
            }
            // Clear batch even on error to avoid stuck state
            animationStateRef.current.pendingBatchAnimations = [];
        }
    }, [resourceManager]);

    /**
     * Add an animation to the pending batch collection
     * @param animation - The animation to track
     * @returns The same animation for chaining
     */
    const trackAnimationForBatch = useCallback((animation: gsap.core.Tween): gsap.core.Tween => {
        try {
            // Skip if unmounting
            if (isUnmountingRef.current) return animation;

            // Add to pending batch
            animationStateRef.current.pendingBatchAnimations.push(animation);

            // Also track in active animations for cleanup
            animationStateRef.current.activeAnimations.push(animation);

            return animation;
        } catch (error) {
            if (isDevelopment) {
                console.error('Error tracking animation for batch:', error);
            }
            return animation;
        }
    }, []);

    /**
     * Clean up any active timers safely
     */
    const clearIdleTimer = useCallback(() => {
        if (idleTimerRef.current !== null) {
            try {
                if (resourceManager) {
                    resourceManager.clearTimeout(idleTimerRef.current);
                } else {
                    window.clearTimeout(idleTimerRef.current);
                }
            } catch (error) {
                if (isDevelopment) {
                    console.error('Error clearing idle timer:', error);
                }
            } finally {
                idleTimerRef.current = null;
            }
        }
    }, [resourceManager]);

    /**
     * Clean up any active animations
     */
    const cleanupAnimations = useCallback(() => {
        try {
            const { activeAnimations, pendingBatchAnimations } = animationStateRef.current;

            // Kill all active animations
            activeAnimations.forEach(tween => {
                if (tween && tween.isActive()) {
                    tween.kill();
                }
            });

            // Clear arrays
            activeAnimations.length = 0;
            pendingBatchAnimations.length = 0;

            // Update animation state
            animationStateRef.current.isAnimating = false;

            if (isDevelopment) {
                console.log('All animations cleaned up');
            }
        } catch (error) {
            if (isDevelopment) {
                console.error('Error cleaning up animations:', error);
            }

            // Reset arrays even on error
            animationStateRef.current.activeAnimations = [];
            animationStateRef.current.pendingBatchAnimations = [];
            animationStateRef.current.isAnimating = false;
        }
    }, []);

    /**
     * Apply filter animations with batch processing
     * @param targetScale - Target scale for the filter
     * @param duration - Animation duration in seconds
     * @param onComplete - Optional callback when animation completes
     */
    const animateFilters = useCallback((
        targetScale: number,
        duration: number = 0.5,
        onComplete?: () => void
    ) => {
        try {
            // Skip if unmounting
            if (isUnmountingRef.current) return;

            // Record start time for performance tracking
            lastAnimationOpRef.current = performance.now();

            // Set up completion callback with batch processing
            const handleCompletion = () => {
                // Process any pending animations
                processPendingAnimations();

                // Call the original completion callback if provided
                if (onComplete) onComplete();
            };

            // Create animations array for batch tracking
            const animations: gsap.core.Tween[] = [];

            // Create background displacement filter animation
            if (bgDispFilterRef.current) {
                const bgTween = gsap.to(bgDispFilterRef.current.scale, {
                    x: targetScale,
                    y: targetScale,
                    duration,
                    ease: "power2.out",
                    onComplete: () => {
                        // Re-track the filter after animation
                        if (resourceManager && bgDispFilterRef.current) {
                            resourceManager.trackFilter(bgDispFilterRef.current);
                        }
                    }
                });

                animations.push(bgTween);
                trackAnimationForBatch(bgTween);
            }

            // Create cursor displacement filter animation if enabled
            if (cursorImgEffect && cursorDispFilterRef.current) {
                const cursorScale = targetScale === 0 ? 0 : defaultCursorFilterScale;
                const cursorTween = gsap.to(cursorDispFilterRef.current.scale, {
                    x: cursorScale,
                    y: cursorScale,
                    duration,
                    ease: "power2.out",
                    onComplete: () => {
                        // Re-track the filter after animation
                        if (resourceManager && cursorDispFilterRef.current) {
                            resourceManager.trackFilter(cursorDispFilterRef.current);
                        }

                        // Only call the completion handler after the last animation
                        handleCompletion();
                    }
                });

                animations.push(cursorTween);
                trackAnimationForBatch(cursorTween);
            } else if (animations.length > 0) {
                // If only bg animation exists, add completion callback to it
                animations[0].eventCallback('onComplete', () => {
                    // Call the original onComplete first
                    const origComplete = animations[0].vars.onComplete;
                    if (typeof origComplete === 'function') {
                        origComplete();
                    }

                    // Then call our handler
                    handleCompletion();
                });
            }

            // Process all pending animations in batch
            processPendingAnimations();

            return animations;
        } catch (error) {
            if (isDevelopment) {
                console.error('Error creating filter animations:', error);
            }

            // Call completion handler even on error
            if (onComplete) onComplete();
            return [];
        }
    }, [
        bgDispFilterRef,
        cursorDispFilterRef,
        cursorImgEffect,
        defaultCursorFilterScale,
        resourceManager,
        processPendingAnimations,
        trackAnimationForBatch
    ]);

    /**
     * Reset filters to idle state (no effect)
     */
    /**
     * Reset filters to idle state (no effect)
     * Now uses scheduler for better coordination
     */
    const resetFiltersToIdle = useCallback(() => {
        try {
            // Skip if already animating to idle state or cursor not active
            if (!cursorActive.current || animationStateRef.current.isAnimating) return;

            if (isDevelopment) {
                console.log('Scheduling filters reset to idle state');
            }

            const scheduler = RenderScheduler.getInstance();

            // Mark as animating before scheduling
            animationStateRef.current.isAnimating = true;

            // Schedule the filter reset with appropriate priority
            scheduler.scheduleTypedUpdate(
                'idleTimer',
                UpdateType.IDLE_EFFECT,
                () => {
                    animateFilters(0, 0.5, () => {
                        // Important: Reset animation state after idle animation completes
                        animationStateRef.current.isAnimating = false;
                        // Clear any existing timer since we're now idle
                        clearIdleTimer();
                        idleTimerRef.current = null;
                    });
                }
            );
        } catch (error) {
            if (isDevelopment) {
                console.error('Error resetting filters to idle state:', error);
            }

            // Mark as not animating in case of errors
            animationStateRef.current.isAnimating = false;
            clearIdleTimer();
            idleTimerRef.current = null;
        }
    }, [cursorActive, animateFilters, clearIdleTimer]);

    /**
     * Reset filters to active state
     * Now uses scheduler for better coordination
     */
    const resetFiltersToActive = useCallback(() => {
        try {
            // Skip if cursor not active
            if (!cursorActive.current) return;

            if (isDevelopment) {
                console.log('Scheduling filter effects activation');
            }

            const scheduler = RenderScheduler.getInstance();

            // Mark as animating before scheduling
            animationStateRef.current.isAnimating = true;

            // Schedule the filter animation with appropriate priority
            scheduler.scheduleTypedUpdate(
                'idleTimer',
                UpdateType.IDLE_EFFECT,
                () => {
                    // Clear any existing timer first
                    clearIdleTimer();

                    // Animate filters to active state
                    animateFilters(defaultBgFilterScale, 0.5, () => {
                        // Mark as not animating after animation completes
                        animationStateRef.current.isAnimating = false;

                        // Set new timer for idle effects
                        if (resourceManager) {
                            idleTimerRef.current = resourceManager.setTimeout(resetFiltersToIdle, idleTimeout);
                        } else {
                            idleTimerRef.current = window.setTimeout(resetFiltersToIdle, idleTimeout);
                        }
                    });
                }
            );
        } catch (error) {
            if (isDevelopment) {
                console.error('Error resetting filters to active state:', error);
            }

            // Mark as not animating in case of errors
            animationStateRef.current.isAnimating = false;
        }
    }, [
        cursorActive,
        defaultBgFilterScale,
        idleTimeout,
        resetFiltersToIdle,
        clearIdleTimer,
        resourceManager,
        animateFilters
    ]);

    useEffect(() => {
        // Skip during server-side rendering
        if (typeof window === 'undefined') return;

        // Skip if slider ref is not available
        if (!sliderRef.current) return;

        // Reset unmounting flag at start of effect
        isUnmountingRef.current = false;

        try {
            const node = sliderRef.current;
            const scheduler = RenderScheduler.getInstance();

            /**
             * Handle mouse movement with throttling and scheduling
             */
            let lastThrottleTime = 0;
            const throttleDelay = 16; // ~60fps

            const handleMouseMove = () => {
                try {
                    // Only apply scale effects if cursor is active
                    if (!cursorActive.current) return;

                    // Apply simple throttling for performance
                    const currentTime = Date.now();
                    if (currentTime - lastThrottleTime < throttleDelay) return;
                    lastThrottleTime = currentTime;

                    // Schedule the filter reset with debouncing
                    // This uses the IDLE_EFFECT type which has NORMAL priority
                    scheduler.scheduleTypedUpdate(
                        'idleTimer',
                        UpdateType.IDLE_EFFECT,
                        () => {
                            // Always reset filters to active state when mouse moves
                            resetFiltersToActive();
                        }
                    );
                } catch (error) {
                    if (isDevelopment) {
                        console.error('Error in mouse move handler:', error);
                    }
                }
            };

            // Add event listener with passive flag for performance
            node.addEventListener('mousemove', handleMouseMove, { passive: true });

            // Track event listener with ResourceManager if available
            if (resourceManager) {
                resourceManager.addEventListener(node, 'mousemove', handleMouseMove);
            }

            // Return cleanup function
            return () => {
                // Set unmounting flag to prevent new operations
                isUnmountingRef.current = true;

                try {
                    // ResourceManager will handle cleanup if available
                    if (!resourceManager) {
                        // Remove event listener
                        node.removeEventListener('mousemove', handleMouseMove);
                    }

                    // Cancel any scheduled updates
                    scheduler.cancelTypedUpdate('idleTimer', UpdateType.IDLE_EFFECT);

                    // Clear any pending timeout
                    clearIdleTimer();

                    // Clean up any active animations
                    cleanupAnimations();
                } catch (cleanupError) {
                    if (isDevelopment) {
                        console.error('Error during useIdleTimer cleanup:', cleanupError);
                    }
                }
            };
        } catch (error) {
            if (isDevelopment) {
                console.error('Error setting up idle timer:', error);
            }
            // Return empty cleanup to prevent errors
            return () => {};
        }
    }, [
        sliderRef,
        cursorActive,
        clearIdleTimer,
        resetFiltersToActive,
        cleanupAnimations,
        resourceManager
    ]);

    // Return hook API
    return {
        isActive: idleTimerRef.current !== null,
        isAnimating: animationStateRef.current.isAnimating,
        resetToIdle: resetFiltersToIdle,
        resetToActive: resetFiltersToActive
    };
};

export default useIdleTimer;