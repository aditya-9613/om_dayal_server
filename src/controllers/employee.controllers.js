import { Employee } from '../models/employee.model.js'
import { EmployeeDetails } from '../models/employeeDetails.model.js'
import { Lead } from '../models/lead.model.js'
import { ApiError } from '../utils/ApiError.js'
import { ApiResponse } from '../utils/ApiResponse.js'
import { asyncHandler } from '../utils/asyncHandler.js'


const genrateAccessAndTokens = async (userId) => {
    try {
        const employee = await Employee.findById(userId)
        const accessToken = employee.genrateAccessToken()

        return accessToken

    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating refresh and access token")
    }
}

const loginEmployee = asyncHandler(async (req, res) => {
    const { employeeUsername, password } = req.body

    if (employeeUsername === '' || password === '') {
        throw new ApiError(400, 'Required Inputs')
    }

    const findUsername = await Employee.findOne({ employeeUsername: employeeUsername })

    if (!findUsername) {
        throw new ApiError(401, 'Invalid Credentials')
    }

    const isPasswordValid = await findUsername.isPasswordCorrect(password)

    if (!isPasswordValid) {
        throw new ApiError(401, 'Invalid Credentials')
    }

    const accessToken = await genrateAccessAndTokens(findUsername._id)

    const options = {
        httpOnly: true,
        secure: true
    }

    const employee = await EmployeeDetails.findOne({ employeeUsername: employeeUsername })

    const currentDate = new Date()
    employee.workDates.push(currentDate)
    employee.workDates.push('Login Done At')

    const employeeCode = employee.employeeCode

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .json(
            new ApiResponse(200, { accessToken, employeeCode }, "User logged In Successfully")
        )
})

const logoutEmployee = asyncHandler(async (req, res) => {

    const employeeDetails = await Employee.findById(req.employee._id)

    const employee = await EmployeeDetails.findOne({ username: employeeDetails.username })

    const currentDate = new Date()
    employee.workDates.push(currentDate)
    employee.workDates.push('Logged Out At')

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(
            new ApiResponse(200, {}, "Admin Logged Out Successfully")
        )
})

const changePassword = asyncHandler(async (req, res) => {

    const { employeeUsername, password, newPassword, confirmPassword } = req.body

    if (
        [employeeUsername, password, newPassword, confirmPassword].some(item => item?.trim() === '' || !item)
    ) {
        throw new ApiError(400, 'Required Inputs')
    }

    if (newPassword !== confirmPassword) {
        throw new ApiError(403, 'Password Mismatch')
    }

    const employee = await Employee.findById(req.employee._id)

    if (!employee) {
        throw new ApiError(401, 'Unauthorised Request')
    }

    if (!(employee.employeeUsername === employeeUsername)) {
        throw new ApiError(409, 'Wrong Credentials')
    }

    const isPasswordValid = await employee.isPasswordCorrect(password)

    if (!isPasswordValid) {
        throw new ApiError(409, 'Wrong Credentials')
    }

    employee.password = newPassword
    employee.save({ validateBeforeSave: true })

    return res
        .status(200)
        .json(
            new ApiResponse(200, {}, 'Password Changed Successfully')
        )
})

const getEmployeeDetails = asyncHandler(async (req, res) => {

    const { employeeCode } = req.query

    if (!employeeCode) {
        throw new ApiError(400, 'Required Inputs')
    }

    const findEmployee = await EmployeeDetails.findOne({ employeeCode: employeeCode })

    if (!findEmployee) {
        throw new ApiError(404, 'Employee Not Found')
    }

    return res
        .status(200)
        .json(
            new ApiResponse(200, { findEmployee }, 'Employee Data')
        )
})

export {
    loginEmployee,
    logoutEmployee,
    changePassword,
    getEmployeeDetails
}