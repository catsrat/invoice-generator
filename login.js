import { supabase } from './supabase.js'

// Check if user is already logged in
checkAuth()

async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession()

    if (session) {
        // User is already logged in, redirect to main app
        window.location.href = '/index.html'
    }
}

// Google Sign-In
document.getElementById('googleSignInBtn').addEventListener('click', async () => {
    const button = document.getElementById('googleSignInBtn')
    button.disabled = true
    button.innerHTML = '<span>Signing in...</span>'

    try {
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/`
            }
        })

        if (error) throw error

        // OAuth will redirect automatically
    } catch (error) {
        console.error('Error signing in:', error)
        button.disabled = false
        button.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M19.6 10.227c0-.709-.064-1.39-.182-2.045H10v3.868h5.382a4.6 4.6 0 01-1.996 3.018v2.51h3.232c1.891-1.742 2.982-4.305 2.982-7.35z" fill="#4285F4"/>
        <path d="M10 20c2.7 0 4.964-.895 6.618-2.423l-3.232-2.509c-.895.6-2.04.955-3.386.955-2.605 0-4.81-1.76-5.595-4.123H1.064v2.59A9.996 9.996 0 0010 20z" fill="#34A853"/>
        <path d="M4.405 11.9c-.2-.6-.314-1.24-.314-1.9 0-.66.114-1.3.314-1.9V5.51H1.064A9.996 9.996 0 000 10c0 1.614.386 3.14 1.064 4.49l3.34-2.59z" fill="#FBBC05"/>
        <path d="M10 3.977c1.468 0 2.786.505 3.823 1.496l2.868-2.868C14.959.99 12.695 0 10 0 6.09 0 2.71 2.24 1.064 5.51l3.34 2.59C5.19 5.736 7.395 3.977 10 3.977z" fill="#EA4335"/>
      </svg>
      <span>Sign in with Google</span>
    `

        // Show error notification
        showError('Failed to sign in. Please make sure Google OAuth is enabled in Supabase.')
    }
})

function showError(message) {
    const errorDiv = document.createElement('div')
    errorDiv.style.cssText = `
    position: fixed;
    top: var(--space-xl);
    right: var(--space-xl);
    background: var(--error-500);
    color: white;
    padding: var(--space-md) var(--space-xl);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-xl);
    z-index: 10000;
    animation: fadeInDown 0.3s ease-out;
    font-weight: 600;
    max-width: 400px;
  `
    errorDiv.textContent = message
    document.body.appendChild(errorDiv)

    setTimeout(() => {
        errorDiv.style.animation = 'fadeIn 0.3s ease-out reverse'
        setTimeout(() => errorDiv.remove(), 300)
    }, 5000)
}
