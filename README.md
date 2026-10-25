# BMS Chat - Insurance Agency Business Management System

A unified, high-performance web and mobile collaboration platform designed for **Branch Managers**, **Frontline Sales Managers (FLS)**, **Distribution Leaders (TSE/DL)**, **Insurance Agents**, and **Super Admins**.

BMS Chat integrates the complete agency business lifecycle:
**Agent/TSE Recruitment → Lead Follow-up → Agent Activation → Business Issuance → Business Credit Attribution → 7 Quarterly Clubs → Commission Differential → TSE Incentives → Contests & Millionaire Honors → Real-time Collaboration Chat.**

---

## 🚀 Instant Quick Launch (Zero Setup Required)

You do **not** need to install dependencies or run command lines to use the application:

1. Open this project folder:
   ```
   Bms chat/
   ```
2. Double-click [index.html](file:///c:/Users/ARUN%20JOY/Desktop/New%20folder/pro/Bms%20chat/index.html) or right-click and open with **Google Chrome**, **Microsoft Edge**, or any modern browser.
3. The complete application will launch immediately with full interactive capabilities, seed data, calculation formulas, and team collaboration chat!

---

## 💻 Optional: Run with Node.js Express Server

If you prefer running a local Node.js web server:

```powershell
cd "Bms chat"
npm install express cors
node server.js
```

Then visit:
```
http://localhost:3000
```

---

## 🌟 Key Functional Modules

### 1. 💬 Integrated BMS Team Collaboration Chat
- **Team Channels:**
  - `#general-branch`: Morning huddles, branch announcements & leadership memos.
  - `#leads-and-recruitment`: Lead pipeline referrals, 1A/1B candidate updates. Automated alerts broadcast whenever new leads are entered.
  - `#contest-celebrations`: Millionaire circle, Lakhpati qualifiers, and quarterly club upgrades. Automatically broadcasts new policy issuances.
- **Direct Messaging (1-on-1):**
  - Seamless direct messaging between Branch Managers, FLS Managers, TSEs, and Agents.
  - Filter messages instantly by active channel or recipient persona.

### 2. 👥 User Hierarchy & Persona Switcher
Switch between live profiles directly in the top bar to test and experience the portal from any perspective:
- **Marcus Vance:** Branch Manager (Metro Central Branch)
- **Vikram Malhotra:** Frontline Sales Manager (Branch Agency Vertical)
- **Ananya Sen:** Frontline Sales Manager (Digital Agency Vertical)
- **Rohan Deshmukh:** Distribution Leader / TSE (4 Months Tenure - Accelerated 0–6m bonus)
- **Kavita Rao:** Distribution Leader / TSE (14 Months Tenure - Standard slab)
- **Suresh Nair:** Insurance Agent (AG-101 • 1A Category • Gold Club)
- **Meera Patel:** Insurance Agent (AG-102 • 1B Category • Platinum Club)
- **Arjun Reddy:** Insurance Agent (AG-103 • Standalone • Diamond Club • Repeat Millionaire)
- **Rajesh Verma:** Super Admin (Corporate HQ & Compliance)

### 3. 🎯 Unified Lead Management Pipeline
- **3 Categories:**
  - **Business Leads:** Self-generated, Existing agent, TSE/DL generated, BM referrals.
  - **Agent Recruitment Leads:** 1A, 1B, Standalone, TSE referrals.
  - **Distribution Leader Leads:** Direct TSE recruitment, TSE referrals.
- **Features:**
  - Status tracking: `New`, `Contacted`, `Interested`, `Follow-up`, `Converted`, `Lost`.
  - Unlimited dated progress history and comments.
  - Popup reminders on dashboard for **Due Today** and **Overdue** follow-ups.

### 4. 📑 Policy Issuance & Multi-Tier Business Credit Engine
- **Product Master Weighting:**
  - Health & Term Life: 100%
  - Motor Comprehensive: 80%
  - Commercial / SME Fire: 75%
  - Third Party Motor: 25%
- **Multi-Year Term Factor:**
  - 1 Year = 1x
  - 2 Years = 2x multiplier
  - 3 Years = 3x multiplier
- **Role Credit Attribution Formulas:**
  - **Agent:** 100% of Net Eligible Volume.
  - **TSE/DL:** 100% of volume on direct and team business.
  - **Branch Agency FLS:** **60%** on TSE-generated business; 100% on direct agent business.
  - **Digital Agency FLS:** **100%** on digital TSE business.
  - **Branch Manager:** **100%** on all branch issuances.

### 5. 🏆 7 Quarterly Agent Club Matrix & Differential Payout
1. **Associate Club:** 15% Slab (< ₹1,00,000)
2. **Bronze Club:** 18% Slab (₹1,00,000 - ₹2,49,999)
3. **Silver Club:** 22% Slab (₹2,50,000 - ₹4,99,999)
4. **Gold Club:** 26% Slab (₹5,00,000 - ₹9,99,999)
5. **Platinum Club:** 30% Slab (₹10,00,000 - ₹19,99,999)
6. **Diamond Club:** 34% Slab (₹20,00,000 - ₹34,99,999)
7. **Chairman's Elite Club:** 40% Slab (₹35,00,000+)

> **In-Quarter Upgrade Rule:** When an agent achieves a higher club tier mid-quarter, the system calculates the **additional differential commission** on upgraded volume, and carries the upgraded club tier into the next quarter.

### 6. 🌟 Contests & Monthly Millionaire Circle
- Tracks **HOH (Head of Health)**, **ADCO (Agency Development Championship)**, **CDO Club**, **Travel Contests**, **Lakhpati (1L+)**, **Mini-Millionaire (5L+)**, and **Millionaires (10L+)**.
- Live progress bars, balance-to-qualify calculations, and rewards.

### 7. 📝 Manager Daily Activities & Coaching
- Log Customer Calls, Agent Calls, TSE Visits, Recruitment Meetings, and expected business.
- Branch Manager review section to provide coaching feedback notes.

### 8. 🛡️ Data Privacy, NDA & Legal Governance
- Mandatory **User Access, Confidentiality and Data Protection Agreement** terms.
- Explicit prohibitions against commercial exploitation or sale of customer and agent data.
- Immutable audit trail logging.

### 9. 📊 One-Click CSV Export
- Export Leads, Policy Issuance Ledger, Daily Activity logs, and Compliance Audit data directly to CSV for Microsoft Excel or Google Sheets.

---

## 📱 Mobile Experience (Android & iOS PWA Ready)
- Responsive mobile layout with touch-friendly navigation, quick-action modals, and card feeds.
- Ready for packaging into native Android/iOS apps via Apache Cordova or Capacitor.
