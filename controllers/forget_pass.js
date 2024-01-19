const pool = require('../config/db');
const bcrypt = require('bcrypt');
const { query } = require('express');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
require('dotenv').config();
const transporter = nodemailer.createTransport({
    service: 'gmail',
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
     user: process.env.ADMIN_EMAIL,
     pass: process.env.ADMIN_PASS,
    },
   });
exports.l1_forget = async(req,res,next)=>{
    try{
        const email = req.body.email;
        const query = `
        SELECT * FROM l1 WHERE email = $1
        `
        const query_01 = `
        UPDATE l1 SET otp = $2 WHERE email = $1
        `
        const results = await pool.query(query,[email]);
        if(results.rowCount == 0)
        {
            res.json({status:false,success:"EID not found"});
        }
        else
        {   const otp = generateOtp();
            const result_email = await generateMail(email,otp);
            if(result_email == 0)
            {
                res.json({status:false,success:"email error"});
            }
            else
            {
               const result_s = await pool.query(query_01,[email,otp]);
               console.log(result_s.rows);
                res.json({status:true,success:"Otp sent"});
            }
        }

    }catch(err)
    {
        console.log(err);
    }

}
function generateOtp()
{
    return Math.floor(1000+Math.random()*9000);
}
function generateMail(mail, otp) {
    return new Promise((resolve, reject) => {
        const text = "The otp for changing your password is " + otp;
        const subject = "OTP For Password reset";

        const mailOptions = {
            from: process.env.ADMIN_EMAIL,
            to: mail,
            subject,
            text
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error(error);
                reject(error);
            } else {
                console.log(info.response);
                resolve(info.response);
            }
        });
    });
}
exports.check_otp = async(req,res,next)=>{
    try{
        const otp = req.body.otp;
        const email = req.body.email;
        const query = `
        SELECT * FROM l1 where email = $1 and otp = $2
        `
        const result = await pool.query(query,[email,otp]);
        if(result.rowCount == 0)
        {
            res.json({status:false,success:"Incorrect Otp"});
        }
        else
        {
            res.json({status:true,success:"Correct Otp"});
        }

    }catch(error){
        console.log(error);
    }
}
exports.reset = async(req,res,next)=>{
    const pass = req.body.pass;
    const email = req.body.email;
    const password = await bcrypt.hash(pass,10);
    const query =`
    UPDATE l1 SET password=$1 WHERE email=$2
    `
    const result=await pool.query(query,[password,email]);
    if(result.rowCount>0)
    {
        res.json({status:true,success:"Update is successfull"});
    }
    else
    {
        res.json({status:false,success:"Update is unsuccessfull"});
    }
}