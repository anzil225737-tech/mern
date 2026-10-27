require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

const categories = ["Food", "Travel", "Bills", "Shopping", "Other"];

const expenseSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  amount: {
    type: Number,
    required: true,
    min: 0.01,
  },
  category: {
    type: String,
    required: true,
    enum: categories,
  },
  date: {
    type: Date,
    required: true,
  },
});

const Expense = mongoose.model("Expense", expenseSchema);

// Check the data before saving it.
function validateExpense(body) {
  const { title, amount, category, date } = body;

  if (typeof title !== "string" || !title.trim()) {
    return "Please enter a title.";
  }

  if (
    !["number", "string"].includes(typeof amount) ||
    !Number.isFinite(Number(amount)) ||
    Number(amount) < 0.01
  ) {
    return "Please enter an amount of at least 0.01.";
  }

  if (!categories.includes(category)) {
    return "Please select a valid category.";
  }

  if (
    typeof date !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(date)
  ) {
    return "Please enter a valid date.";
  }

  const parsedDate = new Date(`${date}T00:00:00.000Z`);

  if (
    Number.isNaN(parsedDate.getTime()) ||
    parsedDate.toISOString().slice(0, 10) !== date
  ) {
    return "Please enter a valid date.";
  }

  return null;
}

function getExpenseData(body) {
  return {
    title: body.title.trim(),
    amount: Number(body.amount),
    category: body.category,
    date: body.date,
  };
}

// View all expenses.
app.get("/api/expenses", async (req, res) => {
  try {
    const expenses = await Expense.find().sort({ date: -1 });
    res.json(expenses);
  } catch (error) {
    res.status(500).json({ message: "Unable to load expenses." });
  }
});

// Add an expense.
app.post("/api/expenses", async (req, res) => {
  const validationError = validateExpense(req.body);

  if (validationError) {
    return res.status(400).json({ message: validationError });
  }

  try {
    const expense = await Expense.create(getExpenseData(req.body));
    res.status(201).json(expense);
  } catch (error) {
    res.status(500).json({ message: "Unable to save expense." });
  }
});

// Check IDs before updating or deleting.
app.param("id", (req, res, next, id) => {
  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ message: "Invalid expense ID." });
  }

  next();
});

// Update an expense.
app.put("/api/expenses/:id", async (req, res) => {
  const validationError = validateExpense(req.body);

  if (validationError) {
    return res.status(400).json({ message: validationError });
  }

  try {
    const expense = await Expense.findByIdAndUpdate(
      req.params.id,
      getExpenseData(req.body),
      { new: true, runValidators: true }
    );

    if (!expense) {
      return res.status(404).json({ message: "Expense not found." });
    }

    res.json(expense);
  } catch (error) {
    res.status(500).json({ message: "Unable to update expense." });
  }
});

// Delete an expense.
app.delete("/api/expenses/:id", async (req, res) => {
  try {
    const expense = await Expense.findByIdAndDelete(req.params.id);

    if (!expense) {
      return res.status(404).json({ message: "Expense not found." });
    }

    res.json({ message: "Expense deleted." });
  } catch (error) {
    res.status(500).json({ message: "Unable to delete expense." });
  }
});

async function startServer() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected");

    const port = process.env.PORT || 5000;

    app.listen(port, () => {
      console.log(`Server running on http://localhost:${port}`);
    });
  } catch (error) {
    console.error("Could not start server:", error.message);
    process.exit(1);
  }
}

startServer();