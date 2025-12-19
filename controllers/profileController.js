const bcrypt = require('bcrypt');
const UserModel = require('../models/userModel');

class ProfileController {

  // GET profile
  static async getProfile(req, res) {
    try {
      if (!req.session || !req.session.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const user = req.session.user;
      const dbUser = await UserModel.findByEmail(user.email);
      if (!dbUser) return res.status(404).json({ message: 'User not found' });

      const { password, ...data } = dbUser; // omit password
      res.json(data);
    } catch (err) {
      console.error("getProfile error:", err);
      res.status(500).json({ message: 'Server error' });
    }
  }

  // UPDATE profile (full_name + avatar)
  static async updateProfile(req, res) {
    try {
      if (!req.session || !req.session.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const user = req.session.user;
      const { full_name, avatar } = req.body;

      const updated = await UserModel.update(user.id, { full_name, avatar });
      const { password, ...data } = updated;
      res.json(data);
    } catch (err) {
      console.error("updateProfile error:", err);
      res.status(500).json({ message: 'Failed to update profile' });
    }
  }

  // CHANGE PASSWORD
  static async changePassword(req, res) {
    try {
      if (!req.session || !req.session.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const user = req.session.user;
      const { currentPassword, newPassword } = req.body;

      const dbUser = await UserModel.findByEmail(user.email);
      if (!dbUser) return res.status(404).json({ message: 'User not found' });

      const match = await bcrypt.compare(currentPassword, dbUser.password);
      if (!match) return res.status(400).json({ message: 'Incorrect current password' });

      const hashed = await bcrypt.hash(newPassword, 10);
      await UserModel.update(user.id, { password: hashed });

      res.json({ success: true });
    } catch (err) {
      console.error("changePassword error:", err);
      res.status(500).json({ message: 'Failed to update password' });
    }
  }

  // VERIFY CURRENT PASSWORD
  static async verifyPassword(req, res) {
    try {
      if (!req.session || !req.session.user) {
        return res.status(401).json({ valid: false, message: "User not logged in" });
      }

      const user = req.session.user;
      const { currentPassword } = req.body;

      const dbUser = await UserModel.findByEmail(user.email);
      if (!dbUser) return res.status(404).json({ valid: false, message: "User not found" });

      const match = await bcrypt.compare(currentPassword, dbUser.password);
      if (match) return res.json({ valid: true });
      return res.json({ valid: false });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Server error" });
    }
  }
}

module.exports = ProfileController;
