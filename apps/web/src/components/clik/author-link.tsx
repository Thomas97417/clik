import { cn } from "@/lib/utils";
import { defaultAvatar, type AvatarDescriptor } from "@clik/avatars";
import BrickAvatar from "@/components/ui/brick-avatar";
import { Link } from "@tanstack/react-router";

export default function AuthorLink({
  id,
  name,
  avatar,
  showAvatar = true,
}: {
  id: string;
  name: string;
  avatar?: AvatarDescriptor;
  showAvatar?: boolean;
}) {
  return (
    <Link
      className={cn(
        "author-link group/author-link gap-[6px] inline-flex items-center max-w-[100%] [vertical-align:middle] text-[color:inherit] font-[600] [overflow-wrap:anywhere] [&:hover]:text-[color:#356ae6] [&:hover]:[text-decoration:underline] [&:hover]:underline-offset-[3px] [&_>_span]:min-w-[0]",
      )}
      to="/gallery/user/$userId"
      params={{ userId: id }}
    >
      {showAvatar && (
        <BrickAvatar avatar={avatar ?? defaultAvatar(id)} size={24} />
      )}
      <span>{name}</span>
    </Link>
  );
}
