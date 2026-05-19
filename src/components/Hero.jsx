import React from 'react';

export default function Hero({ settings }) {
  const agencyName = settings.agencyName || 'BeatPulse';
  
  return (
    <section className="hero">
      <div className="container">
        <span className="hero-tag">Music Social &amp; Rollout Management</span>
        <h1>Accelerate Your Releases with <span className="gradient-text">Elite Music Marketing</span></h1>
        <p className="hero-description">
          We craft custom album graphics, Spotify Canvas loops, high-retention short videos, and deploy dedicated artist VAs to manage your rollouts, promoter outreach, and sync licensing admin.
        </p>
        <div className="hero-ctas">
          <a href="#plans" className="btn btn-primary">Explore Release Plans</a>
          <a href="#calculator" className="btn btn-outline">Build Custom Rollout</a>
        </div>
      </div>
    </section>
  );
}
