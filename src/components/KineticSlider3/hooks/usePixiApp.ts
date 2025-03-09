// src/components/KineticSlider3/hooks/usePixiApp.ts - Fixed TypeScript error

import { useEffect, useRef } from 'react';
import { Application } from 'pixi.js';
import { useKineticSlider } from '../context/KineticSliderContext';

/**
 * Custom hook to initialize and manage a Pixi Application
 * Simplified for Pixi.js v8 with better error handling
 */
export const usePixiApp = () => {
    // Get context values for updating references
    const {
        sliderRef,
        pixiRefs,
        setters
    } = useKineticSlider();

    // Initialize Pixi Application
    useEffect(() => {
        // Skip during server-side rendering
        if (typeof window === 'undefined') return;

        // Skip if already initialized or no slider element
        if (pixiRefs.app.current || !sliderRef.current) return;

        console.log('Starting Pixi.js application initialization');
        console.log('Slider dimensions:', {
            width: sliderRef.current.clientWidth,
            height: sliderRef.current.clientHeight
        });

        const createApp = async () => {
            try {
                // Create a simple canvas element directly
                console.log('Creating canvas element');
                const canvas = document.createElement('canvas');

                // Set canvas dimensions to match slider
                canvas.width = sliderRef.current?.clientWidth || 800;
                canvas.height = sliderRef.current?.clientHeight || 600;

                // Create the Pixi Application
                console.log('Creating Pixi.js Application with canvas');
                const app = new Application();

                // Initialize with very minimal options for maximum compatibility
                await app.init({
                    canvas, // Use our pre-created canvas element
                    backgroundAlpha: 0,
                    antialias: true
                });

                console.log('Pixi application initialization successful');

                // Append the canvas to the slider element
                if (sliderRef.current) {
                    sliderRef.current.appendChild(canvas);
                    console.log('Canvas appended to slider element');

                    // Add basic styling to position the canvas correctly
                    canvas.style.position = 'absolute';
                    canvas.style.top = '0';
                    canvas.style.left = '0';
                }

                // Store the app reference in context
                pixiRefs.app.current = app;

                // Signal that app is ready
                console.log('Application ready - updating state');
                setters.setIsAppReady(true);

            } catch (error: unknown) {
                // Properly type the error
                console.error('Error creating Pixi application:', error);

                // Extract error message with proper type handling
                const errorMessage = error instanceof Error
                    ? error.message
                    : 'Unknown error';

                // Create fallback canvas if Pixi fails
                if (sliderRef.current) {
                    console.log('Creating fallback canvas');
                    const fallbackCanvas = document.createElement('canvas');
                    fallbackCanvas.width = sliderRef.current.clientWidth;
                    fallbackCanvas.height = sliderRef.current.clientHeight;
                    fallbackCanvas.style.position = 'absolute';
                    fallbackCanvas.style.top = '0';
                    fallbackCanvas.style.left = '0';

                    // Draw error message on canvas
                    const ctx = fallbackCanvas.getContext('2d');
                    if (ctx) {
                        ctx.fillStyle = '#333';
                        ctx.fillRect(0, 0, fallbackCanvas.width, fallbackCanvas.height);
                        ctx.fillStyle = 'white';
                        ctx.font = '14px Arial';
                        ctx.fillText('WebGL initialization failed', 20, 30);
                        ctx.fillText('Error: ' + errorMessage, 20, 50);
                    }

                    sliderRef.current.appendChild(fallbackCanvas);

                    // Create a simple fake app object to prevent errors
                    const fakeApp = {
                        stage: { addChild: () => {} },
                        renderer: { render: () => {} },
                        destroy: () => {}
                    };

                    // Store the fake app reference
                    pixiRefs.app.current = fakeApp as any;

                    // Signal that app is ready (even though it's a fallback)
                    setters.setIsAppReady(true);
                }
            }
        };

        createApp();

        // Clean up function
        return () => {
            if (pixiRefs.app.current) {
                console.log('Cleaning up Pixi application');

                // Remove canvas from DOM if it exists
                if (sliderRef.current) {
                    const canvas = sliderRef.current.querySelector('canvas');
                    if (canvas) {
                        sliderRef.current.removeChild(canvas);
                    }
                }

                // Destroy the app
                try {
                    pixiRefs.app.current.destroy();
                } catch (error: unknown) {
                    console.error('Error destroying Pixi application:', error);
                }

                pixiRefs.app.current = null;
                setters.setIsAppReady(false);
            }
        };
    }, [sliderRef.current]);
};