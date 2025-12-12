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
let businessProfile = null; // Store loaded business profile

// Initialize the application
document.addEventListener('DOMContentLoaded', async () => {
    // Check authentication first
    await checkAuth();

    // Load business profile
    await loadBusinessProfile();

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

function removeLineItem(index) {
    lineItems.splice(index, 1);
    renderLineItems();
    updatePreview();
}

function updateLineItem(index, field, value) {
    if (lineItems[index]) {
        lineItems[index][field] = value;
        updatePreview();
    }
}

function renderLineItems() {
    const tbody = document.getElementById('lineItemsBody');
    tbody.innerHTML = '';

    lineItems.forEach((item, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>
                <input 
                    type="text" 
                    class="form-input" 
                    placeholder="Item description" 
                    value="${item.description || ''}"
                    oninput="updateLineItem(${index}, 'description', this.value)"
                />
            </td>
            <td>
                <input 
                    type="text" 
                    class="form-input" 
                    placeholder="HSN/SAC" 
                    value="${item.hsn || ''}"
                    oninput="updateLineItem(${index}, 'hsn', this.value)"
                />
            </td>
            <td>
                <input 
                    type="number" 
                    class="form-input" 
                    placeholder="1" 
                    min="0"
                    step="1"
                    value="${item.quantity || 1}"
                    oninput="updateLineItem(${index}, 'quantity', parseFloat(this.value) || 0)"
                />
            </td>
            <td>
                <input 
                    type="number" 
                    class="form-input" 
                    placeholder="0.00" 
                    min="0"
                    step="0.01"
                    value="${item.rate || 0}"
                    oninput="updateLineItem(${index}, 'rate', parseFloat(this.value) || 0)"
                />
            </td>
            <td style="text-align: right; padding-right: var(--space-md);">
                ${currencySymbols[currentCurrency]}${((item.quantity || 0) * (item.rate || 0)).toFixed(2)}
            </td>
            <td>
                <button 
                    type="button" 
                    class="btn-icon" 
                    onclick="removeLineItem(${index})"
                    title="Remove item"
                >
                    ✕
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });

    updatePreview();
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

    // GST Number
    const gstNumber = document.getElementById('gstNumber').value;
    const gstElement = document.getElementById('previewGstNumber');
    if (gstElement && gstNumber) {
        gstElement.textContent = `GSTIN: ${gstNumber}`;
        gstElement.style.display = 'block';
    } else if (gstElement) {
        gstElement.style.display = 'none';
    }

    // Client info
    document.getElementById('previewClientName').textContent =
        document.getElementById('clientName').value || 'Client Name';
    document.getElementById('previewClientAddress').textContent =
        document.getElementById('clientAddress').value || 'Client Address';
    document.getElementById('previewClientEmail').textContent =
        document.getElementById('clientEmail').value;
    document.getElementById('previewClientPhone').textContent =
        document.getElementById('clientPhone').value;

    // Customer GSTIN
    const customerGstin = document.getElementById('customerGstin')?.value;
    const customerGstinElement = document.getElementById('previewCustomerGstin');
    if (customerGstinElement && customerGstin) {
        customerGstinElement.textContent = `GSTIN: ${customerGstin}`;
        customerGstinElement.style.display = 'block';
    } else if (customerGstinElement) {
        customerGstinElement.style.display = 'none';
    }

    // Place of Supply
    const placeOfSupply = document.getElementById('placeOfSupply')?.value;
    const placeElement = document.getElementById('previewPlaceOfSupply');
    if (placeElement && placeOfSupply) {
        placeElement.textContent = `Place of Supply: ${placeOfSupply}`;
        placeElement.style.display = 'block';
    } else if (placeElement) {
        placeElement.style.display = 'none';
    }

    // Invoice meta
    document.getElementById('previewInvoiceNumber').textContent =
        document.getElementById('invoiceNumber').value || 'INV-001';
    document.getElementById('previewInvoiceDate').textContent =
        formatDate(document.getElementById('invoiceDate').value);
    const dueDateElement = document.getElementById('previewDueDate');
    if (dueDateElement) {
        dueDateElement.textContent = formatDate(document.getElementById('dueDate').value);
    }

    // Display business profile data if available
    if (businessProfile) {
        // Logo
        const logoElement = document.getElementById('previewLogo');
        if (logoElement && businessProfile.company_logo_url) {
            logoElement.src = businessProfile.company_logo_url;
            logoElement.style.display = 'block';
        }

        // UPI QR and Bank Details
        // UPI QR and Bank Details
        const paymentSection = document.getElementById('paymentSection');
        if (paymentSection && (businessProfile.upi_qr_code_url || businessProfile.bank_name)) {
            paymentSection.style.display = 'block';

            // UPI QR
            const upiQrElement = document.getElementById('previewUpiQr');
            if (upiQrElement) {
                if (businessProfile.upi_qr_code_url) {
                    upiQrElement.src = businessProfile.upi_qr_code_url;
                    upiQrElement.style.display = 'block';
                } else {
                    upiQrElement.style.display = 'none';
                }
            }

            // Bank Details setup
            const bankDetailsSection = document.getElementById('bankDetailsSection');
            if (bankDetailsSection) {
                if (businessProfile.bank_name) {
                    bankDetailsSection.style.display = 'block';
                    document.getElementById('previewBankName').textContent = businessProfile.bank_name || '';
                    document.getElementById('previewBankAccount').textContent = businessProfile.bank_account_number || '';
                    document.getElementById('previewBankIfsc').textContent = businessProfile.bank_ifsc_code || '';
                    document.getElementById('previewBankBranch').textContent = businessProfile.bank_branch || '';
                } else {
                    bankDetailsSection.style.display = 'none';
                }
            }
        } else if (paymentSection) {
            paymentSection.style.display = 'none';
        }
    }

    // Line items
    updatePreviewLineItems();

    // Calculations
    updateTotals();

    // Notes
    const notes = document.getElementById('notes').value;
    const notesSection = document.getElementById('previewNotesSection');
    if (notesSection) {
        if (notes) {
            notesSection.style.display = 'block';
            document.getElementById('previewNotes').textContent = notes;
        } else {
            notesSection.style.display = 'none';
        }
    }

    // Terms and Conditions
    const terms = document.getElementById('terms').value;
    const termsSection = document.getElementById('previewTermsSection');
    if (termsSection) {
        if (terms) {
            termsSection.style.display = 'block';
            const termsList = terms.split('\n').filter(line => line.trim());
            const termsHtml = termsList.map((term, index) =>
                `<div style="margin-bottom: var(--space-xs);">${index + 1}. ${term}</div>`
            ).join('');
            document.getElementById('previewTerms').innerHTML = termsHtml;
        } else {
            termsSection.style.display = 'none';
        }
    }

    // Signature
    updateSignaturePreview();
}

function updatePreviewLineItems() {
    const tbody = document.getElementById('previewLineItems');

    if (lineItems.length === 0 || lineItems.every(item => !item.description)) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: var(--text-tertiary); padding: var(--space-xl);">No items added yet</td></tr>';
        return;
    }

    const gstRate = 5.0;

    tbody.innerHTML = lineItems.map((item, index) => {
        const taxableValue = (item.quantity || 0) * (item.rate || 0);
        const taxAmount = (taxableValue * gstRate) / 100;
        const totalAmount = taxableValue + taxAmount;

        return `
        <tr>
          <td style="text-align: center;">${index + 1}</td>
          <td>${item.description || ''}</td>
          <td style="text-align: center;">${item.hsn || '-'}</td>
          <td style="text-align: center;">${item.quantity || 0}</td>
          <td style="text-align: right;">${formatCurrency(item.rate || 0)}</td>
          <td style="text-align: right;">${formatCurrency(taxableValue)}</td>
          <td style="text-align: right;">${formatCurrency(taxAmount)} (${gstRate}%)</td>
          <td style="text-align: right;"><strong>${formatCurrency(totalAmount)}</strong></td>
        </tr>
      `;
    }).join('');
}

function updateTotals() {
    // Calculate subtotal (taxable amount)
    const subtotal = lineItems.reduce((sum, item) => {
        return sum + ((item.quantity || 0) * (item.rate || 0));
    }, 0);

    // GST calculation (default 5% IGST for now)
    const gstRate = 5.0; // Can be made configurable later
    const gstAmount = (subtotal * gstRate) / 100;

    // Calculate total before rounding
    const totalBeforeRound = subtotal + gstAmount;

    // Round off to nearest rupee
    const roundedTotal = Math.round(totalBeforeRound);
    const roundOff = roundedTotal - totalBeforeRound;

    // Amount paid (can be made editable later)
    const amountPaid = 0;
    const amountPayable = roundedTotal - amountPaid;

    // Update display
    document.getElementById('previewSubtotal').textContent = formatCurrency(subtotal);

    // Show IGST by default (can be changed to CGST/SGST based on place of supply)
    document.getElementById('previewIgstRow').style.display = 'flex';
    document.getElementById('previewIgstRate').textContent = gstRate.toFixed(1);
    document.getElementById('previewIgst').textContent = formatCurrency(gstAmount);

    // Hide CGST/SGST for now
    const cgstRow = document.getElementById('previewCgstRow');
    const sgstRow = document.getElementById('previewSgstRow');
    if (cgstRow) cgstRow.style.display = 'none';
    if (sgstRow) sgstRow.style.display = 'none';

    document.getElementById('previewRoundOff').textContent = formatCurrency(roundOff);
    document.getElementById('previewTotal').textContent = formatCurrency(roundedTotal);
    document.getElementById('previewAmountPaid').textContent = formatCurrency(amountPaid);
    document.getElementById('previewAmountPayable').textContent = formatCurrency(amountPayable);
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

    // User profile display removed for cleaner interface
    // Users can access business profile via the button in the invoice form header
}

async function handleLogout() {
    try {
        const { error } = await supabase.auth.signOut()
        if (error) throw error

        // Redirect to login page
        window.location.href = '/login.html'
    } catch (error) {
        console.error('Logout error:', error)
    }
}

// Load business profile from Supabase
async function loadBusinessProfile() {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const { data, error } = await supabase
            .from('business_profiles')
            .select('*')
            .eq('user_id', session.user.id)
            .single();

        if (error && error.code !== 'PGRST116') throw error;
        if (!data) return;

        // Store business profile for use in updatePreview
        businessProfile = data;

        // Auto-fill business information
        document.getElementById('businessName').value = data.company_name || '';
        document.getElementById('gstNumber').value = data.gst_number || '';
        document.getElementById('businessAddress').value = data.billing_address || '';
        document.getElementById('businessEmail').value = data.email || '';
        document.getElementById('businessPhone').value = data.phone || '';

        // Auto-fill bank details
        document.getElementById('bankName').value = data.bank_name || '';
        document.getElementById('bankAccount').value = data.bank_account_number || '';
        document.getElementById('bankIfsc').value = data.bank_ifsc_code || '';
        document.getElementById('bankBranch').value = data.bank_branch || '';

        // Load logo
        if (data.company_logo_url) {
            const logoPreview = document.getElementById('previewLogo');
            logoPreview.src = data.company_logo_url;
            logoPreview.style.display = 'block';
        }

        // Load UPI QR
        if (data.upi_qr_code_url) {
            const upiQr = document.getElementById('previewUpiQr');
            upiQr.src = data.upi_qr_code_url;
            upiQr.style.display = 'block';
            document.getElementById('paymentSection').style.display = 'block';
        }

        // Load signature from business profile
        if (data.signature_url) {
            signatureDataUrl = data.signature_url;
            updateSignaturePreview();
        }

        updatePreview();
    } catch (error) {
        console.error('Error loading business profile:', error);
    }
}
