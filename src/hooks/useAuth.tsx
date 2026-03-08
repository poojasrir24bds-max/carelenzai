import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  role: string | null;
  profile: any;
  signUp: (email: string, password: string, metadata: Record<string, any>, role: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string | null>(null);
  const [profile, setProfile] = useState<any>(null);

  const fetchRole = async (userId: string) => {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .maybeSingle();
    setRole(data?.role || null);
  };

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    setProfile(data);
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        setTimeout(() => {
          fetchRole(session.user.id);
          fetchProfile(session.user.id);
        }, 0);
      } else {
        setRole(null);
        setProfile(null);
      }
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchRole(session.user.id);
        fetchProfile(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, metadata: Record<string, any>, userRole: string) => {
    // For admin role, check if email is in allowed_admins
    if (userRole === "admin") {
      const { data: allowed } = await supabase.rpc("is_admin_email_allowed", { _email: email });
      if (!allowed) {
        return { error: { message: "This email is not authorized for admin registration." } };
      }
      const { data: count } = await supabase.rpc("admin_count");
      if (count && count >= 5) {
        return { error: { message: "Maximum admin limit (5) reached. No more admin registrations allowed." } };
      }
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: metadata.full_name, ...metadata } },
    });

    if (error) return { error };

    if (data.user) {
      // Update profile with additional info
      await supabase.from("profiles").update({
        full_name: metadata.full_name,
        age: metadata.age ? parseInt(metadata.age) : null,
        sex: metadata.sex || null,
      }).eq("user_id", data.user.id);

      // Assign role
      await supabase.from("user_roles").insert([{ user_id: data.user.id, role: userRole as "admin" | "doctor" | "moderator" | "patient" }]);

      // If doctor, create doctor profile
      if (userRole === "doctor" && metadata.license) {
        await supabase.from("doctor_profiles").insert({
          user_id: data.user.id,
          medical_license: metadata.license,
          doctor_id: metadata.doctorId,
          specialization: metadata.specialization,
          hospital_name: metadata.hospital,
        });
      }

      setRole(userRole);
    }

    return { error: null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setRole(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, role, profile, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
