const pool = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
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
}

exports.login = async (req, res, next) => {
    try {
        const eid = req.body.employeeId;
        const password = req.body.password;

        const eidQuery = "SELECT * FROM l1 WHERE eid = $1 AND role = 'field'";
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
    } catch (error) {
        console.error('Error in login:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};
exports.punch = async(req,res,next)=>{
    try{
        const eid = req.body.eid;
        const query = `UPDATE l1 SET a_status = $1 WHERE eid = $2 `;
        const status = "Active";
        const results = await pool.query(query,[status,eid]);
        res.json({status:true,success:results.rowCount});

    }catch(err){
        console.log(err);
    }
}
exports.punchOut = async(req,res,next)=>{
    try{
        const eid = req.body.eid;
        const query = `UPDATE l1 SET a_status = $1 WHERE eid = $2 `;
        const status = "Inactive";
        const results = await pool.query(query,[status,eid]);
        res.json({status:true,success:results.rowCount});

    }catch(err){
        console.log(err);
    }
}