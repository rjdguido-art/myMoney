import { useEffect, useMemo, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import './App.css'
import {
  auth,
  logOut,
  registerWithEmail,
  signInWithEmail,
  signInWithGoogle,
} from './firebase'

const defaultCategories = ['Food', 'Transportation', 'Housing', 'Subscriptions', 'Shopping', 'Other']

const sampleExpenses = [
  { id: crypto.randomUUID(), category: 'Food', description: 'Groceries', amount: 180, date: new Date().toISOString().slice(0, 10) },
  { id: crypto.randomUUID(), category: 'Transportation', description: 'Transit pass', amount: 65, date: new Date().toISOString().slice(0, 10) },
  { id: crypto.randomUUID(), category: 'Subscriptions', description: 'Streaming', amount: 25, date: new Date().toISOString().slice(0, 10) },
]

const sampleCards = [
  { id: crypto.randomUUID(), name: 'Everyday Card', limit: 3000, closingDay: 25, paymentDay: 10, balance: 620 },
  { id: crypto.randomUUID(), name: 'Travel Rewards', limit: 6000, closingDay: 15, paymentDay: 3, balance: 1250 },
]

const formatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

const useStoredState = (key, initialValue) => {
  const [value, setValue] = useState(() => {
    const stored = localStorage.getItem(key)
    return stored ? JSON.parse(stored) : initialValue
  })

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value))
  }, [key, value])

  return [value, setValue]
}

function App() {
  const [income, setIncome] = useStoredState('income', 4800)
  const [expenses, setExpenses] = useStoredState('expenses', sampleExpenses)
  const [cards, setCards] = useStoredState('cards', sampleCards)
  const [user, setUser] = useState(null)
  const [authMode, setAuthMode] = useState('login')
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authError, setAuthError] = useState('')
  const [activePage, setActivePage] = useState('dashboard')
  const [signupForm, setSignupForm] = useState({
    fullName: '',
    email: '',
    password: '',
    confirm: '',
    income: 4800,
    deposit: 500,
  })
  const [signupMessage, setSignupMessage] = useState('')
  const [expenseForm, setExpenseForm] = useState({
    category: defaultCategories[0],
    description: '',
    amount: '',
    date: new Date().toISOString().slice(0, 10),
  })
  const [cardForm, setCardForm] = useState({
    name: '',
    limit: '',
    closingDay: 25,
    paymentDay: 5,
    balance: '',
  })
  const [aiProvider, setAiProvider] = useState('openai')
  const [aiKey, setAiKey] = useState('')
  const [aiQuestion, setAiQuestion] = useState('How can I trim spending while keeping my savings goal?')
  const [aiResponse, setAiResponse] = useState('')
  const [aiLoading, setAiLoading] = useState(false)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser)
    })
    return () => unsub()
  }, [])

  const totalExpenses = useMemo(() => expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0), [expenses])
  const balanceLeft = useMemo(() => income - totalExpenses, [income, totalExpenses])

  const totalsByCategory = useMemo(() => {
    return expenses.reduce((acc, expense) => {
      acc[expense.category] = (acc[expense.category] || 0) + Number(expense.amount || 0)
      return acc
    }, {})
  }, [expenses])

  const nextDueCard = useMemo(() => {
    const today = new Date()
    const nearest = cards
      .map((card) => {
        const paymentMonth = today.getDate() > card.paymentDay ? today.getMonth() + 1 : today.getMonth()
        const dueDate = new Date(today.getFullYear(), paymentMonth, card.paymentDay)
        return { ...card, dueDate }
      })
      .sort((a, b) => a.dueDate - b.dueDate)[0]
    return nearest
  }, [cards])

  const addExpense = (event) => {
    event.preventDefault()
    if (!expenseForm.amount) return
    setExpenses((prev) => [
      { ...expenseForm, id: crypto.randomUUID(), amount: Number(expenseForm.amount) },
      ...prev,
    ])
    setExpenseForm((prev) => ({ ...prev, description: '', amount: '' }))
  }

  const addCard = (event) => {
    event.preventDefault()
    if (!cardForm.name || !cardForm.limit) return
    setCards((prev) => [
      {
        ...cardForm,
        id: crypto.randomUUID(),
        limit: Number(cardForm.limit),
        balance: Number(cardForm.balance || 0),
        closingDay: Number(cardForm.closingDay),
        paymentDay: Number(cardForm.paymentDay),
      },
      ...prev,
    ])
    setCardForm({ name: '', limit: '', closingDay: 25, paymentDay: 5, balance: '' })
  }

  const deleteExpense = (id) => {
    setExpenses((prev) => prev.filter((e) => e.id !== id))
  }

  const mockAdvisor = () => {
    const topCategory = Object.entries(totalsByCategory).sort((a, b) => b[1] - a[1])[0]
    const suggestion = topCategory
      ? `Your largest spend is ${topCategory[0]} at ${formatter.format(topCategory[1])}. Look for quick wins there first.`
      : 'Add a few expenses to see personalized suggestions.'

    return [
      'AI helper is ready. Add an API key for OpenAI or Gemini to get live advice.',
      suggestion,
      balanceLeft < 0
        ? 'You are overspending versus income; move recurring bills after your income date and trim variable categories.'
        : 'You are net positive. Consider automating savings before spending.',
    ].join(' ')
  }

  const buildPrompt = () => {
    const expenseLines = expenses
      .slice(0, 15)
      .map((e) => `${e.category}: ${e.description || 'expense'} - ${e.amount}`)
      .join('\n')
    const cardLines = cards.map((c) => `${c.name}: balance ${c.balance} / limit ${c.limit}, due day ${c.paymentDay}`).join('\n')
    return `Income: ${income}.
Expenses:
${expenseLines || 'No expenses yet'}
Credit cards:
${cardLines || 'No cards'}
Give concise coaching and a budget split. Question: ${aiQuestion || 'Plan my month'}.`
  }

  const askAi = async () => {
    setAiLoading(true)
    setAiResponse('')
    const question = buildPrompt()

    if (!aiKey) {
      setAiResponse(mockAdvisor())
      setAiLoading(false)
      return
    }

    try {
      if (aiProvider === 'openai') {
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${aiKey}`,
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              { role: 'system', content: 'You are a concise personal finance coach helping with budgeting and credit card planning.' },
              { role: 'user', content: question },
            ],
            temperature: 0.4,
          }),
        })

        const data = await res.json()
        const answer = data?.choices?.[0]?.message?.content || JSON.stringify(data)
        setAiResponse(answer)
      } else {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${aiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [
                {
                  parts: [{ text: `You are a concise personal finance coach.\n${question}` }],
                },
              ],
            }),
          }
        )
        const data = await res.json()
        const answer = data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join('\n') || JSON.stringify(data)
        setAiResponse(answer)
      }
    } catch (error) {
      setAiResponse(`Could not reach ${aiProvider}. ${mockAdvisor()}`)
    } finally {
      setAiLoading(false)
    }
  }

  const budgetSuggestions = useMemo(() => {
    const essentials = income * 0.5
    const wants = income * 0.3
    const savings = income * 0.2
    return {
      essentials,
      wants,
      savings,
      goal: Math.max(balanceLeft * 0.3, 100),
    }
  }, [income, balanceLeft])

  const handleGoogle = async () => {
    setAuthError('')
    try {
      await signInWithGoogle()
    } catch (error) {
      setAuthError(error.message || 'Google sign-in failed')
    }
  }

  const handleEmailAuth = async (event) => {
    event.preventDefault()
    setAuthError('')
    if (!authEmail || !authPassword) {
      setAuthError('Enter email and password.')
      return
    }
    try {
      if (authMode === 'login') {
        await signInWithEmail(authEmail, authPassword)
      } else {
        await registerWithEmail(authEmail, authPassword)
      }
      setAuthPassword('')
    } catch (error) {
      setAuthError(error.message || 'Authentication failed')
    }
  }

  const handleSignOut = async () => {
    setAuthError('')
    try {
      await logOut()
    } catch (error) {
      setAuthError(error.message || 'Sign out failed')
    }
  }

  const handleSignupSubmit = async (event) => {
    event.preventDefault()
    setAuthError('')
    setSignupMessage('')
    if (!signupForm.email || !signupForm.password) {
      setAuthError('Enter email and password.')
      return
    }
    if (signupForm.password !== signupForm.confirm) {
      setAuthError('Passwords do not match.')
      return
    }
    try {
      await registerWithEmail(signupForm.email, signupForm.password)
      setIncome(Number(signupForm.income || income))
      setSignupMessage('Account created. Welcome aboard.')
      setActivePage('dashboard')
    } catch (error) {
      setAuthError(error.message || 'Sign up failed')
    }
  }

  return (
    <div className="page">
      <div className="topbar">
        <div className="brand">
          <span className="pill pill-soft">myMoney</span>
          <strong>Secure banking-style budgeting</strong>
        </div>
        <div className="topbar-actions">
          <button className={activePage === 'dashboard' ? 'ghost active' : 'ghost'} onClick={() => setActivePage('dashboard')}>
            Dashboard
          </button>
          <button className={activePage === 'signup' ? 'primary' : 'ghost'} onClick={() => setActivePage('signup')}>
            Sign up
          </button>
          {user && (
            <div className="pill pill-soft user-pill">
              {user.email || user.displayName || 'User'}
            </div>
          )}
        </div>
      </div>

      {activePage === 'signup' ? (
        <>
          <header className="hero signup-hero">
            <div>
              <p className="eyebrow">Open your account</p>
              <h1>Bank-grade onboarding for your money cockpit.</h1>
              <p className="lede">
                Create a secure profile, set your income, and start tracking spend across cards—ready to deploy on the web.
              </p>
              <div className="hero-actions">
                <button className="primary" onClick={() => setActivePage('dashboard')}>Skip to dashboard</button>
                <span className="secondary-text">Runs fully in your browser; publish via GitHub Pages.</span>
              </div>
            </div>
            <div className="hero-stat">
              <div className="stat-number">Zero fees</div>
              <p className="stat-label">Self-hosted control</p>
              <div className="pill pill-positive">Ready for GitHub Pages</div>
            </div>
          </header>

          <section className="grid">
            <div className="card stack signup-card">
              <div className="section-title">
                <h2>Sign up</h2>
                <span>Replicated banking flow with identity and funding details.</span>
              </div>
              <form className="signup-form" onSubmit={handleSignupSubmit}>
                <label>
                  <span>Full name</span>
                  <input
                    value={signupForm.fullName}
                    onChange={(e) => setSignupForm((prev) => ({ ...prev, fullName: e.target.value }))}
                    placeholder="Jane Doe"
                    required
                  />
                </label>
                <label>
                  <span>Email</span>
                  <input
                    type="email"
                    value={signupForm.email}
                    onChange={(e) => setSignupForm((prev) => ({ ...prev, email: e.target.value }))}
                    placeholder="you@email.com"
                    required
                  />
                </label>
                <label>
                  <span>Password</span>
                  <input
                    type="password"
                    value={signupForm.password}
                    onChange={(e) => setSignupForm((prev) => ({ ...prev, password: e.target.value }))}
                    placeholder="••••••••"
                    required
                  />
                </label>
                <label>
                  <span>Confirm password</span>
                  <input
                    type="password"
                    value={signupForm.confirm}
                    onChange={(e) => setSignupForm((prev) => ({ ...prev, confirm: e.target.value }))}
                    placeholder="••••••••"
                    required
                  />
                </label>
                <label>
                  <span>Monthly income</span>
                  <input
                    type="number"
                    value={signupForm.income}
                    onChange={(e) => setSignupForm((prev) => ({ ...prev, income: e.target.value }))}
                    min="0"
                  />
                </label>
                <label>
                  <span>Initial deposit</span>
                  <input
                    type="number"
                    value={signupForm.deposit}
                    onChange={(e) => setSignupForm((prev) => ({ ...prev, deposit: e.target.value }))}
                    min="0"
                  />
                </label>
                <button type="submit" className="primary wide">Create account</button>
                {signupMessage && <div className="alert">{signupMessage}</div>}
                {authError && <div className="alert">{authError}</div>}
              </form>
              <div className="signup-footnote">
                Powered by Firebase Auth (email/password) with optional Google sign-in after creation.
              </div>
            </div>
          </section>
        </>
      ) : (
        <>
          <header className="hero">
            <div>
              <p className="eyebrow">myMoney • Expense tracking</p>
              <h1>Keep every dollar on schedule.</h1>
              <p className="lede">
                Track income, daily spend, and credit card cycles. Ask an AI coach (OpenAI or Gemini) to optimize your month in one click.
              </p>
              <div className="hero-actions">
                <button className="primary" onClick={askAi} disabled={aiLoading}>
                  {aiLoading ? 'Thinking…' : 'Get AI plan'}
                </button>
                <span className="secondary-text">Data stays in your browser storage.</span>
              </div>
            </div>
            <div className="hero-stat">
              <div className="stat-number">{formatter.format(balanceLeft)}</div>
              <p className="stat-label">Projected cash after expenses</p>
              <div className={`pill ${balanceLeft >= 0 ? 'pill-positive' : 'pill-negative'}`}>
                {balanceLeft >= 0 ? 'On track' : 'Over budget'}
              </div>
            </div>
          </header>

          <section className="grid">
            <div className="card stack auth-card">
              <div className="section-title">
                <h2>Sign in to sync</h2>
                <span>Use Google or email/password via Firebase Auth.</span>
              </div>
              {user ? (
                <div className="auth-row">
                  <div>
                    <p className="eyebrow">Signed in</p>
                    <strong>{user.email || user.displayName || 'Google user'}</strong>
                  </div>
                  <button className="ghost" onClick={handleSignOut}>Sign out</button>
                </div>
              ) : (
                <div className="auth-grid">
                  <button className="primary" onClick={handleGoogle}>Continue with Google</button>
                  <div className="divider">or email</div>
                  <form className="auth-form" onSubmit={handleEmailAuth}>
                    <input
                      type="email"
                      placeholder="Email"
                      value={authEmail}
                      onChange={(e) => setAuthEmail(e.target.value)}
                      required
                    />
                    <input
                      type="password"
                      placeholder="Password"
                      value={authPassword}
                      onChange={(e) => setAuthPassword(e.target.value)}
                      required
                    />
                    <div className="auth-actions">
                      <label className="pill pill-soft">
                        <input
                          type="radio"
                          name="mode"
                          value="login"
                          checked={authMode === 'login'}
                          onChange={(e) => setAuthMode(e.target.value)}
                        />
                        Login
                      </label>
                      <label className="pill pill-soft">
                        <input
                          type="radio"
                          name="mode"
                          value="register"
                          checked={authMode === 'register'}
                          onChange={(e) => setAuthMode(e.target.value)}
                        />
                        Register
                      </label>
                      <button type="submit" className="primary">
                        {authMode === 'login' ? 'Login' : 'Create account'}
                      </button>
                    </div>
                    {authError && <div className="alert">{authError}</div>}
                  </form>
                </div>
              )}
            </div>
          </section>

          <section className="grid">
            <div className="card stack">
              <div className="section-title">
                <h2>Income</h2>
                <span>Update your monthly take-home pay.</span>
              </div>
              <label className="field">
                <span>Monthly income</span>
                <input
                  type="number"
                  value={income}
                  onChange={(e) => setIncome(Number(e.target.value || 0))}
                  min="0"
                />
              </label>
              <div className="budget-grid">
                <div className="mini-card">
                  <p>Suggested essentials (50%)</p>
                  <strong>{formatter.format(budgetSuggestions.essentials)}</strong>
                </div>
                <div className="mini-card">
                  <p>Suggested wants (30%)</p>
                  <strong>{formatter.format(budgetSuggestions.wants)}</strong>
                </div>
                <div className="mini-card">
                  <p>Suggested savings (20%)</p>
                  <strong>{formatter.format(budgetSuggestions.savings)}</strong>
                </div>
                <div className="mini-card">
                  <p>Set aside for goals</p>
                  <strong>{formatter.format(budgetSuggestions.goal)}</strong>
                </div>
              </div>
            </div>

            <div className="card stack">
              <div className="section-title">
                <h2>Credit cards</h2>
                <span>Track balances and payment days.</span>
              </div>
              <form className="form-inline" onSubmit={addCard}>
                <input
                  placeholder="Card name"
                  value={cardForm.name}
                  onChange={(e) => setCardForm((prev) => ({ ...prev, name: e.target.value }))}
                />
                <input
                  type="number"
                  placeholder="Limit"
                  value={cardForm.limit}
                  onChange={(e) => setCardForm((prev) => ({ ...prev, limit: e.target.value }))}
                />
                <input
                  type="number"
                  placeholder="Balance"
                  value={cardForm.balance}
                  onChange={(e) => setCardForm((prev) => ({ ...prev, balance: e.target.value }))}
                />
                <input
                  type="number"
                  placeholder="Closing day"
                  value={cardForm.closingDay}
                  onChange={(e) => setCardForm((prev) => ({ ...prev, closingDay: e.target.value }))}
                />
                <input
                  type="number"
                  placeholder="Payment day"
                  value={cardForm.paymentDay}
                  onChange={(e) => setCardForm((prev) => ({ ...prev, paymentDay: e.target.value }))}
                />
                <button type="submit" className="primary">Add card</button>
              </form>
              <div className="list">
                {cards.map((card) => (
                  <div key={card.id} className="list-row">
                    <div>
                      <strong>{card.name}</strong>
                      <p>{formatter.format(card.balance)} / {formatter.format(card.limit)} • Closes {card.closingDay} • Due {card.paymentDay}</p>
                    </div>
                    <div className="pill pill-soft">Utilization {Math.round((card.balance / card.limit) * 100)}%</div>
                  </div>
                ))}
              </div>
              {nextDueCard && (
                <div className="alert">
                  Next payment: {nextDueCard.name} on {nextDueCard.dueDate.toLocaleDateString()} — {formatter.format(nextDueCard.balance)} balance
                </div>
              )}
            </div>
          </section>

          <section className="grid">
            <div className="card stack">
              <div className="section-title">
                <h2>Add expense</h2>
                <span>Log spend by category to watch trends.</span>
              </div>
              <form className="expense-form" onSubmit={addExpense}>
                <label>
                  <span>Category</span>
                  <select
                    value={expenseForm.category}
                    onChange={(e) => setExpenseForm((prev) => ({ ...prev, category: e.target.value }))}
                  >
                    {defaultCategories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Description</span>
                  <input
                    value={expenseForm.description}
                    onChange={(e) => setExpenseForm((prev) => ({ ...prev, description: e.target.value }))}
                    placeholder="Lunch, bus pass, etc."
                  />
                </label>
                <label>
                  <span>Amount</span>
                  <input
                    type="number"
                    value={expenseForm.amount}
                    onChange={(e) => setExpenseForm((prev) => ({ ...prev, amount: e.target.value }))}
                    min="0"
                    step="0.01"
                  />
                </label>
                <label>
                  <span>Date</span>
                  <input
                    type="date"
                    value={expenseForm.date}
                    onChange={(e) => setExpenseForm((prev) => ({ ...prev, date: e.target.value }))}
                  />
                </label>
                <button type="submit" className="primary wide">Save expense</button>
              </form>
            </div>

            <div className="card stack">
              <div className="section-title">
                <h2>Spending overview</h2>
                <span>Compare spending vs. income.</span>
              </div>
              <div className="stats-row">
                <div className="mini-card">
                  <p>This month</p>
                  <strong>{formatter.format(totalExpenses)}</strong>
                </div>
                <div className="mini-card">
                  <p>Left after expenses</p>
                  <strong>{formatter.format(balanceLeft)}</strong>
                </div>
                <div className="mini-card">
                  <p>Expense rate</p>
                  <strong>{income ? Math.round((totalExpenses / income) * 100) : 0}% of income</strong>
                </div>
              </div>
              <div className="pill-strip">
                {Object.entries(totalsByCategory).map(([category, total]) => (
                  <div key={category} className="pill pill-soft">
                    {category}: {formatter.format(total)}
                  </div>
                ))}
                {!expenses.length && <div className="pill pill-soft">Add your first expense</div>}
              </div>
              <div className="list scroll">
                {expenses.map((expense) => (
                  <div key={expense.id} className="list-row">
                    <div>
                      <strong>{expense.description || expense.category}</strong>
                      <p>{expense.category} • {new Date(expense.date).toLocaleDateString()}</p>
                    </div>
                    <div className="list-row-actions">
                      <span className="amount">{formatter.format(expense.amount)}</span>
                      <button className="ghost" onClick={() => deleteExpense(expense.id)}>Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="grid">
            <div className="card stack ai-card">
              <div className="section-title">
                <h2>AI budget coach</h2>
                <span>Send your numbers to OpenAI GPT-4o mini or Gemini 1.5 Flash.</span>
              </div>
              <div className="ai-controls">
                <label>
                  <span>Provider</span>
                  <select value={aiProvider} onChange={(e) => setAiProvider(e.target.value)}>
                    <option value="openai">OpenAI GPT</option>
                    <option value="gemini">Gemini</option>
                  </select>
                </label>
                <label>
                  <span>API key</span>
                  <input
                    value={aiKey}
                    onChange={(e) => setAiKey(e.target.value.trim())}
                    placeholder="Paste your API key (kept local)"
                  />
                </label>
                <label>
                  <span>Question</span>
                  <textarea
                    value={aiQuestion}
                    onChange={(e) => setAiQuestion(e.target.value)}
                    rows="3"
                  />
                </label>
                <button className="primary" onClick={askAi} disabled={aiLoading}>
                  {aiLoading ? 'Calculating…' : 'Ask coach'}
                </button>
              </div>
              <div className="ai-response">
                {aiResponse || 'AI guidance will appear here. Without a key you will see a quick local suggestion.'}
              </div>
            </div>

            <div className="card stack">
              <div className="section-title">
                <h2>Quick calculators</h2>
                <span>Use these to adjust in seconds.</span>
              </div>
              <ul className="bullet-list">
                <li>Keep variable spend (food, fun, transport) under {formatter.format(income * 0.35)}.</li>
                <li>Cap card utilization below 30%: aim for {formatter.format(cards.reduce((s, c) => s + c.limit, 0) * 0.3)}.</li>
                <li>Move payment days after pay day to avoid overdraft; set alerts 3 days before due.</li>
                <li>Try a 24-hour pause before purchases over {formatter.format(100)}; log them here if they stay.</li>
              </ul>
            </div>
          </section>
        </>
      )}
    </div>
  )
}

export default App
