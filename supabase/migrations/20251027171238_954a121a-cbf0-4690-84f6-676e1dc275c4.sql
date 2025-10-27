-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
CREATE TYPE app_role AS ENUM ('customer', 'dispatcher', 'driver', 'superadmin');
CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'assigned', 'en_route', 'on_site', 'completed', 'cancelled');
CREATE TYPE service_type AS ENUM ('crane', 'box_truck');
CREATE TYPE vehicle_type AS ENUM ('crane_10ton', 'crane_15ton', 'box_truck_16ft', 'box_truck_24ft');

-- User profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- User roles table (separate for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'customer',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

-- Function to check user role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

-- Vehicles table
CREATE TABLE public.vehicles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  vehicle_type vehicle_type NOT NULL,
  license_plate TEXT,
  capacity_tons NUMERIC,
  capacity_cubic_ft NUMERIC,
  hourly_rate NUMERIC NOT NULL DEFAULT 0,
  is_available BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view available vehicles" ON public.vehicles
  FOR SELECT USING (true);

CREATE POLICY "Dispatchers can manage vehicles" ON public.vehicles
  FOR ALL USING (public.has_role(auth.uid(), 'dispatcher') OR public.has_role(auth.uid(), 'superadmin'));

-- Drivers table
CREATE TABLE public.drivers (
  id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  license_number TEXT,
  license_expiry DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active drivers" ON public.drivers
  FOR SELECT USING (is_active = true);

CREATE POLICY "Dispatchers can manage drivers" ON public.drivers
  FOR ALL USING (public.has_role(auth.uid(), 'dispatcher') OR public.has_role(auth.uid(), 'superadmin'));

-- Bookings table
CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  service_type service_type NOT NULL,
  status booking_status NOT NULL DEFAULT 'pending',
  
  -- Pickup details
  pickup_address TEXT NOT NULL,
  pickup_lat NUMERIC,
  pickup_lng NUMERIC,
  pickup_datetime TIMESTAMPTZ NOT NULL,
  
  -- Dropoff details
  dropoff_address TEXT NOT NULL,
  dropoff_lat NUMERIC,
  dropoff_lng NUMERIC,
  
  -- Job details
  job_description TEXT,
  weight_estimate NUMERIC,
  special_instructions TEXT,
  
  -- Pricing
  distance_km NUMERIC,
  estimated_duration_hours NUMERIC,
  base_price NUMERIC NOT NULL DEFAULT 0,
  distance_price NUMERIC NOT NULL DEFAULT 0,
  total_estimate NUMERIC NOT NULL DEFAULT 0,
  final_price NUMERIC,
  
  -- Payment
  deposit_amount NUMERIC NOT NULL DEFAULT 0,
  deposit_paid BOOLEAN NOT NULL DEFAULT false,
  stripe_payment_intent_id TEXT,
  
  -- Assignment
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
  driver_id UUID REFERENCES public.drivers(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ,
  
  -- Contact
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ
);

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers can view own bookings" ON public.bookings
  FOR SELECT USING (auth.uid() = customer_id);

CREATE POLICY "Customers can insert bookings" ON public.bookings
  FOR INSERT WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Dispatchers can view all bookings" ON public.bookings
  FOR SELECT USING (public.has_role(auth.uid(), 'dispatcher') OR public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Dispatchers can update bookings" ON public.bookings
  FOR UPDATE USING (public.has_role(auth.uid(), 'dispatcher') OR public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Drivers can view assigned bookings" ON public.bookings
  FOR SELECT USING (auth.uid() = driver_id);

CREATE POLICY "Drivers can update assigned bookings" ON public.bookings
  FOR UPDATE USING (auth.uid() = driver_id);

-- Booking photos table
CREATE TABLE public.booking_photos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  caption TEXT,
  uploaded_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.booking_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view photos for their bookings" ON public.booking_photos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.bookings
      WHERE id = booking_id 
      AND (customer_id = auth.uid() OR driver_id = auth.uid())
    )
    OR public.has_role(auth.uid(), 'dispatcher')
    OR public.has_role(auth.uid(), 'superadmin')
  );

CREATE POLICY "Users can upload photos" ON public.booking_photos
  FOR INSERT WITH CHECK (auth.uid() = uploaded_by);

-- Booking status history
CREATE TABLE public.booking_status_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  old_status booking_status,
  new_status booking_status NOT NULL,
  changed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.booking_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view status history for their bookings" ON public.booking_status_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.bookings
      WHERE id = booking_id 
      AND (customer_id = auth.uid() OR driver_id = auth.uid())
    )
    OR public.has_role(auth.uid(), 'dispatcher')
    OR public.has_role(auth.uid(), 'superadmin')
  );

-- System settings table
CREATE TABLE public.system_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view settings" ON public.system_settings
  FOR SELECT USING (true);

CREATE POLICY "Superadmins can manage settings" ON public.system_settings
  FOR ALL USING (public.has_role(auth.uid(), 'superadmin'));

-- Insert default settings
INSERT INTO public.system_settings (key, value) VALUES
  ('working_hours', '{"monday": {"start": "08:00", "end": "18:00", "enabled": true}, "tuesday": {"start": "08:00", "end": "18:00", "enabled": true}, "wednesday": {"start": "08:00", "end": "18:00", "enabled": true}, "thursday": {"start": "08:00", "end": "18:00", "enabled": true}, "friday": {"start": "08:00", "end": "18:00", "enabled": true}, "saturday": {"start": "09:00", "end": "15:00", "enabled": true}, "sunday": {"enabled": false}}'::jsonb),
  ('pricing', '{"crane": {"base_rate": 250, "per_km": 3.50, "per_hour": 175}, "box_truck": {"base_rate": 120, "per_km": 2.50, "per_hour": 85}, "deposit_percentage": 0.30}'::jsonb),
  ('blocked_dates', '[]'::jsonb);

-- Storage bucket for booking photos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('booking-photos', 'booking-photos', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Authenticated users can upload booking photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'booking-photos');

CREATE POLICY "Users can view photos for their bookings"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'booking-photos');

-- Trigger to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, phone)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'phone'
  );
  
  -- Assign default customer role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, 'customer');
  
  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_vehicles_updated_at
  BEFORE UPDATE ON public.vehicles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_drivers_updated_at
  BEFORE UPDATE ON public.drivers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_system_settings_updated_at
  BEFORE UPDATE ON public.system_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to log booking status changes
CREATE OR REPLACE FUNCTION public.log_booking_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.booking_status_history (booking_id, old_status, new_status, changed_by)
    VALUES (NEW.id, OLD.status, NEW.status, auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER track_booking_status_changes
  AFTER UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.log_booking_status_change();