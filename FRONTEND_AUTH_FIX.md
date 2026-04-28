# Frontend Authentication Fix Prompt

## Problem

The Support API endpoint `GET /api/support/my-tickets` returns **401 Unauthorized** when called from the frontend application at `http://132.145.136.159:5173` to the backend at `http://132.145.136.159:5000`.

## Root Cause

The backend uses **JWT authentication** that works in two ways:

1. **httpOnly cookie** named `Authentication` (set during login)
2. **Authorization header** with `Bearer <token>`

Due to **cross-origin restrictions** (different ports = different origins), cookies with `SameSite=Lax` are **blocked** by browsers. The frontend must explicitly send the JWT token in the `Authorization` header.

## Backend Configuration (Already Set)

- **CORS**: `credentials: true` allows cookies (but not used due to SameSite)
- **JWT Strategy**: Checks both `req.cookies.Authentication` AND `Authorization: Bearer` header
- **Cookie**: `sameSite: 'none'` (set), but still requires `Secure` flag for cross-origin browsers, which won't work on HTTP

## Frontend Solution

### Option 1: Use Authorization Header (Recommended)

Store the JWT token from login and include it in all authenticated API requests.

**Example Implementation (TypeScript/JavaScript):**

```typescript
// auth-service.ts or api-client.ts

class ApiClient {
  private baseUrl = 'http://132.145.136.159:5000/api';
  private token: string | null = null;

  // Login and store token
  async login(email: string, password: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      throw new Error('Login failed');
    }

    const data = await response.json();
    this.token = data.access_token; // Store token in memory or localStorage

    // Optional: also store in localStorage for persistence
    localStorage.setItem('authToken', data.access_token);
  }

  // Load token from storage on app init
  loadToken(): void {
    this.token = localStorage.getItem('authToken');
  }

  // Helper method for authenticated requests
  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    // Add Authorization header if token exists
    if (this.token) {
      (headers as Record<string, string>)['Authorization'] =
        `Bearer ${this.token}`;
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      // Token expired or invalid - redirect to login
      this.logout();
      throw new Error('Unauthorized');
    }

    return response.json();
  }

  // Support API methods
  async getMyTickets() {
    return this.request('/support/my-tickets');
  }

  async createTicket(subject: string, message: string) {
    return this.request('/support', {
      method: 'POST',
      body: JSON.stringify({ subject, message }),
    });
  }

  async getTicketMessages(ticketId: string) {
    return this.request(`/support/${ticketId}/messages`);
  }

  async addMessage(ticketId: string, message: string) {
    return this.request(`/support/${ticketId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    });
  }

  async getAllTickets() {
    return this.request('/support');
  }

  async closeTicket(ticketId: string) {
    return this.request(`/support/${ticketId}/close`, {
      method: 'PATCH',
    });
  }

  logout() {
    this.token = null;
    localStorage.removeItem('authToken');
    // Also call backend logout if desired
    fetch(`${this.baseUrl}/auth/logout`, { method: 'POST' });
  }
}

// Export singleton instance
export const api = new ApiClient();
```

### Option 2: Use Axios with Interceptor (if using Axios)

```typescript
// api.ts
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://132.145.136.159:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Response interceptor to handle 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);

// Support API methods
export const supportApi = {
  getMyTickets: () => api.get('/support/my-tickets'),
  createTicket: (data: { subject: string; message: string }) =>
    api.post('/support', data),
  getMessages: (ticketId: string) => api.get(`/support/${ticketId}/messages`),
  addMessage: (ticketId: string, message: string) =>
    api.post(`/support/${ticketId}/messages`, { message }),
  getAllTickets: () => api.get('/support'),
  closeTicket: (ticketId: string) => api.patch(`/support/${ticketId}/close`),
};
```

### Option 3: React Context/Hook Example

```typescript
// AuthContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';

interface AuthContextType {
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(
    localStorage.getItem('authToken')
  );

  const login = async (email: string, password: string) => {
    const response = await fetch('http://132.145.136.159:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await response.json();
    localStorage.setItem('authToken', data.access_token);
    setToken(data.access_token);
  };

  const logout = () => {
    localStorage.removeItem('authToken');
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

// useSupport.ts hook
export const useSupport = () => {
  const { token } = useAuth();

  const getMyTickets = async () => {
    const response = await fetch('http://132.145.136.159:5000/api/support/my-tickets', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    return response.json();
  };

  // ... other methods
};
```

## Testing the Fix

1. Open browser DevTools → Console
2. Test login:

```javascript
fetch('http://132.145.136.159:5000/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'test@example.com', password: 'Test123!' }),
})
  .then((r) => r.json())
  .then((data) => {
    localStorage.setItem('authToken', data.access_token);
    console.log('Token saved');
  });
```

3. Test support endpoint:

```javascript
fetch('http://132.145.136.159:5000/api/support/my-tickets', {
  headers: { Authorization: 'Bearer ' + localStorage.getItem('authToken') },
})
  .then((r) => r.json())
  .then(console.log);
```

## Summary of Changes Needed

1. **Capture the JWT token** from the `/api/auth/login` response (`data.access_token`)
2. **Store the token** in `localStorage`, `sessionStorage`, or memory
3. **Add `Authorization: Bearer <token>` header** to every request to `/api/support/*` endpoints
4. **Handle 401 responses** by logging out and redirecting to login

## Important Notes

- The cookie-based auth won't work cross-origin on HTTP due to SameSite requirements
- Always use HTTPS in production (then cookies with `SameSite=None; Secure` will work)
- Token expires in 24 hours (from `maxAge: 24 * 60 * 60 * 1000`)
- The backend already supports both auth methods - just need frontend to send the token

## Quick Fix for Existing Frontend

Find where you make API calls to `http://132.145.136.159:5000/api/support` and add:

```javascript
const token = localStorage.getItem('authToken');
headers: {
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json',
}
```

That's it! The 401 error will be resolved.
