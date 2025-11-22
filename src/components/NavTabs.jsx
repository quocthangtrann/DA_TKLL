import React from "react";
import { NavLink } from "react-router-dom";

export default function NavTabs({ onLogout, username }) {
  return (
    <header className="bg-white shadow-sm">
      <div className="max-w-6xl mx-auto flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-6">
          <div className="text-lg font-bold">Smart Watering</div>
          <nav className="flex gap-2">
            <NavLink to="/" end className={({isActive})=> isActive ? "px-3 py-1 rounded-md bg-slate-100" : "px-3 py-1 rounded-md hover:bg-slate-50"}>
              Home
            </NavLink>
            <NavLink to="/history" className={({isActive})=> isActive ? "px-3 py-1 rounded-md bg-slate-100" : "px-3 py-1 rounded-md hover:bg-slate-50"}>
              History
            </NavLink>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-600">Hi, {username}</div>
          <button onClick={onLogout} className="px-3 py-1 border rounded">Logout</button>
        </div>
      </div>
    </header>
  );
}
