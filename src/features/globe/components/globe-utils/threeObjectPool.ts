/**
 * THREE.js Object Pool - Object pool pattern for WebGL objects
 *
 * Reuses THREE.js geometries, materials, and meshes to reduce
 * garbage collection pressure and improve performance.
 */

import * as THREE from 'three';

/**
 * Pool for THREE.RingGeometry objects
 */
class RingGeometryPool {
  private pool: THREE.RingGeometry[] = [];
  private maxSize: number;

  constructor(maxSize = 50) {
    this.maxSize = maxSize;
  }

  acquire(innerRadius: number, outerRadius: number, segments = 64): THREE.RingGeometry {
    // Try to find a matching geometry in the pool
    const index = this.pool.findIndex(
      (g) =>
        Math.abs(g.parameters.innerRadius - innerRadius) < 0.001 &&
        Math.abs(g.parameters.outerRadius - outerRadius) < 0.001 &&
        g.parameters.thetaSegments === segments
    );

    if (index !== -1) {
      return this.pool.splice(index, 1)[0];
    }

    // Create new geometry
    return new THREE.RingGeometry(innerRadius, outerRadius, segments);
  }

  release(geometry: THREE.RingGeometry): void {
    if (this.pool.length < this.maxSize) {
      this.pool.push(geometry);
    } else {
      geometry.dispose();
    }
  }

  clear(): void {
    this.pool.forEach((g) => g.dispose());
    this.pool = [];
  }
}

/**
 * Pool for THREE.MeshBasicMaterial objects
 */
class MaterialPool {
  private pool: Map<string, THREE.MeshBasicMaterial[]> = new Map();
  private maxPerColor: number;

  constructor(maxPerColor = 10) {
    this.maxPerColor = maxPerColor;
  }

  acquire(color: string, opacity = 0.85): THREE.MeshBasicMaterial {
    const key = `${color}-${opacity}`;
    const poolForKey = this.pool.get(key);

    if (poolForKey && poolForKey.length > 0) {
      return poolForKey.pop()!;
    }

    return new THREE.MeshBasicMaterial({
      color,
      side: THREE.DoubleSide,
      transparent: true,
      opacity,
    });
  }

  release(material: THREE.MeshBasicMaterial): void {
    const color = '#' + material.color.getHexString();
    const key = `${color}-${material.opacity}`;

    if (!this.pool.has(key)) {
      this.pool.set(key, []);
    }

    const poolForKey = this.pool.get(key)!;
    if (poolForKey.length < this.maxPerColor) {
      poolForKey.push(material);
    } else {
      material.dispose();
    }
  }

  clear(): void {
    this.pool.forEach((materials) => {
      materials.forEach((m) => m.dispose());
    });
    this.pool.clear();
  }
}

/**
 * Pool for complete zenith ring meshes
 */
class ZenithRingPool {
  private pool: THREE.Mesh[] = [];
  private geometryPool: RingGeometryPool;
  private materialPool: MaterialPool;
  private maxSize: number;

  constructor(maxSize = 30) {
    this.maxSize = maxSize;
    this.geometryPool = new RingGeometryPool();
    this.materialPool = new MaterialPool();
  }

  /**
   * Create a zenith ring mesh for a planet
   * @param color Planet color
   * @param radiusKm Radius in kilometers (default 200km)
   */
  createZenithRing(color: string, radiusKm = 200): THREE.Mesh | null {
    try {
      // Calculate angular radius for Earth surface
      const earthRadiusKm = 6371;
      const angularRadius = radiusKm / earthRadiusKm;
      const globeRadius = 100; // default globe radius
      const ringRadius = globeRadius * angularRadius;

      // Create ring with 15% thickness
      const thickness = ringRadius * 0.15;
      const geometry = this.geometryPool.acquire(
        ringRadius - thickness / 2,
        ringRadius + thickness / 2,
        64
      );

      const material = this.materialPool.acquire(color, 0.85);
      const ring = new THREE.Mesh(geometry, material);

      return ring;
    } catch (e) {
      console.warn('Failed to create zenith ring:', e);
      return null;
    }
  }

  /**
   * Release a mesh back to the pool
   */
  releaseRing(mesh: THREE.Mesh): void {
    if (this.pool.length < this.maxSize) {
      this.pool.push(mesh);
    } else {
      // Dispose if pool is full
      if (mesh.geometry) {
        this.geometryPool.release(mesh.geometry as THREE.RingGeometry);
      }
      if (mesh.material && !Array.isArray(mesh.material)) {
        this.materialPool.release(mesh.material as THREE.MeshBasicMaterial);
      }
    }
  }

  /**
   * Clear all pools
   */
  clear(): void {
    this.pool.forEach((mesh) => {
      mesh.geometry?.dispose();
      if (mesh.material && !Array.isArray(mesh.material)) {
        (mesh.material as THREE.MeshBasicMaterial).dispose();
      }
    });
    this.pool = [];
    this.geometryPool.clear();
    this.materialPool.clear();
  }
}

// Singleton instances
export const ringGeometryPool = new RingGeometryPool();
export const materialPool = new MaterialPool();
export const zenithRingPool = new ZenithRingPool();

export default zenithRingPool;
