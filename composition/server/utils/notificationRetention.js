'use strict';

// Read notifications older than 90 days are deleted. Unread ones are kept however old.
// Runs once at boot and then daily.

const { Op } = require('sequelize');

const RETENTION_DAYS = 90;
const DAY_MS = 24 * 60 * 60 * 1000;

const purgeReadNotifications = async ({ Notification, now = Date.now(), days = RETENTION_DAYS }) =>
    Notification.destroy({ where: { is_read: true, created_at: { [Op.lt]: new Date(now - days * DAY_MS) } } });

const startRetention = ({ Notification, log = console.log, setIntervalFn = setInterval } = {}) => {
    const run = async () => {
        try {
            const removed = await purgeReadNotifications({ Notification });
            if (removed) log(`Removed ${removed} read notification(s) older than ${RETENTION_DAYS} days.`);
        } catch (error) {
            console.error(`Notification retention did not run: ${error.message}`);
        }
    };
    run();
    const timer = setIntervalFn(run, DAY_MS);
    if (timer?.unref) timer.unref();
    return timer;
};

module.exports = { RETENTION_DAYS, purgeReadNotifications, startRetention };
