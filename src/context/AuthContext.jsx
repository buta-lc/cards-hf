import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [user, setUser] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  async function resolveAdminStatus(activeUser) {
    if (!activeUser?.id) {
      setIsAdmin(false)
      return
    }

    const { data, error } = await supabase
      .from('admins')
      .select('id')
      .eq('id', activeUser.id)
      .maybeSingle()

    if (error) {
      setIsAdmin(false)
      return
    }

    setIsAdmin(Boolean(data))
  }

  useEffect(() => {
    let mounted = true

    async function initAuth() {
      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession()

      if (!mounted) {
        return
      }

      setSession(currentSession)
      setUser(currentSession?.user ?? null)
      await resolveAdminStatus(currentSession?.user ?? null)
      if (mounted) {
        setLoading(false)
      }
    }

    initAuth()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      setSession(nextSession)
      setUser(nextSession?.user ?? null)
      await resolveAdminStatus(nextSession?.user ?? null)
      setLoading(false)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const value = useMemo(
    () => ({ session, user, isAdmin, loading }),
    [session, user, isAdmin, loading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider')
  }
  return context
}
