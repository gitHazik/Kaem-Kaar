import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowRight, MapPin, LocateFixed, LayoutGrid } from "lucide-react";
import { toast } from "sonner";
import AppShell from "@/components/AppShell";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import { CATEGORY_OPTIONS, normalizeCategory } from "@/lib/categories";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const DEFAULT_COORDS = { lat: 34.0837, lng: 74.7973 };

const CATEGORIES = CATEGORY_OPTIONS;

const DraggableMarker = ({ coords, setCoords }) => {
  useMapEvents({
    click(e) {
      setCoords({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });

  return (
    <Marker
      position={[coords.lat, coords.lng]}
      draggable
      eventHandlers={{
        dragend(e) {
          const { lat, lng } = e.target.getLatLng();
          setCoords({ lat, lng });
        },
      }}
    />
  );
};

const PostJobPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [location, setLocation] = useState("");
  const [date, setDate] = useState("");
  const [pay, setPay] = useState("");
  const [loading, setLoading] = useState(false);
  const [coords, setCoords] = useState(DEFAULT_COORDS);
  const [locating, setLocating] = useState(false);

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation not supported");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
        toast.success("Location updated!");
      },
      () => {
        toast.error("Could not get your location");
        setLocating(false);
      }
    );
  };

  const handlePost = async () => {
    if (!title || !location || !pay || !date || !category) {
      toast.error("Please fill all required fields");
      return;
    }
    if (!user) return;
    setLoading(true);

    const normalizedCategory = normalizeCategory(category);
    const basePayload = {
      hirer_id: user.id,
      title,
      description,
      location_name: location,
      latitude: coords.lat,
      longitude: coords.lng,
      pay_amount: Number(pay),
      job_date: date,
      status: "open",
    };

    const { error } = await supabase.from("jobs").insert({
      ...basePayload,
      category: normalizedCategory,
    });

    let insertError = error;
    if (error?.message?.includes("column") && error.message.includes("category")) {
      const { error: fallbackError } = await supabase.from("jobs").insert(basePayload);
      insertError = fallbackError;
    }

    setLoading(false);
    if (insertError) {
      toast.error(insertError.message);
    } else {
      toast.success("Job posted!");
      navigate("/");
    }
  };

  return (
    <AppShell header={<h2 className="font-bold text-foreground">Post a Job</h2>}>
      <div className="px-4 py-6 space-y-5">
        
        {/* General Category Selection */}
        <div className="space-y-1">
          <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1">
            <LayoutGrid size={12} /> Work Category
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full h-14 rounded-xl border border-input bg-card px-4 text-sm font-bold text-foreground outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="">Select Category...</option>
            {CATEGORIES.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Job Title
          </label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="h-14 rounded-xl font-medium"
            placeholder="e.g. Help with house cleaning"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Description
          </label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="rounded-xl min-h-[100px] font-medium"
            placeholder="Tell the worker what you need..."
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Area / Landmark
          </label>
          <Input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="h-14 rounded-xl font-medium"
            placeholder="e.g. Near Khyber Hospital"
          />
        </div>

        {/* Location Mapping */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Pin Exact Location
            </label>
            <button
              type="button"
              onClick={handleUseMyLocation}
              disabled={locating}
              className="flex items-center gap-1.5 text-xs font-bold text-primary"
            >
              <LocateFixed size={13} />
              {locating ? "Locating..." : "Use my location"}
            </button>
          </div>

          <div className="h-48 w-full rounded-2xl overflow-hidden border border-border relative z-0">
            <MapContainer
              center={[coords.lat, coords.lng]}
              zoom={14}
              style={{ height: "100%", width: "100%" }}
              key={`${coords.lat}-${coords.lng}`}
            >
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <DraggableMarker coords={coords} setCoords={setCoords} />
            </MapContainer>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Date
            </label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-14 rounded-xl [&::-webkit-calendar-picker-indicator]:invert"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Pay (₹)
            </label>
            <Input
              type="number"
              value={pay}
              onChange={(e) => setPay(e.target.value)}
              className="h-14 rounded-xl"
              placeholder="0.00"
            />
          </div>
        </div>

        <Button
          onClick={handlePost}
          disabled={loading}
          className="w-full h-14 rounded-xl text-base font-black"
        >
          {loading ? "Posting..." : "Confirm & Post"}
          {!loading && <ArrowRight className="ml-2" size={18} />}
        </Button>
      </div>
    </AppShell>
  );
};

export default PostJobPage;