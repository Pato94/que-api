const express = require('express')
const bodyParser = require('body-parser')

const app = express()

const port = 3000

const users = [
    {
        id: 1,
        username: 'pato9406@gmail.com',
        password: 123123,
        full_name: 'Cristian Contreras'
    },
    {
        id: 2,
        username: 'pato@test.com',
        password: 123123,
        full_name: 'Patricio Contreras'
    },
    {
        id: 3,
        username: 'pato94@test.com',
        password: 123123,
        full_name: 'Rodolfo Contreras'
    }
]

const groups = [
    {
        id: 1,
        name: 'Familia',
        members: [1, 2, 3]
    },
    {
        id: 2,
        name: 'Skynet',
        members: [1, 2]
    }
]

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

    res.status(201).send(`{"id": ${maxId + 1} }`)
})

app.get('/users', (req, res) => {
    res.send(users)
})

app.post('/groups', (req, res) => {
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

    groups.push({
        ...req.body,
        id: maxId + 1
    })

    res.status(201).end()
})

app.get('/mygroups', (req, res) => {
    
})


app.listen(port, () => console.log(`app listening on port ${port}`))