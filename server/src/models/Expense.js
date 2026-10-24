import mongoose from 'mongoose';

const expenseSplitSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: [0, 'Split amount cannot be negative'],
      validate: {
        validator: Number.isInteger,
        message: 'Split amount must be an integer in minor units (e.g. cents/paise)',
      },
    },
  },
  { _id: false }
);

const expenseSchema = new mongoose.Schema(
  {
    trip: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Trip',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Expense title is required'],
      trim: true,
      maxlength: [120, 'Expense title cannot exceed 120 characters'],
    },
    amount: {
      type: Number,
      required: [true, 'Expense amount is required'],
      min: [1, 'Expense amount must be at least 1 minor unit'],
      validate: {
        validator: Number.isInteger,
        message: 'Amount must be an integer in minor units (e.g. cents/paise)',
      },
    },
    currency: {
      type: String,
      default: 'INR',
      uppercase: true,
      trim: true,
    },
    category: {
      type: String,
      enum: ['lodging', 'dining', 'transport', 'activity', 'groceries', 'entertainment', 'other'],
      default: 'other',
    },
    type: {
      type: String,
      enum: ['expense', 'refund'],
      default: 'expense',
    },
    paidBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Payer is required'],
    },
    splitType: {
      type: String,
      enum: ['equal', 'custom'],
      default: 'equal',
    },
    splits: {
      type: [expenseSplitSchema],
      validate: {
        validator: function (splits) {
          return Array.isArray(splits) && splits.length > 0;
        },
        message: 'Expense must have at least one participant in splits',
      },
    },
    receiptUrl: {
      type: String,
      default: '',
    },
    date: {
      type: Date,
      default: Date.now,
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

expenseSchema.index({ trip: 1, date: -1 });
expenseSchema.index({ trip: 1, category: 1 });
expenseSchema.index({ trip: 1, paidBy: 1 });

export const Expense = mongoose.model('Expense', expenseSchema);
export default Expense;
