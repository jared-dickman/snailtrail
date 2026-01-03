import { GoogleMap, Marker } from "@react-google-maps/api";
import { useCallback, useState } from "react";
import type { ServiceLocation } from "@/types/location";
import { PRIORITY_HEX_COLORS } from "@/lib/constants";

interface MapViewProps {
  locations: ServiceLocation[];
  onLocationClick?: (location: ServiceLocation) => void;
  onMapClick?: (position: google.maps.LatLngLiteral) => void;
  center?: google.maps.LatLngLiteral;
  selectedId?: string;
}

const containerStyle = {
  width: "100%",
  height: "100%",
};

const defaultCenter = { lat: 40.22, lng: -74.42 }; // Central NJ

function getMarkerIcon(location: ServiceLocation, isSelected: boolean): google.maps.Symbol | undefined {
  const color = PRIORITY_HEX_COLORS[location.priority || 'default'];

  return {
    path: google.maps.SymbolPath.CIRCLE,
    fillColor: isSelected ? '#000' : color,
    fillOpacity: 1,
    strokeColor: '#fff',
    strokeWeight: 2,
    scale: isSelected ? 12 : 10,
  };
}

export function MapView({ locations, onLocationClick, onMapClick, center, selectedId }: MapViewProps) {
  const [map, setMap] = useState<google.maps.Map | null>(null);

  const onLoad = useCallback((map: google.maps.Map) => {
    setMap(map);
  }, []);

  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);

  const handleClick = useCallback(
    (e: google.maps.MapMouseEvent) => {
      if (e.latLng && onMapClick) {
        onMapClick({ lat: e.latLng.lat(), lng: e.latLng.lng() });
      }
    },
    [onMapClick]
  );

  // Pan to center when it changes
  if (map && center) {
    map.panTo(center);
  }

  return (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={center || defaultCenter}
      zoom={9}
      onLoad={onLoad}
      onUnmount={onUnmount}
      onClick={handleClick}
      options={{
        streetViewControl: false,
        mapTypeControl: false,
        fullscreenControl: false,
        zoomControl: true,
        zoomControlOptions: {
          position: google.maps.ControlPosition?.RIGHT_CENTER,
        },
      }}
    >
      {locations.map((location) => (
        <Marker
          key={location.id}
          position={{ lat: location.lat, lng: location.lng }}
          title={location.name}
          icon={getMarkerIcon(location, location.id === selectedId)}
          onClick={() => onLocationClick?.(location)}
        />
      ))}
    </GoogleMap>
  );
}
