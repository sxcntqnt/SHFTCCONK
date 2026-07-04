<script lang="ts">
    import AnimatedSection from "./ui/AnimatedSection.svelte";
    import DownloadButtons from "./DownloadButtons.svelte";

    const platforms = [
        "Android",
        "iPhone",
        "Web",
        "Windows",
        "macOS",
        "Linux"
    ];
</script>

<AnimatedSection>

<section class="cta">

    <div class="background">

        <div class="glow glow-1"></div>

        <div class="glow glow-2"></div>

        <div class="grid"></div>

    </div>

    <div class="card">

        <span class="eyebrow">

            READY TO COMMUTE SMARTER?

        </span>

        <h2>

            Your next matatu
            shouldn't be a guessing game.

        </h2>

        <p>

            Join the future of public transport in Nairobi.
            Live vehicle tracking, intelligent arrival predictions,
            and smarter journeys, all in one app.

        </p>

        <DownloadButtons />

        <div class="platforms">

            {#each platforms as platform}

                <span>

                    {platform}

                </span>

            {/each}

        </div>

    </div>

</section>

</AnimatedSection>

<style>

.cta{

    position:relative;

    overflow:hidden;

    padding:10rem 2rem;

}

.background{

    position:absolute;

    inset:0;

    pointer-events:none;

}

.glow{

    position:absolute;

    border-radius:50%;

    filter:blur(100px);

    animation:drift 14s ease-in-out infinite;

}

.glow-1{

    width:520px;

    height:520px;

    background:rgba(242,101,34,.30);

    left:-180px;

    top:-140px;

}

.glow-2{

    width:420px;

    height:420px;

    background:rgba(242,101,34,.18);

    right:-120px;

    bottom:-120px;

    animation-delay:-7s;

}

.grid{

    position:absolute;

    inset:0;

    opacity:.04;

    background-image:

        linear-gradient(rgba(255,255,255,.12) 1px, transparent 1px),

        linear-gradient(90deg, rgba(255,255,255,.12) 1px, transparent 1px);

    background-size:50px 50px;

}

.card{

    position:relative;

    z-index:2;

    width:min(1100px,100%);

    margin:auto;

    text-align:center;

    padding:5rem;

    border-radius:36px;

    overflow:hidden;

    background:

        linear-gradient(

            180deg,

            rgba(255,255,255,.06),

            rgba(255,255,255,.03)

        );

    border:1px solid rgba(255,255,255,.08);

    backdrop-filter:blur(30px);

    box-shadow:

        0 40px 120px rgba(0,0,0,.45);

}

.card::before{

    content:"";

    position:absolute;

    inset:0;

    background:

        linear-gradient(

            135deg,

            rgba(255,255,255,.10),

            transparent 35%

        );

    pointer-events:none;

}

.eyebrow{

    display:inline-flex;

    align-items:center;

    gap:.6rem;

    padding:.65rem 1rem;

    border-radius:999px;

    background:rgba(242,101,34,.12);

    border:1px solid rgba(242,101,34,.28);

    color:var(--orange);

    font-size:.75rem;

    font-weight:700;

    letter-spacing:.18em;

}

h2{

    margin:2rem auto 1.5rem;

    max-width:850px;

    font-size:clamp(3rem,6vw,5rem);

    line-height:.95;

    letter-spacing:-.05em;

    color:white;

}

p{

    max-width:700px;

    margin:0 auto 3rem;

    color:var(--text-2);

    line-height:1.9;

    font-size:1.15rem;

}

.platforms{

    margin-top:3rem;

    display:flex;

    justify-content:center;

    flex-wrap:wrap;

    gap:.85rem;

}

.platforms span{

    padding:.7rem 1rem;

    border-radius:999px;

    background:rgba(255,255,255,.05);

    border:1px solid rgba(255,255,255,.06);

    color:var(--text-2);

    font-size:.85rem;

    transition:.3s;

}

.platforms span:hover{

    border-color:rgba(242,101,34,.4);

    color:white;

    transform:translateY(-2px);

}

@keyframes drift{

    0%,100%{

        transform:translate(0,0) scale(1);

    }

    50%{

        transform:translate(20px,-25px) scale(1.08);

    }

}

@media(max-width:768px){

.card{

padding:3rem 2rem;

}

h2{

font-size:clamp(2.3rem,9vw,3.6rem);

}

p{

font-size:1rem;

}

}

</style>
