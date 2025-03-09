import { useEffect } from "react";
import { useKineticSlider } from '../context/KineticSliderContext';

/**
 * Hook to handle window resize events for properly scaling and positioning PixiJS elements
 */
const useResizeHandler = () => {
    // Use the KineticSlider context instead of receiving props directly
    const {
        sliderRef,
        pixiRefs
    } = useKineticSlider();

    // Extract necessary references from pixiRefs
    const {
        app: appRef,
        slides: slidesRef,
        textContainers: textContainersRef,
        backgroundDisplacementSprite: backgroundDisplacementSpriteRef,
        cursorDisplacementSprite: cursorDisplacementSpriteRef
    } = pixiRefs;

    useEffect(() => {
        // Skip during server-side rendering
        if (typeof window === 'undefined') return;

        const handleResize = () => {
            if (!appRef.current || !sliderRef.current) return;
            const app = appRef.current;
            const containerWidth = sliderRef.current.clientWidth;
            const containerHeight = sliderRef.current.clientHeight;

            // Resize the renderer
            app.renderer.resize(containerWidth, containerHeight);

            // Update each slide's position and scale
            slidesRef.current.forEach((sprite) => {
                if (!sprite.texture) return;
                const imageAspect = sprite.texture.width / sprite.texture.height;
                const containerAspect = containerWidth / containerHeight;
                if (imageAspect > containerAspect) {
                    sprite.scale.set(containerHeight / sprite.texture.height);
                } else {
                    sprite.scale.set(containerWidth / sprite.texture.width);
                }
                // Store the base scale on the sprite
                (sprite as any).baseScale = sprite.scale.x;
                sprite.x = containerWidth / 2;
                sprite.y = containerHeight / 2;
            });

            // Update each text container's position
            textContainersRef.current.forEach((container) => {
                container.x = containerWidth / 2;
                container.y = containerHeight / 2;
            });

            // Update displacement sprites positions
            if (backgroundDisplacementSpriteRef.current) {
                backgroundDisplacementSpriteRef.current.x = containerWidth / 2;
                backgroundDisplacementSpriteRef.current.y = containerHeight / 2;
            }
            if (cursorDisplacementSpriteRef.current) {
                cursorDisplacementSpriteRef.current.x = containerWidth / 2;
                cursorDisplacementSpriteRef.current.y = containerHeight / 2;
            }
        };

        window.addEventListener("resize", handleResize);
        // Call handleResize once to set initial values
        handleResize();

        return () => window.removeEventListener("resize", handleResize);
    }, [
        sliderRef.current,
        appRef.current,
        slidesRef.current,
        textContainersRef.current,
        backgroundDisplacementSpriteRef.current,
        cursorDisplacementSpriteRef.current,
    ]);
};

export default useResizeHandler;