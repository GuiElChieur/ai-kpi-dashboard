
-- Insert policies for import (service role will be used but also allow authenticated inserts for manual upload)
CREATE POLICY "Authenticated users can insert achats" ON public.achats FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can delete achats" ON public.achats FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert ot_lignes" ON public.ot_lignes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can delete ot_lignes" ON public.ot_lignes FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert pointages" ON public.pointages FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can delete pointages" ON public.pointages FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert matieres" ON public.matieres FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can delete matieres" ON public.matieres FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert cables" ON public.cables FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can delete cables" ON public.cables FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert import_logs" ON public.import_logs FOR INSERT TO authenticated WITH CHECK (true);

-- Insert policy for profiles (for signup trigger)
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
