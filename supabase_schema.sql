-- ==========================================
-- HISAAB TRADING JOURNAL - SUPABASE DATABASE SCHEMA
-- ==========================================

-- 1. Create Profiles Table (linked to Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE NOT NULL,
    name TEXT,
    email TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create Strategies Table
CREATE TABLE IF NOT EXISTS public.strategies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create Trades Table
CREATE TABLE IF NOT EXISTS public.trades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    symbol TEXT NOT NULL,
    trade_date DATE NOT NULL,
    trade_type TEXT CHECK (trade_type IN ('long', 'short')) NOT NULL,
    quantity INTEGER NOT NULL,
    entry_price NUMERIC NOT NULL,
    exit_price NUMERIC NOT NULL,
    entry_time TEXT,
    exit_time TEXT,
    total_amount NUMERIC NOT NULL,
    pnl NUMERIC NOT NULL,
    pnl_percent NUMERIC NOT NULL,
    stop_loss NUMERIC,
    target NUMERIC,
    strategy TEXT NOT NULL,
    outcome TEXT CHECK (outcome IN ('success', 'failure')) NOT NULL,
    entry_confidence SMALLINT DEFAULT 3,
    satisfaction SMALLINT DEFAULT 3,
    emotional_state TEXT,
    notes TEXT,
    lessons_learned TEXT,
    source TEXT DEFAULT 'manual',
    broker_order_id TEXT,
    brokerage NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Partial index for broker_order_id deduplication per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_trades_user_broker_order ON public.trades(user_id, broker_order_id) WHERE broker_order_id IS NOT NULL;

-- 4. Create Trade Mistakes Table (Normalized 1NF join table)
CREATE TABLE IF NOT EXISTS public.trade_mistakes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trade_id UUID NOT NULL REFERENCES public.trades(id) ON DELETE CASCADE,
    mistake TEXT NOT NULL
);

-- 5. Create Trade Images Table (Normalized 1NF join table)
CREATE TABLE IF NOT EXISTS public.trade_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trade_id UUID NOT NULL REFERENCES public.trades(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL
);

-- 6. Create Broker Connections Table
CREATE TABLE IF NOT EXISTS public.broker_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    broker TEXT NOT NULL,
    client_id TEXT NOT NULL,
    access_token TEXT NOT NULL, -- Encrypted AES-256-GCM
    is_active BOOLEAN DEFAULT TRUE,
    last_synced TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, broker)
);

-- ==========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.strategies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trade_mistakes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trade_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.broker_connections ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Strategies Policies
CREATE POLICY "Users can view own strategies" ON public.strategies FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own strategies" ON public.strategies FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own strategies" ON public.strategies FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own strategies" ON public.strategies FOR DELETE USING (auth.uid() = user_id);

-- Trades Policies
CREATE POLICY "Users can view own trades" ON public.trades FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own trades" ON public.trades FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own trades" ON public.trades FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own trades" ON public.trades FOR DELETE USING (auth.uid() = user_id);

-- Trade Mistakes Policies
CREATE POLICY "Users can view own trade mistakes" ON public.trade_mistakes FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.trades WHERE trades.id = trade_mistakes.trade_id AND trades.user_id = auth.uid())
);
CREATE POLICY "Users can insert own trade mistakes" ON public.trade_mistakes FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.trades WHERE trades.id = trade_mistakes.trade_id AND trades.user_id = auth.uid())
);
CREATE POLICY "Users can delete own trade mistakes" ON public.trade_mistakes FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.trades WHERE trades.id = trade_mistakes.trade_id AND trades.user_id = auth.uid())
);

-- Trade Images Policies
CREATE POLICY "Users can view own trade images" ON public.trade_images FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.trades WHERE trades.id = trade_images.trade_id AND trades.user_id = auth.uid())
);
CREATE POLICY "Users can insert own trade images" ON public.trade_images FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.trades WHERE trades.id = trade_images.trade_id AND trades.user_id = auth.uid())
);
CREATE POLICY "Users can delete own trade images" ON public.trade_images FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.trades WHERE trades.id = trade_images.trade_id AND trades.user_id = auth.uid())
);

-- Broker Connections Policies
CREATE POLICY "Users can view own broker connections" ON public.broker_connections FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own broker connections" ON public.broker_connections FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own broker connections" ON public.broker_connections FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own broker connections" ON public.broker_connections FOR DELETE USING (auth.uid() = user_id);

-- Trigger to automatically create public.profiles entry when a new user signs up via Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, username, name, email, avatar_url)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'username', SPLIT_PART(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', SPLIT_PART(NEW.email, '@', 1)),
        NEW.email,
        NEW.raw_user_meta_data->>'avatar_url'
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        name = COALESCE(EXCLUDED.name, public.profiles.name);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
