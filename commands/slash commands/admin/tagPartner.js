const { 
    SlashCommandBuilder, PermissionFlagsBits, ChannelType, MessageFlags,
    ContainerBuilder, SectionBuilder, ThumbnailBuilder, TextDisplayBuilder,
    SeparatorBuilder, SeparatorSpacingSize
} = require('discord.js');
const TagPartner = require('../../../src/models/TagPartner'); 

module.exports = {
    data: new SlashCommandBuilder()
        .setName('tag-partner')
        .setDescription('Manage the standalone Tag Partner forum.')
        .setDMPermission(false)
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(sub => sub.setName('set')
            .setDescription('Set the partner forum channel and lock its permissions.')
            .addChannelOption(opt => opt.setName('forum')
                .setDescription('The Forum Channel to use.')
                .addChannelTypes(ChannelType.GuildForum)
                .setRequired(true)
            )
        )
        .addSubcommand(sub => sub.setName('send')
            .setDescription('Send a partner post to the forum via an invite link.')
            .addStringOption(opt => opt.setName('invite_link')
                .setDescription('The server invite link.')
                .setRequired(true)
            )
        ),

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();

        if (sub === 'set') {
            await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
            const forumChannel = interaction.options.getChannel('forum');

            try {
                await forumChannel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
                    ViewChannel: true,
                    ReadMessageHistory: true,
                    SendMessages: false,
                    SendMessagesInThreads: false,
                    CreatePublicThreads: false,
                    CreatePrivateThreads: false,
                    AddReactions: false
                });

                await TagPartner.findOneAndUpdate(
                    { guildId: interaction.guild.id }, 
                    { forumChannelId: forumChannel.id }, 
                    { upsert: true }
                );

                return interaction.editReply(`✅ **Partner Forum Configured!**\n<#${forumChannel.id}> permissions have been locked down.`);
            } catch (error) {
                return interaction.editReply("❌ Failed to update forum permissions. Check my roles.");
            }
        }

// ... (Previous imports stay the same)

        if (sub === 'send') {
            await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

            const config = await TagPartner.findOne({ guildId: interaction.guild.id });
            if (!config || !config.forumChannelId) return interaction.editReply("❌ No partner forum set!");

            let forumChannel = interaction.guild.channels.cache.get(config.forumChannelId);
            if (!forumChannel) {
                try { forumChannel = await interaction.guild.channels.fetch(config.forumChannelId); } 
                catch (e) { return interaction.editReply("❌ Cannot find the configured forum channel."); }
            }

            const rawLink = interaction.options.getString('invite_link').trim();
            const inviteCode = rawLink.split('/').pop().split('?')[0]; 
            const inviteUrl = `https://discord.gg/${inviteCode}`;

            let serverName = "Unknown";
            let serverId = null;
            let tagText = null; 
            let badgeURL = null;

            try {
                // STEP 1: Fetch Invite to get Guild ID
                const inviteRes = await fetch(`https://discord.com/api/v10/invites/${inviteCode}`, {
                    headers: { 'Authorization': process.env.BURNER_TOKEN }
                });
                const inviteData = await inviteRes.json();
                
                if (!inviteData.guild) return interaction.editReply("❌ That invite is invalid.");
                
                serverId = inviteData.guild.id;
                serverName = inviteData.guild.name;

                // STEP 2: Fetch Preview to get Clan/Tag Data
                const guildRes = await fetch(`https://discord.com/api/v10/guilds/${serverId}/preview`, {
                    headers: { 'Authorization': process.env.BURNER_TOKEN }
                });
                const guildData = await guildRes.json();

                // Extract Clan Data from Preview
                if (guildData.clan) {
                    if (guildData.clan.tag) tagText = guildData.clan.tag;
                    if (guildData.clan.badge) {
                        badgeURL = `https://cdn.discordapp.com/guild-tag-badges/${serverId}/${guildData.clan.badge}.png?size=256`;
                    }
                }
            } catch (error) {
                console.error("Multi-step Fetch Error:", error);
                return interaction.editReply("❌ Failed to resolve server details.");
            }

            // Fallback
            if (!tagText) tagText = serverName;

            // ... (Rest of your UI and Thread creation logic remains the same)


            // ====================================================
            // 🛠️ TEMPORARY EMOJI CREATION (Only if badge exists!)
            // ====================================================
            let tempEmoji = null;
            let emojiDisplay = ""; 
            
            if (badgeURL) {
                const tempEmojiGuildId = '1490435762372481275'; // Your Emoji Server ID
                let tempEmojiGuild = interaction.client.guilds.cache.get(tempEmojiGuildId);
                if (!tempEmojiGuild) {
                    try { tempEmojiGuild = await interaction.client.guilds.fetch(tempEmojiGuildId); } catch(e) {}
                }

                if (tempEmojiGuild) {
                    try {
                        const safeEmojiName = `TagBadge_${serverId}`; 
                        tempEmoji = await tempEmojiGuild.emojis.create({ 
                            attachment: badgeURL, 
                            name: safeEmojiName 
                        });
                        emojiDisplay = `<:${tempEmoji.name}:${tempEmoji.id}> `; 
                    } catch (err) {
                        console.error("Could not create temp emoji:", err);
                    }
                }
            }

            // ====================================================
            // 🏗️ BUILD THE V2 COMPONENT CONTAINER 
            // ====================================================
            const section = new SectionBuilder();

            // Only attach the thumbnail if they actually have a custom badge!
            if (badgeURL) {
                section.setThumbnailAccessory(new ThumbnailBuilder().setURL(badgeURL));
            }

            section.addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`**Server:** ${serverName}\n-# ${serverId}\n**Invite:** ${inviteUrl}`)
            );

            const container = new ContainerBuilder()
                .setAccentColor(8947848)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`## ${emojiDisplay}${tagText}`)
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                )
                .addSectionComponents(section);

            try {
                // Ensure thread name doesn't exceed Discord's 100-character limit
                const threadName = tagText.length > 95 ? tagText.substring(0, 95) + "..." : tagText;

                // 📝 Create the Forum Post
                const thread = await forumChannel.threads.create({
                    name: threadName,
                    message: {
                        content: "** **", // The bulletproof invisible text trick
                        components: [container],
                        flags: [MessageFlags.IsComponentsV2]
                    }
                });

                // 🔒 Lock the post immediately
                await thread.setLocked(true);

                // 👍 React to the initial message with the created emoji
                if (tempEmoji) {
                    const starterMessage = await thread.fetchStarterMessage().catch(() => null);
                    if (starterMessage) {
                        await starterMessage.react(tempEmoji).catch(() => {});
                    }

                    // 🗑️ CLEANUP: Delete the temp emoji from the host server after 2 seconds
                    setTimeout(async () => {
                        await tempEmoji.delete().catch(() => console.error("Failed to delete temp emoji."));
                    }, 2000); 
                }

                await interaction.editReply(`✅ Successfully posted and locked **${threadName}** in <#${forumChannel.id}>!`);
            } catch (err) {
                // 👇 THIS WILL NOW PRINT THE EXACT ERROR IN DISCORD 👇
                const errorMessage = err.rawError?.message || err.message || "Unknown API Error";
                console.error("Forum Post Error:", err.rawError || err); 
                
                await interaction.editReply(`❌ **API Error:** \`${errorMessage}\`\n*(Send me this error so we can fix it!)*`);
            }
        }
    }
};
