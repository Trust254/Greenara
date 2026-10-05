const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// In-Memory State
let db = {
    users: [
        { username: "0712345678", password: "password123", balance: 30, levelsUnlocked: [1], status: "Active" }
    ],
    activationRequests: [],
    withdrawalRequests: [],
    complaints: []
};

// Root route so visiting the Render URL directly shows it's working
app.get('/', (req, res) => {
    res.send('Greenara Backend is Live and Running!');
});

// 1. Register Endpoint
app.post('/api/register', (req, res) => {
    const { username, password } = req.body;
    let existing = db.users.find(u => u.username === username);
    if (existing) {
        return res.status(400).json({ success: false, message: "Username/Phone already registered. Please Login." });
    }
    const newUser = { username, password, balance: 30, levelsUnlocked: [1], status: "Active" };
    db.users.push(newUser);
    res.json({ success: true, user: newUser });
});

// 2. Login Endpoint
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    let user = db.users.find(u => u.username === username && u.password === password);
    if (!user) {
        return res.status(400).json({ success: false, message: "Invalid mobile number/username or password." });
    }
    res.json({ success: true, user });
});

// 3. Get User Data & State Sync
app.get('/api/state/:username', (req, res) => {
    let user = db.users.find(u => u.username === req.params.username);
    if (!user) return res.status(404).json({ success: false });
    res.json({
        success: true,
        user,
        activationRequests: db.activationRequests,
        withdrawalRequests: db.withdrawalRequests,
        complaints: db.complaints
    });
});

// 4. Submit Activation Request
app.post('/api/activation', (req, res) => {
    db.activationRequests.push(req.body);
    res.json({ success: true });
});

// 5. Submit Withdrawal Request
app.post('/api/withdrawal', (req, res) => {
    db.withdrawalRequests.push(req.body);
    let user = db.users.find(u => u.username === req.body.user);
    if (user) user.balance -= req.body.amount;
    res.json({ success: true, balance: user ? user.balance : 0 });
});

// 6. Submit Complaint
app.post('/api/complaint', (req, res) => {
    db.complaints.push(req.body);
    res.json({ success: true });
});

// 7. Admin: Approve Activation & Credit User
app.post('/api/admin/approve', (req, res) => {
    const { index } = req.body;
    let reqObj = db.activationRequests[index];
    if (reqObj && reqObj.status === 'Pending') {
        reqObj.status = 'Approved';
        let targetUser = db.users.find(u => u.username === reqObj.user);
        if (targetUser) {
            targetUser.balance += reqObj.depositFee;
            if (reqObj.level.includes("Level")) {
                let match = reqObj.level.match(/Level (\d+)/);
                if (match) {
                    let lvlId = parseInt(match[1]);
                    if (!targetUser.levelsUnlocked.includes(lvlId)) {
                        targetUser.levelsUnlocked.push(lvlId);
                    }
                }
            }
        }
    }
    res.json({ success: true, activationRequests: db.activationRequests, users: db.users });
});

// 8. Admin: Process Payout
app.post('/api/admin/payout', (req, res) => {
    const { index } = req.body;
    if (db.withdrawalRequests[index]) {
        db.withdrawalRequests[index].status = 'Success';
    }
    res.json({ success: true, withdrawalRequests: db.withdrawalRequests });
});

// 9. Admin: Resolve Complaint
app.post('/api/admin/resolve-complaint', (req, res) => {
    const { index } = req.body;
    db.complaints.splice(index, 1);
    res.json({ success: true, complaints: db.complaints });
});

// 10. Get Full Admin Dashboard Data
app.get('/api/admin/data', (req, res) => {
    res.json({
        users: db.users,
        activationRequests: db.activationRequests,
        withdrawalRequests: db.withdrawalRequests,
        complaints: db.complaints
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Greenara Backend running on port ${PORT}`));
