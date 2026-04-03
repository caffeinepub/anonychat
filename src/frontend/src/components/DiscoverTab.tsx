import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, MessageSquare, Navigation, Share2, Users } from "lucide-react";
import { motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  type PublicUserProfile,
  useListPublicUsers,
  useUpdateLocation,
} from "../hooks/useQueries";
import { SecretRooms } from "./SecretRooms";

function StatusDot({ online }: { online: boolean }) {
  return (
    <span
      className={`inline-block rounded-full w-2 h-2 flex-shrink-0 ${
        online
          ? "bg-[oklch(0.72_0.18_145)] online-pulse"
          : "bg-muted-foreground/30"
      }`}
    />
  );
}

function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371; // km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)}m`;
  if (km < 10) return `${km.toFixed(1)}km`;
  return `${Math.round(km)}km`;
}

// UserRow is defined at module scope to prevent remounting on every DiscoverTab re-render
interface UserRowItem {
  anonymousId: string;
  isOnline: boolean;
  username?: string | null;
  distance: number | null;
  lat?: number | null;
  lon?: number | null;
}

function UserRow({
  user,
  idx,
  showDist,
  onStartChat,
}: {
  user: UserRowItem;
  idx: number;
  showDist: boolean;
  onStartChat: (anonId: string) => void;
}) {
  return (
    <motion.div
      key={user.anonymousId}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.04 }}
      className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border hover:border-primary/20 transition-colors cursor-pointer active:bg-muted/30"
      onClick={() => onStartChat(user.anonymousId)}
      data-ocid={`discover.item.${idx + 1}`}
    >
      <StatusDot online={user.isOnline} />
      <div className="flex-1 min-w-0">
        <div className="font-mono text-xs text-primary truncate">
          {user.anonymousId}
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          {user.username && (
            <span className="text-xs text-muted-foreground truncate">
              {user.username}
            </span>
          )}
          {showDist && user.distance !== null && (
            <span className="text-[10px] text-[oklch(0.72_0.18_145)] flex items-center gap-0.5">
              <MapPin className="w-2.5 h-2.5" />
              {formatDistance(user.distance)}
            </span>
          )}
        </div>
      </div>
      <Button
        size="sm"
        variant="ghost"
        onClick={(e) => {
          e.stopPropagation();
          onStartChat(user.anonymousId);
        }}
        className="h-7 px-2.5 text-xs text-primary hover:bg-primary/10 flex-shrink-0 gap-1"
        data-ocid="discover.button"
      >
        <MessageSquare className="w-3 h-3" />
        Chat
      </Button>
    </motion.div>
  );
}

export function DiscoverTab({
  myAnonId,
  onStartChat,
}: {
  myAnonId: string;
  onStartChat: (anonId: string) => void;
}) {
  const { data: users, isLoading } = useListPublicUsers();
  const updateLocation = useUpdateLocation();
  const [myLocation, setMyLocation] = useState<{
    lat: number;
    lon: number;
  } | null>(null);
  const [showSecretRooms, setShowSecretRooms] = useState(false);
  const [locationStatus, setLocationStatus] = useState<
    "idle" | "fetching" | "granted" | "denied"
  >("idle");
  const locationFetchedRef = useRef(false);

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      toast.error("Konum desteklenmiyor");
      return;
    }
    setLocationStatus("fetching");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setMyLocation({ lat: latitude, lon: longitude });
        setLocationStatus("granted");
        updateLocation.mutate({ lat: latitude, lon: longitude });
        toast.success("Konum tespit edildi!", { duration: 2000 });
      },
      () => {
        setLocationStatus("denied");
        toast.error("Konum izni reddedildi");
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }, [updateLocation]);

  // Auto-request location on mount once
  useEffect(() => {
    if (locationFetchedRef.current) return;
    locationFetchedRef.current = true;
    // Check if permission already granted, then auto-fetch
    if (navigator.permissions) {
      navigator.permissions
        .query({ name: "geolocation" })
        .then((result) => {
          if (result.state === "granted") {
            requestLocation();
          }
        })
        .catch(() => {
          // permission API not available, skip auto-fetch
        });
    }
  }, [requestLocation]);

  const filtered = (users ?? [])
    .filter((u) => u.anonymousId !== myAnonId)
    .slice(0, 50);

  // Sort: nearby first (if we have location), then online, then offline
  const withDistance = filtered.map((u) => ({
    ...u,
    distance:
      myLocation && u.lat != null && u.lon != null
        ? haversineDistance(myLocation.lat, myLocation.lon, u.lat, u.lon)
        : null,
  }));

  const nearby = withDistance
    .filter((u) => u.distance !== null && u.distance <= 50)
    .sort((a, b) => (a.distance ?? 999) - (b.distance ?? 999));

  const others = withDistance
    .filter((u) => u.distance === null || u.distance > 50)
    .sort((a, b) => (b.isOnline ? 1 : 0) - (a.isOnline ? 1 : 0));

  const onlineCount = filtered.filter((u) => u.isOnline).length;

  if (showSecretRooms) {
    return <SecretRooms onBack={() => setShowSecretRooms(false)} />;
  }

  return (
    <div className="flex flex-col h-full max-w-md mx-auto w-full">
      {/* Header */}
      <div className="px-4 pt-5 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-primary" />
          <span className="font-semibold tracking-tight">Discover</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="text-xs border-[oklch(0.72_0.18_145_/30%)] text-[oklch(0.72_0.18_145)] bg-[oklch(0.72_0.18_145_/10%)] font-mono"
            data-ocid="discover.panel"
          >
            {onlineCount} online
          </Badge>
          {locationStatus !== "granted" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={requestLocation}
              disabled={locationStatus === "fetching"}
              className="h-7 px-2 text-xs text-muted-foreground hover:text-primary gap-1"
              data-ocid="discover.location_button"
            >
              <Navigation
                className={`w-3 h-3 ${locationStatus === "fetching" ? "animate-pulse" : ""}`}
              />
              {locationStatus === "fetching"
                ? "Tespit ediliyor..."
                : "Yakındakileri Bul"}
            </Button>
          )}
          {locationStatus === "granted" && (
            <span className="text-[10px] text-[oklch(0.72_0.18_145)] flex items-center gap-1">
              <MapPin className="w-3 h-3" /> Konum aktif
            </span>
          )}
        </div>
      </div>

      {/* Secret Rooms entry */}
      <div className="px-4 pb-2">
        <button
          type="button"
          onClick={() => setShowSecretRooms(true)}
          className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-muted/30 border border-border text-sm text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all"
          data-ocid="discover.secondary_button"
        >
          🔐 <span className="font-medium">Gizli Odalar</span>
          <span className="text-[10px] text-muted-foreground ml-auto">
            Davetli anonim odalar →
          </span>
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-4 space-y-2 pb-4">
        {isLoading ? (
          <div data-ocid="discover.loading_state" className="space-y-2 pt-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border"
              >
                <Skeleton className="w-2 h-2 rounded-full bg-white/10 flex-shrink-0" />
                <Skeleton className="h-3 w-32 bg-white/10" />
                <Skeleton className="h-3 w-16 bg-white/10 ml-auto" />
                <Skeleton className="h-7 w-16 bg-white/10" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-20 text-muted-foreground"
            data-ocid="discover.empty_state"
          >
            <div className="text-4xl mb-3">🌐</div>
            <p className="text-sm font-medium">Henüz kimse yok.</p>
            <p className="text-xs mt-1 text-center px-8">
              ID'ni paylaş, arkadaşlarını davet et!
            </p>
          </motion.div>
        ) : (
          <>
            {locationStatus === "granted" && nearby.length === 0 && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 p-3 rounded-xl bg-[oklch(0.13_0_0)] border border-border mb-1"
              >
                <MapPin className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                <p className="text-xs text-muted-foreground">
                  50km içinde kullanıcı bulunamadı. Yakındaki arkadaşların da
                  konumunu paylaşması gerekiyor.
                </p>
              </motion.div>
            )}
            {nearby.length > 0 && (
              <>
                <div className="flex items-center gap-2 py-2">
                  <MapPin className="w-3 h-3 text-[oklch(0.72_0.18_145)]" />
                  <span className="text-xs font-medium text-[oklch(0.72_0.18_145)]">
                    Yakınındakiler (50km)
                  </span>
                </div>
                {nearby.map((user, idx) => (
                  <UserRow
                    key={user.anonymousId}
                    user={user}
                    idx={idx}
                    showDist={true}
                    onStartChat={onStartChat}
                  />
                ))}
                {others.length > 0 && (
                  <div className="flex items-center gap-2 pt-2 pb-1">
                    <Users className="w-3 h-3 text-muted-foreground" />
                    <span className="text-xs font-medium text-muted-foreground">
                      Diğer Kullanıcılar
                    </span>
                  </div>
                )}
              </>
            )}
            {others.map((user, idx) => (
              <UserRow
                key={user.anonymousId}
                user={user}
                idx={idx + nearby.length}
                showDist={false}
                onStartChat={onStartChat}
              />
            ))}
          </>
        )}
      </div>

      {/* Share your ID prompt */}
      {!isLoading && filtered.length > 0 && (
        <div className="px-4 pb-4">
          <div className="flex items-center gap-2 p-3 rounded-xl bg-primary/5 border border-primary/15">
            <Share2 className="w-3.5 h-3.5 text-primary flex-shrink-0" />
            <p className="text-xs text-muted-foreground">
              Herhangi bir kullanıcıya tıklayarak anonim sohbet başlat.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
