export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  fullName: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  email: string;
  token: string;
}

export interface UserSession {
  email: string;
  token: string;
}

