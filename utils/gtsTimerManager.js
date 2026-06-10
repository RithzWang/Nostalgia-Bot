const { MessageFlags } = require('discord.js');
const { GTSHub, GTSServer } = require('../src/models/GTS');
const { buildAlertPayload } = require('./gtsAlerts');

// Central Memory to track active kick countdowns: Map<UserId, Map<GuildId, TimeoutObject>>
const activeTimers = new Map();

// Helper to send the UI payload to the Global Alert Channel
async function sendAlert(client, hub, payload) {
    if (!hub.alertChannelId) return;
    const mainGuild = client.guilds.cache.get(hub.mainServerId);
    if (!mainGuild) return;
    
    const alertChannel = mainGuild.channels.cache.get(hub.alertChannelId) || await mainGuild.channels.fetch(hub.alertChannelId).catch(() => null);
    if (alertChannel) {
        alertChannel.send({ components: payload, flags: [MessageFlags.IsComponentsV2] }).catch(() => {});
    }
}

// ⏱️ START TIMER ENGINE
async function startTimer(member, client, hub, reason, actionText) {
    if (member.premiumSince) return; // Booster Immunity
    
    const srvData = await GTSServer.findOne({ serverId: member.guild.id });
    if (srvData && srvData.specialGuestRole && member.roles.cache.has(srvData.specialGuestRole)) return; // Guest Immunity

    const userId = member.id;
    const guildId = member.guild.id;

    if (!activeTimers.has(userId)) activeTimers.set(userId, new Map());
    const userTimers = activeTimers.get(userId);

    if (userTimers.has(guildId)) return; // Timer already running for this user in this server

    // 🚨 SEND: Timer Started Alert
    const startPayload = buildAlertPayload('start', member.user, member.guild.name, reason, actionText);
    await sendAlert(client, hub, startPayload);

    // Start 10-minute countdown
    const timeoutId = setTimeout(async () => {
        userTimers.delete(guildId);
        if (userTimers.size === 0) activeTimers.delete(userId);

        const target = await member.guild.members.fetch(userId).catch(() => null);
        if (!target) return; // User left voluntarily before timer ended
        
        if (target.premiumSince) return; // Failsafe: They boosted at the last second!

        const mainGuild = client.guilds.cache.get(hub.mainServerId);
        if (mainGuild) {
            try {
                await mainGuild.members.fetch(userId);
                return; // Failsafe: They joined Main Hub quietly
            } catch (e) {}
        }

        // 🥾 EXECUTE KICK
        await target.kick(`GTS Gatekeeper: ${reason}`).catch(() => {});
        
        // 🔴 SEND: Member Kicked Alert
        const kickPayload = buildAlertPayload('kick', target.user, target.guild.name, reason);
        await sendAlert(client, hub, kickPayload);

    }, 10 * 60 * 1000); // 10 Minutes

    userTimers.set(guildId, timeoutId);
}

// 🟢 CANCEL ALL ENGINE (Triggers when joining Main Hub)
async function cancelAllTimersForUser(user, client, hub, reason) {
    const userId = user.id;
    if (!activeTimers.has(userId)) return;
    
    const userTimers = activeTimers.get(userId);
    const savedCount = userTimers.size; // How many servers they were about to be kicked from
    
    // Kill all pending timeouts
    for (const timeoutId of userTimers.values()) {
        clearTimeout(timeoutId);
    }
    activeTimers.delete(userId);

    // 🟢 SEND: Timers Cancelled Alert
    const cancelPayload = buildAlertPayload('cancel', user, "Multiple Satellites", reason, savedCount);
    await sendAlert(client, hub, cancelPayload);
}

// 🟢 CANCEL SINGLE ENGINE (Triggers when Boosting a specific Satellite)
async function cancelTimerForServer(member, client, hub, reason) {
    const userId = member.id;
    const guildId = member.guild.id;

    if (!activeTimers.has(userId)) return;
    const userTimers = activeTimers.get(userId);
    
    if (userTimers.has(guildId)) {
        clearTimeout(userTimers.get(guildId));
        userTimers.delete(guildId);
        if (userTimers.size === 0) activeTimers.delete(userId);

        // 🟢 SEND: Timer Cancelled Alert
        const cancelPayload = buildAlertPayload('cancel', member.user, member.guild.name, reason, 1);
        await sendAlert(client, hub, cancelPayload);
    }
}

module.exports = { startTimer, cancelAllTimersForUser, cancelTimerForServer };
