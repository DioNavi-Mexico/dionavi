# DIONavi Lab Platform - Code Setup Guide

## 📁 Project Structure

```
Dionavi_Code/
├── backend/               # Node.js/Express API
│   ├── src/
│   │   ├── server.js      # Main server file
│   │   └── routes/        # API routes
│   ├── package.json
│   └── .env.example
├── frontend/              # React application
│   ├── src/
│   │   ├── App.jsx
│   │   └── pages/         # Page components
│   └── package.json
└── database/
    └── schema.sql         # PostgreSQL schema
```

---

## 🚀 Quick Start

### **Prerequisites**
- Node.js 18+
- PostgreSQL 12+
- npm or yarn

### **1. Backend Setup**

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your configuration
npm run migrate  # Create database schema
npm run dev      # Start development server
```

Server runs on: `http://localhost:5000`

### **2. Frontend Setup**

```bash
cd frontend
npm install
npm run dev      # Start development server
```

App runs on: `http://localhost:5173`

### **3. Database Setup**

```bash
psql -U postgres
CREATE DATABASE dionavi_lab;
\c dionavi_lab
\i ../database/schema.sql
```

---

## 📋 Phase 1: Case Intake & Triage (This Week)

### **Endpoints to Complete**

1. **POST /api/cases** - Submit case with files
   - Accept CBCT, Scan, Reference photos
   - Validate file types and sizes
   - Store file paths in database
   - Send confirmation email to doctor

2. **GET /api/validation/pending** - Rebe's pending queue
   - List cases awaiting validation
   - Show file details and submission timestamps

3. **POST /api/validation/:caseId/approve** - Approve files
   - Update case status
   - Create network drive folders
   - Notify planner that files are ready

4. **GET /api/cases/:caseId** - Get case details
   - Return all case information
   - Show file paths and status

### **Frontend Pages to Build**

1. **CaseSubmission.jsx** - Doctor case intake form
   - Patient info form
   - File upload (drag-and-drop)
   - Success confirmation

2. **RebeValidation.jsx** - Rebe's validation dashboard
   - List pending cases
   - File preview/details
   - Approve/Reject actions

3. **CaseDashboard.jsx** - Doctor's case view
   - List of submitted cases
   - Status indicators
   - Next steps information

---

## 🔧 Configuration

### **.env File** (Copy from .env.example)

```
NODE_ENV=development
PORT=5000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=dionavi_lab
DB_USER=postgres
DB_PASSWORD=your_password
```

### **Database**

Default PostgreSQL connection:
- Host: localhost
- Port: 5432
- Database: dionavi_lab
- User: postgres

---

## 📝 Important Notes

### **Merchandise Pricing** (Configured)
```
All Doctors - Standard Package:
  Implant: $2,700 per unit
  Abutment: $500 per unit
```

Lab service prices are loaded from the pricing image uploaded earlier.

### **Test Doctors** (For Development)
- Dr. Martha Priscila Ramírez Luna
- Hector Delgado
- Jose Antonio Romero

### **Network Drive** (To Be Configured)
File paths will be added once you provide the network drive configuration.

---

## 🧪 Testing

Run tests:
```bash
npm test
```

Test case submission:
```bash
curl -X POST http://localhost:5000/api/cases \
  -F "cbct_file=@test.nii" \
  -F "scan_file=@test.stl" \
  -F "doctor_id=test-doctor-id"
```

---

## 📚 API Documentation

### **Authentication** (To be implemented in Phase 1)
- POST /api/auth/login
- POST /api/auth/register
- POST /api/auth/logout

### **Cases** (Phase 1)
- POST /api/cases - Submit case
- GET /api/cases - List cases
- GET /api/cases/:caseId - Get case details
- PATCH /api/cases/:caseId - Update case

### **Validation** (Phase 1)
- GET /api/validation/pending - Pending validations
- POST /api/validation/:caseId/approve - Approve files
- POST /api/validation/:caseId/reject - Reject files

### **Planning** (Phase 2)
- POST /api/planning/:caseId/upload - Upload screenshots
- POST /api/planning/:caseId/submit - Submit for approval

### **Quotation** (Phase 3)
- POST /api/quotation/:caseId/generate - Generate quote
- POST /api/quotation/:caseId/send - Send to client

### **Dashboard** (Phase 4)
- GET /api/dashboard/doctor/:doctorId - Doctor dashboard
- GET /api/dashboard/admin - Manager dashboard

---

## 🐛 Troubleshooting

### **Database Connection Error**
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```
✓ Make sure PostgreSQL is running
✓ Check DB_HOST and DB_PORT in .env

### **Port Already in Use**
```
Error: listen EADDRINUSE :::5000
```
✓ Change PORT in .env to a different port
✓ Or kill the process: `lsof -ti :5000 | xargs kill -9`

### **Module Not Found**
```
Error: Cannot find module 'express'
```
✓ Run `npm install` in the directory

---

## 📞 Next Steps

1. ✅ Set up backend and frontend
2. ✅ Run `npm install` for both
3. ✅ Configure .env with your database credentials
4. ✅ Run database migrations
5. ✅ Start development servers
6. 🔜 Implement Phase 1 endpoints
7. 🔜 Build Phase 1 frontend pages

---

## 📧 Questions?

Contact me with:
- Specific network drive paths
- Any errors or issues
- Questions about implementation

**Phase 1 is ready to build! Let's go! 🚀**
