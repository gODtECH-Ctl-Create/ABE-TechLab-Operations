import { WorkspaceTabs } from "@/components/workspace-tabs";

export function AriaNavigation({ active }: { active: "Overview" | "Conversation" | "Research" | "Activity" }) {
  return <WorkspaceTabs label="ARIA workspace" active={active} tabs={[
    { href: "/aria", label: "Overview", description: "Decision briefing" },
    { href: "/aria?view=conversation", label: "Conversation", description: "Ask and prepare" },
    { href: "/aria/research", label: "Research", description: "Discover prospects" },
    { href: "/aria?view=activity", label: "Activity", description: "Runs and evidence" },
  ]} />;
}

export function AccountsNavigation({ active }: { active: "Organisations" | "Contacts" }) {
  return <WorkspaceTabs label="Accounts workspace" active={active} tabs={[
    { href: "/organisations", label: "Organisations", description: "Company accounts" },
    { href: "/contacts", label: "Contacts", description: "People and influence" },
  ]} />;
}

export function PipelineNavigation({ active }: { active: "Leads" | "Opportunities" | "Needs attention" }) {
  return <WorkspaceTabs label="Pipeline workspace" active={active} tabs={[
    { href: "/leads", label: "Leads", description: "Qualify and progress" },
    { href: "/opportunities", label: "Opportunities", description: "Develop commercial work" },
    { href: "/attention", label: "Needs attention", description: "Overdue and incomplete" },
  ]} />;
}

export function OutreachNavigation({ active }: { active: "Campaigns" | "Client Inbox" | "Follow-ups" }) {
  return <WorkspaceTabs label="Outreach workspace" active={active} tabs={[
    { href: "/outreach", label: "Campaigns", description: "Strategy and messages" },
    { href: "/assistant", label: "Client Inbox", description: "Active conversations" },
    { href: "/follow-ups", label: "Follow-ups", description: "Planned next actions" },
  ]} />;
}
