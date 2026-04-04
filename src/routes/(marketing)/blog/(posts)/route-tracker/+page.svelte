<p>
  Ask any regular Nairobi commuter how they know which matatu to board and the
  answer is usually the same: experience, instinct, and a healthy tolerance for
  uncertainty. You learn the stages, you memorise the route numbers, you develop
  a feel for which conductor shouts your destination. For millions of riders,
  that informal knowledge is the only matatu route tracking system that has ever
  existed.
</p>

<p>We built something better.</p>

<p>
  Matatu Pulse's Route Tracker brings live GPS positions, real-time ETAs, and
  searchable matatu route numbers to any commuter with a phone. This post is
  about what it does, why we built it the way we did, and what it means for the
  way Nairobi moves.
</p>

<h2>The Problem With Memorised Routes</h2>

<p>
  Nairobi's matatu network operates across hundreds of active corridors. Most
  seasoned commuters know a handful of these well — their home route, their
  office route, maybe one or two alternates. But the moment a journey requires
  an unfamiliar combination, or a road closure forces a detour, that memorised
  knowledge breaks down fast.
</p>

<p>
  This is especially true for less-traveled routes. Matatu route 107 (Town to
  Ruaka and Ndenderu), matatu route 106 (Koja Mosque stage to Banana, Muchatha,
  and Village Market), and matatu route 100 (Ronald Ngala Street through Ngara
  to Kiambu Road, Ridgeways, and CID Centre) all serve real, regular riders —
  but finding accurate information about their staging points, their operating
  hours, or how long they actually take has historically required either local
  knowledge or luck.
</p>

<p>
  The same is true across the spectrum. Matatu route 46 — one of the busiest
  corridors on Waiyaki Way between CBD and Kangemi — is well-known to thousands
  of daily riders. But knowing the route exists and knowing that a vehicle is
  currently four minutes from your stage are two very different things.
</p>

<h2>What the Route Tracker Actually Shows</h2>

<p>
  The Matatu Pulse Route Tracker surfaces data that previously lived only inside
  individual operators' heads, or not at all. For every tracked route, riders
  can see the current number of GPS-confirmed vehicles in service, a live ETA
  from CBD to the destination stage, and the full list of stops along the
  corridor.
</p>

<p>
  The coverage currently spans Nairobi's core commuter corridors — routes
  radiating out from the CBD toward Westlands, Kasarani, Eastlands, Rongai,
  Ngong, and Kangemi — and is expanding as our partner SACCO network grows.
  Routes with three or fewer destinations are flagged as limited-service, while
  routes operating during the morning (7–9:30am) and evening (5–8pm) peaks are
  automatically tagged so riders know what congestion conditions to expect.
</p>

<blockquote>
  The Route Tracker doesn't just tell you where the matatu goes. It tells you
  whether one is actually coming, and when.
</blockquote>

<h2>Kenya Matatu Route Numbers: Why We Indexed Them</h2>

<p>
  One of the design decisions we're most deliberate about is making the Route
  Tracker searchable by route number. Kenya matatu route numbers — the painted
  digits on vehicle windscreens and stage boards — are the closest thing the
  network has to a universal reference system. Riders use them constantly in
  conversation: "nimepanda route 11b," "nilikuwa nasubiri route 15," "sijui kama
  24 inafika."
</p>

<p>
  Matatu route 11b (ODEON Stage to Parklands, Aga Khan, and Highridge), matatu
  route 15, matatu route 16, matatu route 24 — these numbers carry real meaning
  to the people who use them daily. So our tracker is built around them, not
  around abstract stop IDs or coordinate clusters that mean nothing on the
  ground.
</p>

<p>
  Search by route number and you get the full picture: pickup stage, all
  destinations with their H3 hex zone reference, vehicle count, and ETA. Search
  by destination and every route serving that area appears. The index is built
  from real operational data — the same dataset that powers our congestion
  models — rather than from manually curated schedules that go stale the moment
  an operator changes their staging point.
</p>

<h2>Matatu Route Map Nairobi: From Mental Model to Live Data</h2>

<p>
  For decades, understanding the Nairobi matatu route map has meant carrying
  that map in your head. There are paper maps and digital overlays that attempt
  to capture the network, but every frequent rider knows they're approximations
  at best — the actual operational picture shifts continuously as operators
  respond to demand, road conditions, and seasonal patterns.
</p>

<p>
  What makes our matatu route tracking approach different is that the underlying
  data is live. Each route in the tracker is anchored to the GPS positions of
  real vehicles, updated continuously. The staging information reflects where
  vehicles actually board and alight, not where a schedule says they should. And
  as our fleet coverage grows — we're currently tracking across twelve partner
  SACCOs — the resolution of the picture improves.
</p>

<p>
  This matters most for the less-documented corridors. Matatu route 118, matatu
  route 111, and dozens of other routes serving Nairobi's outer estates and
  satellite towns are part of the same network but have historically been
  invisible to any data system. Building a complete nairobi matatu route map
  means capturing those routes with the same rigour as the busy trunk corridors.
  That's the work in progress.
</p>

<h2>Matatu Culture and the Technology Underneath</h2>

<p>
  There's a temptation, when building technology for a system as organic and
  character-rich as Nairobi's matatu network, to sand off the edges — to
  rationalise it into something it isn't. Matatu culture is loud, fast,
  negotiated, and alive in ways that formal transit rarely is. The conductor
  hanging from the door, the route numbers stencilled in hand-painted lettering,
  the stage that moves two blocks down the road when a new building goes up —
  these aren't inefficiencies to be designed out. They're the character of the
  system.
</p>

<p>
  The Route Tracker is built to work with that reality, not against it. It
  doesn't try to impose fixed schedules where none exist, or pretend that a
  matatu on route 34 will arrive at exactly 6:47pm. It shows what the data
  actually says: N vehicles, currently moving, approximately M minutes away.
  That's honest information. And honest information is more useful than a
  fictional precision that falls apart the moment a driver decides to take a
  shorter staging point because there's a crowd.
</p>

<h2>How to Use the Route Tracker</h2>

<p>
  The tracker is available directly in the Matatu Pulse app and at the Route
  Planner on this site. No account required to view routes and live ETAs. Search
  by route number, pickup stage name, or destination — the tracker returns every
  matching route with its current operational data. Tap any route card to expand
  the full stop list, including the H3 hex zone reference for each destination,
  which links directly to the congestion heatmap for that area.
</p>

<p>
  For commuters who use the same routes daily, saving your frequent journeys
  gives you one-tap access to live ETAs without having to search. Stage alerts —
  a notification when your vehicle is two to three minutes from your boarding
  point — are available on the mobile app.
</p>

<p>
  The data behind the tracker is updated as our partner SACCO fleet grows. If
  you represent a SACCO and want your routes included in the live tracker,
  <a href="/contact_us">get in touch</a>.
</p>
