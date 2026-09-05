"use client";

import { useEffect, useMemo, useState } from "react";

type InvoiceItem = {
  description: string;
  details: string;
  quantity: number;
  unitPrice: number;
};

type Invoice = {
  id?: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  status: "Draft" | "Sent" | "Partially Paid" | "Paid" | "Void";
  currency: string;
  businessName: string;
  businessAddress: string;
  businessPhone: string;
  businessEmail: string;
  businessWebsite: string;
  clientCompany: string;
  clientContact: string;
  clientAddress: string;
  clientEmail: string;
  clientPhone: string;
  project: string;
  items: InvoiceItem[];
  amountPaid: number;
  tax: number;
  bankName: string;
  accountName: string;
  accountNumber: string;
  notes: string;
};

const today = () => new Date().toISOString().slice(0, 10);
const nextInvoiceNumber = () => `ABE-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-001`;

const blankInvoice = (): Invoice => ({
  invoiceNumber: nextInvoiceNumber(),
  issueDate: today(),
  dueDate: today(),
  status: "Draft",
  currency: "NGN",
  businessName: "ABE TechLab",
  businessAddress: "14 Layi Haruna Street, Governor’s Road, Ikotun, Lagos",
  businessPhone: "+234 814 047 9738",
  businessEmail: "",
  businessWebsite: "www.abetechlab.com",
  clientCompany: "",
  clientContact: "",
  clientAddress: "",
  clientEmail: "",
  clientPhone: "",
  project: "",
  items: [{ description: "", details: "", quantity: 1, unitPrice: 0 }],
  amountPaid: 0,
  tax: 0,
  bankName: "",
  accountName: "",
  accountNumber: "",
  notes: "",
});

const currencyMap: Record<string, string> = { NGN: "₦", USD: "$", EUR: "€", GBP: "£" };

function money(value: number, currency: string) {
  const symbol = currencyMap[currency] ?? currency;
  return `${symbol}${new Intl.NumberFormat("en-NG", { maximumFractionDigits: 2 }).format(value || 0)}`;
}

export function InvoiceWorkspace() {
  const [invoice, setInvoice] = useState<Invoice>(blankInvoice);
  const [saved, setSaved] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/invoices")
      .then((response) => (response.ok ? response.json() : { invoices: [] }))
      .then((payload) => setSaved(payload.invoices ?? []))
      .catch(() => setMessage("Could not load saved invoices. You can still create and print an invoice."))
      .finally(() => setLoading(false));
  }, []);

  const subtotal = useMemo(
    () => invoice.items.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.unitPrice || 0), 0),
    [invoice.items],
  );
  const total = subtotal + Number(invoice.tax || 0);
  const balance = Math.max(total - Number(invoice.amountPaid || 0), 0);

  function update<K extends keyof Invoice>(key: K, value: Invoice[K]) {
    setInvoice((current) => ({ ...current, [key]: value }));
  }

  function updateItem(index: number, key: keyof InvoiceItem, value: string | number) {
    setInvoice((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) => (itemIndex === index ? { ...item, [key]: value } : item)),
    }));
  }

  function addItem() {
    setInvoice((current) => ({ ...current, items: [...current.items, { description: "", details: "", quantity: 1, unitPrice: 0 }] }));
  }

  function removeItem(index: number) {
    setInvoice((current) => ({ ...current, items: current.items.filter((_, itemIndex) => itemIndex !== index) }));
  }

  async function saveInvoice() {
    setSaving(true);
    setMessage("");
    const response = await fetch("/api/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...invoice, totals: { subtotal, total, balance } }),
    });
    const payload = await response.json().catch(() => ({}));
    setSaving(false);
    if (!response.ok) {
      setMessage(payload.error ?? "Unable to save invoice.");
      return;
    }
    const next = payload.invoice as Invoice;
    setInvoice(next);
    setSaved((current) => [next, ...current.filter((item) => item.id !== next.id)]);
    setMessage("Invoice saved.");
  }

  function resetInvoice() {
    setInvoice(blankInvoice());
    setMessage("");
  }

  return (
    <main className="main invoices-main">
      <header className="header invoices-header">
        <div>
          <div className="eyebrow">Commercial operations</div>
          <h1>Invoices</h1>
          <p className="header-subtitle">Create, review, save and export client-ready invoices using the ABE TechLab template direction.</p>
        </div>
        <div className="header-actions invoice-header-actions">
          <button className="secondary-button" type="button" onClick={resetInvoice}>New invoice</button>
          <button className="primary-button" type="button" onClick={saveInvoice} disabled={saving}>{saving ? "Saving…" : "Save invoice"}</button>
          <button className="primary-button invoice-print-button" type="button" onClick={() => window.print()}>Print / Save PDF</button>
        </div>
      </header>

      {message && <div className="invoice-message" role="status">{message}</div>}

      <section className="invoice-workspace-grid">
        <div className="invoice-editor">
          <section className="card invoice-card">
            <div className="section-heading"><div><div className="eyebrow">Document</div><h2>Invoice details</h2><p>Everything here is editable before export.</p></div></div>
            <div className="invoice-form-grid">
              <label>Invoice number<input value={invoice.invoiceNumber} onChange={(e) => update("invoiceNumber", e.target.value)} /></label>
              <label>Status<select value={invoice.status} onChange={(e) => update("status", e.target.value as Invoice["status"])}><option>Draft</option><option>Sent</option><option>Partially Paid</option><option>Paid</option><option>Void</option></select></label>
              <label>Issue date<input type="date" value={invoice.issueDate} onChange={(e) => update("issueDate", e.target.value)} /></label>
              <label>Due date<input type="date" value={invoice.dueDate} onChange={(e) => update("dueDate", e.target.value)} /></label>
              <label>Currency<select value={invoice.currency} onChange={(e) => update("currency", e.target.value)}><option value="NGN">NGN · Nigerian Naira</option><option value="USD">USD · United States Dollar</option><option value="EUR">EUR · Euro</option><option value="GBP">GBP · Pound Sterling</option></select></label>
              <label>Project / reference<input value={invoice.project} onChange={(e) => update("project", e.target.value)} placeholder="e.g. Website Development" /></label>
            </div>
          </section>

          <section className="card invoice-card">
            <div className="section-heading"><div><div className="eyebrow">Parties</div><h2>Business & client</h2></div></div>
            <div className="invoice-two-col">
              <div><h3>From</h3><label>Business name<input value={invoice.businessName} onChange={(e) => update("businessName", e.target.value)} /></label><label>Address<textarea value={invoice.businessAddress} onChange={(e) => update("businessAddress", e.target.value)} /></label><div className="invoice-form-grid"><label>Phone<input value={invoice.businessPhone} onChange={(e) => update("businessPhone", e.target.value)} /></label><label>Email<input value={invoice.businessEmail} onChange={(e) => update("businessEmail", e.target.value)} /></label></div><label>Website<input value={invoice.businessWebsite} onChange={(e) => update("businessWebsite", e.target.value)} /></label></div>
              <div><h3>Bill to</h3><label>Company<input value={invoice.clientCompany} onChange={(e) => update("clientCompany", e.target.value)} placeholder="Client company" /></label><label>Contact person<input value={invoice.clientContact} onChange={(e) => update("clientContact", e.target.value)} /></label><label>Address<textarea value={invoice.clientAddress} onChange={(e) => update("clientAddress", e.target.value)} /></label><div className="invoice-form-grid"><label>Phone<input value={invoice.clientPhone} onChange={(e) => update("clientPhone", e.target.value)} /></label><label>Email<input value={invoice.clientEmail} onChange={(e) => update("clientEmail", e.target.value)} /></label></div></div>
            </div>
          </section>

          <section className="card invoice-card">
            <div className="section-heading"><div><div className="eyebrow">Line items</div><h2>Charges</h2><p>Add services, quantities and rates. Totals update automatically.</p></div><button className="secondary-button" type="button" onClick={addItem}>+ Add line</button></div>
            <div className="invoice-item-editor">
              {invoice.items.map((item, index) => <div className="invoice-item-row" key={`${index}-${item.description}`}><div><label>Description<input value={item.description} onChange={(e) => updateItem(index, "description", e.target.value)} /></label><label>Details<input value={item.details} onChange={(e) => updateItem(index, "details", e.target.value)} placeholder="Optional detail" /></label></div><label>Qty<input type="number" min="0" step="1" value={item.quantity} onChange={(e) => updateItem(index, "quantity", Number(e.target.value))} /></label><label>Unit price<input type="number" min="0" step="0.01" value={item.unitPrice} onChange={(e) => updateItem(index, "unitPrice", Number(e.target.value))} /></label><div className="invoice-item-total">{money(item.quantity * item.unitPrice, invoice.currency)}</div><button className="icon-button" type="button" onClick={() => removeItem(index)} aria-label={`Remove line ${index + 1}`}>×</button></div>)}
            </div>
            <div className="invoice-form-grid invoice-finance-fields"><label>Tax / other charges<input type="number" min="0" step="0.01" value={invoice.tax} onChange={(e) => update("tax", Number(e.target.value))} /></label><label>Amount already paid<input type="number" min="0" step="0.01" value={invoice.amountPaid} onChange={(e) => update("amountPaid", Number(e.target.value))} /></label></div>
          </section>

          <section className="card invoice-card">
            <div className="section-heading"><div><div className="eyebrow">Settlement</div><h2>Payment & notes</h2></div></div>
            <div className="invoice-two-col"><div><h3>Payment details</h3><label>Bank<input value={invoice.bankName} onChange={(e) => update("bankName", e.target.value)} /></label><label>Account name<input value={invoice.accountName} onChange={(e) => update("accountName", e.target.value)} /></label><label>Account number<input value={invoice.accountNumber} onChange={(e) => update("accountNumber", e.target.value)} /></label></div><div><h3>Notes & terms</h3><textarea className="invoice-notes-input" value={invoice.notes} onChange={(e) => update("notes", e.target.value)} placeholder="Renewal terms, scope notes, payment terms, delivery notes…" /></div></div>
          </section>
        </div>

        <aside className="invoice-preview-panel">
          <div className="invoice-preview-toolbar"><div><span className="eyebrow">Live preview</span><strong>{loading ? "Loading…" : "ABE TechLab invoice"}</strong></div><span className="template-badge">Template reference loaded</span></div>
          <article className="invoice-paper">
            <div className="invoice-watermark" aria-hidden="true">{Array.from({ length: 18 }, (_, index) => <span key={index}>ABE TechLab</span>)}</div>
            <header className="paper-header"><div><div className="paper-brand">{invoice.businessName || "ABE TechLab"}</div><div className="paper-contact">{invoice.businessAddress}<br />{invoice.businessPhone}{invoice.businessEmail ? ` · ${invoice.businessEmail}` : ""}<br />{invoice.businessWebsite}</div></div><div className="paper-title"><span>INVOICE</span><div className="paper-meta"><b>{invoice.invoiceNumber}</b><small>Issued {invoice.issueDate || "—"}</small><small>Due {invoice.dueDate || "—"}</small><em className={`paper-status ${invoice.status.toLowerCase().replaceAll(" ", "-")}`}>{invoice.status}</em></div></div></header>
            <div className="paper-parties"><div><small>FROM</small><strong>{invoice.businessName || "ABE TechLab"}</strong><span>{invoice.businessAddress || "—"}</span></div><div><small>BILL TO</small><strong>{invoice.clientCompany || "Client company"}</strong><span>{invoice.clientContact || "—"}</span><span>{invoice.clientAddress || "—"}</span></div></div>
            <div className="paper-project"><small>PROJECT</small><strong>{invoice.project || "Invoice project"}</strong></div>
            <table className="paper-table"><thead><tr><th>Description</th><th>Details</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead><tbody>{invoice.items.map((item, index) => <tr key={index}><td><strong>{item.description || "Untitled service"}</strong></td><td>{item.details || "—"}</td><td>{item.quantity}</td><td>{money(item.unitPrice, invoice.currency)}</td><td>{money(item.quantity * item.unitPrice, invoice.currency)}</td></tr>)}</tbody></table>
            <div className="paper-summary"><div className="paper-summary-left"><small>PAYMENT</small><span>{invoice.bankName || "—"}</span><span>{invoice.accountName || "—"}</span><span>{invoice.accountNumber || "—"}</span></div><div className="paper-summary-right"><div><span>Subtotal</span><b>{money(subtotal, invoice.currency)}</b></div><div><span>Tax / other</span><b>{money(invoice.tax, invoice.currency)}</b></div><div><span>Total</span><b>{money(total, invoice.currency)}</b></div><div><span>Amount paid</span><b>{money(invoice.amountPaid, invoice.currency)}</b></div><div className="paper-balance"><span>Balance due</span><strong>{money(balance, invoice.currency)}</strong></div></div></div>
            <div className="paper-notes"><small>NOTES & TERMS</small><p>{invoice.notes || "Add your notes and terms here. Domain and third-party renewals, scope notes, delivery requirements and payment terms can all be included."}</p></div>
            <footer className="paper-footer">Thank you for choosing {invoice.businessName || "ABE TechLab"}.</footer>
          </article>
        </aside>
      </section>

      <section className="card invoice-history-card">
        <div className="section-heading"><div><div className="eyebrow">Saved documents</div><h2>Recent invoices</h2><p>Open a saved invoice to continue editing it.</p></div></div>
        {saved.length === 0 ? <div className="empty-stage"><strong>No saved invoices yet</strong><span>Save the first invoice above and it will appear here.</span></div> : <div className="invoice-history-list">{saved.slice(0, 8).map((item) => <button type="button" key={item.id} className="invoice-history-row" onClick={() => setInvoice(item)}><span><strong>{item.invoiceNumber}</strong><small>{item.clientCompany || "No client"} · {item.project || "No project"}</small></span><span><small>{item.issueDate}</small><b>{money((item.items ?? []).reduce((sum: number, line: InvoiceItem) => sum + line.quantity * line.unitPrice, 0) + Number(item.tax || 0), item.currency)}</b></span></button>)}</div>}
      </section>
    </main>
  );
}
