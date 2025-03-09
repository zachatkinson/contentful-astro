import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Assets } from 'pixi.js';
import { gsap } from 'gsap';

interface SharedResourceContextType {
    isGsapReady: boolean;
    isPixiReady: boolean;
    registerInstance: (id: string) => void;
    unregisterInstance: (id: string) => void;
    activeInstances: number;
}

const SharedResourceContext = createContext<SharedResourceContextType>({
    isGsapReady: false,
    isPixiReady: false,
    registerInstance: () => {},
    unregisterInstance: () => {},
    activeInstances: 0
});

export const useSharedResources = () => useContext(SharedResourceContext);

export const SharedResourceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isGsapReady, setIsGsapReady] = useState(false);
    const [isPixiReady, setIsPixiReady] = useState(false);
    const [instanceIds, setInstanceIds] = useState<Set<string>>(new Set());

    // Track component unmounting state to prevent updates after unmount
    const isUnmountingRef = useRef(false);

    // Track if we're on client side to prevent SSR issues
    const isClientSide = typeof window !== 'undefined';

    // Initialize shared libraries - only on client side
    useEffect(() => {
        if (!isClientSide) return;

        const initLibraries = async () => {
            try {
                // Load GSAP
                const gsapModule = await import('gsap');
                setIsGsapReady(!!gsapModule.gsap);

                // Check PixiJS
                setIsPixiReady(typeof Assets !== 'undefined');
            } catch (error) {
                console.error('Error initializing shared libraries:', error);
            }
        };

        initLibraries();

        // Set unmounting flag on cleanup
        return () => {
            isUnmountingRef.current = true;
        };
    }, [isClientSide]);

    // Use useCallback to stabilize these functions to prevent infinite update loops
    const registerInstance = useCallback((id: string) => {
        // Skip if unmounting or server-side
        if (isUnmountingRef.current || !isClientSide) return;

        setInstanceIds(prev => {
            // Skip update if id already exists
            if (prev.has(id)) return prev;

            const updated = new Set(prev);
            updated.add(id);
            return updated;
        });
    }, [isClientSide]);

    const unregisterInstance = useCallback((id: string) => {
        // Skip if unmounting or server-side
        if (isUnmountingRef.current || !isClientSide) return;

        setInstanceIds(prev => {
            // Skip update if id doesn't exist to avoid unnecessary renders
            if (!prev.has(id)) return prev;

            const updated = new Set(prev);
            updated.delete(id);
            return updated;
        });
    }, [isClientSide]);

    return (
        <SharedResourceContext.Provider
            value={{
                isGsapReady,
                isPixiReady,
                registerInstance,
                unregisterInstance,
                activeInstances: instanceIds.size
            }}
        >
            {children}
        </SharedResourceContext.Provider>
    );
};