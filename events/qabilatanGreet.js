const { GreetConfig, ServerList } = require('../models/Qabilatan'); // Adjust Path

const MAIN_SERVER_ID = "1456197054782111756";
const MAIN_SERVER_INVITE = "https://discord.gg/Sra726wPJs";

module.exports = {
    name: 'guildMemberAdd',
    async execute(member, client) {
        if (member.user.bot) return;

        // Check if this guild has greeting enabled
        const config = await GreetConfig.findOne({ guildId: member.guild.id });
        if (!config) return;

        // Fetch Server Name for display
        const serverInfo = await ServerList.findOne({ serverId: member.guild.id });
        const serverName = serverInfo ? serverInfo.name : member.guild.name;

        // Check if user is in Main Server
        const mainGuild = client.guilds.cache.get(MAIN_SERVER_ID);
        let inMainServer = false;
        
        try {
            if (mainGuild) {
                await mainGuild.members.fetch(member.id);
                inMainServer = true;
            }
        } catch (e) {
            inMainServer = false;
        }

        const channel = member.guild.channels.cache.get(config.channelId);
        if (!channel) return;

        if (inMainServer) {
            // Case 1: Safe
            channel.send(`Welcome to **${serverName}** server, ${member}!`);
        } else {
            // Case 2: Not in Main Server
            channel.send(
                `${member}, Welcome to **${serverName}** server!\n\n` +
                `It seems like you are **__not__** in our main **[A2-Q](${MAIN_SERVER_INVITE})** server yet.\n` +
                `You have **10 minutes** to join, otherwise you will be **kicked**.`
            );

            // Set Timeout for Kick
            setTimeout(async () => {
                // Fetch member again to see if they are still in server
                const target = await member.guild.members.fetch(member.id).catch(() => null);
                if (!target) return; // Left already

                // Check Main Server again
                let nowInMain = false;
                try {
                    await mainGuild.members.fetch(member.id);
                    nowInMain = true;
                } catch (e) {}

                // Check if Boosting the current server (Safety check)
                if (target.premiumSince) return; // Is boosting, do not kick

                if (!nowInMain) {
                    try {
                        await target.kick("Automatic Kick: Did not join A2-Q Main Server within 10 minutes.");
                        channel.send(`**${target.user.tag}** has been kicked for not joining the main server.`);
                    } catch (err) {
                        console.error("Failed to kick:", err);
                    }
                }
            }, 600000); // 10 minutes
        }
    }
};
