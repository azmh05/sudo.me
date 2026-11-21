import { cn } from "@/lib/utils";

// Profile picture, or the first letter of your name when there's no picture.
export function Avatar({ photoId, name, className }: { photoId: number | null; name: string; className?: string }) {
  if (photoId) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={`/api/profile-photo/${photoId}`} alt="" className={cn("shrink-0 rounded-full object-cover", className)} />;
  }
  return (
    <div className={cn("grid shrink-0 place-items-center rounded-full bg-subtle font-semibold", className)}>
      {(name || "?").charAt(0).toUpperCase()}
    </div>
  );
}
