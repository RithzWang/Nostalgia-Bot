const { Events, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    name: Events.GuildMemberUpdate,
    async execute(oldMember, newMember) {
        // --- CONFIG ---
        const registeredRoleId = '1446058693631148043';
        const allowedChannelId = '1446065407713607812';
        const infoMessageId = '1446221552084582430';

        // 1. Check if the Registered Role was Added or Removed
        const wasRegistered = oldMember.roles.cache.has(registeredRoleId);
        const isRegistered = newMember.roles.cache.has(registeredRoleId);

        // If the status of the registered role didn't change, do nothing
        if (wasRegistered === isRegistered) return;

        // 2. Update the Message
        try {
            const infoChannel = newMember.guild.channels.cache.get(allowedChannelId);
            if (!infoChannel) return;

            const infoMessage = await infoChannel.messages.fetch(infoMessageId);
            
            // Get the role to count members
            const role = newMember.guild.roles.cache.get(registeredRoleId);
            const totalRegistered = role ? role.members.size : 0;

            // Update the Button
            const countButton = new ButtonBuilder()
                .setCustomId('total_registered_stats')
                .setLabel(`Total Registered: ${totalRegistered}`)
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true);

            const row = new ActionRowBuilder().addComponents(countButton);

            if (infoMessage) {
                await infoMessage.edit({ components: [row] });
                console.log(`[Auto-Update] Registered count updated to: ${totalRegistered}`);
            }

        } catch (error) {
            console.error("Error updating registered count event:", error);
        }
    },
};
