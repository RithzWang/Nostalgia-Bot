const { Events } = require('discord.js');
const NetworkConfig = require('../src/models/NetworkConfig');

module.exports = {
    name: Events.GuildMemberAdd,
    async execute(member, client) {
        if (member.user.bot) return;

        const config = await NetworkConfig.findOne({ guildId: member.guild.id });
        if (!config || !config.kickIfNoMain || !config.mainServerId) return;

        const mainGuild = client.guilds.cache.get(config.mainServerId);
        if (!mainGuild) return;

        try {
            const inMainServer = await mainGuild.members.fetch(member.id).catch(() => null);

            if (!inMainServer) {
                await member.send({
                    content: `⚠️ You were removed from **${member.guild.name}** because you are not a member of our Main Server.\nJoin the main server here first to gain access to the satellite network!`
                }).catch(() => {});

                await member.kick('Network Gatekeeper Security: Not a member of the Main Server.').then(() => {
                    console.log(`[Network Security] Kicked ${member.user.tag} from ${member.guild.name} (Not in Main Hub).`);
                });
            }
        } catch (error) {
            console.error(`[Network Security] Error processing gatekeeper join rule:`, error);
        }
    }
};
