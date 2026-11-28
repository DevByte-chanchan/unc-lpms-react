'use strict';

const db = require('../models');

async function createNotification({
  recipientUserId,
  type = 'workflow',
  title = null,
  message,
  link = null,
  offeringId = null,
  commentId = null,
  actorRole = null,
  sentByAccountId = null,
  academicPeriodId = null,
  targetType = null,
  targetId = null,
  targetProgramId = null,
}, transaction = null) {
  if (!recipientUserId || !message) return null;
  try {
    return await db.Notification.create({
      recipient_user_id: Number(recipientUserId),
      academic_period_id: academicPeriodId ? Number(academicPeriodId) : null,
      type: String(type).slice(0, 40),
      title: title ? String(title).slice(0, 200) : null,
      message: String(message).slice(0, 500),
      link: link ? String(link).slice(0, 255) : null,
      offering_id: offeringId ? Number(offeringId) : null,
      comment_id: commentId ? Number(commentId) : null,
      actor_role: actorRole ? String(actorRole).slice(0, 30) : null,
      sent_by_account_id: sentByAccountId ? Number(sentByAccountId) : null,
      target_type: targetType,
      target_id: targetId != null ? String(targetId) : null,
      target_program_id: targetProgramId ? Number(targetProgramId) : null,
      is_read: false,
      created_at: new Date(),
    }, transaction ? { transaction } : {});
  } catch (err) {
    console.warn('[notifyService] failed to create notification:', err.message);
    return null;
  }
}

async function notifyUsersByRole(canonicalRole, payload, transaction = null) {
  const users = await db.User.findAll({
    where: { is_active: true },
    ...(transaction ? { transaction } : {}),
  });
  const matching = users.filter((u) => {
    const roles = Array.isArray(u.roles) ? u.roles : [u.role];
    return roles.includes(canonicalRole);
  });
  const results = [];
  for (const u of matching) {
    const r = await createNotification({ ...payload, recipientUserId: u.user_id }, transaction);
    if (r) results.push(r);
  }
  return results;
}

module.exports = {
  createNotification,
  notifyUsersByRole,
};
