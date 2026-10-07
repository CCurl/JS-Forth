// ray-engine.js - Generic Doom-style raycasting engine
// Provides core raycasting, rendering, and animation loop
// Does not depend on any specific game world or Forth integration

function castRay(world, x, y, angle) {
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  const maxDist = 20;
  const step = 0.1;
  const width = world[0].length;
  const height = world.length;
  
  for (let dist = step; dist < maxDist; dist += step) {
    const px = x + dx * dist;
    const py = y + dy * dist;
    const gridX = Math.floor(px);
    const gridY = Math.floor(py);
    
    if (gridX < 0 || gridX >= width || gridY < 0 || gridY >= height) {
      return dist; // hit boundary
    }
    if (world[gridY][gridX] === 1) {
      return dist; // hit wall
    }
  }
  return maxDist;
}

function getGraffitiColor(x, y, baseBrightness) {
  // Multiple layers of noise for more interesting texture
  const hash1 = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  const noise1 = hash1 - Math.floor(hash1);
  
  const hash2 = Math.sin(x * 39.898 + y * 11.233) * 23758.5453;
  const noise2 = hash2 - Math.floor(hash2);
  
  const hash3 = Math.sin(x * 72.4 + y * 51.4) * 65234.123;
  const noise3 = hash3 - Math.floor(hash3);
  
  // Combine multiple noise layers
  const combined = (noise1 * 0.6 + noise2 * 0.3 + noise3 * 0.1);
  
  // Create variation with bigger swings
  const variation = Math.floor(combined * 120 - 60); // -60 to +60
  const finalBrightness = Math.max(30, Math.min(255, baseBrightness + variation));
  
  // Graffiti color palette
  let r = finalBrightness;
  let g = finalBrightness;
  let b = finalBrightness;
  
  const colorNoise = (noise1 + noise2 + noise3) / 3;
  
  if (colorNoise < 0.15) {
    // Bright red
    r = Math.floor(finalBrightness * 1.4);
    g = Math.floor(finalBrightness * 0.5);
    b = Math.floor(finalBrightness * 0.4);
  } else if (colorNoise < 0.30) {
    // Bright yellow
    r = Math.floor(finalBrightness * 1.3);
    g = Math.floor(finalBrightness * 1.3);
    b = Math.floor(finalBrightness * 0.3);
  } else if (colorNoise < 0.45) {
    // Cyan/bright blue
    r = Math.floor(finalBrightness * 0.4);
    g = Math.floor(finalBrightness * 1.2);
    b = Math.floor(finalBrightness * 1.4);
  } else if (colorNoise < 0.60) {
    // Magenta/purple
    r = Math.floor(finalBrightness * 1.3);
    g = Math.floor(finalBrightness * 0.3);
    b = Math.floor(finalBrightness * 1.2);
  } else if (colorNoise < 0.75) {
    // Lime green
    r = Math.floor(finalBrightness * 0.6);
    g = Math.floor(finalBrightness * 1.4);
    b = Math.floor(finalBrightness * 0.3);
  }
  // else: neutral gray (finalBrightness for all)
  
  r = Math.min(255, r);
  g = Math.min(255, g);
  b = Math.min(255, b);
  
  return `rgb(${r}, ${g}, ${b})`;
}

function createRaycastRenderer(game, world) {
  return function renderRaycastFrame() {
    const ctx = game.ctx;
    const width = game.canvas.width;
    const height = game.canvas.height;
    const player = game.player;
    const fov = Math.PI / 2.4; // ~60 degrees
    
    // Clear screen
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, width, height);
    
    // Draw ceiling
    ctx.fillStyle = '#DFE8F0';
    ctx.fillRect(0, 0, width, height / 2);
    
    // Draw checkerboard floor
    const floorStart = height / 2;
    const floorSize = 0.5; // size of each checkerboard square
    
    for (let screenY = Math.floor(floorStart); screenY < height; screenY++) {
      for (let screenX = 0; screenX < width; screenX++) {
        // Calculate ray angle for this column
        const rayAngle = player.angle - fov / 2 + (screenX / width) * fov;
        
        // Calculate distance to this floor pixel
        const verticalDist = screenY - height / 2;
        const horizDist = (height / 2) / verticalDist; // distance to floor at this screen row
        
        // Calculate world coordinates
        const worldX = player.x + Math.cos(rayAngle) * horizDist;
        const worldY = player.y + Math.sin(rayAngle) * horizDist;
        
        // Determine checkerboard tile
        const tileX = Math.floor(worldX / floorSize);
        const tileY = Math.floor(worldY / floorSize);
        const isYellow = (tileX + tileY) % 2 === 0;
        
        ctx.fillStyle = isYellow ? '#FFDD44' : '#8B6914'; // bright yellow and brown
        ctx.fillRect(screenX, screenY, 1, 1);
      }
    }
    
    // Cast rays and render columns
    for (let col = 0; col < width; col++) {
      const rayAngle = player.angle - fov / 2 + (col / width) * fov;
      const dist = castRay(world, player.x, player.y, rayAngle);
      
      // Correct for fish-eye effect
      const correctedDist = dist * Math.cos(rayAngle - player.angle);
      
      // Calculate wall height with sub-pixel precision
      const wallHeight = Math.max(10, (height / correctedDist) * 2.0);
      const topExact = (height - wallHeight) / 2;
      const top = Math.floor(topExact);
      const bottomExact = topExact + wallHeight;
      const bottom = Math.ceil(bottomExact);
      
      // Base brightness based on distance
      const baseBrightness = Math.max(30, Math.floor(255 - correctedDist * 30));
      
      // Draw column with graffiti texture
      const rayX = player.x + Math.cos(rayAngle) * dist;
      const rayY = player.y + Math.sin(rayAngle) * dist;
      
      for (let pixelY = top; pixelY < bottom; pixelY++) {
        let textureY = (pixelY - topExact) / wallHeight;
        
        // Clamp to wall bounds
        if (textureY < 0) textureY = 0;
        if (textureY > 1) textureY = 1;
        
        const color = getGraffitiColor(rayX * 2, rayY * 2 + textureY, baseBrightness);
        ctx.fillStyle = color;
        ctx.fillRect(col, pixelY, 1, 1);
      }
    }
  };
}

function createRaycastLoop(renderFn, inputFn, game) {
  return function raycastLoop(time) {
    if (game.running) {
      inputFn();
      renderFn();
      requestAnimationFrame(raycastLoop);
    }
  };
}
