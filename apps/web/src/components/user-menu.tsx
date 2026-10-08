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
            className="header-user-trigger focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[#356ae6] focus-visible:outline-offset-4 py-0.75 gap-2.25 border border-solid border-transparent inline-flex items-center justify-center h-10 max-w-full rounded-3xl text-xs font-medium whitespace-nowrap [box-shadow:none] [transition:background_150ms,color_150ms] pr-2.5 pl-0.75 bg-[#f6f8fc] text-[#344964] max-sm-wide:p-1.25 max-sm-wide:h-11 max-sm-wide:min-w-11 hover:bg-[#e4edff] hover:text-[#2458be] aria-expanded:bg-[#e4edff] aria-expanded:text-[#2458be]"
          />
        }
      >
        <span
          className="header-avatar grid place-items-center shrink-0 rounded-full bg-[#e7edfa] text-[#356ae6] text-[13px] font-semibold [&:has([class~='group/brick-avatar'])]:bg-transparent [&:has([class~='group/brick-avatar'])]:rounded-[6px] size-8"
          aria-hidden="true"
        >
          {user && (
            <BrickAvatar
              className="size-full pointer-events-none"
              avatar={user.avatar ?? defaultAvatar(user._id)}
            />
          )}
        </span>
        <span className="header-user-copy flex min-w-0 text-left max-lg-compact:hidden">
          <span className="header-user-name overflow-hidden max-w-32.5 text-ellipsis max-xl-narrow:max-w-25">
            {user?.name || "Mon compte"}
          </span>
        </span>
        <ChevronDown
          className="header-account-chevron shrink-0 text-[#8495af] max-sm-wide:hidden size-4"
          size={14}
          aria-hidden="true"
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="header-account-menu p-0 border border-solid border-[#dfe7f3] w-70 max-w-[calc(100vw-24px)] rounded-[14px] bg-white text-[#344964] [box-shadow:0_16px_44px_#20396220]"
        sideOffset={8}
      >
        <DropdownMenuGroup className="[&[data-variant='destructive']:focus]:bg-[#fff0ed] [&[data-variant='destructive']:focus]:text-[#b4473d]">
          <DropdownMenuLabel className="header-menu-identity group/header-menu-identity px-4 py-4.5 gap-2.75 flex items-center [&[data-variant='destructive']:focus]:bg-[#fff0ed] [&[data-variant='destructive']:focus]:text-[#b4473d]">
            <span
              className="header-avatar grid place-items-center shrink-0 rounded-full bg-[#e7edfa] text-[#356ae6] text-[13px] font-semibold [&:has([class~='group/brick-avatar'])]:bg-transparent [&:has([class~='group/brick-avatar'])]:rounded-[6px] size-8 [&[data-variant='destructive']:focus]:bg-[#fff0ed] [&[data-variant='destructive']:focus]:text-[#b4473d]"
              aria-hidden="true"
            >
              {user && (
                <BrickAvatar
                  className="[&[data-variant='destructive']:focus]:bg-[#fff0ed] [&[data-variant='destructive']:focus]:text-[#b4473d] size-full pointer-events-none"
                  avatar={user.avatar ?? defaultAvatar(user._id)}
                />
              )}
            </span>
            <div className="[&[data-variant='destructive']:focus]:bg-[#fff0ed] [&[data-variant='destructive']:focus]:text-[#b4473d] min-w-0">
              <p className="header-menu-name text-[13px] font-semibold leading-normal wrap-anywhere [&[data-variant='destructive']:focus]:bg-[#fff0ed] [&[data-variant='destructive']:focus]:text-[#b4473d]">
                {user?.name || "Mon compte"}
              </p>
              <p className="header-menu-email text-[#6a7e99] text-[11px] leading-normal wrap-anywhere [&[data-variant='destructive']:focus]:bg-[#fff0ed] [&[data-variant='destructive']:focus]:text-[#b4473d]">
                {user?.email}
              </p>
            </div>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator className="mx-0 [&[data-variant='destructive']:focus]:bg-[#fff0ed] [&[data-variant='destructive']:focus]:text-[#b4473d]" />
        <DropdownMenuGroup className="[&[data-variant='destructive']:focus]:bg-[#fff0ed] [&[data-variant='destructive']:focus]:text-[#b4473d]">
          <DropdownMenuItem
            className="px-4.5 py-2.5 gap-3.25 min-h-11 rounded-none text-[13px] cursor-pointer focus:bg-[#eef4ff] focus:text-[#285abd] [&[data-variant='destructive']:focus]:bg-[#fff0ed] [&[data-variant='destructive']:focus]:text-[#b4473d] leading-(--text-xs--line-height)"
            onClick={() => navigate({ to: "/projects" })}
          >
            Mes créations
          </DropdownMenuItem>

          {user && (
            <DropdownMenuItem
              className="px-4.5 py-2.5 gap-3.25 min-h-11 rounded-none text-[13px] cursor-pointer focus:bg-[#eef4ff] focus:text-[#285abd] [&[data-variant='destructive']:focus]:bg-[#fff0ed] [&[data-variant='destructive']:focus]:text-[#b4473d] leading-(--text-xs--line-height)"
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
          <DropdownMenuItem
            className="px-4.5 py-2.5 gap-3.25 min-h-11 rounded-none text-[13px] cursor-pointer focus:bg-[#eef4ff] focus:text-[#285abd] [&[data-variant='destructive']:focus]:bg-[#fff0ed] [&[data-variant='destructive']:focus]:text-[#b4473d] leading-(--text-xs--line-height)"
            onClick={() => navigate({ to: "/settings" })}
          >
            Paramètres
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator className="mx-0 [&[data-variant='destructive']:focus]:bg-[#fff0ed] [&[data-variant='destructive']:focus]:text-[#b4473d]" />
        <DropdownMenuItem
          className="px-4.5 py-2.5 gap-3.25 min-h-11 rounded-none text-[13px] cursor-pointer focus:bg-[#eef4ff] focus:text-[#285abd] [&[data-variant='destructive']:focus]:bg-[#fff0ed] [&[data-variant='destructive']:focus]:text-[#b4473d] leading-(--text-xs--line-height)"
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
