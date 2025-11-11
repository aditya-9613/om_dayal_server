import { Router } from "express";
import { employeeVerifyJWT, verifyJWT } from "../middlewares/auth.middlewares.js";
import { allotLeads, assignTeachers, changeLeadStatus, createLead, getAllLeads, getAllLeadsDetails, postRequirement, searchLeads, updateRequirement, getRequirementWithLeadID } from "../controllers/lead.controllers.js";


const router = Router()

//Admin routes
router.route('/createLead').post(verifyJWT, createLead)
router.route('/postRequirement').post(verifyJWT, postRequirement)
router.route('/getAllLeads').get(verifyJWT, getAllLeads)
router.route('/allotLeads').post(verifyJWT, allotLeads)
router.route('/searchLeads/:params').get(verifyJWT, searchLeads)
router.route('/changeLeadStatus').put(verifyJWT, changeLeadStatus)
router.route('/getLeadsAllData').get(verifyJWT, getAllLeadsDetails)
router.route('/updateRequirement').put(verifyJWT, updateRequirement)
router.route('/assignTeacher').put(verifyJWT, assignTeachers)
router.route('/getFullRequirements').get(verifyJWT, getRequirementWithLeadID)

//Employee routes
router.route('/createEmplLead').post(employeeVerifyJWT, createLead)
router.route('/postEmplRequirement').post(employeeVerifyJWT, postRequirement)
router.route('/getEmplAllLeads').get(employeeVerifyJWT, getAllLeads)
router.route('/searchEmplLeads/:params').get(employeeVerifyJWT, searchLeads)
router.route('/changeEmplLeadStatus').put(employeeVerifyJWT, changeLeadStatus)
router.route('/getLeadsAllDataEmployee').get(employeeVerifyJWT, getAllLeadsDetails)
router.route('/updateRequirementEmployee').put(employeeVerifyJWT, updateRequirement)
router.route('/assignTeacherEmployee').put(employeeVerifyJWT, assignTeachers)
router.route('/getFullRequirementsEmp').get(employeeVerifyJWT, getRequirementWithLeadID)


export default router