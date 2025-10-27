-- Drop existing tables and recreate with correct schema
DROP TABLE IF EXISTS booking_photos CASCADE;
DROP TABLE IF EXISTS booking_status_history CASCADE;
DROP TABLE IF EXISTS bookings CASCADE;
DROP TABLE IF EXISTS drivers CASCADE;
DROP TABLE IF EXISTS vehicles CASCADE;
DROP TABLE IF EXISTS user_roles CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS system_settings CASCADE;

-- Drop existing types and recreate
DROP TYPE IF EXISTS app_role CASCADE;
DROP TYPE IF EXISTS booking_status CASCADE;
DROP TYPE IF EXISTS service_type CASCADE;
DROP TYPE IF EXISTS vehicle_type CASCADE;

-- Create enums
CREATE TYPE user_role AS ENUM ('customer', 'dispatcher', 'driver', 'superadmin');
CREATE TYPE vehicle_status AS ENUM ('available', 'in_service', 'out_of_service');
CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'assigned', 'en_route', 'on_site', 'completed', 'cancelled');
CREATE TYPE service_type AS ENUM ('crane', 'box_truck');
CREATE TYPE payment_status AS ENUM ('pending', 'succeeded', 'failed', 'refunded');

-- Users table (combines profiles and roles)
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  role user_role NOT NULL DEFAULT 'customer',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Dispatchers can view all users" ON public.users
  FOR SELECT USING (
    (SELECT role FROM public.users WHERE id = auth.uid()) IN ('dispatcher', 'superadmin')
  );

-- Vehicles table
CREATE TABLE public.vehicles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type service_type NOT NULL,
  capacity_tons NUMERIC,
  license_plate TEXT,
  status vehicle_status NOT NULL DEFAULT 'available',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view available vehicles" ON public.vehicles
  FOR SELECT USING (true);

CREATE POLICY "Dispatchers can manage vehicles" ON public.vehicles
  FOR ALL USING (
    (SELECT role FROM public.users WHERE id = auth.uid()) IN ('dispatcher', 'superadmin')
  );

-- Bookings table
CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  service_type service_type NOT NULL,
  status booking_status NOT NULL DEFAULT 'pending',
  
  -- Addresses
  pickup_address TEXT NOT NULL,
  pickup_lat NUMERIC,
  pickup_lng NUMERIC,
  dropoff_address TEXT NOT NULL,
  dropoff_lat NUMERIC,
  dropoff_lng NUMERIC,
  
  -- Scheduling
  preferred_date DATE NOT NULL,
  preferred_time_window TEXT,
  
  -- Job details
  weight_kg INTEGER,
  dimensions TEXT,
  site_access TEXT,
  photos JSONB,
  
  -- Pricing (in cents)
  estimated_price_cents INTEGER NOT NULL,
  deposit_required_cents INTEGER NOT NULL,
  deposit_paid_cents INTEGER NOT NULL DEFAULT 0,
  
  -- Assignment
  assigned_vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
  assigned_driver_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers can view own bookings" ON public.bookings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Customers can insert bookings" ON public.bookings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Dispatchers can view all bookings" ON public.bookings
  FOR SELECT USING (
    (SELECT role FROM public.users WHERE id = auth.uid()) IN ('dispatcher', 'superadmin')
  );

CREATE POLICY "Dispatchers can update bookings" ON public.bookings
  FOR UPDATE USING (
    (SELECT role FROM public.users WHERE id = auth.uid()) IN ('dispatcher', 'superadmin')
  );

CREATE POLICY "Drivers can view assigned bookings" ON public.bookings
  FOR SELECT USING (auth.uid() = assigned_driver_id);

CREATE POLICY "Drivers can update assigned bookings" ON public.bookings
  FOR UPDATE USING (auth.uid() = assigned_driver_id);

-- Payments table
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  stripe_payment_id TEXT,
  amount_cents INTEGER NOT NULL,
  status payment_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view payments for their bookings" ON public.payments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.bookings
      WHERE id = booking_id AND user_id = auth.uid()
    )
    OR (SELECT role FROM public.users WHERE id = auth.uid()) IN ('dispatcher', 'superadmin')
  );

-- Assignments table
CREATE TABLE public.assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  eta TIMESTAMPTZ
);

ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view assignments for their bookings" ON public.assignments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.bookings
      WHERE id = booking_id AND (user_id = auth.uid() OR assigned_driver_id = auth.uid())
    )
    OR (SELECT role FROM public.users WHERE id = auth.uid()) IN ('dispatcher', 'superadmin')
  );

CREATE POLICY "Dispatchers can manage assignments" ON public.assignments
  FOR ALL USING (
    (SELECT role FROM public.users WHERE id = auth.uid()) IN ('dispatcher', 'superadmin')
  );

-- System settings
CREATE TABLE public.system_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view settings" ON public.system_settings
  FOR SELECT USING (true);

CREATE POLICY "Superadmins can manage settings" ON public.system_settings
  FOR ALL USING (
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'superadmin'
  );

-- Insert default settings
INSERT INTO public.system_settings (key, value) VALUES
  ('deposit_percent', '0.20'::jsonb),
  ('price_per_km_cents', '250'::jsonb),
  ('crane_base_cents', '30000'::jsonb),
  ('box_truck_base_cents', '15000'::jsonb),
  ('working_hours', '{"monday": {"start": "08:00", "end": "18:00", "enabled": true}, "tuesday": {"start": "08:00", "end": "18:00", "enabled": true}, "wednesday": {"start": "08:00", "end": "18:00", "enabled": true}, "thursday": {"start": "08:00", "end": "18:00", "enabled": true}, "friday": {"start": "08:00", "end": "18:00", "enabled": true}, "saturday": {"start": "09:00", "end": "15:00", "enabled": true}, "sunday": {"enabled": false}}'::jsonb);

-- Trigger to create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, name, email, phone, role)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', 'User'),
    new.email,
    new.raw_user_meta_data->>'phone',
    'customer'
  );
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_bookings_updated_at
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_system_settings_updated_at
  BEFORE UPDATE ON public.system_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Seed data: vehicles
INSERT INTO public.vehicles (name, type, capacity_tons, license_plate, status) VALUES
  ('Crane 10-Ton Unit 1', 'crane', 10, 'BC-CR-101', 'available'),
  ('Box Truck 16ft Unit 1', 'box_truck', NULL, 'BC-BT-201', 'available'),
  ('Box Truck 24ft Unit 2', 'box_truck', NULL, 'BC-BT-202', 'available');

-- Storage bucket for booking photos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('booking-photos', 'booking-photos', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
DROP POLICY IF EXISTS "Authenticated users can upload booking photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can view photos for their bookings" ON storage.objects;

CREATE POLICY "Authenticated users can upload booking photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'booking-photos');

CREATE POLICY "Users can view photos for their bookings"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'booking-photos');