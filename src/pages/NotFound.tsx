import { Link } from "react-router-dom";

const NotFound = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center animate-fade-in">
        <h1 className="mb-4 text-4xl font-bold text-foreground">404</h1>
        <p className="mb-4 text-xl text-muted-foreground">Page not found</p>
        <Link to="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          Return to Home
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
