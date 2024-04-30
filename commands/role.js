module.exports = {
    name: 'role',
    execute(message, args) {

        // Step 1: Check if the command starts with the correct prefix and the correct command name
        if (!message.content.startsWith(prefix) || !message.content.startsWith(`${prefix}role`)) {
            return message.channel.send('Invalid command format. Please follow the correct syntax.');
        }

        // Step 2: Check if the user mentioned a target member
        const targetUser = message.mentions.members.first();
        if (!targetUser) {
            return message.channel.send('Please mention the user you want to modify roles for.');
        }

        // Step 3: Process role modifications
        const roleChanges = args.slice(1).join(' ').split(/ (?=[+-])/); // Split by space only if followed by + or -
        if (roleChanges.length === 0) {
            return message.channel.send('Please specify roles to add or remove.');
        }

        const addedRoles = [];
        const removedRoles = [];

        roleChanges.forEach(roleChange => {
            const action = roleChange.substring(0, 1); // Extract '+' or '-' from the roleChange
            let roleName = roleChange.substring(1).trim(); // Extract role name after '+' or '-'
            
            // Remove emoji prefix if present
            roleName = roleName.replace(/<a?:\w+:\d+>/, '').trim();

            const role = message.guild.roles.cache.find(role => role.name === roleName);
            if (!role) {
                return message.channel.send(`Role "${roleName}" not found.`);
            }

            if (action === '+') {
                if (!targetUser.roles.cache.has(role.id)) {
                    targetUser.roles.add(role);
                    addedRoles.push(roleName);
                }
            } else if (action === '-') {
                if (targetUser.roles.cache.has(role.id)) {
                    targetUser.roles.remove(role);
                    removedRoles.push(roleName);
                }
            }
        });

        let response = '';
        if (addedRoles.length > 0) {
            response += `Added roles: ${addedRoles.join(', ')}\n`;
        }
        if (removedRoles.length > 0) {
            response += `Removed roles: ${removedRoles.join(', ')}\n`;
        }

        if (response === '') {
            return message.channel.send('No changes made to roles.');
        } else {
            return message.channel.send(response);
        }
    }
};
