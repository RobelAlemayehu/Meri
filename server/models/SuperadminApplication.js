import mongoose from "mongoose";

const legalDocSchema = new mongoose.Schema(
  {
    originalName: { type: String, required: true },
    storedName: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
  },
  { _id: false }
);

const superadminApplicationSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    organizationName: { type: String, required: true, trim: true },
    legalDocuments: [legalDocSchema],
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "registered"],
      default: "pending",
    },
    inviteToken: { type: String, default: null },
    inviteExpiresAt: { type: Date, default: null },
    reviewedAt: { type: Date, default: null },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" },
    rejectionReason: { type: String, trim: true, default: "" },
  },
  { timestamps: true }
);

superadminApplicationSchema.index({ email: 1, status: 1 });
superadminApplicationSchema.index({ inviteToken: 1 });

export default mongoose.model("SuperadminApplication", superadminApplicationSchema);
