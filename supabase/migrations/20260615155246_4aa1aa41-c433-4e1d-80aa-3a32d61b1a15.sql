CREATE POLICY "Own slides read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'lecture-slides' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Own slides insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'lecture-slides' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Own slides delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'lecture-slides' AND auth.uid()::text = (storage.foldername(name))[1]);