export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  fullName: string;
  email: string;
  password: string;
  organizationName?: string;
}

export interface AuthResponse {
  email: string;
  token: string;
  fullName: string;
  tenantId: string;
  organization: string;
  role: string;
  plan: string;
  isSuperAdmin: boolean;
}

export interface UserSession {
  email: string;
  token: string;
  fullName: string;
  tenantId: string;
  organization: string;
  role: string;
  plan: string;
  isSuperAdmin: boolean;
}
