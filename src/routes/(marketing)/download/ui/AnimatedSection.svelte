<script lang="ts">
    import { onMount } from "svelte";

    export let delay = 0;
    export let distance = 40;

    let element: HTMLElement;
    let visible = false;

    onMount(() => {
        const media = window.matchMedia("(prefers-reduced-motion: reduce)");

        if (media.matches) {
            visible = true;
            return;
        }

        const observer = new IntersectionObserver(

            ([entry]) => {

                if (entry.isIntersecting) {

                    visible = true;
                    observer.disconnect();

                }

            },

            {
                threshold: 0.15
            }

        );

        observer.observe(element);

        return () => observer.disconnect();

    });
</script>

<section

    bind:this={element}

    class:visible

    style="--delay:{delay}ms; --distance:{distance}px"

>

    <slot />

</section>

<style>

section{

    opacity:1;

    transform:

        translateY(var(--distance));

    transition:

        opacity .8s cubic-bezier(.22,1,.36,1),

        transform .8s cubic-bezier(.22,1,.36,1);

    transition-delay:

        var(--delay);

}

.visible{

    opacity:1;

    transform:none;

}

</style>
