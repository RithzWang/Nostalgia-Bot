const { 
    SlashCommandBuilder, 
    PermissionFlagsBits, 
    MessageFlags, 
    ChannelType,
    ContainerBuilder,
    TextDisplayBuilder,
    SectionBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    MediaGalleryBuilder,
    ThumbnailBuilder
} = require('discord.js');

const moment = require('moment-timezone');
const FAQ = require('../../../src/models/FaqSchema'); // Ensure this path matches your folder structure

module.exports = {
    guildOnly: true,
    data: new SlashCommandBuilder()
        .setName('faq')
        .setDescription('Manage the Server FAQ System')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        
        // --- 1. SETUP ---
        .addSubcommand(sub => 
            sub.setName('setup')
                .setDescription('Initialize or Link an FAQ Panel')
                .addChannelOption(opt => 
                    opt.setName('channel')
                        .setDescription('Where to send the FAQ')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true))
                .addStringOption(opt => 
                    opt.setName('message_id')
                        .setDescription('Existing message ID to turn into FAQ (Optional)'))
        )

        // --- 2. ADD QUESTION ---
        .addSubcommand(sub => 
            sub.setName('add')
                .setDescription('Add a Q&A pair to the FAQ')
                .addStringOption(opt => opt.setName('question').setDescription('The question text').setRequired(true))
                .addStringOption(opt => opt.setName('answer').setDescription('The answer text').setRequired(true))
                .addAttachmentOption(opt => opt.setName('image').setDescription('Optional image to attach'))
        )

        // --- 3. REMOVE QUESTION ---
        .addSubcommand(sub => 
            sub.setName('remove')
                .setDescription('Remove a Q&A pair')
                .addStringOption(opt => opt.setName('question').setDescription('The exact question text to remove').setRequired(true))
        ),

    async execute(interaction, client) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const sub = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;

        // --- HELPER: RENDER THE FAQ MESSAGE ---
        const renderFAQ = (faqData) => {
            const now = moment().tz('Asia/Bangkok').format('DD/MM/YYYY hh:mm A');

            // 1. Build Container with correct Accent Color
            const container = new ContainerBuilder()
                .setAccentColor(0x888888) // Updated to #888888
                .addTextDisplayComponents(t => t.setContent('## ❓ Questions — Answers'));

            // 2. Loop through Questions
            if (faqData.questions.length > 0) {
                faqData.questions.forEach((q, index) => {
                    container.addSectionComponents(section => {
                        section.addTextDisplayComponents(text => 
                            text.setContent(`> ### ${q.question}\n${q.answer}`)
                        );
                    });

                    // Add Separator (except after the last one)
                    if (index < faqData.questions.length - 1) {
                        container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
                    }
                });

                // 3. Handle Images (Media Gallery)
                const images = faqData.questions.filter(q => q.image).map(q => q.image);
                
                if (images.length > 0) {
                    container.addMediaGalleryComponents(gallery => {
                        images.forEach(imgUrl => {
                            gallery.addItems(item => item.setURL(imgUrl));
                        });
                    });
                }
            } else {
                container.addSectionComponents(s => s.addTextDisplayComponents(t => t.setContent('*No questions added yet.*')));
            }

            // 4. Last Updated Button
            const footerRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('faq_timestamp')
                    .setLabel(`Last updated ${now} (GMT+7)`)
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(true)
            );

            container.addActionRowComponents(footerRow);

            return { 
                content: '', 
                components: [container],
                flags: MessageFlags.IsComponentsV2 
            };
        };

        try {
            // ===========================================
            //                 SETUP
            // ===========================================
            if (sub === 'setup') {
                const targetChannel = interaction.options.getChannel('channel');
                const targetMsgId = interaction.options.getString('message_id');

                let message;
                let newFaqData;

                if (targetMsgId) {
                    try {
                        message = await targetChannel.messages.fetch(targetMsgId);
                    } catch (e) {
                        return interaction.editReply(`<:no:1297814819105144862> Could not find message ID \`${targetMsgId}\` in ${targetChannel}.`);
                    }
                } else {
                    message = await targetChannel.send({ content: 'Creating FAQ...' });
                }

                await FAQ.deleteMany({ guildId: guildId });

                newFaqData = await FAQ.create({
                    guildId: guildId,
                    channelId: targetChannel.id,
                    messageId: message.id,
                    questions: []
                });

                await message.edit(renderFAQ(newFaqData));
                return interaction.editReply(`<:yes:1297814648417943565> FAQ Panel setup successfully in ${targetChannel}.`);
            }

            // ===========================================
            //                  ADD
            // ===========================================
            if (sub === 'add') {
                const faqEntry = await FAQ.findOne({ guildId: guildId });
                if (!faqEntry) return interaction.editReply(`<:no:1297814819105144862> No FAQ panel found. Run \`/faq setup\` first.`);

                const question = interaction.options.getString('question');
                const answer = interaction.options.getString('answer');
                const attachment = interaction.options.getAttachment('image');

                faqEntry.questions.push({
                    question: question,
                    answer: answer,
                    image: attachment ? attachment.url : null
                });
                await faqEntry.save();

                const channel = await interaction.guild.channels.fetch(faqEntry.channelId);
                if (channel) {
                    const message = await channel.messages.fetch(faqEntry.messageId);
                    if (message) await message.edit(renderFAQ(faqEntry));
                }
                return interaction.editReply(`<:yes:1297814648417943565> Question added!`);
            }

            // ===========================================
            //                 REMOVE
            // ===========================================
            if (sub === 'remove') {
                const faqEntry = await FAQ.findOne({ guildId: guildId });
                if (!faqEntry) return interaction.editReply(`<:no:1297814819105144862> No FAQ panel found.`);

                const targetQ = interaction.options.getString('question');
                const initialLength = faqEntry.questions.length;
                
                faqEntry.questions = faqEntry.questions.filter(q => q.question !== targetQ);

                if (faqEntry.questions.length === initialLength) {
                    return interaction.editReply(`<:no:1297814819105144862> Question not found: \`${targetQ}\`. Make sure it matches exactly.`);
                }

                await faqEntry.save();

                const channel = await interaction.guild.channels.fetch(faqEntry.channelId);
                if (channel) {
                    const message = await channel.messages.fetch(faqEntry.messageId);
                    if (message) await message.edit(renderFAQ(faqEntry));
                }
                return interaction.editReply(`<:yes:1297814648417943565> Question removed!`);
            }

        } catch (error) {
            console.error(error);
            return interaction.editReply(`<:no:1297814819105144862> An error occurred: ${error.message}`);
        }
    }
};
