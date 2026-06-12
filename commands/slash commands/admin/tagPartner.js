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

        if (sub === 'send') {
            await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

            const config = await TagPartner.findOne({ guildId: interaction.guild.id });
            if (!config || !config.forumChannelId) return interaction.editReply("❌ No partner forum set!");

            let forumChannel = interaction.guild.channels.cache.get(config.forumChannelId);
            if (!forumChannel) {
                try { forumChannel = await interaction.guild.channels.fetch(config.forumChannelId); } 
                catch (e) { return interaction.editReply("❌ Cannot find the configured forum channel."); }
            }

            // 🛠️ SMART INVITE EXTRACTOR
            const rawLink = interaction.options.getString('invite_link').trim();
            const inviteCode = rawLink.split('/').pop().split('?')[0]; 
            
            const invite = await interaction.client.fetchInvite(inviteCode).catch(() => null);
            if (!invite || !invite.guild) return interaction.editReply("❌ Discord rejected the invite code.");

            // ====================================================
            // 🎯 EXTRACT DATA (Strictly using primaryGuild logic)
            // ====================================================
            let targetGuild = interaction.client.guilds.cache.get(invite.guild.id);
            if (!targetGuild) {
                try { targetGuild = await interaction.client.guilds.fetch(invite.guild.id); } catch(e) {}
            }
            
            let tagText = invite.guild.name; 
            let badgeURL = null; 

            if (targetGuild) {
                // 🛡️ API FIX: Force fetch members into cache so we can actually find someone with the tag!
                await targetGuild.members.fetch({ limit: 100 }).catch(() => {});

                // Find ANY member whose primaryGuild matches this server
                const tagSourceMember = targetGuild.members.cache.find(m => m.user.primaryGuild?.identityGuildId === targetGuild.id);

                if (tagSourceMember && tagSourceMember.user.primaryGuild) {
                    const guildInfo = tagSourceMember.user.primaryGuild;
                    if (guildInfo.tag) tagText = guildInfo.tag;
                    
                    if (typeof tagSourceMember.user.guildTagBadgeURL === 'function') {
                        badgeURL = tagSourceMember.user.guildTagBadgeURL({ extension: 'png', size: 256 });
                    } else if (guildInfo.badge && guildInfo.identityGuildId) {
                        badgeURL = `https://cdn.discordapp.com/guild-tag-badges/${guildInfo.identityGuildId}/${guildInfo.badge}.png?size=256`;
                    }
                }
            }

            // If we absolutely cannot find a primaryGuild badge, we fallback to a default transparent image.
            // WE NEVER USE THE SERVER ICON.
            const finalImageURL = badgeURL || "https://cdn.discordapp.com/embed/avatars/0.png";

            // ====================================================
            // 🛠️ TEMPORARY EMOJI CREATION
            // ====================================================
            let tempEmoji = null;
            let emojiDisplay = "🔰"; 
            
            if (badgeURL) {
                const tempEmojiGuildId = '1490435762372481275';
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
                        console.error("Could not create temp emoji:", err);
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

                // 👍 React to the initial message with the created emoji
                if (tempEmoji) {
                    const starterMessage = await thread.fetchStarterMessage().catch(() => null);
                    if (starterMessage) {
                        await starterMessage.react(tempEmoji).catch(() => {});
                    }
                }

                await interaction.editReply(`✅ Successfully posted and locked **${tagText}** in <#${forumChannel.id}>!`);
            } catch (err) {
                console.error("Forum Post Error:", err);
                await interaction.editReply("❌ **Error:** Failed to create the forum post.");
            }
        }
    }
};
