"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface CourtData { id: string; code: string; name: string; type: string; surface: string; venueId: string; }
interface SlotData { time: string; available: boolean; reason?: string; }

const DRAFT_KEY = "booking_draft";

function loadDraft(): { venueId?: string; courtId?: string; date?: string; slots?: string[] } {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(sessionStorage.getItem(DRAFT_KEY) || "{}"); } catch { return {}; }
}

function saveDraft(draft: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
}

// Get all time strings between start and end (inclusive of start, exclusive of end)
function fillSlotRange(start: string, end: string, allSlots: string[]): string[] {
  const startIdx = allSlots.indexOf(start);
  const endIdx = allSlots.indexOf(end);
  if (startIdx === -1 || endIdx === -1) return [start];
  const [lo, hi] = startIdx <= endIdx ? [startIdx, endIdx] : [endIdx, startIdx];
  return allSlots.slice(lo, hi + 1);
}

function BookingPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const venueIdParam = searchParams.get("venueId");
  const draft = loadDraft();

  const [selectedVenueId, setVenueId] = useState(draft.venueId || venueIdParam || "");
  const [selectedCourtId, setCourtId] = useState(draft.courtId || "");
  const [selectedDate, setDate] = useState(draft.date || "");
  const [selectedSlots, setSlots] = useState<string[]>(draft.slots || []);
  const [notes, setNotes] = useState("");

  const isLoggedIn = typeof window !== "undefined" && !!api.getToken();

  // Persist to sessionStorage
  useEffect(() => {
    if (selectedVenueId || selectedCourtId || selectedDate || selectedSlots.length > 0) {
      saveDraft({
        venueId: selectedVenueId || undefined,
        courtId: selectedCourtId || undefined,
        date: selectedDate || undefined,
        slots: selectedSlots.length > 0 ? selectedSlots : undefined,
      });
    }
  }, [selectedVenueId, selectedCourtId, selectedDate, selectedSlots]);

  // Fetch venues
  const { data: venuesRes } = useQuery({
    queryKey: ["venues"],
    queryFn: () => api.get<{ data: { id: string; name: string }[] }>("/api/venues"),
  });
  const venues = venuesRes?.data || [];

  // Fetch courts
  const { data: courtsRes } = useQuery({
    queryKey: ["courts", selectedVenueId],
    queryFn: () => api.get<{ data: CourtData[] }>(`/api/venues/${selectedVenueId}/courts`),
    enabled: !!selectedVenueId,
  });
  const courts = courtsRes?.data || [];

  // Fetch availability
  const { data: availabilityRes, isLoading: availLoading } = useQuery({
    queryKey: ["availability", selectedCourtId, selectedDate],
    queryFn: () => api.get<{ data: SlotData[] }>(`/api/courts/${selectedCourtId}/availability?date=${selectedDate}`),
    enabled: !!selectedCourtId && !!selectedDate,
  });
  const slots = availabilityRes?.data || [];

  // Available slot time strings
  const slotTimes = slots.map((s) => s.time);

  // Create order
  const createMut = useMutation({
    mutationFn: (data: { courtId: string; startAt: string; endAt: string; notes?: string }) =>
      api.post<{ code: number; data: { id: string } }>("/api/orders", data),
    onSuccess: (res) => {
      sessionStorage.removeItem(DRAFT_KEY);
      toast.success("订单已创建");
      router.push(`/orders/${res.data.id}`);
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "创建失败"),
  });

  const handleSlotClick = (time: string) => {
    if (selectedSlots.length === 0) {
      // First click: select single slot
      setSlots([time]);
    } else if (selectedSlots.includes(time)) {
      // Click already selected: deselect all
      setSlots([]);
    } else {
      // Click a different slot: fill range from first selected to this one
      const anchor = selectedSlots.sort()[0];
      const range = fillSlotRange(anchor, time, slotTimes);
      setSlots(range);
    }
  };

  const handleSubmit = () => {
    if (!selectedCourtId || !selectedDate || selectedSlots.length === 0) {
      toast.error("请选择场地、日期和时段"); return;
    }
    if (!isLoggedIn) {
      saveDraft({ venueId: selectedVenueId, courtId: selectedCourtId, date: selectedDate, slots: selectedSlots });
      router.push(`/login?redirect=/booking`);
      return;
    }
    const sorted = [...selectedSlots].sort();
    const startTime = sorted[0];
    const lastTime = sorted[sorted.length - 1];
    const selectedStart = new Date(`${selectedDate}T${startTime}:00`);
    if (selectedStart <= new Date()) {
      toast.error("不能预订过去的时段，请重新选择"); return;
    }
    const [h, m] = lastTime.split(":").map(Number);
    const endMin = h * 60 + m + 30;
    const endTime = `${String(Math.floor(endMin / 60)).padStart(2, "0")}:${String(endMin % 60).padStart(2, "0")}`;

    createMut.mutate({
      courtId: selectedCourtId,
      startAt: new Date(`${selectedDate}T${startTime}:00`).toISOString(),
      endAt: new Date(`${selectedDate}T${endTime}:00`).toISOString(),
      notes: notes || undefined,
    });
  };

  const selectedVenueName = venues.find((v) => v.id === selectedVenueId)?.name;
  const selectedCourt = courts.find((c) => c.id === selectedCourtId);
  const selectedCourtName = selectedCourt ? `${selectedCourt.code} - ${selectedCourt.name}` : undefined;
  const sortedSelected = [...selectedSlots].sort();
  const startTime = sortedSelected[0];
  const duration = selectedSlots.length * 0.5;
  const endTime = sortedSelected.length > 0
    ? (() => { const lt = sortedSelected[sortedSelected.length - 1]; const [h, m] = lt.split(":").map(Number); const em = h * 60 + m + 30; return `${String(Math.floor(em / 60)).padStart(2, "0")}:${String(em % 60).padStart(2, "0")}`; })()
    : "";

  // Past slot check
  const todayStr = new Date().toISOString().split("T")[0];
  const isSlotInPast = (time: string) => {
    if (selectedDate !== todayStr) return false;
    const now = new Date();
    return new Date(`${selectedDate}T${time}:00`) <= new Date(now.getTime() + 30 * 60 * 1000);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-24">
      <h1 className="text-2xl font-bold">预订场地</h1>

      <Card>
        <CardContent className="p-4 space-y-3">
          <Label>选择场馆</Label>
          <Select value={selectedVenueId} onValueChange={(v) => { setVenueId(v || ""); setCourtId(""); }}>
            <SelectTrigger className="w-full"><SelectValue placeholder="请选择场馆">{selectedVenueName}</SelectValue></SelectTrigger>
            <SelectContent className="max-h-[280px]">
              {venues.map((v) => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedVenueId && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <Label>选择场地</Label>
            <Select value={selectedCourtId} onValueChange={(v) => setCourtId(v || "")}>
              <SelectTrigger className="w-full"><SelectValue placeholder="请选择场地">{selectedCourtName}</SelectValue></SelectTrigger>
              <SelectContent className="max-h-[280px]">
                {courts.map((c) => <SelectItem key={c.id} value={c.id}>{c.code} - {c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      )}

      {selectedCourtId && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <Label>选择日期</Label>
            <Input type="date" value={selectedDate} min={todayStr} onChange={(e) => { setDate(e.target.value); setSlots([]); }} />
          </CardContent>
        </Card>
      )}

      {selectedDate && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <Label>选择时段（点击开始格子，再点结束格子选择连续时段）</Label>
            {availLoading ? (
              <div className="text-center py-4 text-gray-400">加载中...</div>
            ) : slots.length === 0 ? (
              <div className="text-center py-4 text-gray-400">该日期暂无可用时段</div>
            ) : (
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                {slots.map((slot) => {
                  const isSelected = selectedSlots.includes(slot.time);
                  const inPast = isSlotInPast(slot.time);
                  const disabled = !slot.available || inPast;
                  return (
                    <button
                      key={slot.time}
                      type="button"
                      disabled={disabled}
                      onClick={() => handleSlotClick(slot.time)}
                      className={cn(
                        "py-2 px-1 text-xs rounded border text-center transition-colors",
                        isSelected && "bg-green-600 text-white border-green-600",
                        !isSelected && !disabled && "bg-white border-gray-200 hover:border-gray-400 cursor-pointer",
                        disabled && "bg-gray-100 text-gray-300 border-gray-100 cursor-not-allowed",
                      )}
                    >
                      {slot.time}
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {selectedSlots.length > 0 && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">已选时段</span>
              <span className="font-medium">{startTime} ~ {endTime}（{duration} 小时）</span>
            </div>
            <div>
              <Label>备注</Label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="如有特殊需求请备注（可选）" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sticky bottom submit bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 z-30">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">
          <div className="text-sm">
            {selectedSlots.length > 0 ? (
              <span>
                <span className="text-gray-500">已选 </span>
                <span className="font-medium">{duration} 小时</span>
                <span className="text-gray-400 ml-2">{startTime} ~ {endTime}</span>
              </span>
            ) : (
              <span className="text-gray-400">请先选择时段</span>
            )}
          </div>
          <Button
            onClick={handleSubmit}
            disabled={selectedSlots.length === 0 || createMut.isPending}
            className="min-w-[140px]"
          >
            {createMut.isPending ? "提交中..." : isLoggedIn ? "提交订单" : "登录后提交"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function BookingPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64 text-gray-500">加载中...</div>}>
      <BookingPageInner />
    </Suspense>
  );
}
