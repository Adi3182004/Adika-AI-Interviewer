
DO $$
DECLARE
  v_cand uuid := '11111111-1111-4111-8111-111111111111';
  v_rec  uuid := '22222222-2222-4222-8222-222222222222';
  v_job1 uuid := '33333333-3333-4333-8333-333333333331';
  v_job2 uuid := '33333333-3333-4333-8333-333333333332';
  v_resume uuid := '44444444-4444-4444-8444-444444444444';
  v_ses uuid := '55555555-5555-4555-8555-555555555555';
  v_app uuid := '66666666-6666-4666-8666-666666666666';
  v_pw text := crypt('Demo@1234', gen_salt('bf'));
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = v_cand) THEN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token,
      email_change, email_change_token_new, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', v_cand, 'authenticated', 'authenticated',
      'candidate@adika.ai', v_pw, now(),
      jsonb_build_object('provider','email','providers',jsonb_build_array('email')),
      jsonb_build_object('full_name','Aditya Andhalkar','primary_role','candidate'),
      now(), now(), '', '', '', ''
    );
    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (gen_random_uuid(), v_cand, v_cand::text,
      jsonb_build_object('sub', v_cand::text, 'email','candidate@adika.ai','email_verified',true),
      'email', now(), now(), now());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = v_rec) THEN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token,
      email_change, email_change_token_new, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', v_rec, 'authenticated', 'authenticated',
      'recruiter@adika.ai', v_pw, now(),
      jsonb_build_object('provider','email','providers',jsonb_build_array('email')),
      jsonb_build_object('full_name','Priya Recruiter','primary_role','recruiter'),
      now(), now(), '', '', '', ''
    );
    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (gen_random_uuid(), v_rec, v_rec::text,
      jsonb_build_object('sub', v_rec::text, 'email','recruiter@adika.ai','email_verified',true),
      'email', now(), now(), now());
  END IF;

  INSERT INTO public.profiles (id, full_name, email, phone, primary_role, education, experience_level)
  VALUES (v_cand, 'Aditya Andhalkar', 'candidate@adika.ai', '+91 98765 43210', 'candidate', 'B.E. Computer Engineering', 'junior')
  ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name;

  INSERT INTO public.profiles (id, full_name, email, primary_role, company_name, company_size, industry, hiring_goals)
  VALUES (v_rec, 'Priya Recruiter', 'recruiter@adika.ai', 'recruiter', 'Adika Talent Labs', '51-200', 'SaaS', 'Hire 10 engineers in Q1')
  ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name;

  INSERT INTO public.user_roles (user_id, role) VALUES (v_cand, 'candidate') ON CONFLICT DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (v_rec, 'recruiter') ON CONFLICT DO NOTHING;

  INSERT INTO public.resumes (id, user_id, title, content, parsed_skills, ats_score, ats_feedback, is_primary)
  VALUES (
    v_resume, v_cand, 'Aditya — Backend Engineer',
    jsonb_build_object(
      'name','Aditya Andhalkar',
      'summary','Backend engineer focused on Python, FastAPI and cloud-native systems.',
      'experience', jsonb_build_array(
        jsonb_build_object('company','Prodigy InfoTech','role','Data Science Intern','duration','Jun 2025 – Jul 2025','bullets', jsonb_build_array('Built ML pipelines','Shipped EDA notebooks'))
      ),
      'projects', jsonb_build_array('AI Chatbot','Voice Assistant','Gesture Input System'),
      'education','B.E. Computer Engineering – NHITM, Mumbai'
    ),
    ARRAY['python','sql','docker','git','c++','html','css'],
    88,
    jsonb_build_object('summary','Strong fundamentals; add measurable impact and cloud depth.',
      'sections', jsonb_build_array(
        jsonb_build_object('name','Summary','score',82,'tip','Quantify achievements with metrics.'),
        jsonb_build_object('name','Experience','score',76,'tip','Use STAR format with numbers.'),
        jsonb_build_object('name','Skills','score',90,'tip','Group by domain.')
      )),
    true
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.jobs (id, recruiter_id, title, company, location, employment_type, seniority, salary_min, salary_max, description, skills, status)
  VALUES
    (v_job1, v_rec, 'Senior Backend Engineer', 'Adika Talent Labs', 'Remote', 'full_time', 'senior', 140000, 180000,
     'Design rate-limited webhook ingestors at 50K events/sec. Own FastAPI services on AWS.',
     ARRAY['python','fastapi','postgresql','aws','redis','docker'], 'published'),
    (v_job2, v_rec, 'AI Platform Engineer', 'Adika Talent Labs', 'Bangalore', 'full_time', 'mid', 110000, 150000,
     'Build the inference + evaluation backbone for our adaptive interview engine.',
     ARRAY['python','pytorch','llm','postgres','kubernetes'], 'published')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.applications (id, job_id, candidate_id, resume_id, match_score, skill_gaps, stage, cover_note)
  VALUES (v_app, v_job1, v_cand, v_resume, 82, ARRAY['fastapi','aws','redis'], 'interview',
    'Excited to apply — strong Python + recent FastAPI projects.')
  ON CONFLICT (job_id, candidate_id) DO NOTHING;

  INSERT INTO public.interview_sessions (id, candidate_id, job_id, role_target, difficulty, status, question_count, overall_score, readiness_score, strengths, gaps, summary)
  VALUES (v_ses, v_cand, v_job1, 'Backend Engineer', 'mid', 'completed', 6, 84, 79,
    ARRAY['Python','API design','Problem decomposition'],
    ARRAY['System design at scale','AWS deep services','Redis caching patterns'],
    'Solid mid-level signal. Strong fundamentals and clear communication. Push system-design depth and cloud breadth before senior loops.')
  ON CONFLICT (id) DO NOTHING;

  IF NOT EXISTS (SELECT 1 FROM public.interview_messages im WHERE im.session_id = v_ses) THEN
    INSERT INTO public.interview_messages (session_id, role, content, score, signals) VALUES
      (v_ses, 'assistant', 'Walk me through designing a rate-limited webhook ingestor for 50K events/sec.', NULL, NULL),
      (v_ses, 'user', 'I would front it with an API gateway, use Redis token bucket for per-tenant limits, push events to Kafka, and process with idempotent consumers.', 86,
        jsonb_build_object('clarity',82,'technical',88,'depth',84)),
      (v_ses, 'assistant', 'How do you guarantee at-least-once delivery without duplicate side effects?', NULL, NULL),
      (v_ses, 'user', 'Persist an event_id dedup key in Postgres with a unique index; consumers upsert and skip dupes.', 81,
        jsonb_build_object('clarity',80,'technical',82,'depth',78)),
      (v_ses, 'assistant', 'Where would the system break first at 5x traffic?', NULL, NULL),
      (v_ses, 'user', 'Likely the Postgres dedup index hot-spotting. Shift to Redis bloom filter + partitioned tables.', 84,
        jsonb_build_object('clarity',85,'technical',84,'depth',82));
  END IF;

  INSERT INTO public.learning_items (candidate_id, skill, source_session_id, status) VALUES
    (v_cand, 'FastAPI', v_ses, 'in_progress'),
    (v_cand, 'AWS — Lambda + S3', v_ses, 'todo'),
    (v_cand, 'Redis caching patterns', v_ses, 'todo'),
    (v_cand, 'System design at scale', v_ses, 'in_progress'),
    (v_cand, 'PostgreSQL performance tuning', v_ses, 'done')
  ON CONFLICT DO NOTHING;
END $$;
