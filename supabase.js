// supabase.js — Khởi tạo Supabase JS client cho Auth

const SUPABASE_URL = 'https://vspfbfeazipxjgymxpzr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZzcGZiZmVhemlweGpneW14cHpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzMjk4MzUsImV4cCI6MjA4NzkwNTgzNX0.tPQtyJDRxqWxGF-bYYSYWu3moNbFrSRSPigvQJFPdDA';

const { createClient } = supabase; // từ CDN @supabase/supabase-js@2
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    flowType: 'implicit',
    detectSessionInUrl: true,
    persistSession: true,
  }
});
