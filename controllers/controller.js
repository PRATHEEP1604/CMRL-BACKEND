const pool = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Middleware for verifying the JWT token
const verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    const token = authHeader.split(' ')[1];
    console.log(token);
    if (!token) {
        return res.status(200).json({ message: 'Unauthorized: No token provided' });
    }
    jwt.verify(token, process.env.JWT_ACCESS_TOKEN, (err, decoded) => {
        if (err) {
            return res.status(200).json({ message: 'Unauthorized: Invalid token' });
            
        }
        req.user = decoded;
        next();
    });
};

exports.view = async (req, res, next) => {
    try {
        verifyToken(req, res, async () => {
            console.log(req.user.eid);
            const results = await pool.query("SELECT * FROM faults WHERE status IN ($1, $2)", ["Open", "handover"]);
            res.json({ status: true, success: results.rows });
        });
    } catch (err) {
        console.log(err);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};
exports.handover_view = async (req, res, next) => {
    try {
        verifyToken(req, res, async () => {
            console.log(req.user.eid);
            const results = await pool.query("SELECT *, time AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata' AS time_ist FROM assigned_spare WHERE status = $1", ["handover"]);

            res.json({ status: true, success: results.rows });
        });
    } catch (err) {
        console.log(err);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

exports.insert = async(req,res,next)=>{
    try{
        verifyToken(req,res,async()=>{
        const Station = req.body.Station;
        const Device = req.body.Device;
        const Device_Number = req.body.Device_Number;
        const Fault_Ack_Number = req.body.Fault_Ack_Number;
        const Fault_Description = req.body.Fault_Description;
        console.log(req.body);
        const query =`
        INSERT INTO faults (DT, Station, Device, DeviceNo, ACKNo, Description, Status)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *;`
        const DateAndTime = new Date().toISOString();
        let status = "Open";
        const values=[
            DateAndTime,Station,Device,Device_Number,Fault_Ack_Number,Fault_Description,status
        ]
        const results=await pool.query(query,values);
        res.json({ status: true, success: 1 });
        console.log(results.rows);
    });
    }
    catch(err)
    {
        console.log(err.message);
    }
}
exports.add = async(req,res,next)=>{
    try{
        verifyToken(req,res,async()=>{
        const{name,eid,phone,email,password,role} = req.body;
        const hashedPassword = await bcrypt.hash(password,10);
        const values =[
            eid,email,name,hashedPassword,phone,role
        ];
        const query = `INSERT INTO l1 (eid,email,name,password,phone,role) VALUES ($1,$2,$3,$4,$5,$6) RETURNING*;`
        const results = await pool.query(query,values);
        res.json({status:true,success: 1});
        console.log(results.rows);
    });
    }
    catch(err)
    {
        console.log(err.message);
    }
}