<p>
  Every morning, millions of Nairobians make the same calculation: when do I
  leave the house? Leave too early and you're standing at the stage in the dark.
  Leave too late and you're watching three packed matatus roll past without
  stopping.
</p>

<p>
  For most of the city's history, that calculation has been a guess. A gut
  feeling shaped by years of habit, refined through painful experience, and
  still wrong often enough to matter.
</p>

<p>We built Matatu Pulse to make that guess unnecessary.</p>

<h2>The Problem With "Just Wait"</h2>

<p>
  Informal transit systems like Nairobi's matatu network are extraordinarily
  efficient in aggregate. Thousands of privately-owned vehicles, operating on
  market incentives, cover more routes with higher frequency than any planned
  BRT system the city could realistically afford. The network is resilient,
  adaptive, and cheap.
</p>

<p>
  But from the perspective of any individual rider standing at a stage, it is
  opaque. You cannot see the vehicle. You cannot know if the delay is two
  minutes or twenty. You cannot make an informed decision about whether to wait,
  walk, or take an alternative route.
</p>

<blockquote>
  Uncertainty doesn't just waste time — it forces riders to arrive early as a
  buffer, multiplying the actual cost of every single commute across the entire
  city.
</blockquote>

<p>
  If the average Nairobi commuter builds in a ten-minute uncertainty buffer per
  trip, and makes two trips a day, that's over 120 hours of unnecessary waiting
  per year. Per person. Across a city of five million daily transit users, the
  number becomes staggering.
</p>

<h2>What Real-Time Visibility Changes</h2>

<p>
  When a rider can see their matatu approaching on a live map — and receive a
  push notification when it's two minutes out — the entire calculation changes.
  They leave the house later. They wait less. They arrive at the stage at the
  right moment instead of the earliest safe moment.
</p>

<p>
  In our pilot data across six routes in the first quarter of operations, riders
  using arrival alerts reduced their stage waiting time by an average of nine
  minutes per trip. That's not a marginal improvement. For a daily commuter,
  that's over 75 hours returned per year.
</p>

<h2>How the Alerts Actually Work</h2>

<p>
  The technical challenge is more interesting than it might appear. A GPS
  position alone isn't enough — vehicles move at variable speeds, stop for
  passengers, and encounter unpredictable congestion. A naive "distance from
  stage" calculation would produce wildly inaccurate ETAs on Ngong Road at
  7:45am.
</p>

<p>
  Our ETA model ingests live GPS telemetry alongside historical trip duration
  data segmented by time-of-day and day-of-week. A Tuesday morning run on Route
  46 has a different speed profile than a Saturday afternoon run on the same
  route, and the model knows that. The alert fires not when the vehicle crosses
  a fixed distance threshold, but when the modelled ETA drops below three
  minutes — accounting for current conditions.
</p>

<p>
  We've iterated on the notification timing based on real user feedback. Too
  early and riders ignore them. Too late and they miss the vehicle. The
  two-to-three minute window is where the alert is actionable without creating
  false urgency.
</p>

<h2>What Comes Next</h2>

<p>
  Arrival alerts are the foundation. We're currently building multi-hop trip
  planning — the ability to track connections across routes, so a commuter who
  transfers at Railways knows whether their connecting vehicle is running on
  time before they board the first one.
</p>

<p>
  The long-term vision is a Nairobi where every stage functions like an airport
  departure board. You know what's coming, when it's arriving, and how full it
  is. You make decisions with information instead of hope.
</p>

<p>We're closer to that than most people realise.</p>
