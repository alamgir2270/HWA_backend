const express = require("express");
const router = express.Router();
const authenticate = require("../middleware/auth.middleware");
const billsController = require("../controllers/bills.controller");

// All routes require authentication
router.use(authenticate);

// GET all bills (patients see their own, admins see all)
router.get("/", billsController.getBills);

// GET patient's bill summary (balance, totals, etc.)
router.get("/summary", billsController.getPatientBillSummary);

// POST patient payment (patients pay their bills)
router.post("/:id/pay", billsController.payBill);

// GET single bill
router.get("/:id", billsController.getBill);

// POST create bill (admin only)
router.post("/", billsController.createBill);

// PATCH update bill (admin only - payment updates)
router.patch("/:id", billsController.updateBill);

// DELETE bill (admin only)
router.delete("/:id", billsController.deleteBill);

module.exports = router;
