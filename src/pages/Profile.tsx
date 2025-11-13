import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const Profile = () => {
  const navigate = useNavigate();

  return (
    <div className="container mx-auto py-8">
      <Button variant="ghost" onClick={() => navigate("/")} className="mb-4">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Home
      </Button>
      <h1 className="text-3xl font-bold">Profile</h1>
      <p className="text-muted-foreground mt-2">
        Profile page coming soon...
      </p>
    </div>
  );
};

export default Profile;
