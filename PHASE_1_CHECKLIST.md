# Phase 1: Case Intake & Triage - Development Checklist

## 🎯 Goal
Doctor cases submitted via web form, Rebe validates files via dashboard.

## 📅 Timeline
**Week 1 (April 25 - May 1)**: Phase 1 LIVE

---

## ✅ Backend Tasks

### Database Setup
- [ ] Create PostgreSQL database `dionavi_lab`
- [ ] Run schema.sql migration
- [ ] Create test data for 3 doctors (Martha, Hector, Jose)
- [ ] Set up connection pooling

### API Endpoints - Cases
- [ ] **POST /api/cases**
  - [ ] Validate required fields
  - [ ] Validate file types (CBCT: .nii/.dcm, Scan: .stl/.ply)
  - [ ] Validate file sizes (max 1GB)
  - [ ] Store files on network drive with folder structure
  - [ ] Insert case record in database with "submitted" status
  - [ ] Return case ID to client
  - [ ] Send confirmation email to doctor
  - **Priority: CRITICAL**

- [ ] **GET /api/cases/:caseId**
  - [ ] Query case by ID
  - [ ] Return all case details including file paths
  - [ ] Include status and timestamps
  - **Priority: HIGH**

- [ ] **GET /api/cases?doctor_id=xxx**
  - [ ] Filter by doctor_id
  - [ ] Support pagination (limit, offset)
  - [ ] Return case list with summaries
  - **Priority: MEDIUM**

### API Endpoints - Validation (Rebe)
- [ ] **GET /api/validation/pending**
  - [ ] List cases with status "submitted"
  - [ ] Show doctor name, patient name, submission date
  - [ ] Show file sizes and timestamps
  - [ ] Support pagination
  - **Priority: CRITICAL**

- [ ] **POST /api/validation/:caseId/approve**
  - [ ] Create folder on network drive: `/labs/cases/{DrLastName}_{FirstName}/{PatientName}_{Date}/`
  - [ ] Update case status to "files_validated"
  - [ ] Send notification to planner
  - [ ] Log action in audit_log
  - **Priority: CRITICAL**

- [ ] **POST /api/validation/:caseId/reject**
  - [ ] Update case status to "resubmission_requested"
  - [ ] Send email to doctor with required files
  - [ ] Log action in audit_log
  - **Priority: HIGH**

### Email Service
- [ ] Set up nodemailer with SMTP
- [ ] Create email template: "Case Received"
- [ ] Create email template: "Files Validated"
- [ ] Create email template: "Resubmission Required"
- [ ] Test email delivery
- **Priority: HIGH**

### File Management
- [ ] Create upload directory with proper permissions
- [ ] Implement file validation (types, sizes, virus scan)
- [ ] Implement network drive integration
- [ ] Create folder structure on network drive
- [ ] Handle file conflicts/duplicates
- **Priority: CRITICAL**

### Authentication (Basic)
- [ ] Implement doctor login (email/password)
- [ ] Implement JWT token generation
- [ ] Implement token validation middleware
- [ ] Add refresh token logic
- **Priority: HIGH**

---

## 🎨 Frontend Tasks

### Doctor Pages
- [ ] **CaseSubmission.jsx**
  - [ ] Form with patient info fields
  - [ ] Drag-and-drop file upload
  - [ ] File validation feedback (real-time)
  - [ ] Progress bar during upload
  - [ ] Success message with case ID
  - [ ] Responsive design (mobile + desktop)
  - **Priority: CRITICAL**

- [ ] **CaseDashboard.jsx**
  - [ ] List of doctor's cases
  - [ ] Status indicators (color-coded)
  - [ ] Case timeline/progress
  - [ ] Next steps information
  - [ ] Download quotation link (when available)
  - **Priority: HIGH**

- [ ] **DoctorLogin.jsx**
  - [ ] Email/password login form
  - [ ] Sign-up link
  - [ ] "Forgot password" link
  - [ ] Responsive design
  - **Priority: HIGH**

### Rebe Pages
- [ ] **RebeValidation.jsx**
  - [ ] List pending cases (with pagination)
  - [ ] Case card showing: patient name, doctor, submission date
  - [ ] File preview/details
  - [ ] [APPROVE FILES] button
  - [ ] [REQUEST RESUBMISSION] button
  - [ ] Filter by status
  - [ ] Statistics (cases today, pending count)
  - **Priority: CRITICAL**

### Components
- [ ] **Navigation/Header**
  - [ ] Role-based menu
  - [ ] User profile dropdown
  - [ ] Logout button

- [ ] **FileUpload.jsx**
  - [ ] Drag-and-drop upload
  - [ ] File type validation (visual feedback)
  - [ ] Progress indicator
  - [ ] File preview

- [ ] **StatusIndicator.jsx**
  - [ ] Color-coded status (green/yellow/red)
  - [ ] Status text and timestamp

- [ ] **Toast Notifications**
  - [ ] Success messages
  - [ ] Error messages
  - [ ] Loading states

### Styling
- [ ] Tailwind CSS setup
- [ ] Color scheme (professional, medical)
- [ ] Responsive breakpoints
- [ ] Dark mode support (optional)

---

## 🧪 Testing Tasks

### Unit Tests
- [ ] Test case validation logic
- [ ] Test file type validation
- [ ] Test file size validation
- [ ] Test email generation

### Integration Tests
- [ ] Test case submission end-to-end
- [ ] Test file upload to network drive
- [ ] Test email delivery
- [ ] Test database transactions

### User Acceptance Tests
- [ ] Doctor submits case (happy path)
- [ ] Doctor submits invalid files (error handling)
- [ ] Rebe approves files
- [ ] Rebe rejects files
- [ ] Email confirmations received
- [ ] Files created in network drive

---

## 📱 Responsive Design

- [ ] Mobile: < 640px
- [ ] Tablet: 640px - 1024px
- [ ] Desktop: > 1024px

Test on:
- [ ] iPhone 12
- [ ] iPad
- [ ] Desktop (1920x1080)

---

## 🔐 Security

- [ ] Input validation (SQL injection prevention)
- [ ] File upload validation (virus scan)
- [ ] JWT token security
- [ ] CORS configuration
- [ ] Rate limiting
- [ ] Error handling (no sensitive data exposed)

---

## 📊 Metrics & Logging

- [ ] API request logging
- [ ] Database query logging
- [ ] Error logging with stack traces
- [ ] Performance monitoring
- [ ] Audit trail for all actions

---

## 🚀 Deployment

- [ ] Environment configuration (.env)
- [ ] Database backup strategy
- [ ] Error monitoring (optional)
- [ ] Performance monitoring (optional)
- [ ] Deployment documentation

---

## 📝 Documentation

- [ ] API documentation (OpenAPI/Swagger)
- [ ] Setup guide (this document)
- [ ] Troubleshooting guide
- [ ] Database schema documentation
- [ ] Code comments for complex logic

---

## ✅ Acceptance Criteria

### Case Submission Works
- [ ] Doctor can submit case with files
- [ ] System validates files (type, size)
- [ ] System sends confirmation email
- [ ] Case ID returned to client
- [ ] Files saved to network drive

### Rebe Validation Works
- [ ] Rebe sees pending cases on dashboard
- [ ] Rebe can approve files with one click
- [ ] Rebe can request resubmission
- [ ] Doctor receives email notification
- [ ] Planner is notified when approved

### End-to-End Flow
- [ ] Doctor submits case → Rebe validates → Planner notified
- [ ] All statuses update in real-time
- [ ] No cases lost or forgotten
- [ ] Error handling works (graceful failures)

---

## 🎯 Success Criteria for Phase 1

| Metric | Target | Status |
|--------|--------|--------|
| Cases submitted via form | 100% (no email) | [ ] |
| Files validated without loss | 100% | [ ] |
| Email confirmations sent | 100% | [ ] |
| Network folder creation | 100% | [ ] |
| Rebe dashboard usability | Easy (no training) | [ ] |
| System uptime | 99%+ | [ ] |
| Page load time | <2s | [ ] |

---

## 🚨 Critical Path

These must be done first:
1. Database setup ✅
2. POST /api/cases endpoint ✅
3. GET /api/validation/pending endpoint ✅
4. POST /api/validation/:caseId/approve endpoint ✅
5. CaseSubmission.jsx page ✅
6. RebeValidation.jsx page ✅

---

## 📞 Questions?

Contact me for:
- Specific network drive paths
- File storage implementation details
- Email configuration
- Any blockers or issues

**Phase 1 is ready to build! Let's ship it! 🚀**
