import React from "react";
import "./LandingPage.css";
import { Link } from "react-router-dom";
import bgImage from "../assets/bg-image.png";
import aboutImage from "../assets/about-image.jpg";

export default function LandingPage() {
  return (
    <div id="home" className="landing-page">
      <nav className="navbar">
        <div className="logo">Entera.ai</div>
        <div className="nav-right-group">
          <ul className="nav-links">
            <li className="active"><a href="#home">Home</a></li>
            <li><a href="#about">About</a></li>
          </ul>
          <div className="auth-buttons">
            <Link to="/signin"><button className="signin-btn">Sign in</button></Link>
            <Link to="/signup"><button className="signup-btn">Sign up</button></Link>
          </div>
        </div>
      </nav>

      <section className="hero">
        <div className="hero-bg-image">
          <img src={bgImage} alt="background-texture" />
        </div>
        <div className="container hero-container">
          <div className="hero-content">
            <h1>Intelligent Document <br /><span>AI for Your Enterprise</span></h1>
            <p>
              Extract, organize, and analyze your enterprise documents effortlessly.
              Save time, reduce errors, and make smarter, data-driven decisions.
            </p>
          </div>
        </div>
      </section>

      <section id="about" className="about-section">
        <div className="container about-container">
          <div className="about-content">
            <h2 className="section-title">About Our Application</h2>
            <p className="section-description">
              Entera.ai is an enterprise document intelligence platform that helps teams
              instantly extract information, find answers, and stay organized — all from
              a single, easy-to-use interface.
            </p>
            <div className="about-features">
              <div className="about-item">
                <div className="about-icon">
                  <i className="fa fa-file-alt"></i>
                </div>
                <div>
                  <h3>Intelligent Document Extraction</h3>
                  <p>Automatically extract text and structured data from your PDFs with high accuracy, no manual effort required.</p>
                </div>
              </div>

              <div className="about-item">
                <div className="about-icon">
                  <i className="fa fa-comments"></i>
                </div>
                <div>
                  <h3>Ask Questions, Get Answers</h3>
                  <p>Query across all your documents in plain English and get instant, accurate answers — no digging through files.</p>
                </div>
              </div>

              <div className="about-item">
                <div className="about-icon">
                  <i className="fa fa-folder-open"></i>
                </div>
                <div>
                  <h3>Centralized Document Management</h3>
                  <p>Upload, organize, and manage all your enterprise documents in one place, accessible whenever you need them.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="about-image-wrapper">
            <img src={aboutImage} alt="About Our Application" className="main-about-img" />
            <button className="play-btn">
              <i className="fa fa-play"></i>
            </button>
          </div>
        </div>
      </section>

      <footer className="footer">
        <p>&copy; 2026 <strong>Entera.ai</strong>. All Rights Reserved</p>
        <p className="credits">Designed by <span className="blue-text">Nandhana Sasikumar</span></p>
      </footer>
    </div>
  );
}