// jsforth.js - (c) Chris Curl, MIT license

mem = [], dict = [], blocks = [];
dstk = 0,   dsp = dstk, dse = 59;    // Data stack
rstk = 60,  rsp = rstk, rse = 119;   // Return stack
tstk = 100, tsp = tstk, tse = 169;   // Temp stack
lstk = 170, lsp = lstk, lse = 199;   // Loop stack
here = 200, last = -1, pc = -1, varA = 0, varB = 0;
tib = '', wd = '', pos = 0, tibLen = 0;
base = 10, state = 0;

function forthInit() {
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
  forthPrim('.',      () => { doNWB(pop(),0,base); type(' ');});
  forthPrim('for',    () => { lPush(pc); lPush(pop()); lPush(0); });
  forthPrim('i',      () => { push(L0()); });
  forthPrim('next',   () => { ++mem[lsp]; if (L0()<L1()) pc=L2(); else unloop(); });
  forthPrim('emit',   () => { emit(pop()); });
  forthPrim('exit',   () => { exit(); });
  forthPrim('type',   () => { doType(); });
  forthPrim('words',  () => { doWords(); });
  forthPrim('var',    () => { doVar(); });
  forthPrim('allot',  () => { here += pop(); });
  forthPrim('const',  () => { doConst(); });
  forthPrim('>t',     () => { tPush(pop()); });
  forthPrim('t@',     () => { push(mem[tsp]); });
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
  forthPrim('1+',     () => { ++mem[dsp]; });
  forthPrim('timer',  () => { push(Date.now()); });
  forthPrim('here',   () => { push(here); });
  forthPrim('load',   () => { t=pop(); doLoad(t); });
  forthPrim('list',   () => { t=pop(); listForthBlock(t); });
  forthPrim('see',    () => { doSee(); });
  forthPrim('sin',    () => { setTOS(Math.sin(TOS())); });
  forthPrim('cos',    () => { setTOS(Math.cos(TOS())); });
  forthPrim('html!',  () => { t=pop(); n=pop(); setHTMLValue(t, n); });
  forthPrim('immediate', () => { dict[last].immediate = true; });
  forthPrim('base@',  () => { push(base); });
  forthPrim('base!',  () => { base = pop(); });
  forthPrim('state@', () => { push(state); });
  forthPrim('state!', () => { state = pop(); });
  forthImm('s"',      () => { sQuote(); });
  forthImm('."',      () => { sQuote(); if (state == 1) { Comma(doType); } else { doType(); } });
  forthImm('if',      () => { Comma(jmpz); push(here); Comma(0); });
  forthImm('then',    () => { mem[pop()] = here; });
  forthImm('begin',   () => { push(here); });
  forthImm('while',   () => { Comma(jmpnz); Comma(pop()); });
  forthImm('until',   () => { Comma(jmpz);  Comma(pop()); });
  forthImm('again',   () => { Comma(jmp);   Comma(pop()); });
}  

function forthPrim(name, fn) { addWord(name).xt = fn; }
function forthImm(name, fn)  { addWord(name, true).xt = fn; }
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
function doSemi()    { Comma(exit); state = 0; }
function doColon()   { checkWord(); addWord(wd); state = 1; }
function doConst()   { checkWord(); addWord(wd); nComma([lit, pop(), exit]); }
function doVar()     { checkWord(); addWord(wd); nComma([lit, here+3, exit, 0]); }
function doLit(n)    { if (state == 1) { nComma([lit, n]); } else { push(n); } }

function addWord(name, immediate = false) {
  dict[++last] = { len: name.length, name, xt: here, immediate };
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
  if (state == 1) { nComma([lit, pop()]); }
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
  for (let i = dstk+1; i <= dsp; i++) { type(` ${mem[i]}`); }
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

function doNum(w) {
	let n = 0, isNeg = false, b = base;
	if ((w[0] == '\'') && (w[2] == w[0]) && (w.length == 3)) {
    doLit(w.charCodeAt(1));
    return true;
  }
	if (w[0] == '%') { b = 2; w = w.slice(1); }
	if (w[0] == '#') { b = 10; w = w.slice(1); }
	if (w[0] == '$') { b = 16; w = w.slice(1); }
	if (b == 10) {
    const x = Number(w);
    if (!isNaN(x)) { doLit(x); return true; }
    if (w[0] == '-') { isNeg = true; w = w.slice(1); }
  }
	if (w.length == 0) { return false; }
	for (let i = 0; i < w.length; i++) {
		let c = w.charCodeAt(i);
    if (c >= 65 && c <= 90) { c = c + 32; }
		let val = ((48 <= c) && (c <= 57)) ? c-48 :
		          ((97 <= c) && (c <= 102)) ? c-87 : -1;
		if ((0 <= val) && (val < b)) { n = (n*b) + val; }
    else { return false; }
	}
  doLit(isNeg ? -n : n);
	return true;
}

function doNWB(n, w, b) {
  if (isNaN(n)) { console.log(n); return; }
  if (!b) { b = base; }
  console.log(n.toString(b).padStart(w, '0'));
}

function doWord(token) {
  const entry = findWord(token);
  if (!entry) { return false; }
  if (entry.immediate || (state == 0)) {
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

function runForth(src, logCmd = true, logOutput = true) {
  const origLog = console.log;
  const lines = [];
  const input = src ?? '';
  if (logOutput) {
    console.log = (...args) => lines.push(args.join(' '));
    if (logCmd) {
      console.log(`--> ${input}\n`);
    }
  }
  try {
    outer(input);
  } catch (e) {
    console.log(`Error: ${e.message}`);
    state = 0;
  } finally {
    if (logOutput) {
      const output = document.getElementById('forth-output');
      output.textContent += lines.join('') + " ok\n";
      output.scrollTop = output.scrollHeight;
    }
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
            .then(cmd=>runForth(cmd, false))             // send it to Forth VM
        }
        else { runForth(s.innerText, false); }
    }
});
