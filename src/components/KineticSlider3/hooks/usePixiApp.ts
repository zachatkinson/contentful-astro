import { useEffect, useRef, useCallback, type RefObject } from 'react';
import { Application, Container, Assets } from 'pixi.js';
import ResourceManager from '../managers/ResourceManager';
import { type PixiRefs } from '../types';

// Development environment check
const isDevelopment = import.meta.env?.MODE === 'development';

// Maximum number of retries for asset loading
const MAX_ASSET_LOAD_RETRIES = 3;

/**
 * Helper function to load fonts with retry mechanism
 * @param fontPath - Path to the font file
 * @param retries - Number of retry attempts
 * @returns Promise that resolves when the font is loaded
 */
const loadFont = async (fontPath: string, retries = MAX_ASSET_LOAD_RETRIES): Promise<boolean> => {
    try {
        // Validate font path
        if (!fontPath) {
            console.warn('Invalid font path provided');
            return false;
        }

        // Try to load the font with exponential backoff
        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                await Assets.load(fontPath);
                return true;
            } catch (error) {
                if (attempt === retries) throw error;

                // Exponential backoff
                await new Promise(resolve =>
                    setTimeout(resolve, Math.pow(2, attempt) * 100)
                );
            }
        }
        return false;
    } catch (error) {
        console.warn(`Failed to load font from ${fontPath}:`, error);
        return false;
    }
};

/**
 * Custom hook to initialize and manage a Pixi Application
 */
export const usePixiApp = (
    sliderRef: RefObject<HTMLDivElement | null>,
    images: string[] = [],
    displacementImages: string[] = [],
    resourceManager?: ResourceManager | null
): { pixiRefs: PixiRefs; isInitialized: boolean } => {
    // Cancellation flag to prevent race conditions
    const isCancelledRef = useRef(false);

    // Core references
    const appRef = useRef<Application | null>(null);
    const slidesRef = useRef<any[]>([]);
    const textContainersRef = useRef<Container[]>([]);
    const backgroundDisplacementSpriteRef = useRef<any>(null);
    const cursorDisplacementSpriteRef = useRef<any>(null);
    const bgDispFilterRef = useRef<any>(null);
    const cursorDispFilterRef = useRef<any>(null);
    const currentIndex = useRef<number>(0);

    // Track initialization and module import states
    const isInitializedRef = useRef<boolean>(false);
    const modulesRef = useRef<{
        gsap?: any;
        PixiPlugin?: any;
    }>({});

    // Preload images and displacement images with retry mechanism
    const preloadAssets = useCallback(async (): Promise<void> => {
        // Skip if cancelled
        if (isCancelledRef.current) return;

        try {
            const imageCount = images.length;
            const displacementCount = displacementImages.length;

            // Preload images with retry
            if (imageCount > 0) {
                const imageBundle = images.reduce((acc, image, index) => {
                    acc[`image-${index}`] = image;
                    return acc;
                }, {} as Record<string, string>);

                Assets.addBundle('slider-images', imageBundle);

                for (let attempt = 1; attempt <= MAX_ASSET_LOAD_RETRIES; attempt++) {
                    try {
                        await Assets.loadBundle('slider-images');
                        break;
                    } catch (error) {
                        if (attempt === MAX_ASSET_LOAD_RETRIES) {
                            console.warn('Failed to load slider images after multiple attempts', error);
                        }
                        // Exponential backoff
                        await new Promise(resolve =>
                            setTimeout(resolve, Math.pow(2, attempt) * 100)
                        );
                    }
                }
            }

            // Preload displacement images with retry
            if (displacementCount > 0) {
                const dispBundle = displacementImages.reduce((acc, image, index) => {
                    acc[`displacement-${index}`] = image;
                    return acc;
                }, {} as Record<string, string>);

                Assets.addBundle('displacement-images', dispBundle);

                for (let attempt = 1; attempt <= MAX_ASSET_LOAD_RETRIES; attempt++) {
                    try {
                        await Assets.loadBundle('displacement-images');
                        break;
                    } catch (error) {
                        if (attempt === MAX_ASSET_LOAD_RETRIES) {
                            console.warn('Failed to load displacement images after multiple attempts', error);
                        }
                        // Exponential backoff
                        await new Promise(resolve =>
                            setTimeout(resolve, Math.pow(2, attempt) * 100)
                        );
                    }
                }
            }
        } catch (error) {
            console.warn('Unexpected error in asset preloading:', error);
        }
    }, [images, displacementImages]);

    // Memoized initialization function
    const initializePixiApp = useCallback(async (): Promise<boolean> => {
        // Reset cancellation flag
        isCancelledRef.current = false;

        // Skip if already initialized or missing references
        if (
            isInitializedRef.current ||
            typeof window === 'undefined' ||
            !sliderRef.current
        ) {
            return false;
        }

        try {
            // Log initialization start
            if (isDevelopment) {
                console.log('Initializing PixiJS application...');
            }

            // Dynamically import GSAP and PixiPlugin
            if (!modulesRef.current.gsap) {
                const gsapModule = await import('gsap');
                modulesRef.current.gsap = gsapModule.gsap;

                // Import PixiPlugin
                try {
                    const { default: PixiPlugin } = await import('gsap/PixiPlugin');
                    modulesRef.current.PixiPlugin = PixiPlugin;

                    // Register plugin
                    gsapModule.gsap.registerPlugin(PixiPlugin);
                } catch (pluginError) {
                    console.warn('Could not load PixiPlugin for GSAP:', pluginError);
                }
            }

            // Preload default font with retry
            const defaultFontPath = '/fonts/Vamos.woff2';
            await loadFont(defaultFontPath);

            // Preload assets
            await preloadAssets();

            // Check if cancelled during asset loading
            if (isCancelledRef.current) return false;

            // Create Pixi application
            const app = new Application();
            await app.init({
                width: sliderRef.current?.clientWidth || 800,
                height: sliderRef.current?.clientHeight || 600,
                backgroundAlpha: 0,
                resizeTo: sliderRef.current || undefined,
            });

            // Check if cancelled during app initialization
            if (isCancelledRef.current) {
                app.destroy(true);
                return false;
            }

            // Track the application with ResourceManager
            if (resourceManager) {
                resourceManager.trackPixiApp(app);
            }

            // Append canvas to slider element
            if (sliderRef.current && app.canvas instanceof HTMLCanvasElement) {
                sliderRef.current.appendChild(app.canvas);
                app.canvas.classList.add('kinetic-slider-canvas');
            }

            // Store app reference
            appRef.current = app;

            // Create main stage container
            const stage = new Container();
            app.stage.addChild(stage);

            // Track stage with ResourceManager
            if (resourceManager) {
                resourceManager.trackDisplayObject(stage);
            }

            // Mark as initialized
            isInitializedRef.current = true;

            if (isDevelopment) {
                console.log('PixiJS application initialized successfully');
            }

            return true;
        } catch (error) {
            console.error("Failed to initialize PixiJS application:", error);
            return false;
        }
    }, [sliderRef, resourceManager, preloadAssets]);

    // Initialize Pixi and GSAP
    useEffect(() => {
        // Skip during server-side rendering
        if (typeof window === 'undefined') return;

        // Attempt initialization
        initializePixiApp();

        // Cleanup function
        return () => {
            // Set cancellation flag
            isCancelledRef.current = true;

            // Reset initialization state
            isInitializedRef.current = false;

            // If ResourceManager is available, it will handle resource disposal
            if (!resourceManager && appRef.current) {
                try {
                    // Manual cleanup if no ResourceManager
                    const canvas = appRef.current.canvas;
                    if (canvas && canvas.parentElement) {
                        canvas.parentElement.removeChild(canvas);
                    }
                    appRef.current.destroy(true);
                } catch (error) {
                    console.error('Error during PixiJS app cleanup:', error);
                }

                // Clear references
                appRef.current = null;
            }
        };
    }, [sliderRef, resourceManager, initializePixiApp]);

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