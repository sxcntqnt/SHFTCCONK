<script lang="ts">
    import AnimatedSection from "./AnimatedSection.svelte";
    import GlowCard from "./GlowCard.svelte";
    import SectionHeading from "./SectionHeading.svelte";
    import { slide } from "svelte/transition";

    interface FAQ {
        question: string;
        answer: string;
    }

    const faqs: FAQ[] = [
        {
            question: "Is Matatu Pulse free to use?",
            answer:
                "Yes. Core features including live tracking, route search, and arrival predictions are available free of charge."
        },
        {
            question: "Which cities are supported?",
            answer:
                "The first release focuses on Nairobi, with support for additional Kenyan cities planned as more transit data becomes available."
        },
        {
            question: "Do I need an internet connection?",
            answer:
                "Live tracking requires internet access. Your saved routes and favourites remain available for quick access."
        },
        {
            question: "How accurate are arrival predictions?",
            answer:
                "Arrival estimates continuously improve as more vehicles contribute live location data and traffic conditions change."
        },
        {
            question: "Can I report incorrect information?",
            answer:
                "Absolutely. Community feedback helps improve routes, stops, and arrival predictions for everyone."
        }
    ];

    let open = 0;

    function toggle(index: number) {
        open = open === index ? -1 : index;
    }
</script>

<AnimatedSection>

<section class="faq">

    <SectionHeading
        eyebrow="QUESTIONS"
        title="Frequently asked questions"
        subtitle="Everything you need to know before downloading Matatu Pulse."
    />

    <div class="list">

        {#each faqs as item, index}

            <GlowCard padding="0" hoverLift={false}>

                <button
                    class="question"
                    on:click={() => toggle(index)}
                    aria-expanded={open === index}
                    aria-controls={`faq-answer-${index}`}
                    id={`faq-question-${index}`}
                >

                    <span>

                        {item.question}

                    </span>

                    <div
                        class:rotate={open === index}
                        class="plus"
                    >

                        +

                    </div>

                </button>

                {#if open === index}

                    <div
                        class="answer"
                        id={`faq-answer-${index}`}
                        role="region"
                        aria-labelledby={`faq-question-${index}`}
                        transition:slide
                    >

                        <p>

                            {item.answer}

                        </p>

                    </div>

                {/if}

            </GlowCard>

        {/each}

    </div>

</section>

</AnimatedSection>

<style>

.faq{

    padding:8rem 2rem;

}

.list{

    width:min(900px,100%);

    margin:auto;

    display:flex;

    flex-direction:column;

    gap:1.25rem;

}

.question{

    width:100%;

    display:flex;

    justify-content:space-between;

    align-items:center;

    background:none;

    border:none;

    color:white;

    padding:2rem;

    cursor:pointer;

    text-align:left;

    font:inherit;

    transition:background .3s;

}

.question:hover{

    background:rgba(255,255,255,.03);

}

.question span{

    font-size:1.15rem;

    font-weight:600;

}

.plus{

    width:42px;

    height:42px;

    border-radius:50%;

    display:flex;

    align-items:center;

    justify-content:center;

    background:rgba(242,101,34,.12);

    color:var(--orange);

    font-size:1.5rem;

    transition:.35s;

    flex-shrink:0;

}

.rotate{

    transform:rotate(45deg);

}

.answer{

    padding:0 2rem 2rem;

}

.answer p{

    margin:0;

    color:var(--text-2);

    line-height:1.8;

    max-width:700px;

}

@media(max-width:768px){

.faq{

padding:6rem 1.5rem;

}

.question{

padding:1.5rem;

}

.answer{

padding:0 1.5rem 1.5rem;

}

.question span{

font-size:1rem;

}

}

</style>
