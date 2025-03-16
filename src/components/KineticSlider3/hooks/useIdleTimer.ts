import { useEffect, useRef, useCallback, type RefObject } from 'react';
import { DisplacementFilter } from 'pixi.js';
import { gsap } from 'gsap';
import ResourceManager from '../managers/ResourceManager';
import RenderScheduler from '../managers/RenderScheduler';
import { UpdateType } from '../managers/UpdateTypes';
import AnimationCoordinator, { AnimationGroupType } from '../managers/AnimationCoordinator';

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
 * - Animation coordination
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

    // Get the animation coordinator
    const animationCoordinator = AnimationCoordinator.getInstance();

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
            // Clear pending animations even on error to avoid stuck state
            animationStateRef.current.pendingBatchAnimations = [];
        }
    }, [resourceManager]);

    /**
     * Track an animation for batch processing
     */
    const trackAnimationForBatch = useCallback((animation: gsap.core.Tween): gsap.core.Tween => {
        try {
            // Skip if unmounting
            if (isUnmountingRef.current) return animation;

            // Add to pending batch
            animationStateRef.current.pendingBatchAnimations.push(animation);
            return animation;
        } catch (error) {
            if (isDevelopment) {
                console.error('Error tracking animation for batch:', error);
            }
            return animation;
        }
    }, []);

    /**
     * Create animations for filter scale changes
     * Now uses AnimationCoordinator for better coordination
     */
    const createFilterAnimations = useCallback((
        targetScale: number,
        duration: number = 0.5,
        onComplete?: () => void
    ): gsap.core.Tween[] => {
        try {
            // Skip if unmounting
            if (isUnmountingRef.current) return [];

            // Record start time for performance tracking
            lastAnimationOpRef.current = performance.now();

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
                    }
                });

                animations.push(cursorTween);
            }

            // Use AnimationCoordinator to create a coordinated animation group
            const groupType = targetScale === 0
                ? AnimationGroupType.IDLE_EFFECT
                : AnimationGroupType.INTERACTION;

            animationCoordinator.queueAnimationGroup({
                id: `filter_animation_${Date.now()}`,
                type: groupType,
                animations,
                onComplete
            });

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
        animationCoordinator
    ]);

    /**
     * Reset filters to idle state (no effect)
     * Now uses AnimationCoordinator for better coordination
     */
    const resetFilters = useCallback(() => {
        try {
            // Skip if unmounting
            if (isUnmountingRef.current) return;

            if (isDevelopment) {
                console.log('Resetting filters to idle state');
            }

            // Cancel any active idle timer
            if (idleTimerRef.current !== null) {
                window.clearTimeout(idleTimerRef.current);
                idleTimerRef.current = null;
            }

            // Skip if cursor is active
            if (cursorActive.current) {
                if (isDevelopment) {
                    console.log('Skipping filter reset - cursor is active');
                }
                return;
            }

            // Cancel any existing animations of the same type
            animationCoordinator.cancelAnimationsByType(AnimationGroupType.IDLE_EFFECT);

            // Create animations to reset filters
            createFilterAnimations(0, 0.5, () => {
                if (isDevelopment) {
                    console.log('Filters reset to idle state');
                }
            });

            // Schedule a render update
            animationCoordinator.scheduleAnimationUpdate(
                AnimationGroupType.IDLE_EFFECT,
                () => {
                    if (isDevelopment) {
                        console.log('Idle effect render update completed');
                    }
                },
                'idle_reset'
            );
        } catch (error) {
            if (isDevelopment) {
                console.error('Error resetting filters:', error);
            }
        }
    }, [
        cursorActive,
        createFilterAnimations,
        animationCoordinator
    ]);

    /**
     * Restore filters to active state
     * Now uses AnimationCoordinator for better coordination
     */
    const restoreFilters = useCallback(() => {
        try {
            // Skip if unmounting
            if (isUnmountingRef.current) return;

            if (isDevelopment) {
                console.log('Restoring filters to active state');
            }

            // Cancel any active idle timer
            if (idleTimerRef.current !== null) {
                window.clearTimeout(idleTimerRef.current);
                idleTimerRef.current = null;
            }

            // Cancel any existing animations of the same type
            animationCoordinator.cancelAnimationsByType(AnimationGroupType.INTERACTION);

            // Create animations to restore filters
            createFilterAnimations(defaultBgFilterScale, 0.5, () => {
                if (isDevelopment) {
                    console.log('Filters restored to active state');
                }
            });

            // Schedule a render update
            animationCoordinator.scheduleAnimationUpdate(
                AnimationGroupType.INTERACTION,
                () => {
                    if (isDevelopment) {
                        console.log('Interaction effect render update completed');
                    }
                },
                'idle_restore'
            );
        } catch (error) {
            if (isDevelopment) {
                console.error('Error restoring filters:', error);
            }
        }
    }, [
        defaultBgFilterScale,
        createFilterAnimations,
        animationCoordinator
    ]);

    /**
     * Handle mouse movement to reset idle timer
     */
    const handleMouseMove = useCallback(() => {
        try {
            // Skip if unmounting
            if (isUnmountingRef.current) return;

            // Cancel any active idle timer
            if (idleTimerRef.current !== null) {
                window.clearTimeout(idleTimerRef.current);
                idleTimerRef.current = null;
            }

            // Set cursor as active
            if (cursorActive.current !== true) {
                cursorActive.current = true;
            }

            // Restore filters if they were reset
            if (bgDispFilterRef.current && (
                bgDispFilterRef.current.scale.x === 0 ||
                bgDispFilterRef.current.scale.y === 0
            )) {
                restoreFilters();
            }

            // Set a new idle timer
            idleTimerRef.current = window.setTimeout(() => {
                // Set cursor as inactive
                cursorActive.current = false;

                // Reset filters when idle
                resetFilters();

                // Clear timer reference
                idleTimerRef.current = null;
            }, idleTimeout);
        } catch (error) {
            if (isDevelopment) {
                console.error('Error handling mouse movement:', error);
            }
        }
    }, [
        cursorActive,
        bgDispFilterRef,
        idleTimeout,
        resetFilters,
        restoreFilters
    ]);

    // Set up mouse movement tracking
    useEffect(() => {
        // Skip during server-side rendering
        if (typeof window === 'undefined') return;

        // Skip if slider reference is not available
        if (!sliderRef.current) return;

        // Reset unmounting flag
        isUnmountingRef.current = false;

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

            // Set initial idle timer
            idleTimerRef.current = window.setTimeout(() => {
                // Set cursor as inactive
                cursorActive.current = false;

                // Reset filters when idle
                resetFilters();

                // Clear timer reference
                idleTimerRef.current = null;
            }, idleTimeout);

            // Cleanup on unmount
            return () => {
                // Update unmounting flag immediately
                isUnmountingRef.current = true;

                try {
                    // Cancel any active idle timer
                    if (idleTimerRef.current !== null) {
                        window.clearTimeout(idleTimerRef.current);
                        idleTimerRef.current = null;
                    }

                    // ResourceManager handles its own cleanup
                    if (!resourceManager) {
                        node.removeEventListener('mousemove', handleMouseMove);
                    }
                } catch (cleanupError) {
                    if (isDevelopment) {
                        console.error('Error during idle timer cleanup:', cleanupError);
                    }
                }
            };
        } catch (error) {
            if (isDevelopment) {
                console.error('Error setting up idle timer:', error);
            }
            // Return empty cleanup function
            return () => {};
        }
    }, [
        sliderRef,
        handleMouseMove,
        idleTimeout,
        resetFilters,
        resourceManager
    ]);

    // Return methods for external control
    return {
        resetFilters,
        restoreFilters
    };
};

// Type definition for event callback - to match ResourceManager's expected type
type EventCallback = EventListenerOrEventListenerObject;

export default useIdleTimer;