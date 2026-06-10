const { Events } = require('discord.js');
const { GTSHub } = require('../src/models/GTS');
const { startTimer, cancelTimerForServer } = require('../utils/gtsTimerManager');

module.exports = {
    name: Events.GuildMemberUpdate,
    async execute(oldMember, newMember) {
        if (newMember.user.bot) return;

        const client = newMember.client;
        const hub = await GTSHub.findOne();
        if (!hub || newMember.guild.id === hub.mainServerId) return;

        // ==========================================
        // 🟢 SCENARIO: User just boosted the Satellite
        // Action: Gain immunity! Cancel active kick for this server.
        // ==========================================
        if (!oldMember.premiumSince && newMember.premiumSince) {
            await cancelTimerForServer(newMember, client, hub, "Boosted the Server");
            return;
        }

        // ==========================================
        // 🚨 SCENARIO: User lost Booster Status on Satellite
        // Action: Check Hub. If not in Hub, start kick timer!
        // ==========================================
        if (oldMember.premiumSince && !newMember.premiumSince) {
            const mainGuild = client.guilds.cache.get(hub.mainServerId);
            let inMain = false;
            
            if (mainGuild) {
                try {
                    await mainGuild.members.fetch(newMember.id);
                    inMain = true;
                } catch (e) {}
            }

            if (!inMain) {
                // ⏱️ FIRE TIMER ENGINE
                startTimer(newMember, client, hub, "Stopped Boosting & Not in Main Server", "will be kicked in **__10__** mins if they don’t return to Main Server");
            }
        }
    }
};
