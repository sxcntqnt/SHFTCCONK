<p>
  Ask two commuters how to get to the same place, and you'll often get two
  different answers.
</p>

<p>
  One route might be faster in the morning. Another might be more reliable in
  the evening. A third might look shorter on a map but consistently gets
  swallowed by a bottleneck at the Westlands interchange. The matatu route
  number on the windscreen tells you where the vehicle is going. It tells you
  nothing about whether that's the right vehicle to board right now.
</p>

<p>Until now, choosing between them has been guesswork.</p>

<h2>The Hidden Personalities of Nairobi's Routes</h2>

<p>
  Every matatu route in Nairobi has a character that regular riders understand
  implicitly but rarely articulate. Matatu route 46 — the CBD to Kangemi
  corridor along Waiyaki Way — is fast in the early morning but volatile between
  5pm and 7pm, when it competes for road space with every other vehicle heading
  west. Matatu route 34 runs a tighter corridor and tends to be more consistent
  but carries fewer vehicles, so wait times are longer. Matatu route 11b to
  Parklands performs well through most of the day but struggles during school
  pickup hours on weekday afternoons.
</p>

<p>
  These patterns exist in the tacit knowledge of experienced riders across the
  city. The problem is that tacit knowledge doesn't transfer. A commuter new to
  a neighbourhood, or someone whose usual route is disrupted, has no way to
  access that accumulated understanding quickly. And even experienced riders
  can't hold a live, continuously updated picture of twelve routes in their
  heads simultaneously.
</p>

<p>Route Intelligence is the structural answer to that problem.</p>

<h2>What Route Intelligence Measures</h2>

<p>
  The Route Intelligence score is a composite signal, not a single metric. It
  aggregates live vehicle speed and GPS position, current H3 hex-zone congestion
  probability from the Bayesian model, vehicle availability on the corridor,
  historical journey-time consistency indexed by time of day, and deviation
  frequency — how often vehicles on this route end up off their expected path.
</p>

<p>
  The result is a score between 0 and 1 expressed as a two-decimal figure. A
  score of 0.91 means the route is operating optimally right now relative to its
  own baseline and the current congestion model. A score of 0.63 means the route
  is under stress — slower than usual, fewer vehicles in motion, or showing high
  variance in real-time ETAs. A score below 0.60 is a signal to consider an
  alternative.
</p>

<blockquote>
  It's not just which route exists. It's which route works best right now — and
  the data behind that score is updated every trip cycle.
</blockquote>

<h2>Route Comparison in Real Time</h2>

<p>
  The practical application is route comparison. When multiple Kenya matatu
  route numbers serve overlapping corridors, Route Intelligence surfaces the
  winner automatically. If you're travelling from the CBD toward Kikuyu and have
  a choice between matatu route 102 via Dagoretti, matatu route 105 via Waiyaki
  Way and Uthiru, and matatu route 46 to Kangemi before a connection — the
  system compares all three in a single view, ranked by their current score.
</p>

<p>
  That might mean recommending a slightly longer path that's flowing faster. It
  might mean flagging that matatu route 107 to Ruaka is currently scoring 0.83
  while an alternative to the same area is at 0.71. It might mean showing you
  that the route you always take is having an unusually slow day and a parallel
  option exists that you've never tried.
</p>

<p>
  None of those decisions are possible without real data. Route Intelligence
  makes them frictionless.
</p>

<h2>The Model Underneath</h2>

<p>
  Route Intelligence shares the same data pipeline as the Congestion Heatmap and
  the ETA engine. Vehicle positions update continuously via GPS telemetry across
  our partner SACCO network. The H3 hex-zone congestion posteriors — computed
  using the Beta-Binomial Bayesian model we've described in detail elsewhere —
  feed directly into route scoring. Historical trip data from the same corridors
  provides the baseline against which current performance is measured.
</p>

<p>
  This means the score you see reflects both what is happening right now and
  what this route normally does at this time of day. A route that's running
  slower than usual will score lower than a route that is slow but consistently
  so. Consistency matters because it's what makes planning possible. An
  unpredictable route imposes hidden costs — you leave earlier, you arrive
  later, you absorb the variance. A predictable route, even a slower one, lets
  you budget time accurately.
</p>

<h2>Who Route Intelligence Is Built For</h2>

<p>
  For daily commuters, Route Intelligence is most useful during disruption —
  when a road closure, a public event, or unusual congestion throws off the
  usual choice. In normal conditions, your instinct is probably correct. When
  conditions shift, the score gives you a fast, data-grounded alternative to
  standing at a stage and hoping.
</p>

<p>
  For operators and SACCO managers, the intelligence layer serves a different
  function. Routes that score consistently low are signalling something: too few
  vehicles deployed, a bottleneck that needs attention, a time window where
  demand outstrips supply. Route Intelligence doesn't diagnose the cause, but it
  reliably identifies where the problem is — and that's the starting point for
  any operational improvement.
</p>

<p>
  As more vehicles join the tracked network and more trips accumulate in the
  dataset, the scores sharpen. Patterns that currently look like variance will
  resolve into structure. What used to be instinct, built over years of daily
  riding, becomes insight available on day one.
</p>
