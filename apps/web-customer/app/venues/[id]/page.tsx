"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import Link from "next/link";

export default function VenueDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data: venueRes, isLoading } = useQuery({
    queryKey: ["venue", id],
    queryFn: () => api.get<{ data: { id: string; name: string; address: string; intro: string | null; contact: string | null } }>(`/api/venues/${id}`),
  });

  const venue = venueRes?.data;

  if (isLoading) return <div className="text-center py-12 text-gray-500">加载中...</div>;
  if (!venue) return <div className="text-center py-12 text-gray-500">场馆不存在</div>;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <Link href="/" className="text-sm text-gray-400 hover:text-gray-600">← 返回</Link>
      </div>
      <h1 className="text-2xl font-bold">{venue.name}</h1>
      <p className="text-gray-500">{venue.address}</p>
      {venue.intro && <p className="text-gray-600 leading-relaxed">{venue.intro}</p>}
      {venue.contact && <p className="text-sm text-gray-400">联系方式: {venue.contact}</p>}
      <Link href={`/booking?venueId=${venue.id}`} className="inline-block bg-black text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-800 transition-colors">
        立即预订
      </Link>
    </div>
  );
}
