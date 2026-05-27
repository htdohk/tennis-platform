"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const BRAND = process.env.NEXT_PUBLIC_BRAND_NAME || "网球馆";

export default function HomePage() {
  const router = useRouter();
  const { data: venuesRes } = useQuery({
    queryKey: ["venues"],
    queryFn: () => api.get<{ data: { id: string; name: string; address: string; intro: string | null }[] }>("/api/venues"),
  });
  const { data: recruitsRes } = useQuery({
    queryKey: ["recruits"],
    queryFn: () => api.get<{ data: { id: string; status: string; order: { startAt: string; court: { name: string } }; targetLevel: string; maxParticipants: number; participants: { id: string }[] }[] }>("/api/recruits"),
  });

  const venues = venuesRes?.data || [];
  const recruits = (recruitsRes?.data || []).filter((r) => r.status === "RECRUITING");

  return (
    <div className="space-y-8">
      <section className="text-center py-12">
        <h1 className="text-3xl font-bold mb-2">{BRAND}</h1>
        <p className="text-gray-500 mb-6">在线预订网球场，轻松找到球友</p>
        <div className="flex gap-3 justify-center">
          <Button size="lg" onClick={() => router.push("/booking")}>立即预订</Button>
          <Button size="lg" variant="outline" onClick={() => router.push("/recruits")}>查看招募</Button>
        </div>
      </section>

      {venues.length > 0 && (
        <section>
          <h2 className="text-xl font-bold mb-4">场馆</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {venues.map((v) => (
              <Link key={v.id} href={`/venues/${v.id}`}>
                <div className="border rounded-xl p-4 bg-white hover:shadow-md transition-shadow">
                  <h3 className="font-bold text-lg">{v.name}</h3>
                  <p className="text-sm text-gray-500 mt-1">{v.address}</p>
                  {v.intro && <p className="text-sm text-gray-400 mt-2 line-clamp-2">{v.intro}</p>}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {recruits.length > 0 && (
        <section>
          <h2 className="text-xl font-bold mb-4">进行中的招募</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {recruits.slice(0, 6).map((r) => (
              <div
                key={r.id}
                className="border border-blue-200 bg-blue-50 rounded-xl p-4 cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => router.push(`/recruits/${r.id}`)}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">段位 {String(r.targetLevel)}</p>
                    <p className="text-xs text-gray-500 mt-1">{r.order?.court?.name}</p>
                    <p className="text-xs text-gray-400">{new Date(r.order?.startAt).toLocaleString("zh-CN")}</p>
                  </div>
                  <span className="text-sm text-blue-600 font-medium">
                    {r.participants?.length || 0}/{r.maxParticipants}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
