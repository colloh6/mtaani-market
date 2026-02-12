# 🚀 Quick Start - 5 Minutes to Live

## Step 1: Get Supabase Credentials (2 min)
1. Go to https://supabase.com
2. Create new project
3. Go to Settings → API
4. Copy: **Project URL** and **anon key**

## Step 2: Update Credentials (1 min)
Edit `script.js` lines 4-5:
```javascript
const SUPABASE_URL = 'https://YOUR_URL.supabase.co';
const SUPABASE_KEY = 'YOUR_ANON_KEY';
```

## Step 3: Create Tables (2 min)
Go to Supabase SQL Editor and run this:

```sql
-- Sellers Table
CREATE TABLE sellers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  full_name VARCHAR(255),
  email VARCHAR(255) UNIQUE,
  phone VARCHAR(20),
  county VARCHAR(100),
  constituency VARCHAR(100),
  ward VARCHAR(100),
  exact_location TEXT,
  business_name VARCHAR(255),
  whatsapp_number VARCHAR(20),
  website VARCHAR(255),
  verified BOOLEAN DEFAULT false,
  suspended BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Products Table
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID REFERENCES sellers(id),
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
  created_at TIMESTAMP DEFAULT NOW()
);

-- Payments Table
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID REFERENCES sellers(id),
  payment_type VARCHAR(50),
  confirmation_text VARCHAR(255),
  amount NUMERIC,
  status VARCHAR(50) DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Appeals Table
CREATE TABLE appeals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID REFERENCES sellers(id),
  name VARCHAR(255),
  email VARCHAR(255),
  reason TEXT,
  evidence_image VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Reports Table  
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID REFERENCES sellers(id),
  reason VARCHAR(255),
  details TEXT,
  reported_by VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Site Settings Table
CREATE TABLE site_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  maintenance_mode BOOLEAN DEFAULT false,
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## Step 4: Enable Realtime
In Supabase:
1. Database → Replication
2. Enable for: products, sellers, site_settings

## Step 5: Done! 🎉
Open `index.html` in browser. Everything works!

## What You Get

### For Sellers
- [x] Register and create account
- [x] Add products instantly
- [x] Real-time product updates
- [x] Edit/delete products
- [x] Submit payments for features
- [x] Dashboard with analytics

### For Buyers
- [x] Browse live products
- [x] Real-time search
- [x] Filter by location
- [x] Contact sellers
- [x] Report sellers
- [x] Add to wishlist

### For Admin (Backend)
- [x] Toggle maintenance mode (instant effect)
- [x] Approve/reject payments
- [x] Suspend seller accounts
- [x] Manage appeals
- [x] View all reports

## Test It Now

1. Register as seller
2. Add a product
3. See it appear in marketplace **instantly**
4. Edit it → updates **live**
5. Delete it → disappears **immediately**
6. Search → results appear **as you type**

## Features Included

✅ Real-time everything
✅ No page refreshes needed
✅ Mobile responsive
✅ Seller verification system
✅ Payment confirmation system
✅ Suspension & appeals
✅ Maintenance mode
✅ Advanced search
✅ Zero console errors
✅ Beautiful UI (no redesign)

## Troubleshooting

**Q: No data appears?**
A: Check Supabase credentials are correct. Should see demo data after 1 second.

**Q: Can't register?**
A: Make sure sellers table exists. Check browser console for exact error.

**Q: Products don't update live?**
A: Enable Replication in Supabase for products table.

**Q: Getting CORS error?**
A: Supabase URL format must be: `https://xxxxx.supabase.co` (with .co)

## File Structure

```
index.html       ← Main website (open this in browser)
script.js        ← All real-time logic (1186 lines)
SETUP.md         ← Detailed setup guide
COMPLETION.md    ← What's been built
README.md        ← Original project info
```

## Support

- Email: globalventures809@gmail.com
- WhatsApp: 0718 397 891

---

**That's it! You now have a fully-functional real-time marketplace! 🚀**
