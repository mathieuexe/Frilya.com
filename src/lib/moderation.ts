import { supabase } from './supabase';
import { sendServiceHiddenEmail, sendServiceRestoredEmail, sendServiceDeletedEmail } from './email';

export type ModerationAction = 'hidden' | 'restored' | 'deleted';

export type ModerationNotificationResult = {
  messageSent: boolean;
  emailSent: boolean;
  errors: string[];
};

const buildMessage = (action: ModerationAction, serviceTitle: string, reason: string) => {
  if (action === 'hidden') {
    return [
      'Bonjour,',
      '',
      `Votre annonce « ${serviceTitle} » a été masquée par notre équipe de modération : elle n'est plus visible par les acheteurs.`,
      '',
      `Motif du masquage : ${reason}`,
      '',
      "Vous pouvez modifier votre annonce depuis votre espace vendeur pour la mettre en conformité, puis répondre à ce message pour demander une nouvelle vérification.",
      '',
      'Cordialement,',
      "L'équipe Support Frilya"
    ].join('\n');
  }

  if (action === 'restored') {
    return [
      'Bonjour,',
      '',
      `Bonne nouvelle : votre annonce « ${serviceTitle} » a été réactivée par notre équipe de modération. Elle est de nouveau visible par les acheteurs.`,
      ...(reason ? ['', reason] : []),
      '',
      'Cordialement,',
      "L'équipe Support Frilya"
    ].join('\n');
  }

  return [
    'Bonjour,',
    '',
    `Votre annonce « ${serviceTitle} » a été supprimée par notre équipe de modération.`,
    ...(reason ? ['', `Motif de la suppression : ${reason}`] : []),
    '',
    "Si vous pensez qu'il s'agit d'une erreur, répondez à ce message : notre équipe réexaminera votre situation.",
    '',
    'Cordialement,',
    "L'équipe Support Frilya"
  ].join('\n');
};

/**
 * Prévient un vendeur d'une décision de modération sur l'une de ses annonces :
 * message privé envoyé par le compte "Support Frilya" + e-mail.
 * Les deux canaux sont indépendants : l'échec de l'un n'empêche pas l'autre.
 */
export async function notifySellerModeration({
  sellerId,
  sellerEmail,
  sellerName,
  serviceTitle,
  action,
  reason
}: {
  sellerId: string;
  sellerEmail?: string | null;
  sellerName?: string | null;
  serviceTitle: string;
  action: ModerationAction;
  reason: string;
}): Promise<ModerationNotificationResult> {
  const result: ModerationNotificationResult = { messageSent: false, emailSent: false, errors: [] };
  const pseudo = sellerName || 'Bonjour';

  // 1. Message privé envoyé en tant que Support Frilya
  try {
    const { error } = await supabase.rpc('send_support_message', {
      p_receiver_id: sellerId,
      p_content: buildMessage(action, serviceTitle, reason)
    });
    if (error) throw error;
    result.messageSent = true;
  } catch (err: any) {
    console.error('Erreur envoi du message privé de modération :', err);
    result.errors.push(`Message privé : ${err?.message || 'échec'}`);
  }

  // 2. E-mail
  if (!sellerEmail) {
    result.errors.push("E-mail : aucune adresse connue pour ce vendeur");
    return result;
  }

  try {
    if (action === 'hidden') {
      await sendServiceHiddenEmail(sellerEmail, pseudo, serviceTitle, reason);
    } else if (action === 'restored') {
      await sendServiceRestoredEmail(sellerEmail, pseudo, serviceTitle, reason);
    } else {
      await sendServiceDeletedEmail(sellerEmail, pseudo, serviceTitle, reason);
    }
    result.emailSent = true;
  } catch (err: any) {
    console.error("Erreur envoi de l'e-mail de modération :", err);
    result.errors.push(`E-mail : ${err?.message || 'échec'}`);
  }

  return result;
}
