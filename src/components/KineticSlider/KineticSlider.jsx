import React, { useEffect, useRef } from "react";
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
import { gsap } from "gsap";
import styles from "./KineticSlider.module.css";
import { RGBSplitFilter } from "pixi-filters";

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
                           // Text styling props
                           textTitleColor = "white",
                           textTitleSize = 64,
                           textTitleLetterspacing = 2,
                           textSubTitleColor = "white",
                           textSubTitleSize = 24,
                           textSubTitleLetterspacing = 1,
                           textSubTitleOffsetTop = 70,
                           // New prop: maximum overall shift fraction (default 10% of container dimensions)
                           maxContainerShiftFraction = 0.1,
                       }) => {
    // Dynamically import PixiPlugin on the client
    useEffect(() => {
        (async () => {
            const { default: PixiPlugin } = await import("gsap/PixiPlugin");
            gsap.registerPlugin(PixiPlugin);
            PixiPlugin.registerPIXI({
                Application,
                Sprite,
                Texture,
                DisplacementFilter,
                Assets,
                Container,
                Text,
            });
        })();
    }, []);

    const sliderRef = useRef(null);
    const appRef = useRef(null);
    const currentIndex = useRef(0);

    // References for slide sprites and text containers
    const slidesRef = useRef([]);
    const textContainersRef = useRef([]);

    // Displacement sprite references
    const backgroundDisplacementSpriteRef = useRef(null);
    const cursorDisplacementSpriteRef = useRef(null);
    // Store displacement filters (used only for images)
    const bgDispFilterRef = useRef(null);
    const cursorDispFilterRef = useRef(null);

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
            await Assets.load([
                ...images,
                backgroundDisplacementSpriteLocation,
                cursorDisplacementSpriteLocation,
            ]);

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
            const backgroundDisplacementSprite = new Sprite(
                Texture.from(backgroundDisplacementSpriteLocation)
            );
            backgroundDisplacementSprite.anchor.set(0.5);
            backgroundDisplacementSprite.x = app.screen.width / 2;
            backgroundDisplacementSprite.y = app.screen.height / 2;
            backgroundDisplacementSprite.scale.set(2);
            backgroundDisplacementSpriteRef.current = backgroundDisplacementSprite;

            // 2) Cursor displacement sprite
            const cursorDisplacementSprite = new Sprite(
                Texture.from(cursorDisplacementSpriteLocation)
            );
            cursorDisplacementSprite.anchor.set(0.5);
            cursorDisplacementSprite.x = app.screen.width / 2;
            cursorDisplacementSprite.y = app.screen.height / 2;
            cursorDisplacementSprite.scale.set(cursorScaleIntensity);
            cursorDisplacementSpriteRef.current = cursorDisplacementSprite;

            // Create displacement filters and store in refs (for images only)
            const backgroundDisplacementFilter = new DisplacementFilter(
                backgroundDisplacementSprite
            );
            const cursorDisplacementFilter = new DisplacementFilter(
                cursorDisplacementSprite
            );
            bgDispFilterRef.current = backgroundDisplacementFilter;
            cursorDispFilterRef.current = cursorDisplacementFilter;

            // Build slides and text containers
            slidesRef.current = [];
            textContainersRef.current = [];
            images.forEach((image, i) => {
                // Create sprite for the slide's image
                const sprite = new Sprite(Texture.from(image));
                sprite.anchor.set(0.5);
                sprite.x = app.screen.width / 2;
                sprite.y = app.screen.height / 2;
                const containerWidth = app.screen.width;
                const containerHeight = app.screen.height;
                const imageAspect = sprite.texture.width / sprite.texture.height;
                const containerAspect = containerWidth / containerHeight;
                if (imageAspect > containerAspect) {
                    sprite.scale.set(containerHeight / sprite.texture.height);
                } else {
                    sprite.scale.set(containerWidth / sprite.texture.width);
                }
                sprite.alpha = 0;
                stage.addChild(sprite);

                // Build filters for image sprite
                const filtersArray = [bgDispFilterRef.current];
                if (cursorImgEffect) {
                    filtersArray.push(cursorDispFilterRef.current);
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

                // Create text container for title/subtitle
                const textContainer = new Container();
                textContainer.x = app.screen.width / 2;
                textContainer.y = app.screen.height / 2;
                const [title, subtitle] = texts[i] || ["", ""];
                const titleStyle = new TextStyle({
                    fill: textTitleColor,
                    fontSize: textTitleSize,
                    letterSpacing: textTitleLetterspacing,
                    fontWeight: "bold",
                    align: "center",
                });
                const titleText = new Text({
                    text: title,
                    style: titleStyle,
                });
                // Anchor title at top-center
                titleText.anchor.set(0.5, 0);
                titleText.y = 0;
                const subtitleStyle = new TextStyle({
                    fill: textSubTitleColor,
                    fontSize: textSubTitleSize,
                    letterSpacing: textSubTitleLetterspacing,
                    align: "center",
                });
                const subText = new Text({
                    text: subtitle,
                    style: subtitleStyle,
                });
                // Anchor subtitle at top-center and position it below title with a gap
                subText.anchor.set(0.5, 0);
                subText.y = titleText.height + 10; // 10px gap
                textContainer.addChild(titleText, subText);
                // Center the container vertically by setting its pivot to half its height
                textContainer.pivot.y = textContainer.height / 2;
                textContainer.alpha = 0;
                stage.addChild(textContainer);
                textContainersRef.current.push(textContainer);
            });

            // Show the first slide & text
            slidesRef.current[0].alpha = 1;
            textContainersRef.current[0].alpha = 1;
            // Add displacement sprites last
            stage.addChild(backgroundDisplacementSprite, cursorDisplacementSprite);
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
        textSubTitleOffsetTop,
        maxContainerShiftFraction,
    ]);

    // On resize, reposition images & text
    useEffect(() => {
        const handleResize = () => {
            if (!appRef.current || !sliderRef.current) return;
            const app = appRef.current;
            const containerWidth = sliderRef.current.clientWidth;
            const containerHeight = sliderRef.current.clientHeight;
            app.renderer.resize(containerWidth, containerHeight);
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
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    // Mouse tracking for displacement sprites
    useEffect(() => {
        if (typeof window === "undefined") return;
        const updateCursorEffect = (e) => {
            if (backgroundDisplacementSpriteRef.current) {
                gsap.to(backgroundDisplacementSpriteRef.current, {
                    x: e.clientX,
                    y: e.clientY,
                    duration: cursorMomentum,
                    ease: "power2.out",
                });
            }
            if (cursorImgEffect && cursorDisplacementSpriteRef.current) {
                gsap.to(cursorDisplacementSpriteRef.current, {
                    x: e.clientX,
                    y: e.clientY,
                    duration: cursorMomentum,
                    ease: "power2.out",
                });
            }
        };
        window.addEventListener("mousemove", updateCursorEffect);
        return () => window.removeEventListener("mousemove", updateCursorEffect);
    }, [cursorImgEffect, cursorMomentum]);

    // Slide transition logic (crossfade without text distortion)
    const slideTransition = (nextIndex) => {
        const tl = gsap.timeline();
        const currentSlide = slidesRef.current[currentIndex.current];
        const currentTextContainer = textContainersRef.current[currentIndex.current];
        const nextSlide = slidesRef.current[nextIndex];
        const nextTextContainer = textContainersRef.current[nextIndex];

        // Reset next slide/text alpha
        nextSlide.alpha = 0;
        nextTextContainer.alpha = 0;

        // Crossfade concurrently
        tl.to([currentSlide, currentTextContainer], {
            alpha: 0,
            duration: 1,
            ease: "power2.out",
        }, 0)
            .to([nextSlide, nextTextContainer], {
                alpha: 1,
                duration: 1,
                ease: "power2.out",
            }, 0);

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

    // New: Text tilt effect with the entire active text container clamped to move at most 10% off-center,
    // and the title and subtitle moving along the x-axis at different intensities.
    useEffect(() => {
        if (!cursorTextEffect || typeof window === "undefined") return;
        const handleTextTilt = (e) => {
            const containerWidth = sliderRef.current.clientWidth;
            const containerHeight = sliderRef.current.clientHeight;
            const centerX = containerWidth / 2;
            const centerY = containerHeight / 2;
            // Calculate the raw offset (difference between center and cursor)
            const offsetX = centerX - e.clientX;
            const offsetY = centerY - e.clientY;
            // Compute the raw container shift (10% of the raw offset)
            const rawContainerShiftX = offsetX * 0.1;
            const rawContainerShiftY = offsetY * 0.1;
            // Clamp the container shift so it doesn't exceed 10% of container dimensions
            const maxShiftX = containerWidth * maxContainerShiftFraction;
            const maxShiftY = containerHeight * maxContainerShiftFraction;
            const containerShiftX = Math.max(Math.min(rawContainerShiftX, maxShiftX), -maxShiftX);
            const containerShiftY = Math.max(Math.min(rawContainerShiftY, maxShiftY), -maxShiftY);
            const activeTextContainer = textContainersRef.current[currentIndex.current];
            if (activeTextContainer && activeTextContainer.children.length >= 2) {
                // Animate the entire container with clamped shift
                gsap.to(activeTextContainer, {
                    x: centerX + containerShiftX,
                    y: centerY + containerShiftY,
                    duration: 0.5,
                    ease: "expo.out",
                });
                // Animate title (first child) to move along x-axis at 50% of raw offset, then clamp
                const titleRawShiftX = offsetX * 0.5;
                const titleShiftX = Math.max(Math.min(titleRawShiftX, maxShiftX), -maxShiftX);
                gsap.to(activeTextContainer.children[0], {
                    x: titleShiftX,
                    duration: 0.5,
                    ease: "expo.out",
                });
                // Animate subtitle (second child) to move along x-axis at 30% of raw offset, then clamp
                const subtitleRawShiftX = offsetX * 0.3;
                const subtitleShiftX = Math.max(Math.min(subtitleRawShiftX, maxShiftX), -maxShiftX);
                gsap.to(activeTextContainer.children[1], {
                    x: subtitleShiftX,
                    duration: 0.5,
                    ease: "expo.out",
                });
            }
        };
        window.addEventListener("mousemove", handleTextTilt);
        return () => window.removeEventListener("mousemove", handleTextTilt);
    }, [cursorTextEffect, maxContainerShiftFraction]);

    return (
        <div className={styles.kineticSlider} ref={sliderRef}>
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