import React, {
  createContext,
  useCallback,
  useContext,
  useState,
  ReactNode,
} from 'react';

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

type AuthProviderProps = {
  children: ReactNode;
};

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user] = useState<AuthUser | null>({
    id: 'dev-user',
    username: 'Dev User',
  });

  const signIn = useCallback(async () => {
    // no-op in dev mode
  }, []);

  const signInWithAuth0 = useCallback(async () => {
    // no-op in dev mode
  }, []);

  const signOut = useCallback(async () => {
    // no-op in dev mode
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, loading: false, signIn, signInWithAuth0, signOut }}
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

