const pool = require('../config/db');
const bcrypt = require('bcrypt');
const { query } = require('express');
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
exports.l1_view = async(req,res,next)=>{
    try{
        verifyToken(req,res,async()=>{ 
        const query = `
        SELECT *
        FROM l1
        WHERE a_status = 'Active';
        
      `;
        const results = await pool.query(query);
        res.json({ status: true, success: results.rows });
        }); 

    }catch(err)
    {
        console.log(err);
    }
}
exports.l1_assign = async(req,res,next)=>{
    try{
        const {station,device,ackno,employeeId,status,hoa} = req.body;
        console.log(hoa);
        const query =`
        INSERT INTO af (ackno,eid, hoa, status, a_time)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *;`;
        // const aid = (ackno + employeeId)*0.0001;
        const currentTime = new Date();
        const currentOffset = currentTime.getTimezoneOffset();
        const ISTOffset = 330;   // IST offset UTC +5:30 
        const DateAndTime = new Date(currentTime.getTime() + (ISTOffset + currentOffset) * 60000);
        const values = [
            ackno,employeeId,hoa,status,DateAndTime
        ];
        const result = await pool.query(query,values);
        res.json({ status: true, success: result.rows });
        await pool.query('UPDATE faults SET status = $1 WHERE ackno = $2', [status, ackno]);
       
    }catch(err)
    {
        console.log(err);
    }
}
exports.l1_self_assign = async(req,res,next)=>{
    try{
        verifyToken(req,res,async()=>{   
        const {ackno,hoa,status} = req.body;
        console.log(req.body);
        const eid = req.user.eid;
        console.log(eid);
        const check_query = `
        SELECT * FROM af where ackno = $1`;
        const results = await pool.query(check_query,[ackno]);
        if(results.rowCount>0)
        {
            res.json({status:true,message:"Already assigned"});
        }
        else{
        const query =`
        INSERT INTO af (ackno,eid,hoa,status,a_time)
        VALUES ($1, $2, $3, $4,$5)
        RETURNING *;`;
        // const aid = (ackno + employeeId)*0.0001;
        const currentTime = new Date();
        const currentOffset = currentTime.getTimezoneOffset();
        const ISTOffset = 330;   // IST offset UTC +5:30 
        const DateAndTime = new Date(currentTime.getTime() + (ISTOffset + currentOffset) * 60000);
        const values = [
            ackno,eid,hoa,status,DateAndTime
        ];
        console.log(values);
        const result = await pool.query(query,values);
        res.json({ status: true,success: result.rows });
        await pool.query('UPDATE faults SET status = $1 WHERE ackno = $2', [status, ackno]);}
        })
    
    }catch(err)
    {
        console.log(err);
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
            const query_s = `SELECT *
            FROM l1
            WHERE eid = $1
              AND a_status = $2;`
            const a_status = "Active";
            const results_s = await pool.query(query_s, [eid,a_status]);
            const results = await pool.query(query,[eid]);
            const profile = results.rows[0];
            const response = {
                eid:profile.eid,
                name:profile.name,
                phone:profile.phone,
                email:profile.email,
            }
            console.log(response);
            if(results_s.rowCount==1)
            {
                res.json({success:response,Active:"1"});
            }
            else
            {
                res.json({success:response,Active:"0"});
            }
            
        })
    }
    catch(err){
        console.log(err);

    }
}
exports.l1_request_page = async(req,res,next)=>{
    try{
        verifyToken(req,res,async()=>{
            console.log(req.user.eid);
            let eid = req.user.eid;
            const query = `
            SELECT af.ackno, af.status, af.a_time, f.description, f.device, f.station
            FROM af
            JOIN faults f ON af.ackno = f.ackno
            WHERE af.eid = $1
            AND af.status NOT IN ('Closed')
            ORDER BY af.a_time DESC;
            `
            const results = await pool.query(query,[eid]);
            const profile = results.rows;

           
            console.log(results.rowCount);
            if(results.rowCount==0)
            {
                res.json({success:"No data"});
            }
            else
            {
                res.json({success:profile});
            }
            
        })
    }
    catch(err){
        console.log(err);

    }
}
exports.l1_spare_request_page = async(req,res,next)=>{
    try{
        verifyToken(req,res,async()=>{
            console.log(req.user.eid);
            let eid = req.user.eid;
            const query = `
            SELECT af.ackno, af.status, af.a_time, f.description, f.device, f.station
            FROM af
            JOIN faults f ON af.ackno = f.ackno
            WHERE af.eid = $1
            AND af.status NOT IN ('Closed')
            ORDER BY af.a_time DESC;
            `
            const results = await pool.query(query,[eid]);
            const profile = results.rows;

           
            console.log(results.rowCount);
            if(results.rowCount==0)
            {
                res.json({success:"No data"});
            }
            else
            {
                res.json({success:profile});
            }
            
        })
    }
    catch(err){
        console.log(err);

    }
}
exports.l1_closed = async(req,res,next)=>{
    try{
        verifyToken(req,res,async()=>{
            const eid = req.user.eid;
            console.log(eid);
            const ackno = req.body.ackno;
            const query =`
            UPDATE af SET status = $1,c_time= $2 WHERE ackno = $3`;
            const hoa = "Self";
            const status = "Closed";
            const currentTime = new Date();
            const currentOffset = currentTime.getTimezoneOffset();
            const ISTOffset = 330;   // IST offset UTC +5:30 
            const DateAndTime = new Date(currentTime.getTime() + (ISTOffset + currentOffset) * 60000);
            const values = [
                status,DateAndTime,ackno
            ];
        console.log(values);
        const result = await pool.query(query,values);
        res.json({ status: true,success: 1 });
        await pool.query('UPDATE faults SET status = $1 WHERE ackno = $2', [status, ackno]);

        })

    }catch(err){
        console.log(err);
    }
}
exports.l1_spare = async(req,res,next)=>{
    try{
        verifyToken(req,res,async()=>{
            const eid = req.user.eid;
            console.log(eid);
            const ackno = req.body.ackno;
            const query =`
            UPDATE af SET status = $1,s_time= $2 WHERE ackno = $3`;
            const hoa = "Self";
            const status = "Spare Request";
            const currentTime = new Date();
            const currentOffset = currentTime.getTimezoneOffset();
            const ISTOffset = 330;   // IST offset UTC +5:30 
            const DateAndTime = new Date(currentTime.getTime() + (ISTOffset + currentOffset) * 60000);
            const values = [
                status,DateAndTime,ackno
            ];
        console.log(values);
        const result = await pool.query(query,values);
        res.json({ status: true,success: 1 });
        await pool.query('UPDATE faults SET status = $1 WHERE ackno = $2', [status, ackno]);

        })

    }catch(err){
        console.log(err);
    }
}
exports.l1_need = async(req,res,next)=>{
    try{
        verifyToken(req,res,async()=>{
            const eid = req.user.eid;
            console.log(eid);
            const ackno = req.body.ackno;
            const query =`
            UPDATE af SET status = $1,n_time= $2 WHERE ackno = $3`;
            const hoa = "Self";
            const status = "Need Support";
            const currentTime = new Date();
            const currentOffset = currentTime.getTimezoneOffset();
            const ISTOffset = 330;   // IST offset UTC +5:30 
            const DateAndTime = new Date(currentTime.getTime() + (ISTOffset + currentOffset) * 60000);
            const values = [
                status,DateAndTime,ackno
            ];
        console.log(values);
        const result = await pool.query(query,values);
        res.json({ status: true,success: 1 });
        await pool.query('UPDATE faults SET status = $1 WHERE ackno = $2', [status, ackno]);

        })

    }catch(err){
        console.log(err);
    }
}
exports.l1_in_progress = async(req,res,next)=>{
    try{
        verifyToken(req,res,async()=>{
            const eid = req.user.eid;
            console.log(eid);
            const u_latitude = req.body.latitude;
            const u_longitude = req.body.longitude;
            const station = req.body.station;
            const ackno = req.body.ackno;
            console.log(`User Latitude: ${u_latitude}`);
            console.log(`User Longitude: ${u_longitude}`);
            console.log(`Station: ${station}`);
            console.log(`Ackno: ${ackno}`);
            const query =`
            UPDATE af SET status = $1,i_time= $2 WHERE ackno = $3`;
            const hoa = "Self";
            const status = "In Progress";
            const currentTime = new Date();
            const currentOffset = currentTime.getTimezoneOffset();
            const ISTOffset = 330;   // IST offset UTC +5:30 
            const DateAndTime = new Date(currentTime.getTime() + (ISTOffset + currentOffset) * 60000);
            const values = [
                status,DateAndTime,ackno
            ];
        console.log(values);
        const query_sta = `
        SELECT latitude, longitude
        FROM stations
        WHERE station = $1;
        `;
        const result_sta = await pool.query(query_sta,[station]);
        // const db_latitude = result_sta.rows[0].latitude;
        // const db_longitude = result_sta.rows[0].longitude;
        // console.log(`DB Latitude: ${db_latitude}`);
        // console.log(`DB Longitude: ${db_longitude}`);
        // const distance = calculateDistance(u_latitude, u_longitude, db_latitude, db_longitude);
        const distance = 0.01;
        if(distance<0.1)
        {
            console.log("Allowed to make a change");
            const result = await pool.query(query,values);
            await pool.query('UPDATE faults SET status = $1 WHERE ackno = $2', [status, ackno]);
            res.json({ status: true,success: result.rowCount,distance:1 });
        }
        else
        {
            console.log("not allowed to make a change");
            const result = await pool.query(query,values);
            await pool.query('UPDATE faults SET status = $1 WHERE ackno = $2', [status, ackno]);
            res.json({ status: true,success: result.rowCount,distance:1 });
            // res.json({ status: true,success:0,distance:0 });
        }
        console.log(`Distance between user and station: ${distance} km`);
        
        
        })

    }catch(err){
        console.log(err);
    }
}
function calculateDistance(userLatitude, userLongitude, stationLatitude, stationLongitude) {
    const earthRadius = 6371; 

    
    const userLatRad = toRadians(userLatitude);
    const userLonRad = toRadians(userLongitude);
    const stationLatRad = toRadians(stationLatitude);
    const stationLonRad = toRadians(stationLongitude);

    
    const latDiff = stationLatRad - userLatRad;
    const lonDiff = stationLonRad - userLonRad;

    
    const a = Math.sin(latDiff / 2) * Math.sin(latDiff / 2) +
              Math.cos(userLatRad) * Math.cos(stationLatRad) *
              Math.sin(lonDiff / 2) * Math.sin(lonDiff / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    
    const distance = earthRadius * c;

    return distance;
}

function toRadians(degrees) {
    return degrees * (Math.PI / 180);
}
exports.l1_spare_assign = async(req,res,next)=>{
    try{
        verifyToken(req,res,async()=>{   
        const {ackno,hoa,status} = req.body;
        console.log(req.body);
        const eid = req.user.eid;
        const check_query = `
        SELECT * FROM af where ackno = $1 AND status = 'Assigned'`;
        const results = await pool.query(check_query,[ackno]);
        console.log(results.rowCount);
        if(results.rowCount>0)
        {
            res.json({status:true,message:"Already assigned"});
        }
        else{
        const query =`
        UPDATE af set spare_taken_eid = $1 WHERE ackno = $2
        `;
        const query2 =`
        UPDATE af set spare_taken = $1 WHERE ackno = $2
        `;
        const query3 = `
        UPDATE af set status = $1 WHERE ackno = $2
        `
        const query4 = `
        UPDATE assigned_spare set status = $1 WHERE ackno = $2
        `
        const query5 =
        `
        UPDATE afs set status = $1 WHERE ackno = $2
        `
        // const aid = (ackno + employeeId)*0.0001;
        const currentTime = new Date();
        const currentOffset = currentTime.getTimezoneOffset();
        const ISTOffset = 330;   // IST offset UTC +5:30 
        const DateAndTime = new Date(currentTime.getTime() + (ISTOffset + currentOffset) * 60000);
        const values = [
            eid,ackno
        ];
        const result = await pool.query(query,[eid,ackno]);
        const results = await pool.query(query2,[DateAndTime,ackno]);
        await pool.query(query3,[status,ackno]);
        await pool.query(query4,[status,ackno]);
        await pool.query(query5,[status,ackno]);
        await pool.query('UPDATE faults SET status = $1 WHERE ackno = $2', [status, ackno]);
        res.json({ status: true,success: 1 });
        }
        })
    
    }catch(err)
    {
        console.log(err);
    }
}