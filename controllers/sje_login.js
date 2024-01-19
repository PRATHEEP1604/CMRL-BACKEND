const pool = require('../config/db');
const bcrypt = require('bcrypt');
const { query } = require('express');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const verifyToken = (req,res,next)=>{
    const authHeader = req.headers.authorization;
    let token = authHeader && authHeader.split(' ')[1];
    console.log(token);
    if(!token)
    {
        return res.status(200).json({message:"Unauthorized: No token provided"});
    }
    jwt.verify(token,process.env.JWT_ACCESS_TOKEN,(err,decoded)=>{
        if(err){
            return res.status(200).json({messgae:"Unauthorized: Invalid token"});
        }
        req.user = decoded;
        next();
    })
}
exports.login = async(req,res,next)=>{
    try{
        const eid = req.body.eid;
        const password = req.body.password;
        const query = `
        SELECT * from je where eid = $1 and role = 'store'
        `;
        const user = await pool.query(query,[eid]);
        if(user.rowCount==0)
        {
            return res.status(200).json({message:"EID not found"});
        }
        const hashedPasswordFromDB = user.rows[0].password;
        try{
            const passwordMatch = await bcrypt.compare(password,hashedPasswordFromDB);
            if(!passwordMatch)
            {
                return res.status(200).json({message:"Password dont match"});
            }
            const token = jwt.sign({eid:user.rows[0].eid},process.env.JWT_ACCESS_TOKEN,{expiresIn:'30d'});
            return res.status(200).json({message:'login successfull',token})
        }catch(err)
        {
            console.log(err);

        }
        
        

    }catch(err)
    {
        console.log(err);
    }
}