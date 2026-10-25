// jsforth.js - (c) 2026, Chris Curl, MIT license

let mem = [], dict = [], blocks = [], forthInitFuncs = [];
let dstk =   0, dse  =  59;   // Data stack
let rstk =  60, rse  = 119;   // Return stack
let tstk = 100, tse  = 169;   // Temp stack
let lstk = 170, lse  = 199;   // Loop stack
let base = 200, state = 201, here = 256
let last = -1, pc = -1, op;
let varA = 0, varB = 0, L0 = 0, L1 = 0, L2 = 0;
let tib = '', wd = '', toIn = 0, tibLen = 0;

// ***************************************************************
// The bread and butter of this Forth
function colonWord() {
  op = mem[pc++];
  if (mem[pc] != exit) { rPush(pc); }
  pc = op;
}

function inner(start) {
  pc = start;
  while (op = mem[pc++]) { op(); }
}

// ***************************************************************
function initForth() {
  mem[dstk] = dstk; mem[rstk] = rstk; mem[tstk] = tstk;
  mem[lstk] = lstk; mem[base] = 10,   mem[state] = 0;
  forthPrim('+',      () => { t=pop(); setTOS(TOS() + t); });
  forthPrim('-',      () => { t=pop(); setTOS(TOS() - t); });
  forthPrim('*',      () => { t=pop(); setTOS(TOS() * t); });
  forthPrim('/',      () => { t=pop(); setTOS(TOS() / t); });
  forthPrim('negate', () => { setTOS(-TOS()); });
  forthPrim('/mod',   () => { t=TOS(); n=NOS(); setTOS(Math.floor(n/t)); setNOS(n%t); });
  forthPrim('mod/',   () => { t=TOS(); n=NOS(); setNOS(Math.floor(n/t)); setTOS(n%t); });
  forthPrim('<',      () => { t=pop(); setTOS((TOS() < t) ? -1 : 0); });
  forthPrim('=',      () => { t=pop(); setTOS((TOS()===t) ? -1 : 0); });
  forthPrim('>',      () => { t=pop(); setTOS((TOS() > t) ? -1 : 0); });
  forthPrim('0=',     () => { setTOS(TOS() === 0 ? -1 : 0); });
  forthPrim('and',    () => { t=pop(); setTOS(TOS() & t); });
  forthPrim('or',     () => { t=pop(); setTOS(TOS() | t); });
  forthPrim('xor',    () => { t=pop(); setTOS(TOS() ^ t); });
  forthPrim('com',    () => { setTOS(~TOS()); });
  forthPrim('dup',    () => { push(TOS()); });
  forthPrim('drop',   () => { pop(); });
  forthPrim('swap',   () => { n=NOS(); t=TOS(); setTOS(n); setNOS(t); });
  forthPrim('over',   () => { n=NOS(); push(n); });
  forthPrim('.s',     () => { doDotS(); });
  forthPrim('@',      () => { setTOS(mem[TOS()]); });
  forthPrim('!',      () => { t=pop(); n=pop(); mem[t] = n; });
  forthPrim(',',      () => { Comma(pop()); });
  forthPrim('.NWB',   () => { b=pop(); w=pop(); doNWB(pop(),w,b); });
  forthPrim('.',      () => { doNWB(pop(),0,mem[base]); type(' ');});
  forthPrim('for',    () => { lPush(L2); lPush(L1); lPush(L0); L2=pc; L1=pop(); L0=0; });
  forthPrim('i',      () => { push(L0); });
  forthPrim('next',   () => { ++L0; if (L0<L1) pc=L2; else unloop(); });
  forthPrim('unloop', () => { unloop(); });
  forthPrim('emit',   () => { emit(pop()); });
  forthPrim('exit',   () => { exit(); });
  forthPrim('type',   () => { doType(); });
  forthPrim('words',  () => { doWords(); });
  forthPrim('var',    () => { doVar(); });
  forthPrim('allot',  () => { here += pop(); });
  forthPrim('const',  () => { doConst(); });
  forthPrim('>t',     () => { tPush(pop()); });
  forthPrim('t@',     () => { push(mem[mem[tstk]]); });
  forthPrim('t!',     () => { mem[mem[tstk]] = pop(); });
  forthPrim('t>',     () => { push(tPop()); });
  forthPrim('<t',     () => { tPop(); });
  forthPrim('a@',     () => { push(varA); });
  forthPrim('a!',     () => { varA = pop(); });
  forthPrim('>a',     () => { tPush(varA); varA = pop(); });
  forthPrim('<a',     () => { varA = tPop(); });
  forthPrim('b@',     () => { push(varB); });
  forthPrim('b!',     () => { varB = pop(); });
  forthPrim('>b',     () => { tPush(varB); varB = pop(); });
  forthPrim('<b',     () => { varB = tPop(); });
  forthPrim('1+',     () => { ++mem[mem[dstk]]; });
  forthPrim('1-',     () => { --mem[mem[dstk]]; });
  forthPrim('timer',  () => { push(performance.now()); });
  forthPrim('here',   () => { push(here); });
  forthPrim('load',   () => { t=pop(); doLoad(t); });
  forthPrim('list',   () => { t=pop(); listForthBlock(t); });
  forthPrim('see',    () => { doSee(); });
  forthPrim('sin',    () => { setTOS(Math.sin(TOS())); });
  forthPrim('cos',    () => { setTOS(Math.cos(TOS())); });
  forthPrim('html!',  () => { t=pop(); n=pop(); setHTMLValue(t, n); });
  forthPrim('base',   () => { push(base); });
  forthPrim('state',  () => { push(state); });
  forthPrim('immediate', () => { dict[last].imm = true; });
  forthImm('s"',      () => { sQuote(); });
  forthImm('."',      () => { sQuote(); if (getState() == 1) { Comma(doType); } else { doType(); } });
  forthImm('if',      () => { Comma(jmpz); push(here); Comma(0); });
  forthImm('then',    () => { mem[pop()] = here; });
  forthImm('begin',   () => { push(here); });
  forthImm('while',   () => { Comma(jmpnz); Comma(pop()); });
  forthImm('until',   () => { Comma(jmpz);  Comma(pop()); });
  forthImm('again',   () => { Comma(jmp);   Comma(pop()); });
  for (let f of forthInitFuncs) { f(); }
}

// ***************************************************************
function forthPrim(name, fn) { addWord(name).xt = fn; }
function forthImm(name, fn)  { addWord(name, true).xt = fn; }
function under(s)    { throw new Error(`${s} Stack underflow`); }
function push(val)   { if (mem[dstk] < dse) mem[++mem[dstk]] = val; }
function rPush(val)  { if (mem[rstk] < rse) mem[++mem[rstk]] = val; }
function lPush(val)  { if (mem[lstk] < lse) mem[++mem[lstk]] = val; }
function tPush(val)  { if (mem[tstk] < tse) mem[++mem[tstk]] = val; }
function pop()       { return (dstk < mem[dstk]) ? mem[mem[dstk]--] : under('Data'); }
function rPop()      { return (rstk < mem[rstk]) ? mem[mem[rstk]--] : under('Return'); }
function lPop()      { return (lstk < mem[lstk]) ? mem[mem[lstk]--] : under('Loop'); }
function tPop()      { return (tstk < mem[tstk]) ? mem[mem[tstk]--] : under('Temp'); }
function TOS()       { return mem[mem[dstk]]; }
function NOS()       { return mem[mem[dstk]-1]; }
function setTOS(val) { mem[mem[dstk]] = val; }
function setNOS(val) { mem[mem[dstk]-1] = val; }
function Comma(x)    { mem[here++] = x; }
function nComma(a)   { for (let i=0; i<a.length; i++) { Comma(a[i]); } }
function unloop()    { L0=lPop(); L1=lPop(); L2=lPop(); }
function exit()      { pc = rPop(); }
function lit()       { push(mem[pc++]); }
function jmp()       { tgt = mem[pc++]; pc = tgt; }
function jmpz()      { tgt = mem[pc++]; if (pop() === 0) { pc = tgt; } }
function jmpnz()     { tgt = mem[pc++]; if (pop() !== 0) { pc = tgt; } }
function njmpz()     { tgt = mem[pc++]; if (TOS() === 0) { pc = tgt; } }
function njmpnz()    { tgt = mem[pc++]; if (TOS() !== 0) { pc = tgt; } }
function emit(x)     { console.log(String.fromCharCode(x)) }
function type(str)   { console.log(str?.toString() ?? "-undef-"); }
function doType()    { type(pop()); }
function dot(x)      { type(x); if (typeof x === 'number') { type(' '); } }
function doLoad(n)   { if (blocks[n]) { outer(blocks[n]); } }
function needWord()  { throw new Error(`expected a word`); }
function checkWord() { x = nextWord(); return x ? x : needWord(); }
function doComment() { while (nextWord() && (wd !== ')')) {} }
function doSemi()    { Comma(exit); setState(0); }
function doColon()   { checkWord(); addWord(wd); setState(1); }
function getState()  { return mem[state]; }
function setState(n) { mem[state] = n; }
function doConst()   { checkWord(); addWord(wd); nComma([lit, pop(), exit]); }
function doVar()     { checkWord(); addWord(wd); nComma([lit, here+3, exit, 0]); }
function doLit(n)    { if (getState() == 1) { nComma([lit, n]); } else { push(n); } return true; }
function initFunc(f) { forthInitFuncs.push(f); }

function addWord(name, immediate = false) {
  dict[++last] = { len: name.length, name: name, xt: here, imm: immediate };
  return dict[last];
}  

function findWordIndex(name) {
  const nameLen = name.length;
  for (let i = last; i >= 0; i--) {
    if ((dict[i].len === nameLen) && (dict[i].name === name)) { return i; }
  }  
  return -1;
}  

function findByXT(xt) {
  for (let i = last; i >= 0; i--) { if (dict[i].xt === xt) return dict[i]; }  
  return null;
}  

function findWord(name) {
  const i = findWordIndex(name);
  return (0 <= i) ? dict[i] : undefined;
}  

function sQuote() {
  ++toIn; // skip the initial space
  delimWord('"');
  push(new String(wd));
  if (getState() == 1) { nComma([lit, pop()]); }
}

function doWords() {
  num = 0, str = '';
  for (let i = last; i >= 0; i--) {
    const name = dict[i].name;
    str += `${name}\t`;
    num += 1 + Math.floor(name.length/8);
    if (7 < num) { type(str+'\n'); num = 0; str = ''; }
  }
  type(`${str} (${last+1} words)`);
}

function doDotS() {
  type('(');
  for (let i = dstk+1; i <= mem[dstk]; i++) { type(` ${mem[i]}`); }
  type(` )`);
}

function listForthBlock(n) {
    document.getElementById('forth-block').value = blocks[n];
    setHTMLValue("blk-num", n);
}

function setHTMLValue(id, val) {
  const e = document.getElementById(id);
  if (e) { e.textContent = val.toString(); }
}

function doSee() {
  checkWord();
  const i = findWordIndex(wd);
  if (i == -1) { type(`{wd} not found`); return; }
  const e = dict[i];
  if (typeof e.xt === 'function') {
    type(`${wd}: ${e.xt.toString()}\n`);
    return;
  }
  const f = e.xt, t = (i == last) ? here : dict[i+1].xt;
  type(`Word: ${wd} - ${f}:${t-1}\n`);
  for (let j = f; j < t; j++) {
    let opc = mem[j], desc = ''
    if (typeof opc === 'number') {
      const c = findByXT(opc);
      if (c) { desc = ` (${c.name})`; }
    }
    type(`${j}: ${opc}${desc}\n`);
  }
}

function doNWB(n, w, b) {
  if (isNaN(n)) { console.log(n); return; }
  if (!b) { b = mem[base]; }
  console.log(n.toString(b).padStart(w, '0'));
}

function nextWord() {
  isWS = () => tib.charCodeAt(toIn) < 33; 
  while ((toIn < tibLen) && isWS()) { toIn++; }
  const start = toIn;
  while ((toIn < tibLen) &&(!isWS()) ) { toIn++; }
  wd = tib.slice(start, toIn);
  return wd.length;
}

function delimWord(d) {
  const start = toIn;
  while ((toIn < tibLen) && (d !== tib[toIn])) { toIn++; }
  wd = tib.slice(start, toIn);
  toIn++; // skip closing delimiter
  return wd.length;
}

// Supports integers, floats, 0x<Hex>, and 0b<Binary>
function doNum(w) {
  const x = Number(w);
  if (!isNaN(x)) { return doLit(x); }
  return false;
}

function doWord(token) {
  const entry = findWord(token);
  if (!entry) { return false; }
  const isPrimitive = typeof entry.xt === 'function';
  if (entry.imm || (getState() == 0)) {
    let x = here+100;
    if (!isPrimitive) { mem[x++] = colonWord; }
    mem[x++] = entry.xt;
    mem[x] = undefined;
    inner(here+100);
  } else {
    if (!isPrimitive) { Comma(colonWord); }
    Comma(entry.xt);
  }
  return true;
}

function outer(source) {
  const cTib =  tib, cIn = toIn, cLen = tibLen;
  tib = source, tibLen = tib.length, toIn = 0;
  while (nextWord() > 0) {
    if (wd == '(') { doComment(); continue; }
    if (wd == ':') { doColon(); continue; }
    if (wd == ';') { doSemi(); continue; }
    if (doNum(wd)) { continue; }
    if (doWord(wd)) { continue; }
    throw new Error(`unknown word: ${wd}`);
  }
  tib = cTib, toIn = cIn, tibLen = cLen;
}

// *********************************************************************************
// *********************************************************************************
// Canvas graphics wrapper for Forth - for drawing on the HTML canvas
// *********************************************************************************
// *********************************************************************************

let theCanvas = null, theCtx = null;
let sprites = [];  // Sprite storage: index -> Image object

initFunc(() => {
  theCanvas = document.getElementById('the-canvas');
  if (!theCanvas) { return }
  theCtx = theCanvas.getContext('2d');
  registerGraphicsWords();
});

function resizeCanvas(w, h) { theCanvas.width = w; theCanvas.height = h; }
function setFillStyle(r, g, b) { theCtx.fillStyle = `rgb(${r},${g},${b})`; }
function setStrokeStyle(r, g, b) { theCtx.strokeStyle = `rgb(${r},${g},${b})`; }
function fillRect(x, y, w, h) { theCtx.fillRect(x, y, w, h); }
function strokeRect(x, y, w, h) { theCtx.strokeRect(x, y, w, h); }
function spriteAt(x) { return sprites[x]; }

function registerGraphicsWords() {
  forthPrim('canvas-width',   () => { push(theCanvas.width); });
  forthPrim('canvas-height',  () => { push(theCanvas.height); });
  forthPrim('canvas-width!',  () => { theCanvas.width = pop(); });
  forthPrim('canvas-height!', () => { theCanvas.height = pop(); });
  forthPrim('resize-canvas',  () => { w=pop(), h=pop(); resizeCanvas(w, h); });
  forthPrim('clear',          () => { theCtx.clearRect(0, 0, theCanvas.width, theCanvas.height); });
  forthPrim('color',          () => { b=pop(), g=pop(), r=pop(); setFillStyle(r, g, b); });
  forthPrim('stroke',         () => { b=pop(), g=pop(), r=pop(); setStrokeStyle(r, g, b); });
  forthPrim('fill-alpha',     () => { theCtx.globalAlpha = pop() / 255; });
  forthPrim('line-width',     () => { theCtx.lineWidth = pop(); });
  forthPrim('rect',           () => { h=pop(), w=pop(), y=pop(), x=pop(); fillRect(x, y, w, h); });
  forthPrim('rect-stroke',    () => { h=pop(), w=pop(), y=pop(), x=pop(); strokeRect(x, y, w, h); });
  forthPrim('pi',             () => { push(Math.PI); });
  forthPrim('pixel',          () => { y=pop(); x=pop(); theCtx.fillRect(x, y, 1, 1); });
  forthPrim('move-to',        () => { y=pop(); x=pop(); theCtx.moveTo(x, y); });
  forthPrim('line-to',        () => { y=pop(); x=pop(); theCtx.lineTo(x, y); });
  forthPrim('begin-path',     () => { theCtx.beginPath(); });
  forthPrim('stroke-path',    () => { theCtx.stroke(); });
  forthPrim('fill-path',      () => { theCtx.fill(); });
  forthPrim('close-path',     () => { theCtx.closePath(); });
  forthPrim('save-state',     () => { theCtx.save(); });
  forthPrim('restore-state',  () => { theCtx.restore(); });
  forthPrim('translate',      () => { y=pop(); x=pop(); theCtx.translate(x, y); });
  forthPrim('rotate',         () => { angle=pop(); theCtx.rotate(angle); });
  forthPrim('scale',          () => { y=pop(); x=pop(); theCtx.scale(x, y); });
  forthPrim('font',           () => { theCtx.font = pop(); });
  forthPrim('text',           () => { y=pop(); x=pop(); s=pop(); theCtx.fillText(s, x, y); });
  forthPrim('text-stroke',    () => { y=pop(); x=pop(); s=pop(); theCtx.strokeText(s, x, y); });
  forthPrim('sprite-width',   () => { s = sprites[pop()]; push(s ? s.width : 0); });
  forthPrim('sprite-height',  () => { s = sprites[pop()]; push(s ? s.height : 0); });
  forthPrim('redraw',         () => { needsRedraw = true; });
  forthPrim('redraw?',        () => { push(needsRedraw ? -1 : 0); });
  forthPrim('circle',         () => { 
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
    let y = pop(), x = pop(), sprite = sprites[pop()];
    if (sprite?.complete) { theCtx.drawImage(sprite, x, y); }
  });
  forthPrim('draw-sprite-scaled', () => {
    let h = pop(), w = pop(), y = pop(), x = pop();
    let sprite = sprites[pop()];
    if (sprite?.complete) { theCtx.drawImage(sprite, x, y, w, h); }
  });
}

 // *********************************************************************************
 // *********************************************************************************
 // ray-casting support - a generic Doom-style raycasting engine
 // *********************************************************************************
 // *********************************************************************************
 
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

// *********************************************************************************
// *********************************************************************************
// Blocks - edit them here!
// *********************************************************************************
// *********************************************************************************
blocks[0] = `block | Description
------|---------------------------
   0  | This text
   1  | Utility / Benchmark
   2  | Geometry
  10  | Turtle graphics support
  11  | Turtle graphics documentation
`;

blocks[1] = `( Utility and benchmark words )
: @a a@ @ ;      : @a+ a@ dup 1+ a! @ ;
: @b b@ @ ;      : @b+ b@ dup 1+ b! @ ;
: >ab >b >a ;   : <ab <a <b ;
: k 1000 * ;    : mil k k ;
: lap timer ;   : .lap timer swap - . ;
: bm lap swap for next .lap ;
: dump swap >a for a@ . ." - " @a+ . cr next <a ;
2 load  10 load  20 load
`;

blocks[2] = `( Geometry words )
: deg>rad  ( deg--rad )  pi * 180 / ;
: rad>deg  ( rad--deg )  180 * pi / ;
: squared  ( n-- n1 )    dup * ;
: area     ( r--n )      squared pi * ;
: diameter ( r--n )      dup + ;
: circumference ( r--n ) 2 * pi * ;
: ft>mile ( ft--mi ) 5280 / ;
: mile>ft ( mi--ft ) 5280 * ;
`;

// *********************************************************************************
// Turtle graphics support
blocks[10] = `( Turtle graphics support, ttl => turtle )
var ttl-x       var ttl-y
var ttl-angle   var pen-state

: pen-color ( r g b-- ) stroke ;
: pen-up    ( -- )    0 pen-state ! ;
: pen-down  ( -- )   -1 pen-state ! ;
: pen-down? ( -- n )  pen-state @ ;

: ttl-goto ( x y-- )
    pen-down? if begin-path ttl-x @ ttl-y @ move-to then
    ttl-y ! ttl-x !
    pen-down? if ttl-x @ ttl-y @ line-to stroke-path then ;

: ttl-fw ( distance -- )
    >b ttl-angle @ deg>rad >a
    ttl-x @ a@ sin b@ * +
    ttl-y @ a@ cos b@ * -
    ttl-goto <a <b ;
  
: ttl-rt ( angle -- ) ttl-angle @ + ttl-angle ! ;
: ttl-lt ( angle -- ) negate ttl-rt ;
: ttl-home  ( -- ) pen-up
    canvas-width 2 / canvas-height 2 /
    ttl-goto 0 ttl-angle ! ;
: ttl-square ( size -- ) pen-down? >t
    pen-down 4 for dup ttl-fw 90 ttl-rt next drop t> pen-state ! ;
ttl-home
`;

blocks[11] = `( Turtle graphics documentation )
ttl-x      ( --addr )  x-coordinate of turtle
ttl-y      ( --addr )  y-coordinate of turtle
ttl-angle  ( --addr )  heading of turtle in degrees
ttl-goto   ( x y-- )   goto to (x, y), with pen check
ttl-fw     ( dst-- )   move forward
ttl-rt     ( deg-- )   turn right 
ttl-lt     ( deg-- )   turn left
ttl-home   ( -- )      move to home position (canvas center)
ttl-square ( size-- )  draw a square
pen-color  ( r g b-- ) set pen color
pen-state  ( --addr )  pen state (0 => up, -1 => down)
pen-up     ( -- )      lift pen up (not drawing)
pen-down   ( -- )      put pen down (drawing)
pen-down?  ( --f )     f: TRUE (-1) if pen is down
`;
