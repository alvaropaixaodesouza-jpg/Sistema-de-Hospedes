-- Apply after the initial migration. Existing duplicate CPFs or overlapping active
-- stays must be reviewed before these constraints can be installed.
BEGIN;
CREATE EXTENSION IF NOT EXISTS btree_gist;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS room_type_name text;
CREATE UNIQUE INDEX guests_unique_cpf_per_pousada ON public.guests
  (pousada_id, regexp_replace(cpf, '[^0-9]', '', 'g'))
  WHERE cpf IS NOT NULL AND regexp_replace(cpf, '[^0-9]', '', 'g') <> '';
ALTER TABLE public.stays ADD CONSTRAINT stays_no_overlap
  EXCLUDE USING gist (room_id WITH =, tstzrange(check_in_expected, check_out_expected, '[)') WITH &&)
  WHERE (status IN ('reservada', 'hospedado'));
ALTER TABLE public.stays ADD CONSTRAINT stays_positive_party CHECK (party_size > 0);
ALTER TABLE public.stays ADD CONSTRAINT stays_nonnegative_amount CHECK (agreed_amount >= 0);
ALTER TABLE public.payments ADD CONSTRAINT payments_positive_amount CHECK (amount > 0);
ALTER TABLE public.rooms ADD CONSTRAINT rooms_positive_capacity CHECK (capacity > 0);

CREATE OR REPLACE FUNCTION public.get_auth_pousada_id() RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT pousada_id FROM public.user_profiles WHERE id = auth.uid() AND active = true LIMIT 1 $$;
CREATE OR REPLACE FUNCTION public.can_operate() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND active = true AND role IN ('admin', 'recepcao')) $$;

DROP POLICY IF EXISTS guests_pousada_policy ON public.guests;
DROP POLICY IF EXISTS stays_pousada_policy ON public.stays;
DROP POLICY IF EXISTS rooms_pousada_policy ON public.rooms;
DROP POLICY IF EXISTS user_profiles_admin_policy ON public.user_profiles;
CREATE POLICY profiles_admin_same_pousada ON public.user_profiles FOR ALL TO authenticated
USING (public.is_admin() AND pousada_id = public.get_auth_pousada_id())
WITH CHECK (public.is_admin() AND pousada_id = public.get_auth_pousada_id());

DO $$ DECLARE tbl text; BEGIN
  FOREACH tbl IN ARRAY ARRAY['guests', 'stays', 'rooms', 'room_types', 'import_history'] LOOP
    EXECUTE format('CREATE POLICY tenant_read ON public.%I FOR SELECT TO authenticated USING (pousada_id = public.get_auth_pousada_id())', tbl);
    EXECUTE format('CREATE POLICY tenant_insert ON public.%I FOR INSERT TO authenticated WITH CHECK (pousada_id = public.get_auth_pousada_id() AND public.can_operate())', tbl);
    EXECUTE format('CREATE POLICY tenant_update ON public.%I FOR UPDATE TO authenticated USING (pousada_id = public.get_auth_pousada_id() AND public.can_operate()) WITH CHECK (pousada_id = public.get_auth_pousada_id() AND public.can_operate())', tbl);
  END LOOP;
END $$;
CREATE POLICY config_read ON public.pousada_config FOR SELECT TO authenticated USING (id = public.get_auth_pousada_id());
CREATE POLICY config_admin ON public.pousada_config FOR UPDATE TO authenticated USING (id = public.get_auth_pousada_id() AND public.is_admin()) WITH CHECK (id = public.get_auth_pousada_id() AND public.is_admin());
CREATE POLICY audit_read ON public.audit_logs FOR SELECT TO authenticated USING (pousada_id = public.get_auth_pousada_id());

DO $$ DECLARE tbl text; BEGIN
  FOREACH tbl IN ARRAY ARRAY['payments', 'stay_guests'] LOOP
    EXECUTE format('CREATE POLICY parent_read ON public.%I FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.stays s WHERE s.id = stay_id AND s.pousada_id = public.get_auth_pousada_id()))', tbl);
    EXECUTE format('CREATE POLICY parent_write ON public.%I FOR ALL TO authenticated USING (public.can_operate() AND EXISTS (SELECT 1 FROM public.stays s WHERE s.id = stay_id AND s.pousada_id = public.get_auth_pousada_id())) WITH CHECK (public.can_operate() AND EXISTS (SELECT 1 FROM public.stays s WHERE s.id = stay_id AND s.pousada_id = public.get_auth_pousada_id()))', tbl);
  END LOOP;
END $$;
CREATE POLICY blocks_read ON public.room_blocks FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.rooms r WHERE r.id = room_id AND r.pousada_id = public.get_auth_pousada_id()));
CREATE POLICY blocks_write ON public.room_blocks FOR ALL TO authenticated USING (public.can_operate() AND EXISTS (SELECT 1 FROM public.rooms r WHERE r.id = room_id AND r.pousada_id = public.get_auth_pousada_id())) WITH CHECK (public.can_operate() AND EXISTS (SELECT 1 FROM public.rooms r WHERE r.id = room_id AND r.pousada_id = public.get_auth_pousada_id()));

CREATE OR REPLACE FUNCTION public.validate_stay_operation() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
DECLARE accommodation public.rooms; BEGIN
  SELECT * INTO accommodation FROM public.rooms WHERE id = NEW.room_id FOR UPDATE;
  IF accommodation.id IS NULL OR accommodation.pousada_id <> NEW.pousada_id OR NOT EXISTS (SELECT 1 FROM public.guests WHERE id = NEW.guest_id AND pousada_id = NEW.pousada_id AND archived_at IS NULL) THEN
    RAISE EXCEPTION 'Hóspede ou quarto inválido para esta pousada.';
  END IF;
  IF NEW.status IN ('reservada', 'hospedado') THEN
    IF NOT accommodation.active OR accommodation.status IN ('manutencao', 'bloqueado') OR (NEW.status = 'hospedado' AND accommodation.status = 'limpeza') THEN RAISE EXCEPTION 'Quarto indisponível para esta operação.'; END IF;
    IF NEW.party_size > accommodation.capacity THEN RAISE EXCEPTION 'Quantidade de pessoas excede a capacidade do quarto.'; END IF;
    IF EXISTS (SELECT 1 FROM public.room_blocks WHERE room_id = NEW.room_id AND start_date < NEW.check_out_expected AND end_date > NEW.check_in_expected) THEN RAISE EXCEPTION 'Quarto bloqueado neste período.'; END IF;
  END IF;
  NEW.updated_at := now();
  IF NEW.status = 'hospedado' THEN NEW.check_in_actual := coalesce(NEW.check_in_actual, now()); END IF;
  IF NEW.status = 'finalizada' AND TG_OP = 'UPDATE' AND OLD.status = 'hospedado' THEN
    NEW.check_out_actual := coalesce(NEW.check_out_actual, now());
    UPDATE public.rooms SET status = 'limpeza' WHERE id = NEW.room_id;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER validate_stay_operation BEFORE INSERT OR UPDATE ON public.stays FOR EACH ROW EXECUTE FUNCTION public.validate_stay_operation();

CREATE OR REPLACE FUNCTION public.save_stay(payload jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE record public.stays; saved public.stays; companion jsonb; BEGIN
  IF NOT public.can_operate() THEN RAISE EXCEPTION 'Sem permissão para alterar hospedagens.'; END IF;
  IF payload->>'id' IS NOT NULL THEN
    SELECT * INTO record FROM public.stays WHERE id = (payload->>'id')::uuid FOR UPDATE;
    IF record.id IS NULL THEN RAISE EXCEPTION 'Hospedagem não encontrada.'; END IF;
  ELSE
    record.id := gen_random_uuid(); record.created_at := now(); record.created_by := auth.uid();
    record.pousada_id := public.get_auth_pousada_id(); record.party_size := 1; record.agreed_amount := 0; record.status := 'hospedado';
  END IF;
  record := jsonb_populate_record(record, payload - ARRAY['pousada_id', 'created_by', 'created_at', 'updated_at']);
  record.updated_at := now();
  IF payload ? 'companions' AND jsonb_array_length(payload->'companions') > record.party_size - 1 THEN RAISE EXCEPTION 'A quantidade de pessoas deve incluir responsável e acompanhantes.'; END IF;
  INSERT INTO public.stays SELECT record.* ON CONFLICT (id) DO UPDATE SET
    guest_id = excluded.guest_id, room_id = excluded.room_id,
    check_in_expected = excluded.check_in_expected, check_out_expected = excluded.check_out_expected,
    check_in_actual = excluded.check_in_actual, check_out_actual = excluded.check_out_actual,
    party_size = excluded.party_size, agreed_amount = excluded.agreed_amount, notes = excluded.notes,
    status = excluded.status, updated_at = now() RETURNING * INTO saved;
  IF payload ? 'companions' THEN
    DELETE FROM public.stay_guests WHERE stay_id = saved.id;
    FOR companion IN SELECT * FROM jsonb_array_elements(payload->'companions') LOOP
      IF trim(coalesce(companion->>'full_name', '')) = '' THEN RAISE EXCEPTION 'Acompanhante sem nome.'; END IF;
      INSERT INTO public.stay_guests (stay_id, full_name, cpf, phone) VALUES (saved.id, companion->>'full_name', companion->>'cpf', companion->>'phone');
    END LOOP;
  END IF;
  RETURN to_jsonb(saved);
END $$;
REVOKE ALL ON FUNCTION public.save_stay(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_stay(jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.record_operation_audit() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE tenant uuid; BEGIN
  IF TG_TABLE_NAME = 'payments' THEN SELECT pousada_id INTO tenant FROM public.stays WHERE id = NEW.stay_id;
  ELSE tenant := NEW.pousada_id; END IF;
  INSERT INTO public.audit_logs (pousada_id, user_id, entity_name, entity_id, action, payload)
  VALUES (tenant, auth.uid(), TG_TABLE_NAME, NEW.id, TG_OP, jsonb_build_object('operation', TG_OP));
  RETURN NEW;
END $$;
CREATE TRIGGER audit_guests AFTER INSERT OR UPDATE ON public.guests FOR EACH ROW EXECUTE FUNCTION public.record_operation_audit();
CREATE TRIGGER audit_stays AFTER INSERT OR UPDATE ON public.stays FOR EACH ROW EXECUTE FUNCTION public.record_operation_audit();
CREATE TRIGGER audit_payments AFTER INSERT OR UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.record_operation_audit();
COMMIT;
