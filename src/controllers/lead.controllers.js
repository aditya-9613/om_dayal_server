import { Job } from '../models/job.model.js'
import { Lead } from '../models/lead.model.js'
import { Requirement } from '../models/requirement.model.js'
import { Student } from '../models/student.model.js'
import { Teacher } from '../models/teacher.model.js'
import { ApiError } from '../utils/ApiError.js'
import { ApiResponse } from '../utils/ApiResponse.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { genrateLeadID } from '../utils/CreateIDs.js'


const createLead = asyncHandler(async (req, res) => {

    const { email, mobile, leadType, leadStatus, longitude, latitude, address, alternateNo, leadDates, leadSource, name } = req.body

    if (
        [email, mobile, leadType, leadStatus, longitude, latitude, address, alternateNo, leadDates, leadSource, name].some((item) => item === '' || item === undefined)
    ) {
        throw new ApiError(400, 'All fields are required')
    }

    var leadID;
    let isUnique = false;

    while (!isUnique) {
        leadID = await genrateLeadID();
        const existedLeadID = await Lead.findOne({ leadID });
        if (!existedLeadID) {
            isUnique = true;
        }
    }

    var dates = new Date(leadDates)
    // set time to current time
    dates.setHours(new Date().getHours())
    dates.setMinutes(new Date().getMinutes())
    dates.setSeconds(new Date().getSeconds())

    const createLead = await Lead.create({
        leadID,
        email,
        mobile,
        leadType,
        leadStatus,
        longitude,
        latitude,
        address,
        alternateNo,
        leadDates: dates,
        leadSource,
        name
    })

    if (!createLead) {
        throw new ApiError(500, 'Lead creation failed')
    }

    return res
        .status(200)
        .json(
            new ApiResponse(200, { leadID }, 'Lead created successfully')
        )

})

const allotLeads = asyncHandler(async (req, res) => {
    const { leadID, employeeCode } = req.body

    if (leadID === '' || leadID === undefined || employeeCode === '' || employeeCode === undefined) {
        throw new ApiError(400, 'All fields are required')
    }

    const findLead = await Lead.findOne({ leadID: leadID })

    if (!findLead) {
        throw new ApiError(404, 'Lead not found')
    }

    const findEmployeeInLead = await Requirement.findOne({ leadID: leadID, employeeCode: employeeCode })

    if (findEmployeeInLead) {
        throw new ApiError(422, 'This lead is already allotted to this employee')
    }

    var requirementID = leadID.replace('LD', 'RQ')
    var studentID = leadID.replace('LD', 'SL')

    const exisedStudent = await Student.findOne({ leadID: leadID })

    if (exisedStudent) {
        throw new ApiError(423, 'Student with this leadID already exists')
    }

    const createRequirement = await Requirement.create({
        leadID: leadID,
        employeeCode: employeeCode,
        requirementID: requirementID,
        tutionPlace: '',
        studentClass: '',
        sitting: '',
        duration: '',
        budget: '',
        genderPreference: ''
    })

    const createStudent = await Student.create({
        leadID: leadID,
        studentID: studentID,
        name: findLead.name,
        email: findLead.email,
        address: findLead.address,
        class: '',
        boards: '',
        subjects: [],
        fatherName: '',
        motherName: '',
        parentContact: findLead.mobile,
        alternateNumber: findLead.alternateNo
    })

    const createJob = await Job.create({
        leadID: leadID,
        jobID: leadID.replace('LD', 'JO'),
        employeeCode: employeeCode,
        studentID: studentID,
        teacher_id: [],
        remark: [],
    })

    findLead.employeeCode = employeeCode
    findLead.save()

    if (!createRequirement || !createStudent || !createJob) {
        throw new ApiError(500, 'Allotment failed')
    }

    return res
        .status(200)
        .json(
            new ApiResponse(200, { leadID }, 'Lead allotted successfully')
        )
})

const postRequirement = asyncHandler(async (req, res) => {

    const { leadID, name, fatherName, motherName, email, mobile, alternateNo, address, tutionPlace, studentClass, boards, subject, sitting, duration, budget, genderPreference } = req.body

    if (
        [leadID, name, fatherName, motherName, email, mobile, alternateNo, address, tutionPlace, studentClass, boards, subject, sitting, duration, budget, genderPreference].some((item) => item === '' || item === undefined)
    ) {
        throw new ApiError(400, 'All fields are required')
    }

    var requirementID = leadID.replace('LD', 'RQ')

    const updateRequirement = await Requirement.updateOne(
        { leadID: leadID },
        {
            tutionPlace: tutionPlace,
            studentClass: studentClass,
            sitting: sitting,
            duration: duration,
            budget: budget,
            genderPreference: genderPreference
        })

    const updateStudent = await Student.updateOne(
        { leadID: leadID },
        {
            class: studentClass,
            boards: boards,
            subjects: subject,
            fatherName: fatherName,
            motherName: motherName
        })

    const updateLeads = await Lead.updateOne(
        { leadID: leadID },
        {
            $push: {
                leadStatus: 'Open',
                leadDates: new Date()
            }
        }
    );


    if (!updateRequirement.acknowledged || !updateStudent.acknowledged || !updateLeads.acknowledged) {
        throw new ApiError(500, 'Requirement update failed')
    }

    return res
        .status(200)
        .json(
            new ApiResponse(200, { requirementID }, 'Requirement created successfully')
        )

})

const getAllLeads = asyncHandler(async (req, res) => {

    const leads = await Lead.find()

    if (!leads) {
        throw new ApiError(404, 'No leads found')
    }

    return res
        .status(200)
        .json(
            new ApiResponse(200, { leads }, 'Leads fetched successfully')
        )
})

const searchLeads = asyncHandler(async (req, res) => {

    const { params } = req.params


    const leadIDs = await Lead.find({ leadID: { $regex: params, $options: 'i' } })

    if (!leadIDs) {
        throw new ApiError(404, 'No leads found')
    }

    return res
        .status(200)
        .json(
            new ApiResponse(200, { leadIDs }, 'Leads fetched successfully')
        )


})

const changeLeadStatus = asyncHandler(async (req, res) => {

    const { leadID, leadStatus, leadDates } = req.body

    if (
        [leadID, leadStatus, leadDates].some((item) => item === '' || item === undefined)
    ) {
        throw new ApiError(400, 'All fields are required')
    }

    const findLead = await Lead.findOne({ leadID: leadID })

    if (!findLead) {
        throw new ApiError(404, 'Lead not found')
    }

    var dates = new Date(leadDates)
    // set time to current time
    dates.setHours(new Date().getHours())
    dates.setMinutes(new Date().getMinutes())
    dates.setSeconds(new Date().getSeconds())

    findLead.leadStatus.push(leadStatus)
    findLead.leadDates.push(dates)
    await findLead.save()

    return res
        .status(200)
        .json(
            new ApiResponse(200, { leadID }, 'Lead status updated successfully')
        )

})

const getRequirementWithLeadID = asyncHandler(async (req, res) => {
    const { leadID } = req.query;

    if (!leadID || leadID.trim() === '') {
        throw new ApiError(400, 'Lead ID is required');
    }

    const requirement = await Requirement.findOne({ leadID });

    const studentDetails = await Student.findOne({ leadID })

    if (!requirement) {
        throw new ApiError(404, 'Requirement not found');
    }

    return res
        .status(200)
        .json(
            new ApiResponse(200, { requirement, studentDetails }, 'Requirement fetched successfully')
        );
})

const getAllLeadsDetails = asyncHandler(async (req, res) => {

    const { leadID } = req.query

    if (leadID === '' || !leadID) {
        throw new ApiError(400, 'Required Fields')
    }

    const leads = await Lead.aggregate([
        {
            $match: { leadID: leadID }
        },
        // Lookup Student by leadID
        {
            $lookup: {
                from: "students", // Collection name in MongoDB (should be lowercase and plural)
                localField: "leadID",
                foreignField: "leadID",
                as: "student"
            }
        },
        {
            $unwind: {
                path: "$student",
                preserveNullAndEmptyArrays: true // In case some leads have no student
            }
        },

        // Lookup Requirement by leadID
        {
            $lookup: {
                from: "requirements",
                localField: "leadID",
                foreignField: "leadID",
                as: "requirement"
            }
        },
        {
            $unwind: {
                path: "$requirement",
                preserveNullAndEmptyArrays: true // In case some leads have no requirement
            }
        },

        // Optional: You can project a merged result or just return as is
        {
            $project: {
                _id: 0,
                leadID: 1,
                email: 1,
                employeeCode: 1,
                mobile: 1,
                leadType: 1,
                leadStatus: 1,
                longitude: 1,
                latitude: 1,
                address: 1,
                alternateNo: 1,
                leadDates: 1,
                leadSource: 1,
                name: 1,
                report_id: 1,
                createdAt: 1,
                updatedAt: 1,
                // Student Fields
                studentID: "$student.studentID",
                studentName: "$student.name",
                studentEmail: "$student.email",
                studentAddress: "$student.address",
                class: "$student.class",
                boards: "$student.boards",
                subjects: "$student.subjects",
                fatherName: "$student.fatherName",
                motherName: "$student.motherName",
                parentContact: "$student.parentContact",
                studentAlternateNumber: "$student.alternateNumber",
                // Requirement Fields
                requirementID: "$requirement.requirementID",
                reqEmployeeCode: "$requirement.employeeCode",
                tutionPlace: "$requirement.tutionPlace",
                studentClass: "$requirement.studentClass",
                sitting: "$requirement.sitting",
                duration: "$requirement.duration",
                budget: "$requirement.budget",
                genderPreference: "$requirement.genderPreference"
            }
        }
    ]);

    return res
        .status(200)
        .json(
            new ApiResponse(200, { lead: leads[0] }, 'Leads Details')
        )
})

const updateLeadsExcel = asyncHandler(async (req, res) => {

    const { leadsData } = req.body

    if (leadsData.length === 0) {
        throw new ApiError(400, 'Empty Excel')
    }

    leadsData.forEach(async (element) => {
        var leadID;
        let isUnique = false;

        while (!isUnique) {
            leadID = await genrateLeadID();
            const existedLeadID = await Lead.findOne({ leadID });
            if (!existedLeadID) {
                isUnique = true;
            }
        }
        /*
        
address
: 
"New Garia, Near Eden flora Complex"
alternateNo
: 
"9051224629"
boards
: 
"CBSE"
budget
: 
"Will be discussed after Demo class"
class
: 
"11"
duration
: 
"1hour 30minutes"
email
: 
"Nil"
employeeCode
: 
"OMD08"
fatherName
: 
"Nil"
genderPreference
: 
"No"
leadDates
: 
(2) [Mon Sep 22 2025 05:30:00 GMT+0530 (India Standard Time), Mon Sep 22 2025 05:30:00 GMT+0530 (India Standard Time)]
leadSource
: 
"third party"
leadStatus
: 
(2) ['New', 'Open']
leadType
: 
"New"
mobile
: 
"9051224629"
motherName
: 
"Nil"
name
: 
"Pranab Mondal"
sitting
: 
"1"
studentClass
: 
"11"
subjects
: 
"Math,Physics"
teacherName
: 
['Nil']
tutionPlace
        */

        const createLead = await Lead.create({
            leadID: leadID,
            email: element.email,
            employeeCode: element.employeeCode,
            mobile: element.mobile,
            leadType: element.leadType,
            leadStatus: element.leadStatus,
            longitude: element.longitude || '',
            latitude: element.latitude || '',
            address: element.address,
            alternateNo: element.alternateNo,
            leadDates: element.leadDates,
            leadSource: element.leadSource,
            name: element.name,
        })

        createRequirement = await Requirement.create({
            leadID: leadID,
            requirementID: leadID.replace('LD', 'RQ'),
            employeeCode: element.employeeCode,
            tutionPlace: element.tutionPlace,
            studentClass: element.studentClass,
            sitting: element.sitting,
            duration: element.duration,
            budget: element.budget,
            genderPreference: element.genderPreference,
        })

        const createStudents = await Student.create({
            leadID: leadID,
            studentID: leadID.replace('LD', 'SL'),
            name: element.name,
            email: element.email,
            address: element.address,
            class: element.class,
            boards: element.boards,
            subjects: element.subjects,
            fatherName: element.fatherName,
            motherName: element.motherName,
            parentContact: element.parentContact,
            alternateNumber: element.alternateNumber,
        })

        const createJob = await Job.create({
            leadID: '',
            jobID: '',
            employeeCode: '',
            jobTitle: '',
            studentID: '',
            teacher_id: '',
            remark: '',
        })

    });
})

const updateRequirement = asyncHandler(async (req, res) => {
    const { leadID, name, fatherName, motherName, email, mobile, alternateNo, address, tutionPlace, studentClass, boards, subjects, sitting, duration, budget, genderPreference } = req.body

    if (
        [name, fatherName, motherName, email, mobile, alternateNo, address, tutionPlace, studentClass, boards, subjects, sitting, duration, budget, genderPreference].some(item => item.trim() === '' || item === undefined)
    ) {
        throw new ApiError(400, 'Required Inputs')
    }

    const updateRequirement = await Requirement.updateOne(
        { leadID: leadID },
        {
            tutionPlace: tutionPlace,
            studentClass: studentClass,
            sitting: sitting,
            duration: duration,
            budget: budget,
            genderPreference: genderPreference
        }
    )

    const updateStudent = await Student.updateOne(
        { leadID: leadID },
        {
            name: name,
            class: studentClass,
            boards: boards,
            subjects: subjects,
            fatherName: fatherName,
            motherName: motherName,
            email: email,
            mobile: mobile,
            alternateNo: alternateNo,
            address: address,
        }
    )

    if (!updateStudent.acknowledged || !updateRequirement) {
        throw new ApiError(500, 'Update Failed')
    }

    return res
        .status(200)
        .json(
            new ApiResponse(200, {}, 'Updated Requirement Successfully')
        )
})

const assignTeachers = asyncHandler(async (req, res) => {
    const { leadID, teacher_id } = req.body

    if (
        [leadID, teacher_id].some(item => item === '' || !item)
    ) {
        throw new ApiError(400, 'Required Inputs')
    }

    const teacher = await Teacher.findOne({ teacher_id: teacher_id })

    if (!teacher) {
        throw new ApiError(403, 'Teacher Not Found')
    }

    const findJOB = await Job.findOne({ leadID: leadID })

    if (!findJOB) {
        throw new ApiError(404, 'Job ID not found')
    }

    findJOB.teacher_id.push(teacher_id)
    findJOB.remark.push('')
    findJOB.save()

    return res
        .status(200)
        .json(
            new ApiResponse(200, {}, 'Teacher Assigned Successfully')
        )
})

export {
    createLead,
    allotLeads,
    postRequirement,
    getAllLeads,
    searchLeads,
    changeLeadStatus,
    getRequirementWithLeadID,
    updateLeadsExcel,
    getAllLeadsDetails,
    updateRequirement,
    assignTeachers
}