const { Events } = require('discord.js');
const { GTSHub, GTSServer } = require('../src/models/GTS');
const { startTimer } = require('../utils/gtsTimerManager');

module.exports = {
    name: Events.GuildMemberRemove,
    async execute(member) {
        if (member.user.bot) return;

        const client = member.client;
        const hub = await GTSHub.findOne();
        
        // ==========================================
        // 🚨 SCENARIO: User Leaves the Main Hub
        // Action: Find every satellite they are in, and start a 10m timer!
        // ==========================================
        if (hub && member.guild.id === hub.mainServerId) {
            const satellites = await GTSServer.find({ serverId: { $ne: hub.mainServerId } });
            
            for (const sat of satellites) {
                const guild = client.guilds.cache.get(sat.serverId);
                if (!guild) continue;
                
                const satMember = await guild.members.fetch(member.id).catch(() => null);
                if (satMember) {
                    // ⏱️ FIRE TIMER ENGINE
                    startTimer(satMember, client, hub, "Left Main Server", "will be kicked in **__10__** mins if they don’t return");
                }
            }
        }
    }
};
