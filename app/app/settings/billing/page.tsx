import { redirect } from "next/navigation";

export default function AppBillingCompatibilityRedirect() {
  redirect("/app/settings?tab=billing");
}
