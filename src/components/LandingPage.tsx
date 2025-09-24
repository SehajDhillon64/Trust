import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

export default function LandingPage() {
  const currentYear = new Date().getFullYear();
  type GalleryEntry = string | { src: string; caption?: string };
  type Manifest = {
    hero?: string;
    heroCaption?: string;
    portrait?: string;
    portraitCaption?: string;
    gallery?: GalleryEntry[];
  };

  const [manifest, setManifest] = useState<Manifest | null>(null);

  useEffect(() => {
    let isMounted = true;
    const loadManifest = async () => {
      try {
        const res = await fetch('/images/manifest.json', { cache: 'no-store' });
        if (!res.ok) return;
        const data = (await res.json()) as Manifest;
        if (isMounted) setManifest(data);
      } catch (_) {
        // ignore; placeholders will remain
      }
    };
    loadManifest();
    return () => {
      isMounted = false;
    };
  }, []);

  const heroSrc = manifest?.hero ? `/images/${manifest.hero}` : null;
  const heroCaption = manifest?.heroCaption || 'Happy older adults enjoying time together';
  const portraitSrc = manifest?.portrait ? `/images/${manifest.portrait}` : null;
  const portraitCaption = manifest?.portraitCaption || 'Smiling seniors portrait';
  const galleryItems = Array.isArray(manifest?.gallery) ? manifest!.gallery : null;

  return (
    <>
      <header className="site-header" role="banner">
        <div className="container header-inner">
          <div className="brand">
            <span className="brand-mark" aria-hidden="true">VQ</span>
            <span className="brand-name">Vaultiq</span>
          </div>
          <nav className="nav" aria-label="Primary">
            <a className="nav-link" href="#features">Features</a>
            <a className="nav-link" href="#gallery">Gallery</a>
            <a className="nav-link" href="#contact">Contact</a>
            <Link className="nav-link" to="/login" aria-label="Login">Login</Link>
          </nav>
        </div>
      </header>

      <main id="main" className="main" tabIndex={-1}>
        <section className="section hero" aria-labelledby="hero-title">
          <div className="gradient-orb orb-1" aria-hidden="true"></div>
          <div className="gradient-orb orb-2" aria-hidden="true"></div>
          <div className="container hero-inner">
            <div className="hero-copy">
              <h1 id="hero-title" className="headline">Human-centered technology for dignified aging</h1>
              <p className="subhead">
                Vaultiq blends security with empathy—designed to help families, caregivers, and communities
                support older adults with confidence.
              </p>
              <div className="cta-row">
                <a className="btn btn-primary" href="mailto:info@vaultiq.ca?subject=VaultIQ%20Demo%20Request" aria-label="Request a demo via email">
                  Request a Demo
                </a>
                <a className="btn btn-ghost" href="mailto:info@vaultiq.ca" aria-label="Email info at vault i q dot c a">info@vaultiq.ca</a>
              </div>
              <p className="tiny-note">Prefer a quick chat? Email us and we’ll schedule a walkthrough.</p>
            </div>
            <div className="hero-media">
              {heroSrc ? (
                <figure className="img-card">
                  <img className="img-media" src={heroSrc} alt={heroCaption} />
                  <figcaption>{heroCaption}</figcaption>
                </figure>
              ) : (
                <figure className="img-card placeholder">
                  <div className="img-skeleton" role="img" aria-label="Placeholder for happy older adults enjoying time together"></div>
                  <figcaption>Imagery: Happy older adults </figcaption>
                </figure>
              )}
            </div>
          </div>
        </section>

        <section id="features" className="section features" aria-labelledby="features-title">
          <div className="container">
            <h2 id="features-title" className="section-title">Built for trust and ease</h2>
            <div className="features-grid">
              <article className="feature-card">
                <div className="feature-icon" aria-hidden="true">🔐</div>
                <h3 className="feature-title">Secure by design</h3>
                <p className="feature-text">End-to-end security so your loved ones’ data stays private and protected.</p>
              </article>
              <article className="feature-card">
                <div className="feature-icon" aria-hidden="true">🤝</div>
                <h3 className="feature-title">Care that connects</h3>
                <p className="feature-text">Tools that bring families and caregivers together—without the tech headache.</p>
              </article>
              <article className="feature-card">
                <div className="feature-icon" aria-hidden="true">✨</div>
                <h3 className="feature-title">Beautifully simple</h3>
                <p className="feature-text">Accessible experiences, thoughtful defaults, and calming, vibrant visuals.</p>
              </article>
            </div>
          </div>
        </section>

        <section id="gallery" className="section gallery" aria-labelledby="gallery-title">
          <div className="container">
            <h2 id="gallery-title" className="section-title">Life, well lived</h2>
            <div className="gallery-grid">
              {galleryItems && galleryItems.length > 0 ? (
                galleryItems.map((entry, idx) => {
                  const src = typeof entry === 'string' ? entry : entry.src;
                  const caption = typeof entry === 'string' ? '' : (entry.caption || '');
                  if (!src) return null;
                  const fullSrc = `/images/${src}`;
                  return (
                    <figure key={`${src}-${idx}`} className="img-card">
                      <img className="img-media" src={fullSrc} alt={caption || src} />
                      <figcaption>{caption}</figcaption>
                    </figure>
                  );
                })
              ) : (
                <>
                  <figure className="img-card placeholder">
                    <div className="img-skeleton" role="img" aria-label="Placeholder: Seniors laughing together"></div>
                    <figcaption>Happy moments </figcaption>
                  </figure>
                  <figure className="img-card placeholder">
                    <div className="img-skeleton" role="img" aria-label="Placeholder: Grandparent with family"></div>
                    <figcaption>Family connections </figcaption>
                  </figure>
                  <figure className="img-card placeholder">
                    <div className="img-skeleton" role="img" aria-label="Placeholder: Seniors outdoors"></div>
                    <figcaption>Outdoors & activity </figcaption>
                  </figure>
                  <figure className="img-card placeholder">
                    <div className="img-skeleton" role="img" aria-label="Placeholder: Community support"></div>
                    <figcaption>Community & care </figcaption>
                  </figure>
                </>
              )}
            </div>
          </div>
        </section>

        <section id="contact" className="section contact" aria-labelledby="contact-title">
          <div className="container contact-inner">
            <div className="contact-copy">
              <h2 id="contact-title" className="section-title">See Vaultiq in action</h2>
              <p className="contact-text">We’d love to show you a demo. Reach us at:</p>
              <a className="contact-email" href="mailto:info@vaultiq.ca">info@vaultiq.ca</a>
              <div className="cta-row">
                <a className="btn btn-primary" href="mailto:info@vaultiq.ca?subject=VaultIQ%20Demo%20Request">Request a Demo</a>
                <a className="btn btn-ghost" href="#main">Back to top</a>
              </div>
            </div>
            <div className="contact-media">
              {portraitSrc ? (
                <figure className="img-card tall">
                  <img className="img-media" src={portraitSrc} alt={portraitCaption} />
                  <figcaption>{portraitCaption}</figcaption>
                </figure>
              ) : (
                <figure className="img-card placeholder tall">
                  <div className="img-skeleton" role="img" aria-label="Placeholder: Smiling seniors portrait"></div>
                  <figcaption>Portrait </figcaption>
                </figure>
              )}
            </div>
          </div>
        </section>
      </main>

      <footer className="site-footer" role="contentinfo">
        <div className="container footer-inner">
          <span>© <span>{currentYear}</span> Vaultiq. All rights reserved.</span>
          <nav className="footer-nav" aria-label="Footer">
            <a href="#features">Features</a>
            <a href="#gallery">Gallery</a>
            <a href="#contact">Contact</a>
          </nav>
        </div>
      </footer>
    </>
  );
}

