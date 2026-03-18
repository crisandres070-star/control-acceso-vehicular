type FaenaStatsProps = {
    totalVehicles: number;
    enFaenaVehicles: number;
    transitVehicles: number;
    fueraFaenaVehicles: number;
};

export function FaenaStats({
    totalVehicles,
    enFaenaVehicles,
    transitVehicles,
    fueraFaenaVehicles,
}: FaenaStatsProps) {
    return (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="panel px-5 py-5 lg:px-6 lg:py-6">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Total vehículos</p>
                <p className="mt-3 text-4xl font-bold text-slate-950">{totalVehicles}</p>
            </div>
            <div className="panel px-5 py-5 lg:px-6 lg:py-6">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">En faena</p>
                <p className="mt-3 text-4xl font-bold text-green-700">{enFaenaVehicles}</p>
            </div>
            <div className="panel px-5 py-5 lg:px-6 lg:py-6">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">En tránsito</p>
                <p className="mt-3 text-4xl font-bold text-amber-700">{transitVehicles}</p>
            </div>
            <div className="panel px-5 py-5 lg:px-6 lg:py-6">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Fuera de faena</p>
                <p className="mt-3 text-4xl font-bold text-sky-700">{fueraFaenaVehicles}</p>
            </div>
        </section>
    );
}
