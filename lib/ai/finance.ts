export type InvoiceItem = {
  quantity: number | string | null;
  unit_price: number | string | null;
};

export type InvoiceRow = {
  amount_paid: number | string | null;
  tax: number | string | null;
  invoice_items?: InvoiceItem[] | null;
  [key: string]: unknown;
};

export function addInvoiceTotals(rows: InvoiceRow[]) {
  return rows.map((row) => {
    const subtotal = (row.invoice_items ?? []).reduce(
      (sum, item) => sum + Number(item.quantity ?? 0) * Number(item.unit_price ?? 0),
      0,
    );
    const total = subtotal + Number(row.tax ?? 0);
    const balance_due = Math.max(total - Number(row.amount_paid ?? 0), 0);
    return { ...row, subtotal, total, balance_due };
  });
}
