import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { InvoiceWorkspace } from "@/components/invoice/invoice-workspace";

export default async function InvoicesPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: roleValue, error } = await supabase.rpc("get_my_role" as never);
  const role = error ? null : (roleValue as string | null);
  if (!role || !["admin", "operator", "reviewer"].includes(role)) {
    return (
      <main className="main">
        <section className="card" style={{ marginTop: 24 }}>
          <div className="eyebrow">Invoices</div>
          <h1>Access pending</h1>
          <p>Your account needs an Operations role before you can use the invoice workspace.</p>
        </section>
      </main>
    );
  }

  return <InvoiceWorkspace />;
}
