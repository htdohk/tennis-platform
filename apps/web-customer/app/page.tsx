"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const BRAND = process.env.NEXT_PUBLIC_BRAND_NAME || "网球馆";

const ORDER_STATUS_LABELS: Record<string, string> = {
  PENDING_CONFIRM: "待确认",
  CONFIRMED: "已确认",
  COMPLETED: "已完成",
  CANCELLED: "已取消",
  RECRUITING: "招募中",
  RECRUITING_EXPIRED: "招募失效",
};

const ORDER_STATUS_COLORS: Record<string, string> = {
  PENDING_CONFIRM: "bg-yellow-100 text-yellow-800",
  CONFIRMED: "bg-green-100 text-green-800",
};

const RECRUIT_STATUS_COLORS: Record<string, string> = {
  RECRUITING: "bg-blue-100 text-blue-800",
  CONFIRMED: "bg-green-100 text-green-800",
};

export default function HomePage() {
  const router = useRouter();
  const isLoggedIn = typeof window !== "undefined" && !!api.getToken();

  const { data: ordersRes } = useQuery({
    queryKey: ["home-orders"],
    queryFn: () =>
      api.get<{
        data: {
          id: string;
          startAt: string;
          endAt: string;
          status: string;
          court: { name: string };
        }[];
      }>("/api/orders/me"),
    enabled: isLoggedIn,
  });

  const { data: recruitsRes } = useQuery({
    queryKey: ["home-recruits"],
    queryFn: () =>
      api.get<{
        data: {
          id: string;
          status: string;
          minLevel?: number | null;
          maxLevel?: number | null;
          targetLevel: number;
          levelTolerance: number;
          maxParticipants: number;
          order: {
            startAt: string;
            endAt: string;
            court: { name: string };
          };
          participants: { id: string }[];
        }[];
      }>("/api/recruits?myOnly=true"),
    enabled: isLoggedIn,
  });

  const activeOrders = (ordersRes?.data || []).filter((o) =>
    ["PENDING_CONFIRM", "CONFIRMED"].includes(o.status),
  );

  const activeRecruits = (recruitsRes?.data || []).filter((r) =>
    ["RECRUITING", "CONFIRMED"].includes(r.status),
  );

  return (
    <div className="space-y-8">
      <section className="text-center py-12">
        <h1 className="text-3xl font-bold mb-2">{BRAND}</h1>
        <p className="text-gray-500 mb-6">在线预订网球场，轻松找到球友</p>
        <div className="flex gap-3 justify-center flex-wrap">
          <Button size="lg" onClick={() => router.push("/booking")}>
            立即预订
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={() => router.push("/recruits")}
          >
            立即招募
          </Button>
        </div>
      </section>

      {/* 我的生效预订 */}
      <section>
        <h2 className="text-xl font-bold mb-4">我的生效预订</h2>
        {!isLoggedIn ? (
          <Card>
            <CardContent className="p-6 text-center text-gray-400">
              登录后查看
            </CardContent>
          </Card>
        ) : activeOrders.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-gray-400">
              暂无生效预订
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {activeOrders.slice(0, 3).map((o) => (
              <Card
                key={o.id}
                className="cursor-pointer hover:shadow-sm transition-shadow"
                onClick={() => router.push(`/orders/${o.id}`)}
              >
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{o.court?.name}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(o.startAt).toLocaleString("zh-CN")} ~{" "}
                      {new Date(o.endAt).toLocaleTimeString("zh-CN", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "text-xs px-2 py-1 rounded",
                      ORDER_STATUS_COLORS[o.status] ||
                        "bg-gray-100 text-gray-800",
                    )}
                  >
                    {ORDER_STATUS_LABELS[o.status] || o.status}
                  </span>
                </CardContent>
              </Card>
            ))}
            <div className="text-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/booking?tab=mine")}
              >
                查看全部
              </Button>
            </div>
          </div>
        )}
      </section>

      {/* 我的生效招募 */}
      <section>
        <h2 className="text-xl font-bold mb-4">我的生效招募</h2>
        {!isLoggedIn ? (
          <Card>
            <CardContent className="p-6 text-center text-gray-400">
              登录后查看
            </CardContent>
          </Card>
        ) : activeRecruits.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-gray-400">
              暂无生效招募
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {activeRecruits.slice(0, 3).map((r) => {
              const min =
                r.minLevel != null
                  ? Number(r.minLevel)
                  : Number(r.targetLevel) - Number(r.levelTolerance);
              const max =
                r.maxLevel != null
                  ? Number(r.maxLevel)
                  : Number(r.targetLevel) + Number(r.levelTolerance);
              const joined = r.participants?.length || 0;
              return (
                <Card
                  key={r.id}
                  className="cursor-pointer hover:shadow-sm transition-shadow"
                  onClick={() => router.push(`/recruits/${r.id}`)}
                >
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium">
                        {new Date(r.order?.startAt).toLocaleString("zh-CN")} ~{" "}
                        {new Date(r.order?.endAt).toLocaleTimeString("zh-CN", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                      <p className="text-sm text-gray-500">
                        段位要求 {min.toFixed(1)} ~ {max.toFixed(1)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={cn(
                          "text-xs px-2 py-1 rounded",
                          RECRUIT_STATUS_COLORS[r.status] ||
                            "bg-gray-100 text-gray-800",
                        )}
                      >
                        {r.status === "RECRUITING" ? "招募中" : "已确认"}
                      </span>
                      <span className="text-sm text-blue-600 font-medium">
                        {joined}/{r.maxParticipants}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            <div className="text-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/recruits?tab=mine")}
              >
                查看全部
              </Button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
