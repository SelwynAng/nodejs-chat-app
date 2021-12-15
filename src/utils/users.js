const users = [];

const addUser = ({ id, username, room }) => {
    username = username.trim().toLowerCase();
    room = room.trim().toLowerCase();

    if (!username || !room) {
        return {
            error: 'Username and room are required!'
        }
    }

    const exisitingUser = users.find((user) => {
        return user.room === room && user.username === username;
    })
    if (exisitingUser) {
        return {
            error: 'Username taken already!'
        }
    }

    const user = { id, username, room };
    users.push(user);
    return { user };
}

const removeUser = (id) => {
    const index = users.findIndex((user) => {
        return user.id === id;
    })
    if (index !== -1) {
        const removedUser = users.splice(index, 1);
        return removedUser[0];
    }
}

const getUser = (id) => {
    const index = users.findIndex((user) => {
        return user.id === id;
    })

    if (index === -1) {
        return undefined;
    }

    return users[index];
}

const getUsersInRoom = (room) => {
    room = room.trim().toLowerCase();
    const filtered = [];
    for (let i = 0; i < users.length; i++) {
        if (users[i].room === room) {
            filtered.push(users[i]);
        }
    }
    return filtered;
}

module.exports = {
    addUser,
    removeUser,
    getUser,
    getUsersInRoom
}