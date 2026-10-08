import { cn } from "@/lib/utils";
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
        render={
          <Button
            variant="outline"
            className={cn(
              "header-user-trigger [&:focus-visible]:[outline:2px_solid_#356ae6] [&:focus-visible]:[outline-offset:4px] py-[3px] gap-[9px] border-[length:1px] border-solid border-[color:transparent] inline-flex items-center justify-center h-[40px] max-w-[100%] rounded-[24px] [font-size:12px] font-[500] whitespace-nowrap [box-shadow:none] [transition:background_150ms,_color_150ms] pr-[10px] pl-[3px] bg-[#f6f8fc] text-[color:#344964] [@media(width<=680px)]:p-[5px] [@media(width<=680px)]:h-[44px] [@media(width<=680px)]:min-w-[44px] [&:hover]:bg-[#e4edff] [&:hover]:text-[color:#2458be] [&[aria-expanded='true']]:bg-[#e4edff] [&[aria-expanded='true']]:text-[color:#2458be]",
            )}
          />
        }
      >
        <span
          className={cn(
            "header-avatar grid [place-items:center] shrink-[0] w-[32px] h-[32px] rounded-[50%] bg-[#e7edfa] text-[color:#356ae6] [font-size:13px] font-[600] [&:has([class~='group/brick-avatar'])]:bg-[transparent] [&:has([class~='group/brick-avatar'])]:rounded-[6px] [&&_>_[class~='group/brick-avatar']]:w-[100%] [&&_>_[class~='group/brick-avatar']]:h-[100%]",
          )}
          aria-hidden="true"
        >
          {user && (
            <BrickAvatar avatar={user.avatar ?? defaultAvatar(user._id)} />
          )}
        </span>
        <span
          className={cn(
            "header-user-copy flex min-w-[0] text-left [@media(width<=900px)]:hidden",
          )}
        >
          <span
            className={cn(
              "header-user-name overflow-hidden max-w-[130px] text-ellipsis [@media(width<=1100px)]:max-w-[100px]",
            )}
          >
            {user?.name || "Mon compte"}
          </span>
        </span>
        <ChevronDown
          className={cn(
            "header-account-chevron shrink-[0] text-[color:#8495af] [@media(width<=680px)]:hidden",
          )}
          size={14}
          aria-hidden="true"
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className={cn(
          "header-account-menu p-[0] border-[length:1px] border-solid border-[color:#dfe7f3] w-[280px] max-w-[calc(100vw_-_24px)] rounded-[14px] bg-[#fff] text-[color:#344964] [box-shadow:0_16px_44px_#20396220] [&_[class~='group/header-menu-identity']]:px-[16px] [&_[class~='group/header-menu-identity']]:py-[18px] [&_[class~='group/header-menu-identity']]:gap-[11px] [&_[class~='group/header-menu-identity']]:flex [&_[class~='group/header-menu-identity']]:items-center [&_[data-slot='dropdown-menu-item']]:px-[18px] [&_[data-slot='dropdown-menu-item']]:py-[10px] [&_[data-slot='dropdown-menu-item']]:gap-[13px] [&_[data-slot='dropdown-menu-item']]:min-h-[44px] [&_[data-slot='dropdown-menu-item']]:rounded-[0] [&_[data-slot='dropdown-menu-item']]:[font-size:13px] [&_[data-slot='dropdown-menu-item']]:cursor-[pointer] [&_[data-slot='dropdown-menu-separator']]:mx-[0] [&_[data-slot='dropdown-menu-item']:focus]:bg-[#eef4ff] [&_[data-slot='dropdown-menu-item']:focus]:text-[color:#285abd] [&_[data-variant='destructive']:focus]:bg-[#fff0ed] [&_[data-variant='destructive']:focus]:text-[color:#b4473d]",
        )}
        sideOffset={8}
      >
        <DropdownMenuGroup>
          <DropdownMenuLabel
            className={cn(
              "header-menu-identity group/header-menu-identity [&_>_div]:min-w-[0]",
            )}
          >
            <span
              className={cn(
                "header-avatar grid [place-items:center] shrink-[0] w-[32px] h-[32px] rounded-[50%] bg-[#e7edfa] text-[color:#356ae6] [font-size:13px] font-[600] [&:has([class~='group/brick-avatar'])]:bg-[transparent] [&:has([class~='group/brick-avatar'])]:rounded-[6px] [&&_>_[class~='group/brick-avatar']]:w-[100%] [&&_>_[class~='group/brick-avatar']]:h-[100%]",
              )}
              aria-hidden="true"
            >
              {user && (
                <BrickAvatar avatar={user.avatar ?? defaultAvatar(user._id)} />
              )}
            </span>
            <div>
              <p
                className={cn(
                  "header-menu-name [font-size:13px] font-[600] leading-[1.5] [overflow-wrap:anywhere]",
                )}
              >
                {user?.name || "Mon compte"}
              </p>
              <p
                className={cn(
                  "header-menu-email text-[color:#6a7e99] [font-size:11px] leading-[1.5] [overflow-wrap:anywhere]",
                )}
              >
                {user?.email}
              </p>
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
