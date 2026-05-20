import { RoleConsolePage } from "@/components/layout/role-console-page";

export default function AppPhotographerPage() {
  return (
    <RoleConsolePage
      title="Photographer Console"
      subtitle="Launch helper uploads, track sync progress, and keep project deliveries moving."
      role="photographer"
      actions={[
        { href: "/app/projects", label: "Projects", hint: "Create and manage active shoots" },
        { href: "/app/uploads", label: "Uploads", hint: "Track helper session health and progress" },
        { href: "/app/activity", label: "Activity", hint: "Review recent upload and workflow events" },
      ]}
    />
  );
}
