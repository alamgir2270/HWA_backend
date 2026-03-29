const { Bill, Patient, Appointment, User, Admin } = require("../models");

// GET all bills (filtered by role)
exports.getBills = async (req, res) => {
  try {
    const user = req.user;
    let where = {};

    // Patients see only their bills; admins see all
    if (user.role === "patient") {
      const patient = await Patient.findOne({ where: { user_id: user.user_id } });
      where.patient_id = patient?.patient_id;
    }

    const bills = await Bill.findAll({
      where,
      include: [
        { model: Patient, include: [{ model: User, attributes: ["full_name", "email"] }] },
        { model: Appointment, attributes: ["appointment_id", "start_time", "status"] },
        { model: Admin, include: [{ model: User, attributes: ["full_name", "email"] }] },
      ],
      order: [["issue_date", "DESC"]],
    });

    res.json({ success: true, data: bills });
  } catch (err) {
    console.error("getBills error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET single bill
exports.getBill = async (req, res) => {
  try {
    const bill = await Bill.findByPk(req.params.id, {
      include: [
        { model: Patient, include: [{ model: User, attributes: ["full_name", "email"] }] },
        { model: Appointment, attributes: ["appointment_id", "start_time", "status"] },
        { model: Admin, include: [{ model: User, attributes: ["full_name", "email"] }] },
      ],
    });

    if (!bill) {
      return res.status(404).json({ success: false, message: "Bill not found" });
    }

    res.json({ success: true, data: bill });
  } catch (err) {
    console.error("getBill error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// CREATE bill
exports.createBill = async (req, res) => {
  try {
    const { patient_id, appointment_id, total_amount, due_date, remarks } = req.body;
    const user = req.user;

    // Only admins can create bills
    if (user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Only admins can create bills" });
    }

    // Get admin_id from current user
    const admin = await Admin.findOne({ where: { user_id: user.user_id } });

    const bill = await Bill.create({
      patient_id,
      appointment_id,
      admin_id: admin?.admin_id,
      total_amount,
      payment_status: "unpaid",
      due_date,
      remarks,
      issue_date: new Date(),
    });

    const billWithData = await Bill.findByPk(bill.bill_id, {
      include: [
        { model: Patient, include: [{ model: User, attributes: ["full_name", "email"] }] },
        { model: Appointment, attributes: ["appointment_id", "start_time", "status"] },
        { model: Admin, include: [{ model: User, attributes: ["full_name", "email"] }] },
      ],
    });

    res.status(201).json({ success: true, data: billWithData });
  } catch (err) {
    console.error("createBill error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// UPDATE bill (pay/refund)
exports.updateBill = async (req, res) => {
  try {
    const { id } = req.params;
    const { paid_amount, payment_status, payment_method, payment_date, remarks } = req.body;
    const user = req.user;

    // Only admins can update bills
    if (user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Only admins can update bills" });
    }

    const bill = await Bill.findByPk(id);
    if (!bill) {
      return res.status(404).json({ success: false, message: "Bill not found" });
    }

    // Update fields
    if (paid_amount !== undefined) bill.paid_amount = paid_amount;
    if (payment_status !== undefined) bill.payment_status = payment_status;
    if (payment_method !== undefined) bill.payment_method = payment_method;
    if (payment_date !== undefined) bill.payment_date = payment_date;
    if (remarks !== undefined) bill.remarks = remarks;

    await bill.save();

    const updatedBill = await Bill.findByPk(id, {
      include: [
        { model: Patient, include: [{ model: User, attributes: ["full_name", "email"] }] },
        { model: Appointment, attributes: ["appointment_id", "start_time", "status"] },
        { model: Admin, include: [{ model: User, attributes: ["full_name", "email"] }] },
      ],
    });

    res.json({ success: true, data: updatedBill });
  } catch (err) {
    console.error("updateBill error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE bill (admin only)
exports.deleteBill = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;

    // Only admins can delete bills
    if (user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Only admins can delete bills" });
    }

    const bill = await Bill.findByPk(id);
    if (!bill) {
      return res.status(404).json({ success: false, message: "Bill not found" });
    }

    await bill.destroy();
    res.json({ success: true, message: "Bill deleted" });
  } catch (err) {
    console.error("deleteBill error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET patient's bill summary (total paid, balance, etc.)
exports.getPatientBillSummary = async (req, res) => {
  try {
    const user = req.user;
    const patient = await Patient.findOne({ where: { user_id: user.user_id } });

    if (!patient) {
      return res.status(404).json({ success: false, message: "Patient not found" });
    }

    const bills = await Bill.findAll({
      where: { patient_id: patient.patient_id },
    });

    const totalAmount = bills.reduce((sum, b) => sum + parseFloat(b.total_amount || 0), 0);
    const totalPaid = bills.reduce((sum, b) => sum + parseFloat(b.paid_amount || 0), 0);
    const balance = totalAmount - totalPaid;

    const summary = {
      patient_id: patient.patient_id,
      total_bills: bills.length,
      total_amount: totalAmount,
      total_paid: totalPaid,
      balance_due: Math.max(0, balance),
      unpaid_count: bills.filter(b => b.payment_status === "unpaid").length,
      partial_count: bills.filter(b => b.payment_status === "partial").length,
    };

    res.json({ success: true, data: summary });
  } catch (err) {
    console.error("getPatientBillSummary error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// PATIENT PAY BILL - Record payment from patient
exports.payBill = async (req, res) => {
  try {
    const user = req.user;
    const bill_id = req.params.id;  // Get bill_id from URL parameter
    const { amount_paid, payment_method } = req.body;

    // Only patients can pay their own bills
    if (user.role !== "patient") {
      return res.status(403).json({ success: false, message: "Only patients can pay bills" });
    }

    const bill = await Bill.findByPk(bill_id);
    if (!bill) {
      return res.status(404).json({ success: false, message: `Bill not found (ID: ${bill_id})` });
    }

    // Verify patient owns this bill
    const patient = await Patient.findOne({ where: { user_id: user.user_id } });
    if (bill.patient_id !== patient.patient_id) {
      return res.status(403).json({ success: false, message: "Not authorized to pay this bill" });
    }

    console.log(`Payment Processing:`);
    console.log(`   Bill ID: ${bill_id}`);
    console.log(`   Patient ID: ${patient.patient_id}`);
    console.log(`   Amount to Pay: BDT ${amount_paid}`);
    console.log(`   Payment Method: ${payment_method}`);

    // Calculate balance due
    const balanceDue = parseFloat(bill.total_amount) - parseFloat(bill.paid_amount || 0);
    const paymentAmount = parseFloat(amount_paid || 0);

    // Full payment required - no partial payments allowed
    if (Math.abs(paymentAmount - balanceDue) > 0.01) {
      console.log(`Partial payment rejected: Amount ${paymentAmount} != Balance ${balanceDue}`);
      return res.status(400).json({
        success: false,
        message: `Full payment of BDT ${balanceDue.toFixed(2)} is required. Partial payments are not allowed.`,
      });
    }

    // Full payment only
    const newStatus = "paid";

    // Update bill with full payment
    await bill.update({
      paid_amount: balanceDue,  // Full amount
      payment_status: newStatus,
      payment_method: payment_method || "unknown",
      payment_date: new Date(),
    });

    const updatedBill = await Bill.findByPk(bill_id, {
      include: [
        { model: Patient, include: [{ model: User, attributes: ["full_name", "email"] }] },
        { model: Appointment, attributes: ["appointment_id", "start_time", "status"] },
      ],
    });

    res.json({
      success: true,
      message: `Full payment successful! Your bill has been completely paid.`,
      data: updatedBill,
    });
  } catch (err) {
    console.error("payBill error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};
