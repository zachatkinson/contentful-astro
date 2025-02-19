import React, {useEffect, useRef} from "react";
import {
    Application,
    Sprite,
    Texture,
    DisplacementFilter,
    Assets,
    Container,
    Text,
    TextStyle,
} from "pixi.js";
import PixiPlugin from "gsap/PixiPlugin";
import {gsap} from "gsap";
import styles from "./KineticSlider.module.css";
import {RGBSplitFilter} from "pixi-filters";

// Register GSAP PixiPlugin
gsap.registerPlugin(PixiPlugin);
PixiPlugin.registerPIXI({
    Application,
    Sprite,
    Texture,
    DisplacementFilter,
    Assets,
    Container,
    Text
});

const KineticSlider = ({
                           // images and content sources
                           images,
                           texts,

                           // displacement images sources
                           backgroundDisplacementSpriteLocation = "/images/background-displace.jpg",
                           cursorDisplacementSpriteLocation = "/images/cursor-displace.png",


                           cursorImgEffect = true,
                           cursorTextEffect = true,
                           cursorScaleIntensity = 0.65,
                           cursorMomentum = 0.14,

                           // Toggle & intensity for image RGB effect
                           imagesRgbEffect = false,
                           imagesRgbIntensity = 5,

                           // (Optional) text styling props if you want to control them dynamically
                           textTitleColor = "white",
                           textTitleSize = 64,
                           textTitleLetterspacing = 2,
                           textSubTitleColor = "white",
                           textSubTitleSize = 24,
                           textSubTitleLetterspacing = 1,
                           textSubTitleOffsetTop = 70
                       }) => {
    const sliderRef = useRef(null);
    const appRef = useRef(null);
    const currentIndex = useRef(0);

    // We'll store references to each slide's SPRITE
    const slidesRef = useRef([]);

    // We'll store references to each slide's TEXT CONTAINER
    const textContainersRef = useRef([]);

    // Displacement sprite references
    const backgroundDisplacementSpriteRef = useRef(null);
    const cursorDisplacementSpriteRef = useRef(null);

    // Swipe threshold
    const swipeDistanceRef = useRef(0);
    useEffect(() => {
        if (typeof window !== "undefined") {
            swipeDistanceRef.current = window.innerWidth * 0.2;
        }
    }, []);

    // Initialize Pixi
    useEffect(() => {
        if (typeof window === "undefined") return;

        const initPixi = async () => {
            if (!sliderRef.current) return;

            // Load images + displacement maps
            await Assets.load([...images, backgroundDisplacementSpriteLocation, cursorDisplacementSpriteLocation]);

            const app = new Application();
            await app.init({
                width: sliderRef.current.clientWidth,
                height: sliderRef.current.clientHeight,
                backgroundAlpha: 0,
                resizeTo: sliderRef.current,
            });

            sliderRef.current.appendChild(app.canvas);
            appRef.current = app;

            const stage = new Container();
            app.stage.addChild(stage);

            // 1) Background displacement sprite
            const backgroundDisplacementSprite = new Sprite(Texture.from(backgroundDisplacementSpriteLocation));
            backgroundDisplacementSprite.anchor.set(0.5);
            backgroundDisplacementSprite.x = app.screen.width / 2;
            backgroundDisplacementSprite.y = app.screen.height / 2;
            backgroundDisplacementSprite.scale.set(2);
            backgroundDisplacementSpriteRef.current = backgroundDisplacementSprite;

            // 2) Cursor displacement sprite
            const cursorDisplacementSprite = new Sprite(Texture.from(cursorDisplacementSpriteLocation));
            cursorDisplacementSprite.anchor.set(0.5);
            cursorDisplacementSprite.x = app.screen.width / 2;
            cursorDisplacementSprite.y = app.screen.height / 2;
            cursorDisplacementSprite.scale.set(cursorScaleIntensity);
            cursorDisplacementSpriteRef.current = cursorDisplacementSprite;

            // Create displacement filters
            const backgroundDisplacementFilter = new DisplacementFilter(backgroundDisplacementSprite);
            const cursorDisplacementFilter = new DisplacementFilter(cursorDisplacementSprite);

            // Build slides
            slidesRef.current = [];
            textContainersRef.current = [];

            images.forEach((image, i) => {
                // Create sprite for the slide's image
                const sprite = new Sprite(Texture.from(image));
                sprite.anchor.set(0.5);
                sprite.x = app.screen.width / 2;
                sprite.y = app.screen.height / 2;

                // Preserve aspect ratio
                const containerWidth = app.screen.width;
                const containerHeight = app.screen.height;
                const imageAspect = sprite.texture.width / sprite.texture.height;
                const containerAspect = containerWidth / containerHeight;

                if (imageAspect > containerAspect) {
                    sprite.scale.set(containerHeight / sprite.texture.height);
                } else {
                    sprite.scale.set(containerWidth / sprite.texture.width);
                }

                sprite.alpha = 0; // hidden initially
                stage.addChild(sprite);

                // Build the filters array for the sprite
                const filtersArray = [backgroundDisplacementFilter];
                if (cursorImgEffect) {
                    filtersArray.push(cursorDisplacementFilter);
                }
                if (imagesRgbEffect) {
                    const rgbFilter = new RGBSplitFilter({
                        red: [-imagesRgbIntensity, 0],
                        green: [0, 0],
                        blue: [imagesRgbIntensity, 0],
                    });
                    filtersArray.push(rgbFilter);
                }
                sprite.filters = filtersArray;

                slidesRef.current.push(sprite);

                // Now create a text container for this slide's title/subtitle
                const textContainer = new Container();
                textContainer.x = app.screen.width / 2;
                textContainer.y = app.screen.height / 2;

                // Title text
                const [title, subtitle] = texts[i] || ["", ""];
                const titleStyle = new TextStyle({
                    fill: textTitleColor,
                    fontSize: textTitleSize,
                    letterSpacing: textTitleLetterspacing,
                    fontWeight: "bold",
                    align: "center"
                });
                const titleText = new Text({
                    text: title,
                    style: titleStyle
                });
                titleText.anchor.set(0.5, 0.5);
                titleText.y = 0; // center

                // Subtitle text
                const subtitleStyle = new TextStyle({
                    fill: textSubTitleColor,
                    fontSize: textSubTitleSize,
                    letterSpacing: textSubTitleLetterspacing,
                    align: "center"
                });

                const subText = new Text({
                    text: subtitle,
                    style: subtitleStyle
                });
                subText.anchor.set(0.5, 0.5);
                subText.y = textSubTitleOffsetTop; // position below title

                textContainer.addChild(titleText);
                textContainer.addChild(subText);

                textContainer.alpha = 0; // hidden initially
                stage.addChild(textContainer);

                textContainersRef.current.push(textContainer);
            });

            // Show the first slide & text
            slidesRef.current[0].alpha = 1;
            textContainersRef.current[0].alpha = 1;

            // Add displacement sprites last
            stage.addChild(backgroundDisplacementSprite);
            stage.addChild(cursorDisplacementSprite);
        };

        initPixi();
    }, [
        images,
        texts,
        backgroundDisplacementSpriteLocation,
        cursorDisplacementSpriteLocation,
        cursorImgEffect,
        cursorTextEffect,
        cursorScaleIntensity,
        cursorMomentum,
        imagesRgbEffect,
        imagesRgbIntensity,
        textTitleColor,
        textTitleSize,
        textTitleLetterspacing,
        textSubTitleColor,
        textSubTitleSize,
        textSubTitleLetterspacing,
        textSubTitleOffsetTop
    ]);

    // On resize, reposition images & text
    useEffect(() => {
        const handleResize = () => {
            if (!appRef.current || !sliderRef.current) return;

            const app = appRef.current;
            const containerWidth = sliderRef.current.clientWidth;
            const containerHeight = sliderRef.current.clientHeight;

            app.renderer.resize(containerWidth, containerHeight);

            // Resize slides
            slidesRef.current.forEach((sprite) => {
                if (!sprite.texture) return;
                const imageAspect = sprite.texture.width / sprite.texture.height;
                const containerAspect = containerWidth / containerHeight;
                if (imageAspect > containerAspect) {
                    sprite.scale.set(containerHeight / sprite.texture.height);
                } else {
                    sprite.scale.set(containerWidth / sprite.texture.width);
                }
                sprite.x = containerWidth / 2;
                sprite.y = containerHeight / 2;
            });

            // Reposition text containers
            textContainersRef.current.forEach((container) => {
                container.x = containerWidth / 2;
                container.y = containerHeight / 2;
            });

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
        return () => {
            window.removeEventListener("resize", handleResize);
        };
    }, []);

    // Mouse tracking for both displacement sprites
    useEffect(() => {
        if (typeof window === "undefined") return;

        const updateCursorEffect = (e) => {
            // Move BACKGROUND displacement
            if (backgroundDisplacementSpriteRef.current) {
                gsap.to(backgroundDisplacementSpriteRef.current, {
                    x: e.clientX,
                    y: e.clientY,
                    duration: cursorMomentum,
                    ease: "power2.out"
                });
            }
            // Move CURSOR displacement if cursorImgEffect
            if (cursorImgEffect && cursorDisplacementSpriteRef.current) {
                gsap.to(cursorDisplacementSpriteRef.current, {
                    x: e.clientX,
                    y: e.clientY,
                    duration: cursorMomentum,
                    ease: "power2.out"
                });
            }
        };

        window.addEventListener("mousemove", updateCursorEffect);
        return () => {
            window.removeEventListener("mousemove", updateCursorEffect);
        };
    }, [cursorImgEffect, cursorMomentum]);

    // Slide transition logic
    // Slide transition logic
    const slideTransition = (nextIndex) => {
        const currentSlide = slidesRef.current[currentIndex.current];
        const currentTextContainer = textContainersRef.current[currentIndex.current];

        const nextSlide = slidesRef.current[nextIndex];
        const nextTextContainer = textContainersRef.current[nextIndex];

        // Always reset the NEXT slide's alpha to 0 before fading in
        nextSlide.alpha = 0;
        nextTextContainer.alpha = 0;

        // Fade out current
        gsap.to(currentSlide, { alpha: 0, duration: 1 });
        gsap.to(currentTextContainer, { alpha: 0, duration: 1 });

        // Fade in next
        gsap.to(nextSlide, { alpha: 1, duration: 1, delay: 0.5 });
        gsap.to(nextTextContainer, { alpha: 1, duration: 1, delay: 0.5 });

        currentIndex.current = nextIndex;
    };

    // Navigation
    const handleNext = () => {
        const nextIndex = (currentIndex.current + 1) % slidesRef.current.length;
        slideTransition(nextIndex);
    };

    const handlePrev = () => {
        const prevIndex =
            (currentIndex.current - 1 + slidesRef.current.length) %
            slidesRef.current.length;
        slideTransition(prevIndex);
    };

    // Touch Swipe
    useEffect(() => {
        if (typeof window === "undefined") return;

        const slider = sliderRef.current;
        if (!slider) return;

        let touchStartX = 0;
        let touchEndX = 0;

        const handleTouchStart = (e) => (touchStartX = e.touches[0].clientX);
        const handleTouchMove = (e) => (touchEndX = e.touches[0].clientX);
        const handleTouchEnd = () => {
            if (Math.abs(touchEndX - touchStartX) > swipeDistanceRef.current) {
                touchEndX < touchStartX ? handleNext() : handlePrev();
            }
        };

        slider.addEventListener("touchstart", handleTouchStart);
        slider.addEventListener("touchmove", handleTouchMove);
        slider.addEventListener("touchend", handleTouchEnd);

        return () => {
            slider.removeEventListener("touchstart", handleTouchStart);
            slider.removeEventListener("touchmove", handleTouchMove);
            slider.removeEventListener("touchend", handleTouchEnd);
        };
    }, []);

    // Mouse Drag
    useEffect(() => {
        if (typeof window === "undefined") return;

        const slider = sliderRef.current;
        if (!slider) return;

        let dragStartX = 0;
        let dragEndX = 0;
        let isDragging = false;

        const handleMouseDown = (e) => {
            isDragging = true;
            dragStartX = e.clientX;
            dragEndX = dragStartX;
        };

        const handleMouseMove = (e) => {
            if (!isDragging) return;
            dragEndX = e.clientX;
        };

        const handleMouseUp = () => {
            if (!isDragging) return;
            isDragging = false;

            const deltaX = dragEndX - dragStartX;
            if (Math.abs(deltaX) > swipeDistanceRef.current) {
                deltaX < 0 ? handleNext() : handlePrev();
            }
        };

        const handleMouseLeave = () => {
            if (isDragging) {
                isDragging = false;
            }
        };

        slider.addEventListener("mousedown", handleMouseDown);
        slider.addEventListener("mousemove", handleMouseMove);
        slider.addEventListener("mouseup", handleMouseUp);
        slider.addEventListener("mouseleave", handleMouseLeave);

        return () => {
            slider.removeEventListener("mousedown", handleMouseDown);
            slider.removeEventListener("mousemove", handleMouseMove);
            slider.removeEventListener("mouseup", handleMouseUp);
            slider.removeEventListener("mouseleave", handleMouseLeave);
        };
    }, []);

    return (
        <div className={styles.kineticSlider} ref={sliderRef}>
            {/* ❌ Removed the HTML text container since we now use Pixi text */}
            <nav>
                <button onClick={handlePrev} className={styles.prev}>
                    Prev
                </button>
                <button onClick={handleNext} className={styles.next}>
                    Next
                </button>
            </nav>
        </div>
    );
};

export default KineticSlider;