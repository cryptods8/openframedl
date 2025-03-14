"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { GamesGrid } from "@/app/ui/gallery/games-grid";
import { GameFilter } from "@/app/game/game-pg-repository";
import { ProfileGalleryFilter } from "./profile-gallery-filter";
import { UserData } from "@/app/game/game-repository";
import { PublicGuessedGame } from "../game/game-service";
import { Loader } from "../ui/loader";
import { Button } from "../ui/button/button";

interface ProfileGalleryProps {
  isCurrentUser: boolean;
  filter: GameFilter;
  userData: UserData | null;
}

export function ProfileGallery(props: ProfileGalleryProps) {
  const { filter, userData } = props;
  const [games, setGames] = useState<PublicGuessedGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);

  const ITEMS_PER_PAGE = 24; // Adjust based on your API's pagination

  // const lastGameElementRef = useCallback(
  //   (node: HTMLDivElement | null) => {
  //     if (loading) return;
  //     if (observer.current) observer.current.disconnect();

  //     observer.current = new IntersectionObserver((entries) => {
  //       if (entries[0]?.isIntersecting && hasMore) {
  //         setOffset((prevOffset) => prevOffset + ITEMS_PER_PAGE);
  //       }
  //     });

  //     if (node) observer.current.observe(node);
  //   },
  //   [loading, hasMore]
  // );

  const handleLoadMore = () => {
    setOffset((prevOffset) => prevOffset + ITEMS_PER_PAGE);
  };

  useEffect(() => {
    // Reset state when filter changes
    setGames([]);
    setOffset(0);
    setHasMore(true);
  }, [filter]);

  useEffect(() => {
    const fetchGames = async () => {
      setLoading(true);

      try {
        const searchParams = new URLSearchParams();
        for (const [key, value] of Object.entries(filter)) {
          if (value) {
            searchParams.set(key, value.toString());
          }
        }

        // Add pagination parameters
        searchParams.set("offset", offset.toString());
        searchParams.set("limit", ITEMS_PER_PAGE.toString());

        const response = await fetch(
          `/api/games/public?${searchParams.toString()}`
        );

        if (!response.ok) {
          throw new Error("Failed to fetch games");
        }

        const { data } = await response.json();

        setGames((prevGames) => {
          return offset === 0 ? data.items : [...prevGames, ...data.items];
        });

        // Check if we've reached the end
        setHasMore(data.items.length === ITEMS_PER_PAGE);
      } catch (error) {
        console.error("Error fetching games:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchGames();
  }, [filter, offset]);

  const sortedGames = games
    // .sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1))
    .map((game, index) => ({ game: { ...game, userData }, number: index + 1 }));

  return (
    <div className="flex flex-col gap-3">
      <div className="p-2">
        <ProfileGalleryFilter />
      </div>
      <GamesGrid games={sortedGames} context="PROFILE" />
      {loading && (
        <div className="flex justify-center p-[1.3125rem]">
          <Loader />
        </div>
      )}
      {!loading && games.length === 0 && (
        <div className="text-center text-primary-900/60 p-8">
          No games found
        </div>
      )}
      {games.length > 0 && hasMore && !loading && (
        <div className="flex justify-center p-4">
          <Button variant="outline" onClick={handleLoadMore}>
            Load more
          </Button>
        </div>
      )}
    </div>
  );
}
