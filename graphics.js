// *********************************************************************************
// graphics.js - Canvas graphics wrapper for Forth
// Provides Forth words for drawing on the HTML canvas

let theCanvas = null;
let theCtx = null;
let sprites = [];  // Sprite storage: index -> Image object

function initGraphics(canvas) {
  theCanvas = canvas;
  theCtx = canvas.getContext('2d');
}

function spriteAt(x) { return (0 <= x) && (x < sprites.length) ? sprites[x] : null; }

function registerGraphicsWords() {
  forthPrim('canvas-width', () => { push(theCanvas.width); });
  forthPrim('canvas-height', () => { push(theCanvas.height); });
  
  forthPrim('canvas-width!',  () => { theCanvas.width = pop(); });
  forthPrim('canvas-height!', () => { theCanvas.height = pop(); });
  forthPrim('resize-canvas',  () => {
    theCanvas.width = pop();
    theCanvas.height = pop();
  });
  
  forthPrim('clear', () => { theCtx.clearRect(0, 0, theCanvas.width, theCanvas.height); });
  forthPrim('color', () => { 
    let b=pop(), g=pop(), r=pop(); 
    theCtx.fillStyle = `rgb(${r},${g},${b})`;
  });
  forthPrim('stroke', () => { 
    let b=pop(), g=pop(), r=pop(); 
    theCtx.strokeStyle = `rgb(${r},${g},${b})`;
  });
  forthPrim('fill-alpha', () => { theCtx.globalAlpha = pop() / 255; });
  forthPrim('line-width', () => { theCtx.lineWidth = pop(); });
  
  forthPrim('rect', () => { 
    let h=pop(), w=pop(), y=pop(), x=pop(); 
    theCtx.fillRect(x, y, w, h); 
  });
  forthPrim('rect-stroke', () => { 
    let h=pop(), w=pop(), y=pop(), x=pop(); 
    theCtx.strokeRect(x, y, w, h); 
  });
  forthPrim('circle', () => { 
    let r=pop(), y=pop(), x=pop(); 
    theCtx.beginPath();
    theCtx.arc(x, y, r, 0, Math.PI * 2);
    theCtx.fill();
  });
  forthPrim('circle-stroke', () => { 
    let r=pop(), y=pop(), x=pop(); 
    theCtx.beginPath();
    theCtx.arc(x, y, r, 0, Math.PI * 2);
    theCtx.stroke();
  });
  
  forthPrim('pi',            () => { push(Math.PI); });
  forthPrim('pixel',         () => { y=pop(); x=pop(); theCtx.fillRect(x, y, 1, 1); });
  forthPrim('move-to',       () => { y=pop(); x=pop(); theCtx.moveTo(x, y); });
  forthPrim('line-to',       () => { y=pop(); x=pop(); theCtx.lineTo(x, y); });
  forthPrim('begin-path',    () => { theCtx.beginPath(); });
  forthPrim('stroke-path',   () => { theCtx.stroke(); });
  forthPrim('fill-path',     () => { theCtx.fill(); });
  forthPrim('close-path',    () => { theCtx.closePath(); });
  forthPrim('save-state',    () => { theCtx.save(); });
  forthPrim('restore-state', () => { theCtx.restore(); });
  forthPrim('translate',     () => { y=pop(); x=pop(); theCtx.translate(x, y); });
  forthPrim('rotate',        () => { angle=pop(); theCtx.rotate(angle); });
  forthPrim('scale',         () => { y=pop(); x=pop(); theCtx.scale(x, y); });
  forthPrim('font',          () => { theCtx.font = pop(); });
  forthPrim('text',          () => { y=pop(); x=pop(); s=pop(); theCtx.fillText(s, x, y); });
  forthPrim('text-stroke',   () => { y=pop(); x=pop(); s=pop(); theCtx.strokeText(s, x, y); });
  forthPrim('sprite-width',  () => { s = spriteAt(pop()); push(s ? s.width : 0); });
  forthPrim('sprite-height', () => { s = spriteAt(pop()); push(s ? s.height : 0); });
  forthPrim('redraw',        () => { needsRedraw = true; });
  forthPrim('redraw?',       () => { push(needsRedraw ? -1 : 0); });
  
  forthPrim('image-data', () => { 
    let h=pop(), w=pop(), y=pop(), x=pop();
    let imgData = theCtx.getImageData(x, y, w, h);
    // Store in temp stack for further manipulation
    tPush(imgData);
  });

  forthPrim('put-image-data', () => {
    let y=pop(), x=pop();
    let imgData = tPop();
    theCtx.putImageData(imgData, x, y);
  });
  
  forthPrim('load-sprite', () => {
    let img = new Image();
    img.src = pop();
    let spriteIdx = sprites.length;
    sprites.push(img);
    push(spriteIdx);  // Return sprite index
  });
  
  forthPrim('draw-sprite', () => {
    let spriteIdx = pop(), y = pop(), x = pop();
    let sprite = spriteAt(spriteIdx);
    if (sprite) {
      if (sprite.complete) {  // Check if image is loaded
        theCtx.drawImage(sprite, x, y);
      }
    }
  });
  
  forthPrim('draw-sprite-scaled', () => {
    let h = pop(), w = pop(), spriteIdx = pop(), y = pop(), x = pop();
    let sprite = spriteAt(spriteIdx);
    if (sprite) {
      if (sprite.complete) {
        theCtx.drawImage(sprite, x, y, w, h);
      }
    }
  });
}

 // *********************************************************************************
 // ray-casting support - a generic Doom-style raycasting engine
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
  const noise = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  const variation = (noise - Math.floor(noise)) * 100 - 50;
  const gray = Math.max(30, Math.min(255, Math.floor(baseBrightness + variation)));
  return `rgb(${gray}, ${gray}, ${gray})`;
}

let renderCanvas = undefined;
let outputCtx = undefined, ctx2D = undefined;
let game = undefined;
let world = undefined;
let needsRedraw = false;  // Redraw flag controlled by Forth

function createRaycastRenderer(theGame, theWorld) {
  game = theGame;
  world = theWorld;
  outputCtx = game.ctx;
  if (!renderCanvas) renderCanvas = document.createElement('canvas');
  renderCanvas.width = Math.max(1, Math.floor(game.canvas.width / 2));
  renderCanvas.height = Math.max(1, Math.floor(game.canvas.height / 2));
  outputCtx.imageSmoothingEnabled = false;
  return renderRaycastFrame;
}

function renderRaycastFrame() {
    if (!ctx2D) { ctx2D = renderCanvas.getContext('2d'); }
    const width = renderCanvas.width;
    const height = renderCanvas.height;
    const player = game.player;
    const fov = Math.PI / 2.4; // ~60 degrees
    
    // Clear screen
    ctx2D.fillStyle = '#111';
    ctx2D.fillRect(0, 0, width, height);
    
    // Draw ceiling
    ctx2D.fillStyle = '#DFE8F0';
    ctx2D.fillRect(0, 0, width, height / 2);
    
    // Draw checkerboard floor
    const floorStart = height / 2;
    const floorSize = 0.5; // size of each checkerboard square
    const rayCos = new Float64Array(width);
    const raySin = new Float64Array(width);
    for (let screenX = 0; screenX < width; screenX++) {
      const rayAngle = player.angle - fov / 2 + (screenX / width) * fov;
      rayCos[screenX] = Math.cos(rayAngle);
      raySin[screenX] = Math.sin(rayAngle);
    }

    const floorPixels = ctx2D.createImageData(width, height - floorStart);
    const floorData = floorPixels.data;
    for (let screenY = Math.floor(floorStart); screenY < height; screenY++) {
      const verticalDist = screenY - height / 2;
      const horizDist = (height / 2) / verticalDist;
      let pixelIndex = (screenY - floorStart) * width * 4;
      for (let screenX = 0; screenX < width; screenX++) {
        const worldX = player.x + rayCos[screenX] * horizDist;
        const worldY = player.y + raySin[screenX] * horizDist;
        const tileX = Math.floor(worldX / floorSize);
        const tileY = Math.floor(worldY / floorSize);
        const isYellow = (tileX + tileY) % 2 === 0;
        floorData[pixelIndex++] = isYellow ? 255 : 139;
        floorData[pixelIndex++] = isYellow ? 221 : 105;
        floorData[pixelIndex++] = isYellow ? 68 : 20;
        floorData[pixelIndex++] = 255;
      }
    }
    ctx2D.putImageData(floorPixels, 0, floorStart);
    
    // Cast rays and render columns
    for (let col = 0; col < width; col++) {
      const rayAngle = player.angle - fov / 2 + (col / width) * fov;
      const dist = castRay(world, player.x, player.y, rayAngle);
      
      // Correct for fish-eye effect
      const correctedDist = dist * Math.cos(rayAngle - player.angle);
      
      // Calculate wall height with sub-pixel precision
      const wallHeight = Math.max(15, (height / correctedDist) * 2.5);
      const topExact = (height - wallHeight) / 2;
      const top = Math.floor(topExact);
      const bottomExact = topExact + wallHeight;
      const bottom = Math.ceil(bottomExact);
      
      // Base brightness based on distance
      const baseBrightness = Math.max(30, Math.floor(255 - correctedDist * 30));
      
      // Draw column with graffiti texture
      const rayX = player.x + rayCos[col] * dist;
      const rayY = player.y + raySin[col] * dist;
      
      const textureStep = 4;
      for (let pixelY = top; pixelY < bottom; pixelY += textureStep) {
        let textureY = (pixelY - topExact) / wallHeight;
        
        // Clamp to wall bounds
        if (textureY < 0) textureY = 0;
        if (textureY > 1) textureY = 1;
        
        const color = getGraffitiColor(rayX * 2, rayY * 2 + textureY, baseBrightness);
        ctx2D.fillStyle = color;
        ctx2D.fillRect(col, pixelY, 1, Math.min(textureStep, bottom - pixelY));
      }
    }

    outputCtx.drawImage(renderCanvas, 0, 0, game.canvas.width, game.canvas.height);
  }

function createRaycastLoop(renderFn, inputFn, game) {
  return function raycastLoop(time) {
    if (game.running) {
      inputFn();
      handleGameLogic();
      if (needsRedraw) {
        renderFn();
        needsRedraw = false;
      }
      requestAnimationFrame(raycastLoop);
    }
  };
}
