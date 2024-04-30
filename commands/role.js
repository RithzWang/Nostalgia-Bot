module.exports = {
    name: 'role',
    execute(message, args) {
        if (!message.member.permissions.has('MANAGE_ROLES')) {
            return message.channel.send('You do not have permission to use this command.');
        }
        
        const user = message.mentions.members.first();
        if (!user) {
            return message.channel.send('Please mention the user you want to modify roles for.');
        }
        
        const rolesToAdd = [];
        const rolesToRemove = [];
        args.slice(1).forEach(role => {
            if (role.startsWith('+')) {
                const roleName = role.slice(1);
                const foundRole = message.guild.roles.cache.find(r => r.name === roleName);
                if (foundRole) {
                    rolesToAdd.push(foundRole);
                } else {
                    message.channel.send(`Role "${roleName}" not found.`);
                }
            } else if (role.startsWith('-')) {
                const roleName = role.slice(1);
                const foundRole = message.guild.roles.cache.find(r => r.name === roleName);
                if (foundRole) {
                    rolesToRemove.push(foundRole);
                } else {
                    message.channel.send(`Role "${roleName}" not found.`);
                }
            } else {
                message.channel.send(`Invalid role operation for "${role}". Use '+' to add or '-' to remove.`);
            }
        });
        
        user.roles.add(rolesToAdd).catch(console.error);
        user.roles.remove(rolesToRemove).catch(console.error);
    }
};
