import { useEffect, useRef } from 'react';
import { Application, Container, Assets } from 'pixi.js';
import { gsap } from 'gsap';
import { useKineticSlider } from '../context/KineticSliderContext';

/**
 * Helper function to load fonts for the slider
 * @param fontPath - Path to the font file
 * @returns Promise that resolves when the font is loaded
 */
const loadFont = async (fontPath: string): Promise<boolean> => {
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
 * This hook uses context to store and update references
 */
export const usePixiApp = () => {
    // Get context values for updating references
    const {
        sliderRef,
        pixiRefs,
        props,
        setIsAppReady
    } = useKineticSlider();

    // Track initialization status locally
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
                    // Try loading our default font
                    const defaultFontPath = '/fonts/Vamos.woff2';

                    // Determine font paths - try multiple options for better compatibility
                    const fontPaths = [
                        '/fonts/Vamos.woff2',      // Standard public path
                        '/public/fonts/Vamos.woff2', // Dev path
                        './fonts/Vamos.woff2',     // Relative path
                        'Vamos.woff2'              // Bare filename (use as last resort)
                    ];

                    console.log("Attempting to load default font Vamos.woff2...");

                    // Try to load the font using different paths
                    let fontLoaded = false;
                    for (const fontPath of fontPaths) {
                        const success = await loadFont(fontPath);
                        if (success) {
                            fontLoaded = true;
                            break;
                        }
                    }

                    if (!fontLoaded) {
                        console.warn("Could not load Vamos font. Will use system fonts as fallback.");
                    }
                } catch (fontError) {
                    console.warn("Font loading error:", fontError);
                    // Continue without the font
                }

                // Mark as initialized locally
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
        if (!isInitialized.current || !sliderRef.current || pixiRefs.app.current) return;

        const createPixiApp = async () => {
            try {
                console.log("Creating Pixi application...");

                // Get the images from props
                const { images = [], backgroundDisplacementSpriteLocation, cursorDisplacementSpriteLocation } = props;

                // Preload all required assets with proper error handling
                const assetsToLoad = [
                    ...images,
                    backgroundDisplacementSpriteLocation,
                    cursorDisplacementSpriteLocation
                ].filter(Boolean); // Remove any undefined assets

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

                // Store the app reference in the context
                pixiRefs.app.current = app;

                // Create the main stage container
                const stage = new Container();
                app.stage.addChild(stage);

                // Signal that the app is ready
                setIsAppReady(true);

                console.log("Pixi application created successfully");
            } catch (error) {
                console.error("Failed to create Pixi application:", error);
            }
        };

        createPixiApp();

        // Cleanup function to destroy the app
        return () => {
            if (pixiRefs.app.current) {
                // Find and remove the canvas element
                if (sliderRef.current) {
                    const canvas = sliderRef.current.querySelector('canvas');
                    if (canvas) {
                        sliderRef.current.removeChild(canvas);
                    }
                }

                // Destroy the app
                pixiRefs.app.current.destroy(true);
                pixiRefs.app.current = null;

                // Update context state
                setIsAppReady(false);

                console.log("Pixi application destroyed");
            }
        };
    }, [sliderRef, pixiRefs.app, props.images, props.backgroundDisplacementSpriteLocation, props.cursorDisplacementSpriteLocation, isInitialized.current, setIsAppReady]);
};