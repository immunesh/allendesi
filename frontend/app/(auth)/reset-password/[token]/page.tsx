'use client'

import { useParams } from 'next/navigation'
import { useState } from 'react'

export default function ResetPasswordPage() {
  const { token } = useParams()
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const res = await fetch(
      `http://localhost:5000/api/auth/reset-password/${token}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      }
    )

    const data = await res.json()
    setMessage(data.message)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-black px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-2xl border border-red-900 bg-[#111] p-6"
      >
        <h1 className="mb-4 text-2xl font-bold text-red-500">
          Reset Password
        </h1>

        <input
          type="password"
          placeholder="Enter new password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mb-4 w-full rounded-xl border border-red-900 bg-black px-4 py-3 text-white outline-none focus:border-red-500"
        />

        <button
          type="submit"
          className="w-full rounded-xl bg-red-600 py-3 font-semibold text-white hover:bg-red-700"
        >
          Reset Password
        </button>

        {message && (
          <p className="mt-4 text-center text-sm text-gray-300">{message}</p>
        )}
      </form>
    </div>
  )
}