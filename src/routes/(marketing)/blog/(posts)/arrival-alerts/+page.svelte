<p>Most commuters don't actually want to stand at the stage.</p>

<p>
  They stand there because they have to — because missing a matatu by thirty
  seconds can mean waiting another ten minutes, and there's no reliable way to
  time your arrival at the stage to match the vehicle's arrival at the stage.
  The system offers no feedback loop. So commuters solve the problem the only
  rational way available: they arrive early and absorb the wait as overhead.
</p>

<p>Arrival Alerts change that equation completely.</p>

<h2>The Real Cost of Stage Time</h2>

<p>
  Stage time — the minutes you spend waiting at a boarding point for your
  vehicle to arrive — is one of the most underestimated costs in the daily
  commute. It doesn't show up in fare data. It doesn't appear in operator
  trip-cycle records. But it accumulates.
</p>

<p>
  Our telemetry data across tracked routes shows average stage dwell times
  exceeding eleven minutes per journey during peak hours on the busiest
  corridors. For a commuter taking two journeys a day, five days a week, that's
  over ninety minutes of weekly waiting time — time spent standing, not moving,
  at a staging point, burning through the buffer that was supposed to make the
  day manageable.
</p>

<p>
  The problem isn't a transit problem. It's an information problem. Riders wait
  long because they don't know when they need to arrive. And the answer to an
  information problem is information.
</p>

<h2>How Arrival Alerts Work</h2>

<p>
  The ETA model underneath Arrival Alerts draws on three data streams
  simultaneously: the live GPS position and current speed of the tracked
  vehicle, the real-time congestion posterior for each H3 hex zone the vehicle
  is travelling through, and historical journey-time data for the same
  route-stage combination at the current time of day.
</p>

<p>
  These three inputs are combined into a continuously refined ETA estimate. As
  the vehicle moves, the estimate updates — not by interpolating between two
  schedule points, but by recalculating from current state. If the vehicle
  speeds up because it cleared a congested junction, the ETA shortens. If it
  slows because it's entering the Ngong Road peak-hour corridor at 5:45pm, the
  ETA extends accordingly.
</p>

<p>
  When that estimate drops below the threshold — typically three minutes,
  calibrated to give the average rider enough time to walk from a nearby
  location to the stage without sprinting — a push notification fires.
</p>

<blockquote>
  Not when the vehicle is scheduled to arrive. Not when it left the terminus.
  When it's actually, demonstrably, about to reach your stage.
</blockquote>

<h2>Dynamic, Not Scheduled</h2>

<p>
  Traditional transit alert systems are built on top of schedules: a vehicle
  that is supposed to arrive at 8:14am triggers a notification at 8:11am.
  Nairobi's matatu network doesn't have schedules in that sense. A matatu on
  route 46 leaves when it fills up, not at a predetermined time. A vehicle on
  route 107 to Ruaka might sit at the terminus for eight minutes or for
  twenty-five, depending on passenger load at that moment.
</p>

<p>
  Schedule-based alerts would be meaningless in this context — and actively
  misleading during the exact conditions when reliable information matters most,
  which is during peak hours when the system is under stress. A delay that
  pushes a vehicle two minutes past its supposed arrival time is invisible to a
  schedule-based system. It's immediately visible to a model tracking the
  vehicle's actual position.
</p>

<p>
  Arrival Alerts adapt to exactly those conditions. During the morning peak on a
  route like matatu route 11b from ODEON Stage toward Parklands and Highridge,
  where congestion between the CBD and Museum Hill roundabout can add
  unpredictable minutes to any given journey, the alert fires based on where the
  vehicle actually is — not where a timetable says it should be.
</p>

<h2>Alert Configuration and Behaviour</h2>

<p>
  Alerts are configurable per route and per stage. If you use matatu route 100
  from Ngara to Kiambu Road daily, you can set a specific stage alert for that
  boarding point, and the system will notify you based on the nearest tracked
  vehicle on that corridor. If you use two different routes depending on the
  day, both can be active simultaneously — alerts fire independently and include
  the route number in the notification so you know which vehicle is approaching.
</p>

<p>
  For multi-hop journeys — trips that require a transfer between two routes —
  alerts are available for each boarding point individually. The system doesn't
  yet chain the two legs together into a single optimised notification, but that
  is part of the roadmap for the next release cycle.
</p>

<h2>From Waiting to Timing</h2>

<p>
  The behavioural goal of Arrival Alerts is simple: replace waiting at the stage
  with timing your arrival at the stage. Instead of standing at a boarding point
  on Koja Mosque stage waiting for matatu route 106 to Banana or Village Market,
  you stay where you are — at home, at a shop, under shade — and move when the
  notification tells you it's time.
</p>

<p>
  That shift sounds small. Across thousands of daily journeys, it isn't. Eleven
  minutes of stage time per journey, recovered across a network of hundreds of
  routes and millions of riders, represents a meaningful redistribution of time
  from passive waiting to active living. That's what the feature is designed to
  deliver — not a notification, but the reclaimed minutes behind it.
</p>
