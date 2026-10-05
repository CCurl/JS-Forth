// jsforth.js - (c) Chris Curl, MIT license

mem = [], dictionary = [];
dstk = 0,     dsp = dstk, dse = 64;       // Data stack
rstk = dse+1, rsp = rstk, rse = rstk+64;  // Return stack
lstk = rse+1, lsp = lstk, lse = lstk+30;  // Loop stack
tstk = lse+1, tsp = tstk, tse = tstk+32;  // Temp stack
here = tse+1, last = -1, pc = -1, varA=0, varB=0;
tib = '', wd = '';
pos = 0, tibLen = 0, cycle = 0;
compiling = false;

// define(name, immediate) adds an entry to the dictionary
function define(name, immediate = false) {
  dictionary[++last] = { name, xt: here, immediate };
  return dictionary[last];
}

function findWord(name) {
  for (let i = last; i >= 0; i--) {
    if (dictionary[i].name === name) return dictionary[i];
  }
  return null;
}

function under()     { throw new Error('Stack underflow'); }
function push(val)   { if (dsp < dse) mem[++dsp] = val; }
function rPush(val)  { if (rsp < rse) mem[++rsp] = val; }
function lPush(val)  { if (lsp < lse) mem[++lsp] = val; }
function tPush(val)  { if (tsp < tse) mem[++tsp] = val; }
function pop()       { return (dstk < dsp) ? mem[dsp--] : under(); }
function rPop()      { return (rstk < rsp) ? mem[rsp--] : under(); }
function lPop()      { return (lstk < lsp) ? mem[lsp--] : under(); }
function tPop()      { return (tstk < tsp) ? mem[tsp--] : under(); }
function TOS()       { return mem[dsp]; }
function NOS()       { return mem[dsp-1]; }
function setTOS(val) { mem[dsp] = val; }
function setNOS(val) { mem[dsp-1] = val; }
function Comma(x)    { mem[here++] = x; }
function L0()        { return mem[lsp]; }
function L1()        { return mem[lsp-1]; }
function L2()        { return mem[lsp-2]; }
function unloop()    { lPop(); lPop(); lPop(); }
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
function definePrim(name, fn) { define(name).xt = fn; }
function defineImm(name, fn)  { define(name, true).xt = fn; }

function sQuote() {
  ++pos; // skip the initial space
  nextWord('"');
  const str = new String(wd);  // this creates a copy of the current word
  if (compiling) { Comma(lit); Comma(str); }
  else { push(str); }
}

function doVar() {
  if (nextWord(' ') === 0) { throw new Error('expected a variable name'); }
  define(wd);
  Comma(lit);
  Comma(here+2); // allocate space for the variable
  Comma(exit);
  Comma(0);
}

function doWords() {
  num = 0, cnt = 0, str = '';
  for (let i = last; i >= 0; i--) {
    const name = dictionary[i].name;
    str += `${name}\t`;
    ++cnt; ++num;
    num += name.length/8;
    if (9 < num) { type(str+'\n'); num = 0; str = ''; }
  }
  type(`${str} (${cnt} words)`);
}

function definePrimitives() {
  definePrim('+',      () => { t=pop(); setTOS(TOS() + t); });
  definePrim('-',      () => { t=pop(); setTOS(TOS() - t); });
  definePrim('*',      () => { t=pop(); setTOS(TOS() * t); });
  definePrim('/',      () => { t=pop(); setTOS(TOS() / t); });
  definePrim('<',      () => { t=pop(); setTOS((TOS() < t) ? -1 : 0); });
  definePrim('=',      () => { t=pop(); setTOS((TOS()===t) ? -1 : 0); });
  definePrim('>',      () => { t=pop(); setTOS((TOS() > t) ? -1 : 0); });
  definePrim('0=',     () => { setTOS(TOS() === 0 ? -1 : 0); });
  definePrim('and',    () => { t=pop(); setTOS(TOS() & t); });
  definePrim('or',     () => { t=pop(); setTOS(TOS() | t); });
  definePrim('xor',    () => { t=pop(); setTOS(TOS() ^ t); });
  definePrim('com',    () => { t=pop(); setTOS(~TOS()); });
  definePrim('dup',    () => { push(TOS()); });
  definePrim('drop',   () => { pop(); });
  definePrim('swap',   () => { n=NOS(); t=TOS(); setTOS(n); setNOS(t); });
  definePrim('over',   () => { n=NOS(); push(n); });
  definePrim('@',      () => { setTOS(mem[TOS()]); });
  definePrim('!',      () => { t=pop(); n=pop(); mem[t] = n; });
  definePrim(',',      () => { Comma(pop()); });
  definePrim('.',      () => { dot(pop()); });
  definePrim('for',    () => { lPush(pc); lPush(pop()); lPush(0); });
  definePrim('i',      () => { push(L0()); });
  definePrim('next',   () => { if (L0() < L1()) { ++mem[lsp]; pc=L2(); } else { unloop(); } });
  definePrim('emit',   () => { emit(pop()); });
  definePrim('exit',   () => { exit(); });
  definePrim('type',   () => { doType(); });
  definePrim('words',  () => { doWords(); });
  definePrim('var',    () => { doVar(); });
  definePrim('>t',     () => { tPush(pop()); });
  definePrim('t@',     () => { push(mem[tsp]); });
  definePrim('t>',     () => { push(tPop()); });
  definePrim('a',      () => { push(varA); });
  definePrim('a!',     () => { varA = pop(); });
  definePrim('b',      () => { push(varB); });
  definePrim('b!',     () => { varB = pop(); });
  definePrim('1+',     () => { ++mem[dsp]; });
  definePrim('cycle',  () => { push(cycle); });
  definePrim('timer',  () => { push(Date.now()); });
  definePrim('immediate', () => { dictionary[last].immediate = true; });
  defineImm('s"',      () => { sQuote(); });
  defineImm('."',      () => { sQuote(); if (compiling) { Comma(doType); } else { doType(); } });
  defineImm('if',      () => { Comma(jmpz); push(here); Comma(0); });
  defineImm('then',    () => { mem[pop()] = here; });
  defineImm('begin',   () => { push(here); });
  defineImm('while',   () => { Comma(jmpnz); Comma(pop()); });
  defineImm('until',   () => { Comma(jmpz);  Comma(pop()); });
  defineImm('again',   () => { Comma(jmp);   Comma(pop()); });
}

function inner(start) {
  pc = start;
  while ((pc)  && (pc < mem.length)) {
    ++cycle;
    const op = mem[pc++];
    if (op === undefined) { return; }
    if (typeof op === 'function') { op(); }
    else {
      if (mem[pc] != exit) { rPush(pc); }
      pc = op;
    }
  }
}

function nextWord(delim) {
  wd = '';
  const isSpace = (delim === ' ');
  const isWS = (p) => { return tib.charCodeAt(p) < 33; };

  if (isSpace) {
    while ((pos < tibLen) && isWS(pos)) { pos++; }
  }
  const start = pos;
  while (pos < tibLen) {
    if (isSpace && isWS(pos)) { break; }
    if ((delim === tib[pos])) { break; }
    pos++;
  }
  wd = tib.slice(start, pos);
  if (!isSpace) { pos++; }
  return wd.length;
}

function doNum(token) {
  const num = Number(token);
  if (isNaN(num)) { return false; }
  if (compiling) { Comma(lit); Comma(num); }
  else { push(num); }
  return true;
}

function doWord(token) {
  const entry = findWord(token);
  if (!entry) { return false; }
  if (entry.immediate || !compiling) {
    const x = here+100;
    mem[x] = entry.xt;
    mem[x+1] = undefined;
    inner(x);
  } else {
    Comma(entry.xt); // compile reference
  }
  return true;
}

function doColon(token) {
  if (token != ':') { return false; }
  if (nextWord(' ') === 0) { throw new Error('expected a name after ":"'); }
  define(wd);
  compiling = true;
  return true;
}

function doSemi(token) {
  if (token != ';') { return false; }
  Comma(exit);
  compiling = false;
  return true;
}

function outer(source) {
  tib = source;
  tibLen = tib.length;
  pos = 0;
  while (nextWord(' ') > 0) {
    if (doColon(wd)) { continue; }
    if (doSemi(wd)) { continue; }
    if (doNum(wd)) { continue; }
    if (doWord(wd)) { continue; }
    throw new Error(`unknown word: ${wd}`);
  }
}

definePrimitives();

function runForth(src) {
  const input = src ?? document.getElementById('forth-block').value;
  const output = document.getElementById('forth-output');
  const lines = [];
  const origLog = console.log;
  console.log = (...args) => lines.push(args.join(' '));
  try {
    outer(input);
    if (!src){ type(' ok\n'); }
    output.textContent = lines.join('');
  } catch (e) {
    output.textContent = lines.join('');
    output.textContent += `\nError: ${e.message}`;
  } finally {
    console.log = origLog;
  }
}

// For handling embedded Forth scripts in the HTML document
window.addEventListener('load', async ()=>{              // load event handler
    let slst = document.getElementsByTagName('script')   // get scripts
    for (let i=0; i<slst.length; i++) {
        let s = slst[i]
        if (s.type != 'application/forth') continue;     // handle embedded Forth 
        if (s.src) {                                     // handle nested scripts
            await fetch(s.src)                           // fetch remote Forth script
            .then(r=>r.text())                           // get Forth commands
            .then(cmd=>runForth(cmd))                    // send it to Forth VM
        }
        else runForth(s.innerText)
    }
});
