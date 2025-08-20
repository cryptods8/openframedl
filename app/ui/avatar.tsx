export function Avatar({
  avatar,
  username,
}: {
  avatar?: string | null;
  username?: string | null;
}) {
  return avatar ? (
    <img src={avatar} className="w-8 h-8 rounded-full object-cover" alt={username ?? "avatar"} />
  ) : (
    <div className="w-8 h-8 rounded-full bg-primary-900/5 text-primary-900/50 font-bold text-2xl flex items-center justify-center">
      {username?.[0]}
    </div>
  );
}
