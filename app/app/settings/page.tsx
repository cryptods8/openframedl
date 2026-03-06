import { redirect } from "next/navigation";

export default function SettingsPage() {
  redirect("/app/profile?tab=settings");
}
