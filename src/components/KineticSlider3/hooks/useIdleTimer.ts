import { useEffect, useRef, useCallback, type RefObject } from 'react';
import { DisplacementFilter } from 'pixi.js';
import { gsap } from 'gsap';
import ResourceManager from '../managers/ResourceManager';

// Development environment check
const isDevelopment = import.meta.env?.MODE === 'development';

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

/**
 * Hook to manage idle timer for resetting displacement effects
 * Fully optimized with:
 * - Batch resource management
 * - Efficient timer handling
 * - Comprehensive error handling
 * - Memory leak prevention
 * - Optimized animation management
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

    // Store batch animation collections for efficient tracking
    const animationBatchRef = useRef<{
        activeAnimations: gsap.core.Tween[];
        pendingForCleanup: gsap.core.Tween[];
    }>({
        activeAnimations: [],
        pendingForCleanup: []
    });

    // Flag to prevent operations during unmounting
    const isUnmountingRef = useRef(false);

    /**
     * Process pending animations in batch
     */
    const processPendingAnimations = useCallback(() => {
        try {
            // Skip if unmounting or no resource manager
            if (isUnmountingRef.current || !resourceManager) return;

            const { activeAnimations } = animationBatchRef.current;

            // Process animations in batch if any exist
            if (activeAnimations.length > 0) {
                resourceManager.trackAnimationBatch(activeAnimations);
                activeAnimations.length = 0; // Clear the array after tracking
            }
        } catch (error) {
            if (isDevelopment) {
                console.error('Error processing pending animations:', error);
            }
            // Clear batch even on error to avoid stuck state
            animationBatchRef.current.activeAnimations = [];
        }
    }, [resourceManager]);

    // Removed unused trackAnimationForBatch function

    /**
     * Clean up any pending timers safely
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
     * Apply filter animations with batch processing
     */
    const animateFilters = useCallback((
        targetScale: number,
        duration: number = 0.5,
        onComplete?: () => void
    ) => {
        try {
            // Skip if unmounting
            if (isUnmountingRef.current) return;

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
                    ease: 'power2.out',
                    onComplete: () => {
                        // Re-track the filter after animation
                        if (resourceManager && bgDispFilterRef.current) {
                            resourceManager.trackFilter(bgDispFilterRef.current);
                        }
                    }
                });

                animations.push(bgTween);
            }

            // Create cursor displacement filter animation if enabled
            if (cursorImgEffect && cursorDispFilterRef.current) {
                const cursorScale = targetScale === 0 ? 0 : defaultCursorFilterScale;
                const cursorTween = gsap.to(cursorDispFilterRef.current.scale, {
                    x: cursorScale,
                    y: cursorScale,
                    duration,
                    ease: 'power2.out',
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

            // Track all animations in a batch
            if (resourceManager && animations.length > 0) {
                resourceManager.trackAnimationBatch(animations);
            }

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
        processPendingAnimations
    ]);

    /**
     * Reset filters to idle state (no effect)
     */
    const resetFiltersToIdle = useCallback(() => {
        try {
            // Only run if cursor is still active to avoid conflicts
            if (cursorActive.current) {
                animateFilters(0);
            }
        } catch (error) {
            if (isDevelopment) {
                console.error('Error resetting filters to idle state:', error);
            }
        }
    }, [cursorActive, animateFilters]);

    /**
     * Reset filters to active state
     */
    const resetFiltersToActive = useCallback(() => {
        try {
            // Only run if cursor is active
            if (!cursorActive.current) return;

            animateFilters(defaultBgFilterScale);

            // Set new timer for idle effects
            clearIdleTimer();

            // Use ResourceManager timeout if available
            const setTimer = () => {
                try {
                    if (resourceManager) {
                        idleTimerRef.current = resourceManager.setTimeout(resetFiltersToIdle, idleTimeout);
                    } else {
                        idleTimerRef.current = window.setTimeout(resetFiltersToIdle, idleTimeout);
                    }
                } catch (error) {
                    if (isDevelopment) {
                        console.error('Error setting idle timer:', error);
                    }
                }
            };

            setTimer();
        } catch (error) {
            if (isDevelopment) {
                console.error('Error resetting filters to active state:', error);
            }
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

            /**
             * Handle mouse movement with throttling
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

                    // Clear previous timer and reset filters to active state
                    resetFiltersToActive();
                } catch (error) {
                    if (isDevelopment) {
                        console.error('Error in mouse move handler:', error);
                    }
                }
            };

            // Add event listener with passive flag for performance
            node.addEventListener('mousemove', handleMouseMove, { passive: true });

            // Return cleanup function
            return () => {
                // Set unmounting flag to prevent new operations
                isUnmountingRef.current = true;

                try {
                    // Remove event listener
                    node.removeEventListener('mousemove', handleMouseMove);

                    // Clear any pending timeout
                    clearIdleTimer();

                    // Kill any active animations
                    animationBatchRef.current.activeAnimations.forEach(tween => {
                        if (tween && tween.isActive()) {
                            tween.kill();
                        }
                    });

                    // Clear the animations array
                    animationBatchRef.current.activeAnimations = [];
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
        resetFiltersToActive
    ]);

    // No public API needed - the hook works internally
    return {
        isActive: idleTimerRef.current !== null
    };
};

export default useIdleTimer;