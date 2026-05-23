-- category-policy-assisted-remediation.sql
-- Objetivo:
-- 1) Auditar transacoes confirmadas fora da politica de categoria do lojista
-- 2) Permitir correcao assistida (opt-in) para estornar transacoes selecionadas
--
-- Como usar:
-- - Rode inteiro para gerar a visao de auditoria.
-- - Revise os resultados em candidate_violations.
-- - Preencha selected_tx_ids com IDs aprovados para estorno.
-- - Troque apply_changes para true somente apos validar.

-- =========================
-- 1) Auditoria (snapshot)
-- =========================
DROP TABLE IF EXISTS candidate_violations;

CREATE TEMP TABLE candidate_violations AS
WITH tx AS (
  SELECT
    t.id AS transaction_id,
    t.created_at,
    t.amount,
    t.status,
    t.voucher_id,
    t.establishment_id,
    e.name AS establishment_name,
    public.normalize_category(COALESCE(t.voucher_category, v.rules->>'category')) AS tx_category_norm,
    public.normalize_category(v.rules->>'category') AS voucher_category_norm,
    public.normalize_category(e.category) AS establishment_category_norm,
    ARRAY_REMOVE(
      ARRAY_AGG(DISTINCT public.normalize_category(c))
      FILTER (WHERE c IS NOT NULL AND btrim(c) <> ''),
      NULL
    ) AS accepted_categories_norm
  FROM public.transactions t
  JOIN public.vouchers v ON v.id = t.voucher_id
  JOIN public.establishments e ON e.id = t.establishment_id
  LEFT JOIN LATERAL unnest(COALESCE(e.accepted_categories, '{}'::text[])) c ON TRUE
  WHERE t.status = 'confirmed'
  GROUP BY
    t.id, t.created_at, t.amount, t.status, t.voucher_id, t.establishment_id,
    t.voucher_category, v.rules, e.name, e.category
), policy AS (
  SELECT
    tx.*,
    CASE
      WHEN COALESCE(array_length(accepted_categories_norm, 1), 0) > 0 THEN accepted_categories_norm
      WHEN COALESCE(establishment_category_norm, '') <> '' THEN ARRAY[establishment_category_norm]::text[]
      ELSE ARRAY[]::text[]
    END AS resolved_allowed_categories
  FROM tx
)
SELECT
  transaction_id,
  created_at,
  amount,
  status,
  voucher_id,
  establishment_id,
  establishment_name,
  voucher_category_norm,
  resolved_allowed_categories,
  (
    COALESCE(array_length(resolved_allowed_categories, 1), 0) > 0
    AND (
      voucher_category_norm IS NULL
      OR voucher_category_norm = ''
      OR NOT (voucher_category_norm = ANY(resolved_allowed_categories))
    )
  ) AS out_of_policy
FROM policy
WHERE
  COALESCE(array_length(resolved_allowed_categories, 1), 0) > 0
  AND (
    voucher_category_norm IS NULL
    OR voucher_category_norm = ''
    OR NOT (voucher_category_norm = ANY(resolved_allowed_categories))
  );

-- Resultado detalhado
SELECT *
FROM candidate_violations
ORDER BY created_at DESC;

-- Resumo por lojista
SELECT
  establishment_id,
  establishment_name,
  COUNT(*) AS tx_out_of_policy,
  SUM(amount) AS total_amount_out_of_policy,
  MIN(created_at) AS first_occurrence,
  MAX(created_at) AS last_occurrence
FROM candidate_violations
GROUP BY establishment_id, establishment_name
ORDER BY total_amount_out_of_policy DESC;


-- ===============================================
-- 2) Correcao assistida (estorno controlado por flag)
-- ===============================================
DO $$
DECLARE
  -- IDs aprovados para estorno/reprocesso (caso Viviane).
  selected_tx_ids uuid[] := ARRAY[
    '92d9092a-990e-4e90-9742-3706df049ea9'::uuid,
    'ffc4183e-4d44-4039-b55b-eb2cdd301775'::uuid,
    'e47b3e54-5901-499c-a389-a311b5005be3'::uuid
  ];

  -- Ativo para aplicar imediatamente.
  apply_changes boolean := true;

  selected_count integer;
BEGIN
  IF COALESCE(array_length(selected_tx_ids, 1), 0) = 0 THEN
    RAISE NOTICE 'Nenhuma transacao selecionada. Pulando bloco de estorno.';
    RETURN;
  END IF;

  CREATE TEMP TABLE selected_violations AS
  SELECT cv.*
  FROM candidate_violations cv
  WHERE cv.transaction_id = ANY(selected_tx_ids);

  SELECT COUNT(*) INTO selected_count FROM selected_violations;

  IF selected_count = 0 THEN
    RAISE EXCEPTION 'Nenhuma transacao selecionada pertence ao conjunto de violacoes.';
  END IF;

  RAISE NOTICE 'Transacoes selecionadas para estorno: %', selected_count;

  -- Preview do que sera impactado
  RAISE NOTICE 'Preview: saldo que sera devolvido aos vouchers';
  PERFORM 1;

  IF NOT apply_changes THEN
    RAISE NOTICE 'Modo revisao ativo (apply_changes=false). Nenhuma alteracao aplicada.';
    RETURN;
  END IF;

  -- 2.1) Reverte saldo para os vouchers
  WITH refund AS (
    SELECT t.voucher_id, SUM(t.amount)::numeric AS refund_amount
    FROM public.transactions t
    JOIN selected_violations s ON s.transaction_id = t.id
    WHERE t.status = 'confirmed'
    GROUP BY t.voucher_id
  )
  UPDATE public.vouchers v
  SET
    remaining_value = ROUND(v.remaining_value + r.refund_amount, 2),
    status = CASE
      WHEN ROUND(v.remaining_value + r.refund_amount, 2) >= ROUND(v.value, 2) THEN 'active'::public.voucher_status
      WHEN ROUND(v.remaining_value + r.refund_amount, 2) <= 0 THEN 'used'::public.voucher_status
      ELSE 'partially_used'::public.voucher_status
    END,
    updated_at = now()
  FROM refund r
  WHERE v.id = r.voucher_id;

  -- 2.2) Marca transacoes como reversed
  UPDATE public.transactions t
  SET
    status = 'reversed'::public.transaction_status,
    description = COALESCE(t.description, '') || ' [AUTO-REVERSAL category-policy]'
  FROM selected_violations s
  WHERE t.id = s.transaction_id
    AND t.status = 'confirmed';

  RAISE NOTICE 'Estorno aplicado para % transacoes.', selected_count;
  RAISE NOTICE 'Proximo passo: reprocessar cobrancas/fluxo manualmente com categorias validas.';
END $$;
