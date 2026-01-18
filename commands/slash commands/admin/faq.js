const { 
    SlashCommandBuilder, 
    PermissionFlagsBits, 
    MessageFlags, 
    ChannelType,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    ComponentType
} = require('discord.js');

const moment = require('moment-timezone');
const FAQ = require('../../../src/models/FaqSchema'); 

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
                .addStringOption(opt => opt.setName('message_id').setDescription('Existing message ID (Optional)'))
                .addChannelOption(opt => 
                    opt.setName('channel')
                        .setDescription('Channel location (Optional)')
                        .addChannelTypes(ChannelType.GuildText))
        )

        // --- 2. ADD ---
        .addSubcommand(sub => 
            sub.setName('add')
                .setDescription('Open form to add a new Q&A')
        )

        // --- 3. EDIT ---
        .addSubcommand(sub => 
            sub.setName('edit')
                .setDescription('Select a question to edit')
        )

        // --- 4. REMOVE ---
        .addSubcommand(sub => 
            sub.setName('remove')
                .setDescription('Select a question to remove')
        ),

    async execute(interaction, client) {
        const sub = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;

        try {
            const faqEntry = await FAQ.findOne({ guildId: guildId });

            // -----------------------------------------------------
            //                   SETUP COMMAND
            // -----------------------------------------------------
            if (sub === 'setup') {
                await interaction.deferReply({ flags: MessageFlags.Ephemeral });
                const targetChannel = interaction.options.getChannel('channel') || interaction.channel;
                const targetMsgId = interaction.options.getString('message_id');
                let message;

                if (targetMsgId) {
                    try {
                        message = await targetChannel.messages.fetch(targetMsgId);
                    } catch (e) {
                        return interaction.editReply(`<:no:1297814819105144862> Could not find message ID \`${targetMsgId}\`.`);
                    }
                } else {
                    message = await targetChannel.send({ content: 'Initializing FAQ...' });
                }

                await FAQ.deleteMany({ guildId: guildId });

                const newFaqData = await FAQ.create({
                    guildId: guildId,
                    channelId: targetChannel.id,
                    messageId: message.id,
                    questions: []
                });

                await message.edit(renderFAQ(newFaqData));
                return interaction.editReply(`<:yes:1297814648417943565> FAQ Panel linked in ${targetChannel}.`);
            }

            // --- CHECK: Ensure FAQ exists ---
            if (!faqEntry) {
                return interaction.reply({ 
                    content: `<:no:1297814819105144862> No FAQ panel found. Run \`/faq setup\` first.`, 
                    flags: MessageFlags.Ephemeral 
                });
            }

            // -----------------------------------------------------
            //                    ADD COMMAND
            // -----------------------------------------------------
            if (sub === 'add') {
                const modal = new ModalBuilder()
                    .setCustomId('faq_add_modal')
                    .setTitle('Add New Question');

                const qInput = new TextInputBuilder()
                    .setCustomId('question')
                    .setLabel("Question")
                    .setPlaceholder("e.g. How do I apply?")
                    .setStyle(TextInputStyle.Short)
                    .setMaxLength(100)
                    .setRequired(true);

                const aInput = new TextInputBuilder()
                    .setCustomId('answer')
                    .setLabel("Answer")
                    .setPlaceholder("Markdown is supported here.")
                    .setStyle(TextInputStyle.Paragraph)
                    .setMaxLength(1000)
                    .setRequired(true);

                modal.addComponents(
                    new ActionRowBuilder().addComponents(qInput),
                    new ActionRowBuilder().addComponents(aInput)
                );

                await interaction.showModal(modal);

                const submitted = await interaction.awaitModalSubmit({
                    time: 300000,
                    filter: i => i.user.id === interaction.user.id && i.customId === 'faq_add_modal'
                }).catch(() => null);

                if (!submitted) return;

                await submitted.deferReply({ flags: MessageFlags.Ephemeral });

                const question = submitted.fields.getTextInputValue('question');
                const answer = submitted.fields.getTextInputValue('answer');

                faqEntry.questions.push({ question, answer });
                await faqEntry.save();

                const success = await refreshFAQMessage(interaction, faqEntry);
                if (success) await submitted.editReply(`<:yes:1297814648417943565> Added question: **${question}**`);
                else await submitted.editReply(`<:no:1297814819105144862> Database updated, but message edit failed.`);
            }

            // -----------------------------------------------------
            //                    EDIT COMMAND
            // -----------------------------------------------------
            if (sub === 'edit') {
                if (faqEntry.questions.length === 0) {
                    return interaction.reply({ content: `<:no:1297814819105144862> No questions to edit.`, flags: MessageFlags.Ephemeral });
                }

                // 1. Select Menu
                const options = faqEntry.questions.slice(0, 25).map((q, index) => 
                    new StringSelectMenuOptionBuilder()
                        .setLabel(q.question.substring(0, 100))
                        .setValue(index.toString())
                );

                const selectMenu = new StringSelectMenuBuilder()
                    .setCustomId('faq_edit_select')
                    .setPlaceholder('Select a question to edit')
                    .addOptions(options);

                const response = await interaction.reply({
                    content: 'Which question would you like to edit?',
                    components: [new ActionRowBuilder().addComponents(selectMenu)],
                    flags: MessageFlags.Ephemeral
                });

                // 2. Wait for Selection
                const selection = await response.awaitMessageComponent({
                    componentType: ComponentType.StringSelect,
                    time: 60000
                }).catch(() => null);

                if (!selection) return interaction.deleteReply().catch(() => {});

                // 3. Show Modal
                const index = parseInt(selection.values[0]);
                const targetQ = faqEntry.questions[index];

                const modal = new ModalBuilder()
                    .setCustomId(`faq_edit_modal_${index}`)
                    .setTitle('Edit Question');

                const qInput = new TextInputBuilder()
                    .setCustomId('question')
                    .setLabel("Question")
                    .setStyle(TextInputStyle.Short)
                    .setValue(targetQ.question)
                    .setRequired(true);

                const aInput = new TextInputBuilder()
                    .setCustomId('answer')
                    .setLabel("Answer")
                    .setStyle(TextInputStyle.Paragraph)
                    .setValue(targetQ.answer)
                    .setRequired(true);

                modal.addComponents(
                    new ActionRowBuilder().addComponents(qInput),
                    new ActionRowBuilder().addComponents(aInput)
                );

                await selection.showModal(modal);

                // 4. Wait for Submit
                const submitted = await selection.awaitModalSubmit({
                    time: 300000,
                    filter: i => i.user.id === interaction.user.id
                }).catch(() => null);

                if (!submitted) return;

                await submitted.deferReply({ flags: MessageFlags.Ephemeral });

                faqEntry.questions[index].question = submitted.fields.getTextInputValue('question');
                faqEntry.questions[index].answer = submitted.fields.getTextInputValue('answer');
                
                await faqEntry.save();
                await refreshFAQMessage(interaction, faqEntry);
                
                await submitted.editReply(`<:yes:1297814648417943565> Question updated successfully.`);
            }

            // -----------------------------------------------------
            //                  REMOVE COMMAND
            // -----------------------------------------------------
            if (sub === 'remove') {
                if (faqEntry.questions.length === 0) {
                    return interaction.reply({ content: `<:no:1297814819105144862> No questions to remove.`, flags: MessageFlags.Ephemeral });
                }

                const options = faqEntry.questions.slice(0, 25).map((q, index) => 
                    new StringSelectMenuOptionBuilder()
                        .setLabel(q.question.substring(0, 100))
                        .setDescription('Click to remove this item')
                        .setValue(index.toString())
                );

                const selectMenu = new StringSelectMenuBuilder()
                    .setCustomId('faq_remove_select')
                    .setPlaceholder('Select a question to REMOVE')
                    .addOptions(options);

                const response = await interaction.reply({
                    content: 'Select the question you want to delete:',
                    components: [new ActionRowBuilder().addComponents(selectMenu)],
                    flags: MessageFlags.Ephemeral
                });

                const selection = await response.awaitMessageComponent({
                    componentType: ComponentType.StringSelect,
                    time: 60000
                }).catch(() => null);

                if (!selection) return interaction.deleteReply().catch(() => {});

                const indexToRemove = parseInt(selection.values[0]);
                const removedQuestion = faqEntry.questions[indexToRemove].question;

                faqEntry.questions.splice(indexToRemove, 1);
                await faqEntry.save();

                await selection.deferUpdate();
                await refreshFAQMessage(interaction, faqEntry);
                
                await selection.editReply({ 
                    content: `<:yes:1297814648417943565> Removed: **${removedQuestion}**`, 
                    components: [] 
                });
            }

        } catch (error) {
            console.error(error);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ content: `<:no:1297814819105144862> Error: ${error.message}`, flags: MessageFlags.Ephemeral });
            } else {
                await interaction.followUp({ content: `<:no:1297814819105144862> Error: ${error.message}`, flags: MessageFlags.Ephemeral });
            }
        }
    }
};

// ==========================================
// HELPERS
// ==========================================

async function refreshFAQMessage(interaction, faqData) {
    try {
        const channel = await interaction.guild.channels.fetch(faqData.channelId);
        if (!channel) return false;
        const message = await channel.messages.fetch(faqData.messageId);
        if (!message) return false;

        await message.edit(renderFAQ(faqData));
        return true;
    } catch (e) {
        console.error("Failed to refresh FAQ:", e);
        return false;
    }
}

const renderFAQ = (faqData) => {
    const now = moment().tz('Asia/Bangkok').format('DD/MM/YYYY');

    const container = new ContainerBuilder();

    // Header
    const headerText = new TextDisplayBuilder().setContent('## ❓ Frequently Asked Questions');
    container.addTextDisplayComponents(headerText);

    // Questions
    if (faqData.questions.length > 0) {
        faqData.questions.forEach((q, index) => {
            container.addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`### ${q.question}\n${q.answer}`)
            );

            // Add separator (unless it's the last item)
            if (index < faqData.questions.length - 1) {
                container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
            }
        });
        
        // Final separator
        container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
    } else {
        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent('*No questions added yet.*')
        );
    }

    // Footer
    const btn = new ButtonBuilder()
        .setCustomId('faq_timestamp')
        .setLabel(`Last Updated: ${now}`)
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true);

    container.addActionRowComponents(new ActionRowBuilder().addComponents(btn));

    return { 
        content: '', 
        embeds: [], 
        files: [],   
        components: [container],
        flags: MessageFlags.IsComponentsV2,
        allowedMentions: { parse: [] } 
    };
};
