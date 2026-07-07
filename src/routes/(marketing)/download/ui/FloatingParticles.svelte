<script lang="ts">

    interface Particle {

        left: number;
        size: number;
        duration: number;
        delay: number;
        opacity: number;

    }

    const particles: Particle[] = Array.from({ length: 18 }, () => ({

        left: Math.random() * 100,

        size: 2 + Math.random() * 5,

        duration: 18 + Math.random() * 18,

        delay: -Math.random() * 30,

        opacity: 0.15 + Math.random() * 0.45

    }));

</script>

<div class="particles">

    {#each particles as particle}

        <span

            class="particle"

            style="
                --left:{particle.left}%;
                --size:{particle.size}px;
                --duration:{particle.duration}s;
                --delay:{particle.delay}s;
                --opacity:{particle.opacity};
            "

        />

    {/each}

</div>

<style>

.particles{

    position:absolute;

    inset:0;

    overflow:hidden;

    pointer-events:none;

    z-index:2;

}

/* ------------------------- */

.particle{

    position:absolute;

    left:var(--left);

    bottom:-60px;

    width:var(--size);

    height:var(--size);

    border-radius:50%;

    opacity:var(--opacity);

    background:

        radial-gradient(

            circle,

            rgba(255,255,255,.95),

            rgba(242,101,34,.9) 55%,

            transparent

        );

    filter:

        blur(.3px)

        drop-shadow(0 0 10px rgba(242,101,34,.55));

    animation:

        float var(--duration)

        linear

        infinite;

    animation-delay:

        var(--delay);

}

/* ------------------------- */

@keyframes float{

    0%{

        transform:

            translate3d(0,0,0)

            scale(.5);

        opacity:0;

    }

    8%{

        opacity:var(--opacity);

    }

    35%{

        transform:

            translate3d(-12px,-35vh,0)

            scale(1);

    }

    70%{

        transform:

            translate3d(15px,-75vh,0)

            scale(.8);

    }

    100%{

        transform:

            translate3d(-8px,-115vh,0)

            scale(.35);

        opacity:0;

    }

}

/* ------------------------- */

@media (prefers-reduced-motion: reduce){

    .particle{

        animation:none;

        display:none;

    }

}

@media (max-width:768px){

    .particle{

        filter:

            drop-shadow(0 0 6px rgba(242,101,34,.35));

    }

}

</style>
