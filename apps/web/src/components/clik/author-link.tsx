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
      className="author-link"
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
