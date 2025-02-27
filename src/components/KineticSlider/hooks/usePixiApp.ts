import  { useEffect, useRef } from 'react';
import { Application, Container, Assets } from 'pixi.js';
import { type PixiRefs } from '../types';
import { gsap } from 'gsap';

/**
 * Custom hook to initialize and manage a Pixi Application
 *
 * @param sliderRef - Reference to the slider DOM element
 * @param images - Array of image URLs to preload
 * @param displacementImages - Array of displacement image URLs to preload
 * @returns Object containing Pixi application references and initialization status
 */
export const usePixiApp = (
    sliderRef: React.RefObject<HTMLDivElement | null>,
    images: string[],
    displacementImages: string[]
): { pixiRefs: PixiRefs; isInitialized: boolean } => {
    const appRef = useRef<Application | null>(null);
    const slidesRef = useRef<any[]>([]);
    const textContainersRef = useRef<Container[]>([]);
    const backgroundDisplacementSpriteRef = useRef<any>(null);
    const cursorDisplacementSpriteRef = useRef<any>(null);
    const bgDispFilterRef = useRef<any>(null);
    const cursorDispFilterRef = useRef<any>(null);
    const currentIndex = useRef<number>(0);

    // Track initialization status
    const isInitialized = useRef<boolean>(false);

    // Initialize Pixi and GSAP
    useEffect(() => {
        // Skip during server-side rendering
        if (typeof window === 'undefined') return;

        (async () => {
            // Skip if already initialized or if sliderRef is not available
            if (isInitialized.current || !sliderRef.current) return;

            try {
                // Dynamically import PixiPlugin and register it with GSAP
                const { default: PixiPlugin } = await import('gsap/PixiPlugin');
                gsap.registerPlugin(PixiPlugin);
                PixiPlugin.registerPIXI({
                    Application,
                    Container,
                    // Add other PIXI classes as needed
                });

                // Load fonts
                let fontPath;
                if (typeof import.meta !== 'undefined' && import.meta.env?.DEV) {
                    fontPath = `/public/fonts/Vamos.woff2`;
                } else {
                    fontPath = `/fonts/Vamos.woff2`;
                }

                // For Pixi v8, we need to use a single argument form
                await Assets.load(fontPath);

                // Mark as initialized to prevent duplicate initialization
                isInitialized.current = true;
            } catch (error) {
                console.error('Failed to initialize Pixi and GSAP:', error);
            }
        })();
    }, [sliderRef]);

    // Create the Pixi application
    useEffect(() => {
        // Skip during server-side rendering
        if (typeof window === 'undefined') return;

        if (!isInitialized.current || !sliderRef.current || appRef.current) return;

        (async () => {
            try {
                // Preload all required assets
                for (const asset of [...images, ...displacementImages]) {
                    await Assets.load(asset);
                }

                // Create and initialize the Pixi application
                // We'll create a container div to handle the canvas
                const containerDiv = document.createElement('div');
                containerDiv.style.width = '100%';
                containerDiv.style.height = '100%';
                containerDiv.style.position = 'absolute';
                containerDiv.style.top = '0';
                containerDiv.style.left = '0';
                sliderRef.current?.appendChild(containerDiv);

                // Create and initialize the Pixi application with the container as the target
                const app = new Application();
                await app.init({
                    width: sliderRef.current?.clientWidth || 800,
                    height: sliderRef.current?.clientHeight || 600,
                    backgroundAlpha: 0,
                    resizeTo: sliderRef.current || undefined,
                });

                if (sliderRef.current && app.canvas instanceof HTMLCanvasElement) {
                    sliderRef.current.appendChild(app.canvas);
                }

                appRef.current = app;

                // Create the main stage container
                const stage = new Container();
                app.stage.addChild(stage);
            } catch (error) {
                console.error('Failed to create Pixi application:', error);
            }
        })();

        // Cleanup function to remove the container and destroy the app
        return () => {
            if (appRef.current) {
                // Find the container div we created
                const containerDiv = sliderRef.current?.querySelector('div');
                if (containerDiv && sliderRef.current) {
                    sliderRef.current.removeChild(containerDiv);
                }

                // In Pixi v8, destroy() takes a single boolean parameter
                appRef.current.destroy(true);
                appRef.current = null;
            }
        };
    }, [sliderRef, images, displacementImages, isInitialized.current]);

    // Return refs for use in other hooks
    return {
        pixiRefs: {
            app: appRef,
            slides: slidesRef,
            textContainers: textContainersRef,
            backgroundDisplacementSprite: backgroundDisplacementSpriteRef,
            cursorDisplacementSprite: cursorDisplacementSpriteRef,
            bgDispFilter: bgDispFilterRef,
            cursorDispFilter: cursorDispFilterRef,
            currentIndex
        },
        isInitialized: isInitialized.current
    };
};