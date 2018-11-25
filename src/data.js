module.exports.users = [
    {
        id: 1,
        username: 'pato9406@gmail.com',
        password: '123123',
        full_name: 'Cristian Contreras'
    },
    {
        id: 2,
        username: 'pato@test.com',
        password: '123123',
        full_name: 'Patricio Contreras'
    },
    {
        id: 3,
        username: 'pato94@test.com',
        password: '123123',
        full_name: 'Rodolfo Contreras'
    }
]


module.exports.groups = [
    {
        id: 1,
        name: 'Familia',
        members: [
            { id: 1, points: 100 },
            { id: 2, points: 100 },
            { id: 3, points: 100 }
        ],
        tasks: [
            {
                member: 1,
                assigned: [1]
            },
            {
                member: 2,
                assigned: [2, 3]
            },
            {
                member: 3,
                assigned: []
            }
        ],
        availableTasks: [1, 2, 3]
    },
    {
        id: 2,
        name: 'Skynet',
        members: [
            { id: 1, points: 100 },
            { id: 2, points: 100 }
        ],
        tasks: [
            {
                member: 1,
                assigned: [1, 2]
            },
            {
                member: 2,
                assigned: [3]
            }
        ],
        availableTasks: [1, 2, 3]
    }
]

module.exports.tasks = [
    {
        id: 1,
        name: 'Sacar la basura',
        reward: 100
    },
    {
        id: 2,
        name: 'Pasear el perro',
        reward: 100
    },
    {
        id: 3,
        name: 'Lavar los platos',
        reward: 100
    }
]
