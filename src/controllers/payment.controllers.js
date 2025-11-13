import { Invoice } from '../models/invoice.model.js'
import { Job } from '../models/job.model.js'
import { Receipt } from '../models/receipt.model.js'
import { ApiError } from '../utils/ApiError.js'
import { ApiResponse } from '../utils/ApiResponse.js'
import { asyncHandler } from '../utils/asyncHandler.js'


const createInvoice = asyncHandler(async (req, res) => {

    const { leadID, invoice_date, tax, totalAmount, dueDate, paymentType, remarks } = req.body

    if (
        [leadID, invoice_date, tax, totalAmount, dueDate, paymentType, remarks].some((item) =>
            item === '' || item === undefined)
    ) {
        throw new ApiError(400, 'Required Inputs')
    }

    const getJobDetails = await Job.findOne({ leadID: leadID })

    if (!getJobDetails) {
        throw new ApiError(404, 'Job Details Missing')
    }

    const latestInvoice = await Invoice.findOne({
        invoice_no: { $regex: `^${getJobDetails.jobID}-` }
    }).sort({ createdAt: -1 }).lean();

    let countNumbers = 1;

    if (latestInvoice) {
        const lastCount = parseInt(latestInvoice.invoice_no.split('-')[1], 10);
        if (!isNaN(lastCount)) {
            countNumbers = lastCount + 1;
        }
    }
    const formattedCount = countNumbers.toString().padStart(2, '0');

    const invoice_no = `${getJobDetails.jobID}-${formattedCount}`;

    const createInvoiceInDatabase = await Invoice.create({
        invoice_no: invoice_no,
        leadID: leadID,
        invoice_date: invoice_date,
        tax: tax,
        totalAmount: totalAmount,
        finalAmount: (Number(tax) + Number(totalAmount)),
        dueDate: dueDate,
        student_id: getJobDetails.studentID,
        teacher_id: getJobDetails.teacher_id[getJobDetails.teacher_id.length - 1],
        paymentType: paymentType,
        remarks: remarks
    })

    if (!createInvoiceInDatabase) {
        throw new ApiError(500, 'Internal Server Error')
    }

    return res
        .status(200)
        .json(
            new ApiResponse(200, { invoice_no }, 'Invoice Created')
        )
})

const collectPayment = asyncHandler(async (req, res) => {

    const { invoice_no, paymentDate, leadID, paidAmount, transactionID, totalAmount, remainingAmount } = req.body

    if (
        [invoice_no, paymentDate, leadID, paidAmount, transactionID, totalAmount, remainingAmount,]
    ) {
        throw new ApiError(400, 'Required Inputs')
    }

    var receipt_no = `${invoice_no.replace('-', 'R-')}`

    const createReceipt = await Receipt.create({
        invoice_no: invoice_no,
        receipt_no: receipt_no,
        paymentDate: paymentDate,
        leadID: leadID,
        paidAmount: paidAmount,
        transactionID: transactionID,
        totalAmount: totalAmount,
        remainingAmount: remainingAmount,
    })

    if (!createReceipt) {
        throw new ApiError(500, 'Internal Server Error')
    }

    return res
        .status(200)
        .json(
            new ApiResponse(200, { receipt_no }, 'Receipt Created')
        )
})

const viewInvoice = asyncHandler(async (req, res) => {
    const { leadID } = req.query

    if (leadID === '') {
        throw new ApiError(400, 'Required Field')
    }

    const findInvoices = await Invoice.find({ leadID: leadID })

    if (findInvoices.length === 0) {
        throw new ApiError(404, 'No Invoices Found')
    }

    return res
        .status(200)
        .json(
            new ApiResponse(200, { findInvoices }, 'Invoice Detail')
        )
})

const viewReceipt = asyncHandler(async (req, res) => {
    const { leadID } = req.query

    if (leadID === '') {
        throw new ApiError(400, 'Required Field')
    }

    const findInvoices = await Invoice.find({ leadID: leadID })

    if (findInvoices.length === 0) {
        throw new ApiError(404, 'No Invoices Found')
    }

    return res
        .status(200)
        .json(
            new ApiResponse(200, { findInvoices }, 'Invoice Detail')
        )
})

const cancelReceiptOrInvoice = asyncHandler(async (req, res) => {
    const { formData } = req.body

    var jsonData = JSON.parse(formData)

    if (!jsonData._id || !jsonData.type) {
        throw new ApiError(400, 'Required Input')
    }

    if (jsonData.type === 'Invoice') {
        const deleteInvoice = await Invoice.deleteOne({ _id: jsonData._id })

        if (!deleteInvoice.acknowledged) {
            throw new ApiError(500, 'Deletion Failed')
        }
    } else if (jsonData.type === 'Reciept') {
        const deleteReceipt = await Receipt.deleteOne({ _id: jsonData._id })

        if (!deleteReceipt.acknowledged) {
            throw new ApiError(500, 'Deletion Failed')
        }
    }

    return res
        .status(200)
        .json(
            new ApiResponse(200, {}, `${jsonData.type} deleted Successfully`)
        )
})


export {
    createInvoice,
    collectPayment,
    viewInvoice,
    viewReceipt,
    cancelReceiptOrInvoice,
}