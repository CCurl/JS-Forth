blocks = [];
blocks[0] = '';
blocks[1] = '\
: >a a >t a! ;  : @a a @ ;  : @a+ a dup 1+ a! @ ; : <a t> a! ;\n\
: >b b >t b! ;  : @b b @ ;  : @b+ b dup 1+ b! @ ; : <b t> b! ;\n\
: >ab >b >a ;   : <ab <a <b ;\n\
: k 1000 * ; : mil k k ;\n\
: lap timer ; : .lap timer swap - . ;\n\
: bm lap swap for next .lap ;\n\
: dump swap >a for a . ." - " @a+ . cr next <a ;\n\
';

loadForthBlock = (n) => {
    document.getElementById('forth-block').value = blocks[n];
}

loadForthBlock(1);
