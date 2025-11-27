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
        [invoice_no, paymentDate, leadID, paidAmount, transactionID, totalAmount, remainingAmount].some(item =>
            item === null || item === undefined || (typeof item === 'string' && item.trim() === "")
        )
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

    const findInvoices = await Invoice.aggregate([
        {
            $match: { leadID: leadID } // match the leadID first
        },
        {
            $lookup: {
                from: "requirements",        // name of the collection (not model)
                localField: "leadID",        // field in Invoice
                foreignField: "leadID",      // field in Requirement
                as: "requirements"           // output array field
            }
        },
        {
            $lookup: {
                from: "teachers",
                localField: "teacher_id",
                foreignField: "teacher_id",
                as: "teachers"
            }
        },
        {
            $lookup: {
                from: 'students',
                localField: 'student_id',
                foreignField: 'studentID',
                as: 'students'
            }
        },
        {
            $addFields: {
                requirements: { $arrayElemAt: ["$requirements", 0] },
                teachers: { $arrayElemAt: ["$teachers", 0] },
                students: { $arrayElemAt: ["$students", 0] }
            }
        }
    ]);

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

    const findInvoices = await Receipt.aggregate([
        // Match receipts for the given leadID
        { $match: { leadID: leadID } },

        // Lookup corresponding invoice
        {
            $lookup: {
                from: 'invoices',
                localField: 'invoice_no',
                foreignField: 'invoice_no',
                as: 'invoiceDetails'
            }
        },
        { $unwind: '$invoiceDetails' }, // Flatten the invoice array

        // Lookup teacher details
        {
            $lookup: {
                from: 'teachers',
                localField: 'invoiceDetails.teacher_id',
                foreignField: 'teacher_id',
                as: 'teacher'
            }
        },
        { $unwind: '$teacher' },

        // Lookup student details
        {
            $lookup: {
                from: 'students',
                localField: 'invoiceDetails.student_id',
                foreignField: 'studentID',
                as: 'student'
            }
        },
        { $unwind: '$student' },

        // Lookup requirement details
        {
            $lookup: {
                from: 'requirements',
                localField: 'leadID',
                foreignField: 'leadID',
                as: 'requirements'
            }
        },
        { $unwind: '$requirements' },

        // Project only the fields we need
        {
            $project: {
                receipt_no: 1,
                paymentDate: 1,
                leadID: 1,
                invoice_no: 1,
                transactionID: 1,
                totalAmount: 1,
                paymentType: '$invoiceDetails.paymentType',
                remarks: '$invoiceDetails.remarks',
                tax: '$invoiceDetails.tax',
                teacherName: '$teacher.teacherName',
                teacherMobile: '$teacher.teacherMobile',
                teacherAddress: '$teacher.address',
                studentName: '$student.name',
                parentContact: '$student.parentContact',
                studentAddress: '$student.address',
                boards: '$student.boards',
                subjects: {
                    $reduce: {
                        input: '$student.subjects',
                        initialValue: '',
                        in: { $concat: ['$$value', { $cond: [{ $eq: ['$$value', ''] }, '', ','] }, '$$this'] }
                    }
                },
                teachingClass: '$requirements.studentClass',
                sitting: '$requirements.sitting'
            }
        }
    ]);

    // var allReceipts = await Receipt.find({ leadID: leadID })
    // var findInvoices = []

    // for (const item of allReceipts) {
    //     const invoiceDetails = await Invoice.findOne({ invoice_no: item.invoice_no });
    //     const teacher = await Teacher.findOne({ teacher_id: invoiceDetails.teacher_id });
    //     const student = await Student.findOne({ studentID: invoiceDetails.student_id });
    //     const requirements = await Requirement.findOne({ leadID: item.leadID });

    //     findInvoices.push({
    //         receipt_no: item.receipt_no,
    //         paymentDate: item.paymentDate,
    //         leadID: item.leadID,
    //         invoice_no: item.invoice_no,
    //         transactionID: item.transactionID,
    //         totalAmount: item.totalAmount,
    //         paymentType: invoiceDetails.paymentType,
    //         remarks: invoiceDetails.remarks,
    //         tax: invoiceDetails.tax,
    //         teacherName: teacher.teacherName,
    //         teacherMobile: teacher.teacherMobile,
    //         teacherAddress: teacher.address,
    //         studentName: student.name,
    //         parentContact: student.parentContact,
    //         studentAddress: student.address,
    //         boards: student.boards,
    //         subjects: student.subjects.join(','),
    //         teachingClass: requirements.studentClass,
    //         sitting: requirements.sitting
    //     });
    // }


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

const allRecordsPayments = asyncHandler(async (req, res) => {

    const receipt = await Receipt.find()

    const Invoices = await Invoice.find()

    return res.
        status(200)
        .json(
            new ApiResponse(200, { receipt, Invoices }, 'Records')
        )
})

export {
    createInvoice,
    collectPayment,
    viewInvoice,
    viewReceipt,
    cancelReceiptOrInvoice,
    allRecordsPayments
}