export const defaultPlanId = "free"

export const pricingPlans = [
  {
    id: "free",
    name: "Free",
    description: "Perfect for individuals getting started with basic access.",
    price: "$0",
    priceIntervalName: "per month",
    stripe_price_id: null,
    features: [
      "MIT License",
      "Fast performance",
      "Basic Stripe integration",
      "1 user seat",
      "Community support",
    ],
    targetUser: "Individual/Basic",
  },
  {
    id: "starter",
    name: "Starter",
    description: "Ideal for solo creators or small projects needing core tools.",
    price: "$9",
    priceIntervalName: "per month",
    stripe_price_id: "price_starter_monthly", // Replace with your Stripe ID
    stripe_product_id: "prod_starter",
    features: [
      "Everything in Free",
      "5 user seats",
      "Custom domains",
      "Basic analytics",
      "Email support (48h response)",
    ],
    targetUser: "Individual/Basic",
  },
  {
    id: "pro",
    name: "Pro",
    description: "Power tools for professionals and agencies demanding advanced features.",
    price: "$29",
    priceIntervalName: "per month",
    stripe_price_id: "price_pro_monthly", // Replace with your Stripe ID
    stripe_product_id: "prod_pro",
    features: [
      "Everything in Starter",
      "Unlimited user seats",
      "Advanced analytics & A/B testing",
      "Priority support (24h SLA)",
      "API access",
      "White-label branding",
    ],
    targetUser: "Pro/Power User",
  },
  {
    id: "business",
    name: "Business",
    description: "Scalable for teams with volume discounts—contact sales for 50+ seats.",
    price: "$49", // Per user; drops to $39/user at 10+ seats, $29/user at 50+
    priceIntervalName: "per user / month",
    stripe_price_id: "price_business_monthly", // Replace with your Stripe ID
    stripe_product_id: "prod_business",
    features: [
      "Everything in Pro",
      "Team collaboration tools",
      "Volume-based pricing",
      "Custom integrations",
      "Dedicated account manager",
      "99.9% uptime SLA",
    ],
    targetUser: "Business/Team",
    note: "Negotiated rates for high-volume accounts",
  },
  {
    id: "enterprise",
    name: "Enterprise",
    description: "Custom contracts for large orgs—includes premium support add-on (+15%).",
    price: "Custom", // Starts at $199/user; value-based negotiation
    priceIntervalName: "per month (billed annually)",
    stripe_price_id: null, // Use Stripe Customer Portal for custom
    stripe_product_id: null,
    features: [
      "Everything in Business",
      "On-premise deployment option",
      "Advanced security & compliance (SOC2)",
      "24/7 premium support (+15% fee)",
      "Custom SLAs & training",
      "Unlimited everything",
    ],
    targetUser: "Enterprise",
    note: "Contact sales@yourcompany.com for demo & quote",
  },
]