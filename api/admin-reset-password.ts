import { createClient } from '@supabase/supabase-js';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: `Method not allowed: ${req.method}` });
  }

  try {
    // 1. Authenticate the admin
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Missing authorization header' });
    }

    const token = authHeader.replace('Bearer ', '');
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return res.status(500).json({ error: 'Server configuration error' });
    }

    // Client pour vérifier l'admin
    const supabaseClient = createClient(supabaseUrl, process.env.VITE_SUPABASE_ANON_KEY || '');
    const { data: { user: adminUser }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !adminUser) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Vérifier le rôle admin
    const { data: adminProfile } = await supabaseClient
      .from('profiles')
      .select('role')
      .eq('id', adminUser.id)
      .single();

    if (adminProfile?.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized: admin role required' });
    }

    const { userId, email, pseudo, action } = req.body;
    if (!userId || !email || !action) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Client Admin (Service Role)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    if (action === 'temp_password') {
      // Générer un mot de passe temporaire
      const tempPassword = Math.random().toString(36).slice(-10) + 'A1!';
      
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        userId,
        { password: tempPassword }
      );

      if (updateError) throw updateError;

      // Forcer le changement de mot de passe à la prochaine connexion
      await supabaseAdmin.from('profiles').update({ force_password_change: true }).eq('id', userId);

      return res.status(200).json({ tempPassword });

    } else if (action === 'reset_link') {
      // Générer un lien de réinitialisation
      const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'recovery',
        email: email
      });

      if (linkError) throw linkError;

      return res.status(200).json({ resetLink: linkData.properties.action_link });
    } else {
      return res.status(400).json({ error: 'Invalid action' });
    }
  } catch (error: any) {
    console.error('Erreur admin-reset-password:', error);
    return res.status(500).json({ error: error.message });
  }
}
