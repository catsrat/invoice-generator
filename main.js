import { supabase } from './supabase.js'

// Currency symbols mapping
const currencySymbols = {
    USD: '$',
    EUR: '€',
    GBP: '£',
    INR: '₹',
    JPY: '¥',
    AUD: 'A$',
    CAD: 'C$'
};

// State management
let lineItems = [];
let currentCurrency = 'INR';
let signatureDataUrl = null;
let currentUser = null;

// Initialize the application
document.addEventListener('DOMContentLoaded', async () => {
    // Check authentication first
    await checkAuth();

    initializeApp();
    setupEventListeners();
    loadSavedTemplate();
    addInitialLineItem();
});

function initializeApp() {
    // Set today's date as default
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('invoiceDate').value = today;

    // Set due date to 30 days from now
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);
    document.getElementById('dueDate').value = dueDate.toISOString().split('T')[0];

    // Generate initial invoice number
    const invoiceNum = generateInvoiceNumber();
    document.getElementById('invoiceNumber').value = invoiceNum;
}

function generateInvoiceNumber() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `INV-${year}${month}-${random}`;
}

function setupEventListeners() {
    // Form inputs - update preview on change
    const formInputs = document.querySelectorAll('#invoiceForm input, #invoiceForm textarea, #invoiceForm select');
    formInputs.forEach(input => {
        input.addEventListener('input', updatePreview);
        input.addEventListener('change', updatePreview);
    });

    // Line items
    document.getElementById('addLineItemBtn').addEventListener('click', addLineItem);

    // Action buttons
    document.getElementById('downloadBtn').addEventListener('click', downloadPDF);
    document.getElementById('printBtn').addEventListener('click', printInvoice);
    document.getElementById('saveBtn').addEventListener('click', saveTemplate);

    // Currency change
    document.getElementById('currency').addEventListener('change', (e) => {
        currentCurrency = e.target.value;
        updatePreview();
    });

    // Signature upload
    document.getElementById('signatureUpload').addEventListener('change', handleSignatureUpload);
}

function addLineItem() {
    const lineItem = {
        id: Date.now(),
        description: '',
        quantity: 1,
        rate: 0
    };

    lineItems.push(lineItem);
    renderLineItems();
    updatePreview();

    // Add animation
    const tbody = document.getElementById('lineItemsBody');
    const lastRow = tbody.lastElementChild;
    if (lastRow) {
        lastRow.style.animation = 'fadeIn 0.3s ease-out';
    }
}

function addInitialLineItem() {
    addLineItem();
}

function removeLineItem(id) {
    lineItems = lineItems.filter(item => item.id !== id);
    renderLineItems();
    updatePreview();
}

function updateLineItem(id, field, value) {
    const item = lineItems.find(item => item.id === id);
    if (item) {
        item[field] = value;
        updatePreview();
    }
}

function renderLineItems() {
    const tbody = document.getElementById('lineItemsBody');

    if (lineItems.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--text-tertiary); padding: var(--space-xl);">No line items added</td></tr>';
        return;
    }

    tbody.innerHTML = lineItems.map(item => `
    <tr data-id="${item.id}">
      <td>
        <input 
          type="text" 
          value="${item.description}" 
          placeholder="Service or product description"
          onchange="updateLineItem(${item.id}, 'description', this.value)"
        />
      </td>
      <td>
        <input 
          type="number" 
          value="${item.quantity}" 
          min="1"
          step="1"
          onchange="updateLineItem(${item.id}, 'quantity', parseFloat(this.value) || 1)"
        />
      </td>
      <td>
        <input 
          type="number" 
          value="${item.rate}" 
          min="0"
          step="0.01"
          placeholder="0.00"
          onchange="updateLineItem(${item.id}, 'rate', parseFloat(this.value) || 0)"
        />
      </td>
      <td style="text-align: right; padding-right: var(--space-md);">
        <strong>${formatCurrency((item.quantity || 0) * (item.rate || 0))}</strong>
      </td>
      <td>
        <button 
          type="button" 
          class="btn btn-icon btn-sm" 
          onclick="removeLineItem(${item.id})"
          style="background: var(--error-500); color: white;"
          title="Remove item"
        >
          ×
        </button>
      </td>
    </tr>
  `).join('');
}

function updatePreview() {
    // Update header subtitle with business name
    const businessName = document.getElementById('businessName').value;
    const headerSubtitle = document.getElementById('headerSubtitle');
    if (businessName) {
        headerSubtitle.textContent = businessName;
    } else {
        headerSubtitle.textContent = 'Create professional invoices in seconds';
    }

    // Business info
    document.getElementById('previewBusinessName').textContent =
        businessName || 'Your Business Name';
    document.getElementById('previewBusinessAddress').textContent =
        document.getElementById('businessAddress').value || 'Your Business Address';
    document.getElementById('previewBusinessEmail').textContent =
        document.getElementById('businessEmail').value;
    document.getElementById('previewBusinessPhone').textContent =
        document.getElementById('businessPhone').value;

    // Client info
    document.getElementById('previewClientName').textContent =
        document.getElementById('clientName').value || 'Client Name';
    document.getElementById('previewClientAddress').textContent =
        document.getElementById('clientAddress').value || 'Client Address';
    document.getElementById('previewClientEmail').textContent =
        document.getElementById('clientEmail').value;
    document.getElementById('previewClientPhone').textContent =
        document.getElementById('clientPhone').value;

    // Invoice meta
    document.getElementById('previewInvoiceNumber').textContent =
        document.getElementById('invoiceNumber').value || 'INV-001';
    document.getElementById('previewInvoiceDate').textContent =
        formatDate(document.getElementById('invoiceDate').value);
    document.getElementById('previewDueDate').textContent =
        formatDate(document.getElementById('dueDate').value);

    // Line items
    updatePreviewLineItems();

    // Calculations
    updateTotals();

    // Notes
    const notes = document.getElementById('notes').value;
    const notesSection = document.getElementById('previewNotesSection');
    if (notes) {
        notesSection.style.display = 'block';
        document.getElementById('previewNotes').textContent = notes;
    } else {
        notesSection.style.display = 'none';
    }

    // Signature
    updateSignaturePreview();
}

function updatePreviewLineItems() {
    const tbody = document.getElementById('previewLineItems');

    if (lineItems.length === 0 || lineItems.every(item => !item.description)) {
        tbody.innerHTML = `
      <tr>
        <td colspan="4" style="text-align: center; color: #9ca3af; padding: var(--space-xl);">
          No items added yet
        </td>
      </tr>
    `;
        return;
    }

    tbody.innerHTML = lineItems
        .filter(item => item.description)
        .map(item => {
            const amount = (item.quantity || 0) * (item.rate || 0);
            return `
        <tr>
          <td>${item.description}</td>
          <td>${item.quantity || 0}</td>
          <td>${formatCurrency(item.rate || 0)}</td>
          <td>${formatCurrency(amount)}</td>
        </tr>
      `;
        }).join('');
}

function updateTotals() {
    // Calculate subtotal
    const subtotal = lineItems.reduce((sum, item) => {
        return sum + ((item.quantity || 0) * (item.rate || 0));
    }, 0);

    // Get tax and discount rates
    const taxRate = parseFloat(document.getElementById('taxRate').value) || 0;
    const discountRate = parseFloat(document.getElementById('discountRate').value) || 0;

    // Calculate discount
    const discountAmount = subtotal * (discountRate / 100);
    const afterDiscount = subtotal - discountAmount;

    // Calculate tax
    const taxAmount = afterDiscount * (taxRate / 100);

    // Calculate total
    const total = afterDiscount + taxAmount;

    // Update preview
    document.getElementById('previewSubtotal').textContent = formatCurrency(subtotal);

    // Show/hide discount row
    const discountRow = document.getElementById('previewDiscountRow');
    if (discountRate > 0) {
        discountRow.style.display = 'flex';
        document.getElementById('previewDiscountPercent').textContent = discountRate.toFixed(2);
        document.getElementById('previewDiscount').textContent = '-' + formatCurrency(discountAmount);
    } else {
        discountRow.style.display = 'none';
    }

    // Show/hide tax row
    const taxRow = document.getElementById('previewTaxRow');
    if (taxRate > 0) {
        taxRow.style.display = 'flex';
        document.getElementById('previewTaxPercent').textContent = taxRate.toFixed(2);
        document.getElementById('previewTax').textContent = formatCurrency(taxAmount);
    } else {
        taxRow.style.display = 'none';
    }

    document.getElementById('previewTotal').textContent = formatCurrency(total);
}

function formatCurrency(amount) {
    const symbol = currencySymbols[currentCurrency] || '$';
    return `${symbol}${amount.toFixed(2)}`;
}

function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

function printInvoice() {
    window.print();
}

function downloadPDF() {
    // For a simple implementation, we'll use the browser's print-to-PDF functionality
    // In a production app, you'd use a library like jsPDF or html2pdf

    // Show a helpful message
    const message = document.createElement('div');
    message.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: var(--glass-bg);
    backdrop-filter: blur(20px);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-xl);
    padding: var(--space-2xl);
    box-shadow: var(--glass-shadow);
    z-index: 10000;
    text-align: center;
    max-width: 400px;
    animation: fadeIn 0.3s ease-out;
  `;

    message.innerHTML = `
    <h3 style="margin-bottom: var(--space-md); color: var(--primary-300);">Download as PDF</h3>
    <p style="margin-bottom: var(--space-lg); color: var(--text-secondary);">
      Use your browser's Print function and select "Save as PDF" as the destination.
    </p>
    <button class="btn btn-primary" onclick="this.parentElement.remove(); window.print();">
      Open Print Dialog
    </button>
    <button class="btn btn-secondary" onclick="this.parentElement.remove();" style="margin-left: var(--space-sm);">
      Cancel
    </button>
  `;

    document.body.appendChild(message);
}

async function saveTemplate() {
    if (!currentUser) {
        showNotification('Please log in to save templates', 'error');
        return;
    }

    const invoiceData = {
        user_id: currentUser.id,
        invoice_number: document.getElementById('invoiceNumber').value,
        business_name: document.getElementById('businessName').value,
        business_address: document.getElementById('businessAddress').value,
        business_email: document.getElementById('businessEmail').value,
        business_phone: document.getElementById('businessPhone').value,
        client_name: document.getElementById('clientName').value,
        client_address: document.getElementById('clientAddress').value,
        client_email: document.getElementById('clientEmail').value,
        client_phone: document.getElementById('clientPhone').value,
        invoice_date: document.getElementById('invoiceDate').value,
        due_date: document.getElementById('dueDate').value,
        currency: document.getElementById('currency').value,
        line_items: lineItems,
        tax_rate: parseFloat(document.getElementById('taxRate').value) || 0,
        discount_rate: parseFloat(document.getElementById('discountRate').value) || 0,
        notes: document.getElementById('notes').value,
        signature_url: signatureDataUrl
    };

    try {
        const { data, error } = await supabase
            .from('invoices')
            .upsert(invoiceData, {
                onConflict: 'invoice_number,user_id'
            })
            .select();

        if (error) throw error;

        showNotification('Invoice saved successfully! ☁️', 'success');
    } catch (error) {
        console.error('Error saving invoice:', error);
        showNotification('Failed to save invoice: ' + error.message, 'error');
    }
}

async function loadSavedTemplate() {
    if (!currentUser) return;

    try {
        const { data, error } = await supabase
            .from('invoices')
            .select('*')
            .eq('user_id', currentUser.id)
            .order('updated_at', { ascending: false })
            .limit(1)
            .single();

        if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows found
        if (!data) return;

        // Load business info
        if (data.business_name) document.getElementById('businessName').value = data.business_name;
        if (data.business_address) document.getElementById('businessAddress').value = data.business_address;
        if (data.business_email) document.getElementById('businessEmail').value = data.business_email;
        if (data.business_phone) document.getElementById('businessPhone').value = data.business_phone;

        // Load client info
        if (data.client_name) document.getElementById('clientName').value = data.client_name;
        if (data.client_address) document.getElementById('clientAddress').value = data.client_address;
        if (data.client_email) document.getElementById('clientEmail').value = data.client_email;
        if (data.client_phone) document.getElementById('clientPhone').value = data.client_phone;

        // Load invoice metadata
        if (data.invoice_date) document.getElementById('invoiceDate').value = data.invoice_date;
        if (data.due_date) document.getElementById('dueDate').value = data.due_date;
        if (data.currency) {
            document.getElementById('currency').value = data.currency;
            currentCurrency = data.currency;
        }

        // Load line items
        if (data.line_items && data.line_items.length > 0) {
            lineItems = data.line_items;
            renderLineItems();
        }

        // Load calculations
        if (data.tax_rate) document.getElementById('taxRate').value = data.tax_rate;
        if (data.discount_rate) document.getElementById('discountRate').value = data.discount_rate;
        if (data.notes) document.getElementById('notes').value = data.notes;

        // Load signature
        if (data.signature_url) {
            signatureDataUrl = data.signature_url;
            displaySignature();
        }

        updatePreview();
    } catch (e) {
        console.error('Error loading template:', e);
    }
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');

    let bgColor;
    if (type === 'success') {
        bgColor = 'var(--success-500)';
    } else if (type === 'error') {
        bgColor = 'var(--error-500)';
    } else {
        bgColor = 'var(--primary-500)';
    }

    notification.style.cssText = `
    position: fixed;
    top: var(--space-xl);
    right: var(--space-xl);
    background: ${bgColor};
    color: white;
    padding: var(--space-md) var(--space-xl);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-xl);
    z-index: 10000;
    animation: fadeInDown 0.3s ease-out;
    font-weight: 600;
  `;

    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'fadeIn 0.3s ease-out reverse';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Make functions globally available for inline event handlers
window.updateLineItem = updateLineItem;
window.removeLineItem = removeLineItem;
window.removeSignature = removeSignature;

// Signature handling functions
function handleSignatureUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.match('image/(png|jpeg|jpg)')) {
        showNotification('Please upload a PNG or JPG image', 'error');
        return;
    }

    // Validate file size (max 500KB)
    if (file.size > 500 * 1024) {
        showNotification('Image size should be less than 500KB', 'error');
        return;
    }

    const reader = new FileReader();
    reader.onload = function (e) {
        signatureDataUrl = e.target.result;
        displaySignature();
        updatePreview();
        showNotification('Signature uploaded successfully! ✓', 'success');
    };
    reader.readAsDataURL(file);
}

function displaySignature() {
    if (signatureDataUrl) {
        // Show preview in form
        document.getElementById('signaturePreview').src = signatureDataUrl;
        document.getElementById('signaturePreviewContainer').style.display = 'block';
    }
}

function removeSignature() {
    signatureDataUrl = null;
    document.getElementById('signatureUpload').value = '';
    document.getElementById('signaturePreviewContainer').style.display = 'none';
    updatePreview();
    showNotification('Signature removed', 'info');
}

function updateSignaturePreview() {
    const signatureSection = document.getElementById('previewSignatureSection');
    const signatureImg = document.getElementById('previewSignature');

    if (signatureDataUrl) {
        signatureImg.src = signatureDataUrl;
        signatureSection.style.display = 'block';
    } else {
        signatureSection.style.display = 'none';
    }
}

// Authentication functions
async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
        // Not logged in, redirect to login page
        window.location.href = '/login.html'
        return
    }

    currentUser = session.user
    displayUserProfile()
}

function displayUserProfile() {
    if (!currentUser) return

    const header = document.querySelector('.header')

    // Create user profile section
    const userProfile = document.createElement('div')
    userProfile.className = 'user-profile'
    userProfile.innerHTML = `
        <img src="${currentUser.user_metadata.avatar_url || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(currentUser.user_metadata.full_name || currentUser.email)}"
             alt="User avatar"
             class="user-avatar" />
        <div class="user-info">
            <div class="user-name">${currentUser.user_metadata.full_name || 'User'}</div>
            <div class="user-email">${currentUser.email}</div>
        </div>
        <button class="btn-logout" id="logoutBtn">Logout</button>
    `

    // Insert after header
    header.after(userProfile)

    // Add logout handler
    document.getElementById('logoutBtn').addEventListener('click', handleLogout)
}

async function handleLogout() {
    try {
        const { error } = await supabase.auth.signOut()
        if (error) throw error

        // Redirect to login page
        window.location.href = '/login.html'
    } catch (error) {
        console.error('Error logging out:', error)
        showNotification('Failed to logout', 'error')
    }
}
