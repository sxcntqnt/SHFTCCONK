<script lang="ts">

    export let screenshot =
        "/images/app-screenshot.webp";

    let imageLoaded = true;

</script>

<div class="phone-scene">

    <div class="phone-glow"></div>

    <div class="phone">

        <div class="notch"></div>

        <div class="reflection"></div>

        <div class="screen">

            {#if imageLoaded}

                <img
                    class="fill-image"
                    src={screenshot}
                    alt="Matatu Pulse"
                    on:error={() => imageLoaded = false}
                />

            {:else}

                <div class="placeholder">

                    <div class="logo">

                        MP

                    </div>

                    <h3>Matatu Pulse</h3>

                    <p>

                        Live Vehicle Tracking

                    </p>

                </div>

            {/if}

        </div>

    </div>

</div>

<style>

.phone-scene{

    position:relative;

    display:flex;

    justify-content:center;

    align-items:center;

    perspective:1800px;

}

/* Ambient Glow */

.phone-glow{

    position:absolute;

    width:440px;

    height:440px;

    border-radius:50%;

    background:

        radial-gradient(

            circle,

            rgba(242,101,34,.45),

            rgba(242,101,34,.08) 60%,

            transparent 80%

        );

    filter:blur(70px);

    animation:

        glowPulse 8s ease-in-out infinite;

}

/* Phone */

.phone{

    position:relative;

    width:330px;

    aspect-ratio:9/19.5;

    border-radius:48px;

    padding:12px;

    background:

        linear-gradient(

            180deg,

            #262626,

            #0d0d0d

        );

    border:1px solid rgba(255,255,255,.06);

    box-shadow:

        0 35px 90px rgba(0,0,0,.65),

        inset 0 0 0 1px rgba(255,255,255,.04);

    transform:

        rotateY(-12deg)

        rotateX(8deg);

    animation:

        floatPhone 7s ease-in-out infinite;

}

/* Display */

.screen{

    position:relative;

    width:100%;

    height:100%;

    overflow:hidden;

    border-radius:38px;

    background:#000;

}

.screen img{

    width:100%;

    height:100%;

    object-fit:cover;

    display:block;

}

/* Reflection */

.reflection{

    position:absolute;

    inset:0;

    border-radius:48px;

    overflow:hidden;

    pointer-events:none;

}

.reflection::before{

    content:"";

    position:absolute;

    top:-25%;

    left:-45%;

    width:50%;

    height:170%;

    background:

        linear-gradient(

            90deg,

            transparent,

            rgba(255,255,255,.18),

            transparent

        );

    transform:

        rotate(18deg);

    animation:

        shimmer 7s linear infinite;

}

/* Speaker */

.notch{

    position:absolute;

    top:16px;

    left:50%;

    transform:translateX(-50%);

    width:120px;

    height:6px;

    background:#3b3b3b;

    border-radius:999px;

    z-index:5;

}

/* Placeholder */

.placeholder{

    width:100%;

    height:100%;

    display:flex;

    flex-direction:column;

    justify-content:center;

    align-items:center;

    background:

        linear-gradient(

            135deg,

            #151515,

            #090909

        );

}

.logo{

    width:88px;

    height:88px;

    border-radius:24px;

    background:var(--orange);

    color:white;

    font-size:2rem;

    font-weight:800;

    display:flex;

    justify-content:center;

    align-items:center;

    margin-bottom:2rem;

}

.placeholder h3{

    font-size:2rem;

    margin-bottom:.5rem;

}

.placeholder p{

    color:var(--text-2);

}

/* Floating */

@keyframes floatPhone{

    0%{

        transform:

            rotateY(-12deg)

            rotateX(8deg)

            translateY(0);

    }

    50%{

        transform:

            rotateY(-12deg)

            rotateX(8deg)

            translateY(-18px);

    }

    100%{

        transform:

            rotateY(-12deg)

            rotateX(8deg)

            translateY(0);

    }

}

@keyframes shimmer{

    from{

        transform:

            translateX(-220%)

            rotate(18deg);

    }

    to{

        transform:

            translateX(320%)

            rotate(18deg);

    }

}

@keyframes glowPulse{

    0%,100%{

        transform:scale(1);

        opacity:.55;

    }

    50%{

        transform:scale(1.08);

        opacity:.9;

    }

}

@media(max-width:1024px){

.phone{

width:280px;

transform:none;

}

.phone-glow{

width:340px;

height:340px;

}

}

@media(max-width:640px){

.phone{

width:230px;

}

.phone-glow{

width:260px;

height:260px;

}

}

@media(prefers-reduced-motion:reduce){

.phone,

.phone-glow,

.reflection::before{

animation:none;

}

}

</style>
