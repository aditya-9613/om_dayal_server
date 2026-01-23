import { Router } from "express";
import { verifyJWT, employeeVerifyJWT } from '../middlewares/auth.middlewares.js'
import { commentTeacher, createTeacher, getTeacherDetails, searchTeachersForLead, searchTeachersWithID, teacherSearchWithIdName, updateTeacherDetails, updateTeacherExcel, updateTeacherStatus } from "../controllers/teacher.controllers.js";
import { upload } from '../middlewares/multer.middlewares.js'

const router = Router();

//Admin Routes


router.route('/addTeacher').post(verifyJWT,
    upload.fields([
        { name: 'adharCardFront', maxCount: 1 },
        { name: 'adharCardBack', maxCount: 1 },
        { name: 'highestQualificationCertificate', maxCount: 1 },
        { name: 'teacherImage', maxCount: 1 }
    ]),
    createTeacher
);
router.route('/updateTeacher').put(verifyJWT,
    upload.fields([
        { name: 'adharCardFront', maxCount: 1 },
        { name: 'adharCardBack', maxCount: 1 },
        { name: 'highestQualificationCertificate', maxCount: 1 },
        { name: 'teacherImage', maxCount: 1 }
    ]),
    updateTeacherDetails
)
router.route('/getTeacherDetails').get(verifyJWT, getTeacherDetails)
router.route('/searchTeachersForLead').get(verifyJWT, searchTeachersForLead)
router.route('/searchTeachersWithID').get(verifyJWT, searchTeachersWithID)
router.route('/updateTeacherStatus').put(verifyJWT, updateTeacherStatus)
router.route('/excelUpdate').post(verifyJWT, updateTeacherExcel)
router.route('/giveRemark').put(verifyJWT, commentTeacher)
router.route('/teacherSearchWithID').get(verifyJWT, teacherSearchWithIdName)

//Employee Routes

router.route('/addTeacherEmployee').post(employeeVerifyJWT,
    upload.fields([
        { name: 'adharCardFront', maxCount: 1 },
        { name: 'adharCardBack', maxCount: 1 },
        { name: 'highestQualificationCertificate', maxCount: 1 },
        { name: 'teacherImage', maxCount: 1 }
    ]),
    createTeacher
);
router.route('/updateTeacherEmployee').put(employeeVerifyJWT,
    upload.fields([
        { name: 'adharCardFront', maxCount: 1 },
        { name: 'adharCardBack', maxCount: 1 },
        { name: 'highestQualificationCertificate', maxCount: 1 },
        { name: 'teacherImage', maxCount: 1 }
    ]),
    updateTeacherDetails
)
router.route('/getTeacherDetailsEmployee').get(employeeVerifyJWT, getTeacherDetails)
router.route('/searchTeachersForLeadEmployee').get(employeeVerifyJWT, searchTeachersForLead)
router.route('/searchTeachersWithIDEmployee').get(employeeVerifyJWT, searchTeachersWithID)
router.route('/updateTeacherStatusEmployee').put(employeeVerifyJWT, updateTeacherStatus)
router.route('/giveRemarkEmployee').put(employeeVerifyJWT, commentTeacher)
router.route('/teacherSearchWithIDEmp').get(employeeVerifyJWT, teacherSearchWithIdName)


export default router;