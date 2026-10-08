// doom-o.js - Game-specific Doom-like demo raycaster
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
const CONTROL_KEYS = new Set(['w', 'a', 's', 'd', 'j', 'k']);

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

// Moving around
const stepSz = 0.075;
const turnSz = 0.040;

function tryStep(dx, dy) {
  const newX = raycastGame.player.x + dx;
  const newY = raycastGame.player.y + dy;
  if (raycastWorld[Math.floor(newY)] && raycastWorld[Math.floor(newY)][Math.floor(newX)] === 0) {
    raycastGame.player.x = newX;
    raycastGame.player.y = newY;
    return true;
  }  
  return false;
}  

function moveForward() {
  const angle = raycastGame.player.angle;
  tryStep(Math.cos(angle) * stepSz, Math.sin(angle) * stepSz);
}

function moveBackward() {
  const angle = raycastGame.player.angle;
  tryStep(-Math.cos(angle) * stepSz, -Math.sin(angle) * stepSz);
}

function moveLeft() {
  const angle = raycastGame.player.angle - Math.PI / 2;
  tryStep(Math.cos(angle) * stepSz, Math.sin(angle) * stepSz);
}

function moveRight() {
  const angle = raycastGame.player.angle + Math.PI / 2;
  tryStep(Math.cos(angle) * stepSz, Math.sin(angle) * stepSz);
}

function turnLeft()  { raycastGame.player.angle -= turnSz; }
function turnRight() { raycastGame.player.angle += turnSz; }

// Initialization of the raycasting game
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
    if (CONTROL_KEYS.has(key)) {
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
    
    if (CONTROL_KEYS.has(key)) {
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
  // Moving
  if (raycastGame.keys.w) { outer("mF"); }  // Move forward
  if (raycastGame.keys.s) { outer("mB"); }  // Move backward
  if (raycastGame.keys.a) { outer("mL"); }  // Move left
  if (raycastGame.keys.d) { outer("mR"); }  // Move right
  
  // Turning
  if (raycastGame.keys.j) { outer("tL"); }  // Turn left
  if (raycastGame.keys.k) { outer("tR"); }  // Turn right
}

// Register Forth words for raycaster control
// These will be called after jsforth.js initializes
function registerRaycastWords() {
  definePrim('game-go',   () => { raycastInit(); });
  definePrim('game-stop', () => { raycastGame.running = false; });
  definePrim('mF',    () => { moveForward(); });
  definePrim('mB',    () => { moveBackward(); });
  definePrim('mL',    () => { moveLeft(); });
  definePrim('mR',    () => { moveRight(); });
  definePrim('tL',    () => { turnLeft(); });
  definePrim('tR',    () => { turnRight(); });
  definePrim('game-frame', () => { renderRaycastFrame(); });
  
  // Add demo block
  blocks[3] = `
: go game-go ."  Running!" 10 list ;
: w mF ; : wu w game-frame ; : ws for w next game-frame ;
: a mL ; : au a game-frame ; : as for a next game-frame ;
: s mB ; : su s game-frame ; : ss for s next game-frame ;
: d mR ; : du d game-frame ; : ds for d next game-frame ;
: j tL ; : ju j game-frame ; : js for j next game-frame ;
: k tR ; : ku k game-frame ; : ks for k next game-frame ;
`;
  
  // Game words documentation
  blocks[10] = `( Doom-O Game Words )
( Keyboard controls: WASD to move, JK to turn, ESC to stop )
( game-go   -- Initialize and start the game )
( mF        -- Move forward )
( mB        -- Move backward )
( tL        -- Turn left )
( tR        -- Turn right )
( game-stop -- Stop the game and return to Forth )
`;
}

// Auto-register when Forth is ready
if (typeof forthInit !== 'undefined') {
  // Forth is already loaded, register now
  registerRaycastWords();
}
