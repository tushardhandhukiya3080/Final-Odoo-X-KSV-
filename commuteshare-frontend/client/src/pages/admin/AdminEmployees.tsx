import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { UserPlus, Trash2, Shield, User as UserIcon } from "lucide-react";
import { api, apiError } from "../../lib/api";
import { Card, Spinner, Badge } from "../../components/ui";

interface Emp {
  id: string; name: string; email: string; phone: string | null; role: "COMPANY_ADMIN" | "EMPLOYEE";
  _count: { offeredRides: number; bookings: number; vehicles: number };
}

export default function AdminEmployees() {
  const qc = useQueryClient();
  const emps = useQuery({ queryKey: ["admin-employees"], queryFn: async () => (await api.get<Emp[]>("/admin/employees")).data });
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "password", phone: "", role: "EMPLOYEE" });
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post("/admin/employees", form);
      toast.success("Employee added");
      setOpen(false); setForm({ name: "", email: "", password: "password", phone: "", role: "EMPLOYEE" });
      qc.invalidateQueries({ queryKey: ["admin-employees"] });
    } catch (e) { toast.error(apiError(e)); } finally { setBusy(false); }
  }
  async function remove(id: string) {
    try { await api.delete(`/admin/employees/${id}`); qc.invalidateQueries({ queryKey: ["admin-employees"] }); toast.success("Removed"); }
    catch (e) { toast.error(apiError(e)); }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Employees</h1>
        <button onClick={() => setOpen((o) => !o)} className="btn-primary"><UserPlus className="h-4 w-4" /> Add employee</button>
      </div>

      {open && (
        <Card className="animate-fade-in">
          <form onSubmit={add} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div><label className="label">Name</label><input className="input" value={form.name} onChange={(e) => set("name", e.target.value)} required /></div>
            <div><label className="label">Email</label><input type="email" className="input" value={form.email} onChange={(e) => set("email", e.target.value)} required /></div>
            <div><label className="label">Temp password</label><input className="input" value={form.password} onChange={(e) => set("password", e.target.value)} required /></div>
            <div><label className="label">Phone</label><input className="input" value={form.phone} onChange={(e) => set("phone", e.target.value)} /></div>
            <div><label className="label">Role</label><select className="input" value={form.role} onChange={(e) => set("role", e.target.value)}><option value="EMPLOYEE">Employee</option><option value="COMPANY_ADMIN">Company Admin</option></select></div>
            <div className="flex items-end"><button className="btn-primary w-full" disabled={busy}>{busy ? <Spinner /> : "Create"}</button></div>
          </form>
        </Card>
      )}

      {emps.isLoading ? <Spinner className="text-brand-500" /> :
        <Card className="!p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-slate-100 text-left text-xs uppercase text-slate-400"><th className="p-4">Name</th><th>Role</th><th>Rides offered</th><th>Bookings</th><th>Vehicles</th><th></th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {emps.data!.map((e) => (
                  <tr key={e.id}>
                    <td className="p-4"><div className="flex items-center gap-2"><div className="grid h-8 w-8 place-items-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">{e.name[0]}</div><div><div className="font-semibold text-slate-700">{e.name}</div><div className="text-[11px] text-slate-400">{e.email}</div></div></div></td>
                    <td>{e.role === "COMPANY_ADMIN" ? <Badge className="bg-amber-50 text-amber-700"><Shield className="mr-1 h-3 w-3" />Admin</Badge> : <Badge className="bg-slate-100 text-slate-600"><UserIcon className="mr-1 h-3 w-3" />Employee</Badge>}</td>
                    <td>{e._count.offeredRides}</td><td>{e._count.bookings}</td><td>{e._count.vehicles}</td>
                    <td className="pr-4 text-right">{e.role !== "COMPANY_ADMIN" && <button onClick={() => remove(e.id)} className="text-slate-300 hover:text-rose-500"><Trash2 className="h-4 w-4" /></button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      }
    </div>
  );
}
