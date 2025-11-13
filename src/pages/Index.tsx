import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const Index = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center space-y-6">
        <h1 className="mb-4 text-4xl font-bold">FixMyBlock</h1>
        <p className="text-xl text-muted-foreground">
          Gamified 311-style civic reporting app
        </p>
        <div className="flex gap-4 justify-center">
          <Link to="/home">
            <Button>Launch App</Button>
          </Link>
          <Link to="/admin">
            <Button variant="outline">View Admin Panel</Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Index;
