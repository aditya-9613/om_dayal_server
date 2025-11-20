import { asyncHandler } from '../utils/asyncHandler.js'
import { ApiError } from '../utils/ApiError.js'
import { ApiResponse } from '../utils/ApiResponse.js'
import { removeFromCloudinary, uploadOnCloudinary } from '../utils/cloudinary.js';
import { Teacher } from '../models/teacher.model.js';
import { generateTeacherID } from '../utils/CreateIDs.js';
import { Lead } from '../models/lead.model.js';
import { Job } from '../models/job.model.js';
import { Student } from '../models/student.model.js';


const haversineDistance = (lat1, lon1, lat2, lon2) => {
    const toRad = (x) => x * Math.PI / 180;

    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);

    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const earthRadius = 6378137; // meters

    return earthRadius * c;
}

const createTeacher = asyncHandler(async (req, res) => {

    const { teacherName, teacherEmail, teacherMobile, dateOfBirth, professionalExperience, alternateContact, stream, latitude, longitude, address, adharCardNo, gender, ratePerClass } = req.body;

    const { adharCardFront, adharCardBack, highestQualificationCertificate, teacherImage } = req.files;

    if (
        [teacherName, teacherEmail, teacherMobile, dateOfBirth, professionalExperience, stream, latitude, longitude, address, gender, ratePerClass].some((item) => item === '' || item === undefined)
    ) {
        throw new ApiError(400, 'All fields are required');
    }

    const existedTeacher = await Teacher.findOne({ teacherName: teacherName, teacherMobile: teacherMobile, teacherEmail: teacherEmail });

    if (existedTeacher) {
        throw new ApiError(409, 'Teacher already exists');
    }

    const files = [adharCardFront, adharCardBack, highestQualificationCertificate, teacherImage];

    const filesUploaded = await Promise.all(
        files.map(async (file) => {
            if (file && file[0].path) {
                const uploadResult = await uploadOnCloudinary(file[0].path);
                if (!uploadResult.secure_url) {
                    throw new ApiError(501, 'File upload failed');
                }
                return { [file[0].fieldname]: uploadResult.secure_url };
            }
            return null; // skip invalid file
        })
    );

    // Filter out nulls and merge into one object
    const mergedFiles = Object.assign({}, ...filesUploaded.filter(Boolean));


    var createTeacherID;
    let isUnique = false;

    while (!isUnique) {
        createTeacherID = generateTeacherID();
        const existedTeacherWithID = await Teacher.findOne({ teacher_id: createTeacherID });
        if (!existedTeacherWithID) {
            isUnique = true;
        }
    }

    const createTeacher = await Teacher.create({
        teacher_id: createTeacherID,
        teacherImage: mergedFiles?.teacherImage || null,
        teacherName: teacherName,
        teacherEmail: teacherEmail,
        teacherMobile: teacherMobile,
        dateOfBirth: dateOfBirth,
        gender: gender,
        ratePerClass: ratePerClass,
        stream: JSON.parse(stream),
        longitude: longitude,
        latitude: latitude,
        professionalExperience: professionalExperience || null,
        alternateContact: alternateContact || null,
        address: address,
        adharCardNo: adharCardNo || null,
        adharCardFront: mergedFiles?.adharCardFront || null,
        adharCardBack: mergedFiles?.adharCardBack || null,
        highestQualificationCertificate: mergedFiles?.highestQualificationCertificate || null
    })

    if (!createTeacher) {
        throw new ApiError(500, 'Teacher creation failed');
    }

    return res
        .status(200)
        .json(
            new ApiResponse(200, { teacher_id: createTeacherID }, 'Teacher created successfully')
        )
})

const updateTeacherDetails = asyncHandler(async (req, res) => {
    const { teacher_id, teacherName, teacherEmail, teacherMobile, dateOfBirth, professionalExperience, alternateContact, stream, latitude, longitude, address, adharCardNo, gender, ratePerClass } = req.body;

    const { adharCardFront, adharCardBack, highestQualificationCertificate, teacherImage } = req.files;

    if (
        [teacher_id, teacherName, teacherEmail, teacherMobile, dateOfBirth, professionalExperience, stream, latitude, longitude, address].some((item) => item === '' || item === undefined)
    ) {
        throw new ApiError(400, 'All fields are required');
    }

    const existedTeacher = await Teacher.findOne({ teacher_id: teacher_id });

    if (!existedTeacher) {
        throw new ApiError(404, 'Teacher not found');
    }

    const files = [adharCardFront, adharCardBack, highestQualificationCertificate, teacherImage];

    const filesUploaded = await Promise.all(
        files.map(async (file) => {
            if (file && file[0].path) {
                const uploadResult = await uploadOnCloudinary(file[0].path);
                if (!uploadResult.secure_url) {
                    throw new ApiError(501, 'File upload failed');
                }
                return { [file[0].fieldname]: uploadResult.secure_url };
            }
            return null; // skip invalid file
        })
    );

    // Filter out nulls and merge into one object
    const mergedFiles = Object.assign({}, ...filesUploaded.filter(Boolean));


    existedTeacher.teacherName = teacherName;
    existedTeacher.teacherEmail = teacherEmail;
    existedTeacher.teacherMobile = teacherMobile;
    existedTeacher.dateOfBirth = dateOfBirth;
    existedTeacher.gender = gender;
    existedTeacher.ratePerClass = ratePerClass;
    existedTeacher.stream = JSON.parse(stream);
    existedTeacher.longitude = longitude;
    existedTeacher.latitude = latitude;
    existedTeacher.professionalExperience = professionalExperience || null;
    existedTeacher.alternateContact = alternateContact || null;
    existedTeacher.address = address;
    existedTeacher.adharCardNo = adharCardNo || null;
    existedTeacher.adharCardFront = mergedFiles?.adharCardFront ? mergedFiles.adharCardFront : existedTeacher.adharCardFront;
    existedTeacher.adharCardBack = mergedFiles?.adharCardBack ? mergedFiles.adharCardBack : existedTeacher.adharCardBack;
    existedTeacher.highestQualificationCertificate = mergedFiles?.highestQualificationCertificate ? mergedFiles.highestQualificationCertificate : existedTeacher.highestQualificationCertificate;
    existedTeacher.teacherImage = mergedFiles?.teacherImage ? mergedFiles.teacherImage : existedTeacher.teacherImage;
    await existedTeacher.save();

    return res
        .status(200)
        .json(
            new ApiResponse(200, { teacher_id: teacher_id }, 'Teacher details updated successfully')
        )

})

const getTeacherDetails = asyncHandler(async (req, res) => {
    const { searchInput } = req.query;

    if (!searchInput || searchInput.trim() === '') {
        throw new ApiError(400, 'Required Fields');
    }

    const searchedOutput = await Teacher.findOne({
        $or: [
            { teacher_id: { $regex: searchInput, $options: 'i' } },
            { teacherName: { $regex: searchInput, $options: 'i' } },
            { teacherMobile: { $regex: searchInput, $options: 'i' } }
        ]
    });

    if (!searchedOutput) {
        throw new ApiError(404, 'Teacher not found');
    }

    return res
        .status(200)
        .json(
            new ApiResponse(200, { searchedOutput }, 'Teacher Data')
        )
})

const searchTeachersForLead = asyncHandler(async (req, res) => {

    const { leadID, range } = req.query;

    if (!leadID || !range || range === '') {
        throw new ApiError(400, 'Required Fields');
    }

    const lead = await Lead.findOne({ leadID });

    const studentDetails = await Student.findOne({ leadID })

    const subjects = studentDetails.subjects?.join(',')

    if (!lead) {
        throw new ApiError(404, 'Lead not found');
    }

    const leadLat = parseFloat(lead.latitude);
    const leadLon = parseFloat(lead.longitude);
    const rangeInMeters = parseFloat(range);

    if (isNaN(leadLat) || isNaN(leadLon) || isNaN(rangeInMeters)) {
        throw new ApiError(403, 'Invalid latitude, longitude, or range');
    }

    //if ALl Subjects written in any case is there then no need of subject match but if not this then match the subject

    const teachers = await Teacher.find({
        stream: {
            $elemMatch: {
                class: studentDetails.class,
            }
        }
    }).lean();

    const teachersFiltered = teachers.filter(teacher => {
        const teacherSubjects = teacher.stream?.map(s => s.subject.toLowerCase()) || [];
        const studentSubjects = studentDetails.subjects?.map(s => s.toLowerCase()) || [];

        // if teacher has "All Subjects" -> accept directly
        if (teacherSubjects.includes('all subjects')) return true;

        // otherwise, at least one subject must match
        return studentSubjects.some(sub => teacherSubjects.includes(sub));
    });

    // Filter teachers manually by calculating distance
    const teachersInRange = teachersFiltered.filter(teacher => {
        const teacherLat = parseFloat(teacher.latitude);
        const teacherLon = parseFloat(teacher.longitude);

        if (isNaN(teacherLat) || isNaN(teacherLon)) return false;

        const distance = haversineDistance(leadLat, leadLon, teacherLat, teacherLon);
        return distance <= rangeInMeters;
    });

    return res
        .status(200)
        .json(
            new ApiResponse(200, { teachers: teachersInRange, leadInfo: lead }, 'Teachers in range')
        )
})

const searchTeachersWithID = asyncHandler(async (req, res) => {
    const { teacher_id } = req.query;

    if (!teacher_id) {
        throw new ApiError(400, 'Teacher ID is required');
    }

    const teacher = await Teacher.findOne({ teacher_id });

    if (!teacher) {
        throw new ApiError(404, 'Teacher not found');
    }

    return res
        .status(200)
        .json(
            new ApiResponse(200, { teacher }, 'Teacher Data')
        )
})

const updateTeacherStatus = asyncHandler(async (req, res) => {

    const { teacher_id, teacherStatus } = req.body

    if (teacher_id === '' || teacherStatus === '') {
        throw new ApiError(400, 'Required Fields')
    }

    const existedTeacher = await Teacher.findOne({ teacher_id: teacher_id })

    if (!existedTeacher) {
        throw new ApiError(404, 'Teacher Missing')
    }

    existedTeacher.teacherStatus = teacherStatus
    await existedTeacher.save()

    return res
        .status(200)
        .json(
            new ApiResponse(200, {}, 'Teacher Status Updated')
        )
})

const updateTeacherExcel = asyncHandler(async (req, res) => {

    const { cleanedData } = req.body
    throw new ApiError(500, 'Forced Stop Ask Developer')

    if (cleanedData.length === 0) {
        throw new ApiError(400, 'Empty Excel')
    }

    try {
        for (let index = 0; index < cleanedData.length; index++) {
            const value = cleanedData[index]

            var createTeacherID;
            let isUnique = false;

            while (!isUnique) {
                createTeacherID = generateTeacherID();
                const existedTeacherWithID = await Teacher.findOne({ teacher_id: createTeacherID });
                if (!existedTeacherWithID) {
                    isUnique = true;
                }
            }

            const createTeacher = await Teacher.create({
                teacher_id: createTeacherID,
                teacherImage: value.teacherImage,
                teacherName: value.teacherName,
                dateOfBirth: value.dateOfBirth,
                gender: value.gender,
                ratePerClass: value.ratePerClass,
                teacherEmail: value.teacherEmail,
                teacherMobile: value.teacherMobile,
                stream: value.stream,
                longitude: value.longitude,
                latitude: value.latitude,
                address: value.address,
                professionalExperience: value.professionalExperience,
                alternateContact: value.alternateContact,
                adharCardNo: value.adharCardNo,
                adharCardFront: value.adharCardFront,
                adharCardBack: value.adharCardBack,
                highestQualificationCertificate: value.highestQualificationCertificate,
                qualification: value.qualification,
                aboutYourself: value.aboutYourself,
            })

            if (!createTeacher) {
                throw new ApiError(501, 'Data Not Created')
            }

        }

    } catch (error) {
        throw new ApiError(500, `${error}`)
    }


})

const commentTeacher = asyncHandler(async (req, res) => {
    const { leadID, teacher_id, remark } = req.body

    if (
        [leadID, teacher_id, remark].some(item => item === '' || !item)
    ) {
        throw new ApiError(400, 'Required Inputs')
    }

    const findJOB = await Job.findOne({ leadID: leadID })

    if (!findJOB) {
        throw new ApiError(404, 'Job Not Found')
    }

    const findTeacherIndex = (findJOB.teacher_id).indexOf(teacher_id)
    findJOB.remark[findTeacherIndex] = remark
    findJOB.save()

    return res
        .status(200)
        .json(
            new ApiResponse(200, {}, 'Teacher Remark Given')
        )
})

export {
    createTeacher,
    updateTeacherDetails,
    getTeacherDetails,
    searchTeachersForLead,
    searchTeachersWithID,
    updateTeacherStatus,
    updateTeacherExcel,
    commentTeacher
}