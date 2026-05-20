import { redirect } from "next/navigation";

export default function BillingCompatibilityRedirect() {
  redirect("/app/settings?tab=billing");
}
