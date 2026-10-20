// Blocks - edit them here!
blocks[0] = `block | Description
------|---------------------------
   0  | This text
   1  | Utility / Benchmark
   2  | Geometry
  10  | Turtle graphics support
  11  | Turtle graphics documentation
  20  | Doom Demo words
  21  | Doom Demo documentation
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
: squared  ( n-- n1 )    dup * ;
: area     ( r--n )      squared pi * ;
: diameter ( r--n )      dup + ;
: circumference ( r--n ) 2 * pi * ;
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
: square ( size -- ) pen-down? >t
    pen-down 4 for dup ttl-fw 90 ttl-rt next drop t> pen-state ! ;
ttl-home
`;

blocks[11] = `( Turtle graphics documentation )
ttl-x      ( --addr )  x-coordinate of turtle
ttl-y      ( --addr )  y-coordinate of turtle
ttl-angle  ( --addr )  heading of turtle in degrees
pen-color  ( r g b-- ) pen color
pen-state  ( --addr )  pen state (0 => up, -1 => down)
pen-up     ( -- )      put pen up
pen-down   ( -- )      put pen down
pen-down?  ( --f )     check if pen is down
ttl-goto   ( x y-- )   goto to position (x, y), with pen
ttl-fw     ( dst-- )   move forward
ttl-rt     ( deg-- )   turn right
ttl-lt     ( deg-- )   turn left
ttl-home   ( -- )      move to home position (canvas center)
square     ( size-- )  draw a square
`;

// *********************************************************************************
 // Demo words
blocks[20] = `( Doom-O words )
: go game-go redraw ."  Running!" 4 list ;
: stop game-stop ."  Stopped!" ;
: update game-frame ;
: hkey ( n -- ) ( Handle Keys )
    2 mod/ if mF then ( fwd )
    2 mod/ if mL then ( left )
    2 mod/ if mB then ( back )
    2 mod/ if mR then ( right )
    2 mod/ if tL then ( turn left )
    1 and  if tR then ( turn right )
    redraw ;
`;

blocks[21] = `( Doom-O Documentation )
( Keyboard controls: WASD to move, JK to turn, ESC to stop )
( game-go      -- Initialize and start the game )
( game-stop    -- Stop the game and return to Forth )
( game-pause   -- Pause the game (ignore input) )
( game-resume  -- Resume from pause )
( game-paused? -- Check if game is paused )
( mF           -- Move forward )
( mB           -- Move backward )
( mL           -- Move left )
( mR           -- Move right )
( tL           -- Turn left )
( tR           -- Turn right )
`;
