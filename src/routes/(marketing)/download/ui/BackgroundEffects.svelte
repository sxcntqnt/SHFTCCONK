<script lang="ts">

    import NoiseTexture from "./NoiseTexture.svelte";

</script>

<div class="background">

    <div class="mesh mesh1"></div>
    <div class="mesh mesh2"></div>
    <div class="mesh mesh3"></div>

    <div class="road-grid"></div>

    <div class="vignette"></div>

    <NoiseTexture />

</div>

<style>

.background{

    position:fixed;

    inset:0;

    overflow:hidden;

    pointer-events:none;

    z-index:-2;

    background:#050505;

}

/* Mesh gradients */

.mesh{

    position:absolute;

    border-radius:50%;

    filter:blur(140px);

    opacity:.25;

    animation:drift 18s ease-in-out infinite;

}

.mesh1{

    width:700px;

    height:700px;

    left:-220px;

    top:-180px;

    background:#f26522;

}

.mesh2{

    width:550px;

    height:550px;

    right:-150px;

    top:35%;

    background:#ff8b42;

    animation-delay:-6s;

}

.mesh3{

    width:650px;

    height:650px;

    bottom:-250px;

    left:35%;

    background:#c94d14;

    animation-delay:-12s;

}

/* Grid */

.road-grid{

    position:absolute;

    inset:0;

    opacity:.04;

    background-image:

        linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px),

        linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px);

    background-size:72px 72px;

}

/* Vignette */

.vignette{

    position:absolute;

    inset:0;

    background:

        radial-gradient(circle,

        transparent 45%,

        rgba(0,0,0,.65));

}

@keyframes drift{

0%,100%{

transform:translate(0,0) scale(1);

}

50%{

transform:translate(40px,-50px) scale(1.12);

}

}

</style>
