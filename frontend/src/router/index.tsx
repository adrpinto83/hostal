import React from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import App from "../App";
import RequireAuth from "./RequireAuth";
import Login from "../pages/Login";
import Dashboard from "../pages/Dashboard";

const router = createBrowserRouter([
  { path: "/login", element: <Login /> },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <App />,
        children: [
          { path: "/dashboard", element: <Dashboard /> },
          { index: true, element: <Navigate to="/dashboard" replace /> },
        ],
      },
    ],
  },
  { path: "*", element: <Navigate to="/" replace /> },
]);

export default router;
