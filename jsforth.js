// jsforth.js - (c) Chris Curl, MIT license

mem = [], dict = [], blocks = [];
dstk = 0,   dsp = dstk, dse = 59;    // Data stack
rstk = 60,  rsp = rstk, rse = 119;   // Return stack
tstk = 100, tsp = tstk, tse = 169;   // Temp stack
lstk = 170, lsp = lstk, lse = 199;   // Loop stack
here = 200, last = -1, pc = -1, varA = 0, varB = 0;
tib = '', wd = '', pos = 0, tibLen = 0;
compiling = false;

function forthInit() {
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
  definePrim('com',    () => { setTOS(~TOS()); });
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
  definePrim('next',   () => { ++mem[lsp]; if (L0()<L1()) pc=L2(); else unloop(); });
  definePrim('emit',   () => { emit(pop()); });
  definePrim('exit',   () => { exit(); });
  definePrim('type',   () => { doType(); });
  definePrim('words',  () => { doWords(); });
  definePrim('var',    () => { doVar(); });
  definePrim('const',  () => { doConst(); });
  definePrim('>t',     () => { tPush(pop()); });
  definePrim('t@',     () => { push(mem[tsp]); });
  definePrim('t>',     () => { push(tPop()); });
  definePrim('a',      () => { push(varA); });
  definePrim('a!',     () => { varA = pop(); });
  definePrim('b',      () => { push(varB); });
  definePrim('b!',     () => { varB = pop(); });
  definePrim('1+',     () => { ++mem[dsp]; });
  definePrim('timer',  () => { push(Date.now()); });
  definePrim('here',   () => { push(here); });
  definePrim('load',   () => { t=pop(); doLoad(t); });
  definePrim('list',   () => { t=pop(); listForthBlock(t); });
  definePrim('see',    () => { doSee(); });
  definePrim('html!',  () => { t=pop(); n=pop(); setHTMLValue(t, n); });
  definePrim('immediate', () => { dict[last].immediate = true; });
  defineImm('s"',      () => { sQuote(); });
  defineImm('."',      () => { sQuote(); if (compiling) { Comma(doType); } else { doType(); } });
  defineImm('if',      () => { Comma(jmpz); push(here); Comma(0); });
  defineImm('then',    () => { mem[pop()] = here; });
  defineImm('begin',   () => { push(here); });
  defineImm('while',   () => { Comma(jmpnz); Comma(pop()); });
  defineImm('until',   () => { Comma(jmpz);  Comma(pop()); });
  defineImm('again',   () => { Comma(jmp);   Comma(pop()); });
}  

function definePrim(name, fn) { addWord(name).xt = fn; }
function defineImm(name, fn)  { addWord(name, true).xt = fn; }
function under(s)    { throw new Error(`${s} Stack underflow`); }
function push(val)   { if (dsp < dse) mem[++dsp] = val; }
function rPush(val)  { if (rsp < rse) mem[++rsp] = val; }
function lPush(val)  { if (lsp < lse) mem[++lsp] = val; }
function tPush(val)  { if (tsp < tse) mem[++tsp] = val; }
function pop()       { return (dstk < dsp) ? mem[dsp--] : under('Data'); }
function rPop()      { return (rstk < rsp) ? mem[rsp--] : under('Return'); }
function lPop()      { return (lstk < lsp) ? mem[lsp--] : under('Loop'); }
function tPop()      { return (tstk < tsp) ? mem[tsp--] : under('Temp'); }
function TOS()       { return mem[dsp]; }
function NOS()       { return mem[dsp-1]; }
function setTOS(val) { mem[dsp] = val; }
function setNOS(val) { mem[dsp-1] = val; }
function Comma(x)    { mem[here++] = x; }
function nComma(a)   { for (let i=0; i<a.length; i++) { Comma(a[i]); } }
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
function doLoad(n)   { if (blocks[n]) { outer(blocks[n]); } }
function errNoWord() { throw new Error(`expected a word`); }
function checkWord() { x = nextWord(); if (!x) errNoWord(); return x; }
function doComment() { while (nextWord() && (wd !== ')')) {} }
function doColon()   { checkWord(); addWord(wd); compiling = true; }
function doSemi()    { Comma(exit); compiling = false; }
function doVar()     { checkWord(); addWord(wd); nComma([lit, here+3, exit, 0]); }
function doConst()   { checkWord(); addWord(wd); nComma([lit, pop(), exit]); }

function addWord(name, immediate = false) {
  dict[++last] = { name, xt: here, immediate };
  return dict[last];
}  

function findWordIndex(name) {
  for (let i = last; i >= 0; i--) {
    if (dict[i].name === name) return i;
  }  
  return -1;
}  

function findByXT(xt) {
  for (let i = last; i >= 0; i--) {
    if (dict[i].xt === xt) return dict[i];
  }  
  return null;
}  

function findWord(name) {
  const i = findWordIndex(name);
  return (0 <= i) ? dict[i] : undefined;
}  

function sQuote() {
  ++pos; // skip the initial space
  nextWord('"');
  push(new String(wd));
  if (compiling) { nComma([lit, pop()]); }
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
  if (i !== -1) {
    const e = dict[i];
    if (typeof e.xt === 'function') {
      type(`${wd}: ${e.xt.toString()}\n`);
      return;
    }
    const f = e.xt, t = (i == last) ? here : dict[i+1].xt;
    type(`Word: ${wd} - ${f}:${t-1}\n`);
    for (let j = f; j < t; j++) {
      let op = mem[j], desc = ''
      if (typeof op === 'number') {
        const c = findByXT(op);
        if (c) { desc = ` (${c.name})`; }
      }
      type(`${j}: ${op}${desc}\n`);
    }
  } else {
    type(`see: ${wd} not found\n`);
  }
}

function inner(start) {
  pc = start;
  while ((pc)  && (pc < mem.length)) {
    const op = mem[pc++];
    if (op === undefined) { return; }
    if (typeof op === 'function') { op(); }
    else {
      if (mem[pc] != exit) { rPush(pc); }
      pc = op;
    }
  }
}

function nextWord(delim = ' ') {
  wd = '';
  const isSpace = (delim === ' ');
  const isWS = (p) => { return tib.charCodeAt(p) < 33; };

  if (isSpace) { while ((pos < tibLen) && isWS(pos)) { pos++; } }

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
  if (compiling) { nComma([lit, num]); }
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

function outer(source) {
  const s1 =  tib, p1 = pos, l1 = tibLen;
  tib = source;
  tibLen = tib.length;
  pos = 0;
  while (nextWord() > 0) {
    if (wd == '(') { doComment(); continue; }
    if (wd == ':') { doColon(); continue; }
    if (wd == ';') { doSemi(); continue; }
    if (doNum(wd)) { continue; }
    if (doWord(wd)) { continue; }
    throw new Error(`unknown word: ${wd}`);
  }
  tib = s1; pos = p1; tibLen = l1;
}

forthInit();

function runForth(src) {
  const input = src ?? '';
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

// Blocks - edit them here!
blocks[0] = '\
: >a a >t a! ;  : @a a @ ;  : @a+ a dup 1+ a! @ ; : <a t> a! ;\n\
: >b b >t b! ;  : @b b @ ;  : @b+ b dup 1+ b! @ ; : <b t> b! ;\n\
: >ab >b >a ;   : <ab <a <b ;\n\
';
blocks[1] = '\
0 load\n\
: k 1000 * ; : mil k k ;\n\
: lap timer ; : .lap timer swap - . ;\n\
: bm lap swap for next .lap ;\n\
: dump swap >a for a . ." - " @a+ . cr next <a ;\n\
';
blocks[2] = '\
355 113 / const pi\n\
: squared ( n-- n1 ) dup * ;\n\
: circle-area ( r--n ) squared pi * ;\n\
: diameter ( r--n ) dup + ;\n\
: circumference ( r--n ) 2 pi * * ;\n\
';
