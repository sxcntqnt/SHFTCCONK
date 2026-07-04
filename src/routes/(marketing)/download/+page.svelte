<svelte:head>
	<title>Download Matatu Pulse | Real-Time Matatu Tracking</title>

	<meta
		name="description"
		content="Download Matatu Pulse and experience live matatu tracking, intelligent route planning, arrival predictions, and smarter commuting across Nairobi."
	/>

	<meta
		name="keywords"
		content="matatu,nairobi,transport,kenya,live tracking,transit,commute,ETA,routes"
	/>

	<meta property="og:title" content="Download Matatu Pulse" />

	<meta
		property="og:description"
		content="Real-time public transport intelligence for Nairobi."
	/>

	<meta property="og:type" content="website" />

	<meta
		property="og:image"
		content="https://sxcntcnqunts.org/og-download.jpg"
	/>

	<meta
		property="theme-color"
		content="#050505"
	/>

	<meta
		name="color-scheme"
		content="dark"
	/>

	<link
		rel="canonical"
		href="https://sxcntcnqunts.org/download"
	/>
</svelte:head>

<script lang="ts">
	import BackgroundEffects from "./ui/BackgroundEffects.svelte";
	import ScrollProgress from "./ui/ScrollProgress.svelte";
	import CursorGlow from "./ui/CursorGlow.svelte";

	import Hero from "./Hero.svelte";
	import TrustStats from "./TrustStats.svelte";
	import FeatureGrid from "./FeatureGrid.svelte";
	import ScreenshotCarousel from "./ScreenshotCarousel.svelte";
	import PlatformGrid from "./PlatformGrid.svelte";
	import FAQ from "./FAQ.svelte";
	import CTA from "./CTA.svelte";
</script>

<!-- Global ambient effects -->

<ScrollProgress /> 

 <BackgroundEffects /> 

 <CursorGlow /> 

<main class="download-page">

	<Hero />

	<TrustStats />

	<FeatureGrid />

	<ScreenshotCarousel />


	<PlatformGrid />

	<FAQ />

	<CTA />

</main>

<style>

:global(html){

	/* -------------------------------- */
	/* Design tokens — Urban Precision  */
	/* -------------------------------- */

	--ink:#050505;
	--ink-2:#0a0a0a;

	--orange:#f26522;
	--orange-light:#ff8b42;
	--orange-dark:#c94d14;

	--text-1:#ffffff;
	--text-2:#a3a3ab;
	--text-3:#6b6b72;

	--surface:rgba(255,255,255,.045);
	--surface-2:rgba(255,255,255,.025);
	--border:rgba(255,255,255,.08);
	--border-hover:rgba(242,101,34,.4);

	background:var(--ink);

	scroll-behavior:smooth;

}

:global(body){

	margin:0;

	background:#050505;

	color:var(--text-1);

	overflow-x:hidden;

}

/* Selection */

:global(::selection){

	background:rgba(242,101,34,.35);

	color:white;

}

/* Scrollbar */

:global(::-webkit-scrollbar){

	width:12px;

}

:global(::-webkit-scrollbar-track){

	background:#070707;

}

:global(::-webkit-scrollbar-thumb){

	background:#262626;

	border-radius:999px;

	border:3px solid #070707;

}

:global(::-webkit-scrollbar-thumb:hover){

	background:var(--orange);

}

/* -------------------------------- */

.download-page{

	position:relative;

	isolation:isolate;

	min-height:100vh;

	color:var(--text-1);

	overflow:hidden;

}

/* Every section sits above the background */

.download-page :global(section){

	position:relative;

	z-index:2;

}

/* Vertical rhythm */

.download-page :global(section + section){

	margin-top:clamp(3rem,5vw,6rem);

}

/* Container utility */

.download-page :global(.container){

	width:min(1280px,calc(100% - 3rem));

	margin-inline:auto;

}

/* Typography */

.download-page{

	text-rendering:optimizeLegibility;

	-webkit-font-smoothing:antialiased;

	-moz-osx-font-smoothing:grayscale;

}

/* Images */

.download-page :global(img:not(.fill-image)){
    display:block;
    max-width:100%;
    height:auto;
}

/* Links */

.download-page :global(a){

	-webkit-tap-highlight-color:transparent;

}

/* Focus */

.download-page :global(:focus-visible){

	outline:2px solid var(--orange);

	outline-offset:4px;

	border-radius:8px;

}

/* Motion */

@media (prefers-reduced-motion: reduce){

	:global(html){

		scroll-behavior:auto;

	}

}

</style>
