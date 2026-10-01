import BrickAvatar from "./ui/brick-avatar";
import { defaultAvatar } from "@clik/avatars";
import { useNavigate } from "@tanstack/react-router";
import { useCurrentUser } from "@/hooks/use-current-user";
import { ChevronDown } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { authClient } from "@/lib/auth-client";

import { Button } from "./ui/button";

export default function UserMenu() {
  const user = useCurrentUser();
  const navigate = useNavigate();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={user?.name ? `Compte de ${user.name}` : "Mon compte"}
        render={<Button variant="outline" className="header-user-trigger" />}
      >
        <span className="header-avatar" aria-hidden="true">
          {user && (
            <BrickAvatar avatar={user.avatar ?? defaultAvatar(user._id)} />
          )}
        </span>
        <span className="header-user-copy">
          <span className="header-user-name">{user?.name || "Mon compte"}</span>
        </span>
        <ChevronDown
          className="header-account-chevron"
          size={14}
          aria-hidden="true"
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="header-account-menu"
        sideOffset={8}
      >
        <DropdownMenuGroup>
          <DropdownMenuLabel className="header-menu-identity">
            <span className="header-avatar" aria-hidden="true">
              {user && (
                <BrickAvatar avatar={user.avatar ?? defaultAvatar(user._id)} />
              )}
            </span>
            <div>
              <p className="header-menu-name">{user?.name || "Mon compte"}</p>
              <p className="header-menu-email">{user?.email}</p>
            </div>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={() => navigate({ to: "/projects" })}>
            Mes créations
          </DropdownMenuItem>

          {user && (
            <DropdownMenuItem
              onClick={() =>
                navigate({
                  to: "/gallery/user/$userId",
                  params: { userId: user._id },
                })
              }
            >
              Ma page publique
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={() => navigate({ to: "/settings" })}>
            Paramètres
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onClick={() => {
            authClient.signOut({
              fetchOptions: {
                onSuccess: () => {
                  navigate({ to: "/" });
                  location.reload();
                },
              },
            });
          }}
        >
          Se déconnecter
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
