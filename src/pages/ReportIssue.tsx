import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, MapPin, ArrowLeft, Camera, Eye, Sparkles, Facebook, Twitter, Instagram, Share2, Shield } from "lucide-react";

const REPORT_TYPES = [
  { value: "animals", label: "Animals" },
  { value: "broken_light", label: "Broken Light" },
  { value: "consumer_employee_protection", label: "Consumer & Employee Protection" },
  { value: "covid_19_assistance", label: "COVID-19 Assistance" },
  { value: "disabilities", label: "Disabilities" },
  { value: "flooding", label: "Flooding" },
  { value: "garbage_recycling", label: "Garbage & Recycling" },
  { value: "health", label: "Health" },
  { value: "home_buildings", label: "Home & Buildings" },
  { value: "other", label: "Other" },
  { value: "parks_trees_environment", label: "Parks, Trees & Environment" },
  { value: "pothole", label: "Pothole" },
  { value: "public_safety", label: "Public Safety" },
  { value: "seniors", label: "Seniors" },
  { value: "trash", label: "Trash" },
  { value: "transportation_streets", label: "Transportation & Streets" }
];

const SEVERITY_LEVELS = [
  { value: "low", label: "Low — nuisance or cosmetic issue" },
  { value: "medium", label: "Medium — impacts daily life" },
  { value: "high", label: "High — urgent safety concern" },
];

type Severity = "low" | "medium" | "high";

const ReportIssue = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [analyzingPhoto, setAnalyzingPhoto] = useState(false);
  const [blocks, setBlocks] = useState<any[]>([]);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>("");
  const [useManualLocation, setUseManualLocation] = useState(false);
  const [aiSuggested, setAiSuggested] = useState(false);
  const [forwardToCivicBodies, setForwardToCivicBodies] = useState(true);
  const [shareToSocial, setShareToSocial] = useState(true);

  const [formData, setFormData] = useState({
    type: "",
    severity: "medium" as Severity,
    description: "",
    lat: "",
    lng: "",
    block_id: "",
  });

  useEffect(() => {
    checkAuth();
    fetchBlocks();
    getCurrentLocation();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }
  };

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
          const lat = position.coords.latitude.toFixed(6);
          const lng = position.coords.longitude.toFixed(6);
          setFormData(prev => ({
            ...prev,
            lat,
            lng,
          }));
          // Auto-detect block based on location
          detectBlock(parseFloat(lat), parseFloat(lng));
          toast({
            title: "Location found",
            description: "Using your current location",
          });
        },
        (error) => {
          console.error("Geolocation error:", error);
          setUseManualLocation(true);
          // Default to Chicago coordinates
          const chicagoLat = "41.8781";
          const chicagoLng = "-87.6298";
          setFormData(prev => ({
            ...prev,
            lat: chicagoLat,
            lng: chicagoLng,
          }));
          detectBlock(parseFloat(chicagoLat), parseFloat(chicagoLng));
        }
      );
    } else {
      setUseManualLocation(true);
      const chicagoLat = "41.8781";
      const chicagoLng = "-87.6298";
      setFormData(prev => ({
        ...prev,
        lat: chicagoLat,
        lng: chicagoLng,
      }));
      detectBlock(parseFloat(chicagoLat), parseFloat(chicagoLng));
    }
  };

  const detectBlock = async (lat: number, lng: number) => {
    // Auto-detect Chicago block/neighborhood based on coordinates
    if (blocks.length === 0) return;

    // More accurate Chicago neighborhood boundaries
    let detectedBlock;
    
    // The Loop (Downtown) - 41.8781 to 41.8881, -87.6398 to -87.6238
    if (lat >= 41.8781 && lat <= 41.8881 && lng >= -87.6398 && lng <= -87.6238) {
      detectedBlock = blocks.find(b => b.slug === "loop");
    }
    // River North - 41.8881 to 41.9000, -87.6398 to -87.6238
    else if (lat >= 41.8881 && lat <= 41.9000 && lng >= -87.6398 && lng <= -87.6238) {
      detectedBlock = blocks.find(b => b.slug === "river-north");
    }
    // Lincoln Park - 41.9000 to 41.9300, -87.6600 to -87.6300
    else if (lat >= 41.9000 && lat <= 41.9300 && lng >= -87.6600 && lng <= -87.6300) {
      detectedBlock = blocks.find(b => b.slug === "lincoln-park");
    }
    // Wicker Park - 41.9050 to 41.9200, -87.6900 to -87.6650
    else if (lat >= 41.9050 && lat <= 41.9200 && lng >= -87.6900 && lng <= -87.6650) {
      detectedBlock = blocks.find(b => b.slug === "wicker-park");
    }
    // Logan Square - 41.9200 to 41.9350, -87.7100 to -87.6800
    else if (lat >= 41.9200 && lat <= 41.9350 && lng >= -87.7100 && lng <= -87.6800) {
      detectedBlock = blocks.find(b => b.slug === "logan-square");
    }
    // West Loop - 41.8750 to 41.8900, -87.6650 to -87.6398
    else if (lat >= 41.8750 && lat <= 41.8900 && lng >= -87.6650 && lng <= -87.6398) {
      detectedBlock = blocks.find(b => b.slug === "west-loop");
    }
    // Gold Coast - 41.8900 to 41.9150, -87.6350 to -87.6200
    else if (lat >= 41.8900 && lat <= 41.9150 && lng >= -87.6350 && lng <= -87.6200) {
      detectedBlock = blocks.find(b => b.slug === "gold-coast");
    }
    // Old Town - 41.9050 to 41.9200, -87.6450 to -87.6300
    else if (lat >= 41.9050 && lat <= 41.9200 && lng >= -87.6450 && lng <= -87.6300) {
      detectedBlock = blocks.find(b => b.slug === "old-town");
    }
    // Lakeview - 41.9300 to 41.9550, -87.6600 to -87.6400
    else if (lat >= 41.9300 && lat <= 41.9550 && lng >= -87.6600 && lng <= -87.6400) {
      detectedBlock = blocks.find(b => b.slug === "lakeview");
    }
    // South Loop - 41.8550 to 41.8750, -87.6398 to -87.6200
    else if (lat >= 41.8550 && lat <= 41.8750 && lng >= -87.6398 && lng <= -87.6200) {
      detectedBlock = blocks.find(b => b.slug === "south-loop");
    }
    // Pilsen - 41.8450 to 41.8650, -87.6800 to -87.6500
    else if (lat >= 41.8450 && lat <= 41.8650 && lng >= -87.6800 && lng <= -87.6500) {
      detectedBlock = blocks.find(b => b.slug === "pilsen");
    }
    // Bridgeport - 41.8300 to 41.8500, -87.6600 to -87.6350
    else if (lat >= 41.8300 && lat <= 41.8500 && lng >= -87.6600 && lng <= -87.6350) {
      detectedBlock = blocks.find(b => b.slug === "bridgeport");
    }
    // Hyde Park - 41.7850 to 41.8050, -87.6100 to -87.5850
    else if (lat >= 41.7850 && lat <= 41.8050 && lng >= -87.6100 && lng <= -87.5850) {
      detectedBlock = blocks.find(b => b.slug === "hyde-park");
    }
    // Andersonville - 41.9750 to 41.9900, -87.6700 to -87.6550
    else if (lat >= 41.9750 && lat <= 41.9900 && lng >= -87.6700 && lng <= -87.6550) {
      detectedBlock = blocks.find(b => b.slug === "andersonville");
    }
    // Uptown - 41.9600 to 41.9750, -87.6650 to -87.6500
    else if (lat >= 41.9600 && lat <= 41.9750 && lng >= -87.6650 && lng <= -87.6500) {
      detectedBlock = blocks.find(b => b.slug === "uptown");
    }

    // Fallback to nearest block or first one
    if (!detectedBlock) {
      detectedBlock = blocks[0];
    }

    if (detectedBlock && detectedBlock.id !== formData.block_id) {
      setFormData(prev => ({
        ...prev,
        block_id: detectedBlock.id,
      }));
      toast({
        title: "📍 Block detected",
        description: `Assigned to ${detectedBlock.name}`,
      });
    }
  };

  // Re-detect block when lat/lng changes
  useEffect(() => {
    if (formData.lat && formData.lng && blocks.length > 0) {
      const lat = parseFloat(formData.lat);
      const lng = parseFloat(formData.lng);
      if (!isNaN(lat) && !isNaN(lng)) {
        detectBlock(lat, lng);
      }
    }
  }, [formData.lat, formData.lng, blocks]);

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Image = reader.result as string;
        setPhotoPreview(base64Image);
        
        // Automatically analyze the photo with AI
        await analyzePhotoWithAI(base64Image);
      };
      reader.readAsDataURL(file);
    }
  };

  const analyzePhotoWithAI = async (imageData: string) => {
    setAnalyzingPhoto(true);
    try {
      toast({
        title: "Analyzing photo...",
        description: "AI is analyzing your image",
      });

      const { data, error } = await supabase.functions.invoke(
        "suggest-report-fields",
        {
          body: { imageData },
        }
      );

      if (error) throw error;

      if (data.success) {
        // Auto-fill the form with AI suggestions
        setFormData(prev => ({
          ...prev,
          type: data.category || prev.type,
          severity: (data.severity as Severity) || prev.severity,
          description: data.short_description || prev.description,
        }));
        
        setAiSuggested(true);
        
        toast({
          title: "AI analysis complete!",
          description: "We've suggested a category, severity, and description",
        });
      } else {
        console.error("AI analysis failed:", data.error);
        toast({
          title: "Analysis unavailable",
          description: "Please fill the form manually",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Error analyzing photo:", error);
      toast({
        title: "Analysis failed",
        description: "Please fill the form manually",
        variant: "destructive",
      });
    } finally {
      setAnalyzingPhoto(false);
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
      // Get current authenticated user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Authentication required",
          description: "Please log in to submit a report",
          variant: "destructive",
        });
        navigate("/auth");
        return;
      }

      const userId = user.id;

      // Upload photo
      const photoUrl = await uploadPhoto(userId);

      if (!photoUrl) {
        throw new Error("Failed to upload photo");
      }

      // Create report with AI metadata if available
      const reportData: any = {
        type: formData.type,
        description: formData.description || null,
        lat: parseFloat(formData.lat),
        lng: parseFloat(formData.lng),
        block_id: formData.block_id,
        created_by: userId,
        status: "open",
        photo_url: photoUrl,
      };

      const metadata: Record<string, any> = {
        forward_to_civic_bodies: forwardToCivicBodies,
        share_to_social: shareToSocial,
        social_channels: shareToSocial ? ["twitter", "facebook", "instagram"] : [],
        user_selected_severity: formData.severity,
        severity: formData.severity,
      };

      if (aiSuggested) {
        metadata.ai_suggested = true;
        metadata.suggested_at = new Date().toISOString();
      }

      reportData.ai_metadata = metadata;

      const { data: report, error: reportError } = await supabase
        .from("reports")
        .insert(reportData)
        .select()
        .single();

      if (reportError) throw reportError;

      // Call edge function to enrich with detailed AI analysis (non-blocking)
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
              {/* AI Suggestion Banner */}
              {aiSuggested && (
                <Alert className="bg-primary/10 border-primary/20">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <AlertDescription>
                    <Eye className="h-4 w-4 inline mr-1" />
                    We analyzed your photo and suggested a category, severity, and description. You can edit these before submitting.
                  </AlertDescription>
                </Alert>
              )}

              {/* Photo Upload */}
              <div className="space-y-2">
                <Label htmlFor="photo">Photo *</Label>
                <div className="flex flex-col gap-3">
                  {photoPreview && (
                    <div className="relative">
                      <img
                        src={photoPreview}
                        alt="Preview"
                        className="w-full h-48 object-cover rounded-lg border"
                      />
                      {analyzingPhoto && (
                        <div className="absolute inset-0 bg-background/80 flex items-center justify-center rounded-lg">
                          <div className="text-center">
                            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
                            <p className="text-sm font-medium">Analyzing photo...</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="relative">
                      <Input
                        id="photo-upload"
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoChange}
                        className="cursor-pointer"
                      />
                      <Upload className="absolute right-3 top-3 h-4 w-4 text-muted-foreground pointer-events-none" />
                    </div>
                    <div className="relative">
                      <Input
                        id="photo-camera"
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handlePhotoChange}
                        className="cursor-pointer"
                      />
                      <Camera className="absolute right-3 top-3 h-4 w-4 text-muted-foreground pointer-events-none" />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Upload a photo or take one with your camera
                  </p>
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
                  disabled={analyzingPhoto}
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

              {/* Severity */}
              <div className="space-y-2">
                <Label htmlFor="severity">Severity *</Label>
                <Select
                  value={formData.severity}
                  onValueChange={(value) =>
                    setFormData({ ...formData, severity: value as Severity })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select severity" />
                  </SelectTrigger>
                  <SelectContent>
                    {SEVERITY_LEVELS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
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
                  disabled={analyzingPhoto}
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

              {/* Follow-up actions */}
              <div className="space-y-4 rounded-lg border p-4 bg-muted/30">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="forward-to-civic"
                    checked={forwardToCivicBodies}
                    onCheckedChange={(checked) =>
                      setForwardToCivicBodies(checked === true)
                    }
                  />
                  <div>
                    <Label htmlFor="forward-to-civic" className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-primary" />
                      Validate & notify civic bodies
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      We&apos;ll validate this report and forward it to the right department.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Checkbox
                    id="share-social"
                    checked={shareToSocial}
                    onCheckedChange={(checked) =>
                      setShareToSocial(checked === true)
                    }
                  />
                  <div className="flex-1 flex items-center justify-between gap-3">
                    <Label htmlFor="share-social" className="flex items-center gap-2">
                      <Share2 className="h-4 w-4 text-primary" />
                      Post on my connected social accounts
                    </Label>
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <Twitter className="h-4 w-4" />
                      <Facebook className="h-4 w-4" />
                      <Instagram className="h-4 w-4" />
                    </div>
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
