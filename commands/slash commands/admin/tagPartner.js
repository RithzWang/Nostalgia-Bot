const { 
    SlashCommandBuilder, PermissionFlagsBits, ChannelType, MessageFlags,
    ContainerBuilder, SectionBuilder, ThumbnailBuilder, TextDisplayBuilder,
    AttachmentBuilder
} = require('discord.js');
const TagPartner = require('../../src/models/TagPartner'); 

module.exports = {
    data: new SlashCommandBuilder()
        .setName('tag-partner')
        .setDescription('Manage the standalone Tag Partner forum.')
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

        // ====================================================
        // 1. SET FORUM COMMAND
        // ====================================================
        if (sub === 'set') {
            await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
            const forumChannel = interaction.options.getChannel('forum');

            try {
                // 🔒 Lock down @everyone permissions for the forum
                await forumChannel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
                    ViewChannel: true,
                    ReadMessageHistory: true,
                    SendMessages: false,
                    SendMessagesInThreads: false,
                    CreatePublicThreads: false,
                    CreatePrivateThreads: false,
                    AddReactions: false
                });

                // 💾 Save to standalone Database
                await TagPartner.findOneAndUpdate(
                    { guildId: interaction.guild.id }, 
                    { forumChannelId: forumChannel.id }, 
                    { upsert: true }
                );

                return interaction.editReply(`✅ **Partner Forum Configured!**\n<#${forumChannel.id}> permissions have been locked down and it is now the active Tag Partner forum.`);
            } catch (error) {
                console.error("Forum Permission Error:", error);
                return interaction.editReply("❌ Failed to update forum permissions. Make sure my bot role is higher than the @everyone role and I have Manage Channels permission.");
            }
        }

        // ====================================================
        // 2. SEND INVITE COMMAND
        // ====================================================
        if (sub === 'send') {
            await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

            const config = await TagPartner.findOne({ guildId: interaction.guild.id });
            if (!config || !config.forumChannelId) {
                return interaction.editReply("❌ **Error:** No partner forum has been set! Run `/tag-partner set forum:` first.");
            }

            const forumChannel = interaction.client.channels.cache.get(config.forumChannelId);
            if (!forumChannel) return interaction.editReply("❌ **Error:** I cannot find the configured forum channel.");

            const inviteLink = interaction.options.getString('invite_link');
            
            // 🔍 Resolve Invite Link
            const invite = await interaction.client.fetchInvite(inviteLink).catch(() => null);
            if (!invite || !invite.guild) {
                return interaction.editReply("❌ **Error:** Invalid invite link or I could not fetch server details.");
            }

            // 🔍 Fetch target guild (Bot MUST be in the server to reliably get the owner ID & true Server Tag)
            const targetGuild = interaction.client.guilds.cache.get(invite.guild.id);
            if (!targetGuild) {
                return interaction.editReply("❌ **Error:** I need to be inside that server to fetch its Owner ID and official Server Tag!");
            }

            // 🎯 Extract Data
            const tagText = targetGuild.tag || targetGuild.name;
            const ownerId = targetGuild.ownerId;
            const badgeURL = targetGuild.badge 
                ? `https://cdn.discordapp.com/guild-tag-badges/${targetGuild.id}/${targetGuild.badge}.png?size=256` 
                : targetGuild.iconURL({ extension: 'png', size: 256 }) || "https://cdn.discordapp.com/embed/avatars/0.png";

            let tempEmoji = null;
            let emojiDisplay = "🔰"; // Fallback if emoji creation fails
            
            // ✅ Use the specific server to host the temporary emoji
            const tempEmojiGuildId = '1490435762372481275';
            const tempEmojiGuild = interaction.client.guilds.cache.get(tempEmojiGuildId);

            if (tempEmojiGuild) {
                try {
                    // 🛠️ Generate Temporary Emoji
                    tempEmoji = await tempEmojiGuild.emojis.create({ 
                        attachment: badgeURL, 
                        name: 'TAGICON' 
                    });
                    emojiDisplay = `<:${tempEmoji.name}:${tempEmoji.id}>`;
                } catch (err) {
                    console.error("Could not create temp emoji. Falling back to default icon.", err);
                }
            } else {
                console.warn("Temp emoji server not found, falling back to default emoji.");
            }

            // 🏗️ Build the V2 Component Container matching your blueprint
            const container = new ContainerBuilder()
                .addSectionComponents(
                    new SectionBuilder()
                        .setThumbnailAccessory(new ThumbnailBuilder().setURL(badgeURL))
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(`## ${emojiDisplay} ${tagText}`),
                            new TextDisplayBuilder().setContent(
                                `**Server:** ${targetGuild.name}\n` +
                                `**ID:** \`${targetGuild.id}\`\n` +
                                `**Invite:** ${inviteLink}\n\n` +
                                `-# Owner: <@${ownerId}>`
                            )
                        )
                );

            // 📎 Create standard file attachment as requested
            const imageAttachment = new AttachmentBuilder(badgeURL, { name: 'tag-icon.png' });

            try {
                // 📝 Create the Forum Post
                await forumChannel.threads.create({
                    name: tagText,
                    message: {
                        components: [container],
                        files: [imageAttachment],
                        flags: [MessageFlags.IsComponentsV2]
                    }
                });

                await interaction.editReply(`✅ Successfully posted **${tagText}** in <#${forumChannel.id}>!`);
            } catch (err) {
                console.error("Forum Post Error:", err);
                await interaction.editReply("❌ **Error:** Failed to create the forum post. Ensure I have the 'Create Posts' permission in that forum.");
            }

            // 🧹 Cleanup Temporary Emoji after 5 seconds
            if (tempEmoji) {
                setTimeout(async () => {
                    try { await tempEmoji.delete(); } catch (e) {}
                }, 5000); 
            }
        }
    }
};
