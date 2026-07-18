// Format a structured invoice into a WhatsApp-friendly message.
// WhatsApp supports *bold* / _italic_ markdown.
export type InvoiceItem = { name: string; qty: number; price: number };

export type Invoice = {
  customerName?: string;
  invoiceNo?: string;
  currency?: string; // default "₹"
  items: InvoiceItem[];
  notes?: string;
};

export function invoiceTotal(inv: Invoice): number {
  return inv.items.reduce((sum, it) => sum + it.qty * it.price, 0);
}

export function formatInvoice(inv: Invoice): string {
  const currency = inv.currency ?? "₹";
  const lines: string[] = [];

  lines.push(`🧾 *Invoice${inv.invoiceNo ? ` ${inv.invoiceNo}` : ""}*`);
  if (inv.customerName) lines.push(`Hi ${inv.customerName},`);
  lines.push("");

  inv.items.forEach((it, i) => {
    const amount = it.qty * it.price;
    lines.push(`${i + 1}. ${it.name} × ${it.qty} — ${currency}${amount.toFixed(2)}`);
  });

  lines.push("");
  lines.push(`*Total: ${currency}${invoiceTotal(inv).toFixed(2)}*`);
  if (inv.notes) {
    lines.push("");
    lines.push(inv.notes);
  }
  return lines.join("\n");
}
