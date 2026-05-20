import { RoleConsolePage } from "@/components/layout/role-console-page";

export default function ActivityPage() {
  return (
    <RoleConsolePage
      title="Workflow Activity"
      subtitle="Review recent actions across upload, invite, verification, and delivery flow."
      role="photographer"
      actions={[
        { href: "/app/uploads", label: "Upload operations", hint: "Return to helper upload controls" },
        { href: "/app/home", label: "Studio home", hint: "Go back to role command center" },
      ]}
    />
  );
}
