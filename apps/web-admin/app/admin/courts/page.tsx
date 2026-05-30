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
import { Plus, Wrench, Trash2, Pencil } from "lucide-react";
import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface Court { id: string; code: string; name: string; type: string; surface: string; status: string; venueId: string }

const SURFACE_MAP: Record<string, string> = { HARD: "硬地", CLAY: "红土", GRASS: "草地", SYNTHETIC: "人工草地" };
const TYPE_MAP: Record<string, string> = { INDOOR: "室内", OUTDOOR: "室外" };

export default function CourtsPage() {
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<Court | null>(null);
  const [maintOpen, setMaintOpen] = useState(false);
  const [maintCourtId, setMaintCourtId] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteCourt, setDeleteCourt] = useState<Court | null>(null);
  const [venueFilter, setVenueFilter] = useState("");

  const { data } = useQuery({ queryKey: ["courts"], queryFn: () => api.get<{ data: Court[] }>("/admin/courts") });
  const { data: venues } = useQuery({ queryKey: ["venues"], queryFn: () => api.get<{ data: { id: string; name: string }[] }>("/admin/venues") });

  const createForm = useForm({ resolver: zodResolver(z.object({ venueId: z.string().min(1), code: z.string().min(1), name: z.string().min(1), type: z.string(), surface: z.string() })), defaultValues: { venueId: "", code: "", name: "", type: "INDOOR", surface: "HARD" } });
  const editForm = useForm({ resolver: zodResolver(z.object({ code: z.string().min(1), name: z.string().min(1), type: z.string(), surface: z.string(), status: z.string() })) });
  const maintForm = useForm({ resolver: zodResolver(z.object({ startAt: z.string().min(1), endAt: z.string().min(1), reason: z.string().optional() })), defaultValues: { startAt: "", endAt: "", reason: "" } });

  const createMut = useMutation({ mutationFn: (d: unknown) => api.post("/admin/courts", d), onSuccess: () => { qc.invalidateQueries({ queryKey: ["courts"] }); setCreateOpen(false); createForm.reset(); toast.success("创建成功"); }, onError: (e: Error) => toast.error(e.message) });
  const editMut = useMutation({ mutationFn: ({ id, d }: { id: string; d: Record<string, unknown> }) => api.patch(`/admin/courts/${id}`, d), onSuccess: () => { qc.invalidateQueries({ queryKey: ["courts"] }); setEditOpen(false); setEditing(null); toast.success("更新成功"); }, onError: (e: Error) => toast.error(e.message) });
  const maintMut = useMutation({ mutationFn: ({ id, d }: { id: string; d: unknown }) => api.post(`/admin/courts/${id}/maintenance`, d), onSuccess: () => { qc.invalidateQueries({ queryKey: ["courts"] }); setMaintOpen(false); toast.success("维护期已添加"); }, onError: (e: Error) => toast.error(e.message) });
  const deleteMut = useMutation({
    mutationFn: (id: string) => api.fetch(`/admin/courts/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["courts"] }); setDeleteOpen(false); setDeleteCourt(null); toast.success("场地已删除"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const courts = (data?.data || []).filter((c) => {
    if (!venueFilter) return true;
    return c.venueId === venueFilter;
  });

  const getVenueName = (venueId: string) => (venues?.data || []).find((v) => v.id === venueId)?.name || "";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">场地管理</h1>
        <Dialog open={createOpen} onOpenChange={(v) => { setCreateOpen(v); if (!v) createForm.reset(); }}>
          <DialogTrigger><Button><Plus className="h-4 w-4 mr-1" />新增场地</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>新增场地</DialogTitle></DialogHeader>
            <form onSubmit={createForm.handleSubmit((d) => createMut.mutate(d))} className="space-y-4">
              <div><Label>场馆</Label>
                <Select onValueChange={(v: string | null) => { if (v) createForm.setValue("venueId", v); }}>
                  <SelectTrigger><SelectValue placeholder="选择场馆" /></SelectTrigger>
                  <SelectContent>{(venues?.data || []).map((v) => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>编号</Label><Input {...createForm.register("code")} /></div>
                <div><Label>名称</Label><Input {...createForm.register("name")} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>类型</Label>
                  <Select onValueChange={(v: string | null) => { if (v) createForm.setValue("type", v); }}>
                    <SelectTrigger><SelectValue placeholder="选择" /></SelectTrigger>
                    <SelectContent><SelectItem value="INDOOR">室内</SelectItem><SelectItem value="OUTDOOR">室外</SelectItem></SelectContent>
                  </Select>
                </div>
                <div><Label>地面</Label>
                  <Select onValueChange={(v: string | null) => { if (v) createForm.setValue("surface", v); }}>
                    <SelectTrigger><SelectValue placeholder="选择" /></SelectTrigger>
                    <SelectContent><SelectItem value="HARD">硬地</SelectItem><SelectItem value="CLAY">红土</SelectItem><SelectItem value="SYNTHETIC">人工草地</SelectItem></SelectContent>
                  </Select>
                </div>
              </div>
              <Button type="submit" className="w-full">创建</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Venue Filter */}
      <div className="flex items-center gap-2">
        <Label className="text-sm whitespace-nowrap">场馆筛选：</Label>
        <Select value={venueFilter || "all"} onValueChange={(v) => setVenueFilter(v && v !== "all" ? v : "")}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="全部场馆" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部场馆</SelectItem>
            {(venues?.data || []).map((v) => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Table>
        <TableHeader><TableRow><TableHead>编号</TableHead><TableHead>名称</TableHead><TableHead>场馆</TableHead><TableHead>类型</TableHead><TableHead>地面</TableHead><TableHead>状态</TableHead><TableHead>操作</TableHead></TableRow></TableHeader>
        <TableBody>
          {courts.map((c) => (
            <TableRow key={c.id}>
              <TableCell>{c.code}</TableCell>
              <TableCell className="font-medium">{c.name}</TableCell>
              <TableCell className="text-gray-500">{getVenueName(c.venueId)}</TableCell>
              <TableCell>{TYPE_MAP[c.type] || c.type}</TableCell>
              <TableCell>{SURFACE_MAP[c.surface] || c.surface}</TableCell>
              <TableCell>{c.status === "AVAILABLE" ? "可用" : c.status === "INACTIVE" ? "已停用" : c.status}</TableCell>
              <TableCell>
                <div className="flex gap-1">
                  <Button variant="outline" size="sm" onClick={() => { setEditing(c); editForm.reset({ code: c.code, name: c.name, type: c.type, surface: c.surface, status: c.status }); setEditOpen(true); }}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => { setMaintCourtId(c.id); setMaintOpen(true); }}>
                    <Wrench className="h-4 w-4 mr-1" />维护
                  </Button>
                  {c.status !== "INACTIVE" && (
                    <Button variant="outline" size="sm" className="text-red-500 hover:text-red-700" onClick={() => { setDeleteCourt(c); setDeleteOpen(true); }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={(v) => { setEditOpen(v); if (!v) setEditing(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>编辑场地</DialogTitle></DialogHeader>
          <form onSubmit={editForm.handleSubmit((d) => editing && editMut.mutate({ id: editing.id, d }))} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>编号</Label><Input {...editForm.register("code")} /></div>
              <div><Label>名称</Label><Input {...editForm.register("name")} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>类型</Label>
                <Select value={editForm.watch("type")} onValueChange={(v) => { if (v) editForm.setValue("type", v); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="INDOOR">室内</SelectItem><SelectItem value="OUTDOOR">室外</SelectItem></SelectContent>
                </Select>
              </div>
              <div><Label>地面</Label>
                <Select value={editForm.watch("surface")} onValueChange={(v) => { if (v) editForm.setValue("surface", v); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="HARD">硬地</SelectItem><SelectItem value="CLAY">红土</SelectItem><SelectItem value="SYNTHETIC">人工草地</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>状态</Label>
              <Select value={editForm.watch("status")} onValueChange={(v) => { if (v) editForm.setValue("status", v); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="AVAILABLE">可用</SelectItem><SelectItem value="INACTIVE">已停用</SelectItem></SelectContent>
              </Select>
            </div>
            <Button type="submit" className="w-full" disabled={editMut.isPending}>保存</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Maintenance Dialog */}
      <Dialog open={maintOpen} onOpenChange={setMaintOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>添加维护期</DialogTitle></DialogHeader>
          <form onSubmit={maintForm.handleSubmit((d) => maintMut.mutate({ id: maintCourtId, d }))} className="space-y-4">
            <div><Label>开始时间</Label><Input type="datetime-local" {...maintForm.register("startAt")} /></div>
            <div><Label>结束时间</Label><Input type="datetime-local" {...maintForm.register("endAt")} /></div>
            <div><Label>原因</Label><Input {...maintForm.register("reason")} /></div>
            <Button type="submit" className="w-full">添加</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>确认删除</DialogTitle></DialogHeader>
          <p className="text-gray-600">确认删除「{deleteCourt?.name}」？此操作不可恢复。</p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>取消</Button>
            <Button variant="destructive" onClick={() => deleteCourt && deleteMut.mutate(deleteCourt.id)}>确认删除</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
