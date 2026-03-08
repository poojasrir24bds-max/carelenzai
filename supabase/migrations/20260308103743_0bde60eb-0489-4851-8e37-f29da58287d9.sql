
-- Subscription plans table
CREATE TABLE public.subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  price_inr integer NOT NULL,
  doctor_consultations integer NOT NULL DEFAULT 0,
  scan_limit integer NOT NULL DEFAULT 0,
  duration_days integer NOT NULL DEFAULT 30,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

-- Anyone can view active plans
CREATE POLICY "Anyone can view active plans"
ON public.subscription_plans FOR SELECT
TO authenticated
USING (is_active = true);

-- Admins can manage plans
CREATE POLICY "Admins can manage plans"
ON public.subscription_plans FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- User subscriptions table
CREATE TABLE public.user_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  plan_id uuid REFERENCES public.subscription_plans(id) NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  upi_transaction_id text,
  scans_used integer NOT NULL DEFAULT 0,
  consultations_used integer NOT NULL DEFAULT 0,
  starts_at timestamp with time zone,
  expires_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscriptions"
ON public.user_subscriptions FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own subscriptions"
ON public.user_subscriptions FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own subscriptions"
ON public.user_subscriptions FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all subscriptions"
ON public.user_subscriptions FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all subscriptions"
ON public.user_subscriptions FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Insert the two plans
INSERT INTO public.subscription_plans (name, price_inr, doctor_consultations, scan_limit, duration_days)
VALUES 
  ('Basic', 49, 2, 10, 30),
  ('Premium', 99, 4, 20, 30);
