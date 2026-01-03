import { Autocomplete } from "@react-google-maps/api";
import { useCallback, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import type { PlaceResult } from "@/types/maps";

interface LocationInputProps {
  onPlaceSelect: (place: PlaceResult) => void;
  placeholder?: string;
}

export function LocationInput({
  onPlaceSelect,
  placeholder = "Search for a location...",
}: LocationInputProps) {
  const [autocomplete, setAutocomplete] =
    useState<google.maps.places.Autocomplete | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const onLoad = useCallback((ac: google.maps.places.Autocomplete) => {
    setAutocomplete(ac);
  }, []);

  const onPlaceChanged = useCallback(() => {
    if (!autocomplete) return;

    const place = autocomplete.getPlace();
    if (!place.geometry?.location || !place.place_id) return;

    const result: PlaceResult = {
      placeId: place.place_id,
      name: place.name || "",
      address: place.formatted_address || "",
      position: {
        lat: place.geometry.location.lat(),
        lng: place.geometry.location.lng(),
      },
    };

    onPlaceSelect(result);

    // Clear input after selection
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }, [autocomplete, onPlaceSelect]);

  return (
    <Autocomplete
      onLoad={onLoad}
      onPlaceChanged={onPlaceChanged}
      options={{ types: ["establishment", "geocode"] }}
    >
      <Input
        ref={inputRef}
        type="text"
        placeholder={placeholder}
        className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80"
      />
    </Autocomplete>
  );
}
