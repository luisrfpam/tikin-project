-- Allow beneficiaries to insert transactions for their own vouchers
CREATE POLICY "Beneficiaries insert own transactions"
ON public.transactions
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.vouchers v
    WHERE v.id = transactions.voucher_id
      AND v.beneficiary_id = auth.uid()
  )
);

-- Allow beneficiaries to update their own transactions (e.g. set transfero_tx_id)
CREATE POLICY "Beneficiaries update own transactions"
ON public.transactions
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.vouchers v
    WHERE v.id = transactions.voucher_id
      AND v.beneficiary_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.vouchers v
    WHERE v.id = transactions.voucher_id
      AND v.beneficiary_id = auth.uid()
  )
);

-- Allow beneficiaries to update their own vouchers' remaining_value/status
CREATE POLICY "Beneficiaries update own vouchers"
ON public.vouchers
FOR UPDATE
TO authenticated
USING (auth.uid() = beneficiary_id)
WITH CHECK (auth.uid() = beneficiary_id);