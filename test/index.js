process.env.NODE_ENV = 'test';

const chai = require('chai')
const chaiHttp = require('chai-http')
const server = require('../src')
const { users, groups, tasks } = require('../src/data')

const expect = chai.expect

chai.use(chaiHttp)

const get = (url) => chai.request(server).get(url)
const post = (url) => chai.request(server).post(url)
const del = (url) => chai.request(server).delete(url)

describe('POST /login', () => {
    it('should return unauthorized when invalid credentials are provided', (done) => {
        post('/login')
            .send({ username: 'Invalid', password: 'Credentials' })
            .end((err, res) => {
                expect(res.status).to.eq(401)
                done()
            })
    })

    it('should return 200 and the username when valid credentials are provided', (done) => {
        post('/login')
            .send({ username: 'pato94@test.com', password: '123123' })
            .end((err, res) => {
                expect(res.status).to.eq(200)
                expect(res.body.username).to.eq('pato94@test.com')
                done()
            })
    })
})

describe('POST /users', () => {
    it('should return 422 when username or password are not provided', (done) => {
        post('/users')
            .send({ username: 'pato96@test.com' })
            .end((err, res) => {
                expect(res.status).to.eq(422)
                done()
            })
    })

    it('should return 422 when the username already exists', (done) => {
        post('/users')
            .send({ username: 'pato94@test.com', password: '123123' })
            .end((err, res) => {
                expect(res.status).to.eq(422)
                done()
            })
    })

    it('should return the created user id', (done) => {
        post('/users')
            .send({ username: 'pato99@test.com', password: '123123' })
            .end((err, res) => {
                expect(res.status).to.eq(201)
                expect(res.body.id).to.be.a('number')
                done()
            })
    })

    it('should add a new user to the database', (done) => {
        const initialSize = users.length

        post('/users')
            .send({ username: 'pato100@test.com', password: '123123' })
            .end(() => {
                expect(users.some(({ username }) => username === 'pato100@test.com')).to.be.true
                expect(users.length - 1).to.eq(initialSize)
                done()
            })
    })

    it('should be able to respond mygroups of a new user', (done) => {
        const withUserId = (userId) => {
            get('/mygroups')
                .set('X-UserId', userId.toString())
                .end((err, res) => {
                    expect(res.status).to.eq(200)
                    expect(res.body).to.be.an('array')
                    expect(res.body).to.be.empty
                    done()
                })
        }

        post('/users')
            .send({ username: 'pato101@test.com', password: '123123' })
            .end((err, req) => {
                withUserId(req.body.id)
            })
    })
})

describe('GET /users', () => {
    it('should return 401 when the user is not authenticated', (done) => {
        get('/users')
            .end((err, res) => {
                expect(res.status).to.eq(401)
                done()
            })
    })

    it('should return the list of users when the user is authenticated', (done) => {
        get('/users')
            .set('X-UserId', '1')
            .end((err, res) => {
                expect(res.status).to.eq(200)
                expect(res.body).to.be.an('array')
                done()
            })
    })
})

describe('POST /groups', () => {
    it('should return 401 when the user is not authenticated', (done) => {
        post('/groups')
            .send({
                name: 'Los testitos',
                members: [ { id: 1, points: 100 }, { id: 2, points: 100 }, { id: 3, points: 100 } ]
            })
            .end((err, res) => {
                expect(res.status).to.eq(401)
                done()
            })
    })

    it('should return 422 if name or members are not specified', (done) => {
        post('/groups')
            .send({
                nome: 'Los testitos',
                members: [ { id: 1, points: 100 }, { id: 2, points: 100 }, { id: 3, points: 100 } ]
            })
            .set('X-UserId', '1')
            .end((err, res) => {
                expect(res.status).to.eq(422)
                done()
            })
    })

    it('should create a group if the correct params are specified', (done) => {
        post('/groups')
            .send({
                name: 'Los testitos',
                members: [ { id: 1, points: 100 }, { id: 2, points: 100 }, { id: 3, points: 100 } ]
            })
            .set('X-UserId', '1')
            .end((err, res) => {
                expect(res.status).to.eq(201)
                done()
            })
    })

    it('should add a new group to the database', (done) => {
        const initialSize = groups.length

        post('/groups')
            .send({
                name: 'Los testeros',
                members: [ { id: 1, points: 100 }, { id: 2, points: 100 }, { id: 3, points: 100 } ]
            })
            .set('X-UserId', '1')
            .end((err, res) => {
                expect(groups.some(({ name }) => name === 'Los testeros')).to.be.true
                expect(groups.length - 1).to.eq(initialSize)
                done()
            })
    })
})

describe('GET /mygroups', () => {
    it('should return 401 when the user is not authenticated', (done) => {
        get('/mygroups')
            .end((err, res) => {
                expect(res.status).to.eq(401)
                done()
            })
    })

    it('should return my groups', (done) => {
        get('/mygroups')
            .set('X-UserId', '1')
            .end((err, res) => {
                expect(res.status).to.eq(200)
                expect(res.body).to.be.an('array')
                done()
            })
    })
})

describe('GET /groups/:groupId/available_tasks', () => {
    it('should return 401 when the user is not authenticated', (done) => {
        get('/groups/1/available_tasks')
            .end((err, res) => {
                expect(res.status).to.eq(401)
                done()
            })
    })

    it('should return 404 when the user does not belong to that group', (done) => {
        get('/groups/1/available_tasks')
            .set('X-UserId', '9999')
            .end((err, res) => {
                expect(res.status).to.eq(404)
                done()
            })
    })

    it('should return the user groups', (done) => {
        get('/groups/1/available_tasks')
            .set('X-UserId', '1')
            .end((err, res) => {
                expect(res.status).to.eq(200)
                expect(res.body).to.be.an('array')
                done()
            })
    })
})

describe('GET /my_tasks', () => {
    it('should return 401 when the user is not authenticated', (done) => {
        get('/groups/1/my_tasks')
            .end((err, res) => {
                expect(res.status).to.eq(401)
                done()
            })
    })

    it('should return 404 when the user does not belong to that group', (done) => {
        get('/groups/1/my_tasks')
            .set('X-UserId', '9999')
            .end((err, res) => {
                expect(res.status).to.eq(404)
                done()
            })
    })

    it('should return my assigned tasks', (done) => {
        get('/groups/1/my_tasks')
            .set('X-UserId', '1')
            .end((err, res) => {
                expect(res.status).to.eq(200)
                expect(res.body).to.be.an('array')
                done()
            })
    })
})

describe('POST /assign_task', () => {
    it('should return 401 when the user is not authenticated', (done) => {
        post('/groups/1/assign_task/1')
            .end((err, res) => {
                expect(res.status).to.eq(401)
                done()
            })
    })

    it('should return 404 when the user does not belong to that group', (done) => {
        post('/groups/1/assign_task/1')
            .set('X-UserId', '9999')
            .end((err, res) => {
                expect(res.status).to.eq(404)
                done()
            })
    })

    it('should return 422 when the task does not exist', (done) => {
        post('/groups/1/assign_task/9999')
            .set('X-UserId', '1')
            .end((err, res) => {
                expect(res.status).to.eq(422)
                done()
            })
    })

    it('should return 201 if everything is ok', (done) => {
        post('/groups/1/assign_task/4')
            .set('X-UserId', '1')
            .end((err, res) => {
                expect(res.status).to.eq(201)
                done()
            })
    })

    it('should remove the task from the group available tasks', (done) => {
        const group = groups.find(({ id }) => id === 2)
        const initialAvailableTasks = group.availableTasks.length

        post('/groups/2/assign_task/2')
            .set('X-UserId', '1')
            .end((err, res) => {
                expect(res.status).to.eq(201)
                expect(initialAvailableTasks - 1).to.eq(group.availableTasks.length)
                expect(group.availableTasks).to.not.include(2)
                done()
            })
    })
})

describe('GET /notifications', () => {
    it('should return 401 when the user is not authenticated', (done) => {
        get('/groups/1/notifications')
            .end((err, res) => {
                expect(res.status).to.eq(401)
                done()
            })
    })

    it('should return 404 when the user does not belong to that group', (done) => {
        get('/groups/1/notifications')
            .set('X-UserId', '9999')
            .end((err, res) => {
                expect(res.status).to.eq(404)
                done()
            })
    })

    it('should return group notifications', (done) => {
        get('/groups/1/notifications')
            .set('X-UserId', '1')
            .end((err, res) => {
                expect(res.status).to.eq(200)
                expect(res.body).to.be.an('array')
                done()
            })
    })
})

describe('POST /verify_task', () => {
    it('should return 401 when the user is not authenticated', (done) => {
        post('/groups/1/verify_task/1')
            .end((err, res) => {
                expect(res.status).to.eq(401)
                done()
            })
    })

    it('should return 404 when the user does not belong to that group', (done) => {
        post('/groups/1/verify_task/1')
            .set('X-UserId', '9999')
            .end((err, res) => {
                expect(res.status).to.eq(404)
                done()
            })
    })

    it('should return 422 when the task does not exist', (done) => {
        post('/groups/1/verify_task/9999')
            .set('X-UserId', '1')
            .send({ photo_url: 'pepita' })
            .end((err, res) => {
                expect(res.status).to.eq(422)
                done()
            })
    })

    it('should return 422 when the task was not assigned to the user', (done) => {
        post('/groups/1/verify_task/2')
            .set('X-UserId', '1')
            .send({ photo_url: 'pepita' })
            .end((err, res) => {
                expect(res.status).to.eq(422)
                done()
            })
    })

    it('should return 422 when the url is not provided', (done) => {
        post('/groups/1/verify_task/1')
            .set('X-UserId', '1')
            .send({ photoUrl: 'pepita' })
            .end((err, res) => {
                expect(res.status).to.eq(422)
                done()
            })
    })

    it('should verify a task', (done) => {
        post('/groups/1/verify_task/1')
            .set('X-UserId', '1')
            .send({ photo_url: 'pepita' })
            .end((err, res) => {
                expect(res.status).to.eq(201)
                done()
            })
    })

    it('should add a verification to the group object', (done) => {
        const group = groups.find(({ id }) => id === 1)
        const verifications = (group.verifications || []).length
        post('/groups/1/verify_task/3')
            .set('X-UserId', '2')
            .send({ photo_url: 'lalal' })
            .end(() => {
                expect(group.verifications.some(({ url }) => url === 'lalal')).to.be.true
                expect(group.verifications.length - 1).to.eq(verifications)
                done()
            })
    })

    it('should add a notification to the group object', (done) => {
        const group = groups.find(({ id }) => id === 1)
        const notifications = (group.notifications || []).length
        post('/groups/1/verify_task/3')
            .set('X-UserId', '2')
            .send({ photo_url: 'lalal' })
            .end(() => {
                expect(group.notifications.some(({ url }) => url === 'lalal')).to.be.true
                expect(group.notifications.length - 1).to.eq(notifications)
                done()
            })
    })
})

describe('POST /token', () => {
    it('should return 401 when the user is not authenticated', (done) => {
        post('/token?value=pepita')
            .end((err, res) => {
                expect(res.status).to.eq(401)
                done()
            })
    })

    it('should return 401 when the user does not exist', (done) => {
        post('/token?value=pepita')
            .set('X-UserId', '99999')
            .end((err, res) => {
                expect(res.status).to.eq(401)
                done()
            })
    })

    it('should return 200 when everything is ok', (done) => {
        post('/token?value=pepita')
            .set('X-UserId', '1')
            .end((err, res) => {
                expect(res.status).to.eq(200)
                done()
            })
    })

    it('should store the token', (done) => {
        const user = users.find(({ id }) => id === 2)
        post('/token?value=pepita')
            .set('X-UserId', '2')
            .end(() => {
                expect(user.token).to.eq('pepita')
                done()
            })
    })
})

describe('DELETE /token', () => {
    it('should return 401 when the user is not authenticated', (done) => {
        del('/token')
            .end((err, res) => {
                expect(res.status).to.eq(401)
                done()
            })
    })

    it('should return 401 when the user does not exist', (done) => {
        del('/token')
            .set('X-UserId', '99999')
            .end((err, res) => {
                expect(res.status).to.eq(401)
                done()
            })
    })

    it('should return 200 when everything is ok', (done) => {
        del('/token')
            .set('X-UserId', '1')
            .end((err, res) => {
                expect(res.status).to.eq(200)
                done()
            })
    })

    it('should delete the token', (done) => {
        const user = users.find(({ id }) => id === 2)
        user.token = 'saraza'
        del('/token')
            .set('X-UserId', '2')
            .end(() => {
                expect(user.token).to.be.undefined
                done()
            })
    })
})

describe('POST /group/:groupId/task', () => {
    it('should return 401 when the user is not authenticated', (done) => {
        post('/groups/1/task')
            .send({ name: 'Sacar la basura', reward: 100 })
            .end((err, res) => {
                expect(res.status).to.eq(401)
                done()
            })
    })

    it('should return 404 when the user does not belong to the group', (done) => {
        post('/groups/1/task')
            .set('X-UserId', '99999')
            .send({ name: 'Sacar la basura', reward: 100 })
            .end((err, res) => {
                expect(res.status).to.eq(404)
                done()
            })
    })

    it('should return 422 when the name or the reward are not provided', (done) => {
        post('/groups/1/task')
            .set('X-UserId', '1')
            .send({ name: 'Sacar la basura' })
            .end((err, res) => {
                expect(res.status).to.eq(422)
                done()
            })
    })

    it('should return 201 when everything is ok', (done) => {
        post('/groups/1/task')
            .set('X-UserId', '1')
            .send({ name: 'Sacar la basura', reward: 100 })
            .end((err, res) => {
                expect(res.status).to.eq(201)
                done()
            })
    })

    it('should create a new task', (done) => {
        const initialTasksSize = tasks.length

        post('/groups/1/task')
            .set('X-UserId', '1')
            .send({ name: 'Hacer buenos tests', reward: 100 })
            .end(() => {
                expect(tasks.length - 1).to.eq(initialTasksSize)
                expect(tasks.some(({ name }) => name === 'Hacer buenos tests')).to.be.true
                done()
            })
    })

    it('should add the new task to the group available tasks', (done) => {
        const group = groups.find(({ id }) => id === 1)
        const initialTasksSize = group.availableTasks.length

        post('/groups/1/task')
            .set('X-UserId', '1')
            .send({ name: 'Hacer buenos tests 2', reward: 100 })
            .end(() => {
                const newTaskId = tasks.find(({ name }) => name === 'Hacer buenos tests 2').id
                expect(group.availableTasks.length - 1).to.eq(initialTasksSize)
                expect(group.availableTasks).to.include(newTaskId)
                done()
            })
    })

    it('should decrement users point if the reward is above 100', (done) => {
        const group = groups.find(({ id }) => id === 1)
        const member = group.members.find(({ id }) => id === 1)

        expect(member.points).to.eq(100)
        post('/groups/1/task')
            .set('X-UserId', '1')
            .send({ name: 'Hacer buenos tests 3', reward: 130 })
            .end(() => {
                expect(member.points).to.eq(70)
                done()
            })
    })

    it('should return 422 if the extra reward is above the users points', (done) => {
        post('/groups/1/task')
            .set('X-UserId', '1')
            .send({ name: 'Hacer buenos tests 4', reward: 230 })
            .end((err, res) => {
                expect(res.status).to.eq(422)
                done()
            })
    })
})

describe('POST /group/:groupId/validate/:taskId', () => {
    const group = groups.find(({ id }) => id === 1)
    group.verifications = [ { member: 1, task: 1, url: 'pepita' } ]

    it('should return 401 when the user is not authenticated', (done) => {
        post('/groups/1/validate/1')
            .end((err, res) => {
                expect(res.status).to.eq(401)
                done()
            })
    })

    it('should return 404 when the user does not belong to the group', (done) => {
        post('/groups/1/validate/1')
            .set('X-UserId', '99999')
            .end((err, res) => {
                expect(res.status).to.eq(404)
                done()
            })
    })

    it('should return 404 when the validation does not exist', (done) => {
        post('/groups/1/validate/2')
            .set('X-UserId', '2')
            .end((err, res) => {
                expect(res.status).to.eq(404)
                done()
            })
    })

    it('should return 401 when the authenticator is the producer', (done) => {
        post('/groups/1/validate/1')
            .set('X-UserId', '1')
            .end((err, res) => {
                expect(res.status).to.eq(401)
                done()
            })
    })

    it('should return 200 if everything goes well', (done) => {
        post('/groups/1/validate/1')
            .set('X-UserId', '2')
            .end((err, res) => {
                expect(res.status).to.eq(201)
                done()
            })
    })

    group.verifications = [
        {
            member: 1,
            task: 1,
            url: 'pepita'
        }
    ]

    it('should remove the assigned task and the verification', (done) => {
        post('/groups/1/validate/1')
            .set('X-UserId', '2')
            .end(() => {
                expect(group.verifications).to.be.empty
                expect(group.tasks.find(({ member }) => member === 1).assigned).to.not.include(1)
                done()
            })
    })
})

describe('POST /groups/:groupId/subscribe', () => {
    const group = groups.find(({ id }) => id === 2)

    it('should return 401 when the user is not authenticated', (done) => {
        post('/groups/2/subscribe')
            .end((err, res) => {
                expect(res.status).to.eq(401)
                done()
            })
    })

    it('should return 404 if the group does not exist', (done) => {
        post('/groups/47/subscribe')
            .set('X-UserId', '3')
            .end((err, res) => {
                expect(res.status).to.eq(404)
                done()
            })
    })

    it('should return 404 if the user does not exist', (done) => {
        post('/groups/1/subscribe')
            .set('X-UserId', '47')
            .end((err, res) => {
                expect(res.status).to.eq(404)
                done()
            })
    })

    it('should return 201 when the user is added to the group', (done) => {
        const groupSize = group.members.length
        post('/groups/2/subscribe')
            .set('X-UserId', '3')
            .end((err, res) => {
                expect(res.status).to.eq(201)
                expect(groupSize).to.eq(group.members.length - 1)
                done()
            })
    })
})