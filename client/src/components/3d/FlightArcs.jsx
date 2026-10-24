import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { DESTINATIONS, FLIGHT_ARCS, latLonToVector3 } from './worldData';

/**
 * Creates a 3D curved arc between two points on a sphere, elevated above the surface.
 */
function createArcCurve(p1, p2, radius = 2) {
  const v1 = new THREE.Vector3(...p1);
  const v2 = new THREE.Vector3(...p2);

  const distance = v1.distanceTo(v2);
  const mid = new THREE.Vector3().addVectors(v1, v2).multiplyScalar(0.5);

  // Elevation based on distance so long journeys arc higher
  const elevation = radius + Math.min(0.65, Math.max(0.2, distance * 0.22));
  mid.normalize().multiplyScalar(elevation);

  // CatmullRomCurve3 for smooth organic trajectory
  return new THREE.CatmullRomCurve3([v1, mid, v2]);
}

export function FlightArcs({ radius = 2, selectedDestId }) {
  const destMap = useMemo(() => {
    const map = new Map();
    DESTINATIONS.forEach((d) => {
      map.set(d.id, latLonToVector3(d.lat, d.lon, radius));
    });
    return map;
  }, [radius]);

  const arcsData = useMemo(() => {
    return FLIGHT_ARCS.map((arc) => {
      const p1 = destMap.get(arc.from);
      const p2 = destMap.get(arc.to);
      if (!p1 || !p2) return null;

      const curve = createArcCurve(p1, p2, radius);
      const points = curve.getPoints(50);
      const geometry = new THREE.BufferGeometry().setFromPoints(points);

      return {
        ...arc,
        curve,
        geometry,
      };
    }).filter(Boolean);
  }, [destMap, radius]);

  // Traveling pulses along arcs
  const pulseRefs = useRef([]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    arcsData.forEach((arc, i) => {
      const mesh = pulseRefs.current[i];
      if (mesh && arc.curve) {
        // Staggered loop progress between 0 and 1
        const progress = (t * 0.22 + i * 0.18) % 1;
        const pos = arc.curve.getPointAt(progress);
        mesh.position.copy(pos);
      }
    });
  });

  return (
    <group>
      {arcsData.map((arc, i) => {
        const isHighlighted = selectedDestId === arc.from || selectedDestId === arc.to;
        return (
          <group key={`${arc.from}-${arc.to}-${i}`}>
            {/* The Flight Path Line */}
            <line geometry={arc.geometry}>
              <lineBasicMaterial
                color={isHighlighted ? '#FFFFFF' : arc.color}
                transparent
                opacity={isHighlighted ? 0.85 : 0.45}
                linewidth={1.5}
              />
            </line>

            {/* Traveling Glowing Light Particle */}
            <mesh ref={(el) => (pulseRefs.current[i] = el)}>
              <sphereGeometry args={[0.03, 12, 12]} />
              <meshBasicMaterial
                color={isHighlighted ? '#FFFFFF' : arc.color}
                toneMapped={false}
              />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

export default FlightArcs;
