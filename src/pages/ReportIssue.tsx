import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, MapPin, ArrowLeft } from "lucide-react";

const REPORT_TYPES = [
  { value: "pothole", label: "Pothole" },
  { value: "broken_light", label: "Broken Light" },
  { value: "trash", label: "Trash" },
  { value: "flooding", label: "Flooding" },
  { value: "other", label: "Other" },
];

const ReportIssue = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [blocks, setBlocks] = useState<any[]>([]);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>("");
  const [useManualLocation, setUseManualLocation] = useState(false);

  const [formData, setFormData] = useState({
    type: "",
    description: "",
    lat: "",
    lng: "",
    block_id: "",
  });

  useEffect(() => {
    fetchBlocks();
    getCurrentLocation();
  }, []);

  const fetchBlocks = async () => {
    const { data, error } = await supabase
      .from("blocks")
      .select("*")
      .order("name");
    
    if (error) {
      console.error("Error fetching blocks:", error);
      toast({
        title: "Error",
        description: "Failed to load blocks",
        variant: "destructive",
      });
    } else {
      setBlocks(data || []);
    }
  };

  const getCurrentLocation = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData(prev => ({
            ...prev,
            lat: position.coords.latitude.toFixed(6),
            lng: position.coords.longitude.toFixed(6),
          }));
          toast({
            title: "Location found",
            description: "Using your current location",
          });
        },
        (error) => {
          console.error("Geolocation error:", error);
          setUseManualLocation(true);
          // Default to NYC coordinates
          setFormData(prev => ({
            ...prev,
            lat: "40.758",
            lng: "-73.985",
          }));
        }
      );
    } else {
      setUseManualLocation(true);
      setFormData(prev => ({
        ...prev,
        lat: "40.758",
        lng: "-73.985",
      }));
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadPhoto = async (userId: string): Promise<string | null> => {
    if (!photoFile) return null;

    const fileExt = photoFile.name.split(".").pop();
    const fileName = `${userId}/${Date.now()}.${fileExt}`;

    const { error: uploadError, data } = await supabase.storage
      .from("report-photos")
      .upload(fileName, photoFile);

    if (uploadError) {
      console.error("Upload error:", uploadError);
      throw uploadError;
    }

    const { data: { publicUrl } } = supabase.storage
      .from("report-photos")
      .getPublicUrl(fileName);

    return publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.type || !formData.block_id || !photoFile) {
      toast({
        title: "Missing fields",
        description: "Please fill in all required fields including a photo",
        variant: "destructive",
      });
      return;
    }

    if (!formData.lat || !formData.lng) {
      toast({
        title: "Location required",
        description: "Please provide a location",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Authentication required",
          description: "Please sign in to report an issue",
          variant: "destructive",
        });
        navigate("/");
        return;
      }

      // Upload photo
      const photoUrl = await uploadPhoto(user.id);

      if (!photoUrl) {
        throw new Error("Failed to upload photo");
      }

      // Create report
      const { data: report, error: reportError } = await supabase
        .from("reports")
        .insert({
          type: formData.type,
          description: formData.description || null,
          lat: parseFloat(formData.lat),
          lng: parseFloat(formData.lng),
          block_id: formData.block_id,
          created_by: user.id,
          status: "open",
          photo_url: photoUrl,
        })
        .select()
        .single();

      if (reportError) throw reportError;

      // Call edge function to enrich with OpenAI (non-blocking)
      supabase.functions
        .invoke("enrich-report", {
          body: { reportId: report.id },
        })
        .catch((error) => {
          console.error("Error enriching report:", error);
          // Don't block user flow if enrichment fails
        });

      toast({
        title: "Report submitted!",
        description: "Thank you for helping improve your community",
      });

      navigate(`/confirmation/${report.id}`);
    } catch (error: any) {
      console.error("Error creating report:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to submit report",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto">
        <Button
          variant="ghost"
          className="mb-4"
          onClick={() => navigate("/home")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Home
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>Report an Issue</CardTitle>
            <CardDescription>
              Help improve your community by reporting issues in your neighborhood
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Photo Upload */}
              <div className="space-y-2">
                <Label htmlFor="photo">Photo *</Label>
                <div className="flex flex-col gap-2">
                  {photoPreview && (
                    <img
                      src={photoPreview}
                      alt="Preview"
                      className="w-full h-48 object-cover rounded-lg border"
                    />
                  )}
                  <div className="relative">
                    <Input
                      id="photo"
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoChange}
                      className="cursor-pointer"
                    />
                    <Upload className="absolute right-3 top-3 h-4 w-4 text-muted-foreground pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Issue Type */}
              <div className="space-y-2">
                <Label htmlFor="type">Issue Type *</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) =>
                    setFormData({ ...formData, type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select issue type" />
                  </SelectTrigger>
                  <SelectContent>
                    {REPORT_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Block Selection */}
              <div className="space-y-2">
                <Label htmlFor="block">Block *</Label>
                <Select
                  value={formData.block_id}
                  onValueChange={(value) =>
                    setFormData({ ...formData, block_id: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select block" />
                  </SelectTrigger>
                  <SelectContent>
                    {blocks.map((block) => (
                      <SelectItem key={block.id} value={block.id}>
                        {block.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea
                  id="description"
                  placeholder="Provide additional details about the issue..."
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  rows={4}
                />
              </div>

              {/* Location */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Location *</Label>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4 mr-1" />
                    {useManualLocation ? "Manual" : "Auto-detected"}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="lat" className="text-xs text-muted-foreground">
                      Latitude
                    </Label>
                    <Input
                      id="lat"
                      type="number"
                      step="0.000001"
                      value={formData.lat}
                      onChange={(e) =>
                        setFormData({ ...formData, lat: e.target.value })
                      }
                      placeholder="40.758"
                    />
                  </div>
                  <div>
                    <Label htmlFor="lng" className="text-xs text-muted-foreground">
                      Longitude
                    </Label>
                    <Input
                      id="lng"
                      type="number"
                      step="0.000001"
                      value={formData.lng}
                      onChange={(e) =>
                        setFormData({ ...formData, lng: e.target.value })
                      }
                      placeholder="-73.985"
                    />
                  </div>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit Report"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ReportIssue;
