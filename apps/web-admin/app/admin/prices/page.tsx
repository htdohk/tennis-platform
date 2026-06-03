"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil } from "lucide-react";
import { useState, useCallback } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface PriceRule { id: string; dateType: string; timeSlotType: string; timeStart: string; timeEnd: string; pricePer30min: string; venueId: string }

export default function PricesPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [dialogKey, setDialogKey] = useState(0);
  const [editing, setEditing] = useState<PriceRule | null>(null);
  const [venueFilter, setVenueFilter] = useState("");

  const { data } = useQuery({ queryKey: ["prices"], queryFn: () => api.get<{ data: PriceRule[] }>("/admin/prices") });
  const { data: venues } = useQuery({ queryKey: ["venues"], queryFn: () => api.get<{ data: { id: string; name: string }[] }>("/admin/venues") });

  const form = useForm({ resolver: zodResolver(z.object({ venueId: z.string().min(1), dateType: z.string(), timeSlotType: z.string(), timeStart: z.string().regex(/^\d{2}:\d{2}$/), timeEnd: z.string().regex(/^\d{2}:\d{2}$/), pricePer30min: z.string().min(1) })), defaultValues: { venueId: "", dateType: "WEEKDAY", timeSlotType: "MORNING", timeStart: "", timeEnd: "", pricePer30min: "" } });

  const createMut = useMutation({ mutationFn: (d: unknown) => api.post("/admin/prices", d), onSuccess: () => { qc.invalidateQueries({ queryKey: ["prices"] }); setOpen(false); form.reset(); toast.success("创建成功"); }, onError: (e: Error) => toast.error(e.message) });

  const updateMut = useMutation({
    mutationFn: ({ id, d }: { id: string; d: Record<string, unknown> }) => api.patch(`/admin/prices/${id}`, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["prices"] }); setOpen(false); setEditing(null); form.reset(); toast.success("更新成功"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const prices = (data?.data || []).filter((p) => {
    if (!venueFilter) return true;
    return p.venueId === venueFilter;
  });

  const getVenueName = (venueId: string) => (venues?.data || []).find((v) => v.id === venueId)?.name || "";

  const onSubmit = (d: Record<string, unknown>) => {
    if (editing) updateMut.mutate({ id: editing.id, d });
    else createMut.mutate(d);
  };

  const openEdit = (p: PriceRule) => {
    setEditing(p);
    form.reset({ venueId: p.venueId, dateType: p.dateType, timeSlotType: p.timeSlotType, timeStart: p.timeStart, timeEnd: p.timeEnd, pricePer30min: String(p.pricePer30min) });
    setDialogKey((k) => k + 1);
    setOpen(true);
  };

  const handleOpenChange = useCallback((v: boolean) => {
    setOpen(v);
    if (v) setDialogKey((k) => k + 1);
    if (!v) { setEditing(null); form.reset(); }
  }, [form]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">价格管理</h1>
        <Dialog key={dialogKey} open={open} onOpenChange={handleOpenChange}>
          <DialogTrigger><Button><Plus className="h-4 w-4 mr-1" />新增价格规则</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing ? "编辑价格规则" : "新增价格规则"}</DialogTitle></DialogHeader>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div><Label>场馆</Label>
                <Select defaultValue={editing?.venueId || ""} onValueChange={(v) => { if (v) form.setValue("venueId", v); }}>
                  <SelectTrigger><SelectValue placeholder="选择场馆" /></SelectTrigger>
                  <SelectContent>{(venues?.data || []).map((v) => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>日期类型</Label>
                  <Select defaultValue={editing?.dateType || "WEEKDAY"} onValueChange={(v) => { if (v) form.setValue("dateType", v); }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="WEEKDAY">工作日</SelectItem><SelectItem value="WEEKEND">周末</SelectItem><SelectItem value="HOLIDAY">节假日</SelectItem></SelectContent>
                  </Select>
                </div>
                <div><Label>时段类型</Label>
                  <Select defaultValue={editing?.timeSlotType || "MORNING"} onValueChange={(v) => { if (v) form.setValue("timeSlotType", v); }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="MORNING">早场</SelectItem><SelectItem value="DAY">日场</SelectItem><SelectItem value="EVENING">晚场</SelectItem></SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div><Label>开始</Label><Input placeholder="07:00" {...form.register("timeStart")} /></div>
                <div><Label>结束</Label><Input placeholder="12:00" {...form.register("timeEnd")} /></div>
                <div><Label>价格/30min</Label><Input placeholder="30" {...form.register("pricePer30min")} /></div>
              </div>
              <Button type="submit" className="w-full" disabled={createMut.isPending || updateMut.isPending}>
                {editing ? "保存" : "创建"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Venue Filter */}
      <div className="flex items-center gap-2">
        <Label className="text-sm whitespace-nowrap">场馆筛选：</Label>
        <Select value={venueFilter} onValueChange={(v) => setVenueFilter(v && v !== "all" ? v : "")}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="全部场馆" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部场馆</SelectItem>
            {(venues?.data || []).map((v) => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Table>
        <TableHeader><TableRow><TableHead>场馆</TableHead><TableHead>日期类型</TableHead><TableHead>时段</TableHead><TableHead>时间</TableHead><TableHead>价格/30min</TableHead><TableHead>操作</TableHead></TableRow></TableHeader>
        <TableBody>
          {prices.map((p) => (
            <TableRow key={p.id}>
              <TableCell className="text-gray-500">{getVenueName(p.venueId)}</TableCell>
              <TableCell>{p.dateType === "WEEKDAY" ? "工作日" : p.dateType === "WEEKEND" ? "周末" : "节假日"}</TableCell>
              <TableCell>{p.timeSlotType === "MORNING" ? "早场" : p.timeSlotType === "DAY" ? "日场" : "晚场"}</TableCell>
              <TableCell>{p.timeStart} - {p.timeEnd}</TableCell>
              <TableCell className="font-mono">&yen;{p.pricePer30min}</TableCell>
              <TableCell>
                <Button variant="outline" size="sm" onClick={() => openEdit(p)}>
                  <Pencil className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
