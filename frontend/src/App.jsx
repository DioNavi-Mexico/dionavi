// src/App.jsx
import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

// Pages
import DoctorLogin from './pages/DoctorLogin';
import BookAppointment from './pages/BookAppointment';
import CaseSubmission from './pages/CaseSubmission';
import CaseDashboard from './pages/CaseDashboard';
import RebeValidation from './pages/RebeValidation';
import PlannerInterface from './pages/PlannerInterface';
import ValeriaQuotation from './pages/ValeriaQuotation';
import ManagerDashboard from './pages/ManagerDashboard';
import StaffPending from './pages/StaffPending';
import LabProduction from './pages/LabProduction';
import StaffPortal from './pages/StaffPortal';
import StaffLogin from './pages/StaffLogin';
import PrivateRoute from './components/PrivateRoute';
import StaffPrivateRoute from './components/StaffPrivateRoute';

function App() {
  useEffect(() => {
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async function(OneSignal) {
      await OneSignal.init({
        appId: '79595858-1bd8-41d0-b78b-5519b43c9e96',
        notifyButton: { enable: false },
        allowLocalhostAsSecureOrigin: true,
      });
    });
  }, []);

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<DoctorLogin />} />
          <Route path="/register" element={<DoctorLogin isRegister={true} />} />
          <Route path="/agendar" element={<BookAppointment />} />

          {/* Doctor Routes — require login */}
          <Route path="/submit-case" element={<PrivateRoute><CaseSubmission /></PrivateRoute>} />
          <Route path="/my-cases" element={<PrivateRoute><CaseDashboard /></PrivateRoute>} />
          <Route path="/cases/:caseId" element={<PrivateRoute><CaseDashboard /></PrivateRoute>} />

          {/* Staff Login */}
          <Route path="/staff/login" element={<StaffLogin />} />

          {/* Unified Staff Portal — all roles */}
          <Route path="/staff/portal" element={<StaffPrivateRoute><StaffPortal /></StaffPrivateRoute>} />

          {/* Team Routes — require staff login */}
          <Route path="/pending" element={<StaffPrivateRoute><StaffPending /></StaffPrivateRoute>} />
          <Route path="/rebe/validation" element={<StaffPrivateRoute allowedRoles={['validation','admin']}><RebeValidation /></StaffPrivateRoute>} />
          <Route path="/planner/interface" element={<StaffPrivateRoute allowedRoles={['planner','admin']}><PlannerInterface /></StaffPrivateRoute>} />
          <Route path="/valeria/quotation" element={<StaffPrivateRoute allowedRoles={['quotation','admin']}><ValeriaQuotation /></StaffPrivateRoute>} />
          <Route path="/lab/production" element={<StaffPrivateRoute allowedRoles={['lab','admin']}><LabProduction /></StaffPrivateRoute>} />

          {/* Manager Routes */}
          <Route path="/admin/dashboard" element={<StaffPrivateRoute allowedRoles={['admin']}><ManagerDashboard /></StaffPrivateRoute>} />

          {/* Default Route */}
          <Route path="/" element={<DoctorLogin />} />
        </Routes>

        {/* Toast Notifications */}
        <Toaster position="top-right" />
      </div>
    </Router>
  );
}

export default App;
