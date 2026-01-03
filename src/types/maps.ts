export interface MapMarker {
  id: string;
  position: google.maps.LatLngLiteral;
  label?: string;
  title?: string;
}

export interface PlaceResult {
  placeId: string;
  name: string;
  address: string;
  position: google.maps.LatLngLiteral;
}
