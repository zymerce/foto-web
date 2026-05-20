import { redirect } from "next/navigation";

export default function LegacySupportRedirect() {
  redirect("/app/platform/support/home");
}
