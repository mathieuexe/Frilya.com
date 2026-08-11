const RESEND_API_KEY = import.meta.env.VITE_RESEND_API_KEY;
// Attention: L'utilisation directe de l'API key en front-end n'est pas recommandée pour la sécurité, 
// l'idéal serait de passer par une Edge Function Supabase. 
// Mais pour ce besoin, nous faisons l'appel direct avec une variable d'environnement.

export const sendBetaConfirmationEmail = async (email: string, pseudo: string) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1e293b;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #0f172a; margin: 0;">Frilya</h1>
        <p style="color: #64748b; font-size: 14px; margin-top: 5px;">La marketplace des freelances</p>
      </div>
      
      <div style="background-color: #f8fafc; border-radius: 16px; padding: 30px; margin-bottom: 30px;">
        <h2 style="color: #0f172a; margin-top: 0;">Bonjour ${pseudo},</h2>
        <p>Nous avons bien reçu votre demande pour participer à la version bêta de Frilya ! 🎉</p>
        
        <p><strong>Rappel important :</strong> Cette adresse e-mail doit être valide, car c'est ici que vous recevrez vos accès si votre candidature est retenue.</p>
        
        <p>Votre demande va être étudiée par notre équipe. Le délai de traitement peut varier en fonction du nombre de demandes.</p>
      </div>
      
      <p>À très bientôt sur Frilya !</p>
      
      <div style="border-top: 1px solid #e2e8f0; margin-top: 30px; padding-top: 20px; text-align: center; font-size: 12px; color: #94a3b8;">
        <p>© ${new Date().getFullYear()} Frilya. Tous droits réservés.</p>
      </div>
    </div>
  `;

  return sendEmail(email, 'Confirmation de votre demande de Bêta - Frilya', html);
};

export const sendBetaAcceptedEmail = async (email: string, pseudo: string, password: string, endDate: string) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1e293b;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #0f172a; margin: 0;">Frilya</h1>
      </div>
      
      <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 16px; padding: 30px; margin-bottom: 30px;">
        <h2 style="color: #166534; margin-top: 0;">Félicitations ${pseudo}, votre demande est acceptée ! 🚀</h2>
        <p>Vous faites maintenant partie de nos bêta-testeurs exclusifs.</p>
        
        <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; font-size: 16px;">Vos identifiants de connexion :</h3>
          <p><strong>E-mail :</strong> ${email}</p>
          <p><strong>Mot de passe provisoire :</strong> ${password}</p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="https://frilya.com/auth" style="background-color: #0f172a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Se connecter à Frilya</a>
        </div>

        <p><strong>⚠️ Informations importantes :</strong></p>
        <ul>
          <li><strong>Accès temporaire :</strong> Votre compte bêta expirera le <strong>${new Date(endDate).toLocaleDateString('fr-FR')}</strong>.</li>
          <li><strong>Lecture seule :</strong> Vous pouvez naviguer sur toute la plateforme, mais vous ne pourrez pas effectuer d'actions réelles (pas de commandes, pas de création de services).</li>
          <li><strong>Publication officielle :</strong> Les comptes bêta ne seront pas conservés lors du lancement officiel. Vous devrez créer un nouveau compte.</li>
        </ul>
        
        <p>Nous apprécierons particulièrement votre avis, vos retours et vos suggestions d'amélioration via l'onglet <strong>Feedback</strong> de votre tableau de bord.</p>
      </div>
      
      <p>Merci pour votre aide précieuse !</p>
      
      <div style="border-top: 1px solid #e2e8f0; margin-top: 30px; padding-top: 20px; text-align: center; font-size: 12px; color: #94a3b8;">
        <p>© ${new Date().getFullYear()} Frilya. Tous droits réservés.</p>
      </div>
    </div>
  `;

  return sendEmail(email, 'Bienvenue dans la Bêta de Frilya !', html);
};

export const sendBetaRejectedEmail = async (email: string, pseudo: string, reason: string) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1e293b;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #0f172a; margin: 0;">Frilya</h1>
      </div>
      
      <div style="background-color: #f8fafc; border-radius: 16px; padding: 30px; margin-bottom: 30px;">
        <h2 style="color: #0f172a; margin-top: 0;">Bonjour ${pseudo},</h2>
        <p>Nous vous remercions pour l'intérêt que vous portez à la plateforme Frilya et pour votre candidature à notre programme de bêta-test.</p>
        
        <p>Après étude de votre demande, nous avons le regret de vous informer que nous ne pouvons malheureusement pas y donner une suite favorable pour le moment.</p>
        
        ${reason ? `<div style="background-color: white; padding: 15px; border-left: 4px solid #cbd5e1; margin: 20px 0;"><p style="margin: 0; color: #475569;"><strong>Motif :</strong> ${reason}</p></div>` : ''}
        
        <p>Nous espérons néanmoins vous compter parmi nos utilisateurs lors du lancement officiel de la plateforme.</p>
      </div>
      
      <p>Cordialement,<br>L'équipe Frilya</p>
      
      <div style="border-top: 1px solid #e2e8f0; margin-top: 30px; padding-top: 20px; text-align: center; font-size: 12px; color: #94a3b8;">
        <p>© ${new Date().getFullYear()} Frilya. Tous droits réservés.</p>
      </div>
    </div>
  `;

  return sendEmail(email, 'Votre candidature à la Bêta Frilya', html);
};

const sendEmail = async (to: string, subject: string, html: string) => {
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`
      },
      body: JSON.stringify({
        from: 'Frilya <noreply@frilya.com>', // Attention: Sur Resend, si le domaine n'est pas vérifié, on ne peut envoyer qu'à l'adresse email du compte Resend.
        to: [to],
        subject: subject,
        html: html
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Erreur Resend:', errorData);
      throw new Error('Erreur lors de l\'envoi de l\'email');
    }

    return await response.json();
  } catch (error) {
    console.error('Exception Resend:', error);
    throw error;
  }
};