UPDATE public.transactions t
SET beneficiary_name = p.name
FROM public.vouchers v
JOIN public.profiles p ON p.id = v.beneficiary_id
WHERE t.voucher_id = v.id
  AND (t.beneficiary_name IS NULL OR t.beneficiary_name = '');

CREATE OR REPLACE FUNCTION public.set_transaction_beneficiary_name()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.beneficiary_name IS NULL OR NEW.beneficiary_name = '' THEN
    SELECT p.name INTO NEW.beneficiary_name
    FROM public.vouchers v
    JOIN public.profiles p ON p.id = v.beneficiary_id
    WHERE v.id = NEW.voucher_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_transaction_beneficiary_name ON public.transactions;
CREATE TRIGGER trg_set_transaction_beneficiary_name
  BEFORE INSERT ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_transaction_beneficiary_name();