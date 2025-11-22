import React, { useState } from "react";

/**
 * Simple login page (frontend-only)
 * Default credential: admin / password
 */
export default function Login({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");

  function submit(e) {
    e.preventDefault();
    // Simple local auth - replace with real backend later
    if (username === "admin" && password === "password") {
      onLogin({ username: "admin" });
    } else {
      setErr("Invalid credentials. Try admin / password");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md bg-white p-8 rounded-xl shadow">
        <h2 className="text-2xl font-bold mb-4">Sign in</h2>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="text-sm text-gray-600">Username</label>
            <input
              className="mt-1 w-full px-3 py-2 border rounded"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="text-sm text-gray-600">Password</label>
            <input
              type="password"
              className="mt-1 w-full px-3 py-2 border rounded"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {err && <div className="text-sm text-red-500">{err}</div>}
          <button className="w-full bg-indigo-600 text-white py-2 rounded">Sign in</button>
        </form>
        <div className="text-xs text-gray-500 mt-4">
          Demo account: <strong>admin</strong> / <strong>password</strong>
        </div>
      </div>
    </div>
  );
}
