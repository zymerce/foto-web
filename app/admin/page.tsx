import { redirect } from "next/navigation";

export default function LegacyAdminRedirect() {
  redirect("/app/admin/overview");
}
