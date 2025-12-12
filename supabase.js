import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://mfyjgopntkilozvxiifo.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1meWpnb3BudGtpbG96dnhpaWZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0NzE5NDksImV4cCI6MjA4MTA0Nzk0OX0.Zh3GKIOZLqcCib1BXVLxQ1QvxUdCPM4llsrD9IPIjO8'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
