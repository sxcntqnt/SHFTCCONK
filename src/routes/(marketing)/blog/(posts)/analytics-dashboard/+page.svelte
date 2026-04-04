<p>
  For commuters, the platform is about visibility: where is the matatu, and when
  will it arrive?
</p>

<p>
  For operators — SACCO managers, fleet supervisors, route coordinators — the
  question is structurally different. It's not "where is vehicle X right now?"
  It's "what is the entire network actually doing, and is it doing it well?"
</p>

<p>The Analytics Dashboard is where that answer lives.</p>

<h2>The Gap Between Data and Decision</h2>

<p>
  Matatu operators in Nairobi are not short of information in the raw sense.
  They know their vehicles, their routes, their drivers. They have a feel for
  when things are working and when they aren't, built from years of managing the
  same corridors. The problem is that this knowledge is almost entirely local
  and qualitative. It doesn't aggregate. It doesn't compare across time. It
  doesn't surface patterns that only become visible when you look at the full
  operational picture across days or weeks.
</p>

<p>
  Our GPS telemetry data across partner SACCOs consistently shows the same gap:
  idle time at terminuses running at roughly twice what operators estimate,
  empty return legs on routes where demand exists but hasn't been matched to
  supply, and on-time variance patterns that are entirely predictable once you
  look at them by hour and day of week — but which feel random from the ground.
</p>

<p>
  The Analytics Dashboard bridges that gap. It takes the raw GPS stream from
  every tracked vehicle and aggregates it into the metrics, trends, and patterns
  that make operational decisions rational rather than intuitive.
</p>

<h2>What the Dashboard Surfaces</h2>

<p>
  The headline metrics — active vehicle count, average congestion index, on-time
  performance rate, and Route IQ score — are designed to give a fleet manager an
  accurate status read in under ten seconds. Active vehicle count tells you how
  much of your tracked fleet is currently in motion. On-time rate tells you how
  the network is performing against its own historical baseline for the current
  time of day. Congestion index gives you the current weighted average of the
  Bayesian posterior congestion scores across the hex zones your routes operate
  through. Route IQ is the composite intelligence score across your active
  routes — a single number that reflects how well the current operational state
  of the network matches optimal conditions.
</p>

<p>
  Underneath those headline numbers is a congestion trend line — the same
  Beta-Binomial model that powers the public Heatmap, but viewed as a time
  series rather than a spatial map. You can see whether congestion is building,
  peaking, or dissipating, and position that pattern against the current time of
  day to anticipate what the next hour looks like.
</p>

<blockquote>
  The dashboard turns movement into measurable performance — and measurable
  performance is the precondition for any meaningful operational improvement.
</blockquote>

<h2>Route-Level Intelligence for SACCO Managers</h2>

<p>
  At the route level, the dashboard disaggregates the network picture into
  individual corridor performance. Each Kenya matatu route number in the tracked
  fleet gets its own Route IQ score, updated every trip cycle. A route scoring
  consistently below 0.70 across three or more consecutive cycles is flagging
  something: insufficient vehicles deployed for current demand, a bottleneck
  that's degrading journey times, or a pattern of deviation that suggests
  operational issues at staging points.
</p>

<p>
  For SACCO managers who oversee multiple routes — say, a SACCO operating matatu
  route 100 to Kiambu Road alongside matatu route 106 to Banana and matatu route
  107 to Ruaka — the dashboard gives them a simultaneous view of how all three
  corridors are performing against each other and against their own baselines.
  Decisions about where to deploy additional vehicles, where to investigate an
  underperformance, or where to adjust dispatch timing become data-grounded
  rather than instinct-driven.
</p>

<h2>Finding the Inefficiencies That Don't Announce Themselves</h2>

<p>
  The most valuable function of the analytics layer isn't confirming what
  operators already know. It's surfacing what they can't see from the ground.
</p>

<p>
  Empty return mileage is the clearest example. The dashboard's load pattern
  overlays — which map demand density against vehicle positions across the
  operating day — routinely reveal that vehicles are running inbound-heavy
  routes with near-zero passenger load on the return leg, while demand is
  concentrating at staging points along that same return corridor. That's not a
  route problem. That's a staging and dispatch timing problem. And it only
  becomes visible when you can compare demand-side and supply-side data in the
  same view simultaneously.
</p>

<p>
  Idle time detection works similarly. The telemetry dataset distinguishes
  between a vehicle that is stationary because it's loading passengers at a
  stage and one that is stationary because it's waiting for the load threshold
  to be met. The second category — productive idle time that converts to empty
  mileage at departure — is the addressable inefficiency. The dashboard flags it
  by stage location and operating hour so operators can act on it directly:
  adjust the departure threshold, reassign the vehicle, or coordinate with other
  operators on the same corridor to stagger departures and distribute load.
</p>

<h2>Designed for Real Operations, Not Theoretical Planning</h2>

<p>
  The Analytics Dashboard is built for people who are managing a fleet today,
  not modelling what it might look like in an ideal future. The metrics it
  surfaces are actionable on the current operating day, not only useful in
  retrospective quarterly review.
</p>

<p>
  That design principle shapes everything from the time-resolution of the data —
  trip cycles, not daily aggregates — to the visual priority of real-time status
  over historical trend. A SACCO manager who opens the dashboard at 6:30am on a
  Monday morning should immediately know whether the network is starting the
  week in a good operational state, which routes are under pressure, and where
  to direct attention first. The dashboard is built to answer exactly those
  questions without requiring the user to navigate through layers of reporting
  to find the relevant signal.
</p>

<p>
  Because when the network runs better — when idle time drops, when return legs
  fill, when on-time rates climb — every rider on every route feels the
  difference. The dashboard sits at the operator end of that chain. The commuter
  at the stage benefits from decisions it makes possible, whether or not they
  ever see the interface itself.
</p>
