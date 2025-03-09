// src/components/KineticSlider3/KineticSlider.tsx - Updated version

import React, { useEffect, useState } from 'react';
import styles from './KineticSlider.module.css';
import { type KineticSliderProps } from './types';
import { SharedResourceProvider } from './context/SharedResourceContext';
import { KineticSliderProvider, useKineticSlider } from './context/KineticSliderContext';

// Main implementation using context
const KineticSliderInner: React.FC = () => {
    const {
        sliderRef,
        pixiRefs,
        props,
        states,
        setters,
        instanceId
    } = useKineticSlider();

    // Debug state for troubleshooting
    const [debug, setDebug] = useState<string>('Initializing...');

    // Add a useEffect to monitor initialization steps
    useEffect(() => {
        console.log('KineticSlider initialization state:', {
            isAppReady: states.isAppReady,
            isAssetsLoaded: states.isAssetsLoaded,
            isSlidesInitialized: states.isSlidesInitialized,
            isTextInitialized: states.isTextInitialized,
            isFiltersInitialized: states.isFiltersInitialized,
            isFullyInitialized: states.isFullyInitialized,
            instanceId
        });

        // Update debug state for visibility in the DOM
        setDebug(`App: ${states.isAppReady ? '✅' : '❌'}, Assets: ${states.isAssetsLoaded ? '✅' : '❌'}, Slides: ${states.isSlidesInitialized ? '✅' : '❌'}, Text: ${states.isTextInitialized ? '✅' : '❌'}, Filters: ${states.isFiltersInitialized ? '✅' : '❌'}`);

        // Check if paths to resources are correct
        if (!states.isAssetsLoaded) {
            console.log('Checking resource paths:', {
                images: props.images,
                bgDisplacement: props.backgroundDisplacementSpriteLocation,
                cursorDisplacement: props.cursorDisplacementSpriteLocation
            });

            // Verify at least one image exists
            const checkFirstImage = async () => {
                try {
                    const response = await fetch(props.images[0], {method: 'HEAD'});
                    console.log(`First image check (${props.images[0]}):`, response.ok ? 'exists' : 'missing');
                } catch (error) {
                    console.error('Error checking image:', error);
                }
            };

            checkFirstImage();
        }
    }, [
        states.isAppReady,
        states.isAssetsLoaded,
        states.isSlidesInitialized,
        states.isTextInitialized,
        states.isFiltersInitialized,
        states.isFullyInitialized
    ]);

    // Mouse handlers
    const handleMouseEnter = () => {
        // Implementation using context
        console.log('Mouse enter');
    };

    const handleMouseLeave = () => {
        // Implementation using context
        console.log('Mouse leave');
    };

    return (
        <div
            className={styles.kineticSlider}
            ref={sliderRef}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            data-kinetic-slider-id={instanceId}
            data-initialized={states.isFullyInitialized ? 'true' : 'false'}
        >
            {/* Debug info during development */}
            {!states.isFullyInitialized && (
                <div className={styles.debugInfo} style={{position: 'absolute', top: 0, left: 0, background: 'rgba(0,0,0,0.8)', color: 'white', padding: '10px', zIndex: 100, fontSize: '12px'}}>
                    {debug}
                </div>
            )}

            {/* Display loading indicator when app is not ready or assets not loaded */}
            {(!states.isAppReady || !states.isAssetsLoaded) && (
                <div className={styles.placeholder}>
                    <div className={styles.loadingIndicator}>
                        <div className={styles.spinner}></div>
                        <div>Loading slider... {!states.isAppReady ? '(App initializing)' : '(Loading assets)'}</div>
                    </div>
                </div>
            )}

            {/* Navigation buttons */}
            {!props.externalNav && states.isAppReady && (
                <nav>
                    <button className={styles.prev}>Prev</button>
                    <button className={styles.next}>Next</button>
                </nav>
            )}
        </div>
    );
};

// Wrapper component that provides context
const KineticSlider3: React.FC<KineticSliderProps> = (props) => {
    // Add fallback for images and displacement sprites
    const enhancedProps = {
        ...props,
        images: props.images || [],
        backgroundDisplacementSpriteLocation: props.backgroundDisplacementSpriteLocation || '/images/background-displace.jpg',
        cursorDisplacementSpriteLocation: props.cursorDisplacementSpriteLocation || '/images/cursor-displace.png'
    };

    // Log initial props to help debug
    console.log('KineticSlider3 initializing with props:', {
        imageCount: enhancedProps.images.length,
        textCount: enhancedProps.texts?.length,
        bgDisplacement: enhancedProps.backgroundDisplacementSpriteLocation,
        cursorDisplacement: enhancedProps.cursorDisplacementSpriteLocation
    });

    return (
        <SharedResourceProvider>
            <KineticSliderProvider props={enhancedProps}>
                <KineticSliderInner />
            </KineticSliderProvider>
        </SharedResourceProvider>
    );
};

export default KineticSlider3;