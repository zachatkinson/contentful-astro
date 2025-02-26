import { useEffect, type RefObject } from "react";
import { Application, Sprite, Container } from "pixi.js";

interface ResizeHandlerProps {
    sliderRef: RefObject<HTMLDivElement | null>;
    appRef: RefObject<Application | null>;
    slidesRef: RefObject<Sprite[]>;
    textContainersRef: RefObject<Container[]>;
    backgroundDisplacementSpriteRef: RefObject<Sprite | null>;
    cursorDisplacementSpriteRef: RefObject<Sprite | null>;
}

const useResizeHandler = ({
                              sliderRef,
                              appRef,
                              slidesRef,
                              textContainersRef,
                              backgroundDisplacementSpriteRef,
                              cursorDisplacementSpriteRef,
                          }: ResizeHandlerProps) => {
    useEffect(() => {
        const handleResize = () => {
            if (!appRef.current || !sliderRef.current) return;
            const app = appRef.current;
            const containerWidth = sliderRef.current.clientWidth;
            const containerHeight = sliderRef.current.clientHeight;

            // Resize the renderer.
            app.renderer.resize(containerWidth, containerHeight);

            // Update each slide's position and scale.
            slidesRef.current.forEach((sprite) => {
                if (!sprite.texture) return;
                const imageAspect = sprite.texture.width / sprite.texture.height;
                const containerAspect = containerWidth / containerHeight;
                if (imageAspect > containerAspect) {
                    sprite.scale.set(containerHeight / sprite.texture.height);
                } else {
                    sprite.scale.set(containerWidth / sprite.texture.width);
                }
                // Optionally store the base scale on the sprite.
                (sprite as any).baseScale = sprite.scale.x;
                sprite.x = containerWidth / 2;
                sprite.y = containerHeight / 2;
            });

            // Update each text container's position.
            textContainersRef.current.forEach((container) => {
                container.x = containerWidth / 2;
                container.y = containerHeight / 2;
            });

            // Update displacement sprites positions.
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
        // Optionally, call handleResize once to set initial values.
        handleResize();

        return () => window.removeEventListener("resize", handleResize);
    }, [
        sliderRef,
        appRef,
        slidesRef,
        textContainersRef,
        backgroundDisplacementSpriteRef,
        cursorDisplacementSpriteRef,
    ]);
};

export default useResizeHandler;