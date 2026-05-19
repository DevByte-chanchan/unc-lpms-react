/**
 * Learning Plan Composition backend service
 */
require('dotenv').config()
const express = require('express')
const cors = require('cors')

const app = express()
app.use(cors())
app.use(express.json())

// health check
app.get('/health', (req, res) => res.json({ ok: true, service: 'learning-plan-composition' }))

// placeholder routes
app.get('/api/plans', (req, res) => res.json({ plans: [] }))

const PORT = process.env.PORT || 4000
app.listen(PORT, () => {
  console.log(`Learning Plan Composition service listening on ${PORT}`)
})
