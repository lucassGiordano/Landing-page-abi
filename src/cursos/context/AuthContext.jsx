import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [profileUserId, setProfileUserId] = useState(null)
  const [loading, setLoading] = useState(true)

  // Sesión: la lee al cargar y se actualiza sola al entrar/salir
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  // Perfil (rol y nombre): se pide cuando cambia el usuario
  const userId = session?.user?.id
  useEffect(() => {
    if (!userId) {
      setProfile(null)
      setProfileUserId(null)
      return
    }
    let cancelled = false
    supabase
      .from('profiles')
      .select('role, display_name')
      .eq('id', userId)
      .single()
      .then(({ data }) => {
        if (cancelled) return
        setProfile(data ?? null)
        setProfileUserId(userId)
      })
    return () => {
      cancelled = true
    }
  }, [userId])

  // true mientras hay usuario pero su perfil todavía no terminó de cargar
  const profileLoading = Boolean(userId) && profileUserId !== userId

  const value = {
    session,
    user: session?.user ?? null,
    profile,
    loading,
    profileLoading,
    isAdmin: profile?.role === 'admin',
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}