import mongoose, { Schema, Document, Model } from 'mongoose';

// Define the interface for the Session document
export interface ISession extends Document {
  sessionId: string;
  phoneNumber?: string;
  otp?: string;
  otpExpiresAt?: Date;
  isVerified?: boolean;
  currentUrl?: string;
  cart?: any[]; // Consider defining a more specific type for cart items
  createdAt: Date;
  updatedAt: Date;
}

// Define the Mongoose schema for the Session
const SessionSchema: Schema<ISession> = new Schema(
  {
    sessionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    phoneNumber: {
      type: String,
    },
    otp: {
      type: String,
    },
    otpExpiresAt: {
      type: Date,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    currentUrl: {
      type: String, // If tracking the user's current page in the Playwright session
    },
    cart: {
      type: Array, // Or Schema.Types.Mixed if structure is very dynamic
      default: [],
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt fields
  }
);

// Create and export the Mongoose model
// Check if the model already exists to prevent OverwriteModelError in Next.js hot-reloading
const Session: Model<ISession> = mongoose.models.Session || mongoose.model<ISession>('Session', SessionSchema);

export default Session;