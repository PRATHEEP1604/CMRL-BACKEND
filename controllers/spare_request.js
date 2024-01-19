const pool = require('../config/db');
const bcrypt = require('bcrypt');
const { query } = require('express');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const verifyToken = (req,res,next)=>{
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];
    console.log(token);
    if(!token)
    {
        return res.status(200).json({message:"Unauthorized: No token provided"});
    }
    jwt.verify(token,process.env.JWT_ACCESS_TOKEN,(err,decoded)=>{
        if(err)
        {
            return res.status(200).json({message:"Unauthorized: Invalid token"});
        }
        req.user = decoded;
        next();
    })
}
exports.zje_afs = async(req,res,next)=>{
try{
    verifyToken(req,res,async()=>{
    const eid = req.user.eid;
    const eid_query = await pool.query('SELECT name FROM je WHERE eid = $1',[eid]);
    const name = eid_query.rows[0].name;
    const result = await pool.query('SELECT nextval($1::regclass) as counter', ['mr_id']);
    const counter = result.rows[0].counter;
    const mr_id = generateString(counter);
    const currentTime = new Date();
        const currentOffset = currentTime.getTimezoneOffset();
        const ISTOffset = 330;   // IST offset UTC +5:30 
    const DateAndTime = new Date(currentTime.getTime() + (ISTOffset + currentOffset) * 60000);
    const ackno = req.body.ackno;
    const des = req.body.des;
    const fsno = req.body.fsno;
    const need_spare = req.body.need_spare;
    const sle_name = req.body.sle_name;
    const sle_no = req.body.sle_no;
    const station = req.body.station;
    const unit = req.body.unit;
    const status = 'pending_sr';
    const request_type = 'against faulty spare'
    const insert_query = `
    INSERT INTO afs(ackno,description,fsno,mr_id,need_spare,por,sle_name,sle_no,station,time,unit,request_type,status) 
    values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *;
    `
    const values = [
        ackno,des,fsno,mr_id,need_spare,name,sle_name,sle_no,station,DateAndTime,unit,request_type,status
    ]

    const insert_result = await pool.query(insert_query,values);
    await pool.query('UPDATE faults SET status = $1 WHERE ackno = $2', [status, ackno]);
    await pool.query('UPDATE af SET status = $1 WHERE ackno = $2',[status,ackno])
    await pool.query('UPDATE af SET pending_sr_time = $1 WHERE ackno = $2',[DateAndTime,ackno])
    res.json({status:true,success:1})
    });
}catch(err)
{
    console.log(err);
}
}
function generateString(counter) {
    const resultString = `R${counter.toString().padStart(4, '0')}`;
    return resultString;
}
exports.afs_view = async(req,res,next)=>{
    try{
        const query = `
        SELECT * FROM afs WHERE status <> 'closed';
        `
        const values = await pool.query(query);
        res.json({status:true,success:values.rows});

    }catch(err)
    {
        console.log(err);
    }
}
exports.request_assign = async(req,res,next)=>{
    try{
        verifyToken(req,res,async()=>{
        const eid = req.user.eid;
        const currentTime = new Date();
        const currentOffset = currentTime.getTimezoneOffset();
        const ISTOffset = 330;   // IST offset UTC +5:30 
                const DateAndTime = new Date(currentTime.getTime() + (ISTOffset + currentOffset) * 60000);
        const mr_id = req.body.mr_id;
        const role = 'store';
        const query = 'SELECT ackno from afs where mr_id = $1';
        const query2 = 'SELECT name from l1 where eid = $1 and role = $2';
        const values2 = await pool.query(query2,[eid,role])
        const values = await pool.query(query,[mr_id]);
        const ackno = values.rows[0].ackno;
        const name = values2.rows[0].name;
        const status = 'spare_assigned';
        const sle_no = req.body.sle_no;
        const sno = req.body.sno;
        const spare_name = req.body.spare_name;
        const station = req.body.station;
        const check_query = `
        SELECT * FROM assigned_spare WHERE mr_id = $1
        `
        const check = await pool.query(check_query,[mr_id]);
        if(check.rowCount>0)
        {
            res.json({message:"Already assigned"});
        }
        else{
        const insert = `
        INSERT INTO assigned_spare(ackno,hoa,mr_id,sle_no,sno,spare_name,station,status,time) 
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *;
        `
        const elements = [
            ackno,name,mr_id,sle_no,sno,spare_name,station,status,DateAndTime
        ]
        const insert_query = await pool.query(insert,elements);
        const faults = `
        UPDATE faults set status = $1 where ackno = $2
        `
        const af = `
        UPDATE af set status = $1 where ackno = $2
        `
        const af_time = `
        UPDATE af set as_time = $1 where ackno = $2
        `
        const afs = `
        UPDATE afs set status = $1 where ackno = $2
        `
        await pool.query(faults,[status,ackno]);
        await pool.query(af,[status,ackno]);
        await pool.query(af_time,[DateAndTime,ackno]);
        await pool.query(afs,[status,ackno]);

        res.json({success:1});
    }
    })
    }catch(err)
    {
        console.log(err);
    }
}
exports.view_assigned_spare = async(req,res,next)=>{
    verifyToken(req,res,async()=>{
        try{
            const eid = req.user.eid;
            const role = 'store';
            const status = "spare_assigned"
            const view_query = `
                SELECT * FROM assigned_spare where status = $1;
            `
            const view_result = await pool.query(view_query,[status]);
            res.json({success:view_result.rows});


        }catch(err)
        {
            console.log(err);
        }

    })
}
exports.request_handover = async(req,res,next)=>{
    try{
        verifyToken(req,res,async()=>{
        const eid = req.user.eid;
        const currentTime = new Date();
        const currentOffset = currentTime.getTimezoneOffset();
        const ISTOffset = 330;   // IST offset UTC +5:30 
                const DateAndTime = new Date(currentTime.getTime() + (ISTOffset + currentOffset) * 60000);
        const mr_id = req.body.mr_id;
        const location = req.body.location;
        const role = 'store';
        const query = 'SELECT ackno from afs where mr_id = $1';
        const query2 = 'SELECT name from l1 where eid = $1 and role = $2';
        const values2 = await pool.query(query2,[eid,role])
        const values = await pool.query(query,[mr_id]);
        const ackno = values.rows[0].ackno;
        const name = values2.rows[0].name;
        const status = 'handover';
        const faults = `
        UPDATE faults set status = $1 where ackno = $2
        `
        const af = `
        UPDATE af set status = $1 where ackno = $2
        `
        const af_time = `
        UPDATE af set handover_time = $1 where ackno = $2
        `
        const afs = `
        UPDATE afs set status = $1 where ackno = $2
        `
        const assigned_spare = `UPDATE assigned_spare set hoh = $1 where ackno = $2`
        const assigned_spare_status = `UPDATE assigned_spare set status = $1 where ackno = $2`
        const assigned_spare_location = `UPDATE assigned_spare set moved_location = $1 where ackno = $2`
        await pool.query(assigned_spare_status,[status,ackno]);
        await pool.query(assigned_spare,[name,ackno]);
        await pool.query(assigned_spare_location,[location,ackno]);
        await pool.query(faults,[status,ackno]);
        await pool.query(af,[status,ackno]);
        await pool.query(af_time,[DateAndTime,ackno]);
        await pool.query(afs,[status,ackno]);

        res.json({success:1});
    
    })
    }catch(err)
    {
        console.log(err);
    }
}
exports.dashboard=async(req,res,next)=>{
    
    try{
    verifyToken(req,res,async()=>{ 
    const query = `
    SELECT status FROM faults;
    `
    const query2 = 
    `
       SELECT * FROM afs WHERE request_type = 'against faulty spare' AND status <> 'closed';
    `
    const values2 = await pool.query(query2);
    const afs_count = values2.rowCount;
    const query3 = 
    `
       SELECT * FROM afs WHERE request_type = 'non operational' AND status <> 'closed';
    `
    const values3 = await pool.query(query3);
    const non_count = values3.rowCount;
    const results = await pool.query(query);
    const values = results.rows;
    let pr_count =0;
    let ho_count=0;
    let c_count=0;
    let as_count=0; 
    values.forEach(element => {
        if(element.status == "Closed")
        {
            c_count++;
        }
       else if(element.status == "pending_sr")
        {
            pr_count++;
        }
        else if(element.status =="handover")
        {
            ho_count++;
        }
        else if(element.status == "spare_assigned")
        {
            as_count++ ;
        }        
    });
    const response = [{
    "c_count":c_count,
    "pr_count":pr_count,
    "ho_count":ho_count,
    "as_count":as_count,
    "afs_count":afs_count,
    "non_count":non_count

}];
   res.json({status:true,success:response});
    });
}catch(err)
{
    console.log(err);
    res.status(500).json({status:false,message:"Internal Server Error"});
}

}