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
        SELECT * FROM l1 WHERE eid = $1 AND role = 'store'
        `
        const user = await pool.query(query,[eid]);
        if(user.rowCount==0)
        {
            return res.status(200).json({message:"EID not found"});
        }
        const hashedPasswordFromDB = user.rows[0].password;
        try
        {
            const passwordMatch = await bcrypt.compare(password,hashedPasswordFromDB);
            if(!passwordMatch)
            {
                return res.status(200).json({message:"Invalid password"});
            }
            //Create Token
            const token = jwt.sign({eid:user.rows[0].eid},process.env.JWT_ACCESS_TOKEN,{expiresIn:'30d'});
            return res.status(200).json({message:'Login successful',token});

        }catch(err)
        {
            console.log(err);
            return res.status(500).json({message:"intenral server error from bcrypt"});
        }


    }catch(err)
    {
        console.log(err);
        return res.status(500).json({message:"intenral server error"});
    }
}
exports.l1_profile_page = async(req,res,next)=>{
    try{
        verifyToken(req,res,async()=>{
            console.log(req.user.eid);
            const eid = req.user.eid;
            const query = `
            SELECT * FROM l1 WHERE eid = $1
            `   
            const results = await pool.query(query,[eid]);
            const profile = results.rows[0];
            const response = {
                eid:profile.eid,
                name:profile.name,
                phone:profile.phone,
                email:profile.email,
            }
            console.log(response);
        
            res.json({success:response,Active:"1"});
            
        })
    }
    catch(err){
        console.log(err);

    }
}