BEGIN;
-- A batch is committed atomically and retrying it does not duplicate records.
CREATE UNIQUE INDEX IF NOT EXISTS import_history_batch_key ON public.import_history
(pousada_id, (details->>'batchKey')) WHERE details->>'batchKey' IS NOT NULL;

CREATE OR REPLACE FUNCTION public.import_guest_batch(payload jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE
 tenant uuid := public.get_auth_pousada_id();
 batch_key text := payload->>'batchKey';
 item jsonb; companion jsonb; saved jsonb;
 gid uuid; rid uuid; existing_id uuid;
 guest_map jsonb := '{}'; room_map jsonb := '{}';
 guest_count integer := 0; stay_count integer := 0;
 normalized_cpf text;
BEGIN
 IF tenant IS NULL OR NOT public.can_operate() THEN RAISE EXCEPTION 'Sem permissão para importar.'; END IF;
 IF batch_key IS NULL OR batch_key !~ '^[a-f0-9]{64}$' THEN RAISE EXCEPTION 'Identificação do lote inválida.'; END IF;
 IF jsonb_typeof(payload->'guests') IS DISTINCT FROM 'array' OR jsonb_typeof(payload->'stays') IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Lote inválido.'; END IF;
 IF jsonb_array_length(payload->'guests') > 10000 OR jsonb_array_length(payload->'stays') > 10000 THEN RAISE EXCEPTION 'Limite de 10000 registros por lote.'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(tenant::text, 0));
 IF EXISTS (SELECT 1 FROM public.import_history WHERE pousada_id = tenant AND details->>'batchKey' = batch_key) THEN
   RETURN jsonb_build_object('importedGuestsCount', 0, 'importedStaysCount', 0, 'alreadyImported', true);
 END IF;
 FOR item IN SELECT * FROM jsonb_array_elements(payload->'guests') LOOP
   IF coalesce(trim(item->>'full_name'), '') = '' OR coalesce(item->>'id','') = '' THEN RAISE EXCEPTION 'Hóspede sem nome ou referência.'; END IF;
   normalized_cpf := nullif(regexp_replace(coalesce(item->>'cpf', ''), '[^0-9]', '', 'g'), '');
   gid := NULL;
   IF normalized_cpf IS NOT NULL THEN SELECT id INTO gid FROM public.guests WHERE pousada_id = tenant AND regexp_replace(cpf, '[^0-9]', '', 'g') = normalized_cpf; END IF;
   IF gid IS NOT NULL AND EXISTS (SELECT 1 FROM public.guests WHERE id = gid AND archived_at IS NOT NULL) THEN RAISE EXCEPTION 'CPF pertence a cadastro arquivado. Revise antes de importar.'; END IF;
   IF gid IS NULL THEN
     INSERT INTO public.guests (pousada_id, full_name, cpf, phone, alt_doc_type, alt_doc_number, alt_doc_country, email, city, state, neighborhood, street, number, complement, zip_code, country, preferences, is_incomplete)
     VALUES (tenant, trim(item->>'full_name'), normalized_cpf, coalesce(item->>'phone',''), item->>'alt_doc_type', item->>'alt_doc_number', item->>'alt_doc_country', item->>'email', item->>'city', item->>'state', item->>'neighborhood', item->>'street', item->>'number', item->>'complement', item->>'zip_code', coalesce(item->>'country','Brasil'), item->>'preferences', coalesce((item->>'is_incomplete')::boolean,false) OR coalesce(item->>'phone','') = '') RETURNING id INTO gid;
     guest_count := guest_count + 1;
   END IF;
   guest_map := guest_map || jsonb_build_object(item->>'id', gid);
 END LOOP;
 FOR item IN SELECT * FROM jsonb_array_elements(coalesce(payload->'rooms','[]')) LOOP
   IF coalesce(trim(item->>'number_name'),'') = '' OR coalesce(item->>'id','') = '' THEN RAISE EXCEPTION 'Acomodação inválida.'; END IF;
   rid := NULL;
   SELECT id INTO rid FROM public.rooms WHERE pousada_id = tenant AND lower(trim(number_name)) = lower(trim(item->>'number_name'));
   IF rid IS NULL THEN
     INSERT INTO public.rooms (pousada_id, number_name, capacity, status, active)
     VALUES (tenant, trim(item->>'number_name'), greatest(1, coalesce((item->>'capacity')::integer,1)), 'disponivel', true) RETURNING id INTO rid;
   END IF;
   room_map := room_map || jsonb_build_object(item->>'id', rid);
 END LOOP;
 FOR item IN SELECT * FROM jsonb_array_elements(payload->'stays') LOOP
   gid := (guest_map->>(item->>'guest_id'))::uuid;
   rid := (room_map->>(item->>'room_id'))::uuid;
   IF gid IS NULL OR rid IS NULL THEN RAISE EXCEPTION 'Hospedagem sem vínculo de hóspede ou quarto.'; END IF;
   SELECT id INTO existing_id FROM public.stays WHERE pousada_id = tenant AND guest_id = gid AND room_id = rid
     AND check_in_expected = (item->>'check_in_expected')::timestamptz AND check_out_expected = (item->>'check_out_expected')::timestamptz LIMIT 1;
   IF existing_id IS NOT NULL THEN CONTINUE; END IF;
   saved := public.save_stay(jsonb_build_object(
     'guest_id',gid, 'room_id',rid, 'check_in_expected',item->>'check_in_expected', 'check_out_expected',item->>'check_out_expected',
     'party_size',coalesce((item->>'party_size')::integer,1), 'agreed_amount',coalesce((item->>'agreed_amount')::numeric,0),
     'status',coalesce(item->>'status','finalizada'), 'notes',item->>'notes', 'companions',coalesce(item->'companions','[]'::jsonb)));
   stay_count := stay_count + 1;
 END LOOP;
 INSERT INTO public.import_history (pousada_id, filename, total_rows, imported_guests, imported_stays, status, details, created_by)
 VALUES (tenant, coalesce(payload->>'filename','importação'), jsonb_array_length(payload->'guests'), guest_count, stay_count, 'sucesso',
   jsonb_build_object('batchKey',batch_key,'warnings',payload->'warnings','sourceRows',payload->'sourceRows','guests',payload->'guests'), auth.uid());
 RETURN jsonb_build_object('importedGuestsCount',guest_count,'importedStaysCount',stay_count);
END $$;
REVOKE ALL ON FUNCTION public.import_guest_batch(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.import_guest_batch(jsonb) TO authenticated;
COMMIT;
