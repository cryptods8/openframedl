import { NextServerPageProps } from "frames.js/next/types";
import { gameService } from "../../../game/game-service";
import { GameIdentityProvider } from "../../../game/game-repository";
import { ProfileHeader } from "./profile-header";
import { TabGroup, TabPanel, TabList, Tab, TabPanels } from "@headlessui/react";
import { GamesGrid } from "../../../ui/gallery/games-grid";
import { GameType } from "../../../game/game-pg-repository";
import { ProfileGalleryFilter } from "./profile-gallery-filter";
import { GameStats } from "./game-stats";
import { CustomGames } from "./custom-games";

function TabButton({ children }: React.PropsWithChildren<{}>) {
  return (
    <Tab className="rounded-full min-w-28 font-semibold text-primary-900/60 px-5 py-3 data-[selected]:bg-primary-800 data-[selected]:text-white data-[hover]:bg-primary-800 data-[hover]:text-white transition duration-150 ease-in-out">
      {children}
    </Tab>
  );
}

function determineSelectedTabIndex(tab?: string) {
  switch (tab) {
    case "stats":
      return 1;
    case "words":
      return 2;
    default:
      return 0;
  }
}

export default async function ProfilePage(props: NextServerPageProps) {
  const { params, searchParams } = props;

  const userKey = {
    identityProvider: params.ip as GameIdentityProvider,
    userId: params.uid as string,
  };
  const [games, userData, stats] = await Promise.all([
    gameService.loadAllPublic({
      ...userKey,
      completedOnly: true,
      type: searchParams?.gt as GameType | undefined,
    }),
    gameService.loadUserData(userKey),
    gameService.loadStats(userKey),
  ]);
  const sortedGames = games
    .sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1))
    .map((game, index) => ({ game: { ...game, userData }, number: index + 1 }));

  // const selectedTabIndex = determineSelectedTabIndex(
  //   searchParams?.tab as string | undefined
  // );
  // const handleSelectedTabChange = (index: number) => {
  // const newParams = new URLSearchParams(searchParams || {});
  // switch (index) {
  //   case 1:
  //     newParams.set("tab", "stats");
  //     break;
  //   case 2:
  //     newParams.set("tab", "words");
  //     break;
  //   default:
  //     newParams.delete("tab");
  //     break;
  // }
  // props.router.push({ search: newParams.toString() });
  // };
  return (
    <div className="w-full h-full bg-primary-100 text-left flex-1 text-primary-900">
      <div className="max-w-xs md:max-w-screen-sm lg:max-w-screen-lg xl:max-w-screen-xl mx-auto px-2">
        <ProfileHeader
          ip={userKey.identityProvider}
          uid={userKey.userId}
          userData={userData}
        />
      </div>
      <div>
        <TabGroup
        // selectedIndex={selectedTabIndex}
        // onChange={handleSelectedTabChange}
        >
          <TabList className="border-t border-b border-primary-200 py-4 mt-6 mb-4">
            <div className="max-w-xs md:max-w-screen-sm lg:max-w-screen-lg xl:max-w-screen-xl mx-auto flex-1 flex gap-x-3 px-2">
              <TabButton>Games</TabButton>
              <TabButton>Stats</TabButton>
              {/* <TabButton>My words</TabButton> */}
            </div>
          </TabList>
          <TabPanels className="max-w-xs md:max-w-screen-sm lg:max-w-screen-lg xl:max-w-screen-xl mx-auto">
            <TabPanel className="flex flex-col gap-3">
              <div className="py-2">
                <ProfileGalleryFilter />
              </div>
              <GamesGrid games={sortedGames} context="PROFILE" />
            </TabPanel>
            <TabPanel>
              {stats ? (
                <GameStats stats={stats} />
              ) : (
                <div className="p-8 text-2xl font-semibold text-primary-900/30 text-center">
                  No stats available
                </div>
              )}
            </TabPanel>
            {/* <TabPanel>
              <CustomGames userKey={userKey} />
            </TabPanel> */}
          </TabPanels>
        </TabGroup>
      </div>
    </div>
  );
}
