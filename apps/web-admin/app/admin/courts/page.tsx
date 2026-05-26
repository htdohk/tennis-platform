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
import { Plus, Wrench } from "lucide-react";
import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface Court { id: string; code: string; name: string; type: string; surface: string; status: string; venueId: string }

export default function CourtsPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [maintOpen, setMaintOpen] = useState(false);
  const [maintCourtId, setMaintCourtId] = useState("");

  const { data } = useQuery({ queryKey: ["courts"], queryFn: () => api.get<{ data: Court[] }>("/admin/courts") });
  const { data: venues } = useQuery({ queryKey: ["venues"], queryFn: () => api.get<{ data: { id: string; name: string }[] }>("/admin/venues") });

  const form = useForm({ resolver: zodResolver(z.object({ venueId: z.string().min(1), code: z.string().min(1), name: z.string().min(1), type: z.string(), surface: z.string() })), defaultValues: { venueId: "", code: "", name: "", type: "INDOOR", surface: "HARD" } });
  const maintForm = useForm({ resolver: zodResolver(z.object({ startAt: z.string().min(1), endAt: z.string().min(1), reason: z.string().optional() })), defaultValues: { startAt: "", endAt: "", reason: "" } });

  const createMut = useMutation({ mutationFn: (d: unknown) => api.post("/admin/courts", d), onSuccess: () => { qc.invalidateQueries({ queryKey: ["courts"] }); setOpen(false); form.reset(); toast.success("创建成功"); }, onError: (e: Error) => toast.error(e.message) });
  const maintMut = useMutation({ mutationFn: ({ id, d }: { id: string; d: unknown }) => api.post(`/admin/courts/${id}/maintenance`, d), onSuccess: () => { qc.invalidateQueries({ queryKey: ["courts"] }); setMaintOpen(false); toast.success("维护期已添加"); }, onError: (e: Error) => toast.error(e.message) });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">场地管理</h1>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) form.reset(); }}>
          <DialogTrigger><Button><Plus className="h-4 w-4 mr-1" />新增场地</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>新增场地</DialogTitle></DialogHeader>
            <form onSubmit={form.handleSubmit((d) => createMut.mutate(d))} className="space-y-4">
              <div><Label>场馆</Label>
                <Select onValueChange={(v: string | null) => { form.setValue("venueId", v || ""); }}>
                  <SelectTrigger><SelectValue placeholder="选择场馆" /></SelectTrigger>
                  <SelectContent>{(venues?.data || []).map((v) => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>编号</Label><Input {...form.register("code")} /></div>
                <div><Label>名称</Label><Input {...form.register("name")} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>类型</Label>
                  <Select onValueChange={(v: string | null) => { form.setValue("type", v || ""); }}>
                    <SelectTrigger><SelectValue placeholder="选择" /></SelectTrigger>
                    <SelectContent><SelectItem value="INDOOR">室内</SelectItem><SelectItem value="OUTDOOR">室外</SelectItem></SelectContent>
                  </Select>
                </div>
                <div><Label>地面</Label>
                  <Select onValueChange={(v: string | null) => { form.setValue("surface", v || ""); }}>
                    <SelectTrigger><SelectValue placeholder="选择" /></SelectTrigger>
                    <SelectContent><SelectItem value="HARD">硬地</SelectItem><SelectItem value="CLAY">红土</SelectItem><SelectItem value="SYNTHETIC">塑胶</SelectItem></SelectContent>
                  </Select>
                </div>
              </div>
              <Button type="submit" className="w-full">创建</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Table>
        <TableHeader><TableRow><TableHead>编号</TableHead><TableHead>名称</TableHead><TableHead>类型</TableHead><TableHead>地面</TableHead><TableHead>状态</TableHead><TableHead>操作</TableHead></TableRow></TableHeader>
        <TableBody>
          {(data?.data || []).map((c) => (
            <TableRow key={c.id}>
              <TableCell>{c.code}</TableCell>
              <TableCell className="font-medium">{c.name}</TableCell>
              <TableCell>{c.type === "INDOOR" ? "室内" : "室外"}</TableCell>
              <TableCell>{c.surface}</TableCell>
              <TableCell>{c.status}</TableCell>
              <TableCell>
                <Button variant="outline" size="sm" onClick={() => { setMaintCourtId(c.id); setMaintOpen(true); }}>
                  <Wrench className="h-4 w-4 mr-1" />维护
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

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
    </div>
  );
}
