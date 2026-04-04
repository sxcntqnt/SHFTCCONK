<p>
  If you've ever stood at a stage in Nairobi, you've probably asked the same
  question everyone else is asking: "imefika wapi?"
</p>

<p>
  The answers vary. "Iko nyuma kidogo." "Inakuja." "Imepita." None of them are
  precise, and most depend on who you ask — the conductor from a different route
  who half-heard something, the regular who's been waiting longer than you and
  is also guessing, or the stage tout whose job is to keep you there regardless
  of what the actual situation is.
</p>

<p>We built something better.</p>

<p>
  The Matatu Pulse Live Tracking Map shows you exactly where vehicles are in
  real time — not where they were five minutes ago, not where a schedule says
  they should be, not what a conductor on a parallel route thinks he saw — but
  where they actually are right now, on a map, moving.
</p>

<h2>The Problem With "Inakuja"</h2>

<p>
  Nairobi's matatu system doesn't run on fixed timetables. Vehicles leave when
  they fill up, routes adjust depending on traffic, and staging points shift
  with demand. That flexibility is what makes the system efficient — a formal
  transit network with the same level of coverage would require a fraction of
  the economic return that makes the matatu model viable. But flexibility also
  makes the system opaque from the outside.
</p>

<p>
  For commuters, that opacity translates into waiting. Sometimes two minutes.
  Sometimes twenty-five. And without visibility, there's no rational way to tell
  the difference until the vehicle either appears or it doesn't. So riders
  default to arriving early, waiting longer, and absorbing that time as a
  structural cost of using the network.
</p>

<p>
  Our telemetry data puts an approximate number on that cost: across the routes
  we track, average platform dwell time per commuter — the time spent waiting at
  a stage for a vehicle to arrive — exceeds eleven minutes per journey in peak
  conditions. Across a five-day working week, that's nearly two hours of weekly
  stage time that a live visibility layer could materially reduce.
</p>

<h2>What the Live Map Shows</h2>

<p>
  The Live Tracking Map is built on continuous GPS telemetry from vehicles
  across our partner SACCOs. Every few seconds, each tracked vehicle transmits
  its position, which is then projected onto a live representation of Nairobi's
  transit corridors. The map isn't a schematic of where routes are supposed to
  go — it's a live reflection of where vehicles are actually moving.
</p>

<p>
  Each vehicle appears as a moving marker — colour-coded by SACCO, with a
  directional indicator and a subtle animated pulse that signals active
  telemetry. Multiple vehicles on the same route appear simultaneously, so you
  can see not just that a matatu on route 46 is coming, but that three are
  currently in motion and the nearest is approximately four minutes from your
  stage at current speed.
</p>

<blockquote>
  The map doesn't guess. It shows movement as it happens, drawn from GPS
  coordinates that update every five to ten seconds.
</blockquote>

<h2>The Hex Grid Underneath</h2>

<p>
  The visual layer sits on top of something more structural: the same H3
  resolution-7 hex grid that powers the Congestion Heatmap. As vehicles cluster
  in certain zones — the CBD core around Tom Mboya Street and Ronald Ngala
  Street, the Westlands junction, the Ngong Road commercial strip, Eastlands
  corridors along Jogoo Road — those hex zones accumulate weight in the
  underlying model. That accumulated weight is what drives the Bayesian
  posterior congestion scores that feed the ETA engine.
</p>

<p>
  In practical terms, this means the map isn't just showing you where vehicles
  are. It's showing you how the city is moving. A cluster of slow-moving vehicle
  markers through a single hex zone is both a visual signal and an input to the
  congestion model, which updates ETA estimates for every route passing through
  that area in real time.
</p>

<h2>Designed for How Nairobi Actually Moves</h2>

<p>
  The Live Tracking Map is explicitly not designed to look like the map of a
  formal transit system, because Nairobi isn't one. There are no fixed stops
  every 500 metres with shelter and a timetable board. There is no guarantee
  that a matatu on route 107 to Ruaka will take exactly the same staging path
  today as it did yesterday. Drivers adapt to traffic. Conductors respond to
  demand concentrations. Routes that are nominally the same can look materially
  different on any given day.
</p>

<p>
  The map embraces that reality. Vehicles move fluidly across the canvas rather
  than snapping to predetermined stop positions. The visual clusters that form
  around the CBD during morning peak — orange and teal markers densifying around
  the staging corridors before dispersing along their outbound routes — reflect
  the actual operational rhythm of the network, not a simplified model of it.
</p>

<p>
  Matatu culture has always been built on real-time local intelligence. The
  conductor who knows which staging point has a crowd. The driver who takes the
  back road because the main junction is blocked. The regular rider who times
  their departure based on years of observing the pattern. The Live Tracking Map
  makes that intelligence available to everyone — not just those who've spent
  months or years learning a specific corridor.
</p>

<h2>Graceful Behaviour When Signal Is Lost</h2>

<p>
  GPS signal in Nairobi's urban core isn't always clean. High-density buildings
  around the CBD, tunnels and underpasses, and the general RF noise of a busy
  city all create moments where a vehicle's position stream drops or becomes
  unreliable. The map handles these gracefully: vehicles that haven't
  transmitted a position update within a threshold window are visually
  distinguished from active trackers, and ETAs for those vehicles are clearly
  marked as estimates rather than live calculations.
</p>

<p>
  Core map data — route shapes, staging point markers, hex grid overlays — is
  cached locally on the device, so the map remains navigable even when data
  connectivity is intermittent. The live vehicle layer reloads automatically
  when connection is restored.
</p>

<p>
  Once you can see where the vehicles actually are, waiting at a stage becomes a
  decision rather than a default. You can choose to leave later. You can choose
  a different boarding point. You can choose a different route entirely. The
  information that makes those choices rational is now in the same place as the
  choice itself.
</p>
