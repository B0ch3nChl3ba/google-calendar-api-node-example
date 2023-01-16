require('dotenv').config()
const express = require('express')
const basicAuth = require('express-basic-auth')
const JSONdb = require('simple-json-db')
const { google } = require('googleapis')

const app = express()
const port = 8080
const db = new JSONdb(__dirname + '/db.json')

const googleAuthApi = new google.auth.OAuth2(
    process.env.CLIENT_ID,
    process.env.CLIENT_SECRET,
    process.env.REDIRECT_URL,
)

const scopes = [
    'https://www.googleapis.com/auth/calendar'
]

app.use(basicAuth({
    challenge: true,
    authorizer: (u, p) => {
        if (db.has(u)) {
            return db.get(u).password === p
        } else {
            db.set(u, { password: p })
            return true
        }
    }
}))

app.use((req, res, next) => {
    req.user = { name: req.auth.user, ...db.get(req.auth.user) }
    next()
})

app.get('/', async (req, res) => {
    if (req.user.tokens) {
        const auth = new google.auth.OAuth2()
        auth.setCredentials(req.user.tokens)

        if (Date.now() > req.user.tokens.expiry_date) {
            const res = await auth.refreshAccessToken()
            const newTokens = res.credentials

            db.set(req.user.name, {
                ...req.user,
                tokens: newTokens
            })
        }

        const calendarList = await google.calendar({ version: 'v3', auth }).calendarList.list()

        res.send(`
            <pre>${JSON.stringify(calendarList.data, null, 2)}</pre>
            <br>
            <a href='/logout'>logout from ggl</a>
        `)
    } else {
        res.send('<a href="/login">login to ggl</a>')
    }
})

app.get('/login', (req, res) => {
    const url = googleAuthApi.generateAuthUrl({
        access_type: 'offline',
        scope: scopes,
        prompt: 'select_account'
    })

    res.redirect(url)
})

app.get('/logout', (req, res) => {
    req.user.tokens = undefined
    db.set(req.user.name, req.user)
    res.redirect('/')
})

app.get('/redirect', async (req, res) => {
    const { tokens } = await googleAuthApi.getToken(req.query.code)

    db.set(req.user.name, {
        ...req.user,
        tokens
    })

    res.redirect('/')
})

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})
