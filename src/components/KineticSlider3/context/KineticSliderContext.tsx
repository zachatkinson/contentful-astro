import React, { createContext, useContext, useRef, useState } from 'react';
import { Application, Sprite, Container, DisplacementFilter } from 'pixi.js';
import { useSharedResources } from './SharedResourceContext';
import type { KineticSliderProps, PixiRefs } from '../types';

interface KineticSliderContextType {
    instanceId: string;
    sliderRef: React.RefObject<HTMLDivElement>;
    pixiRefs: PixiRefs;
    props: KineticSliderProps;
    states: {
        isAppReady: boolean;
        isAssetsLoaded: boolean;
        isSlidesInitialized: boolean;
        isTextInitialized: boolean;
        isFiltersInitialized: boolean;
        isFullyInitialized: boolean;
        isInteracting: boolean;
    };
    setters: {
        setIsAppReady: (value: boolean) => void;
        setIsAssetsLoaded: (value: boolean) => void;
        setIsSlidesInitialized: (value: boolean) => void;
        setIsTextInitialized: (value: boolean) => void;
        setIsFiltersInitialized: (value: boolean) => void;
        setIsFullyInitialized: (value: boolean) => void;
        setIsInteracting: (value: boolean) => void;
    };
    handleInitialization: (system: string) => void;
}

const KineticSliderContext = createContext<KineticSliderContextType | null>(null);

export const useKineticSlider = () => {
    const context = useContext(KineticSliderContext);
    if (!context) {
        throw new Error('useKineticSlider must be used within a KineticSliderProvider');
    }
    return context;
};

export const KineticSliderProvider: React.FC<{
    children: React.ReactNode;
    props: KineticSliderProps;
}> = ({ children, props }) => {
    // Generate unique ID for this instance
    const instanceId = useRef(`ks-${Math.random().toString(36).substring(2, 9)}`).current;
    const { registerInstance, unregisterInstance } = useSharedResources();

    // Register this instance
    React.useEffect(() => {
        registerInstance(instanceId);
        return () => unregisterInstance(instanceId);
    }, [instanceId]);

    // Create refs
    const sliderRef = useRef<HTMLDivElement>(null);
    const appRef = useRef<Application | null>(null);
    const slidesRef = useRef<Sprite[]>([]);
    const textContainersRef = useRef<Container[]>([]);
    const bgDisplacementSpriteRef = useRef<Sprite | null>(null);
    const cursorDisplacementSpriteRef = useRef<Sprite | null>(null);
    const bgDispFilterRef = useRef<DisplacementFilter | null>(null);
    const cursorDispFilterRef = useRef<DisplacementFilter | null>(null);
    const currentIndexRef = useRef<number>(0);

    // State
    const [isAppReady, setIsAppReady] = useState(false);
    const [isAssetsLoaded, setIsAssetsLoaded] = useState(false);
    const [isSlidesInitialized, setIsSlidesInitialized] = useState(false);
    const [isTextInitialized, setIsTextInitialized] = useState(false);
    const [isFiltersInitialized, setIsFiltersInitialized] = useState(false);
    const [isFullyInitialized, setIsFullyInitialized] = useState(false);
    const [isInteracting, setIsInteracting] = useState(false);

    // Create initialization handler
    const handleInitialization = (system: string) => {
        console.log(`${system} system initialized for instance ${instanceId}`);

        switch (system) {
            case 'app': setIsAppReady(true); break;
            case 'slides': setIsSlidesInitialized(true); break;
            case 'text': setIsTextInitialized(true); break;
            case 'filters': setIsFiltersInitialized(true); break;
            case 'displacement': break; // Already handled separately
        }
    };

    // Check full initialization
    React.useEffect(() => {
        if (isAppReady && isSlidesInitialized && isTextInitialized &&
            isFiltersInitialized && !isFullyInitialized) {
            console.log(`KineticSlider instance ${instanceId} fully initialized and ready`);
            setIsFullyInitialized(true);
        }
    }, [isAppReady, isSlidesInitialized, isTextInitialized, isFiltersInitialized, isFullyInitialized]);

    return (
        <KineticSliderContext.Provider
            value={{
                instanceId,
                sliderRef,
                pixiRefs: {
                    app: appRef,
                    slides: slidesRef,
                    textContainers: textContainersRef,
                    backgroundDisplacementSprite: bgDisplacementSpriteRef,
                    cursorDisplacementSprite: cursorDisplacementSpriteRef,
                    bgDispFilter: bgDispFilterRef,
                    cursorDispFilter: cursorDispFilterRef,
                    currentIndex: currentIndexRef
                },
                props,
                states: {
                    isAppReady,
                    isAssetsLoaded,
                    isSlidesInitialized,
                    isTextInitialized,
                    isFiltersInitialized,
                    isFullyInitialized,
                    isInteracting
                },
                setters: {
                    setIsAppReady,
                    setIsAssetsLoaded,
                    setIsSlidesInitialized,
                    setIsTextInitialized,
                    setIsFiltersInitialized,
                    setIsFullyInitialized,
                    setIsInteracting
                },
                handleInitialization
            }}
        >
            {children}
        </KineticSliderContext.Provider>
    );
};