const express = require('express');
const router = express.Router();

const userController = require('../controllers/user.controller');
const { validateSchema } = require('../middleware/validate.middleware');
const { updateProfileSchema } = require('../schemas/user.schema');

router.get('/', userController.getProfile);
router.put('/', validateSchema(updateProfileSchema), userController.updateProfile);

module.exports = router;
