import { Lead } from '../models/lead.model.js'
import { Report } from '../models/report.model.js'
import { ApiError } from '../utils/ApiError.js'
import { ApiResponse } from '../utils/ApiResponse.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { uploadOnCloudinary } from '../utils/cloudinary.js'
import { generateReportId } from '../utils/CreateIDs.js'


const createReport = asyncHandler(async (req, res) => {
    const { reportName, employeeCode, reportDate, reportAbstract, leadID, reportDescription } = req.body

    const { supportingDocument } = req.files

    if (
        [reportName, employeeCode, reportDate, reportAbstract, leadID, reportDescription].some((item) =>
            item === '' || item === undefined)
    ) {
        throw new ApiError(400, 'Required Fields')
    }

    if (supportingDocument.length === 0) {
        throw new ApiError(400, 'Required Input');

    }

    const findPreviousReport = await Report.findOne({ reportName: reportName })

    if (findPreviousReport) {
        throw new ApiError(409, 'Report Already Submitted')
    }

    var report_id = generateReportId(reportName)

    var imageLinks = await Promise.all(
        supportingDocument.map(item =>
            uploadOnCloudinary(item.path).then(res => res.secure_url)
        )
    )

    const createReport = await Report.create({
        report_id,
        reportName,
        employeeCode,
        reportDate,
        reportAbstract,
        leadID,
        reportDescription,
        supportingDocument: imageLinks
    })

    if (!createReport) {
        throw new ApiError(500, 'Server Error')
    }

    const leads = await Lead.findOne({ leadID: leadID })
    leads.report_id.push(report_id)
    leads.save()

    return res
        .status(200)
        .json(
            new ApiResponse(200, { report_id }, 'Report Created Successfully')
        )
})

const searchReport = asyncHandler(async (req, res) => {

    const { report_id } = req.querry

    if (report_id === '') {
        throw new ApiError(400, 'Required Fields')
    }

    const date = new Date(report_id);
    const findReport = await Report.find({
        $or: [
            { report_id: report_id },
            { reportName: { $regex: report_id, $options: "i" } },

            !isNaN(date.getTime()) && {
                reportDate: {
                    $gte: new Date(date.setHours(0, 0, 0, 0)),
                    $lte: new Date(date.setHours(23, 59, 59, 999))
                }
            }
        ].filter(Boolean)
    });

    if (findReport.length === 0) {
        throw new ApiError(404, 'Report Missing')
    }

    return res
        .status(200)
        .json(
            new ApiResponse(200, { report: findReport }, 'Report Fetched Successfully')
        )
})

const viewUnviewedReport = asyncHandler(async (req, res) => {

    const findAllReport = await Report.find({ view: false })

    if (!findAllReport) {
        throw new ApiError(404, 'No Reports Unviewed')
    }

    return res
        .status(200)
        .json(
            new ApiResponse(200, { Reports: findAllReport }, 'All Reports')
        )
})

const viewReport = asyncHandler(async (req, res) => {
    const { report_id } = req.body

    if (report_id === '') {
        throw new ApiError(400, 'Required Inputs')
    }

    const updateView = await Report.updateOne({ report_id },
        {
            view: true
        }
    )

    if (!updateView.acknowledged) {
        throw new ApiError(500, 'Report Not Viewed')
    }

    return res
        .status(200)
        .json(
            new ApiResponse(200, {}, 'Report Viewed')
        )
})

export {
    createReport,
    searchReport,
    viewUnviewedReport,
    viewReport
}