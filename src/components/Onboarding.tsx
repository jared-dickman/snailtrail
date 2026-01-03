import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { LocationInput } from "@/components/LocationInput";
import { AiLocationInput } from "@/components/AiLocationInput";
import { Badge } from "@/components/ui/badge";
import { Fish, MapPin, Calendar, Sparkles, Check, ArrowRight, Home, Wand2 } from "lucide-react";
import type { ServiceLocation } from "@/types/location";
import type { PlaceResult } from "@/types/maps";
import type { HomeBase } from "@/types/settings";

interface OnboardingProps {
  onComplete: (locations: ServiceLocation[], homeBase: HomeBase | null) => void;
}

type Step = "welcome" | "homebase" | "locations" | "done";

export function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState<Step>("welcome");
  const [locations, setLocations] = useState<ServiceLocation[]>([]);
  const [homeBase, setHomeBase] = useState<HomeBase | null>(null);

  const handleAddLocation = (place: PlaceResult) => {
    const newLoc: ServiceLocation = {
      id: `loc-${Date.now()}`,
      name: place.name,
      address: place.address,
      lat: place.position.lat,
      lng: place.position.lng,
      status: "active",
      priority: "medium",
      serviceSchedule: { frequency: "weekly" },
    };
    setLocations((prev) => [...prev, newLoc]);
  };

  const handleAiLocation = (location: Partial<ServiceLocation>) => {
    setLocations((prev) => [...prev, location as ServiceLocation]);
  };

  const handleSetHomeBase = (place: PlaceResult) => {
    setHomeBase({
      lat: place.position.lat,
      lng: place.position.lng,
      address: place.address,
    });
  };

  const handleComplete = () => {
    onComplete(locations, homeBase);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg shadow-xl">
        {step === "welcome" && (
          <>
            <CardHeader className="text-center pb-2">
              <div className="mx-auto mb-4 text-6xl">
                <pre className="text-primary font-mono text-2xl leading-tight">{`   ><((('>
  <')))><
 ><((('>`}</pre>
              </div>
              <CardTitle className="text-2xl">Welcome to Snail Trail</CardTitle>
              <CardDescription>
                The smart route optimizer for aquarium service professionals
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-3 py-4">
                <div className="text-center p-3 rounded-lg bg-muted/50">
                  <MapPin className="h-6 w-6 mx-auto mb-2 text-primary" />
                  <span className="text-xs">Smart Routes</span>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted/50">
                  <Calendar className="h-6 w-6 mx-auto mb-2 text-primary" />
                  <span className="text-xs">Easy Scheduling</span>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted/50">
                  <Fish className="h-6 w-6 mx-auto mb-2 text-primary" />
                  <span className="text-xs">Tank Tracking</span>
                </div>
              </div>
              <Button onClick={() => setStep("homebase")} className="w-full h-12">
                Get Started <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </>
        )}

        {step === "homebase" && (
          <>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Home className="h-5 w-5" />
                Set Your Home Base
              </CardTitle>
              <CardDescription>
                Where do your routes start and end each day?
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <LocationInput
                onPlaceSelect={handleSetHomeBase}
                placeholder="Enter your home or office address..."
              />
              {homeBase && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                  <Check className="h-5 w-5 text-green-500" />
                  <span className="text-sm">{homeBase.address}</span>
                </div>
              )}
              <div className="flex gap-2 pt-4">
                <Button variant="outline" onClick={() => setStep("welcome")} className="flex-1">
                  Back
                </Button>
                <Button onClick={() => setStep("locations")} className="flex-1" disabled={!homeBase}>
                  Continue <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </>
        )}

        {step === "locations" && (
          <>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wand2 className="h-5 w-5" />
                Add Service Locations
              </CardTitle>
              <CardDescription>
                Describe your customers naturally — AI handles the rest
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <AiLocationInput
                onLocationParsed={handleAiLocation}
                placeholder="e.g. Bob's Dental, 123 Main St, 50gal reef, weekly Mondays"
              />
              <div className="text-xs text-muted-foreground text-center">or search by address</div>
              <LocationInput
                onPlaceSelect={handleAddLocation}
                placeholder="Search address..."
              />

              {locations.length > 0 && (
                <div className="space-y-2 max-h-48 overflow-auto">
                  {locations.map((loc, i) => (
                    <div key={loc.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                      <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center shrink-0">
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{loc.name}</div>
                        <div className="text-xs text-muted-foreground truncate">{loc.address}</div>
                        {(loc.tankInfo || loc.serviceSchedule) && (
                          <div className="flex gap-1 mt-1 flex-wrap">
                            {loc.tankInfo?.type && (
                              <Badge variant="outline" className="text-[10px] px-1 py-0">
                                {loc.tankInfo.gallons}gal {loc.tankInfo.type}
                              </Badge>
                            )}
                            {loc.serviceSchedule?.frequency && (
                              <Badge variant="outline" className="text-[10px] px-1 py-0">
                                {loc.serviceSchedule.frequency}
                              </Badge>
                            )}
                            {loc.priority && (
                              <Badge variant={loc.priority === 'high' ? 'destructive' : 'secondary'} className="text-[10px] px-1 py-0">
                                {loc.priority}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setLocations((prev) => prev.filter((l) => l.id !== loc.id))}
                      >
                        ×
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-center gap-2 py-2">
                <Badge variant="secondary" className="text-xs">
                  {locations.length} location{locations.length !== 1 ? "s" : ""} added
                </Badge>
              </div>

              <div className="flex gap-2 pt-4">
                <Button variant="outline" onClick={() => setStep("homebase")} className="flex-1">
                  Back
                </Button>
                <Button onClick={() => setStep("done")} className="flex-1">
                  {locations.length > 0 ? "Continue" : "Skip for now"} <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </>
        )}

        {step === "done" && (
          <>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
                <Sparkles className="h-8 w-8 text-green-500" />
              </div>
              <CardTitle>You're All Set!</CardTitle>
              <CardDescription>
                {locations.length > 0
                  ? `${locations.length} locations ready to optimize`
                  : "Add locations anytime from the map"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-lg bg-muted/50 text-center">
                <p className="text-sm text-muted-foreground">
                  Pro tip: Click anywhere on the map or use the search bar to add new service locations
                </p>
              </div>
              <Button onClick={handleComplete} className="w-full h-12">
                <Fish className="mr-2 h-5 w-5" />
                Start Using Snail Trail
              </Button>
            </CardContent>
          </>
        )}
      </Card>
    </div>
  );
}
