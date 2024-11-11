import { ArenaCreateForm } from "./arena-create-form";

export default async function Page() {
  return (
    <div className="w-full p-4 h-full">
      <div>
        <h1 className="font-space font-bold text-xl">Framedl ⚔️ ARENA</h1>
        <div className="text-primary-900/50 text-sm">Create an arena</div>
      </div>
      <ArenaCreateForm />
    </div>
  );
}
