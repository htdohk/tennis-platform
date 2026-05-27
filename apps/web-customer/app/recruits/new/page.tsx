"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface MatchData {
  recruitPostId: string;
  courtName: string;
  nickname: string;
  level: number;
  wechatId: string;
  targetLevel: number;
  levelTolerance: number;
  startAt: string;
  endAt: string;
  participantCount: number;
  maxParticipants: number;
  score: number;
}

const DRAFT_KEY = "recruit_draft";

function loadDraft() {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(sessionStorage.getItem(DRAFT_KEY) || "{}"); } catch { return {}; }
}

function saveDraft(data: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(DRAFT_KEY, JSON.stringify(data));
}

export default function NewRecruitPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const isLoggedIn = typeof window !== "undefined" && !!api.getToken();

  const draft = loadDraft();

  // Form state
  const [venueId, setVenueId] = useState(draft.venueId || "");
  const [courtId, setCourtId] = useState(draft.courtId || "");
  const [date, setDate] = useState(draft.date || "");
  const [selectedSlots, setSelectedSlots] = useState<string[]>(draft.startSlot ? [draft.startSlot as string] : []);
  const [targetLevel, setTargetLevel] = useState(3.0);
  const [levelTolerance, setLevelTolerance] = useState(0.5);
  const [maxParticipants, setMaxParticipants] = useState(2);
  const [deadlineDate, setDeadlineDate] = useState(draft.deadlineDate || "");
  const [deadlineHour, setDeadlineHour] = useState("23");
  const [deadlineMinute, setDeadlineMinute] = useState("00");
  const [notes, setNotes] = useState(draft.notes || "");
  const [currentLevel, setCurrentLevel] = useState(0);

  // Get current user level for match filtering
  useEffect(() => {
    if (!isLoggedIn) return;
    api.get<{ data: { level: string } }>("/api/auth/me").then((res) => {
      if (res.data) setCurrentLevel(Number(res.data.level));
    }).catch(() => {});
  }, [isLoggedIn]);

  // Matching dialog
  const [matches, setMatches] = useState<MatchData[]>([]);
  const [showMatches, setShowMatches] = useState(false);
  const [matchingLoading, setMatchingLoading] = useState(false);
  const [joinTargetId, setJoinTargetId] = useState<string | null>(null);

  // Persist draft
  const persist = () => {
    saveDraft({
      venueId: venueId || undefined,
      courtId: courtId || undefined,
      date: date || undefined,
      startSlot: selectedSlots.length > 0 ? selectedSlots.sort()[0] : undefined,
      maxParticipants,
      deadlineDate: deadlineDate || undefined,
      notes: notes || undefined,
    });
  };

  useEffect(() => { persist(); }, [venueId, courtId, date, selectedSlots, maxParticipants, deadlineDate, notes]);

  // Data fetching
  const { data: venuesRes } = useQuery({
    queryKey: ["venues"],
    queryFn: () => api.get<{ data: { id: string; name: string }[] }>("/api/venues"),
  });
  const venues = venuesRes?.data || [];
  const selectedVenueName = venues.find((v) => v.id === venueId)?.name;

  const { data: courtsRes } = useQuery({
    queryKey: ["courts", venueId],
    queryFn: () => api.get<{ data: { id: string; code: string; name: string }[] }>(`/api/venues/${venueId}/courts`),
    enabled: !!venueId,
  });
  const courts = courtsRes?.data || [];
  const selectedCourtName = courts.find((c) => c.id === courtId)
    ? `${courts.find((c) => c.id === courtId)?.code} - ${courts.find((c) => c.id === courtId)?.name}`
    : undefined;

  const { data: slotsRes } = useQuery({
    queryKey: ["availability", courtId, date],
    queryFn: () => api.get<{ data: { time: string; available: boolean }[] }>(`/api/courts/${courtId}/availability?date=${date}`),
    enabled: !!courtId && !!date,
  });
  const slots = slotsRes?.data || [];
  const slotTimes = slots.map((s) => s.time);

  const todayStr = new Date().toISOString().split("T")[0];
  const isSlotInPast = (time: string) => {
    if (date !== todayStr) return false;
    const now = new Date();
    return new Date(`${date}T${time}:00`) <= new Date(now.getTime() + 30 * 60 * 1000);
  };

  // Create recruit
  const createMut = useMutation({
    mutationFn: (data: { courtId: string; startAt: string; endAt: string; targetLevel: number; levelTolerance: number; maxParticipants: number; deadline: string; notes?: string }) =>
      api.post<{ code: number; data: { id: string } }>("/api/recruits", data),
    onSuccess: (res) => {
      sessionStorage.removeItem(DRAFT_KEY);
      queryClient.invalidateQueries({ queryKey: ["recruits"] });
      toast.success("招募已发布");
      router.push(`/recruits/${res.data.id}`);
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "发布失败"),
  });

  const joinMut = useMutation({
    mutationFn: (recruitId: string) => api.post(`/api/recruits/${recruitId}/join`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recruits"] });
      toast.success("已加入");
      setShowMatches(false);
      router.push(`/recruits/${joinTargetId}`);
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "加入失败"),
  });

  const handleSlotClick = (time: string) => {
    if (selectedSlots.length === 0) {
      setSelectedSlots([time]);
    } else if (selectedSlots.includes(time)) {
      setSelectedSlots([]);
    } else {
      const anchor = selectedSlots.sort()[0];
      const aIdx = slotTimes.indexOf(anchor);
      const tIdx = slotTimes.indexOf(time);
      if (aIdx === -1 || tIdx === -1) return;
      const [lo, hi] = aIdx <= tIdx ? [aIdx, tIdx] : [tIdx, aIdx];
      setSelectedSlots(slotTimes.slice(lo, hi + 1));
    }
  };

  const handleNext = async () => {
    if (!courtId || !date || selectedSlots.length === 0) {
      toast.error("请填写完整信息"); return;
    }
    if (!deadlineDate) {
      toast.error("请填写截止时间"); return;
    }
    const deadlineDt = new Date(`${deadlineDate}T${deadlineHour}:${deadlineMinute}:00`);
    if (deadlineDt <= new Date()) {
      toast.error("截止时间必须晚于当前时间"); return;
    }
    if (!isLoggedIn) {
      persist();
      router.push("/login?redirect=/recruits/new");
      return;
    }

    const sorted = [...selectedSlots].sort();
    const startTime = sorted[0];
    const lastTime = sorted[sorted.length - 1];
    const recruitStart = new Date(`${date}T${startTime}:00`);
    if (recruitStart <= new Date()) {
      toast.error("不能选择过去的时段"); return;
    }
    if (deadlineDt >= recruitStart) {
      toast.error("截止时间必须早于招募开始时间"); return;
    }
    const [lh, lm] = lastTime.split(":").map(Number);
    const endMin = lh * 60 + lm + 30;
    const endTime = `${String(Math.floor(endMin / 60)).padStart(2, "0")}:${String(endMin % 60).padStart(2, "0")}`;

    setMatchingLoading(true);
    try {
      const res = await api.post<{ code: number; data: MatchData[] }>("/api/recruits/preview-matches", {
        date, startAt: new Date(`${date}T${startTime}:00`).toISOString(),
        endAt: new Date(`${date}T${endTime}:00`).toISOString(),
        level: targetLevel, tolerance: levelTolerance,
      });
      const matchList = res.data || [];
      // Filter: only show matches where current user's level fits the match's requirements
      const validMatches = currentLevel
        ? matchList.filter((m) => {
            const lo = Number(m.targetLevel) - Number(m.levelTolerance);
            const hi = Number(m.targetLevel) + Number(m.levelTolerance);
            return currentLevel >= lo && currentLevel <= hi;
          })
        : matchList;

      if (validMatches.length > 0) {
        setMatches(validMatches);
        setShowMatches(true);
      } else {
        doCreate(startTime, endTime);
      }
    } catch {
      toast.error("查询匹配失败，请重试");
    }
    setMatchingLoading(false);
  };

  const doCreate = (startTime: string, endTime: string) => {
    createMut.mutate({
      courtId, startAt: new Date(`${date}T${startTime}:00`).toISOString(),
      endAt: new Date(`${date}T${endTime}:00`).toISOString(),
      targetLevel, levelTolerance, maxParticipants,
      deadline: new Date(`${deadlineDate}T${deadlineHour}:${deadlineMinute}:00`).toISOString(),
      notes: notes || undefined,
    });
  };

  const handleJoinMatch = (recruitPostId: string) => {
    setJoinTargetId(recruitPostId);
    joinMut.mutate(recruitPostId);
  };

  const handlePublishAnyway = () => {
    setShowMatches(false);
    const sorted = [...selectedSlots].sort();
    const startTime = sorted[0];
    const lastTime = sorted[sorted.length - 1];
    const [lh, lm] = lastTime.split(":").map(Number);
    const endMin = lh * 60 + lm + 30;
    const endTime = `${String(Math.floor(endMin / 60)).padStart(2, "0")}:${String(endMin % 60).padStart(2, "0")}`;
    doCreate(startTime, endTime);
  };

  const copyWechat = (wx: string) => {
    navigator.clipboard.writeText(wx);
    toast.success("已复制微信号");
  };

  const sortedSlots = [...selectedSlots].sort();
  const firstSlot = sortedSlots[0];
  const lastSlot = sortedSlots.length > 0
    ? (() => { const [h, m] = sortedSlots[sortedSlots.length - 1].split(":").map(Number); const em = h * 60 + m + 30; return `${String(Math.floor(em / 60)).padStart(2, "0")}:${String(em % 60).padStart(2, "0")}`; })()
    : "";

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => router.push("/recruits")} className="text-sm text-gray-400 hover:text-gray-600">← 返回</button>
        <h1 className="text-2xl font-bold">发起招募</h1>
      </div>

      <Card><CardContent className="p-4 space-y-3">
        <h3 className="font-medium text-sm text-gray-500">选择场地和时间</h3>
        <div>
          <Label>场馆</Label>
          <Select value={venueId} onValueChange={(v) => { setVenueId(v || ""); setCourtId(""); }}>
            <SelectTrigger className="w-full"><SelectValue placeholder="选择场馆">{selectedVenueName}</SelectValue></SelectTrigger>
            <SelectContent className="max-h-[280px]">{venues.map((v) => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        {venueId && (
          <div>
            <Label>场地</Label>
            <Select value={courtId} onValueChange={(v) => setCourtId(v || "")}>
              <SelectTrigger className="w-full"><SelectValue placeholder="选择场地">{selectedCourtName}</SelectValue></SelectTrigger>
              <SelectContent className="max-h-[280px]">{courts.map((c) => <SelectItem key={c.id} value={c.id}>{c.code} - {c.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        )}
        {courtId && (
          <div>
            <Label>日期</Label>
            <Input type="date" value={date} min={todayStr} onChange={(e) => { setDate(e.target.value); setSelectedSlots([]); }} />
          </div>
        )}
        {date && slots.length > 0 && (
          <div>
            <Label>时段（点击起点，再点终点选择连续时段）</Label>
            <div className="grid grid-cols-6 gap-1.5 mt-1">
              {slots.map((s) => {
                const inPast = isSlotInPast(s.time);
                const disabled = !s.available || inPast;
                return (
                <button key={s.time} type="button" disabled={disabled} onClick={() => handleSlotClick(s.time)}
                  className={cn("py-1.5 text-xs rounded border text-center transition-colors",
                    selectedSlots.includes(s.time) && "bg-green-600 text-white border-green-600",
                    !selectedSlots.includes(s.time) && !disabled && "bg-white border-gray-200 hover:border-gray-400 cursor-pointer",
                    disabled && "bg-gray-100 text-gray-300 border-gray-100 cursor-not-allowed",
                  )}>{s.time}</button>
                );
              })}
            </div>
          </div>
        )}
        {selectedSlots.length > 0 && (
          <p className="text-sm text-gray-600">已选: {firstSlot} ~ {lastSlot} ({selectedSlots.length * 0.5} 小时)</p>
        )}
      </CardContent></Card>

      {selectedSlots.length > 0 && (
        <Card><CardContent className="p-4 space-y-3">
          <h3 className="font-medium text-sm text-gray-500">招募设置</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>目标段位</Label>
              <Select value={String(targetLevel)} onValueChange={(v) => setTargetLevel(parseFloat(v || "3.0"))}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-[280px]">
                  {[1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0].map((v) => <SelectItem key={v} value={String(v)}>{v.toFixed(1)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>浮动范围</Label>
              <Select value={String(levelTolerance)} onValueChange={(v) => setLevelTolerance(parseFloat(v || "0.5"))}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-[280px]">
                  {[0, 0.5, 1.0, 1.5, 2.0].map((v) => <SelectItem key={v} value={String(v)}>± {v.toFixed(1)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>招募人数</Label>
            <Select value={String(maxParticipants)} onValueChange={(v) => setMaxParticipants(parseInt(v || "1"))}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent className="max-h-[280px]">
                {[1, 2, 3, 4, 5, 6, 7].map((n) => <SelectItem key={n} value={String(n)}>还需招募 {n} 人</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label>截止日期</Label>
              <Input type="date" value={deadlineDate} min={todayStr} onChange={(e) => setDeadlineDate(e.target.value)} />
            </div>
            <div>
              <Label>时</Label>
              <Select value={deadlineHour} onValueChange={(v) => setDeadlineHour(v || "00")}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-[280px]">
                  {Array.from({ length: 24 }).map((_, i) => <SelectItem key={i} value={String(i).padStart(2, "0")}>{String(i).padStart(2, "0")}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>分</Label>
              <Select value={deadlineMinute} onValueChange={(v) => setDeadlineMinute(v || "00")}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-[280px]">
                  {["00", "15", "30", "45"].map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>备注（可选）</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="如：自带球拍、双打等" />
          </div>
          <Button className="w-full" onClick={handleNext} disabled={matchingLoading || createMut.isPending}>
            {matchingLoading ? "查询匹配中..." : createMut.isPending ? "发布中..." : "下一步"}
          </Button>
        </CardContent></Card>
      )}

      <Dialog open={showMatches} onOpenChange={setShowMatches}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>找到 {matches.length} 个匹配的招募</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-500">以下招募与你的时间和段位匹配，可以选择加入或仍然自己发布。</p>
          <div className="space-y-3">
            {matches.map((m) => (
              <div key={m.recruitPostId} className="border rounded-lg p-3 space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="font-medium">{m.nickname}</span>
                  <span className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">段位 {m.level}</span>
                </div>
                <div className="text-gray-600">{m.courtName} · {new Date(m.startAt).toLocaleString("zh-CN")} ~ {new Date(m.endAt).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}</div>
                <div className="text-gray-500">要求 {String(m.targetLevel)} ± {String(m.levelTolerance)}</div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-xs">
                    <span className="text-gray-400">微信号: {m.wechatId}</span>
                    <Button variant="ghost" size="sm" className="h-5 text-xs px-1 text-blue-600" onClick={() => copyWechat(m.wechatId)}>复制</Button>
                  </div>
                  <span className="text-blue-600 font-medium">{m.participantCount}/{m.maxParticipants}</span>
                </div>
                <div className="flex gap-2 pt-1">
                  <Button size="sm" onClick={() => handleJoinMatch(m.recruitPostId)} disabled={joinMut.isPending}>
                    {joinMut.isPending && joinTargetId === m.recruitPostId ? "加入中..." : "加入这个招募"}
                  </Button>
                  <Button size="sm" variant="outline" onClick={handlePublishAnyway}>仍然自己发布</Button>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
