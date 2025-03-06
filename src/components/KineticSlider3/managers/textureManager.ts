/**
 * TextureManager for KineticSlider
 * Manages the lifecycle of textures to prevent memory leaks
 */
import { Assets, Texture } from 'pixi.js';

class TextureManager {
    // Track all textures loaded by this instance
    private loadedTextures = new Map<string, { texture: Texture, refCount: number }>();
    private disposed = false;

    /**
     * Load a texture with reference counting
     * @param url URL of the texture to load
     * @returns Promise resolving to the texture
     */
    async loadTexture(url: string): Promise<Texture> {
        if (this.disposed) {
            throw new Error('TextureManager has been disposed');
        }

        // Check if we already have this texture
        if (this.loadedTextures.has(url)) {
            const entry = this.loadedTextures.get(url)!;
            entry.refCount++;
            return entry.texture;
        }

        // Try to get from global cache first
        let texture: Texture;
        if (Assets.cache.has(url)) {
            texture = Assets.cache.get(url);
        } else {
            // Load the texture if not cached
            texture = await Assets.load(url);
        }

        // Store in our tracking map
        this.loadedTextures.set(url, { texture, refCount: 1 });

        return texture;
    }

    /**
     * Release a reference to a texture
     * @param url URL of the texture to release
     * @param forceDestroy Force texture destruction regardless of ref count
     */
    releaseTexture(url: string, forceDestroy = false): void {
        if (!this.loadedTextures.has(url)) return;

        const entry = this.loadedTextures.get(url)!;
        entry.refCount--;

        // If ref count reaches 0 or force destroy, actually dispose the texture
        if (forceDestroy || entry.refCount <= 0) {
            const texture = entry.texture;

            // Only destroy if not already destroyed
            if (texture && !texture.destroyed) {
                // We can safely destroy the texture now
                texture.destroy(true);
            }

            // Remove from our tracking
            this.loadedTextures.delete(url);
        }
    }

    /**
     * Batch load multiple textures
     * @param urls Array of texture URLs to load
     * @returns Promise resolving to an array of loaded textures
     */
    async batchLoadTextures(urls: string[]): Promise<Texture[]> {
        return Promise.all(urls.map(url => this.loadTexture(url)));
    }

    /**
     * Get reference count for a texture
     * @param url URL of the texture
     * @returns Current reference count or 0 if not tracked
     */
    getRefCount(url: string): number {
        return this.loadedTextures.has(url) ? this.loadedTextures.get(url)!.refCount : 0;
    }

    /**
     * Clean up all textures managed by this instance
     */
    dispose(): void {
        if (this.disposed) return;

        // Destroy all textures we're tracking
        this.loadedTextures.forEach((entry, url) => {
            if (entry.texture && !entry.texture.destroyed) {
                entry.texture.destroy(true);
            }
        });

        // Clear the map
        this.loadedTextures.clear();
        this.disposed = true;
    }
}

export default TextureManager;