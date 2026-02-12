# MtaaniMarket - Real-Time Supabase Integration

## Overview
This is a fully-fledged real-time marketplace built with Supabase backend. All features have been upgraded from static HTML to live database operations with real-time synchronization.

## Quick Setup Guide

### 1. Supabase Configuration

Edit `script.js` and replace the placeholder credentials:

```javascript
const SUPABASE_URL = 'https://your-project.supabase.co';
const SUPABASE_KEY = 'your-anon-key';
```

### 2. Database Schema

You need to create these tables in Supabase:

#### `sellers` table
```sql
CREATE TABLE sellers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name VARCHAR(255),
  business_name VARCHAR(255),
  email VARCHAR(255) UNIQUE,
  phone VARCHAR(20),
  county VARCHAR(100),
  constituency VARCHAR(100),
  ward VARCHAR(100),
  exact_location TEXT,
  whatsapp_number VARCHAR(20),
  website VARCHAR(255),
  verified BOOLEAN DEFAULT false,
  suspended BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### `products` table
```sql
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID REFERENCES sellers(id) ON DELETE CASCADE,
  title VARCHAR(255),
  description TEXT,
  price NUMERIC,
  county VARCHAR(100),
  constituency VARCHAR(100),
  ward VARCHAR(100),
  image_url VARCHAR(255),
  views INTEGER DEFAULT 0,
  sponsored BOOLEAN DEFAULT false,
  boosted BOOLEAN DEFAULT false,
  approved BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### `payments` table
```sql
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID REFERENCES sellers(id) ON DELETE CASCADE,
  payment_type VARCHAR(50), -- 'verification', 'boost', 'sponsored'
  confirmation_text VARCHAR(255),
  amount NUMERIC,
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### `appeals` table
```sql
CREATE TABLE appeals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID REFERENCES sellers(id) ON DELETE CASCADE,
  name VARCHAR(255),
  email VARCHAR(255),
  reason TEXT,
  evidence_image VARCHAR(255),
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### `reports` table
```sql
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID REFERENCES sellers(id) ON DELETE CASCADE,
  reason VARCHAR(255),
  details TEXT,
  reported_by VARCHAR(255),
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### `site_settings` table
```sql
CREATE TABLE site_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  maintenance_mode BOOLEAN DEFAULT false,
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### 3. Enable Realtime

In your Supabase dashboard:
1. Go to Database → Replication
2. Enable replication for: `products`, `sellers`, `site_settings`

### 4. Authentication Setup

In Supabase Authentication settings:
- Email confirmation is **disabled** (as per requirements)
- Password minimum length: 6 characters
- Email + Password auth is enabled

### 5. Row Level Security (RLS)

Disable RLS for demo purposes or set up proper policies:

```sql
-- Allow everyone to read products
CREATE POLICY "Enable read access for all users" ON products
  FOR SELECT USING (approved = true);

-- Allow sellers to manage their own products
CREATE POLICY "Enable insert for authenticated users" ON products
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
```

## Features Implemented

### ✅ Real-Time Updates
- **Products**: Inserts, updates, and deletes sync instantly across all users
- **Sellers**: Suspension and verification status updates in real-time
- **Maintenance Mode**: Website goes down/up instantly when toggled

### ✅ Authentication
- Email + Password registration (no OTP)
- Automatic seller profile creation on signup
- Session persistence
- Logout functionality

### ✅ Marketplace
- Real-time product listing with lazy loading
- Advanced search (title, description, seller, location)
- Seller verification badges
- Seller suspension system
- Sponsored products carousel

### ✅ Seller Dashboard
- Product management (CRUD)
- Analytics view
- Profile settings
- Payment submission system
- Appeal system

### ✅ Search & Filtering
- Real-time search results
- Filter by: title, description, seller, location
- Popular location quick filters
- Results update as you type

### ✅ Admin Features
- Maintenance mode toggle
- Seller suspension
- Payment approval
- Report management
- Appeal management

## Project Structure

```
/workspaces/mtaani-market/
├── index.html          # Main HTML with all pages
├── script.js           # Complete JavaScript with Supabase integration
└── README.md           # This file
```

## Key Functions

### Authentication
- `handleRegistration(e)` - Create seller account and auth user
- `handleLogin(email, password)` - Login seller
- `logout()` - Logout current user

### Products
- `handleAddProduct(e)` - Add new product to marketplace
- `handleEditProduct(e)` - Edit existing product
- `deleteProduct(productId)` - Delete product
- `performSearch()` - Real-time product search
- `renderProducts(products, containerId)` - Display products

### Real-Time
- `setupRealtimeListeners()` - Initialize Supabase subscriptions
- `loadInitialData()` - Fetch and display all data
- `checkMaintenanceMode()` - Check and activate maintenance mode

### Helpers
- `showToast(message, type)` - Display notifications
- `showPage(pageName)` - Navigate between pages
- `showDashboardSection(sectionName)` - Switch dashboard tabs

## Zero Console Errors

The implementation includes:
- Try-catch blocks for all async operations
- Null checks before accessing DOM elements
- Proper error handling and user feedback
- Silent failures for non-critical operations (like stats)
- Defensive programming patterns

## Testing Checklist

- [ ] Can register seller account
- [ ] Can login with registered credentials
- [ ] Can add products to marketplace
- [ ] Can search products in real-time
- [ ] Can edit own products
- [ ] Can delete products
- [ ] Can update profile settings
- [ ] Can submit payment confirmations
- [ ] Can submit appeals
- [ ] Can report sellers
- [ ] Products appear/disappear instantly when published/deleted
- [ ] Seller suspension hides all their products
- [ ] Verification badge shows for verified sellers
- [ ] Maintenance mode blocks access to site
- [ ] No console errors or warnings

## Important Notes

1. **Image Uploads**: Currently uses placeholder. Add storage integration for real images:
   ```javascript
   const { data, error } = await supabaseClient.storage
     .from('product-images')
     .upload(`${Date.now()}.jpg`, file);
   ```

2. **Kenya Data**: Includes full location data for all 47 counties. Expand as needed.

3. **Mobile Responsive**: Includes mobile menu and responsive layouts.

4. **Lazy Loading Images**: Uses `loading="lazy"` for performance.

5. **Demo Data**: If Supabase not configured, falls back to demo data after 1 second.

## Troubleshooting

### "Database connection ready" but no data
- Check Supabase credentials are correct
- Verify tables exist and have data
- Check RLS policies aren't blocking reads

### Products don't update in real-time
- Verify replication is enabled in Supabase
- Check browser console for errors
- Reload page to see if data syncs

### Login fails
- Verify email format
- Check password is at least 6 characters
- Confirm user exists in auth.users table
- Check RLS policies on sellers table

## Performance Optimizations

- Debounced search (300ms)
- Reusable event listeners
- Lazy loading for images
- Minimal DOM re-renders
- Efficient state management
- No duplicate subscriptions

## Next Steps

1. Configure Supabase credentials
2. Create all required tables
3. Enable replication
4. Test registration and login
5. Add products and verify real-time updates
6. Configure storage for image uploads
7. Deploy to production

## Support

For issues or questions:
- Email: globalventures809@gmail.com
- WhatsApp: +254 718 397 891
