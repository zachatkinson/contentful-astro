import { useEffect, useRef } from 'react';
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

        const initPixi = async () => {
            try {
                // Skip if already initialized
                if (isInitialized.current) return;

                // Skip if sliderRef is not available
                if (!sliderRef.current) {
                    console.warn("Slider element reference not available");
                    return;
                }

                console.log("Initializing Pixi.js...");

                // Dynamically import PixiPlugin and register it with GSAP
                const { default: PixiPlugin } = await import('gsap/PixiPlugin');
                gsap.registerPlugin(PixiPlugin);

                PixiPlugin.registerPIXI({
                    Application,
                    Container,
                    // Add other PIXI classes as needed for GSAP animation
                });

                // Font loading with better error handling
                try {
                    // Determine font path - try multiple options for better compatibility
                    const fontPaths = [
                        '/fonts/Vamos.woff2',      // Standard public path
                        '/public/fonts/Vamos.woff2', // Dev path
                        './fonts/Vamos.woff2',     // Relative path
                        'Vamos.woff2'              // Bare filename (use as last resort)
                    ];

                    console.log("Attempting to load font Vamos.woff2...");

                    // Try to load the font using different paths
                    let fontLoaded = false;
                    for (const fontPath of fontPaths) {
                        try {
                            await Assets.load(fontPath);
                            console.log(`Successfully loaded font from ${fontPath}`);
                            fontLoaded = true;
                            break;
                        } catch (fontError) {
                            console.warn(`Failed to load font from ${fontPath}`, fontError);
                            // Continue to next path
                        }
                    }

                    if (!fontLoaded) {
                        console.warn("Could not load Vamos font. Will use system fonts as fallback.");
                    }
                } catch (fontError) {
                    console.warn("Font loading error:", fontError);
                    // Continue without the font
                }

                // Mark as initialized
                isInitialized.current = true;

                console.log("Pixi.js initialization complete");
            } catch (error) {
                console.error("Error initializing Pixi.js:", error);
            }
        };

        initPixi();
    }, [sliderRef]);

    // Create the Pixi application
    useEffect(() => {
        // Skip during server-side rendering
        if (typeof window === 'undefined') return;

        // Only proceed if initialized but app not yet created
        if (!isInitialized.current || !sliderRef.current || appRef.current) return;

        const createPixiApp = async () => {
            try {
                console.log("Creating Pixi application...");

                // Preload all required assets with proper error handling
                const assetsToLoad = [...images, ...displacementImages];
                for (const asset of assetsToLoad) {
                    try {
                        await Assets.load(asset);
                    } catch (assetError) {
                        console.warn(`Failed to load asset: ${asset}`, assetError);
                        // Continue with other assets
                    }
                }

                // Create and initialize the Pixi application
                const app = new Application();
                await app.init({
                    width: sliderRef.current?.clientWidth || 800,
                    height: sliderRef.current?.clientHeight || 600,
                    backgroundAlpha: 0,
                    resizeTo: sliderRef.current || undefined,
                });

                // Append the canvas to the slider element
                if (sliderRef.current && app.canvas instanceof HTMLCanvasElement) {
                    sliderRef.current.appendChild(app.canvas);

                    // Add a class to the canvas for potential styling
                    app.canvas.classList.add('kinetic-slider-canvas');
                }

                // Store the app reference
                appRef.current = app;

                // Create the main stage container
                const stage = new Container();
                app.stage.addChild(stage);

                console.log("Pixi application created successfully");
            } catch (error) {
                console.error("Failed to create Pixi application:", error);
            }
        };

        createPixiApp();

        // Cleanup function to destroy the app
        return () => {
            if (appRef.current) {
                // Find and remove the canvas element
                if (sliderRef.current) {
                    const canvas = sliderRef.current.querySelector('canvas');
                    if (canvas) {
                        sliderRef.current.removeChild(canvas);
                    }
                }

                // Destroy the app
                appRef.current.destroy(true);
                appRef.current = null;

                console.log("Pixi application destroyed");
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