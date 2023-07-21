import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import Login from './Login'
import './index.css'
import { BrowserRouter } from "react-router-dom";
import { Route, Routes } from "react-router-dom";



ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <Routes>
        <Route
          path="/"
          element={
            <Login />
          }
        />
        <Route
          path="/home"
          element={
            <App />
          }
        />
        </Routes>

  </BrowserRouter>
)
