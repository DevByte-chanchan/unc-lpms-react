import express from 'express';
import sequelize from './models/index.js';
import TOS from './models/TOS.js';

const app = express();
app.use(express.json());

app.post('/tos', async (req, res) => {
    const tos = await TOS.create(req.body);
    res.json(tos);
});

sequelize.sync({ alter: true }).then(() => {
    app.listen(3000, () => console.log('Server started on port 3000'));
});
