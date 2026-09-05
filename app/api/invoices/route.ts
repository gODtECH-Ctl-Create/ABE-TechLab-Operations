import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type PayloadItem = { description: string; details?: string; quantity: number; unitPrice: number };

type Payload = {
  id?: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate?: string;
  status: string;
  currency: string;
  businessName: string;
  businessAddress?: string;
  businessPhone?: string;
  businessEmail?: string;
  businessWebsite?: string;
  clientCompany: string;
  clientContact?: string;
  clientAddress?: string;
  clientEmail?: string;
  clientPhone?: string;
  project?: string;
  amountPaid: number;
  tax: number;
  bankName?: string;
  accountName?: string;
  accountNumber?: string;
  notes?: string;
  items: PayloadItem[];
};

async function getAccess() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, role: null };
  const { data: roleValue } = await supabase.rpc("get_my_role" as never);
  return { supabase, user, role: roleValue as string | null };
}

export async function GET() {
  const { supabase, user, role } = await getAccess();
  if (!user || !role || !["admin", "operator", "reviewer"].includes(role)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await (supabase as any)
    .from("invoices")
    .select("*, invoice_items(*)")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const invoices = (data ?? []).map((row: any) => ({
    id: row.id,
    invoiceNumber: row.invoice_number,
    issueDate: row.issue_date,
    dueDate: row.due_date ?? "",
    status: row.status,
    currency: row.currency,
    businessName: row.business_name,
    businessAddress: row.business_address ?? "",
    businessPhone: row.business_phone ?? "",
    businessEmail: row.business_email ?? "",
    businessWebsite: row.business_website ?? "",
    clientCompany: row.client_company,
    clientContact: row.client_contact ?? "",
    clientAddress: row.client_address ?? "",
    clientEmail: row.client_email ?? "",
    clientPhone: row.client_phone ?? "",
    project: row.project ?? "",
    amountPaid: Number(row.amount_paid ?? 0),
    tax: Number(row.tax ?? 0),
    bankName: row.bank_name ?? "",
    accountName: row.account_name ?? "",
    accountNumber: row.account_number ?? "",
    notes: row.notes ?? "",
    items: (row.invoice_items ?? []).sort((a: any, b: any) => a.sort_order - b.sort_order).map((item: any) => ({ description: item.description, details: item.details ?? "", quantity: Number(item.quantity), unitPrice: Number(item.unit_price) })),
  }));
  return NextResponse.json({ invoices });
}

export async function POST(request: Request) {
  const { supabase, user, role } = await getAccess();
  if (!user || !role || !["admin", "operator", "reviewer"].includes(role)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let payload: Payload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  if (!payload.invoiceNumber?.trim() || !payload.businessName?.trim() || !payload.clientCompany?.trim()) {
    return NextResponse.json({ error: "Invoice number, business name and client company are required." }, { status: 400 });
  }

  const db = supabase as any;
  const invoiceData = {
    invoice_number: payload.invoiceNumber.trim(),
    issue_date: payload.issueDate || null,
    due_date: payload.dueDate || null,
    status: payload.status || "Draft",
    currency: payload.currency || "NGN",
    business_name: payload.businessName.trim(),
    business_address: payload.businessAddress || null,
    business_phone: payload.businessPhone || null,
    business_email: payload.businessEmail || null,
    business_website: payload.businessWebsite || null,
    client_company: payload.clientCompany.trim(),
    client_contact: payload.clientContact || null,
    client_address: payload.clientAddress || null,
    client_email: payload.clientEmail || null,
    client_phone: payload.clientPhone || null,
    project: payload.project || null,
    amount_paid: Number(payload.amountPaid || 0),
    tax: Number(payload.tax || 0),
    bank_name: payload.bankName || null,
    account_name: payload.accountName || null,
    account_number: payload.accountNumber || null,
    notes: payload.notes || null,
    created_by: user.id,
    updated_at: new Date().toISOString(),
  };

  let invoiceId = payload.id;
  let invoiceRow: any;
  if (invoiceId) {
    const { data, error } = await db.from("invoices").update(invoiceData).eq("id", invoiceId).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    invoiceRow = data;
    const { error: deleteError } = await db.from("invoice_items").delete().eq("invoice_id", invoiceId);
    if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 });
  } else {
    const { data, error } = await db.from("invoices").insert(invoiceData).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    invoiceRow = data;
    invoiceId = data.id;
  }

  const items = (payload.items ?? []).filter((item) => item.description?.trim()).map((item, index) => ({
    invoice_id: invoiceId,
    description: item.description.trim(),
    details: item.details || null,
    quantity: Number(item.quantity || 0),
    unit_price: Number(item.unitPrice || 0),
    sort_order: index,
  }));
  if (items.length) {
    const { error } = await db.from("invoice_items").insert(items);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data: finalRow, error: finalError } = await db.from("invoices").select("*, invoice_items(*)").eq("id", invoiceId).single();
  if (finalError) return NextResponse.json({ error: finalError.message }, { status: 500 });

  return NextResponse.json({ invoice: {
    id: finalRow.id,
    invoiceNumber: finalRow.invoice_number,
    issueDate: finalRow.issue_date,
    dueDate: finalRow.due_date ?? "",
    status: finalRow.status,
    currency: finalRow.currency,
    businessName: finalRow.business_name,
    businessAddress: finalRow.business_address ?? "",
    businessPhone: finalRow.business_phone ?? "",
    businessEmail: finalRow.business_email ?? "",
    businessWebsite: finalRow.business_website ?? "",
    clientCompany: finalRow.client_company,
    clientContact: finalRow.client_contact ?? "",
    clientAddress: finalRow.client_address ?? "",
    clientEmail: finalRow.client_email ?? "",
    clientPhone: finalRow.client_phone ?? "",
    project: finalRow.project ?? "",
    amountPaid: Number(finalRow.amount_paid ?? 0),
    tax: Number(finalRow.tax ?? 0),
    bankName: finalRow.bank_name ?? "",
    accountName: finalRow.account_name ?? "",
    accountNumber: finalRow.account_number ?? "",
    notes: finalRow.notes ?? "",
    items: (finalRow.invoice_items ?? []).sort((a: any, b: any) => a.sort_order - b.sort_order).map((item: any) => ({ description: item.description, details: item.details ?? "", quantity: Number(item.quantity), unitPrice: Number(item.unit_price) })),
  } });
}
