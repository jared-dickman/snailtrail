import { LoadScript } from "@react-google-maps/api";
import { useCallback, useState } from "react";
import { MapView } from "@/components/MapView";
import { LocationInput } from "@/components/LocationInput";
import { LocationModal } from "@/components/LocationModal";
import { LocationList } from "@/components/LocationList";
import { CalendarView } from "@/components/CalendarView";
import { RouteSummary } from "@/components/RouteSummary";
import { TrafficDashboard } from "@/components/TrafficDashboard";
import { Settings } from "@/components/Settings";
import { BottomNav, type NavTab } from "@/components/BottomNav";
import { Onboarding } from "@/components/Onboarding";
import { useIsMobile } from "@/hooks/useMediaQuery";
import { useSettings } from "@/hooks/useSettings";
import { useSchedule } from "@/hooks/useSchedule";
import { useLocations } from "@/hooks/useLocations";
import type { ServiceLocation } from "@/types/location";
import type { PlaceResult } from "@/types/maps";
import type { HomeBase } from "@/types/settings";

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";
const libraries: ("places")[] = ["places"];

type DesktopTab = 'map' | 'traffic' | 'route' | 'settings';

function App() {
  const isMobile = useIsMobile();
  const { settings, updateSettings } = useSettings();
  const { schedules, getScheduleForDate } = useSchedule();
  const {
    locations,
    addLocation,
    updateLocation,
    deleteLocation,
    markServiced,
    skipUntil,
    hasOnboarded,
    completeOnboarding,
  } = useLocations();

  const [selectedLocation, setSelectedLocation] = useState<ServiceLocation | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [mapCenter, setMapCenter] = useState<google.maps.LatLngLiteral | undefined>();
  const [activeTab, setActiveTab] = useState<NavTab>('map');
  const [desktopTab, setDesktopTab] = useState<DesktopTab>('map');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const selectedSchedule = getScheduleForDate(selectedDate);

  const handleOnboardingComplete = useCallback((newLocations: ServiceLocation[], homeBase: HomeBase | null) => {
    newLocations.forEach(addLocation);
    if (homeBase) {
      updateSettings({ homeBase });
    }
    completeOnboarding();
  }, [addLocation, updateSettings, completeOnboarding]);

  const handleLocationClick = useCallback((location: ServiceLocation) => {
    setSelectedLocation(location);
    setModalOpen(true);
    setMapCenter({ lat: location.lat, lng: location.lng });
  }, []);

  const handlePlaceSelect = useCallback((place: PlaceResult) => {
    const newLocation: ServiceLocation = {
      id: place.placeId || `loc-${Date.now()}`,
      name: place.name,
      address: place.address,
      lat: place.position.lat,
      lng: place.position.lng,
      status: 'active',
    };
    addLocation(newLocation);
    setMapCenter(place.position);
    setSelectedLocation(newLocation);
    setModalOpen(true);
  }, [addLocation]);

  const handleUpdateLocation = useCallback((updated: ServiceLocation) => {
    updateLocation(updated);
    setSelectedLocation(updated);
  }, [updateLocation]);

  const handleDeleteLocation = useCallback((id: string) => {
    deleteLocation(id);
    setSelectedLocation(null);
    setModalOpen(false);
  }, [deleteLocation]);

  const handleMarkServiced = useCallback((id: string) => {
    markServiced(id);
  }, [markServiced]);

  const handleSkipUntil = useCallback((id: string, date: Date) => {
    skipUntil(id, date);
  }, [skipUntil]);

  const handleCall = useCallback((phone: string) => {
    window.location.href = `tel:${phone}`;
  }, []);

  const handleNavigate = useCallback((location: ServiceLocation) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${location.lat},${location.lng}`;
    window.open(url, '_blank');
  }, []);

  if (!GOOGLE_MAPS_API_KEY) {
    return (
      <div className="h-screen flex items-center justify-center bg-background p-8">
        <div className="text-center space-y-4">
          <pre className="text-4xl">
{`    ><((('>
   <')))><
  ><((((*>`}
          </pre>
          <p className="text-destructive font-semibold">Missing Google Maps API Key</p>
          <p className="text-muted-foreground text-sm">Add VITE_GOOGLE_MAPS_API_KEY to .env.local</p>
        </div>
      </div>
    );
  }

  if (!hasOnboarded) {
    return (
      <LoadScript googleMapsApiKey={GOOGLE_MAPS_API_KEY} libraries={libraries}>
        <Onboarding onComplete={handleOnboardingComplete} />
      </LoadScript>
    );
  }

  return (
    <LoadScript googleMapsApiKey={GOOGLE_MAPS_API_KEY} libraries={libraries}>
      <div className="h-screen w-screen flex flex-col md:flex-row overflow-hidden">
        {/* Desktop Sidebar */}
        {!isMobile && (
          <aside className="w-72 lg:w-80 border-r flex flex-col bg-background z-20 shrink-0">
            <div className="p-3 border-b">
              <h1 className="font-semibold text-lg">Snail Trail</h1>
              <p className="text-xs text-muted-foreground">{locations.length} service locations</p>
            </div>

            {/* Desktop Navigation Tabs */}
            <div className="flex border-b">
              {(['map', 'traffic', 'route', 'settings'] as DesktopTab[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setDesktopTab(tab)}
                  className={`flex-1 py-2.5 text-xs font-medium capitalize transition-colors min-h-[44px] ${
                    desktopTab === tab
                      ? 'text-primary border-b-2 border-primary bg-muted/50'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="p-3 border-b">
              <LocationInput onPlaceSelect={handlePlaceSelect} placeholder="Add new location..." />
            </div>
            <div className="flex-1 overflow-hidden min-h-0">
              <LocationList
                locations={locations}
                onSelect={handleLocationClick}
                onCall={handleCall}
                onNavigate={handleNavigate}
              />
            </div>
          </aside>
        )}

        {/* Main Content */}
        <main className="flex-1 relative min-w-0 min-h-0">
          {/* Mobile: Tab Content */}
          {isMobile ? (
            <>
              {activeTab === 'map' && (
                <div className="h-full pb-[calc(4rem+env(safe-area-inset-bottom))]">
                  <MapView
                    locations={locations}
                    onLocationClick={handleLocationClick}
                    center={mapCenter}
                    selectedId={selectedLocation?.id}
                  />
                  <div className="absolute top-4 left-4 right-4 z-10">
                    <LocationInput onPlaceSelect={handlePlaceSelect} placeholder="Search locations..." />
                  </div>
                  <div className="absolute bottom-20 left-4 bg-background/90 backdrop-blur rounded-lg p-2 text-xs text-muted-foreground">
                    {locations.length} locations
                  </div>
                </div>
              )}

              {activeTab === 'locations' && (
                <div className="h-full pb-[calc(4rem+env(safe-area-inset-bottom))]">
                  <LocationList
                    locations={locations}
                    onSelect={handleLocationClick}
                    onCall={handleCall}
                    onNavigate={handleNavigate}
                  />
                </div>
              )}

              {activeTab === 'traffic' && (
                <div className="h-full pb-[calc(4rem+env(safe-area-inset-bottom))] p-4 overflow-auto">
                  <TrafficDashboard
                    locations={locations}
                    homeBase={settings.homeBase}
                    onNavigate={handleNavigate}
                  />
                </div>
              )}

              {activeTab === 'route' && (
                <div className="h-full pb-[calc(4rem+env(safe-area-inset-bottom))] overflow-auto p-4 space-y-4">
                  <CalendarView
                    schedules={schedules}
                    selectedDate={selectedDate}
                    onDateSelect={setSelectedDate}
                    maxStopsPerDay={settings.maxStopsPerDay}
                  />
                  <RouteSummary
                    schedule={selectedSchedule}
                    homeBase={settings.homeBase}
                    startTime={settings.defaultStartTime}
                    returnHome={true}
                  />
                </div>
              )}

              {activeTab === 'settings' && (
                <div className="h-full pb-[calc(4rem+env(safe-area-inset-bottom))] overflow-auto p-4">
                  <Settings settings={settings} onUpdate={updateSettings} />
                </div>
              )}

              <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
            </>
          ) : (
            /* Desktop: Content based on tab */
            <div className="h-full w-full overflow-hidden">
              {desktopTab === 'map' && (
                <MapView
                  locations={locations}
                  onLocationClick={handleLocationClick}
                  center={mapCenter}
                  selectedId={selectedLocation?.id}
                />
              )}

              {desktopTab === 'traffic' && (
                <div className="h-full overflow-auto p-4 lg:p-6">
                  <div className="max-w-4xl mx-auto">
                    <TrafficDashboard
                      locations={locations}
                      homeBase={settings.homeBase}
                      onNavigate={handleNavigate}
                    />
                  </div>
                </div>
              )}

              {desktopTab === 'route' && (
                <div className="h-full overflow-auto p-4 lg:p-6">
                  <div className="max-w-4xl mx-auto grid gap-4 lg:grid-cols-2">
                    <CalendarView
                      schedules={schedules}
                      selectedDate={selectedDate}
                      onDateSelect={setSelectedDate}
                      maxStopsPerDay={settings.maxStopsPerDay}
                    />
                    <RouteSummary
                      schedule={selectedSchedule}
                      homeBase={settings.homeBase}
                      startTime={settings.defaultStartTime}
                      returnHome={true}
                    />
                  </div>
                </div>
              )}

              {desktopTab === 'settings' && (
                <div className="h-full overflow-auto p-4 lg:p-6">
                  <div className="max-w-lg mx-auto">
                    <Settings settings={settings} onUpdate={updateSettings} />
                  </div>
                </div>
              )}
            </div>
          )}
        </main>

        {/* Location Modal */}
        <LocationModal
          location={selectedLocation}
          open={modalOpen}
          onOpenChange={setModalOpen}
          onUpdate={handleUpdateLocation}
          onDelete={handleDeleteLocation}
          onMarkServiced={handleMarkServiced}
          onSkipUntil={handleSkipUntil}
        />
      </div>
    </LoadScript>
  );
}

export default App;
