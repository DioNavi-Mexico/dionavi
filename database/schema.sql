-- Database Schema for DIONavi Lab Platform
-- PostgreSQL + Supabase Auth

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Doctors Table (linked to Supabase Auth via auth_user_id)
CREATE TABLE doctors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20),
  clinic_name VARCHAR(255),
  clinic_address TEXT,
  city VARCHAR(100),
  country VARCHAR(100),
  package_type VARCHAR(50) DEFAULT 'Standard',
  implant_price DECIMAL(10, 2) DEFAULT 2700,
  abutment_price DECIMAL(10, 2) DEFAULT 500,
  notification_email BOOLEAN DEFAULT true,
  notification_whatsapp BOOLEAN DEFAULT false,
  whatsapp_number VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);

-- Users Table (Internal team: Rebe, Valeria, Planner, Manager — linked to Supabase Auth)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  role VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Cases Table
CREATE TABLE cases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  doctor_id UUID NOT NULL REFERENCES doctors(id),
  patient_name VARCHAR(255) NOT NULL,
  patient_age INT,
  clinic_name VARCHAR(255),
  case_type VARCHAR(100),
  implant_count INT,
  tentative_surgery_date DATE,
  special_notes TEXT,
  status VARCHAR(50) DEFAULT 'submitted',
  cbct_file_path VARCHAR(500),
  scan_file_path VARCHAR(500),
  reference_photos TEXT[],
  carta_responsiva_signed BOOLEAN DEFAULT false,
  carta_responsiva_signed_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);

-- Planning Table
CREATE TABLE planning (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_id UUID NOT NULL REFERENCES cases(id),
  planner_id UUID REFERENCES users(id),
  status VARCHAR(50) DEFAULT 'draft',
  screenshot_paths TEXT[],
  planner_comments TEXT,
  submitted_at TIMESTAMP,
  approved_at TIMESTAMP,
  doctor_feedback TEXT,
  revision_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Quotation Table
CREATE TABLE quotations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_id UUID NOT NULL REFERENCES cases(id),
  created_by UUID REFERENCES users(id),
  lab_items JSONB,
  merchandise_items JSONB,
  subtotal DECIMAL(10, 2),
  tax DECIMAL(10, 2),
  discount DECIMAL(10, 2) DEFAULT 0,
  total DECIMAL(10, 2),
  status VARCHAR(50) DEFAULT 'draft',
  quotation_pdf_path VARCHAR(500),
  sent_at TIMESTAMP,
  approved_at TIMESTAMP,
  payment_received_at TIMESTAMP,
  payment_method VARCHAR(50),
  payment_intent_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Notifications Table
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipient_id UUID,
  case_id UUID REFERENCES cases(id),
  type VARCHAR(50),
  message TEXT,
  read BOOLEAN DEFAULT false,
  sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  read_at TIMESTAMP
);

-- Audit Log Table
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id UUID,
  action VARCHAR(100),
  resource_type VARCHAR(50),
  resource_id UUID,
  old_value JSONB,
  new_value JSONB,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ip_address VARCHAR(50)
);

-- Indexes for Performance
CREATE INDEX idx_cases_doctor_id ON cases(doctor_id);
CREATE INDEX idx_cases_status ON cases(status);
CREATE INDEX idx_cases_created_at ON cases(created_at);
CREATE INDEX idx_planning_case_id ON planning(case_id);
CREATE INDEX idx_quotation_case_id ON quotations(case_id);
CREATE INDEX idx_quotation_status ON quotations(status);
CREATE INDEX idx_notifications_recipient ON notifications(recipient_id);
CREATE INDEX idx_doctors_email ON doctors(email);
CREATE INDEX idx_users_email ON users(email);

-- Add timestamps trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_doctors_updated_at BEFORE UPDATE ON doctors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cases_updated_at BEFORE UPDATE ON cases
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_planning_updated_at BEFORE UPDATE ON planning
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quotations_updated_at BEFORE UPDATE ON quotations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
