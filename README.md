# Forth.js - A Forth Interpreter in JavaScript

A minimal, efficient Forth interpreter that runs in the browser. Supports word definitions, arithmetic, stack operations, memory access, and can be embedded directly in HTML via `<script type="application/forth">` tags.

## Quick Start
- Copy the 2 files: 'jsforth.html' and 'jsforth.js'.
- Paste them into a folder of your choice.
- Open the 'jsforth.html' file in a browser of your choice.
- Have fun!

## Overview

This is a complete Forth virtual machine implemented in ~300 lines of JavaScript. It features:
- Data stack and return stack with separate memory regions
- Compiled word definitions stored in shared memory
- Immediate words (executed during compilation)
- Dictionary of primitives and user-defined words
- Efficient string parsing with single-pass tokenization
- Automatic execution of embedded Forth scripts on page load
- Support for defining new words with `:` and `;`

## Architecture

### Core Components

- **Memory (`mem`)**: Unified array holding stacks, dictionary, and compiled code
  - Data Stack: base 0, grows upward
  - Return Stack: base 65, grows upward
  - Loop Stack: base 130, grows upward
  - Temp Stack: base 161, grows upward
  - Compiled Code: starts at address 194
- **Dictionary (`dictionary[]`)**: Array of word definitions with name, execution token (xt), and immediate flag
- **Input Buffer (`tib`, `pos`, `tibLen`)**: Tokenization state
- **Program Counter (`pc`)**: Current instruction pointer during execution
- **Compilation Flag (`compiling`)**: Tracks whether in compile or immediate mode

### Execution Model

1. **Outer Interpreter** (`outer()`) - Parses tokens from input string
   - Attempts to parse as number, colon definition, semicolon, or word lookup
   - Throws error on unknown word
   
2. **Inner Interpreter** (`inner()`) - Executes compiled code
   - Fetches and executes opcodes from memory
   - Supports both primitive functions and compiled word addresses
   - Manages return stack for nested word calls
   - Supports tail-call optimization
   
3. **Word Types**
   - **Immediate**: Executed during compilation (e.g., `:`, `;`)
   - **Primitive**: Native functions that manipulate the stack
   - **Compiled**: User-defined sequences of words compiled to memory

### Compilation Process

- `(` skips until the next word that is `)`
- `:` begins a word definition, compiling subsequent words to memory
- `;` ends compilation and appends `exit` token
- Numbers are compiled as `lit` (literal) followed by the value
- Word references are compiled as their execution token (address or function)
- When compiling, `Comma()` stores values at `here`. Then `here` is incremented.

### Block System

Blocks are stored in a JavaScript array (`blocks[]`) and accessed via:
- `n list` - Display block n in the UI textarea
- `n load` - Load/Execute block n
- Blocks are stored in the jsforth.js file - edit them there

### HTML Integration

The interpreter can update HTML elements dynamically:
- `html!` primitive takes a value and element ID from the stack
- Elements are selected by `id` attribute
- Updates set the element's `textContent` property
- Useful for displaying computed results, version info, block numbers, etc.

```forth
s" JS-Forth v2026.10.10" s" hdr" html!   \ Update element id="hdr"
5 s" block-num" html!                    \ Display block number
```

In your HTML, add corresponding `id` attributes:

```html
<h1 id="hdr">??</h1>
<span>Block <pre id="blk-num">??</pre></span>
```

The Forth code then updates these elements when executed.

### Canvas Graphics Words

`graphics.js` registers these words after `initGraphics(canvas)` and
`registerGraphicsWords()` are called. Coordinates are canvas pixels, with the
origin at the top-left and Y increasing downward. RGB arguments are supplied
in red, green, blue order.

- `canvas-width`, `canvas-height` - Push the canvas dimensions: `( -- n )`.
- `canvas-width!`, `canvas-height!` - Set a dimension: `( n -- )`.
- `resize-canvas` - Set width and height: `( width height -- )`.
- `clear` - Clear the canvas.
- `color` - Set fill color: `( r g b -- )`.
- `stroke` - Set line/stroke color: `( r g b -- )`.
- `fill-alpha` - Set global alpha from 0 to 255: `( alpha -- )`.
- `line-width` - Set stroke width: `( pixels -- )`.
- `rect`, `rect-stroke` - Fill or outline a rectangle: `( x y width height -- )`.
- `circle`, `circle-stroke` - Fill or outline a circle: `( x y radius -- )`.
- `pi` - Push the value of pi: `( -- pi )`.
- `move-to`, `line-to` - Set the current path point or add a line: `( x y -- )`.
- `begin-path`, `stroke-path`, `fill-path`, `close-path` - Begin, draw, fill, or close the current path.
- `pixel` - Draw one pixel: `( x y -- )`.
- `save-state`, `restore-state` - Save or restore the canvas drawing state.
- `translate` - Translate the canvas: `( x y -- )`.
- `rotate` - Rotate in radians: `( angle -- )`.
- `scale` - Scale the canvas: `( scale-x scale-y -- )`.
- `font` - Set the canvas font from a zero-terminated Forth string address: `( string-address -- )`.
- `text`, `text-stroke` - Fill or outline text at a position: `( string-address x y -- )`.
- `image-data` - Copy a canvas rectangle to the temporary stack: `( x y width height -- )`.
- `put-image-data` - Put the saved image data at a position: `( x y -- )`.
- `load-sprite` - Load an image from a zero-terminated URL string and push its sprite index: `( url-address -- index )`.
- `draw-sprite` - Draw a loaded sprite at native size: `( x y index -- )`.
- `draw-sprite-scaled` - Draw a loaded sprite at a specified size: `( x y index width height -- )`.
- `sprite-width`, `sprite-height` - Push a sprite's loaded dimension: `( index -- pixels )`.
- `redraw` - Request a redraw; `redraw?` pushes true (`-1`) when one is pending.

### Turtle Graphics

The optional graphics words in `blocks.js` provide a simple turtle for drawing
on the canvas. `ttl-home` moves it to the canvas center, lifts the pen, and
resets its heading. Heading `0` points up; `90` points right, and positive
angles turn clockwise. Canvas coordinates start at the top-left, with Y
increasing downward.

- `ttl-fw` - Move forward by a distance, drawing when the pen is down.
- `ttl-rt` / `ttl-lt` - Turn right / left by an angle in degrees.
- `pen-up` / `pen-down` - Lift or lower the pen.
- `pen-color` - Set the pen (stroke) color: `( r g b -- )`.
- `ttl-goto` - Move to X/Y, drawing if the pen is down: `( x y -- )`.
- `square` - Draw a square of the given side length: `( size -- )`.
- `ttl-home` - Return to the canvas center and reset heading: `( -- )`.

For example, load the turtle support block and draw a square from the center:

```forth
10 load
ttl-home 80 square
```

### Embedded Forth Scripts

Embed Forth code directly in HTML using `type="application/forth"`:

```html
<script type="application/forth">
  ." hello world!"
</script>

<script type="application/forth" src="program.forth"></script>
```

- Inline scripts execute their `innerText`
- External scripts are fetched via `fetch()` and executed
- Auto-execution happens on window `load` event
- Browser ignores `application/forth` MIME type, preventing unwanted parsing

### Programmatic Execution

Call the interpreter directly from JavaScript:

```javascript
// Single execution
runForth('5 3 + .');  // Outputs: 8

// Direct parsing (captures output via console.log override)
outer('10 2 / .');    // Outputs: 5
```

## Primitive Words

Stack effects below use `--` to separate inputs from outputs. True comparison results are `-1`; false results are `0`.

### Stack and Arithmetic
- `dup` - Duplicate the top item: `( n -- n n )`
- `drop` - Remove the top item: `( n -- )`
- `swap` - Exchange the top two items: `( a b -- b a )`
- `over` - Copy the second item to the top: `( a b -- a b a )`
- `+`, `-`, `*`, `/` - Arithmetic: `( a b -- result )`; division uses JavaScript `/` and is not truncated.
- `<`, `=`, `>` - Compare two values: `( a b -- flag )`
- `0=` - Test whether the top item is zero: `( n -- flag )`
- `1+` - Increment the top item: `( n -- n+1 )`

### Bitwise and Memory
- `and`, `or`, `xor` - Bitwise operations on the top two values: `( a b -- result )`
- `com` - Bitwise complement. Complements the top of stack.
- `@` - Fetch a memory cell: `( addr -- value )`
- `!` - Store a value at an address: `( value addr -- )`
- `,` - Compile a value at the current `here` address: `( n -- )`
- `here` - Push the current compilation address: `( -- addr )`

### Output and HTML
- `.` - Print and remove the top item; numeric values are followed by a space: `( n -- )`
- `type` - Print and remove a string: `( str -- )`
- `emit` - Print the character for a character code: `( char-code -- )`
- `html!` - Set an element's `textContent`: `( value id-str -- )`; for example, `5 s" count" html!` sets the text of the element with `id="count"` to `5`.
- `s"` - Read a string up to the next quote; push it, or compile it as a literal when compiling.
- `."` - Read a string and print it immediately, or compile it to print when executed.

### Control Flow
- `if` ... `then` - Execute the body when the flag is nonzero: `( flag -- )`.
- `begin` ... `until` - Repeat back to `begin` while the flag is zero: `( ... flag -- ... )`.
- `begin` ... `while` - Jump back to `begin` when the flag is nonzero; otherwise continue after `while`.
- `begin` ... `again` - Unconditionally jump back to `begin`.
- `for` ... `next` - Run the body the specified number of times: `( n -- )`.
- `i` - Push the current loop index, starting at zero: `( -- index )`.
- `exit` - Return from the current word.

### Dictionary and Blocks
- `words` - Print the defined word names.
- `see` - Read the next input word and print its definition.
- `var` - Read the next word and define it as a variable.
- `const` - Read the next word and define it as a constant using the value popped from the stack.
- `immediate` - Mark the most recently defined word as immediate.
- `load` - Execute a stored block: `( block-num -- )`.
- `list` - Display a stored block in the UI textarea: `( block-num -- )`.

### Variables and Temporary Stack
- `a`, `b` - Push the corresponding variable value: `( -- val )`.
- `a!`, `b!` - Store the top value in the corresponding variable: `( val -- )`.
- `>t` - Move the top data-stack value to the temporary stack: `( val -- )`.
- `t@` - Copy the temporary stack's top value to the data stack: `( -- val )`.
- `t>` - Pop the temporary stack onto the data stack: `( -- val )`.

### Utilities
- `timer` - Push the current Unix timestamp in milliseconds: `( -- ms )`.
- `cycle` - Push the `cycle` variable. The interpreter currently does not increment it.

## Implementation Details

### Function Reference

- `push(val)` - Add value to data stack
- `pop()` - Remove and return top of stack (returns 0 on underflow)
- `TOS()` / `NOS()` - Peek at top/next-on-stack without removing
- `Comma(x)` - Store value at `here` pointer and increment
- `inner(start)` - Execute compiled code starting at address
- `outer(source)` - Parse and execute/compile source string
- `define(name, immediate)` - Add entry to dictionary
- `forthPrim(name, fn)` - Add a primitive to dictionary
- `forthImm(name, fn)` - Add an IMMEDIATE primitive to dictionary
- `nextWord(delim)` - Extract next token from input buffer
- `doNum(token)` - Parse and handle numeric literal
- `doWord(token)` - Look up and execute/compile word
- `doColon(token)` - Begin word definition
- `doSemi(token)` - End word definition
- `listForthBlock(n)` - Display block n in the UI textarea
- `setHTMLValue(id, val)` - Update HTML element with given ID
- `doSee()` - Inspect word definition (next word from input)

## Browser Integration

The window `load` event handler automatically:
- Finds all `<script type="application/forth">` tags
- Loads external files via `fetch()` if `src` is set
- Executes inline Forth code
- Routes output to console.log (captured and displayed)
- This is accomplished by the `window.addEventListener()` code in `jsforth.js`
