import React, { useRef, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { DESTINATIONS, latLonToVector3 } from './worldData';

/**
 * Interactive 3D Destination Pin with dynamic hover popup displaying place name,
 * region, budget in INR, and season.
 * Includes precise world-space camera occlusion so back-facing pins are hidden.
 */
function DestinationMarker({ dest, radius, isSelected, onSelect, onHoverChange }) {
  const markerGroupRef = useRef();
  const ringRef = useRef();
  const beaconRef = useRef();
  const headOrbRef = useRef();

  const [hovered, setHovered] = useState(false);
  const [isFacingCamera, setIsFacingCamera] = useState(true);

  // Surface position (R = radius)
  const pos = useMemo(() => latLonToVector3(dest.lat, dest.lon, radius), [dest.lat, dest.lon, radius]);

  // Surface normal pointing directly outwards in local space
  const normal = useMemo(() => new THREE.Vector3(...pos).normalize(), [pos]);

  // Flat ring quaternion (tangent to sphere surface)
  const ringQuaternion = useMemo(() => {
    return new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
  }, [normal]);

  // Cylinder stem quaternion
  const stemQuaternion = useMemo(() => {
    return new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
  }, [normal]);

  // Reusable vectors for zero-alloc per-frame occlusion check
  const vWorldPos = useMemo(() => new THREE.Vector3(), []);
  const vGlobeCenter = useMemo(() => new THREE.Vector3(), []);
  const vWorldNormal = useMemo(() => new THREE.Vector3(), []);
  const vCamDir = useMemo(() => new THREE.Vector3(), []);

  // Animation and occlusion checking on every frame
  useFrame(({ clock, camera }) => {
    if (!markerGroupRef.current) return;

    // 1. Precise World-Space Camera Occlusion
    markerGroupRef.current.getWorldPosition(vWorldPos);

    if (markerGroupRef.current.parent) {
      markerGroupRef.current.parent.getWorldPosition(vGlobeCenter);
    } else {
      vGlobeCenter.set(0, 0, 0);
    }

    // World normal points from globe center to marker world position
    vWorldNormal.subVectors(vWorldPos, vGlobeCenter).normalize();

    // Direction from marker to camera
    vCamDir.subVectors(camera.position, vWorldPos).normalize();

    // Dot product > 0.15 means marker is firmly facing the viewer (front side of globe)
    const dot = vWorldNormal.dot(vCamDir);
    const facing = dot > 0.15;

    if (facing !== isFacingCamera) {
      setIsFacingCamera(facing);
    }

    if (!facing) return;

    // 2. Pulse animations
    const t = clock.getElapsedTime() * 2.4 + (dest.lat % 4);

    // Surface radar ripple expansion
    if (ringRef.current) {
      const scale = 1 + (Math.sin(t) + 1) * 0.45;
      ringRef.current.scale.set(scale, scale, 1);
      if (ringRef.current.material) {
        ringRef.current.material.opacity = Math.max(0.06, 0.6 - (scale - 1) * 0.5);
      }
    }

    // Light beacon pulse
    if (beaconRef.current) {
      const pulse = 1 + Math.sin(t * 1.5) * 0.18;
      beaconRef.current.scale.set(1, pulse, 1);
    }

    // Floating head bob
    if (headOrbRef.current && (hovered || isSelected)) {
      const bob = Math.sin(t * 3) * 0.012;
      headOrbRef.current.position.y = normal.y * 0.08 + bob;
    }
  });

  const handlePointerEnter = (e) => {
    e.stopPropagation();
    if (!isFacingCamera) return;
    setHovered(true);
    document.body.style.cursor = 'pointer';
    if (onHoverChange) onHoverChange(dest, true);
  };

  const handlePointerLeave = (e) => {
    e.stopPropagation();
    setHovered(false);
    document.body.style.cursor = 'auto';
    if (onHoverChange) onHoverChange(dest, false);
  };

  const pinColor = isSelected ? '#FFFFFF' : hovered ? '#F4A261' : '#E07A5F';
  const beaconColor = isSelected ? '#52B788' : hovered ? '#F4A261' : '#34D399';

  return (
    <group ref={markerGroupRef} position={pos} visible={isFacingCamera}>
      {/* 1. Invisible Hit Sphere for Effortless Hover Detection */}
      <mesh
        onPointerOver={handlePointerEnter}
        onPointerOut={handlePointerLeave}
        onClick={(e) => {
          e.stopPropagation();
          if (isFacingCamera) onSelect(dest);
        }}
        position={[normal.x * 0.06, normal.y * 0.06, normal.z * 0.06]}
      >
        <sphereGeometry args={[0.16, 12, 12]} />
        <meshBasicMaterial visible={false} />
      </mesh>

      {/* 2. Shimmering Surface Radar Ripple Ring */}
      <mesh
        ref={ringRef}
        quaternion={ringQuaternion}
        position={[normal.x * 0.003, normal.y * 0.003, normal.z * 0.003]}
      >
        <ringGeometry args={[0.024, 0.04, 24]} />
        <meshBasicMaterial
          color={isSelected ? '#52B788' : '#34D399'}
          transparent
          opacity={0.55}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* 3. Glowing Light Beacon Stem */}
      <mesh
        ref={beaconRef}
        position={[normal.x * 0.04, normal.y * 0.04, normal.z * 0.04]}
        quaternion={stemQuaternion}
      >
        <cylinderGeometry args={[0.003, 0.006, 0.08, 8]} />
        <meshStandardMaterial
          color={beaconColor}
          emissive={beaconColor}
          emissiveIntensity={hovered || isSelected ? 1.6 : 0.8}
          transparent
          opacity={0.85}
        />
      </mesh>

      {/* 4. Glowing Head Orb */}
      <mesh
        ref={headOrbRef}
        position={[normal.x * 0.08, normal.y * 0.08, normal.z * 0.08]}
      >
        <sphereGeometry args={[hovered || isSelected ? 0.044 : 0.024, 14, 14]} />
        <meshStandardMaterial
          color={pinColor}
          emissive={pinColor}
          emissiveIntensity={isSelected ? 1.9 : hovered ? 1.5 : 0.9}
          roughness={0.2}
          metalness={0.15}
        />
      </mesh>

      {/* 5. DYNAMIC HOVER TOOLTIP: ONLY renders when this specific pin is hovered or clicked! */}
      {isFacingCamera && (hovered || isSelected) && (
        <Html
          position={[normal.x * 0.20, normal.y * 0.20, normal.z * 0.20]}
          center
          distanceFactor={8.8}
          zIndexRange={[100, 0]}
        >
          <div
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            onClick={(e) => {
              e.stopPropagation();
              onSelect(dest);
            }}
            className="pointer-events-auto cursor-pointer select-none -translate-y-3 animate-in fade-in zoom-in-95 duration-200"
          >
            <div className="flex flex-col gap-1 p-2.5 rounded-2xl bg-[#03150F]/95 text-white backdrop-blur-xl border border-emerald-400/70 shadow-[0_16px_36px_rgba(0,0,0,0.75)] w-[180px] hover:border-terracotta-400 hover:scale-105 transition-all">
              
              {/* Badge Row */}
              <div className="flex items-center justify-between gap-1">
                <span className="inline-flex items-center gap-1 text-[9px] font-semibold tracking-wider text-emerald-300 uppercase truncate">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_6px_#34d399] shrink-0" />
                  <span className="truncate">{dest.tag || 'Popular Circuit'}</span>
                </span>
                <span className="text-[10px] font-bold text-amber-300 font-mono shrink-0">
                  ★ {dest.rating || '4.9'}
                </span>
              </div>

              {/* Title & Region */}
              <div>
                <h4 className="font-serif text-xs font-bold leading-tight text-white truncate">
                  {dest.name}
                </h4>
                <p className="text-[10px] text-emerald-300/80 font-medium truncate">
                  {dest.region || dest.country}
                </p>
              </div>

              {/* Budget & CTA Row */}
              <div className="flex items-center justify-between pt-1 border-t border-emerald-500/20 mt-0.5">
                <div className="font-mono text-[11px] font-bold text-terracotta-300 truncate">
                  {dest.avgBudget?.split(' ')[0] || dest.avgBudget}
                </div>
                <span className="text-[9px] font-semibold text-emerald-200 hover:text-white flex items-center gap-0.5 shrink-0">
                  Plan Trip →
                </span>
              </div>

            </div>
          </div>
        </Html>
      )}
    </group>
  );
}

export function DestinationPins({ radius = 1.8, selectedDestId, onSelectDestination, onHoverChange }) {
  return (
    <group>
      {DESTINATIONS.map((dest) => (
        <DestinationMarker
          key={dest.id}
          dest={dest}
          radius={radius}
          isSelected={selectedDestId === dest.id}
          onSelect={onSelectDestination}
          onHoverChange={onHoverChange}
        />
      ))}
    </group>
  );
}

export default DestinationPins;
