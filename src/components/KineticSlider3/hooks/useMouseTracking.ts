import { useEffect } from 'react';
import { gsap } from 'gsap';
import { useKineticSlider } from '../context/KineticSliderContext';

/**
 * Hook to handle mouse movement tracking for displacement sprites
 */
const useMouseTracking = () => {
    // Use the KineticSlider context instead of receiving props directly
    const {
        sliderRef,
        pixiRefs,
        props
    } = useKineticSlider();

    // Extract necessary props for clarity
    const { cursorImgEffect = false, cursorMomentum = 0.14 } = props;

    // Extract sprite references
    const {
        backgroundDisplacementSprite: backgroundDisplacementSpriteRef,
        cursorDisplacementSprite: cursorDisplacementSpriteRef
    } = pixiRefs;

    useEffect(() => {
        // Skip during server-side rendering
        if (typeof window === 'undefined' || !sliderRef.current) return;

        // Skip if displacement sprites are not set up
        if (!backgroundDisplacementSpriteRef.current) return;

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