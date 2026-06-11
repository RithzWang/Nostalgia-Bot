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

            // 🛡️ API FETCH FIX: Forces the bot to lookup the channel if it's not in cache
            let forumChannel = interaction.guild.channels.cache.get(config.forumChannelId);
            if (!forumChannel) {
                try {
                    forumChannel = await interaction.guild.channels.fetch(config.forumChannelId);
                } catch (e) {
                    return interaction.editReply("❌ **Error:** I cannot find the configured forum channel. Was it deleted?");
                }
            }

            // 🛠️ SMART INVITE EXTRACTOR
            const rawLink = interaction.options.getString('invite_link').trim();
            const inviteCode = rawLink.split('/').pop().split('?')[0]; 
            
            // 🔍 Resolve Invite Link
            const invite = await interaction.client.fetchInvite(inviteCode).catch(() => null);
            if (!invite || !invite.guild) {
                return interaction.editReply(`❌ **Error:** Discord rejected the invite code (\`${inviteCode}\`). It might be expired or invalid.`);
            }

            // ====================================================
            // 🎯 EXTRACT DATA (Strictly primaryGuild / Server Tag)
            // ====================================================
            // 🛡️ API FETCH FIX: Ensure we fetch target guild if possible
            let targetGuild = interaction.client.guilds.cache.get(invite.guild.id);
            if (!targetGuild) {
                try { targetGuild = await interaction.client.guilds.fetch(invite.guild.id); } catch(e) {}
            }
            
            // Baseline Fallbacks
            let tagText = invite.guild.name; 
            let badgeURL = null; 

            // Upgrade info if bot is in the server
            if (targetGuild) {
                const owner = await targetGuild.fetchOwner().catch(() => null);
                let tagSourceUser = owner?.user;

                if (!tagSourceUser || !(tagSourceUser.primaryGuild?.identityGuildId === targetGuild.id)) {
                    tagSourceUser = targetGuild.members.cache.find(m => m.user.primaryGuild?.identityGuildId === targetGuild.id)?.user;
                }

                if (tagSourceUser && tagSourceUser.primaryGuild) {
                    const guildInfo = tagSourceUser.primaryGuild;
                    if (guildInfo.tag) tagText = guildInfo.tag;
                    
                    if (typeof tagSourceUser.guildTagBadgeURL === 'function') {
                        badgeURL = tagSourceUser.guildTagBadgeURL({ extension: 'png', size: 256 });
                    } else if (guildInfo.badge && guildInfo.identityGuildId) {
                        badgeURL = `https://cdn.discordapp.com/guild-tag-badges/${guildInfo.identityGuildId}/${guildInfo.badge}.png?size=256`;
                    }
                }
            }

            const finalImageURL = badgeURL || "https://cdn.discordapp.com/embed/avatars/0.png";

            // ====================================================
            // 🛠️ TEMPORARY EMOJI CREATION
            // ====================================================
            let tempEmoji = null;
            let emojiDisplay = "🔰"; 
            
            if (badgeURL) {
                const tempEmojiGuildId = '1490435762372481275';
                
                // 🛡️ API FETCH FIX: Fetch storage server if it fell out of cache
                let tempEmojiGuild = interaction.client.guilds.cache.get(tempEmojiGuildId);
                if (!tempEmojiGuild) {
                    try { tempEmojiGuild = await interaction.client.guilds.fetch(tempEmojiGuildId); } catch(e) {}
                }

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
                }
            }

            // 🏗️ Build the V2 Component Container
            const container = new ContainerBuilder()
                .addSectionComponents(
                    new SectionBuilder()
                        .setThumbnailAccessory(new ThumbnailBuilder().setURL(finalImageURL))
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(`## ${emojiDisplay} ${tagText}`),
                            new TextDisplayBuilder().setContent(
                                `**Server:** ${invite.guild.name}\n` +
                                `**ID:** \`${invite.guild.id}\`\n` +
                                `**Invite:** https://discord.gg/${invite.code}`
                            )
                        )
                );

            const imageAttachment = new AttachmentBuilder(finalImageURL, { name: 'tag-icon.png' });

            try {
                // 📝 Create the Forum Post
                const thread = await forumChannel.threads.create({
                    name: tagText,
                    message: {
                        components: [container],
                        files: [imageAttachment],
                        flags: [MessageFlags.IsComponentsV2]
                    }
                });

                // 🔒 Lock the post immediately
                await thread.setLocked(true);

                // 👍 React to the initial message
                if (tempEmoji) {
                    const starterMessage = await thread.fetchStarterMessage().catch(() => null);
                    if (starterMessage) {
                        await starterMessage.react(tempEmoji).catch(() => {});
                    }
                }

                await interaction.editReply(`✅ Successfully posted and locked **${tagText}** in <#${forumChannel.id}>!`);
            } catch (err) {
                console.error("Forum Post Error:", err);
                await interaction.editReply("❌ **Error:** Failed to create the forum post. Ensure I have the 'Create Posts' permission in that forum.");
            }
        }
    }
};
