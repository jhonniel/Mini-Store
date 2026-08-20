import Link from "next/link";
import { brand } from "@/config/brand";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const plans = [
  {
    name: "Starter",
    price: "Free trial",
    detail: "14 days to run a real store.",
    items: ["1 business", "Products & inventory", "Customer credit", "Basic reports"],
  },
  {
    name: "Growth",
    price: "₱999 / mo",
    detail: "For stores ready to scale.",
    items: ["Staff permissions", "Advanced reports", "CSV import/export", "Priority email support"],
  },
  {
    name: "Business",
    price: "Let’s talk",
    detail: "Multiple locations and onboarding.",
    items: ["Custom roles", "Dedicated success", "SLA", "Migration help"],
  },
];

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      <h1 className="font-heading text-4xl font-semibold tracking-tight">Simple pricing</h1>
      <p className="mt-3 max-w-xl text-muted-foreground">
        {brand.name} is subscription-ready. Billing can be connected later — the organization model already supports plans and trials.
      </p>
      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {plans.map((plan) => (
          <Card key={plan.name}>
            <CardHeader>
              <CardTitle>{plan.name}</CardTitle>
              <p className="text-2xl font-semibold">{plan.price}</p>
              <p className="text-sm text-muted-foreground">{plan.detail}</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2 text-sm text-muted-foreground">
                {plan.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <Button className="w-full" render={<Link href="/register" />}>
                Get started
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
