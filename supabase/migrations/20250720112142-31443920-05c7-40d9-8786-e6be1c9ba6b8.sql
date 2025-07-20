-- Add INSERT policy for owners table to allow users to create their own owner record
CREATE POLICY "Users can insert their own owner record" 
ON public.owners 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);