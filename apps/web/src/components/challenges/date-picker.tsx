import { cn } from "@/lib/utils";
import { useState } from "react";
import { Popover } from "@base-ui/react/popover";
import {
  DayPicker,
  type ClassNames,
  type ChevronProps,
} from "react-day-picker";
import { fr } from "react-day-picker/locale";
import { formatChallengeDay } from "@/lib/clik/challenge-date";
import {
  ArrowUpRight,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
// DayPicker exposes the calendar structure and modifiers through classNames.
// Keep its markers for consumers; every visual rule belongs to a utility.
const calendarClassNames = {
  root: "rdp-root relative select-none text-[13px]",
  months: "rdp-months relative flex w-full max-w-none flex-wrap gap-[2rem]",
  month: "rdp-month relative w-full max-w-none",
  month_grid: "rdp-month_grid w-full table-fixed border-collapse",
  month_caption:
    "rdp-month_caption relative mx-[36px] flex h-[36px] content-center justify-center text-[15px] font-[700] tracking-[-0.35px] text-[#263b58] capitalize",
  caption_label:
    "rdp-caption_label relative z-[1] inline-flex items-center whitespace-nowrap [border:0]",
  button_previous:
    "rdp-button_previous absolute top-0 start-0 inline-flex h-[36px] w-[36px] appearance-none items-center justify-center rounded-[9px] border border-[#e0e7f2] bg-[#fff] p-0 m-0  text-[#536f97] disabled:cursor-default disabled:opacity-[0.35] aria-disabled:cursor-default aria-disabled:opacity-[0.35] [&:hover:not(:disabled):not([aria-disabled=true])]:bg-[#edf3ff] [&:hover:not(:disabled):not([aria-disabled=true])]:text-[#356ae6]",
  button_next:
    "rdp-button_next absolute top-0 end-0 inline-flex h-[36px] w-[36px] appearance-none items-center justify-center rounded-[9px] border border-[#e0e7f2] bg-[#fff] p-0 m-0  text-[#536f97] disabled:cursor-default disabled:opacity-[0.35] aria-disabled:cursor-default aria-disabled:opacity-[0.35] [&:hover:not(:disabled):not([aria-disabled=true])]:bg-[#edf3ff] [&:hover:not(:disabled):not([aria-disabled=true])]:text-[#356ae6]",
  chevron: "rdp-chevron inline-block fill-none text-inherit",
  weekday:
    "rdp-weekday pt-[14px] pb-[8px] px-0 text-center text-[10px] font-[650] tracking-[0.4px] text-[#8a98ae] uppercase opacity-100",
  day: "rdp-day h-[44px] w-[calc(100%/7)] text-center",
  day_button:
    "rdp-day_button relative mx-auto my-0 flex h-[40px] w-[calc(100%-4px)] items-center justify-center rounded-[10px] border border-transparent bg-transparent p-0  font-[550] text-inherit [outline-offset:1px] disabled:cursor-not-allowed disabled:opacity-100 [&:hover:not(:disabled)]:bg-[#edf3ff] [&:hover:not(:disabled)]:text-[#2458ce]",
  today:
    "rdp-today [&:not([data-outside])]:text-[#356ae6] [&:not([data-selected])_button]:bg-[#edf3ff] [&:not([data-selected])_button]:font-[700] [&:not([data-selected])_button]:text-[#356ae6] [&_button::after]:absolute [&_button::after]:bottom-[4px] [&_button::after]:left-[calc(50%-2px)] [&_button::after]:size-[4px] [&_button::after]:rounded-[50%] [&_button::after]:bg-[#356ae6] [&_button::after]:content-['']",
  selected:
    "rdp-selected text-[13px] font-bold [&_button]:border-[#356ae6] [&_button]:bg-[#356ae6] [&_button]:font-[700] [&_button]:text-[#fff] [&_button]:[box-shadow:0_3px_8px_#356ae625] [&_button:hover:not(:disabled)]:bg-[#285abd] [&_button:hover:not(:disabled)]:text-[#fff] [&_button:focus-visible]:[outline-color:#203b65] [&_button::after]:bg-[#fff]",
  outside:
    "rdp-outside opacity-100 [&:not([data-selected])_button]:text-[#8a98ae]",
  disabled: "rdp-disabled [&:not([data-selected])]:opacity-[0.35]",
  hidden: "rdp-hidden invisible text-[#fff]",
} satisfies Partial<ClassNames>;

// Calendar dates are local civil dates; no UTC conversion can shift the chosen day.
const civil = (day: string) =>
  new Date(
    Number(day.slice(0, 4)),
    Number(day.slice(5, 7)) - 1,
    Number(day.slice(8, 10)),
    12,
  );

function CalendarChevron({ orientation, className }: ChevronProps) {
  const Icon = orientation === "left" ? ChevronLeft : ChevronRight;
  return <Icon className={className} size={18} aria-hidden="true" />;
}

export function ChallengeDatePicker({
  day,
  first,
  last,
  onChange,
}: {
  day: string;
  first: string;
  last: string;
  onChange: (day: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selectedDay = civil(day);
  const firstDay = civil(first);
  const today = civil(last);
  const select = (date: Date) => {
    onChange(
      `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`,
    );
    setOpen(false);
  };

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger
        className={cn(
          "challenge-date-trigger group/challenge-date-trigger [&[data-popup-open]_[class~='group/challenge-date-chevron']]:[transform:rotate(180deg)] [&[data-popup-open]_[class~='group/challenge-date-chevron']]:text-[color:#356ae6]",
        )}
      >
        <span
          className={cn(
            "challenge-date-icon grid [place-items:center] w-[30px] h-[30px] shrink-[0] rounded-[8px] bg-[#eaf0fc] text-[color:#356ae6] [@media(width<=480px)]:w-[24px] [@media(width<=480px)]:h-[28px]",
          )}
        >
          <CalendarDays size={17} aria-hidden="true" />
        </span>
        <span
          className={cn(
            "challenge-date-label min-w-[0] whitespace-nowrap [@media(width<=480px)]:overflow-hidden [@media(width<=480px)]:text-ellipsis",
          )}
        >
          {formatChallengeDay(day)}
        </span>
        <ChevronDown
          className={cn(
            "challenge-date-chevron group/challenge-date-chevron text-[color:#7d8da5] [transition:transform_0.15s] motion-reduce:[transition:none]",
          )}
          size={15}
          aria-hidden="true"
        />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner
          align="start"
          sideOffset={10}
          collisionPadding={12}
          collisionAvoidance={{
            side: "flip",
            align: "shift",
            fallbackAxisSide: "none",
          }}
          className={cn("challenge-calendar-positioner z-[60]")}
        >
          <Popover.Popup
            className={cn(
              "challenge-calendar border-[length:1px] border-solid border-[color:#dce5f4] w-[344px] max-w-[calc(100vw_-_24px)] max-h-[var(--available-height)] overflow-y-auto bg-[#fff] rounded-[18px] [box-shadow:0_18px_50px_#20396220,_0_3px_10px_#20396208] text-[color:#344964] font-[family-name:var(--font-sans)] [transform-origin:var(--transform-origin)] [transition:opacity_0.15s,_transform_0.15s] [&[data-starting-style]]:opacity-[0] [&[data-starting-style]]:[transform:scale(0.97)] [&[data-ending-style]]:opacity-[0] [&[data-ending-style]]:[transform:scale(0.97)] [&_button:disabled]:cursor-[not-allowed] [&_button:disabled]:opacity-[1] motion-reduce:[transition:none]",
            )}
            initialFocus={false}
          >
            <div
              className={cn(
                "challenge-calendar-header px-[16px] py-[18px] gap-[12px] flex items-center [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#edf1f7] bg-[#fbfcff]",
              )}
            >
              <div>
                <Popover.Title
                  className={cn(
                    "challenge-calendar-title text-[color:#263b58] [font-size:15px] font-[750] tracking-[-0.35px] leading-[1.4]",
                  )}
                >
                  Choisir la date du défi
                </Popover.Title>
                <Popover.Description
                  className={cn(
                    "challenge-calendar-description mt-[4px] text-[color:#71839c] [font-size:11px] leading-[1.6]",
                  )}
                >
                  Retrouvez les créations de chaque jour.
                </Popover.Description>
              </div>
            </div>
            <div className={cn("challenge-calendar-body p-[16px]")}>
              <DayPicker
                classNames={calendarClassNames}
                locale={fr}
                mode="single"
                required
                autoFocus
                showOutsideDays
                navLayout="around"
                components={{ Chevron: CalendarChevron }}
                selected={selectedDay}
                today={today}
                defaultMonth={selectedDay}
                startMonth={firstDay}
                endMonth={today}
                disabled={[{ before: firstDay }, { after: today }]}
                onSelect={select}
              />
            </div>
            <div
              className={cn(
                "challenge-calendar-footer px-[16px] py-[12px] gap-[12px] flex items-center justify-between [border-top-width:1px] [border-top-style:solid] [border-top-color:#e8eef7] bg-[#f7faff]",
              )}
            >
              <span
                className={cn(
                  "challenge-calendar-legend gap-[7px] inline-flex items-center text-[color:#71839c] [font-size:11px] [&_>_span]:w-[5px] [&_>_span]:h-[5px] [&_>_span]:rounded-[50%] [&_>_span]:bg-[#356ae6]",
                )}
              >
                <span aria-hidden="true" /> Aujourd’hui
              </span>
              <button
                type="button"
                className={cn(
                  "challenge-calendar-today px-[11px] py-[8px] gap-[7px] border-[length:1px] border-solid border-[color:#dce6f7] inline-flex items-center min-h-[36px] rounded-[9px] bg-[#fff] text-[color:#356ae6] [font-size:11px] font-[650] [&:hover]:border-[color:#b8cef2] [&:hover]:bg-[#edf3ff]",
                )}
                onClick={() => select(today)}
              >
                Défi du jour <ArrowUpRight size={15} aria-hidden="true" />
              </button>
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
