const express = require('express')
const bodyParser = require('body-parser')
const multer = require('multer')
const crypto = require('crypto')
const path = require('path')
const { users, groups, tasks } = require('./data')

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
    let end = false

    users.forEach(user => {
        if (user.username === username) {
            res.status(422).send('Existing username')
            end = true
            return
        }
        if (user.id > maxId) {
            maxId = user.id
        }
    })

    if (end) return
    
    users.push({
        ...req.body,
        id: maxId + 1
    })

    res.status(201).send({ id: maxId + 1 })
})

app.get('/users', (req, res) => {
    const userId = getUserId(req, res)
    if (!userId) return

    res.send(users.filter(({ id }) => id !== userId))
})

app.post('/groups', (req, res) => {
    const userId = getUserId(req, res)
    if (!userId) return

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
    if (!userId) return

    const myGroups = userGroups(userId)

    res.status(200).send(myGroups)
})

app.get('/groups/:groupId/available_tasks', (req, res) => {
    const userId = getUserId(req, res)
    if (!userId) return

    const group = getUserGroup(parseInt(req.params.groupId), userId, res)
    if (!group) return

    res.status(200).send(tasks)
})

app.get('/groups/:groupId/my_tasks', (req, res) => {
    const userId = getUserId(req, res)
    if (!userId) return

    const group = getUserGroup(parseInt(req.params.groupId), userId, res)
    if (!group) return

    const task = group.tasks.find(({ member }) => member === userId)

    if (!task) {
        res.status(200).send('[]')
    } else {
        const results = task.assigned.map(taskId => tasks.find(({ id }) => id === taskId)).filter(a => a)
        res.status(200).send(results)
    }
})

app.post('/groups/:groupId/assign_task/:taskId', (req, res) => {
    const userId = getUserId(req, res)
    if (!userId) return

    const group = getUserGroup(parseInt(req.params.groupId), userId, res)
    if (!group) return

    let task = group.tasks.find(({ member }) => member === userId)

    if (!task) {
        task = {
            member: userId,
            assigned: []
        }
        group.tasks.push(task)
    }

    const taskId = parseInt(req.params.taskId)
    const foundTask = tasks.find(({ id }) => taskId === id)
    if (!foundTask || !foundTask.id) {
        res.status(422).send('Invalid task')
        return
    }

    task.assigned.push(foundTask.id)
    res.status(201).end()
})

app.post('/groups/:groupId/verify_task/:taskId', (req, res) => {
    const userId = getUserId(req, res)
    if (!userId) return

    const group = getUserGroup(parseInt(req.params.groupId), userId, res)
    if (!group) return

    const { photo_url: photoUrl } = req.body
    if (!photoUrl) {
        res.status(422).send('Url not provided')
    }

    const taskId = parseInt(req.params.taskId)

    let task = group.tasks.find(({ member }) => member === userId)

    if (!task || !task.assigned.includes(taskId)) {
        res.status(422).send('Invalid task')
        return
    }

    if (!group.verifications) {
        group.verifications = []
    }

    group.verifications.push({
        member: userId,
        task: taskId,
        url: photoUrl
    })

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

module.exports = app;