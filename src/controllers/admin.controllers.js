import { Admin } from '../models/admin.model.js';
import { Employee } from '../models/employee.model.js';
import { EmployeeDetails } from '../models/employeeDetails.model.js';
import { Lead } from '../models/lead.model.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { removeFromCloudinary, uploadOnCloudinary } from '../utils/cloudinary.js';

// const registerUser = asyncHandler(async (req, res) => {
//     const { username,password,email,mobile,name } = req.body
//     if (
//         [username,password,email,mobile,name].some((item)=>item?.trim()==="")
//     ) {
//         throw new ApiError(400,'Required Fields')
//     }
//     const saveUser = await Admin.create({
//         username,
//         password,
//         email,
//         mobile,
//         name
//     })
//     const findAdmin = await Admin.findById(saveUser._id)
//     if (!findAdmin) {
//         throw new ApiError(500,'Server Error')
//     }
//     return res
//     .status(200)
//     .json(
//         new ApiResponse(200,[],'Admin Registered')
//     )
// })


//Genrate Tokens

const genrateAccessAndRefreshTokens = async (userId) => {
    try {
        const admin = await Admin.findById(userId)
        const accessToken = admin.genrateAccessToken()
        const refreshToken = admin.genrateRefreshToken()

        admin.refreshToken = refreshToken
        admin.save({ validateBeforeSave: false })

        return { accessToken, refreshToken }


    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating refresh and access token")
    }
}

//Refresh Access Token

const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if (!incomingRefreshToken) {
        throw new ApiError(401, "Unauthorized Request")
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )

        const admin = await Admin.findById(decodedToken._id)

        if (!admin) {
            throw new ApiError(401, "Invalid refresh token")
        }

        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "Refresh token is expired or used")

        }

        const options = {
            httpOnly: true,
            secure: true,
            sameSite: 'none'
        }

        const { accessToken, newRefreshToken } = await genrateAccessAndRefreshTokens(user._id)

        return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", newRefreshToken, options)
            .json(
                new ApiResponse(
                    200,
                    { accessToken, refreshToken: newRefreshToken },
                    "Access token refreshed"
                )
            )

    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token")
    }
})

//Login Controller

const loginAdmin = asyncHandler(async (req, res) => {
    const { username, email, password } = req.body

    // Accept either username or email
    const loginIdentifier = username || email

    if (!loginIdentifier || password === "" || !password) {
        throw new ApiError(400, 'Required Inputs')
    }

    // Find admin by username or email
    const findAdmin = await Admin.findOne({
        $or: [
            { username: loginIdentifier },
            { email: loginIdentifier }
        ]
    })

    if (!findAdmin) {
        throw new ApiError(401, 'Wrong Credentials')
    }

    const isPasswordValid = await findAdmin.isPasswordCorrect(password)

    if (!isPasswordValid) {
        throw new ApiError(401, 'Wrong Credentials')
    }

    const { accessToken, refreshToken } = await genrateAccessAndRefreshTokens(findAdmin._id)


    const options = {
        httpOnly: true,
        secure: true,
        sameSite: 'none'
    }

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
                200,
                {
                    accessToken, refreshToken
                },
                "User logged In Successfully"
            )
        )
})

const adminLogout = asyncHandler(async (req, res) => {
    await Admin.findByIdAndUpdate(
        req.admin._id,
        {
            $unset: {
                refreshToken: 1
            }
        },
        {
            new: true
        }
    )

    const options = {
        httpOnly: true,
        secure: true,
        sameSite: 'none'
    }

    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(
            new ApiResponse(200, {}, "Admin Logged Out Successfully")
        )
})

const addEmployee = asyncHandler(async (req, res) => {
    const { employeeUsername, employeeCode, name, email, mobile, alternateNumber, fatherName, address, document_number, password, employeeStatus, dateOfJoin } = req.body

    if (
        [employeeUsername, employeeCode, name, email, mobile, alternateNumber, fatherName, address, document_number, password, dateOfJoin].some((item) => item.trim() === "" || item === undefined)
    ) {
        throw new ApiError(400, 'Required Inputs')
    }

    const filesName = ["profileImage", "adharCardFront", "adharCardBack", "highestQualification"]

    var filesToUpload = []

    filesName.map((item) => {
        const imgArr = req.files[item]

        if (imgArr?.length > 0 && imgArr[0].path) {
            filesToUpload.push(imgArr[0])
        }
    })

    const existedEmployee = await Employee.findOne({
        $or: [
            { employeeUsername: employeeUsername },
            { employeeCode: employeeCode }
        ]
    });


    if (existedEmployee) {
        throw new ApiError(422, 'Employee Already Exists')
    }

    var filesToSaved = { profileImage: "", adharCardFront: "", adharCardBack: "", highestQualification: "" }

    for (const item of filesToUpload) {
        await uploadOnCloudinary(item.path)
            .then((response) => {
                if (response?.secure_url) {
                    filesToSaved[item.fieldname] = response.secure_url;
                } else {
                    throw new ApiError(500, `Image Upload Failed With Error ${response.toString()}`);
                }
            })
            .catch((err) => {
                throw new ApiError(500, `Image Upload Failed With Error ${err.toString()}`);
            });
    }

    const addEmployeeToDatabase = await EmployeeDetails.create({
        employeeUsername: employeeUsername,
        employeeCode: employeeCode,
        name: name,
        email: email,
        mobile: mobile,
        alternateNumber: alternateNumber || null,
        fatherName: fatherName,
        address: address,
        document_number: document_number,
        profileImage: filesToSaved.profileImage || null,
        adharCardFront: filesToSaved.adharCardFront || null,
        adharCardBack: filesToSaved.adharCardBack || null,
        highestQualification: filesToSaved.highestQualification || null,
        employeeStatus: employeeStatus,
        dateOfJoin: dateOfJoin,
        dateOfLeave: null
    })

    if (!addEmployeeToDatabase) {
        throw new ApiError(500, 'Something Went Wrong')
    }

    const createLoginCredentials = await Employee.create({
        employeeUsername: employeeUsername,
        password: password,
        employeeStatus: employeeStatus
    })

    if (!createLoginCredentials) {
        throw new ApiError(500, 'Something Went Wrong')
    }

    return res
        .status(200)
        .json(
            new ApiResponse(200, {}, 'Employee Added Successfully')
        )
})

const benchEmployee = asyncHandler(async (req, res) => {

    const { employeeCode, employeeStatus } = req.body

    if (employeeCode?.trim() === "" || employeeStatus?.trim() === "") {
        throw new ApiError(400, 'Required Inputs')
    }

    const findEmployee = await EmployeeDetails.findOne({ employeeCode: employeeCode })

    if (!findEmployee) {
        throw new ApiError(404, 'Employee Not Found')
    }

    if (findEmployee.employeeStatus === employeeStatus) {
        throw new ApiError(422, 'Employee Already On Bench')
    }

    const findLoginCredentials = await Employee.findOne({ employeeUsername: findEmployee.employeeUsername })

    if (!findLoginCredentials) {
        throw new ApiError(404, 'Employee Login Credentials Not Found')
    }

    findLoginCredentials.employeeStatus = employeeStatus

    findEmployee.employeeStatus = employeeStatus

    await findEmployee.save()
    await findLoginCredentials.save({ validateBeforeSave: false })

    return res
        .status(200)
        .json(
            new ApiResponse(200, {}, 'Employee Bench Status Updated Successfully')
        )

})

const releaseEmployee = asyncHandler(async (req, res) => {

    const { employeeCode, status, dateOfLeave } = req.body

    if ([employeeCode, status, dateOfLeave].some((item) => item?.trim() === "")) {
        throw new ApiError(400, 'Required Inputs')
    }

    const findEmployee = await EmployeeDetails.findOne({ employeeCode: employeeCode })

    if (!findEmployee) {
        throw new ApiError(404, 'Employee Not Found')
    }

    if (findEmployee.employeeStatus === "Released") {
        throw new ApiError(422, 'Employee Already Released')
    }

    const releaseEmployeeStatus = await EmployeeDetails.findOneAndUpdate(
        { employeeCode: employeeCode },
        {
            employeeStatus: status,
            dateOfLeave: dateOfLeave
        },
        { new: true }
    )

    const findLoginCredentials = await Employee.findOne({ employeeUsername: findEmployee.employeeUsername })

    if (!findLoginCredentials) {
        throw new ApiError(404, 'Employee Login Credentials Not Found')
    }

    findLoginCredentials.employeeStatus = status

    await findLoginCredentials.save({ validateBeforeSave: false })


    if (!releaseEmployeeStatus) {
        throw new ApiError(500, 'Something Went Wrong')
    }

    return res
        .status(200)
        .json(
            new ApiResponse(200, {}, 'Employee Released Successfully')
        )
})

const getEmployeesDetails = asyncHandler(async (req, res) => {

    const getEmployee = await EmployeeDetails.find()

    return res
        .status(200)
        .json(
            new ApiResponse(200, getEmployee, 'Employee Data')
        )
})

const updateEmployeeDetails = asyncHandler(async (req, res) => {
    const { employeeCode, name, email, mobile, alternateNumber, fatherName, address, document_number, employeeStatus,
        employeeUsername } = req.body

    if (
        [name, email, mobile, alternateNumber, fatherName, address, document_number, employeeStatus].some((item) => item?.trim() === "")
    ) {
        throw new ApiError(400, 'Required Inputs')
    }

    const filesName = ["profileImage", "adharCardFront", "adharCardBack", "highestQualification"]

    var filesToUpload = []

    var filesToSaved = { profileImage: "", adharCardFront: "", adharCardBack: "", highestQualification: "" }

    filesName.map((item) => {
        const imgArr = req.files[item]

        if (imgArr?.length > 0 && imgArr[0].path) {
            filesToUpload.push(imgArr[0])
        }
    })

    const findEmployee = await EmployeeDetails.findOne({ employeeCode: employeeCode, employeeUsername: employeeUsername })

    if (!findEmployee) {
        throw new ApiError(404, 'Employee Not Found')
    }

    for (const element of filesToUpload) {
        await uploadOnCloudinary(element.path)
            .then((response) => {
                if (response?.secure_url) {
                    filesToSaved[element.fieldname] = response.secure_url;
                } else {
                    throw new ApiError(500, `Image Upload Failed With Error ${response.toString()}`);
                }
            })
            .catch((err) => {
                throw new ApiError(500, `Image Upload Failed With Error ${err.toString()}`);
            });
    }

    filesName.forEach(async (element) => {
        if (filesToSaved[element] !== '') {
            await removeFromCloudinary(findEmployee[element]).then(async (res) => {
                if (res.result === 'ok') {
                    findEmployee[element] = filesToSaved[element]
                    await findEmployee.save()
                }
            }).catch((err) => {
                throw new ApiError(500, 'Image Not Deleted')
            })
        }
    });

    findEmployee.name = name
    findEmployee.email = email
    findEmployee.mobile = mobile
    findEmployee.alternateNumber = alternateNumber
    findEmployee.fatherName = fatherName
    findEmployee.address = address
    findEmployee.document_number = document_number
    await findEmployee.save()

    return res
        .status(200)
        .json(
            new ApiResponse(200, {}, 'Employee Details Updated Successfully')
        )
})

const changePassword = asyncHandler(async (req, res) => {

    const { username, password, newPassword, confirmPassword } = req.body

    if (
        [username, password, newPassword, confirmPassword].some(item => item?.trim() === '' || !item)
    ) {
        throw new ApiError(400, 'Required Inputs')
    }

    if (newPassword !== confirmPassword) {
        throw new ApiError(403, 'Password Mismatch')
    }

    const admin = await Admin.findById(req.admin._id)

    if (!admin) {
        throw new ApiError(401, 'Unauthorised Access')
    }

    if (!(admin.username === username)) {
        throw new ApiError(409, 'UserID Mismatched')
    }

    const isPasswordValid = await admin.isPasswordCorrect(password)

    if (!isPasswordValid) {
        throw new ApiError(409, "Invalid Old Password")
    }

    admin.password = newPassword
    admin.save({ validateBeforeSave: true })

    return res
        .status(200)
        .json(
            new ApiResponse(200, {}, 'Password Changed Successfully')
        )
})

const workStats = asyncHandler(async (req, res) => {
    const { employeeCode } = req.query

    if (employeeCode === '' || !employeeCode) {
        throw new ApiError(400, 'Required Inputs')
    }

    const findLeads = await Lead.find({ employeeCode: employeeCode })

    let counts = {
        New: 0,
        open: 0,
        fixed: 0,
        archived: 0,
        pending: 0,
        progess: 0,
        cancelled: 0
    };

    var report = []

    for (const lead of findLeads) {
        if (Array.isArray(lead.leadStatus) && lead.leadStatus.length > 0) {
            const lastStatus = lead.leadStatus[lead.leadStatus.length - 1];
            // Normalize to lowercase for consistency
            const normalized = lastStatus.toLowerCase();

            // Find matching key (case-insensitive)
            for (const key in counts) {
                if (key.toLowerCase() === normalized) {
                    counts[key] += 1;
                    break;
                }
            }
        }

        if (lead.report_id?.length>0) {
            report.push(lead.report_id)
        }
        
    }

    return res
        .status(200)
        .json(
            new ApiResponse(200, { counts, report }, 'Leads Counts')
        )

})

export {
    loginAdmin,
    adminLogout,
    addEmployee,
    benchEmployee,
    releaseEmployee,
    refreshAccessToken,
    getEmployeesDetails,
    updateEmployeeDetails,
    changePassword,
    workStats
}