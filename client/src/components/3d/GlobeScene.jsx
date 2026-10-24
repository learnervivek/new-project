import React, { useRef, useMemo, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { getProceduralEarthTexture } from './textureUtils';
import { FlightArcs } from './FlightArcs';
import { DestinationPins } from './DestinationPins';
import { DESTINATIONS } from './worldData';

export const GLOBE_RADIUS = 1.8;

export function GlobeScene({
  selectedDestId,
  onSelectDestination,
  onHoverDestination,
  prefersReducedMotion = false,
}) {
  const globeGroupRef = useRef();
  const earthMeshRef = useRef();
  const atmosphereRef = useRef();
  const outerHaloRef = useRef();
  const wireframeRef = useRef();
  const starsRef = useRef();
  const orbitControlsRef = useRef();

  const [isHoveredPin, setIsHoveredPin] = useState(false);
  const mouseParallax = useRef({ x: 0, y: 0 });

  // Target rotation for programmatic focus on clicked destination
  const targetRotation = useRef({ x: 0.30, y: -2.85, active: false });

  const earthTexture = useMemo(() => getProceduralEarthTexture(), []);

  // Compute target rotation when a destination is selected
  useEffect(() => {
    if (!selectedDestId) {
      targetRotation.current.active = false;
      return;
    }
    const dest = DESTINATIONS.find((d) => d.id === selectedDestId);
    if (dest) {
      const theta = (dest.lon + 180) * (Math.PI / 180);
      const targetY = -theta + Math.PI / 2;
      const targetX = THREE.MathUtils.degToRad(Math.max(10, Math.min(35, dest.lat * 0.75)));
      
      targetRotation.current = {
        x: targetX,
        y: targetY,
        active: true,
      };
    }
  }, [selectedDestId]);

  // Ambient Starfield Constellation Particles
  const starPositions = useMemo(() => {
    const count = 180;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const radius = 6.0 + Math.random() * 5.0;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);
    }
    return positions;
  }, []);

  // Track mouse coordinates for dynamic 3D banking & parallax tilt
  useEffect(() => {
    const handleMouseMove = (e) => {
      const x = (e.clientX / window.innerWidth) * 2 - 1;
      const y = -(e.clientY / window.innerHeight) * 2 + 1;
      mouseParallax.current = { x: x * 0.1, y: y * 0.08 };
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Smooth frame loop
  useFrame((state, delta) => {
    // Subtle star twinkle rotation
    if (starsRef.current) {
      starsRef.current.rotation.y += 0.0002;
    }

    // Gentle wireframe counter-rotation for rich depth
    if (wireframeRef.current) {
      wireframeRef.current.rotation.y += 0.0006;
    }

    if (globeGroupRef.current) {
      // If a specific destination was chosen, smoothly glide towards it
      if (targetRotation.current.active && !prefersReducedMotion) {
        globeGroupRef.current.rotation.y = THREE.MathUtils.lerp(
          globeGroupRef.current.rotation.y,
          targetRotation.current.y,
          0.05
        );
        globeGroupRef.current.rotation.x = THREE.MathUtils.lerp(
          globeGroupRef.current.rotation.x,
          targetRotation.current.x,
          0.05
        );
      } else if (!prefersReducedMotion) {
        // Dynamic mouse parallax tilt on the entire group
        globeGroupRef.current.rotation.x = THREE.MathUtils.lerp(
          globeGroupRef.current.rotation.x,
          0.30 + mouseParallax.current.y * 0.15,
          0.04
        );
      }
    }
  });

  const handlePinHover = (dest, isHovering) => {
    setIsHoveredPin(isHovering);
    if (onHoverDestination) {
      onHoverDestination(isHovering ? dest : null);
    }
  };

  return (
    <>
      {/* Velvety, High-Contrast Atmospheric Lighting (No harsh plastic reflections) */}
      <ambientLight intensity={1.3} color="#FAF8F5" />
      <directionalLight position={[3, 4, 5]} intensity={1.1} color="#FFFFFF" />
      <directionalLight position={[-4, 2, -3]} intensity={0.8} color="#34D399" />
      <pointLight position={[0, -3, 3]} intensity={0.4} color="#F4A261" />

      {/* OrbitControls for smooth, organic 3D rotation */}
      <OrbitControls
        ref={orbitControlsRef}
        enableZoom={false}
        enablePan={false}
        rotateSpeed={0.8}
        dampingFactor={0.06}
        enableDamping
        autoRotate={!isHoveredPin && !selectedDestId && !prefersReducedMotion}
        autoRotateSpeed={0.6}
        minPolarAngle={Math.PI * 0.28}
        maxPolarAngle={Math.PI * 0.72}
      />

      {/* Ambient Star Particles */}
      <points ref={starsRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[starPositions, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.032}
          color="#FAF8F5"
          transparent
          opacity={0.4}
          sizeAttenuation
        />
      </points>

      {/* Main Interactive Globe Group */}
      <group
        ref={globeGroupRef}
        rotation={[0.30, -2.85, 0]} // Initial orientation showcasing India centered
      >
        {/* Layer 1: Core Textured Earth Sphere (Velvety Matte Obsidian) */}
        <mesh ref={earthMeshRef}>
          <sphereGeometry args={[GLOBE_RADIUS, 64, 64]} />
          <meshStandardMaterial
            map={earthTexture}
            roughness={0.72}
            metalness={0.05}
            emissive="#04150e"
            emissiveIntensity={0.35}
          />
        </mesh>

        {/* Layer 2: Shimmering Wireframe Matrix Shell */}
        <mesh ref={wireframeRef}>
          <sphereGeometry args={[GLOBE_RADIUS * 1.012, 36, 36]} />
          <meshBasicMaterial
            color="#34D399"
            wireframe
            transparent
            opacity={0.04}
          />
        </mesh>

        {/* Layer 3: Inner Atmospheric Glow Halo */}
        <mesh ref={atmosphereRef}>
          <sphereGeometry args={[GLOBE_RADIUS * 1.045, 48, 48]} />
          <meshBasicMaterial
            color="#34D399"
            transparent
            opacity={0.12}
            side={THREE.BackSide}
          />
        </mesh>

        {/* Layer 4: Outer Exosphere Radiance */}
        <mesh ref={outerHaloRef}>
          <sphereGeometry args={[GLOBE_RADIUS * 1.08, 36, 36]} />
          <meshBasicMaterial
            color="#52B788"
            transparent
            opacity={0.04}
            side={THREE.BackSide}
          />
        </mesh>

        {/* Layer 5: Animated Flight Arcs with Traveling Light Particles */}
        <FlightArcs
          radius={GLOBE_RADIUS}
          selectedDestId={selectedDestId}
        />

        {/* Layer 6: Interactive Destination Pins with Dynamic Hover Place Names */}
        <DestinationPins
          radius={GLOBE_RADIUS}
          selectedDestId={selectedDestId}
          onSelectDestination={onSelectDestination}
          onHoverChange={handlePinHover}
        />
      </group>
    </>
  );
}

export default GlobeScene;
