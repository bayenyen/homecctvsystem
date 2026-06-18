const express = require('express');
const router = express.Router();
const { getUsers, getUser, createUser, updateUser, deleteUser, resetUserPassword } = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect, authorize('admin'));
router.get('/', getUsers);
router.get('/:id', getUser);
router.post('/', createUser);
router.put('/:id', updateUser);
router.delete('/:id', deleteUser);
router.put('/:id/reset-password', resetUserPassword);

module.exports = router;
