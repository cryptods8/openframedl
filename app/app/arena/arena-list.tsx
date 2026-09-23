"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { ArenaCard } from "./arena-card";
import { ArenaFilters } from "./arena-filters";
import { Button } from "@/app/ui/button/button";
import { Loader } from "@/app/ui/loader";
import { FloatingActionButton } from "@/app/ui/floating-action-button";
import { useBottomOffset } from "@/app/ui/bottom-nav";
import { PublicArenaListItem, ArenaFilter } from "@/app/api/arenas/list/route";
import { formatDurationSimple } from "@/app/game/game-utils";

interface ArenaListResponse {
  arenas: PublicArenaListItem[];
  page: number;
  limit: number;
  hasMore: boolean;
}

export function ArenaList({
  filterType,
  initialInProgressCount,
}: {
  filterType: ArenaFilter;
  initialInProgressCount?: number;
}) {
  const [arenas, setArenas] = useState<PublicArenaListItem[]>([]);
  const [activeArena, setActiveArena] = useState<PublicArenaListItem | null>(
    null,
  );
  const [inProgressCount, setInProgressCount] = useState<number | undefined>(
    initialInProgressCount,
  );
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadingRef = useRef<HTMLDivElement>(null);
  const bottomOffset = useBottomOffset();

  useEffect(() => {
    if (filterType === "in_progress") {
      setActiveArena(null);
      return;
    }
    let cancelled = false;
    fetch("/api/arenas/list?ft=in_progress&limit=1")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data?.arenas?.length > 0) {
          setActiveArena(data.arenas[0]);
        } else if (!cancelled) {
          setActiveArena(null);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [filterType]);

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
    <>
      <div className="w-full flex flex-col gap-6" style={{ paddingBottom: bottomOffset + 80 }}>
        {activeArena && filterType !== "in_progress" && (
          <div className="bg-amber-50 border border-amber-200/90 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-full bg-amber-400/20 text-amber-800 flex items-center justify-center shrink-0 font-bold text-base">
                ⚔️
              </div>
              <div>
                <div className="text-sm font-semibold text-amber-950 flex items-center gap-2">
                  <span>Match in progress: Arena #{activeArena.id}</span>
                  {activeArena.endsAt && (
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-200/80 text-amber-900">
                      ends in{" "}
                      {formatDurationSimple(
                        Math.max(
                          1,
                          Math.floor(
                            (new Date(activeArena.endsAt).getTime() -
                              Date.now()) /
                              1000 /
                              60,
                          ),
                        ),
                      )}
                    </span>
                  )}
                </div>
                <div className="text-xs text-amber-900/70">
                  {(activeArena.userCompletedCount ?? 0) > 0
                    ? `Word ${(activeArena.userCompletedCount ?? 0) + 1} of ${activeArena.config.wordCount}`
                    : `Word 1 of ${activeArena.config.wordCount} (Joined)`}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <Button
                variant="outline"
                size="sm"
                href="?ft=in_progress"
                className="text-amber-900 border-amber-300 hover:bg-amber-100"
              >
                View In Progress
              </Button>
              <Button
                variant="primary"
                size="sm"
                href={`/app/arena/${activeArena.id}/play`}
              >
                {(activeArena.userGameCount ?? 0) > 0 ||
                (activeArena.userCompletedCount ?? 0) > 0
                  ? "Continue"
                  : "Play"}
              </Button>
            </div>
          </div>
        )}

        <div className="-mx-4">
          <ArenaFilters
            currentFilter={filterType}
            inProgressCount={inProgressCount}
          />
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
          <div className="text-center text-primary-900/50 p-8 flex flex-col items-center gap-3">
            <div className="text-3xl">🎯</div>
            <div className="font-medium text-primary-900">
              {filterType === "in_progress"
                ? "No arenas in progress"
                : "No arenas found for this filter"}
            </div>
            <div className="text-sm text-primary-900/60 max-w-xs">
              {filterType === "in_progress"
                ? "You're all caught up! Browse playable arenas to start a new match."
                : ""}
            </div>
            {filterType === "in_progress" && (
              <Button variant="outline" size="sm" href="?ft=playable">
                Browse Playable Arenas
              </Button>
            )}
          </div>
        )}
      </div>
      
      <FloatingActionButton href="/app/arena/create" />
    </>
  );
}
