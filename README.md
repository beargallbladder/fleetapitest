# FleetSync - Parts API Demo Portal

A compelling demo that showcases the full power of the Ford Parts API. This isn't just a mock interface—it's what "done" looks like for engineering.

**Powered by Ford**

---

## 🎯 What This Demo Shows

### Three Part Discovery Paths

**Path A: VIN Entry (Vehicle Identification)**
- Enter a 17-character VIN → API decodes vehicle details
- Year/Make/Model alternative for manual selection
- Fleet vehicle quick-select from existing inventory
- Visual confirmation: "Searching parts for F-150 #047 with VIN 1FTFW1E..."

**Path B: Category Drill-Down (THE SHOWSTOPPER)**
- VIN-based hierarchical categories
- Engine → Oil System → Oil Filter
- Shows API understanding of vehicle-specific compatibility
- Each category shows part count
- Click through to find exact parts

**Path C: Exact Part Number Match**
- Paste a part number like "FL-500-S"
- API instantly returns exact match with inventory
- Shows precision matching capability

### Entitlements & Preferred Dealer Logic

**Visible in the UI:**
- "Fleet Entitlements Active" badge showing discount tier
- Preferred dealer highlighted with ⭐
- Price breakdown: "$115 retail vs. $94.30 (18% fleet discount)"
- "You save $X.XX" calculations
- Price comparison toggle to show retail vs. fleet pricing

**How it works:**
- API returns dealer-specific pricing
- Entitlements apply based on customer tier + dealer relationship
- Preferred dealer always shown first, even if not cheapest
- Clear visual distinction between fleet pricing and retail

### Vehicle Context in Results

Every search result shows:
- ✓ Compatibility badge: "Compatible with 2021 F-150 (3.5L EcoBoost V6)"
- OEM status: "Motorcraft OEM" badge
- Entitlement status: "✓ Fleet Pricing Available" or no badge
- Preferred dealer stock levels

### API Performance Visibility

- **Live status indicator**: Green pulsing dot with "API Connected"
- **Response time badge**: "127ms response" on every search
- **Dealer count**: "10 dealers · 114 SKUs"
- **Real-time stock**: Live inventory counts from API

---

## 🚀 Demo Flow

### Recommended Demo Sequence

1. **Start with Fleet Selection**
   - Click "F-150 #047" from fleet list
   - Shows: VIN decoded, vehicle context loaded

2. **Browse by Category (the magic)**
   - Navigate: Engine → Oil System → Oil Filters
   - Shows: VIN-driven category intelligence

3. **View Results with Entitlements**
   - See fleet pricing applied
   - Compare: "$9.99 retail → $8.19 fleet (18% off)"
   - Click "Show price breakdown" for full details

4. **Part Detail Page**
   - Preferred dealer highlighted first
   - Full price comparison across all dealers
   - Clear savings calculation

5. **Alternative Paths**
   - Show keyword search works too
   - Show exact part number match (try "FL-500-S")
   - Show Year/Make/Model manual entry

---

## 🛠 Technical Features Demonstrated

| Feature | Where It's Shown |
|---------|------------------|
| VIN Decode | Vehicle selection → VIN entry → decode result |
| Year/Make/Model | Vehicle selection → YMM tab → structured fields |
| Category Hierarchy | Browse tab → drill-down navigation |
| Keyword Search | Search tab → free-text query |
| Part Number Match | Part # tab → exact lookup |
| Entitlements | Fleet pricing badge, price breakdown |
| Preferred Dealer | ⭐ badge, sorted first in list |
| Compatibility | ✓ badges on search results |
| API Latency | Response time badge in header |
| Stock Levels | Per-dealer inventory counts |

---

## 📦 Tech Stack

- **Next.js 14** - React framework with App Router
- **TypeScript** - Type safety
- **Tailwind CSS** - Dark theme, professional B2B aesthetic
- **Jericho API** - Ford parts aggregation API

## 🎨 Design System

Dark, professional B2B aesthetic:
- **Background**: Slate 900 (#0f172a)
- **Primary**: Emerald 500 (#10b981) - actions, fleet pricing
- **Accent**: Ford Blue (#003478) - branding, part numbers
- **Cards**: Frosted glass with subtle borders
- **Status**: Pulsing green dot for live API

---

## 🏃 Getting Started

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Open http://localhost:3002
```

## 🔌 API Integration

Connected to Jericho Ford Parts API:
- **Base URL**: `https://jericho-api-48gl.onrender.com`
- **Auth**: API key in `x-api-key` header

### Available Test Data
- 15 parts (oil filters, brake pads, spark plugs, etc.)
- 10 dealers (San Diego, LA, Irvine)
- 114 inventory records with varying prices/stock

---

## 💡 Why This Matters

This demo answers: **"What does 10x parts API integration look like?"**

**Before API Integration:**
- Call dealers for prices
- Wait for callbacks
- Manual compatibility checking
- No fleet pricing visibility

**After API Integration:**
- Real-time inventory in < 200ms
- Automatic fleet pricing
- VIN-driven compatibility
- One-click ordering

The FleetSync interface makes the API's value **obvious and demo-able**.

---

Built with 🚀 to show engineering what "done" looks like.
