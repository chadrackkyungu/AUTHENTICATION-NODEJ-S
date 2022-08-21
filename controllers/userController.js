/*========================================================
    *THIS ROUTES, IT'S MORE OF YOU THE USER/ADMIN TO 
    UPDATE YOUR ACCOUNT, GET ALL USERS IF IT AN ADMIN*
===========================================================*/

const User = require('./../models/userModel');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');
const { getAll, getOne, updateOne, deleteOne } = require('./handleFactory');


const filterObj = (obj, ...allowedFields) => {
    const newObj = {};
    Object.keys(obj).forEach(el => {
        if (allowedFields.includes(el)) newObj[el] = obj[el];
    });
    return newObj;
};


// USER ACTIONS/RIGHT ON HIS ACCOUNT
//* (1) THE *USER* GETTING HIS DETAILS AFTER HE/SHE HAS LOGGED IN INTO OUR SYSTEM
//NOTE: //=> req.user.id; THIS ID i'm getting it from <protect> middleware => router.get('/me', protect, getMe, getUser) if i remove protect on the middleware it will not return me the user details
exports.getMe = (req, res, next) => {
    req.params.id = req.user.id;
    next();
};



//* (2) *USER* CAN UPDATE HIS PROFILE/ACCOUNT
//*Ex: [name, email picture ect..] not password 
exports.updateMe = catchAsync(async (req, res, next) => {
    // 1) if the user try to update his password using this API route, throw an Error
    if (req.body.password || req.body.passwordConfirm) {
        return next(
            new AppError('This route is not for password updates. Please use /updateMyPassword.', 400)
        );
    }

    // 2) this means only [name, role & email] should be updated 
    const filteredBody = filterObj(req.body, 'name', 'email', 'role');

    //* This line here you include it here only if you are uploading an image
    if (req.file) filteredBody.photo = req.file.filename;

    // 3) Update user document
    const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, { new: true, runValidators: true });

    res.status(200).json({
        status: 'success',
        data: {
            user: updatedUser
        }
    });
});


//* (3) *USER* CAN DELETE HIS ACCOUNT FROM OUR SYSTEM
//*If the user hit this API route => http:localhost:3000/api/v1/users/deleteMe
// it will go inside the user file database and get the user with the ID in the request, then put it active to false
exports.deleteMe = catchAsync(async (req, res, next) => {
    console.log(req.user.id)
    await User.findByIdAndUpdate(req.user.id, { active: false });

    res.status(204).json({
        status: 'success',
        data: null
    });
});
//END USER ACTIONS/RIGHT



//* *ADMIN* MANAGING ALL HIS USER *ACCOUNT/PROFILE*.  ONLY AMIN CAN PERFORMED THESE FOLLOWING ACTIONS
//* THIS QUERY WILL WORK WITH AN *ID*

//* (1) Admin getting all the users
exports.getAllUsers = getAll(User); // i refactor this

//* (2) Admin  get the user details using user ID
exports.getUser = getOne(User);

//* (3) Admin  updating the user details using user ID
exports.updateUser = updateOne(User);

//* (4) Admin deleting the user profile using user ID
exports.deleteUser = deleteOne(User);
