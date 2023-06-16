const { Router } = require('express');
const { db } = require('./firebase');

// Create an instance of the Express router
const router = Router();

// Define your API endpoints
router.get('/getIsPsychiatrist', async (req, res) => {
    try {
        const userId = req.query.userId; // Get the user ID from the request query parameters
        const userRef = db.collection('User').doc(userId);
        const documentSnapshot = await userRef.get();
        const isPsychiatrist = documentSnapshot.get('isPsychiatrist');
        res.json({ isPsychiatrist });
      } catch (error) {
        console.error('Error retrieving user data from Firestore:', error);
        res.status(500).json({ error: 'Failed to retrieve user data' });
      }
});

router.post('/createUserChatMessage', async (req, res) => {
    try {
        console.log(req.body)
        const { userId, text } = req.body;
    
        const chatMessage = db.collection('ChatMessage');
        await chatMessage.add({
          isRead: false,
          sendAt: new Date(),
          senderId: userId,
          text: text,
          userId: userId,
        });
    
        res.status(200).json({ message: 'Message sent successfully' });
      } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({ error: 'Failed to send message' });
      }
});

// Export the router
module.exports = router;
