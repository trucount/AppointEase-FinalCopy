-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (existing, updated for consistency)
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  full_name VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  role VARCHAR(10) DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Appointments table (existing, updated for consistency)
CREATE TABLE IF NOT EXISTS appointments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  appointment_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- New columns for appointment mode and details
  appointment_mode VARCHAR(20) DEFAULT 'online' CHECK (appointment_mode IN ('online', 'in-person')),
  appointment_url TEXT,
  appointment_password VARCHAR(255)
);

-- Admin Settings table (existing, updated for consistency)
CREATE TABLE IF NOT EXISTS admin_settings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  start_time TIME DEFAULT '09:00',
  end_time TIME DEFAULT '17:00',
  break_start_time TIME DEFAULT '12:00',
  break_end_time TIME DEFAULT '13:00',
  slot_duration INTEGER DEFAULT 60,
  last_cleanup TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- New: Meetings table
CREATE TABLE IF NOT EXISTS meetings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  meeting_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- New columns for meeting mode and details
  meeting_mode VARCHAR(20) DEFAULT 'online' CHECK (meeting_mode IN ('online', 'in-person')),
  meeting_url TEXT,
  meeting_password VARCHAR(255)
);

-- New: Meeting Participants table (many-to-many relationship)
CREATE TABLE IF NOT EXISTS meeting_participants (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  meeting_id UUID REFERENCES meetings(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(meeting_id, user_id)
);

-- New: Reschedule Requests table
CREATE TABLE IF NOT EXISTS reschedule_requests (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  appointment_id UUID REFERENCES appointments(id) ON DELETE CASCADE,
  requested_by_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  requested_date DATE NOT NULL,
  requested_start_time TIME NOT NULL,
  requested_end_time TIME NOT NULL,
  reason TEXT,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default admin user (updated for UUID)
INSERT INTO users (username, password, full_name, role)
VALUES ('Head', 'Testplay', 'Administrator', 'admin')
ON CONFLICT (username) DO NOTHING;

-- Insert default admin settings
INSERT INTO admin_settings (start_time, end_time, break_start_time, break_end_time, slot_duration)
VALUES ('09:00', '17:00', '12:00', '13:00', 60)
ON CONFLICT DO NOTHING;

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE reschedule_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for users table
CREATE POLICY "Users can view their own data" ON users
  FOR SELECT USING (true);

CREATE POLICY "Users can update their own data" ON users
  FOR UPDATE USING (true);

CREATE POLICY "Anyone can insert users" ON users
  FOR INSERT WITH CHECK (true);

-- Create policies for appointments table
CREATE POLICY "Users can view all appointments" ON appointments
  FOR SELECT USING (true);

CREATE POLICY "Users can insert appointments" ON appointments
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update appointments" ON appointments
  FOR UPDATE USING (true);

-- Create policies for meetings table
CREATE POLICY "Users can view meetings" ON meetings
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage meetings" ON meetings
  FOR ALL USING (true);

-- Create policies for meeting_participants table
CREATE POLICY "Users can view meeting participants" ON meeting_participants
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage meeting participants" ON meeting_participants
  FOR ALL USING (true);

-- Create policies for reschedule_requests table
CREATE POLICY "Users can view reschedule requests" ON reschedule_requests
  FOR SELECT USING (true);

CREATE POLICY "Users can insert reschedule requests" ON reschedule_requests
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can manage reschedule requests" ON reschedule_requests
  FOR ALL USING (true);

-- Create policies for admin_settings table
CREATE POLICY "Anyone can view admin settings" ON admin_settings
  FOR SELECT USING (true);

CREATE POLICY "Anyone can update admin settings" ON admin_settings
  FOR UPDATE USING (true);

CREATE POLICY "Anyone can insert admin settings" ON admin_settings
  FOR INSERT WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_appointments_user_id ON appointments(user_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_meetings_date ON meetings(meeting_date);
CREATE INDEX IF NOT EXISTS idx_meetings_created_by ON meetings(created_by_user_id);
CREATE INDEX IF NOT EXISTS idx_meeting_participants_meeting ON meeting_participants(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_participants_user ON meeting_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_reschedule_requests_appointment ON reschedule_requests(appointment_id);
CREATE INDEX IF NOT EXISTS idx_reschedule_requests_user ON reschedule_requests(requested_by_user_id);
CREATE INDEX IF NOT EXISTS idx_reschedule_requests_status ON reschedule_requests(status);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON appointments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_meetings_updated_at BEFORE UPDATE ON meetings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reschedule_requests_updated_at BEFORE UPDATE ON reschedule_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_admin_settings_updated_at BEFORE UPDATE ON admin_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
