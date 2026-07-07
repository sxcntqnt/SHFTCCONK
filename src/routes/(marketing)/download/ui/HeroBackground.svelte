<div class="background">

    <div class="glow glow-left"></div>

    <div class="glow glow-right"></div>

    <div class="spotlight"></div>

    <div class="grid"></div>

    <div class="noise"></div>

    <div class="vignette"></div>

</div>

<style>

.background{

    position:absolute;

    inset:0;

    overflow:hidden;

    pointer-events:none;

    z-index:0;

}

/* ------------------------ */
/* Orange ambient lighting */
/* ------------------------ */

.glow{

    position:absolute;

    border-radius:50%;

    filter:blur(120px);

    opacity:.45;

    animation:drift 18s ease-in-out infinite;

}

.glow-left{

    width:650px;

    height:650px;

    background:rgba(242,101,34,.28);

    left:-180px;

    top:-120px;

}

.glow-right{

    width:500px;

    height:500px;

    background:rgba(242,101,34,.16);

    right:-150px;

    bottom:-100px;

    animation-delay:-8s;

}

/* ------------------------ */
/* Hero spotlight */
/* ------------------------ */

.spotlight{

    position:absolute;

    inset:0;

    background:

        radial-gradient(

            ellipse at center top,

            rgba(255,255,255,.045),

            transparent 60%

        );

}

/* ------------------------ */
/* Transit grid */
/* ------------------------ */

.grid{

    position:absolute;

    inset:0;

    opacity:.06;

    background-image:

        linear-gradient(

            rgba(255,255,255,.12) 1px,

            transparent 1px

        ),

        linear-gradient(

            90deg,

            rgba(255,255,255,.12) 1px,

            transparent 1px

        );

    background-size:

        60px 60px;

    mask-image:

        radial-gradient(circle at center,

        black,

        transparent 95%);

}

/* ------------------------ */
/* Premium texture */
/* ------------------------ */

.noise{

    position:absolute;

    inset:0;

    opacity:.025;

    background-image:

        radial-gradient(circle at 20% 30%, white 1px, transparent 1px),

        radial-gradient(circle at 70% 60%, white 1px, transparent 1px),

        radial-gradient(circle at 40% 80%, white 1px, transparent 1px),

        radial-gradient(circle at 85% 25%, white 1px, transparent 1px);

    background-size:

        180px 180px;

    animation:noiseMove 25s linear infinite;

}

/* ------------------------ */
/* Edge fade */
/* ------------------------ */

.vignette{

    position:absolute;

    inset:0;

    background:

        radial-gradient(

            circle,

            transparent 45%,

            rgba(0,0,0,.55)

        );

}

/* ------------------------ */
/* Animations */
/* ------------------------ */

@keyframes drift{

    0%{

        transform:

        translate(0px,0px)

        scale(1);

    }

    25%{

        transform:

        translate(25px,-10px)

        scale(1.05);

    }

    50%{

        transform:

        translate(0px,20px)

        scale(.97);

    }

    75%{

        transform:

        translate(-20px,-10px)

        scale(1.03);

    }

    100%{

        transform:

        translate(0px,0px)

        scale(1);

    }

}

@keyframes noiseMove{

    from{

        transform:translateY(0);

    }

    to{

        transform:translateY(-180px);

    }

}

/* ------------------------ */
/* Responsive */
/* ------------------------ */

@media (max-width:900px){

.glow-left{

width:500px;

height:500px;

}

.glow-right{

width:380px;

height:380px;

}

.grid{

background-size:40px 40px;

}

}

</style>
