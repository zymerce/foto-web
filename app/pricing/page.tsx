"use client";

import Link from "next/link";
import { Check } from "lucide-react";

const tiers = [
  {
    name: "Free (Starter)",
    id: "free",
    priceINR: "₹0",
    description: "Perfect for freelancers starting their journey.",
    features: ["2 Active Projects", "5GB Secure Storage", "Standard Web Uploads", "Secure Share Links", "Invited Private Review"],
    cta: "Start for free",
    href: "/signup",
    mostPopular: false,
  },
  {
    name: "Pro (Studio)",
    id: "pro",
    priceINR: "₹1,499",
    description: "For professional studios scaling their workflow.",
    features: [
      "30 Active Projects",
      "250GB Secure Storage",
      "Helper Desktop App Enabled",
      "Custom Studio Branding",
      "Priority Support",
      "Higher project and storage headroom",
      "Faster studio delivery workflow",
    ],
    cta: "Upgrade to Pro",
    href: "/app/settings?tab=billing",
    mostPopular: true,
  },
  {
    name: "Enterprise",
    id: "enterprise",
    priceINR: "Custom",
    description: "Tailored solutions for large event agencies.",
    features: [
      "Unlimited Projects",
      "1TB+ Secure Storage",
      "White-label delivery planning",
      "Dedicated Account Manager",
      "Guided onboarding",
      "Custom storage and support terms",
    ],
    cta: "Contact Sales",
    href: "/contact",
    mostPopular: false,
  },
];

export default function PricingPage() {
  return (
    <div className="bg-background py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-base font-semibold leading-7 text-primary">Pricing</h2>
          <p className="mt-2 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            Choose the right plan for your studio
          </p>
        </div>
        <p className="mx-auto mt-6 max-w-2xl text-center text-lg leading-8 text-muted-foreground">
          Scale your photography business with secure delivery and efficient client selection.
        </p>
        <p className="mx-auto mt-3 max-w-3xl text-center text-sm leading-7 text-muted-foreground">
          V1 stays honest: studio onboarding, project-based delivery, Helper uploads, secure share links, invited private review, and basic billing.
        </p>
        <div className="isolate mx-auto mt-16 grid max-w-md grid-cols-1 gap-y-8 sm:mt-20 lg:mx-0 lg:max-w-none lg:grid-cols-3 lg:gap-x-8">
          {tiers.map((tier) => (
            <div
              key={tier.id}
              className={`flex flex-col justify-between rounded-3xl p-8 ring-1 ring-border xl:p-10 ${
                tier.mostPopular ? "bg-card shadow-xl ring-primary" : "bg-background"
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-x-4">
                  <h3 className={`text-lg font-semibold leading-8 ${tier.mostPopular ? "text-primary" : "text-foreground"}`}>
                    {tier.name}
                  </h3>
                  {tier.mostPopular ? (
                    <p className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold leading-5 text-primary">
                      Most popular
                    </p>
                  ) : null}
                </div>
                <p className="mt-4 text-sm leading-6 text-muted-foreground">{tier.description}</p>
                <p className="mt-6 flex items-baseline gap-x-1">
                  <span className="text-4xl font-bold tracking-tight text-foreground">{tier.priceINR}</span>
                  {tier.id !== "enterprise" && tier.id !== "free" && (
                    <span className="text-sm font-semibold leading-6 text-muted-foreground">/month</span>
                  )}
                </p>
                <ul role="list" className="mt-8 space-y-3 text-sm leading-6 text-muted-foreground">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex gap-x-3">
                      <Check className="h-6 w-5 flex-none text-primary" aria-hidden="true" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
              <Link
                href={tier.href}
                className={`mt-8 block rounded-md px-3 py-2 text-center text-sm font-semibold leading-6 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                  tier.mostPopular
                    ? "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
                    : "bg-background text-foreground ring-1 ring-inset ring-border hover:ring-muted-foreground"
                }`}
              >
                {tier.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
