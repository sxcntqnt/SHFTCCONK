<script lang="ts">

    export let padding = "2rem";
    export let hoverLift = true;
    export let highlight = false;

</script>

<div

    class="card"
    class:highlight

    style="--padding:{padding}; --lift:{hoverLift ? '-8px' : '0px'}"

>

    <div class="ambient"></div>

    <slot />

</div>

<style>

.card{

    position:relative;

    overflow:hidden;

    padding:var(--padding);

    border-radius:30px;

    background:

        linear-gradient(

            180deg,

            rgba(255,255,255,.06),

            rgba(255,255,255,.025)

        );

    border:

        1px solid rgba(255,255,255,.08);

    backdrop-filter:

        blur(24px);

    transition:

        transform .45s cubic-bezier(.22,1,.36,1),

        border-color .45s,

        box-shadow .45s;

}

.card.highlight{

    box-shadow:inset 0 0 0 1px rgba(242,101,34,.3);

}

.card:hover{

    transform:

        translateY(var(--lift));

    border-color:

        rgba(242,101,34,.35);

    box-shadow:

        0 25px 70px rgba(0,0,0,.45);

}

.card.highlight:hover{

    box-shadow:

        0 25px 70px rgba(0,0,0,.45),

        inset 0 0 0 1px rgba(242,101,34,.45);

}

.ambient{

    position:absolute;

    right:-140px;

    top:-140px;

    width:340px;

    height:340px;

    border-radius:50%;

    background:

        radial-gradient(

            circle,

            rgba(242,101,34,.18),

            transparent 70%

        );

    opacity:0;

    transition:.45s;

}

.card:hover .ambient{

    opacity:1;

}

.card::after{

    content:"";

    position:absolute;

    inset:0;

    background:

        linear-gradient(

            135deg,

            rgba(255,255,255,.08),

            transparent 40%

        );

    opacity:0;

    transition:.45s;

}

.card:hover::after{

    opacity:1;

}

</style>
