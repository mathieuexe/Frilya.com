// L'API Key est maintenant utilisée côté backend dans api/send-email.ts
// pour des raisons de sécurité et pour éviter les erreurs CORS.

export const sendBetaConfirmationEmail = async (email: string, pseudo: string) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1e293b;">
      <div style="text-align: center; margin-bottom: 30px;">
        <img src="https://frilya.com/logo.png" alt="Frilya" style="height: 40px; width: auto;" />
        <p style="color: #64748b; font-size: 14px; margin-top: 5px;">La plateforme freelance française pour réaliser tous vos projets</p>
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
        <img src="https://frilya.com/logo.png" alt="Frilya" style="height: 40px; width: auto;" />
        <p style="color: #64748b; font-size: 14px; margin-top: 5px;">La plateforme freelance française pour réaliser tous vos projets</p>
      </div>
      
      <div style="background-color: #f8fafc; border-radius: 16px; padding: 30px; margin-bottom: 30px;">
        <h2 style="color: #0f172a; margin-top: 0;">Félicitations ${pseudo}, votre demande est acceptée ! 🚀</h2>
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
        <img src="https://frilya.com/logo.png" alt="Frilya" style="height: 40px; width: auto;" />
        <p style="color: #64748b; font-size: 14px; margin-top: 5px;">La plateforme freelance française pour réaliser tous vos projets</p>
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
    // Appel de notre API serverless pour éviter les problèmes de CORS avec Resend
    const response = await fetch('/api/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: [to],
        subject: subject,
        html: html
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Erreur API send-email:', errorData);
      throw new Error('Erreur lors de l\'envoi de l\'email');
    }

    return await response.json();
  } catch (error) {
    console.error('Exception lors de l\'appel API send-email:', error);
    throw error;
  }
};

export const sendRegistrationConfirmationEmail = async (email: string, pseudo: string) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1e293b;">
      <div style="text-align: center; margin-bottom: 30px;">
        <img src="https://frilya.com/logo.png" alt="Frilya" style="height: 40px; width: auto;" />
      </div>
      <div style="background-color: #f8fafc; border-radius: 16px; padding: 30px; margin-bottom: 30px;">
        <h2 style="color: #0f172a; margin-top: 0;">Bienvenue sur Frilya, ${pseudo} ! 🎉</h2>
        <p>Votre compte a été créé avec succès. Vous pouvez dès maintenant explorer la plateforme, découvrir des talents ou proposer vos propres services.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="https://frilya.com/dashboard" style="background-color: #0f172a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Accéder à mon espace</a>
        </div>
      </div>
      <div style="border-top: 1px solid #e2e8f0; margin-top: 30px; padding-top: 20px; text-align: center; font-size: 12px; color: #94a3b8;">
        <p>© ${new Date().getFullYear()} Frilya. Tous droits réservés.</p>
      </div>
    </div>
  `;
  return sendEmail(email, 'Bienvenue sur Frilya !', html);
};

export const sendTicketCreatedEmail = async (email: string, pseudo: string, ticketRef: string, category: string) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1e293b;">
      <div style="text-align: center; margin-bottom: 30px;">
        <img src="https://frilya.com/logo.png" alt="Frilya" style="height: 40px; width: auto;" />
      </div>
      <div style="background-color: #f8fafc; border-radius: 16px; padding: 30px; margin-bottom: 30px;">
        <h2 style="color: #0f172a; margin-top: 0;">Bonjour ${pseudo},</h2>
        <p>Nous vous confirmons l'ouverture de votre ticket de support <strong>${ticketRef}</strong> concernant : <em>${category}</em>.</p>
        <p>Notre équipe va traiter votre demande dans les plus brefs délais.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="https://frilya.com/dashboard/tickets" style="background-color: #0f172a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Suivre mon ticket</a>
        </div>
      </div>
      <div style="border-top: 1px solid #e2e8f0; margin-top: 30px; padding-top: 20px; text-align: center; font-size: 12px; color: #94a3b8;">
        <p>© ${new Date().getFullYear()} Frilya. Tous droits réservés.</p>
      </div>
    </div>
  `;
  return sendEmail(email, `Confirmation d'ouverture de ticket [${ticketRef}]`, html);
};

export const sendTicketReplyEmail = async (email: string, pseudo: string, ticketRef: string, replierName: string) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1e293b;">
      <div style="text-align: center; margin-bottom: 30px;">
        <img src="https://frilya.com/logo.png" alt="Frilya" style="height: 40px; width: auto;" />
      </div>
      <div style="background-color: #f8fafc; border-radius: 16px; padding: 30px; margin-bottom: 30px;">
        <h2 style="color: #0f172a; margin-top: 0;">Nouveau message sur votre ticket</h2>
        <p>Bonjour ${pseudo},</p>
        <p><strong>${replierName}</strong> a répondu à votre ticket <strong>${ticketRef}</strong>.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="https://frilya.com/dashboard/tickets" style="background-color: #0f172a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Lire la réponse</a>
        </div>
      </div>
      <div style="border-top: 1px solid #e2e8f0; margin-top: 30px; padding-top: 20px; text-align: center; font-size: 12px; color: #94a3b8;">
        <p>© ${new Date().getFullYear()} Frilya. Tous droits réservés.</p>
      </div>
    </div>
  `;
  return sendEmail(email, `Nouvelle réponse - Ticket [${ticketRef}]`, html);
};

export const sendOrderCreatedEmail = async (email: string, pseudo: string, serviceTitle: string, isSeller: boolean) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1e293b;">
      <div style="text-align: center; margin-bottom: 30px;">
        <img src="https://frilya.com/logo.png" alt="Frilya" style="height: 40px; width: auto;" />
      </div>
      <div style="background-color: #f8fafc; border-radius: 16px; padding: 30px; margin-bottom: 30px;">
        <h2 style="color: #0f172a; margin-top: 0;">${isSeller ? 'Nouvelle commande reçue !' : 'Confirmation de commande'}</h2>
        <p>Bonjour ${pseudo},</p>
        <p>${isSeller ? 'Félicitations ! Vous venez de recevoir une nouvelle commande' : 'Votre commande a été confirmée'} pour le service : <strong>${serviceTitle}</strong>.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="https://frilya.com/dashboard/${isSeller ? 'vendeur' : 'orders'}" style="background-color: #0f172a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Voir la commande</a>
        </div>
      </div>
      <div style="border-top: 1px solid #e2e8f0; margin-top: 30px; padding-top: 20px; text-align: center; font-size: 12px; color: #94a3b8;">
        <p>© ${new Date().getFullYear()} Frilya. Tous droits réservés.</p>
      </div>
    </div>
  `;
  return sendEmail(email, isSeller ? 'Nouvelle commande sur Frilya !' : 'Confirmation de votre commande', html);
};

export const sendOrderDeliveredEmail = async (email: string, pseudo: string, serviceTitle: string) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1e293b;">
      <div style="text-align: center; margin-bottom: 30px;">
        <img src="https://frilya.com/logo.png" alt="Frilya" style="height: 40px; width: auto;" />
      </div>
      <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 16px; padding: 30px; margin-bottom: 30px;">
        <h2 style="color: #166534; margin-top: 0;">Votre commande a été livrée ! 🎉</h2>
        <p>Bonjour ${pseudo},</p>
        <p>Le vendeur a marqué la commande du service <strong>${serviceTitle}</strong> comme étant livrée.</p>
        <p>Veuillez vérifier que tout est conforme. N'oubliez pas de laisser un avis au vendeur !</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="https://frilya.com/dashboard/orders" style="background-color: #0f172a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Vérifier ma livraison</a>
        </div>
      </div>
      <div style="border-top: 1px solid #e2e8f0; margin-top: 30px; padding-top: 20px; text-align: center; font-size: 12px; color: #94a3b8;">
        <p>© ${new Date().getFullYear()} Frilya. Tous droits réservés.</p>
      </div>
    </div>
  `;
  return sendEmail(email, 'Votre commande a été livrée !', html);
};

export const sendDisputeOpenedEmail = async (email: string, pseudo: string, serviceTitle: string, isSeller: boolean) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1e293b;">
      <div style="text-align: center; margin-bottom: 30px;">
        <img src="https://frilya.com/logo.png" alt="Frilya" style="height: 40px; width: auto;" />
      </div>
      <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 16px; padding: 30px; margin-bottom: 30px;">
        <h2 style="color: #991b1b; margin-top: 0;">Litige ouvert</h2>
        <p>Bonjour ${pseudo},</p>
        <p>Un litige a été ouvert pour la commande concernant le service : <strong>${serviceTitle}</strong>.</p>
        <p>Notre équipe de médiation a été alertée et va intervenir pour trouver une solution. Nous vous contacterons très prochainement.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="https://frilya.com/dashboard/${isSeller ? 'vendeur' : 'disputes'}" style="background-color: #0f172a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Voir le litige</a>
        </div>
      </div>
      <div style="border-top: 1px solid #e2e8f0; margin-top: 30px; padding-top: 20px; text-align: center; font-size: 12px; color: #94a3b8;">
        <p>© ${new Date().getFullYear()} Frilya. Tous droits réservés.</p>
      </div>
    </div>
  `;
  return sendEmail(email, 'Information : Litige ouvert sur une commande', html);
};

export const sendDisputeClosedEmail = async (email: string, pseudo: string, serviceTitle: string) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1e293b;">
      <div style="text-align: center; margin-bottom: 30px;">
        <img src="https://frilya.com/logo.png" alt="Frilya" style="height: 40px; width: auto;" />
      </div>
      <div style="background-color: #f8fafc; border-radius: 16px; padding: 30px; margin-bottom: 30px;">
        <h2 style="color: #0f172a; margin-top: 0;">Litige clôturé</h2>
        <p>Bonjour ${pseudo},</p>
        <p>Le litige concernant la commande du service <strong>${serviceTitle}</strong> a été résolu et clôturé par notre équipe.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="https://frilya.com/dashboard/disputes" style="background-color: #0f172a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Consulter les détails</a>
        </div>
      </div>
      <div style="border-top: 1px solid #e2e8f0; margin-top: 30px; padding-top: 20px; text-align: center; font-size: 12px; color: #94a3b8;">
        <p>© ${new Date().getFullYear()} Frilya. Tous droits réservés.</p>
      </div>
    </div>
  `;
  return sendEmail(email, 'Litige résolu', html);
};