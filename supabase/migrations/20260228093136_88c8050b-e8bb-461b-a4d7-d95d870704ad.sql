CREATE TABLE public.pdf_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL DEFAULT 'Без названия',
  pages JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.pdf_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read pdf_documents" ON public.pdf_documents FOR SELECT USING (true);
CREATE POLICY "Anyone can insert pdf_documents" ON public.pdf_documents FOR INSERT WITH CHECK (true);