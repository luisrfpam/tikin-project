import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';
import { toast } from 'sonner';

const MAX_SESSION_AGE_MS = 12 * 60 * 60 * 1000;

type AppRole = 'emissor' | 'beneficiario' | 'lojista';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  roles: AppRole[];
  activeRole: AppRole | null;
  setActiveRole: (role: AppRole) => void;
  loading: boolean;
  signOut: () => Promise<void>;
  profile: { name: string; cpf?: string; cnpj?: string; email: string } | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function getSessionStartAt(session: Session): number | null {
  const lastSignInAt = session.user.last_sign_in_at;
  if (lastSignInAt) {
    const parsed = Date.parse(lastSignInAt);
    if (!Number.isNaN(parsed)) return parsed;
  }

  if (typeof session.expires_at === 'number' && typeof session.expires_in === 'number') {
    return (session.expires_at - session.expires_in) * 1000;
  }

  return null;
}

function isSessionExpiredByAge(session: Session): boolean {
  const startedAt = getSessionStartAt(session);
  if (!startedAt) return false;
  return Date.now() - startedAt > MAX_SESSION_AGE_MS;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [activeRole, setActiveRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<AuthContextType['profile']>(null);
  const fetchRolesAndProfile = async (userId: string) => {
    const [rolesRes, profileRes] = await Promise.all([
      supabase.from('user_roles').select('role').eq('user_id', userId),
      supabase.from('profiles').select('name, cpf, cnpj, email').eq('id', userId).single(),
    ]);

    if (rolesRes.data) {
      const userRoles = rolesRes.data.map(r => r.role as AppRole);
      setRoles(userRoles);
      if (!activeRole && userRoles.length > 0) {
        setActiveRole(userRoles[0]);
      }
    }
    if (profileRes.data) {
      setProfile(profileRes.data);
    }
  };

  useEffect(() => {
    let currentUserId: string | null = null;
    let didShowSessionExpiredToast = false;

    const handleSessionExpired = () => {
      if (!didShowSessionExpiredToast) {
        toast.warning('Sua sessão expirou após 12 horas. Faça login novamente para continuar.', {
          id: 'session-expired-12h',
        });
        didShowSessionExpiredToast = true;
      }

      supabase.auth.signOut().finally(() => {
        setSession(null);
        setUser(null);
        setRoles([]);
        setActiveRole(null);
        setProfile(null);
        setLoading(false);
      });
    };

    const applySession = (session: Session | null, fetchProfile: boolean) => {
      if (session && isSessionExpiredByAge(session)) {
        handleSessionExpired();
        return;
      }

      if (session) {
        didShowSessionExpiredToast = false;
      }

      setSession(session);
      const nextUser = session?.user ?? null;
      const nextId = nextUser?.id ?? null;
      // Only replace the user reference if the identity actually changed.
      // Supabase fires onAuthStateChange on TOKEN_REFRESHED / window focus,
      // which would otherwise re-trigger every useEffect([user]) downstream.
      if (nextId !== currentUserId) {
        currentUserId = nextId;
        setUser(nextUser);
        if (nextUser && fetchProfile) {
          setTimeout(() => fetchRolesAndProfile(nextUser.id), 0);
        } else if (!nextUser) {
          setRoles([]);
          setActiveRole(null);
          setProfile(null);
        }
      }
      setLoading(false);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => applySession(session, true)
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      applySession(session, true);
    });

    const validateSessionAge = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session && isSessionExpiredByAge(session)) {
        applySession(session, false);
      }
    };

    const intervalId = window.setInterval(validateSessionAge, 60 * 1000);
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void validateSessionAge();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      subscription.unsubscribe();
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, roles, activeRole, setActiveRole, loading, signOut, profile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
