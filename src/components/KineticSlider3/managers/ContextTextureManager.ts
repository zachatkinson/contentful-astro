// src/components/KineticSlider3/managers/ContextTextureManager.ts
import { useEffect, useRef } from 'react';
import { Assets, Texture } from 'pixi.js';
import { useKineticSlider } from '../context/KineticSliderContext';

export const useTextureManager = () => {
    const { instanceId } = useKineticSlider();
    const loadedTextures = useRef<Map<string, Texture>>(new Map());

    // Load a single texture
    const loadTexture = async (url: string): Promise<Texture> => {
        if (loadedTextures.current.has(url)) {
            return loadedTextures.current.get(url)!;
        }

        try {
            const texture = await Assets.load(url);
            loadedTextures.current.set(url, texture);
            return texture;
        } catch (error) {
            console.error(`Error loading texture ${url}:`, error);
            throw error;
        }
    };

    // Batch load textures
    const loadTextures = async (urls: string[]): Promise<Texture[]> => {
        return Promise.all(urls.map(url => loadTexture(url)));
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            loadedTextures.current.forEach((texture, url) => {
                if (texture && !texture.destroyed) {
                    console.log(`Releasing texture ${url} for instance ${instanceId}`);
                    texture.destroy();
                }
            });
            loadedTextures.current.clear();
        };
    }, [instanceId]);

    return { loadTexture, loadTextures };
};