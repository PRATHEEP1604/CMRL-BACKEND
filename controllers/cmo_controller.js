const pool = require('../config/db');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
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

exports.cmo_login = async(req,res,next)=>{
    try{
        const eid = req.body.eid;
        const password = req.body.password;

        const eidQuery = 'SELECT * FROM cmo WHERE eid = $1';
        const user = await pool.query(eidQuery, [eid]);
       

        if (!user.rowCount) {
            return res.status(200).json({ message: 'EID not found' });
        }

        const hashedPasswordFromDB = user.rows[0].password;

        try {
            const passwordMatch = await bcrypt.compare(password, hashedPasswordFromDB);

            if (passwordMatch) {
                const token = jwt.sign({ eid: user.rows[0].eid }, process.env.JWT_ACCESS_TOKEN, { expiresIn: '30d' });
                return res.status(200).json({ message: 'Login successful', token });
            } else {
                // Passwords do not match
                return res.status(200).json({ message: 'Invalid password' });
            }
        } catch (bcryptError) {
            console.error('Error comparing passwords with Bcrypt:', bcryptError);
            return res.status(500).json({ message: 'Internal Server Error' });
        }

    }catch(err)
    {
        console.log(err);
    }
}
exports.cmo_view = async (req, res, next) => {
    try {
        verifyToken(req,res,async()=>{
            const results = await pool.query("SELECT * FROM faults");
            res.json({ status: true, success: results.rows });
        });
    } catch (err) {
        console.log(err);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};
exports.cmo_assign = async(req,res,next)=>{
    try{
        const ackno= req.body.ackno;
        const employeeId= req.body.eid;
        const hoa = "CMO";
        const status = "Assigned";
        const query =`
        INSERT INTO af (ackno,eid,hoa,status,a_time)
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
       res.json({ status: true, success: 1 });
        await pool.query('UPDATE faults SET status = $1 WHERE ackno = $2', [status, ackno]);
       
    }catch(err)
    {
        console.log(err);
    }
}
exports.cmo_ackno = async (req, res, next) => {
    try {
        
        const ackno = req.body.ackno;
        const query = `
        SELECT
            a_time AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata' AS a_time_ist,
            i_time AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata' AS i_time_ist,
            c_time AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata' AS c_time_ist,
            s_time AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata' AS s_time_ist,
            n_time AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata' AS n_time_ist,
            pending_sr_time AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata' AS pending_time_ist,
            as_time AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata' AS as_time_ist,
            handover_time AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata' AS handover_time_ist,
            * 
        FROM af 
        WHERE ackno = $1;
        `;
        const results = await pool.query(query, [ackno]);

        // Assuming you want to send the IST time along with the rest of the data
        const responseData = {
            status: true,
            success: results.rows[0],
        };

        res.json(responseData);
  
    } catch (err) {
        console.error(err);
        res.status(500).json({ status: false, error: 'Internal Server Error' });
    }
};
exports.dashboard=async(req,res,next)=>{
    
    try{
    verifyToken(req,res,async()=>{ 
    const query = `
    SELECT status FROM faults;
    `
    const results = await pool.query(query);
    const values = results.rows;
    let c_count =0;
    let o_count=0;
    let a_count=0;
    let sr_count=0;
    let ns_count=0;
    let in_count=0;
    values.forEach(element => {
        if(element.status == "Closed")
        {
            c_count++;
        }
       else if(element.status == "Open")
        {
            o_count++;
        }
        else if(element.status =="In Progress")
        {
            in_count++;
        }
        else if(element.status == "Spare Request")
        {
            sr_count++;
        }
        else if(element.status =="Need Support")
        {
            ns_count++;
        }
        else if(element.status == "Assigned")
        {
            a_count++;
        }
        
    });
    const response = [{
    "c_count":c_count,
    "o_count":o_count,
    "a_count":a_count,
    "ns_count":ns_count,
    "in_count":in_count,
    "sr_count":sr_count
}];
   res.json({status:true,success:response});
    });
}catch(err)
{
    console.log(err);
    res.status(500).json({status:false,message:"Internal Server Error"});
}

}
exports.cmo_profile_page = async(req,res,next)=>{
    try{
        verifyToken(req,res,async()=>{
            console.log(req.user.eid);
            const eid = req.user.eid;
            const query = `
            SELECT * FROM cmo WHERE eid = $1
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
            res.json({success:response});
            
            
        })
    }
    catch(err){
        console.log(err);

    }
}