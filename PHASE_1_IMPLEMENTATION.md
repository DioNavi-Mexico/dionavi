# Phase 1 Implementation Guide - With Your Network Structure

## ✅ Network Path Structure (CONFIRMED)

```
T:\2026\
├── MEXICO\
│   ├── GUADALAJARA\
│   │   ├── Dr. Yubin Kim\
│   │   │   └── 04.2026\
│   │   │       └── Marlon Pineda\
│   │   │           ├── Tomografía\  (CBCT files)
│   │   │           ├── Escaneos\    (Scanning files)
│   │   │           └── Planeación\  (Planning files)
│   │   └── [Other Doctors]
│   └── [Other States]
└── [29 Other States/Countries]
```

---

## 🎯 Phase 1 What We're Building

### **Case Submission Flow**

1. **Doctor submits case via web form**
   ```
   POST /api/cases
   - Country: MEXICO
   - State: GUADALAJARA
   - Doctor Name: Dr. Yubin Kim
   - Patient Name: Marlon Pineda
   - Files: CBCT, Scan, Reference photos
   ```

2. **System creates folder structure**
   ```
   T:\2026\MEXICO\GUADALAJARA\Dr. Yubin Kim\04.2026\Marlon Pineda\
   ```

3. **Files automatically organized**
   ```
   ├── Tomografía\
   │   └── CBCT_[UUID].nii
   ├── Escaneos\
   │   └── Scan_[UUID].stl
   └── Planeación\
       └── [Empty, waiting for planner]
   ```

4. **Case tracked in database**
   ```
   - Case ID: UUID
   - Status: "submitted"
   - File paths recorded
   - Rebe gets notification
   ```

---

## 📋 Implementation Tasks

### **Backend - Completed**

✅ NetworkPathBuilder utility (src/utils/networkPaths.js)
- Builds paths: `T:\2026\{country}\{state}\{doctor}\{MM.YYYY}\{patient}\`
- Manages subfolders: Tomografía, Escaneos, Planeación
- Handles file copying to network drive

✅ Updated Case API (src/routes/cases.js)
- POST /api/cases - Submit case with files
- Validates inputs
- Copies files to network drive
- Returns case ID and file paths

### **Backend - To Do**

**Priority 1: Critical**
- [ ] Database connection (PostgreSQL)
- [ ] Case model and queries
- [ ] Email service (nodemailer)
- [ ] Authentication (JWT)

**Priority 2: High**
- [ ] Validation endpoints (Rebe queue)
- [ ] File monitoring (watch for changes)
- [ ] Error logging
- [ ] Audit trail

**Priority 3: Medium**
- [ ] Performance optimization
- [ ] Caching
- [ ] Rate limiting

---

## 🖥️ Frontend - Phase 1 Pages

### **1. CaseSubmission.jsx** (CRITICAL)
```jsx
Form Fields:
├── Country (dropdown) - Default: MEXICO
├── State (dropdown) - Populate from your list
├── Doctor Name (dropdown or text) - Martha, Hector, Jose
├── Patient Name (text input)
├── Patient Age (number input)
├── Case Type (dropdown)
├── Implant Count (number input)
├── Surgery Date (date input)
├── Special Notes (textarea)
├── CBCT File Upload (drag-drop)
├── Scan File Upload (drag-drop)
└── Reference Photos (multi-upload)

Validation:
✓ All required fields
✓ File types (CBCT: .nii/.dcm, Scan: .stl/.ply)
✓ File sizes (<1GB)

On Submit:
✓ Show progress bar
✓ Send to: POST /api/cases
✓ Show success with Case ID
✓ Confirmation email
```

### **2. RebeValidation.jsx** (CRITICAL)
```jsx
Queue List:
├── Pending Cases
│   ├── Patient: Marlon Pineda
│   ├── Doctor: Dr. Yubin Kim
│   ├── State: GUADALAJARA
│   ├── Submitted: 04/21/2026
│   ├── Files:
│   │   ├── CBCT: ✓
│   │   └── Scan: ✓
│   └── Actions:
│       ├── [APPROVE FILES]
│       └── [REQUEST RESUBMISSION]

On Approve:
✓ POST /api/validation/:caseId/approve
✓ Folder created on network drive
✓ Planner notified
✓ Case moves to "files_validated"

On Reject:
✓ POST /api/validation/:caseId/reject
✓ Doctor gets email: "Please resend files"
✓ Case stays in "submitted"
```

### **3. CaseDashboard.jsx** (HIGH)
```jsx
For each case:
├── Patient: Marlon Pineda
├── Status: "Under Planning"
├── Timeline:
│   ├── ✓ Files Received (04/21 09:35)
│   ├── ✓ Files Validated (04/21 10:00)
│   ├── ⏳ Under Planning (started)
│   ├── ⏳ Planning Approval (pending)
│   └── ⏳ Quotation (coming)
└── Next Step: "Waiting for planning approval"
```

---

## 📊 Example Case Flow

**Doctor Submits Case:**
```
POST http://localhost:5000/api/cases
{
  "country": "MEXICO",
  "state": "GUADALAJARA",
  "doctor_name": "Dr. Yubin Kim",
  "patient_name": "Marlon Pineda",
  "patient_age": 45,
  "case_type": "surgical_guide",
  "implant_count": 3,
  "special_notes": "Patient prefers afternoon surgery"
}
Files: CBCT.nii, Scan.stl, photo1.jpg, photo2.jpg
```

**System Response:**
```json
{
  "message": "Case submitted successfully",
  "caseId": "550e8400-e29b-41d4-a716-446655440000",
  "casePath": "T:\\2026\\MEXICO\\GUADALAJARA\\Dr. Yubin Kim\\04.2026\\Marlon Pineda",
  "files": {
    "cbct": "T:\\2026\\MEXICO\\GUADALAJARA\\Dr. Yubin Kim\\04.2026\\Marlon Pineda\\Tomografía\\CBCT_550e8400.nii",
    "scan": "T:\\2026\\MEXICO\\GUADALAJARA\\Dr. Yubin Kim\\04.2026\\Marlon Pineda\\Escaneos\\Scan_550e8400.stl",
    "referencePhotos": [
      "T:\\2026\\MEXICO\\GUADALAJARA\\Dr. Yubin Kim\\04.2026\\Marlon Pineda\\Reference_1_550e8400.jpg",
      "T:\\2026\\MEXICO\\GUADALAJARA\\Dr. Yubin Kim\\04.2026\\Marlon Pineda\\Reference_2_550e8400.jpg"
    ]
  },
  "status": "submitted",
  "timestamp": "2026-04-21T09:35:00Z"
}
```

**Rebe Sees:**
```
Queue Item:
- Marlon Pineda (Dr. Yubin Kim, GUADALAJARA)
- Files: CBCT ✓, Scan ✓
- Submitted: 04/21/2026 09:35
- [APPROVE] [REJECT]
```

**Rebe Approves:**
```
POST http://localhost:5000/api/validation/550e8400-e29b-41d4-a716-446655440000/approve

Response:
- Folders created on network drive
- Planner notified
- Doctor gets email: "Files validated, planning begins"
- Status: "files_validated"
```

---

## 🔧 Environment Setup

### **.env Configuration**
```
NODE_ENV=development
PORT=5000

DB_HOST=localhost
DB_PORT=5432
DB_NAME=dionavi_lab
DB_USER=postgres
DB_PASSWORD=your_password

NETWORK_DRIVE_PATH=T:\2026
NETWORK_DRIVE_USER=
NETWORK_DRIVE_PASSWORD=

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password
SMTP_FROM=noreply@dionavi.com

MAX_FILE_SIZE=1000000000
UPLOAD_PATH=./uploads
```

---

## ✅ Testing Phase 1

### **Test Case 1: Happy Path**
```
1. Doctor submits case
   - Country: MEXICO
   - State: GUADALAJARA
   - Doctor: Dr. Yubin Kim
   - Patient: Marlon Pineda
   - Files: CBCT, Scan

2. System creates folder on network drive
   T:\2026\MEXICO\GUADALAJARA\Dr. Yubin Kim\04.2026\Marlon Pineda\

3. Files copied to subfolders
   - Tomografía\CBCT_[UUID].nii
   - Escaneos\Scan_[UUID].stl

4. Case ID returned

5. Rebe sees case in queue

6. Rebe clicks [APPROVE]

7. Folders created
   - Planeación\ (empty, ready for planner)

8. Planner notified

✓ PASS
```

### **Test Case 2: Invalid Files**
```
1. Doctor submits with wrong file type
2. System rejects with error message
3. Doctor gets "Invalid file type"
✓ PASS
```

### **Test Case 3: Missing Fields**
```
1. Doctor submits without patient name
2. System rejects with "Missing required field"
✓ PASS
```

---

## 🚀 Success Criteria for Phase 1

| Criterion | Status |
|-----------|--------|
| Case submission form works | [ ] |
| Files upload successfully | [ ] |
| Folder created on network drive | [ ] |
| Files copied to Tomografía/Escaneos | [ ] |
| Rebe queue shows cases | [ ] |
| Rebe can approve/reject | [ ] |
| Planner gets notification | [ ] |
| Case status tracked | [ ] |
| Email confirmations sent | [ ] |
| No data loss | [ ] |

---

## 📞 Implementation Checklist

**Week 1 (This Week):**
- [ ] Database setup and schema
- [ ] POST /api/cases implementation
- [ ] GET /api/validation/pending implementation
- [ ] POST /api/validation/:caseId/approve implementation
- [ ] CaseSubmission.jsx page
- [ ] RebeValidation.jsx page
- [ ] Email service setup
- [ ] Testing and bug fixes

**By Friday (May 1):**
- [ ] Phase 1 LIVE
- [ ] First case submitted
- [ ] Files saved to network drive correctly
- [ ] Rebe validation working
- [ ] Ready for Phase 2

---

## 💡 Key Implementation Details

### **File Path Builder Usage**
```javascript
const NetworkPathBuilder = require('./utils/networkPaths');
const pathBuilder = new NetworkPathBuilder('T:\\2026');

// Build case path
const casePath = pathBuilder.buildCasePath(
  'MEXICO',
  'GUADALAJARA',
  'Dr. Yubin Kim',
  'Marlon Pineda',
  new Date('2026-04-21')
);
// Returns: T:\2026\MEXICO\GUADALAJARA\Dr. Yubin Kim\04.2026\Marlon Pineda

// Get subfolders
const subfolders = pathBuilder.getSubfolders(casePath);
// Returns: {
//   cbct: 'T:\2026\MEXICO\GUADALAJARA\Dr. Yubin Kim\04.2026\Marlon Pineda\Tomografía',
//   scanning: 'T:\2026\MEXICO\GUADALAJARA\Dr. Yubin Kim\04.2026\Marlon Pineda\Escaneos',
//   planning: 'T:\2026\MEXICO\GUADALAJARA\Dr. Yubin Kim\04.2026\Marlon Pineda\Planeación'
// }
```

### **Network Drive Integration**
- Files uploaded to temporary `/uploads` folder first
- Then copied to network drive
- Temporary files cleaned up
- Paths stored in database
- Network drive remains source of truth

---

## 🎉 Phase 1 Ready!

You now have:
- ✅ NetworkPathBuilder utility (handles your exact path structure)
- ✅ Updated Case API (creates folders, copies files)
- ✅ Path examples (for your exact workflow)
- ✅ Implementation guide (step-by-step)
- ✅ Testing checklist (what to verify)

**Ready to start coding? Let's build Phase 1!** 🚀
