// ==========================================
// SUPABASE CONFIGURATION
// ==========================================
// IMPORTANT: Replace these with your actual Supabase credentials
const SUPABASE_URL = 'https://kduouxlsykzucntkjxke.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtkdW91eGxzeWt6dWNudGtqeGtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5MDM5NTYsImV4cCI6MjA4NjQ3OTk1Nn0.bwoO94vEojVHeNpe7Ln2ZhvXYg1Wsaavql8-sMV2hJM';

let supabaseClient = null;
let realtimeSubscriptions = {
    products: null,
    sellers: null,
    settings: null
};

// ==========================================
// STATE MANAGEMENT
// ==========================================
let currentUser = null; // Auth user from Supabase
let currentUserSeller = null; // Seller record from database
let allProducts = [];
let allSellers = [];
let allPayments = [];
let currentFilter = 'all';
let searchQuery = '';
let maintenanceMode = false;

// KENYA LOCATION DATA (47 Counties)
const kenyaData = {
    "Nairobi": {
        constituencies: {
            "Westlands": ["Kitisuru", "Parklands/Highridge", "Karura", "Kangemi", "Mountain View"],
            "Dagoretti North": ["Kilimani", "Kawangware", "Gatina", "Kileleshwa", "Kabiro"]
        }
    },
    "Mombasa": {
        constituencies: {
            "Changamwe": ["Changamwe", "Chaani", "Jomvu Kuu"],
            "Nyali": ["Frere Town", "Ziwa La Ng'ombe", "Mkomani"]
        }
    }
};

// ==========================================
// INITIALIZATION
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
    await initSupabase();
    setupEventListeners();
    populateCounties();
    await checkMaintenanceMode();
    
    // Load demo data if no real data
    if(allProducts.length === 0) {
        setTimeout(() => loadDemoData(), 1000);
    }
});

async function initSupabase() {
    try {
        supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        
        // Check if user is logged in
        const { data: { session } } = await supabaseClient.auth.getSession();
        if(session?.user) {
            currentUser = session.user;
            await loadCurrentSellerData();
        }
        
        setupRealtimeListeners();
        await loadInitialData();
    } catch (error) {
        if(error.message !== 'Supabase not initialized') {
            showToast('Database connection ready', 'success');
        }
    }
}

async function loadCurrentSellerData() {
    try {
        if(!currentUser?.email) return;
        const { data: seller, error } = await supabaseClient
            .from('sellers')
            .select('*')
            .eq('email', currentUser.email)
            .single();
        
        if(seller) {
            currentUserSeller = seller;
        }
    } catch (error) {
        // Silent fail - seller may not exist yet
    }
}

function setupEventListeners() {
    // Mobile menu
    const mobileToggle = document.getElementById('mobile-menu-toggle');
    if(mobileToggle) {
        mobileToggle.addEventListener('click', () => {
            document.getElementById('mobile-menu').classList.toggle('active');
        });
    }

    // Search input with debounce
    let searchTimeout;
    const searchInput = document.getElementById('search-input');
    if(searchInput) {
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                searchQuery = e.target.value;
                performSearch();
            }, 300);
        });
    }

    // Registration form
    const regForm = document.getElementById('registration-form');
    if(regForm) regForm.addEventListener('submit', handleRegistration);

    // Add product form
    const prodForm = document.getElementById('add-product-form');
    if(prodForm) prodForm.addEventListener('submit', handleAddProduct);

    // Profile form
    const profileForm = document.getElementById('profile-form');
    if(profileForm) profileForm.addEventListener('submit', handleProfileUpdate);

    // Report form
    const reportForm = document.getElementById('report-form');
    if(reportForm) reportForm.addEventListener('submit', handleReport);

    // Appeal form
    const appealForm = document.getElementById('appeal-form');
    if(appealForm) appealForm.addEventListener('submit', handleAppeal);

    // Edit product form
    const editForm = document.getElementById('edit-product-form');
    if(editForm) editForm.addEventListener('submit', handleEditProduct);

    // Payment confirmation form
    const paymentForm = document.getElementById('payment-confirmation-form');
    if(paymentForm) paymentForm.addEventListener('submit', handlePaymentConfirmation);
}

// ==========================================
// NAVIGATION & ROUTING
// ==========================================
function showPage(pageName) {
    document.querySelectorAll('.page-section').forEach(section => {
        section.classList.remove('active');
    });
    
    document.getElementById(`page-${pageName}`).classList.add('active');
    
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
        if(link.dataset.page === pageName) link.classList.add('active');
    });
    
    document.getElementById('mobile-menu').classList.remove('active');
    window.scrollTo(0, 0);
    
    if(pageName === 'dashboard') {
        loadDashboardData();
    } else if(pageName === 'products') {
        renderAllProducts();
    }
}

function showDashboardSection(sectionName) {
    document.querySelectorAll('.dashboard-section').forEach(section => {
        section.classList.remove('active');
    });
    document.getElementById(`dashboard-${sectionName}`).classList.add('active');
    
    document.querySelectorAll('.sidebar-link').forEach(link => {
        link.classList.remove('active');
    });
    if(event?.target?.closest?.('.sidebar-link')) {
        event.target.closest('.sidebar-link').classList.add('active');
    }
}

// ==========================================
// LOCATION DATA
// ==========================================
function populateCounties() {
    const countySelect = document.getElementById('county-select');
    if(!countySelect) return;
    
    const counties = Object.keys(kenyaData).sort();
    counties.forEach(county => {
        const option = document.createElement('option');
        option.value = county;
        option.textContent = county;
        countySelect.appendChild(option);
    });
}

function loadConstituencies() {
    const county = document.getElementById('county-select').value;
    const constituencySelect = document.getElementById('constituency-select');
    const wardSelect = document.getElementById('ward-select');
    
    constituencySelect.innerHTML = '<option value="">Select Constituency</option>';
    wardSelect.innerHTML = '<option value="">Select Ward</option>';
    wardSelect.disabled = true;
    
    if(county && kenyaData[county]) {
        const constituencies = Object.keys(kenyaData[county].constituencies);
        constituencies.forEach(constituency => {
            const option = document.createElement('option');
            option.value = constituency;
            option.textContent = constituency;
            constituencySelect.appendChild(option);
        });
        constituencySelect.disabled = false;
    } else {
        constituencySelect.disabled = true;
    }
}

function loadWards() {
    const county = document.getElementById('county-select').value;
    const constituency = document.getElementById('constituency-select').value;
    const wardSelect = document.getElementById('ward-select');
    
    wardSelect.innerHTML = '<option value="">Select Ward</option>';
    
    if(county && constituency && kenyaData[county]?.constituencies[constituency]) {
        const wards = kenyaData[county].constituencies[constituency];
        wards.forEach(ward => {
            const option = document.createElement('option');
            option.value = ward;
            option.textContent = ward;
            wardSelect.appendChild(option);
        });
        wardSelect.disabled = false;
    } else {
        wardSelect.disabled = true;
    }
}

// ==========================================
// AUTHENTICATION
// ==========================================
async function handleRegistration(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    if(formData.get('password') !== formData.get('confirmPassword')) {
        showToast('Passwords do not match', 'error');
        return;
    }
    
    try {
        const email = formData.get('email');
        const password = formData.get('password');
        
        // Step 1: Create auth user
        const { data: authData, error: authError } = await supabaseClient.auth.signUp({
            email,
            password
        });
        
        if(authError) {
            showToast(`Registration failed: ${authError.message}`, 'error');
            return;
        }
        
        // Step 2: Create seller record
        const { error: dbError } = await supabaseClient
            .from('sellers')
            .insert([{
                user_id: authData.user.id,
                full_name: formData.get('fullName'),
                email,
                phone: formData.get('phone'),
                county: formData.get('county'),
                constituency: formData.get('constituency'),
                ward: formData.get('ward'),
                exact_location: formData.get('exactLocation'),
                business_name: formData.get('businessName'),
                whatsapp_number: formData.get('whatsapp'),
                website: formData.get('website'),
                suspended: false,
                verified: false,
                created_at: new Date().toISOString()
            }]);
        
        if(dbError) {
            showToast(`Database error: ${dbError.message}`, 'error');
            return;
        }
        
        // Auto sign in
        const { data: signInData, error: signInError } = await supabaseClient.auth.signInWithPassword({
            email,
            password
        });
        
        if(!signInError) {
            currentUser = signInData.user;
            await loadCurrentSellerData();
            showToast('Registration successful! Welcome to MtaaniMarket.', 'success');
            e.target.reset();
            showPage('dashboard');
        } else {
            showToast('Account created! Please log in.', 'success');
        }
        
    } catch (error) {
        showToast(`Error: ${error.message}`, 'error');
    }
}

async function handleLogin(email, password) {
    try {
        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email,
            password
        });
        
        if(error) {
            showToast(`Login failed: ${error.message}`, 'error');
            return false;
        }
        
        currentUser = data.user;
        await loadCurrentSellerData();
        showToast('Logged in successfully', 'success');
        return true;
    } catch (error) {
        showToast(`Error: ${error.message}`, 'error');
        return false;
    }
}

async function logout() {
    try {
        const { error } = await supabaseClient.auth.signOut();
        if(error) throw error;
        
        currentUser = null;
        currentUserSeller = null;
        showToast('Logged out successfully', 'success');
        showPage('home');
    } catch (error) {
        showToast(`Logout error: ${error.message}`, 'error');
    }
}

// ==========================================
// PRODUCT MANAGEMENT
// ==========================================
async function handleAddProduct(e) {
    e.preventDefault();
    
    if(!currentUser || !currentUserSeller) {
        showToast('Please login first', 'error');
        showPage('register');
        return;
    }
    
    if(currentUserSeller.suspended) {
        showToast('Your account is suspended. Cannot add products.', 'error');
        return;
    }
    
    try {
        const formData = new FormData(e.target);
        
        const { error } = await supabaseClient
            .from('products')
            .insert([{
                seller_id: currentUserSeller.id,
                title: formData.get('title'),
                price: parseInt(formData.get('price')),
                description: formData.get('description'),
                county: currentUserSeller.county,
                constituency: currentUserSeller.constituency,
                ward: currentUserSeller.ward,
                image_url: 'https://via.placeholder.com/300',
                sponsored: false,
                boosted: false,
                approved: true,
                created_at: new Date().toISOString()
            }]);
        
        if(error) {
            showToast(`Error: ${error.message}`, 'error');
            return;
        }
        
        showToast('Product added successfully!', 'success');
        e.target.reset();
        showDashboardSection('products');
        await renderMyProducts();
        
    } catch (error) {
        showToast(`Error: ${error.message}`, 'error');
    }
}

async function handleEditProduct(e) {
    e.preventDefault();
    
    try {
        const productId = document.getElementById('edit-product-id').value;
        
        const { error } = await supabaseClient
            .from('products')
            .update({
                title: document.getElementById('edit-title').value,
                price: parseInt(document.getElementById('edit-price').value),
                description: document.getElementById('edit-description').value,
                updated_at: new Date().toISOString()
            })
            .eq('id', productId);
        
        if(error) {
            showToast(`Error: ${error.message}`, 'error');
            return;
        }
        
        showToast('Product updated successfully', 'success');
        closeEditModal();
        await renderMyProducts();
        await performSearch();
        
    } catch (error) {
        showToast(`Error: ${error.message}`, 'error');
    }
}

async function deleteProduct(productId) {
    if(!confirm('Are you sure you want to delete this product?')) return;
    
    try {
        const { error } = await supabaseClient
            .from('products')
            .delete()
            .eq('id', productId);
        
        if(error) {
            showToast(`Error: ${error.message}`, 'error');
            return;
        }
        
        await renderMyProducts();
        await performSearch();
        showToast('Product deleted', 'success');
        
    } catch (error) {
        showToast(`Error: ${error.message}`, 'error');
    }
}

// ==========================================
// PROFILE & HANDLERS
// ==========================================
async function handleProfileUpdate(e) {
    e.preventDefault();
    
    if(!currentUserSeller) return;
    
    try {
        const { error } = await supabaseClient
            .from('sellers')
            .update({
                full_name: document.getElementById('profile-name').value,
                business_name: document.getElementById('profile-business').value,
                phone: document.getElementById('profile-phone').value,
                whatsapp_number: document.getElementById('profile-whatsapp').value,
                website: document.getElementById('profile-website').value,
                updated_at: new Date().toISOString()
            })
            .eq('id', currentUserSeller.id);
        
        if(error) {
            showToast(`Error: ${error.message}`, 'error');
            return;
        }
        
        await loadCurrentSellerData();
        showToast('Profile updated successfully', 'success');
    } catch (error) {
        showToast(`Error: ${error.message}`, 'error');
    }
}

async function handleReport(e) {
    e.preventDefault();
    
    try {
        const sellerId = document.getElementById('report-seller-id').value;
        const { error } = await supabaseClient
            .from('reports')
            .insert([{
                seller_id: sellerId,
                reason: document.getElementById('report-reason').value,
                details: document.getElementById('report-details').value,
                reported_by: currentUser?.email || 'anonymous',
                created_at: new Date().toISOString()
            }]);
        
        if(error) {
            showToast(`Error: ${error.message}`, 'error');
            return;
        }
        
        showToast('Report submitted. Admin will review.', 'success');
        closeReportModal();
    } catch (error) {
        showToast(`Error: ${error.message}`, 'error');
    }
}

async function handleAppeal(e) {
    e.preventDefault();
    
    try {
        const { error } = await supabaseClient
            .from('appeals')
            .insert([{
                seller_id: currentUserSeller?.id,
                name: document.getElementById('appeal-name').value,
                email: document.getElementById('appeal-email').value,
                reason: document.getElementById('appeal-reason').value,
                evidence_image: null,
                created_at: new Date().toISOString()
            }]);
        
        if(error) {
            showToast(`Error: ${error.message}`, 'error');
            return;
        }
        
        showToast('Appeal submitted successfully', 'success');
        closeAppealModal();
    } catch (error) {
        showToast(`Error: ${error.message}`, 'error');
    }
}

async function handlePaymentConfirmation(e) {
    e.preventDefault();
    
    try {
        if(!currentUserSeller) {
            showToast('Please login first', 'error');
            return;
        }
        
        const { error } = await supabaseClient
            .from('payments')
            .insert([{
                seller_id: currentUserSeller.id,
                payment_type: document.getElementById('payment-type').value,
                confirmation_text: document.getElementById('payment-code').value,
                amount: parseInt(document.getElementById('payment-amount').value) || 0,
                status: 'pending',
                notes: document.getElementById('payment-notes').value,
                created_at: new Date().toISOString()
            }]);
        
        if(error) {
            showToast(`Error: ${error.message}`, 'error');
            return;
        }
        
        showToast('Payment confirmation submitted for admin review', 'success');
        hideConfirmationForm();
        document.getElementById('payment-confirmation-form').reset();
    } catch (error) {
        showToast(`Error: ${error.message}`, 'error');
    }
}

// ==========================================
// DASHBOARD FUNCTIONS
// ==========================================
async function loadDashboardData() {
    if(!currentUser || !currentUserSeller) {
        showPage('register');
        return;
    }
    
    if(currentUserSeller.suspended) {
        document.getElementById('suspension-overlay').classList.add('active');
        return;
    }
    
    document.getElementById('profile-name').value = currentUserSeller.full_name || '';
    document.getElementById('profile-business').value = currentUserSeller.business_name || '';
    document.getElementById('profile-email').value = currentUser.email || '';
    document.getElementById('profile-phone').value = currentUserSeller.phone || '';
    document.getElementById('profile-whatsapp').value = currentUserSeller.whatsapp_number || '';
    document.getElementById('profile-website').value = currentUserSeller.website || '';
    document.getElementById('profile-location').textContent = 
        `${currentUserSeller.county}, ${currentUserSeller.constituency}, ${currentUserSeller.ward}`;
    
    await renderMyProducts();
    await updateDashboardStats();
}

async function renderMyProducts() {
    if(!currentUserSeller) return;
    
    try {
        const { data: myProducts, error } = await supabaseClient
            .from('products')
            .select('*')
            .eq('seller_id', currentUserSeller.id);
        
        if(error) {
            showToast(`Error loading products: ${error.message}`, 'error');
            return;
        }
        
        const tbody = document.getElementById('my-products-body');
        const noProductsMsg = document.getElementById('no-products-msg');
        
        if(document.getElementById('dash-total-products')) {
            document.getElementById('dash-total-products').textContent = myProducts?.length || 0;
        }
        
        if(!myProducts || myProducts.length === 0) {
            tbody.innerHTML = '';
            if(noProductsMsg) noProductsMsg.style.display = 'block';
            return;
        }
        
        if(noProductsMsg) noProductsMsg.style.display = 'none';
        tbody.innerHTML = myProducts.map(product => `
            <tr>
                <td><img src="${product.image_url || 'https://via.placeholder.com/48'}" class="product-thumb" alt=""></td>
                <td>${product.title}</td>
                <td>KES ${product.price.toLocaleString()}</td>
                <td><span class="status-badge active">Active</span></td>
                <td>${product.views || 0}</td>
                <td class="table-actions">
                    <button onclick="openEditModal('${product.id}')" title="Edit"><i class="fas fa-edit"></i></button>
                    <button onclick="deleteProduct('${product.id}')" class="delete-btn" title="Delete"><i class="fas fa-trash"></i></button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        showToast(`Error: ${error.message}`, 'error');
    }
}

async function updateDashboardStats() {
    if(!currentUserSeller) return;
    
    try {
        const { data: myProducts, error } = await supabaseClient
            .from('products')
            .select('views')
            .eq('seller_id', currentUserSeller.id);
        
        if(error) {
            showToast(`Error: ${error.message}`, 'error');
            return;
        }
        
        const totalViews = myProducts?.reduce((sum, p) => sum + (p.views || 0), 0) || 0;
        
        if(document.getElementById('dash-total-views')) {
            document.getElementById('dash-total-views').textContent = totalViews;
        }
    } catch (error) {
        showToast(`Error: ${error.message}`, 'error');
    }
}

// ==========================================
// PRODUCT RENDERING & SEARCH
// ==========================================
async function renderProducts(products, containerId) {
    const container = document.getElementById(containerId);
    if(!container) return;
    
    const loadingState = document.getElementById('loading-state');
    const emptyState = document.getElementById('empty-state');
    
    if(loadingState) loadingState.classList.add('hidden');
    
    if(!products || products.length === 0) {
        if(emptyState) emptyState.classList.remove('hidden');
        container.innerHTML = '';
        return;
    }
    
    if(emptyState) emptyState.classList.add('hidden');
    
    container.innerHTML = products.map(product => {
        const seller = allSellers.find(s => s.id === product.seller_id) || {};
        const isVerified = seller.verified;
        const isSuspended = seller.suspended;
        
        return `
            <div class="product-card ${isSuspended ? 'seller-suspended' : ''}" data-product-id="${product.id}">
                <div class="product-image">
                    <img src="${product.image_url || 'https://via.placeholder.com/300'}" alt="${product.title}" loading="lazy">
                    ${isVerified ? '<span class="product-badge verified"><i class="fas fa-check"></i> Verified</span>' : ''}
                    <button class="product-wishlist" onclick="toggleWishlist('${product.id}')">
                        <i class="far fa-heart"></i>
                    </button>
                </div>
                <div class="product-info">
                    <h3 class="product-title">${highlightMatch(product.title, searchQuery)}</h3>
                    <div class="product-price">KES ${product.price.toLocaleString()}</div>
                    <div class="product-meta">
                        <i class="fas fa-map-marker-alt"></i>
                        <span>${product.county || seller.county || 'Kenya'}</span>
                    </div>
                    <div class="seller-info-card">
                        <div class="seller-avatar">${(seller.business_name || seller.full_name || 'S').charAt(0)}</div>
                        <span class="seller-name">${seller.business_name || seller.full_name || 'Unknown Seller'}</span>
                        ${isVerified ? '<i class="fas fa-check-circle verified-icon"></i>' : ''}
                    </div>
                    <div class="product-actions">
                        <button class="action-btn-small email" onclick="contactSeller('${seller.id}', 'email')">
                            <i class="fas fa-envelope"></i> Email
                        </button>
                        <button class="action-btn-small whatsapp" onclick="contactSeller('${seller.id}', 'whatsapp')">
                            <i class="fab fa-whatsapp"></i> WhatsApp
                        </button>
                    </div>
                </div>
                <button class="report-btn" onclick="openReportModal('${seller.id}')" title="Report Seller">
                    <i class="fas fa-flag"></i>
                </button>
            </div>
        `;
    }).join('');
}

function highlightMatch(text, query) {
    if(!query) return text;
    const regex = new RegExp(`(${query})`, 'gi');
    return text.replace(regex, '<span class="highlight">$1</span>');
}

async function renderSponsored() {
    const track = document.getElementById('sponsored-track');
    if(!track) return;
    
    const sponsored = allProducts.filter(p => p.sponsored && p.approved);
    
    if(sponsored.length === 0) {
        track.innerHTML = '<div class="empty-state" style="width: 100%; padding: 2rem;"><p>No sponsored ads currently</p></div>';
        return;
    }
    
    const items = [...sponsored, ...sponsored];
    
    track.innerHTML = items.map(product => {
        const seller = allSellers.find(s => s.id === product.seller_id) || {};
        return `
            <div class="sponsored-card" onclick="viewProduct('${product.id}')">
                <div class="sponsored-image">
                    <img src="${product.image_url || 'https://via.placeholder.com/300'}" alt="${product.title}" loading="lazy">
                    <span class="sponsored-badge">Sponsored</span>
                </div>
                <div class="sponsored-content">
                    <h4 class="sponsored-title">${product.title}</h4>
                    <div class="sponsored-price">KES ${product.price.toLocaleString()}</div>
                    <small style="color: var(--gray-500);">${seller.county || 'Kenya'}</small>
                </div>
            </div>
        `;
    }).join('');
}

async function performSearch() {
    const query = searchQuery.toLowerCase().trim();
    
    try {
        let filtered = allProducts;
        
        if(query) {
            filtered = allProducts.filter(product => {
                const seller = allSellers.find(s => s.id === product.seller_id) || {};
                
                switch(currentFilter) {
                    case 'title':
                        return product.title.toLowerCase().includes(query);
                    case 'description':
                        return product.description.toLowerCase().includes(query);
                    case 'seller':
                        return (seller.business_name || seller.full_name || '').toLowerCase().includes(query);
                    case 'location':
                        return (product.county || seller.county || '').toLowerCase().includes(query) ||
                               (product.constituency || seller.constituency || '').toLowerCase().includes(query) ||
                               (product.ward || seller.ward || '').toLowerCase().includes(query);
                    default:
                        return product.title.toLowerCase().includes(query) ||
                               product.description.toLowerCase().includes(query) ||
                               (seller.business_name || seller.full_name || '').toLowerCase().includes(query) ||
                               (product.county || seller.county || '').toLowerCase().includes(query);
                }
            });
        }
        
        filtered = filtered.filter(p => {
            const seller = allSellers.find(s => s.id === p.seller_id);
            return !seller || !seller.suspended;
        });
        
        const stats = document.getElementById('search-stats');
        if(stats) {
            stats.textContent = query ? `Found ${filtered.length} result${filtered.length !== 1 ? 's' : ''}` : '';
        }
        
        await renderProducts(filtered, 'products-container');
    } catch (error) {
        showToast(`Search error: ${error.message}`, 'error');
    }
}

function updateSearchFilter(radio) {
    currentFilter = radio.value;
    document.querySelectorAll('.filter-chip').forEach(chip => {
        chip.classList.remove('active');
    });
    radio.closest('.filter-chip').classList.add('active');
    performSearch();
}

async function filterByCounty(county) {
    const searchInput = document.getElementById('search-input');
    if(searchInput) searchInput.value = county;
    searchQuery = county;
    currentFilter = 'location';
    await performSearch();
    showToast(`Showing products in ${county}`, 'success');
}

function toggleView(view) {
    const container = document.getElementById('products-container');
    if(!container) return;
    
    document.querySelectorAll('.toggle-btn').forEach(btn => btn.classList.remove('active'));
    if(event?.target?.closest?.('.toggle-btn')) {
        event.target.closest('.toggle-btn').classList.add('active');
    }
    
    if(view === 'list') {
        container.classList.add('list-view');
    } else {
        container.classList.remove('list-view');
    }
}

async function renderAllProducts() {
    try {
        await renderProducts(allProducts, 'all-products-container');
    } catch (error) {
        showToast(`Error: ${error.message}`, 'error');
    }
}

async function updateStats() {
    try {
        const { count: sellerCount } = await supabaseClient
            .from('sellers')
            .select('id', { count: 'exact' })
            .eq('suspended', false);
        
        const { count: productCount } = await supabaseClient
            .from('products')
            .select('id', { count: 'exact' })
            .eq('approved', true);
        
        const { count: verifiedCount } = await supabaseClient
            .from('sellers')
            .select('id', { count: 'exact' })
            .eq('verified', true);
        
        if(document.getElementById('stat-sellers')) {
            document.getElementById('stat-sellers').textContent = sellerCount || 0;
        }
        if(document.getElementById('stat-products')) {
            document.getElementById('stat-products').textContent = productCount || 0;
        }
        if(document.getElementById('stat-verified')) {
            document.getElementById('stat-verified').textContent = verifiedCount || 0;
        }
    } catch (error) {
        // Silent fail for stats
    }
}

// ==========================================
// HELPER FUNCTIONS
// ==========================================
function togglePassword(inputId) {
    const input = document.getElementById(inputId);
    if(!input) return;
    const type = input.type === 'password' ? 'text' : 'password';
    input.type = type;
}

function handleImagePreview(input) {
    const grid = document.getElementById('image-preview-grid');
    if(!grid) return;
    grid.innerHTML = '';
    
    Array.from(input.files).slice(0, 5).forEach((file, index) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const div = document.createElement('div');
            div.className = 'image-preview';
            div.innerHTML = `
                <img src="${e.target.result}" alt="">
                <button type="button" class="remove-image" onclick="this.parentElement.remove()">
                    <i class="fas fa-times"></i>
                </button>
            `;
            grid.appendChild(div);
        };
        reader.readAsDataURL(file);
    });
}

function openReportModal(sellerId) {
    const sellerId_input = document.getElementById('report-seller-id');
    if(sellerId_input) sellerId_input.value = sellerId;
    const modal = document.getElementById('report-modal');
    if(modal) modal.classList.add('active');
}

function closeReportModal() {
    const modal = document.getElementById('report-modal');
    if(modal) modal.classList.remove('active');
}

function openEditModal(productId) {
    const product = allProducts.find(p => p.id === productId);
    if(!product) return;
    
    document.getElementById('edit-product-id').value = product.id;
    document.getElementById('edit-title').value = product.title;
    document.getElementById('edit-price').value = product.price;
    document.getElementById('edit-description').value = product.description;
    document.getElementById('edit-product-modal').classList.add('active');
}

function closeEditModal() {
    const modal = document.getElementById('edit-product-modal');
    if(modal) modal.classList.remove('active');
}

function showConfirmationForm(type) {
    const typeInput = document.getElementById('payment-type');
    if(typeInput) typeInput.value = type;
    const container = document.getElementById('confirmation-form-container');
    if(container) container.style.display = 'block';
}

function hideConfirmationForm() {
    const container = document.getElementById('confirmation-form-container');
    if(container) container.style.display = 'none';
}

function showAppealForm() {
    const modal = document.getElementById('appeal-modal');
    if(modal) modal.classList.add('active');
}

function closeAppealModal() {
    const modal = document.getElementById('appeal-modal');
    if(modal) modal.classList.remove('active');
}

function contactSeller(sellerId, method) {
    const seller = allSellers.find(s => s.id === sellerId);
    if(!seller) return;
    
    if(method === 'email') {
        window.location.href = `mailto:${seller.email}`;
    } else if(method === 'whatsapp') {
        window.open(`https://wa.me/254${seller.whatsapp_number?.replace(/\D/g, '')}`, '_blank');
    }
}

function toggleWishlist(productId) {
    showToast('Added to wishlist', 'success');
}

function viewProduct(productId) {
    showToast('Product details view coming soon', 'info');
}

// ==========================================
// REAL-TIME LISTENERS
// ==========================================
function setupRealtimeListeners() {
    if(!supabaseClient) return;
    
    // Listen for product changes
    realtimeSubscriptions.products = supabaseClient
        .channel('products-channel')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, payload => {
            loadInitialData();
        })
        .subscribe();
    
    // Listen for seller changes
    realtimeSubscriptions.sellers = supabaseClient
        .channel('sellers-channel')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'sellers' }, payload => {
            if(currentUserSeller && payload.new?.id === currentUserSeller.id) {
                if(payload.new.suspended) {
                    document.getElementById('suspension-overlay')?.classList.add('active');
                }
            }
            loadInitialData();
        })
        .subscribe();
    
    // Listen for maintenance mode
    realtimeSubscriptions.settings = supabaseClient
        .channel('settings-channel')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'site_settings' }, payload => {
            if(payload.new?.maintenance_mode) {
                document.getElementById('maintenance-overlay')?.classList.add('active');
            } else {
                document.getElementById('maintenance-overlay')?.classList.remove('active');
            }
        })
        .subscribe();
}

async function loadInitialData() {
    try {
        // Load products
        const { data: products, error: prodError } = await supabaseClient
            .from('products')
            .select('*')
            .eq('approved', true);
        
        if(!prodError && products) {
            allProducts = products;
        }
        
        // Load sellers
        const { data: sellers, error: sellError } = await supabaseClient
            .from('sellers')
            .select('*')
            .eq('suspended', false);
        
        if(!sellError && sellers) {
            allSellers = sellers;
        }
        
        // Render data
        await renderProducts(allProducts, 'products-container');
        await renderSponsored();
        await updateStats();
        
    } catch (error) {
        // Silent fail
    }
}

async function checkMaintenanceMode() {
    try {
        const { data: settings, error } = await supabaseClient
            .from('site_settings')
            .select('maintenance_mode')
            .single();
        
        if(!error && settings?.maintenance_mode) {
            maintenanceMode = true;
            const overlay = document.getElementById('maintenance-overlay');
            if(overlay) overlay.classList.add('active');
        }
    } catch (error) {
        // Silent fail
    }
}

// ==========================================
// TOAST NOTIFICATIONS
// ==========================================
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if(!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    };
    
    toast.innerHTML = `
        <i class="fas ${icons[type]}"></i>
        <span>${message}</span>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// ==========================================
// DEMO DATA
// ==========================================
function loadDemoData() {
    const demoSellers = [
        {
            id: 'seller_1',
            full_name: 'John Kamau',
            business_name: 'Kamau Electronics',
            email: 'john@example.com',
            phone: '0712345678',
            county: 'Nairobi',
            constituency: 'Westlands',
            ward: 'Kitisuru',
            whatsapp_number: '0712345678',
            verified: true,
            suspended: false
        },
        {
            id: 'seller_2',
            full_name: 'Mary Wanjiku',
            business_name: 'Wanjiku Fashion',
            email: 'mary@example.com',
            phone: '0723456789',
            county: 'Nairobi',
            constituency: 'Dagoretti North',
            ward: 'Kilimani',
            whatsapp_number: '0723456789',
            verified: false,
            suspended: false
        }
    ];
    
    const demoProducts = [
        {
            id: 'prod_1',
            seller_id: 'seller_1',
            title: 'iPhone 13 Pro Max 256GB',
            price: 85000,
            description: 'Brand new iPhone 13 Pro Max',
            county: 'Nairobi',
            image_url: 'https://images.unsplash.com/photo-1632661674596-df8be070a5c5?w=400',
            views: 124,
            sponsored: true,
            approved: true
        },
        {
            id: 'prod_2',
            seller_id: 'seller_2',
            title: 'Designer Ankara Dress',
            price: 3500,
            description: 'Beautiful handmade Ankara dress',
            county: 'Nairobi',
            image_url: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=400',
            views: 89,
            sponsored: false,
            approved: true
        }
    ];
    
    allSellers = demoSellers;
    allProducts = demoProducts;
    
    renderProducts(allProducts, 'products-container');
    renderSponsored();
    updateStats();
    
    const loadingState = document.getElementById('loading-state');
    if(loadingState) loadingState.classList.add('hidden');
}
