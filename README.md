# Lucky Insight (ລະບົບວິເຄາະສະຖິຕິຫວຍ & ຈັດການການເງິນຄອບຄົວ)

[![Next.js](https://img.shields.io/badge/Next.js-16.2.10-black?style=flat&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2.4-blue?style=flat&logo=react)](https://react.dev/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?style=flat&logo=fastapi)](https://fastapi.tiangolo.com/)
[![Python](https://img.shields.io/badge/Python-3.13-3776AB?style=flat&logo=python)](https://www.python.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17-336791?style=flat&logo=postgresql)](https://www.postgresql.org/)
[![Cloudflare Pages](https://img.shields.io/badge/Deploy-Cloudflare%20Pages-F38020?style=flat&logo=cloudflare)](https://pages.cloudflare.com/)

**Lucky Insight** คือแพลตฟอร์มวิเคราะห์สถิติผลสลากกินแบ่งทางคณิตศาสตร์ขั้นสูง (หวยลาวพัฒนา, สลากกินแบ่งรัฐบาลไทย และหวยลาวสามัคคี) ควบคู่กับระบบบริหารจัดการการเงินและงบประมาณครอบครัว (Family Finance Hub) ออกแบบด้วยสถาปัตยกรรมระดับพรีเมียม (Luxury Midnight Gold & Cyberpunk Neon) พร้อมระบบบทบาทผู้ใช้แบบหลายระดับและการประมวลผลแบบเรียลไทม์

---

## 📌 สารบัญ (Table of Contents)

1. [สถาปัตยกรรมระบบ (System Architecture)](#-สถาปัตยกรรมระบบ-system-architecture)
2. [ฟีเจอร์หลักของแพลตฟอร์ม (Key Features)](#-ฟีเจอร์หลักของแพลตฟอร์ม-key-features)
   - [ศูนย์วิเคราะห์สถิติ (Statistical Analysis Center)](#1-ศูนย์วิเคราะห์สถิติ-statistical-analysis-center-analysis)
   - [แอนิเมชัน Hybrid Combo](#แอนิเมชัน-hybrid-combo-radar-hud--slot-roller)
   - [ระบบจัดการผลรางวัล (Lottery Results & Scrapers)](#2-ระบบจัดการผลรางวัล-lottery-results--scrapers-lotteries)
   - [แดชบอร์ดหลัก (Lottery Dashboard)](#3-แดชบอร์ดหลัก-lottery-dashboard-dashboard)
   - [ศูนย์บริหารการเงินครอบครัว (Family Finance Hub)](#4-ศูนย์บริหารการเงินครอบครัว-family-finance-hub-finance)
   - [ระบบจัดการผู้ใช้และระดับสิทธิ์ (User & Role Matrix)](#5-ระบบจัดการผู้ใช้และระดับสิทธิ์-user--role-matrix-users)
3. [โครงสร้างโปรเจกต์ (Project Directory Tree)](#-โครงสร้างโปรเจกต์-project-directory-tree)
4. [คู่มือการติดตั้งและรันในเครื่อง (Local Setup Guide)](#-คู่มือการติดตั้งและรันในเครื่อง-local-setup-guide)
   - [การตั้งค่า Backend](#1-การตั้งค่า-backend)
   - [การตั้งค่า Frontend](#2-การตั้งค่า-frontend)
5. [การกำหนดค่า Environment Variables](#-การกำหนดค่า-environment-variables)
6. [การ Deploy และ Continuous Integration (CI/CD)](#-การ-deploy-และ-continuous-integration-cicd)
7. [ข้อตกลงการพัฒนา (Living Documentation Protocol)](#-ข้อตกลงการพัฒนา-living-documentation-protocol)

---

## 🏛️ สถาปัตยกรรมระบบ (System Architecture)

```mermaid
graph TD
    Client["Client Web Browser<br/>(Desktop / Mobile)"]

    subgraph "Frontend Layer (Cloudflare Pages)"
        CFPages["Next.js 16 Static Export<br/>(React 19, Turbopack)"]
        EdgeProxy["Cloudflare Edge Functions<br/>(/api/v1/* Reverse Proxy)"]
    end

    subgraph "Backend Layer (FastAPI on Render)"
        API["FastAPI REST Application<br/>(Python 3.13)"]
        AuthService["JWT Authentication<br/>& Role Authorization"]
        QuotaEngine["Quota & Daily Limits Engine"]
        
        subgraph "Statistical & Analytics Core"
            Markov["Markov Chain Transitions"]
            MonteCarlo["Monte Carlo Projections"]
            Poisson["Poisson Overdue Modeling"]
            Composite["Composite Ensemble Engine"]
        end

        ScraperWorkers["Lottery Data Scraper Workers"]
    end

    subgraph "Data Storage Layer"
        PG[("PostgreSQL 17 Database<br/>(Alembic Migrations)")]
    end

    Client -->|HTTPS| CFPages
    CFPages -->|API Calls /api/v1| EdgeProxy
    EdgeProxy -->|Reverse Proxy| API
    API --> AuthService
    API --> QuotaEngine
    API --> Markov & MonteCarlo & Poisson & Composite
    API --> ScraperWorkers
    API -->|Async SQLAlchemy / Psycopg| PG
```

---

## 🚀 ฟีเจอร์หลักของแพลตฟอร์ม (Key Features)

### 1. ศูนย์วิเคราะห์สถิติ (Statistical Analysis Center: `/analysis`)
- **Mathematical Analytical Models**:
  - **Composite Hybrid Ensemble**: โมเดลรวมที่ผสานน้ำหนักระหว่างความถี่, มาร์คอฟ, ปัวซง, และมอนติคาร์โล เพื่อหาค่าความน่าจะเป็นสูงสุด
  - **Markov Chain State Transitions**: คำนวณความน่าจะเป็นของการเปลี่ยนสถานะตัวเลขจากงวดก่อนหน้า
  - **Monte Carlo Simulation**: จำลองการสุ่มผลลัพธ์ 10,000+ รอบ เพื่อหากลุ่มตัวเลขที่มีการลู่เข้าสูงสุด
  - **Poisson Overdue Factor**: วิเคราะห์ตัวเลขที่ "ค้างนานเกินสถิติเฉลี่ย" เพื่อระบุตัวเลขที่มีโอกาสดีดตัวกลับ
  - **Pair / Triple Affinity Matrix**: ความสัมพันธ์ของตัวเลขคู่และเลข 3 ตัวที่มักปรากฏพร้อมกัน
  - **Frequency Analysis**: สถิติความถี่รายตำแหน่ง
- **Role-Based Number Projections (100% Deterministic Mathematical Selection)**:
  - **Super Admin (`suzu@gmail.com`)**:
    - มุ่งเน้นรางวัลใหญ่ระดับ 6 หลัก (Grand Prize Focus)
    - **6-Digit Picks**: แสดง 2 ชุดที่ดีที่สุดอันดับ 1 และอันดับ 2 (Best #1 และ Best #2 คัดเลือก 100% ตาม Composite Mathematical Score แบบ Deterministic ปราศจากการสุ่ม)
    - ปิดการแสดงผล 4D VIP และ 2D ทั้งหมดตามสถาปัตยกรรม High-Roller
  - **Operator Admin**:
    - **6-Digit Pick**: แสดง 1 ชุดที่ดีที่สุดอันดับ 3 (Best #3 ตาม Composite Score แบบ Deterministic)
    - **2-Digit Picks**: แสดง 3 ชุดที่ดีที่สุดอันดับ 1, 2, 3 (Best #1, Best #2, Best #3 จากคะแนนสถิติ 00–99 แบบ Deterministic)
    - ปิดการแสดงผล 4D VIP
  - **Special VIP (`ning80074@gmail.com`) & Regular Member**:
    - **2-Digit Picks**: แสดง 3 ชุดที่ดีที่สุดอันดับ 1, 2, 3 (Best #1, Best #2, Best #3 แบบ Deterministic)
    - ปิดการแสดงผล 6D และ 4D VIP ทั้งระดับ Backend Security Redaction และ Frontend Interface
- **Winning Flow Wave Trend**: กราฟเส้นโค้งสีทอง Golden Bezier Wave แสดงวิถีแนวโน้มตัวเลข 16 งวดย้อนหลัง
- **Quota & Limit Controls**: จัดการโควตาการวิเคราะห์ต่อวันแยกตามแต่ละประเภทหวย พร้อมระบบ Reset ประจำวันอัตโนมัติ
- **CSV Analytical Export**: ดาวน์โหลดรายงานผลวิเคราะห์ทางคณิตศาสตร์เป็นไฟล์ CSV
- **Mobile First Responsive & Auto-Scroll**:
  - **Desktop (>1024px)**: แสดงผลแบบ 2 คอลัมน์คู่ขนาน (ซ้าย: ฟอร์มคำนวณและประวัติ, ขวา: ผลวิเคราะห์และแอนิเมชัน)
  - **Mobile (≤1024px)**: ปรับเป็น 1 คอลัมน์เต็มจอ (100% Width) จัดลำดับ ฟอร์ม -> ผลลัพธ์ -> ประวัติย้อนหลัง ป้องกันหน้าจอล้นแนวนอน (Zero Horizontal Scroll) 100%
  - **Smooth Auto-Scroll**: เลื่อนหน้าจอลงมาโฟกัสที่การ์ดผลลัพธ์ 6D ทันทีหลังกดรันโมเดลสำเร็จ มอบประสบการณ์ใช้งานลื่นไหลระดับโปร

### แอนิเมชัน Hybrid Combo (Radar HUD + Slot Roller)
เมื่อกดปุ่ม **"Run Statistical Model"** แพลตฟอร์มจะแสดงผลลัพธ์ผ่านแอนิเมชัน 3 ระยะ:
1. **Phase 1: Holographic Radar Scanner HUD (~1.1s)**: หน้าต่างเรดาร์ HUD สีฟ้าโฮโลแกรมสแกนข้อมูล พร้อมแสดงขั้นตอนการคำนวณทางคณิตศาสตร์แบบเรียลไทม์
2. **Phase 2: Digital Slot Number Roller (~1.4s)**: ตัวเลขทุกหลักในการ์ดหมุนสุ่มด้วยความเร็วสูง (0–9) ในเฉดสีนีออน แล้วค่อย ๆ ล็อกทีละหลักจากซ้ายไปขวา
3. **Phase 3: VIP Glow Lock**: ตัวเลขล็อกลงตำแหน่งและสว่างวาบเป็นสีทองคำ Imperial Gold (`#ffd700`), ม่วง Royal Purple (`#c084fc`), หรือส้ม Royal Amber (`#f59e0b`) ตามระดับความสำคัญ

### 2. ระบบจัดการผลรางวัล (Lottery Results & Scrapers: `/lotteries`)
- ตรวจสอบและบันทึกผลรางวัลสลากกินแบ่งย้อนหลัง:
  - **ຫວຍພັດທະນາ (Lao Development Lottery - `LAO_DEV`)**
  - **สลากกินแบ่งรัฐบาลไทย (Thai National Lottery - `THAI_GOV`)**
  - **ຫວຍສາມັກຄີ (Lao Samakkhi - `LAO_SAMAKKHI`)**
- ระบบดึงข้อมูลอัตโนมัติ (Automated Scrapers) และปุ่มคำสั่ง Manual Crawling สำหรับ Admin

### 3. แดชบอร์ดหลัก (Lottery Dashboard: `/dashboard`)
- หน้าแรกเริ่มต้น (Default Landing Page) ของผู้ใช้งานทุกคนหลังเข้าสู่ระบบ (ทั้ง Super Admin, Operator Admin, Ning, และสมาชิกทั่วไป)
- สรุปผลรางวัลล่าสุด กราฟสถิติด่วน และแบนเนอร์เลขนำโชค
- **Mobile First Compact 2-Column Grid (Desktop-Parity)**:
  - การ์ดผลรางวัลสลากกินแบ่งล่าสุดแสดงผลแบบ **2 คอลัมน์คู่กัน (หวยลาวอยู่ซ้าย / หวยไทยอยู่ขวา)** เสมอแม้บนหน้าจอมือถือ
  - ย่อสเกลตัวอักษรและช่องไฟอย่างประณีต (First Prize ขนาด 1.35rem, กล่องรางวัลย่อย 3 ช่อง) ทำให้ผู้ใช้มองเห็นผลหวยทั้งสองประเทศได้พร้อมกันในหน้าจอเดียวโดยไม่ต้องเลื่อนจอลงมาลึก เหมือนดูบนหน้าจอคอมพิวเตอร์ 100%

### 4. ศูนย์บริหารการเงินครอบครัว (Family Finance Hub: `/finance`)
- บันทึกและวิเคราะห์กระแสเงินสด รายรับ-รายจ่าย
- รองรับหลายสกุลเงิน (LAK กีบ, THB บาท, USD ดอลลาร์)
- ดัชนีวัดสถานะความมั่นคงทางการเงิน (Solvency Indicator)
- กราฟสัดส่วนค่าใช้จ่ายรายหมวดหมู่ (Interactive Category Spending Breakdown)

### 5. ระบบจัดการผู้ใช้และระดับสิทธิ์ (User & Role Matrix: `/users`)
| ระดับบทบาท (Role) | 6D Projection | 4D VIP Projection | 2D Projections | จัดการหวย & Scraper | จัดการผู้ใช้ | โควตารายวัน |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Super Admin** (`suzu@gmail.com`) | ✅ (2 ชุด: Best #1 & #2) | ❌ (ปิดใช้งาน) | ❌ (ปิดใช้งาน) | ✅ | ✅ | Unlimited |
| **Operator Admin** | ✅ (1 ชุด: Best #3) | ❌ (Redacted) | ✅ (3 ชุด: Best #1, #2, #3) | ✅ | ❌ | ตามกำหนด |
| **Special VIP** (`ning80074@gmail.com`) | ❌ | ❌ | ✅ (3 ชุด: Best #1, #2, #3) | ❌ | ❌ | โควตาระดับสูง |
| **Regular Member** | ❌ | ❌ | ✅ (3 ชุด: Best #1, #2, #3) | ❌ | ❌ | มาตรฐาน |

---

## 📂 โครงสร้างโปรเจกต์ (Project Directory Tree)

```text
lucky-insight/
├── .github/
│   └── workflows/
│       └── backend-ci.yml           # CI Pipeline: Ruff, Black, MyPy, Pytest
├── alembic/                         # Database Migration scripts
├── backend/
│   ├── app/
│   │   ├── api/v1/                  # Endpoints (auth, analysis, lotteries, finance, users)
│   │   ├── core/                    # App config, database session, security, logger
│   │   ├── models/                  # SQLAlchemy ORM Models (User, LotteryResult, AnalysisJob, Finance)
│   │   ├── schemas/                 # Pydantic schemas สำหรับ Data Validation
│   │   ├── services/                # Business Logic & Statistical Calculation Engines
│   │   └── main.py                  # FastAPI Application Entrypoint
│   ├── alembic/                     # Backend migration environment
│   ├── tests/                       # Unit & Integration Tests (Pytest)
│   ├── pyproject.toml               # Python project configuration & tool configs
│   └── requirements.txt             # Pinned Python dependencies
├── docs/
│   ├── ARCHITECTURE.md              # Architecture design documentation
│   └── DATABASE.md                  # Database schema & entity design
├── frontend/
│   ├── functions/api/v1/[[path]].js # Cloudflare Pages Functions Reverse Proxy
│   ├── src/
│   │   ├── app/
│   │   │   ├── analysis/page.tsx    # Statistical Analysis Center & Hybrid Combo Animation
│   │   │   ├── dashboard/page.tsx   # Primary Lottery Dashboard
│   │   │   ├── finance/page.tsx     # Family Finance Management Hub
│   │   │   ├── lotteries/page.tsx   # Lottery Results & Scraper Console
│   │   │   ├── users/page.tsx       # User & Access Management
│   │   │   ├── login/page.tsx       # Authentication Login
│   │   │   ├── globals.css          # Design System (Luxury Gold & Animations)
│   │   │   └── layout.tsx           # Main Shell & Header Navigation
│   │   └── lib/                     # API Client, Auth context, Helpers
│   ├── copy-functions.js            # Build script for Cloudflare deployment
│   ├── next.config.ts               # Next.js Static Export Configuration
│   └── package.json                 # Next.js dependencies and scripts
└── README.md                        # Master Project Documentation
```

---

## 🛠️ คู่มือการติดตั้งและรันในเครื่อง (Local Setup Guide)

### ความต้องการของระบบ (Prerequisites)
- **Node.js**: v20.x หรือสูงกว่า
- **Python**: v3.13
- **PostgreSQL**: v17
- **uv** (แนะนำ) หรือ `pip`

---

### 1. การตั้งค่า Backend

1. **เข้าสู่โฟลเดอร์ backend และสร้าง Virtual Environment**:
   ```bash
   cd backend
   python -m venv .venv
   
   # บน Windows:
   .venv\Scripts\activate
   # บน macOS / Linux:
   source .venv/bin/activate
   ```

2. **ติดตั้ง Dependencies**:
   ```bash
   # ติดตั้งด้วย uv (แนะนำ):
   uv sync
   # หรือติดตั้งด้วย pip:
   pip install -r requirements.txt
   ```

3. **ตั้งค่า Environment Variables**:
   ```bash
   cp .env.example .env
   # แก้ไขค่า DATABASE_URL และ JWT_SECRET_KEY ในไฟล์ .env ให้ตรงกับเครื่องของคุณ
   ```

4. **รัน Database Migrations (Alembic)**:
   ```bash
   alembic upgrade head
   ```

5. **เริ่มการทำงานของ Backend Server**:
   ```bash
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```
   - เข้าดู Swagger API Docs ได้ที่: `http://localhost:8000/docs`
   - ตรวจสอบความพร้อมของระบบได้ที่: `http://localhost:8000/health`

---

### 2. การตั้งค่า Frontend

1. **เข้าสู่โฟลเดอร์ frontend**:
   ```bash
   cd frontend
   npm install
   ```

2. **รันระบบสำหรับ Development**:
   ```bash
   npm run dev
   ```
   - เข้าใช้งานผ่านเบราว์เซอร์ที่: `http://localhost:3000`

3. **ทดสอบ Build สำหรับ Production (Cloudflare Pages Static Export)**:
   ```bash
   npm run build
   ```

---

## ⚙️ การกำหนดค่า Environment Variables

### Backend (`backend/.env`)
| Variable | คำอธิบาย | ตัวอย่างค่า |
| :--- | :--- | :--- |
| `APP_NAME` | ชื่อแอปพลิเคชัน | `Lucky Insight API` |
| `APP_ENV` | สภาพแวดล้อมระบบ | `development` / `production` |
| `DATABASE_URL` | Connection string ของ PostgreSQL | `postgresql+psycopg://user:password@localhost:5432/lucky_insight` |
| `JWT_SECRET_KEY` | คีย์เข้ารหัส Access Token | *(สุ่มสตริงความปลอดภัยสูง)* |
| `JWT_REFRESH_SECRET` | คีย์เข้ารหัส Refresh Token | *(สุ่มสตริงความปลอดภัยสูง)* |
| `JWT_ALGORITHM` | อัลกอริทึมเข้ารหัส JWT | `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | อายุ Access Token | `60` |
| `REFRESH_TOKEN_EXPIRE_DAYS` | อายุ Refresh Token | `7` |
| `LOG_LEVEL` | ระดับการบันทึก Log | `INFO` / `DEBUG` |

---

## 🌐 การ Deploy และ Continuous Integration (CI/CD)

1. **Frontend Deployment (Cloudflare Pages)**:
   - โค้ด Frontend ถูกคอนฟิกให้ทำงานแบบ `output: 'export'` ใน Next.js
   - เมื่อรันคำสั่ง `npm run build` ระบบจะสร้างไฟล์ Static HTML/JS ไปที่โฟลเดอร์ `out` และคัดลอก Cloudflare Functions ไปที่ `out/functions` ผ่านสคริปต์ `copy-functions.js`
   - Edge Function `frontend/functions/api/v1/[[path]].js` ทำหน้าที่ Reverse Proxy ส่งต่อ Request `/api/v1/*` ไปยัง Render Backend โดยอัตโนมัติ ทำให้ผู้ใช้ไม่ต้องเผชิญปัญหา CORS หรือเน็ตเวิร์กบล็อก
2. **Backend Deployment (Render / VPS / Docker)**:
   - Backend รันด้วย FastAPI และเชื่อมต่อไปยัง Managed PostgreSQL 17
3. **Continuous Integration (GitHub Actions)**:
   - รันตรวจสอบโค้ดอัตโนมัติผ่าน `.github/workflows/backend-ci.yml` ด้วย `Ruff`, `Black`, `MyPy` และรันเทสต์ `Pytest` กับ PostgreSQL จริง

---

## 📜 ข้อตกลงการพัฒนา (Living Documentation Protocol)

> [!IMPORTANT]
> **กฎเหล็กของโปรเจกต์ (Mandatory Project Rule):**
> 1. **ถามก่อนลงมือทำเสมอ**: ก่อนจะทำการแก้ไขโค้ดใด ๆ ให้ชี้แจงแนวทางและรอการยืนยันจากผู้ใช้ก่อนทุกครั้ง
> 2. **Living Documentation**: ทุกครั้งที่มีการพัฒนา เพิ่มฟีเจอร์ ปรับปรุง UI หรือแก้ไขโค้ดในส่วนใดก็ตาม จะต้องทำการ**อัปเดตไฟล์ `README.md` นี้ให้ตรงกับสถานะล่าสุดของโปรเจกต์ควบคู่กันเสมอ** ห้ามปล่อยให้เอกสารล้าสมัย
