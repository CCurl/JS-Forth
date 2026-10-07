// doom-o.js - Game-specific Doom demo raycaster for JS-Forth
// Uses the generic raycasting engine from ray-engine.js
// Defines the world layout, keyboard input, and Forth integration

// Game-specific world map: 0=empty, 1=wall
// Two 12x12 rooms (24 ft x 24 ft with 1 cell = 2 ft)
// with a wall and doorway between them
const raycastWorld = [
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
];

// Game state
const raycastGame = {
  canvas: null,
  ctx: null,
  player: { x: 6.5, y: 6.5, angle: 0 },
  lastTime: 0,
  running: false,
  keys: { w: false, a: false, s: false, d: false, j: false, k: false },
  renderFn: null,
  loopFn: null
};

function raycastInit() {
  raycastGame.canvas = document.getElementById('raycaster-canvas');
  if (!raycastGame.canvas) return;
  raycastGame.ctx = raycastGame.canvas.getContext('2d');
  raycastGame.running = true;
  
  // Create engine renderer and loop functions bound to this game
  raycastGame.renderFn = createRaycastRenderer(raycastGame, raycastWorld);
  raycastGame.loopFn = createRaycastLoop(raycastGame.renderFn, handleKeyboardInput, raycastGame);
  
  // Setup keyboard controls
  document.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();
    
    // Stop game with ESC
    if (key === 'escape') {
      raycastGame.running = false;
      e.preventDefault();
      return;
    }
    
    // Game input keys
    if (['w', 'a', 's', 'd', 'j', 'k'].includes(key)) {
      if (raycastGame.running) {
        if (key === 'w') raycastGame.keys.w = true;
        if (key === 'a') raycastGame.keys.a = true;
        if (key === 's') raycastGame.keys.s = true;
        if (key === 'd') raycastGame.keys.d = true;
        if (key === 'j') raycastGame.keys.j = true;
        if (key === 'k') raycastGame.keys.k = true;
        e.preventDefault(); // Prevent these keys from reaching textbox
      }
    }
  });
  
  document.addEventListener('keyup', (e) => {
    const key = e.key.toLowerCase();
    
    if (['w', 'a', 's', 'd', 'j', 'k'].includes(key)) {
      if (key === 'w') raycastGame.keys.w = false;
      if (key === 'a') raycastGame.keys.a = false;
      if (key === 's') raycastGame.keys.s = false;
      if (key === 'd') raycastGame.keys.d = false;
      if (key === 'j') raycastGame.keys.j = false;
      if (key === 'k') raycastGame.keys.k = false;
      if (raycastGame.running) e.preventDefault(); // Prevent these keys from reaching textbox
    }
  });
  
  requestAnimationFrame(raycastGame.loopFn);
}

// Game-specific input handling
function handleKeyboardInput() {
  const step = 0.75;
  const turnStep = 0.1;
  
  // Movement
  if (raycastGame.keys.w) {
    const newX = raycastGame.player.x + Math.cos(raycastGame.player.angle) * step;
    const newY = raycastGame.player.y + Math.sin(raycastGame.player.angle) * step;
    if (raycastWorld[Math.floor(newY)][Math.floor(newX)] === 0) {
      raycastGame.player.x = newX;
      raycastGame.player.y = newY;
    }
  }
  if (raycastGame.keys.s) {
    const newX = raycastGame.player.x - Math.cos(raycastGame.player.angle) * step;
    const newY = raycastGame.player.y - Math.sin(raycastGame.player.angle) * step;
    if (raycastWorld[Math.floor(newY)][Math.floor(newX)] === 0) {
      raycastGame.player.x = newX;
      raycastGame.player.y = newY;
    }
  }
  if (raycastGame.keys.a) {
    const leftAngle = raycastGame.player.angle - Math.PI / 2;
    const newX = raycastGame.player.x + Math.cos(leftAngle) * step;
    const newY = raycastGame.player.y + Math.sin(leftAngle) * step;
    if (raycastWorld[Math.floor(newY)][Math.floor(newX)] === 0) {
      raycastGame.player.x = newX;
      raycastGame.player.y = newY;
    }
  }
  if (raycastGame.keys.d) {
    const rightAngle = raycastGame.player.angle + Math.PI / 2;
    const newX = raycastGame.player.x + Math.cos(rightAngle) * step;
    const newY = raycastGame.player.y + Math.sin(rightAngle) * step;
    if (raycastWorld[Math.floor(newY)][Math.floor(newX)] === 0) {
      raycastGame.player.x = newX;
      raycastGame.player.y = newY;
    }
  }
  
  // Rotation
  if (raycastGame.keys.j) {
    raycastGame.player.angle -= turnStep;
  }
  if (raycastGame.keys.k) {
    raycastGame.player.angle += turnStep;
  }
}



// Register Forth words for raycaster control
// These will be called after jsforth.js initializes
function registerRaycastWords() {
  definePrim('game-init', () => { raycastInit(); });
  definePrim('move-fwd', () => {
    const step = 0.75;
    const newX = raycastGame.player.x + Math.cos(raycastGame.player.angle) * step;
    const newY = raycastGame.player.y + Math.sin(raycastGame.player.angle) * step;
    if (raycastWorld[Math.floor(newY)][Math.floor(newX)] === 0) {
      raycastGame.player.x = newX;
      raycastGame.player.y = newY;
    }
  });
  definePrim('move-bck', () => {
    const step = 0.75;
    const newX = raycastGame.player.x - Math.cos(raycastGame.player.angle) * step;
    const newY = raycastGame.player.y - Math.sin(raycastGame.player.angle) * step;
    if (raycastWorld[Math.floor(newY)][Math.floor(newX)] === 0) {
      raycastGame.player.x = newX;
      raycastGame.player.y = newY;
    }
  });
  definePrim('turn-left', () => { raycastGame.player.angle -= 0.2; });
  definePrim('turn-right', () => { raycastGame.player.angle += 0.2; });
  definePrim('game-stop', () => { raycastGame.running = false; });
  
  // Add demo block
  blocks[3] = `
( Keyboard controls: WASD to move, JK to turn, ESC to stop )
game-init ."  Raycaster started! WASD=move JK=turn ESC=stop" cr
`;
  
  // Game words documentation
  blocks[10] = `
( Doom-O Game Words )
( game-init         -- Initialize and start the raycaster game )
( move-fwd          -- Move player forward 0.75 units with collision )
( move-bck          -- Move player backward 0.75 units with collision )
( turn-left         -- Turn player left by 0.2 radians )
( turn-right        -- Turn player right by 0.2 radians )
( game-stop         -- Stop the game and return to Forth )
`;
}

// Auto-register when Forth is ready
if (typeof forthInit !== 'undefined') {
  // Forth is already loaded, register now
  registerRaycastWords();
}
