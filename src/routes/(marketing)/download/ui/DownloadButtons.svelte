<script lang="ts">

type Store = {

    title: string;

    subtitle: string;

    href: string;

    primary?: boolean;

};

const stores: Store[] = [

    {
        title: "Google Play",
        subtitle: "GET IT ON",
        href: "https://play.google.com/store/apps/details?id=your.app",
        primary: true
    },

    {
        title: "App Store",
        subtitle: "Download on the",
        href: "https://apps.apple.com/app/your-app"
    }

];

</script>

<div class="buttons">

    {#each stores as store}

        <a

            class:primary={store.primary}
            class="store"

            href={store.href}

            rel="external"

            target="_blank"

        >

            <div class="icon">

                {#if store.title === "Google Play"}

                    <svg viewBox="0 0 24 24">

                        <path
                            fill="currentColor"
                            d="M17.523 15.3l1.816 3.146a.5.5 0 1 1-.866.5l-1.832-3.177a11.943 11.943 0 0 1-9.282 0L6.529 18.95a.5.5 0 1 1-.866-.5L7.479 15.3A10.007 10.007 0 0 1 2 6h20a10.007 10.007 0 0 1-5.477 9.3zM7 9.5a1 1 0 1 0 0 2 1 1 0 0 0 0-2zm10 0a1 1 0 1 0 0 2 1 1 0 0 0 0-2z"/>

                    </svg>

                {:else}

                    <svg viewBox="0 0 24 24">

                        <path
                            fill="currentColor"
                            d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 4.17c.66-.81 1.11-1.93.99-3.06-1 .04-2.21.67-2.93 1.49-.62.69-1.16 1.84-1.01 2.96 1.12.09 2.27-.58 2.95-1.39z"/>

                    </svg>

                {/if}

            </div>

            <div class="text">

                <span>

                    {store.subtitle}

                </span>

                <strong>

                    {store.title}

                </strong>

            </div>

        </a>

    {/each}

</div>

<style>

.buttons {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 1.25rem;
    flex-wrap: wrap;
    width: 100%;
}

/* -------------------------------- */

.store{

    position:relative;

    display:flex;

    align-items:center;

    gap:1rem;

    min-width:245px;

    padding:1rem 1.4rem;

    border-radius:22px;

    overflow:hidden;

    text-decoration:none;

    background:rgba(255,255,255,.045);

    border:1px solid rgba(255,255,255,.08);

    backdrop-filter:blur(24px);

    color:white;

    transition:

        transform .35s cubic-bezier(.22,1,.36,1),

        border-color .35s,

        box-shadow .35s,

        background .35s;

}

/* Animated top glow */

.store::before{

    content:"";

    position:absolute;

    inset:0;

    background:

        linear-gradient(

            135deg,

            rgba(255,255,255,.12),

            transparent 45%

        );

    opacity:0;

    transition:.35s;

}

/* Hover */

.store:hover{

    transform:

        translateY(-6px)

        scale(1.02);

    border-color:

        rgba(242,101,34,.5);

    background:

        rgba(255,255,255,.07);

    box-shadow:

        0 18px 50px rgba(0,0,0,.45);

}

.store:hover::before{

    opacity:1;

}

/* -------------------------------- */

.primary{

    background:

        linear-gradient(

            180deg,

            #ff7c39,

            #f26522

        );

    border:none;

    box-shadow:

        0 12px 35px

        rgba(242,101,34,.35);

}

.primary:hover{

    box-shadow:

        0 22px 55px

        rgba(242,101,34,.45);

}

/* -------------------------------- */

.icon{

    width:56px;

    height:56px;

    border-radius:18px;

    display:flex;

    align-items:center;

    justify-content:center;

    flex-shrink:0;

    background:

        rgba(255,255,255,.12);

}

.primary .icon{

    background:

        rgba(255,255,255,.22);

}

.icon svg{

    width:26px;

    height:26px;

}

/* -------------------------------- */

.text{

    display:flex;

    flex-direction:column;

}

.text span{

    font-size:.72rem;

    letter-spacing:.14em;

    text-transform:uppercase;

    opacity:.75;

}

.text strong{

    font-size:1.15rem;

    margin-top:.15rem;

    font-weight:700;

}

/* -------------------------------- */

@media(max-width:768px){

.buttons{

justify-content:center;

}

.store{

width:100%;

max-width:340px;

}

}

@media(prefers-reduced-motion:reduce){

.store{

transition:none;

}

.store:hover{

transform:none;

}

}

</style>
