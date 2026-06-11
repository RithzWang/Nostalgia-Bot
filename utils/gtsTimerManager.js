const { MessageFlags } = require('discord.js');
const { GTSHub, GTSServer } = require('../src/models/GTS');
const { buildAlertPayload } = require('./gtsAlerts');

const activeTimers = new Map();

async function sendAlert(client, hub, payload) {
    if (!hub.alertChannelId) return;
    const mainGuild = client.guilds.cache.get(hub.mainServerId);
    if (!mainGuild) return;
    
    const alertChannel = mainGuild.channels.cache.get(hub.alertChannelId) || await mainGuild.channels.fetch(hub.alertChannelId).catch(() => null);
    if (alertChannel) {
        alertChannel.send({ components: payload, flags: [MessageFlags.IsComponentsV2] }).catch(() => {});
    }
}

// ⏱️ START TIMER ENGINE (Added 'silent' parameter)
async function startTimer(member, client, hub, reason, actionText, silent = false) {
    if (member.premiumSince) return false; 
    
    const srvData = await GTSServer.findOne({ serverId: member.guild.id });
    if (srvData && srvData.specialGuestRole && member.roles.cache.has(srvData.specialGuestRole)) return false; 

    const userId = member.id;
    const guildId = member.guild.id;

    if (!activeTimers.has(userId)) activeTimers.set(userId, new Map());
    const userTimers = activeTimers.get(userId);

    if (userTimers.has(guildId)) return false; 

    // 🚨 SEND ALERT ONLY IF NOT SILENT
    if (!silent) {
        const startPayload = buildAlertPayload('start', member.user, member.guild.name, reason, actionText);
        await sendAlert(client, hub, startPayload);
    }

    const timeoutId = setTimeout(async () => {
        userTimers.delete(guildId);
        if (userTimers.size === 0) activeTimers.delete(userId);

        const target = await member.guild.members.fetch(userId).catch(() => null);
        if (!target) return; 
        
        if (target.premiumSince) return; 

        const mainGuild = client.guilds.cache.get(hub.mainServerId);
        if (mainGuild) {
            try {
                await mainGuild.members.fetch(userId);
                return; 
            } catch (e) {}
        }

        await target.kick(`GTS Gatekeeper: ${reason}`).catch(() => {});
        
        const kickPayload = buildAlertPayload('kick', target.user, target.guild.name, reason);
        await sendAlert(client, hub, kickPayload);

    }, 10 * 60 * 1000); 

    userTimers.set(guildId, timeoutId);
    
    return true; // Successfully started
}

// 🟢 CANCEL ALL ENGINE
async function cancelAllTimersForUser(user, client, hub, reason) {
    const userId = user.id;
    if (!activeTimers.has(userId)) return;
    
    const userTimers = activeTimers.get(userId);
    const savedCount = userTimers.size; 
    
    for (const timeoutId of userTimers.values()) {
        clearTimeout(timeoutId);
    }
    activeTimers.delete(userId);

    const cancelPayload = buildAlertPayload('cancel', user, "Multiple Satellites", reason, savedCount);
    await sendAlert(client, hub, cancelPayload);
}

// 🟢 CANCEL SINGLE ENGINE
async function cancelTimerForServer(member, client, hub, reason) {
    const userId = member.id;
    const guildId = member.guild.id;

    if (!activeTimers.has(userId)) return;
    const userTimers = activeTimers.get(userId);
    
    if (userTimers.has(guildId)) {
        clearTimeout(userTimers.get(guildId));
        userTimers.delete(guildId);
        if (userTimers.size === 0) activeTimers.delete(userId);

        const cancelPayload = buildAlertPayload('cancel', member.user, member.guild.name, reason, 1);
        await sendAlert(client, hub, cancelPayload);
    }
}

module.exports = { startTimer, cancelAllTimersForUser, cancelTimerForServer };
