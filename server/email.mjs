const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money = value => new Intl.NumberFormat('en-US', {style:'currency',currency:'USD'}).format(value / 100);
export const emailConfigured = env => Boolean(env.BREVO_API_KEY && env.EMAIL_FROM);

export function confirmationMessage(order) {
  const ref = order.id.slice(0, 8).toUpperCase();
  const lines = order.items.map(item => `${item.quantity} × ${item.name}${item.flavors?.length ? ` (${item.flavors.join(', ')})` : ''} — ${money(item.quantity * item.price)}`);
  const subject = `Your Butter Yellow Bakery order ${ref} is reserved`;
  const text = `Hi ${order.name},\n\nThank you for supporting my micro bakery! Your bakes are reserved.\n\nOrder ${ref}\n${lines.join('\n')}\nTotal: ${money(order.total)}\n\nPickup: ${order.pickup}\n\nPlease send ${money(order.total)} to @${order.venmo} on Venmo. Include your name and order reference. This email confirms your reservation, not payment.\n\nWith love,\nThe Butter Yellow Bakery`;
  const html = `<!doctype html><html lang="en"><body style="margin:0;background:#faf4df;color:#352b20;font-family:Georgia,serif"><div style="max-width:580px;margin:24px auto;border:1px solid #d8cba9;background:#fffef8"><div style="background:#efd16e;padding:20px;text-align:center;letter-spacing:2px">THE BUTTER YELLOW BAKERY</div><div style="padding:30px"><h1 style="font-size:30px;font-weight:normal">Your bakes are reserved.</h1><p>Hi ${escape(order.name)},</p><p>Thank you for supporting my micro bakery!</p><p><strong>Order ${escape(ref)}</strong></p><table style="width:100%;border-collapse:collapse">${order.items.map(item => `<tr><td style="padding:12px 0;border-bottom:1px dashed #d8cba9">${item.quantity} × ${escape(item.name)}${item.flavors?.length ? `<br><small>${escape(item.flavors.join(', '))}</small>` : ''}</td><td style="text-align:right;padding:12px 0;border-bottom:1px dashed #d8cba9">${money(item.quantity * item.price)}</td></tr>`).join('')}</table><p style="font-size:22px">Total: <strong>${money(order.total)}</strong></p><h2 style="font-size:20px">Picking up your paper bag</h2><p>${escape(order.pickup)}</p><p>Please send <strong>${money(order.total)}</strong> to <strong>@${escape(order.venmo)}</strong> on Venmo. Include your name and order reference.</p><p style="font-size:13px;color:#72664f">This confirms your reservation, not payment. No payment was charged by the website.</p><p>With love,<br>The Butter Yellow Bakery</p></div></div></body></html>`;
  return { subject, text, html };
}

// Called only after the order + outbox transaction commits. The fixed payload and
// per-order idempotency key protect retries inside Brevo's 15-minute window.
export async function dispatchConfirmation(env, orderId, send = fetch, now = Date.now()) {
  if (!emailConfigured(env)) return {status:'not_configured'};
  const db = env.DB;
  await db.prepare("UPDATE email_outbox SET status='failed',last_error='Retry window expired; check Brevo logs before resending.' WHERE order_id=? AND status IN ('queued','sending') AND first_attempt IS NOT NULL AND first_attempt<?").bind(orderId, now - 12*60000).run();
  const row = await db.prepare("UPDATE email_outbox SET status='sending',lease_until=?,attempts=attempts+1,first_attempt=COALESCE(first_attempt,?) WHERE order_id=? AND status IN ('queued','sending') AND attempts<6 AND next_attempt<=? AND lease_until<=? RETURNING *").bind(now + 60000, now, orderId, now, now).first();
  if (!row) return await db.prepare('SELECT status FROM email_outbox WHERE order_id=?').bind(orderId).first() || {status:'missing'};
  let payload = row.payload;
  if (!payload) {
    const order = JSON.parse(row.content);
    const message = confirmationMessage(order);
    payload = JSON.stringify({sender:{email:env.EMAIL_FROM,name:'The Butter Yellow Bakery'},replyTo:{email:env.EMAIL_FROM,name:'The Butter Yellow Bakery'},to:[{email:order.email,name:order.name}],subject:message.subject,htmlContent:message.html,textContent:message.text,headers:{idempotencyKey:orderId}});
    await db.prepare('UPDATE email_outbox SET payload=? WHERE order_id=?').bind(payload, orderId).run();
  }
  try {
    const response = await send('https://api.brevo.com/v3/smtp/email', {
      method:'POST', headers:{'api-key':env.BREVO_API_KEY,'Content-Type':'application/json'},
      body:payload, signal:AbortSignal.timeout(20000),
    });
    if (!response.ok) throw new Error(`Email provider returned HTTP ${response.status}.`);
    const receipt = await response.json();
    if (typeof receipt.messageId !== 'string') throw new Error('Email provider returned no receipt.');
    await db.prepare("UPDATE email_outbox SET status='accepted',provider_id=?,accepted_at=CURRENT_TIMESTAMP,lease_until=0,last_error=NULL WHERE order_id=?").bind(receipt.messageId, orderId).run();
    return {status:'accepted'};
  } catch (error) {
    const status = row.attempts >= 6 ? 'failed' : 'queued';
    // Do not persist raw provider error bodies, tokens or recipient details in logs.
    const reason = /^Email provider /.test(error.message) ? error.message : 'Email could not be confirmed; retry pending.';
    await db.prepare('UPDATE email_outbox SET status=?,next_attempt=?,lease_until=0,last_error=? WHERE order_id=?').bind(status, now + 120000, reason, orderId).run();
    return {status};
  }
}

export async function brevo(key,path,body,send=fetch) {
  const r=await send('https://api.brevo.com/v3'+path,{method:body===undefined?'GET':'POST',headers:{'api-key':key,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(20000)});
  if(!r.ok)throw new Error(`Brevo returned HTTP ${r.status}. Check the API key, sender verification and account limits.`);
  if(r.status===204)return {};
  return r.json();
}

export async function syncSubscribers(env,send=fetch) {
  if(!emailConfigured(env)||!env.BREVO_LIST_ID)return {processed:0};
  const pending=await env.DB.prepare('SELECT email FROM newsletter_signups WHERE synced=0 LIMIT 5').all();
  let processed=0;
  for(const row of pending.results){
    try{
      // No emailBlacklisted field: never override the provider's unsubscribe state.
      await brevo(env.BREVO_API_KEY,'/contacts',{email:row.email,listIds:[Number(env.BREVO_LIST_ID)],updateEnabled:true},send);
      await env.DB.prepare('UPDATE newsletter_signups SET synced=1,last_error=NULL WHERE email=?').bind(row.email).run();processed++;
    }catch{
      await env.DB.prepare("UPDATE newsletter_signups SET last_error='Contact sync pending. Check Brevo connection.' WHERE email=?").bind(row.email).run();
    }
  }
  return {processed};
}

export async function flushConfirmations(env, send = fetch) {
  if (!emailConfigured(env)) return {status:'not_configured',processed:0};
  const pending = await env.DB.prepare("SELECT order_id FROM email_outbox WHERE status IN ('queued','sending') AND next_attempt<=? AND lease_until<=? ORDER BY next_attempt LIMIT 5").bind(Date.now(),Date.now()).all();
  for (const row of pending.results) await dispatchConfirmation(env,row.order_id,send);
  return {status:'processed',processed:pending.results.length};
}
