import { useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2 } from "lucide-react";
import type { ServiceLocation } from "@/types/location";

interface ParsedLocation {
  name?: string;
  address?: string;
  googlePlaceId?: string;
  contactName?: string;
  contactPhone?: string;
  priority?: "high" | "medium" | "low";
  frequency?: "weekly" | "biweekly" | "monthly";
  preferredDays?: string[];
  timeWindow?: { open: string; close: string };
  tankType?: "freshwater" | "saltwater" | "reef";
  tankGallons?: number;
  notes?: string;
  appointmentRequired?: boolean;
  estimatedDuration?: number;
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

  const geocodeByPlaceId = useCallback(async (placeId: string): Promise<{ lat: number; lng: number; address: string } | null> => {
    if (!window.google?.maps) return null;

    const geocoder = new google.maps.Geocoder();
    return new Promise((resolve) => {
      geocoder.geocode({ placeId }, (results, status) => {
        if (status === "OK" && results?.[0]) {
          const loc = results[0].geometry.location;
          resolve({
            lat: loc.lat(),
            lng: loc.lng(),
            address: results[0].formatted_address || ""
          });
        } else {
          resolve(null);
        }
      });
    });
  }, []);

  const geocodeAddress = useCallback(async (address: string): Promise<{ lat: number; lng: number; address: string } | null> => {
    if (!window.google?.maps) return null;

    const geocoder = new google.maps.Geocoder();
    return new Promise((resolve) => {
      geocoder.geocode({ address }, (results, status) => {
        if (status === "OK" && results?.[0]) {
          const loc = results[0].geometry.location;
          resolve({
            lat: loc.lat(),
            lng: loc.lng(),
            address: results[0].formatted_address || address
          });
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

      if (!parsed.name && !parsed.address && !parsed.googlePlaceId) {
        onError?.("Couldn't parse location info. Try including a name and address.");
        return;
      }

      // Geocode: prefer address, then name (Place IDs from AI can be hallucinated)
      let geo: { lat: number; lng: number; address: string } | null = null;

      if (parsed.address) {
        geo = await geocodeAddress(parsed.address);
      }

      if (!geo && parsed.name) {
        // Search by full name - Google will find well-known places
        geo = await geocodeAddress(parsed.name);
      }

      if (!geo && parsed.googlePlaceId) {
        // Fallback to Place ID (may be hallucinated, use with caution)
        geo = await geocodeByPlaceId(parsed.googlePlaceId);
      }

      if (!geo || (geo.lat === 0 && geo.lng === 0)) {
        onError?.("Couldn't verify location. Please include a complete street address.");
        return;
      }

      // Map to ServiceLocation
      const location: Partial<ServiceLocation> = {
        id: crypto.randomUUID(),
        name: parsed.name || geo.address.split(",")[0] || "New Location",
        address: geo.address,
        lat: geo.lat,
        lng: geo.lng,
        status: "active",
        priority: parsed.priority,
        contactName: parsed.contactName,
        contactPhone: parsed.contactPhone,
        serviceSchedule: parsed.frequency
          ? {
              frequency: parsed.frequency,
              preferredDays: parsed.preferredDays,
              timeWindow: parsed.timeWindow,
              appointmentRequired: parsed.appointmentRequired,
            }
          : undefined,
        estimatedDuration: parsed.estimatedDuration,
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
  }, [input, loading, geocodeByPlaceId, geocodeAddress, onLocationParsed, onError]);

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
