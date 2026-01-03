import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LocationInput } from "@/components/LocationInput";
import { Settings as SettingsIcon, Home, Clock, MapPin, Coffee, Sun, Moon, Monitor } from "lucide-react";
import type { AppSettings, HomeBase } from "@/types/settings";
import type { PlaceResult } from "@/types/maps";

type Theme = "light" | "dark" | "system";

function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("theme") as Theme) || "system";
    }
    return "system";
  });

  useEffect(() => {
    const root = document.documentElement;
    const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

    if (theme === "dark" || (theme === "system" && systemDark)) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }

    localStorage.setItem("theme", theme);
  }, [theme]);

  return { theme, setTheme };
}

interface SettingsProps {
  settings: AppSettings;
  onUpdate: (updates: Partial<AppSettings>) => void;
  onClose?: () => void;
}

export function Settings({ settings, onUpdate, onClose }: SettingsProps) {
  const { theme, setTheme } = useTheme();

  const handleHomeBaseSelect = useCallback(
    (place: PlaceResult) => {
      const homeBase: HomeBase = {
        lat: place.position.lat,
        lng: place.position.lng,
        address: place.name,
      };
      onUpdate({ homeBase });
    },
    [onUpdate]
  );

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <SettingsIcon className="h-5 w-5" />
          Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Theme Toggle */}
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            {theme === "dark" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            Appearance
          </label>
          <div className="flex gap-1">
            <Button
              variant={theme === "light" ? "default" : "outline"}
              size="sm"
              onClick={() => setTheme("light")}
              className="flex-1"
            >
              <Sun className="h-4 w-4 mr-1" /> Light
            </Button>
            <Button
              variant={theme === "dark" ? "default" : "outline"}
              size="sm"
              onClick={() => setTheme("dark")}
              className="flex-1"
            >
              <Moon className="h-4 w-4 mr-1" /> Dark
            </Button>
            <Button
              variant={theme === "system" ? "default" : "outline"}
              size="sm"
              onClick={() => setTheme("system")}
              className="flex-1"
            >
              <Monitor className="h-4 w-4 mr-1" /> Auto
            </Button>
          </div>
        </div>

        {/* Home Base */}
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            <Home className="h-4 w-4 text-muted-foreground" />
            Home Base (HQ)
          </label>
          {settings.homeBase ? (
            <div className="flex items-center gap-2">
              <div className="flex-1 p-2 bg-muted rounded text-sm truncate">
                {settings.homeBase.address}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onUpdate({ homeBase: null })}
              >
                Clear
              </Button>
            </div>
          ) : (
            <LocationInput
              onPlaceSelect={handleHomeBaseSelect}
              placeholder="Set your home base address..."
            />
          )}
        </div>

        {/* Default Start Time */}
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            Default Start Time
          </label>
          <Input
            type="time"
            value={settings.defaultStartTime}
            onChange={(e) => onUpdate({ defaultStartTime: e.target.value })}
            className="w-32"
          />
        </div>

        {/* Working Hours */}
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            Working Hours
          </label>
          <div className="flex items-center gap-2">
            <Input
              type="time"
              value={settings.workingHours.start}
              onChange={(e) =>
                onUpdate({
                  workingHours: { ...settings.workingHours, start: e.target.value },
                })
              }
              className="w-32"
            />
            <span className="text-muted-foreground">to</span>
            <Input
              type="time"
              value={settings.workingHours.end}
              onChange={(e) =>
                onUpdate({
                  workingHours: { ...settings.workingHours, end: e.target.value },
                })
              }
              className="w-32"
            />
          </div>
        </div>

        {/* Break Preferences */}
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            <Coffee className="h-4 w-4 text-muted-foreground" />
            Break Time
          </label>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={settings.breakPreferences.enabled}
              onChange={(e) =>
                onUpdate({
                  breakPreferences: {
                    ...settings.breakPreferences,
                    enabled: e.target.checked,
                  },
                })
              }
              className="h-4 w-4 shrink-0"
            />
            <span className="text-sm text-muted-foreground shrink-0">Enable break</span>
          </div>
          {settings.breakPreferences.enabled && (
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <Input
                type="time"
                value={settings.breakPreferences.startTime}
                onChange={(e) =>
                  onUpdate({
                    breakPreferences: {
                      ...settings.breakPreferences,
                      startTime: e.target.value,
                    },
                  })
                }
                className="w-28"
              />
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  value={settings.breakPreferences.duration}
                  onChange={(e) =>
                    onUpdate({
                      breakPreferences: {
                        ...settings.breakPreferences,
                        duration: parseInt(e.target.value) || 30,
                      },
                    })
                  }
                  className="w-20"
                  min={5}
                  max={120}
                />
                <span className="text-sm text-muted-foreground">min</span>
              </div>
            </div>
          )}
        </div>

        {/* Max Stops */}
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            Max Stops Per Day
          </label>
          <Input
            type="number"
            value={settings.maxStopsPerDay}
            onChange={(e) =>
              onUpdate({ maxStopsPerDay: parseInt(e.target.value) || 12 })
            }
            className="w-24"
            min={1}
            max={30}
          />
        </div>

        {onClose && (
          <Button onClick={onClose} className="w-full mt-4">
            Done
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
