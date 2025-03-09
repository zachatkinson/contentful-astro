import { useEffect, type RefObject } from 'react';
import { Sprite } from 'pixi.js';
import { gsap } from 'gsap';

interface UseMouseTrackingProps {
    sliderRef: RefObject<HTMLDivElement | null>;
    backgroundDisplacementSpriteRef: RefObject<Sprite | null>;
    cursorDisplacementSpriteRef: RefObject<Sprite | null>;
    cursorImgEffect: boolean;
    cursorMomentum: number;
}

/**
 * Hook to handle mouse movement tracking for displacement sprites
 */
const useMouseTracking = ({
                              sliderRef,
                              backgroundDisplacementSpriteRef,
                              cursorDisplacementSpriteRef,
                              cursorImgEffect,
                              cursorMomentum
                          }: UseMouseTrackingProps) => {
    useEffect(() => {
        // Skip during server-side rendering
        if (typeof window === 'undefined' || !sliderRef.current) return;

        const node = sliderRef.current;

        const handleMouseMove = (e: MouseEvent) => {
            // Update background displacement sprite position
            if (backgroundDisplacementSpriteRef.current) {
                gsap.to(backgroundDisplacementSpriteRef.current, {
                    x: e.clientX,
                    y: e.clientY,
                    duration: cursorMomentum,
                    ease: 'power2.out',
                });
            }

            // Update cursor displacement sprite if enabled
            if (cursorImgEffect && cursorDisplacementSpriteRef.current) {
                gsap.to(cursorDisplacementSpriteRef.current, {
                    x: e.clientX,
                    y: e.clientY,
                    duration: cursorMomentum,
                    ease: 'power2.out',
                });
            }
        };

        // Add event listener
        node.addEventListener('mousemove', handleMouseMove);

        // Cleanup on unmount
        return () => {
            node.removeEventListener('mousemove', handleMouseMove);
        };
    }, [
        sliderRef.current,
        backgroundDisplacementSpriteRef.current,
        cursorDisplacementSpriteRef.current,
        cursorImgEffect,
        cursorMomentum
    ]);
};

export default useMouseTracking;