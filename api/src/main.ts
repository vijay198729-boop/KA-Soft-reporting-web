import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';

const app = express();
app.use(cors());
app.use(express.json());

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
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Missing Authorization Header' });

    const token = authHeader.split(' ')[1];
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) return res.status(401).json({ error: 'Invalid Token' });

    (req as any).user = user;
    next();
  } catch (err: any) {
    console.error('[API] Auth Middleware Error:', err);
    res.status(500).json({ error: 'Authentication Failed', details: err.message });
  }
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

// Route: Register User (Public)
app.post('/api/register', async (req, res) => {
  const { email, password, name, companyName, phone } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  try {
    // 1. Create user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm so they can login immediately (or set false if you want email verification)
      user_metadata: { name, company_name: companyName, phone }
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error('User creation failed');

    // 2. Insert into allowed_users
    const { error: dbError } = await supabase
      .from('allowed_users')
      .insert([{
        email: authData.user.email,
        role: 'pending',
        name,
        company_name: companyName,
        phone
      }]);

    if (dbError) {
      // Rollback: delete auth user if db insert fails to keep consistency
      await supabase.auth.admin.deleteUser(authData.user.id);
      if (dbError.message?.includes('schema cache')) {
        console.error('[API] Supabase Schema Cache is stale. Please run "NOTIFY pgrst, \'reload schema\';" in the Supabase SQL Editor.');
      }
      throw dbError;
    }

    res.json({ message: 'Registration successful', user: authData.user });
  } catch (err: any) {
    console.error('[API] Registration Error:', err);
    res.status(400).json({ error: err.message });
  }
});

// Route: Get User Profile & Role
app.get('/api/profile', requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    
    // Check if user exists in allowed_users table
    const { data: profile, error } = await supabase
      .from('allowed_users')
      .select('*')
      .ilike('email', user.email) // Case-insensitive match
      .maybeSingle(); // Use maybeSingle to handle "not found" without throwing an error

    if (error) {
      console.error('[API] Database Error:', error.message);
      if (error.code === '42P01') {
        console.error('[API] HINT: The "allowed_users" table does not exist. Please run "npx supabase db reset" to create it.');
      }
      return res.status(500).json({ error: 'Database error checking profile' });
    }

    // If user exists in Auth but not in allowed_users, auto-create them as pending
    if (!profile) {
      const { name, company_name, phone } = user.user_metadata || {};
      const { error: insertError } = await supabase
        .from('allowed_users')
        .insert([{
          email: user.email,
          role: 'pending',
          name: name || '',
          company_name: company_name || '',
          phone: phone || ''
        }]);

      if (insertError) {
        console.error('[API] Failed to auto-create profile:', insertError.message);
        if (insertError.message?.includes('schema cache')) {
          console.error('[API] Supabase Schema Cache is stale. Please run "NOTIFY pgrst, \'reload schema\';" in the Supabase SQL Editor.');
        }
        // Return pending anyway so the UI shows the correct screen instead of crashing
        return res.json({ ...user, role: 'pending' });
      }
      return res.json({ ...user, role: 'pending' });
    }

    if (profile.role === 'pending') {
      // Return 200 so the frontend can render the "Pending Approval" screen instead of an error
      return res.json({ ...user, role: 'pending' });
    }
    if (profile.role === 'disabled') {
      return res.status(403).json({ error: 'Access Denied: Your account has been disabled.' });
    }

    res.json({ ...user, role: profile.role });
  } catch (err: any) {
    console.error('[API] Critical Error in /api/profile:', err);
    res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
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

  // 1. Get User ID (UUID) from allowed_users to delete from Auth
  const { data: targetUser, error: findError } = await supabase
    .from('allowed_users')
    .select('*')
    .ilike('email', emailToDelete)
    .single();

  if (findError || !targetUser) {
    return res.status(404).json({ error: 'User not found.' });
  }

  // 2. Delete from Supabase Auth (auth.users)
  if (targetUser.id) {
    const { error: authError } = await supabase.auth.admin.deleteUser(targetUser.id);
    if (authError) {
      console.warn(`[API] Auth Deletion Failed: ${authError.message}`);
    }
  }

  // 3. Delete from public table
  const { error } = await supabase.from('allowed_users').delete().eq('email', emailToDelete);

  if (error) return res.status(400).json({ error: error.message });
  res.json({ message: 'User deleted successfully' });
});

// Route: Calculate Grades (KA LR Grade & Fish Eye)
app.post('/api/calculate-grades', requireAuth, async (req, res) => {
  const { tableWidth, crown, pavilionDepth, shape, halvesAngleAvg } = req.body;

  if (!tableWidth || !crown || !pavilionDepth) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  try {
    let kgs = null;
    let feye = null;
    let bowtie = null;

    let mainTable = '';
    let bowtieTable = '';
    // Define default column names, for Pear 8 Mains
    const mainTableCols = {
      table: 'TABLE_PC_MIN',
      crown: 'CROWN_FANCY_CURVE_ANGLE_DEG',
      pavilion: 'PAVILION_DEPTH_PC',
    };
    const bowtieCols = {
      hMin: 'HMIN',
      hMax: 'HMAX',
    };

    if (shape === 'Pear 8 Mains') {
      mainTable = 'LPear_ImageViewerData';
      bowtieTable = 'LPear_ImageViewerData_BWT_AI';
    } else if (shape === 'Pear 4 Mains') {
      mainTable = 'Pear2_ImageViewerData';
      bowtieTable = 'Pear2_ImageViewer_Data_AI';
    }

    if (mainTable) {
      console.log(`[API] Querying ${mainTable} for ${shape}`, {
        [mainTableCols.table]: tableWidth,
        [mainTableCols.crown]: crown,
        [mainTableCols.pavilion]: pavilionDepth
      });

      // Query mainTable for KGS and FEYE based on inputs
      const { data, error } = await supabase
        .from(mainTable)
        .select('KGS, FEYE')
        .eq(mainTableCols.table, tableWidth)
        .eq(mainTableCols.crown, crown)
        .eq(mainTableCols.pavilion, pavilionDepth);

      if (error) {
        console.error(`[API] Error querying ${mainTable}:`, error);
        throw error;
      }
      console.log(`[API] ${mainTable} returned ${data?.length} rows`);

      if (data && data.length > 0) {
        // Get lowest values as requested
        const kgsValues = data.map((d) => parseFloat(d.KGS)).filter((n) => !isNaN(n));
        const feyeValues = data.map((d) => parseFloat(d.FEYE)).filter((n) => !isNaN(n));

        kgs = kgsValues.length > 0 ? Math.min(...kgsValues) : null;
        feye = feyeValues.length > 0 ? Math.min(...feyeValues) : null;
      }

      // Calculate Bowtie Grade (Bgrade/KGS)
      if (halvesAngleAvg && bowtieTable) {
        const halvesAvgNum = parseFloat(halvesAngleAvg);
        if (!isNaN(halvesAvgNum)) {
          const { data: bwtData, error: bwtError } = await supabase
            .from(bowtieTable)
            .select('KGS')
            .eq('CROWN_FANCY_CURVE_ANGLE_DEG', crown)
            .lte(bowtieCols.hMin, halvesAvgNum)
            .gte(bowtieCols.hMax, halvesAvgNum);

          if (bwtError) {
            console.error('[API] Bowtie Calculation Error:', bwtError);
          } else if (bwtData && bwtData.length > 0) {
            const bwtValues = bwtData.map((d) => parseFloat(d.KGS)).filter((n) => !isNaN(n));
            bowtie = bwtValues.length > 0 ? Math.min(...bwtValues) : null;
          }
        }
      }
    }

    res.json({ kgs, feye, bowtie });
  } catch (err: any) {
    console.error('[API] Calculation Error:', err);
    res.status(500).json({ error: err.message });
  }
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