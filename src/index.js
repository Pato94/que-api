const express = require('express')
const bodyParser = require('body-parser')
const multer = require('multer')
const crypto = require('crypto')
const path = require('path')
const { users, groups, tasks } = require('./data')
const fcm = require('./fcm')

const app = express()

const port = process.env.PORT || 3000

const storage = multer.diskStorage({
    destination: 'uploads',
    filename: function (req, file, callback) {
        crypto.pseudoRandomBytes(16, function (err, raw) {
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

function addNotification(type, userId, group, message, url) {
    if (!group.notifications) {
        group.notifications = []
    }

    group.notifications.push({
        producer: userId,
        type: type,
        message: message,
        url: url
    })

    // TODO: Además necesitamos filtrar al creador
    group.members.map(({ id: userId }) => {
        const user = users.find(({ id }) => userId === id)
        return user && user.token
    }).filter(a => a).forEach(token => {
        fcm(token, message)
    })
}

app.use(bodyParser.json())

app.post('/login', (req, res) => {
    const { username, password } = req.body
    users.forEach(user => {
        if (user.username === username && user.password === password) {
            res.send(user).end()
        }
    })

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

    const memberAndPoints = [ ...members, { id: userId, points: 100 } ]

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

    const actualTasks = (group.availableTasks || [])
        .map(taskId => tasks.find(({ id }) => taskId === id))
        .map(task => ({ ...task, created_by: users.find(({ id }) => id === task.created_by) }))
    res.status(200).send(actualTasks)
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
        const status = taskId => {
            if ((group.verifications || []).some(({ task }) => task === taskId)) {
                return 'to_validate'
            } else {
                return 'to_verify'
            }
        }

        const results = task.assigned
            .map(taskId => tasks.find(({ id }) => id === taskId))
            .map(task => ({ ...task, created_by: users.find(({ id }) => id === task.created_by) }))
            .map(task => ({ ...task, status: (status(task.id)) }))
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
    const groupTasks = group.availableTasks
    if (!foundTask || !foundTask.id || !groupTasks.includes(taskId)) {
        res.status(422).send('Invalid task')
        return
    }

    task.assigned.push(foundTask.id)
    group.availableTasks = group.availableTasks.filter(id => id !== foundTask.id)

    res.status(201).end()
})

app.get('/groups/:groupId/notifications', (req, res) => {
    const userId = getUserId(req, res)
    if (!userId) return

    const group = getUserGroup(parseInt(req.params.groupId), userId, res)
    if (!group) return

    res.status(200)
        .send(
            (group.notifications || [])
                .map((notif) => ({
                    ...notif,
                    producer: users.find(({ id }) => id === notif.producer)
                }))
        )
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

    const username = users.find(({ id }) => userId === id).full_name
    const actualTaskName = tasks.find(({ id }) => taskId === id).name

    addNotification(
        'VERIFICATION',
        userId,
        group,
        `${username} solicitó una verificación para la tarea "${actualTaskName}"`,
        photoUrl
    )

    res.status(201).end()
})

app.post('/groups/:groupId/validate/:taskId', (req, res) => {
    const userId = getUserId(req, res)
    if (!userId) return

    const group = getUserGroup(parseInt(req.params.groupId), userId, res)
    if (!group) return

    const taskId = parseInt(req.params.taskId)

    const maybeVerification = (group.verifications || [])
        .find(({ task }) => task === taskId)

    if (!maybeVerification) {
        res.status(404).send('Verification not found')
        return
    }

    if (maybeVerification.member === userId) {
        res.status(401).send('Cant validate your own task')
        return
    }

    let task = group.tasks.find(({ member }) => member === maybeVerification.member)

    if (!task || !task.assigned.includes(taskId)) {
        res.status(422).send('Invalid task')
        return
    }

    group.verifications = (group.verifications || []).filter(it => it !== maybeVerification)
    task.assigned = (task.assigned || []).filter(it => it !== taskId)

    const username = users.find(({ id }) => userId === id).full_name
    const actualTaskName = tasks.find(({ id }) => taskId === id).name

    addNotification(
        'VALIDATION',
        userId,
        group,
        `${username} verificó la tarea "${actualTaskName}"`
    )

    res.status(201).end()
})

app.post('/groups/:groupId/task', (req, res) => {
    const userId = getUserId(req, res)
    if (!userId) return

    const group = getUserGroup(parseInt(req.params.groupId), userId, res)
    if (!group) return

    const { name, reward } = req.body
    if (!name || !reward) {
        res.status(422).send('Name or reward not provided').end()
        return
    }

    const extraReward = reward - 100
    const member = group.members.find(({ id }) => id === userId)
    if (member.points < extraReward) {
        res.status(422).send('Invalid reward')
        return
    }

    member.points = member.points - extraReward

    let maxId = 0
    tasks.forEach(({ id }) => {
        if (id > maxId) {
            maxId = id
        }
    })

    tasks.push({
        name,
        reward,
        created_by: userId,
        id: maxId + 1
    })

    if (!group.availableTasks) {
        group.availableTasks = []
    }

    group.availableTasks.push(maxId + 1)

    const username = users.find(({ id }) => userId === id).full_name

    addNotification(
        'TASK_CREATION',
        userId,
        group,
        `${username} creó una nueva tarea "${name}"`
    )

    res.status(201).end()
})

app.post('/token', (req, res) => {
    const userId = getUserId(req, res)
    if (!userId) return

    const user = users.find(({ id }) => id === userId)
    if (!user) {
        res.status(401).send('User not found')
        return
    }

    const { value } = req.query
    if (!value) {
        res.status(422).send('Token not provided')
        return
    }

    user.token = value
    res.send(200).end()
})

app.del('/token', (req, res) => {
    const userId = getUserId(req, res)
    if (!userId) return

    const user = users.find(({ id }) => id === userId)
    if (!user) {
        res.status(401).send('User not found')
        return
    }

    user.token = undefined
    res.send(200).end()
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
console.log(`ENV is ${process.env.NODE_ENV}`)

module.exports = app