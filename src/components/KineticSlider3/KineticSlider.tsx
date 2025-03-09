// src/components/KineticSlider3/KineticSlider.tsx
import React from 'react';
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

    // Use hooks with context rather than passing props
    // useDisplacementEffects hook would be modified to use context
    // useSlides hook would be modified to use context
    // etc.

    // Mouse handlers
    const handleMouseEnter = () => {
        // Implementation using context
    };

    const handleMouseLeave = () => {
        // Implementation using context
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
            {/* Component UI */}
            {!states.isAppReady || !states.isAssetsLoaded && (
                <div className={styles.placeholder}>
                    <div className={styles.loadingIndicator}>
                        <div className={styles.spinner}></div>
                        <div>Loading slider...</div>
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
    return (
        <SharedResourceProvider>
            <KineticSliderProvider props={props}>
                <KineticSliderInner />
            </KineticSliderProvider>
        </SharedResourceProvider>
    );
};

export default KineticSlider3;