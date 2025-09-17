"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { ArenaCard } from "./arena-card";
import { ArenaFilters } from "./arena-filters";
import { Button } from "@/app/ui/button/button";
import { Loader } from "@/app/ui/loader";
import { PublicArenaListItem, ArenaFilter } from "@/app/api/arenas/list/route";

interface ArenaListResponse {
  arenas: PublicArenaListItem[];
  page: number;
  limit: number;
  hasMore: boolean;
}

export function ArenaList({ filterType }: { filterType: ArenaFilter }) {
  const [arenas, setArenas] = useState<PublicArenaListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadingRef = useRef<HTMLDivElement>(null);

  const fetchArenas = useCallback(
    async (page: number, ft: ArenaFilter, append = false) => {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams({
          page: page.toString(),
          limit: "10",
          ft: ft,
        });

        const response = await fetch(`/api/arenas/list?${params}`);
        if (!response.ok) {
          throw new Error("Failed to fetch arenas");
        }

        const data: ArenaListResponse = await response.json();

        if (append) {
          setArenas((prev) => [...prev, ...data.arenas]);
        } else {
          setArenas(data.arenas);
        }

        setHasMore(data.hasMore);
        setCurrentPage(data.page);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      fetchArenas(currentPage + 1, filterType, true);
    }
  }, [loading, hasMore, currentPage, filterType, fetchArenas]);

  // Intersection observer for infinite scrolling
  // useEffect(() => {
  //   const observer = new IntersectionObserver(
  //     (entries) => {
  //       if (entries[0]?.isIntersecting && hasMore && !loading) {
  //         loadMore();
  //       }
  //     },
  //     { threshold: 0.1 }
  //   );

  //   if (loadingRef.current) {
  //     observer.observe(loadingRef.current);
  //   }

  //   observerRef.current = observer;

  //   return () => {
  //     if (observerRef.current) {
  //       observerRef.current.disconnect();
  //     }
  //   };
  // }, [loadMore, hasMore, loading]);

  // Initial load
  useEffect(() => {
    setArenas([]);
    setCurrentPage(1);
    setHasMore(true);
    fetchArenas(1, filterType);
  }, [fetchArenas, filterType]);

  return (
    <div className="w-full flex flex-col gap-6">
      <div className="-mx-4">
        <ArenaFilters currentFilter={filterType} />
      </div>

      {error && (
        <div className="text-center text-primary-900/50 p-8">
          <div className="text-primary-900/50 mb-4">{error}</div>
          <Button variant="outline" onClick={() => fetchArenas(1, filterType)}>
            Try again
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {arenas.map((arena) => (
          <ArenaCard key={arena.id} arena={arena} />
        ))}
      </div>

      {loading && (
        <div className="flex justify-center py-[21px]">
          <Loader />
        </div>
      )}

      {hasMore && !loading && !error && (
        <div ref={loadingRef} className="flex justify-center py-4">
          <Button variant="outline" onClick={loadMore}>
            Load More
          </Button>
        </div>
      )}

      {!hasMore && arenas.length > 0 && (
        <div className="text-center text-primary-900/50 p-4">
          No more arenas to load
        </div>
      )}

      {!loading && arenas.length === 0 && !error && (
        <div className="text-center text-primary-900/50 p-8">
          No arenas found for this filter
        </div>
      )}
    </div>
  );
}
