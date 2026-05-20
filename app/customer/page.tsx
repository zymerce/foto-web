import { redirect } from "next/navigation";

export default function LegacyCustomerRedirect() {
  redirect("/app/customer/selections");
}
