<script lang="ts">
    import AnimatedSection from "./ui/AnimatedSection.svelte";
    import GlowCard from "./ui/GlowCard.svelte";
    import SectionHeading from "./ui/SectionHeading.svelte";

    type Platform = {
        name: string;
        icon: string;
        description: string;
        action: string;
        href: string;
        primary?: boolean;
    };

    const platforms: Platform[] = [
        {
            name: "Android",
            icon: "android",
            description: "Install from Google Play.",
            action: "Download",
            href: "https://play.google.com/store/apps/details?id=your.app",
            primary: true
        },
        {
            name: "iPhone",
            icon: "apple",
            description: "Available on the App Store.",
            action: "Download",
            href: "https://apps.apple.com/app/your-app"
        },
        {
            name: "Web App",
            icon: "web",
            description: "Runs instantly in your browser.",
            action: "Launch",
            href: "https://app.sxcntcnqunts.org"
        },
        {
            name: "Windows",
            icon: "windows",
            description: "Native desktop experience.",
            action: "Download",
            href: "/downloads/windows.zip"
        },
        {
            name: "macOS",
            icon: "apple",
            description: "Optimized for Apple Silicon.",
            action: "Download",
            href: "/downloads/macos.dmg"
        },
        {
            name: "Linux",
            icon: "linux",
            description: "Tarball and AppImage support.",
            action: "Download",
            href: "/downloads/linux.tar.gz"
        }
    ];
</script>

<AnimatedSection>

<section class="platforms">

    <SectionHeading

        eyebrow="AVAILABLE EVERYWHERE"

        title="Your commute doesn't stop at one device."

        subtitle="Whether you're checking from your phone before leaving home or planning your journey from your laptop, Matatu Pulse stays with you."

    />

    <div class="grid">

        {#each platforms as platform}

             <GlowCard highlight={platform.primary}>


                <a

                    href={platform.href}

                    class="card"

                    rel="external"

                >

                    <div class="top">

                        <div class="icon">

                            {#if platform.icon === "android"}

                                <svg viewBox="0 0 32 32">
                                    <path
                                        d="M10.5 13.5v6.8M21.5 13.5v6.8"
                                    />
                                    <path
                                        d="M9.5 13.5h13v8a2 2 0 01-2 2H11.5a2 2 0 01-2-2v-8z"
                                    />
                                    <path d="M9.5 13.5a6.5 6.5 0 0113 0" />
                                    <line x1="12.5" y1="9.5" x2="11" y2="7" />
                                    <line x1="19.5" y1="9.5" x2="21" y2="7" />
                                    <line x1="13" y1="23.3" x2="13" y2="26" />
                                    <line x1="19" y1="23.3" x2="19" y2="26" />
                                </svg>

                            {:else if platform.icon === "apple"}

                                <svg viewBox="0 0 32 32" class="filled">
                                    <path
                                        d="M21.6 17.1c0-3.1 2.5-4.6 2.6-4.7-1.4-2.1-3.6-2.3-4.4-2.4-1.9-.2-3.6 1.1-4.6 1.1-1 0-2.4-1.1-4-1-2 0-3.9 1.2-4.9 3-2.1 3.7-.5 9.1 1.5 12.1 1 1.5 2.2 3.1 3.7 3 1.5-.1 2-1 3.8-1s2.3 1 3.8 1c1.6 0 2.6-1.4 3.5-2.9.8-1.2 1.3-2.5 1.5-2.6-1.5-.6-3.5-2.3-3.5-5.6z"
                                    />
                                    <path
                                        d="M18.5 8c.7-.9 1.2-2.1 1.1-3.4-1 .1-2.3.7-3.1 1.6-.7.8-1.3 2.1-1.1 3.3 1.2.1 2.4-.6 3.1-1.5z"
                                    />
                                </svg>

                            {:else if platform.icon === "web"}

                                <svg viewBox="0 0 32 32">
                                    <circle cx="16" cy="16" r="10" />
                                    <ellipse cx="16" cy="16" rx="4.2" ry="10" />
                                    <line x1="6" y1="16" x2="26" y2="16" />
                                    <path d="M8 10.5h16M8 21.5h16" />
                                </svg>

                            {:else if platform.icon === "windows"}

                                <svg viewBox="0 0 32 32" class="filled">
                                    <rect x="6" y="6" width="8.4" height="8.4" />
                                    <rect x="17.6" y="6" width="8.4" height="8.4" />
                                    <rect x="6" y="17.6" width="8.4" height="8.4" />
                                    <rect x="17.6" y="17.6" width="8.4" height="8.4" />
                                </svg>

                            {:else if platform.icon === "linux"}

                                <svg viewBox="0 0 32 32">
                                    <ellipse
                                        class="filled"
                                        cx="16"
                                        cy="15"
                                        rx="6"
                                        ry="7.5"
                                    />
                                    <circle cx="13.3" cy="13" r="1" fill="var(--ink)" stroke="none" />
                                    <circle cx="18.7" cy="13" r="1" fill="var(--ink)" stroke="none" />
                                    <path d="M11 21c1 3 2 4.5 5 4.5s4-1.5 5-4.5" />
                                    <path d="M12.5 25c-1 1-1.5 2.3-1 3.5M19.5 25c1 1 1.5 2.3 1 3.5" />
                                </svg>

                            {/if}

                        </div>

                        {#if platform.primary}

                            <span class="badge">

                                Recommended

                            </span>

                        {/if}

                    </div>

                    <h3>

                        {platform.name}

                    </h3>

                    <p>

                        {platform.description}

                    </p>

                    <div class="bottom">

                        <span>

                            {platform.action}

                        </span>

                        <svg
                            viewBox="0 0 24 24"
                            class="arrow"
                        >

                            <path

                                d="M7 17L17 7M17 7H9M17 7V15"

                                fill="none"

                                stroke="currentColor"

                                stroke-width="2"

                                stroke-linecap="round"

                                stroke-linejoin="round"

                            />

                        </svg>

                    </div>

                </a>

            </GlowCard>

        {/each}

    </div>

</section>

</AnimatedSection>

<style>

.platforms{

    padding:8rem 2rem;

}

.grid{

    width:min(1200px,100%);

    margin:auto;

    display:grid;

    gap:1.75rem;

    grid-template-columns:

        repeat(auto-fit,minmax(280px,1fr));

}

.card{

    display:flex;

    flex-direction:column;

    height:100%;

    border-radius:30px;

    color:inherit;

    text-decoration:none;

}

.top{

    display:flex;

    justify-content:space-between;

    align-items:center;

}

.icon{

    width:72px;

    height:72px;

    border-radius:22px;

    background:

        rgba(242,101,34,.1);

    display:flex;

    align-items:center;

    justify-content:center;

}

.icon svg{

    width:32px;

    height:32px;

    fill:none;

    stroke:var(--orange);

    stroke-width:1.5;

    stroke-linecap:round;

    stroke-linejoin:round;

}

.icon svg .filled,
.icon svg.filled{

    fill:var(--orange);

    stroke:none;

}

.card:has(.badge) .icon{

    background:rgba(242,101,34,.18);

}


.badge{

    background:

        rgba(242,101,34,.12);

    color:var(--orange);

    border:

        1px solid rgba(242,101,34,.3);

    padding:.45rem .9rem;

    border-radius:999px;

    font-size:.75rem;

    font-weight:700;

}

h3{

    margin-top:2rem;

    margin-bottom:.8rem;

    font-size:1.45rem;

}

p{

    color:var(--text-2);

    line-height:1.7;

    flex:1;

}

.bottom{

    display:flex;

    justify-content:space-between;

    align-items:center;

    margin-top:2rem;

    color:var(--orange);

    font-weight:700;

}

.arrow{

    width:22px;

    transition:.35s;

}

.card:hover .arrow{

    transform:

        translateX(6px)

        translateY(-6px);

}

@media(max-width:768px){

.platforms{

padding:6rem 1.5rem;

}

}

</style>
