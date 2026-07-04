<script lang="ts">
    import { onMount } from "svelte";

    type Stat = {
        value: number;
        suffix: string;
        label: string;
        description: string;
    };

    const stats: Stat[] = [
        {
            value: 24,
            suffix: "/7",
            label: "Tracking",
            description: "Real-time monitoring"
        },
        {
            value: 100,
            suffix: "%",
            label: "Built for Nairobi",
            description: "Designed around matatus"
        },
        {
            value: 4,
            suffix: "",
            label: "Platforms",
            description: "Mobile • Web • Desktop"
        },
        {
            value: 1,
            suffix: "",
            label: "Mission",
            description: "Smarter commuting"
        }
    ];

    let section: HTMLElement;

    // Displayed values, one per stat — updated in place via rAF and
    // reassigned so Svelte's reactivity picks up each frame.
    let displayed: number[] = stats.map(() => 0);

    function runCounters() {
        const duration = 1200;
        const start = performance.now();
        const reduceMotion =
            window.matchMedia("(prefers-reduced-motion: reduce)").matches;

        if (reduceMotion) {
            displayed = stats.map((s) => s.value);
            return;
        }

        function frame(now: number) {
            const progress = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);

            displayed = stats.map((s) => Math.round(s.value * eased));

            if (progress < 1) {
                requestAnimationFrame(frame);
            }
        }

        requestAnimationFrame(frame);
    }

    onMount(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    runCounters();
                    observer.disconnect();
                }
            },
            { threshold: 0.35 }
        );

        observer.observe(section);

        return () => observer.disconnect();
    });
</script>

<section bind:this={section} class="stats">

    <div class="container">

        {#each stats as stat, i}

            <article class="card">

                <h3>

                    <span class="number">

                        {displayed[i]}

                    </span>

                    <span class="suffix">

                        {stat.suffix}

                    </span>

                </h3>

                <h4>

                    {stat.label}

                </h4>

                <p>

                    {stat.description}

                </p>

            </article>

        {/each}

    </div>

</section>

<style>

.stats{

    position:relative;

    padding:6rem 2rem;

}

.container{

    width:min(1200px,100%);

    margin:auto;

    display:grid;

    grid-template-columns:repeat(4,1fr);

    gap:1.75rem;

}

.card{

    position:relative;

    padding:2.5rem;

    border-radius:28px;

    background:

        linear-gradient(

            180deg,

            rgba(255,255,255,.05),

            rgba(255,255,255,.025)

        );

    border:1px solid rgba(255,255,255,.08);

    backdrop-filter:blur(24px);

    transition:

        transform .4s cubic-bezier(.22,1,.36,1),

        border-color .4s,

        background .4s;

}

.card:hover{

    transform:translateY(-8px);

    border-color:rgba(242,101,34,.45);

    background:

        linear-gradient(

            180deg,

            rgba(242,101,34,.08),

            rgba(255,255,255,.03)

        );

}

h3{

    margin:0;

    display:flex;

    align-items:flex-start;

    gap:.2rem;

}

.number{

    font-size:3rem;

    font-weight:800;

    color:white;

    line-height:1;

    letter-spacing:-.04em;

    font-variant-numeric:tabular-nums;

}

.suffix{

    color:var(--orange);

    font-size:1.25rem;

    font-weight:700;

    margin-top:.4rem;

}

h4{

    margin:1rem 0 .4rem;

    font-size:1.1rem;

    color:white;

}

p{

    margin:0;

    color:var(--text-2);

    line-height:1.6;

}

@media(max-width:1000px){

.container{

grid-template-columns:repeat(2,1fr);

}

}

@media(max-width:640px){

.container{

grid-template-columns:1fr;

}

.card{

padding:2rem;

}

.number{

font-size:2.5rem;

}

}

</style>
