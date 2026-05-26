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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pencil, Ban, CheckCircle } from "lucide-react";
import { useState } from "react";

interface User { id: string; phone: string; nickname: string; level: string; wechatId: string; role: string; status: string; createdAt: string }

const updateSchema = z.object({
  nickname: z.string().optional(),
  level: z.string().optional(),
  wechatId: z.string().optional(),
  status: z.string().optional(),
});

export default function UsersPage() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<User | null>(null);
  const [open, setOpen] = useState(false);

  const { data } = useQuery({ queryKey: ["admin-users"], queryFn: () => api.get<{ data: User[] }>("/admin/users") });

  const form = useForm({ resolver: zodResolver(updateSchema) });

  const updateMut = useMutation({
    mutationFn: ({ id, d }: { id: string; d: Record<string, unknown> }) => api.patch(`/admin/users/${id}`, d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-users"] }); setOpen(false); toast.success("更新成功"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const onSubmit = (d: Record<string, unknown>) => {
    if (!editing) return;
    const clean: Record<string, unknown> = {};
    if (d.nickname) clean.nickname = d.nickname;
    if (d.level) clean.level = d.level;
    if (d.wechatId) clean.wechatId = d.wechatId;
    if (d.status) clean.status = d.status;
    updateMut.mutate({ id: editing.id, d: clean });
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">用户管理</h1>

      <Table>
        <TableHeader>
          <TableRow><TableHead>昵称</TableHead><TableHead>手机号</TableHead><TableHead>段位</TableHead><TableHead>微信号</TableHead><TableHead>角色</TableHead><TableHead>状态</TableHead><TableHead>操作</TableHead></TableRow>
        </TableHeader>
        <TableBody>
          {(data?.data || []).map((u) => (
            <TableRow key={u.id}>
              <TableCell className="font-medium">{u.nickname}</TableCell>
              <TableCell>{u.phone}</TableCell>
              <TableCell>{u.level}</TableCell>
              <TableCell className="text-gray-500">{u.wechatId}</TableCell>
              <TableCell>{u.role === "BOSS" ? "老板" : u.role === "STAFF" ? "员工" : "用户"}</TableCell>
              <TableCell>
                <span className={u.status === "ACTIVE" ? "text-green-600" : "text-red-600"}>
                  {u.status === "ACTIVE" ? "正常" : "封禁"}
                </span>
              </TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => { setEditing(u); form.reset({ nickname: u.nickname, level: String(u.level), wechatId: u.wechatId, status: u.status }); setOpen(true); }}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm"
                    onClick={() => updateMut.mutate({ id: u.id, d: { status: u.status === "ACTIVE" ? "BANNED" : "ACTIVE" } })}>
                    {u.status === "ACTIVE" ? <Ban className="h-4 w-4 text-red-500" /> : <CheckCircle className="h-4 w-4 text-green-500" />}
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>编辑用户</DialogTitle></DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div><Label>昵称</Label><Input {...form.register("nickname")} /></div>
            <div><Label>段位</Label><Input placeholder="3.0" {...form.register("level")} /></div>
            <div><Label>微信号</Label><Input {...form.register("wechatId")} /></div>
            <Button type="submit" className="w-full">保存</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
