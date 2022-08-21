/*=============================================================================
    NOTE: WHEN NEVER YOU WANT TO CREATE, DELETE UPDATE, GET USER BY ID 
    USE THIS FUNCTION TO DO ALL THAT FOR YOU, GET THE EXAMPLE IN userController.js 
    You don't have to re create stuff in each file, you simple use these functions 
    to do that. Note: don't use this for authentication
==================================================================================*/


const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');
const APIFeatures = require('./../utils/apiFeatures');


//*Admin   getting all the user in a file DB. he can search, filter, sort ect...
exports.getAll = Model => catchAsync(async (req, res, next) => {
    // To allow for nested GET reviews on tour (hack)
    let filter = {};
    if (req.params.tourId) filter = { tour: req.params.tourId };

    const features = new APIFeatures(Model.find(filter), req.query)
        .filter()
        .sort()
        .limitFields()
        .paginate();
    // const doc = await features.query.explain();
    const doc = await features.query;

    // SEND RESPONSE
    res.status(200).json({
        status: 'success',
        results: doc.length,
        data: {
            data: doc
        }
    });
});



//* Admin  Getting the user details using user ID
exports.getOne = (Model, popOptions) => catchAsync(async (req, res, next) => {
    let query = Model.findById(req.params.id);
    if (popOptions) query = query.populate(popOptions);
    const doc = await query;

    if (!doc) {
        return next(new AppError('No document found with that ID', 404));
    }

    res.status(200).json({
        status: 'success',
        data: {
            data: doc
        }
    });
});



//* Admin updating the user details using the user ID
//Using this the admin can update every information about the user details 
exports.updateOne = Model => catchAsync(async (req, res, next) => {

    const getReqBody = req.body;

    //* assign photo field to the file name
    if (req.file) getReqBody.photo = req.file.filename;

    const doc = await Model.findByIdAndUpdate(req.params.id, getReqBody, {
        new: true,
        runValidators: true
    });

    if (!doc) {
        return next(new AppError('No document found with that ID', 404));
    }

    res.status(200).json({
        status: 'success',
        data: {
            data: doc
        }
    });
});



//* Admin Deleting the user details using the user ID
exports.deleteOne = Model => catchAsync(async (req, res, next) => {
    const doc = await Model.findByIdAndDelete(req.params.id);

    if (!doc) {
        return next(new AppError('No document found with that ID', 404));
    }

    res.status(204).json({
        status: 'success',
        data: null
    });
});



//* If you want to create a new thing, like a new tour or review simple use this function for that
//don't use it to create for example a user account to sing up & login, you use it to create other stuff
exports.createOne = Model => catchAsync(async (req, res, next) => {
    const doc = await Model.create(req.body);

    res.status(201).json({
        status: 'success',
        data: {
            data: doc
        }
    });
});