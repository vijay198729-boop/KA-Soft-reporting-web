import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';

const app = express();
app.use(cors());
app.use(express.json());

// Log all incoming requests for debugging
app.use((req, res, next) => {
  console.log(`[Request] ${req.method} ${req.url}`);
  next();
});

const supabaseUrl = process.env.SUPABASE_URL;
// Use Service Role Key for backend to allow admin actions (bypassing RLS if needed)
let supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('WARNING: SUPABASE_SERVICE_ROLE_KEY is missing. Database queries might fail due to RLS policies.');
}

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase Environment Variables (URL or Keys)');
  process.exit(1);
}

// Clean the key: remove whitespace and surrounding quotes which might have been copied
supabaseKey = supabaseKey.trim();
if ((supabaseKey.startsWith('"') && supabaseKey.endsWith('"')) || (supabaseKey.startsWith("'") && supabaseKey.endsWith("'"))) {
  supabaseKey = supabaseKey.slice(1, -1);
}

// Check for common copy-paste error where the label is included
if (supabaseKey.includes(' ')) {
  console.error('Error: The Supabase Key contains spaces. This is likely a copy-paste error (e.g. including "service_role key:").');
  console.error(`Key found (first 20 chars): "${supabaseKey.substring(0, 20)}..."`);
  console.error('Please update .env to contain ONLY the key string.');
  process.exit(1);
}

// Safety Check: Prevent trying to connect to localhost from Vercel
if (process.env.VERCEL && supabaseUrl?.includes('localhost')) {
  console.error('\n❌ CONFIGURATION ERROR: You are trying to connect to a "localhost" Supabase instance from Vercel.');
  console.error('   Vercel servers cannot access your local machine. You must use a Supabase Cloud project URL.\n');
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  global: {
    headers: { 'ngrok-skip-browser-warning': 'true' },
  },
});
// Log the connection target to help debug ngrok issues in Vercel logs
console.log(`[API] Connecting to Supabase at: ${supabaseUrl}`);

const requireAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Missing Authorization Header' });

  const token = authHeader.split(' ')[1];
  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) return res.status(401).json({ error: 'Invalid Token' });

  (req as any).user = user;
  next();
};

// Helper to check if user is admin in our database
const checkRole = async (email: string) => {
  const { data } = await supabase
    .from('allowed_users')
    .select('role')
    .ilike('email', email) // Case-insensitive match
    .single();
  return data?.role;
};

// Route: Get User Profile & Role
app.get('/api/profile', requireAuth, async (req, res) => {
  const user = (req as any).user;
  console.log(`[API] Checking access for user: ${user.email}`);
  
  // Check if user exists in allowed_users table
  const { data: profile, error } = await supabase
    .from('allowed_users')
    .select('*')
    .ilike('email', user.email) // Case-insensitive match
    .single();

  if (error || !profile) {
    if (error) {
      console.error('[API] Database Error:', error.message);
      if (error.code === '42P01') {
        console.error('[API] HINT: The "allowed_users" table does not exist. Please run "npx supabase db reset" to create it.');
      }
    } else console.warn('[API] User not found in allowed_users table');
    return res.status(403).json({ error: 'Access Denied: You are not in the allowed users list.' });
  }

  if (profile.role === 'pending') {
    return res.status(403).json({ error: 'Access Pending: Your account is awaiting admin approval.' });
  }
  if (profile.role === 'disabled') {
    return res.status(403).json({ error: 'Access Denied: Your account has been disabled.' });
  }

  res.json({ ...user, role: profile.role });
});

// Route: Update User Role (Approve/Promote/Disable)
app.put('/api/users/:email', requireAuth, async (req, res) => {
  const user = (req as any).user;
  const emailToUpdate = req.params.email;
  const { role } = req.body;

  if (!role || !['admin', 'user', 'pending', 'disabled'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }

  const requesterRole = await checkRole(user.email);
  if (requesterRole !== 'admin') {
    return res.status(403).json({ error: 'Only admins can update users.' });
  }

  const { data, error } = await supabase
    .from('allowed_users')
    .update({ role })
    .eq('email', emailToUpdate)
    .select();

  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

// Route: Get All Users (Admin Only)
app.get('/api/users', requireAuth, async (req, res) => {
  const user = (req as any).user;
  const requesterRole = await checkRole(user.email);

  if (requesterRole !== 'admin') {
    return res.status(403).json({ error: 'Only admins can view users.' });
  }

  const { data, error } = await supabase
    .from('allowed_users')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

// Route: Delete User (Admin Only)
app.delete('/api/users/:email', requireAuth, async (req, res) => {
  const user = (req as any).user;
  const emailToDelete = req.params.email;

  const requesterRole = await checkRole(user.email);
  if (requesterRole !== 'admin') {
    return res.status(403).json({ error: 'Only admins can delete users.' });
  }

  // Prevent deleting yourself
  if (emailToDelete.toLowerCase() === user.email.toLowerCase()) {
    return res.status(400).json({ error: 'You cannot delete your own account.' });
  }

  const { error } = await supabase.from('allowed_users').delete().eq('email', emailToDelete);

  if (error) return res.status(400).json({ error: error.message });
  res.json({ message: 'User deleted successfully' });
});

app.get('/api/protected', requireAuth, (req, res) => {
  const user = (req as any).user;
  res.json({
    message: 'Protected data from Node API',
    user_id: user.id,
    email: user.email
  });
});

app.get('/', (req, res) => {
  res.send({ message: 'API is running' });
});

const port = process.env.PORT || 3100;

// Export app for Vercel Serverless
export default app;

if (!process.env.VERCEL) {
  const server = app.listen(port, () => {
    console.log(`Listening at http://localhost:${port}`);
  });
  server.on('error', console.error);
}