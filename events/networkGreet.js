const { Events } = require('discord.js');
const { GreetConfig, ServerList } = require('../src/models/Network'); // Ensure this matches your renamed file
const NetworkConfig = require('../src/models/NetworkConfig'); 

module.exports = {
    name: Events.GuildMemberAdd,
    async execute(member, client) {
        if (member.user.bot) return;

        try {
            // 1. Fetch Network Config to see if this server is linked to a Hub
            const netConfig = await NetworkConfig.findOne({ guildId: member.guild.id });
            
            // If it's not a network satellite, or it IS the Main Hub, we don't do the cross-check
            if (!netConfig || netConfig.isMainServer || !netConfig.mainServerId) return;

            // 2. Check if Greet is enabled for this specific guild
            const greetConfig = await GreetConfig.findOne({ guildId: member.guild.id });
            if (!greetConfig) return; 

            const channel = member.guild.channels.cache.get(greetConfig.channelId);
            if (!channel) return;

            // 3. Fetch Server Names & Dynamic Main Hub Invite
            const serverInfo = await ServerList.findOne({ serverId: member.guild.id });
            const serverName = serverInfo ? serverInfo.name : member.guild.name;

            const mainGuild = client.guilds.cache.get(netConfig.mainServerId);
            if (!mainGuild) return; // Main hub is offline or bot was kicked from it

            const mainServerInfo = await ServerList.findOne({ serverId: netConfig.mainServerId });
            let mainServerInvite = mainServerInfo && mainServerInfo.inviteLink ? mainServerInfo.inviteLink : null;
            
            // Format the invite link properly
            if (mainServerInvite && !mainServerInvite.startsWith('http')) {
                mainServerInvite = `https://${mainServerInvite}`;
            }

            // 4. Check if User is in the Main Hub
            let inMainServer = false;
            try {
                await mainGuild.members.fetch(member.id);
                inMainServer = true;
            } catch (e) {
                inMainServer = false;
            }

            // ==========================================
            // 5. SEND GREETINGS & ENFORCE GATEKEEPER
            // ==========================================
            if (inMainServer) {
                // ✅ User is Safe
                channel.send(`${member}, Welcome to **${serverName}**!`).catch(() => {});
            } else {
                // ⚠️ Warn user they need to join the dynamic Main Server
                const inviteText = mainServerInvite ? `**[${mainGuild.name}](<${mainServerInvite}>)**` : `**${mainGuild.name}**`;
                
                let warningMessage = `${member}, Welcome to **${serverName}**!\n\nIt seems like you are **__not__** in our Main Server, ${inviteText}, yet.`;
                
                if (netConfig.kickIfNoMain) {
                    warningMessage += `\nYou have **__10 minutes__** to join, otherwise you will be **__kicked__**.`;
                }

                channel.send(warningMessage).catch(() => {});

                // ⏳ 10 Minute Kick Timer (Only runs if Gatekeeper is enabled!)
                if (netConfig.kickIfNoMain) {
                    setTimeout(async () => {
                        const target = await member.guild.members.fetch(member.id).catch(() => null);
                        if (!target) return; // They already left on their own

                        // Re-check Main Server (Did they join in the last 10 mins?)
                        try {
                            await mainGuild.members.fetch(member.id);
                            return; // They joined! Cancel kick.
                        } catch (e) {}

                        // Safety: Do not kick Boosters
                        if (target.premiumSince) return;

                        try {
                            await target.kick(`Network Gatekeeper: Did not join Main Hub (${mainGuild.name}) within 10 minutes.`);
                        } catch (err) {
                            console.error(`Failed to kick user in ${member.guild.name}:`, err);
                        }
                    }, 10 * 60 * 1000); // 10 Minutes
                }
            }
        } catch (e) {
            console.error("Network Greet Error:", e);
        }
    }
};
