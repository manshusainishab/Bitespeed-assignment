const mysql = require('mysql2');

const pool = mysql.createPool({
    host: 'localhost',
    user: process.env.MysqlUsername,
    password: process.env.Password,
    database: 'Bitespeed'
});

pool.getConnection((err, connection) => {
    if (err) {
        console.error('Error connecting to the database:', err.message);
        return;
    }
    console.log('Connected to MySQL server.');
    connection.release();
});

module.exports = pool.promise();