const express = require('express');
const router = express.Router();
const syncController = require('../controllers/syncController');
const { authMiddleware } = require('../middleware/authMiddleware');

router.use(authMiddleware);

router.post('/upload', syncController.upload);
router.get('/download', syncController.download);
router.post('/confirm', syncController.confirm);

module.exports = router;
