import { Link } from "@tanstack/react-router";

export default function AuthorLink({ id, name }: { id: string; name: string }) {
  return (
    <Link
      className="author-link"
      to="/gallery/user/$userId"
      params={{ userId: id }}
    >
      {name}
    </Link>
  );
}
