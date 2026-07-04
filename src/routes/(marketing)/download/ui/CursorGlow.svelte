<script lang="ts">

    import { onMount } from "svelte";

    let x=0;

    let y=0;

    function move(e:MouseEvent){

        x=e.clientX;

        y=e.clientY;

    }

    onMount(()=>{

        window.addEventListener(

            "pointermove",

            move,

            {passive:true}

        );

        return()=>{

            window.removeEventListener(

                "pointermove",

                move

            );

        }

    });

</script>

<div

class="cursor"

style="transform:translate({x}px,{y}px)"

>

</div>

<style>

.cursor{

position:fixed;

left:-200px;

top:-200px;

width:420px;

height:420px;

border-radius:50%;

pointer-events:none;

background:

radial-gradient(

circle,

rgba(242,101,34,.18),

transparent 70%

);

filter:blur(55px);

z-index:-1;

transition:

transform .18s cubic-bezier(.22,1,.36,1);

}

@media(pointer:coarse){

.cursor{

display:none;

}

}

</style>
