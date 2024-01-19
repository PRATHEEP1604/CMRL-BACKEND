require('dotenv').config();
const pool = require('./config/db'); 
const router = require('./routers/router');
const express = require('express');
const app = express();
const port = process.env.PORT;
const body_parser = require('body-parser');
app.use(body_parser.json());
app.use('/',router);
app.listen(port,async()=>{
    console.log(`server running on port ${port}`);
    const results = await pool.query("SELECT * FROM faults");
    console.log(results.rows[0]);
})
