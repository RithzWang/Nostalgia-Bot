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

            // ====================================================
            // 🎯 EXTRACT DATA (Using v9 API to bypass server presence)
            // ====================================================
            let tagText = "Unknown Server"; 
            let badgeURL = null;
            let serverName = "Unknown";
            let serverId = "Unknown";
            const inviteUrl = `https://discord.gg/${inviteCode}`;

            try {
                // Fetch the invite using the undocumented v9 endpoint
                const inviteRes = await fetch(`https://discord.com/api/v9/invites/${inviteCode}?with_counts=true`, {
                    headers: {
                        'Authorization': process.env.BURNER_TOKEN, 
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                        'Content-Type': 'application/json'
                    }
                });

                if (!inviteRes.ok) {
                    return interaction.editReply("❌ Discord's API rejected the invite code. Check your Burner Token or the invite link.");
                }

                const inviteData = await inviteRes.json();
                
                if (!inviteData.guild) {
                    return interaction.editReply("❌ That invite does not point to a server (might be a group DM).");
                }

                serverName = inviteData.guild.name;
                serverId = inviteData.guild.id;

                // 🌟 Check if the server is a Clan
                if (inviteData.guild.clan) {
                    tagText = inviteData.guild.clan.tag;
                    
                    if (inviteData.guild.clan.badge) {
                        badgeURL = `https://cdn.discordapp.com/guild-tag-badges/${serverId}/${inviteData.guild.clan.badge}.png?size=256`;
                    }
                } else {
                    // Fallback if it's a normal server without a Clan setup
                    tagText = serverName;
                }

            } catch (error) {
                console.error("v9 Invite Fetch Error:", error);
                return interaction.editReply("❌ Something went wrong while fetching the invite data.");
            }

            // If we absolutely cannot find a primaryGuild badge, fallback to default.
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
                        const safeEmojiName = `TagBadge_${serverId}`; 
                        
                        // Create a brand new emoji every time
                        tempEmoji = await tempEmojiGuild.emojis.create({ 
                            attachment: badgeURL, 
                            name: safeEmojiName 
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
                                `**Server:** ${serverName}\n` +
                                `**ID:** \`${serverId}\`\n` +
                                `**Invite:** ${inviteUrl}`
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

                    // 🗑️ CLEANUP: Delete the temp emoji from the host server
                    setTimeout(async () => {
                        await tempEmoji.delete().catch(() => console.error("Failed to delete temp emoji."));
                    }, 2000); 
                }

                await interaction.editReply(`✅ Successfully posted and locked **${tagText}** in <#${forumChannel.id}>!`);
            } catch (err) {
                console.error("Forum Post Error:", err);
                await interaction.editReply("❌ **Error:** Failed to create the forum post.");
            }
        }
    }
};
