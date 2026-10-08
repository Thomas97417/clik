import { cn } from "@/lib/utils";
import { defaultAvatar, type AvatarDescriptor } from "@clik/avatars";
import BrickAvatar from "@/components/ui/brick-avatar";
import { Link } from "@tanstack/react-router";

export default function AuthorLink({
  id,
  name,
  avatar,
  showAvatar = true,
  className,
}: {
  id: string;
  name: string;
  avatar?: AvatarDescriptor;
  showAvatar?: boolean;
  className?: string;
}) {
  return (
    <Link
      className={cn(
        "[transition:background_0.15s,color_0.15s,box-shadow_0.15s] focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[#356ae6] outline-offset-3 author-link group/author-link gap-1.5 inline-flex items-center max-w-full align-middle text-inherit font-semibold wrap-anywhere hover:text-[#356ae6] hover:underline hover:underline-offset-3",
        className,
      )}
      to="/gallery/user/$userId"
      params={{ userId: id }}
    >
      {showAvatar && (
        <BrickAvatar avatar={avatar ?? defaultAvatar(id)} size={24} />
      )}
      <span className="min-w-0">{name}</span>
    </Link>
  );
}
