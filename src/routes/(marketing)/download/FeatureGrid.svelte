<script lang="ts">

    type Feature = {

        title: string;

        description: string;

        icon: string;

        large?: boolean;

    };

    const features: Feature[] = [

        {

            title: "Live Vehicle Tracking",

            description:
                "Watch matatus move across Nairobi in real time with continuously updated locations.",

            icon: "tracking",

            large: true

        },

        {

            title: "ETA Predictions",

            description:
                "Know when your ride arrives before leaving home.",

            icon: "eta"

        },

        {

            title: "Smart Routes",

            description:
                "Discover the fastest route with fewer transfers.",

            icon: "routes"

        },

        {

            title: "Arrival Alerts",

            description:
                "Receive notifications when your matatu is nearby.",

            icon: "alerts"

        },

        {

            title: "Offline Favourites",

            description:
                "Save your common routes for instant access.",

            icon: "offline"

        }

    ];

</script>

<section class="features">

    <div class="heading">

        <span class="eyebrow">

            WHY MATATU PULSE

        </span>

        <h2>

            Everything you need
            to commute smarter.

        </h2>

        <p>

            Built from the ground up for Nairobi's public transport system.

        </p>

    </div>

    <div class="grid">

        {#each features as feature}

            <article class:large={feature.large} class="card">

                <div class="glow"></div>

                <div class="icon">

                    {#if feature.icon === "tracking"}

                        <svg viewBox="0 0 32 32" class="pin-icon">
                            <circle class="ring ring-1" cx="16" cy="13" r="7" />
                            <circle class="ring ring-2" cx="16" cy="13" r="7" />
                            <path
                                d="M16 4c-4.97 0-9 4.03-9 9 0 6.5 9 15 9 15s9-8.5 9-15c0-4.97-4.03-9-9-9z"
                            />
                            <circle cx="16" cy="13" r="3" />
                        </svg>

                    {:else if feature.icon === "eta"}

                        <svg viewBox="0 0 32 32" class="clock-icon">
                            <circle cx="16" cy="16" r="11" />
                            <g class="hands">
                                <line x1="16" y1="16" x2="16" y2="9.5" class="hour" />
                                <line x1="16" y1="16" x2="20.5" y2="16" class="minute" />
                            </g>
                            <circle cx="16" cy="16" r="1.1" class="pivot" />
                        </svg>

                    {:else if feature.icon === "routes"}

                        <svg viewBox="0 0 32 32" class="route-icon">
                            <path
                                class="path-line"
                                pathLength="1"
                                d="M6 25c4 0 4-9 10-9s6-9 10-9"
                            />
                            <circle cx="6" cy="25" r="2" />
                            <circle cx="26" cy="7" r="2" />
                        </svg>

                    {:else if feature.icon === "alerts"}

                        <svg viewBox="0 0 32 32" class="bell-icon">
                            <g class="bell">
                                <path
                                    d="M11 21c0-.5.3-1 .6-1.4C12.6 18.3 13 16.6 13 15v-2.5a3 3 0 016 0V15c0 1.6.4 3.3 1.4 4.6.3.4.6.9.6 1.4H11z"
                                />
                                <path d="M14.3 23.5a1.8 1.8 0 003.4 0" />
                            </g>
                        </svg>

                    {:else if feature.icon === "offline"}

                        <svg viewBox="0 0 32 32" class="bookmark-icon">
                            <defs>
                                <clipPath id="fill-clip">
                                    <rect class="fill-rect" x="9" y="5" width="14" height="22" />
                                </clipPath>
                            </defs>
                            <path
                                class="bookmark-outline"
                                d="M10 5h12v22l-6-4.6L10 27z"
                            />
                            <path
                                class="bookmark-fill"
                                d="M10 5h12v22l-6-4.6L10 27z"
                                clip-path="url(#fill-clip)"
                            />
                        </svg>

                    {/if}

                </div>

                <h3>

                    {feature.title}

                </h3>

                <p>

                    {feature.description}

                </p>

            </article>

        {/each}

    </div>

</section>

<style>

.features{

    padding:8rem 2rem;

    position:relative;

}

.heading{

    max-width:720px;

    margin:0 auto 5rem;

    text-align:center;

}

.eyebrow{

    color:var(--orange);

    letter-spacing:.18em;

    font-size:.8rem;

    font-weight:700;

}

h2{

    font-size:clamp(2.5rem,5vw,4rem);

    line-height:1.05;

    margin:1rem 0;

    letter-spacing:-.04em;

}

.heading p{

    color:var(--text-2);

    font-size:1.15rem;

    line-height:1.8;

}

.grid{

    width:min(1200px,100%);

    margin:auto;

    display:grid;

    gap:1.5rem;

    grid-template-columns:repeat(3,1fr);

    grid-auto-rows:240px;

}

.card{

    position:relative;

    overflow:hidden;

    border-radius:30px;

    padding:2rem;

    background:

        linear-gradient(

            180deg,

            rgba(255,255,255,.05),

            rgba(255,255,255,.02)

        );

    border:1px solid rgba(255,255,255,.08);

    backdrop-filter:blur(20px);

    transition:

        transform .45s cubic-bezier(.22,1,.36,1),

        border-color .45s,

        box-shadow .45s;

}

.card:hover{

    transform:

        translateY(-10px);

    border-color:

        rgba(242,101,34,.4);

    box-shadow:

        0 25px 70px rgba(0,0,0,.45);

}

.large{

    grid-row:span 2;

}

.glow{

    position:absolute;

    width:320px;

    height:320px;

    right:-120px;

    top:-120px;

    background:

        radial-gradient(

            circle,

            rgba(242,101,34,.18),

            transparent 70%

        );

    opacity:0;

    transition:.5s;

}

.card:hover .glow{

    opacity:1;

}

.icon{

    width:72px;

    height:72px;

    border-radius:22px;

    display:flex;

    align-items:center;

    justify-content:center;

    background:

        rgba(242,101,34,.1);

    margin-bottom:2rem;

}

.icon svg{

    width:34px;

    height:34px;

    overflow:visible;

    fill:none;

    stroke:var(--orange);

    stroke-width:1.6;

    stroke-linecap:round;

    stroke-linejoin:round;

}

/* Live tracking — pin with expanding pulse rings */

.pin-icon .ring{

    fill:none;

    stroke:var(--orange);

    stroke-width:1;

    opacity:0;

    transform-origin:16px 13px;

}

.card:hover .pin-icon .ring-1{

    animation:pulseRing 1.8s ease-out infinite;

}

.card:hover .pin-icon .ring-2{

    animation:pulseRing 1.8s ease-out .6s infinite;

}

.pin-icon path,
.pin-icon circle:last-child{

    fill:rgba(242,101,34,.12);

}

@keyframes pulseRing{

    0%{

        transform:scale(.55);

        opacity:.65;

    }

    100%{

        transform:scale(1.6);

        opacity:0;

    }

}

/* ETA — clock hands sweep on hover */

.clock-icon .hands{

    transform-origin:16px 16px;

}

.card:hover .clock-icon .minute{

    animation:sweep 1.4s cubic-bezier(.65,0,.35,1) infinite;
    transform-origin:16px 16px;

}

@keyframes sweep{

    from{ transform:rotate(0deg); }

    to{ transform:rotate(360deg); }

}

/* Smart routes — path draws itself on hover */

.route-icon .path-line{

    stroke-dasharray:1;

    stroke-dashoffset:1;

    transition:stroke-dashoffset .9s cubic-bezier(.22,1,.36,1);

}

.card:hover .route-icon .path-line{

    stroke-dashoffset:0;

}

.route-icon circle{

    fill:var(--orange);

    stroke:none;

}

/* Arrival alerts — bell oscillates on hover */

.bell-icon .bell{

    transform-origin:16px 12px;

    fill:rgba(242,101,34,.12);

}

.card:hover .bell-icon .bell{

    animation:ring 1s ease-in-out;

}

@keyframes ring{

    0%,100%{ transform:rotate(0deg); }

    20%{ transform:rotate(14deg); }

    40%{ transform:rotate(-12deg); }

    60%{ transform:rotate(8deg); }

    80%{ transform:rotate(-4deg); }

}

/* Offline favourites — bookmark fills with orange on hover */

.bookmark-icon .bookmark-outline{

    stroke:var(--orange);

}

.bookmark-icon .bookmark-fill{

    fill:var(--orange);

    stroke:none;

}

.bookmark-icon .fill-rect{

    transform:scaleY(0);

    transform-origin:bottom;

    transition:transform .6s cubic-bezier(.22,1,.36,1);

}

.card:hover .bookmark-icon .fill-rect{

    transform:translateY(0) scaleY(1);

}

@media(prefers-reduced-motion:reduce){

.pin-icon .ring,
.clock-icon .minute,
.bell-icon .bell{

animation:none !important;

}

}

h3{

    font-size:1.45rem;

    margin-bottom:1rem;

}

.card p{

    color:var(--text-2);

    line-height:1.7;

    max-width:320px;

}

@media(max-width:1000px){

.grid{

grid-template-columns:1fr 1fr;

}

.large{

grid-row:span 1;

}

}

@media(max-width:700px){

.grid{

grid-template-columns:1fr;

grid-auto-rows:auto;

}

.card{

min-height:240px;

}

}

</style>
