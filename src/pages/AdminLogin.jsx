import { useEffect, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'

export default function AdminLogin() {
  const navigate = useNavigate()
  const location = useLocation()
  const { isAdmin, loading } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!loading && isAdmin) {
      navigate('/admin', { replace: true })
    }
  }, [isAdmin, loading, navigate])

  async function onSubmit(event) {
    event.preventDefault()
    setSubmitting(true)
    setError('')

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (signInError) {
      setError(signInError.message)
      setSubmitting(false)
      return
    }

    const userId = data?.user?.id
    const { data: adminRow, error: adminError } = await supabase
      .from('admins')
      .select('id')
      .eq('id', userId)
      .maybeSingle()

    if (adminError || !adminRow) {
      await supabase.auth.signOut()
      setError('Ce compte existe mais ne fait pas partie des admins autorises.')
      setSubmitting(false)
      return
    }

    const redirectPath = location.state?.from || '/admin'
    navigate(redirectPath, { replace: true })
    setSubmitting(false)
  }

  if (!loading && isAdmin) {
    return <Navigate to="/admin" replace />
  }

  return (
    <main className="admin-shell admin-login-shell">
      <section className="panel">
        <h1>Connexion admin</h1>
        <p>Reserve aux comptes presents dans la table admins.</p>
        <form className="admin-form" onSubmit={onSubmit}>
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>

          <label>
            Mot de passe
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>

          {error ? <p className="error-text">{error}</p> : null}

          <button type="submit" disabled={submitting}>
            {submitting ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>
      </section>
    </main>
  )
}
