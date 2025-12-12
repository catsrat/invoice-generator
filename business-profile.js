import { supabase } from './supabase.js'

// Check authentication
checkAuth()

let logoDataUrl = null
let upiQrDataUrl = null
let signatureDataUrl = null
let currentUser = null

async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
        window.location.href = '/login.html'
        return
    }

    currentUser = session.user
    loadExistingProfile()
}

// Load existing profile if it exists
async function loadExistingProfile() {
    try {
        const { data, error } = await supabase
            .from('business_profiles')
            .select('*')
            .eq('user_id', currentUser.id)
            .single()

        if (error && error.code !== 'PGRST116') throw error // PGRST116 = no rows found
        if (!data) return

        // Fill form with existing data
        document.getElementById('companyName').value = data.company_name || ''
        document.getElementById('gstNumber').value = data.gst_number || ''
        document.getElementById('billingAddress').value = data.billing_address || ''
        document.getElementById('email').value = data.email || ''
        document.getElementById('phone').value = data.phone || ''
        document.getElementById('bankName').value = data.bank_name || ''
        document.getElementById('bankAccountNumber').value = data.bank_account_number || ''
        document.getElementById('bankIfscCode').value = data.bank_ifsc_code || ''
        document.getElementById('bankBranch').value = data.bank_branch || ''

        // Load logo if exists
        if (data.company_logo_url) {
            logoDataUrl = data.company_logo_url
            displayLogo()
        }

        // Load UPI QR if exists
        if (data.upi_qr_code_url) {
            upiQrDataUrl = data.upi_qr_code_url
            displayUpiQr()
        }

        // Load signature if exists
        if (data.signature_url) {
            signatureDataUrl = data.signature_url
            displaySignature()
        }
    } catch (error) {
        console.error('Error loading profile:', error)
    }
}

// Logo upload handling
document.getElementById('logoUpload').addEventListener('change', async (e) => {
    const file = e.target.files[0]
    if (!file) return

    // Validate file type
    if (!file.type.match(/^image\/(png|jpeg|jpg)$/)) {
        showNotification('Please upload a PNG or JPG image', 'error')
        return
    }

    // Validate file size (500KB)
    if (file.size > 500 * 1024) {
        showNotification('Image size must be less than 500KB', 'error')
        return
    }

    // Convert to base64
    const reader = new FileReader()
    reader.onload = (event) => {
        logoDataUrl = event.target.result
        displayLogo()
        showNotification('Logo uploaded successfully!', 'success')
    }
    reader.readAsDataURL(file)
})

function displayLogo() {
    const preview = document.getElementById('logoPreview')
    const container = document.getElementById('logoPreviewContainer')
    preview.src = logoDataUrl
    container.style.display = 'block'
}

window.removeLogo = function () {
    logoDataUrl = null
    document.getElementById('logoPreviewContainer').style.display = 'none'
    document.getElementById('logoUpload').value = ''
}

// UPI QR upload handling
document.getElementById('upiQrUpload').addEventListener('change', async (e) => {
    const file = e.target.files[0]
    if (!file) return

    // Validate file type
    if (!file.type.match(/^image\/(png|jpeg|jpg)$/)) {
        showNotification('Please upload a PNG or JPG image', 'error')
        return
    }

    // Validate file size (500KB)
    if (file.size > 500 * 1024) {
        showNotification('Image size must be less than 500KB', 'error')
        return
    }

    // Convert to base64
    const reader = new FileReader()
    reader.onload = (event) => {
        upiQrDataUrl = event.target.result
        displayUpiQr()
        showNotification('UPI QR code uploaded successfully!', 'success')
    }
    reader.readAsDataURL(file)
})

function displayUpiQr() {
    const preview = document.getElementById('upiQrPreview')
    const container = document.getElementById('upiQrPreviewContainer')
    preview.src = upiQrDataUrl
    container.style.display = 'block'
}

window.removeUpiQr = function () {
    upiQrDataUrl = null
    document.getElementById('upiQrPreviewContainer').style.display = 'none'
    document.getElementById('upiQrUpload').value = ''
}

// Signature upload handling
document.getElementById('signatureUpload').addEventListener('change', async (e) => {
    const file = e.target.files[0]
    if (!file) return

    // Validate file type
    if (!file.type.match(/^image\/(png|jpeg|jpg)$/)) {
        showNotification('Please upload a PNG or JPG image', 'error')
        return
    }

    // Validate file size (500KB)
    if (file.size > 500 * 1024) {
        showNotification('Image size must be less than 500KB', 'error')
        return
    }

    // Convert to base64
    const reader = new FileReader()
    reader.onload = (event) => {
        signatureDataUrl = event.target.result
        displaySignature()
        showNotification('Signature uploaded successfully!', 'success')
    }
    reader.readAsDataURL(file)
})

function displaySignature() {
    const preview = document.getElementById('signaturePreview')
    const container = document.getElementById('signaturePreviewContainer')
    preview.src = signatureDataUrl
    container.style.display = 'block'
}

window.removeSignature = function () {
    signatureDataUrl = null
    document.getElementById('signaturePreviewContainer').style.display = 'none'
    document.getElementById('signatureUpload').value = ''
}

// Form submission
document.getElementById('businessProfileForm').addEventListener('submit', async (e) => {
    e.preventDefault()

    const button = document.getElementById('saveProfileBtn')
    button.disabled = true
    button.innerHTML = '💾 Saving...'

    const profileData = {
        user_id: currentUser.id,
        company_name: document.getElementById('companyName').value,
        gst_number: document.getElementById('gstNumber').value || null,
        company_logo_url: logoDataUrl,
        billing_address: document.getElementById('billingAddress').value,
        email: document.getElementById('email').value,
        phone: document.getElementById('phone').value,
        upi_qr_code_url: upiQrDataUrl,
        bank_name: document.getElementById('bankName').value || null,
        bank_account_number: document.getElementById('bankAccountNumber').value || null,
        bank_ifsc_code: document.getElementById('bankIfscCode').value || null,
        bank_branch: document.getElementById('bankBranch').value || null,
        signature_url: signatureDataUrl
    }

    try {
        const { data, error } = await supabase
            .from('business_profiles')
            .upsert(profileData, {
                onConflict: 'user_id'
            })
            .select()

        if (error) throw error

        showNotification('Business profile saved successfully! ✅', 'success')

        // Redirect to invoice generator after 1.5 seconds
        setTimeout(() => {
            window.location.href = '/index.html'
        }, 1500)
    } catch (error) {
        console.error('Error saving profile:', error)
        showNotification('Failed to save profile: ' + error.message, 'error')
        button.disabled = false
        button.innerHTML = '💾 Save Business Profile'
    }
})

// Notification function
function showNotification(message, type = 'info') {
    const notification = document.createElement('div')
    notification.className = 'notification'

    const colors = {
        success: 'var(--success-500)',
        error: 'var(--error-500)',
        info: 'var(--primary-500)'
    }

    notification.style.cssText = `
    position: fixed;
    top: var(--space-xl);
    right: var(--space-xl);
    background: ${colors[type]};
    color: white;
    padding: var(--space-md) var(--space-xl);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-xl);
    z-index: 10000;
    animation: fadeInDown 0.3s ease-out;
    font-weight: 600;
    max-width: 400px;
  `
    notification.textContent = message
    document.body.appendChild(notification)

    setTimeout(() => {
        notification.style.animation = 'fadeIn 0.3s ease-out reverse'
        setTimeout(() => notification.remove(), 300)
    }, 3000)
}
