import { useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2 } from "lucide-react";
import type { ServiceLocation } from "@/types/location";

interface ParsedLocation {
  name?: string;
  address?: string;
  contactName?: string;
  contactPhone?: string;
  priority?: "high" | "medium" | "low";
  frequency?: "weekly" | "biweekly" | "monthly";
  preferredDay?: string;
  timeWindow?: { open: string; close: string };
  tankType?: "freshwater" | "saltwater" | "reef";
  tankGallons?: number;
  notes?: string;
}

interface AiLocationInputProps {
  onLocationParsed: (location: Partial<ServiceLocation>) => void;
  onError?: (error: string) => void;
  placeholder?: string;
}

export function AiLocationInput({
  onLocationParsed,
  onError,
  placeholder = "Try: 'Bob's Dental at 123 Main St, 50 gal reef, biweekly Tuesdays 9-12, high priority'",
}: AiLocationInputProps) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const geocodeAddress = useCallback(async (address: string): Promise<{ lat: number; lng: number } | null> => {
    if (!window.google?.maps) return null;

    const geocoder = new google.maps.Geocoder();
    return new Promise((resolve) => {
      geocoder.geocode({ address }, (results, status) => {
        if (status === "OK" && results?.[0]) {
          const loc = results[0].geometry.location;
          resolve({ lat: loc.lat(), lng: loc.lng() });
        } else {
          resolve(null);
        }
      });
    });
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!input.trim() || loading) return;

    setLoading(true);
    try {
      const res = await fetch("/api/parse/location", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: input }),
      });

      if (!res.ok) throw new Error("Failed to parse");

      const parsed: ParsedLocation = await res.json();

      if (!parsed.name && !parsed.address) {
        onError?.("Couldn't parse location info. Try including a name and address.");
        return;
      }

      // Geocode address if present
      let coords = { lat: 0, lng: 0 };
      if (parsed.address) {
        const geo = await geocodeAddress(parsed.address);
        if (geo) coords = geo;
      }

      // Map to ServiceLocation
      const location: Partial<ServiceLocation> = {
        id: crypto.randomUUID(),
        name: parsed.name || "New Location",
        address: parsed.address || "",
        lat: coords.lat,
        lng: coords.lng,
        status: "active",
        priority: parsed.priority,
        contactName: parsed.contactName,
        contactPhone: parsed.contactPhone,
        serviceSchedule: parsed.frequency
          ? {
              frequency: parsed.frequency,
              preferredDay: parsed.preferredDay,
              timeWindow: parsed.timeWindow,
            }
          : undefined,
        tankInfo:
          parsed.tankType || parsed.tankGallons
            ? {
                type: parsed.tankType || "freshwater",
                gallons: parsed.tankGallons || 0,
                notes: parsed.notes,
              }
            : undefined,
      };

      onLocationParsed(location);
      setInput("");
    } catch {
      onError?.("Failed to parse. Try again or add manually.");
    } finally {
      setLoading(false);
    }
  }, [input, loading, geocodeAddress, onLocationParsed, onError]);

  return (
    <div className="flex gap-2">
      <div className="relative flex-1">
        <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          placeholder={placeholder}
          className="pl-10 bg-background/95 backdrop-blur"
          disabled={loading}
        />
      </div>
      <Button onClick={handleSubmit} disabled={loading || !input.trim()} size="icon">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
      </Button>
    </div>
  );
}
