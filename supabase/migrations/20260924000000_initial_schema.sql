-- =================================================================
-- SISTEMA DE GESTÃO DE HÓSPEDES - SCHEMA INICIAL POSTGRES / SUPABASE
-- Migration: 20260924000000_initial_schema.sql
-- =================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- 1. CONFIGURAÇÕES DA POUSADA
CREATE TABLE IF NOT EXISTS public.pousada_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL DEFAULT 'Pousada Consciência & Abundância',
    document_cnpj TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    default_checkin_time TIME NOT NULL DEFAULT '14:00:00',
    default_checkout_time TIME NOT NULL DEFAULT '12:00:00',
    timezone TEXT NOT NULL DEFAULT 'America/Bahia',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insere pousada padrão inicial se não existir
INSERT INTO public.pousada_config (name, timezone)
SELECT 'Pousada Consciência & Abundância', 'America/Bahia'
WHERE NOT EXISTS (SELECT 1 FROM public.pousada_config);

-- 2. PERFIS DE USUÁRIOS E PERMISSÕES (Vínculo com auth.users)
CREATE TYPE public.user_role AS ENUM ('admin', 'recepcao', 'consulta');

CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    pousada_id UUID NOT NULL REFERENCES public.pousada_config(id) ON DELETE RESTRICT,
    full_name TEXT NOT NULL,
    role public.user_role NOT NULL DEFAULT 'recepcao',
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. TIPOS DE QUARTO E QUARTOS
CREATE TABLE IF NOT EXISTS public.room_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pousada_id UUID NOT NULL REFERENCES public.pousada_config(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    default_price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TYPE public.room_operational_status AS ENUM ('disponivel', 'limpeza', 'manutencao', 'bloqueado');

CREATE TABLE IF NOT EXISTS public.rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pousada_id UUID NOT NULL REFERENCES public.pousada_config(id) ON DELETE CASCADE,
    room_type_id UUID REFERENCES public.room_types(id) ON DELETE SET NULL,
    number_name TEXT NOT NULL,
    capacity INT NOT NULL DEFAULT 2,
    status public.room_operational_status NOT NULL DEFAULT 'disponivel',
    active BOOLEAN NOT NULL DEFAULT true,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_room_number_per_pousada UNIQUE (pousada_id, number_name)
);

-- 4. CADASTRO DE HÓSPEDES (Cadastro Único Master)
CREATE SEQUENCE IF NOT EXISTS public.guest_code_seq START WITH 1;

CREATE TABLE IF NOT EXISTS public.guests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pousada_id UUID NOT NULL REFERENCES public.pousada_config(id) ON DELETE CASCADE,
    internal_code TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    cpf TEXT,
    alt_doc_type TEXT,
    alt_doc_number TEXT,
    alt_doc_country TEXT,
    phone TEXT NOT NULL,
    email TEXT,
    birth_date DATE,
    city TEXT,
    state TEXT,
    neighborhood TEXT,
    street TEXT,
    number TEXT,
    complement TEXT,
    zip_code TEXT,
    country TEXT DEFAULT 'Brasil',
    preferences TEXT,
    is_incomplete BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    archived_at TIMESTAMPTZ
);

CREATE INDEX idx_guests_cpf ON public.guests(cpf) WHERE cpf IS NOT NULL;
CREATE INDEX idx_guests_phone ON public.guests(phone);
CREATE INDEX idx_guests_name ON public.guests(full_name);
CREATE INDEX idx_guests_pousada ON public.guests(pousada_id);

-- Gerador automático de código de hóspede (ex: HSP-00000001)
CREATE OR REPLACE FUNCTION public.generate_guest_code()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.internal_code IS NULL OR NEW.internal_code = '' THEN
        NEW.internal_code := 'HSP-' || LPAD(nextval('public.guest_code_seq')::text, 8, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_generate_guest_code
BEFORE INSERT ON public.guests
FOR EACH ROW
EXECUTE FUNCTION public.generate_guest_code();

-- 5. HOSPEDAGENS (Visitas)
CREATE TYPE public.stay_status AS ENUM ('reservada', 'hospedado', 'finalizada', 'cancelada', 'nao_compareceu');

CREATE TABLE IF NOT EXISTS public.stays (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pousada_id UUID NOT NULL REFERENCES public.pousada_config(id) ON DELETE CASCADE,
    guest_id UUID NOT NULL REFERENCES public.guests(id) ON DELETE RESTRICT,
    room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE RESTRICT,
    check_in_expected TIMESTAMPTZ NOT NULL,
    check_in_actual TIMESTAMPTZ,
    check_out_expected TIMESTAMPTZ NOT NULL,
    check_out_actual TIMESTAMPTZ,
    party_size INT NOT NULL DEFAULT 1,
    agreed_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    notes TEXT,
    status public.stay_status NOT NULL DEFAULT 'hospedado',
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT check_dates_order CHECK (check_out_expected > check_in_expected)
);

CREATE INDEX idx_stays_guest ON public.stays(guest_id);
CREATE INDEX idx_stays_room ON public.stays(room_id);
CREATE INDEX idx_stays_dates ON public.stays(check_in_expected, check_out_expected);
CREATE INDEX idx_stays_status ON public.stays(status);

-- 6. ACOMPANHANTES DA HOSPEDAGEM
CREATE TABLE IF NOT EXISTS public.stay_guests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stay_id UUID NOT NULL REFERENCES public.stays(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    cpf TEXT,
    phone TEXT,
    is_responsible BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. REGISTRO DE PAGAMENTOS
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stay_id UUID NOT NULL REFERENCES public.stays(id) ON DELETE CASCADE,
    amount NUMERIC(10, 2) NOT NULL,
    payment_method TEXT NOT NULL, -- Pix, Dinheiro, Cartão de Crédito, Cartão de Débito
    paid_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    notes TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. BLOQUEIOS DE QUARTO
CREATE TABLE IF NOT EXISTS public.room_blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    reason TEXT NOT NULL,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. HISTÓRICO DE IMPORTAÇÕES
CREATE TABLE IF NOT EXISTS public.import_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pousada_id UUID NOT NULL REFERENCES public.pousada_config(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    total_rows INT NOT NULL DEFAULT 0,
    imported_guests INT NOT NULL DEFAULT 0,
    imported_stays INT NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'sucesso',
    details JSONB,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. AUDITORIA E LOGS DE ALTERAÇÃO
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pousada_id UUID NOT NULL REFERENCES public.pousada_config(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id),
    entity_name TEXT NOT NULL,
    entity_id UUID NOT NULL,
    action TEXT NOT NULL, -- INSERT, UPDATE, ARCHIVE, DELETE
    payload JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. VALIDAÇÃO DE OVERLAP DE QUARTOS NO BANCO
CREATE OR REPLACE FUNCTION public.check_room_conflict()
RETURNS TRIGGER AS $$
DECLARE
    v_conflict INT;
BEGIN
    IF NEW.status IN ('reservada', 'hospedado') THEN
        SELECT COUNT(*)
        INTO v_conflict
        FROM public.stays
        WHERE room_id = NEW.room_id
          AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
          AND status IN ('reservada', 'hospedado')
          AND (
              (NEW.check_in_expected < check_out_expected) AND
              (NEW.check_out_expected > check_in_expected)
          );

        IF v_conflict > 0 THEN
            RAISE EXCEPTION 'Conflito de reserva: O quarto selecionado já possui hospedagem ativa ou reserva confirmada para este período.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_check_room_conflict
BEFORE INSERT OR UPDATE ON public.stays
FOR EACH ROW
EXECUTE FUNCTION public.check_room_conflict();

-- 12. ROW LEVEL SECURITY (RLS) & POLÍTICAS DE SEGURANÇA
ALTER TABLE public.pousada_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stays ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stay_guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper function: Get user pousada_id safely
CREATE OR REPLACE FUNCTION public.get_auth_pousada_id()
RETURNS UUID AS $$
    SELECT pousada_id FROM public.user_profiles WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Helper function: Check if current user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_profiles 
        WHERE id = auth.uid() AND role = 'admin' AND active = true
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Políticas para Hóspedes: Usuários autenticados acessam hóspedes da sua pousada
CREATE POLICY guests_pousada_policy ON public.guests
    FOR ALL
    TO authenticated
    USING (pousada_id = public.get_auth_pousada_id())
    WITH CHECK (pousada_id = public.get_auth_pousada_id());

-- Políticas para Hospedagens
CREATE POLICY stays_pousada_policy ON public.stays
    FOR ALL
    TO authenticated
    USING (pousada_id = public.get_auth_pousada_id())
    WITH CHECK (pousada_id = public.get_auth_pousada_id());

-- Políticas para Quartos
CREATE POLICY rooms_pousada_policy ON public.rooms
    FOR ALL
    TO authenticated
    USING (pousada_id = public.get_auth_pousada_id())
    WITH CHECK (pousada_id = public.get_auth_pousada_id());

-- Políticas para Perfis (Qualquer usuário lê o seu perfil; Apenas admin edita perfis)
CREATE POLICY user_profiles_select_policy ON public.user_profiles
    FOR SELECT TO authenticated
    USING (pousada_id = public.get_auth_pousada_id());

CREATE POLICY user_profiles_admin_policy ON public.user_profiles
    FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- Bloquear todos os acessos anônimos explicitamente
-- (Supabase desabilita por padrão se não houver política 'anon')
