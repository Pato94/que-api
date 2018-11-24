const chai = require('chai')
const chaiHttp = require('chai-http')
const server = require('../src')
const { users, groups, tasks } = require('../src/data')

const expect = chai.expect

chai.use(chaiHttp)

const get = (url) => chai.request(server).get(url)
const post = (url) => chai.request(server).post(url)

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
            .set('X-UserId', 1)
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
            .set('X-UserId', 9999)
            .end((err, res) => {
                expect(res.status).to.eq(404)
                done()
            })
    })

    it('should return the user groups', (done) => {
        get('/groups/1/available_tasks')
            .set('X-UserId', 1)
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
            .set('X-UserId', 9999)
            .end((err, res) => {
                expect(res.status).to.eq(404)
                done()
            })
    })

    it('should return my assigned tasks', (done) => {
        get('/groups/1/my_tasks')
            .set('X-UserId', 1)
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
            .set('X-UserId', 9999)
            .end((err, res) => {
                expect(res.status).to.eq(404)
                done()
            })
    })

    it('should return 422 when the task does not exist', (done) => {
        post('/groups/1/assign_task/9999')
            .set('X-UserId', 1)
            .end((err, res) => {
                expect(res.status).to.eq(422)
                done()
            })
    })

    it('should return assign me a new task', (done) => {
        post('/groups/1/assign_task/1')
            .set('X-UserId', 1)
            .end((err, res) => {
                expect(res.status).to.eq(201)
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
            .set('X-UserId', 9999)
            .end((err, res) => {
                expect(res.status).to.eq(404)
                done()
            })
    })

    it('should return 422 when the task does not exist', (done) => {
        post('/groups/1/verify_task/9999')
            .set('X-UserId', 1)
            .send({ photo_url: 'pepita' })
            .end((err, res) => {
                expect(res.status).to.eq(422)
                done()
            })
    })

    it('should return 422 when the task was not assigned to the user', (done) => {
        post('/groups/1/verify_task/2')
            .set('X-UserId', 1)
            .send({ photo_url: 'pepita' })
            .end((err, res) => {
                expect(res.status).to.eq(422)
                done()
            })
    })

    it('should return 422 when the url is not provided', (done) => {
        post('/groups/1/verify_task/1')
            .set('X-UserId', 1)
            .send({ photoUrl: 'pepita' })
            .end((err, res) => {
                expect(res.status).to.eq(422)
                done()
            })
    })

    it('should return assign me a new task', (done) => {
        post('/groups/1/verify_task/1')
            .set('X-UserId', 1)
            .send({ photo_url: 'pepita' })
            .end((err, res) => {
                expect(res.status).to.eq(201)
                done()
            })
    })
})
