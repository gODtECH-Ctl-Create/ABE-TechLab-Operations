import { describe, expect, it } from "vitest";
import { addInvoiceTotals } from "./finance";

describe("addInvoiceTotals", () => {
  it("calculates subtotal, total, and balance due from stored values", () => {
    const [invoice] = addInvoiceTotals([{
      amount_paid: "2500",
      tax: "500",
      invoice_items: [
        { quantity: "2", unit_price: "3000" },
        { quantity: 1, unit_price: 1000 },
      ],
    }]);

    expect(invoice.subtotal).toBe(7000);
    expect(invoice.total).toBe(7500);
    expect(invoice.balance_due).toBe(5000);
  });

  it("never reports a negative balance", () => {
    const [invoice] = addInvoiceTotals([{
      amount_paid: 2000,
      tax: 0,
      invoice_items: [{ quantity: 1, unit_price: 1000 }],
    }]);

    expect(invoice.balance_due).toBe(0);
  });
});
