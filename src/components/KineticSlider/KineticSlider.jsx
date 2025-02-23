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
                           imagesRgbEffect = true,
                           imagesRgbIntensity = 5,
                           // Text styling props
                           textTitleColor = "white",
                           textTitleSize = 64,
                           textTitleLetterspacing = 2,
                           textSubTitleColor = "white",
                           textSubTitleSize = 24,
                           textSubTitleLetterspacing = 1,
                           textSubTitleOffsetTop = 70,
                           // Outer text container movement clamped fraction (default 5% of container dimensions)
                           maxContainerShiftFraction = 0.05,
                           // Swipe scaling intensity during drag
                           swipeScaleIntensity = 2,
                           // Transition scaling intensity (for slide transitions)
                           transitionScaleIntensity = 30,
                           // Enable external navigation (if true, the component expects external nav elements)
                           externalNav = false,
                           // Custom navigation element selectors (object with prev and next selectors)
                           navElement = { prev: ".main-nav.prev", next: ".main-nav.next" },
                       }) => {
    // Define default filter scales for when the mouse is active
    const defaultBgFilterScale = 20; // adjust as needed
    const defaultCursorFilterScale = 10; // adjust as needed

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
    // Store displacement filters (used only on images)
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
            // Hide initially
            backgroundDisplacementSprite.alpha = 0;
            backgroundDisplacementSpriteRef.current = backgroundDisplacementSprite;

            // 2) Cursor displacement sprite
            const cursorDisplacementSprite = new Sprite(
                Texture.from(cursorDisplacementSpriteLocation)
            );
            cursorDisplacementSprite.anchor.set(0.5);
            cursorDisplacementSprite.x = app.screen.width / 2;
            cursorDisplacementSprite.y = app.screen.height / 2;
            cursorDisplacementSprite.scale.set(cursorScaleIntensity);
            // Hide initially
            cursorDisplacementSprite.alpha = 0;
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
            // Hide displacement effects on load by setting filter scales to 0
            bgDispFilterRef.current.scale.set(0);
            cursorDispFilterRef.current.scale.set(0);

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
                // Store base scale for swipe scaling adjustments
                sprite.baseScale = sprite.scale.x;
                sprite.alpha = 0;
                stage.addChild(sprite);

                // Build filters for image sprite
                const filtersArray = [bgDispFilterRef.current];
                if (cursorImgEffect) {
                    filtersArray.push(cursorDispFilterRef.current);
                }
                // Updated RGB filter parameters for imagesRgbEffect using proper formatting
                if (imagesRgbEffect) {
                    const rgbFilter = new RGBSplitFilter({
                        red: { x: imagesRgbIntensity, y: 0 },
                        green: { x: 0, y: 0 },
                        blue: { x: imagesRgbIntensity, y: 0 },
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
                subText.y = titleText.height + 10;
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
                // Reset base scale
                sprite.baseScale = sprite.scale.x;
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

    // Mouse tracking for displacement sprites (attached only to the slider)
    useEffect(() => {
        if (typeof window === "undefined" || !sliderRef.current) return;
        const node = sliderRef.current;
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
        node.addEventListener("mousemove", updateCursorEffect);
        return () => node.removeEventListener("mousemove", updateCursorEffect);
    }, [cursorImgEffect, cursorMomentum]);

    // Show/hide displacement effects when mouse enters/leaves the slider,
    // and tween the filter scales accordingly.
    useEffect(() => {
        if (typeof window === "undefined" || !sliderRef.current) return;
        const node = sliderRef.current;
        const handleMouseEnter = () => {
            if (backgroundDisplacementSpriteRef.current) {
                gsap.to(backgroundDisplacementSpriteRef.current, {
                    alpha: 1,
                    duration: 0.5,
                    ease: "power2.out",
                });
            }
            if (cursorImgEffect && cursorDisplacementSpriteRef.current) {
                gsap.to(cursorDisplacementSpriteRef.current, {
                    alpha: 1,
                    duration: 0.5,
                    ease: "power2.out",
                });
            }
            // Tween filters to default scales
            if (bgDispFilterRef.current) {
                gsap.to(bgDispFilterRef.current.scale, {
                    x: defaultBgFilterScale,
                    y: defaultBgFilterScale,
                    duration: 0.5,
                    ease: "power2.out",
                });
            }
            if (cursorImgEffect && cursorDispFilterRef.current) {
                gsap.to(cursorDispFilterRef.current.scale, {
                    x: defaultCursorFilterScale,
                    y: defaultCursorFilterScale,
                    duration: 0.5,
                    ease: "power2.out",
                });
            }
        };
        const handleMouseLeave = () => {
            // Add a delay of 300ms before starting the fade-out effect
            setTimeout(() => {
                if (backgroundDisplacementSpriteRef.current) {
                    gsap.to(backgroundDisplacementSpriteRef.current, {
                        alpha: 0,
                        duration: 0.5,
                        ease: "power2.out",
                    });
                }
                if (cursorImgEffect && cursorDisplacementSpriteRef.current) {
                    gsap.to(cursorDisplacementSpriteRef.current, {
                        alpha: 0,
                        duration: 0.5,
                        ease: "power2.out",
                    });
                }
                // Tween filters to 0
                if (bgDispFilterRef.current) {
                    gsap.to(bgDispFilterRef.current.scale, {
                        x: 0,
                        y: 0,
                        duration: 0.5,
                        ease: "power2.out",
                    });
                }
                if (cursorImgEffect && cursorDispFilterRef.current) {
                    gsap.to(cursorDispFilterRef.current.scale, {
                        x: 0,
                        y: 0,
                        duration: 0.5,
                        ease: "power2.out",
                    });
                }
            }, 300);
        };
        node.addEventListener("mouseenter", handleMouseEnter);
        node.addEventListener("mouseleave", handleMouseLeave);
        return () => {
            node.removeEventListener("mouseenter", handleMouseEnter);
            node.removeEventListener("mouseleave", handleMouseLeave);
        };
    }, [cursorImgEffect]);

    // Fade out displacement filters if mouse stops moving, and restore them if mouse moves again
    useEffect(() => {
        if (typeof window === "undefined" || !sliderRef.current) return;
        const node = sliderRef.current;
        let idleTimer;
        const handleMouseMoveIdle = (e) => {
            // On every mousemove, tween filters to default values
            if (bgDispFilterRef.current) {
                gsap.to(bgDispFilterRef.current.scale, {
                    x: defaultBgFilterScale,
                    y: defaultBgFilterScale,
                    duration: 0.5,
                    ease: "power2.out",
                });
            }
            if (cursorImgEffect && cursorDispFilterRef.current) {
                gsap.to(cursorDispFilterRef.current.scale, {
                    x: defaultCursorFilterScale,
                    y: defaultCursorFilterScale,
                    duration: 0.5,
                    ease: "power2.out",
                });
            }
            if (idleTimer) clearTimeout(idleTimer);
            idleTimer = setTimeout(() => {
                if (bgDispFilterRef.current) {
                    gsap.to(bgDispFilterRef.current.scale, {
                        x: 0,
                        y: 0,
                        duration: 0.5,
                        ease: "power2.out",
                    });
                }
                if (cursorImgEffect && cursorDispFilterRef.current) {
                    gsap.to(cursorDispFilterRef.current.scale, {
                        x: 0,
                        y: 0,
                        duration: 0.5,
                        ease: "power2.out",
                    });
                }
            }, 300);
        };
        node.addEventListener("mousemove", handleMouseMoveIdle);
        return () => node.removeEventListener("mousemove", handleMouseMoveIdle);
    }, [cursorImgEffect]);

    // Slide transition logic (crossfade without text distortion, with added scaling effect)
    const slideTransition = (nextIndex) => {
        const tl = gsap.timeline();
        const currentSlide = slidesRef.current[currentIndex.current];
        const currentTextContainer = textContainersRef.current[currentIndex.current];
        const nextSlide = slidesRef.current[nextIndex];
        const nextTextContainer = textContainersRef.current[nextIndex];

        // Reset next slide/text alpha
        nextSlide.alpha = 0;
        nextTextContainer.alpha = 0;

        // Add scaling effect: current slide scales up while fading out,
        // next slide starts scaled up and then scales down to its base scale while fading in.
        tl.to(currentSlide.scale, {
            x: currentSlide.baseScale * (1 + transitionScaleIntensity / 100),
            y: currentSlide.baseScale * (1 + transitionScaleIntensity / 100),
            duration: 1,
            ease: "power2.out",
        }, 0)
            .set(nextSlide.scale, {
                x: nextSlide.baseScale * (1 + transitionScaleIntensity / 100),
                y: nextSlide.baseScale * (1 + transitionScaleIntensity / 100),
            }, 0)
            .to(nextSlide.scale, {
                x: nextSlide.baseScale,
                y: nextSlide.baseScale,
                duration: 1,
                ease: "power2.out",
            }, 0);

        // Crossfade concurrently (texts remain unchanged)
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

    // Navigation (internal navigation buttons)
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

    // External Navigation: Attach event listeners to external nav elements if "externalNav" prop is true.
    useEffect(() => {
        if (!externalNav) return; // Only run if external navigation is enabled
        const prevNav = document.querySelector(navElement.prev);
        const nextNav = document.querySelector(navElement.next);
        const handlePrevClick = (e) => {
            e.preventDefault();
            handlePrev();
        };
        const handleNextClick = (e) => {
            e.preventDefault();
            handleNext();
        };
        if (prevNav) {
            prevNav.addEventListener("click", handlePrevClick);
        }
        if (nextNav) {
            nextNav.addEventListener("click", handleNextClick);
        }
        return () => {
            if (prevNav) {
                prevNav.removeEventListener("click", handlePrevClick);
            }
            if (nextNav) {
                nextNav.removeEventListener("click", handleNextClick);
            }
        };
    }, [externalNav, navElement]);

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

    // Mouse Drag with swipe scaling
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
            const deltaX = dragEndX - dragStartX;
            const normalizedFactor = Math.min(Math.abs(deltaX) / swipeDistanceRef.current, 1);
            const currentSlide = slidesRef.current[currentIndex.current];
            if (currentSlide) {
                const newScale = 1 + normalizedFactor * swipeScaleIntensity;
                gsap.to(currentSlide.scale, {
                    x: currentSlide.baseScale * newScale,
                    y: currentSlide.baseScale * newScale,
                    duration: 0.1,
                    ease: "power2.out",
                });
            }
        };
        const handleMouseUp = () => {
            if (!isDragging) return;
            isDragging = false;
            const deltaX = dragEndX - dragStartX;
            const currentSlide = slidesRef.current[currentIndex.current];
            if (currentSlide) {
                gsap.to(currentSlide.scale, {
                    x: currentSlide.baseScale,
                    y: currentSlide.baseScale,
                    duration: 0.2,
                    ease: "power2.out",
                });
            }
            if (Math.abs(deltaX) > swipeDistanceRef.current) {
                deltaX < 0 ? handleNext() : handlePrev();
            }
        };
        const handleMouseLeave = () => {
            if (isDragging) {
                isDragging = false;
                const currentSlide = slidesRef.current[currentIndex.current];
                if (currentSlide) {
                    gsap.to(currentSlide.scale, {
                        x: currentSlide.baseScale,
                        y: currentSlide.baseScale,
                        duration: 0.2,
                        ease: "power2.out",
                    });
                }
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
    }, [swipeScaleIntensity]);

    // Text tilt effect with two-stage recentering (attached to slider)
    useEffect(() => {
        if (!cursorTextEffect || typeof window === "undefined" || !sliderRef.current)
            return;
        let tiltTimeout;
        const handleTextTilt = (e) => {
            const containerWidth = sliderRef.current.clientWidth;
            const containerHeight = sliderRef.current.clientHeight;
            const centerX = containerWidth / 2;
            const centerY = containerHeight / 2;
            // Raw offset from center
            const offsetX = centerX - e.clientX;
            const offsetY = centerY - e.clientY;
            // Compute container shift: 5% of raw offset for x and 10% for y, clamped to maxContainerShiftFraction
            const rawContainerShiftX = offsetX * 0.05;
            const rawContainerShiftY = offsetY * 0.1;
            const maxShiftX = containerWidth * maxContainerShiftFraction;
            const maxShiftY = containerHeight * maxContainerShiftFraction;
            const containerShiftX = Math.max(Math.min(rawContainerShiftX, maxShiftX), -maxShiftX);
            const containerShiftY = Math.max(Math.min(rawContainerShiftY, maxShiftY), -maxShiftY);

            const activeTextContainer = textContainersRef.current[currentIndex.current];
            if (activeTextContainer && activeTextContainer.children.length >= 2) {
                // Animate container shift over 0.5s
                gsap.to(activeTextContainer, {
                    x: centerX + containerShiftX,
                    y: centerY + containerShiftY,
                    duration: 0.5,
                    ease: "expo.out",
                });
                // Animate title: 80% of raw offset, clamped to 10% of container width, over 0.5s
                const maxTitleShift = containerWidth * 0.1;
                const titleRawShiftX = offsetX * 0.8;
                const titleShiftX = Math.max(Math.min(titleRawShiftX, maxTitleShift), -maxTitleShift);
                gsap.to(activeTextContainer.children[0], {
                    x: titleShiftX,
                    duration: 0.5,
                    ease: "expo.out",
                });
                // Animate subtitle: 100% of raw offset, clamped to 15% of container width, over 0.5s
                const maxSubtitleShift = containerWidth * 0.15;
                const subtitleRawShiftX = offsetX * 1.0;
                const subtitleShiftX = Math.max(Math.min(subtitleRawShiftX, maxSubtitleShift), -maxSubtitleShift);
                gsap.to(activeTextContainer.children[1], {
                    x: subtitleShiftX,
                    duration: 0.5,
                    ease: "expo.out",
                });
            }
            if (tiltTimeout) clearTimeout(tiltTimeout);
            tiltTimeout = setTimeout(() => {
                if (textContainersRef.current[currentIndex.current]) {
                    // Animate container and its children concurrently to recenter over 1 second
                    gsap.to(textContainersRef.current[currentIndex.current], {
                        x: centerX,
                        y: centerY,
                        duration: 1,
                        ease: "expo.inOut",
                    });
                    gsap.to(textContainersRef.current[currentIndex.current].children[0], {
                        x: 0,
                        duration: 1,
                        ease: "expo.inOut",
                    });
                    gsap.to(textContainersRef.current[currentIndex.current].children[1], {
                        x: 0,
                        duration: 1,
                        ease: "expo.inOut",
                    });
                    // Concurrently fade out displacement filters
                    if (bgDispFilterRef.current) {
                        gsap.to(bgDispFilterRef.current.scale, {
                            x: 0,
                            y: 0,
                            duration: 1,
                            ease: "expo.inOut",
                        });
                    }
                    if (cursorImgEffect && cursorDispFilterRef.current) {
                        gsap.to(cursorDispFilterRef.current.scale, {
                            x: 0,
                            y: 0,
                            duration: 1,
                            ease: "expo.inOut",
                        });
                    }
                }
            }, 300);
        };
        sliderRef.current.addEventListener("mousemove", handleTextTilt);
        return () =>
            sliderRef.current.removeEventListener("mousemove", handleTextTilt);
    }, [cursorTextEffect, maxContainerShiftFraction]);

    return (
        <div className={styles.kineticSlider} ref={sliderRef}>
            {!externalNav && (
                <nav>
                    <button onClick={handlePrev} className={styles.prev}>
                        Prev
                    </button>
                    <button onClick={handleNext} className={styles.next}>
                        Next
                    </button>
                </nav>
            )}
        </div>
    );
};

export default KineticSlider;