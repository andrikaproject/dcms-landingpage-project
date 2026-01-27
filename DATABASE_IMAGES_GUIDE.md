# Database Images - Quick Reference

## 🎯 What's Working Now

Trading card images on the landing page are now loaded from PostgreSQL database instead of static files!

## 🔗 API Endpoints

### List All Cards
```bash
GET http://localhost:3000/api/trading-cards
```
Returns JSON with metadata for all trading cards.

### Get Image by ID
```bash
GET http://localhost:3000/api/trading-cards/1
GET http://localhost:3000/api/trading-cards/2
GET http://localhost:3000/api/trading-cards/3
```
Returns binary image data (JPEG/PNG).

## 📁 Key Files

| File | Purpose |
|------|---------|
| `lib/db.ts` | PostgreSQL connection & queries |
| `app/api/trading-cards/route.ts` | List endpoint |
| `app/api/trading-cards/[id]/route.ts` | Image endpoint |
| `app/page.tsx` | Frontend using API images |
| `.env.local` | Database credentials |

## 🧪 Quick Tests

```bash
# Test list endpoint
curl http://localhost:3000/api/trading-cards | python3 -m json.tool

# Test image endpoint
curl -I http://localhost:3000/api/trading-cards/1

# Download image
curl http://localhost:3000/api/trading-cards/1 -o test.jpg
```

## 🔄 How It Works

```
Browser Request
    ↓
Next.js Image Component
    ↓
/api/trading-cards/[id]
    ↓
lib/db.ts (PostgreSQL Query)
    ↓
Database (BYTEA data)
    ↓
Binary Image Response
    ↓
Browser Display
```

## 📊 Database Info

- **Server**: 192.168.0.103:5432
- **Database**: casaos
- **Table**: trading_cards
- **Images**: 3 cards (1.5 MB total)

## 🚀 Adding New Images

1. Upload to database:
   ```bash
   python3 upload_trading_cards.py
   ```

2. Images automatically available at:
   ```
   /api/trading-cards/[new-id]
   ```

3. Use in frontend:
   ```tsx
   <Image src="/api/trading-cards/4" ... />
   ```

## 🎨 Frontend Usage

```tsx
import Image from 'next/image';

<Image 
  src="/api/trading-cards/1"  // Database image
  alt="Trading Card 1"
  fill
  loading="lazy"
  className="object-cover"
/>
```

## ⚡ Performance

- **Caching**: 1 year browser cache
- **Response Time**: ~70ms per image
- **Connection Pool**: Max 20 connections
- **Lazy Loading**: Still active

## 🔧 Troubleshooting

### Images not loading?
```bash
# Check database connection
psql -h 192.168.0.103 -p 5432 -U casaos -d casaos -c "SELECT COUNT(*) FROM trading_cards;"

# Check API endpoint
curl http://localhost:3000/api/trading-cards

# Check server logs
# Look for "✅ Connected to PostgreSQL database"
```

### Need to restart server?
```bash
# Kill existing servers
# Ctrl+C in terminal

# Restart
npm run dev
```

## 📚 Related Documentation

- [POSTGRESQL_SETUP.md](file:///Users/andrika/Documents/ProjectDCMS/dcms-landingpage-project/POSTGRESQL_SETUP.md) - PostgreSQL setup
- [TRADING_CARDS_DB.md](file:///Users/andrika/Documents/ProjectDCMS/dcms-landingpage-project/TRADING_CARDS_DB.md) - Database schema
- [walkthrough.md](file:///Users/andrika/.gemini/antigravity/brain/7263175d-2064-4144-944b-6b6945524228/walkthrough.md) - Full implementation details
