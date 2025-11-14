import { ReactNode } from "react";
import { NavLink } from "./NavLink";
import { Home, Map, Trophy, User } from "lucide-react";

interface MainLayoutProps {
  children: ReactNode;
}

const MainLayout = ({ children }: MainLayoutProps) => {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center">
          {/* Logo */}
          <NavLink
            to="/home"
            className="flex items-center gap-2 mr-6 text-lg font-bold hover:text-primary transition-colors"
          >
            FixMyBlock
          </NavLink>

          {/* Navigation Links */}
          <nav className="flex items-center gap-6 text-sm flex-1">
            <NavLink
              to="/home"
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
              activeClassName="text-foreground font-medium"
            >
              <Home className="h-4 w-4" />
              <span className="hidden sm:inline">Feed</span>
            </NavLink>

            <NavLink
              to="/map"
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
              activeClassName="text-foreground font-medium"
            >
              <Map className="h-4 w-4" />
              <span className="hidden sm:inline">Map</span>
            </NavLink>

            <NavLink
              to="/leaderboard"
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
              activeClassName="text-foreground font-medium"
            >
              <Trophy className="h-4 w-4" />
              <span className="hidden sm:inline">Leaderboard</span>
            </NavLink>

            <NavLink
              to="/profile"
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
              activeClassName="text-foreground font-medium"
            >
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Profile</span>
            </NavLink>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
};

export default MainLayout;
