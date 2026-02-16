export type MatatuPartner = { name: string; logo: string }
export type IconKey = "tracking" | "routes" | "notifications" | "analytics"

export type PlatformCapability = {
  name: string
  description: string
  icon: IconKey
  image: string
  audience: string[]
}

export type PlatformActor = {
  role: string
  goal: string
  benefits: string[]
  icon: string
}

export type CommuterWorkflow = { icon: IconKey; title: string; description: string; link: string }

export type Testimonial = { name: string; userType: string; testimony: string; rating: number }
