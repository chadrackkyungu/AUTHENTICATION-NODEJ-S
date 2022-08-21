const express = require('express');
const { signUp, login, forgotPassword, resetPassword, protect, updatePassword, restrictTo, logout, isLoggedIn } = require('./../controllers/authController');
const { getAllUsers, updateMe, deleteMe, getUser, updateUser, deleteUser, getMe } = require('./../controllers/userController');
const { uploadUserPhoto, resizeUserPhoto } = require('./../controllers/imageController')

const router = express.Router();


//![1] AUTHENTICATION
router.post('/signup', signUp);
router.post('/login', login);
router.post('/logout', protect, logout);
router.post('/isLoggedIn', isLoggedIn);

//* Note, this 2 route will update the user password if he/she can't login to the system because he/she forget the password
router.post('/forgotPassword', forgotPassword);
router.patch('/resetPassword/:token', resetPassword);
//END



//![2] USER PROFILE(ACCOUNT) MANAGED
//* if the user eat this routes he/she will update the password while he's already logged in into the system
//* WHAT A USER WHO HAS LOGIN CAN DO, he can update pass, update his information, he can also delete his account

router.get('/me', protect, getMe, getUser) //USER GET HIS DETAILS / INFORMATION
router.patch('/updateMyPassword', protect, updatePassword);
router.patch('/updateMe',
    protect,
    uploadUserPhoto,
    resizeUserPhoto,
    updateMe,
);
router.delete('/deleteMe', protect, deleteMe);
//END



//![3] THE ADMIN MANAGING ALL HIS USERS THIS MEANS 
//? NOTE : THE <restrictTo('admin')> MIDDLEWARE MEANS ONLY ADMIN CAN HAVE ACCESS TO THAT APIs
//Note: you can allow multiple roles => restrictTo('admin', 'guide')

// *he can get all users, get user by ID, update user by ID, delete user by ID*
router.route('/').get(protect, restrictTo('admin'), getAllUsers)

//*get the user, update user, and delete user using the user ID
router
    .route('/:id')
    .get(protect, restrictTo('admin'), getUser)
    .patch(
        protect,
        restrictTo('admin'),
        uploadUserPhoto, //incase the admin has to update the user photo so u add this to the API
        resizeUserPhoto,
        updateUser)
    .delete(protect, restrictTo('admin'), deleteUser);
//END

module.exports = router