const { 
    SlashCommandBuilder, PermissionFlagsBits, ChannelType, MessageFlags,
    ContainerBuilder, SectionBuilder, ThumbnailBuilder, TextDisplayBuilder,
    AttachmentBuilder
} = require('discord.js');
const TagPartner = require('../../../src/models/TagPartner'); 

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

            // 🔍 Fetch target guild
            const targetGuild = interaction.client.guilds.cache.get(invite.guild.id);
            if (!targetGuild) {
                return interaction.editReply("❌ **Error:** I need to be inside that server to fetch its Owner ID and true Server Tag!");
            }

            // ====================================================
            // 🎯 EXTRACT TRUE SERVER TAG
            // ====================================================
            const ownerId = targetGuild.ownerId;
            let tagText = targetGuild.name; 
            let badgeURL = targetGuild.iconURL({ extension: 'png', size: 256 }) || "https://cdn.discordapp.com/embed/avatars/0.png"; 

            const owner = await targetGuild.fetchOwner().catch(() => null);
            let tagSourceUser = owner?.user;

            if (!tagSourceUser || !(tagSourceUser.primaryGuild?.identityGuildId === targetGuild.id)) {
                tagSourceUser = targetGuild.members.cache.find(m => m.user.primaryGuild?.identityGuildId === targetGuild.id)?.user;
            }

            if (tagSourceUser && tagSourceUser.primaryGuild) {
                const guildInfo = tagSourceUser.primaryGuild;
                if (guildInfo.tag) tagText = guildInfo.tag;
                
                if (typeof tagSourceUser.guildTagBadgeURL === 'function') {
                    badgeURL = tagSourceUser.guildTagBadgeURL({ extension: 'png', size: 256 }) || badgeURL;
                } else if (guildInfo.badge && guildInfo.identityGuildId) {
                    badgeURL = `https://cdn.discordapp.com/guild-tag-badges/${guildInfo.identityGuildId}/${guildInfo.badge}.png?size=256`;
                }
            }

            // ====================================================
            // 🛠️ TEMPORARY EMOJI CREATION
            // ====================================================
            let tempEmoji = null;
            let emojiDisplay = "🔰"; 
            const tempEmojiGuildId = '1490435762372481275';
            const tempEmojiGuild = interaction.client.guilds.cache.get(tempEmojiGuildId);

            if (tempEmojiGuild) {
                try {
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

            // 🏗️ Build the V2 Component Container
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

            const imageAttachment = new AttachmentBuilder(badgeURL, { name: 'tag-icon.png' });

            try {
                // 📝 Create the Forum Post
                const thread = await forumChannel.threads.create({
                    name: tagText,
                    message: {
                        components: [container],
                        files: [imageAttachment],
                        flags: [MessageFlags.IsComponentsV2],
                        allowedMentions: { parse: [] } // ✅ Mentions the owner without pinging
                    }
                });

                // 🔒 Lock the post immediately
                await thread.setLocked(true);

                // 👍 React to the initial message
                if (tempEmoji) {
                    const starterMessage = await thread.fetchStarterMessage().catch(() => null);
                    if (starterMessage) {
                        await starterMessage.react(tempEmoji).catch(err => console.error("Reaction error:", err));
                    }
                }

                await interaction.editReply(`✅ Successfully posted and locked **${tagText}** in <#${forumChannel.id}>!`);
            } catch (err) {
                console.error("Forum Post Error:", err);
                await interaction.editReply("❌ **Error:** Failed to create the forum post. Ensure I have the 'Create Posts' permission in that forum.");
            }

            // 🧹 Cleanup Temporary Emoji
            // COMMENTED OUT: If you delete the emoji, the reaction will disappear from the post!
            /*
            if (tempEmoji) {
                setTimeout(async () => {
                    try { await tempEmoji.delete(); } catch (e) {}
                }, 5000); 
            }
            */
        }
    }
};
