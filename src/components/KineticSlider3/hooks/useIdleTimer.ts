import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { useKineticSlider } from '../context/KineticSliderContext';

/**
 * Hook to manage idle timer for resetting displacement effects
 */
const useIdleTimer = () => {
    // Use the KineticSlider context instead of receiving props directly
    const {
        sliderRef,
        pixiRefs,
        props,
        states
    } = useKineticSlider();

    // Extract necessary props and state
    const { cursorImgEffect = false, idleTimeout = 300 } = props;
    const { isInteracting: cursorActive } = states;

    // Extract filter references
    const {
        bgDispFilter: bgDispFilterRef,
        cursorDispFilter: cursorDispFilterRef
    } = pixiRefs;

    // Define default filter scales
    const defaultBgFilterScale = 20;
    const defaultCursorFilterScale = 10;

    // Store idle timer reference
    const idleTimerRef = useRef<number | null>(null);

    useEffect(() => {
        // Skip during server-side rendering
        if (typeof window === 'undefined') return;

        if (!sliderRef.current) return;

        const node = sliderRef.current;

        const handleMouseMove = () => {
            // Only apply scale effects if cursor is active (mouse is over the slider)
            if (cursorActive) {
                // Reset background displacement filter scale
                if (bgDispFilterRef.current) {
                    gsap.to(bgDispFilterRef.current.scale, {
                        x: defaultBgFilterScale,
                        y: defaultBgFilterScale,
                        duration: 0.5,
                        ease: 'power2.out',
                    });
                }

                // Reset cursor displacement filter scale if enabled
                if (cursorImgEffect && cursorDispFilterRef.current) {
                    gsap.to(cursorDispFilterRef.current.scale, {
                        x: defaultCursorFilterScale,
                        y: defaultCursorFilterScale,
                        duration: 0.5,
                        ease: 'power2.out',
                    });
                }
            }

            // Clear previous timer
            if (idleTimerRef.current !== null) {
                window.clearTimeout(idleTimerRef.current);
            }

            // Set new timer
            idleTimerRef.current = window.setTimeout(() => {
                // Gradually reset filter scales after idle time
                if (cursorActive) {
                    if (bgDispFilterRef.current) {
                        gsap.to(bgDispFilterRef.current.scale, {
                            x: 0,
                            y: 0,
                            duration: 0.5,
                            ease: 'power2.out',
                        });
                    }

                    if (cursorImgEffect && cursorDispFilterRef.current) {
                        gsap.to(cursorDispFilterRef.current.scale, {
                            x: 0,
                            y: 0,
                            duration: 0.5,
                            ease: 'power2.out',
                        });
                    }
                }
            }, idleTimeout);
        };

        // Add event listener
        node.addEventListener('mousemove', handleMouseMove);

        // Cleanup on unmount
        return () => {
            node.removeEventListener('mousemove', handleMouseMove);
            if (idleTimerRef.current !== null) {
                window.clearTimeout(idleTimerRef.current);
            }
        };
    }, [
        sliderRef.current,
        bgDispFilterRef.current,
        cursorDispFilterRef.current,
        cursorImgEffect,
        cursorActive,
        idleTimeout
    ]);
};

export default useIdleTimer;