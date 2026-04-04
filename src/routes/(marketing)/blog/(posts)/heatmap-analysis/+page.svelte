<p>
  Nairobi traffic has a reputation. Ask anyone who has sat on Thika Road at 6pm
  on a Thursday, or watched a matatu crawl the length of Ngong Road on a Friday
  afternoon, and you'll hear the same conclusion: it's unpredictable, it's
  brutal, and there's nothing to be done about it except leave earlier or wait
  it out.
</p>

<p>The data disagrees.</p>

<p>
  After twelve months of GPS telemetry across 340 tracked vehicles on Nairobi's
  major matatu corridors, one finding stands out above all others: Nairobi
  congestion is not random. It is structured, repeatable, and — with the right
  model — predictable to a degree that should change how both operators and
  riders make decisions. The Matatu Pulse Congestion Heatmap is our attempt to
  surface that structure in a form anyone can use.
</p>

<h2>Why a Heatmap, and Why Hex-Based</h2>

<p>
  The conventional way to visualise traffic is a coloured line over a road
  network — red for slow, green for fast. It's intuitive, but it has a
  significant limitation: it represents the road, not the demand. You can see
  that Uhuru Highway is moving, but you can't see where the density of matatu
  passengers is actually concentrated, or which pickup zones are generating the
  most boarding activity.
</p>

<p>
  We chose a hex-cell approach because it maps the city, not just the roads.
  Each hexagon in the Matatu Pulse Congestion Heatmap corresponds to an H3
  resolution-7 cell — a geographic area of roughly 1.2 square kilometres —
  derived directly from the pickup and destination data in our route dataset.
  Matatu route 100 from Ronald Ngala Street to Kiambu Road passes through
  several of these cells. So does matatu route 107 from Town to Ruaka. So does
  matatu route 46 on Waiyaki Way. The hex cells that sit at the intersection of
  multiple busy routes — CBD's core, the Westlands junction, the Ngong Road
  commercial strip — show that accumulation visually, as size and colour
  intensity.
</p>

<p>
  This is the nairobi matatu route map as a living document rather than a static
  diagram: not what the network looks like on paper, but where the operational
  weight actually falls.
</p>

<h2>The Model: Bayesian Congestion Inference</h2>

<p>
  The colour of each hex cell isn't just a count of routes passing through it.
  It's a posterior probability estimate — the output of a Bayesian Beta-Binomial
  model that combines two sources of information: the structural weight of each
  zone (how many matatu routes use it as a pickup or destination) and a
  time-of-day prior that reflects what we know about Nairobi's congestion
  patterns across the operating day.
</p>

<p>
  The prior is a probability distribution, not a guess. Morning peak between 7am
  and 9:30am carries a prior congestion probability of 0.88 across the tracked
  network. Evening peak between 5pm and 8pm sits at 0.92 — the highest we record
  across any operating window. Midday drops to 0.28. Late night falls to 0.12.
  These priors are derived from the telemetry dataset: they represent what the
  GPS data actually shows about when vehicles slow down, when idle times spike,
  and when journey durations diverge most sharply from their off-peak baselines.
</p>

<blockquote>
  The posterior congestion score for any hex zone is updated continuously as
  simulated time advances through the operating day — so what you see on the
  heatmap is not a snapshot of now, but a model of how that zone behaves at the
  current time across the observed pattern of days.
</blockquote>

<p>
  The Bayesian framing matters for a reason beyond statistical correctness: it
  makes the uncertainty explicit. A hex cell showing 85% congestion probability
  is not saying "this area is definitely gridlocked." It is saying "given the
  route density in this zone and the time of day, the model assigns an 85%
  probability to congestion conditions." That distinction is important for how
  riders and operators should use the information — as a strong signal, not a
  deterministic fact.
</p>

<h2>Reading the Nairobi Matatu Route Map Through a Congestion Lens</h2>

<p>
  The heatmap makes several patterns immediately visible that are hard to
  articulate without spatial data. The CBD cluster — covering pickup zones
  around Ronald Ngala Street, Tom Mboya Street, and the Railways Bus Station —
  shows the highest route density in the entire dataset. This is not surprising:
  nearly every major outbound matatu corridor in Nairobi originates or passes
  through central Nairobi. What is more useful is being able to see which
  adjacent zones absorb that load and which don't.
</p>

<p>
  Westlands, for instance, sits at the convergence of routes serving Kangemi
  (route 46), Uthiru and Kinoo (route 105), and Kikuyu Township via Dagoretti
  (route 102). During morning peak, the hex cells covering that junction shift
  from amber to deep orange as the posterior probability updates. By midday, the
  same cells return to teal. By 5:30pm they begin climbing again. Watching that
  cycle play out in real time is the clearest way we've found to explain to
  someone why their matatu route 46 journey takes 18 minutes at noon and 47
  minutes at 6pm — without invoking the usual answer of "because Nairobi."
</p>

<p>
  Ngong Road shows a similar pattern on routes 1 and 102, which serve The
  Junction Mall, Dagoretti, and Ngong itself. Thika Road, as our telemetry data
  elsewhere documents, runs the steepest congestion gradient of any corridor we
  track — and the hex cells along that axis are consistently among the warmest
  on the heatmap during peak windows.
</p>

<h2>Matatu Culture and Data Literacy</h2>

<p>
  There is a version of this product that treats matatu riders as passive
  recipients of information — push an alert, show a number, expect compliance.
  That version misunderstands matatu culture profoundly.
</p>

<p>
  Matatu culture is built on active, continuous, informal information exchange.
  The conductor who tells you there's a faster vehicle two stages ahead. The
  regular rider who knows that mood matatu route patterns shift on pay week
  Fridays. The driver who deviates from the standard corridor because he knows
  from experience that the back road is clear. These are all forms of data
  processing — distributed, human, and often accurate in ways that formal
  systems aren't.
</p>

<p>
  The congestion heatmap is designed to augment that existing intelligence, not
  replace it. The Bayesian model encodes the same kind of time-pattern knowledge
  that experienced riders carry — the understanding that 6pm on Ngong Road is
  not the same as 6pm on Jogoo Road, that rainy season Mondays are different
  from dry season Thursdays — and makes it visible to someone who has never
  ridden the route before. First-time commuters get access to the same
  situational awareness that takes regular riders months to build. Experienced
  riders get a tool that confirms or challenges their intuitions with actual
  numbers.
</p>

<h2>How the Heatmap Connects to Route Planning</h2>

<p>
  The congestion heatmap is not a standalone feature. It is the spatial
  intelligence layer that sits beneath the Route Tracker and the ETA engine.
  When the Route Tracker tells you that matatu route 107 to Ruaka is showing a
  34-minute ETA, that estimate is informed by the posterior congestion score of
  the hex zones the vehicle has to pass through to get to you — not just the
  current GPS speed of that specific vehicle.
</p>

<p>
  This matters most during transition periods — the shoulder hours around 9:30am
  and 4:45pm where congestion can flip quickly. A vehicle that was averaging
  28km/h thirty minutes ago may now be entering a zone where the model assigns a
  0.78 probability of congestion. The ETA updates accordingly. The heatmap makes
  that update interpretable: you can see why the estimate changed, not just that
  it changed.
</p>

<h2>What the Heatmap Doesn't Show (Yet)</h2>

<p>
  The current model is built on route density and time-of-day priors. It does
  not yet incorporate rainfall data, public holiday calendars, or event-driven
  anomalies — a political rally in Uhuru Park or a concert at Carnivore will
  produce congestion patterns the current prior cannot anticipate. Incorporating
  those signals is part of the roadmap.
</p>

<p>
  The hex coverage is also bounded by our current partner SACCO network. Routes
  we don't track — including several of the outer Nairobi corridors and
  cross-county routes toward Kiambu and Machakos — are not represented in the
  heatmap with the same fidelity as our core coverage zones. We are transparent
  about this in the interface: cells with low route density are rendered
  smaller, making the confidence gradient visible spatially.
</p>

<p>
  As the tracked fleet grows and the dataset deepens, the model will improve.
  The goal is a congestion heatmap that covers the full operational extent of
  the Nairobi matatu network — every kenya matatu route number, every staging
  corridor, every satellite town connection — with the same live fidelity we
  currently provide on the core corridors.
</p>

<p>
  If you're a transport researcher, urban planner, or SACCO manager working on
  Nairobi's mobility challenges, the underlying dataset is available for
  collaborative research.
  <a href="/contact_us">Get in touch</a> to discuss access.
</p>
