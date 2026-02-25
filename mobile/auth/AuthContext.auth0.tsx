import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import Auth0, { Credentials, UserInfo } from 'react-native-auth0';
import * as SecureStore from 'expo-secure-store';
import { auth0Config } from './auth0Config';

type AuthUser = {
  id: string;
  username: string;
  email?: string;
  name?: string;
};

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  signIn: (username: string, password: string) => Promise<void>;
  signInWithAuth0: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const TOKEN_KEY = 'auth0_access_token';
const USER_KEY = 'auth0_user';

type AuthProviderProps = {
  children: ReactNode;
};

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const auth0 = new Auth0({
    domain: auth0Config.domain,
    clientId: auth0Config.clientId,
  });

  // Restore session on app launch
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const storedUser = await SecureStore.getItemAsync(USER_KEY);
        const storedToken = await SecureStore.getItemAsync(TOKEN_KEY);

        if (storedUser && storedToken) {
          // Verify token is still valid by getting user info
          try {
            const userInfo = await auth0.auth.userInfo({ token: storedToken });
            const authUser: AuthUser = {
              id: userInfo.sub || storedUser,
              username: userInfo.nickname || userInfo.email || 'User',
              email: userInfo.email,
              name: userInfo.name,
            };
            setUser(authUser);
          } catch (error) {
            // Token expired or invalid, clear storage
            await SecureStore.deleteItemAsync(TOKEN_KEY);
            await SecureStore.deleteItemAsync(USER_KEY);
          }
        }
      } catch (error) {
        console.error('Failed to restore session:', error);
      } finally {
        setLoading(false);
      }
    };

    restoreSession();
  }, [auth0]);

  const signIn = useCallback(
    async (username: string, password: string) => {
      if (!username.trim() || !password.trim()) {
        throw new Error('Username and password are required.');
      }

      setLoading(true);
      try {
        // Use Auth0 Resource Owner Password Grant
        const credentials: Credentials = await auth0.auth.passwordRealm({
          username: username.trim(),
          password: password.trim(),
          realm: 'Username-Password-Authentication', // Default Auth0 database connection
          scope: 'openid profile email',
        });

        // Store access token securely
        await SecureStore.setItemAsync(TOKEN_KEY, credentials.accessToken);

        // Get user info
        const userInfo: UserInfo = await auth0.auth.userInfo({
          token: credentials.accessToken,
        });

        const authUser: AuthUser = {
          id: userInfo.sub || '',
          username: userInfo.nickname || userInfo.email || username.trim(),
          email: userInfo.email,
          name: userInfo.name,
        };

        // Store user info
        await SecureStore.setItemAsync(USER_KEY, JSON.stringify(authUser));

        setUser(authUser);
      } catch (error: any) {
        const message =
          error?.message ||
          'Failed to sign in. Please check your credentials.';
        throw new Error(message);
      } finally {
        setLoading(false);
      }
    },
    [auth0],
  );

  const signInWithAuth0 = useCallback(async () => {
    setLoading(true);
    try {
      // Use Auth0's hosted login page (recommended approach)
      const credentials: Credentials = await auth0.webAuth.authorize({
        scope: 'openid profile email',
      });

      // Store access token securely
      await SecureStore.setItemAsync(TOKEN_KEY, credentials.accessToken);

      // Get user info
      const userInfo: UserInfo = await auth0.auth.userInfo({
        token: credentials.accessToken,
      });

      const authUser: AuthUser = {
        id: userInfo.sub || '',
        username: userInfo.nickname || userInfo.email || 'User',
        email: userInfo.email,
        name: userInfo.name,
      };

      // Store user info
      await SecureStore.setItemAsync(USER_KEY, JSON.stringify(authUser));

      setUser(authUser);
    } catch (error: any) {
      // User cancelled the login
      if (error?.error === 'a0.session.user_cancelled') {
        return;
      }
      const message =
        error?.message || 'Failed to sign in with Auth0. Please try again.';
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, [auth0]);

  const signOut = useCallback(async () => {
    setLoading(true);
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      if (token) {
        // Clear Auth0 session
        try {
          await auth0.webAuth.clearSession();
        } catch (error) {
          // Ignore errors if session doesn't exist
        }
      }

      // Clear stored tokens and user info
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      await SecureStore.deleteItemAsync(USER_KEY);

      setUser(null);
    } catch (error) {
      console.error('Failed to sign out:', error);
      // Still clear local state even if Auth0 logout fails
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [auth0]);

  return (
    <AuthContext.Provider
      value={{ user, loading, signIn, signInWithAuth0, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextValue => {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return value;
};

