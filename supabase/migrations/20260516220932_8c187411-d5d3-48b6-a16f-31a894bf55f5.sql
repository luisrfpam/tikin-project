
CREATE OR REPLACE FUNCTION public.pay_payment(
  _establishment_id uuid,
  _amount numeric,
  _slices jsonb,
  _charge_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_est establishments%ROWTYPE;
  v_charge charges%ROWTYPE;
  v_slice jsonb;
  v_voucher vouchers%ROWTYPE;
  v_slice_amount numeric;
  v_total numeric := 0;
  v_tx_id uuid;
  v_new_remaining numeric;
  v_new_status voucher_status;
  v_tx_ids uuid[] := ARRAY[]::uuid[];
  v_accepted text[];
  v_category text;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  IF _amount IS NULL OR _amount <= 0 THEN
    RAISE EXCEPTION 'Valor inválido';
  END IF;

  IF _slices IS NULL OR jsonb_array_length(_slices) = 0 THEN
    RAISE EXCEPTION 'Nenhum voucher selecionado';
  END IF;

  -- Estabelecimento ativo
  SELECT * INTO v_est FROM establishments WHERE id = _establishment_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Estabelecimento não encontrado';
  END IF;
  IF v_est.status <> 'active' THEN
    RAISE EXCEPTION 'Estabelecimento indisponível';
  END IF;
  v_accepted := v_est.accepted_categories;

  -- Cobrança (se houver), trava e valida
  IF _charge_id IS NOT NULL THEN
    SELECT * INTO v_charge FROM charges WHERE id = _charge_id FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Cobrança não encontrada';
    END IF;
    IF v_charge.status <> 'pending' THEN
      RAISE EXCEPTION 'Cobrança já foi processada';
    END IF;
    IF v_charge.establishment_id <> _establishment_id THEN
      RAISE EXCEPTION 'Cobrança não pertence a este lojista';
    END IF;
    IF ROUND(v_charge.amount::numeric, 2) <> ROUND(_amount::numeric, 2) THEN
      RAISE EXCEPTION 'Valor difere da cobrança (esperado R$ %)', v_charge.amount;
    END IF;
  END IF;

  -- Processa cada fatia
  FOR v_slice IN SELECT * FROM jsonb_array_elements(_slices)
  LOOP
    v_slice_amount := ROUND((v_slice->>'amount')::numeric, 2);
    IF v_slice_amount <= 0 THEN
      RAISE EXCEPTION 'Valor de fatia inválido';
    END IF;

    SELECT * INTO v_voucher
    FROM vouchers
    WHERE id = (v_slice->>'voucher_id')::uuid
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Voucher não encontrado';
    END IF;
    IF v_voucher.beneficiary_id <> v_user THEN
      RAISE EXCEPTION 'Voucher não pertence ao usuário';
    END IF;
    IF v_voucher.status NOT IN ('active', 'partially_used') THEN
      RAISE EXCEPTION 'Voucher % não está ativo (status: %)', v_voucher.id, v_voucher.status;
    END IF;
    IF v_voucher.expiration_date < CURRENT_DATE THEN
      RAISE EXCEPTION 'Voucher vencido em %', v_voucher.expiration_date;
    END IF;
    IF v_voucher.remaining_value < v_slice_amount THEN
      RAISE EXCEPTION 'Saldo insuficiente no voucher (R$ % disponível)', v_voucher.remaining_value;
    END IF;

    -- Categoria aceita pelo lojista
    v_category := v_voucher.rules->>'category';
    IF v_accepted IS NOT NULL AND array_length(v_accepted, 1) > 0 THEN
      IF v_category IS NULL OR NOT (v_category = ANY(v_accepted)) THEN
        RAISE EXCEPTION 'Categoria % não aceita por este lojista', COALESCE(v_category, '(sem categoria)');
      END IF;
    END IF;

    -- Cria transação
    INSERT INTO transactions (voucher_id, establishment_id, amount, status, voucher_category, description)
    VALUES (v_voucher.id, _establishment_id, v_slice_amount, 'confirmed',
            v_category, 'Pagamento em ' || v_est.name)
    RETURNING id INTO v_tx_id;
    v_tx_ids := v_tx_ids || v_tx_id;

    -- Atualiza voucher
    v_new_remaining := ROUND(v_voucher.remaining_value - v_slice_amount, 2);
    IF v_new_remaining < 0 THEN
      RAISE EXCEPTION 'Saldo do voucher ficaria negativo';
    END IF;
    v_new_status := CASE WHEN v_new_remaining <= 0.001 THEN 'used'::voucher_status
                         ELSE 'partially_used'::voucher_status END;
    UPDATE vouchers
    SET remaining_value = v_new_remaining,
        status = v_new_status,
        updated_at = now()
    WHERE id = v_voucher.id;

    v_total := v_total + v_slice_amount;
  END LOOP;

  -- Soma das fatias = valor total
  IF ROUND(v_total, 2) <> ROUND(_amount, 2) THEN
    RAISE EXCEPTION 'Soma das fatias (R$ %) difere do valor (R$ %)', v_total, _amount;
  END IF;

  -- Marca cobrança como paga
  IF _charge_id IS NOT NULL THEN
    UPDATE charges
    SET status = 'paid', paid_at = now(), updated_at = now()
    WHERE id = _charge_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'transaction_ids', to_jsonb(v_tx_ids),
    'total', v_total
  );
END;
$$;

REVOKE ALL ON FUNCTION public.pay_payment(uuid, numeric, jsonb, uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.pay_payment(uuid, numeric, jsonb, uuid) TO authenticated;
