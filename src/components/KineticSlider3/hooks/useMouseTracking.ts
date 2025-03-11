import { useEffect, type RefObject } from 'react';
import { Sprite, DisplacementFilter } from 'pixi.js';
import { gsap } from 'gsap';
import ResourceManager from '../managers/ResourceManager';

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
    useEffect(() => {
        // Skip during server-side rendering
        if (typeof window === 'undefined' || !sliderRef.current) return;

        const node = sliderRef.current;

        const handleMouseMove = (e: MouseEvent) => {
            // Get relative mouse position within the slider
            const rect = node.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            // Calculate displacement intensity based on mouse position
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            const distanceFromCenter = Math.sqrt(
                Math.pow(mouseX - centerX, 2) +
                Math.pow(mouseY - centerY, 2)
            );
            const maxDistance = Math.sqrt(
                Math.pow(rect.width / 2, 2) +
                Math.pow(rect.height / 2, 2)
            );

            // Calculate normalized displacement intensity (0-1)
            const displacementIntensity = Math.min(
                1,
                distanceFromCenter / (maxDistance * 0.7)
            );

            // Animate background displacement sprite and filter
            if (backgroundDisplacementSpriteRef.current) {
                // Move sprite
                const bgSpriteTween = gsap.to(backgroundDisplacementSpriteRef.current, {
                    x: mouseX,
                    y: mouseY,
                    duration: cursorMomentum,
                    ease: 'power2.out'
                });

                // Track animation
                if (resourceManager) {
                    resourceManager.trackAnimation(bgSpriteTween);
                }

                // Update filter scale
                if (backgroundDisplacementFilterRef?.current) {
                    const bgFilterTween = gsap.to(backgroundDisplacementFilterRef.current.scale, {
                        x: displacementIntensity * 30,
                        y: displacementIntensity * 30,
                        duration: cursorMomentum,
                        ease: 'power2.out'
                    });

                    // Track animation
                    if (resourceManager) {
                        resourceManager.trackAnimation(bgFilterTween);
                    }
                }
            }

            // Update cursor displacement sprite and filter if enabled
            if (cursorImgEffect && cursorDisplacementSpriteRef.current) {
                // Move sprite
                const cursorSpriteTween = gsap.to(cursorDisplacementSpriteRef.current, {
                    x: mouseX,
                    y: mouseY,
                    duration: cursorMomentum,
                    ease: 'power2.out'
                });

                // Track animation
                if (resourceManager) {
                    resourceManager.trackAnimation(cursorSpriteTween);
                }

                // Update filter scale
                if (cursorDisplacementFilterRef?.current) {
                    const cursorFilterTween = gsap.to(cursorDisplacementFilterRef.current.scale, {
                        x: displacementIntensity * 15,
                        y: displacementIntensity * 15,
                        duration: cursorMomentum,
                        ease: 'power2.out'
                    });

                    // Track animation
                    if (resourceManager) {
                        resourceManager.trackAnimation(cursorFilterTween);
                    }
                }
            }
        };

        // Add event listener
        node.addEventListener('mousemove', handleMouseMove);

        // Clean up on unmount
        return () => {
            node.removeEventListener('mousemove', handleMouseMove);
        };
    }, [
        sliderRef,
        backgroundDisplacementSpriteRef,
        cursorDisplacementSpriteRef,
        backgroundDisplacementFilterRef,
        cursorDisplacementFilterRef,
        cursorImgEffect,
        cursorMomentum,
        resourceManager
    ]);
};

export default useMouseTracking;