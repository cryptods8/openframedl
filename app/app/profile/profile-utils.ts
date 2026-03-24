export function getCurrentTab(tab: string | null, showBadges: boolean, isPro: boolean) {
  const tabs: string[] = [];
  if (!isPro && showBadges) {
    tabs.push("badges");
  }
  if (!isPro) {
    tabs.push("freezes");
  }
  tabs.push("games");
  tabs.push("stats");
  tabs.push("settings");

  if (tab && tabs.includes(tab)) {
    return tab;
  }
  return tabs[0];
}
