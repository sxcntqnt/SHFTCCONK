<script lang="ts">
    import { onMount } from "svelte";
    import { fade } from "svelte/transition";

    interface Slide {
        title: string;
        description: string;
        image: string;
    }

    const slides: Slide[] = [
        {
            title: "Live Tracking",
            description:
                "Watch matatus move across Nairobi in real time.",
            image: "/images/live-tracking.webp"
        },
        {
            title: "ETA Predictions",
            description:
                "Know exactly when your matatu will arrive.",
            image: "/images/eta.webp"
        },
        {
            title: "Route Search",
            description:
                "Find the fastest journey with fewer transfers.",
            image: "/images/routes.webp"
        },
        {
            title: "Arrival Alerts",
            description:
                "Receive notifications before your vehicle reaches the stage.",
            image: "/images/alerts.webp"
        },
        {
            title: "Saved Routes",
            description:
                "Instant access to your daily commute.",
            image: "/images/favourites.webp"
        }
    ];

    let current = 0;

    let timer: number;
    let hovered = false;
    let imageErrors: Record<number, boolean> = {};

    function next() {
        current = (current + 1) % slides.length;
    }

    function goTo(i: number) {
        current = i;
        start();
    }

    function start() {
        stop();
        timer = window.setInterval(next, 6000);
    }

    function stop() {
        clearInterval(timer);
    }

    function onEnter() {
        hovered = true;
        stop();
    }

    function onLeave() {
        hovered = false;
        start();
    }

    function onImageError(i: number) {
        imageErrors = { ...imageErrors, [i]: true };
    }

    onMount(() => {
        start();

        return stop;
    });
</script>

<section class="carousel">

    <div class="container">

        <div class="copy">

            <span class="eyebrow">

                EXPERIENCE THE APP

            </span>

            <div aria-live="polite">

                <h2>

                    {slides[current].title}

                </h2>

                <p>

                    {slides[current].description}

                </p>

            </div>

            <div class="dots">

                {#each slides as _, i}

                    <button

                        class:active={current === i}

                        on:click={() => goTo(i)}

                        aria-label={`Slide ${i + 1}: ${slides[i].title}`}
                        aria-current={current === i}

                    >
                        {#if current === i}
                            <span
                                class="progress"
                                class:paused={hovered}
                                style="animation-duration:6000ms"
                            ></span>
                        {/if}
                    </button>

                {/each}

            </div>

        </div>

        <div
            class="phone"
            on:mouseenter={onEnter}
            on:mouseleave={onLeave}
        >

            <div class="phone-glow"></div>

            <div class="phone-frame">

                <div class="notch"></div>

                <div class="screen">

                    {#key current}

                        {#if imageErrors[current]}

                            <div class="placeholder" transition:fade={{ duration: 350 }}>
                                <div class="badge-mark">MP</div>
                                <h4>{slides[current].title}</h4>
                            </div>

                        {:else}

                            <img
                                class="fill-image"
                                transition:fade={{ duration: 350 }}
                                src={slides[current].image}
                                alt={slides[current].title}
                                on:error={() => onImageError(current)}
                            />

                        {/if}

                    {/key}

                </div>

            </div>

        </div>

    </div>

</section>

<style>

.carousel{

    padding:10rem 2rem;

}

.container{

    width:min(1200px,100%);

    margin:auto;

    display:grid;

    grid-template-columns:

        480px
        1fr;

    gap:5rem;

    align-items:center;

}

.copy{

    max-width:420px;

}

.eyebrow{

    color:var(--orange);

    font-size:.8rem;

    letter-spacing:.18em;

    font-weight:700;

}

h2{

    font-size:clamp(2.5rem,5vw,4rem);

    line-height:1;

    margin:1rem 0;

}

.copy p{

    color:var(--text-2);

    line-height:1.8;

    margin-bottom:3rem;

}

.phone{

    position:relative;

    width:340px;

    aspect-ratio:9/19.5;

    margin:auto;

}

.phone-glow{

    position:absolute;

    inset:-40px;

    border-radius:50%;

    background:

        radial-gradient(

            circle,

            rgba(242,101,34,.25),

            transparent 70%

        );

    filter:blur(60px);

    pointer-events:none;

}

.phone-frame{

    position:absolute;

    inset:0;

    border-radius:46px;

    overflow:hidden;

    padding:12px;

    background:

        linear-gradient(180deg,#262626,#0d0d0d);

    border:1px solid rgba(255,255,255,.08);

    box-shadow:

        0 30px 80px rgba(0,0,0,.55),

        inset 0 0 0 1px rgba(255,255,255,.04);

}

.notch{

    position:absolute;

    top:16px;

    left:50%;

    transform:translateX(-50%);

    width:100px;

    height:6px;

    background:#3b3b3b;

    border-radius:999px;

    z-index:5;

}

.screen{

    position:relative;

    width:100%;

    height:100%;

    overflow:hidden;

    border-radius:34px;

    background:#000;

}

.screen img{

    position:absolute;

    inset:0;

    width:100%;

    height:100%;

    object-fit:cover;

}

.placeholder{

    position:absolute;

    inset:0;

    display:flex;

    flex-direction:column;

    align-items:center;

    justify-content:center;

    gap:1rem;

    background:

        linear-gradient(135deg,#151515,#090909);

}

.badge-mark{

    width:56px;

    height:56px;

    border-radius:16px;

    background:var(--orange);

    color:white;

    font-weight:800;

    display:flex;

    align-items:center;

    justify-content:center;

}

.placeholder h4{

    color:var(--text-2);

    font-weight:600;

    margin:0;

}

.dots{

    display:flex;

    gap:.8rem;

}

.dots button{

    position:relative;

    width:12px;

    height:12px;

    border-radius:999px;

    border:none;

    background:#444;

    cursor:pointer;

    overflow:hidden;

    padding:0;

    transition:width .3s, background .3s;

}

.dots button.active{

    width:42px;

}
.progress{
    position:absolute;
    inset:0;

    display:block;   /* <-- add this */

    width:0%;
    height:100%;     /* <-- add this */

    background:var(--orange);
    border-radius:999px;

    animation:fillProgress linear forwards;
}



.progress.paused{

    animation-play-state:paused;

}

@keyframes fillProgress{
    from{
        width:0%;
    }
    to{
        width:100%;
    }
}

@media(prefers-reduced-motion:reduce){

.progress{

animation:none;

transform:scaleX(1);

}

}

@media(max-width:960px){

.container{

grid-template-columns:1fr;

text-align:center;

}

.copy{

margin:auto;

}

.dots{

justify-content:center;

}

}

</style>
