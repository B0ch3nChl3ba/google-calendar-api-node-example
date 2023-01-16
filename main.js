require("dotenv").config()
const express = require('express')
const { google } = require('googleapis')

const app = express()
const port = 8080

const oauth2Client = new google.auth.OAuth2(
    process.env.CLIENT_ID,
    process.env.CLIENT_SECRET,
    process.env.REDIRECT_URL,
);

const scopes = [
    'https://www.googleapis.com/auth/calendar'
];

app.get('/', (req, res) => {
    const url = oauth2Client.generateAuthUrl({
        // 'online' (default) or 'offline' (gets refresh_token)
        access_type: 'offline',
        // If you only need one scope you can pass it as a string
        scope: scopes,
        prompt: "select_account"
    });

    res.redirect(url)
})

app.get('/redirect', async (req, res) => {
    const { tokens } = await oauth2Client.getToken(req.query.code)
    oauth2Client.setCredentials(tokens);

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    res.json(await calendar.calendarList.list())
})

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})
