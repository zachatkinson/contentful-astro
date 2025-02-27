import { useEffect, type RefObject } from 'react';
import { Application, Container, Text, TextStyle, Sprite } from 'pixi.js';
import { RGBSplitFilter } from 'pixi-filters';
import { gsap } from 'gsap';
import { type TextPair } from '../types';

interface UseTextContainersProps {
    sliderRef: RefObject<HTMLDivElement | null>;
    appRef: RefObject<Application | null>;
    slidesRef: RefObject<Sprite[]>;
    textContainersRef: RefObject<Container[]>;
    currentIndex: RefObject<number>;
    buttonMode: boolean;
    textsRgbEffect: boolean;
    texts: TextPair[];
    textTitleColor: string;
    textTitleSize: number;
    mobileTextTitleSize: number;
    textTitleLetterspacing: number;
    textSubTitleColor: string;
    textSubTitleSize: number;
    mobileTextSubTitleSize: number;
    textSubTitleLetterspacing: number;
    textSubTitleOffsetTop: number;
    mobileTextSubTitleOffsetTop: number;
}

/**
 * Hook to create and manage text containers for slide titles and subtitles
 */
const useTextContainers = ({
                               sliderRef,
                               appRef,
                               slidesRef,
                               textContainersRef,
                               currentIndex,
                               buttonMode,
                               textsRgbEffect,
                               texts,
                               textTitleColor,
                               textTitleSize,
                               mobileTextTitleSize,
                               textTitleLetterspacing,
                               textSubTitleColor,
                               textSubTitleSize,
                               mobileTextSubTitleSize,
                               textSubTitleLetterspacing,
                               textSubTitleOffsetTop,
                               mobileTextSubTitleOffsetTop
                           }: UseTextContainersProps) => {
    // Create text containers
    useEffect(() => {
        // Skip during server-side rendering
        if (typeof window === 'undefined') return;

        if (!appRef.current || !slidesRef.current.length || !texts.length) return;

        const app = appRef.current;
        const stage = app.stage.children[0] as Container || app.stage;

        // Clear existing text containers
        textContainersRef.current.forEach(container => {
            if (container.parent) {
                container.parent.removeChild(container);
            }
        });
        textContainersRef.current = [];

        // Compute responsive text sizes
        const isMobile = window.innerWidth < 768;
        const computedTitleSize = isMobile ? mobileTextTitleSize : textTitleSize;
        const computedSubTitleSize = isMobile ? mobileTextSubTitleSize : textSubTitleSize;
        const computedSubTitleOffset = isMobile ? mobileTextSubTitleOffsetTop : textSubTitleOffsetTop;

        // Create new text containers for each text pair
        texts.forEach((textPair, index) => {
            const [title, subtitle] = textPair;
            const textContainer = new Container();
            textContainer.x = app.screen.width / 2;
            textContainer.y = app.screen.height / 2;

            // Create title text
            const titleStyle = new TextStyle({
                fill: textTitleColor,
                fontSize: computedTitleSize,
                letterSpacing: textTitleLetterspacing,
                fontWeight: 'bold',
                align: 'center',
                fontFamily: 'Vamos'
            });
            const titleText = new Text(title, titleStyle);
            titleText.anchor.set(0.5, 0);
            titleText.y = 0;

            // Create subtitle text
            const subtitleStyle = new TextStyle({
                fill: textSubTitleColor,
                fontSize: computedSubTitleSize,
                letterSpacing: textSubTitleLetterspacing,
                align: 'center'
            });
            const subText = new Text(subtitle, subtitleStyle);
            subText.anchor.set(0.5, 0);
            subText.y = titleText.height + computedSubTitleOffset;

            textContainer.addChild(titleText, subText);
            textContainer.pivot.y = textContainer.height / 2;
            textContainer.alpha = 0; // Start hidden

            // Add RGB split filter if enabled
            if (textsRgbEffect) {
                const textRgbFilter = new RGBSplitFilter({
                    red: { x: 0, y: 0 },
                    green: { x: 0, y: 0 },
                    blue: { x: 0, y: 0 }
                });
                textContainer.filters = [textRgbFilter];
            }

            // Enable button mode if specified
            if (buttonMode) {
                textContainer.eventMode = 'static'; // Make interactive in Pixi v7+
                textContainer.cursor = 'pointer';

                textContainer.on('pointerover', () => {
                    gsap.to(titleText.scale, { x: 1.1, y: 1.1, duration: 0.2 });
                });

                textContainer.on('pointerout', () => {
                    gsap.to(titleText.scale, { x: 1, y: 1, duration: 0.2 });
                });

                textContainer.on('pointerdown', () => {
                    // Move to next slide if clicked
                    const nextIndex = (currentIndex.current + 1) % slidesRef.current.length;
                    // Dispatch a custom event that can be caught by other components
                    window.dispatchEvent(new CustomEvent('slideChange', { detail: { nextIndex } }));
                });
            }

            // Add to stage and store reference
            stage.addChild(textContainer);
            textContainersRef.current.push(textContainer);
        });

        // Show the first text container
        if (textContainersRef.current.length > 0) {
            textContainersRef.current[0].alpha = 1;
        }

        return () => {
            // Cleanup
            textContainersRef.current.forEach(container => {
                if (container.parent) {
                    container.parent.removeChild(container);
                }
            });
            textContainersRef.current = [];
        };
    }, [
        appRef.current,
        texts,
        textTitleColor,
        textTitleSize,
        mobileTextTitleSize,
        textTitleLetterspacing,
        textSubTitleColor,
        textSubTitleSize,
        mobileTextSubTitleSize,
        textSubTitleLetterspacing,
        textSubTitleOffsetTop,
        mobileTextSubTitleOffsetTop,
        textsRgbEffect,
        buttonMode
    ]);

    // Handle window resize for text containers
    useEffect(() => {
        // Skip during server-side rendering
        if (typeof window === 'undefined') return;

        if (!appRef.current || !sliderRef.current) return;

        const handleResize = () => {
            if (!appRef.current || !textContainersRef.current.length) return;

            const app = appRef.current;
            const containerWidth = sliderRef.current?.clientWidth || 0;
            const containerHeight = sliderRef.current?.clientHeight || 0;
            const isMobile = window.innerWidth < 768;

            // Compute updated text sizes
            const computedTitleSize = isMobile ? mobileTextTitleSize : textTitleSize;
            const computedSubTitleSize = isMobile ? mobileTextSubTitleSize : textSubTitleSize;
            const computedSubTitleOffset = isMobile ? mobileTextSubTitleOffsetTop : textSubTitleOffsetTop;

            // Update each text container's position and text styles
            textContainersRef.current.forEach(container => {
                container.x = containerWidth / 2;
                container.y = containerHeight / 2;

                // Update title text
                if (container.children[0] && container.children[0] instanceof Text) {
                    const titleText = container.children[0] as Text;
                    titleText.style.fontSize = computedTitleSize;
                }

                // Update subtitle text
                if (container.children[1] && container.children[1] instanceof Text) {
                    const subText = container.children[1] as Text;
                    subText.style.fontSize = computedSubTitleSize;

                    // Force text to update
                    if ('updateText' in subText) {
                        (subText as any).updateText();
                    }

                    // Update position after title is updated
                    if (container.children[0] instanceof Text) {
                        const titleText = container.children[0] as Text;
                        if ('updateText' in titleText) {
                            (titleText as any).updateText();
                        }
                        subText.y = titleText.height + computedSubTitleOffset;
                    }
                }

                // Re-center pivot after text updates
                container.pivot.y = container.height / 2;
            });
        };

        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, [
        sliderRef.current,
        appRef.current,
        textTitleSize,
        mobileTextTitleSize,
        textSubTitleSize,
        mobileTextSubTitleSize,
        textSubTitleOffsetTop,
        mobileTextSubTitleOffsetTop
    ]);

    return {
        textContainers: textContainersRef.current
    };
};

export default useTextContainers;