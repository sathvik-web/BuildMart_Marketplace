"use client";

import Link from "next/link";
import { useState } from "react";

export default function Navbar() {
  const [loggedIn] = useState(false);

  return (
    <nav className="w-full border-b bg-white">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">

        <Link href="/" className="text-xl font-bold text-orange-600">
          BuildMart
        </Link>

        <div className="hidden md:flex gap-6 text-gray-700">
          <Link href="/materials">Materials</Link>
          <Link href="/vendors">Vendors</Link>
          <Link href="/estimate">Estimate</Link>
        </div>

        <div>
          {!loggedIn ? (
            <div className="flex gap-4">
              <Link
                href="/login"
                className="text-gray-700 hover:text-orange-600"
              >
                Login
              </Link>

              <Link
                href="/login"
                className="bg-orange-600 text-white px-4 py-2 rounded-lg"
              >
                Sign Up
              </Link>
            </div>
          ) : (
            <Link href="/buyer/dashboard">Dashboard</Link>
          )}
        </div>

      </div>
    </nav>
  );
}