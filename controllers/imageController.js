const multer = require('multer');
const sharp = require('sharp');
const catchAsync = require('./../utils/catchAsync');


//* ---IMAGE UPLOAD---
const multerStorage = multer.memoryStorage();

const multerFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image')) {
        cb(null, true);
    } else {
        cb(new AppError('Not an image! Please upload only images.', 400), false);
    }
};

const upload = multer({ storage: multerStorage, fileFilter: multerFilter });

//Add this func to the route
exports.uploadUserPhoto = upload.single('photo'); //* photo is the field name

//Add this func to the route
exports.resizeUserPhoto = catchAsync(async (req, res, next) => {
    if (!req.file) return next(); //if the req is not a file return

    req.file.filename = `user-${req.user.id}-${Date.now()}.jpeg`;

    await sharp(req.file.buffer)
        .resize(500, 500)
        .toFormat('jpeg')
        .jpeg({ quality: 90 })
        .toFile(`public/img/users/${req.file.filename}`);

    next();
});
//* ---THE END---