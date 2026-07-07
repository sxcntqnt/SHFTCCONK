<script lang="ts">
    import HeroBackground from "./HeroBackground.svelte";
    import FloatingParticles from "./FloatingParticles.svelte";
    import PhoneMockup from "./PhoneMockup.svelte";
    import DownloadButtons from "./DownloadButtons.svelte";
</script>

<section class="hero">

    <HeroBackground />

    <FloatingParticles />

    <div class="container">

        <div class="content">

            <div class="badge">
                <span class="dot"></span>
                Available Now
            </div>

            <h1>
                Move Through Nairobi
                <span>Without Guesswork.</span>
            </h1>

            <p>

                Real-time matatu tracking,
                accurate arrival predictions,
                smarter routes,
                and fewer minutes waiting at the stage.

            </p>

            <DownloadButtons />

            <div class="desktop-links">

                <a href="https://app.sxcntcnqunts.org">
                    Web App
                </a>

                <a href="/downloads/windows.zip">
                    Windows
                </a>

                <a href="/downloads/macos.dmg">
                    macOS
                </a>

                <a href="/downloads/linux.tar.gz">
                    Linux
                </a>

            </div>

        </div>

        <PhoneMockup />

    </div>

</section>

<style>

.hero{

    position:relative;

    overflow:hidden;

    min-height:100vh;

    display:flex;

    align-items:center;

    background:var(--ink);

    padding:9rem 2rem 6rem;

}

.container{

    width:min(1300px,100%);

    margin:auto;

    display:grid;

    grid-template-columns:

    1fr
    520px;

    gap:5rem;

    align-items:center;

    position:relative;

    z-index:5;

}

.content{

    max-width:650px;

}

.badge{

    display:inline-flex;

    align-items:center;

    gap:.6rem;

    padding:.65rem 1rem;

    border-radius:999px;

    background:rgba(242,101,34,.12);

    border:1px solid rgba(242,101,34,.18);

    color:var(--orange);

    font-weight:600;

    margin-bottom:2rem;

    backdrop-filter:blur(20px);

}

.dot{

    width:8px;

    height:8px;

    border-radius:50%;

    background:var(--orange);

    animation:pulse 2s infinite;

}

h1{

    font-size:clamp(3.6rem,7vw,6rem);

    line-height:.95;

    letter-spacing:-.05em;

    font-weight:800;

    color:white;

    margin-bottom:1.75rem;

}

h1 span{

    color:var(--orange);

}

p{

    font-size:1.2rem;

    line-height:1.8;

    color:var(--text-2);

    max-width:560px;

    margin-bottom:3rem;

}

.desktop-links{

    display:flex;

    flex-wrap:wrap;

    gap:1rem;

    margin-top:2rem;

}

.desktop-links a{

    text-decoration:none;

    color:var(--text-2);

    padding:.65rem 1rem;

    border-radius:999px;

    background:rgba(255,255,255,.04);

    border:1px solid rgba(255,255,255,.08);

    transition:.35s;

}

.desktop-links a:hover{

    transform:translateY(-3px);

    color:white;

    border-color:var(--orange);

    background:rgba(242,101,34,.10);

}

@keyframes pulse{

0%,100%{

transform:scale(1);

opacity:1;

}

50%{

transform:scale(1.5);

opacity:.4;

}

}

@media(max-width:1024px){

.container{

grid-template-columns:1fr;

text-align:center;

}

.content{

margin:auto;

}

.desktop-links{

justify-content:center;

}

}

</style>
