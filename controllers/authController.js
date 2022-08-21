/*================================================
    *THIS ROUTES IT'S ONLY FOR AUTHENTICATION*
==================================================*/

const crypto = require('crypto');
const { promisify } = require('util');
const jwt = require('jsonwebtoken');
const sendEmail = require('./../utils/email');
const mailgun = require("mailgun-js");
const msg = mailgun({ apiKey: process.env.API_KEY_MAIL_GUN, domain: process.env.DOMAIN_NAME_MAIL_GUN });

const User = require('./../models/userModel');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');

const signToken = id => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN
    });
};

const createSendToken = (user, statusCode, res) => {
    const token = signToken(user._id);
    const cookieOptions = {
        expires: new Date(
            Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
        ),
        httpOnly: true
    };
    if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;
    res.cookie('jwt', token, cookieOptions);
    user.password = undefined;

    res.status(statusCode).json({
        status: 'success',
        token,
        data: {
            user
        }
    });
};


//* SIGN UP
exports.signUp = catchAsync(async (req, res, next) => {
    const newUser = await User.create({
        name: req.body.name,
        email: req.body.email,
        password: req.body.password,
        passwordConfirm: req.body.passwordConfirm,
    });

    createSendToken(newUser, 201, res);
});



//* LOGIN
exports.login = catchAsync(async (req, res, next) => {
    const { email, password } = req.body;

    //This check if the user try to login without email / password 
    if (!email || !password) {
        return next(new AppError('Please provide email and password!', 400));
    }

    //Note: in the userModel schema i hv set the password field, not selectable. that why i specify <[select('+password')]> on the line below, otherwise it will not select the password field
    const user = await User.findOne({ email }).select('+password');

    //This check the user det, it also pass & check the inserted password if it is not correct throw this Error. <[correctPassword]> is the func name inside userModel.js
    if (!user || !(await user.correctPassword(password, user.password))) {
        return next(new AppError('Incorrect email or password', 401));
    }

    createSendToken(user, 200, res);
});






//*LOGOUT
exports.logout = (req, res) => {
    res.cookie('jwt', 'loggedout', {
        expires: new Date(Date.now() + 10 * 1000),
        httpOnly: true
    });
    res.status(200).json({ status: 'success' });
};





//* PROTECT THE USER NOT TO RESET HIS FORGOTTEN PASSWORD IF HE/SHE HASN'T LOGIN
exports.protect = catchAsync(async (req, res, next) => {

    // 1) Getting token and check If it's there
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')
    ) {
        token = req.headers.authorization.split(' ')[1];
    }
    if (!token) {
        return next(
            new AppError('You are not logged in! Please log in to get access.', 401)
        );
    }

    // 2) Verification token
    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

    // 3) Check if user still exists
    const currentUser = await User.findById(decoded.id);
    if (!currentUser) {
        return next(new AppError('The user belonging to this token does no longer exist.', 401));
    }

    // 4) Check if user changed password after the token was issued
    if (currentUser.changedPasswordAfter(decoded.iat)) {
        return next(new AppError('User recently changed password! Please log in again.', 401));
    }

    // GRANT ACCESS TO PROTECTED ROUTE
    req.user = currentUser;
    next();
});



//*THIS WILL EXECUTE WHEN THE USER FORGET HIS PASSWORD AND CAN'T HAVE ACCESS TO THE SYSTEM 
//* FORGOT PASSWORD//* End point => http://localhost:3000/api/v1/users/forgotPassword
exports.forgotPassword = catchAsync(async (req, res, next) => {
    // 1) Select the user with this email, inside the user file
    const user = await User.findOne({ email: req.body.email });
    if (!user) {
        return next(new AppError('There is no user with this email address.', 404));
    }

    // 2) Generate the random reset token
    //Note: this func => <createPasswordResetToken /> is coming from userModel.js file
    const resetToken = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false });

    try {
        const resetURL = `${req.protocol}://${req.get('host')}/api/v1/users/resetPassword/${resetToken}`;
        console.log(resetURL);
        const data = {
            from: user.email, //Email of the person sending
            to: user.email,
            subject: '',
            html: `
                <h1> Please click on the link to reset your password </h1>
                <p> ${resetURL} </p>
            `
        };

        await msg.messages().send(data, function (error, body) {
            if (error) {
                return res.status(403).json({
                    status: 'fail',
                    message: 'There was an error sending your password reset token'
                });
            }
            return res.status(200).json({
                status: 'success',
                message: 'Token sent to your email!'
            });
        });

    } catch (err) {
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        await user.save({ validateBeforeSave: false });
        return next(
            new AppError('There was an error sending the email. Try again later!'),
            500
        );
    }
});



//* RESET PASSWORD
//* End point => http://localhost:3000/api/v1/users/resetPassword/HERE YOU PUT THE TOKEN
exports.resetPassword = catchAsync(async (req, res, next) => {
    //1) Get the user based on the token
    const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');
    const user = await User.findOne({ passwordResetToken: hashedToken, passwordResetExpires: { $gt: Date.now() } });

    // 2) If token has not expired, and there is user, set the new password
    if (!user) {
        return next(new AppError('Token is invalid or has expired', 400));
    }

    // 3) Update changedPasswordAt property for the user
    user.password = req.body.password;
    user.passwordConfirm = req.body.passwordConfirm;
    user.passwordResetToken = undefined; //remove from the DB
    user.passwordResetExpires = undefined; //remove from the DB
    await user.save();

    // 4) Log the user in, send JWT
    createSendToken(user, 200, res);
})




//* UPDATE PASSWORD WHILST YOU ARE INSIDE OF THE SYSTEM (UNDER YOUR ACCOUNT)
exports.updatePassword = catchAsync(async (req, res, next) => {
    // 1) Get user from collection
    const user = await User.findById(req.user.id).select('+password');

    // 2) Check if the your password is correct
    if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
        return next(new AppError('Your current password is wrong.', 401));
    }

    // 3) If so, update password
    user.password = req.body.password;
    user.passwordConfirm = req.body.passwordConfirm;
    await user.save();

    // 4) Log user in, send JWT
    createSendToken(user, 200, res);
});




//* GRANT THE USER ACCESS TO CERTAIN API IF HE HAS THIS TYPE OF ROLE
//the (...roles) parameter will receive roles that will prevent the user to access all the bellow APIs
exports.restrictTo = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return next(new AppError('You do not have permission to perform this action', 403));
        }
        next();
    };
};







//* ONLY FOR RENDERED PAGES , no errors! //This routes will always check any change with the authentication & render the page to the user.
exports.isLoggedIn = async (req, res, next) => {
    if (req.cookies.jwt) {
        try {
            // 1) verify token
            const decoded = await promisify(jwt.verify)(req.cookies.jwt, process.env.JWT_SECRET);

            // 2) Check if user still exists
            const currentUser = await User.findById(decoded.id);
            if (!currentUser) { return next() }

            // 3) Check if user changed password after the token was issued
            if (currentUser.changedPasswordAfter(decoded.iat)) { return next() }

            // THERE IS A LOGGED IN USER
            res.locals.user = currentUser;
            return next();
        } catch (err) {
            return next();
        }
    }
    next();
};