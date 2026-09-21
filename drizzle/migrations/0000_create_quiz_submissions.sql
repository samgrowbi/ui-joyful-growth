CREATE TABLE public.quiz_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  concerns text[] NOT NULL DEFAULT '{}',
  age_range text,
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  source_page text NOT NULL DEFAULT '/quiz',
  user_agent text,
  referrer text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.quiz_submissions TO authenticated;
GRANT ALL ON public.quiz_submissions TO service_role;

ALTER TABLE public.quiz_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read quiz submissions"
ON public.quiz_submissions
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));