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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Pencil } from "lucide-react";
import { useState } from "react";

const venueSchema = z.object({
  name: z.string().min(1, "名称不能为空"),
  address: z.string().min(1, "地址不能为空"),
  intro: z.string().optional(),
  contact: z.string().optional(),
});

type VenueFormData = z.infer<typeof venueSchema>;

interface Venue { id: string; name: string; address: string; intro?: string; contact?: string }

export default function VenuesPage() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Venue | null>(null);
  const [open, setOpen] = useState(false);

  const { data } = useQuery({ queryKey: ["venues"], queryFn: () => api.get<{ data: Venue[] }>("/admin/venues") });

  const form = useForm<VenueFormData>({ resolver: zodResolver(venueSchema) });

  const createMut = useMutation({
    mutationFn: (d: VenueFormData) => api.post("/admin/venues", d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["venues"] }); setOpen(false); form.reset(); toast.success("创建成功"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, d }: { id: string; d: Partial<VenueFormData> }) => api.patch(`/admin/venues/${id}`, d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["venues"] }); setEditing(null); setOpen(false); toast.success("更新成功"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const onSubmit = (d: VenueFormData) => {
    if (editing) updateMut.mutate({ id: editing.id, d });
    else createMut.mutate(d);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">场馆管理</h1>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditing(null); form.reset(); } }}>
          <DialogTrigger >
            <Button><Plus className="h-4 w-4 mr-1" />新增场馆</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing ? "编辑场馆" : "新增场馆"}</DialogTitle></DialogHeader>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div><Label>名称</Label><Input {...form.register("name")} /><p className="text-red-500 text-sm">{form.formState.errors.name?.message}</p></div>
              <div><Label>地址</Label><Input {...form.register("address")} /><p className="text-red-500 text-sm">{form.formState.errors.address?.message}</p></div>
              <div><Label>介绍</Label><Input {...form.register("intro")} /></div>
              <div><Label>联系方式</Label><Input {...form.register("contact")} /></div>
              <Button type="submit" className="w-full" disabled={createMut.isPending || updateMut.isPending}>
                {editing ? "保存" : "创建"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {(data?.data || []).map((v) => (
          <Card key={v.id}>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>{v.name}</CardTitle>
                <p className="text-sm text-gray-500">{v.address}</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => { setEditing(v); form.reset(v); setOpen(true); }}>
                <Pencil className="h-4 w-4" />
              </Button>
            </CardHeader>
            {(v.intro || v.contact) && (
              <CardContent className="text-sm text-gray-600">
                {v.intro && <p>{v.intro}</p>}
                {v.contact && <p>联系方式: {v.contact}</p>}
              </CardContent>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
