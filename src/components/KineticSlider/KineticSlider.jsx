import React, { useEffect, useRef } from "react";
import { Application, Sprite, Texture, DisplacementFilter, Assets } from "pixi.js";
import { gsap } from "gsap";
import styles from "./KineticSlider.module.css";

const KineticSlider = ({ images, texts }) => {
    const sliderRef = useRef(null);
    const appRef = useRef(null);
    const currentIndex = useRef(0);
    const slidesRef = useRef([]);
    const displacementSpriteRef = useRef(null);

    useEffect(() => {
        const initPixi = async () => {
            if (!sliderRef.current) return;

            await Assets.load([...images, "/images/displace-map.jpg"]);

            const app = new Application();
            await app.init({
                width: window.innerWidth,
                height: window.innerWidth / 3,
                transparent: true,
                resizeTo: HTMLElement,
            });

            sliderRef.current.appendChild(app.canvas);
            appRef.current = app;

            // Create slides
            slidesRef.current = images.map((image) => {
                const sprite = new Sprite(Texture.from(image));
                sprite.anchor.set(0.5);
                sprite.x = app.screen.width / 2;
                sprite.y = app.screen.height / 2;

                // Adjust scale to fill the canvas fully
                const scaleX = app.screen.width / sprite.texture.width;
                const scaleY = app.screen.height / sprite.texture.height;
                sprite.scale.set(Math.max(scaleX, scaleY));

                sprite.alpha = 0;
                app.stage.addChild(sprite);
                return sprite;
            });
            slidesRef.current[0].alpha = 1; // Show the first slide

            // Displacement effect
            const displacementSprite = new Sprite(Texture.from("/images/displace-map.jpg"));
            displacementSprite.anchor.set(0.5);
            displacementSprite.x = app.screen.width / 2;
            displacementSprite.y = app.screen.height / 2;
            displacementSprite.scale.set(2);
            app.stage.addChild(displacementSprite);
            displacementSpriteRef.current = displacementSprite;

            const displacementFilter = new DisplacementFilter(displacementSprite);
            app.stage.filters = [displacementFilter];

            const updateCursorEffect = (e) => {
                gsap.to(displacementSprite, {x: e.clientX, y: e.clientY, duration: 0.2, ease: "power2.out"});
            };
            window.addEventListener("mousemove", updateCursorEffect);



        };

        initPixi();
    }, [images]);
    const slideTransition = (nextIndex) => {
        gsap.to(slidesRef.current[currentIndex.current], {alpha: 0, duration: 1});
        gsap.to(slidesRef.current[nextIndex], {alpha: 1, duration: 1});
        currentIndex.current = nextIndex;
    };
    const handleNext = () => {
        const nextIndex = (currentIndex.current + 1) % slidesRef.current.length;
        slideTransition(nextIndex);
    };

    const handlePrev = () => {
        const prevIndex = (currentIndex.current - 1 + slidesRef.current.length) % slidesRef.current.length;
        slideTransition(prevIndex);
    };
    return (
        <div className={styles.kineticSlider} ref={sliderRef}>
            <nav>
                <button onClick={() => handlePrev()} className={styles.prev}>Prev</button>
                <button onClick={() => handleNext()} className={styles.next}>Next</button>
            </nav>
        </div>
    );
};

export default KineticSlider;
