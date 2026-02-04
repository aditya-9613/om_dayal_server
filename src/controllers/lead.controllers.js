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
    const { leadID, employeeCode } = req.body;

    if (!leadID || !employeeCode) {
        throw new ApiError(400, "All fields are required");
    }

    const findLead = await Lead.findOne({ leadID });

    if (!findLead) {
        throw new ApiError(404, "Lead not found");
    }

    // Check if requirement exists
    const existingRequirement = await Requirement.findOne({ leadID });
    const existingStudent = await Student.findOne({ leadID });
    const existingJob = await Job.findOne({ leadID });

    /** ------------------------------------
     * CASE 1: FIRST TIME → CREATE DOCUMENTS
     ---------------------------------------*/
    if (!existingRequirement || !existingStudent || !existingJob) {
        const requirementID = leadID.replace("LD", "RQ");
        const studentID = leadID.replace("LD", "SL");

        if (existingStudent) {
            throw new ApiError(423, "Student with this leadID already exists");
        }

        await Requirement.create({
            leadID,
            employeeCode,
            requirementID,
            tutionPlace: "",
            studentClass: "",
            sitting: "",
            duration: "",
            budget: "",
            genderPreference: ""
        });

        await Student.create({
            leadID,
            studentID,
            name: findLead.name,
            email: findLead.email,
            address: findLead.address,
            class: "",
            boards: "",
            subjects: [],
            fatherName: "",
            motherName: "",
            parentContact: findLead.mobile,
            alternateNumber: findLead.alternateNo
        });

        await Job.create({
            leadID,
            jobID: leadID.replace("LD", "JO"),
            employeeCode,
            studentID,
            teacher_id: [],
            remark: []
        });

        findLead.employeeCode = employeeCode;
        await findLead.save();

        return res
            .status(200)
            .json(new ApiResponse(200, { leadID }, "Lead allotted successfully"));
    }

    /** ------------------------------------
     * CASE 2: SECOND TIME → JUST UPDATE
     ---------------------------------------*/

    // Prevent assigning same lead to same employee again
    const alreadyAllottedToSameEmployee = await Requirement.findOne({
        leadID,
        employeeCode
    });

    if (alreadyAllottedToSameEmployee) {
        throw new ApiError(422, "This lead is already allotted to this employee");
    }

    // Update Requirement
    await Requirement.updateOne(
        { leadID },
        { $set: { employeeCode } }
    );

    // Update Job
    await Job.updateOne(
        { leadID },
        { $set: { employeeCode } }
    );

    // Update Lead
    findLead.employeeCode = employeeCode;
    await findLead.save();

    return res
        .status(200)
        .json(new ApiResponse(200, { leadID }, "Lead Alloted successfully"));
});

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

    const leads = await Lead.aggregate([
        {
            $lookup: {
                from: "jobs",
                localField: "leadID",
                foreignField: "leadID",
                as: "jobInfo"
            }
        },
        {
            $unwind: {
                path: "$jobInfo",
                preserveNullAndEmptyArrays: true
            }
        },
        {
            $project: {
                _id: 1,
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
                teacher_id: "$jobInfo.teacher_id"
            }
        }
    ])

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
        [name, fatherName, motherName, email, mobile, alternateNo, address, tutionPlace, studentClass, boards, subjects, sitting, duration, budget, genderPreference].some(item => item === '' || item === undefined)
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
            parentContact: mobile,
            alternateNumber: alternateNo,
            address: address,
        }
    )

    const updateLead = await Lead.updateOne(
        { leadID: leadID },
        {
            email: email,
            mobile: mobile,
            address: address,
            alternateNo: alternateNo,
            name: name
        })

    if (!updateStudent.acknowledged || !updateRequirement.acknowledged || !updateLead.acknowledged) {
        throw new ApiError(500, 'Update Failed')
    }

    return res
        .status(200)
        .json(
            new ApiResponse(200, {}, 'Updated Requirement Successfully')
        )
})

const assignTeachers = asyncHandler(async (req, res) => {

    const { leadID, teacher_id, previousTeacher_id, cancellationReason } = req.body

    if (!previousTeacher_id) {

        if (!leadID || !teacher_id) {
            throw new ApiError(400, 'Required Input of LeadID and TeacherID')
        }
        const findTeacher = await Teacher.findOne({ teacher_id: teacher_id })

        if (!findTeacher) {
            throw new ApiError(403, 'Teacher Not Found')
        }

        const findJOB = await Job.findOne({ leadID: leadID })

        if (!findJOB) {
            throw new ApiError(404, 'Job ID not found')
        }

        findJOB.teacher_id.push(teacher_id)
        findJOB.remark.push('')
        await findJOB.save({ validateBeforeSave: false })

        return res
            .status(200)
            .json(
                new ApiResponse(200, {}, 'Teacher Assigned Successfully')
            )
    }

    if (
        [leadID, teacher_id, previousTeacher_id, cancellationReason].some(item => item === '' || !item)
    ) {
        throw new ApiError(400, 'Required Inputs')
    }

    if (teacher_id === previousTeacher_id) {
        throw new ApiError(400, 'Cannot assign the same teacher')
    }

    const findLead = await Lead.findOne({ leadID: leadID })

    if (!findLead || (findLead.leadStatus[findLead.leadStatus.length - 1] === 'Cancelled' || findLead.leadStatus[findLead.leadStatus.length - 1] === 'Archived' || findLead.leadStatus[findLead.leadStatus.length - 1] === 'Fixed')) {
        throw new ApiError(400, 'You cannot assign teacher to cancelled,archived or fixed leads please change the lead status first')
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
    const index = findJOB.teacher_id.indexOf(previousTeacher_id);
    findJOB.remark[index] = cancellationReason
    await findJOB.save({ validateBeforeSave: false })

    return res
        .status(200)
        .json(
            new ApiResponse(200, {}, 'Teacher Updated Successfully')
        )
})

const leadStatusData = asyncHandler(async (req, res) => {
    const findAllLeads = await Lead.find();

    const allLeadData = {
        New: 0,
        Open: 0,
        Progress: 0,
        Fixed: 0,
        Archived: 0,
        Pending: 0,
        Cancelled: 0
    };

    findAllLeads.forEach(item => {
        const leadStatusArray = item.leadStatus;

        if (Array.isArray(leadStatusArray) && leadStatusArray.length > 0) {
            const lastStatus = leadStatusArray[leadStatusArray.length - 1];

            if (allLeadData.hasOwnProperty(lastStatus)) {
                allLeadData[lastStatus] += 1;
            }
        }
    });

    return res
        .status(200)
        .json(
            new ApiResponse(200, { allLeadData }, 'All Data')
        )

})

const getLeadInfo = asyncHandler(async (req, res) => {
    const { leadID } = req.query

    if (!leadID) {
        throw new ApiError(400, 'Lead ID is Required')
    }

    const findLeadInfo = await Lead.aggregate([
        {
            $match: {
                leadID: leadID
            }
        },
        {
            $lookup: {
                from: 'jobs',
                localField: 'leadID',
                foreignField: 'leadID',
                as: 'jobInfo'
            }
        },
        {
            $unwind: {
                path: '$jobInfo',
                preserveNullAndEmptyArrays: true
            }
        },
        {
            $lookup: {
                from: 'teachers',
                localField: 'jobInfo.teacher_id', // array of teacher IDs
                foreignField: 'teacher_id',               // or teacherID (use correct field)
                as: 'teacherDetails'
            }
        },
        {
            $project: {
                _id: 1,
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
                teacher_id: '$jobInfo.teacher_id',
                jobID: '$jobInfo.jobID',
                studentID: '$jobInfo.studentID',
                remark: '$jobInfo.remark',
                teacherDetails: 1 // full teacher documents
            }
        }
    ]);


    if (!findLeadInfo || findLeadInfo.length === 0) {
        throw new ApiError(404, 'Lead not found')
    }

    return res
        .status(200)
        .json(
            new ApiResponse(200, { leadInfo: findLeadInfo[0] }, 'Lead Info fetched successfully')
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
    assignTeachers,
    leadStatusData,
    getLeadInfo
}