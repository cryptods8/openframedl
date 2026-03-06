import { redirect } from "next/navigation";

export default function StreakFreezesPage() {
  redirect("/app/profile?tab=freezes");
}
