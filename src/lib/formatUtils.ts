export const getShortId = (id: string | undefined | null) => {
  if (!id) return '';
  return String(id).replace(/-/g, '').slice(0, 5).toUpperCase();
};

export const formatOrderId = (id: string | undefined | null) => {
  if (!id) return '';
  return `CMD-${getShortId(id)}`;
};

export const formatInvoiceId = (id: string | undefined | null) => {
  if (!id) return '';
  return `FAC-${getShortId(id)}`;
};

export const formatDisputeId = (id: string | undefined | null) => {
  if (!id) return '';
  return `LIT-${getShortId(id)}`;
};