import * as THREE from 'three';

let cachedEarthTexture = null;

/**
 * Procedurally creates an ultra-detailed, high-tech luxury Earth texture for TripTally.
 * Inspired by NASA Night Lights, Stripe Globe, and Aisol Dot Globe aesthetics.
 * Zero external image dependencies, instant 60fps load, crisp high-res 2048x1024 canvas.
 */
export function getProceduralEarthTexture() {
  if (cachedEarthTexture) {
    return cachedEarthTexture;
  }

  const width = 2048;
  const height = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    return new THREE.Texture();
  }

  // -------------------------------------------------------------
  // 1. Deep Midnight Oceanic Background with Warm Obsidian Radial Glow
  // -------------------------------------------------------------
  const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
  bgGrad.addColorStop(0, '#020705');
  bgGrad.addColorStop(0.3, '#04100c');
  bgGrad.addColorStop(0.5, '#061711');
  bgGrad.addColorStop(0.7, '#04100c');
  bgGrad.addColorStop(1, '#020705');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Radial soft glow centered over Indian Ocean / South Asia (lon ~78°, lat ~15°)
  const [indX, indY] = [((78 + 180) / 360) * width, ((90 - 15) / 180) * height];
  const indGlow = ctx.createRadialGradient(indX, indY, 40, indX, indY, 650);
  indGlow.addColorStop(0, 'rgba(52, 211, 153, 0.12)');
  indGlow.addColorStop(0.5, 'rgba(16, 52, 38, 0.05)');
  indGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = indGlow;
  ctx.fillRect(0, 0, width, height);

  // Helper: Convert [lon, lat] to canvas pixel [x, y]
  const toCanvas = (lon, lat) => [
    ((lon + 180) / 360) * width,
    ((90 - lat) / 180) * height,
  ];

  // -------------------------------------------------------------
  // 2. High-Tech Precision Coordinate Grid
  // -------------------------------------------------------------
  // Latitudes
  ctx.lineWidth = 1;
  for (let lat = -80; lat <= 80; lat += 20) {
    const y = ((90 - lat) / 180) * height;
    ctx.strokeStyle = lat === 0 ? 'rgba(244, 162, 97, 0.28)' : 'rgba(82, 183, 136, 0.07)';
    ctx.lineWidth = lat === 0 ? 1.8 : 0.8;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  // Longitudes
  for (let lon = -180; lon <= 180; lon += 30) {
    const x = ((lon + 180) / 360) * width;
    ctx.strokeStyle = lon === 0 ? 'rgba(52, 211, 153, 0.18)' : 'rgba(82, 183, 136, 0.07)';
    ctx.lineWidth = lon === 0 ? 1.5 : 0.8;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }

  // Tropic of Cancer (23.5° N) — Passes through India
  const tropicY = ((90 - 23.44) / 180) * height;
  ctx.strokeStyle = 'rgba(224, 122, 95, 0.35)';
  ctx.lineWidth = 1.2;
  ctx.setLineDash([8, 8]);
  ctx.beginPath();
  ctx.moveTo(0, tropicY);
  ctx.lineTo(width, tropicY);
  ctx.stroke();
  ctx.setLineDash([]);

  // -------------------------------------------------------------
  // 3. Smooth Landmass Drawing with Dot-Matrix Interior
  // -------------------------------------------------------------
  const drawLandmass = (
    coords,
    fillColor = '#0b261b',
    strokeColor = '#34d399',
    glowColor = 'rgba(52, 211, 153, 0.35)',
    dotDensity = 8
  ) => {
    if (!coords || coords.length < 3) return;

    ctx.save();
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 10;

    // Draw smooth curved coastline
    ctx.beginPath();
    const pts = coords.map(([lon, lat]) => toCanvas(lon, lat));
    ctx.moveTo(pts[0][0], pts[0][1]);

    for (let i = 1; i < pts.length; i++) {
      const prev = pts[i - 1];
      const curr = pts[i];
      const midX = (prev[0] + curr[0]) / 2;
      const midY = (prev[1] + curr[1]) / 2;
      ctx.quadraticCurveTo(prev[0], prev[1], midX, midY);
    }
    ctx.lineTo(pts[pts.length - 1][0], pts[pts.length - 1][1]);
    ctx.closePath();

    ctx.fillStyle = fillColor;
    ctx.fill();

    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 1.8;
    ctx.stroke();
    ctx.restore();

    // High-tech dot-matrix filling inside the landmass
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) {
      const prev = pts[i - 1];
      const curr = pts[i];
      const midX = (prev[0] + curr[0]) / 2;
      const midY = (prev[1] + curr[1]) / 2;
      ctx.quadraticCurveTo(prev[0], prev[1], midX, midY);
    }
    ctx.closePath();
    ctx.clip();

    const minX = Math.min(...pts.map((p) => p[0]));
    const maxX = Math.max(...pts.map((p) => p[0]));
    const minY = Math.min(...pts.map((p) => p[1]));
    const maxY = Math.max(...pts.map((p) => p[1]));

    ctx.fillStyle = 'rgba(52, 211, 153, 0.22)';
    for (let gx = minX; gx <= maxX; gx += dotDensity) {
      for (let gy = minY; gy <= maxY; gy += dotDensity) {
        ctx.beginPath();
        ctx.arc(gx, gy, 1.1, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  };

  // -------------------------------------------------------------
  // Continents Detailed Outlines
  // -------------------------------------------------------------

  // Eurasia (Mainland)
  drawLandmass(
    [
      [-9, 36], [0, 43], [12, 44], [25, 41], [35, 36], [42, 38], [55, 42],
      [68, 55], [75, 72], [105, 76], [140, 72], [170, 68], [165, 58],
      [145, 50], [130, 42], [122, 32], [108, 22], [103, 10], [98, 8],
      [90, 22], [68, 24], [58, 24], [45, 13], [35, 28], [32, 31],
      [28, 41], [22, 54], [15, 58], [5, 53], [-4, 48], [-9, 36]
    ],
    '#0d281e',
    '#2d6a4f',
    'rgba(45, 106, 79, 0.25)',
    10
  );

  // Scandinavia & UK
  drawLandmass([
    [5, 58], [10, 63], [18, 71], [28, 70], [22, 60], [15, 55], [5, 58]
  ], '#0e2b20', '#34d399', 'rgba(52, 211, 153, 0.25)', 8);

  drawLandmass([
    [-5, 50], [0, 52], [2, 56], [-3, 58], [-6, 56], [-4, 52], [-5, 50]
  ], '#0e2b20', '#34d399', 'rgba(52, 211, 153, 0.25)', 6);

  // Africa
  drawLandmass(
    [
      [-17, 32], [-5, 36], [12, 38], [25, 32], [32, 31], [43, 12],
      [51, 11], [40, -10], [33, -28], [26, -34], [18, -34], [12, -18],
      [9, 4], [-15, 12], [-17, 21], [-17, 32]
    ],
    '#0b231a',
    '#2d6a4f',
    'rgba(45, 106, 79, 0.25)',
    10
  );

  // Madagascar
  drawLandmass([
    [44, -12], [50, -15], [47, -25], [44, -25], [44, -12]
  ], '#0e2b20', '#34d399', 'rgba(52,211,153,0.2)', 6);

  // North America
  drawLandmass(
    [
      [-168, 65], [-140, 70], [-100, 72], [-65, 60], [-55, 48],
      [-70, 42], [-75, 35], [-81, 25], [-97, 26], [-90, 16],
      [-83, 9], [-77, 8], [-82, 15], [-105, 20], [-115, 30],
      [-124, 40], [-130, 52], [-160, 58], [-168, 65]
    ],
    '#0c251c',
    '#2d6a4f',
    'rgba(45, 106, 79, 0.25)',
    10
  );

  // South America
  drawLandmass(
    [
      [-77, 8], [-60, 10], [-50, 0], [-35, -5], [-38, -15],
      [-50, -30], [-65, -55], [-75, -50], [-70, -35], [-78, -15],
      [-81, -5], [-77, 8]
    ],
    '#0c251c',
    '#2d6a4f',
    'rgba(45, 106, 79, 0.25)',
    10
  );

  // Australia & New Zealand
  drawLandmass(
    [
      [114, -22], [125, -15], [138, -12], [148, -20], [153, -28],
      [150, -38], [138, -36], [128, -32], [116, -35], [113, -25], [114, -22]
    ],
    '#0b231a',
    '#2d6a4f',
    'rgba(45, 106, 79, 0.25)',
    9
  );

  drawLandmass([
    [172, -35], [178, -38], [174, -42], [172, -35]
  ], '#0e2b20', '#34d399', 'rgba(52,211,153,0.2)', 6);

  // Southeast Asia & Indonesia
  drawLandmass([
    [98, 8], [104, 2], [108, -7], [115, -8], [120, -5],
    [128, -8], [114, -9], [105, -5], [96, 5], [98, 8]
  ], '#0e2b20', '#34d399', 'rgba(52,211,153,0.25)', 7);

  // Japan
  drawLandmass([
    [130, 32], [135, 35], [141, 41], [142, 44], [139, 37], [130, 32]
  ], '#0e2b20', '#34d399', 'rgba(52,211,153,0.25)', 5);

  // -------------------------------------------------------------
  // 4. PREMIER INDIAN SUBCONTINENT HIGHLIGHT (Masterpiece Focus)
  // Radiant Emerald Landmass with Warm Gold and Terracotta Coastlines
  // -------------------------------------------------------------
  drawLandmass(
    [
      [68.5, 23.8], // Kutch
      [71.5, 21.2], // Kathiawar
      [72.8, 19.1], // Mumbai Coast
      [73.8, 15.4], // Goa Coast
      [75.2, 12.0], // Mangalore / Malabar
      [76.3, 9.5],  // Kerala / Alleppey
      [77.5, 8.1],  // Kanyakumari Tip
      [79.8, 11.9], // Tamil Nadu / Pondicherry
      [80.3, 13.1], // Chennai
      [83.3, 17.7], // Visakhapatnam / Andhra
      [86.8, 21.0], // Odisha / Puri
      [88.8, 21.8], // Sundarbans / Bengal Delta
      [91.8, 24.5], // Meghalaya Hills
      [95.5, 27.5], // Assam Brahmaputra
      [92.5, 27.0], // Bhutan Border
      [88.3, 27.3], // Sikkim / Darjeeling
      [83.5, 28.5], // Nepal Himalayas
      [79.5, 30.5], // Uttarakhand (Rishikesh / Garhwal)
      [77.2, 32.2], // Himachal Pradesh (Manali / Solang)
      [75.5, 34.2], // Kashmir (Srinagar / Gulmarg)
      [77.6, 34.4], // Ladakh / Karakoram
      [74.2, 31.8], // Punjab
      [70.5, 27.2], // Thar Desert / Rajasthan (Jaipur)
      [68.5, 23.8], // Loop back to Kutch
    ],
    '#134332',
    '#52b788',
    'rgba(82, 183, 136, 0.65)',
    6 // denser dot matrix
  );

  // -------------------------------------------------------------
  // 5. NASA-Style Night City Lights (Warm Golden & Mint Constellations)
  // -------------------------------------------------------------
  const nightLights = [
    // Major Indian Population Corridors (High density)
    { lon: 77.2, lat: 28.6, r: 6, c: '#F4A261' }, // Delhi NCR
    { lon: 75.8, lat: 26.9, r: 4, c: '#E07A5F' }, // Jaipur
    { lon: 72.8, lat: 19.1, r: 5.5, c: '#F4A261' }, // Mumbai
    { lon: 73.8, lat: 18.5, r: 4, c: '#F4A261' }, // Pune
    { lon: 72.6, lat: 23.0, r: 4.5, c: '#F4A261' }, // Ahmedabad
    { lon: 77.6, lat: 12.9, r: 5, c: '#F4A261' }, // Bangalore
    { lon: 78.5, lat: 17.4, r: 4.5, c: '#F4A261' }, // Hyderabad
    { lon: 80.2, lat: 13.0, r: 4.5, c: '#F4A261' }, // Chennai
    { lon: 76.3, lat: 9.9, r: 3.5, c: '#34D399' }, // Kochi / Kerala
    { lon: 88.3, lat: 22.6, r: 5, c: '#F4A261' }, // Kolkata
    { lon: 80.9, lat: 26.8, r: 4, c: '#F4A261' }, // Lucknow / Kanpur
    { lon: 83.0, lat: 25.3, r: 3.5, c: '#E07A5F' }, // Varanasi
    { lon: 74.8, lat: 31.6, r: 3.5, c: '#F4A261' }, // Amritsar
    { lon: 74.8, lat: 34.1, r: 3, c: '#34D399' }, // Srinagar
    { lon: 77.2, lat: 32.2, r: 2.8, c: '#34D399' }, // Manali
    { lon: 74.1, lat: 15.3, r: 3.5, c: '#34D399' }, // Goa
    { lon: 91.9, lat: 25.6, r: 3, c: '#34D399' }, // Shillong

    // Key Global Flight Hubs
    { lon: 55.3, lat: 25.2, r: 5, c: '#F4A261' }, // Dubai
    { lon: 103.8, lat: 1.3, r: 4.5, c: '#34D399' }, // Singapore
    { lon: 100.5, lat: 13.7, r: 4, c: '#34D399' }, // Bangkok
    { lon: 139.7, lat: 35.7, r: 5, c: '#F4A261' }, // Tokyo
    { lon: 121.5, lat: 31.2, r: 5, c: '#F4A261' }, // Shanghai
    { lon: -0.1, lat: 51.5, r: 4.5, c: '#F4A261' }, // London
    { lon: 2.3, lat: 48.8, r: 4, c: '#F4A261' }, // Paris
    { lon: -74.0, lat: 40.7, r: 5, c: '#F4A261' }, // New York
  ];

  for (const light of nightLights) {
    const [cx, cy] = toCanvas(light.lon, light.lat);

    // Soft outer glow halo
    const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, light.r * 2.5);
    glow.addColorStop(0, light.c === '#34D399' ? 'rgba(52, 211, 153, 0.7)' : 'rgba(244, 162, 97, 0.7)');
    glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy, light.r * 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Intense star core
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(cx, cy, light.r * 0.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Generate Three.js texture with high filtering quality
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.minFilter = THREE.LinearMipMapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;

  cachedEarthTexture = texture;
  return cachedEarthTexture;
}
