// src/routes/(marketing)/pricing/pricing_plans.ts

export const defaultPlanId = "free"

export interface PricingPlan {
  id: string
  name: string
  description: string
  price: string // display string e.g. "KES 900"
  priceIntervalName: string
  mpesaAmount: number | null // numeric KES for STK push — null = no payment
  note: string | null
  features: string[]
  targetUser: string
  contactSales?: boolean // true = skip STK, show contact link instead
}

export const pricingPlans: PricingPlan[] = [
  {
    id: "free",
    name: "Free",
    description: "Perfect for individuals getting started with basic access.",
    price: "KES 0",
    priceIntervalName: "per month",
    mpesaAmount: null, // no payment required
    note: null,
    features: [
      "Live Feed access",
      "Fleet Manager (up to 5 vehicles)",
      "Insights Snapshot",
      "3 Route Alerts",
      "5 Geofences",
      "1 user seat",
      "Community support",
    ],
    targetUser: "Individual/Basic",
  },
  {
    id: "starter",
    name: "Starter",
    description: "Ideal for small operators needing more capacity and exports.",
    price: "KES 900",
    priceIntervalName: "per month",
    mpesaAmount: 900,
    note: null,
    features: [
      "Everything in Free",
      "Trip Planner",
      "25 Route Alerts",
      "50 Geofences",
      "Data Export",
      "5 user seats",
      "Email support (48h response)",
    ],
    targetUser: "Individual/Small Op",
  },
  {
    id: "pro",
    name: "Pro",
    description:
      "Unlimited everything for professionals demanding full control.",
    price: "KES 2,900",
    priceIntervalName: "per month",
    mpesaAmount: 2900,
    note: null,
    features: [
      "Everything in Starter",
      "Telemetry Sync",
      "Unlimited Route Alerts",
      "Unlimited Geofences",
      "Custom Reports",
      "API Access",
      "Unlimited user seats",
      "Priority support (24h SLA)",
    ],
    targetUser: "Pro/Power User",
  },
  {
    id: "business",
    name: "Business",
    description: "Scalable for teams — volume discounts from 10+ seats.",
    price: "KES 4,900",
    priceIntervalName: "per user / month",
    mpesaAmount: 4900,
    note: "KES 3,900/user at 10+  ·  KES 2,900/user at 50+",
    features: [
      "Everything in Pro",
      "Custom Integrations",
      "Team collaboration tools",
      "Volume-based pricing",
      "Dedicated account manager",
      "99.9% uptime SLA",
    ],
    targetUser: "Business/Team",
  },
  {
    id: "enterprise",
    name: "Enterprise",
    description: "Custom contracts for large organisations with premium SLAs.",
    price: "Custom",
    priceIntervalName: "billed annually",
    mpesaAmount: null, // contact sales — no STK push
    contactSales: true,
    note: "Contact sales@matatupulse.com for a demo & quote",
    features: [
      "Everything in Business",
      "On-premise deployment",
      "SOC2 Compliance",
      "24/7 premium support",
      "Custom SLAs & training",
      "Unlimited everything",
    ],
    targetUser: "Enterprise",
  },
]
