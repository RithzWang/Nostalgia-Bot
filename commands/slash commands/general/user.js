const { 
    SlashCommandBuilder, MessageFlags, ContainerBuilder, 
    SectionBuilder, ThumbnailBuilder, TextDisplayBuilder, 
    SeparatorBuilder, SeparatorSpacingSize 
} = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('user')
        .setDescription('Fetch advanced user information using JAPI.')
        .addUserOption(opt => opt.setName('target')
            .setDescription('The user to lookup (defaults to yourself)')
            .setRequired(false)
        ),

    async execute(interaction) {
        // Defer reply because API requests can sometimes take a second
        await interaction.deferReply();

        const targetUser = interaction.options.getUser('target') || interaction.user;
        const userId = targetUser.id;

        try {
            // 🌐 FETCH DATA FROM JAPI
            const response = await fetch(`https://japi.rest/discord/v1/user/${userId}`);
            
            if (!response.ok) {
                return interaction.editReply({ content: "❌ **Error:** Could not fetch data from JAPI. The API might be down." });
            }

            const json = await response.json();
            const japiData = json.data;
            const presence = json.presence;

            // 🛠️ FORMAT EXTRACTED DATA
            const globalName = japiData.global_name || japiData.username;
            const username = japiData.tag || japiData.username;
            const avatarUrl = japiData.avatarURL || targetUser.displayAvatarURL({ size: 1024, forceStatic: false });
            const accentColor = japiData.accent_color || 3447003; // Fallback to Discord blue
            const createdAt = `<t:${Math.floor(japiData.createdTimestamp / 1000)}:f>`;

            // Clean up the badges (e.g. "EARLY_VERIFIED_BOT_DEVELOPER" -> "Early Verified Bot Developer")
            let badges = "None";
            if (japiData.public_flags_array && japiData.public_flags_array.length > 0) {
                badges = japiData.public_flags_array.map(flag => 
                    flag.split('_').map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(' ')
                ).join(', ');
            }

            // Extract Presence & Custom Status
            let statusText = "Offline / Invisible";
            if (presence && presence.status) {
                // Capitalize first letter of status
                const mainStatus = presence.status.charAt(0).toUpperCase() + presence.status.slice(1);
                
                // Check if they are on mobile, desktop, or web
                const clientTypes = presence.clientStatus && presence.clientStatus.length > 0 
                    ? ` (${presence.clientStatus.join(', ')})` 
                    : "";
                
                statusText = `**${mainStatus}**${clientTypes}`;

                // Look for a custom status (Type 4)
                const customStatus = presence.activities?.find(act => act.type === 4);
                if (customStatus) {
                    const emoji = customStatus.emoji?.name ? `${customStatus.emoji.name} ` : "";
                    const state = customStatus.state || "";
                    if (emoji || state) {
                        statusText += `\n**Activity:** ${emoji}${state}`;
                    }
                }
            }

            // 🏗️ BUILD THE V2 CONTAINER UI
            const container = new ContainerBuilder()
                .setAccentColor(accentColor)
                .addSectionComponents(
                    new SectionBuilder()
                        .setThumbnailAccessory(new ThumbnailBuilder().setURL(avatarUrl))
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(`## ${globalName}`),
                            new TextDisplayBuilder().setContent(
                                `**Username:** ${username}\n` +
                                `**ID:** \`${japiData.id}\`\n` +
                                `**Created:** ${createdAt}\n` +
                                `**Badges:** ${badges}\n` +
                                `**Status:** ${statusText}`
                            )
                        )
                )
                .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(`-# Data provided by JAPI • <t:${Math.floor(Date.now() / 1000)}:R>`));

            // Attach Banner link to the bottom if they have one
            if (japiData.bannerURL) {
                container.addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`[View Profile Banner](${japiData.bannerURL})`)
                );
            }

            await interaction.editReply({ 
                components: [container], 
                flags: [MessageFlags.IsComponentsV2] 
            });

        } catch (error) {
            console.error("JAPI Fetch Error:", error);
            await interaction.editReply({ content: "❌ **Error:** Something went wrong while connecting to JAPI." });
        }
    }
};
