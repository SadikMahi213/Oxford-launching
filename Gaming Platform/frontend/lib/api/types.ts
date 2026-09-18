// Shared types for the gaming platform API.
// These mirror the backend API envelope defined in
// backend/app/Http/Responses/ApiResponse.php.

export interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
  errors: Record<string, string[]> | null;
  meta: Record<string, unknown> | null;
}

export interface User {
  id: number;
  name: string;
  email: string;
  status: "active" | "suspended" | "banned";
  kyc_status: "unverified" | "pending" | "verified" | "rejected";
  roles?: string[];
  email_verified_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  token_type: string;
}

export interface LoginPayload {
  email: string;
  password: string;
  device_name?: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
}

export interface UpdateProfilePayload {
  name?: string;
  email?: string;
}

export interface ChangePasswordPayload {
  current_password: string;
  password: string;
  password_confirmation: string;
}

export interface ForgotPasswordPayload {
  email: string;
}

export interface ResetPasswordPayload {
  email: string;
  token: string;
  password: string;
  password_confirmation: string;
}

export interface PaginationMeta {
  pagination: {
    total: number;
    per_page: number;
    current_page: number;
    last_page: number;
    from: number | null;
    to: number | null;
  };
}
