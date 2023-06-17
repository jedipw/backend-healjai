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

router.get('/getUserChat', async (req, res) => {
    try {
      const { tagNumber, isPsychiatrist, currentUserId } = req.query;

      const isPsychiatristBool = isPsychiatrist === 'true';
  
      const formatDate = (timestamp) => {
        const dateTime = timestamp.toDate();
  
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  
        if (
          dateTime.getFullYear() === today.getFullYear() &&
          dateTime.getMonth() === today.getMonth() &&
          dateTime.getDate() === today.getDate()
        ) {
          return 'Today';
        } else if (
          dateTime.getFullYear() === yesterday.getFullYear() &&
          dateTime.getMonth() === yesterday.getMonth() &&
          dateTime.getDate() === yesterday.getDate()
        ) {
          return 'Yesterday';
        } else {
          const formatter = new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' });
          return formatter.format(dateTime);
        }
      };
  
      let userId = '';
      if (tagNumber === '') {
        userId = currentUserId;
      } else {
        const userTagNumber = db.collection('UserTagNumber');
        const getUserTagNumber = await userTagNumber.where('userTagNumber', '==', tagNumber).get();
        userId = getUserTagNumber.docs[0].id;
      }
  
      const chatMessage = db.collection('ChatMessage');
      const chatData = await chatMessage
        .where('userId', '==', userId)
        .orderBy('sendAt', 'desc')
        .get();
  
      const numberOfChats = chatData.docs.length;
      const userChatMessageData = [];
  
      for (let i = 0; i < numberOfChats; i++) {
        const data = chatData.docs[i].data();
        const read = data.isRead;
        const message = data.text;
        const rawTime = data.sendAt.toDate();
        const time = rawTime.toLocaleTimeString([], { hour: 'numeric', minute: 'numeric' });
        const date = formatDate(data.sendAt);
        const senderUserId = data.senderId;
        let profilePic = '';
        let sender = '';
  
        if (isPsychiatristBool) {
          if (senderUserId === userId) {
            sender = 'User';
          } else if (currentUserId === senderUserId) {
            sender = 'UserA';
          } else {
            const psychiatristProfile = db.collection('PsychiatristProfile');
            const senderInfo = await psychiatristProfile.where('userId', '==', senderUserId).get();
            const senderData = senderInfo.docs[0].data();
            sender = `${senderData.namePrefix} ${senderData.name}`;
            profilePic = senderData.pictureURL;
          }
        } else if (!isPsychiatristBool) {
          if (senderUserId === userId) {
            sender = 'UserA';
          } else {
            const psychiatristProfile = db.collection('PsychiatristProfile');
            const senderInfo = await psychiatristProfile.where('userId', '==', senderUserId).get();
            const senderData = senderInfo.docs[0].data();
            sender = `${senderData.namePrefix} ${senderData.name}`;
            profilePic = senderData.pictureURL;
          }
        }
  
        userChatMessageData.push({
          message,
          sender,
          time,
          date,
          read,
          profilePic,
        });
  
        if (
          ((isPsychiatristBool && senderUserId === data.userId) ||
            (!isPsychiatristBool && senderUserId !== data.userId)) &&
          !read
        ) {
          await chatMessage.doc(chatData.docs[i].id).update({
            isRead: true,
          });
        }
      }
  
      res.status(200).json(userChatMessageData);
    } catch (error) {
      console.error('Error getting user chat:', error);
      res.status(500).json({ error: 'Failed to get user chat' });
    } 
  });

  router.get('/getAllChat', async (req, res) => {
    try {
      const { currentUserId } = req.query;
  
      const formatDate = (timestamp) => {
        if (!timestamp) {
          return ''; // Return an empty string if the timestamp is undefined
        }
  
        const dateTime = timestamp.toDate();
  
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  
        if (
          dateTime.getFullYear() === today.getFullYear() &&
          dateTime.getMonth() === today.getMonth() &&
          dateTime.getDate() === today.getDate()
        ) {
          const formatter = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: 'numeric' });
          return formatter.format(dateTime); // Format: 11:20 PM
        } else if (
          dateTime.getFullYear() === yesterday.getFullYear() &&
          dateTime.getMonth() === yesterday.getMonth() &&
          dateTime.getDate() === yesterday.getDate()
        ) {
          return 'Yesterday';
        } else if (now.getTime() - dateTime.getTime() <= 7 * 24 * 60 * 60 * 1000) {
          const formatter = new Intl.DateTimeFormat('en-US', { weekday: 'long' });
          return formatter.format(dateTime); // Format: Saturday
        } else {
          const formatter = new Intl.DateTimeFormat('en-US', { day: 'numeric', month: 'numeric' });
          return formatter.format(dateTime); // Format: 22/5
        }
      };
  
      const chatMessage = db.collection('ChatMessage');
      const snapshot = await chatMessage.orderBy('sendAt', 'desc').get();

      const userIds = [];
      const allChats = [];
  
      console.log('test');
      for (const doc of snapshot.docs) {
        const userId = doc.data()['userId'];
        const senderUserId = doc.data()['senderId'];
        let isRead = doc.data()['isRead'];
        const sendAt = doc.data()['sendAt'];
        const time = formatDate(sendAt);
        let rawMessage = doc.data()['text'];
        const userTagNumber = db.collection('UserTagNumber');
        const getUser = await userTagNumber.doc(userId).get();
        const tagNumber = getUser.data()['userTagNumber'];
        const userName = `User #${tagNumber}`;
        let sender = '';
        let message = '';
  
        if (senderUserId === userId) {
          sender = `User #${tagNumber}`;
        } else if (senderUserId === currentUserId) {
          sender = 'UserA';
        } else {
          const psychiatristProfile = db.collection('PsychiatristProfile');
          const senderInfo = await psychiatristProfile.where('userId', '==', senderUserId).get();
          const senderData = senderInfo.docs[0].data();
          sender = `${senderData.namePrefix} ${senderData.name}`;
        }
  
        if (!userIds.includes(userId)) {
          userIds.push(userId);
          if (rawMessage.length > 25 && (sender === userName || senderUserId === currentUserId)) {
            message = `${rawMessage.substring(0, 25)}...`;
          } else if (rawMessage.length > 10 && sender !== userName) {
            message = `${rawMessage.substring(0, 10)}...`;
          } else {
            message = rawMessage;
          }
          allChats.push({
            userName,
            sender,
            message,
            time,
            isRead,
            userId,
          });
        }
      }
  
      res.status(200).json(allChats);
    } catch (error) {
      console.error('Error getting all chat:', error);
      res.status(500).json({ error: 'Failed to get all chat' });
    }
  });
  
// Export the router
module.exports = router;
