import { Router } from "express";
import { employeeVerifyJWT, verifyJWT } from "../middlewares/auth.middlewares.js";
import { allRecordsPayments, cancelReceiptOrInvoice, collectPayment, createInvoice, viewInvoice, viewReceipt } from "../controllers/payment.controllers.js";


const router = Router()

//Admin Routes
router.route('/createInvoice').post(verifyJWT, createInvoice)
router.route('/collectPayment').post(verifyJWT, collectPayment)
router.route('/viewInvoice').get(verifyJWT, viewInvoice)
router.route('/viewReceipt').get(verifyJWT, viewReceipt)
router.route('/cancelDocuments').delete(verifyJWT, cancelReceiptOrInvoice)
router.route('/allRecords').get(verifyJWT, allRecordsPayments)

//Employee Routes

router.route('/createInvoiceEmployee').post(employeeVerifyJWT, createInvoice)
router.route('/collectPaymentEmployee').post(employeeVerifyJWT, collectPayment);
router.route('/viewInvoiceEmployee').get(employeeVerifyJWT, viewInvoice);
router.route('/viewReceiptEmployee').get(employeeVerifyJWT, viewReceipt);
router.route('/cancelDocumentsEmployee').delete(employeeVerifyJWT, cancelReceiptOrInvoice);
router.route('/allRecordsEmployee').get(employeeVerifyJWT, allRecordsPayments)



export default router;