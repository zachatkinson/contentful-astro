// src/components/KineticSlider3/context/KineticSliderContext.tsx

import React, { createContext, useContext, useRef, useState, useCallback, useEffect } from 'react';
import { Application, Sprite, Container, DisplacementFilter } from 'pixi.js';
import { useSharedResources } from './SharedResourceContext';
import type { KineticSliderProps, PixiRefs } from '../types';

interface KineticSliderContextType {
    instanceId: string;
    // Change this to allow null explicitly in the type
    sliderRef: React.RefObject<HTMLDivElement | null>;
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
        currentIndex: number;  // Make sure this is included
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
    actions: {
        goNext: () => void;
        goPrev: () => void;
        showEffects: () => void;
        hideEffects: () => void;
        // Any other actions used in the component
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
    // Track component unmounting to prevent cleanup errors
    const componentUnmounting = useRef(false);

    // FIX: Generate stable IDs for SSR compatibility
    const instanceIdRef = useRef<string | null>(null);
    // Use a placeholder ID for server rendering, and generate a real one on client only
    const instanceId = instanceIdRef.current ||
        (typeof window !== 'undefined'
            ? `ks-${Math.random().toString(36).substring(2, 9)}`
            : 'ks-server-placeholder');

    const { registerInstance, unregisterInstance } = useSharedResources();

    // Initialize instanceId on client-side only
    useEffect(() => {
        if (!instanceIdRef.current && typeof window !== 'undefined') {
            instanceIdRef.current = `ks-${Math.random().toString(36).substring(2, 9)}`;
        }
    }, []);

    // Register this instance with stable dependencies
    useEffect(() => {
        if (instanceIdRef.current) {
            registerInstance(instanceIdRef.current);
        }

        return () => {
            // Set unmounting flag to prevent issues during cleanup
            componentUnmounting.current = true;

            if (instanceIdRef.current) {
                unregisterInstance(instanceIdRef.current);
            }
        };
    }, [registerInstance, unregisterInstance]);

    // Create refs
    const sliderRef = useRef<HTMLDivElement | null>(null);
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
    const handleInitialization = useCallback((system: string) => {
        console.log(`${system} system initialized for instance ${instanceId}`);

        switch (system) {
            case 'app': setIsAppReady(true); break;
            case 'slides': setIsSlidesInitialized(true); break;
            case 'text': setIsTextInitialized(true); break;
            case 'filters': setIsFiltersInitialized(true); break;
            case 'displacement': break; // Already handled separately
        }
    }, [instanceId]);

    // Check full initialization
    useEffect(() => {
        if (isAppReady && isSlidesInitialized && isTextInitialized &&
            isFiltersInitialized && !isFullyInitialized) {
            console.log(`KineticSlider instance ${instanceId} fully initialized and ready`);
            setIsFullyInitialized(true);
        }
    }, [isAppReady, isSlidesInitialized, isTextInitialized, isFiltersInitialized, isFullyInitialized, instanceId]);

    // Define necessary actions (placeholders for now, you'll implement these)
    const goNext = useCallback(() => {
        // Implementation will be added later
    }, []);

    const goPrev = useCallback(() => {
        // Implementation will be added later
    }, []);

    const showEffects = useCallback(() => {
        // Implementation will be added later
    }, []);

    const hideEffects = useCallback(() => {
        // Implementation will be added later
    }, []);

    return (
        <KineticSliderContext.Provider
            value={{
                instanceId: instanceIdRef.current || instanceId,
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
                    isInteracting,
                    currentIndex: currentIndexRef.current  // Add currentIndex to the states object
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
                actions: {
                    goNext,
                    goPrev,
                    showEffects,
                    hideEffects
                },
                handleInitialization
            }}
        >
            {children}
        </KineticSliderContext.Provider>
    );
};