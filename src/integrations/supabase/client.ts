import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://vvtympzatclvjaqucebr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ2dHltcHphdGNsdmphcXVjZWJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA0NTI1NzYsImV4cCI6MjA4NjAyODU3Nn0.C8vWcljx6veAQ0hCi0ms7Ixm6NxhSdWBDeRgUy2Kz50';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
