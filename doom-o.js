// *********************************************************************************
// Doom-like game using the generic raycasting engine
// Uses the generic raycasting engine
// Defines the world layout, keyboard input, and Forth integration

// Game-specific world map: 0=empty, 1=wall
// Two 12x12 rooms (24 ft x 24 ft with 1 cell = 2 ft)
// with a wall and doorway between them
const theWorld = [
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

const theGame = {
  canvas: null,
  ctx: null,
  player: { x: 6.5, y: 6.5, angle: 0 },
  lastTime: 0,
  running: false,
  paused: false,
  keys: { w: false, a: false, s: false, d: false, j: false, k: false },
  renderFn: null,
  loopFn: null
};

// Moving around
const stepSz = 0.075;
const turnSz = 0.040;

function tryStep(dx, dy) {
  const newX = theGame.player.x + dx;
  const newY = theGame.player.y + dy;
  if (theWorld[Math.floor(newY)] && theWorld[Math.floor(newY)][Math.floor(newX)] === 0) {
    theGame.player.x = newX;
    theGame.player.y = newY;
    return true;
  }  
  return false;
}  

function moveForward() {
  const angle = theGame.player.angle;
  tryStep(Math.cos(angle) * stepSz, Math.sin(angle) * stepSz);
}

function moveBackward() {
  const angle = theGame.player.angle;
  tryStep(-Math.cos(angle) * stepSz, -Math.sin(angle) * stepSz);
}

function moveLeft() {
  const angle = theGame.player.angle - Math.PI / 2;
  tryStep(Math.cos(angle) * stepSz, Math.sin(angle) * stepSz);
}

function moveRight() {
  const angle = theGame.player.angle + Math.PI / 2;
  tryStep(Math.cos(angle) * stepSz, Math.sin(angle) * stepSz);
}

function turnLeft()  { theGame.player.angle -= turnSz; }
function turnRight() { theGame.player.angle += turnSz; }

// Initialization of the raycasting game
function raycastInit() {
  theGame.canvas = document.getElementById('the-canvas');
  if (!theGame.canvas) return;
  theGame.ctx = theGame.canvas.getContext('2d');
  theGame.running = true;
  
  // Create engine renderer and loop functions bound to this game
  theGame.renderFn = createRaycastRenderer(theGame, theWorld);
  theGame.loopFn = createRaycastLoop(theGame.renderFn, handleKeyboardInput, theGame);
  
  // Setup keyboard controls
  document.addEventListener('keydown', (e) => {
    if (theGame.paused) { return; }
    if (!theGame.running) {
      document.removeEventListener('keydown', arguments.callee);
      document.removeEventListener('keyup', arguments.callee);
      return;
    }

    const key = e.key.toLowerCase();
    
    // Stop game with ESC
    if (key === 'escape') {
      theGame.running = false;
      e.preventDefault();
      return;
    }
    
    // Game input keys
    if (CONTROL_KEYS.has(key)) {
      if (theGame.running) {
        if (key === 'w') theGame.keys.w = true;
        if (key === 'a') theGame.keys.a = true;
        if (key === 's') theGame.keys.s = true;
        if (key === 'd') theGame.keys.d = true;
        if (key === 'j') theGame.keys.j = true;
        if (key === 'k') theGame.keys.k = true;
        e.preventDefault(); // Prevent these keys from reaching textbox
      }
    }
  });
  
  document.addEventListener('keyup', (e) => {
    if (!theGame.running) { return; }
    const key = e.key.toLowerCase();
    
    if (CONTROL_KEYS.has(key)) {
      if (key === 'w') theGame.keys.w = false;
      if (key === 'a') theGame.keys.a = false;
      if (key === 's') theGame.keys.s = false;
      if (key === 'd') theGame.keys.d = false;
      if (key === 'j') theGame.keys.j = false;
      if (key === 'k') theGame.keys.k = false;
      if (theGame.running) e.preventDefault(); // Prevent these keys from reaching textbox
    }
  });
  
  requestAnimationFrame(theGame.loopFn);
}

// Game-specific input handling
function handleKeyboardInput() {
  keys = (theGame.keys.w ? 1 : 0)
    | (theGame.keys.a ?  2 : 0)
    | (theGame.keys.s ?  4 : 0)
    | (theGame.keys.d ?  8 : 0)
    | (theGame.keys.j ? 16 : 0)
    | (theGame.keys.k ? 32 : 0);
  if (keys !== 0) { 
    outer(`${keys} hkey`); 
  }
}

function handleGameLogic() {
  // There is no game logic ... yet
}

initFunc(() => {
  forthPrim('game-go',      () => { raycastInit(); needsRedraw = true; });
  forthPrim('game-stop',    () => { theGame.running = false; });
  forthPrim('game-pause',   () => { theGame.paused = true; });
  forthPrim('game-resume',  () => { theGame.paused = false; });
  forthPrim('game-paused?', () => { push(theGame.paused ? -1 : 0); });
  forthPrim('game-frame',   () => { renderRaycastFrame(); });
  forthPrim('move-fwd',     () => { moveForward(); });
  forthPrim('move-back',    () => { moveBackward(); });
  forthPrim('move-left',    () => { moveLeft(); });
  forthPrim('move-right',   () => { moveRight(); });
  forthPrim('turn-left',    () => { turnLeft(); });
  forthPrim('turn-right',   () => { turnRight(); });
});

// *********************************************************************************
 // Demo words
 blocks[0] += `  20  | Doom Demo words
  21  | Doom Demo documentation
`;
  blocks[20] = `( Doom-O words )
: go game-go redraw ."  Running!" 21 list ;
: stop game-stop ."  Stopped!" ;
: update game-frame ;
: hkey ( n -- ) ( Handle Keys )
    2 mod/ if move-fwd   then ( 'w' key )
    2 mod/ if move-left  then ( 'a' key )
    2 mod/ if move-back  then ( 's' key )
    2 mod/ if move-right then ( 'd' key )
    2 mod/ if turn-left  then ( 'j' key )
    1 and  if turn-right then ( 'k' key )
    redraw ;
`;

blocks[21] = `Doom-O Documentation
Keyboard controls: w/a/s/d to move, j/k to turn, ESC to stop
game-go      ( -- )  Initialize and start the game
game-stop    ( -- )  Stop the game and return to Forth
game-pause   ( -- )  Pause the game (ignore input)
game-resume  ( -- )  Resume from pause
game-paused? ( --f ) Check if game is paused
move-fwd     ( -- )  Move forward
move-back    ( -- )  Move backward
move-left    ( -- )  Move left
move-right   ( -- )  Move right
turn-left    ( -- )  Turn left
turn-right   ( -- )  Turn right
`;
