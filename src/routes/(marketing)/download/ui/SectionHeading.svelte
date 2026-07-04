<script lang="ts">

    export let eyebrow = "";
    export let title = "";
    export let subtitle = "";

    export let align:
        "left"
        | "center"
        = "center";

</script>

<header

    class="heading"

    class:center={align==="center"}

>

    {#if eyebrow}

        <span class="eyebrow">

            {eyebrow}

        </span>

    {/if}

    <h2>

        {title}

    </h2>

    {#if subtitle}

        <p>

            {subtitle}

        </p>

    {/if}

</header>

<style>

.heading{

    max-width:760px;

    margin-bottom:5rem;

}

.center{

    margin-left:auto;

    margin-right:auto;

    text-align:center;

}

.eyebrow{

    display:inline-block;

    color:var(--orange);

    text-transform:uppercase;

    letter-spacing:.22em;

    font-size:.78rem;

    font-weight:700;

    margin-bottom:1rem;

}

h2{

    margin:0;

    color:white;

    font-size:

        clamp(

            2.4rem,

            5vw,

            4.25rem

        );

    line-height:1.05;

    letter-spacing:-.045em;

}

p{

    margin-top:1.5rem;

    color:var(--text-2);

    font-size:1.15rem;

    line-height:1.8;

    max-width:640px;

}

.center p{

    margin-left:auto;

    margin-right:auto;

}

</style>
