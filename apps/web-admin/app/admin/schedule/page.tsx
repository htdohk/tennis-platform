"use client";

import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────

interface OrderData {
  id: string;
  userId: string;
  courtId: string;
  startAt: string;
  endAt: string;
  status: string;
  type: string;
  totalPrice: string | null;
  paidStatus: string;
  notes: string | null;
  court: { id: string; code: string; name: string; venue: { id: string; name: string } };
  user: { id: string; nickname: string; phone: string; level: string; wechatId: string };
  recruitPost: { id: string; targetLevel: string; maxParticipants: number; deadline: string; status: string } | null;
}

interface CourtData {
  id: string;
  code: string;
  name: string;
  type: string;
  surface: string;
  status: string;
  venueId: string;
}

interface UserData {
  id: string;
  nickname: string;
  phone: string;
}

interface BusinessHours {
  open: string;
  close: string;
}

// ─── Constants ─────────────────────────────────────────

const SLOT_MINUTES = 30;
const DEFAULT_OPEN = "07:00";
const DEFAULT_CLOSE = "22:00";

const STATUS_COLORS: Record<string, string> = {
  PENDING_CONFIRM: "bg-yellow-200 border-yellow-400 hover:bg-yellow-300",
  CONFIRMED: "bg-green-200 border-green-400 hover:bg-green-300",
  RECRUITING: "bg-blue-200 border-blue-400 hover:bg-blue-300",
  COMPLETED: "bg-gray-200 border-gray-400 hover:bg-gray-300",
  CANCELLED: "bg-white border-2 border-red-400 text-gray-400 hover:bg-red-50",
  RECRUITING_EXPIRED: "bg-white border-2 border-red-400 text-gray-400 hover:bg-red-50",
};

const STATUS_LABELS: Record<string, string> = {
  PENDING_CONFIRM: "待确认",
  CONFIRMED: "已确认",
  RECRUITING: "招募中",
  COMPLETED: "已完成",
  CANCELLED: "已取消",
  RECRUITING_EXPIRED: "招募过期",
};

const ACTION_LABELS: Record<string, string> = {
  confirm: "确认订单",
  cancel: "取消订单",
  complete: "完成订单",
  markPaid: "标记已付款",
};

const DAY_NAMES = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

// ─── Helpers ───────────────────────────────────────────

function toTimeKey(date: Date): string {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function parseTimeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function slotIndexToTime(slotIdx: number, businessStartMinutes: number): string {
  const totalMin = businessStartMinutes + slotIdx * SLOT_MINUTES;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function getWeekRange(date: Date): { days: Date[] } {
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(date);
  monday.setDate(diff);
  monday.setHours(0, 0, 0, 0);

  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    days.push(d);
  }
  return { days };
}

function fmtDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// ─── Undoable Action Hook ──────────────────────────────

function useUndoableAction(queryClient: ReturnType<typeof useQueryClient>) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastIdRef = useRef<string | number | null>(null);

  const execute = useCallback(
    (action: "confirm" | "cancel" | "complete" | "markPaid", orderId: string) => {
      // Cancel any previous pending action
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      if (toastIdRef.current !== null) {
        toast.dismiss(toastIdRef.current);
        toastIdRef.current = null;
      }

      let cancelled = false;

      const timer = setTimeout(async () => {
        if (cancelled) return;
        timerRef.current = null;
        toastIdRef.current = null;
        try {
          await api.patch(`/admin/orders/${orderId}/${action === "markPaid" ? "mark-paid" : action}`);
          queryClient.invalidateQueries({ queryKey: ["schedule"] });
          queryClient.invalidateQueries({ queryKey: ["orders"] });
          toast.success(`${ACTION_LABELS[action]}成功`);
        } catch (e) {
          const msg = e instanceof Error ? e.message : "操作失败";
          toast.error(msg);
        }
      }, 10000);

      timerRef.current = timer;

      toastIdRef.current = toast(`即将${ACTION_LABELS[action]}...`, {
        duration: 10000,
        action: {
          label: "撤销",
          onClick: () => {
            cancelled = true;
            clearTimeout(timer);
            timerRef.current = null;
            toastIdRef.current = null;
            toast.info("已撤销操作");
          },
        },
      });
    },
    [queryClient],
  );

  return execute;
}

// ─── Main Component ────────────────────────────────────

export default function SchedulePage() {
  const queryClient = useQueryClient();
  const undo = useUndoableAction(queryClient);
  const searchParams = useSearchParams();
  const router = useRouter();

  const [viewMode, setViewMode] = useState<"week" | "day">("week");
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const d = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("date") : null;
    return d || fmtDate(new Date());
  });

  // Fetch venues for business hours and tabs
  const { data: venuesRes } = useQuery({
    queryKey: ["venues"],
    queryFn: () => api.get<{ data: { id: string; name: string; defaultBusinessHours: Record<string, BusinessHours> | null }[] }>("/admin/venues"),
  });

  const venues = venuesRes?.data || [];
  const [initialVenueSet, setInitialVenueSet] = useState(false);

  // Default to first venue from URL param or first venue in list
  const [selectedVenueId, setSelectedVenueId] = useState<string>("");
  useEffect(() => {
    if (initialVenueSet || venues.length === 0) return;
    const urlVenueId = searchParams.get("venueId");
    if (urlVenueId) {
      setSelectedVenueId(urlVenueId);
    } else if (!selectedVenueId) {
      setSelectedVenueId(venues[0]?.id || "");
    }
    setInitialVenueSet(true);
  }, [venues, searchParams, initialVenueSet, selectedVenueId]);

  // Update URL when venue filter changes
  const handleVenueChange = (venueId: string) => {
    setSelectedVenueId(venueId);
    const params = new URLSearchParams(searchParams.toString());
    params.set("venueId", venueId);
    router.replace(`/admin/schedule?${params.toString()}`, { scroll: false });
  };

  // Calculate business hours
  const selectedVenue = venues.find((v) => v.id === selectedVenueId);
  const venueHours = (selectedVenue || venuesRes?.data?.[0])?.defaultBusinessHours;
  const weekdayHours = venueHours?.weekday;
  const openTime = weekdayHours?.open || DEFAULT_OPEN;
  const closeTime = weekdayHours?.close || DEFAULT_CLOSE;
  const businessStartMin = parseTimeToMinutes(openTime);
  const businessEndMin = parseTimeToMinutes(closeTime);
  const totalSlots = (businessEndMin - businessStartMin) / SLOT_MINUTES;

  // Calculate current week range
  const baseDate = new Date();
  baseDate.setDate(baseDate.getDate() + weekOffset * 7);
  const { days: weekDays } = getWeekRange(baseDate);

  const from = fmtDate(viewMode === "week" ? weekDays[0] : new Date(selectedDate));
  const to = fmtDate(viewMode === "week" ? weekDays[6] : new Date(selectedDate));

  // Data fetching
  const { data: scheduleRes, isLoading } = useQuery({
    queryKey: ["schedule", from, to],
    queryFn: () => api.get<{ data: OrderData[] }>(`/admin/schedule?from=${from}&to=${to}`),
  });

  const { data: courtsRes } = useQuery({
    queryKey: ["courts"],
    queryFn: () => api.get<{ data: CourtData[] }>("/admin/courts"),
  });

  const { data: usersRes } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => api.get<{ data: UserData[] }>("/admin/users"),
  });

  const orders = useMemo(() => {
    const raw = scheduleRes?.data || [];
    return raw.filter((o) => !["CANCELLED", "RECRUITING_EXPIRED"].includes(o.status));
  }, [scheduleRes?.data]);
  const courts = useMemo(() => courtsRes?.data || [], [courtsRes?.data]);
  const users = useMemo(() => usersRes?.data || [], [usersRes?.data]);

  // Dialog state
  const [createOpen, setCreateOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<OrderData | null>(null);
  const [createDefaults, setCreateDefaults] = useState<{
    courtId?: string;
    date?: string;
    startTime?: string;
  }>({});

  // Step 1: filter courts by selected venue
  const displayCourts = useMemo(() => {
    const active = courts.filter((c) => c.status !== "INACTIVE");
    if (!selectedVenueId) return active;
    return active.filter((c) => c.venueId === selectedVenueId);
  }, [courts, selectedVenueId]);

  // Step 2: build court ID set
  const venueCourtIds = useMemo(
    () => new Set(displayCourts.map((c) => c.id)),
    [displayCourts],
  );

  // Step 3: filter orders by venue courts (must come before orderMap)
  const filteredOrders = useMemo(() => {
    if (!selectedVenueId) return orders;
    return orders.filter((o) => venueCourtIds.has(o.courtId));
  }, [orders, selectedVenueId, venueCourtIds]);

  // Step 4: build order map from filtered orders
  const orderMap = useMemo(() => {
    const map = new Map<string, OrderData>();
    for (const order of filteredOrders) {
      const start = new Date(order.startAt);
      const end = new Date(order.endAt);
      const date = fmtDate(start);
      let cursor = new Date(start);
      while (cursor < end) {
        const key = `${order.courtId}::${date}::${toTimeKey(cursor)}`;
        map.set(key, order);
        cursor = new Date(cursor.getTime() + SLOT_MINUTES * 60 * 1000);
      }
    }
    return map;
  }, [filteredOrders]);

  // Handlers
  const handleSlotClick = (courtId: string, date: string, time: string) => {
    setCreateDefaults({ courtId, date, startTime: time });
    setCreateOpen(true);
  };

  const handleOrderClick = (order: OrderData) => {
    setSelectedOrder(order);
    setDetailOpen(true);
  };

  // Safety: default to 0 slots if computation fails
  const safeTotalSlots = totalSlots > 0 ? totalSlots : 30;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold">日程看板</h1>
        <div className="flex items-center gap-2">
          <Button variant={viewMode === "week" ? "default" : "outline"} size="sm" onClick={() => setViewMode("week")}>周视图</Button>
          <Button variant={viewMode === "day" ? "default" : "outline"} size="sm" onClick={() => setViewMode("day")}>日视图</Button>
        </div>
      </div>

      {/* Date Navigation */}
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => viewMode === "week" ? setWeekOffset((w) => w - 1) : setSelectedDate((d) => {
          const nd = new Date(d); nd.setDate(nd.getDate() - 1); return fmtDate(nd);
        })}>←</Button>
        <span className="font-medium min-w-[200px] text-center">
          {viewMode === "week"
            ? `${fmtDate(weekDays[0])} ~ ${fmtDate(weekDays[6])}`
            : selectedDate}
        </span>
        <Button variant="outline" size="sm" onClick={() => viewMode === "week" ? setWeekOffset((w) => w + 1) : setSelectedDate((d) => {
          const nd = new Date(d); nd.setDate(nd.getDate() + 1); return fmtDate(nd);
        })}>→</Button>
        <Button variant="ghost" size="sm" onClick={() => { setWeekOffset(0); setSelectedDate(fmtDate(new Date())); }}>今天</Button>
      </div>

      {/* Venue Tabs */}
      <div className="flex flex-wrap gap-1">
        {venues.map((v) => (
          <button
            key={v.id}
            onClick={() => handleVenueChange(v.id)}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              selectedVenueId === v.id ? "bg-black text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {v.name}
          </button>
        ))}
      </div>

      {/* Schedule Grid */}
      <div className="overflow-auto border rounded-lg bg-white">
        <div className="min-w-[800px]">
          {/* Column Headers */}
          <div className="grid sticky top-0 bg-gray-50 z-10 border-b" style={{
            gridTemplateColumns: `80px repeat(${viewMode === "week" ? 7 : displayCourts.length}, 1fr)`,
          }}>
            <div className="p-2 text-xs text-gray-500 text-center border-r">时间</div>
            {viewMode === "week"
              ? weekDays.map((day) => (
                  <div key={fmtDate(day)} className="p-2 text-xs font-medium text-center border-r">
                    <div>{DAY_NAMES[day.getDay()]}</div>
                    <div className="text-gray-500">{fmtDate(day).slice(5)}</div>
                  </div>
                ))
              : displayCourts.map((court) => (
                  <div key={court.id} className="p-2 text-xs font-medium text-center border-r">
                    <div>{court.code}</div>
                    <div className="text-gray-500 truncate">{court.name}</div>
                  </div>
                ))}
          </div>

          {/* Time Slots */}
          {Array.from({ length: safeTotalSlots }).map((_, slotIdx) => {
            const time = slotIndexToTime(slotIdx, businessStartMin);
            const isHourBoundary = time.endsWith(":00");

            return (
              <div
                key={slotIdx}
                className="grid border-b border-gray-100"
                style={{
                  gridTemplateColumns: `80px repeat(${viewMode === "week" ? 7 : displayCourts.length}, 1fr)`,
                  minHeight: "40px",
                }}
              >
                {/* Time label */}
                <div className={cn(
                  "p-1 text-xs text-gray-400 text-right pr-2 border-r flex items-center justify-end",
                  isHourBoundary && "text-gray-600 font-medium",
                )}>
                  {isHourBoundary ? time : ""}
                </div>

                {/* Grid cells */}
                {viewMode === "week"
                  ? weekDays.map((day) => {
                      const date = fmtDate(day);
                      const order = filteredOrders.find((o) => {
                        const start = new Date(o.startAt);
                        const end = new Date(o.endAt);
                        const slotDate = new Date(`${date}T${time}:00`);
                        return slotDate >= start && slotDate < end;
                      });

                      return (
                        <div
                          key={date}
                          className="border-r border-gray-100 relative cursor-pointer hover:bg-gray-50 transition-colors"
                          onClick={() => {
                            if (order) {
                              handleOrderClick(order);
                            } else {
                              setCreateDefaults({ date, startTime: time });
                              setCreateOpen(true);
                            }
                          }}
                        >
                          {order && time === toTimeKey(new Date(order.startAt)) ? (
                            <OrderBlock order={order} onClick={() => handleOrderClick(order)} />
                          ) : null}
                        </div>
                      );
                    })
                  : displayCourts.map((court) => {
                      const date = selectedDate;
                      const key = `${court.id}::${date}::${time}`;
                      const order = orderMap.get(key);

                      return (
                        <div
                          key={court.id}
                          className={cn(
                            "border-r border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors",
                          )}
                          onClick={() => {
                            if (order) {
                              handleOrderClick(order);
                            } else {
                              handleSlotClick(court.id, date, time);
                            }
                          }}
                        >
                          {order && time === toTimeKey(new Date(order.startAt)) ? (
                            <OrderBlock order={order} onClick={() => handleOrderClick(order)} />
                          ) : null}
                        </div>
                      );
                    })}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-4 flex-wrap text-xs text-gray-500">
        {Object.entries(STATUS_COLORS).filter(([k]) => k !== "RECRUITING_EXPIRED" && k !== "CANCELLED").map(([status, color]) => (
          <div key={status} className="flex items-center gap-1">
            <div className={cn("w-4 h-4 rounded border", color.replace("hover:bg-", "").split(" ")[0], color.replace("hover:bg-", "").split(" ")[1] || "")} />
            {STATUS_LABELS[status]}
          </div>
        ))}
      </div>

      {/* Create Order Dialog */}
      <CreateOrderDialog
        key={JSON.stringify(createDefaults)}
        open={createOpen}
        onOpenChange={setCreateOpen}
        defaults={createDefaults}
        courts={displayCourts}
        users={users}
        businessStartMin={businessStartMin}
        businessEndMin={businessEndMin}
        totalSlots={safeTotalSlots}
      />

      {/* Order Detail Dialog */}
      <OrderDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        order={selectedOrder}
        onConfirm={(id) => { setDetailOpen(false); undo("confirm", id); }}
        onCancel={(id) => { setDetailOpen(false); undo("cancel", id); }}
        onComplete={(id) => { setDetailOpen(false); undo("complete", id); }}
        onMarkPaid={(id) => { setDetailOpen(false); undo("markPaid", id); }}
      />
    </div>
  );
}

// ─── Order Block ───────────────────────────────────────

function OrderBlock({ order, onClick }: { order: OrderData; onClick: () => void }) {
  const start = new Date(order.startAt);
  const end = new Date(order.endAt);
  const durationSlots = (end.getTime() - start.getTime()) / (SLOT_MINUTES * 60 * 1000);

  return (
    <div
      className={cn(
        "absolute inset-0 mx-0.5 my-0.5 rounded border px-1 py-0.5 text-[10px] leading-tight overflow-hidden cursor-pointer z-10",
        STATUS_COLORS[order.status] || STATUS_COLORS.PENDING_CONFIRM,
      )}
      style={{ height: `calc(${durationSlots * 100}% + ${(durationSlots - 1) * 4}px)` }}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
    >
      <div className="font-medium truncate">{order.user?.nickname || order.user?.phone}</div>
      <div className="truncate">{order.court?.code}</div>
      {order.type === "RECRUIT" && <div className="truncate text-blue-600">招募</div>}
    </div>
  );
}

// ─── Create Order Dialog ───────────────────────────────

function CreateOrderDialog({
  open,
  onOpenChange,
  defaults,
  courts,
  users,
  businessStartMin,
  businessEndMin,
  totalSlots,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaults: { courtId?: string; date?: string; startTime?: string };
  courts: CourtData[];
  users: UserData[];
  businessStartMin: number;
  businessEndMin: number;
  totalSlots: number;
}) {
  const queryClient = useQueryClient();
  const [courtId, setCourtId] = useState(defaults.courtId || "");
  const [date, setDate] = useState(defaults.date || "");
  const [startTime, setStartTime] = useState(defaults.startTime || "");
  const [endTime, setEndTime] = useState("");
  const [userId, setUserId] = useState(users[0]?.id || "");
  const [notes, setNotes] = useState("");
  const [userSearch, setUserSearch] = useState("");

  const createMut = useMutation({
    mutationFn: (data: { userId: string; courtId: string; startAt: string; endAt: string; notes?: string }) =>
      api.post("/admin/orders", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schedule"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast.success("订单已创建");
      onOpenChange(false);
    },
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : "创建失败";
      toast.error(msg);
    },
  });

  const handleSubmit = () => {
    if (!courtId || !date || !startTime || !endTime || !userId) {
      toast.error("请填写完整信息");
      return;
    }
    createMut.mutate({
      userId,
      courtId,
      startAt: new Date(`${date}T${startTime}:00`).toISOString(),
      endAt: new Date(`${date}T${endTime}:00`).toISOString(),
      notes: notes || undefined,
    });
  };

  // Filtered users
  const filteredUsers = useMemo(() => {
    if (!userSearch) return users;
    const q = userSearch.toLowerCase();
    return users.filter(
      (u) => u.nickname.toLowerCase().includes(q) || u.phone.includes(q),
    );
  }, [users, userSearch]);

  // Generate end time options
  const endTimeOptions = useMemo(() => {
    if (!startTime) return [];
    const [h, m] = startTime.split(":").map(Number);
    const startMin = h * 60 + m;
    const options: string[] = [];
    for (let i = 1; i <= 8; i++) {
      const endMin = startMin + i * 30;
      const eh = Math.floor(endMin / 60);
      const em = endMin % 60;
      if (endMin <= businessEndMin) {
        options.push(`${String(eh).padStart(2, "0")}:${String(em).padStart(2, "0")}`);
      }
    }
    return options;
  }, [startTime, businessEndMin]);

  // Generate start time options
  const startTimeOptions = useMemo(() => {
    const options: string[] = [];
    for (let i = 0; i < totalSlots; i++) {
      options.push(slotIndexToTime(i, businessStartMin));
    }
    return options;
  }, [totalSlots, businessStartMin]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>新建订单</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>用户</Label>
            <Select value={userId} onValueChange={(v) => setUserId(v || "")}>
              <SelectTrigger className="w-full"><SelectValue placeholder="选择用户" /></SelectTrigger>
              <SelectContent side="bottom" align="start" className="max-h-[280px]">
                <div className="sticky top-0 bg-white z-10 border-b px-2 py-1.5">
                  <Input
                    placeholder="搜索用户..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="h-7 text-xs"
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                  />
                </div>
                {filteredUsers.length === 0 ? (
                  <div className="px-3 py-6 text-center text-xs text-gray-400">无匹配用户</div>
                ) : (
                  filteredUsers.map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.nickname} ({u.phone})</SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>场地</Label>
            <Select value={courtId} onValueChange={(v) => setCourtId(v || "")}>
              <SelectTrigger className="w-full"><SelectValue placeholder="选择场地" /></SelectTrigger>
              <SelectContent className="max-h-[280px]">
                {courts.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.code} - {c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>日期</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>开始时间</Label>
              <Select value={startTime} onValueChange={(v) => setStartTime(v || "")}>
                <SelectTrigger className="w-full"><SelectValue placeholder="开始" /></SelectTrigger>
                <SelectContent className="max-h-[280px]">
                  {startTimeOptions.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>结束时间</Label>
              <Select value={endTime} onValueChange={(v) => setEndTime(v || "")}>
                <SelectTrigger className="w-full"><SelectValue placeholder="结束" /></SelectTrigger>
                <SelectContent className="max-h-[280px]">
                  {endTimeOptions.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>备注</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="可选" />
          </div>
          <Button className="w-full" onClick={handleSubmit} disabled={createMut.isPending}>
            {createMut.isPending ? "创建中..." : "创建订单"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Order Detail Dialog ───────────────────────────────

function OrderDetailDialog({
  open,
  onOpenChange,
  order,
  onConfirm,
  onCancel,
  onComplete,
  onMarkPaid,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: OrderData | null;
  onConfirm: (id: string) => void;
  onCancel: (id: string) => void;
  onComplete: (id: string) => void;
  onMarkPaid: (id: string) => void;
}) {
  if (!order) return null;

  const canConfirm = order.status === "PENDING_CONFIRM" || order.status === "RECRUITING_EXPIRED";
  const canCancel = order.status === "PENDING_CONFIRM" || order.status === "CONFIRMED" || order.status === "RECRUITING";
  const canComplete = order.status === "CONFIRMED";
  const canMarkPaid = order.paidStatus === "UNPAID";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>订单详情</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">订单号</span>
            <span className="font-mono">{order.id.slice(0, 8)}...</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">用户</span>
            <span>{order.user?.nickname} ({order.user?.phone})</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">场地</span>
            <span>{order.court?.code} - {order.court?.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">时间</span>
            <span>{new Date(order.startAt).toLocaleString("zh-CN")} ~ {new Date(order.endAt).toLocaleString("zh-CN")}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">状态</span>
            <span className={cn("px-2 py-0.5 rounded text-xs font-medium", STATUS_COLORS[order.status]?.split(" ")[0])}>
              {STATUS_LABELS[order.status] || order.status}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">类型</span>
            <span>{order.type === "RECRUIT" ? "招募局" : "包场"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">金额</span>
            <span>{order.totalPrice ? `¥${Number(order.totalPrice)}` : "-"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">付款</span>
            <span className={order.paidStatus === "PAID" ? "text-green-600" : "text-yellow-600"}>
              {order.paidStatus === "PAID" ? "已付款" : "未付款"}
            </span>
          </div>
          {order.notes && (
            <div className="flex justify-between">
              <span className="text-gray-500">备注</span>
              <span>{order.notes}</span>
            </div>
          )}
          {order.recruitPost && (
            <div className="flex justify-between">
              <span className="text-gray-500">招募</span>
              <span>目标 {String(order.recruitPost.targetLevel)} | 上限 {order.recruitPost.maxParticipants} 人</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 flex-wrap pt-2">
          {canConfirm && (
            <Button size="sm" variant="default" onClick={() => onConfirm(order.id)}>
              确认
            </Button>
          )}
          {canCancel && (
            <Button size="sm" variant="destructive" onClick={() => onCancel(order.id)}>
              订单取消
            </Button>
          )}
          {canComplete && (
            <Button size="sm" variant="secondary" onClick={() => onComplete(order.id)}>
              订单完成
            </Button>
          )}
          {canMarkPaid && (
            <Button size="sm" variant="outline" onClick={() => onMarkPaid(order.id)}>
              标记已付款
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
