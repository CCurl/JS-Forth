# Forth.js - A Forth Interpreter in JavaScript

A minimal, efficient Forth interpreter that runs in the browser. Supports word definitions, arithmetic, stack operations, memory access, and can be embedded directly in HTML via `<script type="application/forth">` tags.

## Quick Start
- Copy the 2 files: 'jsforth.html' and 'jsforth.js'.
- Paste them into a folder of your choice.
- Open the 'jsforth.html' file in a browser of your choice.
- NOTE: there is another file (doom-o.js) that demonstrates how to use ray-casting
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
  - Data Stack: base 0, grows upward (0-59)
  - Return Stack: base 60, grows upward (60-119)
  - Temp Stack: base 100, grows upward (100-169)
  - Loop Stack: base 170, grows upward (170-199)
  - Compiled Code: starts at address 200
- **Dictionary (`dictionary[]`)**: Array of word definitions with:
  - len: length of the word's name
  - name: name of the word
  - xt: execution token (function for prims, index for colon-words)
  - imm: immediate flag
- **Input Buffer (`tib`, `toIn`, `tibLen`)**: Tokenization state
- **Program Counter (`pc`)**: Current instruction pointer during execution
- **Opcode (`op`)**: Current instruction during execution
- **Compilation Flag (`state`)**: Tracks execution mode (0 = immediate/execute, 1 = compile)

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

### Embedded Forth Scripts

Embed Forth code directly in HTML using `type="application/forth"`:

```html
<script type="application/forth">
   ." hello world!"
</script>

<script type="application/forth" src="program.fth"></script>
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

### Forth Word Reference

- Stack effects use `( i--o )` to separate inputs from outputs.
- True comparison results are `-1`; false results are `0`.
- Numeric values can be either integer or floating point unless specified.

| Name               | Stack                  | Description|
|--------------------|------------------------|--------------------------------------------------|
| dup                | ( n--n n )             | Duplicate TOS.|
| drop               | ( n-- )                | Remove TOS.|
| swap               | ( a b--b a )           | Exchange the top two items.|
| over               | ( a b--a b a )         | Copy NOS to the top.|
| .s                 | ( -- )                 | Display the data stack without removing items.|
| +                  | ( a b--result )        | Add two values.|
| -                  | ( a b--result )        | Subtract TOS value from NOS.|
| *                  | ( a b--result )        | Multiply two values.|
| /                  | ( a b--result )        | Division (float, not truncated).|
| negate             | ( n---n )              | Negate TOS.|
| /mod               | ( a b--quot rem )      | Integer divide and modulo.|
| mod/               | ( a b--rem quot )      | Integer modulo and divide.|
| <                  | ( a b--flag )          | Compare whether the NOS is less than TOS.|
| =                  | ( a b--flag )          | Compare whether NOS and TOS are equal.|
| >                  | ( a b--flag )          | Compare whether NOS is greater than TOS.|
| 0=                 | ( n--flag )            | Test whether TOS is zero.|
| 1+                 | ( n--n+1 )             | Increment TOS.|
| 1-                 | ( n--n-1 )             | Decrement NOS.|
| and                | ( a b--result )        | Bitwise AND of NOS and TOS.|
| or                 | ( a b--result )        | Bitwise OR of NOS and TOS.|
| xor                | ( a b--result )        | Bitwise XOR of NOS and TOS.|
| com                | ( n--result )          | Bitwise complement of TOS.|
| @                  | ( addr--value )        | Fetch a memory cell.|
| !                  | ( value addr-- )       | Store a value at an address.|
| ,                  | ( n-- )                | Compile a value at the current here address.|
| here               | ( --addr )             | Push the current compilation address.|
| allot              | ( n-- )                | Allocate memory by incrementing here by `n`.|
| .                  | ( n-- )                | Print TOS; numeric values are followed by a space.|
| type               | ( str-- )              | Print and remove a string.|
| emit               | ( char-code-- )        | Print the character for a character code.|
| html!              | ( value id-str-- )     | Set an element's textContent.|
| s"                 | ( -- )                 | Compile or push a string.|
| ."                 | ( -- )                 | Compile or print a string.|
| if ... then        | ( flag-- )             | Execute the body when the flag is nonzero.|
| begin ... until    | ( flag-- )             | Jump to begin while the flag is zero.|
| begin ... while    | ( flag-- )             | Jump to begin when the flag is nonzero.|
| begin ... again    | ( -- )                 | Unconditionally jump back to begin.|
| for ... next       | ( n-- )                | Run the body the specified number of times.|
| i                  | ( --index )            | Push the current loop index, starting at zero.|
| unloop             | ( -- )                 | Reset to the previous loop context. Does NOT exit the loop.|
| exit               | ( -- )                 | Exit from the current word.|
| words              | ( -- )                 | Print the defined word names.|
| see                | ( -- )                 | Read the next input word and print its definition.|
| var                | ( -- )                 | Define the next word as a variable.|
| const              | ( n-- )                | Define the next word as a constant for `n`.|
| immediate          | ( -- )                 | Mark the most recently defined word as immediate.|
| load               | ( block-num-- )        | Execute a stored block.|
| list               | ( block-num-- )        | Display a stored block in the UI textarea.|
| a@                 | ( --val )              | Push the value of variable a.|
| b@                 | ( --val )              | Push the value of variable b.|
| a!                 | ( val-- )              | Store the TOS in variable a.|
| b!                 | ( val-- )              | Store the TOS in variable b.|
| >a                 | ( val-- )              | Save a and set a to `val`.|
| >b                 | ( val-- )              | Save b and set b to `val`.|
| <a                 | ( -- )                 | Restore variable a's previous value.|
| <b                 | ( -- )                 | Restore variable b's previous value.|
| >t                 | ( val-- )              | Move the TOS to the temporary stack.|
| t@                 | ( --val )              | Copy the temporary stack's TOS to the data stack.|
| t!                 | ( val-- )              | Set the temporary stack's TOS to `val`.|
| t>                 | ( --val )              | Pop the temporary stack onto the data stack.|
| <t                 | ( -- )                 | Pop and discard from the temporary stack.|
| timer              | ( --time )             | Push the current high-precision time.|
| sin                | ( radians--result )    | Push the sine of an angle in radians.|
| cos                | ( radians--result )    | Push the cosine of an angle in radians.|
| base@              | ( --base )             | Get the current number base (default 10).|
| base!              | ( base-- )             | Set the current number base.|
| state@             | ( --state )            | Get the compilation state (0=execute, 1=compile).|
| state!             | ( state-- )            | Set the compilation state (0=execute, 1=compile).|
| ttl-fw             | ( distance-- )         | Move forward, drawing when the pen is down.|
| ttl-rt             | ( angle-- )            | Turn right by an angle in degrees.|
| ttl-lt             | ( angle-- )            | Turn left by an angle in degrees.|
| pen-up             | ( -- )                 | Lift the pen off the writing surface.|
| pen-down           | ( -- )                 | Lower the pen onto the writing surface.|
| pen-color          | ( r g b-- )            | Set the pen (stroke) color.|
| ttl-goto           | ( x y-- )              | Move to X/Y, drawing if the pen is down.|
| ttl-square         | ( size-- )             | Draw a square of the given side length.|
| ttl-home           | ( -- )                 | Return to the canvas center and reset heading.|
| canvas-width       | ( --n )                | Push the canvas width.|
| canvas-height      | ( --n )                | Push the canvas height.|
| canvas-width!      | ( n-- )                | Set the canvas width.|
| canvas-height!     | ( n-- )                | Set the canvas height.|
| resize-canvas      | ( width height-- )     | Set width and height.|
| clear              | ( -- )                 | Clear the canvas.|
| color              | ( r g b-- )            | Set fill color.|
| stroke             | ( r g b-- )            | Set line/stroke color.|
| fill-alpha         | ( alpha-- )            | Set global alpha from 0 to 255.|
| line-width         | ( pixels-- )           | Set stroke width.|
| rect               | ( x y width height-- ) | Fill a rectangle.|
| rect-stroke        | ( x y width height-- ) | Outline a rectangle.|
| circle             | ( x y radius-- )       | Fill a circle.|
| circle-stroke      | ( x y radius-- )       | Outline a circle.|
| pi                 | ( --pi )               | Push the value of pi.|
| begin-path         | ( -- )                 | Begin a new path.|
| move-to            | ( x y-- )              | Set the current path point.|
| line-to            | ( x y-- )              | Add a line to the current path.|
| stroke-path        | ( -- )                 | Stroke the current path.|
| fill-path          | ( -- )                 | Fill the current path.|
| close-path         | ( -- )                 | Close the current path.|
| pixel              | ( x y-- )              | Draw one pixel.|
| save-state         | ( -- )                 | Save the canvas drawing state.|
| restore-state      | ( -- )                 | Restore the previously saved canvas drawing state.|
| translate          | ( x y-- )              | Translate the canvas.|
| rotate             | ( angle-- )            | Rotate in radians.|
| scale              | ( scale-x scale-y-- )  | Scale the canvas.|
| font               | ( str-- )              | Set the canvas font.|
| text               | ( str x y-- )          | Fill text at a position.|
| text-stroke        | ( str x y-- )          | Outline text at a position.|
| image-data         | ( x y width height-- ) | Copy a canvas rectangle to the temporary stack.|
| put-image-data     | ( x y-- )              | Put the saved image data at a position.|
| load-sprite        | ( url-address--index ) | Load an image from a URL and push its sprite index.|
| draw-sprite        | ( index x y-- )        | Draw a loaded sprite at native size.|
| draw-sprite-scaled | ( index x y w h-- )    | Draw a loaded sprite at a specified size.|
| sprite-width       | ( index--pixels )      | Push a sprite's loaded width.|
| sprite-height      | ( index--pixels )      | Push a sprite's loaded height.|
| redraw             | ( -- )                 | Request a redraw.|
| redraw?            | ( --flag )             | Push true (-1) when a redraw is pending, otherwise false (0).|

## Implementation Details

### Function Reference

- `push(val)` - Add value to data stack
- `pop()` - Remove and return top of stack (throws error on underflow)
- `TOS()` / `NOS()` - Peek at top/next-on-stack without removing
- `setTOS(val)` / `setNOS(val)` - Modify top/next-on-stack without popping
- `Comma(x)` - Store value at `here` pointer and increment
- `nComma(array)` - Store multiple values via Comma
- `rPush(val)` / `rPop()` - Return stack operations
- `lPush(val)` / `lPop()` - Loop stack operations
- `tPush(val)` / `tPop()` - Temp stack operations
- `colonWord()` - Dispatch handler for colon-defined words
- `inner(start)` - Execute compiled code starting at address; calls functions directly
- `outer(source)` - Parse and execute/compile source string
- `addWord(name, immediate)` - Add entry to dictionary
- `findWord(name)` - Look up word by name
- `findWordIndex(name)` - Find word index in dictionary
- `findByXT(xt)` - Find word by execution token
- `forthPrim(name, fn)` - Register a primitive (function) in the dictionary
- `forthImm(name, fn)` - Register an IMMEDIATE primitive in the dictionary
- `nextWord()` - Extract next whitespace-delimited token from input buffer
- `delimWord(delim)` - Extract token delimited by a specific character
- `doNum(token)` - Parse and handle numeric literal
- `doWord(token)` - Look up and execute/compile word
- `doColon()` - Begin word definition
- `doSemi()` - End word definition
- `doLit(n)` - Handle numeric literals during compilation or execution
- `listForthBlock(n)` - Display block n in the UI textarea
- `setHTMLValue(id, val)` - Update HTML element with given ID
- `doSee()` - Inspect word definition

## Browser Integration

The window `load` event handler automatically:
- Finds all `<script type="application/forth">` tags
- Loads external files via `fetch()` if `src` is set
- Executes inline Forth code
- Routes output to console.log (captured and displayed)
- This is accomplished by the `window.addEventListener()` code in `jsforth.js`
