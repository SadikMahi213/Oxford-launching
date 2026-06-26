import UserManagement from "./UserManagement.jsx";

export default function KYCRequests(props) {
  return <UserManagement {...props} initialStatusFilter="pending" />;
}