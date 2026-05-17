CREATE POLICY "Beneficiaries read linked issuers"
ON public.issuers
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.issuer_beneficiaries ib
    WHERE ib.issuer_id = issuers.id
      AND ib.beneficiary_id = auth.uid()
  )
);