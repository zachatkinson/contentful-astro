import React, { createContext, useContext, useState, useEffect } from 'react';
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

    // Initialize shared libraries
    useEffect(() => {
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
    }, []);

    const registerInstance = (id: string) => {
        setInstanceIds(prev => {
            const updated = new Set(prev);
            updated.add(id);
            return updated;
        });
    };

    const unregisterInstance = (id: string) => {
        setInstanceIds(prev => {
            const updated = new Set(prev);
            updated.delete(id);
            return updated;
        });
    };

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