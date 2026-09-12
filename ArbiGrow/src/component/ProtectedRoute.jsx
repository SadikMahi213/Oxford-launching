import { Navigate } from "react-router";
import useUserStore from "../store/userStore";

export default function ProtectedRoute({ children }) {
  const { user, booted } = useUserStore();
  // console.log("ProtectedRoute user", user);
  // While the boot probe settles (refresh cookie → session restore), hold a
  // loading state instead of bouncing to /login — otherwise every page
  // refresh logs the user out visually even with a live session.
  if (!booted) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#0a0e27] text-white">
        Loading…
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
