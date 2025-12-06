// =====================================================
// SCENE SETUP
// =====================================================
const scene = new THREE.Scene();

// Realistic sky gradient background
const skyColor = 0x87ceeb; // Light blue
const horizonColor = 0xe0f2ff; // Lighter blue near horizon
scene.background = new THREE.Color(skyColor);

// Enhanced fog for atmospheric depth
scene.fog = new THREE.FogExp2(0xd4e8f5, 0.008);

// Camera
const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(30, 15, 30);
camera.lookAt(0, 0, 0);

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.getElementById("canvas-container").appendChild(renderer.domElement);

// OrbitControls
const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.maxPolarAngle = Math.PI / 2.1;
controls.minDistance = 10;
controls.maxDistance = 100;

// =====================================================
// LIGHTING
// =====================================================
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(50, 50, 50);
directionalLight.castShadow = true;
directionalLight.shadow.camera.left = -50;
directionalLight.shadow.camera.right = 50;
directionalLight.shadow.camera.top = 50;
directionalLight.shadow.camera.bottom = -50;
directionalLight.shadow.mapSize.width = 2048;
directionalLight.shadow.mapSize.height = 2048;
scene.add(directionalLight);

// =====================================================
// SKY & ATMOSPHERIC EFFECTS
// =====================================================

// Create realistic sky dome with gradient
const skyGeometry = new THREE.SphereGeometry(450, 32, 32);
const skyMaterial = new THREE.ShaderMaterial({
  uniforms: {
    topColor: { value: new THREE.Color(0x0077be) },
    bottomColor: { value: new THREE.Color(0xe0f2ff) },
    offset: { value: 33 },
    exponent: { value: 0.6 },
  },
  vertexShader: `
    varying vec3 vWorldPosition;
    void main() {
      vec4 worldPosition = modelMatrix * vec4(position, 1.0);
      vWorldPosition = worldPosition.xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform vec3 topColor;
    uniform vec3 bottomColor;
    uniform float offset;
    uniform float exponent;
    varying vec3 vWorldPosition;
    void main() {
      float h = normalize(vWorldPosition + offset).y;
      gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
    }
  `,
  side: THREE.BackSide,
});
const sky = new THREE.Mesh(skyGeometry, skyMaterial);
scene.add(sky);

// Cloud system - multiple cloud layers for realism
const clouds = [];
const cloudGroup = new THREE.Group();

function createCloud(x, y, z, scale) {
  const cloudGeometry = new THREE.SphereGeometry(1, 8, 8);
  const cloudMaterial = new THREE.MeshLambertMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.7,
  });

  const cloud = new THREE.Group();

  // Create fluffy cloud shape with multiple spheres
  for (let i = 0; i < 5; i++) {
    const puff = new THREE.Mesh(cloudGeometry, cloudMaterial);
    puff.position.x = Math.random() * 2 - 1;
    puff.position.y = Math.random() * 0.5;
    puff.position.z = Math.random() * 2 - 1;
    puff.scale.set(
      0.5 + Math.random() * 0.8,
      0.4 + Math.random() * 0.5,
      0.5 + Math.random() * 0.8
    );
    cloud.add(puff);
  }

  cloud.position.set(x, y, z);
  cloud.scale.set(scale, scale, scale);

  // Store speed and direction for animation
  cloud.userData.speed = 0.01 + Math.random() * 0.02;
  cloud.userData.startX = x;

  return cloud;
}

// Generate clouds at various heights and positions
for (let i = 0; i < 5; i++) {
  const x = (Math.random() - 0.5) * 200;
  const y = 20 + Math.random() * 30;
  const z = (Math.random() - 0.5) * 200;
  const scale = 3 + Math.random() * 4;

  const cloud = createCloud(x, y, z, scale);
  clouds.push(cloud);
  cloudGroup.add(cloud);
}

scene.add(cloudGroup);

// =====================================================
// TERRAIN GENERATION (High Detail Procedural Beach & Land)
// =====================================================
// Resolution: 200x200 segments = 40,401 vertices for smooth detailed surface
const terrainGeometry = new THREE.PlaneGeometry(100, 100, 200, 200);
terrainGeometry.rotateX(-Math.PI / 2);

// Modify vertices to create detailed sloping beach with natural features
const vertices = terrainGeometry.attributes.position.array;
const colors = [];

for (let i = 0; i < vertices.length; i += 3) {
  const x = vertices[i];
  const z = vertices[i + 2];

  // Create slope: lower near negative Z (ocean), higher toward positive Z (land)
  let height = 0;

  // Beach slope zone with natural variation
  if (z < -10) {
    // Ocean floor - subtle underwater terrain
    height = -2 + Math.sin(x * 0.2) * 0.3 + Math.cos(z * 0.15) * 0.2;
  } else if (z < 10) {
    // Gentle beach slope with ripples and sand patterns
    height = (z + 10) * 0.15;
    // Add sand ripples (small waves pattern on beach)
    height += Math.sin(x * 0.5) * 0.08;
    height += Math.cos(z * 0.8) * 0.05;
  } else {
    // Land with hills, valleys, and natural terrain variation
    height = 3;

    // Check if on road - make it flat and smooth (extend to z = 50, the edge)
    const isOnRoad = Math.abs(x) < 5 && z > 12 && z < 50;

    if (!isOnRoad) {
      // Only add terrain variation outside road area
      // Large hills
      height += Math.sin(x * 0.1) * 0.8;
      height += Math.cos(z * 0.08) * 0.6;

      // Small bumps and details
      height += Math.sin(x * 0.3 + z * 0.2) * 0.3;
      height += Math.cos(x * 0.25) * 0.2;

      // Fine detail noise
      height += (Math.random() - 0.5) * 0.15;
    }
  }

  vertices[i + 1] = height;

  // Enhanced vertex colors with road, road markings, and sidewalk (extend to z = 50)
  const isOnRoad = Math.abs(x) < 5 && z > 12 && z < 50;
  const isOnSidewalk =
    Math.abs(x) >= 5 && Math.abs(x) < 6.5 && z > 12 && z < 50;
  const isRoadCenter = Math.abs(x) < 0.15 && z > 12 && z < 50;
  const isRoadEdge = Math.abs(x) >= 4.8 && Math.abs(x) < 5 && z > 12 && z < 50;

  // Road markings - dashed center line
  const dashPattern = Math.floor(z / 2) % 2 === 0;
  const isRoadDash = isRoadCenter && dashPattern;

  if (isRoadDash) {
    // Yellow/white center line dashes
    colors.push(0.95, 0.9, 0.1);
  } else if (isRoadEdge) {
    // White edge lines
    colors.push(0.9, 0.9, 0.9);
  } else if (isOnRoad) {
    // Road (dark gray asphalt)
    colors.push(0.3, 0.3, 0.32);
  } else if (isOnSidewalk) {
    // Sidewalk (light gray concrete)
    colors.push(0.6, 0.6, 0.62);
  } else if (height < 0) {
    // Dark sand underwater
    colors.push(0.85, 0.75, 0.6);
  } else if (height < 0.5) {
    // Light sand color
    colors.push(0.96, 0.87, 0.7);
  } else if (height < 1.5) {
    // Sand to grass transition
    const t = (height - 0.5) / 1.0;
    colors.push(0.96 - t * 0.46, 0.87 - t * 0.17, 0.7 - t * 0.3);
  } else if (height < 3) {
    // Grass
    colors.push(0.4, 0.65, 0.3);
  } else {
    // Dark grass/concrete on higher areas
    colors.push(0.35, 0.55, 0.25);
  }
}

terrainGeometry.setAttribute(
  "color",
  new THREE.Float32BufferAttribute(colors, 3)
);
terrainGeometry.computeVertexNormals();

const terrainMaterial = new THREE.MeshLambertMaterial({
  vertexColors: true,
  side: THREE.DoubleSide,
});

const terrain = new THREE.Mesh(terrainGeometry, terrainMaterial);
terrain.receiveShadow = true;
scene.add(terrain);

// =====================================================
// TERRAIN SIDES & BOTTOM (Make it 3D like a solid block)
// =====================================================
const TERRAIN_DEPTH = 10; // Ketebalan/kedalaman terrain
const sideMaterial = new THREE.MeshLambertMaterial({ color: 0x8b7355 }); // Brown color

// Helper function to create a terrain side wall that follows the terrain edge
function createTerrainSide(segments, isHorizontal, xPos, zPos, width) {
  const geometry = new THREE.BufferGeometry();
  const positions = [];
  const indices = [];
  const colors = [];

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    let x, z;

    if (isHorizontal) {
      x = -width / 2 + t * width;
      z = zPos;
    } else {
      x = xPos;
      z = -width / 2 + t * width;
    }

    // Get terrain height at this position
    let topHeight;
    if (z < -10) {
      topHeight = -2 + Math.sin(x * 0.2) * 0.3 + Math.cos(z * 0.15) * 0.2;
    } else if (z < 10) {
      topHeight = (z + 10) * 0.15;
      topHeight += Math.sin(x * 0.5) * 0.08;
      topHeight += Math.cos(z * 0.8) * 0.05;
    } else {
      topHeight = 3;
      topHeight += Math.sin(x * 0.1) * 0.8;
      topHeight += Math.cos(z * 0.08) * 0.6;
      topHeight += Math.sin(x * 0.3 + z * 0.2) * 0.3;
      topHeight += Math.cos(x * 0.25) * 0.2;
    }

    const bottomHeight = -TERRAIN_DEPTH;

    // Top vertex
    positions.push(x, topHeight, z);
    // Bottom vertex
    positions.push(x, bottomHeight, z);

    // Colors (match terrain colors)
    if (topHeight < 0) {
      colors.push(0.85, 0.75, 0.6, 0.85, 0.75, 0.6);
    } else if (topHeight < 0.5) {
      colors.push(0.96, 0.87, 0.7, 0.96, 0.87, 0.7);
    } else if (topHeight < 1.5) {
      const t = (topHeight - 0.5) / 1.0;
      const r = 0.96 - t * 0.46;
      const g = 0.87 - t * 0.17;
      const b = 0.7 - t * 0.3;
      colors.push(r, g, b, r, g, b);
    } else if (topHeight < 3) {
      colors.push(0.4, 0.65, 0.3, 0.4, 0.65, 0.3);
    } else {
      colors.push(0.35, 0.55, 0.25, 0.35, 0.55, 0.25);
    }
  }

  // Create triangles
  for (let i = 0; i < segments; i++) {
    const topLeft = i * 2;
    const bottomLeft = i * 2 + 1;
    const topRight = (i + 1) * 2;
    const bottomRight = (i + 1) * 2 + 1;

    // Two triangles per segment
    indices.push(topLeft, bottomLeft, topRight);
    indices.push(topRight, bottomLeft, bottomRight);
  }

  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3)
  );
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  const material = new THREE.MeshLambertMaterial({
    vertexColors: true,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.receiveShadow = true;
  return mesh;
}

// Front side (ocean facing, z = -50)
const frontMesh = createTerrainSide(200, true, 0, -50, 100);
scene.add(frontMesh);

// Back side (land side, z = 50)
const backMesh = createTerrainSide(200, true, 0, 50, 100);
scene.add(backMesh);

// Left side (x = -50)
const leftMesh = createTerrainSide(200, false, -50, 0, 100);
scene.add(leftMesh);

// Right side (x = 50)
const rightMesh = createTerrainSide(200, false, 50, 0, 100);
scene.add(rightMesh);

// Bottom
const bottomGeometry = new THREE.PlaneGeometry(100, 100);
bottomGeometry.rotateX(Math.PI / 2);
const bottomMesh = new THREE.Mesh(bottomGeometry, sideMaterial);
bottomMesh.position.y = -TERRAIN_DEPTH;
bottomMesh.receiveShadow = true;
scene.add(bottomMesh);

// =====================================================
// HELPER FUNCTION: Get terrain height at position
// =====================================================
function getTerrainHeightAt(x, z) {
  // Use raycaster to get exact terrain height
  const raycaster = new THREE.Raycaster();
  const origin = new THREE.Vector3(x, 100, z);
  const direction = new THREE.Vector3(0, -1, 0);
  raycaster.set(origin, direction);

  const intersects = raycaster.intersectObject(terrain);
  if (intersects.length > 0) {
    return intersects[0].point.y;
  }

  // Fallback calculation if raycasting fails
  if (z < -10) {
    return -2 + Math.sin(x * 0.2) * 0.3 + Math.cos(z * 0.15) * 0.2;
  } else if (z < 10) {
    let height = (z + 10) * 0.15;
    height += Math.sin(x * 0.5) * 0.08;
    height += Math.cos(z * 0.8) * 0.05;
    return height;
  } else {
    let height = 3;
    height += Math.sin(x * 0.1) * 0.8;
    height += Math.cos(z * 0.08) * 0.6;
    height += Math.sin(x * 0.3 + z * 0.2) * 0.3;
    height += Math.cos(x * 0.25) * 0.2;
    return height;
  }
}

// =====================================================
// LOAD OBJ MODELS AND TEXTURES
// =====================================================
const objLoader = new THREE.OBJLoader();
const textureLoader = new THREE.TextureLoader();

let treeModel = null;
let cottageModel = null;
let apartmentModel = null;

let treeTexture = null;
let cottageTexture = null;
let apartmentTexture = null;

const loadedObjects = [];

// Load textures
treeTexture = textureLoader.load("assets/texture-tree.png");
cottageTexture = textureLoader.load("assets/texture-cottage.png");
apartmentTexture = textureLoader.load("assets/texture-apartment.png");

// =====================================================
// TREES, COTTAGES, AND APARTMENTS PLACEMENT
// =====================================================
const trees = [];
const buildings = [];

// Function to apply texture to loaded model
function applyTextureToModel(object, texture) {
  object.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.material = new THREE.MeshLambertMaterial({ map: texture });
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
}

// Load and place tree models (3 trees)
objLoader.load(
  "assets/tree.obj",
  (object) => {
    treeModel = object;
    applyTextureToModel(treeModel, treeTexture);

    const treePositions = [
      { x: -20, z: 20 },
      { x: 40, z: 25 },
      { x: -40, z: 35 },
    ];

    treePositions.forEach((pos) => {
      const tree = treeModel.clone();
      const scale = 15.0; // Large scale
      tree.scale.set(scale, scale, scale);

      const terrainHeight = getTerrainHeightAt(pos.x, pos.z);
      tree.position.set(pos.x, terrainHeight, pos.z);

      trees.push(tree);
      loadedObjects.push(tree);
      scene.add(tree);
    });
  },
  undefined,
  (error) => console.error("Error loading tree model:", error)
);

// Load and place cottage models (2 cottages)
objLoader.load(
  "assets/cottage.obj",
  (object) => {
    cottageModel = object;
    applyTextureToModel(cottageModel, cottageTexture);

    const cottagePositions = [
      { x: -25, z: 38, rotation: (Math.PI * 3) / 4 },
      { x: 15, z: 17, rotation: (Math.PI * 6) / 4 },
    ];

    cottagePositions.forEach((pos) => {
      const cottage = cottageModel.clone();
      const scale = 20.0; // Large scale
      cottage.scale.set(scale, scale, scale);
      cottage.rotation.y = pos.rotation;

      const terrainHeight = getTerrainHeightAt(pos.x, pos.z);
      cottage.position.set(pos.x, terrainHeight, pos.z);

      buildings.push(cottage);
      loadedObjects.push(cottage);
      scene.add(cottage);
    });
  },
  undefined,
  (error) => console.error("Error loading cottage model:", error)
);

// Load and place apartment model (1 apartment)
objLoader.load(
  "assets/apartment.obj",
  (object) => {
    apartmentModel = object;
    applyTextureToModel(apartmentModel, apartmentTexture);

    const apartment = apartmentModel.clone();
    const scale = 30.0; // Very large scale
    apartment.scale.set(-scale, scale, scale);
    apartment.rotation.y = Math.PI;

    const terrainHeight = getTerrainHeightAt(18, 38);
    apartment.position.set(18, terrainHeight, 38);

    buildings.push(apartment);
    loadedObjects.push(apartment);
    scene.add(apartment);
  },
  undefined,
  (error) => console.error("Error loading apartment model:", error)
);

// Buildings array is now populated by OBJ loader above

// =====================================================
// WATER PLANE (Animated Ocean - Front Beach Only)
// =====================================================
// Water hanya di bagian depan (pantai), tapi cukup luas untuk membanjiri kota
// Width: 100 (sama dengan terrain), Depth: 100 (cukup untuk cover seluruh area)
const waterGeometry = new THREE.PlaneGeometry(100, 100, 100, 100);
waterGeometry.rotateX(-Math.PI / 2);

// Store original positions for wave animation
const waterVertices = waterGeometry.attributes.position.array;
const originalWaterPositions = waterVertices.slice();

// Advanced water shader for realistic ocean effect
const waterMaterial = new THREE.ShaderMaterial({
  uniforms: {
    time: { value: 0.0 },
    waterColor: { value: new THREE.Color(0x0077be) },
    deepWaterColor: { value: new THREE.Color(0x003355) },
    foamColor: { value: new THREE.Color(0xffffff) },
    sunDirection: { value: new THREE.Vector3(0.5, 0.5, 0.5).normalize() },
  },
  vertexShader: `
    varying vec3 vNormal;
    varying vec3 vPosition;
    varying vec3 vWorldPosition;
    varying float vElevation;
    
    void main() {
      vNormal = normalize(normalMatrix * normal);
      vec4 worldPos = modelMatrix * vec4(position, 1.0);
      vWorldPosition = worldPos.xyz;
      vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
      vElevation = position.y;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float time;
    uniform vec3 waterColor;
    uniform vec3 deepWaterColor;
    uniform vec3 foamColor;
    uniform vec3 sunDirection;
    
    varying vec3 vNormal;
    varying vec3 vPosition;
    varying vec3 vWorldPosition;
    varying float vElevation;
    
    void main() {
      // Calculate view direction using built-in cameraPosition
      vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
      
      // Fresnel effect for realistic water reflection
      float fresnel = pow(1.0 - max(dot(viewDirection, vNormal), 0.0), 3.0);
      
      // Mix between shallow and deep water color based on depth
      vec3 baseColor = mix(waterColor, deepWaterColor, fresnel * 0.7);
      
      // Add specular highlights (sun reflection)
      vec3 reflectDirection = reflect(-sunDirection, vNormal);
      float specular = pow(max(dot(reflectDirection, viewDirection), 0.0), 128.0);
      
      // Add foam on wave peaks
      float foam = smoothstep(0.2, 0.4, vElevation);
      vec3 finalColor = mix(baseColor, foamColor, foam * 0.3);
      
      // Add sun sparkles
      finalColor += vec3(specular * 0.8);
      
      // Calculate alpha with fresnel for transparency
      float alpha = 0.7 + fresnel * 0.25;
      
      gl_FragColor = vec4(finalColor, alpha);
    }
  `,
  transparent: true,
  side: THREE.DoubleSide,
  depthWrite: false,
});

const water = new THREE.Mesh(waterGeometry, waterMaterial);
water.position.y = -2; // Mulai dari ocean floor level
water.position.z = 0; // Position di bagian depan, tapi bisa maju ke kota
scene.add(water);

// =====================================================
// WATER SIDES (Dynamic walls for ocean/beach area)
// =====================================================
const waterSideMaterial = new THREE.MeshPhongMaterial({
  color: 0x1e90ff,
  transparent: true,
  opacity: 0.6,
  side: THREE.DoubleSide,
});

// Create water side walls that will be updated dynamically
const waterWalls = [];

// Create dynamic water side wall that follows wave shape
function createDynamicWaterSide(segments, isHorizontal, xPos, zPos, width) {
  const geometry = new THREE.BufferGeometry();
  const positions = [];
  const indices = [];

  // Create vertices
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;

    if (isHorizontal) {
      // Front or back wall (along x-axis)
      const x = -width / 2 + t * width;
      const z = zPos;

      // Top vertex (will be updated based on wave)
      positions.push(x, 0, z);
      // Bottom vertex (at ocean floor)
      positions.push(x, -2, z);
    } else {
      // Left or right wall (along z-axis)
      const x = xPos;
      const z = -width / 2 + t * width;

      // Top vertex (will be updated based on wave)
      positions.push(x, 0, z);
      // Bottom vertex (at ocean floor)
      positions.push(x, -2, z);
    }
  }

  // Create triangles
  for (let i = 0; i < segments; i++) {
    const topLeft = i * 2;
    const bottomLeft = i * 2 + 1;
    const topRight = (i + 1) * 2;
    const bottomRight = (i + 1) * 2 + 1;

    indices.push(topLeft, bottomLeft, topRight);
    indices.push(topRight, bottomLeft, bottomRight);
  }

  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3)
  );
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  const mesh = new THREE.Mesh(geometry, waterSideMaterial);
  return mesh;
}

// Front water wall (beach facing) - positioned slightly inside to avoid z-fighting
const waterFrontWall = createDynamicWaterSide(100, true, 0, -49.9, 100);
waterWalls.push({ mesh: waterFrontWall, type: "front" });
scene.add(waterFrontWall);

// Back water wall - positioned slightly inside to avoid z-fighting
const waterBackWall = createDynamicWaterSide(100, true, 0, 49.9, 100);
waterWalls.push({ mesh: waterBackWall, type: "back" });
scene.add(waterBackWall);

// Left water wall - positioned slightly inside to avoid z-fighting
const waterLeftWall = createDynamicWaterSide(100, false, -49.9, 0, 100);
waterWalls.push({ mesh: waterLeftWall, type: "left" });
scene.add(waterLeftWall);

// Right water wall - positioned slightly inside to avoid z-fighting
const waterRightWall = createDynamicWaterSide(100, false, 49.9, 0, 100);
waterWalls.push({ mesh: waterRightWall, type: "right" });
scene.add(waterRightWall);

// Function to update water wall positions based on current water level and wave shape
function updateWaterWalls() {
  const BARRIER_Z = 10; // Position of flood barrier

  waterWalls.forEach((wallObj) => {
    const wall = wallObj.mesh;
    const wallType = wallObj.type;

    // If barrier is active, hide walls behind the barrier (back wall)
    if (simulationParams.floodBarrier) {
      if (wallType === "back") {
        wall.visible = false;
        return;
      }
      wall.visible = true;
    } else {
      wall.visible = true;
    }

    // Update wall vertices to follow wave shape
    const positions = wall.geometry.attributes.position.array;

    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const z = positions[i + 2];
      const isTopVertex = i % 6 === 0; // Every first vertex in pair is top vertex

      if (!isTopVertex) continue; // Skip bottom vertices

      // Get wave height at this position by sampling from water geometry
      let waveHeight = 0;

      // Find corresponding vertex in water geometry
      const waterPositions = waterGeometry.attributes.position.array;
      let closestDistance = Infinity;
      let closestHeight = 0;

      for (let j = 0; j < waterPositions.length; j += 3) {
        const wx = waterPositions[j];
        const wz = waterPositions[j + 2];

        // Check if water vertex is close to wall vertex
        const distance = Math.sqrt((wx - x) * (wx - x) + (wz - z) * (wz - z));

        if (distance < closestDistance) {
          closestDistance = distance;
          closestHeight = waterPositions[j + 1];
        }
      }

      // Set top vertex to wave height plus water level
      waveHeight = closestHeight + water.position.y;

      // If barrier is active and wall is behind barrier, clamp height
      if (simulationParams.floodBarrier) {
        if ((wallType === "left" || wallType === "right") && z > BARRIER_Z) {
          waveHeight = -2; // Push below ground
        }
      }

      positions[i + 1] = waveHeight;
    }

    wall.geometry.attributes.position.needsUpdate = true;
    wall.geometry.computeVertexNormals();
  });
}

// =====================================================
// FLOOD BARRIER
// =====================================================
let barrierWall = null;
const BARRIER_HEIGHT = 30; // Height of the flood barrier (can handle water rise up to 2200)

function createBarrier() {
  if (barrierWall) return;

  const barrierGeometry = new THREE.BoxGeometry(100, BARRIER_HEIGHT, 1);
  const barrierMaterial = new THREE.MeshLambertMaterial({
    color: 0x808080,
    transparent: true,
    opacity: 0.8,
  });

  barrierWall = new THREE.Mesh(barrierGeometry, barrierMaterial);
  barrierWall.position.set(0, BARRIER_HEIGHT / 2, 10); // Position at coastline
  barrierWall.castShadow = true;
  scene.add(barrierWall);
}

function removeBarrier() {
  if (barrierWall) {
    scene.remove(barrierWall);
    barrierWall = null;
  }
}

// =====================================================
// SIMULATION PARAMETERS & CONTROLS
// =====================================================
const simulationParams = {
  year: 2025,
  floodBarrier: false,
  triggerTsunami: function () {
    startTsunami();
  },
};

// WATER RISE DATA - Adjust these values to change sensitivity
// Format: { year: waterHeight }
const WATER_LEVEL_DATA = {
  2025: 0.0,
  2030: 0.8,
  2035: 1.5,
  2040: 2.2,
  2045: 3.0,
  2050: 4.0,
  2060: 5.5,
  2070: 7.0,
  2080: 8.5,
  2090: 10.0,
  2100: 12.0,
  2120: 15.0,
  2140: 18.0,
  2160: 21.0,
  2180: 24.0,
  2200: 27.0,
};

// Interpolate water level based on year
function getWaterLevelForYear(year) {
  const years = Object.keys(WATER_LEVEL_DATA)
    .map(Number)
    .sort((a, b) => a - b);

  // Find surrounding years
  let lowerYear = years[0];
  let upperYear = years[years.length - 1];

  for (let i = 0; i < years.length - 1; i++) {
    if (year >= years[i] && year <= years[i + 1]) {
      lowerYear = years[i];
      upperYear = years[i + 1];
      break;
    }
  }

  // Linear interpolation
  const lowerLevel = WATER_LEVEL_DATA[lowerYear];
  const upperLevel = WATER_LEVEL_DATA[upperYear];
  const ratio = (year - lowerYear) / (upperYear - lowerYear);

  return lowerLevel + (upperLevel - lowerLevel) * ratio;
}

// GUI Setup
const gui = new dat.GUI();
gui
  .add(simulationParams, "year", 2025, 2200, 1)
  .name("Year")
  .onChange(updateWaterLevel);

gui
  .add(simulationParams, "floodBarrier")
  .name("Flood Barrier")
  .onChange((value) => {
    if (value) {
      createBarrier();
    } else {
      removeBarrier();
    }
    updateFloodStatus();
  });

gui.add(simulationParams, "triggerTsunami").name("🌊 Trigger Tsunami");

// =====================================================
// WATER LEVEL UPDATE
// =====================================================
let targetWaterLevel = 0;
let currentWaterLevel = 0;

function updateWaterLevel() {
  targetWaterLevel = getWaterLevelForYear(simulationParams.year);
  updateUI();
}

function updateUI() {
  document.getElementById("year-display").textContent = simulationParams.year;
  document.getElementById("water-level").textContent =
    targetWaterLevel.toFixed(1) + "m";
  updateFloodStatus();
}

function updateFloodStatus() {
  const statusElement = document.getElementById("flood-status");

  if (simulationParams.floodBarrier) {
    if (currentWaterLevel < BARRIER_HEIGHT) {
      statusElement.textContent = "Protected by Barrier";
      statusElement.className = "safe";
    } else {
      statusElement.textContent = "Barrier Breached!";
      statusElement.className = "warning";
    }
  } else {
    if (currentWaterLevel > 3) {
      statusElement.textContent = "City Flooding!";
      statusElement.className = "warning";
    } else {
      statusElement.textContent = "Safe";
      statusElement.className = "safe";
    }
  }
}

// =====================================================
// TSUNAMI SIMULATION
// =====================================================
let tsunamiActive = false;
let tsunamiTime = 0;
const TSUNAMI_DURATION = 8; // seconds - longer for more dramatic effect
const TSUNAMI_HEIGHT = 15; // maximum tsunami wave height
const TSUNAMI_WIDTH = 25; // width of the wave crest

// Tsunami side walls (solid geometry) - these walls follow wave shape during tsunami
let tsunamiSideWalls = [];

function createTsunamiSideWalls() {
  // Material for tsunami side walls - solid blue water color
  const tsunamiWallMaterial = new THREE.MeshPhongMaterial({
    color: 0x1e90ff,
    transparent: true,
    opacity: 0.7,
    side: THREE.DoubleSide,
  });

  // Left wall (x = -50) - dynamic geometry
  const leftWall = createDynamicWaterSide(100, false, -49.9, 0, 100);
  leftWall.material = tsunamiWallMaterial;
  leftWall.visible = false;
  tsunamiSideWalls.push({ mesh: leftWall, type: "left" });
  scene.add(leftWall);

  // Right wall (x = 50) - dynamic geometry
  const rightWall = createDynamicWaterSide(100, false, 49.9, 0, 100);
  rightWall.material = tsunamiWallMaterial;
  rightWall.visible = false;
  tsunamiSideWalls.push({ mesh: rightWall, type: "right" });
  scene.add(rightWall);
}

// Create the walls on load
createTsunamiSideWalls();

function startTsunami() {
  if (tsunamiActive) return;
  tsunamiActive = true;
  tsunamiTime = 0;

  // Show tsunami side walls
  tsunamiSideWalls.forEach((wallObj) => {
    wallObj.mesh.visible = true;
  });
}

function updateTsunami(deltaTime) {
  if (!tsunamiActive) return;

  tsunamiTime += deltaTime;
  const progress = tsunamiTime / TSUNAMI_DURATION;

  if (progress >= 1) {
    tsunamiActive = false;
    // Hide tsunami side walls after tsunami ends
    tsunamiSideWalls.forEach((wallObj) => {
      wallObj.mesh.visible = false;
    });
    return;
  }

  // Wave starts from ocean (-50 in z) and moves toward land (+50 in z)
  // Progress from 0 to 1 moves wave from ocean to land
  let wavePosition = -50 + progress * 100;

  // If barrier is active, stop wave at barrier position
  const barrierZ = 10;
  if (simulationParams.floodBarrier && wavePosition > barrierZ) {
    wavePosition = barrierZ;
  }

  // Wave amplitude grows at start, peaks in middle, then decreases
  let waveAmplitude;
  if (progress < 0.3) {
    // Growing phase
    waveAmplitude = TSUNAMI_HEIGHT * (progress / 0.3);
  } else if (progress < 0.7) {
    // Peak phase
    waveAmplitude = TSUNAMI_HEIGHT;
  } else {
    // Decreasing phase as it spreads inland
    waveAmplitude = TSUNAMI_HEIGHT * (1 - (progress - 0.7) / 0.3);
  }

  // Update water vertices to create the wave
  for (let i = 0; i < waterVertices.length; i += 3) {
    const z = originalWaterPositions[i + 2];

    // If barrier is active and this vertex is beyond the barrier, push water far below ground
    if (simulationParams.floodBarrier && z > barrierZ) {
      waterVertices[i + 1] = -water.position.y;
      continue;
    }

    const distanceToWave = z - wavePosition;

    // Create realistic wave profile
    if (distanceToWave > -TSUNAMI_WIDTH && distanceToWave < TSUNAMI_WIDTH) {
      // Wave crest - steeper front, gentler back
      let waveFactor;
      if (distanceToWave < 0) {
        // Front of wave (steeper)
        waveFactor = Math.pow(1 + distanceToWave / TSUNAMI_WIDTH, 2);
      } else {
        // Back of wave (gentler slope)
        waveFactor = Math.pow(1 - distanceToWave / TSUNAMI_WIDTH, 1.5);
      }

      waterVertices[i + 1] =
        originalWaterPositions[i + 1] + waveAmplitude * waveFactor;
    } else if (distanceToWave >= TSUNAMI_WIDTH) {
      // Water behind the wave - still calm
      waterVertices[i + 1] = originalWaterPositions[i + 1];
    } else {
      // Water in front of wave - raised by approaching tsunami
      const raiseFactor = Math.max(0, 1 + distanceToWave / (TSUNAMI_WIDTH * 2));
      waterVertices[i + 1] =
        originalWaterPositions[i + 1] + waveAmplitude * 0.3 * raiseFactor;
    }
  }

  waterGeometry.attributes.position.needsUpdate = true;
  waterGeometry.computeVertexNormals();

  // Raise overall water level as tsunami passes
  const floodLevel = waveAmplitude * 0.6 * progress;
  currentWaterLevel = targetWaterLevel + floodLevel;

  // If barrier is active, limit water level
  if (simulationParams.floodBarrier) {
    water.position.y = Math.min(currentWaterLevel, BARRIER_HEIGHT - 0.5);
  } else {
    water.position.y = currentWaterLevel;
  }

  // Update tsunami side walls to follow wave shape
  tsunamiSideWalls.forEach((wallObj) => {
    const wall = wallObj.mesh;
    const positions = wall.geometry.attributes.position.array;

    for (let i = 0; i < positions.length; i += 3) {
      const z = positions[i + 2];
      const isTopVertex = i % 6 === 0; // Every first vertex in pair is top vertex

      if (!isTopVertex) continue; // Skip bottom vertices

      // Get wave height at this z position
      let waveHeight = 0;

      // Sample wave height from water geometry at this z position
      const waterPositions = waterGeometry.attributes.position.array;
      let closestDistance = Infinity;
      let closestHeight = 0;

      for (let j = 0; j < waterPositions.length; j += 3) {
        const wz = waterPositions[j + 2];
        const distance = Math.abs(wz - z);

        if (distance < closestDistance) {
          closestDistance = distance;
          closestHeight = waterPositions[j + 1];
        }
      }

      waveHeight = closestHeight + water.position.y;

      // If barrier is active and this part is behind barrier, push down
      if (simulationParams.floodBarrier && z > 10) {
        waveHeight = -2;
      }

      positions[i + 1] = waveHeight;
    }

    wall.geometry.attributes.position.needsUpdate = true;
    wall.geometry.computeVertexNormals();
  });

  updateFloodStatus();
}

// =====================================================
// WAVE ANIMATION (Gentle Ocean Waves)
// =====================================================
let waveTime = 0;

function animateWaves(deltaTime) {
  if (tsunamiActive) return; // Don't animate gentle waves during tsunami

  waveTime += deltaTime;

  // Update shader time uniform for animated effects
  waterMaterial.uniforms.time.value = waveTime;

  for (let i = 0; i < waterVertices.length; i += 3) {
    const x = originalWaterPositions[i];
    const z = originalWaterPositions[i + 2];

    // If barrier is active and this vertex is beyond the barrier, push water down below ground
    if (simulationParams.floodBarrier && z > 10) {
      // Push water far below current water level to ensure it stays hidden
      waterVertices[i + 1] = -water.position.y; // Always below ground
      continue;
    }

    // Multiple sine waves for more realistic water with varying frequencies
    const wave1 = Math.sin(x * 0.1 + waveTime * 2) * 0.15;
    const wave2 = Math.sin(z * 0.15 + waveTime * 1.5) * 0.1;
    const wave3 = Math.sin((x + z) * 0.08 + waveTime * 1.8) * 0.12;

    // Add small ripples for detail
    const ripple = Math.sin(x * 0.5 + z * 0.3 + waveTime * 3) * 0.05;

    waterVertices[i + 1] = wave1 + wave2 + wave3 + ripple;
  }

  waterGeometry.attributes.position.needsUpdate = true;
  waterGeometry.computeVertexNormals();
}

// =====================================================
// ANIMATION LOOP
// =====================================================
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);

  const deltaTime = clock.getDelta();

  // Smoothly interpolate water level
  if (!tsunamiActive) {
    currentWaterLevel += (targetWaterLevel - currentWaterLevel) * 0.02;

    // If barrier is active, limit water level rise behind barrier
    if (simulationParams.floodBarrier) {
      // Keep water below barrier height
      water.position.y = Math.min(currentWaterLevel, BARRIER_HEIGHT - 0.5);
    } else {
      water.position.y = currentWaterLevel;
    }
  }

  // Update water wall positions to follow water level
  updateWaterWalls();

  // Animate waves
  animateWaves(deltaTime);

  // Update tsunami
  updateTsunami(deltaTime);

  // Animate clouds - slow drift across sky
  clouds.forEach((cloud) => {
    cloud.position.x += cloud.userData.speed;
    // Loop clouds back when they move too far
    if (cloud.position.x > 150) {
      cloud.position.x = -150;
    }
    // Gentle bobbing motion
    cloud.position.y +=
      Math.sin(Date.now() * 0.0001 + cloud.position.x) * 0.001;
  });

  // Update controls
  controls.update();

  // Render scene
  renderer.render(scene, camera);
}

// =====================================================
// WINDOW RESIZE HANDLER
// =====================================================
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// =====================================================
// INITIALIZATION
// =====================================================
updateWaterLevel();
animate();
