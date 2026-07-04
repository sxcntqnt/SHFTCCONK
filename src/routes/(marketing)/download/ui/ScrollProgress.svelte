<script lang="ts">

    import { onMount } from "svelte";

    let progress = 0;

    function update(){

        const max=

            document.documentElement.scrollHeight

            - window.innerHeight;

        progress=(window.scrollY/max)*100;

    }

    onMount(()=>{

        update();

        window.addEventListener("scroll",update,{passive:true});

        window.addEventListener("resize",update);

        return()=>{

            window.removeEventListener("scroll",update);

            window.removeEventListener("resize",update);

        }

    });

</script>

<div

class="progress"

style="width:{progress}%"

></div>

<style>

.progress{

position:fixed;

left:0;

top:0;

height:3px;

z-index:9999;

background:

linear-gradient(

90deg,

#f26522,

#ff914d

);

box-shadow:

0 0 20px rgba(242,101,34,.7);

transition:width .05s linear;

}

</style>
