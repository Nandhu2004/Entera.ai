import React, { useState } from "react";

import { useNavigate } from "react-router-dom";

import "./Auth.css";



export default function SignIn() {

  const [email, setEmail] = useState("");

  const [password, setPassword] = useState("");

  const [error, setError] = useState("");

  const navigate = useNavigate();



  const handleSubmit = async (e) => {

    e.preventDefault();

    setError("");



    try {

      const formData = new FormData();

      formData.append("email", email);

      formData.append("password", password);
      const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";
      const response = await fetch(`${API_URL}/token`, {

        method: "POST",

        body: formData,

      });



      if (response.ok) {

        const data = await response.json();

        localStorage.setItem("token", data.access_token);

        localStorage.setItem("username", data.username);

        navigate("/dashboard");

      } else {

        const errorData = await response.json();

        setError(errorData.detail || "Login failed. Try again.");

      }

    } catch (err) {

      setError("Server connection failed. Is FastAPI running?");

      console.error(err);

    }

  };



  return (

    <div className="auth-container">

      <div className="auth-card">

        <div className="auth-header">

          <h2>Welcome Back</h2>

          <p>Access your enterprise document intelligence</p>

        </div>



        {error && <p style={{ color: "red", textAlign: "center" }}>{error}</p>}



        <form className="auth-form" onSubmit={handleSubmit}>

          <div className="form-group">

            <label>Email</label>

            <input

              type="email"

              placeholder="user@email.com"

              value={email}

              onChange={(e) => setEmail(e.target.value)}

              required

            />

          </div>



          <div className="form-group">

            <label>Password</label>

            <input

              type="password"

              placeholder="password"

              value={password}

              onChange={(e) => setPassword(e.target.value)}

              required

            />

          </div>



          <button type="submit" className="auth-btn">

            Sign In

          </button>

        </form>



        <p className="auth-footer">

          Don't have an account? <a href="/signup">Create one</a>

        </p>

      </div>

    </div>

  );

}

