const express = require('express');
const router = express.Router();
const personasController = require('../controllers/personasController');
const { authMiddleware } = require('../middleware/authMiddleware');

router.use(authMiddleware);

router.get('/', personasController.list);
router.get('/:uuid', personasController.getOne);
router.post('/', personasController.create);
router.put('/:uuid', personasController.update);
router.delete('/:uuid', personasController.remove);

module.exports = router;
