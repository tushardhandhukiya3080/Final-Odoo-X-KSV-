"use client";

import { useState } from "react";

type Item = { name: string; qty: string; price: string };

export default function InvoiceSender() {
  const [to, setTo] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [invoiceNo, setInvoiceNo] = useState("INV-001");
  const [items, setItems] = useState<Item[]>([{ name: "", qty: "1", price: "" }]);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const setItem = (i: number, key: keyof Item, val: string) =>
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, [key]: val } : it)));
  const addItem = () => setItems((prev) => [...prev, { name: "", qty: "1", price: "" }]);
  const removeItem = (i: number) =>
    setItems((prev) => (prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev));

  const total = items.reduce(
    (sum, it) => sum + (Number(it.qty) || 0) * (Number(it.price) || 0),
    0,
  );

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setStatus(null);
    setPreview(null);
    try {
      const res = await fetch("/api/whatsapp/invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to,
          customerName: customerName || undefined,
          invoiceNo: invoiceNo || undefined,
          items: items.map((it) => ({
            name: it.name,
            qty: Number(it.qty),
            price: Number(it.price),
          })),
        }),
      });
      const data = await res.json();
      if (data.message) setPreview(data.message);
      setStatus(
        res.ok
          ? { ok: true, text: `Invoice sent ✓ (${data.sid})` }
          : { ok: false, text: data.error ?? "Failed to send" },
      );
    } catch {
      setStatus({ ok: false, text: "Network error" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="panel" onSubmit={send}>
      <strong>Send an invoice</strong>
      <div className="search-row" style={{ marginTop: 12 }}>
        <input
          className="search-input"
          placeholder="Recipient +14155551234"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          required
        />
        <input
          className="search-input"
          placeholder="Invoice #"
          value={invoiceNo}
          onChange={(e) => setInvoiceNo(e.target.value)}
          style={{ maxWidth: 120 }}
        />
      </div>
      <input
        className="search-input"
        style={{ marginTop: 10 }}
        placeholder="Customer name"
        value={customerName}
        onChange={(e) => setCustomerName(e.target.value)}
      />

      {items.map((it, i) => (
        <div className="inv-item" key={i}>
          <input
            placeholder="Item"
            value={it.name}
            onChange={(e) => setItem(i, "name", e.target.value)}
            required
          />
          <input
            type="number"
            min="1"
            placeholder="Qty"
            value={it.qty}
            onChange={(e) => setItem(i, "qty", e.target.value)}
            required
          />
          <input
            type="number"
            min="0"
            step="0.01"
            placeholder="Price"
            value={it.price}
            onChange={(e) => setItem(i, "price", e.target.value)}
            required
          />
          <button type="button" className="btn-ghost sm" onClick={() => removeItem(i)}>
            ✕
          </button>
        </div>
      ))}

      <div className="inv-foot">
        <button type="button" className="btn-ghost sm" onClick={addItem}>
          + Add item
        </button>
        <span className="total">Total: ₹{total.toFixed(2)}</span>
      </div>

      {status && <div className={status.ok ? "success" : "error"}>{status.text}</div>}
      {preview && <pre className="preview">{preview}</pre>}

      <button className="btn" type="submit" disabled={busy}>
        {busy ? "Sending…" : "Send invoice"}
      </button>
    </form>
  );
}
