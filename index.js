const express = require('express')
const bodyParser = require('body-parser')
const multer = require('multer')
const crypto = require('crypto')
const path = require('path')

const app = express()

const port = process.env.PORT || 3000

const storage = multer.diskStorage({
    destination: 'uploads',
    filename: function (req, file, callback) {
        crypto.pseudoRandomBytes(16, function(err, raw) {
            if (err) return callback(err)
          
            callback(null, raw.toString('hex') + path.extname(file.originalname))
        })
    }
})

const upload = multer({ storage })

const users = [
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

const groups = [
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
        ]
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
        ]
    }
]

const tasks = [
    {
        id: 1,
        name: 'Sacar la basura'
    },
    {
        id: 2,
        name: 'Pasear el perro'
    },
    {
        id: 3,
        name: 'Lavar los platos'
    }
]

function userGroups(userId) {
    const myGroups = []
    groups.forEach(group => {
        if (group.members.map(({ id }) => id).includes(userId)) {
            myGroups.push(group)
        }
    })
    return myGroups
}

function getUserId(req, res) {
    const userId = parseInt(req.get('X-UserId'))
    if (!userId) {
        res.status(401).send('Missing user id')
        return
    }
    return userId
}

function getUserGroup(groupId, userId, res) {
    const groups = userGroups(userId)
    const group = groups.find(({ id }) => {
        return id === groupId
    })

    if (!group) {
        res.status(404).send('Group not found')
        return
    }

    return group
}

app.use(bodyParser.json())

app.get('/', (req, res) => res.send('Hello world!'))

app.post('/login', (req, res) => {
    const { username, password } = req.body
    users.forEach(user => {
        if (user.username === username && user.password === password) {
            res.send(user).end()
        }
    });

    res.status(401).end()
})

app.post('/users', (req, res) => {
    const { username, password } = req.body
    if (!username || !password) {
        res.status(422).send('Missing username or password')
        return
    }

    let maxId = 0

    users.forEach(user => {
        if (user.username === username) {
            res.status(422).send('Existing username')
            return
        }
        if (user.id > maxId) {
            maxId = user.id
        }
    })
    
    users.push({
        ...req.body,
        id: maxId + 1
    })

    res.status(201).send({ id: maxId + 1 })
})

app.get('/users', (req, res) => {
    const userId = getUserId(req, res)
    if (!userId) {
        return
    }

    res.send(users.filter(({ id }) => id !== userId))
})

app.post('/groups', (req, res) => {
    const userId = getUserId(req, res)
    if (!userId) {
        return
    }

    const { name, members } = req.body
    if (!name || !members) {
        res.status(422).send('Missing name or members')
        return
    }

    let maxId = 0
    groups.forEach(group => {
        if (group.id > maxId) {
            maxId = group.id
        }
    })

    const memberAndPoints = [...members, { id: userId, points: 100 }]

    groups.push({
        ...{ name, members: memberAndPoints },
        id: maxId + 1,
        tasks: []
    })

    res.status(201).end()
})

app.get('/mygroups', (req, res) => {
    const userId = getUserId(req, res)
    if (!userId) {
        return
    }

    const myGroups = userGroups(userId)

    res.status(200).send(myGroups)
})

app.get('/groups/:groupId/available_tasks', (req, res) => {
    const userId = getUserId(req, res)
    if (!userId) {
        return
    }

    const group = getUserGroup(parseInt(req.params.groupId), userId, res)
    if (!group) {
        return
    }

    res.status(200).send(tasks)
})

app.get('/groups/:groupId/my_tasks', (req, res) => {
    const userId = getUserId(req, res)
    if (!userId) {
        return
    }

    const group = getUserGroup(parseInt(req.params.groupId), userId, res)
    if (!group) {
        return
    }

    const task = group.tasks.find(({ member }) => {
        return member === userId
    })

    if (!task) {
        res.status(200).send('[]')
        return
    }

    const results = task.assigned.map(taskId => tasks.find(({ id }) => id === taskId)).filter(a => a)
    res.status(200).send(results)
})

app.post('/groups/:groupId/assign_task/:taskId', (req, res) => {
    const userId = getUserId(req, res)
    if (!userId) {
        return
    }

    const group = getUserGroup(parseInt(req.params.groupId), userId, res)
    if (!group) {
        return
    }

    let task = group.tasks.find(({ member }) => {
        return member === userId
    })

    if (!task) {
        task = {
            member: userId,
            assigned: []
        }
        group.tasks.push(task)
    }

    const taskId = parseInt(req.params.taskId)
    const foundTask = tasks.find(({ id }) => taskId === id)
    if (!foundTask.id) {
        res.status(422).send('Invalid task')
        return
    }

    task.assigned.push(foundTask.id)
    res.status(201).end()
})

app.post('/upload', upload.single('image'), (req, res) => {
    if (!req.file) {
        res.status(422).send('No file received')
    } else {
        res.status(200).send({ file: req.file.path })
    }
})

app.use('/uploads', express.static('uploads'))

app.listen(port, () => console.log(`app listening on port ${port}`))