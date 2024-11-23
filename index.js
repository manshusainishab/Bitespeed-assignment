const express = require('express');
require('dotenv').config();
const pool = require('./db.js');

const app = express();
app.use(express.json());

app.post('/identify', async (req, res) => {
    try {
        const { email, phoneNumber } = req.body;

        if (!email && !phoneNumber) {
            return res.status(400).json({ error: 'Email or phoneNumber is required' });
        }

        const [exist] = await pool.query(
            'SELECT * FROM Contacts WHERE phoneNumber = ? OR email = ?',
            [phoneNumber, email]
        );

        if (exist.length > 0) {
            const primaryIdList = exist.filter((item)=> item.linkPrecedence == 'primary');

            if (primaryIdList.length <= 1){
                const primaryId = exist[0].linkedId == null ? exist[0].id : exist[0].linkedId;
                const isDuplicate = exist.find((item) => item.email === email && item.phoneNumber == phoneNumber);

                if (!isDuplicate){
                    await pool.query(
                        'INSERT INTO Contacts (linkPrecedence, linkedId, email, phoneNumber) VALUES (?, ?, ?, ?)',
                        ['secondary', primaryId, email, phoneNumber]
                    );
                }

                const [allContacts] = await pool.query('select * from Contacts where id = ? or linkedId = ?',[primaryId,primaryId]);
                const emails = [... new Set([
                    allContacts.find((item)=> item.id == primaryId).email,...allContacts.filter((item)=> item.id != primaryId).map((item) => item.email ).filter(Boolean)
                ])];
                const phoneNumbers = [... new Set([
                    allContacts.find((item)=> item.id == primaryId).phoneNumber,...allContacts.filter((item)=> item.id != primaryId).map((item) => item.phoneNumber).filter(Boolean)
                ])];
                const secondaryContactIds = allContacts
                    .filter((item) => item.id !== primaryId)
                    .map((item) => item.id);

                return res.status(201).json({
                    contact: {
                        primaryContactId: primaryId,
                        emails,
                        phoneNumbers,
                        secondaryContactIds,
                    },
                });
            }else {
                const primaryId = exist.find((item)=> item.linkPrecedence == 'primary').id;
                const isupdating = [false];
                for (let i = 0; i < exist.length; i++){
                    if (exist[i].linkPrecedence == 'primary' && exist[i].id != primaryId){
                        isupdating[0] = true
                        const updateit = exist[i].id
                        await pool.query(
                            'UPDATE Contacts SET linkPrecedence = ?, linkedId = ? WHERE id = ?',
                            ['secondary', primaryId, updateit]
                        )
                    }
                }
                if (!isupdating[0]){
                    const isDuplicate = exist.find((item) => item.email == email && item.phoneNumber == phoneNumber);

                    if (!isDuplicate){
                        await pool.query(
                            'INSERT INTO Contacts (linkPrecedence, linkedId, email, phoneNumber) VALUES (? , ?, ?, ?)',
                            ['secondary', primaryId, email, phoneNumber]
                        )
                    }
                }
                const [allContacts] = await pool.query('select * from Contacts where id = ? or linkedId = ?',[primaryId,primaryId]);
                const emails = [... new Set([
                    allContacts.find((item)=> item.id == primaryId).email,...allContacts.filter((item)=> item.id != primaryId).map((item) => item.email ).filter(Boolean)
                ])];
                const phoneNumbers = [... new Set([
                    allContacts.find((item)=> item.id == primaryId).phoneNumber,...allContacts.filter((item)=> item.id != primaryId).map((item) => item.phoneNumber).filter(Boolean)
                ])];
                const secondaryContactIds = allContacts
                    .filter((item) => item.id !== primaryId)
                    .map((item) => item.id);

                return res.status(201).json({
                    contact: {
                        primaryContactId: primaryId,
                        emails,
                        phoneNumbers,
                        secondaryContactIds,
                    },
                });
            }
        } else {
            const result = await pool.query(
                'INSERT INTO Contacts (linkPrecedence, email, phoneNumber) VALUES (?, ?, ?)',
                ['primary', email, phoneNumber]
            );
            const newId = result[0].insertId;
            return res.status(201).json({
                contact: {
                    primaryContactId: newId,
                    emails: [email].filter(Boolean),
                    phoneNumbers: [phoneNumber].filter(Boolean),
                    secondaryContactIds: [],
                },
            });
        }
    } catch (err) {
        console.error('Error in /identify:', err.message);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
