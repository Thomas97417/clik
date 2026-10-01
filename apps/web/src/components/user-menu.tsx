import { useNavigate } from "@tanstack/react-router";
import { useCurrentUser } from "@/hooks/use-current-user";
import {
  ChevronDown,
  FolderOpen,
  Globe2,
  LogOut,
  Settings,
  User,
} from "lucide-react";

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
          {user?.name?.trim().charAt(0).toLocaleUpperCase() || (
            <User size={16} />
          )}
        </span>
        <span className="header-user-copy">
          <span>Mon espace</span>
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
              {user?.name?.trim().charAt(0).toLocaleUpperCase() || (
                <User size={16} />
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
            <FolderOpen className="size-4" />
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
              <Globe2 className="size-4" /> Ma page publique
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={() => navigate({ to: "/settings" })}>
            <Settings className="size-4" />
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
          <LogOut className="size-4" />
          Se déconnecter
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
