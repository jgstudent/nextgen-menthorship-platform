import type { User } from "@/types/domain";

export function Avatar({ user, size = "md" }: { user?: Pick<User, "firstName" | "lastName" | "avatarUrl">; size?: "sm" | "md" }) {
  const dimensions = size === "sm" ? "h-7 w-7 text-xs" : "h-9 w-9 text-sm";
  const initials = user ? `${user.firstName[0] ?? ""}${user.lastName[0] ?? ""}` : "?";
  const label = user ? `${user.firstName} ${user.lastName}` : "User profile";

  if (user?.avatarUrl) {
    return (
      <span className={`${dimensions} inline-flex overflow-hidden rounded-full ring-2 ring-white dark:ring-[#0B1220]`}>
        <img src={user.avatarUrl} alt={label} className="h-full w-full object-cover" />
      </span>
    );
  }

  return (
    <span aria-label={label} className={`${dimensions} inline-flex items-center justify-center rounded-full bg-[#DBEAFE] font-semibold text-[#1D4ED8] ring-2 ring-white dark:bg-blue-950/50 dark:text-blue-200 dark:ring-[#0B1220]`}>
      {initials}
    </span>
  );
}
