import { Navigate } from "react-router";
import useUserStore from "../store/userStore";

export default function ProtectedRoute({ children }) {
  const { user } = useUserStore();
  // console.log("ProtectedRoute user", user);
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
