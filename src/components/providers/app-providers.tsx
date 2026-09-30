"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { Role, WishlistTarget } from "@/lib/constants";
import { api, ApiError } from "@/lib/api-client";
import { CITIES } from "@/lib/catalog";
import { LOCATION_COOKIE, serializeLocation, type UserLocation } from "@/lib/location";

/* ── Session ─────────────────────────────────────────────── */
export type SessionUser = { id: string; name: string; role: Role; email?: string | null; avatarUrl?: string | null } | null;
const SessionContext = createContext<SessionUser>(null);
export const useSession = () => useContext(SessionContext);

/* ── Location ────────────────────────────────────────────── */
type LocationCtx = {
  location: UserLocation | null;
  setCity: (city: string) => void;
  locateMe: () => Promise<void>;
  locating: boolean;
};
const LocationContext = createContext<LocationCtx | null>(null);
export function useUserLocation() {
  const ctx = useContext(LocationContext);
  if (!ctx) throw new Error("useUserLocation must be used inside <AppProviders>");
  return ctx;
}

/* ── Wishlist ────────────────────────────────────────────── */
type WishlistCtx = {
  isSaved: (type: WishlistTarget, id: string) => boolean;
  toggle: (type: WishlistTarget, id: string, label?: string) => Promise<void>;
};
const WishlistContext = createContext<WishlistCtx | null>(null);
export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error("useWishlist must be used inside <AppProviders>");
  return ctx;
}

export function AppProviders({
  user,
  initialLocation,
  children,
}: {
  user: SessionUser;
  initialLocation: UserLocation | null;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  /* location */
  const [location, setLocation] = useState<UserLocation | null>(initialLocation);
  const [locating, setLocating] = useState(false);
  const persist = useCallback(
    (loc: UserLocation) => {
      setLocation(loc);
      document.cookie = `${LOCATION_COOKIE}=${serializeLocation(loc)}; path=/; max-age=${60 * 60 * 24 * 180}; samesite=lax`;
      startTransition(() => router.refresh());
    },
    [router],
  );
  const setCity = useCallback((city: string) => persist({ city }), [persist]);
  const locateMe = useCallback(async () => {
    if (!("geolocation" in navigator)) {
      toast.error("Location isn't available in this browser");
      return;
    }
    setLocating(true);
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: false, timeout: 10_000, maximumAge: 600_000 }),
      );
      const { latitude: lat, longitude: lng } = pos.coords;
      // Nearest launch city (for city-scoped sections); precise coords drive "near me".
      const nearest = [...CITIES].sort(
        (a, b) => Math.hypot(a.center[0] - lng, a.center[1] - lat) - Math.hypot(b.center[0] - lng, b.center[1] - lat),
      )[0];
      persist({ lat, lng, city: nearest?.name, label: "Current location" });
    } catch {
      toast.error("We couldn't get your location. Please choose a city instead.");
    } finally {
      setLocating(false);
    }
  }, [persist]);

  /* wishlist */
  const [saved, setSaved] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (!user) return;
    api
      .get<{ targetType: WishlistTarget; targetId: string }[]>("/wishlist/ids")
      .then(({ data }) => setSaved(new Set(data.map((d) => `${d.targetType}:${d.targetId}`))))
      .catch(() => undefined);
  }, [user]);

  const isSaved = useCallback((type: WishlistTarget, id: string) => saved.has(`${type}:${id}`), [saved]);
  const toggle = useCallback(
    async (type: WishlistTarget, id: string, label?: string) => {
      if (!user) {
        router.push(`/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
        return;
      }
      const key = `${type}:${id}`;
      const wasSaved = saved.has(key);
      setSaved((s) => {
        const n = new Set(s);
        if (wasSaved) n.delete(key);
        else n.add(key);
        return n;
      });
      try {
        if (wasSaved) await api.del("/wishlist/ids", { targetType: type, targetId: id });
        else await api.post("/wishlist", { targetType: type, targetId: id });
        toast.success(wasSaved ? "Removed from your wishlist" : `Saved${label ? ` ${label}` : ""} to your wishlist`);
      } catch (e) {
        setSaved((s) => {
          const n = new Set(s);
          if (wasSaved) n.add(key);
          else n.delete(key);
          return n;
        });
        toast.error(e instanceof ApiError ? e.message : "Couldn't update your wishlist");
      }
    },
    [user, saved, router],
  );

  const locationValue = useMemo(() => ({ location, setCity, locateMe, locating }), [location, setCity, locateMe, locating]);
  const wishlistValue = useMemo(() => ({ isSaved, toggle }), [isSaved, toggle]);

  return (
    <SessionContext.Provider value={user}>
      <LocationContext.Provider value={locationValue}>
        <WishlistContext.Provider value={wishlistValue}>{children}</WishlistContext.Provider>
      </LocationContext.Provider>
    </SessionContext.Provider>
  );
}
