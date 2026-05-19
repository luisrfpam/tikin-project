import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

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

    const applySession = (session: Session | null, fetchProfile: boolean) => {
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

    return () => subscription.unsubscribe();
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
