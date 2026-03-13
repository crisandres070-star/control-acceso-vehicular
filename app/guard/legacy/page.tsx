import { AccessChecker } from "@/components/guard/access-checker";
import { requireRole } from "@/lib/auth";

export default async function GuardLegacyPage() {
    const session = await requireRole("USER");
    const roleLabel = session.role === "ADMIN" ? "Administrador" : "Portería";

    return (
        <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(124,58,237,0.12),transparent_24%),radial-gradient(circle_at_top_right,rgba(59,130,246,0.08),transparent_20%),linear-gradient(180deg,#f4f6fa_0%,#edf2f7_100%)]">
            <div className="mx-auto flex min-h-screen w-full max-w-[1500px] items-center justify-center px-4 py-4 sm:px-6 lg:px-8">
                <AccessChecker roleLabel={roleLabel} username={session.username} />
            </div>
        </main>
    );
}