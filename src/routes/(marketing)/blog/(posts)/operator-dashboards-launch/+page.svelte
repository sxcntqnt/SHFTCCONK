<p>
  When we set out to build the Matatu Pulse web presence, we had a constraint that shaped 
  every decision: our primary users are Nairobi commuters on mobile data. Not fibre. Not 
  high-speed LTE in a well-covered area. Data — measured, rationed, and expensive relative 
  to income.
</p>

<p>
  A bloated marketing site isn't just an aesthetic failure in that context. It's a real cost 
  imposed on real people. We decided early that we'd measure our success in kilobytes as much 
  as in conversions.
</p>

<p>
  The result: a fully functional, production-grade SaaS site at 41kb total page weight on 
  first load. Here's exactly how we got there.
</p>

<h2>Framework Choice: SvelteKit Over Everything Else</h2>

<p>
  We evaluated Next.js, Nuxt, and SvelteKit seriously before committing. The decision came 
  down to one number: bundle size at baseline. A minimal Next.js page ships roughly 70–90kb 
  of JavaScript before you've written a single line of your own code. SvelteKit's compiler 
  output for the equivalent page is typically under 15kb.
</p>

<p>
  Svelte compiles components to vanilla JavaScript at build time — there's no virtual DOM 
  library, no runtime framework code sitting in the browser doing diffing. What ships is 
  precisely what the page needs to function, and nothing more.
</p>

<p>
  For a content-heavy marketing site where most of the page is static HTML, this distinction 
  is enormous. Our homepage JavaScript budget — including all interactivity, the mobile menu, 
  scroll effects, and analytics — is 12kb gzipped.
</p>

<h2>CSS: Scoped Styles Over Utility Sprawl</h2>

<p>
  Tailwind is a genuinely excellent tool for many contexts. It wasn't right for ours. A 
  full Tailwind stylesheet, even tree-shaken aggressively, carries overhead that becomes 
  significant at our scale target. More importantly, utility classes in markup make it 
  harder to maintain the kind of precise, systematic design token usage that a premium 
  product requires.
</p>

<p>
  We built the entire UI using Svelte's scoped CSS with a small set of CSS custom properties 
  defined at the root level. Every colour, spacing value, and font is a variable. Changing 
  the brand's orange accent across the entire site is a one-line edit. The total CSS shipped 
  is 8kb compressed.
</p>

<blockquote>
  Design tokens enforced through CSS variables aren't just a performance choice — they're 
  the only way to maintain visual consistency across a codebase that multiple people touch 
  over time.
</blockquote>

<h2>Fonts: Two, Maximum, With Subsetting</h2>

<p>
  Typography is where many sites quietly accumulate weight. Loading four font weights of 
  two typefaces, without subsetting, can easily cost 400–600kb. We load two fonts — Syne 
  for display headings and DM Sans for body copy — with aggressive Unicode range subsetting 
  via Google Fonts' <code>display=swap</code> and <code>text=</code> parameters where 
  applicable.
</p>

<p>
  The total font payload for a typical page, including both families at the weights we use, 
  is 28kb. Both are loaded asynchronously with a system font fallback stack that preserves 
  layout — no cumulative layout shift from font loading.
</p>

<h2>Images: WebP, Lazy, and Right-Sized</h2>

<p>
  The hero section uses a background video — which sounds alarming from a performance 
  perspective. In practice, video files compress dramatically better than equivalent image 
  sequences, and the browser won't load it at all on connections where the user's data saver 
  preference is active. We serve a static image fallback for those cases.
</p>

<p>
  Every static image on the site goes through an optimisation pipeline: converted to WebP, 
  resized to a maximum of 2x the display resolution, and given explicit <code>width</code> 
  and <code>height</code> attributes to prevent layout shift. Lazy loading is applied to 
  everything below the fold.
</p>

<h2>Hosting and Edge Delivery</h2>

<p>
  SvelteKit's static adapter generates pure HTML, CSS, and JavaScript with zero server-side 
  runtime overhead. We deploy to Cloudflare Pages, which means the site is served from 
  the edge location closest to each visitor — critical for users in Nairobi, where 
  round-trip latency to a European or US origin server would add hundreds of milliseconds 
  to every request.
</p>

<p>
  Time to first byte for Kenyan visitors averages 38ms. First contentful paint averages 
  0.9 seconds on a simulated 3G connection. These aren't lab numbers — they're field data 
  from our analytics.
</p>

<h2>What 41kb Actually Buys</h2>

<p>
  Performance isn't just a technical metric. For a product built for urban Kenyan commuters, 
  a fast, lightweight site is a statement about whose experience you're optimising for. A 
  site that loads in under a second on 3G costs a user less than a megabyte of data to visit. 
  A bloated alternative costs them ten times that — and loses them halfway through loading.
</p>

<p>
  We believe the best marketing is a product that works. The site's performance is part of 
  the product. 41kb is a constraint we're proud of.
</p>

<p>
  If you want to build something similar, 
  <a href="https://github.com/CriticalMoments/CMSaasStarter" target="_blank" rel="noreferrer">
    the SaaS starter template we used
  </a> is open source and a genuinely excellent starting point.
</p>