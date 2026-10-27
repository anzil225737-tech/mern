import { useEffect, useState } from "react";
import "./App.css";

const API = "http://localhost:5000/api/expenses";

const emptyForm = {
  title: "",
  amount: "",
  category: "Food",
  date: "",
};

const money = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
});

async function request(url, options) {
  const response = await fetch(url, options);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Something went wrong.");
  }

  return data;
}

export default function App() {
  const [expenses, setExpenses] = useState([]);
  const [form, setForm] = useState({ ...emptyForm });
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    async function loadExpenses() {
      try {
        const data = await request(API);
        setExpenses(data);
      } catch (error) {
        setIsError(true);
        setMessage(error.message);
      } finally {
        setLoading(false);
      }
    }

    loadExpenses();
  }, []);

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  function resetForm() {
    setForm({ ...emptyForm });
    setEditingId(null);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!form.title.trim() || Number(form.amount) < 0.01) {
      setIsError(true);
      setMessage("Enter a title and an amount of at least 0.01.");
      return;
    }

    setBusy(true);
    setMessage("");

    try {
      const savedExpense = await request(
        editingId ? `${API}/${editingId}` : API,
        {
          method: editingId ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...form,
            amount: Number(form.amount),
          }),
        }
      );

      setExpenses((previous) => {
        const updated = editingId
          ? previous.map((expense) =>
              expense._id === editingId ? savedExpense : expense
            )
          : [...previous, savedExpense];

        return updated.sort(
          (first, second) => new Date(second.date) - new Date(first.date)
        );
      });

      setIsError(false);
      setMessage(editingId ? "Expense updated!" : "Expense added!");
      resetForm();
    } catch (error) {
      setIsError(true);
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  function handleEdit(expense) {
    setEditingId(expense._id);

    setForm({
      title: expense.title,
      amount: String(expense.amount),
      category: expense.category,
      date: expense.date.slice(0, 10),
    });

    setMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleDelete(id) {
    const confirmed = window.confirm("Delete this expense?");

    if (!confirmed) return;

    setBusy(true);
    setMessage("");

    try {
      await request(`${API}/${id}`, {
        method: "DELETE",
      });

      setExpenses((previous) =>
        previous.filter((expense) => expense._id !== id)
      );

      if (editingId === id) {
        resetForm();
      }

      setIsError(false);
      setMessage("Expense deleted!");
    } catch (error) {
      setIsError(true);
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  const total = expenses.reduce(
    (sum, expense) => sum + Number(expense.amount),
    0
  );

  return (
    <main className="container">
      <header>
        <p className="eyebrow">YOUR DAILY MONEY JOURNAL</p>
        <h1>Personal Expense Tracker</h1>
        <p>Keep track of where your money goes.</p>
      </header>

      <section className="summary">
        <span>Total amount spent</span>
        <strong>{loading ? "Loading..." : money.format(total)}</strong>
        <span>{expenses.length} expenses recorded</span>
      </section>

      <section className="card">
        <h2>{editingId ? "Edit expense" : "Add an expense"}</h2>

        <form onSubmit={handleSubmit}>
          <fieldset disabled={busy || loading}>
            <div className="form-grid">
              <label>
                Title
                <input
                  name="title"
                  value={form.title}
                  onChange={handleChange}
                  placeholder="For example, Lunch"
                  required
                />
              </label>

              <label>
                Amount (₹)
                <input
                  name="amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={form.amount}
                  onChange={handleChange}
                  placeholder="150"
                  required
                />
              </label>

              <label>
                Category
                <select
                  name="category"
                  value={form.category}
                  onChange={handleChange}
                >
                  {["Food", "Travel", "Bills", "Shopping", "Other"].map(
                    (category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    )
                  )}
                </select>
              </label>

              <label>
                Date
                <input
                  name="date"
                  type="date"
                  value={form.date}
                  onChange={handleChange}
                  required
                />
              </label>
            </div>

            <div className="actions">
              <button type="submit">
                {busy
                  ? "Please wait..."
                  : editingId
                    ? "Update Expense"
                    : "Add Expense"}
              </button>

              {editingId && (
                <button
                  type="button"
                  className="secondary"
                  onClick={resetForm}
                >
                  Cancel
                </button>
              )}
            </div>
          </fieldset>
        </form>

        {message && (
          <p
            role="status"
            className={`message ${isError ? "error" : "success"}`}
          >
            {message}
          </p>
        )}
      </section>

      <section className="card">
        <h2>Your expenses</h2>

        {loading ? (
          <p>Loading expenses...</p>
        ) : expenses.length === 0 ? (
          <p>No expenses yet. Add your first expense above.</p>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Amount</th>
                  <th>Category</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {expenses.map((expense) => (
                  <tr key={expense._id}>
                    <td>{expense.title}</td>
                    <td>{money.format(expense.amount)}</td>
                    <td>
                      <span className="badge">{expense.category}</span>
                    </td>
                    <td>
                      {new Date(expense.date).toLocaleDateString("en-IN", {
                        timeZone: "UTC",
                      })}
                    </td>
                    <td>
                      <div className="row-actions">
                        <button
                          type="button"
                          className="secondary"
                          disabled={busy}
                          onClick={() => handleEdit(expense)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="danger"
                          disabled={busy}
                          onClick={() => handleDelete(expense._id)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}