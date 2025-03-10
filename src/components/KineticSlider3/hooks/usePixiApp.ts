import { useEffect, useRef } from 'react';
import { Application, Container, Assets } from 'pixi.js';
import { type PixiRefs } from '../types';
import { gsap } from 'gsap';
import ResourceManager from '../managers/ResourceManager';

/**
 * Helper function to load fonts for the slider
 * @param fontPath - Path to the font file
 * @returns Promise that resolves when the font is loaded
 */
const loadFont = async (fontPath: string): Promise<boolean> => {
    // Existing implementation...
    try {
        // Try to load the font
        await Assets.load(fontPath);
        console.log(`Successfully loaded font from ${fontPath}`);
        return true;
    } catch (error) {
        console.warn(`Failed to load font from ${fontPath}`, error);
        return false;
    }
};

/**
 * Custom hook to initialize and manage a Pixi Application
 *
 * @param sliderRef - Reference to the slider DOM element
 * @param images - Array of image URLs to preload
 * @param displacementImages - Array of displacement image URLs to preload
 * @param resourceManager - ResourceManager instance for tracking resources
 * @returns Object containing Pixi application references and initialization status
 */
export const usePixiApp = (
    sliderRef: React.RefObject<HTMLDivElement | null>,
    images: string[],
    displacementImages: string[],
    resourceManager?: ResourceManager | null
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
    const isInitializedRef = useRef<boolean>(false);

    // Initialize Pixi and GSAP
    useEffect(() => {
        // Skip during server-side rendering
        if (typeof window === 'undefined') return;

        const initPixi = async () => {
            try {
                // Skip if already initialized
                if (isInitializedRef.current) return;

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
                    // Try loading our default font
                    const defaultFontPath = '/fonts/Vamos.woff2';
                    // Font loading implementation...
                } catch (fontError) {
                    console.warn("Font loading error:", fontError);
                    // Continue without the font
                }

                // Mark as initialized
                isInitializedRef.current = true;

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
        if (!isInitializedRef.current || !sliderRef.current || appRef.current) return;

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

                // Track the application with ResourceManager if available
                if (resourceManager) {
                    resourceManager.trackDisplayObject(app);
                }

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

                // Track the stage with ResourceManager if available
                if (resourceManager) {
                    resourceManager.trackDisplayObject(stage);
                }

                console.log("Pixi application created successfully");
            } catch (error) {
                console.error("Failed to create Pixi application:", error);
            }
        };

        createPixiApp();

        // Return a function that does nothing - ResourceManager will handle cleanup
        return () => {
            // No manual cleanup needed
        };
    }, [sliderRef, images, displacementImages, resourceManager]);

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
        isInitialized: isInitializedRef.current
    };
};