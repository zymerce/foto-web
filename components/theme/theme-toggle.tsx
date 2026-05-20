"use client";

import { Check, Monitor, MoonStar, Palette, SunMedium } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeMode, setThemeMode, useThemeMode } from "@/components/theme/theme-manager";
import { cn } from "@/lib/utils";

const OPTIONS: Array<{ value: ThemeMode; label: string; icon: typeof Monitor }> = [
  { value: "system", label: "System", icon: Monitor },
  { value: "light", label: "Light", icon: SunMedium },
  { value: "dark", label: "Dark", icon: MoonStar },
];

export function ThemeToggle({
  compact = false,
  className,
}: {
  compact?: boolean;
  className?: string;
}) {
  const mode = useThemeMode();
  const active = OPTIONS.find((option) => option.value === mode) || OPTIONS[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "min-h-11 gap-2",
            compact ? "w-full justify-start rounded-xl" : "rounded-full px-3",
            className,
          )}
          aria-label="Change theme"
          title="Change theme"
        >
          <Palette className="size-4" />
          <span>{compact ? `Theme: ${active.label}` : active.label}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {OPTIONS.map((option) => {
          const Icon = option.icon;
          return (
            <DropdownMenuItem
              key={option.value}
              className="cursor-pointer"
              onClick={() => setThemeMode(option.value)}
            >
              <Icon className="size-4" />
              {option.label}
              <Check className={cn("ml-auto size-4", mode === option.value ? "opacity-100" : "opacity-0")} />
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
