const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[char]);

export function replyEmailContent(body, language = 'en') {
  const french = language === 'fr';
  const notice = french
    ? 'Ce message provient de One Community. Ne répondez pas à cet e-mail.'
    : 'This message is from One Community. Do not reply to this email.';
  const contact = french ? 'Contactez-nous' : 'Contact us';
  const url = 'https://servicecam.org';
  return {
    text: `${body}\n\n---\n${notice}\n${contact}: ${url}`,
    html: `<div style="white-space:pre-wrap">${escapeHtml(body)}</div><hr><p>${notice}</p><p><a href="${url}">${contact}</a></p>`,
  };
}
