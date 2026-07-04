<script lang="ts">
    type Star = {
        left: number;
        top: number;
        size: number;
        opacity: number;
        duration: number;
        delay: number;
        color: string;
        glow: number;
    };

    const STAR_COUNT = 300;

    const stars: Star[] = Array.from({ length: STAR_COUNT }, () => {
        const orange = Math.random() < 0.05;

        return {
            left: Math.random() * 100,
            top: Math.random() * 300,
            size: Math.random() * 1.8 + 0.4,
            opacity: Math.random() * 0.45 + 0.15,
            duration: Math.random() * 8 + 6,
            delay: Math.random() * -12,
            color: orange ? "var(--orange)" : "#ffffff",
            glow: orange ? 10 : 5
        };
    });
</script>

<div class="noise">
    {#each stars as star}
        <span
            class="star"
            style="
                left:{star.left}%;
                top:{star.top}%;
                width:{star.size}px;
                height:{star.size}px;
                opacity:{star.opacity};
                background:{star.color};
                box-shadow:0 0 {star.glow}px {star.color};
                --duration:{star.duration}s;
                --delay:{star.delay}s;
            "
        ></span>
    {/each}
</div>

<style>

.noise{

    position:absolute;

    top:0;

    left:0;

    right:0;

    height:300vh;

    overflow:hidden;

    pointer-events:none;

}

.star{

    position:absolute;

    border-radius:50%;

    animation:
        twinkle var(--duration) ease-in-out infinite,
        drift calc(var(--duration) * 3) linear infinite;

    animation-delay:
        var(--delay),
        var(--delay);

    will-change:
        transform,
        opacity;

}

@keyframes twinkle{

    0%,100%{

        transform:scale(1);

        opacity:inherit;

    }

    50%{

        transform:scale(.55);

        opacity:.2;

    }

}

@keyframes drift{

    from{

        transform:translateY(0);

    }

    to{

        transform:translateY(-35px);

    }

}

</style>
