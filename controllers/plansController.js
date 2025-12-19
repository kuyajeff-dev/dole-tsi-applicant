const Plan = require('../models/planModel');
const pool = require('../db/mysql');
const transporter = require('../config/nodemailer');

exports.getAllPlans = async (req, res) => {
    try {
        if (!req.session || !req.session.user) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        const user = req.session.user;

        let plans;
        if (user.role === 'admin') {
            // Admin sees all plans
            plans = await Plan.findAll();
        } else {
            // Normal user sees only their plans
            plans = await Plan.findByUser(user.id);
        }

        res.json(plans);

    } catch (err) {
        console.error("Error fetching plans:", err);
        res.status(500).json({ error: "Server error fetching plans" });
    }
};

exports.getAllApplicantPlans = async (req, res) => {
  try {
    // Admin-only check
    if (!req.session.admin || req.session.admin.role !== 'admin') {
      return res.status(401).json({ error: "Unauthorized. Admin only." });
    }

    // Fetch all plans/submissions
    const plans = await Plan.getAll(); // your static async findAll method

    res.json(plans);
  } catch (err) {
    console.error("Failed to fetch applicant plans:", err);
    res.status(500).json({ message: "Failed to fetch applicant plans" });
  }
};

exports.updateApplicant = async (req, res) => {
  try {
    // Check admin session
    if (!req.session.admin || req.session.admin.role !== 'admin') {
      return res.status(401).json({ error: "Unauthorized. Admin only." });
    }

    const id = req.params.id;
    const { remarks, evaluated_by, evaluation_date } = req.body;

    const result = await Plan.updateApplicant(id, remarks, evaluated_by, evaluation_date);

    res.json({ success: true, updated: result });
  } catch (err) {
    console.error("Failed to update applicant plan:", err);
    res.status(500).json({ message: "Failed to update applicant plan" });
  }
};

exports.updateApplicantStatus = async (req, res) => {
  try {
    if (!req.session.admin || req.session.admin.role !== 'admin') {
      return res.status(401).json({ error: "Unauthorized. Admin only." });
    }

    const id = req.params.id;
    const { status } = req.body;

    // Update status in DB
    const result = await Plan.UpdateStatus(id, status);

    // Fetch user email and name for notification
    const [planRows] = await pool.query(
      `SELECT u.email, u.full_name, cs.applicant_establishment 
       FROM checklist_submissions cs 
       LEFT JOIN users u ON cs.user_id = u.id 
       WHERE cs.id = ?`,
      [id]
    );

    if (planRows.length > 0) {
      const user = planRows[0];

      if (['approved', 'rejected'].includes(status.toLowerCase())) {
        // Send email notification using pre-configured transporter
        const mailOptions = {
          from: `"TSI Applicant System" <${process.env.GMAIL_USER}>`,
          to: [user.email, ...(process.env.ADMIN_EMAILS || '').split(',')],
          subject: `Your application has been ${status}`,
          html: `
            <p>Hello ${user.full_name},</p>
            <p>Your application for <strong>${user.applicant_establishment}</strong> has been <strong>${status}</strong>.</p>
            <p>Thank you for using our system.</p>
          `
        };

        transporter.sendMail(mailOptions, (err, info) => {
          if (err) console.error("Email error:", err);
          else console.log("Email sent:", info.response);
        });
      }
    }

    res.json({ success: true, updated: result });

  } catch (err) {
    console.error("Failed to update applicant plan status:", err);
    res.status(500).json({ message: "Failed to update applicant plan status" });
  }
};

exports.getApprovalsByStatus = async (req, res) => {
  try {
    // Check admin session
    if (!req.session.admin || req.session.admin.role !== 'admin') {
      return res.status(401).json({ error: "Unauthorized. Admin only." });
    }

    const { status } = req.query;
    if (!['approved', 'pending', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const result = await Plan.getStatus(status); 
    return res.json(result);

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
};

exports.getPlanById = async (req, res) => {
  try {
    // Admin session check
    if (!req.session.admin || req.session.admin.role !== 'admin') {
      return res.status(401).json({ error: "Unauthorized. Admin only." });
    }

    const { id } = req.params;
    if (!id) return res.status(400).json({ error: "Plan ID is required" });

    // Fetch plan from DB
    const [plan] = await Plan.getById(id); // expects array, get first row
    if (!plan) return res.status(404).json({ error: "Plan not found" });

    return res.json(plan);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
};