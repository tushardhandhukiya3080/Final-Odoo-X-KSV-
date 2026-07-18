import { useQuery } from "@tanstack/react-query";
import { Car, Fuel, Users } from "lucide-react";
import { api } from "../../lib/api";
import { Card, Spinner, Badge, EmptyState } from "../../components/ui";

interface V {
  id: string; model: string; registrationNumber: string; seatingCapacity: number; fuelType: string; mileageKmpl: number; active: boolean;
  owner: { name: string };
}

export default function AdminVehicles() {
  const vehicles = useQuery({ queryKey: ["admin-vehicles"], queryFn: async () => (await api.get<V[]>("/admin/vehicles")).data });
  const active = vehicles.data?.filter((v) => v.active) ?? [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">Fleet</h1>
      {vehicles.isLoading ? <Spinner className="text-brand-500" /> :
        active.length === 0 ? <EmptyState icon={<Car className="h-10 w-10" />} title="No vehicles registered" /> :
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {active.map((v) => (
            <Card key={v.id}>
              <div className="flex items-center gap-2"><div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-600"><Car className="h-5 w-5" /></div><div><div className="font-bold text-slate-800">{v.model}</div><div className="text-xs text-slate-400">{v.registrationNumber} · {v.owner.name}</div></div></div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <Badge className="bg-slate-100 text-slate-600"><Users className="mr-1 h-3 w-3" />{v.seatingCapacity}</Badge>
                <Badge className="bg-blue-50 text-blue-700"><Fuel className="mr-1 h-3 w-3" />{v.fuelType}</Badge>
                <Badge className="bg-amber-50 text-amber-700">{v.mileageKmpl} km/L</Badge>
              </div>
            </Card>
          ))}
        </div>
      }
    </div>
  );
}
