import { redirect } from "next/navigation";

export default function LegacyAnalystRedirect() {
  redirect("/app/platform/home");
}
