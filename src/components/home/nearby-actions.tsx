"use client";

import { LocateFixed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LocationSelector } from "@/components/discovery/location-selector";
import { useUserLocation } from "@/components/providers/app-providers";

export function NearbyActions() {
  const { locateMe, locating } = useUserLocation();
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button onClick={() => void locateMe()} loading={locating}>
        {!locating && <LocateFixed aria-hidden="true" />}
        Use my location
      </Button>
      <LocationSelector />
    </div>
  );
}
